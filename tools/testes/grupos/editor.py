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
        pg.goto(url); pg.wait_for_selector('#pg .mde-tb.mv-tb', state='attached', timeout=15000); pg.wait_for_timeout(500)
        pg.keyboard.press('Escape')                                   # fecha o tutorial da primeira visita
        pg.click('#ex'); pg.wait_for_timeout(1200)
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
        licenca = pg.evaluate("() => { const t = document.querySelector('#tema').getBoundingClientRect(), l = document.querySelector('#licenca').getBoundingClientRect(); return { valor: document.querySelector('#licenca').value, nome: document.querySelector('label[for=licenca]').textContent.trim(), descricao: document.querySelector('#licenca').getAttribute('aria-describedby'), opcoes: document.querySelectorAll('#licenca option').length, altura: l.height, empilhado: l.top >= t.bottom - 1, larguraPagina: document.documentElement.scrollWidth <= innerWidth }; }")
        G.chk('9.15', 'Licenciamento começa vazio, tem rótulo associado, sete opções CC/CC0 e cabe no celular', licenca['valor'] == '' and licenca['nome'] == 'Licenciamento' and licenca['descricao'] == 'licAux' and licenca['opcoes'] == 8 and licenca['altura'] >= 48 and licenca['empilhado'] and licenca['larguraPagina'], licenca)
        pg.locator('#licenca').select_option('cc-by-4.0'); pg.wait_for_timeout(1800)
        salvo = pg.evaluate("async () => { const r = (await dbAll('rascunhos')).find(x => x.nome === 'Autossalvo'); return r && r.licenca; }")
        G.chk('9.16', 'Autossalvamento preserva o código da licença no trabalho', salvo == 'cc-by-4.0', salvo)
        pg.reload(); pg.wait_for_selector('#licenca', timeout=15000); pg.wait_for_timeout(300)
        restaurada = pg.locator('#licenca').input_value()
        G.chk('9.17', 'Reabrir o Conteudista restaura a licença do último trabalho', restaurada == 'cc-by-4.0', restaurada)
        hashes = pg.evaluate("async () => { const base = { g: '# Teste de identidade 9.18', s: '', p: 'Teste', r: '', b: '' }; const by = await Hist.registrar('marco', 'Licença BY', { ...base, licenca: 'cc-by-4.0' }); const sa = await Hist.registrar('gerado', 'Licença BY-SA', { ...base, licenca: 'cc-by-sa-4.0' }); const repetida = await Hist.registrar('gerado', 'Licença BY-SA repetida', { ...base, licenca: 'cc-by-sa-4.0' }); return { by: !!by, sa: !!sa, distintas: !!by && !!sa && by.h !== sa.h, repetida: repetida === null }; }")
        G.chk('9.18', 'O histórico distingue mudanças somente de licença e deduplica a mesma licença', hashes == {'by': True, 'sa': True, 'distintas': True, 'repetida': True}, hashes)
        desktop = amb.novo_contexto(viewport={'width': 1280, 'height': 820})
        pgd = desktop.new_page(); pgd.goto(url); pgd.wait_for_selector('#licenca', timeout=15000)
        alinhamento = pgd.evaluate("() => { const t = document.querySelector('#tema').getBoundingClientRect(), l = document.querySelector('#licenca').getBoundingClientRect(), s = document.querySelector('#licenca'); return { mesmaLinha: Math.abs(t.top - l.top) < 3, largura: l.width, altura: l.height, semRolagem: document.documentElement.scrollWidth <= innerWidth, linha: s.closest('.row') === document.querySelector('#tema').closest('.row') }; }")
        G.chk('9.19', 'Layout e Licenciamento ficam lado a lado em desktop sem rolagem horizontal', alinhamento['mesmaLinha'] and alinhamento['largura'] >= 220 and alinhamento['altura'] >= 48 and alinhamento['semRolagem'] and alinhamento['linha'], alinhamento)
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
              and e['cur'] and e['cur']['vis'] and abs(e['cur']['top'] + 12 - at[0]['top']) < 1, {'at': at, 'cur': e['cur']})

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
        G.chk('26.15', 'No modo somente prévia a régua some e volta ao dividir a tela',
              oculta['regua'] == 'none' and oculta['camada'] == 'none'
              and oculta['visao'] == 'none' and volta == 12, {'oculta': oculta, 'volta': volta})

        G.chk('26.16', 'Nenhum erro de JavaScript na régua de linhas', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()
