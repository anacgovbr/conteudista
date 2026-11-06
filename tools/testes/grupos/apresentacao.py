import argparse, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path
import suporte
from suporte import (
    AUDIOS, EXEMPLO_APRES, EXEMPLO_TREINO, MOTOR, RAIZ, RECT_B2,
    ULTIMO_AUDIO, clicar_js, deslizar, e_mudo, e_pausado, esperar,
    estado, ir_para_slide, permanece, resumo, rodar, tecla
)

def grupo1(amb, ctx, G):
    pg = amb.abrir(ctx, 'auto')
    ok, e = esperar(pg, lambda e: 1 in e['tocando'], 5000)
    G.chk('1.0', 'Iniciar com narração: o slide 1 narra sozinho', ok and e['slide'] == 1, resumo(e))
    pg.wait_for_timeout(700)
    tecla(pg, 'Space')
    ok, e = esperar(pg, lambda e: e_mudo(e) and e_pausado(e), 1500)
    t_pausa = next((x['t'] for x in e['audios'] if x['s'] == 0), 0)
    G.chk('1.1', 'Espaço pausa o áudio na hora e o botão vira Reproduzir', ok and e_pausado(e) and t_pausa > 0.3, resumo(e))
    ok, e2 = permanece(pg, lambda e: e['slide'] == 1 and e_mudo(e), 2500)
    t2 = next((x['t'] for x in e2['audios'] if x['s'] == 0), 0)
    G.chk('1.2', 'Pausado por 2,5 s: não muda de slide e o áudio não avança', ok and abs(t2 - t_pausa) < 0.08, f'{resumo(e2)} (t {t_pausa:.2f}→{t2:.2f})')
    tecla(pg, 'ArrowRight')
    ok, e = permanece(pg, lambda e: e['slide'] == 2 and e_mudo(e) and e_pausado(e), 1500)
    G.chk('1.3', 'Próximo com a pausa ativa: slide 2 abre sem tocar e o botão segue em Reproduzir', ok, resumo(e))
    tecla(pg, 'ArrowRight'); pg.wait_for_timeout(250)
    e3 = estado(pg); tecla(pg, 'ArrowLeft')
    ok, e = permanece(pg, lambda e: e['slide'] == 2 and e_mudo(e), 1200)
    G.chk('1.4', 'Slides 3 e 2 (ida e volta) permanecem mudos', e3['slide'] == 3 and e_mudo(e3) and ok, f'{resumo(e3)} → {resumo(e)}')
    tecla(pg, 'ArrowRight', 2)
    ok, e = permanece(pg, lambda e: e['slide'] == 4 and e_mudo(e) and e_pausado(e), 1000)
    G.chk('1.5', 'Slide 4 (sem narração): mudo e botão em Reproduzir', ok, resumo(e))
    tecla(pg, 'ArrowLeft', 2); pg.wait_for_timeout(250)
    tecla(pg, 'Space')
    ok, e = esperar(pg, lambda e: e['slide'] == 2 and 2 in e['tocando'], 2000)
    t = next((x['t'] for x in e['audios'] if x['s'] == 1), 99)
    G.chk('1.6', 'Reproduzir narra o slide atual (2) desde o início; botão vira Pausar', ok and e['bp'].startswith('Pausar') and t < 1.5, resumo(e))
    ok, e = esperar(pg, lambda e: e['slide'] == 3 and 3 in e['tocando'], AUDIOS[2] * 1000 + 3000)
    G.chk('1.7', 'Ao terminar o áudio, o avanço automático passa ao slide 3 e narra', ok, resumo(e))
    tecla(pg, 'Space'); pg.wait_for_timeout(250)
    tecla(pg, 's'); pg.wait_for_timeout(250); tecla(pg, 's')
    ok, e = esperar(pg, lambda e: e['slide'] == 3 and 3 in e['tocando'], 2500)
    G.chk('1.8', 'Pausa + desligar/ligar o som (S): narra o slide atual', ok, resumo(e))
    pg.close()

    pg = amb.abrir(ctx, 'manual')
    ok, e = esperar(pg, lambda e: e['bn'] == 'true', 2000)
    tecla(pg, 'ArrowRight')
    ok, e = esperar(pg, lambda e: e['slide'] == 2 and 2 in e['tocando'], 2500)
    G.chk('1.9', 'Sem pausa, Próximo narra o slide novo sozinho', ok, resumo(e))
    tecla(pg, 'Space'); pg.wait_for_timeout(250); tecla(pg, 'Space'); pg.wait_for_timeout(250)
    tecla(pg, 'ArrowRight')
    ok, e = esperar(pg, lambda e: e['slide'] == 3 and 3 in e['tocando'], 2500)
    G.chk('1.10', 'Pausar → Reproduzir → Próximo: volta a narrar o slide novo', ok, resumo(e))
    tecla(pg, 'Space'); pg.wait_for_timeout(250)
    tecla(pg, 'End')
    ok, e = permanece(pg, lambda e: e['slide'] == amb.total and e_mudo(e), 1200)
    G.chk('1.11', 'Pausa + End: o último slide fica mudo', ok, resumo(e))
    tecla(pg, 'Space')
    ok, e = esperar(pg, lambda e: e['slide'] == amb.total and amb.total in e['tocando'], 2500)
    G.chk('1.12', 'Reproduzir no último slide (áudio ainda não tocado) narra ele e não volta ao slide 1', ok and e['bp'].startswith('Pausar'), resumo(e))
    G.chk('1.13', 'Nenhum erro de JavaScript durante o grupo 1', not pg.erros, pg.erros)
    pg.close()

def grupo2(amb, ctx, G):
    pg = amb.abrir(ctx, 'manual')
    tecla(pg, 'Space'); pg.wait_for_timeout(200)    # interrompe o autoplay inicial
    tecla(pg, 'Space'); pg.wait_for_timeout(200)
    tecla(pg, 'End')
    ok, e = esperar(pg, lambda e: e['slide'] == amb.total and amb.total in e['tocando'], 3000)
    G.chk('2.1', 'End leva ao último slide e a narração toca', ok, resumo(e))
    pg.evaluate("""(n)=>{const a=document.querySelector('audio.narr[data-s="'+(n-1)+'"]');window.__p=0;window.__r=0;
        a.addEventListener('pause',()=>window.__p++);a.addEventListener('seeked',()=>window.__r++)}""", amb.total)
    t0 = next((x['t'] for x in estado(pg)['audios'] if x['s'] == amb.total - 1), 0)
    tecla(pg, 'ArrowRight', 5); tecla(pg, 'End', 3); tecla(pg, 'PageDown', 2)
    for _ in range(5):
        clicar_js(pg, '#n')
    pg.wait_for_timeout(700)
    e = estado(pg)
    r = pg.evaluate("[window.__p,window.__r]")
    t1 = next((x['t'] for x in e['audios'] if x['s'] == amb.total - 1), 0)
    G.chk('2.2', 'Próximo/→/End/PageDown repetidos no último slide: o áudio não é interrompido nem reiniciado',
          r[0] == 0 and r[1] == 0 and amb.total in e['tocando'] and t1 > t0, f'pausas={r[0]} reinícios={r[1]} t {t0:.2f}→{t1:.2f}')
    tecla(pg, 'Space')
    ok, e = esperar(pg, lambda e: e_mudo(e) and e_pausado(e), 1500)
    tp = next((x['t'] for x in e['audios'] if x['s'] == amb.total - 1), 0)
    pg.wait_for_timeout(1500)
    tecla(pg, 'Space')
    ok2, e2 = esperar(pg, lambda e: amb.total in e['tocando'], 2000)
    tr = next((x['t'] for x in e2['audios'] if x['s'] == amb.total - 1), 0)
    G.chk('2.4', 'Pausar e Reproduzir no último slide continua do mesmo ponto (não reinicia)', ok and ok2 and tr >= tp - 0.05 and tp > 0.3, f'pausou em {tp:.2f}, retomou em {tr:.2f}')
    ok, e = esperar(pg, lambda e: e_mudo(e) and e['slide'] == amb.total and e_pausado(e), ULTIMO_AUDIO * 1000 + 2500)
    G.chk('2.5', 'Ao terminar, fica no último slide e o botão volta a Reproduzir', ok, resumo(e))
    tecla(pg, 'Space')
    ok, e = esperar(pg, lambda e: e['slide'] == 1 and 1 in e['tocando'], 2500)
    G.chk('2.6', 'Reproduzir depois do fim recomeça pelo slide 1', ok, resumo(e))
    G.chk('2.7', 'Nenhum erro de JavaScript durante o grupo 2', not pg.erros, pg.erros)
    pg.close()

def grupo3(amb, ctx, G):
    mudos = []
    for tent in range(5):
        pg = amb.abrir(ctx, 'manual')
        tecla(pg, 'Space'); pg.wait_for_timeout(150); tecla(pg, 'Space'); pg.wait_for_timeout(150)
        tecla(pg, 'ArrowRight', amb.total + 6)
        ok, e = esperar(pg, lambda e: amb.total in e['tocando'], 2500)
        if not ok:
            mudos.append(resumo(e))
        pg.close()
    G.chk('3.1', f'Rajada de {amb.total + 6} Próximos: o último slide toca em 5 de 5 execuções', not mudos, f'{len(mudos)} mudo(s): {mudos[:1]}')
    pg = amb.abrir(ctx, 'manual')
    tecla(pg, 'Space'); pg.wait_for_timeout(150); tecla(pg, 'Space'); pg.wait_for_timeout(150)
    for _ in range(3):
        tecla(pg, 'ArrowRight', amb.total)
        tecla(pg, 'ArrowLeft', amb.total)
    pg.wait_for_timeout(500)
    falhas = []
    for k in (2, 3, amb.total):
        ir_para_slide(pg, k)
        ok, e = esperar(pg, lambda e, k=k: e['slide'] == k and k in e['tocando'], 2500)
        if not ok:
            falhas.append(f'slide {k}: {resumo(e)}')
    G.chk('3.2', 'Depois de varrer os slides ida e volta 3 vezes, os slides 2, 3 e o último ainda tocam', not falhas, falhas)
    G.chk('3.3', 'Nenhum erro de JavaScript na navegação rápida', not pg.erros, pg.erros)
    pg.close()

def grupo4(amb, ctx, G):
    pg = amb.abrir(ctx, 'manual')
    ok, e = esperar(pg, lambda e: e['tocando'], 3000)
    r_slides = pg.evaluate(RECT_B2)
    tecla(pg, 'l')
    ok, e = esperar(pg, lambda e: e['leitura'] and e_mudo(e), 2000)
    G.chk('4.1', 'Modo leitura (L) com o som tocando: o áudio para e o som desliga', ok and e['bn'] == 'false', resumo(e) + f" bn={e['bn']}")
    r_leitura = pg.evaluate(RECT_B2)
    G.chk('4.2', 'Botão de tela cheia no canto superior direito, no mesmo lugar dos slides (44×44)',
          bool(r_leitura) and r_leitura['pos'] == 'fixed' and r_leitura['dir'] <= 20 and r_leitura['topo'] <= 20 and r_leitura['w'] >= 44 and r_leitura['h'] >= 44
          and r_leitura['dir'] == r_slides['dir'] and r_leitura['topo'] == r_slides['topo'] and r_leitura['disp'] != 'none' and r_leitura['vis'] != 'hidden',
          f'slides={r_slides} leitura={r_leitura}')
    tecla(pg, 'f'); pg.wait_for_timeout(500); a = pg.evaluate(RECT_B2)
    tecla(pg, 'f'); pg.wait_for_timeout(500); b = pg.evaluate(RECT_B2)
    clicar_js(pg, '#b2'); pg.wait_for_timeout(500); c = pg.evaluate(RECT_B2)
    clicar_js(pg, '#b2'); pg.wait_for_timeout(500); d = pg.evaluate(RECT_B2)
    G.chk('4.3', 'Tela cheia entra e sai pelo clique e pela tecla F; aria-pressed acompanha',
          a['fs'] and a['pressed'] == 'true' and not b['fs'] and b['pressed'] == 'false' and c['fs'] and not d['fs'], f'{a["fs"]},{b["fs"]},{c["fs"]},{d["fs"]}')
    tecla(pg, 'm'); pg.wait_for_timeout(300)
    itens = pg.evaluate("[...document.querySelectorAll('#bmais-menu button,#bmais-menu [role=menuitem]')].map(x=>x.textContent.trim())")
    tem_b2m = pg.evaluate("!!document.querySelector('#b2m')")
    G.chk('4.4', 'Menu Mais opções do Modo leitura sem o item "Tela cheia"', not tem_b2m and not any('tela cheia' in t.lower() for t in itens), itens)
    tecla(pg, 'Escape'); pg.wait_for_timeout(200)
    if not estado(pg)['leitura']:
        pass
    else:
        tecla(pg, 'l')
    ok, e = esperar(pg, lambda e: not e['leitura'] and e['nOn'] == 1, 2000)
    G.chk('4.5', 'Sair do Modo leitura: um único slide visível e contador coerente', ok and e['contador'].startswith(f"{e['slide']} /"), f"{resumo(e)} nOn={e['nOn']} contador={e['contador']}")
    G.chk('4.7', 'Nenhum erro de JavaScript no Modo leitura', not pg.erros, pg.erros)
    pg.close()

def grupo7(amb, ctx_movel, G):
    if MOTOR.get(amb.args.navegador) != 'chromium':
        G.pular('7.x', 'Testes de toque (CDP) rodam só em navegadores de motor Chromium (Chrome, Edge)', amb.args.navegador)
        return
    pg = amb.abrir(ctx_movel, 'manual')
    ok, e = esperar(pg, lambda e: e['tocando'], 3000)
    G.chk('7.1', 'Celular: a narração do slide 1 toca ao iniciar', ok, resumo(e))
    clicar_js(pg, '#bp') if False else None
    box = pg.evaluate("(()=>{const r=document.querySelector('#bp').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}})()")
    pg.touchscreen.tap(box['x'], box['y'])
    ok, e = esperar(pg, lambda e: e_mudo(e) and e_pausado(e), 1500)
    G.chk('7.2', 'Celular: tocar em Pausar para o áudio e mostra Reproduzir', ok and e_pausado(e), resumo(e))
    G.chk('7.3', 'Celular: alvo de toque do Pausar com pelo menos 44×44 px (WCAG 2.2, critério 2.5.5)', box['w'] >= 44 and box['h'] >= 44, box)
    pequenos = pg.evaluate("[...document.querySelectorAll('#hud > button')].filter(b=>b.getBoundingClientRect().width>0).map(b=>[b.id,Math.round(b.getBoundingClientRect().width),Math.round(b.getBoundingClientRect().height)]).filter(x=>x[1]<44||x[2]<44)")
    G.chk('7.3c', 'Celular: todos os botões visíveis da barra com pelo menos 44×44 px', not pequenos, pequenos)
    folga = pg.evaluate("(()=>{const h=document.querySelector('#hud').getBoundingClientRect();return [Math.round(h.left),Math.round(innerWidth-h.right),document.documentElement.scrollWidth<=innerWidth]})()")
    G.chk('7.3d', 'Celular: a barra cabe na tela, com margem dos dois lados e sem rolagem horizontal', folga[0] >= 4 and folga[1] >= 4 and folga[2], folga)
    vp = pg.viewport_size
    deslizar(ctx_movel, pg, vp['width'] * 0.8, vp['height'] * 0.4, vp['width'] * 0.2, vp['height'] * 0.4)
    ok, e = esperar(pg, lambda e: e['slide'] == 2, 1500)
    G.chk('7.4', 'Celular: deslizar para a esquerda avança o slide e, com a pausa ativa, o novo slide não toca', ok and e_mudo(e), resumo(e))
    deslizar(ctx_movel, pg, vp['width'] * 0.2, vp['height'] * 0.4, vp['width'] * 0.8, vp['height'] * 0.4)
    ok, e = esperar(pg, lambda e: e['slide'] == 1, 1500)
    G.chk('7.5', 'Celular: deslizar para a direita volta o slide', ok, resumo(e))
    tecla(pg, 'End'); pg.wait_for_timeout(300)
    box = pg.evaluate("(()=>{const r=document.querySelector('#bp').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
    pg.touchscreen.tap(box['x'], box['y'])
    ok, e = esperar(pg, lambda e: e['slide'] == amb.total and amb.total in e['tocando'], 2500)
    t0 = next((x['t'] for x in e['audios'] if x['s'] == amb.total - 1), 0)
    pg.evaluate("(n)=>{const a=document.querySelector('audio.narr[data-s=\"'+(n-1)+'\"]');window.__p=0;a.addEventListener('pause',()=>window.__p++)}", amb.total)
    for _ in range(3):
        deslizar(ctx_movel, pg, vp['width'] * 0.8, vp['height'] * 0.4, vp['width'] * 0.2, vp['height'] * 0.4)
        pg.wait_for_timeout(150)
    pg.wait_for_timeout(400)
    e = estado(pg); p = pg.evaluate('window.__p')
    t1 = next((x['t'] for x in e['audios'] if x['s'] == amb.total - 1), 0)
    G.chk('7.6', 'Celular: deslizar para a esquerda no último slide não interrompe nem reinicia a narração', ok and p == 0 and amb.total in e['tocando'] and t1 > t0, f'{resumo(e)} pausas={p} t {t0:.2f}→{t1:.2f}')
    G.chk('7.7', 'Nenhum erro de JavaScript no celular', not pg.erros, pg.erros)
    pg.close()

def grupo10(amb, ctx, G):
    d = amb.tmp / 'saida_zoom'
    if not (d / 'Apresentacao_Exemplo.html').exists():
        rodar([sys.executable, str(suporte.GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Exemplo', '--rodape', 'Teste', '--saida', str(d), '--tema', 'govbr'], cwd=RAIZ)
    html = d / 'Apresentacao_Exemplo.html'
    h = html.read_text(encoding='utf-8')
    secs = re.findall(r'<section class="s[^"]*".*?</section>', h, re.S)
    k = next((i for i, x in enumerate(secs) if '<figure' in x), 0)
    pg = ctx.new_page(); erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)))
    pg.goto(html.as_uri() + '#2'); pg.reload(); pg.wait_for_timeout(700)
    pg.keyboard.press('+'); pg.wait_for_timeout(100)
    G.chk('10.1', 'Tecla + amplia o slide e mostra o botão "100% ↺"', pg.evaluate("document.documentElement.classList.contains('zoom-slide')") and pg.is_visible('#zr'))
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
    G.chk('10.2', 'Com zoom, a seta move a visão e não troca de slide', pg.evaluate('location.hash') == '#2' and 'translate' in pg.evaluate("document.querySelector('.s.on').style.transform"))
    pg.keyboard.press('0'); pg.wait_for_timeout(100)
    G.chk('10.3', 'Tecla 0 volta ao tamanho normal', not pg.evaluate("document.documentElement.classList.contains('zoom-slide')") and not pg.is_visible('#zr'))
    pg.mouse.move(640, 360); pg.keyboard.down('Control'); pg.mouse.wheel(0, -300); pg.keyboard.up('Control'); pg.wait_for_timeout(100)
    G.chk('10.4', 'Ctrl + roda do mouse amplia o slide', (pg.evaluate('window.ZoomConteudista.nivel()') or 1) > 1.2)
    pg.keyboard.press('PageDown'); pg.wait_for_timeout(200)
    G.chk('10.5', 'Trocar de slide volta o zoom a 100%', pg.evaluate('location.hash') == '#3' and pg.evaluate('window.ZoomConteudista.nivel()') == 1)
    pg.goto(html.as_uri() + '#%d' % (k + 1)); pg.reload(); pg.wait_for_timeout(700)
    b = pg.locator('.s.on .zm-amp').first
    G.chk('10.6', 'Imagem do slide tem botão "Ampliar" com nome acessível', b.count() > 0 and (b.get_attribute('aria-label') or '').startswith('Ampliar '))
    b.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    G.chk('10.7', 'Ampliar abre diálogo modal, com o foco dentro e o fundo inerte', pg.locator('.zm-lb[role=dialog][aria-modal=true]').count() == 1 and pg.evaluate("!!document.activeElement.closest('.zm-lb')") and pg.evaluate("document.getElementById('st').inert"))
    pg.keyboard.press('+'); pg.wait_for_timeout(100)
    G.chk('10.8', 'Tecla + amplia a imagem', pg.inner_text('.zm-pct') == '150%')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    G.chk('10.9', 'Esc fecha e devolve o foco ao botão Ampliar', pg.locator('.zm-lb').count() == 0 and pg.evaluate("document.activeElement.classList.contains('zm-amp')") and not pg.evaluate("document.getElementById('st').inert"))
    a = ctx.new_page(); a.on('pageerror', lambda e: erros.append('apostila: ' + str(e)))
    a.goto((d / 'Apostila_Exemplo.html').as_uri()); a.wait_for_timeout(800)
    n = a.locator('figure .zm-amp').count()
    G.chk('10.10', 'Apostila: imagens com botão "Ampliar"', n > 0, n)
    if n:
        a.locator('figure .zm-amp').first.scroll_into_view_if_needed(); a.locator('figure .zm-amp').first.click(); a.wait_for_timeout(150)
        G.chk('10.11', 'Apostila: Ampliar abre a imagem em tela cheia', a.locator('.zm-lb img').count() == 1)
        a.keyboard.press('Escape')
    G.chk('10.12', 'Nenhum erro de JavaScript no zoom', not erros, erros)
    pg.close(); a.close()
