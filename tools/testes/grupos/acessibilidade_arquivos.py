import argparse, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path
import suporte
from suporte import (
    EXEMPLO_APRES, PNG_1PX, RAIZ, _servidor, rodar
)

def grupo16(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000)
        def texto(g, s=''):
            pg.evaluate("([g,s]) => { document.getElementById('g').value=g; document.getElementById('s').value=s; ED.g.refresh(); ED.s.refresh(); }", [g, s])
        texto('# Título\n\nTexto simples.')
        pg.evaluate("AcessibilidadeTexto.analisarAgora('g')")
        r = pg.evaluate("AcessibilidadeGeracao.antesDeGerar()")
        G.chk('16.1', 'Sem itens para corrigir, a geração segue direto sem confirmação', r is True and not pg.locator('.la-gerar-dialog[open]').count(), r)

        texto('palavra ' * 30 + '.')
        rg = pg.evaluate("AcessibilidadeTexto.analisarAgora('g')")
        r = pg.evaluate("AcessibilidadeGeracao.antesDeGerar()")
        G.chk('16.2', 'Sugestões isoladas não abrem confirmação', rg['resumo']['corrigir'] == 0 and rg['resumo']['sugestoes'] > 0 and r is True and not pg.locator('.la-gerar-dialog[open]').count(), rg['resumo'])

        texto('# Título\n\n### Seção', '---\ntitle: Slides\n---\n\n### Slide 1\n\nTexto.\n\n---\n\n### Slide 2\n\nTexto.')
        pg.evaluate("Promise.all([AcessibilidadeTexto.analisarAgora('g'), AcessibilidadeTexto.analisarAgora('s')])")
        contagens = pg.evaluate("[AcessibilidadeTexto.resultado('g').resumo.corrigir, AcessibilidadeTexto.resultado('s').resumo.corrigir]")
        pg.focus('#go'); pg.click('#go')
        pg.wait_for_selector('.la-gerar-dialog[open]', timeout=5000)
        texto_modal = pg.inner_text('.la-gerar-dialog')
        G.chk('16.3', 'Com itens para corrigir, a confirmação informa a contagem', 'Há 3 itens' in texto_modal, {'contagens': contagens, 'modal': texto_modal[:100]})
        pg.keyboard.press('Escape'); pg.wait_for_selector('.la-gerar-dialog', state='detached', timeout=3000)
        G.chk('16.4', 'Esc cancela e devolve o foco ao botão Gerar arquivos', pg.evaluate("document.activeElement.id") == 'go')

        pg.evaluate("() => { window.__gerarResult = null; AcessibilidadeGeracao.antesDeGerar().then(v => window.__gerarResult = v); }")
        pg.wait_for_selector('.la-gerar-dialog[open]', timeout=5000)
        pg.click('.la-gerar-dialog [data-acao="conferir"]')
        pg.wait_for_function("AcessibilidadeTexto.estado('s').painel.hidden === false", timeout=3000)
        pg.wait_for_function('window.__gerarResult === false', timeout=3000)
        G.chk('16.5', 'Conferir agora abre o editor com mais itens para corrigir', not pg.evaluate("AcessibilidadeTexto.estado('s').painel.hidden") and contagens[1] > contagens[0], contagens)
        pg.evaluate("AcessibilidadeTexto.fechar('s')")

        texto('# Título\n\n### Seção')
        pg.evaluate("AcessibilidadeTexto.analisarAgora('g')")
        pg.focus('#go')
        pg.evaluate("() => { window.__gerarResult = null; AcessibilidadeGeracao.antesDeGerar().then(v => window.__gerarResult = v); }")
        pg.wait_for_selector('.la-gerar-dialog[open]', timeout=5000)
        pg.click('.la-gerar-dialog [data-acao="gerar"]')
        pg.wait_for_function('window.__gerarResult === true', timeout=5000)
        G.chk('16.6', 'Gerar assim mesmo atravessa o guard sem cancelar a geração', pg.evaluate('window.__gerarResult === true'))

        pg.evaluate("sessionStorage.setItem('conteudista.acessibilidade.naoPerguntarAoGerar', '1')")
        r = pg.evaluate("AcessibilidadeGeracao.antesDeGerar()")
        G.chk('16.7', 'Não perguntar de novo nesta sessão é respeitado', r is True and not pg.locator('.la-gerar-dialog[open]').count())
        pg.evaluate("sessionStorage.removeItem('conteudista.acessibilidade.naoPerguntarAoGerar')")
        pg.focus('body'); pg.keyboard.press('Alt+Shift+g'); pg.wait_for_selector('.la-gerar-dialog[open]', timeout=5000)
        G.chk('16.8', 'Alt+Shift+G passa pela mesma confirmação', True)
        pg.keyboard.press('Escape')
        G.chk('16.9', 'Nenhum erro de JavaScript na confirmação ao gerar', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()

def grupo17(amb, ctx, G):
    import jsonschema
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e) + '\n' + str(getattr(e, 'stack', ''))))
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000)
        pg.evaluate("t => { document.getElementById('g').value=t; ED.g.refresh(); }", '# Título\n\n### Seção\n\nVeja aqui.')
        report = pg.evaluate('RelatorioAcessibilidade.preparar()')
        schema = json.loads((RAIZ / 'web' / 'lib' / 'linguagem-acessivel' / 'esquema' / 'relatorio.schema.json').read_text(encoding='utf-8'))
        diagnostico = json.loads((RAIZ / 'web' / 'lib' / 'linguagem-acessivel' / 'esquema' / 'diagnostico.schema.json').read_text(encoding='utf-8'))
        schema['properties']['arquivos']['items']['properties']['diagnosticos']['items'] = diagnostico
        erro_schema = ''
        try: jsonschema.validate(report, schema)
        except Exception as e: erro_schema = str(e)
        G.chk('17.1', 'JSON do relatório valida contra relatorio.schema.json', not erro_schema, erro_schema[:300])
        G.chk('17.2', 'Relatório inclui versões, limites, regra, linha, trecho e aviso',
              report['versoes']['biblioteca'] and report['limites']['fraseLonga'] == 25 and report['arquivos'][0]['diagnosticos'][0]['linha'] == 3 and re.search(r'não substitui uma avaliação completa', report['aviso'], re.I),
              {'versoes': report['versoes'], 'limites': report['limites'], 'diagnostico': report['arquivos'][0]['diagnosticos'][0], 'aviso': report['aviso']})

        pg.evaluate("document.getElementById('btnRelatorioAcessibilidade').hidden = false")
        pg.click('#btnRelatorioAcessibilidade'); pg.wait_for_selector('.la-relatorio-dialog[open]')
        with pg.expect_download() as info:
            pg.click('.la-relatorio-dialog [data-formato="json"]')
        arquivo = Path(info.value.path())
        baixado = json.loads(arquivo.read_text(encoding='utf-8'))
        G.chk('17.3', 'Botão dos arquivos exporta JSON válido', baixado['aviso'] == report['aviso'])

        html = pg.evaluate('RelatorioAcessibilidade.html()')
        G.chk('17.4', 'Relatório HTML tem título, aviso e tabela semântica', '<h1>Relatório de acessibilidade</h1>' in html and '<caption>Itens encontrados</caption>' in html and 'scope="col"' in html)
        audit = ctx.new_page(); erros_audit = []
        audit.on('pageerror', lambda e: erros_audit.append(str(e)))
        audit.set_content(html)
        audit.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js')
        axe = audit.evaluate("async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } }); return r.violations.map(v => ({ id: v.id, help: v.help, nodes: v.nodes.map(n => n.target) })); }")
        G.chk('17.5', 'HTML do relatório passa no axe-core (WCAG 2.2 A/AA)', not axe, axe[:3])
        G.chk('17.6', 'Nenhum erro de JavaScript ao exportar o relatório', not erros and not erros_audit, erros + erros_audit)
        audit.close()
        pg.close()
    finally:
        srv.shutdown()

def grupo18(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000)
        pg.evaluate("t => { document.getElementById('g').value=t; ED.g.refresh(); }", '# Título\n\n### Seção\n')
        pg.evaluate("AcessibilidadeTexto.abrir('g')")
        pg.click('#laP-g .la-configurar'); pg.wait_for_selector('.la-cfg-dialog[open]')
        e1 = pg.locator('[data-caminho="acessibilidade_texto.regras.e1"]')
        f1 = pg.locator('[data-caminho="acessibilidade_texto.regras.f1"]')
        G.chk('18.1', 'Configuração lista as opções e limita sugestões a sugestão/desligado', e1.count() == 1 and f1.locator('option[value="corrigir"]').count() == 0)
        e1.select_option('sugestao')
        pg.click('.la-cfg-dialog [data-salvar]')
        pg.wait_for_function("AcessibilidadeTexto.resultado('g') && AcessibilidadeTexto.resultado('g').resumo.sugestoes === 1")
        G.chk('18.2', 'Rebaixar regra para sugestão persiste e atualiza o painel', pg.evaluate("localStorage.getItem('conteudista.acessibilidade.regra.e1')") == 'sugestao')

        pg.click('#laP-g .la-configurar'); pg.wait_for_selector('.la-cfg-dialog[open]')
        with pg.expect_download() as info:
            pg.click('.la-cfg-dialog [data-exportar]')
        exported = json.loads(Path(info.value.path()).read_text(encoding='utf-8'))
        G.chk('18.3', 'Exportar configuração produz JSON com versão e opções registradas', exported.get('versao') == 1 and 'acessibilidade_texto.regras.e1' in exported.get('opcoes', {}))

        salvo_antes = pg.evaluate("localStorage.getItem('conteudista.acessibilidade.relatorioZip')")
        pacote = amb.tmp / 'opcoes-importar.json'
        pacote.write_text(json.dumps({'versao': 1, 'opcoes': {'acessibilidade_texto.incluir_relatorio_no_zip': 'ligado'}}, ensure_ascii=False), encoding='utf-8')
        pg.set_input_files('.la-cfg-dialog input[type=file]', str(pacote))
        pg.wait_for_function("document.querySelector('[data-caminho=\"acessibilidade_texto.incluir_relatorio_no_zip\"]').checked")
        estado_import = pg.evaluate("({checked:document.querySelector('[data-caminho=\"acessibilidade_texto.incluir_relatorio_no_zip\"]').checked,salvo:localStorage.getItem('conteudista.acessibilidade.relatorioZip')})")
        G.chk('18.4', 'Importar configuração valida e preenche o formulário sem aplicar antes da confirmação',
              estado_import == {'checked': True, 'salvo': salvo_antes}, {'antes': salvo_antes, 'depois': estado_import})
        pg.click('.la-cfg-dialog [data-salvar]')
        G.chk('18.5', 'Aplicar configuração importada grava valores validados', pg.evaluate("localStorage.getItem('conteudista.acessibilidade.relatorioZip')") == '1')

        texto = '<!-- linguagem-acessivel: siglas QWER=Quadro do Conteúdo -->\nO QWER aprova.'
        lib_resultado = pg.evaluate("async t => { const L = await import('./lib/linguagem-acessivel/index.js'); const x = L.analisar(t, { tipo: 'apostila', nivel: 'sugestao' }); const d = x.diagnosticos.find(y => y.codigo === 's1'); return d && L.aplicar(t, d.correcoes[0]); }", texto)
        G.chk('18.6', 'Glossário do conteúdo explica sigla e mantém a prioridade do marcador', lib_resultado.endswith('O Quadro do Conteúdo (QWER) aprova.'), lib_resultado)
        G.chk('18.7', 'Nenhum erro de JavaScript em configurações e glossário', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()

def grupo20(amb, ctx, G):
    html = next((amb.tmp / 'saida_govbr').glob('*Apresentacao*.html'), None)
    if html is None:
        destino = amb.tmp / 'saida_compatibilidade'
        gerado = rodar([sys.executable, str(suporte.GERADOR), '-', str(EXEMPLO_APRES), '--prefixo', 'Compatibilidade', '--saida', str(destino)], cwd=RAIZ)
        html = next(destino.glob('*Apresentacao*.html'), None) if gerado.returncode == 0 else None
    if html is None:
        G.chk('20.1', 'HTML de apresentação gerado para auditoria', False)
        return
    for width in (320, 390, 768, 1024, 1366, 1920):
        c = amb.novo_contexto(viewport={'width': width, 'height': 820})
        pg = c.new_page(); erros = []
        pg.route('https://cdn.jsdelivr.net/**', lambda route: route.abort())
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(html.as_uri()); pg.wait_for_timeout(120)
        m = pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth,on:document.querySelectorAll('.s.on').length,skip:!!document.querySelector('a.skip[href=\"#st\"]')})")
        G.chk(f'20.1-{width}', f'Apresentação em {width}px: sem rolagem horizontal e skip link presente', m['sw'] <= m['iw'] + 1 and m['on'] == 1 and m['skip'] and not erros, {'metricas': m, 'erros': erros})
        c.close()
    c = amb.novo_contexto(viewport={'width': 390, 'height': 844})
    pg = c.new_page(); pg.route('https://cdn.jsdelivr.net/**', lambda route: route.abort()); pg.goto(html.as_uri()); pg.wait_for_timeout(100)
    pg.emulate_media(forced_colors='active', reduced_motion='reduce')
    if pg.locator('#ini0').count(): pg.click('#ini0')
    pg.evaluate("document.getElementById('a11yToggle').click()")
    mq = pg.evaluate("({forced:matchMedia('(forced-colors: active)').matches,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,dialog:document.querySelector('#a11yPanel').open})")
    G.chk('20.2', 'Painel responde a forced-colors, movimento reduzido e abre como diálogo no celular', mq == {'forced': True, 'reduced': True, 'dialog': True}, mq)
    pg.close(); c.close()

    srv, url = _servidor(RAIZ / 'web')
    try:
        app = ctx.new_page(); app.goto(url); app.wait_for_selector('#btnRelatorioAcessibilidade', timeout=15000)
        arquivos = ('acessibilidade-geracao.js', 'relatorio-acessibilidade.js', 'acessibilidade-config.js', 'vlibras.js')
        bytes_total = sum((RAIZ / 'web' / nome).stat().st_size for nome in arquivos)
        metricas = app.evaluate("nomes => performance.getEntriesByType('resource').filter(x => nomes.some(n => x.name.split('?')[0].endsWith(n))).map(x => ({arquivo:x.name.split('/').pop().split('?')[0],ms:x.duration}))", list(arquivos))
        maximo = max((x['ms'] for x in metricas), default=0)
        G.chk('20.3', 'Módulos novos somam até 200 KiB e cada recurso carrega em até 400 ms', bytes_total <= 200 * 1024 and maximo <= 400, {'bytes': bytes_total, 'duracoes': metricas})
        app.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js')
        axe_app = app.evaluate("async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } }); return r.violations.map(v => ({id:v.id,help:v.help,nodes:v.nodes.map(n=>n.target)})); }")
        conhecidos = {('#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary',), ('#dxRes > summary',)}
        novos = [dict(id=v['id'], target=alvo) for v in axe_app for alvo in v['nodes']
             if not (v['id'] == 'nested-interactive' and tuple(alvo) in conhecidos)]
        G.chk('20.4', 'Aplicativo não adiciona violações axe-core WCAG 2.2 A/AA além do baseline documentado', not novos,
              {'novas': novos, 'baseline': axe_app})
        app.close()
    finally:
        srv.shutdown()

def grupo21(amb, ctx, G):
    d = amb.tmp / 'a11y-gerados'; d.mkdir(exist_ok=True)
    (d / 'apostila.md').write_text('# Guia\n\nTexto de exemplo.\n', encoding='utf-8')
    (d / 'apresentacao.md').write_text('---\ntitle: Guia\n---\n\n# Slide 1\n\nTexto do slide.\n\n<!-- notas: Narração do primeiro slide. -->\n\n---\n\n# Slide 2\n\nTexto do segundo slide.\n\n<!-- notas: Narração do segundo slide. -->\n', encoding='utf-8')
    gerador = RAIZ / 'tools' / 'gerador.py'
    audio = amb.audios if getattr(amb, 'audios', None) else amb.tmp / 'aud'
    out = d / 'com_vlibras'
    r = rodar([sys.executable, str(gerador), str(d / 'apostila.md'), str(d / 'apresentacao.md'), '--prefixo', 'A11y', '--saida', str(out), '--audios', str(audio)], cwd=RAIZ)
    apostila = next(out.glob('Apostila_A11y.html'), None) if out.exists() else None
    apresentacao = next(out.glob('Apresentacao_A11y.html'), None) if out.exists() else None
    if not apostila or not apresentacao:
        G.chk('21.1', 'Gerador cria ambos os HTML para auditoria', False, (r.stderr or r.stdout)[-300:]); return
    ag = apostila.read_text(encoding='utf-8'); sl = apresentacao.read_text(encoding='utf-8')
    G.chk('21.1', 'Apostila tem skip link, painel acessível e VLibras sob demanda', 'href="#conteudo"' in ag and 'id="a11yPanel"' in ag and 'data-a11y="vlibras"' in ag and 'src="https://vlibras.gov.br/app/vlibras-plugin.js"' not in ag)
    G.chk('21.2', 'Slides têm skip link, painel lateral e legendas baseadas nas notas', 'href="#st"' in sl and 'id="a11yPanel"' in sl and 'Narração do primeiro slide.' in sl and 'class="a11y-caption"' in sl)

    sem = d / 'sem_vlibras'
    r = rodar([sys.executable, str(gerador), str(d / 'apostila.md'), str(d / 'apresentacao.md'), '--prefixo', 'A11y', '--saida', str(sem), '--sem-vlibras'], cwd=RAIZ)
    ag_sem = next(sem.glob('Apostila_A11y.html')).read_text(encoding='utf-8') if sem.exists() else ''
    sl_sem = next(sem.glob('Apresentacao_A11y.html')).read_text(encoding='utf-8') if sem.exists() else ''
    G.chk('21.3', 'Opção desligada remove VLibras da apostila e apresentação', r.returncode == 0 and 'data-a11y="vlibras"' not in ag_sem and 'data-a11y="vlibras"' not in sl_sem)

    repetida = d / 'repetida'; repetida.mkdir(exist_ok=True)
    (repetida / 'g.md').write_text('# Guia\n\n<!-- linguagem-acessivel: decorativa -->\n![Logo](' + PNG_1PX + ')\n\n![Logo](' + PNG_1PX + ')\n', encoding='utf-8')
    (repetida / 's.md').write_text('---\ntitle: Guia\n---\n\n# Slide 1\n\n<!-- linguagem-acessivel: decorativa -->\n![Logo](' + PNG_1PX + ')\n\n![Logo](' + PNG_1PX + ')\n', encoding='utf-8')
    repetida_out = repetida / 'out'
    r = rodar([sys.executable, str(gerador), str(repetida / 'g.md'), str(repetida / 's.md'), '--prefixo', 'D', '--saida', str(repetida_out)], cwd=RAIZ)
    html_rep = next(repetida_out.glob('Apostila_D.html')).read_text(encoding='utf-8') if repetida_out.exists() else ''
    alts_html = re.findall(r'<img[^>]+alt="([^"]*)"', html_rep)
    epub_xml = ''
    try:
        with zipfile.ZipFile(repetida_out / 'Apostila_D.epub') as z: epub_xml = ''.join(z.read(n).decode('utf-8', 'ignore') for n in z.namelist() if n.endswith('.xhtml'))
    except Exception: pass
    alts_epub = re.findall(r'<img[^>]+alt="([^"]*)"', epub_xml)
    docx_xml = ''
    try:
        with zipfile.ZipFile(repetida_out / 'Apostila_D.docx') as z: docx_xml = z.read('word/document.xml').decode('utf-8', 'ignore')
    except Exception: pass
    alts_docx = re.findall(r'<wp:docPr[^>]+descr="([^"]*)"', docx_xml)
    pptx_xml = ''
    try:
        with zipfile.ZipFile(repetida_out / 'Apresentacao_D.pptx') as z: pptx_xml = ''.join(z.read(n).decode('utf-8', 'ignore') for n in z.namelist() if n.startswith('ppt/slides/slide'))
    except Exception: pass
    G.chk('21.4', 'Mesma URL: HTML, EPUB e DOCX mantêm alt vazio só na ocorrência decorativa',
          r.returncode == 0 and alts_html[:2] == ['', 'Logo'] and alts_epub[:2] == ['', 'Logo'] and alts_docx[:2] == ['', 'Logo'],
          {'html': alts_html[:2], 'epub': alts_epub[:2], 'docx': alts_docx[:2]})
    descrs = re.findall(r'<p:cNvPr[^>]+descr="([^"]*)"', pptx_xml)
    G.chk('21.5', 'Mesma URL no PPTX: só a ocorrência marcada fica decorativa', pptx_xml.count('adec:decorative') == 1 and descrs[:2] == ['', 'Logo'], {'decorativas': pptx_xml.count('adec:decorative'), 'descr': descrs[:2]})

    c = amb.novo_contexto(viewport={'width': 390, 'height': 844})
    pg = c.new_page(); erros = []; requisicoes = []
    pg.on('pageerror', lambda e: erros.append(str(e)))
    pg.on('request', lambda q: requisicoes.append(q.url) if 'vlibras.gov.br/app/vlibras-plugin.js' in q.url else None)
    pg.goto(apresentacao.as_uri()); pg.wait_for_timeout(250); pg.click('#ini0')
    leg = pg.evaluate("({ativada:document.documentElement.classList.contains('a11y-legendas-on'),visivel:getComputedStyle(document.querySelector('.s.on .a11y-caption')).display !== 'none'})")
    pg.click('#a11yToggle'); pg.wait_for_selector('#a11yPanel[open]')
    painel = pg.evaluate("({modal:document.querySelector('#a11yPanel').open,baixo:document.querySelector('#a11yPanel').getBoundingClientRect().bottom >= innerHeight-1,espacamento:!!document.querySelector('[data-a11y=\"espacamento\"]'),barra:!!document.querySelector('[data-a11y=\"barra\"]')})")
    G.chk('21.6', 'Legendas ligadas por padrão e painel vira folha inferior no celular', leg['ativada'] and leg['visivel'] and painel['modal'] and painel['baixo'] and painel['espacamento'] and painel['barra'], {'legendas': leg, 'painel': painel})
    G.chk('21.7', 'VLibras não faz requisição antes do clique explícito', not requisicoes, requisicoes)
    G.chk('21.8', 'Nenhum erro de JavaScript no painel gerado', not erros, erros)
    pg.click('#a11yPanel [data-a11y="fechar"]')
    pg.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js')
    violacoes = pg.evaluate("async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } }); return r.violations.map(v => ({id:v.id,help:v.help,nodes:v.nodes.map(n=>n.target)})); }")
    G.chk('21.9', 'Apresentação HTML gerada passa no axe-core (WCAG 2.2 A/AA)', not violacoes, violacoes[:3])
    pg.close(); c.close()

    srv, url = _servidor(RAIZ / 'web')
    try:
        app = ctx.new_page(); requisicoes_app = []
        app.on('request', lambda q: requisicoes_app.append(q.url) if 'vlibras.gov.br/app/vlibras-plugin.js' in q.url else None)
        app.goto(url); app.wait_for_selector('#btnVlibras'); app.wait_for_timeout(250)
        G.chk('21.10', 'Aplicativo mantém o skip link e não carrega VLibras até solicitação',
              app.locator('.br-skiplink[href="#conteudo"]').count() == 1 and app.locator('#btnVlibras').get_attribute('aria-controls') == 'vlibrasWidget' and app.locator('#vlibrasWidget').count() == 1 and not requisicoes_app,
              requisicoes_app)
        app.close()
    finally:
        srv.shutdown()
