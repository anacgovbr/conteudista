# -*- coding: utf-8 -*-
"""Testes dos pacotes de atualização (criar.py + aplicar.py). Sem dependências: python tools/pacote/testar_pacote.py"""
import io, json, os, shutil, subprocess, sys, tempfile, zipfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import aplicar, criar
from comum import assinatura

for _f in (sys.stdout, sys.stderr):
    try: _f.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
n = f = 0
def t(nome, fn):
    global n, f
    n += 1
    try: fn(); print('  ok   ' + nome)
    except Exception as e: f += 1; print('  FALHA ' + nome + '\n        ' + repr(e))
def git(r, *a): subprocess.run(['git', *a], cwd=r, check=True, capture_output=True)
def escrever(r, c, s, crlf=False):
    p = os.path.join(r, c); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write((s.replace('\n', '\r\n') if crlf else s).encode('utf-8'))
def ler(r, c): return open(os.path.join(r, c), encoding='utf-8').read()

TMP = tempfile.mkdtemp()
def repo_base(nome='base', crlf=False):
    r = os.path.join(TMP, nome); os.makedirs(r)
    escrever(r, 'web/changelog.js', "  const VERSAO = '1.83';\n", crlf)
    escrever(r, 'web/a.js', 'a = 1;\n', crlf); escrever(r, 'web/velho.js', 'x\n', crlf); escrever(r, 'README.md', '# R\n', crlf)
    git(r, 'init', '-q'); git(r, '-c', 'core.autocrlf=false', 'add', '-A'); git(r, '-c', 'user.email=a@b', '-c', 'user.name=a', 'commit', '-qm', 'base')
    return r

# monta um pacote 1.83 -> 1.84
DEV = repo_base('dev')
escrever(DEV, 'web/changelog.js', "  const VERSAO = '1.84';\n"); escrever(DEV, 'web/a.js', 'a = 2;\n'); escrever(DEV, 'web/novo.js', 'novo\n')
os.remove(os.path.join(DEV, 'web/velho.js'))
PAC = os.path.join(TMP, 'conteudista-pacote-1.84.zip')
man = criar.criar(DEV, 'HEAD', '1.84', 'Teste', 'feat: teste (1.84)', PAC)

print('Pacotes de atualização')
t('criar: lista alterados, novos e removidos; anterior lido do git', lambda: (
    sorted((i['caminho'], i['antes'] is None, i['depois'] is None) for i in man['arquivos']) == [('web/a.js', False, False), ('web/changelog.js', False, False), ('web/novo.js', True, False), ('web/velho.js', False, True)]
    and man['anterior'] == '1.83') or (_ for _ in ()).throw(AssertionError(man)))

def aplica_limpo():
    r = repo_base('limpo')
    assert aplicar.main([PAC, '--raiz', r]) == 0
    assert ler(r, 'web/a.js') == 'a = 2;\n' and ler(r, 'web/novo.js') == 'novo\n' and not os.path.exists(os.path.join(r, 'web/velho.js'))
    assert aplicar.main([PAC, '--raiz', r]) == 3, 'segunda vez deveria ser "já aplicado"'
t('aplicar: grava, cria e remove; rodar de novo diz "já aplicado"', aplica_limpo)

def crlf():
    r = repo_base('crlf', crlf=True)
    assert aplicar.main([PAC, '--raiz', r]) == 0
t('aplicar: cópia com CRLF (Windows) é aceita', crlf)

def divergente():
    r = repo_base('div'); escrever(r, 'web/a.js', 'a = 99;\n')
    antes = {c: ler(r, c) for c in ('web/a.js', 'web/changelog.js', 'web/velho.js')}
    assert aplicar.main([PAC, '--raiz', r]) == 2
    assert {c: ler(r, c) for c in antes} == antes and not os.path.exists(os.path.join(r, 'web/novo.js')), 'nada pode mudar'
t('aplicar: arquivo mudado depois do pacote -> recusa sem alterar nada', divergente)

def versao():
    r = repo_base('ver'); escrever(r, 'web/changelog.js', "  const VERSAO = '1.82';\n")
    assert aplicar.main([PAC, '--raiz', r]) == 2
t('aplicar: versão do repositório diferente da anterior -> recusa', versao)

def zip_com(man_mod, extra=None):
    b = io.BytesIO(); z0 = zipfile.ZipFile(PAC)
    with zipfile.ZipFile(b, 'w') as z:
        m = json.loads(z0.read('manifesto.json')); man_mod(m)
        for nome in z0.namelist():
            if nome != 'manifesto.json': z.writestr(nome, z0.read(nome))
        for k, v in (extra or {}).items(): z.writestr(k, v)
        z.writestr('manifesto.json', json.dumps(m))
    p = os.path.join(TMP, 'mod.zip'); open(p, 'wb').write(b.getvalue()); return p

def inseguros():
    for c in ('../fora.txt', '/abs.txt', 'web\\x.js', '.git/config', 'web/../../x', 'C:/x'):
        p = zip_com(lambda m: m['arquivos'].append({'caminho': c, 'antes': None, 'depois': assinatura(b'x')}), {'arquivos/' + c.lstrip('/'): b'x'})
        assert aplicar.main([p, '--raiz', repo_base('ins' + str(abs(hash(c))))]) == 2, c
t('aplicar: recusa caminhos perigosos (.., absolutos, \\, .git)', inseguros)

def workflow():
    p = zip_com(lambda m: m['arquivos'].append({'caminho': '.github/workflows/x.yml', 'antes': None, 'depois': assinatura(b'y')}), {'arquivos/.github/workflows/x.yml': b'y'})
    assert aplicar.main([p, '--raiz', repo_base('wf')]) == 2
t('aplicar: recusa pacote que altera fluxos do GitHub (só pelo PowerShell)', workflow)

def corrompido():
    def m(x): x['arquivos'][0]['depois'] = '0' * 64
    assert aplicar.main([zip_com(m), '--raiz', repo_base('corr')]) == 2
    p = os.path.join(TMP, 'ruim.zip'); open(p, 'wb').write(b'nao e zip')
    assert aplicar.main([p, '--raiz', repo_base('corr2')]) == 2
t('aplicar: conteúdo que não confere e ZIP inválido são recusados', corrompido)

def extra():
    assert aplicar.main([zip_com(lambda m: None, {'arquivos/web/intruso.js': b'x'}), '--raiz', repo_base('extra')]) == 2
t('aplicar: arquivo no ZIP fora do manifesto é recusado', extra)

def localizar():
    r = repo_base('loc'); shutil.copy(PAC, os.path.join(r, 'conteudista-pacote-1.84.zip'))
    os.makedirs(os.path.join(r, 'pacotes')); shutil.copy(PAC, os.path.join(r, 'pacotes', 'conteudista-pacote-1.85.zip'))
    assert aplicar.localizar(r) == 'conteudista-pacote-1.84.zip'
    os.remove(os.path.join(r, 'conteudista-pacote-1.84.zip')); assert aplicar.localizar(r) == 'pacotes/conteudista-pacote-1.85.zip'
t('localizar: acha o pacote na raiz ou em pacotes/', localizar)

def saida():
    r = repo_base('out'); o = os.path.join(TMP, 'gh.txt'); md = os.path.join(TMP, 'res.md')
    assert aplicar.main([PAC, '--raiz', r, '--saida-github', o, '--resumo', md, '--conferir']) == 0
    s = open(o, encoding='utf-8').read(); assert 'versao=1.84' in s and 'web/novo.js' in s and 'Conferido' in open(md, encoding='utf-8').read()
    assert ler(r, 'web/a.js') == 'a = 1;\n', '--conferir não grava'
t('saída para o GitHub Actions e --conferir sem gravar', saida)

shutil.rmtree(TMP, ignore_errors=True)
print('\n%d de %d testes aprovados.' % (n - f, n))
sys.exit(1 if f else 0)
