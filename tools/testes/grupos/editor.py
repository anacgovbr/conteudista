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
            pg.once('dialog', lambda d: d.accept())
            with pg.expect_navigation(timeout=15000):
                pg.click('#btnRestaurar')
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
        pg.close()
    finally:
        srv.shutdown()
