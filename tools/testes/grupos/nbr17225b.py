"""Grupo 24 - NBR 17225 (1.94): janelas do padrao gov.br no lugar de confirm() e prompt() (A14).
Confere: Apagar dados e Apagar pacotes abrem janela propria (alertdialog), com foco em Cancelar,
Esc cancela sem apagar, nenhum dialogo nativo e janela de senha com campo mascarado e erro no campo.
"""
import functools, http.server, threading
from pathlib import Path
import suporte

RAIZ = Path(suporte.GERADOR).resolve().parents[1]


def _servidor():
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=str(RAIZ / 'web')))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d/index.html' % srv.server_address[1]


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
        pg.keyboard.press('Escape')
        pg.wait_for_function("!document.querySelector('dialog.dlg-gov')", timeout=3000)
        auto = pg.evaluate("localStorage.getItem('conteudista.auto')")
        G.chk('24.3', 'Esc cancela sem apagar e devolve o foco', auto != '0', {'auto': auto})
        pg.evaluate("document.getElementById('gerLimpar').click()")
        pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
        pg.click('dialog.dlg-gov [data-d="nao"]')
        pg.wait_for_function("!document.querySelector('dialog.dlg-gov')", timeout=3000)
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
        pg.close()
    finally:
        srv.shutdown()
