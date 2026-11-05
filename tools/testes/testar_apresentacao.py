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
        pg.on('pageerror', lambda e: erros.append(str(e)))
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
    ap.add_argument('--grupos', default='1,2,3,4,5,6,7,8', help='lista de grupos (ex.: 1,2,5)')
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
