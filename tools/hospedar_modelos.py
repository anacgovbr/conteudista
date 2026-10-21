# -*- coding: utf-8 -*-
"""Hospedagem local dos modelos da Locução (Piper/Kokoro) no próprio site.

Lê web/modelos.json, baixa os arquivos dos perfis escolhidos para <saida>/modelos/<host>/<caminho>,
copia (opcionalmente) as bibliotecas JS/WASM de pacotes npm para <saida>/vendor/<nome>/ e grava
<saida>/modelos/manifest.json, que os workers da Locução usam para redirecionar as requisições.

Uso (no workflow):
  python tools/hospedar_modelos.py --config web/modelos.json --saida site --cache .cache/modelos \
         --perfis "piper-ptbr,piper-catalogo" --bibliotecas "piper,kokoro,espeak"
Use --perfis nenhum para não hospedar modelos.
"""
import argparse, json, os, re, shutil, subprocess, sys, tarfile, tempfile, time, urllib.parse, urllib.request
from datetime import datetime, timezone


def local_de(url):
    u = urllib.parse.urlsplit(url)
    return 'modelos/%s%s' % (u.netloc, urllib.parse.unquote(u.path))


def baixar(url, destino, cache, tentativas=3):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    c = os.path.join(cache, local_de(url)) if cache else None
    if c and os.path.isfile(c) and os.path.getsize(c) > 0:
        shutil.copyfile(c, destino); return os.path.getsize(destino), 'cache'
    erro = None
    for t in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'conteudista-hospedagem/1.0'})
            with urllib.request.urlopen(req, timeout=120) as r, open(destino + '.part', 'wb') as f:
                shutil.copyfileobj(r, f, 1 << 20)
            os.replace(destino + '.part', destino)
            if c:
                os.makedirs(os.path.dirname(c), exist_ok=True); shutil.copyfile(destino, c)
            return os.path.getsize(destino), 'rede'
        except Exception as e:  # noqa: BLE001
            erro = e; time.sleep(2 * (t + 1))
    raise RuntimeError('%s: %s' % (url, erro))


ESPEC = re.compile(r'''(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"'./][^"']*)\2''')


def reescrever_especificadores(dest, deps):
    """Troca imports 'nus' (ex.: 'onnxruntime-web') por URLs do jsDelivr (+esm), que o navegador consegue resolver.
    Sem isso, a biblioteca hospedada falha com "Failed to resolve module specifier"."""
    n = 0
    for raiz, _, fs in os.walk(dest):
        for f in fs:
            if not f.endswith(('.js', '.mjs')):
                continue
            cam = os.path.join(raiz, f)
            try:
                txt = open(cam, encoding='utf-8').read()
            except UnicodeDecodeError:
                continue
            def troca(m):
                nonlocal n
                spec = m.group(3)
                if re.match(r'^(https?:|data:|blob:|node:|#)', spec):
                    return m.group(0)
                partes = spec.split('/')
                pkg = '/'.join(partes[:2]) if spec.startswith('@') else partes[0]
                sub = spec[len(pkg):]
                ver = re.sub(r'^[\^~>=<\s]+', '', str(deps.get(pkg, '')).split('||')[0].strip()) or ''
                ver = ver if re.match(r'^[0-9][0-9A-Za-z.+-]*$', ver) else ''
                n += 1
                return '%s%s%s%s' % (m.group(1), m.group(2), 'https://cdn.jsdelivr.net/npm/%s%s%s/+esm' % (pkg, '@' + ver if ver else '', sub), m.group(2))
            novo = ESPEC.sub(troca, txt)
            if novo != txt:
                open(cam, 'w', encoding='utf-8').write(novo)
    return n


def vendor(nome, spec, saida):
    """Extrai o pacote npm em <saida>/vendor/<nome>/ e devolve o caminho da entrada (ou None)."""
    tmp = tempfile.mkdtemp()
    try:
        r = subprocess.run(['npm', 'pack', spec['pacote'], '--pack-destination', tmp, '--silent'], capture_output=True, text=True, timeout=300)
        tgz = [f for f in os.listdir(tmp) if f.endswith('.tgz')]
        if r.returncode != 0 or not tgz:
            print('  [!] npm pack %s falhou: %s' % (spec['pacote'], (r.stderr or r.stdout).strip()[:300])); return None
        with tarfile.open(os.path.join(tmp, tgz[0])) as t:
            t.extractall(tmp)
        pkg = os.path.join(tmp, 'package'); dest = os.path.join(saida, 'vendor', nome)
        shutil.rmtree(dest, ignore_errors=True)
        shutil.copytree(pkg, dest, ignore=shutil.ignore_patterns('node_modules', '*.map', 'test', 'tests', 'example*', 'src'))
        try:
            pj = json.load(open(os.path.join(dest, 'package.json'), encoding='utf-8'))
        except Exception:  # noqa: BLE001
            pj = {}
        deps = {}
        for k in ('peerDependencies', 'dependencies'):
            deps.update(pj.get(k) or {})
        n = reescrever_especificadores(dest, deps)
        if n:
            print('  [ok] %s: %d import(s) de dependência apontado(s) para o jsDelivr' % (spec['pacote'], n))
        for e in spec.get('entrada', []):
            if os.path.isfile(os.path.join(dest, e)):
                return 'vendor/%s/%s' % (nome, e)
        print('  [!] entrada não encontrada em %s (%s)' % (spec['pacote'], ', '.join(spec.get('entrada', []))))
        return None
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--config', default='web/modelos.json'); a.add_argument('--saida', default='site')
    a.add_argument('--cache', default=''); a.add_argument('--perfis', default='piper-ptbr,piper-catalogo')
    a.add_argument('--bibliotecas', default='')
    a = a.parse_args()
    cfg = json.load(open(a.config, encoding='utf-8'))
    perfis = [p.strip() for p in a.perfis.split(',') if p.strip() and p.strip().lower() != 'nenhum']
    libs = [b.strip() for b in a.bibliotecas.split(',') if b.strip() and b.strip().lower() != 'nenhum']
    desconhecidos = [p for p in perfis if p not in cfg['perfis']]
    if desconhecidos:
        print('[ERRO] perfis inexistentes: %s (disponíveis: %s)' % (', '.join(desconhecidos), ', '.join(cfg['perfis']))); return 2
    arquivos, total, falhas = {}, 0, []
    for p in perfis:
        print('== Perfil %s — %s' % (p, cfg['perfis'][p].get('descricao', '')))
        for url in cfg['perfis'][p]['arquivos']:
            if urllib.parse.unquote(url) in arquivos: continue
            loc = local_de(url)
            try:
                tam, origem = baixar(url, os.path.join(a.saida, loc), a.cache)
                arquivos[urllib.parse.unquote(url)] = loc; total += tam
                print('  [ok] %s (%.1f MB, %s)' % (loc, tam / 1048576, origem))
            except Exception as e:  # noqa: BLE001
                falhas.append(str(e)); print('  [!] %s' % e)
    vend = {}
    for nome in libs:
        spec = cfg.get('bibliotecas', {}).get(nome)
        if not spec: print('  [!] biblioteca desconhecida: %s' % nome); continue
        try:
            e = vendor(nome, spec, a.saida)
            if e: vend[nome] = e; print('  [ok] biblioteca %s → %s' % (nome, e))
        except Exception as ex:  # noqa: BLE001
            print('  [!] biblioteca %s: %s' % (nome, ex))
    if not arquivos and not vend:
        print('Nada hospedado (perfis: %s).' % (', '.join(perfis) or 'nenhum')); return 0 if not falhas else 1
    man = {'gerado': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'perfis': perfis, 'arquivos': arquivos,
           'aliases': cfg.get('aliases', {}), 'vendor': vend, 'tamanho_mb': round(total / 1048576, 1)}
    os.makedirs(os.path.join(a.saida, 'modelos'), exist_ok=True)
    json.dump(man, open(os.path.join(a.saida, 'modelos', 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('Manifest: %d arquivo(s), %.1f MB, bibliotecas: %s' % (len(arquivos), total / 1048576, ', '.join(vend) or 'nenhuma'))
    if total > 900 * 1048576:
        print('[!] Atenção: o GitHub Pages limita o site a ~1 GB.')
    return 1 if falhas else 0


if __name__ == '__main__':
    sys.exit(main())
