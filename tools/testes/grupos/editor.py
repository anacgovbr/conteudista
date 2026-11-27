import argparse, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path
import suporte
from suporte import (
    RAIZ, _servidor
)

def grupo8(amb, ctx, G):
    import shutil
    YAML = ('versao: 1\neditor:\n  modo_inicial: previa\nsalvar:\n  automaticamente: desligado\n'
            'link:\n  onde_guardar: privatebin\n  imagens_como_anexo: desligado\n')
    pastas = {}
    for nome, conteudo in (('padrao', None), ('alterado', YAML)):
        d = amb.tmp / f'web_{nome}'
        if not d.exists():
            shutil.copytree(RAIZ / 'web', d)
            if conteudo is not None:
                (d / 'config' / 'opcoes.yaml').write_text(conteudo, encoding='utf-8')
        pastas[nome] = d
    def ler_estado(pg):
        pg.wait_for_selector('.mde', state='attached', timeout=15000)
        return pg.evaluate("""() => ({ carregado: !!(window.Opcoes && Opcoes.carregado()), avisos: window.Opcoes ? Opcoes.avisos().length : -1,
            modo: (document.querySelector('.mde') || {dataset: {}}).dataset.m, auto: document.getElementById('auto').checked,
            mode: document.getElementById('mode').value, anexo: document.getElementById('anexo').checked })""")
    srv1, url1 = _servidor(pastas['padrao'])
    srv2, url2 = _servidor(pastas['alterado'])
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e) + '\n' + str(getattr(e, 'stack', ''))))
        pg.goto(url1); e = ler_estado(pg)
        G.chk('8.1', 'opcoes.yaml lido ao abrir, sem avisos', e['carregado'] and e['avisos'] == 0, e)
        G.chk('8.2', 'Sem mudar o YAML, tudo começa como antes (dividido, salvar automático, link autocontido)',
              e['modo'] == 's' and e['auto'] and e['mode'] == 'self' and e['anexo'], e)
        G.chk('8.3', 'Nenhum erro de JavaScript ligado às opções', not [x for x in erros if 'pcoes' in x], erros)
        pg.close()
        c2 = amb.novo_contexto()
        try:
            pg = c2.new_page(); pg.goto(url2); e = ler_estado(pg)
            G.chk('8.4', 'YAML alterado muda o padrão (prévia, salvar automático desligado, PrivateBin, sem anexo)',
                  e['modo'] == 'p' and not e['auto'] and e['mode'] == 'pb' and not e['anexo'], e)
            pg.evaluate("localStorage.setItem('mde.modo', 'e')"); pg.reload(); e = ler_estado(pg)
            G.chk('8.5', 'A escolha da pessoa prevalece sobre o YAML', e['modo'] == 'e', e)
            pg.click('#btnRestaurar')
            pg.wait_for_selector('dialog.dlg-gov[open]', timeout=5000)
            with pg.expect_navigation(timeout=15000):
                pg.click('dialog.dlg-gov [data-d="sim"]')
            e = ler_estado(pg)
            G.chk('8.6', 'Restaurar padrão volta ao YAML', e['modo'] == 'p' and pg.evaluate("localStorage.getItem('mde.modo')") is None, e)
            pg.close()
        finally:
            c2.close()
    finally:
        srv1.shutdown(); srv2.shutdown()

def grupo9(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        # Este grupo testa o editor, nao o tutorial da primeira visita.
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.goto(url); pg.wait_for_selector('#pg .mde-tb.mv-tb', state='attached', timeout=15000); pg.wait_for_timeout(500)
        pg.locator('#bcAcoesEdicao #ex').wait_for(state='visible')
        pg.locator('#bcAcoesEdicao #clr').wait_for(state='visible')
        acoes_texto = pg.locator('#bcAcoesEdicao button').evaluate_all("""bs => bs.map(b => {
            const s = getComputedStyle(b);
            return { borda: s.borderTopWidth, fundo: s.backgroundColor,
                altura: b.getBoundingClientRect().height };
        })""")
        G.chk('9.29', 'Ações contextuais sem borda nem fundo e com alvo de 44 px no celular',
              len(acoes_texto) == 2 and all(b['borda'] == '0px' and
              b['fundo'] in ('transparent', 'rgba(0, 0, 0, 0)') and
              b['altura'] >= 44 for b in acoes_texto), acoes_texto)
        posicao = pg.locator('#bcAcoesEdicao').evaluate("""el => ({
            foraDoSummary: !el.closest('summary'),
            abaixoDoTitulo: !!el.previousElementSibling?.matches('summary, h2')
        })""")
        G.chk('9.28', 'Carregar exemplo e Limpar ficam abaixo do titulo, fora do summary',
              posicao['foraDoSummary'] and posicao['abaixoDoTitulo'], posicao)
        btns = pg.evaluate("""() => ['#btnImportar','#ex','#clr'].map(q => {
          const b = document.querySelector(q), s = getComputedStyle(b);
          return { id: q, display: s.display, align: s.alignItems, justify: s.justifyContent,
            lineHeight: s.lineHeight, height: b.getBoundingClientRect().height };
        })""")
        G.chk('9.21', 'Ações principais: rótulos centralizados verticalmente nos botões', all(
            b['display'] in ('flex', 'inline-flex') and b['align'] == 'center' and b['justify'] == 'center' and
            b['lineHeight'] == 'normal' and b['height'] >= 32 for b in btns), btns)
        pg.locator('#bcAcoesEdicao #ex').click()
        pg.wait_for_function("document.getElementById('g').value.includes('Conteudista na Prática')", timeout=15000)
        pg.evaluate("document.querySelector('#pg .mde').scrollIntoView()")
        e = pg.evaluate("""() => { const tb = document.querySelector('#pg .mde-tb');
            const v = [...tb.children].filter(x => x.offsetParent !== null && x.getBoundingClientRect().height > 0);
            const ys = [...new Set(v.map(x => Math.round(x.getBoundingClientRect().top / 4)))];
            const peq = v.filter(x => x.getBoundingClientRect().height < 40 || x.getBoundingClientRect().width < 24).length;
            return { linhas: ys.length, rolagem: tb.scrollWidth > tb.clientWidth + 1, peq }; }""")
        G.chk('9.1', 'Celular: barra do editor em no máximo 2 linhas, sem rolagem lateral', e['linhas'] <= 2 and not e['rolagem'], e)
        G.chk('9.2', 'Celular: botões da barra com altura de 40 px ou mais e largura de 24 px ou mais (WCAG 2.5.8)', e['peq'] == 0, e)
        bt = pg.locator('#pg .mv-bt[data-g=ins]')
        G.chk('9.3', 'Menu Inserir com aria-haspopup="menu" e aria-expanded', bt.get_attribute('aria-haspopup') == 'menu' and bt.get_attribute('aria-expanded') == 'false')
        bt.click(); pg.wait_for_timeout(150)
        itens = pg.evaluate("[...document.querySelectorAll('.mv-menu:not([hidden]) [role=menuitem]')].map(x => x.textContent.trim())")
        foco = pg.evaluate("document.activeElement.getAttribute('role')")
        G.chk('9.4', 'Inserir lista Link, Imagem, Tabela e Imagens do texto; foco no primeiro item', any(x.startswith('Link') for x in itens) and any(x.startswith('Imagens do texto') for x in itens) and foco == 'menuitem', itens[:4] + ['…'])
        pg.keyboard.press('ArrowDown'); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        G.chk('9.5', 'Esc fecha o menu e devolve o foco ao botão', pg.evaluate("document.activeElement.dataset.g") == 'ins' and bt.get_attribute('aria-expanded') == 'false')
        extras_movel = pg.evaluate("""() => { const tb=document.querySelector('#pg .mde-tb'), r=q=>tb.querySelector(q).getBoundingClientRect();
          return {mais:!!tb.querySelector('.mv-bt[data-g=mais]'), extras:[...tb.querySelectorAll('.mv-ext')].map(e=>({ordem:+e.style.order,vis:e.getBoundingClientRect().width>0})),
            inserir:+tb.querySelector('.mv-bt[data-g=ins]').parentElement.style.order,
            modo:Math.min(...[...tb.querySelectorAll('[data-m]')].map(e=>+e.style.order)), rolagem:tb.scrollWidth>tb.clientWidth+1}; }""")
        G.chk('9.22', 'Celular: sem gaveta Mais vazia; extras visíveis entre edição e modos do painel',
              not extras_movel['mais'] and all(x['vis'] for x in extras_movel['extras'])
              and extras_movel['inserir'] < extras_movel['extras'][0]['ordem']
              and all(extras_movel['extras'][i]['ordem'] < extras_movel['extras'][i+1]['ordem'] for i in range(3))
              and extras_movel['extras'][-1]['ordem'] < extras_movel['modo'] and not extras_movel['rolagem'], extras_movel)
        # 1.116: itens do menu Salvar com ícone e bloco de texto no mesmo eixo vertical
        pg.locator('#btnSalvar').click(); pg.wait_for_timeout(150)
        salvar = pg.evaluate("""() => [...document.querySelectorAll('#jnMenuSalvar .jn-mi')].map(b => {
          const r = b.getBoundingClientRect(), sv = b.querySelector('svg').getBoundingClientRect();
          const sp = b.querySelector('span'), ss = getComputedStyle(sp);
          return { nome: b.querySelector('b').textContent, icone: Math.round((sv.top + sv.bottom) / 2 - (r.top + r.bottom) / 2),
            display: ss.display, direcao: ss.flexDirection, justificar: ss.justifyContent }; })""")
        G.chk('9.24', 'Menu Salvar: ícone e bloco de texto centralizados no item',
              all(i['icone'] == 0 and i['display'] == 'flex' and i['direcao'] == 'column' and i['justificar'] == 'center' for i in salvar), salvar)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        # 1.116: a tag "nova" das Novidades centraliza o texto dentro da cápsula
        badge = pg.evaluate("""() => { const d = document.createElement('div'); d.className = 'cl-v nova';
          d.innerHTML = '<h4>Versão 1.116</h4>'; document.body.appendChild(d);
          const s = getComputedStyle(d.querySelector('h4'), '::after');
          const v = { display: s.display, alinhar: s.alignItems, justificar: s.justifyContent, altura: s.lineHeight, vertical: s.verticalAlign };
          d.remove(); return v; }""")
        G.chk('9.25', 'Tag "nova": texto centralizado vertical e horizontalmente na cápsula',
              badge['display'] == 'inline-flex' and badge['alinhar'] == 'center' and badge['justificar'] == 'center'
              and badge['altura'] == '11px' and badge['vertical'] == 'middle', badge)
        pg.click('#ts'); pg.wait_for_timeout(120)
        pg.locator('#ps .mv-bt[data-g=ins]').click(); pg.wait_for_timeout(150)
        modelos = pg.evaluate("[...document.querySelectorAll('.mv-menu:not([hidden]) [data-layout]')].map(x => x.dataset.layout)")
        G.chk('9.26', 'Celular: Inserir oferece os 25 modelos de slide', len(modelos) == 25, {'total': len(modelos), 'exemplos': modelos[:3]})
        pg.locator('.mv-menu:not([hidden]) [role=menuitem]', has_text='4 cards').click(); pg.wait_for_timeout(200)
        G.chk('9.27', 'Celular: modelo insere a diretiva de layout no slide', '<!-- layout: cards-4 -->' in pg.evaluate("document.querySelector('#ps .mde-ta').value"))
        pg.keyboard.press('Control+z'); pg.wait_for_timeout(100)
        pg.click('#tg'); pg.wait_for_timeout(120)
        antes = pg.evaluate("document.querySelector('#pg .mde-ta').value.length")
        pg.locator('#pg .mv-bt[data-g=fmt]').click(); pg.locator('.mv-menu:not([hidden]) [role=menuitem]', has_text='Título 2').click(); pg.wait_for_timeout(150)
        G.chk('9.6', 'Item do menu aciona o botão original (Título 2 altera o texto)', pg.evaluate("document.querySelector('#pg .mde-ta').value.length") != antes)
        pg.keyboard.press('Control+z'); pg.wait_for_timeout(100)
        st = pg.evaluate("(() => { const s = document.querySelector('#pg .mde-st'); return { h: s.getBoundingClientRect().height, role: s.getAttribute('role') }; })()")
        G.chk('9.7', 'Contagem do texto em uma linha (até 32 px), tocável para ver detalhes', st['h'] <= 32 and st['role'] == 'button', st)
        G.chk('9.8', 'Imagens do texto recolhida abaixo do editor', pg.evaluate("document.querySelector('#pg .mde-gal').offsetParent === null"))
        bt.click(); pg.locator('.mv-menu:not([hidden]) [role=menuitem]', has_text='Imagens do texto').click(); pg.wait_for_timeout(200)
        f = pg.evaluate("(() => { const g = document.querySelector('#pg .mde-gal'); return { folha: g.classList.contains('mv-folha'), role: g.getAttribute('role'), modal: g.getAttribute('aria-modal'), foco: g.contains(document.activeElement) }; })()")
        G.chk('9.9', 'Inserir › Imagens do texto abre folha inferior modal com o foco dentro', f['folha'] and f['role'] == 'dialog' and f['modal'] == 'true' and f['foco'], f)
        gal = pg.locator('#pg .mde-gal')
        controles = gal.locator('.gtools .acao-texto').evaluate_all("""els => els.map(el => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return { borda: s.borderTopWidth, fundo: s.backgroundColor,
                     visivel: r.height > 0, altura: r.height };
        })""")
        ordenar = gal.get_by_role('combobox', name='Ordenar imagens')
        editar = gal.locator('.gbs')
        G.chk('9.30', 'Galeria com controles leves, ordenação nomeada e edição em lote oculta sem seleção',
              len(controles) == 5 and sum(c['visivel'] for c in controles) == 4 and
              all(c['borda'] == '0px' and
                  c['fundo'] in ('transparent', 'rgba(0, 0, 0, 0)') and c['altura'] >= 44
                  for c in controles if c['visivel']) and
              ordenar.is_visible() and editar.is_hidden() and editar.is_disabled(), controles)
        contraste = pg.evaluate("""() => {
            const raiz = document.documentElement;
            const gal = document.querySelector('#pg .mde-gal');
            const alvos = [...document.querySelectorAll('#bcAcoesEdicao .acao-texto'),
                           ...gal.querySelectorAll('.acao-texto:not([hidden])')];
            const rgb = cor => (cor.match(/[\\d.]+/g) || []).map(Number);
            const L = valores => valores.slice(0, 3).map(v => {
                const c = v / 255;
                return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
            }).reduce((n, c, i) => n + c * [.2126, .7152, .0722][i], 0);
            const coef = el => {
                const fg = L(rgb(getComputedStyle(el).color));
                let bg = 1;
                for (let no = el; no; no = no.parentElement) {
                    const c = rgb(getComputedStyle(no).backgroundColor);
                    if (c.length === 3 || c[3] === 1) { bg = L(c); break; }
                }
                return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
            };
            const original = raiz.classList.contains('contraste');
            try {
                raiz.classList.remove('contraste');
                const normal = alvos.map(coef);
                raiz.classList.add('contraste');
                return { normal, alto: alvos.map(coef) };
            } finally { raiz.classList.toggle('contraste', original); }
        }""")
        G.chk('9.31', 'Ações de texto têm contraste mínimo de 4,5:1 no modo normal e no alto contraste',
              all(v >= 4.5 for lista in contraste.values() for v in lista), contraste)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
        G.chk('9.10', 'Esc fecha a folha de imagens', pg.evaluate("!document.querySelector('#pg .mde-gal').classList.contains('mv-folha')"))
        pg.click('#btnImportar'); pg.wait_for_timeout(300)
        abas = pg.evaluate("[...document.querySelectorAll('#jnImpBack .jn-tab')].map(x => x.textContent.trim())")
        sel = pg.evaluate("(document.querySelector('#jnImpBack .jn-tab[aria-selected=true]') || {}).textContent")
        G.chk('9.11', 'Importar: Link é a primeira aba e abre selecionada', abas[:1] == ['Link'] and (sel or '').strip() == 'Link', {'abas': abas, 'selecionada': sel})
        G.chk('9.12', 'Colar ficou só com Apostila e Apresentação', pg.evaluate("[...document.querySelectorAll('#clTabs .cl-tab')].map(x => x.textContent.trim().replace('\u2713',''))") == ['Apostila', 'Apresentação'])
        pg.route('**/privatebin.exemplo/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"status":1,"message":"A cópia não existe, expirou ou já foi excluída."}'))
        pg.fill('#clUrl', 'https://privatebin.exemplo/?abc#def'); pg.click('#lkOk'); pg.wait_for_timeout(1500)
        msg = pg.evaluate("document.querySelector('#jnImpBack .jn-msg').textContent")
        G.chk('9.13', 'Erro do link em linguagem simples (sem nome técnico) e foco no campo do endereço', 'não funciona mais' in msg and 'PrivateBin' not in msg and pg.evaluate("document.activeElement.id") == 'clUrl', msg)
        G.chk('9.14', 'Nenhum erro de JavaScript no celular', not erros, erros)
        # Painel lateral B1: licenciamento fica nas configuracoes do conteudo.
        pg.keyboard.press('Escape')
        pg.locator('#jnImpBack').wait_for(state='hidden')
        pg.locator('#btnConfigConteudo').click()
        pg.locator('#bcConfig #licenca').wait_for(state='visible')
        licenca = pg.evaluate("() => { const t = document.querySelector('#tema').getBoundingClientRect(), l = document.querySelector('#licenca').getBoundingClientRect(); return { valor: document.querySelector('#licenca').value, nome: document.querySelector('label[for=licenca]').textContent.trim(), descricao: document.querySelector('#licenca').getAttribute('aria-describedby'), opcoes: document.querySelectorAll('#licenca option').length, altura: l.height, empilhado: l.top >= t.bottom - 1, larguraPagina: document.documentElement.scrollWidth <= innerWidth }; }")
        G.chk('9.15', 'Licenciamento começa vazio, tem rótulo associado, sete opções CC/CC0 e cabe no celular', licenca['valor'] == '' and licenca['nome'] == 'Licenciamento' and licenca['descricao'] == 'licAux' and licenca['opcoes'] == 8 and licenca['altura'] >= 48 and licenca['empilhado'] and licenca['larguraPagina'], licenca)
        pg.locator('#licenca').select_option('cc-by-4.0'); pg.wait_for_timeout(1800)
        salvo = pg.evaluate("async () => { const r = (await dbAll('rascunhos')).find(x => x.nome === 'Autossalvo'); return r && r.licenca; }")
        G.chk('9.16', 'Autossalvamento preserva o código da licença no trabalho', salvo == 'cc-by-4.0', salvo)
        pg.reload()
        pg.locator('#btnConfigConteudo').click()
        pg.locator('#bcConfig #licenca').wait_for(state='visible')
        pg.wait_for_function("document.getElementById('licenca').value === 'cc-by-4.0'", timeout=15000)
        restaurada = pg.locator('#licenca').input_value()
        G.chk('9.17', 'Reabrir o Conteudista restaura a licença do último trabalho', restaurada == 'cc-by-4.0', restaurada)
        hashes = pg.evaluate("async () => { const base = { g: '# Teste de identidade 9.18', s: '', p: 'Teste', r: '', b: '' }; const by = await Hist.registrar('marco', 'Licença BY', { ...base, licenca: 'cc-by-4.0' }); const sa = await Hist.registrar('gerado', 'Licença BY-SA', { ...base, licenca: 'cc-by-sa-4.0' }); const repetida = await Hist.registrar('gerado', 'Licença BY-SA repetida', { ...base, licenca: 'cc-by-sa-4.0' }); return { by: !!by, sa: !!sa, distintas: !!by && !!sa && by.h !== sa.h, repetida: repetida === null }; }")
        G.chk('9.18', 'O histórico distingue mudanças somente de licença e deduplica a mesma licença', hashes == {'by': True, 'sa': True, 'distintas': True, 'repetida': True}, hashes)
        poda = pg.evaluate("""async () => {
          const reg = (o, r, g) => Hist.registrar(o, r, { g, s: '', p: 'T', r: '', b: '' });
          const rotulos = async () => (await dbAll('versoes')).sort((a, b) => b.data - a.data).map(v => v.rotulo);
          await dbClear('versoes'); Hist.atualizar();
          await reg('marco', 'salva', '# salva');
          for (let i = 0; i < 245; i++) await reg('arquivo', 'q' + i, '# versão ' + i);
          const porQuantidade = await rotulos();
          await dbClear('versoes'); Hist.atualizar();
          await reg('marco', 'salva', '# salva');
          // Três versões de 80 MB declarados (texto curto, campo tam grande) passam de 200 MB quando chega uma nova.
          const t0 = Date.now() - 1000;
          for (let i = 1; i <= 3; i++) await dbPut('versoes', { data: t0 + i, origem: 'arquivo', rotulo: 'grande' + i, sess: '', h: 'g' + i, g: '# grande ' + i, s: '', p: 'T', r: '', b: '', licenca: '', tam: 80 * 1024 * 1024 });
          Hist.atualizar();
          await reg('arquivo', 'nova', '# nova');
          const porTamanho = (await rotulos()).sort();
          await dbClear('versoes'); Hist.atualizar();
          return { quantidade: porQuantidade.length, salvaFicou: porQuantidade.includes('salva'), maisNova: porQuantidade[0], tamanho: porTamanho };
        }""")
        G.chk('9.20', 'Histórico poda por quantidade (240) e por tamanho (200 MB), sem apagar salvas nem a mais nova',
              poda == {'quantidade': 240, 'salvaFicou': True, 'maisNova': 'q244', 'tamanho': ['grande2', 'grande3', 'nova', 'salva']}, poda)
        desktop = amb.novo_contexto(viewport={'width': 1280, 'height': 820})
        pgd = desktop.new_page()
        pgd.add_init_script("localStorage.setItem('conteudista.tour', '1')")
        pgd.goto(url)
        pgd.locator('#btnConfigConteudo').click()
        pgd.locator('#bcConfig #licenca').wait_for(state='visible')
        alinhamento = pgd.evaluate("""() => {
            const painel = document.getElementById('bcConfig');
            const tema = painel.querySelector('#tema').getBoundingClientRect();
            const licenca = painel.querySelector('#licenca').getBoundingClientRect();
            const p = painel.getBoundingClientRect();
            return {
                empilhados: tema.height > 0 && licenca.top >= tema.bottom - 1,
                largura: licenca.width, altura: licenca.height,
                dentro: p.left >= 0 && p.right <= innerWidth + 1 &&
                    licenca.left >= p.left && licenca.right <= p.right + 1,
                semRolagem: painel.scrollWidth <= painel.clientWidth + 1 &&
                    document.documentElement.scrollWidth <= innerWidth + 1
            };
        }""")
        G.chk('9.19', 'Layout e Licenciamento ficam empilhados no painel lateral, sem rolagem horizontal',
              alinhamento['empilhados'] and alinhamento['largura'] >= 220 and
              alinhamento['altura'] >= 48 and alinhamento['dentro'] and
              alinhamento['semRolagem'], alinhamento)
        desktop.close()
        pg.close()
    finally:
        srv.shutdown()


"""Grupo 26 - Regua de linhas do editor (1.98).

Cobre numeracao, rolagem sincronizada, linha atual, marcadores, recolhimento de
titulos e de blocos Mermaid/codigo e a garantia de que o Markdown, a selecao e a
acessibilidade nao mudam.
"""

TEXTO_26 = "\n".join([
    "# Título A",
    "texto de abertura",
    "",
    "## Seção B",
    "linha um",
    "linha dois",
    "",
    "```mermaid",
    "flowchart LR",
    "A-->B",
    "```",
    "fim",
])


def _estado_26(pg):
    return pg.evaluate(r"""() => {
        const box = document.querySelector('#pg .mde');
        const ln = box.querySelector('.mde-ln');
        const ta = box.querySelector('.mde-ta');
        const cam = box.querySelector('.mde-ln-camada');
        const cur = box.querySelector('.mde-ln-cur');
        const vis = box.querySelector('.mde-ln-visao');
        return {
            linhas: [...ln.querySelectorAll('.mde-ln-l')].map(r => ({
                l: +r.dataset.l, h: r.getBoundingClientRect().height, top: r.offsetTop,
                at: r.classList.contains('at'), num: (r.querySelector('.mde-ln-n') || {textContent: ''}).textContent.trim(),
                fch: r.classList.contains('fch')
            })),
            veus: [...box.querySelectorAll('.mde-ln-veu')].map(b => ({
                i: +b.dataset.e, t: b.textContent.trim(), top: parseFloat(b.style.top),
                h: parseFloat(b.style.height), rot: b.getAttribute('aria-label')
            })),
            botoes: [...ln.querySelectorAll('[data-f]')].map(b => ({ i: +b.dataset.f, t: b.title, gl: b.textContent })),
            total: ta.value.split('\n').length,
            valor: ta.value,
            real: document.getElementById('g').value,
            sel: [ta.selectionStart, ta.selectionEnd],
            foco: document.activeElement === ta,
            largura: ln.getBoundingClientRect().width,
            fonte: getComputedStyle(ln).fontFamily,
            aria: ln.getAttribute('aria-hidden'),
            camada: cam ? getComputedStyle(cam).display : null,
            cur: cur ? { vis: getComputedStyle(cur).display !== 'none', top: parseFloat(cur.style.top), h: parseFloat(cur.style.height) } : null,
            transform: getComputedStyle(ln.querySelector('.mde-ln-in')).transform,
            viva: (box.querySelector('.mde-sr') || {}).textContent || '',
            visao: vis ? { oculta: vis.hidden, display: getComputedStyle(vis).display,
                           top: Math.round(vis.getBoundingClientRect().top),
                           alt: Math.round(vis.getBoundingClientRect().height) } : null,
            taVis: getComputedStyle(ta).visibility,
            vlinhas: vis ? [...vis.querySelectorAll('.mde-ln-vl')].map(d => ({
                l: +d.dataset.l, h: d.getBoundingClientRect().height, txt: d.textContent })) : [],
            vveus: vis ? [...vis.querySelectorAll('.mde-ln-veu')].map(b => ({
                i: +b.dataset.e, t: b.textContent.trim() })) : []
        };
    }""")


def _texto_26(pg, texto):
    pg.evaluate("""(txt) => {
        const ta = document.querySelector('#pg .mde-ta');
        ta.focus();
        ta.value = txt;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
    }""", texto)
    pg.wait_for_function("document.querySelectorAll('#pg .mde-ln-l').length > 0", timeout=10000)
    pg.wait_for_timeout(450)


def grupo26(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(url)
        pg.wait_for_selector('#pg .mde-ln', state='attached', timeout=20000)

        _texto_26(pg, TEXTO_26)
        pg.wait_for_function("document.querySelectorAll('#pg .mde-ln-l').length === 12", timeout=15000)
        e = _estado_26(pg)
        numeros = {int(x['num']) for x in e['linhas']}
        G.chk('26.1', 'Régua discreta ao lado do texto, com um número para cada linha',
              len(e['linhas']) == e['total'] and numeros == set(range(1, e['total'] + 1))
              and e['largura'] <= 50 and 'Consolas' in e['fonte'] and e['aria'] == 'true', e)

        e = _estado_26(pg)
        G.chk('26.2', 'Texto de teste montado com 12 linhas numeradas', e['total'] == 12 and len(e['linhas']) == 12, e['total'])

        longa = "\n".join(['# Longo'] + ['linha ' + str(k) + ' do texto de rolagem' for k in range(60)])
        _texto_26(pg, longa)
        pg.evaluate("""() => { const ta = document.querySelector('#pg .mde-ta'); ta.scrollTop = 240; ta.dispatchEvent(new Event('scroll')); }""")
        pg.wait_for_timeout(200)
        rol = pg.evaluate("""() => {
            const ta = document.querySelector('#pg .mde-ta');
            const t = getComputedStyle(document.querySelector('#pg .mde-ln-in')).transform;
            return { topo: ta.scrollTop, y: parseFloat((t.match(/matrix\\([^)]*\\)/) || [''])[0].split(',')[5] || '0') };
        }""")
        G.chk('26.3', 'A régua acompanha a rolagem do texto', abs(rol['topo'] + rol['y']) < 1 and rol['topo'] > 100, rol)

        _texto_26(pg, TEXTO_26)
        pg.evaluate(r"""() => {
            const ta = document.querySelector('#pg .mde-ta');
            const p = ta.value.split('\n').slice(0, 4).join('\n').length + 1;
            ta.focus(); ta.setSelectionRange(p, p);
            ta.dispatchEvent(new Event('keyup', { bubbles: true }));
        }""")
        pg.wait_for_timeout(150)
        e = _estado_26(pg)
        at = [x for x in e['linhas'] if x['at']]
        G.chk('26.4', 'Linha atual destacada na régua e no texto, sem esconder o cursor',
              len(at) == 1 and at[0]['l'] == 4 and at[0]['num'] == '5'
              and e['cur'] and e['cur']['vis'] and abs(e['cur']['top'] - at[0]['top']) < 1, {'at': at, 'cur': e['cur']})

        G.chk('26.5', 'Marcadores nos títulos e nos blocos de código, com controle de recolhimento',
              sorted(b['i'] for b in e['botoes']) == [0, 3, 7] and all('Recolher' in b['t'] for b in e['botoes']), e['botoes'])

        antes = e['valor']
        pg.click('#pg .mde-ln [data-f="0"]')
        pg.wait_for_timeout(250)
        e = _estado_26(pg)
        G.chk('26.6', 'Recolher um título condensa a régua e o texto, sem alterar o Markdown',
              len(e['linhas']) == 1 and e['linhas'][0]['l'] == 0
              and len(e['veus']) == 1 and '11 linhas recolhidas' in e['veus'][0]['t']
              and e['valor'] == antes and e['real'] == antes
              and e['visao'] and not e['visao']['oculta'] and e['taVis'] == 'hidden'
              and len(e['vlinhas']) == 1 and 'Título A' in e['vlinhas'][0]['txt']
              and len(e['vveus']) == 1, {'linhas': len(e['linhas']), 'veus': e['veus'],
              'igual': e['valor'] == antes, 'visao': e['visao'], 'taVis': e['taVis'],
              'vlinhas': len(e['vlinhas'])})

        G.chk('26.7', 'O aviso de linhas recolhidas é um botão com nome acessível',
              e['veus'] and e['veus'][0]['rot'] == 'Expandir 11 linhas recolhidas'
              and '11 linhas recolhidas' in e['viva'], e['viva'])

        pg.click('#pg .mde-ln-veu')
        pg.wait_for_timeout(250)
        e = _estado_26(pg)
        G.chk('26.8', 'Clicar no aviso devolve todas as linhas, o foco no editor e o Markdown igual',
              len(e['linhas']) == 12 and not e['veus'] and e['valor'] == antes
              and e['visao'] and e['visao']['oculta'] and e['taVis'] == 'visible' and e['foco'],
              {'linhas': len(e['linhas']), 'igual': e['valor'] == antes,
               'visao': e['visao'], 'taVis': e['taVis'], 'foco': e['foco']})

        pg.evaluate(r"""() => {
            const ta = document.querySelector('#pg .mde-ta');
            const p = ta.value.split('\n').slice(0, 4).join('\n').length + 1;
            ta.focus(); ta.setSelectionRange(p, p);
            ta.dispatchEvent(new KeyboardEvent('keydown', { key: '[', code: 'BracketLeft', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
        }""")
        pg.wait_for_timeout(250)
        e = _estado_26(pg)
        G.chk('26.9', 'Ctrl+Shift+[ recolhe o bloco da linha do cursor',
              len(e['linhas']) == 4 and e['veus'] and e['veus'][0]['i'] == 3
              and '8 linhas recolhidas' in e['veus'][0]['t']
              and e['visao'] and not e['visao']['oculta'],
              {'linhas': len(e['linhas']), 'veus': e['veus'], 'visao': e['visao']})

        pg.evaluate("""() => {
            const ta = document.querySelector('#pg .mde-ta');
            ta.dispatchEvent(new KeyboardEvent('keydown', { key: ']', code: 'BracketRight', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
        }""")
        pg.wait_for_timeout(250)
        G.chk('26.10', 'Ctrl+Shift+] expande todos os blocos', len(_estado_26(pg)['linhas']) == 12)

        pg.evaluate(r"""() => {
            const ta = document.querySelector('#pg .mde-ta');
            const p = ta.value.split('\n').slice(0, 2).join('\n').length + 1;
            ta.focus(); ta.setSelectionRange(p, p + 3);
            ta.dispatchEvent(new Event('keyup', { bubbles: true }));
        }""")
        antes_sel = _estado_26(pg)['sel']
        pg.click('#pg .mde-ln [data-f="7"]')
        pg.wait_for_timeout(250)
        e = _estado_26(pg)
        G.chk('26.11', 'Recolher um bloco Mermaid não mexe na seleção nem no texto',
              len(e['linhas']) == 9 and e['sel'] == antes_sel and e['valor'] == antes
              and '3 linhas recolhidas' in (e['veus'][0]['t'] if e['veus'] else '')
              and e['visao'] and not e['visao']['oculta'] and len(e['vlinhas']) == 9,
              {'sel': e['sel'], 'antes': antes_sel, 'linhas': len(e['linhas']),
               'vlinhas': len(e['vlinhas'])})

        esperado = len("\n".join(TEXTO_26.split("\n")[:4])) + 1
        pg.click('#pg .mde-ln-visao [data-l="4"]')
        pg.wait_for_timeout(300)
        e = _estado_26(pg)
        G.chk('26.12', 'Clicar numa linha da visão compacta volta a editar no ponto clicado',
              e['sel'][0] == esperado and e['foco'] and not e['veus']
              and e['visao'] and e['visao']['oculta'] and e['taVis'] == 'visible'
              and len(e['linhas']) == 12,
              {'sel': e['sel'], 'esperado': esperado, 'foco': e['foco'],
               'visao': e['visao'], 'linhas': len(e['linhas'])})

        pg.click('#pg .mde-ln [data-f="0"]')
        pg.wait_for_timeout(250)
        pg.evaluate("""() => document.querySelector('#pg .mde-ln-visao').dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))""")
        pg.wait_for_timeout(300)
        e = _estado_26(pg)
        G.chk('26.13', 'Esc na visão compacta expande todos os blocos e devolve o editor',
              len(e['linhas']) == 12 and not e['veus'] and e['visao']['oculta']
              and e['taVis'] == 'visible', {'linhas': len(e['linhas']), 'visao': e['visao']})

        _texto_26(pg, "# Título\n" + ('palavra ' * 90).strip() + "\nfinal")
        pg.wait_for_timeout(250)
        e = _estado_26(pg)
        alt = {x['l']: x for x in e['linhas']}
        G.chk('26.14', 'Linha que quebra em várias linhas visuais mantém os números alinhados',
              alt[1]['h'] > 30 and abs(alt[2]['top'] - (alt[1]['top'] + alt[1]['h'])) < 1, {'h1': alt[1]['h'], 'top2': alt[2]['top']})

        # Alinhamento real: a marca da linha atual precisa cair sobre o texto, inclusive
        # depois de uma linha longa que quebra em várias linhas visuais.
        _texto_26(pg, "# Título\n" + ('palavra ' * 90).strip() + "\nfinal")
        pg.wait_for_timeout(250)
        pos = pg.evaluate(r"""() => {
            const box = document.querySelector('#pg .mde');
            const ta = box.querySelector('.mde-ta'), cs = getComputedStyle(ta);
            const larg = ta.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
            const esp = document.createElement('div');
            ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
             'whiteSpace', 'overflowWrap', 'wordBreak', 'direction'].forEach(k => { esp.style[k] = cs[k]; });
            Object.assign(esp.style, { position: 'absolute', left: '-9999px', top: '0', width: larg + 'px',
                boxSizing: 'content-box', padding: '0', margin: '0' });
            document.body.appendChild(esp);
            let acc = 0; const tops = [], alts = [];
            ta.value.split('\n').forEach(l => {
                const d = document.createElement('div');
                d.textContent = l === '' ? '\u200b' : l;
                esp.appendChild(d); tops.push(acc); alts.push(d.offsetHeight); acc += d.offsetHeight; d.remove();
            });
            esp.remove();
            const p = ta.value.split('\n').slice(0, 2).join('\n').length + 1;
            ta.focus(); ta.setSelectionRange(p, p);
            ta.dispatchEvent(new Event('keyup', { bubbles: true }));
            return { tops: tops, alts: alts };
        }""")
        pg.wait_for_timeout(300)
        marca = pg.evaluate(r"""() => {
            const cur = document.querySelector('#pg .mde-ln-cur');
            const dentro = document.querySelector('#pg .mde-ln-in');
            return { top: parseFloat(cur.style.top), alt: parseFloat(cur.style.height),
                     pad: parseFloat(getComputedStyle(dentro).paddingTop) || 0 };
        }""")
        esperado = pos['tops'][2] + marca['pad']
        G.chk('26.15', 'A linha atual cai sobre a linha do texto, mesmo depois de quebra de linha',
              pos['alts'][1] > 30 and abs(marca['top'] - esperado) <= 2
              and abs(marca['alt'] - pos['alts'][2]) <= 1,
              {'marca': marca, 'esperado': esperado, 'tops': pos['tops'][:3], 'alts': pos['alts'][:3]})

        _texto_26(pg, TEXTO_26)
        pg.click('#pg .mde-tb [data-m="p"]')
        pg.wait_for_timeout(300)
        oculta = pg.evaluate("""() => ({
            regua: getComputedStyle(document.querySelector('#pg .mde-ln')).display,
            camada: getComputedStyle(document.querySelector('#pg .mde-ln-camada')).display,
            visao: getComputedStyle(document.querySelector('#pg .mde-ln-visao')).display })""")
        pg.click('#pg .mde-tb [data-m="s"]')
        pg.wait_for_timeout(400)
        volta = pg.evaluate("() => document.querySelectorAll('#pg .mde-ln-l').length")
        G.chk('26.16', 'No modo somente prévia a régua some e volta ao dividir a tela',
              oculta['regua'] == 'none' and oculta['camada'] == 'none'
              and oculta['visao'] == 'none' and volta == 12, {'oculta': oculta, 'volta': volta})

        # Barra do editor compacta no computador: 4 ações visíveis + menus (1.116)
        barra = pg.evaluate("""() => {
            const tb = document.querySelector('#pg .mde-tb');
            const vis = el => el.offsetParent !== null && el.getBoundingClientRect().height > 0;
            const nome = el => (el.getAttribute('data-dica') || el.getAttribute('title') || el.getAttribute('aria-label') || el.textContent || '').trim();
            const botoes = [...tb.querySelectorAll(':scope > button')];
            return { compacta: tb.classList.contains('mv-tb'), visiveis: botoes.filter(vis).slice(0, 4).map(nome),
                     grupos: [...tb.querySelectorAll(':scope > .mv-grp > .mv-bt')].filter(vis).map(b => b.dataset.g),
                     escondidos: ['Título 1', 'Tabela', 'Imagem'].filter(n => botoes.some(b => nome(b).startsWith(n) && vis(b))) };
        }""")
        G.chk('26.18', 'Computador: barra do editor compacta com as 4 ações mais usadas e dois menus',
              barra['compacta'] and [n.split(' (')[0] for n in barra['visiveis']] == ['Desfazer', 'Refazer', 'Negrito', 'Itálico']
              and barra['grupos'] == ['fmt', 'ins'] and not barra['escondidos'], barra)
        extras = pg.evaluate("""() => { const tb=document.querySelector('#pg .mde-tb'), m=document.querySelector('.mv-menu:not([hidden])');
          const r=q=>tb.querySelector(q).getBoundingClientRect().left;
          return {mais:!!tb.querySelector('.mv-bt[data-g=mais]'), extras:[...tb.querySelectorAll('.mv-ext')].map(e=>({nome:e.title||e.textContent.trim(),x:e.getBoundingClientRect().left,vis:e.offsetParent!==null})),
            grupos:['fmt','ins'].map(g=>r('.mv-bt[data-g='+g+']')),modo:r('[data-m]')}; }""")
        G.chk('26.21', 'Computador: sem gaveta vazia; edição, extras e modos ficam nessa ordem',
              not extras['mais'] and len(extras['extras']) == 4 and all(e['vis'] for e in extras['extras'])
              and extras['grupos'][0] < extras['grupos'][1] < extras['extras'][0]['x']
              < extras['extras'][1]['x'] < extras['extras'][2]['x'] < extras['extras'][3]['x'] < extras['modo'], extras)
        alin = pg.evaluate("""() => { const tb = document.querySelector('#pg .mde-tb'), r = tb.getBoundingClientRect(),
            g = [...tb.querySelectorAll(':scope > .mv-grp')].map(e => e.getBoundingClientRect()), ex = [...tb.querySelectorAll('.mv-ext')].map(e => e.getBoundingClientRect());
            return { esq: tb.querySelector('button').getBoundingClientRect().left - r.left, grupoFim: Math.max(...g.map(x => x.right)) - r.left,
                     extraIni: Math.min(...ex.map(x => x.left)) - r.left, dir: r.right - Math.max(...ex.map(x => x.right)) }; }""")
        G.chk('26.24', 'Computador: inserção e formatação à esquerda; acessibilidade, compartilhar, versões e modos à direita',
              alin['esq'] < 40 and alin['extraIni'] > alin['grupoFim'] + 80 and alin['dir'] < 200, alin)
        ordem = pg.evaluate("[...document.querySelectorAll('main > section')].map(s => s.id).filter(x => ['secCriar', 'secGerar', 'secRes'].includes(x))")
        ant = pg.evaluate("[document.getElementById('g').value, document.getElementById('s').value]")
        pg.evaluate("""() => { delete document.getElementById('editorArea').dataset.criarZero;
            ['g', 's'].forEach(i => { const e = document.getElementById(i); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }); }""")
        vazio = pg.evaluate("({ gerar: document.getElementById('secGerar').offsetParent !== null, boas: document.getElementById('boasVindas').offsetParent !== null, ad: document.getElementById('go').getAttribute('aria-disabled') })")
        pg.evaluate("""a => { ['g', 's'].forEach((i, k) => { const e = document.getElementById(i); e.value = a[k]; e.dispatchEvent(new Event('input', { bubbles: true })); }); ED.g.refresh(); ED.s.refresh(); }""", ant)
        cheio = pg.evaluate("({ gerar: document.getElementById('secGerar').offsetParent !== null, ad: document.getElementById('go').getAttribute('aria-disabled') })")
        G.chk('26.25', 'Gerar arquivos é uma seção própria entre Criar conteúdo e Arquivos gerados; só aparece com conteúdo e o botão fica indisponível sem texto',
              ordem == ['secCriar', 'secGerar', 'secRes'] and not vazio['gerar'] and vazio['boas'] and vazio['ad'] == 'true'
              and cheio['gerar'] and cheio['ad'] == 'false', {'ordem': ordem, 'vazio': vazio, 'cheio': cheio})
        pg.click('#ts'); pg.wait_for_timeout(150)
        pg.evaluate("window.Locucao.carregarRecursos = () => Promise.resolve(false)")
        nar0 = pg.evaluate("({ caixa: document.getElementById('narrOn').offsetParent !== null, extras: document.getElementById('narrExtras').offsetParent !== null })")
        pg.evaluate("() => { const c = document.getElementById('narrOn'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }")
        nar1 = pg.evaluate("({ extras: document.getElementById('narrExtras').offsetParent !== null, aberto: document.getElementById('narrExtras').open, voz: document.getElementById('narrVoz').checkVisibility(), mini: document.getElementById('narrMini').textContent })")
        pg.evaluate("document.querySelector('#narrExtras > summary').click()"); pg.wait_for_timeout(100)
        nar2 = pg.evaluate("({ aberto: document.getElementById('narrExtras').open, voz: document.getElementById('narrVoz').checkVisibility(), hist: document.getElementById('narrHist').checkVisibility() })")
        pg.evaluate("() => { const c = document.getElementById('narrOn'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }")
        G.chk('26.26', 'Narração: só a ativação aparece; voz, áudios gerados e opções avançadas abrem em "Opções de narração"',
              nar0['caixa'] and not nar0['extras'] and nar1['extras'] and not nar1['aberto'] and not nar1['voz'] and bool(nar1['mini'])
              and nar2['aberto'] and nar2['voz'] and nar2['hist'], {'0': nar0, '1': nar1, '2': nar2})
        gal = pg.evaluate("""() => { const g = document.querySelector('#ps .mde-gal'), t = g.querySelector('.gtools'), s = id => document.getElementById(id);
            const antes = t.offsetParent !== null; g.open = true; const depois = t.offsetParent !== null; g.open = false;
            return { antes: antes, depois: depois, imgst: s('imgst').offsetParent !== null }; }""")
        G.chk('26.27', 'Imagens do texto: ferramentas só com a galeria aberta e a linha de status só quando falta embutir imagem',
              not gal['antes'] and gal['depois'] and not gal['imgst'], gal)
        ref = pg.evaluate("""async () => {
            let copiado = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { copiado = t; } }, configurable: true });
            document.getElementById('btnCopiarPrompt').click(); await new Promise(r => setTimeout(r, 50));
            const p = document.getElementById('promptIA').textContent, dica = document.getElementById('dicaPrompt'), ls = [...dica.querySelectorAll('a')];
            return { copiou: copiado === p && p.length > 0, tam: p.length, raw: p.includes('https://raw.githubusercontent.com/anacgovbr/conteudista/main/docs/PROMPT_GERACAO_IA.md'),
                     ph: ['[TEMA]', '[PÚBLICO-ALVO]', '[OBJETIVOS DE APRENDIZAGEM]'].every(x => p.includes(x)), semDica: !copiado.includes('anexe documentos'),
                     dica: dica.textContent.includes('Se a IA utilizada permitir, anexe documentos ou forneça textos e links de referência para fundamentar o conteúdo.'),
                     fora: !document.getElementById('promptIA').contains(dica), botao: document.getElementById('btnCopiarPrompt').textContent,
                     links: ls.map(a => [a.getAttribute('href'), a.target, a.rel]) }; }""")
        G.chk('26.28', 'Prompt curto: copiável, com a URL do documento no GitHub e os três campos; a dica de anexar fica visível fora do texto copiado',
              ref['copiou'] and ref['tam'] <= 800 and ref['raw'] and ref['ph'] and ref['semDica'] and ref['dica'] and ref['fora'] and ref['botao'] == 'Prompt copiado'
              and len(ref['links']) == 2 and all(l[0].startswith('https://github.com/anacgovbr/conteudista/blob/main/docs/') and l[1] == '_blank' and 'noopener' in l[2] for l in ref['links']), ref)
        ant2 = pg.evaluate("[document.getElementById('g').value, document.getElementById('s').value]")
        imp = pg.evaluate("""async ([ap, ps]) => {
            const colar = t => { document.getElementById('impTexto').value = t; document.getElementById('btnImpTexto').click(); };
            colar(ap); const g = document.getElementById('g').value, pref1 = document.getElementById('pref').value;
            colar(ps); const s = document.getElementById('s').value;
            return { g: g.startsWith('# Pedido de certificação: guia de estudo'), s: s.startsWith('---\\ntitle: Pedido de certificação'), slides: (s.match(/\\n---\\s*\\n/g) || []).length,
                     pref: pref1, notas: (s.match(/<!-- notas:/g) || []).length, escondida: document.getElementById('boasVindas').hidden }; }""",
                          [(suporte.RAIZ / 'docs/exemplos/apostila-exemplo.md').read_text(encoding='utf-8'), (suporte.RAIZ / 'docs/exemplos/apresentacao-exemplo.md').read_text(encoding='utf-8')])
        pg.evaluate("a => { ['g', 's'].forEach((i, k) => { const e = document.getElementById(i); e.value = a[k]; e.dispatchEvent(new Event('input', { bubbles: true })); }); ED.g.refresh(); ED.s.refresh(); }", ant2)
        G.chk('26.29', 'Os exemplos de apostila e de apresentação (com notas nos slides) são importados pelo painel de importação',
              imp['g'] and imp['s'] and imp['pref'] == 'pedido-de-certificacao-guia-de-estudo' and imp['notas'] >= 5 and imp['escondida'], imp)
        pg.click('#tg'); pg.wait_for_timeout(150)
        pg.locator('#pg .mv-bt[data-g=fmt]').click(); pg.wait_for_timeout(150)
        itens = pg.evaluate("[...document.querySelectorAll('.mv-menu:not([hidden]) [role=menuitem]')].map(x => x.textContent.trim())")
        antes_barra = pg.evaluate("document.querySelector('#pg .mde-ta').value")
        pg.locator('.mv-menu:not([hidden]) [role=menuitem]', has_text='Título 2').click(); pg.wait_for_timeout(200)
        G.chk('26.19', 'Computador: menu Formatar lista os itens e aplica Título 2 no texto',
              any('Título 2' in x for x in itens) and pg.evaluate("document.querySelector('#pg .mde-ta').value") != antes_barra, itens[:5])
        pg.keyboard.press('Control+z'); pg.wait_for_timeout(100)
        pg.click('#ts'); pg.wait_for_timeout(120)
        pg.locator('#ps .mv-bt[data-g=ins]').click(); pg.wait_for_timeout(150)
        modelos = pg.evaluate("[...document.querySelectorAll('.mv-menu:not([hidden]) [data-layout]')].map(x => x.dataset.layout)")
        categorias = pg.evaluate("[...document.querySelectorAll('.mv-menu:not([hidden]) .mv-cat')].map(x => x.textContent.trim())")
        G.chk('26.22', 'Computador: Inserir abre catálogo com os 25 modelos em grupos', len(modelos) == 25
              and categorias == ['Geral', 'Básicos', 'Texto + imagem', 'Comparação', 'Cards', 'Matrizes', 'Processo', 'Indicadores', 'Marcação do slide'],
              {'total': len(modelos), 'categorias': categorias})
        pg.keyboard.press('Escape')
        inseridos = []
        for slug in modelos:
            pg.locator('#ps .mv-bt[data-g=ins]').click()
            pg.locator('.mv-menu:not([hidden]) [data-layout="' + slug + '"]').click()
            pg.wait_for_timeout(30)
            if '<!-- layout: ' + slug + ' -->' not in pg.evaluate("document.querySelector('#ps .mde-ta').value"):
                inseridos.append(slug)
            pg.keyboard.press('Control+z')
        G.chk('26.23', 'Computador: cada um dos 25 modelos insere a diretiva do layout no slide', not inseridos, inseridos)
        pg.keyboard.press('Escape'); pg.click('#tg'); pg.wait_for_timeout(120)
        status_barra = pg.evaluate("(() => ({ mvOn: document.querySelector('#pg .mde').classList.contains('mv-on'), galVis: document.querySelector('#pg .mde-gal').offsetParent !== null }))()")
        G.chk('26.20', 'Computador: contagem do texto e Imagens do texto continuam visíveis (só o celular recolhe)',
              not status_barra['mvOn'] and status_barra['galVis'], status_barra)

        G.chk('26.17', 'Nenhum erro de JavaScript na régua de linhas', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()
