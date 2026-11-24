import sys, re, tempfile, subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
GERADOR = RAIZ / 'tools' / 'gerador.py'

def gerar(saida, tema='govbr', licenca='cc-by-4.0'):
    saida.mkdir(parents=True, exist_ok=True)
    a = saida / 'a.md'
    s = saida / 's.md'
    o = saida / 'out'
    a.write_text('# Apostila\n', encoding='utf-8')
    s.write_text('# Slide um\n\nConteudo.\n---\n# Slide dois\n\nMais.\n', encoding='utf-8')
    args = [sys.executable, str(GERADOR), str(a), str(s),
            '--prefixo', 'T', '--saida', str(o), '--tema', tema]
    if licenca:
        args += ['--licenca', licenca]
    r = subprocess.run(args, capture_output=True, text=True, cwd=str(RAIZ))
    assert r.returncode == 0, f'gerador falhou: {r.stderr[-400:]}'
    html = next(o.glob('Apresentacao_T.html'), None)
    assert html, 'HTML nao gerado'
    return html.read_text(encoding='utf-8')

FALHAS = []

def chk(nome, cond, detalhe=''):
    if cond:
        print(f'PASS {nome}')
    else:
        print(f'FAIL {nome}  {detalhe}')
        FALHAS.append(nome)

with tempfile.TemporaryDirectory() as td:
    base = Path(td)

    c_sem = gerar(base / 'sem', licenca='')
    slides_sem = re.findall(r'class="s ([^"]+)"', c_sem)
    has_enc_sem = any('encerramento' in s for s in slides_sem)
    chk('spec03-04/sem-licenca/encerramento-existe', has_enc_sem, str(slides_sem))

    c = gerar(base / 'com')
    slides = re.findall(r'class="s ([^"]+)"', c)
    lic_idx = next((i for i,s in enumerate(slides) if 'licenciamento' in s), -1)
    enc_idx = next((i for i,s in enumerate(slides) if 'encerramento'  in s), -1)
    total = len(slides)

    chk('spec03/licenca-existe',      lic_idx >= 0,             str(slides))
    chk('spec04/encerramento-existe', enc_idx >= 0,             str(slides))
    chk('spec03/licenca-penultima',   lic_idx == total - 2,     f'lic={lic_idx} enc={enc_idx} total={total}')
    chk('spec04/encerramento-ultimo', enc_idx == total - 1,     f'lic={lic_idx} enc={enc_idx} total={total}')

    if enc_idx >= 0:
        secs = re.findall(r'<section[^>]*encerramento[^>]*>(.*?)</section>', c, re.S)
        enc_html = secs[0] if secs else ''
        m = re.search(r'<div class="conteudo">(.*?)</div>', enc_html, re.S)
        enc_vazio = m and m.group(1).strip() == ''
        chk('spec04/encerramento-vazio', enc_vazio, enc_html[:200])

    chk('spec09/palma',   chr(0x1F590) in c, 'gesto palma ausente')
    chk('spec09/v',       chr(0x270C)  in c, 'gesto v ausente')
    chk('spec09/joinha',  chr(0x1F44D) in c, 'gesto joinha ausente')
    chk('spec09/chrome',  'permiss' in c.lower() or 'cadeado' in c.lower() or 'icone' in c.lower(), 'instrucao permissao ausente')

print()
if FALHAS:
    print(f'RESULTADO: {len(FALHAS)} FALHA(S): {FALHAS}')
    sys.exit(1)
else:
    print('RESULTADO: todos os testes passaram')
