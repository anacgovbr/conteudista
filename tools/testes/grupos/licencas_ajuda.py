import suporte
from suporte import RAIZ, _servidor


def grupo27(amb, ctx, G):
    """Grupo 27: ajuda contextual de licenciamento (Creative Commons e CC0)."""
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page()
        erros = []
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(url); pg.locator('#btnConfigConteudo').click()
        pg.wait_for_selector('#licenca', state='attached', timeout=20000)
        pg.wait_for_function('() => !!window.LicencasAjuda', timeout=15000)

        e = pg.evaluate("""() => {
            const b = document.getElementById('btnAjudaLicenca');
            const l = document.querySelector('label[for=licenca]');
            const rb = b.getBoundingClientRect(), rl = l.getBoundingClientRect();
            return { aria: b.getAttribute('aria-label'), rotulo: l.textContent.trim(),
                     perto: Math.abs(rb.top - rl.top) < 30 && rb.left >= rl.left,
                     visivel: rb.width > 0 && rb.height > 0 };
        }""")
        G.chk('27.1', 'Botão ⓘ existe ao lado do rótulo Licenciamento, visível e com nome acessível',
              bool(e['aria']) and e['rotulo'] == 'Licenciamento' and e['perto'] and e['visivel'], e)

        pg.focus('#btnAjudaLicenca')
        G.chk('27.2', 'Botão ⓘ recebe foco pelo teclado',
              pg.evaluate("document.activeElement.id") == 'btnAjudaLicenca',
              pg.evaluate("document.activeElement.id"))

        pg.keyboard.press('Enter')
        pg.wait_for_selector('#laBack', state='attached', timeout=5000)
        dlg = pg.evaluate("""() => {
            const b = document.getElementById('laBack');
            const d = b && b.querySelector('[role=dialog]');
            const t = b && b.querySelector('#laT');
            const x = b && b.querySelector('#laX');
            return { janela: !!d, modal: d && d.getAttribute('aria-modal'),
                     rotulado: d && d.getAttribute('aria-labelledby'),
                     titulo: t && t.textContent.trim(), fechar: !!x,
                     foco: document.activeElement === x };
        }""")
        G.chk('27.3', 'Enter no ⓘ abre janela modal gov.br com título e foco no botão Fechar',
              dlg['janela'] and dlg['modal'] == 'true' and dlg['rotulado'] == 'laT'
              and dlg['titulo'] == 'Licenciamento do conteúdo' and dlg['fechar'] and dlg['foco'], dlg)

        conteudo = pg.evaluate("""() => {
            const bd = document.getElementById('laBd');
            const tab = bd && bd.querySelector('table');
            return { tabela: !!tab, linhas: tab ? tab.querySelectorAll('tbody tr').length : 0,
                     legenda: tab && tab.querySelector('caption') ? tab.querySelector('caption').textContent : '',
                     cc0: bd ? bd.textContent.indexOf('CC0') >= 0 : false,
                     cc: bd ? bd.textContent.indexOf('Creative Commons') >= 0 : false,
                     dominio: bd ? bd.textContent.indexOf('domínio público') >= 0 : false,
                     links: bd ? bd.querySelectorAll('a[href*="creativecommons.org"]').length : 0 };
        }""")
        G.chk('27.4', 'Janela explica Creative Commons e CC0 e traz tabela comparativa com as sete licenças',
              conteudo['tabela'] and conteudo['linhas'] == 7 and conteudo['cc0'] and conteudo['cc']
              and conteudo['dominio'] and conteudo['links'] >= 14 and bool(conteudo['legenda']), conteudo)

        links = pg.evaluate("""() => {
            const ls = Array.from(document.querySelectorAll('#laBd a[href*="creativecommons.org"]'));
            return { total: ls.length,
                     semAlvo: ls.filter(a => a.getAttribute('target') !== '_blank').length,
                     semRotulo: ls.filter(a => !a.getAttribute('aria-label')).length,
                     semRel: ls.filter(a => !/noopener/.test(a.getAttribute('rel') || '')).length,
                     resumo: ls.filter(a => /deed\\.pt-br$/.test(a.href)).length,
                     juridico: ls.filter(a => /legalcode/.test(a.href)).length };
        }""")
        G.chk('27.5', 'Links oficiais abrem em nova aba, com aviso no nome acessível (resumo e texto jurídico)',
              links['total'] >= 14 and links['semAlvo'] == 0 and links['semRotulo'] == 0
              and links['semRel'] == 0 and links['resumo'] == 7 and links['juridico'] == 7, links)

        pg.keyboard.press('Escape')
        pg.wait_for_selector('#laBack', state='detached', timeout=5000)
        G.chk('27.6', 'Esc fecha a janela e devolve o foco ao botão ⓘ',
              pg.evaluate("document.activeElement.id") == 'btnAjudaLicenca',
              pg.evaluate("document.activeElement.id"))

        pg.select_option('#licenca', 'cc-by-sa-4.0')
        pg.click('#btnAjudaLicenca')
        pg.wait_for_selector('#laBack', state='attached', timeout=5000)
        destaque = pg.evaluate("""() => {
            const d = document.querySelector('#laBd .la-destaque');
            if (!d) return { tem: false };
            const a = Array.from(d.querySelectorAll('a'));
            return { tem: true, texto: d.textContent,
                     resumo: (a.find(x => /deed/.test(x.href)) || {}).href || '',
                     juridico: (a.find(x => /legalcode/.test(x.href)) || {}).href || '' };
        }""")
        G.chk('27.7', 'Licença selecionada aparece em destaque com o que permite/exige e links corretos',
              destaque['tem'] and 'CC BY-SA 4.0' in destaque['texto'] and 'Compartilhar adaptações' in destaque['texto']
              and '/by-sa/4.0/deed.pt-br' in destaque['resumo'] and '/by-sa/4.0/legalcode.pt' in destaque['juridico'], destaque)

        pg.select_option('#licenca', 'cc0-1.0')
        pg.wait_for_timeout(150)
        destaque2 = pg.evaluate("""() => {
            const d = document.querySelector('#laBd .la-destaque');
            if (!d) return { tem: false };
            const a = Array.from(d.querySelectorAll('a'));
            return { tem: true, texto: d.textContent,
                     resumo: (a.find(x => /deed/.test(x.href)) || {}).href || '',
                     juridico: (a.find(x => /legalcode/.test(x.href)) || {}).href || '' };
        }""")
        G.chk('27.8', 'Trocar a licença com a janela aberta atualiza o destaque (CC0 e domínio público)',
              destaque2['tem'] and 'CC0' in destaque2['texto'] and 'domínio público' in destaque2['texto']
              and 'publicdomain/zero/1.0/deed.pt-br' in destaque2['resumo']
              and 'publicdomain/zero/1.0/legalcode' in destaque2['juridico'], destaque2)

        pg.click('#laX')
        pg.wait_for_selector('#laBack', state='detached', timeout=5000)
        G.chk('27.9', 'Botão Fechar fecha a janela e devolve o foco ao ⓘ',
              pg.evaluate("document.activeElement.id") == 'btnAjudaLicenca',
              pg.evaluate("document.activeElement.id"))

        pg.select_option('#licenca', '')
        pg.click('#btnAjudaLicenca')
        pg.wait_for_selector('#laBack', state='attached', timeout=5000)
        sem = pg.evaluate("() => !document.querySelector('#laBd .la-destaque')")
        G.chk('27.10', 'Sem licença escolhida a janela explica as licenças e não mostra destaque', sem, sem)

        pg.keyboard.press('Escape')
        pg.wait_for_selector('#laBack', state='detached', timeout=5000)
        G.chk('27.11', 'Nenhum erro de JavaScript ao abrir, trocar a licença e fechar', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()
