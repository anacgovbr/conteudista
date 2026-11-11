"""Grupos 23 e 24 - NBR 17225 no aplicativo (1.97).
Grupo 23: abas Apostila/Apresentacao com papel de aba e setas (A04), areas de arquivo pelo teclado (A03),
          area de mensagens anunciada (A05) e botao Historico fora do summary (A04).
Grupo 24: janelas do padrao gov.br no lugar de confirm() e prompt() (A14): Apagar dados e Apagar pacotes,
          Restaurar padrao, Versoes (Esc so fecha a confirmacao; salvar com nome), remover imagem do texto,
          Locucao e narracao. Nenhum dialogo nativo pode aparecer.
"""
import functools, http.server, threading
from pathlib import Path
import suporte

RAIZ = Path(suporte.GERADOR).resolve().parents[1]
PNG = 'data:image/png;base64,iVBORw0KGgo='
SEM_DIALOGO = "!document.querySelector('dialog.dlg-gov')"
RM = '#pg .mde-gi [data-a="rm"]'


def _servidor():
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=str(RAIZ / 'web')))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d/index.html' % srv.server_address[1]


def grupo23(amb, ctx, G):
    srv, url = _servidor()
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(url); pg.wait_for_selector('#abas', state='attached', timeout=20000)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        e = pg.evaluate("""() => { const q = id => document.getElementById(id), a = id => (k => q(id).getAttribute(k));
            return { lista: q('abas').getAttribute('role'), tg: [a('tg')('role'), a('tg')('aria-selected'), a('tg')('aria-controls')],
              ts: [a('ts')('role'), a('ts')('aria-selected'), a('ts')('aria-controls')], pg: q('pg').getAttribute('role'), ps: q('ps').getAttribute('role') }; }""")
        G.chk('23.1', 'Abas Apostila e Apresentacao com papel de aba, estado selecionado e painel associado',
              e['lista'] == 'tablist' and e['tg'] == ['tab', 'true', 'pg'] and e['ts'] == ['tab', 'false', 'ps'] and e['pg'] == 'tabpanel' and e['ps'] == 'tabpanel', e)
        pg.focus('#tg'); pg.keyboard.press('ArrowRight')
        pg.wait_for_function("document.getElementById('ts').getAttribute('aria-selected') === 'true'", timeout=5000)
        e = pg.evaluate("({ ps: document.getElementById('ps').hidden, pg: document.getElementById('pg').hidden, foco: document.activeElement.id, tg: document.getElementById('tg').tabIndex, ts: document.getElementById('ts').tabIndex })")
        G.chk('23.2', 'Seta para a direita passa para Apresentacao, mostra o painel e leva o foco para a aba',
              (not e['ps']) and e['pg'] and e['foco'] == 'ts' and e['tg'] == -1 and e['ts'] == 0, e)
        pg.keyboard.press('Home')
        pg.wait_for_function("document.getElementById('tg').getAttribute('aria-selected') === 'true'", timeout=5000)
        e = pg.evaluate("({ pg: document.getElementById('pg').hidden, foco: document.activeElement.id })")
        G.chk('23.3', 'Home volta para Apostila', (not e['pg']) and e['foco'] == 'tg', e)
        areas = pg.evaluate("[...document.querySelectorAll('.drop')].map(d => [d.getAttribute('role'), d.tabIndex])")
        G.chk('23.4', 'Areas de arquivo sao botoes alcancaveis pelo teclado', len(areas) == 2 and all(a == ['button', 0] for a in areas), areas)
        pg.evaluate("window.__fmd = 0; document.getElementById('fmd').addEventListener('click', ev => { window.__fmd++; ev.preventDefault(); })")
        pg.focus('#pg .drop'); pg.keyboard.press('Enter'); n1 = pg.evaluate('window.__fmd')
        pg.keyboard.press('Space'); n2 = pg.evaluate('window.__fmd')
        G.chk('23.5', 'Enter e Espaco na area de arquivo abrem o seletor de arquivos', n1 == 1 and n2 == 2, {'enter': n1, 'espaco': n2})
        lg = pg.evaluate("(l => [l.getAttribute('role'), l.getAttribute('aria-live')])(document.getElementById('log'))")
        G.chk('23.6', 'Area de mensagens anunciada ao leitor de tela (role=log, aria-live=polite)', lg == ['log', 'polite'], lg)
        n = pg.evaluate("document.querySelectorAll('#dxRes > summary button, #dxRes > summary a, #dxRes > summary input, #dxRes > summary select').length")
        G.chk('23.7', 'Nenhum controle dentro do titulo recolhivel de Arquivos gerados', n == 0, n)
        G.chk('23.8', 'Nenhum erro de JavaScript', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()


def grupo24(amb, ctx, G):
    srv, url = _servidor()
    try:
        pg = ctx.new_page(); erros = []; nativos = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.on('dialog', lambda d: (nativos.append(d.message), d.dismiss()))
        pg.goto(url); pg.wait_for_selector('#dclear', state='attached', timeout=20000)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        G.chk('24.1', 'Modulo Dialogo carregado', pg.evaluate('!!window.Dialogo'))
        pg.evaluate("document.getElementById('dclear').click()")
        pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
        info = pg.evaluate("""() => { const d = document.querySelector('dialog.dlg-gov[open]');
            return { role: d.getAttribute('role'), tit: d.querySelector('#dlgT').textContent, foco: document.activeElement.textContent }; }""")
        G.chk('24.2', 'Apagar dados abre janela (alertdialog) com titulo, foco em Cancelar e sem confirm() nativo',
              info['role'] == 'alertdialog' and bool(info['tit']) and info['foco'] == 'Cancelar' and not nativos, {'info': info, 'nativos': nativos})

        pg.evaluate("window.__esc = []; document.addEventListener('keydown', e => window.__esc.push([e.key, Math.round(performance.now()), document.querySelectorAll('dialog.dlg-gov[open]').length]), true)")

        def fechou_por_esc():
            pg.bring_to_front()
            pg.keyboard.press('Escape')
            try:
                pg.wait_for_function(SEM_DIALOGO, timeout=2500)
                return True
            except Exception:
                return False
        esc = fechou_por_esc()
        diag = pg.evaluate("({ teclas: window.__esc, abertas: document.querySelectorAll('dialog.dlg-gov[open]').length, foco: (document.activeElement.textContent || document.activeElement.tagName).slice(0, 20), pagina_com_foco: document.hasFocus(), agora: Math.round(performance.now()) })")
        if not esc:
            pg.click('dialog.dlg-gov [data-d="nao"]')
        pg.wait_for_function(SEM_DIALOGO, timeout=10000)
        auto = pg.evaluate("localStorage.getItem('conteudista.auto')")
        G.chk('24.3', 'Esc cancela sem apagar e devolve o foco', esc and auto != '0', {'auto': auto, 'fechou_por_esc': esc, 'diag': diag})
        pg.evaluate("document.getElementById('gerLimpar').click()")
        pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
        pg.click('dialog.dlg-gov [data-d="nao"]')
        pg.wait_for_function(SEM_DIALOGO, timeout=10000)
        G.chk('24.4', 'Apagar pacotes gerados: janela propria, Cancelar fecha', not nativos, nativos)

        pg.evaluate("() => { window.__p = Dialogo.senha({ titulo: 'Teste', rotulo: 'Abrir' }); return true; }")
        pg.wait_for_selector('dialog.dlg-gov[open] input[type=password]', timeout=5000)
        foco = pg.evaluate('document.activeElement.id')
        pg.click('dialog.dlg-gov [data-d="sim"]')
        invalido = pg.evaluate("document.getElementById('dlgI').getAttribute('aria-invalid')")
        pg.fill('#dlgI', 'abc'); pg.keyboard.press('Enter')
        valor = pg.evaluate('window.__p')
        G.chk('24.5', 'Senha: campo mascarado com foco, erro no campo se vazio e Enter devolve a senha',
              foco == 'dlgI' and invalido == 'true' and valor == 'abc', {'foco': foco, 'invalido': invalido, 'valor': valor})
        G.chk('24.6', 'Nenhum erro de JavaScript', not erros, erros)

        # 24.7 Restaurar padrao: abre a janela, Esc cancela e a pagina nao recarrega
        pg.evaluate("window.__marca = 1")
        pg.evaluate("document.getElementById('btnRestaurar').click()")
        pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
        tit = pg.evaluate("document.getElementById('dlgT').textContent")
        pg.keyboard.press('Escape'); pg.wait_for_function(SEM_DIALOGO, timeout=10000)
        G.chk('24.7', 'Restaurar padrao: janela propria, Esc cancela e a pagina nao recarrega',
              'padr' in tit and pg.evaluate('window.__marca') == 1 and not nativos, {'titulo': tit, 'nativos': nativos})

        # 24.8 Esc numa confirmacao aberta sobre Versoes fecha so a confirmacao
        pg.evaluate("document.getElementById('g').value = '# Teste 24 versoes\\n\\nTexto da versao.\\n'; ED.g.refresh();")
        pg.evaluate("Hist.abrir('g')")
        pg.wait_for_function("!document.querySelector('.hist-back').hidden", timeout=5000)
        pg.evaluate("document.getElementById('hLimpa').click()")
        pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
        pg.keyboard.press('Escape'); pg.wait_for_function(SEM_DIALOGO, timeout=10000)
        aberta = pg.evaluate("!document.querySelector('.hist-back').hidden")
        G.chk('24.8', 'Versoes: Esc na confirmacao fecha so a confirmacao; a janela Versoes continua aberta', aberta and not nativos, {'versoes_abertas': aberta, 'nativos': nativos})

        # 24.9 Salvar versao com nome pelo campo de texto
        pg.evaluate("document.getElementById('hMarca').click()")
        pg.wait_for_selector('dialog.dlg-gov[open] input[type=text]', timeout=5000)
        rot = pg.evaluate("document.querySelector('dialog.dlg-gov label').textContent")
        pg.fill('#dlgI', 'Versao do grupo 24'); pg.keyboard.press('Enter')
        pg.wait_for_function("[...document.querySelectorAll('#hA option')].some(o => o.textContent.includes('Versao do grupo 24'))", timeout=10000)
        G.chk('24.9', 'Salvar versao: campo de texto com rotulo, Enter grava a versao com o nome informado', rot == 'Nome' and not nativos, {'rotulo': rot, 'nativos': nativos})
        pg.keyboard.press('Escape'); pg.wait_for_function("document.querySelector('.hist-back').hidden", timeout=10000)

        # 24.10 Remover imagem do texto: Cancelar mantem; confirmar remove
        pg.evaluate("(m) => { document.getElementById('g').value = '# Img\\n\\n![Teste](' + m + ')\\n'; ED.g.refresh(); }", PNG)
        pg.wait_for_selector(RM, state='attached', timeout=5000)
        pg.evaluate("(s) => document.querySelector(s).click()", RM)
        pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
        pg.click('dialog.dlg-gov [data-d="nao"]'); pg.wait_for_function(SEM_DIALOGO, timeout=10000)
        manteve = pg.evaluate("ED.g.textarea.value.includes('(img:')")
        pg.evaluate("(s) => document.querySelector(s).click()", RM)
        pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
        pg.click('dialog.dlg-gov [data-d="sim"]')
        pg.wait_for_function("!ED.g.textarea.value.includes('(img:')", timeout=10000)
        G.chk('24.10', 'Remover imagem: Cancelar mantem a imagem e confirmar remove', manteve and not nativos, {'manteve': manteve, 'nativos': nativos})

        # 24.11 Locucao e narracao: janelas proprias
        titulos = {}
        for ident in ('locLimparHist', 'ahLimpar', 'locRemModelo'):
            pg.evaluate("(i) => document.getElementById(i).click()", ident)
            pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
            titulos[ident] = pg.evaluate("document.getElementById('dlgT').textContent")
            pg.click('dialog.dlg-gov [data-d="nao"]'); pg.wait_for_function(SEM_DIALOGO, timeout=10000)
        G.chk('24.11', 'Locucao e narracao: limpar historico e remover vozes abrem janela propria', all(titulos.values()) and not nativos, {'titulos': titulos, 'nativos': nativos})
        G.chk('24.12', 'Nenhum erro de JavaScript nas janelas', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()
