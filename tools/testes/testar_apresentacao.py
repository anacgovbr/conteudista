#!/usr/bin/env python3
"""Testes automatizados do Conteudista (roteiro de validação em código).

Cobre a apresentação HTML gerada (pausa e narração, último slide, navegação rápida,
Modo leitura, tela cheia, celular), a consistência de versão/documentação e a geração
dos arquivos. Cada caso tem o mesmo número do roteiro (1.1, 2.2, ...).

Uso local:
    pip install -r tools/requirements.txt -r tools/testes/requirements.txt
    playwright install chromium
    python tools/testes/testar_apresentacao.py            # relatório em tools/testes/relatorio/
    python tools/testes/testar_apresentacao.py --grupos 1,2   # só alguns grupos
    python tools/testes/testar_apresentacao.py --navegador firefox
    python tools/testes/testar_apresentacao.py --navegador msedge   # Edge instalado (também motor Chromium)

O navegador PRINCIPAL é o Google Chrome (padrão: --navegador chrome), usando o Chrome instalado
no computador. 'chromium' (build do Playwright), 'msedge', 'firefox' e 'webkit' são complementares.

Código de saída: 0 = tudo certo; 1 = alguma falha; 2 = erro de ambiente.
"""
import argparse, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path

# Windows: o console e os pipes usam cp1252 por padrão e quebram com ✔, ☐, → etc. Força UTF-8 aqui e nos
# processos filhos (gerador, teste de acessibilidade, node).
for _f in (sys.stdout, sys.stderr):
    try:
        _f.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
ENV_UTF8 = dict(os.environ, PYTHONUTF8='1', PYTHONIOENCODING='utf-8')

def rodar(cmd, **kw):
    """subprocess.run com saída capturada, UTF-8 garantido (inclusive no Windows)."""
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', env=ENV_UTF8, **kw)

RAIZ = Path(__file__).resolve().parents[2]
GERADOR = RAIZ / 'tools' / 'gerador.py'
EXEMPLO_TREINO = RAIZ / 'web' / 'exemplo' / 'treinamento.md'
EXEMPLO_APRES = RAIZ / 'web' / 'exemplo' / 'apresentacao.md'

# Duração (s) dos áudios sintéticos: slide (1-based) -> segundos. Slide 4 fica sem narração de propósito.
AUDIOS = {1: 6, 2: 4, 3: 4}
ULTIMO_AUDIO = 4

ESTADO_JS = """(()=>{
 const A=[...document.querySelectorAll('audio.narr')].map(a=>({s:+a.dataset.s,p:a.paused,t:a.currentTime,e:a.ended}));
 const bp=document.querySelector('#bp'),bn=document.querySelector('#bn'),on=[];
 document.querySelectorAll('.s').forEach((x,k)=>{if(x.classList.contains('on'))on.push(k)});
 const c=document.querySelector('#cbtn');
 return {slide:on.length?on[0]+1:0,nOn:on.length,bp:bp?bp.getAttribute('aria-label')||'':'',
  bn:bn?bn.getAttribute('aria-pressed'):null,leitura:document.body.classList.contains('modo-leitura'),
  contador:c?c.textContent.trim():'',audios:A,tocando:A.filter(a=>!a.p).map(a=>a.s+1)}})()"""


# ----------------------------------------------------------------------------- relatório
class Relatorio:
    def __init__(self):
        self.itens = []
    def add(self, id, titulo, status, detalhe='', grupo=''):
        self.itens.append(dict(id=id, titulo=titulo, status=status, detalhe=str(detalhe)[:600], grupo=grupo))
        marca = {'OK': '✔', 'FALHA': '✘', 'ERRO': '✘', 'INSTAVEL': '~', 'AVISO': '!', 'MANUAL': '☐', 'PULADO': '-'}.get(status, '?')
        print(f'  {marca} {id:5s} {titulo}' + (f'  [{status}] {detalhe}' if status not in ('OK', 'MANUAL') and detalhe else ''), flush=True)
    def falhou(self):
        return [i for i in self.itens if i['status'] in ('FALHA', 'ERRO')]


class Grupo:
    """Coleta os resultados de um grupo; permite repetir o grupo inteiro em caso de falha."""
    def __init__(self, nome):
        self.nome = nome
        self.itens = []
    def chk(self, id, titulo, cond, detalhe=''):
        self.itens.append((id, titulo, 'OK' if cond else 'FALHA', '' if cond else detalhe))
        return bool(cond)
    def pular(self, id, titulo, motivo):
        self.itens.append((id, titulo, 'PULADO', motivo))
    def tem_falha(self):
        return any(s in ('FALHA', 'ERRO') for _, _, s, _ in self.itens)


# ----------------------------------------------------------------------------- utilitários
def estado(pg):
    return pg.evaluate(ESTADO_JS)

def esperar(pg, cond, timeout=5000, passo=80):
    """Aguarda cond(estado) ficar verdadeira. Retorna (ok, último estado)."""
    fim = time.time() + timeout / 1000
    e = estado(pg)
    while time.time() < fim:
        if cond(e):
            return True, e
        pg.wait_for_timeout(passo)
        e = estado(pg)
    return cond(e), e

def permanece(pg, cond, ms=1500, passo=100):
    """Verifica que cond(estado) vale durante todo o intervalo. Retorna (ok, estado que violou ou o último)."""
    fim = time.time() + ms / 1000
    e = estado(pg)
    while time.time() < fim:
        if not cond(e):
            return False, e
        pg.wait_for_timeout(passo)
        e = estado(pg)
    return cond(e), e

def resumo(e):
    a = ','.join(f"{x['s']+1}:{'pausado' if x['p'] else 'tocando'}@{x['t']:.1f}" for x in e['audios'] if (not x['p'] or x['t'] > 0)) or '-'
    return f"slide {e['slide']} | {e['bp']} | {a}" + (' | LEITURA' if e['leitura'] else '')

def tecla(pg, k, n=1):
    for _ in range(n):
        pg.keyboard.press(k)

def clicar_js(pg, sel):
    pg.evaluate("s=>document.querySelector(s).click()", sel)

def ir_para_slide(pg, n):
    """Vai ao slide n (1-based) por teclado, sem depender de seletor."""
    tecla(pg, 'Home')
    tecla(pg, 'ArrowRight', n - 1)
    pg.wait_for_timeout(120)

def e_pausado(e):  return e['bp'].startswith('Reproduzir')
def e_mudo(e):     return not e['tocando']


class Ambiente:
    """Gera os arquivos de teste uma única vez (HTML com e sem avanço automático) e abre páginas."""
    def __init__(self, tmp, args):
        self.tmp = Path(tmp)
        self.args = args
        self.auto = self.manual = None
        self.pastas = {}

    def _gerar(self, destino, extra):
        cmd = [sys.executable, str(GERADOR)] + extra + ['--saida', str(destino)]
        r = rodar(cmd, cwd=RAIZ)
        if r.returncode != 0:
            raise RuntimeError('gerador falhou: ' + (r.stderr or r.stdout)[-600:])
        return r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ''

    def preparar_narracao(self):
        aud = self.tmp / 'aud'
        aud.mkdir(exist_ok=True)
        n_slides = len(re.findall(r'(?m)^---\s*$', EXEMPLO_APRES.read_text(encoding='utf-8'))) or 0
        def wav(nome, seg):
            with wave.open(str(aud / nome), 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
                w.writeframes(b''.join(struct.pack('<h', int(2500 * math.sin(i / 9))) for i in range(22050 * seg)))
        for k, seg in AUDIOS.items():
            wav(f'{k}.wav', seg)
        # o último slide é descoberto depois de gerar (precisa do total); gerar uma vez sem áudio extra
        base = self.tmp / 'sondagem'
        self._gerar(base, ['-', str(EXEMPLO_APRES), '--prefixo', 'S', '--audios', str(aud)])
        html = next(base.glob('*.html')).read_text(encoding='utf-8')
        total = len(re.findall(r'<section[^>]*class="s[ "]', html))
        self.total = total
        wav(f'{total}.wav', ULTIMO_AUDIO)
        self.audios = aud
        return total

    def gerar_apresentacoes(self):
        total = self.preparar_narracao()
        for nome, extra in (('auto', ['--avancar']), ('manual', [])):
            d = self.tmp / nome
            self._gerar(d, ['-', str(EXEMPLO_APRES), '--prefixo', 'T', '--audios', str(self.audios)] + extra)
            self.pastas[nome] = next(d.glob('*.html'))
        return total

    def abrir(self, ctx, modo, som=True):
        pg = ctx.new_page()
        pg.erros = []
        pg.on('pageerror', lambda e: pg.erros.append(str(e)))
        pg.goto(self.pastas[modo].as_uri())
        pg.wait_for_selector('#ini1', timeout=8000)
        if som:
            pg.click('#ini1')
        else:
            pg.click('#ini0')
        pg.wait_for_timeout(250)
        return pg


# ----------------------------------------------------------------------------- GRUPO 1 — pausa respeitada
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


# ----------------------------------------------------------------------------- GRUPO 2 — último slide
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


def deslizar(ctx, pg, x0, y0, x1, y1, passos=6):
    cdp = ctx.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
    for k in range(1, passos + 1):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * k / passos, 'y': y0 + (y1 - y0) * k / passos}]})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})


# ----------------------------------------------------------------------------- GRUPO 3 — navegação rápida
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


# ----------------------------------------------------------------------------- GRUPO 4 — Modo leitura e tela cheia
RECT_B2 = """(()=>{const b=document.querySelector('#b2');if(!b)return null;const r=b.getBoundingClientRect(),c=getComputedStyle(b);
 return {dir:Math.round(innerWidth-r.right),topo:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),pos:c.position,vis:c.visibility,disp:c.display,
 fs:!!document.fullscreenElement,pressed:b.getAttribute('aria-pressed')}})()"""

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


# ----------------------------------------------------------------------------- GRUPO 5 — versão e documentação (sem navegador)
def grupo5(amb, ctx, G):
    ler = lambda p: (RAIZ / p).read_text(encoding='utf-8')
    cl = ler('CHANGELOG.md')
    v_cl = re.search(r'(?m)^##\s+([\d.]+)', cl)
    v_js = re.search(r"const VERSAO = '([\d.]+)'", ler('web/changelog.js'))
    G.chk('5.1', 'Versão do CHANGELOG.md = VERSAO em changelog.js', bool(v_cl and v_js) and v_cl.group(1) == v_js.group(1), f'changelog={v_cl and v_cl.group(1)} js={v_js and v_js.group(1)}')
    idx = ler('web/index.html')
    ver = v_js.group(1) if v_js else '?'
    q = {s: (re.search(r'%s\?v=([\d.]+)' % re.escape(s), idx) or [None, None])[1] for s in ('ajuda.js', 'changelog.js')}
    G.chk('5.2', 'index.html carrega ajuda.js e changelog.js com ?v= da versão atual', all(v == ver for v in q.values()), f'esperado {ver}: {q}')
    cacheados = ('opcoes.js', 'ajuda.js', 'changelog.js', 'acessibilidade.js', 'acessibilidade-marcas.js', 'acessibilidade-janelas.js',
                 'acessibilidade-geracao.js', 'relatorio-acessibilidade.js', 'acessibilidade-config.js', 'vlibras.js')
    q = {s: (re.search(r'%s\?v=([\d.]+)' % re.escape(s), idx) or [None, None])[1] for s in cacheados}
    G.chk('5.2c', 'Todos os scripts alterados usam o cache-buster da versão atual', all(v == ver for v in q.values()), f'esperado {ver}: {q}')
    # cada versão tem pelo menos um item e não há versão duplicada
    vs = re.findall(r'(?m)^##\s+([\d.]+)', cl)
    G.chk('5.3', 'CHANGELOG sem versões duplicadas e em ordem decrescente',
          len(vs) == len(set(vs)) and [tuple(map(int, v.split('.'))) for v in vs] == sorted([tuple(map(int, v.split('.'))) for v in vs], reverse=True), vs[:6])
    frase = re.compile(r'só começa (quando você apertar|com)', re.I)
    falta = [p for p in ('web/ajuda.js', 'web/exemplo/treinamento.md', 'web/exemplo/apresentacao.md', 'README.md') if not frase.search(ler(p))]
    G.chk('5.4', 'Ajuda, apostila, apresentação de exemplo e README descrevem que a pausa é respeitada ao mudar de slide', not falta, f'faltando em: {falta}')
    readme = ler('README.md')
    G.chk('5.5', 'README cita o atalho S (não M) para a narração', re.search(r'Narração\*\* \(S\)', readme) is not None and not re.search(r'Narração\*\* \(M\)', readme))
    for nome, tipo in (('web/changelog.js', 'js'), ('web/ajuda.js', 'js')):
        pass
    # sintaxe de todos os scripts da página (módulos tratados como .mjs)
    erros = []
    for js in sorted((RAIZ / 'web').glob('*.js')):
        alvo = js
        if re.search(r'worker|local|g2p', js.name):
            alvo = Path(tempfile.gettempdir()) / (js.stem + '_chk.mjs')
            alvo.write_text(js.read_text(encoding='utf-8'), encoding='utf-8')
        r = rodar(['node', '--check', str(alvo)])
        if r.returncode != 0:
            erros.append(f'{js.name}: {r.stderr.strip()[:120]}')
    G.chk('5.6', 'Sintaxe de todos os .js de web/ (node --check)', not erros, erros)
    ci = ler('.github/workflows/publicar-pagina.yml')
    G.chk('5.7', 'Os testes de navegador são pré-requisito da publicação', 'testes' in ci and re.search(r'needs:\s*\[[^\]]*testes', ci) is not None)


# ----------------------------------------------------------------------------- GRUPO 6 — geração dos arquivos e layout
def grupo6(amb, ctx, G):
    for tema in ('govbr', 'classico'):
        d = amb.tmp / f'saida_{tema}'
        r = rodar([sys.executable, str(GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Exemplo', '--rodape', 'Teste', '--saida', str(d), '--tema', tema], cwd=RAIZ)
        arqs = {p.suffix: p for p in d.glob('*')} if d.exists() else {}
        faltam = [x for x in ('.docx', '.epub', '.pptx', '.html') if x not in arqs or arqs[x].stat().st_size == 0]
        zips_ok = True
        for x in ('.docx', '.epub', '.pptx'):
            if x in arqs:
                try:
                    zips_ok &= zipfile.ZipFile(arqs[x]).testzip() is None
                except Exception:
                    zips_ok = False
        G.chk(f'6.1-{tema}', f'Gerador (tema {tema}): DOCX, EPUB, PPTX e HTML gerados e íntegros', r.returncode == 0 and not faltam and zips_ok, (r.stderr or r.stdout)[-300:] + f' faltam={faltam}')
        r = rodar([sys.executable, str(RAIZ / 'tools' / 'testar_acessibilidade.py'), str(d), '--prefixo', 'Exemplo'] + (['--fonte-pptx', 'Segoe UI'] if tema == 'classico' else []), cwd=RAIZ)
        falhas = [l for l in r.stdout.splitlines() if l.startswith('FAIL')]
        # sem linhas FAIL, o erro está no stderr (ex.: exceção do script): mostra o fim dele em vez de deixar o detalhe vazio
        detalhe = ' | '.join(falhas)[:400] or f'código {r.returncode}: ' + ' '.join((r.stderr or r.stdout).strip().splitlines()[-2:])[:350]
        G.chk(f'6.2-{tema}', f'Teste de acessibilidade das saídas (tema {tema})', r.returncode == 0, detalhe)
    # regressão do Windows: o teste de acessibilidade tem de rodar com a saída em cp1252 (console/pipe padrão do Windows)
    r = subprocess.run([sys.executable, str(RAIZ / 'tools' / 'testar_acessibilidade.py'), str(amb.tmp / 'saida_govbr'), '--prefixo', 'Exemplo'],
                       capture_output=True, env=dict(os.environ, PYTHONIOENCODING='cp1252', PYTHONUTF8='0'), cwd=RAIZ)
    G.chk('6.2-cp1252', 'Teste de acessibilidade roda com a saída em cp1252 (Windows), sem UnicodeEncodeError',
          r.returncode == 0, 'código %s: %s' % (r.returncode, ' '.join(r.stderr.decode('utf-8', 'replace').strip().splitlines()[-1:])[:250]))
    # layout: sem rolagem horizontal em três janelas, e sem erros na carga
    html = next((amb.tmp / 'saida_govbr').glob('*Apresentacao*.html'), None)
    if html is None:
        G.chk('6.3', 'Apresentação HTML do tema govbr encontrada', False)
        return
    for nome, vp in (('desktop 1280×720', {'width': 1280, 'height': 720}), ('celular retrato 390×780', {'width': 390, 'height': 780}), ('celular paisagem 844×390', {'width': 844, 'height': 390})):
        c = amb.novo_contexto(viewport=vp, touch=vp['width'] < 900)
        pg = c.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(html.as_uri()); pg.wait_for_timeout(700)
        m = pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth,slides:document.querySelectorAll('.s').length,on:document.querySelectorAll('.s.on').length})")
        G.chk(f'6.3-{vp["width"]}', f'Apresentação em {nome}: sem rolagem horizontal, 1 slide ativo e sem erros', m['sw'] <= m['iw'] + 1 and m['on'] == 1 and not erros, f'{m} {erros}')
        c.close()


# ----------------------------------------------------------------------------- GRUPO 7 — celular (emulação de toque)
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


# ----------------------------------------------------------------------------- GRUPO 8 — opções padrão (web/config/opcoes.yaml)
def _servidor(pasta):
    """Serve uma cópia de web/ por HTTP (o YAML é lido por requisição; arquivo local não serve)."""
    import functools, http.server, threading
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=str(pasta)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}/index.html'


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


# ----------------------------------------------------------------------------- GRUPO 9 — celular: editor e Importar (1.79)
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


# ----------------------------------------------------------------------------- GRUPO 10 — zoom nos arquivos gerados (1.79)
def grupo10(amb, ctx, G):
    d = amb.tmp / 'saida_zoom'
    if not (d / 'Apresentacao_Exemplo.html').exists():
        rodar([sys.executable, str(GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Exemplo', '--rodape', 'Teste', '--saida', str(d), '--tema', 'govbr'], cwd=RAIZ)
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


# ----------------------------------------------------------------------------- GRUPO 11 — biblioteca Linguagem Acessível no navegador
def grupo11(amb, ctx, G):
    import shutil
    d = amb.tmp / 'web_lib'
    if not d.exists():
        shutil.copytree(RAIZ / 'web' / 'lib', d / 'lib')
        (d / 't.html').write_text("""<!doctype html><meta charset="utf-8"><title>t</title><script type="module">
import { analisar, VERSAO } from './lib/linguagem-acessivel/index.js';
window.r1 = { v: VERSAO, r: analisar('# A\\n\\n### B\\n\\n![](a.png) [aqui](x)').resumo };
const w = new Worker('./w.js', { type: 'module' }); w.onmessage = e => { window.r2 = e.data; }; w.postMessage('[clique aqui](x)');
</script>""", encoding='utf-8')
        (d / 'w.js').write_text("import { criarSessao } from './lib/linguagem-acessivel/index.js';\nconst s = criarSessao();\nonmessage = e => postMessage(s.analisar(e.data).resumo);\n", encoding='utf-8')
    srv, url = _servidor(d)
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(url.replace('index.html', 't.html'))
        pg.wait_for_function('window.r1 && window.r2', timeout=10000)
        r1, r2 = pg.evaluate('window.r1'), pg.evaluate('window.r2')
        G.chk('11.1', 'Biblioteca carrega como módulo no navegador e analisa (3 itens para corrigir)', r1['r'].get('corrigir') == 3, r1)
        G.chk('11.2', 'Biblioteca roda em Web Worker (módulo) com sessão e cache', r2.get('corrigir') == 1, r2)
        G.chk('11.3', 'Nenhum erro de JavaScript', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()


# ----------------------------------------------------------------------------- GRUPO 12 — painel "Acessibilidade do texto" (1.80)
TEXTO_A11Y = ('# Processo\n\n### Prazos\n\nOs prazos estão no regulamento. Para consultar, [clique aqui](https://www.gov.br/anac).\n\n'
              '![](fluxo.png)\n\nO pedido segue o RBAC 145.\n\n' + 'Linha de enchimento.\n\n' * 60 + 'Fim. ![Imagem](x.png)\n')


def _editor_com_texto(pg, url):
    pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
    pg.keyboard.press('Escape')
    pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", TEXTO_A11Y)
    pg.wait_for_function("document.querySelector('#pg .la-btn').getAttribute('aria-label').includes('4 itens')", timeout=8000)


def grupo12(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        _editor_com_texto(pg, url)
        bt = pg.locator('#pg .la-btn')
        G.chk('12.1', 'Botão Acessibilidade na barra do editor mostra os itens para corrigir (nome acessível e número)',
              bt.get_attribute('aria-label') == 'Conferir acessibilidade, 4 itens para corrigir' and pg.inner_text('#pg .la-cont') == '4', bt.get_attribute('aria-label'))
        av = pg.inner_text('#laAviso') if pg.is_visible('#laAviso') else ''
        G.chk('12.2', 'Aviso perto de Gerar arquivos, sem bloquear a geração', '4 itens para corrigir na apostila' in av and not pg.is_disabled('#go'), av)
        pg.keyboard.press('Alt+Shift+C'); pg.wait_for_timeout(300)
        G.chk('12.3', 'Alt+Shift+C abre o painel, com o foco no título e aria-expanded', pg.is_visible('#laP-g') and pg.evaluate("document.activeElement.id") == 'laT-g' and bt.get_attribute('aria-expanded') == 'true')
        n = pg.evaluate("[document.querySelectorAll('#laP-g .la-sec.c .la-it').length, document.querySelectorAll('#laP-g .la-sec.s .la-it').length]")
        sub = pg.inner_text('#laP-g .la-sub')
        G.chk('12.4', 'Dois níveis: 4 para corrigir e 1 sugestão (recolhida)', n == [4, 1] and pg.evaluate("document.getElementById('laLs-g').hidden") and '1 sugestão' in sub, [n, sub])
        pg.locator('#laP-g .la-it', has_text='pulou').locator('button', has_text='Ajustar nível').click(); pg.wait_for_timeout(700)
        ok = pg.evaluate("ED.g.textarea.value.split('\\n')[2]") == '## Prazos'
        G.chk('12.5', 'Correção em um clique aplica e o foco continua no painel', ok and pg.evaluate("!!document.activeElement.closest('#laP-g')"))
        pg.evaluate('ED.g.desfazer()')
        G.chk('12.6', 'A correção sai com um único Ctrl+Z (desfazer do editor)', pg.evaluate("ED.g.textarea.value.split('\\n')[2]") == '### Prazos')
        pg.evaluate('ED.g.refazer()'); pg.wait_for_timeout(1300)
        pg.locator('#laP-g .la-it', has_text='não diz o que').locator('button', has_text='Ir para').click(); pg.wait_for_timeout(200)
        e = pg.evaluate("(() => { const t = ED.g.textarea; return [t.value.slice(t.selectionStart, t.selectionEnd), t.scrollTop > 0, document.activeElement === t]; })()")
        G.chk('12.7', '"Ir para" seleciona o trecho no editor e rola até ele', e == ['![Imagem](x.png)', True, True], e)
        pg.locator('#laP-g .la-it', has_text='clique aqui').locator('button', has_text='Editar o texto do link').click(); pg.wait_for_timeout(200)
        e = pg.evaluate("(() => { const t = ED.g.textarea; return t.value.slice(t.selectionStart, t.selectionEnd); })()")
        G.chk('12.8', 'Correção que precisa de uma pessoa (sem janela própria) seleciona o texto a reescrever e mostra a dica', e == 'clique aqui' and 'colchetes' in pg.inner_text('.la-toast'), e)
        pg.locator('#laP-g .la-abre').click(); pg.wait_for_timeout(100)
        pg.locator('#laP-g .la-it', has_text='RBAC').locator('button', has_text='Ignorar').click(); pg.wait_for_timeout(900)
        G.chk('12.9', 'Ignorar grava o comentário no texto e a sugestão some',
              pg.evaluate("ED.g.textarea.value.includes('<!-- linguagem-acessivel: ignorar s1 -->\\nO pedido')") and '0 sugestões' in pg.inner_text('#laP-g .la-sub'))
        pg.locator('#laP-g .la-it').first.locator('button', has_text='Por quê?').click()
        pg.evaluate("AcessibilidadeTexto.analisarAgora('g')"); pg.wait_for_timeout(1500)   # nova conferência redesenha a lista
        pq = pg.locator('#laP-g .la-it').first.locator('button', has_text='Por quê?')
        G.chk('12.10', '"Por quê?" mostra a explicação (aria-expanded) e continua aberto depois de uma nova conferência', pq.get_attribute('aria-expanded') == 'true' and pg.locator('#laP-g .la-it').first.locator('.la-pq').is_visible())
        pg.evaluate('ED.g.textarea.setSelectionRange(0, 0)'); pg.keyboard.press('Alt+Shift+N'); pg.wait_for_timeout(300)
        e = pg.evaluate("(() => { const t = ED.g.textarea; return t.value.slice(t.selectionStart, t.selectionEnd); })()")
        G.chk('12.11', 'Alt+Shift+N vai ao próximo item a partir do cursor', e == '[clique aqui](https://www.gov.br/anac)', e)
        pg.locator('#laP-g h3').focus(); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        G.chk('12.12', 'Esc fecha o painel e devolve o foco ao botão', not pg.is_visible('#laP-g') and pg.evaluate("document.activeElement.classList.contains('la-btn')"))
        pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", '# Título\n\n## Parte\n\nTexto simples.\n')
        pg.wait_for_function("document.querySelector('#pg .la-cont').hidden", timeout=6000)
        G.chk('12.13', 'Sem itens: o número some e o aviso de Gerar arquivos também', not pg.is_visible('#laAviso'))
        pg.evaluate("AcessibilidadeTexto.abrir('g')"); pg.wait_for_timeout(200)
        G.chk('12.14', 'Sem itens: o painel diz "Nada para corrigir"', 'Nada para corrigir' in pg.inner_text('#laP-g .la-corpo'))
        G.chk('12.15', 'Nenhum erro de JavaScript no painel', not erros, erros)
        pg.close()
        c2 = amb.novo_contexto(movel=True)
        try:
            m = c2.new_page(); _editor_com_texto(m, url)
            m.locator('#pg .mv-bt[data-g=mais]').click(); m.wait_for_timeout(150)
            tem = m.locator('.mv-menu:not([hidden]) [role=menuitem]', has_text='Conferir acessibilidade')
            G.chk('12.16', 'Celular: "Conferir acessibilidade" no menu ⋯ da barra', tem.count() == 1)
            tem.click(); m.wait_for_timeout(300)
            e = m.evaluate("(() => { const p = document.getElementById('laP-g'); return [p.classList.contains('folha'), p.getAttribute('role'), p.getAttribute('aria-modal'), document.activeElement.id]; })()")
            G.chk('12.17', 'Celular: painel abre como folha inferior modal, com o foco no título', e == [True, 'dialog', 'true', 'laT-g'], e)
            m.locator('#laP-g .la-it', has_text='Descreva').locator('button', has_text='Ir para').click(); m.wait_for_timeout(300)
            G.chk('12.18', 'Celular: "Ir para" fecha a folha e seleciona o trecho', not m.is_visible('#laP-g') and m.evaluate("(() => { const t = ED.g.textarea; return t.value.slice(t.selectionStart, t.selectionEnd); })()") == '![](fluxo.png)')
            m.close()
        finally:
            c2.close()
    finally:
        srv.shutdown()


# ----------------------------------------------------------------------------- GRUPO 13 — marcas no texto e balão (1.81)
TEXTO_MARCAS = ('# Processo\n\n### Prazos\n\nOs prazos estão no regulamento, que é um texto bem longo para quebrar a linha automaticamente dentro do campo. '
                'Para consultar, [clique aqui](https://www.gov.br/anac).\n\n![](fluxo.png)\n\nO pedido segue o RBAC 145. 😀 Ação.\n\n' + 'Linha de enchimento.\n\n' * 40 + 'Fim. ![Imagem](x.png)\n')
ALINHAMENTO_JS = """() => { const ta = ED.g.textarea, c = document.querySelector('#pg .la-camada'), cs = getComputedStyle(ta), r = [];
  for (const sp of c.querySelectorAll('.la-m')) { const d = AcessibilidadeTexto.resultado('g').diagnosticos[+sp.dataset.i];
    const m = document.createElement('div'); ['fontFamily','fontSize','lineHeight','paddingTop','paddingLeft','paddingRight','letterSpacing','tabSize','wordSpacing'].forEach(k => m.style[k] = cs[k]);
    Object.assign(m.style, { position: 'absolute', top: '0', left: '-9999px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', boxSizing: 'border-box', width: ta.clientWidth + 'px' });
    m.textContent = ta.value.slice(0, d.inicio); const s = document.createElement('span'); s.textContent = 'x'; m.appendChild(s); document.body.appendChild(m);
    r.push(Math.abs(sp.offsetTop - s.offsetTop) + Math.abs(sp.offsetLeft - s.offsetLeft)); m.remove(); }
  return { n: r.length, max: Math.max(0, ...r), larg: [ta.clientWidth, c.clientWidth], alt: [ta.scrollHeight, c.scrollHeight] }; }"""


BALAO_ABERTO = "(() => { const b = document.querySelector('.la-balao'); return !!b && !b.hidden; })()"
# 13.5: ponto do clique na marca "[clique aqui]", medido depois de 2 quadros e com a camada alinhada ao campo.
PONTO_MARCA_JS = """() => new Promise(ok => {
  const ta0 = ED.g.textarea;                                   // 13.4 deixa o campo rolado (scrollTop 400): volta ao topo
  ta0.scrollTop = 0; ta0.dispatchEvent(new Event('scroll'));
  requestAnimationFrame(() => requestAnimationFrame(() => {
  const ta = ED.g.textarea, cam = document.querySelector('#pg .la-camada');
  cam.scrollTop = ta.scrollTop; cam.scrollLeft = ta.scrollLeft;
  const s = [...cam.querySelectorAll('.la-m')].find(x => x.textContent.startsWith('[clique'));
  const rt = ta.getBoundingClientRect();
  const q = [...s.getClientRects()].find(r => r.width >= 6 && r.top >= rt.top && r.bottom <= rt.bottom) || s.getClientRects()[0];
  const x = q.left + Math.min(q.width / 2, 12), y = q.top + q.height / 2, e = document.elementFromPoint(x, y);
  const d = el => !el ? 'null' : el.tagName + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
  ok({ x, y, alvo: d(e), noCampo: e === ta, campo: [rt.left, rt.top, rt.right, rt.bottom].map(Math.round), rolagem: [ta.scrollTop, cam.scrollTop], janela: [innerWidth, innerHeight, Math.round(scrollY)] });
}))}) """
ESTADO_BALAO_JS = """(() => { const b = document.querySelector('.la-balao'), a = document.activeElement;
  return { balao: !!b && !b.hidden, msg: b ? ((b.querySelector('.lb-msg') || {}).textContent || '') : '', focoNoCampo: a === ED.g.textarea,
    foco: a ? a.tagName + (a.id ? '#' + a.id : '') : 'null', cursor: ED.g.textarea.selectionStart }; })()"""
def _esperar(pg, js, ms=2000):
    """Espera uma condicao da pagina ficar verdadeira (sem falhar aqui: quem decide e o G.chk)."""
    fim = time.time() + ms / 1000
    while time.time() < fim:
        if pg.evaluate(js):
            return True
        pg.wait_for_timeout(50)
    return False
def grupo13(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")   # sem o tutorial da primeira visita
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
        pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", TEXTO_MARCAS)
        pg.wait_for_selector('#pg .la-camada .la-m', timeout=8000)
        a = pg.evaluate(ALINHAMENTO_JS)
        G.chk('13.1', 'Marcas só nos itens para corrigir (4), por padrão', a['n'] == 4 and pg.evaluate("document.querySelectorAll('#pg .la-camada .la-m.s').length") == 0, a)
        G.chk('13.2', 'Marcas alinhadas ao texto, com quebra de linha automática e emoji (até 1 px)', a['max'] <= 1 and a['larg'][0] == a['larg'][1] and abs(a['alt'][0] - a['alt'][1]) <= 4, a)
        G.chk('13.3', 'Camada invisível para leitor de tela e sem bloquear o mouse',
              pg.evaluate("(() => { const c = document.querySelector('#pg .la-camada'); return c.getAttribute('aria-hidden') === 'true' && getComputedStyle(c).pointerEvents === 'none'; })()"))
        ED_SCROLL = "(() => { const ta = ED.g.textarea; ta.scrollTop = 400; return new Promise(r => requestAnimationFrame(() => r(document.querySelector('#pg .la-camada').scrollTop === ta.scrollTop))); })()"
        G.chk('13.4', 'A camada acompanha a rolagem do campo', pg.evaluate(ED_SCROLL))
        pg.evaluate("ED.g.textarea.scrollTop = 0; ED.g.element.scrollIntoView({ block: 'start', behavior: 'instant' })"); pg.wait_for_timeout(300)
        r = pg.evaluate("(() => { const s = [...document.querySelectorAll('#pg .la-camada .la-m')].find(x => x.textContent.startsWith('[clique')); const q = s.getClientRects()[0]; return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; })()")
        p135 = pg.evaluate(PONTO_MARCA_JS)
        if not p135['noCampo']:                                       # algo cobre o ponto: centraliza o editor e mede de novo
            pg.evaluate("ED.g.element.scrollIntoView({ block: 'center', behavior: 'instant' })"); pg.wait_for_timeout(200)
            p135 = pg.evaluate(PONTO_MARCA_JS)
        pg.mouse.click(p135['x'], p135['y']); _esperar(pg, BALAO_ABERTO); pg.wait_for_timeout(100)
        e135 = pg.evaluate(ESTADO_BALAO_JS)
        ok135 = e135['balao'] and 'clique aqui' in e135['msg'] and e135['focoNoCampo']
        if not ok135:
            try:
                pg.screenshot(path=str(Path(amb.args.saida) / 'falha-13.5.png'))
            except Exception:
                pass
        G.chk('13.5', 'Clique na marca abre o balão com a mensagem, sem tirar o foco do texto',
              ok135, {'ponto': p135, 'depois': e135})
        pg.keyboard.press('Escape')
        G.chk('13.6', 'Esc fecha o balão', not pg.is_visible('.la-balao'))
        pg.evaluate('ED.g.textarea.focus()'); pg.keyboard.type('x')                # 13.7 nao depende do 13.5
        G.chk('13.7', 'Ao digitar, as marcas somem (não ficam fora do lugar)', pg.evaluate("document.querySelectorAll('#pg .la-camada .la-m').length") == 0,
              pg.evaluate("({ marcas: document.querySelectorAll('#pg .la-camada .la-m').length, focoNoCampo: document.activeElement === ED.g.textarea })"))
        pg.wait_for_function("document.querySelectorAll('#pg .la-camada .la-m').length > 0", timeout=6000)
        G.chk('13.8', 'E voltam depois da conferência', True)
        pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", TEXTO_MARCAS); pg.wait_for_timeout(1500)
        pg.evaluate('ED.g.textarea.focus(); ED.g.textarea.setSelectionRange(0, 0)'); pg.keyboard.press('Alt+Shift+N'); _esperar(pg, BALAO_ABERTO); pg.wait_for_timeout(150)
        e = pg.evaluate("(() => { const b = document.querySelector('.la-balao'); return [!!b && !b.hidden, b ? b.textContent.slice(0, 60) : '', document.activeElement === ED.g.textarea]; })()")
        G.chk('13.9', 'Alt+Shift+N mostra o balão do próximo item e o foco fica no texto', e[0] and 'pulou' in e[1] and e[2], e)
        pg.keyboard.press('Alt+Shift+I'); pg.wait_for_timeout(200)
        G.chk('13.10', 'Alt+Shift+I leva o foco à primeira correção do balão', pg.evaluate('document.activeElement.textContent') == 'Ajustar nível')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(900)
        G.chk('13.11', 'Corrigir pelo balão aplica e devolve o foco ao texto',
              pg.evaluate("ED.g.textarea.value.split('\\n')[2]") == '## Prazos' and pg.evaluate('document.activeElement === ED.g.textarea') and not pg.is_visible('.la-balao'))
        rod = pg.inner_text('#pg .st-la')
        G.chk('13.12', 'Resumo no rodapé do editor', rod == 'Acessibilidade: 3 para corrigir', rod)
        pg.evaluate("AcessibilidadeTexto.abrir('g')"); pg.wait_for_timeout(300)
        pg.locator('#laP-g [data-la-marcas-sug]').check(); pg.wait_for_timeout(200)
        G.chk('13.13', '"Marcar também as sugestões" sublinha as sugestões (linha pontilhada)', pg.evaluate("document.querySelectorAll('#pg .la-camada .la-m.s').length") >= 1)
        a = pg.evaluate(ALINHAMENTO_JS)
        G.chk('13.14', 'Com o painel aberto (campo mais estreito), as marcas continuam alinhadas', a['max'] <= 1 and a['larg'][0] == a['larg'][1], a)
        pg.locator('#laP-g [data-la-marcas]').uncheck(); pg.wait_for_timeout(200)
        G.chk('13.15', '"Marcar no texto" desligado esconde as marcas e fica guardado',
              pg.evaluate("document.querySelector('#pg .la-camada').hidden") and pg.evaluate("localStorage.getItem('conteudista.acessibilidade.marcas')") == '0')
        pg.locator('#laP-g [data-la-marcas]').check()
        pg.click('#pg .mde-tb [data-m=p]'); pg.wait_for_timeout(200)
        G.chk('13.16', 'No modo Prévia, a camada some', pg.evaluate("document.querySelector('#pg .la-camada').hidden"))
        G.chk('13.17', 'As marcas não entram no texto', '<span' not in pg.evaluate('document.getElementById("g").value') and 'la-m' not in pg.evaluate('document.getElementById("g").value'))
        G.chk('13.18', 'Nenhum erro de JavaScript nas marcas', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()


# ----------------------------------------------------------------------------- GRUPO 14 — janelas de apoio e imagens decorativas (1.82)
PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
TEXTO_JANELAS = ('# Processo\n\n## Etapas\n\nO pedido chega pelo sistema.\n\n![](' + PNG_1PX + ')\n\nO QWER aprova o pedido.\n\n'
                 'A solicitação deverá ser instruída pelo interessado com a documentação comprobatória prevista no regulamento, '
                 'sendo encaminhada à área técnica competente, que procederá à análise no prazo regulamentar.\n')


def grupo14(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        try: ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        except Exception: pass
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
        pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", TEXTO_JANELAS)
        pg.wait_for_function("(AcessibilidadeTexto.resultado('g') || { resumo: {} }).resumo.corrigir === 1", timeout=8000)
        pg.evaluate("AcessibilidadeTexto.abrir('g')"); pg.wait_for_timeout(300)
        pg.locator('#laP-g .la-it', has_text='Descreva').locator('button', has_text='Descrever').click()
        pg.wait_for_selector('.lj-jan', timeout=5000); pg.wait_for_timeout(200)
        e = pg.evaluate("(() => { const j = document.querySelector('.lj-jan'); return [!!j, j && j.getAttribute('role'), j && j.getAttribute('aria-modal'), document.activeElement.id, !!document.querySelector('.lj-mini img')]; })()")
        G.chk('14.1', 'Descrever abre janela modal com a miniatura e o foco no título', e == [True, 'dialog', 'true', 'ljT', True], e)
        pg.click('.lj-jan [data-ok]'); pg.wait_for_timeout(100)
        G.chk('14.2', 'Aplicar sem descrição mostra o erro no campo, em linguagem simples', 'Escreva a descrição curta' in pg.inner_text('#ljdErro') and pg.evaluate("document.activeElement.id") == 'ljdCurta' and pg.get_attribute('#ljdCurta', 'aria-invalid') == 'true')
        pg.fill('#ljdCurta', 'x' * 160); pg.wait_for_timeout(50)
        G.chk('14.3', 'Contagem de caracteres avisa quando passa de 150', 'encurte' in pg.inner_text('#ljdCont'))
        pg.click('#ljdTb'); pg.wait_for_timeout(100)
        G.chk('14.4', 'Aba "Pedir ajuda a uma IA" (padrão Tab) com o aviso de uso autorizado', pg.get_attribute('#ljdTb', 'aria-selected') == 'true' and pg.is_visible('#ljdPb .lj-msg.aten') and not pg.is_visible('#ljdPa'))
        pg.click('[data-c=pedido]'); pg.wait_for_timeout(300)
        try: clip = pg.evaluate('navigator.clipboard.readText()')
        except Exception: clip = pg.inner_text('#ljdPed')
        if 'DESCREVER' not in clip: clip = pg.evaluate("document.getElementById('ljdPed').textContent")
        G.chk('14.5', 'Copiar pedido: pedido padronizado com o texto perto da imagem', 'DESCREVER IMAGEM (versão 1.0)' in clip and 'O pedido chega pelo sistema' in clip, clip[:80])
        pg.fill('#ljdResp', 'DESCRIÇÃO CURTA: Fluxo de aprovação em três etapas.\nDESCRIÇÃO DETALHADA: 1. Pedido. 2. Análise. 3. Decisão.')
        G.chk('14.6', 'A resposta da IA é separada em descrição curta e detalhada', pg.input_value('#ljdCurta') == 'Fluxo de aprovação em três etapas.' and pg.input_value('#ljdDet').startswith('1. Pedido.'))
        pg.click('.lj-jan [data-ok]')
        pg.wait_for_function("ED.g.textarea.value.includes('![Fluxo de aprovação em três etapas.](img:1)')", timeout=5000); pg.wait_for_timeout(300)
        v = pg.evaluate('ED.g.textarea.value')
        G.chk('14.7', 'Aplicar grava a descrição e a detalhada abaixo da imagem; a janela fecha e o foco volta ao texto',
              '![Fluxo de aprovação em três etapas.](img:1)\n\n1. Pedido.' in v and not pg.is_visible('.lj-fundo') and pg.evaluate('document.activeElement === ED.g.textarea'))
        pg.evaluate('ED.g.desfazer()')
        G.chk('14.8', 'Um Ctrl+Z desfaz a descrição inteira', '![](img:1)' in pg.evaluate('ED.g.textarea.value') and '1. Pedido.' not in pg.evaluate('ED.g.textarea.value'))
        pg.wait_for_function("(AcessibilidadeTexto.resultado('g') || { resumo: {} }).resumo.corrigir === 1", timeout=8000); pg.wait_for_timeout(200)
        pg.locator('#laP-g .la-it', has_text='Descreva').locator('button', has_text='Descrever').click()
        pg.wait_for_selector('.lj-jan', timeout=5000); pg.wait_for_timeout(100)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        G.chk('14.9', 'Esc fecha sem aplicar e devolve o foco ao botão que abriu', not pg.is_visible('.lj-fundo') and pg.evaluate('document.activeElement.textContent') == 'Descrever')
        if pg.locator('#laP-g .la-abre[aria-expanded=false]').count(): pg.locator('#laP-g .la-abre').click()
        pg.locator('#laP-g .la-it', has_text='Frase longa').locator('button', has_text='Simplificar').click()
        pg.wait_for_selector('#ljsCont', timeout=5000); pg.wait_for_timeout(100)
        G.chk('14.10', 'Simplificar mostra Antes e Depois com a contagem', pg.inner_text('#ljsCont').startswith('27 palavras · 1 frase'))
        pg.fill('#ljsDepois', 'Envie o pedido com os documentos. A área técnica analisa no prazo.')
        G.chk('14.11', 'A contagem acompanha a edição', 'todas com até 25 palavras' in pg.inner_text('#ljsCont'))
        pg.click('.lj-jan [data-ok]')
        pg.wait_for_function("ED.g.textarea.value.includes('Envie o pedido com os documentos.')", timeout=5000); pg.wait_for_timeout(1200)
        G.chk('14.12', '"Trocar no texto" substitui o trecho', 'Envie o pedido com os documentos.' in pg.evaluate('ED.g.textarea.value') and 'solicitação deverá' not in pg.evaluate('ED.g.textarea.value'))
        if pg.locator('#laP-g .la-abre[aria-expanded=false]').count(): pg.locator('#laP-g .la-abre').click()
        pg.locator('#laP-g .la-it', has_text='QWER').locator('button', has_text='Explicar').click()
        pg.wait_for_selector('#ljxNome', timeout=5000)
        pg.fill('#ljxNome', 'Quadro de Registro')
        G.chk('14.13', 'Explicar sigla mostra a prévia', 'Quadro de Registro (QWER) aprova' in pg.inner_text('#ljxPrev'))
        pg.keyboard.press('Enter')
        pg.wait_for_function("ED.g.textarea.value.includes('O Quadro de Registro (QWER) aprova')", timeout=5000)
        G.chk('14.14', 'Enter aplica a explicação', True)
        G.chk('14.15', 'Nenhum erro de JavaScript nas janelas', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()
    d = amb.tmp / 'decorativa'; d.mkdir(exist_ok=True)
    (d / 'a.md').write_text('# T\n\n## A\n\nTexto.\n\n<!-- linguagem-acessivel: decorativa -->\n![](' + PNG_1PX + ')\n', encoding='utf-8')
    (d / 'b.md').write_text('---\ntitle: X\n---\n\n# S\n\n<!-- linguagem-acessivel: decorativa -->\n![](' + PNG_1PX + ')\n', encoding='utf-8')
    r = rodar([sys.executable, str(GERADOR), str(d / 'a.md'), str(d / 'b.md'), '--prefixo', 'D', '--saida', str(d / 'o')], cwd=RAIZ)
    saida = (r.stdout or '') + (r.stderr or '')
    G.chk('14.16', 'Gerador: imagem decorativa não gera aviso de "sem descrição"', r.returncode == 0 and 'sem descrição' not in saida and 'sem texto alternativo' not in saida, saida[-300:])
    xml = ''
    try:
        with zipfile.ZipFile(d / 'o' / 'Apresentacao_D.pptx') as z: xml = ''.join(z.read(n).decode('utf-8', 'ignore') for n in z.namelist() if n.startswith('ppt/slides/slide'))
    except Exception as ex: xml = str(ex)
    G.chk('14.17', 'Gerador: no PPTX, a imagem fica marcada como decorativa', 'adec:decorative' in xml)


# ----------------------------------------------------------------------------- GRUPO 15 — conteúdo acessível desde a criação (1.83)
def grupo15(amb, ctx, G):
    ler = lambda p: (RAIZ / p).read_text(encoding='utf-8')
    lac = RAIZ / 'tools' / 'lac' / 'lac.mjs'
    ex = [str(RAIZ / 'web' / 'exemplo' / 'treinamento.md'), str(RAIZ / 'web' / 'exemplo' / 'apresentacao.md')]
    r = rodar(['node', str(lac), 'c', '-n', 'c'] + ex, cwd=RAIZ)
    G.chk('15.1', 'Conteúdo de exemplo sem itens para corrigir (lac c -n c sai com 0)', r.returncode == 0, (r.stdout + r.stderr)[-400:])
    r = rodar(['node', str(lac), 'c', '-f', 'json', '--agrupar', 'nenhum', ex[0]], cwd=RAIZ)
    tipo = ''
    try: tipo = json.loads(r.stdout).get('tipo')
    except Exception: pass
    G.chk('15.2', 'A apostila de exemplo é reconhecida como apostila (exemplos de slides em código não confundem)', tipo == 'apostila', tipo)
    t = ler('web/exemplo/treinamento.md')
    m = re.search(r'PROMPT PADRÃO DO CONTEUDISTA.*?\n```', t, re.S); pr = m.group(0) if m else ''
    nunca = [l for l in pr.splitlines() if 'clique aqui' in l]
    G.chk('15.3', 'Prompt padrão 1.1 com as regras de acessibilidade e linguagem simples',
          'Versão 1.1' in pr and 'ACESSIBILIDADE E LINGUAGEM SIMPLES' in pr and 'Nome completo (SIGLA)' in pr and '25' in pr and 'linguagem-acessivel:' in pr
          and len(nunca) == 1 and 'Nunca use' in nunca[0], nunca)
    G.chk('15.4', 'Apostila de exemplo com as seções 5.6 e 10.6 e o Checklist A atualizado',
          '### 5.6 Acessibilidade do texto' in t and '### 10.6 Escrever conteúdo acessível' in t and 'O botão **Acessibilidade** não mostra itens para corrigir' in t)
    a = ler('web/exemplo/apresentacao.md')
    tit = ['# Acessibilidade do texto', '# O que é para corrigir', '# Sugestões de linguagem simples', '# Corrigir no próprio texto', '# Pedir ajuda a uma IA']
    n = len(re.findall(r'(?m)^---\s*$', a)) - 1
    G.chk('15.5', 'Apresentação de exemplo com os 5 slides de acessibilidade (39 slides)', all(x in a for x in tit) and n == 39, n)
    aj = ler('web/ajuda.js')
    G.chk('15.6', 'Ajuda com "Escrever conteúdo acessível" e a tabela de atalhos da acessibilidade',
          '<h4>Escrever conteúdo acessível</h4>' in aj and '<kbd>Alt+Shift+I</kbd>' in aj and "t: '3. Confira a acessibilidade'" in aj)
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
        pg.click('#btnTour'); pg.wait_for_selector('.tr-pop', timeout=5000)
        for _ in range(3): pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(250)
        e = pg.evaluate("""() => { const p = document.querySelector('.tr-pop'), h = document.querySelector('.tr-hole'), b = document.querySelector('#pg .la-btn').getBoundingClientRect();
            const r = h && h.getBoundingClientRect(); return { titulo: p && p.querySelector('h4').textContent, cobre: !!r && r.left <= b.left && r.right >= b.right && r.top <= b.top && r.bottom >= b.bottom }; }""")
        G.chk('15.7', 'Tutorial: passo "3. Confira a acessibilidade" destaca o botão Acessibilidade', e['titulo'] == '3. Confira a acessibilidade' and e['cobre'], e)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        pg.click('#ex'); pg.wait_for_timeout(500)
        pg.wait_for_function("(() => { const g = AcessibilidadeTexto.resultado('g'), s = AcessibilidadeTexto.resultado('s'); return g && s && g.diagnosticos.length + s.diagnosticos.length > 0; })()", timeout=15000)
        pg.wait_for_timeout(1500)
        e = pg.evaluate("[AcessibilidadeTexto.resultado('g').resumo.corrigir, AcessibilidadeTexto.resultado('s').resumo.corrigir, document.getElementById('laAviso') ? !document.getElementById('laAviso').hidden : false]")
        G.chk('15.8', 'Carregar exemplo: o painel não acusa nada para corrigir e não há aviso perto de Gerar arquivos', e == [0, 0, False], e)
        G.chk('15.9', 'Nenhum erro de JavaScript', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()


# ----------------------------------------------------------------------------- GRUPO 16 — conferência ao gerar (1.85)
def grupo16(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000)
        def texto(g, s=''):
            pg.evaluate("([g,s]) => { document.getElementById('g').value=g; document.getElementById('s').value=s; ED.g.refresh(); ED.s.refresh(); }", [g, s])
        texto('# Título\n\nTexto simples.')
        pg.evaluate("AcessibilidadeTexto.analisarAgora('g')")
        r = pg.evaluate("AcessibilidadeGeracao.antesDeGerar()")
        G.chk('16.1', 'Sem itens para corrigir, a geração segue direto sem confirmação', r is True and not pg.locator('.la-gerar-dialog[open]').count(), r)

        texto('palavra ' * 30 + '.')
        rg = pg.evaluate("AcessibilidadeTexto.analisarAgora('g')")
        r = pg.evaluate("AcessibilidadeGeracao.antesDeGerar()")
        G.chk('16.2', 'Sugestões isoladas não abrem confirmação', rg['resumo']['corrigir'] == 0 and rg['resumo']['sugestoes'] > 0 and r is True and not pg.locator('.la-gerar-dialog[open]').count(), rg['resumo'])

        texto('# Título\n\n### Seção', '---\ntitle: Slides\n---\n\n### Slide 1\n\nTexto.\n\n---\n\n### Slide 2\n\nTexto.')
        pg.evaluate("Promise.all([AcessibilidadeTexto.analisarAgora('g'), AcessibilidadeTexto.analisarAgora('s')])")
        contagens = pg.evaluate("[AcessibilidadeTexto.resultado('g').resumo.corrigir, AcessibilidadeTexto.resultado('s').resumo.corrigir]")
        pg.focus('#go'); pg.click('#go')
        pg.wait_for_selector('.la-gerar-dialog[open]', timeout=5000)
        texto_modal = pg.inner_text('.la-gerar-dialog')
        G.chk('16.3', 'Com itens para corrigir, a confirmação informa a contagem', 'Há 3 itens' in texto_modal, {'contagens': contagens, 'modal': texto_modal[:100]})
        pg.keyboard.press('Escape'); pg.wait_for_selector('.la-gerar-dialog', state='detached', timeout=3000)
        G.chk('16.4', 'Esc cancela e devolve o foco ao botão Gerar arquivos', pg.evaluate("document.activeElement.id") == 'go')

        pg.evaluate("() => { window.__gerarResult = null; AcessibilidadeGeracao.antesDeGerar().then(v => window.__gerarResult = v); }")
        pg.wait_for_selector('.la-gerar-dialog[open]', timeout=5000)
        pg.click('.la-gerar-dialog [data-acao="conferir"]')
        pg.wait_for_function("AcessibilidadeTexto.estado('s').painel.hidden === false", timeout=3000)
        pg.wait_for_function('window.__gerarResult === false', timeout=3000)
        G.chk('16.5', 'Conferir agora abre o editor com mais itens para corrigir', not pg.evaluate("AcessibilidadeTexto.estado('s').painel.hidden") and contagens[1] > contagens[0], contagens)
        pg.evaluate("AcessibilidadeTexto.fechar('s')")

        texto('# Título\n\n### Seção')
        pg.evaluate("AcessibilidadeTexto.analisarAgora('g')")
        pg.focus('#go')
        pg.evaluate("() => { window.__gerarResult = null; AcessibilidadeGeracao.antesDeGerar().then(v => window.__gerarResult = v); }")
        pg.wait_for_selector('.la-gerar-dialog[open]', timeout=5000)
        pg.click('.la-gerar-dialog [data-acao="gerar"]')
        pg.wait_for_function('window.__gerarResult === true', timeout=5000)
        G.chk('16.6', 'Gerar assim mesmo atravessa o guard sem cancelar a geração', pg.evaluate('window.__gerarResult === true'))

        pg.evaluate("sessionStorage.setItem('conteudista.acessibilidade.naoPerguntarAoGerar', '1')")
        r = pg.evaluate("AcessibilidadeGeracao.antesDeGerar()")
        G.chk('16.7', 'Não perguntar de novo nesta sessão é respeitado', r is True and not pg.locator('.la-gerar-dialog[open]').count())
        pg.evaluate("sessionStorage.removeItem('conteudista.acessibilidade.naoPerguntarAoGerar')")
        pg.focus('body'); pg.keyboard.press('Alt+Shift+g'); pg.wait_for_selector('.la-gerar-dialog[open]', timeout=5000)
        G.chk('16.8', 'Alt+Shift+G passa pela mesma confirmação', True)
        pg.keyboard.press('Escape')
        G.chk('16.9', 'Nenhum erro de JavaScript na confirmação ao gerar', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()


# ----------------------------------------------------------------------------- GRUPO 17 — relatório exportável (1.86)
def grupo17(amb, ctx, G):
    import jsonschema
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e) + '\n' + str(getattr(e, 'stack', ''))))
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000)
        pg.evaluate("t => { document.getElementById('g').value=t; ED.g.refresh(); }", '# Título\n\n### Seção\n\nVeja aqui.')
        report = pg.evaluate('RelatorioAcessibilidade.preparar()')
        schema = json.loads((RAIZ / 'web' / 'lib' / 'linguagem-acessivel' / 'esquema' / 'relatorio.schema.json').read_text(encoding='utf-8'))
        diagnostico = json.loads((RAIZ / 'web' / 'lib' / 'linguagem-acessivel' / 'esquema' / 'diagnostico.schema.json').read_text(encoding='utf-8'))
        schema['properties']['arquivos']['items']['properties']['diagnosticos']['items'] = diagnostico
        erro_schema = ''
        try: jsonschema.validate(report, schema)
        except Exception as e: erro_schema = str(e)
        G.chk('17.1', 'JSON do relatório valida contra relatorio.schema.json', not erro_schema, erro_schema[:300])
        G.chk('17.2', 'Relatório inclui versões, limites, regra, linha, trecho e aviso',
              report['versoes']['biblioteca'] and report['limites']['fraseLonga'] == 25 and report['arquivos'][0]['diagnosticos'][0]['linha'] == 3 and re.search(r'não substitui uma avaliação completa', report['aviso'], re.I),
              {'versoes': report['versoes'], 'limites': report['limites'], 'diagnostico': report['arquivos'][0]['diagnosticos'][0], 'aviso': report['aviso']})

        pg.evaluate("document.getElementById('btnRelatorioAcessibilidade').hidden = false")
        pg.click('#btnRelatorioAcessibilidade'); pg.wait_for_selector('.la-relatorio-dialog[open]')
        with pg.expect_download() as info:
            pg.click('.la-relatorio-dialog [data-formato="json"]')
        arquivo = Path(info.value.path())
        baixado = json.loads(arquivo.read_text(encoding='utf-8'))
        G.chk('17.3', 'Botão dos arquivos exporta JSON válido', baixado['aviso'] == report['aviso'])

        html = pg.evaluate('RelatorioAcessibilidade.html()')
        G.chk('17.4', 'Relatório HTML tem título, aviso e tabela semântica', '<h1>Relatório de acessibilidade</h1>' in html and '<caption>Itens encontrados</caption>' in html and 'scope="col"' in html)
        audit = ctx.new_page(); erros_audit = []
        audit.on('pageerror', lambda e: erros_audit.append(str(e)))
        audit.set_content(html)
        audit.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js')
        axe = audit.evaluate("async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } }); return r.violations.map(v => ({ id: v.id, help: v.help, nodes: v.nodes.map(n => n.target) })); }")
        G.chk('17.5', 'HTML do relatório passa no axe-core (WCAG 2.2 A/AA)', not axe, axe[:3])
        G.chk('17.6', 'Nenhum erro de JavaScript ao exportar o relatório', not erros and not erros_audit, erros + erros_audit)
        audit.close()
        pg.close()
    finally:
        srv.shutdown()


# ----------------------------------------------------------------------------- GRUPO 18 — configuração e glossário (1.87)
def grupo18(amb, ctx, G):
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000)
        pg.evaluate("t => { document.getElementById('g').value=t; ED.g.refresh(); }", '# Título\n\n### Seção\n')
        pg.evaluate("AcessibilidadeTexto.abrir('g')")
        pg.click('#laP-g .la-configurar'); pg.wait_for_selector('.la-cfg-dialog[open]')
        e1 = pg.locator('[data-caminho="acessibilidade_texto.regras.e1"]')
        f1 = pg.locator('[data-caminho="acessibilidade_texto.regras.f1"]')
        G.chk('18.1', 'Configuração lista as opções e limita sugestões a sugestão/desligado', e1.count() == 1 and f1.locator('option[value="corrigir"]').count() == 0)
        e1.select_option('sugestao')
        pg.click('.la-cfg-dialog [data-salvar]')
        pg.wait_for_function("AcessibilidadeTexto.resultado('g') && AcessibilidadeTexto.resultado('g').resumo.sugestoes === 1")
        G.chk('18.2', 'Rebaixar regra para sugestão persiste e atualiza o painel', pg.evaluate("localStorage.getItem('conteudista.acessibilidade.regra.e1')") == 'sugestao')

        pg.click('#laP-g .la-configurar'); pg.wait_for_selector('.la-cfg-dialog[open]')
        with pg.expect_download() as info:
            pg.click('.la-cfg-dialog [data-exportar]')
        exported = json.loads(Path(info.value.path()).read_text(encoding='utf-8'))
        G.chk('18.3', 'Exportar configuração produz JSON com versão e opções registradas', exported.get('versao') == 1 and 'acessibilidade_texto.regras.e1' in exported.get('opcoes', {}))

        salvo_antes = pg.evaluate("localStorage.getItem('conteudista.acessibilidade.relatorioZip')")
        pacote = amb.tmp / 'opcoes-importar.json'
        pacote.write_text(json.dumps({'versao': 1, 'opcoes': {'acessibilidade_texto.incluir_relatorio_no_zip': 'ligado'}}, ensure_ascii=False), encoding='utf-8')
        pg.set_input_files('.la-cfg-dialog input[type=file]', str(pacote))
        pg.wait_for_function("document.querySelector('[data-caminho=\"acessibilidade_texto.incluir_relatorio_no_zip\"]').checked")
        estado_import = pg.evaluate("({checked:document.querySelector('[data-caminho=\"acessibilidade_texto.incluir_relatorio_no_zip\"]').checked,salvo:localStorage.getItem('conteudista.acessibilidade.relatorioZip')})")
        G.chk('18.4', 'Importar configuração valida e preenche o formulário sem aplicar antes da confirmação',
              estado_import == {'checked': True, 'salvo': salvo_antes}, {'antes': salvo_antes, 'depois': estado_import})
        pg.click('.la-cfg-dialog [data-salvar]')
        G.chk('18.5', 'Aplicar configuração importada grava valores validados', pg.evaluate("localStorage.getItem('conteudista.acessibilidade.relatorioZip')") == '1')

        texto = '<!-- linguagem-acessivel: siglas QWER=Quadro do Conteúdo -->\nO QWER aprova.'
        lib_resultado = pg.evaluate("async t => { const L = await import('./lib/linguagem-acessivel/index.js'); const x = L.analisar(t, { tipo: 'apostila', nivel: 'sugestao' }); const d = x.diagnosticos.find(y => y.codigo === 's1'); return d && L.aplicar(t, d.correcoes[0]); }", texto)
        G.chk('18.6', 'Glossário do conteúdo explica sigla e mantém a prioridade do marcador', lib_resultado.endswith('O Quadro do Conteúdo (QWER) aprova.'), lib_resultado)
        G.chk('18.7', 'Nenhum erro de JavaScript em configurações e glossário', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()


# ----------------------------------------------------------------------------- GRUPO 19 — API local e OpenAPI v1
def grupo19(amb, ctx, G):
    r = rodar(['node', str(RAIZ / 'tools' / 'lac' / 'testar_api.mjs')], cwd=RAIZ)
    G.chk('19.1', 'API v1: rotas, formatos, ETag, RFC 9457, limites e CORS', r.returncode == 0, (r.stdout + r.stderr)[-600:])


# ----------------------------------------------------------------------------- GRUPO 20 — compatibilidade e movimento (1.88)
def grupo20(amb, ctx, G):
    html = next((amb.tmp / 'saida_govbr').glob('*Apresentacao*.html'), None)
    if html is None:
        destino = amb.tmp / 'saida_compatibilidade'
        gerado = rodar([sys.executable, str(GERADOR), '-', str(EXEMPLO_APRES), '--prefixo', 'Compatibilidade', '--saida', str(destino)], cwd=RAIZ)
        html = next(destino.glob('*Apresentacao*.html'), None) if gerado.returncode == 0 else None
    if html is None:
        G.chk('20.1', 'HTML de apresentação gerado para auditoria', False)
        return
    for width in (320, 390, 768, 1024, 1366, 1920):
        c = amb.novo_contexto(viewport={'width': width, 'height': 820})
        pg = c.new_page(); erros = []
        pg.route('https://cdn.jsdelivr.net/**', lambda route: route.abort())
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.goto(html.as_uri()); pg.wait_for_timeout(120)
        m = pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth,on:document.querySelectorAll('.s.on').length,skip:!!document.querySelector('a.skip[href=\"#st\"]')})")
        G.chk(f'20.1-{width}', f'Apresentação em {width}px: sem rolagem horizontal e skip link presente', m['sw'] <= m['iw'] + 1 and m['on'] == 1 and m['skip'] and not erros, {'metricas': m, 'erros': erros})
        c.close()
    c = amb.novo_contexto(viewport={'width': 390, 'height': 844})
    pg = c.new_page(); pg.route('https://cdn.jsdelivr.net/**', lambda route: route.abort()); pg.goto(html.as_uri()); pg.wait_for_timeout(100)
    pg.emulate_media(forced_colors='active', reduced_motion='reduce')
    if pg.locator('#ini0').count(): pg.click('#ini0')
    pg.evaluate("document.getElementById('a11yToggle').click()")
    mq = pg.evaluate("({forced:matchMedia('(forced-colors: active)').matches,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,dialog:document.querySelector('#a11yPanel').open})")
    G.chk('20.2', 'Painel responde a forced-colors, movimento reduzido e abre como diálogo no celular', mq == {'forced': True, 'reduced': True, 'dialog': True}, mq)
    pg.close(); c.close()

    srv, url = _servidor(RAIZ / 'web')
    try:
        app = ctx.new_page(); app.goto(url); app.wait_for_selector('#btnRelatorioAcessibilidade', timeout=15000)
        arquivos = ('acessibilidade-geracao.js', 'relatorio-acessibilidade.js', 'acessibilidade-config.js', 'vlibras.js')
        bytes_total = sum((RAIZ / 'web' / nome).stat().st_size for nome in arquivos)
        metricas = app.evaluate("nomes => performance.getEntriesByType('resource').filter(x => nomes.some(n => x.name.split('?')[0].endsWith(n))).map(x => ({arquivo:x.name.split('/').pop().split('?')[0],ms:x.duration}))", list(arquivos))
        maximo = max((x['ms'] for x in metricas), default=0)
        G.chk('20.3', 'Módulos novos somam até 200 KiB e cada recurso carrega em até 400 ms', bytes_total <= 200 * 1024 and maximo <= 400, {'bytes': bytes_total, 'duracoes': metricas})
        app.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js')
        axe_app = app.evaluate("async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } }); return r.violations.map(v => ({id:v.id,help:v.help,nodes:v.nodes.map(n=>n.target)})); }")
        conhecidos = {('#pg > .mde[data-la="1"][data-m="s"] > .mde-gal > summary',), ('#dxRes > summary',)}
        novos = [dict(id=v['id'], target=alvo) for v in axe_app for alvo in v['nodes']
             if not (v['id'] == 'nested-interactive' and tuple(alvo) in conhecidos)]
        G.chk('20.4', 'Aplicativo não adiciona violações axe-core WCAG 2.2 A/AA além do baseline documentado', not novos,
              {'novas': novos, 'baseline': axe_app})
        app.close()
    finally:
        srv.shutdown()


# ----------------------------------------------------------------------------- GRUPO 21 — acessibilidade dos arquivos gerados (1.89)
def grupo21(amb, ctx, G):
    d = amb.tmp / 'a11y-gerados'; d.mkdir(exist_ok=True)
    (d / 'apostila.md').write_text('# Guia\n\nTexto de exemplo.\n', encoding='utf-8')
    (d / 'apresentacao.md').write_text('---\ntitle: Guia\n---\n\n# Slide 1\n\nTexto do slide.\n\n<!-- notas: Narração do primeiro slide. -->\n\n---\n\n# Slide 2\n\nTexto do segundo slide.\n\n<!-- notas: Narração do segundo slide. -->\n', encoding='utf-8')
    gerador = RAIZ / 'tools' / 'gerador.py'
    audio = amb.audios if getattr(amb, 'audios', None) else amb.tmp / 'aud'
    out = d / 'com_vlibras'
    r = rodar([sys.executable, str(gerador), str(d / 'apostila.md'), str(d / 'apresentacao.md'), '--prefixo', 'A11y', '--saida', str(out), '--audios', str(audio)], cwd=RAIZ)
    apostila = next(out.glob('Apostila_A11y.html'), None) if out.exists() else None
    apresentacao = next(out.glob('Apresentacao_A11y.html'), None) if out.exists() else None
    if not apostila or not apresentacao:
        G.chk('21.1', 'Gerador cria ambos os HTML para auditoria', False, (r.stderr or r.stdout)[-300:]); return
    ag = apostila.read_text(encoding='utf-8'); sl = apresentacao.read_text(encoding='utf-8')
    G.chk('21.1', 'Apostila tem skip link, painel acessível e VLibras sob demanda', 'href="#conteudo"' in ag and 'id="a11yPanel"' in ag and 'data-a11y="vlibras"' in ag and 'src="https://vlibras.gov.br/app/vlibras-plugin.js"' not in ag)
    G.chk('21.2', 'Slides têm skip link, painel lateral e legendas baseadas nas notas', 'href="#st"' in sl and 'id="a11yPanel"' in sl and 'Narração do primeiro slide.' in sl and 'class="a11y-caption"' in sl)

    sem = d / 'sem_vlibras'
    r = rodar([sys.executable, str(gerador), str(d / 'apostila.md'), str(d / 'apresentacao.md'), '--prefixo', 'A11y', '--saida', str(sem), '--sem-vlibras'], cwd=RAIZ)
    ag_sem = next(sem.glob('Apostila_A11y.html')).read_text(encoding='utf-8') if sem.exists() else ''
    sl_sem = next(sem.glob('Apresentacao_A11y.html')).read_text(encoding='utf-8') if sem.exists() else ''
    G.chk('21.3', 'Opção desligada remove VLibras da apostila e apresentação', r.returncode == 0 and 'data-a11y="vlibras"' not in ag_sem and 'data-a11y="vlibras"' not in sl_sem)

    repetida = d / 'repetida'; repetida.mkdir(exist_ok=True)
    (repetida / 'g.md').write_text('# Guia\n\n<!-- linguagem-acessivel: decorativa -->\n![Logo](' + PNG_1PX + ')\n\n![Logo](' + PNG_1PX + ')\n', encoding='utf-8')
    (repetida / 's.md').write_text('---\ntitle: Guia\n---\n\n# Slide 1\n\n<!-- linguagem-acessivel: decorativa -->\n![Logo](' + PNG_1PX + ')\n\n![Logo](' + PNG_1PX + ')\n', encoding='utf-8')
    repetida_out = repetida / 'out'
    r = rodar([sys.executable, str(gerador), str(repetida / 'g.md'), str(repetida / 's.md'), '--prefixo', 'D', '--saida', str(repetida_out)], cwd=RAIZ)
    html_rep = next(repetida_out.glob('Apostila_D.html')).read_text(encoding='utf-8') if repetida_out.exists() else ''
    alts_html = re.findall(r'<img[^>]+alt="([^"]*)"', html_rep)
    epub_xml = ''
    try:
        with zipfile.ZipFile(repetida_out / 'Apostila_D.epub') as z: epub_xml = ''.join(z.read(n).decode('utf-8', 'ignore') for n in z.namelist() if n.endswith('.xhtml'))
    except Exception: pass
    alts_epub = re.findall(r'<img[^>]+alt="([^"]*)"', epub_xml)
    docx_xml = ''
    try:
        with zipfile.ZipFile(repetida_out / 'Apostila_D.docx') as z: docx_xml = z.read('word/document.xml').decode('utf-8', 'ignore')
    except Exception: pass
    alts_docx = re.findall(r'<wp:docPr[^>]+descr="([^"]*)"', docx_xml)
    pptx_xml = ''
    try:
        with zipfile.ZipFile(repetida_out / 'Apresentacao_D.pptx') as z: pptx_xml = ''.join(z.read(n).decode('utf-8', 'ignore') for n in z.namelist() if n.startswith('ppt/slides/slide'))
    except Exception: pass
    G.chk('21.4', 'Mesma URL: HTML, EPUB e DOCX mantêm alt vazio só na ocorrência decorativa',
          r.returncode == 0 and alts_html[:2] == ['', 'Logo'] and alts_epub[:2] == ['', 'Logo'] and alts_docx[:2] == ['', 'Logo'],
          {'html': alts_html[:2], 'epub': alts_epub[:2], 'docx': alts_docx[:2]})
    descrs = re.findall(r'<p:cNvPr[^>]+descr="([^"]*)"', pptx_xml)
    G.chk('21.5', 'Mesma URL no PPTX: só a ocorrência marcada fica decorativa', pptx_xml.count('adec:decorative') == 1 and descrs[:2] == ['', 'Logo'], {'decorativas': pptx_xml.count('adec:decorative'), 'descr': descrs[:2]})

    c = amb.novo_contexto(viewport={'width': 390, 'height': 844})
    pg = c.new_page(); erros = []; requisicoes = []
    pg.on('pageerror', lambda e: erros.append(str(e)))
    pg.on('request', lambda q: requisicoes.append(q.url) if 'vlibras.gov.br/app/vlibras-plugin.js' in q.url else None)
    pg.goto(apresentacao.as_uri()); pg.wait_for_timeout(250); pg.click('#ini0')
    leg = pg.evaluate("({ativada:document.documentElement.classList.contains('a11y-legendas-on'),visivel:getComputedStyle(document.querySelector('.s.on .a11y-caption')).display !== 'none'})")
    pg.click('#a11yToggle'); pg.wait_for_selector('#a11yPanel[open]')
    painel = pg.evaluate("({modal:document.querySelector('#a11yPanel').open,baixo:document.querySelector('#a11yPanel').getBoundingClientRect().bottom >= innerHeight-1,espacamento:!!document.querySelector('[data-a11y=\"espacamento\"]'),barra:!!document.querySelector('[data-a11y=\"barra\"]')})")
    G.chk('21.6', 'Legendas ligadas por padrão e painel vira folha inferior no celular', leg['ativada'] and leg['visivel'] and painel['modal'] and painel['baixo'] and painel['espacamento'] and painel['barra'], {'legendas': leg, 'painel': painel})
    G.chk('21.7', 'VLibras não faz requisição antes do clique explícito', not requisicoes, requisicoes)
    G.chk('21.8', 'Nenhum erro de JavaScript no painel gerado', not erros, erros)
    pg.click('#a11yPanel [data-a11y="fechar"]')
    pg.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js')
    violacoes = pg.evaluate("async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } }); return r.violations.map(v => ({id:v.id,help:v.help,nodes:v.nodes.map(n=>n.target)})); }")
    G.chk('21.9', 'Apresentação HTML gerada passa no axe-core (WCAG 2.2 A/AA)', not violacoes, violacoes[:3])
    pg.close(); c.close()

    srv, url = _servidor(RAIZ / 'web')
    try:
        app = ctx.new_page(); requisicoes_app = []
        app.on('request', lambda q: requisicoes_app.append(q.url) if 'vlibras.gov.br/app/vlibras-plugin.js' in q.url else None)
        app.goto(url); app.wait_for_selector('#btnVlibras'); app.wait_for_timeout(250)
        G.chk('21.10', 'Aplicativo mantém o skip link e não carrega VLibras até solicitação',
              app.locator('.br-skiplink[href="#conteudo"]').count() == 1 and app.locator('#btnVlibras').get_attribute('aria-controls') == 'vlibrasWidget' and app.locator('#vlibrasWidget').count() == 1 and not requisicoes_app,
              requisicoes_app)
        app.close()
    finally:
        srv.shutdown()


# navegador escolhido -> motor do Playwright (chrome e msedge usam o programa instalado no computador)
MOTOR = {'chrome': 'chromium', 'msedge': 'chromium', 'chromium': 'chromium', 'firefox': 'firefox', 'webkit': 'webkit'}

GRUPOS = {
    '1': ('Pausa respeitada', grupo1, 'desktop'),
    '2': ('Próximo no último slide', grupo2, 'desktop'),
    '3': ('Navegação rápida', grupo3, 'desktop'),
    '4': ('Modo leitura e tela cheia (1.75)', grupo4, 'desktop'),
    '5': ('Versão e documentação', grupo5, 'estatico'),
    '6': ('Geração dos arquivos e layout', grupo6, 'estatico'),
    '7': ('Celular (emulação de toque)', grupo7, 'movel'),
    '8': ('Opções padrão (opcoes.yaml)', grupo8, 'desktop'),
    '9': ('Celular: editor e Importar (1.79)', grupo9, 'movel'),
    '10': ('Zoom nos arquivos gerados (1.79)', grupo10, 'desktop'),
    '11': ('Biblioteca Linguagem Acessível no navegador', grupo11, 'desktop'),
    '12': ('Painel Acessibilidade do texto (1.80)', grupo12, 'desktop'),
    '13': ('Marcas no texto e balão (1.81)', grupo13, 'desktop'),
    '14': ('Janelas de apoio e imagens decorativas (1.82)', grupo14, 'desktop'),
    '15': ('Conteúdo acessível desde a criação (1.83)', grupo15, 'desktop'),
    '16': ('Conferência ao gerar (1.85)', grupo16, 'desktop'),
    '17': ('Relatório de acessibilidade (1.86)', grupo17, 'desktop'),
    '18': ('Configuração e glossário por conteúdo (1.87)', grupo18, 'desktop'),
    '19': ('API local e OpenAPI v1', grupo19, 'estatico'),
    '20': ('Compatibilidade, viewport e preferências do sistema (1.88)', grupo20, 'desktop'),
    '21': ('Acessibilidade dos arquivos gerados (1.89)', grupo21, 'desktop'),
}

MANUAIS = [
    ('M.1', 'iPhone/Safari de verdade: o áudio automático após trocar de slide não é bloqueado (botão não pode ficar em Pausar sem som)'),
    ('M.2', 'Android de verdade (Chrome): gesto de deslizar e toque na barra com o dedo, em retrato e paisagem'),
    ('M.3', 'PPTX no PowerPoint: o áudio de cada slide inicia sozinho e, com avanço automático, o slide passa ao fim do áudio'),
    ('M.4', 'Imprimir/PDF: a janela de impressão abre sem ativar o Modo leitura sozinha'),
    ('M.5', 'Ouvir a voz real (Kokoro/Piper) pausar e retomar no mesmo ponto, sem estalos'),
]


# ----------------------------------------------------------------------------- execução
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--grupos', default='1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21', help='lista de grupos (ex.: 1,2,5)')
    ap.add_argument('--navegador', default='chrome', choices=list(MOTOR), help='padrão: chrome (Google Chrome instalado)')
    ap.add_argument('--saida', default=str(Path(__file__).parent / 'relatorio'), help='pasta do relatório')
    ap.add_argument('--tentativas', type=int, default=2, help='repete o grupo com falha até N vezes (passou na repetição = INSTAVEL)')
    ap.add_argument('--executavel', default=None, help='caminho de um Chrome/Chromium já instalado (opcional)')
    ap.add_argument('--canal', default=None, choices=['chrome', 'msedge'], help='(compatibilidade) equivale a --navegador chrome|msedge')
    ap.add_argument('--gerador', default=None, help='usa outro gerador.py (para comparar versões ou provar que o teste detecta uma regressão)')
    ap.add_argument('--com-cabeca', action='store_true', help='mostra a janela do navegador')
    args = ap.parse_args()

    if args.canal:
        args.navegador = args.canal
    global GERADOR
    if args.gerador:
        GERADOR = Path(args.gerador).resolve()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('ERRO: instale com  pip install -r tools/testes/requirements.txt')
        return 2

    saida = Path(args.saida); saida.mkdir(parents=True, exist_ok=True)
    rel = Relatorio()
    t_ini = time.time()
    with tempfile.TemporaryDirectory(prefix='conteudista-testes-') as tmp, sync_playwright() as p:
        amb = Ambiente(tmp, args)
        print(f'Conteudista · testes de navegador · {args.navegador} · {datetime.now():%d/%m/%Y %H:%M}')
        print('Gerando apresentações de teste…')
        try:
            amb.gerar_apresentacoes()
        except Exception as ex:
            print('ERRO ao gerar os arquivos de teste:', ex)
            return 2
        motor = MOTOR[args.navegador]
        tipo = getattr(p, motor)
        kw = {'headless': not args.com_cabeca}
        if motor == 'chromium':
            kw['args'] = ['--autoplay-policy=no-user-gesture-required']
            if os.environ.get('CI') or (hasattr(os, 'geteuid') and os.geteuid() == 0):
                kw['args'].append('--no-sandbox')
            if args.executavel:
                kw['executable_path'] = args.executavel
            elif args.navegador in ('chrome', 'msedge'):
                kw['channel'] = args.navegador
        elif motor == 'firefox':
            kw['firefox_user_prefs'] = {'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0}
        try:
            nav = tipo.launch(**kw)
        except Exception as ex:
            dica = 'Instale o Google Chrome (https://www.google.com/chrome) ou rode: playwright install chrome' if args.navegador == 'chrome' else f'Rode: playwright install {args.navegador}'
            print(f'ERRO ao abrir o {args.navegador}: {ex}\n{dica}')
            return 2

        ver_nav = f'{args.navegador} {nav.version}'
        print(f'Navegador: {ver_nav}')

        def novo_contexto(viewport=None, touch=False, movel=False):
            if movel and motor == 'chromium' and 'Pixel 7' in p.devices:
                d = dict(p.devices['Pixel 7'])
                return nav.new_context(**d)
            return nav.new_context(viewport=viewport or {'width': 1280, 'height': 720}, has_touch=touch)
        amb.novo_contexto = novo_contexto

        for gid in [g.strip() for g in args.grupos.split(',') if g.strip()]:
            if gid not in GRUPOS:
                continue
            titulo, fn, perfil = GRUPOS[gid]
            print(f'\nGrupo {gid} — {titulo}')
            anterior = None
            max_t = 1 if perfil == 'estatico' else max(1, args.tentativas)
            for tent in range(1, max_t + 1):
                G = Grupo(gid)
                ctx = None
                try:
                    ctx = novo_contexto(movel=True) if perfil == 'movel' else (novo_contexto() if perfil == 'desktop' else None)
                    fn(amb, ctx, G)
                except Exception as ex:
                    G.itens.append((f'{gid}.!', 'Execução do grupo interrompida', 'ERRO', f'{type(ex).__name__}: {ex}'.splitlines()[0][:300]))
                    try:
                        for pg in (ctx.pages if ctx else []):
                            pg.screenshot(path=str(saida / f'erro-grupo{gid}.png'))
                            break
                    except Exception:
                        pass
                finally:
                    try:
                        if ctx: ctx.close()
                    except Exception:
                        pass
                if not G.tem_falha() or tent >= max_t:
                    break
                anterior = G
                print(f'  … falha na tentativa {tent}; repetindo o grupo {gid}')
            ja_falhou = {(i) for i, _, s, _ in (anterior.itens if anterior else []) if s in ('FALHA', 'ERRO')}
            for id, tit, st, det in G.itens:
                if st == 'OK' and id in ja_falhou:
                    st, det = 'INSTAVEL', 'falhou na 1ª tentativa e passou na repetição'
                rel.add(id, tit, st, det, gid)
        nav.close()

        print('\nPendências manuais (não automatizáveis aqui):')
        for id, tit in MANUAIS:
            rel.add(id, tit, 'MANUAL', '', 'M')

    dur = time.time() - t_ini
    cont = {k: sum(1 for i in rel.itens if i['status'] == k) for k in ('OK', 'FALHA', 'ERRO', 'INSTAVEL', 'AVISO', 'PULADO', 'MANUAL')}
    versao = (re.search(r"const VERSAO = '([\d.]+)'", (RAIZ / 'web' / 'changelog.js').read_text(encoding='utf-8')) or [0, '?'])[1]
    (saida / 'relatorio.json').write_text(json.dumps({'versao': versao, 'navegador': args.navegador, 'versao_navegador': ver_nav, 'data': datetime.now().isoformat(timespec='seconds'), 'duracao_s': round(dur, 1), 'resumo': cont, 'itens': rel.itens}, ensure_ascii=False, indent=1), encoding='utf-8')
    sim = {'OK': '✅', 'FALHA': '❌', 'ERRO': '❌', 'INSTAVEL': '⚠️', 'AVISO': '⚠️', 'MANUAL': '☐', 'PULADO': '➖'}
    linhas = [f'# Conteudista {versao} — relatório de testes de navegador', '',
              f'{datetime.now():%d/%m/%Y %H:%M} · {ver_nav} · {dur:.0f} s', '',
              f"**{cont['OK']} ok · {cont['FALHA'] + cont['ERRO']} falha(s) · {cont['INSTAVEL']} instável(is) · {cont['AVISO']} aviso(s) · {cont['PULADO']} pulado(s) · {cont['MANUAL']} manual(is)**", '',
              '| Caso | Verificação | Resultado | Detalhe |', '|---|---|---|---|']
    for i in rel.itens:
        det = i['detalhe'].replace('|', '\\|').replace('\n', ' ')
        linhas.append(f"| {i['id']} | {i['titulo']} | {sim.get(i['status'], '?')} {i['status']} | {det} |")
    (saida / 'relatorio.md').write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    print(f"\nRESULTADO: {cont['OK']} ok, {cont['FALHA'] + cont['ERRO']} falha(s), {cont['INSTAVEL']} instável(is), {cont['AVISO']} aviso(s), {cont['PULADO']} pulado(s) — {dur:.0f} s · relatório: {saida / 'relatorio.md'}")
    return 1 if rel.falhou() else 0


if __name__ == '__main__':
    sys.exit(main())
