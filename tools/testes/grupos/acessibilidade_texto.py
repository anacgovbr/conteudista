import argparse, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path
import suporte
from suporte import (
    ALINHAMENTO_JS, BALAO_ABERTO, ESTADO_BALAO_JS, PNG_1PX, PONTO_MARCA_JS, RAIZ,
    TEXTO_JANELAS, TEXTO_MARCAS, _editor_com_texto, _esperar, _servidor, rodar
)

def grupo11(amb, ctx, G):
    import shutil
    d = amb.tmp / 'web_lib'
    if not d.exists():
        shutil.copytree(RAIZ / 'web' / 'lib', d / 'lib')
        (d / 't.html').write_text("""<!doctype html><meta charset="utf-8"><title>t</title><script type="module">
import { analisar, VERSAO } from './lib/linguagem-acessivel/index.js';
window.r1 = { v: VERSAO, r: analisar('# A\\n\\n### B\\n\\n![](a.png) [aqui](x)').resumo };
const w = new Worker('./w.js', { type: 'module' }); w.onmessage = e => { window.r2 = e.data; }; w.postMessage('[clique aqui](x)');
</script>""", encoding='utf-8')
        (d / 'w.js').write_text("import { criarSessao } from './lib/linguagem-acessivel/index.js';\nconst s = criarSessao();\nonmessage = e => postMessage(s.analisar(e.data).resumo);\n", encoding='utf-8')
    srv, url = _servidor(d)
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(url.replace('index.html', 't.html'))
        pg.wait_for_function('window.r1 && window.r2', timeout=10000)
        r1, r2 = pg.evaluate('window.r1'), pg.evaluate('window.r2')
        G.chk('11.1', 'Biblioteca carrega como módulo no navegador e analisa (3 itens para corrigir)', r1['r'].get('corrigir') == 3, r1)
        G.chk('11.2', 'Biblioteca roda em Web Worker (módulo) com sessão e cache', r2.get('corrigir') == 1, r2)
        G.chk('11.3', 'Nenhum erro de JavaScript', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()

def grupo12(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        _editor_com_texto(pg, url)
        bt = pg.locator('#pg .la-btn')
        G.chk('12.1', 'Botão Acessibilidade na barra do editor mostra os itens para corrigir (nome acessível e número)',
              bt.get_attribute('aria-label') == 'Conferir acessibilidade, 4 itens para corrigir' and pg.inner_text('#pg .la-cont') == '4', bt.get_attribute('aria-label'))
        av = pg.inner_text('#laAviso') if pg.is_visible('#laAviso') else ''
        G.chk('12.2', 'Aviso perto de Gerar arquivos, sem bloquear a geração', '4 itens para corrigir na apostila' in av and not pg.is_disabled('#go'), av)
        pg.keyboard.press('Alt+Shift+C'); pg.wait_for_timeout(300)
        G.chk('12.3', 'Alt+Shift+C abre o painel, com o foco no título e aria-expanded', pg.is_visible('#laP-g') and pg.evaluate("document.activeElement.id") == 'laT-g' and bt.get_attribute('aria-expanded') == 'true')
        n = pg.evaluate("[document.querySelectorAll('#laP-g .la-sec.c .la-it').length, document.querySelectorAll('#laP-g .la-sec.s .la-it').length]")
        sub = pg.inner_text('#laP-g .la-sub')
        G.chk('12.4', 'Dois níveis: 4 para corrigir e 1 sugestão (recolhida)', n == [4, 1] and pg.evaluate("document.getElementById('laLs-g').hidden") and '1 sugestão' in sub, [n, sub])
        pg.locator('#laP-g .la-it', has_text='pulou').locator('button', has_text='Ajustar nível').click(); pg.wait_for_timeout(700)
        ok = pg.evaluate("ED.g.textarea.value.split('\\n')[2]") == '## Prazos'
        G.chk('12.5', 'Correção em um clique aplica e o foco continua no painel', ok and pg.evaluate("!!document.activeElement.closest('#laP-g')"))
        pg.evaluate('ED.g.desfazer()')
        G.chk('12.6', 'A correção sai com um único Ctrl+Z (desfazer do editor)', pg.evaluate("ED.g.textarea.value.split('\\n')[2]") == '### Prazos')
        pg.evaluate('ED.g.refazer()'); pg.wait_for_timeout(1300)
        pg.locator('#laP-g .la-it', has_text='não diz o que').locator('button', has_text='Ir para').click(); pg.wait_for_timeout(200)
        e = pg.evaluate("(() => { const t = ED.g.textarea; return [t.value.slice(t.selectionStart, t.selectionEnd), t.scrollTop > 0, document.activeElement === t]; })()")
        G.chk('12.7', '"Ir para" seleciona o trecho no editor e rola até ele', e == ['![Imagem](x.png)', True, True], e)
        pg.locator('#laP-g .la-it', has_text='clique aqui').locator('button', has_text='Editar o texto do link').click(); pg.wait_for_timeout(200)
        e = pg.evaluate("(() => { const t = ED.g.textarea; return t.value.slice(t.selectionStart, t.selectionEnd); })()")
        G.chk('12.8', 'Correção que precisa de uma pessoa (sem janela própria) seleciona o texto a reescrever e mostra a dica', e == 'clique aqui' and 'colchetes' in pg.inner_text('.la-toast'), e)
        pg.locator('#laP-g .la-abre').click(); pg.wait_for_timeout(100)
        pg.locator('#laP-g .la-it', has_text='RBAC').locator('button', has_text='Ignorar').click(); pg.wait_for_timeout(900)
        G.chk('12.9', 'Ignorar grava o comentário no texto e a sugestão some',
              pg.evaluate("ED.g.textarea.value.includes('<!-- linguagem-acessivel: ignorar s1 -->\\nO pedido')") and '0 sugestões' in pg.inner_text('#laP-g .la-sub'))
        pg.locator('#laP-g .la-it').first.locator('button', has_text='Por quê?').click()
        pg.evaluate("AcessibilidadeTexto.analisarAgora('g')"); pg.wait_for_timeout(1500)   # nova conferência redesenha a lista
        pq = pg.locator('#laP-g .la-it').first.locator('button', has_text='Por quê?')
        G.chk('12.10', '"Por quê?" mostra a explicação (aria-expanded) e continua aberto depois de uma nova conferência', pq.get_attribute('aria-expanded') == 'true' and pg.locator('#laP-g .la-it').first.locator('.la-pq').is_visible())
        pg.evaluate('ED.g.textarea.setSelectionRange(0, 0)'); pg.keyboard.press('Alt+Shift+N'); pg.wait_for_timeout(300)
        e = pg.evaluate("(() => { const t = ED.g.textarea; return t.value.slice(t.selectionStart, t.selectionEnd); })()")
        G.chk('12.11', 'Alt+Shift+N vai ao próximo item a partir do cursor', e == '[clique aqui](https://www.gov.br/anac)', e)
        pg.locator('#laP-g h3').focus(); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        G.chk('12.12', 'Esc fecha o painel e devolve o foco ao botão', not pg.is_visible('#laP-g') and pg.evaluate("document.activeElement.classList.contains('la-btn')"))
        pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", '# Título\n\n## Parte\n\nTexto simples.\n')
        pg.wait_for_function("document.querySelector('#pg .la-cont').hidden", timeout=6000)
        G.chk('12.13', 'Sem itens: o número some e o aviso de Gerar arquivos também', not pg.is_visible('#laAviso'))
        pg.evaluate("AcessibilidadeTexto.abrir('g')"); pg.wait_for_timeout(200)
        G.chk('12.14', 'Sem itens: o painel diz "Nada para corrigir"', 'Nada para corrigir' in pg.inner_text('#laP-g .la-corpo'))
        G.chk('12.15', 'Nenhum erro de JavaScript no painel', not erros, erros)
        pg.close()
        c2 = amb.novo_contexto(movel=True)
        try:
            m = c2.new_page(); _editor_com_texto(m, url)
            m.locator('#pg .mv-bt[data-g=mais]').click(); m.wait_for_timeout(150)
            tem = m.locator('.mv-menu:not([hidden]) [role=menuitem]', has_text='Conferir acessibilidade')
            G.chk('12.16', 'Celular: "Conferir acessibilidade" no menu ⋯ da barra', tem.count() == 1)
            tem.click(); m.wait_for_timeout(300)
            e = m.evaluate("(() => { const p = document.getElementById('laP-g'); return [p.classList.contains('folha'), p.getAttribute('role'), p.getAttribute('aria-modal'), document.activeElement.id]; })()")
            G.chk('12.17', 'Celular: painel abre como folha inferior modal, com o foco no título', e == [True, 'dialog', 'true', 'laT-g'], e)
            m.locator('#laP-g .la-it', has_text='Descreva').locator('button', has_text='Ir para').click(); m.wait_for_timeout(300)
            G.chk('12.18', 'Celular: "Ir para" fecha a folha e seleciona o trecho', not m.is_visible('#laP-g') and m.evaluate("(() => { const t = ED.g.textarea; return t.value.slice(t.selectionStart, t.selectionEnd); })()") == '![](fluxo.png)')
            m.close()
        finally:
            c2.close()
    finally:
        srv.shutdown()

def grupo13(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")   # sem o tutorial da primeira visita
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
        pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", TEXTO_MARCAS)
        pg.wait_for_selector('#pg .la-camada .la-m', timeout=8000)
        a = pg.evaluate(ALINHAMENTO_JS)
        G.chk('13.1', 'Marcas só nos itens para corrigir (4), por padrão', a['n'] == 4 and pg.evaluate("document.querySelectorAll('#pg .la-camada .la-m.s').length") == 0, a)
        G.chk('13.2', 'Marcas alinhadas ao texto, com quebra de linha automática e emoji (até 1 px)', a['max'] <= 1 and a['larg'][0] == a['larg'][1] and abs(a['alt'][0] - a['alt'][1]) <= 4, a)
        G.chk('13.3', 'Camada invisível para leitor de tela e sem bloquear o mouse',
              pg.evaluate("(() => { const c = document.querySelector('#pg .la-camada'); return c.getAttribute('aria-hidden') === 'true' && getComputedStyle(c).pointerEvents === 'none'; })()"))
        ED_SCROLL = "(() => { const ta = ED.g.textarea; ta.scrollTop = 400; return new Promise(r => requestAnimationFrame(() => r(document.querySelector('#pg .la-camada').scrollTop === ta.scrollTop))); })()"
        G.chk('13.4', 'A camada acompanha a rolagem do campo', pg.evaluate(ED_SCROLL))
        pg.evaluate("ED.g.textarea.scrollTop = 0; ED.g.element.scrollIntoView({ block: 'start', behavior: 'instant' })"); pg.wait_for_timeout(300)
        r = pg.evaluate("(() => { const s = [...document.querySelectorAll('#pg .la-camada .la-m')].find(x => x.textContent.startsWith('[clique')); const q = s.getClientRects()[0]; return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()")
        p135 = pg.evaluate(PONTO_MARCA_JS)
        if not p135['noCampo']:                                       # algo cobre o ponto: centraliza o editor e mede de novo
            pg.evaluate("ED.g.element.scrollIntoView({ block: 'center', behavior: 'instant' })"); pg.wait_for_timeout(200)
            p135 = pg.evaluate(PONTO_MARCA_JS)
        pg.mouse.click(p135['x'], p135['y']); _esperar(pg, BALAO_ABERTO); pg.wait_for_timeout(100)
        e135 = pg.evaluate(ESTADO_BALAO_JS)
        ok135 = e135['balao'] and 'clique aqui' in e135['msg'] and e135['focoNoCampo']
        if not ok135:
            try:
                pg.screenshot(path=str(Path(amb.args.saida) / 'falha-13.5.png'))
            except Exception:
                pass
        G.chk('13.5', 'Clique na marca abre o balão com a mensagem, sem tirar o foco do texto',
              ok135, {'ponto': p135, 'depois': e135})
        pg.keyboard.press('Escape')
        G.chk('13.6', 'Esc fecha o balão', not pg.is_visible('.la-balao'))
        pg.evaluate('ED.g.textarea.focus()'); pg.keyboard.type('x')                # 13.7 nao depende do 13.5
        G.chk('13.7', 'Ao digitar, as marcas somem (não ficam fora do lugar)', pg.evaluate("document.querySelectorAll('#pg .la-camada .la-m').length") == 0,
              pg.evaluate("({ marcas: document.querySelectorAll('#pg .la-camada .la-m').length, focoNoCampo: document.activeElement === ED.g.textarea })"))
        pg.wait_for_function("document.querySelectorAll('#pg .la-camada .la-m').length > 0", timeout=6000)
        G.chk('13.8', 'E voltam depois da conferência', True)
        pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", TEXTO_MARCAS); pg.wait_for_timeout(1500)
        pg.evaluate('ED.g.textarea.focus(); ED.g.textarea.setSelectionRange(0, 0)'); pg.keyboard.press('Alt+Shift+N'); _esperar(pg, BALAO_ABERTO); pg.wait_for_timeout(150)
        e = pg.evaluate("(() => { const b = document.querySelector('.la-balao'); return [!!b && !b.hidden, b ? b.textContent.slice(0, 60) : '', document.activeElement === ED.g.textarea]; })()")
        G.chk('13.9', 'Alt+Shift+N mostra o balão do próximo item e o foco fica no texto', e[0] and 'pulou' in e[1] and e[2], e)
        pg.keyboard.press('Alt+Shift+I'); pg.wait_for_timeout(200)
        G.chk('13.10', 'Alt+Shift+I leva o foco à primeira correção do balão', pg.evaluate('document.activeElement.textContent') == 'Ajustar nível')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(900)
        G.chk('13.11', 'Corrigir pelo balão aplica e devolve o foco ao texto',
              pg.evaluate("ED.g.textarea.value.split('\\n')[2]") == '## Prazos' and pg.evaluate('document.activeElement === ED.g.textarea') and not pg.is_visible('.la-balao'))
        rod = pg.inner_text('#pg .st-la')
        G.chk('13.12', 'Resumo no rodapé do editor', rod == 'Acessibilidade: 3 para corrigir', rod)
        pg.evaluate("AcessibilidadeTexto.abrir('g')"); pg.wait_for_timeout(300)
        pg.locator('#laP-g [data-la-marcas-sug]').check(); pg.wait_for_timeout(200)
        G.chk('13.13', '"Marcar também as sugestões" sublinha as sugestões (linha pontilhada)', pg.evaluate("document.querySelectorAll('#pg .la-camada .la-m.s').length") >= 1)
        a = pg.evaluate(ALINHAMENTO_JS)
        G.chk('13.14', 'Com o painel aberto (campo mais estreito), as marcas continuam alinhadas', a['max'] <= 1 and a['larg'][0] == a['larg'][1], a)
        pg.locator('#laP-g [data-la-marcas]').uncheck(); pg.wait_for_timeout(200)
        G.chk('13.15', '"Marcar no texto" desligado esconde as marcas e fica guardado',
              pg.evaluate("document.querySelector('#pg .la-camada').hidden") and pg.evaluate("localStorage.getItem('conteudista.acessibilidade.marcas')") == '0')
        pg.locator('#laP-g [data-la-marcas]').check()
        pg.click('#pg .mde-tb [data-m=p]'); pg.wait_for_timeout(200)
        G.chk('13.16', 'No modo Prévia, a camada some', pg.evaluate("document.querySelector('#pg .la-camada').hidden"))
        G.chk('13.17', 'As marcas não entram no texto', '<span' not in pg.evaluate('document.getElementById("g").value') and 'la-m' not in pg.evaluate('document.getElementById("g").value'))
        G.chk('13.18', 'Nenhum erro de JavaScript nas marcas', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()

def grupo14(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        try: ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        except Exception: pass
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
        pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", TEXTO_JANELAS)
        pg.wait_for_function("(AcessibilidadeTexto.resultado('g') || { resumo: {} }).resumo.corrigir === 1", timeout=8000)
        pg.evaluate("AcessibilidadeTexto.abrir('g')"); pg.wait_for_timeout(300)
        pg.locator('#laP-g .la-it', has_text='Descreva').locator('button', has_text='Descrever').click()
        pg.wait_for_selector('.lj-jan', timeout=5000); pg.wait_for_timeout(200)
        e = pg.evaluate("(() => { const j = document.querySelector('.lj-jan'); return [!!j, j && j.getAttribute('role'), j && j.getAttribute('aria-modal'), document.activeElement.id, !!document.querySelector('.lj-mini img')]; })()")
        G.chk('14.1', 'Descrever abre janela modal com a miniatura e o foco no título', e == [True, 'dialog', 'true', 'ljT', True], e)
        pg.click('.lj-jan [data-ok]'); pg.wait_for_timeout(100)
        G.chk('14.2', 'Aplicar sem descrição mostra o erro no campo, em linguagem simples', 'Escreva a descrição curta' in pg.inner_text('#ljdErro') and pg.evaluate("document.activeElement.id") == 'ljdCurta' and pg.get_attribute('#ljdCurta', 'aria-invalid') == 'true')
        pg.fill('#ljdCurta', 'x' * 160); pg.wait_for_timeout(50)
        G.chk('14.3', 'Contagem de caracteres avisa quando passa de 150', 'encurte' in pg.inner_text('#ljdCont'))
        pg.click('#ljdTb'); pg.wait_for_timeout(100)
        G.chk('14.4', 'Aba "Pedir ajuda a uma IA" (padrão Tab) com o aviso de uso autorizado', pg.get_attribute('#ljdTb', 'aria-selected') == 'true' and pg.is_visible('#ljdPb .lj-msg.aten') and not pg.is_visible('#ljdPa'))
        pg.click('[data-c=pedido]'); pg.wait_for_timeout(300)
        try: clip = pg.evaluate('navigator.clipboard.readText()')
        except Exception: clip = pg.inner_text('#ljdPed')
        if 'DESCREVER' not in clip: clip = pg.evaluate("document.getElementById('ljdPed').textContent")
        G.chk('14.5', 'Copiar pedido: pedido padronizado com o texto perto da imagem', 'DESCREVER IMAGEM (versão 1.0)' in clip and 'O pedido chega pelo sistema' in clip, clip[:80])
        pg.fill('#ljdResp', 'DESCRIÇÃO CURTA: Fluxo de aprovação em três etapas.\nDESCRIÇÃO DETALHADA: 1. Pedido. 2. Análise. 3. Decisão.')
        G.chk('14.6', 'A resposta da IA é separada em descrição curta e detalhada', pg.input_value('#ljdCurta') == 'Fluxo de aprovação em três etapas.' and pg.input_value('#ljdDet').startswith('1. Pedido.'))
        pg.click('.lj-jan [data-ok]')
        pg.wait_for_function("ED.g.textarea.value.includes('![Fluxo de aprovação em três etapas.](img:1)')", timeout=5000); pg.wait_for_timeout(300)
        v = pg.evaluate('ED.g.textarea.value')
        G.chk('14.7', 'Aplicar grava a descrição e a detalhada abaixo da imagem; a janela fecha e o foco volta ao texto',
              '![Fluxo de aprovação em três etapas.](img:1)\n\n1. Pedido.' in v and not pg.is_visible('.lj-fundo') and pg.evaluate('document.activeElement === ED.g.textarea'))
        pg.evaluate('ED.g.desfazer()')
        G.chk('14.8', 'Um Ctrl+Z desfaz a descrição inteira', '![](img:1)' in pg.evaluate('ED.g.textarea.value') and '1. Pedido.' not in pg.evaluate('ED.g.textarea.value'))
        pg.wait_for_function("(AcessibilidadeTexto.resultado('g') || { resumo: {} }).resumo.corrigir === 1", timeout=8000); pg.wait_for_timeout(200)
        pg.locator('#laP-g .la-it', has_text='Descreva').locator('button', has_text='Descrever').click()
        pg.wait_for_selector('.lj-jan', timeout=5000); pg.wait_for_timeout(100)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        G.chk('14.9', 'Esc fecha sem aplicar e devolve o foco ao botão que abriu', not pg.is_visible('.lj-fundo') and pg.evaluate('document.activeElement.textContent') == 'Descrever')
        if pg.locator('#laP-g .la-abre[aria-expanded=false]').count(): pg.locator('#laP-g .la-abre').click()
        pg.locator('#laP-g .la-it', has_text='Frase longa').locator('button', has_text='Simplificar').click()
        pg.wait_for_selector('#ljsCont', timeout=5000); pg.wait_for_timeout(100)
        G.chk('14.10', 'Simplificar mostra Antes e Depois com a contagem', pg.inner_text('#ljsCont').startswith('27 palavras · 1 frase'))
        pg.fill('#ljsDepois', 'Envie o pedido com os documentos. A área técnica analisa no prazo.')
        G.chk('14.11', 'A contagem acompanha a edição', 'todas com até 25 palavras' in pg.inner_text('#ljsCont'))
        pg.click('.lj-jan [data-ok]')
        pg.wait_for_function("ED.g.textarea.value.includes('Envie o pedido com os documentos.')", timeout=5000); pg.wait_for_timeout(1200)
        G.chk('14.12', '"Trocar no texto" substitui o trecho', 'Envie o pedido com os documentos.' in pg.evaluate('ED.g.textarea.value') and 'solicitação deverá' not in pg.evaluate('ED.g.textarea.value'))
        if pg.locator('#laP-g .la-abre[aria-expanded=false]').count(): pg.locator('#laP-g .la-abre').click()
        pg.locator('#laP-g .la-it', has_text='QWER').locator('button', has_text='Explicar').click()
        pg.wait_for_selector('#ljxNome', timeout=5000)
        pg.fill('#ljxNome', 'Quadro de Registro')
        G.chk('14.13', 'Explicar sigla mostra a prévia', 'Quadro de Registro (QWER) aprova' in pg.inner_text('#ljxPrev'))
        pg.keyboard.press('Enter')
        pg.wait_for_function("ED.g.textarea.value.includes('O Quadro de Registro (QWER) aprova')", timeout=5000)
        G.chk('14.14', 'Enter aplica a explicação', True)
        G.chk('14.15', 'Nenhum erro de JavaScript nas janelas', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()
    d = amb.tmp / 'decorativa'; d.mkdir(exist_ok=True)
    (d / 'a.md').write_text('# T\n\n## A\n\nTexto.\n\n<!-- linguagem-acessivel: decorativa -->\n![](' + PNG_1PX + ')\n', encoding='utf-8')
    (d / 'b.md').write_text('---\ntitle: X\n---\n\n# S\n\n<!-- linguagem-acessivel: decorativa -->\n![](' + PNG_1PX + ')\n', encoding='utf-8')
    r = rodar([sys.executable, str(suporte.GERADOR), str(d / 'a.md'), str(d / 'b.md'), '--prefixo', 'D', '--saida', str(d / 'o')], cwd=RAIZ)
    saida = (r.stdout or '') + (r.stderr or '')
    G.chk('14.16', 'Gerador: imagem decorativa não gera aviso de "sem descrição"', r.returncode == 0 and 'sem descrição' not in saida and 'sem texto alternativo' not in saida, saida[-300:])
    xml = ''
    try:
        with zipfile.ZipFile(d / 'o' / 'Apresentacao_D.pptx') as z: xml = ''.join(z.read(n).decode('utf-8', 'ignore') for n in z.namelist() if n.startswith('ppt/slides/slide'))
    except Exception as ex: xml = str(ex)
    G.chk('14.17', 'Gerador: no PPTX, a imagem fica marcada como decorativa', 'adec:decorative' in xml)
