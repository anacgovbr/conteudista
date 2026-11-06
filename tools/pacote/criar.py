# -*- coding: utf-8 -*-
"""Cria um pacote de atualização a partir das diferenças entre uma referência do git e a cópia de trabalho.

Uso:
  python tools/pacote/criar.py --base HEAD --versao 1.84 --titulo "Conferência ao gerar" \\
      --mensagem "feat: conferência de acessibilidade ao gerar (1.84)" -o conteudista-pacote-1.84.zip
A versão anterior é lida de web/changelog.js na referência base (ou --anterior).
Inclui arquivos alterados, novos (não ignorados pelo .gitignore) e removidos. Usado por quem prepara as etapas."""
import argparse, io, json, os, re, subprocess, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import FORMATO, PROIBIDOS, assinatura, caminho_seguro


def git(raiz, *a, binario=False):
    r = subprocess.run(['git', *a], cwd=raiz, capture_output=True)
    if r.returncode:
        raise SystemExit('git %s: %s' % (' '.join(a), r.stderr.decode('utf-8', 'replace')))
    return r.stdout if binario else r.stdout.decode('utf-8')


def criar(raiz, base, versao, titulo, mensagem, saida, anterior=None):
    mudados = set(git(raiz, 'diff', '--name-only', base).split('\n')) | set(git(raiz, 'ls-files', '--others', '--exclude-standard').split('\n'))
    mudados = sorted(c for c in mudados if c and not c.endswith('.zip') and '__pycache__' not in c)
    if not anterior:
        m = re.search(r"const VERSAO = '([\d.]+)'", git(raiz, 'show', base + ':web/changelog.js'))
        anterior = m.group(1) if m else ''
    itens, buf = [], io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for c in mudados:
            if not caminho_seguro(c):
                raise SystemExit('caminho não permitido: %s' % c)
            if any(c.startswith(p) for p in PROIBIDOS):
                print('AVISO: %s altera fluxo do GitHub; este pacote só poderá ser aplicado pelo PowerShell.' % c, file=sys.stderr)
            try:
                antes = assinatura(git(raiz, 'show', base + ':' + c, binario=True))
            except SystemExit:
                antes = None
            cam = os.path.join(raiz, c)
            if os.path.isfile(cam):
                b = open(cam, 'rb').read()
                depois = assinatura(b)
                if depois == antes:
                    continue                       # só quebras de linha mudaram
                z.writestr(zipfile.ZipInfo('arquivos/' + c, (2026, 1, 1, 0, 0, 0)), b, zipfile.ZIP_DEFLATED)
            else:
                depois = None
            itens.append({'caminho': c, 'antes': antes, 'depois': depois})
        man = {'formato': FORMATO, 'versao': versao, 'anterior': anterior, 'titulo': titulo, 'mensagem': mensagem, 'arquivos': itens}
        z.writestr(zipfile.ZipInfo('manifesto.json', (2026, 1, 1, 0, 0, 0)), json.dumps(man, ensure_ascii=False, indent=1), zipfile.ZIP_DEFLATED)
    open(saida, 'wb').write(buf.getvalue())
    return man


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--raiz', default='.')
    a.add_argument('--base', default='HEAD')
    a.add_argument('--versao', required=True)
    a.add_argument('--anterior')
    a.add_argument('--titulo', required=True)
    a.add_argument('--mensagem', required=True)
    a.add_argument('-o', '--saida', required=True)
    x = a.parse_args()
    m = criar(os.path.abspath(x.raiz), x.base, x.versao, x.titulo, x.mensagem, x.saida, x.anterior)
    print('%s: %d arquivo(s), de %s para %s' % (x.saida, len(m['arquivos']), m['anterior'], m['versao']))
