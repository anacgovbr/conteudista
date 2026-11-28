import suporte
from suporte import RAIZ, _servidor

TOUR = "try { localStorage.setItem('conteudista.tour', '1'); localStorage.setItem('conteudista.aba', 'apostila'); } catch (e) {}"
# como o roteiro geral: parte de "Criar do zero" e clica na Apostila no DOMContentLoaded (a rota precisa vencer isso)
EDITOR = ("document.addEventListener('DOMContentLoaded', () => { const b = document.getElementById('btnCriarZero'); "
          "if (b && !location.hash.startsWith('#cx=')) { b.click(); const g = document.getElementById('tg'); if (g) g.click(); } });")

ESTADO = """() => { const a = document.getElementById('abasApp'), s = a && a.querySelector('button[data-aba][aria-selected="true"]');
  const vis = el => !!el && !el.hidden && el.getClientRects().length > 0;
  const z = document.getElementById('btnCriarZero');
  return { hash: location.hash, aba: s ? s.getAttribute('data-aba') : null, abas: vis(a), loc: vis(document.getElementById('secLoc')),
           ps: vis(document.getElementById('ps')), pg: vis(document.getElementById('pg')), bv: vis(document.getElementById('boasVindas')),
           zero: z ? { visivel: vis(z), oculto: z.hidden, desab: z.disabled } : null,
           editor: (document.getElementById('editorArea') || {}).hidden === false,
           pop: !!document.querySelector('.tr-pop'), hist: history.length, rotas: !!window.Rotas }; }"""

# clique por JavaScript (como os módulos e o tutorial fazem): não depende de animação, sobreposição ou rolagem
CLICAR = "s => { const e = document.querySelector(s); if (!e) return 'ausente'; e.click(); return 'ok'; }"


def grupo29(amb, ctx, G):
    """Grupo 29: rotas por hash (#/apostila, #/apresentacao, #/apresentacao/narracao) sem conflito com #cx=, #tema= e #conteudo."""
    srv, url = _servidor(RAIZ / 'web')
    br = getattr(ctx, 'browser', None)
    c = br.new_context(viewport={'width': 1280, 'height': 800}) if br else ctx
    erros = []

    def pagina(destino, editor=True):
        pg = c.new_page()
        pg.add_init_script(TOUR)
        if editor:
            pg.add_init_script(EDITOR)
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(destino)
        pg.wait_for_load_state('load')
        pg.wait_for_function('() => !!window.Rotas && !!window.Locucao', timeout=40000)
        pg.wait_for_timeout(1600)
        return pg

    def clicar(pg, sel):
        r = pg.evaluate(CLICAR, sel)
        pg.wait_for_timeout(250)
        return r

    def esperar(pg, cond, ms=5000):
        try:
            pg.wait_for_function(cond, timeout=ms)
        except Exception:
            pass
        return pg.evaluate(ESTADO)

    def caso(id, titulo, fn):
        # cada caso é independente: uma exceção vira falha com o motivo, sem interromper os demais
        try:
            cond, det = fn()
        except Exception as e:
            cond, det = False, 'exceção: ' + type(e).__name__ + ': ' + str(e)[:300]
        G.chk(id, titulo, cond, det)

    SEL_ABA = "document.querySelector('#abasApp button[aria-selected=\"true\"]') && document.querySelector('#abasApp button[aria-selected=\"true\"]').getAttribute('data-aba') === "

    try:
        a = pagina(url)
        e0 = a.evaluate(ESTADO)

        caso('29.1', 'Abrir sem rota: Rotas existe, a URL não muda e a aba salva (Apostila) continua valendo',
             lambda: (e0['rotas'] and e0['hash'] == '' and e0['aba'] == 'apostila' and e0['abas'], e0))

        def c2():
            r1 = clicar(a, '#ts'); e1 = esperar(a, "location.hash === '#/apresentacao'")
            r2 = clicar(a, '#abasApp button[data-aba="locucao"]'); e2 = esperar(a, "location.hash === '#/apresentacao/narracao'")
            r3 = clicar(a, '#tg'); e3 = esperar(a, "location.hash === '#/apostila'")
            return (e1['hash'] == '#/apresentacao' and e1['ps'] and e2['hash'] == '#/apresentacao/narracao' and e2['loc']
                    and e3['hash'] == '#/apostila' and e3['pg'] and e3['hist'] == e0['hist'], [r1, r2, r3, e0, e1, e2, e3])
        caso('29.2', 'Trocar de aba atualiza a URL (#/apresentacao, #/apresentacao/narracao, #/apostila) sem criar entradas no histórico', c2)

        b = {}

        def c3():
            b['p'] = pagina(url + '#/apresentacao/narracao')
            eb = esperar(b['p'], SEL_ABA + "'locucao'")
            return (eb['aba'] == 'locucao' and eb['loc'] and eb['hash'] == '#/apresentacao/narracao', eb)
        caso('29.3', 'Abrir #/apresentacao/narracao mostra a Narração, mesmo com a Apostila salva e clicada na abertura', c3)

        def c4():
            b['p'].evaluate("location.hash = '#/apostila'")
            e = esperar(b['p'], SEL_ABA + "'apostila'")
            return (e['aba'] == 'apostila' and e['pg'], e)
        caso('29.4', 'Rota digitada na barra de endereço troca a aba', c4)

        def c5():
            d = pagina(url + '#/apresentacao')
            ed = esperar(d, SEL_ABA + "'apresentacao'")
            return (ed['aba'] == 'apresentacao' and ed['ps'], ed)
        caso('29.5', 'Abrir #/apresentacao mostra o editor da Apresentação', c5)

        def c6():
            x = pagina(url + '#/naoexiste')
            ex = esperar(x, "location.hash === '#/apostila'")
            return (ex['hash'] == '#/apostila' and ex['aba'] == 'apostila', ex)
        caso('29.6', 'Rota desconhecida é corrigida para a aba visível, sem erro', c6)

        def c7():
            outros = {}
            for frag in ('#conteudo', '#nao-e-rota'):
                p = pagina(url + frag)
                clicar(p, '#ts'); p.wait_for_timeout(400)
                outros[frag] = p.evaluate(ESTADO)
            return (all(v['hash'] == k and v['aba'] == 'apresentacao' for k, v in outros.items()), outros)
        caso('29.7', 'Fragmentos que não são rota (#conteudo e outros) ficam intocados ao trocar de aba', c7)

        def c8():
            h = pagina(url)
            h.evaluate("history.pushState({ mvFolha: 1 }, '')")
            antes = h.evaluate('history.length')
            clicar(h, '#ts'); h.wait_for_timeout(400)
            st = h.evaluate("({ estado: history.state, hist: history.length, hash: location.hash })")
            return (bool(st['estado']) and st['estado'].get('mvFolha') == 1 and st['hist'] == antes and st['hash'] == '#/apresentacao', st)
        caso('29.8', 'Estado do histórico da folha do celular é preservado e nenhuma entrada nova é criada', c8)

        def c9():
            w = pagina(url + '#/apresentacao/narracao', editor=False)
            ew = w.evaluate(ESTADO)
            r = clicar(w, '#btnCriarZero')
            ew2 = esperar(w, "location.hash === '#/apresentacao'")
            return (ew['bv'] and not ew['editor'] and not ew['loc'] and r == 'ok' and ew2['aba'] == 'apresentacao' and ew2['ps']
                    and not ew2['loc'] and ew2['hash'] == '#/apresentacao', {'antes': ew, 'clique': r, 'depois': ew2})
        caso('29.9', 'Na tela de boas-vindas a rota é ignorada; depois de Criar do zero vale o comportamento normal e a URL acompanha', c9)

        def c10():
            relevantes = [x for x in erros if 'Rotas' in x or 'rotas.js' in x or 'replaceState' in x or 'hash' in x.lower()]
            return (not relevantes, relevantes or erros[:5])
        caso('29.10', 'Nenhum erro de JavaScript ligado às rotas', c10)
    finally:
        try:
            if c is not ctx:
                c.close()
        except Exception:
            pass
        try:
            srv.shutdown()
        except Exception:
            pass
