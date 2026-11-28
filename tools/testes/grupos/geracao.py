import argparse, base64, hashlib, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path
import suporte
from suporte import (
    EXEMPLO_APRES, EXEMPLO_TREINO, RAIZ, _servidor, rodar
)

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
    q = dict(re.findall(r'([\w.-]+\.js)\?v=([\d.]+)', idx))
    G.chk('5.2c', 'Todos os scripts com ?v= em index.html usam o cache-buster da versão atual', bool(q) and all(v == ver for v in q.values()), f'esperado {ver}: { {k: v for k, v in q.items() if v != ver} }')
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
    G.chk('5.8', 'Catálogo dos temas embutidos igual no gerador e no editor',
          json.loads(ler('tools/conteudo/recursos/temas/padroes.json')) == json.loads(ler('web/config/temas.json')))

def _relay_falso():
    "Relay local no formato do ntfy (POST /topico, GET /topico/sse), s\u00f3 para o teste do controle remoto."
    import queue, threading
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    topicos, gravado = {}, []
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass
        def _cors(self): self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*')
        def do_OPTIONS(self): self.send_response(200); self._cors(); self.end_headers()
        def do_POST(self):
            corpo = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8'); gravado.append(corpo)
            for q in list(topicos.get(self.path.strip('/'), [])): q.put(corpo)
            self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'{}')
        def do_GET(self):
            nome = self.path.strip('/').rsplit('/sse', 1)[0]; q = queue.Queue(); topicos.setdefault(nome, []).append(q)
            self.send_response(200); self._cors(); self.send_header('Content-Type', 'text/event-stream'); self.end_headers()
            try:
                self.wfile.write(b'event: open\ndata: {"event":"open"}\n\n'); self.wfile.flush()
                while True:
                    try: m = q.get(timeout=10)
                    except queue.Empty: self.wfile.write(b'event: keepalive\ndata: {}\n\n'); self.wfile.flush(); continue
                    self.wfile.write(('data: ' + json.dumps({'event': 'message', 'message': m}) + '\n\n').encode('utf-8')); self.wfile.flush()
            except Exception: pass
            finally: topicos[nome].remove(q)
    srv = ThreadingHTTPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, gravado

def grupo6(amb, ctx, G):
    sha = lambda b: hashlib.sha256(b).hexdigest()
    for tema in ('govbr', 'classico'):
        d = amb.tmp / f'saida_{tema}'
        r = rodar([sys.executable, str(suporte.GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Exemplo', '--rodape', 'Teste', '--saida', str(d), '--tema', tema], cwd=RAIZ)
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
    # Destaques com rótulo em texto (Informação, Dica, Atenção) em HTML, EPUB, DOCX e PPTX, para a cor e o símbolo não serem o único sinal.
    dm = amb.tmp / 'destaques.md'; ds = amb.tmp / 'destaques-slides.md'
    dm.write_text('# Destaques\n\n> [!TIP]\n> Dica de teste.\n\n> [!WARNING]\n> Atenção de teste.\n\n> [!INFO]\n> Informação de teste.\n\n> [!TIP] **Dica:** já escrita.\n', encoding='utf-8')
    ds.write_text('# Slide\n\n> [!TIP]\n> Dica no slide.\n\n> [!WARNING]\n> Atenção no slide.\n', encoding='utf-8')
    dd = amb.tmp / 'saida_destaques'
    r = rodar([sys.executable, str(suporte.GERADOR), str(dm), str(ds), '--prefixo', 'Destaques', '--saida', str(dd), '--tema', 'govbr'], cwd=RAIZ)
    def _texto_zip(p, nome):
        with zipfile.ZipFile(p) as z: return z.read(nome).decode('utf-8')
    html_g = next(dd.glob('Apostila_*.html'), None); html_s = next(dd.glob('Apresentacao_*.html'), None)
    epub = next(dd.glob('Apostila_*.epub'), None); docx = next(dd.glob('Apostila_*.docx'), None); pptx = next(dd.glob('Apresentacao_*.pptx'), None)
    det = {}
    if r.returncode == 0 and all(x is not None for x in (html_g, html_s, epub, docx, pptx)):
        with zipfile.ZipFile(epub) as z: ep = ''.join(z.read(n).decode('utf-8') for n in z.namelist() if n.endswith('.xhtml'))
        hg = html_g.read_text(encoding='utf-8'); hs = html_s.read_text(encoding='utf-8')
        dx = _texto_zip(docx, 'word/document.xml'); px = _texto_zip(pptx, 'ppt/slides/slide1.xml')
        det = {'html': 'q-ico' in hg and 'Dica:</strong> ' in hg and 'Atenção:</strong> ' in hg and 'Informação:</strong> ' in hg and hg.count('Dica:') == 2 and 'q-ico" aria-hidden' not in hg,
               'slides': 'q-ico' in hs and 'Dica:</strong> ' in hs, 'epub': 'q-ico' in ep and 'Informação:</strong> ' in ep,
               'docx': '>Dica:<' in dx and '>Atenção:<' in dx and '>Informação:<' in dx and ' Dica de teste.' in dx,
               'pptx': '>Dica:<' in px and '>Atenção:<' in px and ' Dica no slide.' in px}
    G.chk('6.7', 'Destaques: rótulo em texto (Informação, Dica, Atenção) em HTML, EPUB, DOCX e PPTX, sem repetir quando o texto já traz o rótulo',
          bool(det) and all(det.values()), det or (r.stderr or r.stdout)[-300:])
    # Fluxos Mermaid: vermelho e verde nas cores dos nós viram erro e apoio do tema, com texto legível.
    mm = amb.tmp / 'fluxo-cores.md'
    mm.write_text('# Fluxo\n\n```mermaid\nflowchart LR\nA[Concluído] --> B[Falhou]\nstyle A fill:#00aa00,color:#ffffff\nstyle B fill:#ff0000\n```\n', encoding='utf-8')
    dm = amb.tmp / 'saida_mermaid'
    r = rodar([sys.executable, str(suporte.GERADOR), str(mm), str(mm), '--prefixo', 'Fluxo', '--saida', str(dm), '--tema', 'govbr'], cwd=RAIZ)
    pagina = next(dm.glob('Apostila_Fluxo.html'), None)
    bloco, det = '', {}
    if r.returncode == 0 and pagina is not None:
        import html as _html
        achado = re.search(r'<pre class="mermaid">(.*?)</pre>', pagina.read_text(encoding='utf-8'), re.S)
        bloco = _html.unescape(achado.group(1)) if achado else ''
        sys.path.insert(0, str(RAIZ))
        from tools.conteudo.mermaid import pior_diferenca
        fills = re.findall(r'fill:(#[0-9a-fA-F]{6})', bloco)
        det = {'dois_preenchimentos': len(fills) == 2,
               'sem_cores_originais': '#00aa00' not in bloco.lower() and '#ff0000' not in bloco.lower(),
               'texto_legivel': 'color:' in bloco,
               'distintos_no_daltonismo': len(fills) == 2 and pior_diferenca(fills[0], fills[1]) >= 12}
    G.chk('6.8', 'Fluxos Mermaid: vermelho e verde viram erro e apoio do tema, distintos no daltonismo',
          bool(det) and all(det.values()), det or (r.stderr or r.stdout)[-300:])
    # Contraste do texto também com cor de 3 dígitos (#ddd) e com espaço depois dos dois pontos.
    sys.path.insert(0, str(RAIZ))
    from tools.conteudo.mermaid import contraste, corrigir as corrigir_mm
    saida_mm, _ = corrigir_mm('flowchart LR\nA --> B\nstyle A fill:#ddd,color:#eee\nstyle B fill: #fff', {})
    cores_mm = re.findall(r'fill:\s*(#[0-9a-f]{6})(?:,color:(#[0-9a-f]{6}))?', saida_mm)
    G.chk('6.9', 'Fluxos Mermaid: texto com 4,5:1 mesmo com cor de 3 dígitos ou espaço após fill:',
          len(cores_mm) == 2 and all(t and contraste(f, t) >= 4.5 for f, t in cores_mm), saida_mm)
    # Links: só relativo, #, http(s) e mailto; javascript: vira texto sem link (apostila HTML e EPUB).
    from tools.conteudo.html_saida import treinamento_html
    from tools.conteudo.epub import _ep_inl, _EpubCtx
    md_lk = '# T\n\n[ruim](javascript:alert(1)) [mau](JaVa\x01Script:x) [dado](data:text/html,x) [bom](https://a.b/) [ancora](#t)\n'
    h_lk = treinamento_html(md_lk, '')
    e_lk = _ep_inl('[ruim](javascript:alert(1)) [bom](https://a.b/)', _EpubCtx())
    G.chk('6.10', 'Links perigosos (javascript:, data:) não viram href no HTML nem no EPUB; http(s) e # continuam',
          not re.search(r'(?i)href="(javascript|data|java)', h_lk + e_lk) and 'href="https://a.b/"' in h_lk and 'href="#t"' in h_lk and 'href="https://a.b/"' in e_lk, h_lk[h_lk.find('<article'):][:300])
    lic = amb.tmp / 'saida_licenciada'
    r = rodar([sys.executable, str(suporte.GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Licenca', '--saida', str(lic), '--tema', 'govbr', '--licenca', 'cc-by-4.0'], cwd=RAIZ)
    md_g = lic / 'Apostila_Licenca.md'; md_s = lic / 'Apresentacao_Licenca.md'
    html_g = lic / 'Apostila_Licenca.html'; html_s = lic / 'Apresentacao_Licenca.html'
    conteudo_g = html_g.read_text(encoding='utf-8') if html_g.exists() else ''
    conteudo_s = html_s.read_text(encoding='utf-8') if html_s.exists() else ''
    G.chk('6.4', 'CC BY: CLI gera o aviso final da Apostila e um slide final com URL oficial',
          r.returncode == 0 and md_g.exists() and md_s.exists() and conteudo_g.count('class="licenciamento"') == 1
          and conteudo_g.index('class="licenciamento"') < conteudo_g.index('</article>')
          and conteudo_s.count('aria-label="Slide 41 de 41"') == 1
          and 'https://creativecommons.org/licenses/by/4.0/' in conteudo_s
          and (lic / 'Apostila_Licenca.docx').exists() and (lic / 'Apostila_Licenca.epub').exists()
          and (lic / 'Apresentacao_Licenca.pptx').exists(), (r.stderr or r.stdout)[-300:])
    r = rodar([sys.executable, str(RAIZ / 'tools' / 'testar_acessibilidade.py'), str(lic), '--prefixo', 'Licenca'], cwd=RAIZ)
    G.chk('6.5', 'CC BY: DOCX, EPUB, PPTX e HTML mantêm as verificações de acessibilidade', r.returncode == 0,
          ' '.join((r.stderr or r.stdout).strip().splitlines()[-2:])[:350])
    c = amb.novo_contexto(viewport={'width': 1280, 'height': 720})
    pg_lic = c.new_page(); erros_lic = []
    pg_lic.on('pageerror', lambda e: erros_lic.append(str(e)))
    pg_lic.goto(html_s.as_uri()); pg_lic.wait_for_timeout(500)
    total = pg_lic.locator('.s').count()
    for _ in range(total - 2): pg_lic.click('#n')  # a licença é a penúltima; o slide final vem depois
    final = pg_lic.evaluate("() => { const s = document.querySelector('.s.on'); const a = s && s.querySelector('a[rel=license]'); const r = s && s.getBoundingClientRect(); return { nome: s && s.getAttribute('aria-label'), url: a && a.href, largura: r && r.width, altura: r && r.height, visivel: !!s && getComputedStyle(s).display !== 'none' }; }")
    G.chk('6.6', 'CC BY: o último slide é acessível, visível e navegável no Chrome', total > 1 and final['nome'] == 'Slide %d de %d' % (total - 1, total) and final['url'] == 'https://creativecommons.org/licenses/by/4.0/' and final['largura'] > 0 and final['altura'] > 0 and final['visivel'] and not erros_lic, final)
    c.close()
    anac_saidas = {}
    for tema_a in ('anac20-claro', 'anac20-escuro'):
        da = amb.tmp / f'saida_{tema_a}'
        rodar([sys.executable, str(suporte.GERADOR), '-', str(EXEMPLO_APRES), '--prefixo', 'A', '--saida', str(da), '--tema', tema_a, '--licenca', 'cc-by-4.0'], cwd=RAIZ)
        anac_saidas[tema_a] = da
        ha = next(da.glob('Apresentacao_A.html'), None)
        secs = re.findall(r'<section class="s ([^"]*)"[^>]*aria-label="([^"]*)"[^>]*>(.*?)</section>', ha.read_text(encoding='utf-8'), re.S) if ha else []
        corpo_final = re.search(r'<div class="conteudo">(.*?)</div></div>', secs[-1][2], re.S) if secs else None
        G.chk(f'6.11-{tema_a}', f'{tema_a}: licen\u00e7a penúltima e slide final sem texto',
              len(secs) > 2 and 'licenciamento' in secs[-2][0] and 'licenciamento' not in secs[-1][0]
              and secs[-1][1] == f'Slide {len(secs)} de {len(secs)}' and corpo_final is not None and not corpo_final.group(1).strip(), [s[:2] for s in secs[-3:]])
    # tabelas dos temas ANAC: mesmo comportamento do govbr (cabeçalho legível e dentro da margem do slide)
    ta = amb.tmp / 'tabelas_anac'; ta.mkdir(exist_ok=True)
    (ta / 's.md').write_text('# Capa\n\n---\n\n# Tabela\n\n| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |\n\n---\n\n# Fim\n', encoding='utf-8')
    for tema_t in ('govbr', 'anac20-claro', 'anac20-escuro'):
        rodar([sys.executable, str(suporte.GERADOR), '-', str(ta / 's.md'), '--prefixo', 'T', '--saida', str(ta / tema_t), '--tema', tema_t], cwd=RAIZ)
        c = amb.novo_contexto(viewport={'width': 1280, 'height': 720}); pg_t = c.new_page()
        pg_t.goto((ta / tema_t / 'Apresentacao_T.html').as_uri()); pg_t.wait_for_timeout(400); pg_t.click('#n'); pg_t.wait_for_timeout(300)
        m = pg_t.evaluate("""() => { const rgb = x => x.match(/\\d+/g).slice(0, 3).map(Number), lum = v => { const f = rgb(v).map(n => { n /= 255; return n <= .03928 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
            const th = getComputedStyle(document.querySelector('.s.on th')), a = lum(th.color), b = lum(th.backgroundColor), i = (s => ({ right: s.right - 60 * s.width / 1280 }))(document.querySelector('.s.on').getBoundingClientRect()), r = document.querySelector('.s.on table').getBoundingClientRect(), h = document.querySelector('.s.on h1').getBoundingClientRect();
            return { contraste: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), foraDireita: Math.round(r.right - i.right), h1Direita: Math.round(h.right - i.right) }; }""")
        G.chk(f'6.12-{tema_t}', f'Tabela {tema_t}: cabeçalho com contraste mínimo de 4,5:1 e dentro da margem do slide', m['contraste'] >= 4.5 and m['foraDireita'] <= 1 and m['h1Direita'] <= 1, m)
        c.close()
    # Matriz de tabelas: geometria, overflow e zoom iguais ao GOVBR em desktop/celular.
    mt = amb.tmp / 'matriz_tabelas'; mt.mkdir(exist_ok=True)
    img = mt / 'pixel.png'; img.write_bytes((RAIZ / 'tools' / 'temas' / 'anac20-claro' / 'conteudo-a.png').read_bytes())
    longo = 'Texto longo para verificar quebra automática e largura da tabela. ' * 8
    casos = [
        ('simples', '| Código | Descrição | Estado |\n|---|---|---|\n| A1 | Item simples | Ativo |'),
        ('larga', '| Identificador | Descrição | Responsável | Prazo | Situação |\n|---|---|---|---|---|\n| 001 | %s | Equipe | 30/11 | Análise |' % longo),
        ('imagem', '| Ícone | Descrição | Estado |\n|---|---|---|\n| ![pixel](pixel.png) | Imagem na célula | Ativo |'),
        ('texto-longo', '| Campo | Conteúdo |\n|---|---|\n| Texto | %s |' % (longo * 2)),
        ('muitas-colunas', '|' + '|'.join(f'C{i}' for i in range(1, 15)) + '|\n|' + '|'.join(['---'] * 14) + '|\n|' + '|'.join(str(i) for i in range(1, 15)) + '|'),
    ]
    md_m = '# Capa\n\n---\n\n' + '\n\n---\n\n'.join('# %s\n\n%s' % x for x in casos) + '\n\n---\n\n# Encerramento\n'
    (mt / 'slides.md').write_text(md_m, encoding='utf-8')
    refs = {}
    for tema_m in ('govbr', 'anac20-claro', 'anac20-escuro'):
        dm = mt / tema_m
        r = rodar([sys.executable, str(suporte.GERADOR), '-', str(mt / 'slides.md'), '--prefixo', 'M', '--saida', str(dm), '--tema', tema_m], cwd=RAIZ)
        G.chk(f'6.17-{tema_m}-geracao', f'Matriz de tabelas: apresentação {tema_m} gerada', r.returncode == 0 and (dm / 'Apresentacao_M.html').exists())
        for vp in ({'width': 1280, 'height': 720}, {'width': 390, 'height': 780}):
            c = amb.novo_contexto(viewport=vp); pg = c.new_page()
            pg.goto((dm / 'Apresentacao_M.html').as_uri()); pg.wait_for_timeout(250)
            medidas = []
            for _nome, _ in casos:
                pg.click('#n'); pg.wait_for_selector('.s.on .tbl')
                medidas.append(pg.evaluate("""() => {const w=document.querySelector('.s.on .tbl'),t=w.querySelector('table'),r=x=>{const b=x.getBoundingClientRect();return [b.x,b.y,b.width,b.height].map(v=>Math.round(v*10)/10)};
                    const antes=r(w);window.ZoomConteudista.zoom(1.5);const depois=r(w);window.ZoomConteudista.zoom(1);
                    return {wrapper:antes,table:r(t),overflow:w.scrollWidth>w.clientWidth,columns:t.rows[0].cells.length,images:t.querySelectorAll('img').length,zoom:Math.round((depois[2]/antes[2])*100)/100};}"""))
            chave=f'{vp["width"]}'
            if tema_m == 'govbr':
                refs[chave] = medidas
                ok = len(medidas) == len(casos)
            else:
                ok = all(m == ref for m, ref in zip(medidas, refs.get(chave, [])))
            G.chk(f'6.17-{tema_m}-{chave}', f'Matriz de tabelas {tema_m} ({chave}px): geometria, overflow e zoom iguais ao GOVBR',
                  len(medidas) == len(casos) and ok, medidas)
            c.close()
    # capa dos temas ANAC: título dentro da margem e à direita da arte; barra e linha do título em azul (não verde)
    ca = amb.tmp / 'capa_anac'; ca.mkdir(exist_ok=True)
    (ca / 's.md').write_text('<!-- class: title -->\n\n# Conteudista na Prática\n\n## Subtítulo\n\n---\n\n# Fim\n', encoding='utf-8')
    for tema_c in ('anac20-claro', 'anac20-escuro'):
        rodar([sys.executable, str(suporte.GERADOR), '-', str(ca / 's.md'), '--prefixo', 'T', '--saida', str(ca / tema_c), '--tema', tema_c], cwd=RAIZ)
        c = amb.novo_contexto(viewport={'width': 1280, 'height': 720}); pg_c = c.new_page()
        pg_c.goto((ca / tema_c / 'Apresentacao_T.html').as_uri()); pg_c.wait_for_timeout(400)
        m = pg_c.evaluate("""() => { const s = document.querySelector('.s.on'), r = s.getBoundingClientRect(), k = r.width / 1280, h = s.querySelector('h1').getBoundingClientRect(), azul = v => { const [R, G, B] = v.match(/\\d+/g).map(Number); return B > R + 40 && B > G; };
            return { esquerda: Math.round((h.left - r.left) / k), direita: Math.round((r.right - h.right) / k), barraAzul: azul(getComputedStyle(s, '::before').backgroundColor), linhaAzul: azul(getComputedStyle(s.querySelector('h1')).borderBottomColor), progressoAzul: azul(getComputedStyle(document.getElementById('bar')).backgroundColor) }; }""")
        G.chk(f'6.13-{tema_c}', f'{tema_c}: capa com título à direita da arte, dentro da margem, e barra/linha em azul', m['esquerda'] >= 500 and m['direita'] >= 60 and m['barraAzul'] and m['linhaAzul'] and m['progressoAzul'], m)
        c.close()
    # ANAC escuro: o texto claro dos slides intermediários precisa de fundo azul escuro em HTML e PPTX.
    esc = amb.tmp / 'anac_escuro_contraste'; esc.mkdir(exist_ok=True)
    (esc / 's.md').write_text('# Capa\n\n---\n\n## Conteúdo\n\nTexto de leitura. **Destaque**.\n\n| Campo | Valor |\n|---|---|\n| Exemplo | Legível |\n\n---\n\n# Fim\n', encoding='utf-8')
    rodar([sys.executable, str(suporte.GERADOR), '-', str(esc / 's.md'), '--prefixo', 'E', '--saida', str(esc), '--tema', 'anac20-escuro'], cwd=RAIZ)
    c = amb.novo_contexto(viewport={'width': 1280, 'height': 720}); pg_e = c.new_page()
    pg_e.goto((esc / 'Apresentacao_E.html').as_uri()); pg_e.wait_for_timeout(300); pg_e.click('#n')
    ce = pg_e.evaluate("""() => { const s=document.querySelector('.s.on'), bg=getComputedStyle(s).backgroundColor,
        rgb=x=>x.match(/\\d+/g).slice(0,3).map(Number), lum=x=>{const f=rgb(x).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*f[0]+.7152*f[1]+.0722*f[2]},
        contraste=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05),
        cores=[...s.querySelectorAll('h1,h2,h3,p,li,strong')].map(x=>getComputedStyle(x).color);
        return { fundo:bg, contrastes:cores.map(c=>contraste(bg,c)), elementos:cores.length }; }""")
    G.chk('6.18-anac20-escuro-html', 'ANAC escuro HTML: texto dos slides intermediários com fundo azul escuro e contraste mínimo 4,5:1',
          ce['fundo'] == 'rgb(20, 51, 74)' and ce['elementos'] > 0 and min(ce['contrastes']) >= 4.5, ce)
    c.close()
    from pptx import Presentation
    pp = Presentation(str(esc / 'Apresentacao_E.pptx')); slide_esc = pp.slides[1]
    fundo_escuro = any(sh.shape_type == 1 and sh.width >= pp.slide_width and sh.height >= pp.slide_height
                       and sh.fill.type is not None and str(sh.fill.fore_color.rgb) == '14334A' for sh in slide_esc.shapes)
    fontes = [str(run.font.color.rgb) for sh in slide_esc.shapes if sh.has_text_frame
              for par in sh.text_frame.paragraphs for run in par.runs if run.text.strip() and run.font.color.type is not None]
    tabela_escura = any(sh.has_table and str(sh.table.cell(0, 0).fill.fore_color.rgb) == '163B57'
                        and all(str(cell.fill.fore_color.rgb) in ('14334A', '1B4059', '163B57')
                                for row in sh.table.rows for cell in row.cells) for sh in slide_esc.shapes)
    def luminancia(hex_):
        rgb = [int(hex_[i:i+2], 16) / 255 for i in (0, 2, 4)]
        rgb = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
        return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]
    contrastes_pptx = [(max(luminancia(c), luminancia('14334A')) + .05) / (min(luminancia(c), luminancia('14334A')) + .05) for c in fontes]
    G.chk('6.18-anac20-escuro-pptx', 'ANAC escuro PPTX: slide intermediário com fundo azul escuro e texto claro',
          fundo_escuro and tabela_escura and bool(fontes) and min(contrastes_pptx) >= 4.5,
          {'fundo_escuro': fundo_escuro, 'tabela_escura': tabela_escura, 'fontes': fontes, 'contrastes': contrastes_pptx})
    # Regressão M.3: destaque legível, sem barra lateral e Mermaid embutido nas variantes ANAC.
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    anac_reg = amb.tmp / 'anac_regressao'; anac_reg.mkdir(exist_ok=True)
    conteudo_reg = ('# Capa\n\n---\n\n# Informação\n\n> [!INFO]\n> Informação.\n\n---\n\n'
        '# Dica\n\n> [!TIP]\n> Dica.\n\n---\n\n# Atenção\n\n> [!WARNING]\n> Atenção.\n\n---\n\n'
        '# Fluxo\n\n```mermaid\nflowchart LR\nA[Início] --> B[Fim]\n```\n')
    (anac_reg / 's.md').write_text(conteudo_reg, encoding='utf-8')
    codigo_fluxo = 'flowchart LR\nA[Início] --> B[Fim]'
    png_fluxo = 'data:image/png;base64,' + base64.b64encode(
        (RAIZ / 'tools' / 'temas' / 'anac20-claro' / 'conteudo-a.png').read_bytes()).decode('ascii')
    sys.path.insert(0, str(RAIZ / 'tools'))
    from gerador import gerar
    for tema_reg in ('anac20-claro', 'anac20-escuro'):
        pasta_reg = anac_reg / tema_reg
        gerar('', conteudo_reg, 'R', saida=str(pasta_reg),
              tema=tema_reg, fluxos={codigo_fluxo: png_fluxo}, formatos='html,pptx')
        reg_ppt = Presentation(str(pasta_reg / 'Apresentacao_R.pptx'))
        caixas = []
        fundos_caixa = {'EAF1F8', 'E9F6F0', 'FFF4E0', '14334A', 'DBE8FB', 'E3F5E1', 'FFF5C2'}
        slides_caixa = [reg_ppt.slides[i] for i in range(1, 4)]
        for reg_slide in slides_caixa:
            for sh in reg_slide.shapes:
                if sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE:
                    try:
                        fill = str(sh.fill.fore_color.rgb)
                        if fill in fundos_caixa:
                            texto = next((r for x in reg_slide.shapes if x.has_text_frame
                                          and abs(x.left - sh.left) < 350000
                                          and abs(x.top - sh.top) < 350000
                                          for p in x.text_frame.paragraphs for r in p.runs if r.text.strip()), None)
                            if texto:
                                caixas.append((fill, str(texto.font.color.rgb)))
                    except (AttributeError, TypeError, ValueError):
                        pass
        def contraste_hex(a, b):
            def lum(c):
                rgb = [int(c[i:i+2], 16) / 255 for i in (0, 2, 4)]
                rgb = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
                return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]
            x, y = lum(a), lum(b)
            return (max(x, y) + .05) / (min(x, y) + .05)
        midia = [sh for sh in reg_ppt.slides[4].shapes if sh.shape_type == MSO_SHAPE_TYPE.PICTURE]
        reg_html = (pasta_reg / 'Apresentacao_R.html').read_text(encoding='utf-8')
        barras_html = re.findall(r'\.s:before\s*\{([^}]*)\}', reg_html)
        contraste_ok = len(caixas) >= 3 and all(contraste_hex(f, t) >= 4.5 for f, t in caixas)
        G.chk(f'6.26-{tema_reg}', f'{tema_reg}: destaques legíveis, sem faixa lateral e Mermaid como imagem no PPTX',
              contraste_ok
              and not any(sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE and sh.left == 0
                          and sh.width < reg_ppt.slide_width and sh.height == reg_ppt.slide_height
                          for slide in slides_caixa for sh in slide.shapes)
              and bool(midia) and any('display:none' in regra.replace(' ', '') for regra in barras_html),
              {'caixas': caixas, 'contraste_ok': contraste_ok, 'imagens_pptx': len(midia),
               'barras_html': barras_html})
    # painel de acessibilidade: visual gov.br e ajuda "i" em cada opção (desktop e celular)
    pa = amb.tmp / 'painel_a11y'; pa.mkdir(exist_ok=True)
    (pa / 's.md').write_text('# Slide\n\nTexto.\n<!-- notas: Narração. -->\n', encoding='utf-8')
    rodar([sys.executable, str(suporte.GERADOR), '-', str(pa / 's.md'), '--prefixo', 'P', '--saida', str(pa / 'o')], cwd=RAIZ)
    for nome_v, vp in (('desktop', {'width': 1280, 'height': 720}), ('celular', {'width': 390, 'height': 780})):
        c = amb.novo_contexto(viewport=vp, touch=vp['width'] < 900); pg_p = c.new_page(); erros_p = []
        pg_p.on('pageerror', lambda e: erros_p.append(str(e)))
        pg_p.goto((pa / 'o' / 'Apresentacao_P.html').as_uri()); pg_p.wait_for_timeout(300)
        if pg_p.locator('#ini0').count(): pg_p.click('#ini0')
        pg_p.evaluate("document.getElementById('a11yToggle').click()"); pg_p.wait_for_selector('#a11yPanel[open]')
        m = pg_p.evaluate("""() => { const p = document.getElementById('a11yPanel'), cx = [...p.querySelectorAll('input[type=checkbox]')], css = getComputedStyle(cx[0]), sel = getComputedStyle(p.querySelector('select')), bt = getComputedStyle(p.querySelector('button.sec'));
            return { n: cx.length, semAjuda: cx.filter(i => !i.closest('.a11y-op').querySelector('.a11y-i')).map(i => i.dataset.a11y), caixa: css.width + ' ' + css.borderTopLeftRadius + ' ' + css.appearance, selRaio: sel.borderTopLeftRadius, botao: bt.borderTopLeftRadius, apoio: !!p.querySelector('.a11y-i[aria-controls="a11yAj-apoio"]'), ajudaPosition: getComputedStyle(p.querySelector('#a11yAj-webcam')).position }; }""")
        b = pg_p.locator('.a11y-i[aria-controls="a11yAj-webcam"]'); b.click()
        w = pg_p.evaluate("() => { const a = document.getElementById('a11yAj-webcam'), r = a.getBoundingClientRect(); return { visivel: !a.hidden, expandido: document.querySelector('.a11y-i[aria-controls=\"a11yAj-webcam\"]').getAttribute('aria-expanded'), texto: a.textContent, dentro: r.top >= -2 && r.bottom <= innerHeight + 2 }; }")
        txt = w['texto']
        G.chk(f'6.14-{nome_v}', f'Painel ({nome_v}): estilo gov.br, ajuda \"i\" em todas as op\u00e7\u00f5es e ajuda da webcam com gestos e permiss\u00f5es',
              m['n'] >= 7 and not m['semAjuda'] and m['apoio'] and m['caixa'] == '24px 4px none' and m['selRaio'] == '4px' and m['botao'] != '0px'
              and m['ajudaPosition'] == ('absolute' if nome_v == 'desktop' else 'static')
              and w['visivel'] and w['expandido'] == 'true' and w['dentro'] and all(x in txt for x in ('\U0001F590', '\u270C', '\U0001F44D', 'Chrome', 'Android', 'Safari', 'Edge')) and not erros_p, {'m': m, 'w': w['visivel'], 'dentro': w['dentro']})
        c.close()
    # 1.116: capa/selo ANAC no HTML e no PPTX, e encerramento do PPTX sem texto próprio
    for tema_a in ('anac20-claro', 'anac20-escuro'):
        da = anac_saidas[tema_a]
        conteudo = (da / 'Apresentacao_A.html').read_text(encoding='utf-8')
        fundos = [sha(base64.b64decode(x)) for x in re.findall(r'data:image/png;base64,([^"]+)', conteudo)]
        capa = sha((RAIZ / 'tools' / 'temas' / tema_a / 'capa.png').read_bytes())
        encerramento = sha((RAIZ / 'tools' / 'temas' / tema_a / 'encerramento.png').read_bytes())
        with zipfile.ZipFile(da / 'Apresentacao_A.pptx') as z:
            slides = sorted([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)],
                            key=lambda n: int(re.search(r'\d+', n.split('/')[-1]).group()))
            def imagem_slide(k):
                rels = z.read(f'ppt/slides/_rels/slide{k}.xml.rels').decode('utf-8')
                alvo = re.search(r'Target="\.\./(media/[^"]+\.png)"', rels)
                return sha(z.read('ppt/' + alvo.group(1))) if alvo else ''
            texto_final = [t for t in re.findall(r'<a:t>(.*?)</a:t>', z.read(slides[-1]).decode('utf-8'))
                           if not re.fullmatch(r'\d+ / \d+', t)]
            xml_capa = z.read(slides[0]).decode('utf-8')
            capa_sem_texto_solto = 'Apresentação de uso da aplicação' not in xml_capa
            capa_pptx, fim_pptx = imagem_slide(1), imagem_slide(len(slides))
        G.chk(f'6.21-{tema_a}', f'{tema_a}: arte da capa/selo e do encerramento no HTML e no PPTX, com slide final sem texto',
              fundos[:2] == [capa, encerramento] and capa_pptx == capa and fim_pptx == encerramento and not texto_final and capa_sem_texto_solto,
              {'html': [x[:12] for x in fundos[:2]], 'pptx': [capa_pptx[:12], fim_pptx[:12]], 'texto_final': texto_final, 'capa_sem_texto_solto': capa_sem_texto_solto})
    # painel de acessibilidade dentro dos temas ANAC: mesma base gov.br, sem comportamento novo
    for tema_a in ('anac20-claro', 'anac20-escuro'):
        html_anac = anac_saidas[tema_a] / 'Apresentacao_A.html'
        for nome_v, vp in (('desktop', {'width': 1280, 'height': 720}), ('celular', {'width': 390, 'height': 780})):
            c = amb.novo_contexto(viewport=vp, touch=vp['width'] < 900); pg_p = c.new_page(); erros_p = []
            pg_p.on('pageerror', lambda e: erros_p.append(str(e)))
            pg_p.goto(html_anac.as_uri()); pg_p.wait_for_timeout(300)
            pg_p.evaluate("document.getElementById('a11yToggle').click()"); pg_p.wait_for_selector('#a11yPanel[open]')
            m = pg_p.evaluate("""() => { const p = document.getElementById('a11yPanel'), cx = [...p.querySelectorAll('input[type=checkbox]')], css = getComputedStyle(cx[0]), sel = getComputedStyle(p.querySelector('select')), bt = getComputedStyle(p.querySelector('button.sec'));
                return { n: cx.length, semAjuda: cx.filter(i => !i.closest('.a11y-op').querySelector('.a11y-i')).map(i => i.dataset.a11y), caixa: css.width + ' ' + css.borderTopLeftRadius + ' ' + css.appearance, selRaio: sel.borderTopLeftRadius, botao: bt.borderTopLeftRadius, webcam: !!p.querySelector('.a11y-i[aria-controls="a11yAj-webcam"]'),
                  ajudas: Object.fromEntries([...p.querySelectorAll('.a11y-i')].map(b => { const id = b.getAttribute('aria-controls'); return [id, document.getElementById(id).textContent]; })) }; }""")
            pg_p.locator('.a11y-i[aria-controls="a11yAj-webcam"]').click()
            w = pg_p.evaluate("""() => { const a = document.getElementById('a11yAj-webcam'), b = document.querySelector('.a11y-i[aria-controls="a11yAj-webcam"]'), r = a.getBoundingClientRect();
                document.documentElement.classList.add('a11y-contrast'); const s = getComputedStyle(a), contraste = [s.backgroundColor, s.color, s.borderLeftColor]; document.documentElement.classList.remove('a11y-contrast');
                return { texto: a.textContent, expandido: b.getAttribute('aria-expanded'), dentro: r.top >= -2 && r.bottom <= innerHeight + 2, contraste }; }""")
            dicas = {'a11yAj-contraste':'Fundo preto', 'a11yAj-espacamento':'Aumenta o espaço entre linhas',
                     'a11yAj-regua':'faixa que acompanha o ponteiro', 'a11yAj-movimento':'Remove animações',
                     'a11yAj-barra':'Mantém a barra de controles', 'a11yAj-atalhos':'Alt+Shift',
                     'a11yAj-apoio':'Ouvir texto atual'}
            G.chk(f'6.22-{tema_a}-{nome_v}', f'{tema_a} ({nome_v}): painel com estilo gov.br, ajuda "i" e gestos da webcam',
                  m['n'] >= 7 and not m['semAjuda'] and m['webcam'] and m['caixa'] == '24px 4px none' and m['selRaio'] == '4px' and m['botao'] != '0px'
                  and all(k in m['ajudas'] and t in m['ajudas'][k] for k, t in dicas.items())
                  and w['expandido'] == 'true' and w['dentro'] and w['contraste'] == ['rgb(0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(255, 255, 0)']
                  and all(x in w['texto'] for x in ('\U0001F590', '\u270C', '\U0001F44D', 'Chrome e Edge no computador',
                      'ícone à esquerda do endereço', 'Chrome no Android: menu \u22ee \u203a Configurações \u203a Configurações do site \u203a Câmera',
                      'Safari no iPhone ou iPad: Ajustes \u203a Safari \u203a Câmera', 'botão aA na barra \u203a Configurações do site'))
                  and not erros_p, {'m': m, 'webcam': w, 'dicas': list(dicas), 'erros': erros_p})
            c.close()
    # legendas/narração: ajuda contextual existe quando há áudio, inclusive no tema ANAC
    nar = amb.tmp / 'anac_narracao'; nar.mkdir(exist_ok=True)
    (nar / 's.md').write_text('# Capa\n\n<!-- notas: Narração de exemplo. -->\n\n---\n\n# Fim\n', encoding='utf-8')
    with wave.open(str(nar / '1.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050); w.writeframes(b'\0' * 4410)
    rodar([sys.executable, str(suporte.GERADOR), '-', str(nar / 's.md'), '--prefixo', 'N', '--saida', str(nar / 'o'), '--tema', 'anac20-claro', '--audios', str(nar)], cwd=RAIZ)
    c = amb.novo_contexto(viewport={'width': 1280, 'height': 720}); pg_n = c.new_page(); erros_n = []
    pg_n.on('pageerror', lambda e: erros_n.append(str(e)))
    pg_n.goto((nar / 'o' / 'Apresentacao_N.html').as_uri()); pg_n.wait_for_timeout(300)
    pg_n.evaluate("document.getElementById('a11yToggle').click()"); pg_n.wait_for_selector('#a11yPanel[open]')
    mn = pg_n.evaluate("""() => { const p = document.getElementById('a11yPanel'), l = p.querySelector('[data-a11y=legendas]'), a = document.getElementById('a11yAj-legendas');
        return { tem: !!l, descr: l && l.getAttribute('aria-describedby'), ajuda: a && a.textContent, legenda: !!document.querySelector('.a11y-caption'), icone: !!p.querySelector('.a11y-i[aria-controls="a11yAj-legendas"]') }; }""")
    G.chk('6.23-anac-legendas', 'ANAC com narração: painel explica legendas/narração e a legenda do slide existe',
          mn['tem'] and mn['descr'] == 'a11yAj-legendas' and mn['icone'] and 'narração' in (mn['ajuda'] or '')
          and 'leitores de tela' in (mn['ajuda'] or '') and mn['legenda'] and not erros_n,
          {'m': mn, 'erros': erros_n})
    c.close()
    # DOCX e EPUB gerados com tema ANAC continuam com o padrão gov.br / claro e neutro
    for tema_a in ('anac20-claro', 'anac20-escuro'):
        de = amb.tmp / f'apostila_{tema_a}'
        rodar([sys.executable, str(suporte.GERADOR), str(EXEMPLO_TREINO), '-', '--prefixo', 'A', '--saida', str(de), '--tema', tema_a], cwd=RAIZ)
        with zipfile.ZipFile(de / 'Apostila_A.docx') as z:
            dx = z.read('word/document.xml').decode('utf-8', 'ignore') + z.read('word/styles.xml').decode('utf-8', 'ignore')
        with zipfile.ZipFile(de / 'Apostila_A.epub') as z:
            css = z.read('OEBPS/css/style.css').decode('utf-8', 'ignore')
        G.chk(f'6.24-{tema_a}', f'{tema_a}: DOCX segue gov.br e EPUB permanece claro e neutro',
              '1351B4' in dx and '0C326F' in dx and not any(x in dx for x in ('163B57', 'D5A900', '14334A'))
              and '#0b3d6e' in css and '#1351b4' not in css and '14334a' not in css,
              {'docx_govbr': '1351B4' in dx and '0C326F' in dx, 'epub_neutro': '#0b3d6e' in css and '#1351b4' not in css})
    # SPEC 07: foco, hover e estado ativo do painel gov.br dentro do tema ANAC
    c = amb.novo_contexto(viewport={'width': 1280, 'height': 720}); pg_f = c.new_page()
    pg_f.goto((anac_saidas['anac20-claro'] / 'Apresentacao_A.html').as_uri()); pg_f.wait_for_timeout(300)
    pg_f.evaluate("document.getElementById('a11yToggle').click()"); pg_f.wait_for_selector('#a11yPanel[open]')
    pg_f.locator('[data-a11y=contraste]').focus()
    foco = pg_f.evaluate("() => getComputedStyle(document.querySelector('[data-a11y=contraste]')).outline")
    pg_f.locator('[data-a11y=contraste]').hover()
    hover_cb = pg_f.evaluate("() => getComputedStyle(document.querySelector('[data-a11y=contraste]')).boxShadow")
    pg_f.locator('select#leitura').hover()
    hover_sel = pg_f.evaluate("() => getComputedStyle(document.querySelector('select#leitura')).backgroundColor")
    pg_f.locator('.a11y-i[aria-controls="a11yAj-webcam"]').hover()
    hover_i = pg_f.evaluate("""() => { const s = getComputedStyle(document.querySelector('.a11y-i[aria-controls="a11yAj-webcam"] span')); return [s.backgroundColor, s.color]; }""")
    ativo = pg_f.evaluate("""() => { const b = document.querySelector('button.sec[data-a11y=ouvir]'); b.setAttribute('aria-pressed', 'true'); const s = getComputedStyle(b); return [s.backgroundColor, s.color]; }""")
    mf = {'foco': foco, 'hoverCb': hover_cb, 'hoverSel': hover_sel, 'hoverI': hover_i}
    G.chk('6.25-anac-estados', 'Painel ANAC: foco tracejado, hover gov.br e estado ativo em azul com texto branco',
          mf['foco'] == 'rgb(194, 133, 12) dashed 4px' and 'rgba(19, 81, 180, 0.16)' in mf['hoverCb']
          and mf['hoverSel'] == 'rgb(237, 245, 255)' and mf['hoverI'] == ['rgb(19, 81, 180)', 'rgb(255, 255, 255)']
          and ativo == ['rgb(19, 81, 180)', 'rgb(255, 255, 255)'], {'m': mf, 'ativo': ativo})
    c.close()
    # webcam: gestos repetidos (palma avança várias vezes; joinha alterna reproduzir/pausar), com reconhecedor MediaPipe simulado
    wc = amb.tmp / 'webcam'; wc.mkdir(exist_ok=True)
    (wc / 's.md').write_text('\n\n---\n\n'.join('# Slide %d\n\nTexto.' % k for k in range(1, 7)) + '\n', encoding='utf-8')
    rodar([sys.executable, str(suporte.GERADOR), '-', str(wc / 's.md'), '--prefixo', 'W', '--saida', str(wc / 'o')], cwd=RAIZ)
    mp_falso = ("export const FilesetResolver={forVisionTasks:async()=>({})};"
                "export const GestureRecognizer={createFromOptions:async()=>({close(){},recognizeForVideo(){const g=window.__g;return g?{gestures:[[{categoryName:g,score:.95}]]}:{gestures:[]}}})};")
    c = amb.novo_contexto(viewport={'width': 1280, 'height': 720}); pg_w = c.new_page(); erros_w = []
    pg_w.on('pageerror', lambda e: erros_w.append(str(e)))
    pg_w.route('**/vision_bundle.mjs', lambda r: r.fulfill(status=200, content_type='application/javascript', headers={'access-control-allow-origin': '*'}, body=mp_falso))
    pg_w.add_init_script("navigator.mediaDevices.getUserMedia = async () => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); setInterval(() => { x.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'); x.fillRect(0, 0, 16, 16); }, 50); return c.captureStream(20); };")
    pg_w.goto((wc / 'o' / 'Apresentacao_W.html').as_uri()); pg_w.wait_for_timeout(300)
    pg_w.evaluate("document.querySelector('[data-a11y=webcam]').click()")
    pg_w.wait_for_function("document.getElementById('a11yEstado').textContent.includes('ativo')", timeout=15000)
    def gesto(nome, ms):
        pg_w.evaluate('(n) => { window.__g = n; }', nome); pg_w.wait_for_timeout(ms)
    slide = lambda: pg_w.evaluate("document.getElementById('c').textContent.trim()")
    play = lambda: pg_w.evaluate("document.getElementById('bp').getAttribute('aria-label')")
    pg_w.wait_for_timeout(3500)  # barra de controles já recolhida: o gesto não pode depender dela
    for _ in range(3):
        gesto('Open_Palm', 1300); gesto('None', 500)
    gesto('', 300)
    avancou = slide()
    estados = []
    for _ in range(3):
        gesto('Thumb_Up', 1300); estados.append(play()); gesto('None', 500)
    gesto('', 300)
    G.chk('6.15', 'Webcam: palma avan\u00e7a em cada repeti\u00e7\u00e3o e joinha alterna reproduzir/pausar sem depender da barra',
          avancou == 'Slide 4 de 6' and estados == ['Pausar apresenta\u00e7\u00e3o', 'Reproduzir apresenta\u00e7\u00e3o', 'Pausar apresenta\u00e7\u00e3o'] and not erros_w,
          {'slide': avancou, 'play': estados, 'erros': erros_w})
    c.close()
    # controle remoto: celular controla a apresentação por relay HTTPS com mensagens cifradas, mesmo com o diálogo do QR fechado
    rl_srv, gravado = _relay_falso(); relay = 'http://127.0.0.1:%d' % rl_srv.server_address[1]
    web_srv, web_url = _servidor(RAIZ / 'web')
    rm = amb.tmp / 'remoto'; rm.mkdir(exist_ok=True)
    (rm / 's.md').write_text('# Slide 1\n\nTexto.\n\n<!-- notas: Nota secreta do primeiro slide. -->\n\n---\n\n# Slide 2\n\nTexto.\n\n---\n\n# Slide 3\n\nTexto.\n', encoding='utf-8')
    rodar([sys.executable, str(suporte.GERADOR), '-', str(rm / 's.md'), '--prefixo', 'R', '--saida', str(rm / 'o')], cwd=RAIZ)
    det = {}; ok_r = False
    try:
        c = amb.novo_contexto(viewport={'width': 1280, 'height': 720}); init = "window.CONTEUDISTA_RELAY='%s';" % relay
        pres = c.new_page(); pres.add_init_script(init); pres.goto((rm / 'o' / 'Apresentacao_R.html').as_uri()); pres.wait_for_timeout(300)
        pres.evaluate("document.getElementById('bRemote').click()")
        pres.wait_for_function("document.getElementById('dremoteLink').href.includes('controle-remoto.html#')", timeout=15000)
        hash_r = pres.evaluate("new URL(document.getElementById('dremoteLink').href).hash"); base_cel = web_url.rsplit('/', 1)[0] + '/controle-remoto.html'
        cel = c.new_page(); cel.add_init_script(init); cel.goto(base_cel + hash_r)
        cel.wait_for_function("document.getElementById('status').textContent.includes('Conectado')", timeout=15000)
        pres.wait_for_function("document.getElementById('dremoteSt').textContent.includes('onectado')", timeout=10000)
        pres.click('#dremoteC'); pres.wait_for_timeout(300)  # fechar o diálogo não pode derrubar o controle
        det['notas'] = 'Nota secreta do primeiro slide.' in cel.evaluate("document.getElementById('notes').textContent")
        cel.click('#next'); pres.wait_for_function("document.getElementById('c').textContent.includes('Slide 2 de 3')", timeout=10000)
        cel.wait_for_function("document.getElementById('slide').textContent.includes('Slide 2 de 3')", timeout=10000)
        cel.click('#play'); pres.wait_for_function("document.getElementById('bp').getAttribute('aria-label').startsWith('Pausar')", timeout=10000); cel.click('#play')
        pres.wait_for_function("document.getElementById('bp').getAttribute('aria-label').startsWith('Reproduzir')", timeout=10000)
        cel.click('#prev'); pres.wait_for_function("document.getElementById('c').textContent.includes('Slide 1 de 3')", timeout=10000)
        imp = c.new_page(); imp.add_init_script(init); imp.goto(base_cel + '#' + hash_r[1:].split('.')[0] + '.AAAAAAAAAAAAAAAAAAAAAA'); imp.wait_for_timeout(800)
        imp.evaluate("document.getElementById('next').disabled = false; document.getElementById('next').click()"); imp.wait_for_timeout(1500)
        det['impostor_ignorado'] = pres.evaluate("document.getElementById('c').textContent").strip() == 'Slide 1 de 3'
        det['relay_so_cifrado'] = len(gravado) >= 4 and not any('Nota secreta' in m or 'Slide' in m for m in gravado)
        det['sem_peerjs'] = 'peerjs' not in (rm / 'o' / 'Apresentacao_R.html').read_text(encoding='utf-8').lower()
        ok_r = all(det.values())
        c.close()
    except Exception as ex:
        det['erro'] = str(ex)[:300]
    finally:
        rl_srv.shutdown(); web_srv.shutdown()
    G.chk('6.16', 'Controle remoto: celular controla (próximo, anterior, reproduzir), v\u00ea as notas, ignora chave errada, relay s\u00f3 v\u00ea texto cifrado e o di\u00e1logo pode ser fechado', ok_r, det)
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
    # 1.120: os 25 modelos semânticos viram classes no HTML e slides no PPTX, sem estourar o palco.
    from conteudo import markdown as md_layouts
    png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nKkAAAAASUVORK5CYII='
    blocos = []
    for slug in sorted(md_layouts.LAYOUTS):
        corpo = '# Slide\n\nTexto.'
        if slug.startswith(('imagem-', 'meio-meio')):
            corpo = '# Slide\n\n![Imagem](%s)\n\nTexto.' % png
        blocos.append('<!-- layout: %s -->\n%s' % (slug, corpo))
    sm = amb.tmp / 'modelos-slides.md'
    sm.write_text('---\ntitle: Modelos\n---\n\n' + '\n\n---\n\n'.join(blocos), encoding='utf-8')
    dm = amb.tmp / 'saida_modelos'
    r = rodar([sys.executable, str(suporte.GERADOR), '-', str(sm), '--prefixo', 'Modelos', '--saida', str(dm), '--tema', 'govbr', '--formatos', 'html,pptx'], cwd=RAIZ)
    h = next(dm.glob('*Apresentacao*.html'), None)
    ppt = next(dm.glob('*Apresentacao*.pptx'), None)
    ok_ppt = bool(ppt) and zipfile.ZipFile(ppt).testzip() is None
    G.chk('6.23', '25 modelos: HTML e PPTX gerados, com PPTX íntegro', r.returncode == 0 and bool(h) and ok_ppt, (r.stderr or r.stdout)[-200:])
    if h:
        for nome, vp in (('computador', {'width': 1280, 'height': 720}), ('celular', {'width': 390, 'height': 780})):
            c = amb.novo_contexto(viewport=vp, touch=vp['width'] < 900)
            pg = c.new_page(); erros = []
            pg.on('pageerror', lambda e: erros.append(str(e)))
            pg.goto(h.as_uri()); pg.wait_for_timeout(600)
            m = pg.evaluate("""() => ({modelos:document.querySelectorAll('.s[class*=" lay-"]').length,
                colunas:getComputedStyle(document.querySelector('.s.lay-imagem-direita .conteudo')).gridTemplateColumns.split(' ').length,
                sw:document.documentElement.scrollWidth, iw:innerWidth, on:document.querySelectorAll('.s.on').length})""")
            G.chk(f'6.24-{vp["width"]}', f'25 modelos em {nome}: classes aplicadas, divisão em duas colunas e sem rolagem',
                  m['modelos'] == 25 and m['colunas'] == 2 and m['sw'] <= m['iw'] + 1 and m['on'] == 1 and not erros, f'{m} {erros}')
            c.close()
    # Formatos escolhidos: só os marcados em "Formatos dos arquivos" são gerados.
    so_txt = amb.tmp / 'saida_formatos_texto'
    r = rodar([sys.executable, str(suporte.GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Fmt', '--saida', str(so_txt), '--formatos', 'html,md'], cwd=RAIZ)
    feitos = sorted(p.suffix for p in so_txt.glob('*')) if so_txt.exists() else []
    G.chk('6.19', 'Formatos escolhidos: --formatos html,md gera só HTML e Markdown',
          r.returncode == 0 and feitos == ['.html', '.html', '.md', '.md'], feitos or (r.stderr or r.stdout)[-300:])
    so_bin = amb.tmp / 'saida_formatos_bin'
    r = rodar([sys.executable, str(suporte.GERADOR), str(EXEMPLO_TREINO), str(EXEMPLO_APRES), '--prefixo', 'Fmt', '--saida', str(so_bin), '--formatos', 'docx,pptx'], cwd=RAIZ)
    feitos = sorted(p.suffix for p in so_bin.glob('*')) if so_bin.exists() else []
    G.chk('6.20', 'Formatos escolhidos: --formatos docx,pptx não gera HTML, EPUB nem Markdown',
          r.returncode == 0 and feitos == ['.docx', '.pptx'], feitos or (r.stderr or r.stdout)[-300:])

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
    m = re.search(r'### 11\.3 O prompt curto.*?\n`{3,6}text\n(.*?)\n`{3,6}\n', t, re.S); pr = m.group(1) if m else ''
    G.chk('15.3', 'Prompt curto (3 campos e a URL raw do documento principal) e os dois documentos de instruções no repositório; sem o prompt extenso',
          bool(pr) and len(pr) <= 800 and all(x in pr for x in ('[TEMA]', '[PÚBLICO-ALVO]', '[OBJETIVOS DE APRENDIZAGEM]'))
          and 'https://raw.githubusercontent.com/anacgovbr/conteudista/main/docs/PROMPT_GERACAO_IA.md' in pr and 'PROMPT PADRÃO' not in t
          and (RAIZ / 'docs/PROMPT_GERACAO_IA.md').is_file() and (RAIZ / 'docs/REGRAS_ACESSIBILIDADE_LINGUAGEM_SIMPLES.md').is_file(), len(pr))
    G.chk('15.4', 'Apostila de exemplo com as seções 5.6 e 10.6 e o Checklist A atualizado',
          '### 5.6 Acessibilidade do texto' in t and '### 10.6 Escrever conteúdo acessível' in t and 'O botão **Acessibilidade** não mostra itens para corrigir' in t)
    a = ler('web/exemplo/apresentacao.md')
    tit = ['# Acessibilidade do texto', '# O que é para corrigir', '# Sugestões de linguagem simples', '# Corrigir no próprio texto', '# Pedir ajuda a uma IA']
    n = len(re.findall(r'(?m)^---\s*$', a)) - 1
    G.chk('15.5', 'Apresentação de exemplo com os 5 slides de acessibilidade (40 slides)', all(x in a for x in tit) and n == 40, n)
    aj = ler('web/ajuda.js')
    G.chk('15.6', 'Ajuda com "Escrever conteúdo acessível" e a tabela de atalhos da acessibilidade',
          '<h4>Escrever conteúdo acessível</h4>' in aj and '<kbd>Alt+Shift+I</kbd>' in aj and "t: '3. Confira a acessibilidade'" in aj)
    srv, url = _servidor(RAIZ / 'web')
    try:
        pg = ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.add_init_script("try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}")
        pg.goto(url); pg.wait_for_selector('#pg .la-btn', state='attached', timeout=15000); pg.wait_for_timeout(300)
        pg.locator('#btnMenuApp').click(); pg.locator('#btnTour').click(); pg.wait_for_selector('.tr-pop', timeout=5000)
        for _ in range(3): pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(250)
        e = pg.evaluate("""() => { const p = document.querySelector('.tr-pop'), h = document.querySelector('.tr-hole'), b = document.querySelector('#pg .la-btn').getBoundingClientRect();
            const r = h && h.getBoundingClientRect(); return { titulo: p && p.querySelector('h4').textContent, cobre: !!r && r.left <= b.left && r.right >= b.right && r.top <= b.top && r.bottom >= b.bottom }; }""")
        G.chk('15.7', 'Tutorial: passo "3. Confira a acessibilidade" destaca o botão Acessibilidade', e['titulo'] == '3. Confira a acessibilidade' and e['cobre'], e)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        pg.locator('#tg').click()
        pg.wait_for_function("!document.getElementById('pg').hidden")
        rodape = pg.locator('#rod').input_value()
        antes_s = pg.locator('#s').input_value()
        pg.locator('#bcAcoesEdicao #ex').click()
        pg.wait_for_function("document.getElementById('g').value.includes('Conteudista na Prática')", timeout=15000)
        G.chk('15.10', 'Rodapé começa vazio e o exemplo da Apostila não altera a Apresentação',
              rodape == '' and pg.locator('#s').input_value() == antes_s)
        antes_g = pg.locator('#g').input_value()
        pg.locator('#ts').click()
        pg.locator('#bcAcoesEdicao #ex').click()
        pg.wait_for_function("document.getElementById('s').value.includes('Conteudista na Prática')", timeout=15000)
        G.chk('15.11', 'O exemplo da Apresentação não altera a Apostila',
              pg.locator('#g').input_value() == antes_g)
        pg.wait_for_function("() => ['g', 's'].every(k => { const estado = AcessibilidadeTexto.estado(k); return estado && estado.resultado && estado.ta.value.includes('Conteudista na Prática') && estado.analisado === estado.ta.value; })", timeout=15000)
        pg.wait_for_timeout(1500)
        e = pg.evaluate("[AcessibilidadeTexto.resultado('g').resumo.corrigir, AcessibilidadeTexto.resultado('s').resumo.corrigir, document.getElementById('laAviso') ? !document.getElementById('laAviso').hidden : false]")
        G.chk('15.8', 'Carregar exemplo: o painel não acusa nada para corrigir e não há aviso perto de Gerar arquivos', e == [0, 0, False], e)
        pg.locator('#bcAcoesEdicao #clr').click()
        pg.get_by_role('alertdialog').get_by_role('button', name='Limpar', exact=True).click()
        pg.wait_for_function("document.getElementById('s').value === ''", timeout=10000)
        G.chk('15.12', 'Limpar a Apresentação preserva a Apostila',
              pg.locator('#g').input_value() == antes_g)
        G.chk('15.9', 'Nenhum erro de JavaScript', not erros, erros)
        pg.close()
    finally:
        srv.shutdown()

def grupo19(amb, ctx, G):
    r = rodar(['node', str(RAIZ / 'tools' / 'lac' / 'testar_api.mjs')], cwd=RAIZ)
    G.chk('19.1', 'API v1: rotas, formatos, ETag, RFC 9457, limites e CORS', r.returncode == 0, (r.stdout + r.stderr)[-600:])
