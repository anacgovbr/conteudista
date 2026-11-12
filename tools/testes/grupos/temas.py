"""Grupo 25 - Temas personalizados (1.98).

Cobre o recurso de primeira classe: catalogo embutido, seletor, janela gov.br, editor,
persistencia no IndexedDB, versoes e comparacao, link com snapshot, importacao,
imagens de fundo em WebP e o gate de contraste antes de gerar.
"""
import functools, http.server, threading
from pathlib import Path
import suporte

RAIZ = Path(suporte.GERADOR).resolve().parents[1]
PNG = ('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
       'AAAADUlEQVR42mP8z8BQDwAFgwJ/lK3Q6wAAAABJRU5ErkJggg==')


def _servidor():
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=str(RAIZ / 'web')))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d/index.html' % srv.server_address[1]


def _abrir(pg, url):
    pg.goto(url)
    pg.wait_for_selector('#btnTemas', state='attached', timeout=20000)
    pg.wait_for_function("window.Temas && document.querySelectorAll('#tema option').length >= 4", timeout=20000)


def grupo25(amb, ctx, G):
    srv, url = _servidor()
    try:
        pg = ctx.new_page(); erros = []
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.on('pageerror', lambda e: erros.append(str(e)))
        _abrir(pg, url)

        e = pg.evaluate("""() => ({
            api: !!(window.Temas && Temas.salvar && Temas.importarTexto && Temas.garantirContraste),
            embutidos: [...document.querySelectorAll('#tema optgroup[label="Embutidos"] option')].map(o => o.value),
            grupos: [...document.querySelectorAll('#tema optgroup')].map(g => g.label)
        })""")
        G.chk('25.1', 'API carregada e seletor com os temas embutidos',
              e['api'] and set(e['embutidos']) == {'govbr', 'classico', 'anac20-claro', 'anac20-escuro'}, e)

        aberta = pg.evaluate("Temas.abrir('meus').then(() => true)")
        pg.wait_for_selector('#jnTemasBack:not([hidden])', timeout=10000)
        info = pg.evaluate("""() => ({
            abas: [...document.querySelectorAll('#jnTemasWin .jn-tab')].map(b => b.dataset.jk),
            itens: document.querySelectorAll('#tmLista .tm-item').length,
            titulo: document.querySelector('#jnTemasWin .jn-top h2').textContent
        })""")
        G.chk('25.2', 'Janela de temas abre com as quatro abas e lista os embutidos',
              info['abas'] == ['meus', 'editor', 'versoes', 'importar'] and info['itens'] >= 4 and bool(info['titulo']), info)
        G.chk('25.3', 'Abrir a janela nao gera erro de JavaScript', not erros and aberta is not None, erros)

        salvo = pg.evaluate("""async () => {
            const T = Temas.normalizar({ base: 'govbr', nome: 'Tema 25', descricao: 'Teste do grupo 25',
                paleta: { primaria: '#123456', destaque: '#0b7a3b' } });
            const s = await Temas.salvar(T, { idForcado: 'teste-25', variantes: false, versao: true, rotulo: 'Criacao' });
            const alvo = await Temas.atualizarSeletor('custom:' + s.id);
            await Temas.aoSelecionar(alvo);
            return { id: s.id, alvo: alvo, selo: document.getElementById('temaAux').textContent,
                     grupos: [...document.querySelectorAll('#tema optgroup')].map(g => g.label) };
        }""")
        G.chk('25.4', 'Tema personalizado salvo no navegador e aplicado ao seletor',
              salvo['id'] == 'teste-25' and salvo['alvo'] == 'custom:teste-25' and 'personalizado' in salvo['selo'].lower()
              and 'Meus temas' in salvo['grupos'], salvo)
        pg.evaluate("Temas.abrir('meus')")
        pg.wait_for_function("document.querySelectorAll('#tmLista .tm-item').length >= 5", timeout=10000)
        G.chk('25.5', 'Tema novo aparece em Meus temas com as acoes de editar e excluir',
              pg.evaluate("""() => { const b = [...document.querySelectorAll('#tmLista button')].map(x => x.dataset.a);
                  return b.includes('editar') && b.includes('excluir') && b.includes('copiar') && b.includes('link'); }"""))

        pg.evaluate("Temas.abrir('versoes')")
        pg.wait_for_function("document.querySelector('#tmVerTema option[value=\"teste-25\"]')", timeout=10000)
        pg.wait_for_function("document.querySelectorAll('#tmVerA option').length >= 2", timeout=10000)
        e = pg.evaluate("""() => ({
            tema: document.getElementById('tmVerTema').value,
            a: document.getElementById('tmVerA').value,
            b: document.getElementById('tmVerB').value,
            info: document.getElementById('tmVerInfo').textContent
        })""")
        G.chk('25.6', 'Aba Versoes lista o historico do tema e escolhe A e B',
              e['tema'] == 'teste-25' and e['a'] == 'atual' and e['b'] != 'atual' and 'vers' in e['info'].lower(), e)

        # Muda a cor primaria e salva uma segunda versao para haver diferenca semantica.
        pg.evaluate("""async () => {
            const T = await Temas.carregar('custom:teste-25');
            T.paleta.primaria = '#0b7a3b';
            await Temas.salvar(T, { idForcado: 'teste-25', variantes: false, versao: true, rotulo: 'Mudanca de cor' });
            await Temas.abrir('versoes');
        }""")
        pg.wait_for_function("document.querySelectorAll('#tmVerA option').length >= 3", timeout=10000)
        pg.click('#tmVerComparar')
        pg.wait_for_function("document.querySelectorAll('#tmVerRes .tm-diff tbody tr').length > 0", timeout=10000)
        e = pg.evaluate("""() => ({
            linhas: document.querySelectorAll('#tmVerRes .tm-diff tbody tr').length,
            resumo: document.querySelector('#tmVerRes .tm-resumo').textContent,
            jsonA: document.getElementById('tmJsonA').value.length,
            jsonB: document.getElementById('tmJsonB').value.length
        })""")
        G.chk('25.7', 'Comparacao semantica mostra so os campos alterados e preenche o JSON avancado',
              e['linhas'] >= 1 and e['jsonA'] > 0 and e['jsonB'] > 0 and 'campo' in e['resumo'].lower(), e)

        link = pg.evaluate("Temas.link('custom:teste-25')")
        G.chk('25.8', 'Link do tema leva o snapshot no fragmento #tema=', '#tema=' in link and len(link) > 40, {'tamanho': len(link)})
        # O link acima nao fica no campo; importa o valor gerado.
        imp = pg.evaluate("""async (url) => {
            const r = await Temas.importarTexto(url, { salvar: true, conflito: 'duplicar' });
            return { id: r.id, substituir: r.substituir, lista: (await Temas.listar()).length };
        }""", link)
        G.chk('25.9', 'Reimportar o link duplica o tema em vez de sobrescrever',
              imp['id'] != 'teste-25' and imp['substituir'] is False and imp['lista'] >= 2, imp)

        img = pg.evaluate("""async (png) => {
            const r = await Temas.importarTexto({ base: 'govbr', id: 'teste-img', nome: 'Imagem 25',
                telas: { capa: { imagem: png, imagem_opacidade: 55 } } }, { salvar: true, conflito: 'duplicar' });
            const T = await Temas.carregar('custom:teste-img');
            const json = await Temas.jsonParaGeracao('custom:teste-img');
            return { id: r.id, ref: T.telas.capa.imagem, opacidade: T.telas.capa.imagem_opacidade,
                     data: json.includes('data:image/png') };
        }""", PNG)
        G.chk('25.10', 'Imagem de fundo e extraida para o banco e resolvida antes de gerar',
              img['id'] == 'teste-img' and img['ref'].startswith('img:') and img['data'], img)

        contraste = pg.evaluate("""async () => {
            const T = Temas.normalizar({ base: 'govbr', nome: 'Contraste 25',
                telas: { interna_clara: { fundo: '#ffffff', texto: '#eeeeee' } } });
            await Temas.salvar(T, { idForcado: 'teste-contraste', variantes: false, versao: false, corrigir: false });
            window.__gcr = null;
            window.__gc = Temas.garantirContraste('custom:teste-contraste').then(v => { window.__gcr = v; return v; });
            return true;
        }""")
        pg.wait_for_selector('dialog.dlg-gov[open]', timeout=10000)
        titulo = pg.evaluate("document.getElementById('dlgT').textContent")
        pg.click('dialog.dlg-gov [data-d="sim"]')
        pg.wait_for_function('window.__gcr === true', timeout=15000)
        restou = pg.evaluate("async () => Temas.falhas(await Temas.carregar('custom:teste-contraste')).length")
        G.chk('25.11', 'Gate de contraste oferece correcao e libera a geracao depois de corrigir',
              'contraste' in titulo.lower() and restou == 0, {'titulo': titulo, 'falhas': restou, 'resultado': contraste})

        removido = pg.evaluate("Temas.remover('custom:teste-contraste', { semConfirmar: true })")
        pg.wait_for_function("Temas.carregar('custom:teste-contraste').then(t => t === null)", timeout=10000)
        G.chk('25.12', 'Excluir o tema remove o registro do banco', removido is True)

        # Abrir o proprio link em uma pagina nova deve aplicar o tema recebido sem sobrescrever o local.
        pg.goto(link)
        pg.wait_for_function("window.Temas && document.querySelector('#tema optgroup[label=\"Recebido por link\"]')", timeout=20000)
        avulso = pg.evaluate("""() => {
            const sel = document.getElementById('tema'), opt = sel.querySelector('optgroup[label="Recebido por link"] option');
            return { valor: sel.value, avulso: !!(opt && opt.value), local: !!document.querySelector('#tema option[value="custom:teste-25"]') };
        }""")
        G.chk('25.13', 'Link #tema= aplica o tema recebido no carregamento e preserva o tema local',
              avulso['avulso'] and avulso['local'] and avulso['valor'].startswith('custom:') and avulso['valor'] != 'custom:teste-25', avulso)

        # Voltar ao app e recarregar: a escolha salva de um tema personalizado precisa sobreviver.
        pg.goto(url)
        pg.wait_for_function("window.Temas && document.querySelector('#tema option[value=\"custom:teste-25\"]')", timeout=20000)
        pg.evaluate("""async () => {
            const alvo = await Temas.atualizarSeletor('custom:teste-25');
            localStorage.setItem('conteudista.tema', alvo);
        }""")
        pg.reload()
        pg.wait_for_function("window.Temas && document.getElementById('tema').value === 'custom:teste-25'", timeout=20000)
        e = pg.evaluate("""() => ({
            valor: document.getElementById('tema').value,
            salvo: localStorage.getItem('conteudista.tema'),
            selo: document.getElementById('temaAux').textContent
        })""")
        G.chk('25.14', 'Tema personalizado salvo continua selecionado depois de recarregar a pagina',
              e['valor'] == 'custom:teste-25' and e['salvo'] == 'custom:teste-25' and 'personalizado' in e['selo'].lower(), e)

        G.chk('25.15', 'Nenhum erro de JavaScript durante o fluxo de temas', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()