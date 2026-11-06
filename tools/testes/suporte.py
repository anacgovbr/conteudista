import argparse, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path

CASOS_EDITOR = json.loads((Path(__file__).parent / "casos" / "editor.json").read_text(encoding="utf-8"))

ENV_UTF8 = dict(os.environ, PYTHONUTF8='1', PYTHONIOENCODING='utf-8')

def rodar(cmd, **kw):
    """subprocess.run com saída capturada, UTF-8 garantido (inclusive no Windows)."""
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', env=ENV_UTF8, **kw)

RAIZ = Path(__file__).resolve().parents[2]

GERADOR = RAIZ / 'tools' / 'gerador.py'

EXEMPLO_TREINO = RAIZ / 'web' / 'exemplo' / 'treinamento.md'

EXEMPLO_APRES = RAIZ / 'web' / 'exemplo' / 'apresentacao.md'

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

def deslizar(ctx, pg, x0, y0, x1, y1, passos=6):
    cdp = ctx.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
    for k in range(1, passos + 1):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * k / passos, 'y': y0 + (y1 - y0) * k / passos}]})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

RECT_B2 = """(()=>{const b=document.querySelector('#b2');if(!b)return null;const r=b.getBoundingClientRect(),c=getComputedStyle(b);
 return {dir:Math.round(innerWidth-r.right),topo:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),pos:c.position,vis:c.visibility,disp:c.display,
 fs:!!document.fullscreenElement,pressed:b.getAttribute('aria-pressed')}})()"""

def _servidor(pasta):
    """Serve uma cópia de web/ por HTTP (o YAML é lido por requisição; arquivo local não serve)."""
    import functools, http.server, threading
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=str(pasta)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}/index.html'

TEXTO_A11Y = CASOS_EDITOR["TEXTO_A11Y"]

def _editor_com_texto(pg, url):
    pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
    pg.keyboard.press('Escape')
    pg.evaluate("t => { document.getElementById('g').value = t; ED.g.refresh(); }", TEXTO_A11Y)
    pg.wait_for_function("document.querySelector('#pg .la-btn').getAttribute('aria-label').includes('4 itens')", timeout=8000)

TEXTO_MARCAS = CASOS_EDITOR["TEXTO_MARCAS"]

ALINHAMENTO_JS = """() => { const ta = ED.g.textarea, c = document.querySelector('#pg .la-camada'), cs = getComputedStyle(ta), r = [];
  for (const sp of c.querySelectorAll('.la-m')) { const d = AcessibilidadeTexto.resultado('g').diagnosticos[+sp.dataset.i];
    const m = document.createElement('div'); ['fontFamily','fontSize','lineHeight','paddingTop','paddingLeft','paddingRight','letterSpacing','tabSize','wordSpacing'].forEach(k => m.style[k] = cs[k]);
    Object.assign(m.style, { position: 'absolute', top: '0', left: '-9999px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', boxSizing: 'border-box', width: ta.clientWidth + 'px' });
    m.textContent = ta.value.slice(0, d.inicio); const s = document.createElement('span'); s.textContent = 'x'; m.appendChild(s); document.body.appendChild(m);
    r.push(Math.abs(sp.offsetTop - s.offsetTop) + Math.abs(sp.offsetLeft - s.offsetLeft)); m.remove(); }
  return { n: r.length, max: Math.max(0, ...r), larg: [ta.clientWidth, c.clientWidth], alt: [ta.scrollHeight, c.scrollHeight] }; }"""

BALAO_ABERTO = "(() => { const b = document.querySelector('.la-balao'); return !!b && !b.hidden; })()"

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

PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

TEXTO_JANELAS = CASOS_EDITOR["TEXTO_JANELAS"]

MOTOR = {'chrome': 'chromium', 'msedge': 'chromium', 'chromium': 'chromium', 'firefox': 'firefox', 'webkit': 'webkit'}
