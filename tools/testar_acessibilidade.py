# -*- coding: utf-8 -*-
"""Verifica a acessibilidade das saídas do Conteudista (SPEC 1.66, seção 14).
Uso: python tools/testar_acessibilidade.py PASTA [--prefixo Exemplo] [--exigir-fontes]
Confere: EPUB (2 variantes), HTML da apostila, DOCX, PPTX e HTML dos slides. Sai com código 1 se algo falhar.
--exigir-fontes: exige as fontes de leitura embutidas (use quando tools/fontes tiver os WOFF2)."""
import sys, os, re, zipfile, argparse, posixpath
from urllib.parse import unquote
from lxml import etree

FALHAS = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: FALHAS.append(m)

NS = {'x': 'http://www.w3.org/1999/xhtml', 'opf': 'http://www.idpf.org/2007/opf', 'dc': 'http://purl.org/dc/elements/1.1/',
      'ncx': 'http://www.daisy.org/z3986/2005/ncx/', 'epub': 'http://www.idpf.org/2007/ops'}

def testar_epub(cam, familia, exigir_fontes):
    nome = os.path.basename(cam)
    z = zipfile.ZipFile(cam); nomes = z.namelist(); infos = z.infolist()
    ok(infos[0].filename == 'mimetype' and infos[0].compress_type == zipfile.ZIP_STORED and z.read('mimetype') == b'application/epub+zip',
       nome + ': mimetype primeiro, sem compressão e exato')
    for n in ('META-INF/container.xml', 'OEBPS/content.opf', 'OEBPS/nav.xhtml', 'OEBPS/toc.ncx'):
        ok(n in nomes, '%s: contém %s' % (nome, n))
    arv = {}
    for n in nomes:
        if n.endswith(('.xhtml', '.opf', '.ncx', '.xml')):
            try: arv[n] = etree.fromstring(z.read(n))
            except Exception as e: ok(False, '%s: %s bem formado (%s)' % (nome, n, e))
    ok(not any('__MACOSX' in n or n.startswith('/') or '.DS_Store' in n for n in nomes), nome + ': sem arquivos temporários ou caminhos absolutos')
    opf = arv.get('OEBPS/content.opf')
    if opf is None: return
    ok(opf.findtext('.//dc:language', namespaces=NS) == 'pt-BR', nome + ': dc:language pt-BR')
    props = [m.get('property') for m in opf.iterfind('.//opf:meta', NS)]
    for p in ('schema:accessibilityFeature', 'schema:accessibilityHazard', 'schema:accessibilitySummary', 'schema:accessMode', 'dcterms:modified'):
        ok(p in props, '%s: metadado %s' % (nome, p))
    ident = opf.findtext('.//dc:identifier', namespaces=NS)
    ncx = arv.get('OEBPS/toc.ncx')
    ok(ncx is not None and ncx.find('.//ncx:meta[@name="dtb:uid"]', NS).get('content') == ident, nome + ': dtb:uid igual ao dc:identifier')
    man = {i.get('href'): i for i in opf.iterfind('.//opf:item', NS)}
    ok(all(('OEBPS/' + h) in nomes for h in man), nome + ': todo item do manifest existe no ZIP')
    ok(any(i.get('properties') == 'nav' for i in man.values()), nome + ': nav com properties="nav"')
    fontes = [n for n in nomes if n.startswith('OEBPS/fonts/') and n.endswith('.woff2')]
    base = 'atkinson-hyperlegible-next' if familia == 'atkinson' else 'opendyslexic'
    outra = 'opendyslexic' if familia == 'atkinson' else 'atkinson-hyperlegible-next'
    ok(not any(outra in f for f in fontes), nome + ': só a família escolhida')
    if exigir_fontes or fontes:
        ok(len(fontes) == 4 and all(base in f for f in fontes), '%s: 4 faces de %s' % (nome, base))
        ok(all(man.get(f[6:]) is not None and man[f[6:]].get('media-type') == 'font/woff2' for f in fontes), nome + ': fontes declaradas como font/woff2')
    css = z.read('OEBPS/css/style.css').decode('utf-8')
    ok(not re.search(r'url\(\s*["\']?https?:', css) and '@import' not in css, nome + ': CSS sem fonte/recurso remoto')
    fam_nome = 'Atkinson Hyperlegible Next' if familia == 'atkinson' else 'OpenDyslexic'
    ok(re.search(r'body\{font-family:"%s",Verdana,Tahoma,Arial,sans-serif' % fam_nome, css) is not None, nome + ': família com fallback Verdana')
    ids = {}; ref_ok = True; alt_ok = True; th_ok = True; proibidos = False; task = 0; remoto = False
    for n, t in arv.items():
        if not n.endswith('.xhtml'): continue
        for el in t.iter():
            if isinstance(el.tag, str) and el.get('id'): ids.setdefault(n, set()).add(el.get('id'))
    for n, t in arv.items():
        if not n.endswith('.xhtml'): continue
        dirn = posixpath.dirname(n)
        if t.xpath('//x:script|//x:input|//x:iframe|//x:form|//x:audio|//x:video', namespaces=NS): proibidos = True
        for im in t.iterfind('.//x:img', NS):
            if im.get('alt') is None: alt_ok = False
            if re.match(r'https?:', im.get('src', '')): remoto = True
        for tb in t.iterfind('.//x:table', NS):
            if tb.find('.//x:th', NS) is None: th_ok = False
        for li in t.iterfind('.//x:li[@class="task"]', NS):
            task += 1
            if (li.findtext('x:span[@class="caixa"]', namespaces=NS) or '') not in ('☐', '☒'): ref_ok = False
        for a in t.iterfind('.//x:a[@href]', NS):
            h = a.get('href')
            if re.match(r'[a-z]+:', h): continue
            arq, _, frag = h.partition('#')
            alvo = posixpath.normpath(posixpath.join(dirn, unquote(arq))) if arq else n
            if alvo not in nomes or (frag and frag not in ids.get(alvo, set())):
                ok(False, '%s: link interno quebrado em %s -> %s' % (nome, n, h)); ref_ok = False
        for el in t.iterfind('.//*[@src]'):
            s = el.get('src')
            if not re.match(r'[a-z]+:', s) and posixpath.normpath(posixpath.join(dirn, s)) not in nomes: ref_ok = False
    ok(not proibidos, nome + ': sem script/input/iframe/form/audio/video')
    ok(alt_ok, nome + ': todas as imagens têm alt')
    ok(not remoto, nome + ': sem imagem remota')
    ok(th_ok, nome + ': todas as tabelas têm th')
    ok(task > 0 and ref_ok, '%s: checklists com ☐/☒ (%d) e referências internas válidas' % (nome, task))

def testar_apostila_html(cam, exigir_fontes):
    h = open(cam, encoding='utf-8').read(); n = os.path.basename(cam)
    ok('data-leitura="padrao"' in h, n + ': data-leitura="padrao"')
    ok(re.search(r'<select id="leitura">.*?value="padrao".*?value="atkinson".*?value="opendyslexic"', h, re.S) is not None, n + ': seletor Leitura com 3 opções')
    ok('<label for="leitura"' in h, n + ': rótulo visível "Leitura"')
    ff = re.findall(r'@font-face\{font-family:"([^"]+)";src:url\(data:font/woff2;base64,', h)
    if exigir_fontes or ff:
        ok('Atkinson Hyperlegible Next' in ff and 'OpenDyslexic' in ff and ff.count('Atkinson Hyperlegible Next') == 4 and ff.count('OpenDyslexic') == 4,
           n + ': 8 @font-face em base64 (Atkinson e OpenDyslexic)')
        ok('font-display:swap' in h, n + ': font-display:swap')
    ok(not re.search(r'@font-face\{font-family:"(Atkinson|OpenDyslexic)[^}]*https?:', h), n + ': sem CDN para Atkinson/OpenDyslexic')
    ok('--leitura:Verdana,Tahoma,Arial,sans-serif' in h and '--leitura:"OpenDyslexic",Verdana,Tahoma,Arial,sans-serif' in h, n + ': padrão Verdana e fallback')
    ok('<th scope="col">' in h and '<th>' not in h, n + ': scope="col" em todos os th')
    ok('<div class="tbl" role="region" aria-label="Tabela" tabindex="0">' in h, n + ': tabelas em região rolável focável')
    ok('class="fluxo-tabela"' in h and 'Tabela do fluxo' in h and 'class="fluxo-print"' in h, n + ': alternativa em tabela para Mermaid (tela e impressão)')
    if 'id="gab"' in h: ok("aria-expanded" in h and "setAttribute('inert'" in h, n + ': gabarito com aria-expanded e inert')
    else: print('INFO ' + n + ': sem gabarito neste conteúdo')
    ok('@page{size:A4' in h, n + ': impressão A4')
    ok('article{font-family:var(--leitura)' in h, n + ': artigo usa var(--leitura)')
    ok('id="pg" role="status" aria-live="polite"' in h, n + ': #pg com aria-live')
    ok('justify' not in re.sub(r'justify-content|justify-self|justify-items', '', h.split('</style>')[0]), n + ': sem text-align: justify')
    ok('<main id="conteudo" tabindex="-1">' in h and 'class="skip"' in h, n + ': link "Ir para o conteúdo"')

def testar_docx(cam):
    n = os.path.basename(cam); z = zipfile.ZipFile(cam)
    st = z.read('word/styles.xml').decode('utf-8'); doc = z.read('word/document.xml').decode('utf-8')
    norm = re.search(r'<w:style [^>]*w:styleId="Normal".*?</w:style>', st, re.S).group(0)
    ok('w:ascii="Verdana"' in norm, n + ': Normal em Verdana')
    ok('<w:sz w:val="24"/>' in norm, n + ': Normal 12 pt')
    ok('w:line="360"' in norm and 'w:lineRule="auto"' in norm, n + ': entrelinha 1,5')
    ok('w:after="120"' in norm, n + ': 6 pt após parágrafos')
    ok('w:val="pt-BR"' in norm and doc.count('w:val="pt-BR"') > 50, n + ': idioma pt-BR (estilo e trechos)')
    ok('<w:tblHeader' in doc, n + ': cabeçalho de tabela repetido')
    todos = ''.join(z.read(x).decode('utf-8', 'ignore') for x in z.namelist() if x.endswith('.xml'))
    ok(not re.search(r'w:embed(Regular|Bold|Italic|BoldItalic|TrueTypeFonts)', todos) and not any(x.startswith('word/fonts/') for x in z.namelist()), n + ': sem fonte embutida')
    dp = re.findall(r'<wp:docPr [^>]*>', doc)
    ok(dp and all('descr=' in x for x in dp), n + ': docPr com descr nas %d imagens' % len(dp))

def testar_pptx(cam, fonte_tema):
    n = os.path.basename(cam); z = zipfile.ZipFile(cam)
    sl = [x for x in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', x)]
    xs = {x: z.read(x).decode('utf-8') for x in sl}
    todos = ''.join(xs.values())
    pics = re.findall(r'<p:pic>.*?</p:pic>', todos, re.S)
    ok(pics and all(re.search(r'<p:cNvPr [^>]*descr=', p) for p in pics), n + ': descr em todas as %d imagens' % len(pics))
    ok('lang="pt-BR"' in todos, n + ': lang="pt-BR" nos trechos')
    tab = todos.count('<a:tbl>'); ok(tab > 0 and todos.count('firstRow="1"') >= tab, n + ': firstRow="1" nas %d tabelas' % tab)
    notas = [x for x in z.namelist() if re.match(r'ppt/notesSlides/notesSlide\d+\.xml$', x)]
    ok(len(notas) > 0 and all('lang="pt-BR"' in z.read(x).decode('utf-8') for x in notas), n + ': notas presentes (%d) e em pt-BR' % len(notas))
    # corpo = caixas de texto com entrelinha 1,2 (parágrafos e listas); tabelas, código, legendas e rodapé têm regras próprias
    corpo, outros = [], []
    for x in xs.values():
        for m in re.finditer(r'<p:sp>.*?</p:sp>', x, re.S):
            sp = m.group(0)
            for p in re.finditer(r'<a:p>(.*?)</a:p>', sp, re.S):
                tams = [int(v) / 100 for v in re.findall(r'<a:rPr [^>]*sz="(\d+)"', p.group(1))]
                if not tams: continue
                (corpo if 'val="120000"' in p.group(1) else outros).extend(tams)
        for t in re.finditer(r'<a:tbl>.*?</a:tbl>', x, re.S):
            outros.extend(int(v) / 100 for v in re.findall(r'sz="(\d+)"', t.group(0)))
    tem_corpo = bool(corpo)
    if tem_corpo: ok(min(corpo) >= 16, n + ': corpo nunca abaixo de 16 pt (%d trechos; menor %s)' % (len(corpo), min(corpo)))
    else: print('INFO ' + n + ': slides sem parágrafos de corpo')
    ok(outros and min(outros) >= 10, n + ': demais textos (tabelas, código, legendas, rodapé) >= 10 pt (menor %s)' % (min(outros) if outros else '-'))
    ok('latin typeface="%s"' % fonte_tema in todos, n + ': pptx_font preservada (%s)' % fonte_tema)
    if tem_corpo: ok(re.search(r'<a:lnSpc><a:spcPct val="120000"/></a:lnSpc>', todos) is not None, n + ': entrelinha 1,2 no corpo')

def testar_slides_html(cam, exigir_fontes):
    h = open(cam, encoding='utf-8').read(); n = os.path.basename(cam)
    ok('id="st" role="region" aria-roledescription="apresentação"' in h, n + ': #st região da apresentação')
    tot = h.count('<section class="s ')
    ok(tot > 0 and h.count('role="group" aria-roledescription="slide"') == tot, n + ': %d slides com role=group e roledescription' % tot)
    ok('aria-label="Slide 1 de %d"' % tot in h and 'aria-label="Slide %d de %d"' % (tot, tot) in h, n + ': rótulos "Slide N de M"')
    ok("setAttribute('inert'" in h and "setAttribute('aria-hidden'" in h, n + ': aria-hidden/inert nos inativos')
    ok('id="c" role="status" aria-live="polite"' in h, n + ': #c com aria-live')
    ok('aria-label="Slide anterior"' in h and 'aria-label="Próximo slide"' in h, n + ': botões com nome acessível')
    for b in ('b1', 'b2', 'bLer'): ok('id="%s" type="button" aria-pressed="false"' % b in h, '%s: #%s com aria-pressed' % (n, b))
    ok(re.search(r'<select id="leitura">.*?atkinson.*?opendyslexic', h, re.S) is not None, n + ': seletor Leitura')
    ok('body.modo-leitura{background:#fff!important' in h, n + ': modo leitura com fundo claro')
    ok('@page{size:A4' in h and '#st .s .nt{display:block!important' in h, n + ': impressão A4 com notas')
    ok("conteudista:slide" in h, n + ': evento conteudista:slide')
    ok("addEventListener('slide'" not in h and "CustomEvent('slide'" not in h, n + ': sem a substituição frágil (evento "slide")')
    ok('role="note" aria-label="Notas do apresentador"' in h, n + ': notas como role=note')
    ok('matchMedia("(max-width: 900px)")' in h, n + ': telas pequenas abrem no modo leitura')
    ff = re.findall(r'@font-face\{font-family:"([^"]+)";src:url\(data:font/woff2;base64,', h)
    if exigir_fontes or ff: ok(len(ff) == 8, n + ': fontes de leitura embutidas')
    ok('.s{font-family:var(--leitura)}' in h, n + ': slides usam var(--leitura)')

if __name__ == '__main__':
    a = argparse.ArgumentParser(); a.add_argument('pasta'); a.add_argument('--prefixo', default='Exemplo')
    a.add_argument('--exigir-fontes', action='store_true'); a.add_argument('--fonte-pptx', default='Arial'); a = a.parse_args()
    P = lambda x: os.path.join(a.pasta, x % a.prefixo)
    esperados = ['Apostila_%s.md', 'Apostila_%s.html', 'Apostila_%s.docx', 'Apostila_%s.epub', 'Apostila_%s_OpenDyslexic.epub',
                 'Apresentacao_%s.md', 'Apresentacao_%s.html', 'Apresentacao_%s.pptx']
    for e in esperados: ok(os.path.isfile(P(e)), 'arquivo gerado: ' + e % a.prefixo)
    if not FALHAS:
        testar_epub(P('Apostila_%s.epub'), 'atkinson', a.exigir_fontes)
        testar_epub(P('Apostila_%s_OpenDyslexic.epub'), 'opendyslexic', a.exigir_fontes)
        testar_apostila_html(P('Apostila_%s.html'), a.exigir_fontes)
        testar_docx(P('Apostila_%s.docx'))
        testar_pptx(P('Apresentacao_%s.pptx'), a.fonte_pptx)
        testar_slides_html(P('Apresentacao_%s.html'), a.exigir_fontes)
    print('RESULTADO: %s (%d falha(s))' % ('OK' if not FALHAS else 'FALHOU', len(FALHAS)))
    sys.exit(1 if FALHAS else 0)
