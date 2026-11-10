import argparse, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path
import suporte
from suporte import (
    EXEMPLO_APRES, EXEMPLO_TREINO, RAIZ, _servidor, rodar
)

def grupo5(amb, ctx, G):
    ler = lambda p: (RAIZ / p).read_text(encoding='utf-8')
    cl = ler('CHANGELOG.md')
    v_cl = re.search(r'(?m)^##\s+([\d.]+)', cl)
    v_js = re.search(r"const VERSAO = '([\d.]+)'", ler('web/changelog.js'))
    G.chk('5.1', 'Versão do CHANGELOG.md = VERSAO em changelog.js', bool(v_cl and v_js) and v_cl.group(1) == v_js.group(1), f'changelog={v_cl and v_cl.group(1)} js={v_js and v_js.group(1)}')
    idx = ler('web/index.html')
    ver = v_js.group(1) if v_js else '?'
    q = {s: (re.search(r'%s\?v=([\d.]+)' % re.escape(s), idx) or [None, None])[1] for s in ('ajuda.js', 'changelog.js')}
    G.chk('5.2', 'index.html carrega ajuda.js e changelog.js com ?v= da versão atual', all(v == ver for v in q.values()), f'esperado {ver}: {q}')
    cacheados = ('opcoes.js', 'ajuda.js', 'changelog.js', 'acessibilidade.js', 'acessibilidade-marcas.js', 'acessibilidade-janelas.js',
                 'acessibilidade-geracao.js', 'relatorio-acessibilidade.js', 'acessibilidade-config.js', 'vlibras.js')
    q = {s: (re.search(r'%s\?v=([\d.]+)' % re.escape(s), idx) or [None, None])[1] for s in cacheados}
    G.chk('5.2c', 'Todos os scripts alterados usam o cache-buster da versão atual', all(v == ver for v in q.values()), f'esperado {ver}: {q}')
    # cada versão tem pelo menos um item e não há versão duplicada
    vs = re.findall(r'(?m)^##\s+([\d.]+)', cl)
    G.chk('5.3', 'CHANGELOG sem versões duplicadas e em ordem decrescente',
          len(vs) == len(set(vs)) and [tuple(map(int, v.split('.'))) for v in vs] == sorted([tuple(map(int, v.split('.'))) for v in vs], reverse=True), vs[:6])
    frase = re.compile(r'só começa (quando você apertar|com)', re.I)
    falta = [p for p in ('web/ajuda.js', 'web/exemplo/treinamento.md', 'web/exemplo/apresentacao.md', 'README.md') if not frase.search(ler(p))]
    G.chk('5.4', 'Ajuda, apostila, apresentação de exemplo e README descrevem que a pausa é respeitada ao mudar de slide', not falta, f'faltando em: {falta}')
    readme = ler('README.md')
    G.chk('5.5', 'README cita o atalho S (não M) para a narração', re.search(r'Narração\*\* \(S\)', readme) is not None and not re.search(r'Narração\*\* \(M\)', readme))
    for nome, tipo in (('web/changelog.js', 'js'), ('web/ajuda.js', 'js')):
        pass
    # sintaxe de todos os scripts da página (módulos tratados como .mjs)
    erros = []
    for js in sorted((RAIZ / 'web').glob('*.js')):
        alvo = js
        if re.search(r'worker|local|g2p', js.name):
            alvo = Path(tempfile.gettempdir()) / (js.stem + '_chk.mjs')
            alvo.write_text(js.read_text(encoding='utf-8'), encoding='utf-8')
        r = rodar(['node', '--check', str(alvo)])
        if r.returncode != 0:
            erros.append(f'{js.name}: {r.stderr.strip()[:120]}')
    G.chk('5.6', 'Sintaxe de todos os .js de web/ (node --check)', not erros, erros)
    ci = ler('.github/workflows/publicar-pagina.yml')
    G.chk('5.7', 'Os testes de navegador são pré-requisito da publicação', 'testes' in ci and re.search(r'needs:\s*\[[^\]]*testes', ci) is not None)

def grupo6(amb, ctx, G):
    for tema in ('govbr', 'classico'):
        d = amb.tmp / f'saida_{tema}'
        r = rodar([sys.executable, str(suporte.GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Exemplo', '--rodape', 'Teste', '--saida', str(d), '--tema', tema], cwd=RAIZ)
        arqs = {p.suffix: p for p in d.glob('*')} if d.exists() else {}
        faltam = [x for x in ('.docx', '.epub', '.pptx', '.html') if x not in arqs or arqs[x].stat().st_size == 0]
        zips_ok = True
        for x in ('.docx', '.epub', '.pptx'):
            if x in arqs:
                try:
                    zips_ok &= zipfile.ZipFile(arqs[x]).testzip() is None
                except Exception:
                    zips_ok = False
        G.chk(f'6.1-{tema}', f'Gerador (tema {tema}): DOCX, EPUB, PPTX e HTML gerados e íntegros', r.returncode == 0 and not faltam and zips_ok, (r.stderr or r.stdout)[-300:] + f' faltam={faltam}')
        r = rodar([sys.executable, str(RAIZ / 'tools' / 'testar_acessibilidade.py'), str(d), '--prefixo', 'Exemplo'] + (['--fonte-pptx', 'Segoe UI'] if tema == 'classico' else []), cwd=RAIZ)
        falhas = [l for l in r.stdout.splitlines() if l.startswith('FAIL')]
        # sem linhas FAIL, o erro está no stderr (ex.: exceção do script): mostra o fim dele em vez de deixar o detalhe vazio
        detalhe = ' | '.join(falhas)[:400] or f'código {r.returncode}: ' + ' '.join((r.stderr or r.stdout).strip().splitlines()[-2:])[:350]
        G.chk(f'6.2-{tema}', f'Teste de acessibilidade das saídas (tema {tema})', r.returncode == 0, detalhe)
    lic = amb.tmp / 'saida_licenciada'
    r = rodar([sys.executable, str(suporte.GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Licenca', '--saida', str(lic), '--tema', 'govbr', '--licenca', 'cc-by-4.0'], cwd=RAIZ)
    md_g = lic / 'Apostila_Licenca.md'; md_s = lic / 'Apresentacao_Licenca.md'
    html_g = lic / 'Apostila_Licenca.html'; html_s = lic / 'Apresentacao_Licenca.html'
    conteudo_g = html_g.read_text(encoding='utf-8') if html_g.exists() else ''
    conteudo_s = html_s.read_text(encoding='utf-8') if html_s.exists() else ''
    G.chk('6.4', 'CC BY: CLI gera o aviso final da Apostila e um slide final com URL oficial',
          r.returncode == 0 and md_g.exists() and md_s.exists() and conteudo_g.count('class="licenciamento"') == 1
          and conteudo_g.index('class="licenciamento"') < conteudo_g.index('</article>')
          and conteudo_s.count('aria-label="Slide 40 de 40"') == 1
          and 'https://creativecommons.org/licenses/by/4.0/' in conteudo_s
          and (lic / 'Apostila_Licenca.docx').exists() and (lic / 'Apostila_Licenca.epub').exists()
          and (lic / 'Apresentacao_Licenca.pptx').exists(), (r.stderr or r.stdout)[-300:])
    r = rodar([sys.executable, str(RAIZ / 'tools' / 'testar_acessibilidade.py'), str(lic), '--prefixo', 'Licenca'], cwd=RAIZ)
    G.chk('6.5', 'CC BY: DOCX, EPUB, PPTX e HTML mantêm as verificações de acessibilidade', r.returncode == 0,
          ' '.join((r.stderr or r.stdout).strip().splitlines()[-2:])[:350])
    c = amb.novo_contexto(viewport={'width': 1280, 'height': 720})
    pg_lic = c.new_page(); erros_lic = []
    pg_lic.on('pageerror', lambda e: erros_lic.append(str(e)))
    pg_lic.goto(html_s.as_uri()); pg_lic.wait_for_timeout(500)
    total = pg_lic.locator('.s').count()
    for _ in range(total - 1): pg_lic.click('#n')
    final = pg_lic.evaluate("() => { const s = document.querySelector('.s.on'); const a = s && s.querySelector('a[rel=license]'); const r = s && s.getBoundingClientRect(); return { nome: s && s.getAttribute('aria-label'), url: a && a.href, largura: r && r.width, altura: r && r.height, visivel: !!s && getComputedStyle(s).display !== 'none' }; }")
    G.chk('6.6', 'CC BY: o último slide é acessível, visível e navegável no Chrome', total > 1 and final['nome'] == 'Slide %d de %d' % (total, total) and final['url'] == 'https://creativecommons.org/licenses/by/4.0/' and final['largura'] > 0 and final['altura'] > 0 and final['visivel'] and not erros_lic, final)
    c.close()
    # regressão do Windows: o teste de acessibilidade tem de rodar com a saída em cp1252 (console/pipe padrão do Windows)
    r = subprocess.run([sys.executable, str(RAIZ / 'tools' / 'testar_acessibilidade.py'), str(amb.tmp / 'saida_govbr'), '--prefixo', 'Exemplo'],
                       capture_output=True, env=dict(os.environ, PYTHONIOENCODING='cp1252', PYTHONUTF8='0'), cwd=RAIZ)
    G.chk('6.2-cp1252', 'Teste de acessibilidade roda com a saída em cp1252 (Windows), sem UnicodeEncodeError',
          r.returncode == 0, 'código %s: %s' % (r.returncode, ' '.join(r.stderr.decode('utf-8', 'replace').strip().splitlines()[-1:])[:250]))
    # layout: sem rolagem horizontal em três janelas, e sem erros na carga
    html = next((amb.tmp / 'saida_govbr').glob('*Apresentacao*.html'), None)
    if html is None:
        G.chk('6.3', 'Apresentação HTML do tema govbr encontrada', False)
        return
    for nome, vp in (('desktop 1280×720', {'width': 1280, 'height': 720}), ('celular retrato 390×780', {'width': 390, 'height': 780}), ('celular paisagem 844×390', {'width': 844, 'height': 390})):
        c = amb.novo_contexto(viewport=vp, touch=vp['width'] < 900)
        pg = c.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(html.as_uri()); pg.wait_for_timeout(700)
        m = pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth,slides:document.querySelectorAll('.s').length,on:document.querySelectorAll('.s.on').length})")
        G.chk(f'6.3-{vp["width"]}', f'Apresentação em {nome}: sem rolagem horizontal, 1 slide ativo e sem erros', m['sw'] <= m['iw'] + 1 and m['on'] == 1 and not erros, f'{m} {erros}')
        c.close()

def grupo15(amb, ctx, G):
    ler = lambda p: (RAIZ / p).read_text(encoding='utf-8')
    lac = RAIZ / 'tools' / 'lac' / 'lac.mjs'
    ex = [str(RAIZ / 'web' / 'exemplo' / 'treinamento.md'), str(RAIZ / 'web' / 'exemplo' / 'apresentacao.md')]
    r = rodar(['node', str(lac), 'c', '-n', 'c'] + ex, cwd=RAIZ)
    G.chk('15.1', 'Conteúdo de exemplo sem itens para corrigir (lac c -n c sai com 0)', r.returncode == 0, (r.stdout + r.stderr)[-400:])
    r = rodar(['node', str(lac), 'c', '-f', 'json', '--agrupar', 'nenhum', ex[0]], cwd=RAIZ)
    tipo = ''
    try: tipo = json.loads(r.stdout).get('tipo')
    except Exception: pass
    G.chk('15.2', 'A apostila de exemplo é reconhecida como apostila (exemplos de slides em código não confundem)', tipo == 'apostila', tipo)
    t = ler('web/exemplo/treinamento.md')
    m = re.search(r'PROMPT PADRÃO DO CONTEUDISTA.*?\n```', t, re.S); pr = m.group(0) if m else ''
    nunca = [l for l in pr.splitlines() if 'clique aqui' in l]
    G.chk('15.3', 'Prompt padrão 1.1 com as regras de acessibilidade e linguagem simples',
          'Versão 1.1' in pr and 'ACESSIBILIDADE E LINGUAGEM SIMPLES' in pr and 'Nome completo (SIGLA)' in pr and '25' in pr and 'linguagem-acessivel:' in pr
          and len(nunca) == 1 and 'Nunca use' in nunca[0], nunca)
    G.chk('15.4', 'Apostila de exemplo com as seções 5.6 e 10.6 e o Checklist A atualizado',
          '### 5.6 Acessibilidade do texto' in t and '### 10.6 Escrever conteúdo acessível' in t and 'O botão **Acessibilidade** não mostra itens para corrigir' in t)
    a = ler('web/exemplo/apresentacao.md')
    tit = ['# Acessibilidade do texto', '# O que é para corrigir', '# Sugestões de linguagem simples', '# Corrigir no próprio texto', '# Pedir ajuda a uma IA']
    n = len(re.findall(r'(?m)^---\s*$', a)) - 1
    G.chk('15.5', 'Apresentação de exemplo com os 5 slides de acessibilidade (39 slides)', all(x in a for x in tit) and n == 39, n)
    aj = ler('web/ajuda.js')
    G.chk('15.6', 'Ajuda com "Escrever conteúdo acessível" e a tabela de atalhos da acessibilidade',
          '<h4>Escrever conteúdo acessível</h4>' in aj and '<kbd>Alt+Shift+I</kbd>' in aj and "t: '3. Confira a acessibilidade'" in aj)
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
        pg.click('#btnTour'); pg.wait_for_selector('.tr-pop', timeout=5000)
        for _ in range(3): pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(250)
        e = pg.evaluate("""() => { const p = document.querySelector('.tr-pop'), h = document.querySelector('.tr-hole'), b = document.querySelector('#pg .la-btn').getBoundingClientRect();
            const r = h && h.getBoundingClientRect(); return { titulo: p && p.querySelector('h4').textContent, cobre: !!r && r.left <= b.left && r.right >= b.right && r.top <= b.top && r.bottom >= b.bottom }; }""")
        G.chk('15.7', 'Tutorial: passo "3. Confira a acessibilidade" destaca o botão Acessibilidade', e['titulo'] == '3. Confira a acessibilidade' and e['cobre'], e)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        pg.click('#ex'); pg.wait_for_timeout(500)
        pg.wait_for_function("(() => { const g = AcessibilidadeTexto.resultado('g'), s = AcessibilidadeTexto.resultado('s'); return g && s && g.diagnosticos.length + s.diagnosticos.length > 0; })()", timeout=15000)
        pg.wait_for_timeout(1500)
        e = pg.evaluate("[AcessibilidadeTexto.resultado('g').resumo.corrigir, AcessibilidadeTexto.resultado('s').resumo.corrigir, document.getElementById('laAviso') ? !document.getElementById('laAviso').hidden : false]")
        G.chk('15.8', 'Carregar exemplo: o painel não acusa nada para corrigir e não há aviso perto de Gerar arquivos', e == [0, 0, False], e)
        G.chk('15.9', 'Nenhum erro de JavaScript', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()

def grupo19(amb, ctx, G):
    r = rodar(['node', str(RAIZ / 'tools' / 'lac' / 'testar_api.mjs')], cwd=RAIZ)
    G.chk('19.1', 'API v1: rotas, formatos, ETag, RFC 9457, limites e CORS', r.returncode == 0, (r.stdout + r.stderr)[-600:])
