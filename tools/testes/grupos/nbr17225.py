"""Grupo 22 - NBR 17225 / WCAG nivel A na apresentacao gerada (1.91).
A01 (WCAG 2.1.4): atalhos de uma tecla so com o foco na apresentacao; interruptor no painel; Alt+Shift.
A02 (WCAG 1.4.2): leitura em voz alta com Parar (botao, Esc/fechar painel, troca de slide).
"""
import os, subprocess, sys, tempfile
from pathlib import Path
import suporte

APOSTILA = "# Teste do grupo 22\n\nTexto curto da apostila.\n"
SLIDES = ("---\ntitle: Teste do grupo 22\n---\n\n# Primeiro slide\n\nTexto do primeiro slide.\n\n---\n\n"
          "# Segundo slide\n\nTexto do segundo slide.\n\n---\n\n# Terceiro slide\n\nTexto do terceiro slide.\n")

FALA = """(() => { const f = { falou: 0, cancelou: 0, speak(u) { this.falou++; this.u = u; }, cancel() { this.cancelou++; } };
  window.__fala = f; try { Object.defineProperty(window, 'speechSynthesis', { value: f, configurable: true }); } catch (e) { window.speechSynthesis = f; } })();"""


def _gerar(amb):
    base = tempfile.mkdtemp(prefix='g22-', dir=getattr(amb, 'tmp', None))
    ap, sl, out = Path(base, 'apostila.md'), Path(base, 'slides.md'), Path(base, 'saida')
    ap.write_text(APOSTILA, encoding='utf-8'); sl.write_text(SLIDES, encoding='utf-8')
    env = dict(os.environ, PYTHONUTF8='1', PYTHONIOENCODING='utf-8')
    r = subprocess.run([sys.executable, str(suporte.GERADOR), str(ap), str(sl), '--prefixo', 'G22', '--rodape', 'Teste',
                        '--saida', str(out), '--tema', 'govbr'], capture_output=True, text=True, env=env, encoding='utf-8', errors='replace')
    alvo = next(iter(sorted(out.glob('Apresentacao_*.html'))), None) if out.exists() else None
    if r.returncode != 0 or not alvo:
        raise RuntimeError('gerador falhou: ' + (r.stderr or r.stdout)[-300:])
    return alvo


def grupo22(amb, ctx, G):
    alvo = _gerar(amb)
    pg = ctx.new_page(); erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)))
    pg.add_init_script(FALA)
    pg.goto(alvo.as_uri()); pg.wait_for_selector('#st .s.on', state='attached', timeout=15000)
    pg.evaluate("() => { const x = document.getElementById('ini'); if (x) x.remove(); localStorage.removeItem('conteudista.gerados.atalhos'); }")
    pg.reload(); pg.wait_for_selector('#st .s.on', state='attached', timeout=15000)
    pg.evaluate("() => { const x = document.getElementById('ini'); if (x) x.remove(); }")
    ler = lambda: pg.evaluate("document.body.classList.contains('modo-leitura')")
    slide = lambda: pg.evaluate("[...document.querySelectorAll('#st .s')].findIndex(s => s.classList.contains('on'))")
    sem_foco = lambda: pg.evaluate("() => { if (document.activeElement) document.activeElement.blur(); }")
    abrir = lambda: (pg.click('#a11yToggle'), pg.wait_for_function("document.getElementById('a11yPanel').open", timeout=5000))
    fechar = lambda: (pg.keyboard.press('Escape'), pg.wait_for_function("!document.getElementById('a11yPanel').open", timeout=5000))

    # 22.1 interruptor
    abrir()
    cx = pg.locator('#a11yPanel [data-a11y="atalhos"]')
    G.chk('22.1', 'Painel tem o interruptor "Atalhos de uma tecla", ligado por padrão', cx.count() == 1 and cx.is_checked())
    # 22.2 foco no painel: L nao age
    cx.focus(); pg.keyboard.press('l')
    G.chk('22.2', 'Com o foco no painel, a tecla L não muda o modo', not ler())
    fechar()
    # 22.3 ligado + foco na apresentacao
    sem_foco(); pg.keyboard.press('l'); a = ler(); pg.keyboard.press('l'); b = ler()
    G.chk('22.3', 'Ligado e com o foco na apresentação, L liga e desliga o Modo leitura', a and not b, {'1o': a, '2o': b})
    # 22.4 desligado: letras nao agem; Alt+Shift age; setas continuam
    abrir(); cx.uncheck(); guardado = pg.evaluate("localStorage.getItem('conteudista.gerados.atalhos')"); fechar()
    sem_foco(); pg.keyboard.press('l'); l_unica = ler()
    s0 = slide(); pg.keyboard.press('n'); pg.keyboard.press('Space')
    G.chk('22.4', 'Desligado (guardado), L, N e Espaço não agem', guardado == '0' and not l_unica, {'guardado': guardado, 'leitura': l_unica})
    pg.keyboard.press('Alt+Shift+L'); alt_on = ler(); pg.keyboard.press('Alt+Shift+L'); alt_off = ler()
    G.chk('22.5', 'Desligado, Alt+Shift+L liga e desliga o Modo leitura', alt_on and not alt_off, {'on': alt_on, 'off': alt_off})
    sem_foco(); pg.keyboard.press('ArrowRight'); s1 = slide()
    G.chk('22.6', 'Desligado, as setas continuam mudando de slide', s1 == s0 + 1, {'antes': s0, 'depois': s1})
    ks = pg.evaluate("(document.getElementById('bLer') || {}).getAttribute ? document.getElementById('bLer').getAttribute('aria-keyshortcuts') : ''")
    G.chk('22.7', 'Desligado, aria-keyshortcuts anuncia Alt+Shift (bLer = Alt+Shift+L)', ks == 'Alt+Shift+L', ks)
    sem_foco(); pg.keyboard.press('+'); z1 = pg.evaluate("document.documentElement.classList.contains('zoom-slide')")
    pg.keyboard.press('Alt+Shift+Equal'); z2 = pg.evaluate("document.documentElement.classList.contains('zoom-slide')")
    pg.keyboard.press('Alt+Shift+Digit0'); z3 = pg.evaluate("document.documentElement.classList.contains('zoom-slide')")
    G.chk('22.8', 'Desligado, + não amplia; Alt+Shift+= amplia e Alt+Shift+0 volta', not z1 and z2 and not z3, {'+': z1, 'alt+': z2, 'alt0': z3})
    abrir(); cx.check(); fechar()
    # 22.9 a 22.11 leitura em voz alta
    bt = pg.locator('#a11yPanel [data-a11y="ouvir"]')
    abrir(); bt.click()
    p1, t1 = bt.get_attribute('aria-pressed'), bt.inner_text().strip()
    bt.click(); p2 = bt.get_attribute('aria-pressed'); c2 = pg.evaluate('window.__fala.cancelou')
    G.chk('22.9', 'Ouvir vira "Parar leitura" (aria-pressed) e o 2º clique interrompe', p1 == 'true' and 'Parar' in t1 and p2 == 'false' and c2 >= 2, {'p1': p1, 't1': t1, 'p2': p2, 'cancel': c2})
    bt.click(); c3 = pg.evaluate('window.__fala.cancelou'); fechar(); p3 = bt.get_attribute('aria-pressed'); c4 = pg.evaluate('window.__fala.cancelou')
    G.chk('22.10', 'Fechar o painel (Esc) interrompe a leitura', p3 == 'false' and c4 > c3, {'p': p3, 'antes': c3, 'depois': c4})
    abrir(); bt.click(); c5 = pg.evaluate('window.__fala.cancelou')
    pg.evaluate("document.dispatchEvent(new CustomEvent('conteudista:slide'))")
    p6, c6 = bt.get_attribute('aria-pressed'), pg.evaluate('window.__fala.cancelou'); fechar()
    G.chk('22.11', 'Mudar de slide interrompe a leitura', p6 == 'false' and c6 > c5, {'p': p6, 'antes': c5, 'depois': c6})
    G.chk('22.12', 'Nenhum erro de JavaScript', not erros, erros)
    pg.evaluate("localStorage.removeItem('conteudista.gerados.atalhos')")
    pg.close()