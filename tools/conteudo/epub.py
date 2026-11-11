import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from .contexto import aviso, decorativa
from . import licencas
from .fontes import FONTES_DIR, LEITURAS, fontes_faces_unicas
from .imagens import _ep_img_raw
from .markdown import blocks, mermaid_edges, plain, runs, sem_comentarios, slug, title_of
from .recursos import ler_recurso

EPUB_CSS=ler_recurso('epub/layout.css')

class _EpubCtx:
    def __init__(self):
        self.imgs={};self.ids={};self.sem_alt=0;self.n_img=0;self.sec_ids=[]
    def uid(self,base):
        base=base or 'secao';n=self.ids.get(base,0)+1;self.ids[base]=n
        return base if n==1 else '%s-%d'%(base,n)
    def img(self,src):
        raw,mime=_ep_img_raw(src)
        if raw is None:return None
        h=hashlib.sha1(raw).hexdigest()
        if h not in self.imgs:
            ext={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/svg+xml':'svg','image/webp':'webp'}[mime]
            self.imgs[h]=('img/img-%03d.%s'%(len(self.imgs)+1,ext),mime,raw)
        return self.imgs[h][0]

def _ep_inl(t,cx):
    s=''
    for x,b,i,c,u in runs(t):
        if c==2:
            src=cx.img(u);cx.n_img+=1
            decor=decorativa(u,x)
            if not x.strip() and not decor:cx.sem_alt+=1
            s+='<img class="il" src="%s" alt="%s"/>'%(E(src),E('' if decor else x)) if src else E('[imagem%s]'%(': '+x if x else ''),quote=False)
            continue
        h=E(x,quote=False)
        if c:h='<code>'+h+'</code>'
        if i:h='<em>'+h+'</em>'
        if b:h='<strong>'+h+'</strong>'
        if u:h='<a href="%s">%s</a>'%(E(u),h)
        s+=h
    return s

def _ep_list(it,cx):
    def rec(k,d):
        tag='ol' if it[k][1] else 'ul';o=''
        while k<len(it) and it[k][0]>=d:
            if it[k][0]>d:sub,k=rec(k,it[k][0]);o=o[:-5]+sub+'</li>';continue
            dp,od,ck,t=it[k]
            if ck is None:o+='<li>'+_ep_inl(t,cx)+'</li>'
            else:o+='<li class="task"><span class="caixa" aria-hidden="true">%s</span><span class="sr-only">%s</span>%s</li>'%('☒' if ck else '☐','Concluído: ' if ck else 'Não concluído: ',_ep_inl(t,cx))
            k+=1
        return '<%s>%s</%s>'%(tag,o,tag),k
    return rec(0,it[0][0])[0]

def _ep_tabela(rows,cx,cap=''):
    nc=max(len(r) for r in rows)
    t='<table>'+('<caption>%s</caption>'%E(cap) if cap else '')+'<thead><tr>'+''.join('<th scope="col">%s</th>'%_ep_inl(rows[0][c] if c<len(rows[0]) else '',cx) for c in range(nc))+'</tr></thead><tbody>'
    t+=''.join('<tr>'+''.join('<td>%s</td>'%_ep_inl(r[c] if c<len(r) else '',cx) for c in range(nc))+'</tr>' for r in rows[1:])
    return t+'</tbody></table>'

def _ep_blocks(bl,cx,toc=None):
    o=[];cap=None
    for b in bl:
        k=b[0]
        if k=='p' and re.match(r'(?i)^tabela\s*:\s*\S',b[1]):
            if cap is not None:o.append('<p>'+_ep_inl('Tabela: '+cap,cx)+'</p>')
            cap=re.sub(r'(?i)^tabela\s*:\s*','',b[1]).strip();continue
        if cap is not None and k!='table':o.append('<p>'+_ep_inl('Tabela: '+cap,cx)+'</p>');cap=None
        if k=='h':
            sid=cx.uid(slug(b[2]));lv=min(b[1],6)
            if toc is not None and lv==3:toc.append((sid,plain(b[2])))
            o.append('<h%d id="%s">%s</h%d>'%(lv,sid,_ep_inl(b[2],cx),lv))
        elif k=='p':o.append('<p>'+_ep_inl(b[1],cx)+'</p>')
        elif k=='img':
            src=cx.img(b[2]);cx.n_img+=1
            decor=decorativa(b[2],b[1])
            if not b[1].strip() and not decor:cx.sem_alt+=1
            alt='' if decor else b[1]
            if src:o.append('<figure><img src="%s" alt="%s"/>%s</figure>'%(E(src),E(alt),'<figcaption>%s</figcaption>'%E(b[1]) if b[1] and not decor else ''))
            else:o.append('<p>%s</p>'%E('[Imagem não incluída%s]'%(': '+b[1] if b[1] else ''),quote=False));aviso('Imagem remota ou ilegível não incluída no EPUB: %s'%b[2][:60])
        elif k=='table':o.append(_ep_tabela(b[1],cx,cap or ''));cap=None
        elif k=='list':o.append(_ep_list(b[1],cx))
        elif k=='quote':o.append('<blockquote class="%s">%s</blockquote>'%(E(b[1] or ''),_ep_blocks(b[2],cx,toc)))
        elif k=='code':
            if b[1]=='mermaid':
                try:rows=mermaid_edges(b[2])
                except Exception:rows=None
                if rows and len(rows)>1:o.append('<div class="fluxo"><p class="fluxo-t">Fluxo</p>%s</div>'%_ep_tabela(rows,cx))
                else:o.append('<pre><code>%s</code></pre>'%E(b[2],quote=False))
            else:o.append('<pre><code>%s</code></pre>'%E(b[2],quote=False))
    if cap is not None:o.append('<p>'+_ep_inl('Tabela: '+cap,cx)+'</p>')
    return '\n'.join(o)

def _ep_doc(title,body,tipo):
    return ('<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="pt-BR" xml:lang="pt-BR">\n'
            '<head>\n<meta charset="utf-8"/>\n<title>%s</title>\n<link rel="stylesheet" type="text/css" href="css/style.css"/>\n</head>\n<body epub:type="%s">\n%s\n</body>\n</html>\n')%(E(title),tipo,body)

def treinamento_epub(md,path,foot,tema=None,fonte='atkinson',licenca=''):
    """Apostila em EPUB 3 (XHTML + OPF + nav + NCX), com a fonte de leitura embutida e metadados de acessibilidade.
    O EPUB é claro e neutro (não usa os temas escuros); o tema não altera o EPUB."""
    from lxml import etree
    nome_f,base_f,ofl=LEITURAS[fonte]
    md=sem_comentarios(md);bl=blocks(md);titulo=title_of(md,'Apostila');cx=_EpubCtx()
    hi=next((i for i,x in enumerate(bl) if x[0]=='h' and x[1]==2),len(bl))
    capa=bl[:hi];secoes=[];atual=None
    for x in bl[hi:]:
        if x[0]=='h' and x[1]==2:atual=[x];secoes.append(atual)
        else:atual.append(x)
    if not secoes:  # sem h2: a capa leva só o título; o corpo inteiro vai para um único conteudo.xhtml
        h1i=next((i for i,x in enumerate(bl) if x[0]=='h' and x[1]==1),-1)
        capa=bl[:h1i+1];resto=bl[h1i+1:]
        if resto:secoes=[resto]
    arquivos=[];toc=[];ids_arq={}
    # capa: título (h1), barra/subtítulo, parágrafos antes do primeiro h2 e rodapé
    corpo_capa=_ep_blocks(capa,cx)
    if '<h1' not in corpo_capa:corpo_capa='<h1 id="%s">%s</h1>\n'%(cx.uid('titulo'),E(titulo))+corpo_capa
    if foot:corpo_capa+='\n<p class="rodape">%s</p>'%E(foot)
    arquivos.append(('capa','capa.xhtml',titulo,'<section epub:type="titlepage">\n%s\n</section>'%corpo_capa,'frontmatter'))
    for n,sec_ in enumerate(secoes,1):
        nome='sec-%02d.xhtml'%n if secoes and sec_[0][0]=='h' and sec_[0][1]==2 else 'conteudo.xhtml'
        h3=[];corpo=_ep_blocks(sec_,cx,h3)
        m=re.search(r'<h2 id="([^"]+)">',corpo);sid=m.group(1) if m else ''
        tit=plain(sec_[0][2]) if sec_[0][0]=='h' else titulo
        toc.append((nome,sid,tit,h3));arquivos.append(('s%02d'%n,nome,tit,'<section epub:type="chapter">\n%s\n</section>'%corpo,'bodymatter'))
    if licenca:
        lic=licencas.LICENCAS[licencas.validar(licenca)]
        corpo=('<section epub:type="legalnotice">\n<h1 id="licenciamento">Licenciamento</h1>\n'
               '<p>%s Consulte a licença: <a rel="license" href="%s">%s</a>.</p>\n<p>%s</p>\n</section>') % (
                   E(licencas.frase_declarativa(licenca)),E(lic['url']),E(lic['url']),E(licencas.RESSALVA))
        nome='licenciamento.xhtml'
        arquivos.append(('licenca',nome,'Licenciamento',corpo,'backmatter'))
        toc.append((nome,'licenciamento','Licenciamento',[]))
    # links internos (#id) apontam para o arquivo certo
    for _,nome,_,corpo,_ in arquivos:
        for i_ in re.findall(r'\bid="([^"]+)"',corpo):ids_arq.setdefault(i_,nome)
    def fixa(nome,corpo):
        return re.sub(r'href="#([^"]+)"',lambda m_:'href="%s#%s"'%(ids_arq[m_.group(1)],m_.group(1)) if ids_arq.get(m_.group(1),nome)!=nome else m_.group(0),corpo)
    docs={nome:_ep_doc(tit,fixa(nome,corpo),tipo) for _,nome,tit,corpo,tipo in arquivos}
    # sumário (nav) e landmarks
    li=['<li><a href="capa.xhtml">%s</a></li>'%E(titulo)]
    for nome,sid,tit,h3 in toc:
        sub='<ol>%s</ol>'%''.join('<li><a href="%s#%s">%s</a></li>'%(nome,i_,E(t_)) for i_,t_ in h3) if h3 else ''
        li.append('<li><a href="%s%s">%s</a>%s</li>'%(nome,'#'+sid if sid else '',E(tit),sub))
    inicio=toc[0][0] if toc else 'capa.xhtml'
    nav_body=('<nav epub:type="toc" id="toc" role="doc-toc">\n<h1>Sumário</h1>\n<ol>\n%s\n</ol>\n</nav>\n'
              '<nav epub:type="landmarks" id="landmarks" hidden="hidden">\n<h2>Pontos de referência</h2>\n<ol>\n'
              '<li><a epub:type="titlepage" href="capa.xhtml">Capa</a></li>\n<li><a epub:type="toc" href="nav.xhtml">Sumário</a></li>\n'
              '<li><a epub:type="bodymatter" href="%s">Início do conteúdo</a></li>\n</ol>\n</nav>')%('\n'.join(li),inicio)
    docs['nav.xhtml']=_ep_doc('Sumário',nav_body,'frontmatter')
    for nome_,x in docs.items():etree.fromstring(x.encode('utf-8'))  # XHTML bem formado (erro interrompe só este EPUB)
    # fontes da família escolhida (somente ela) + licença
    faces=fontes_faces_unicas(fonte);css=EPUB_CSS.split('\n',1)[1].replace('__NOME__',nome_f)+'\n'+licencas.CSS
    ff=''.join('@font-face{font-family:"%s";src:url("../fonts/%s") format("woff2");font-weight:%s;font-style:%s;font-display:swap}\n'%(nome_f,arq,peso,estilo) for peso,estilo,arq,_ in faces)
    css=ff+css
    ident='urn:uuid:%s'%uuid.uuid5(uuid.NAMESPACE_URL,'conteudista:apostila:%s:%s'%(titulo,fonte))
    agora=datetime.datetime.now(datetime.timezone.utc)
    titulo_opf=titulo+(' — OpenDyslexic' if fonte=='opendyslexic' else '')
    man=['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>','<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
         '<item id="css" href="css/style.css" media-type="text/css"/>']
    for k_,(peso,estilo,arq,_) in enumerate(faces,1):man.append('<item id="fonte%d" href="fonts/%s" media-type="font/woff2"/>'%(k_,arq))
    if faces and os.path.isfile(os.path.join(FONTES_DIR,ofl)):man.append('<item id="licenca" href="fonts/%s" media-type="text/plain"/>'%ofl)
    for k_,(nm,mime,_) in enumerate(cx.imgs.values(),1):man.append('<item id="img%d" href="%s" media-type="%s"/>'%(k_,nm,mime))
    for idr,nome,_,_,_ in arquivos:man.append('<item id="%s" href="%s" media-type="application/xhtml+xml"/>'%(idr,nome))
    spine=['<itemref idref="capa"/>','<itemref idref="nav"/>']+['<itemref idref="%s"/>'%idr for idr,nome,_,_,_ in arquivos[1:]]
    tem_img=cx.n_img>0;alt_ok=tem_img and cx.sem_alt==0
    if cx.sem_alt:aviso('EPUB: %d imagem(ns) sem texto alternativo; o recurso alternativeText não foi declarado.'%cx.sem_alt)
    meta=['<dc:identifier id="pub-id">%s</dc:identifier>'%ident,'<dc:title>%s</dc:title>'%E(titulo_opf),'<dc:language>pt-BR</dc:language>','<dc:creator>Conteudista</dc:creator>']+(['<dc:rights>%s — %s</dc:rights>'%(E(licencas.LICENCAS[licenca]['sigla']),E(licencas.LICENCAS[licenca]['url']))] if licenca else [])+[
          '<dc:date>%s</dc:date>'%agora.strftime('%Y-%m-%d'),'<meta property="dcterms:modified">%s</meta>'%agora.strftime('%Y-%m-%dT%H:%M:%SZ'),
          '<meta property="schema:accessMode">textual</meta>']+(['<meta property="schema:accessMode">visual</meta>'] if tem_img else [])+[
          '<meta property="schema:accessModeSufficient">textual</meta>','<meta property="schema:accessibilityFeature">structuralNavigation</meta>',
          '<meta property="schema:accessibilityFeature">tableOfContents</meta>']+(['<meta property="schema:accessibilityFeature">alternativeText</meta>'] if alt_ok else [])+[
          '<meta property="schema:accessibilityFeature">readingOrder</meta>','<meta property="schema:accessibilityHazard">none</meta>',
          '<meta property="schema:conformsTo">https://www.w3.org/TR/WCAG22/</meta>','<meta property="schema:conformsTo">https://www.w3.org/TR/epub-a11y-11/</meta>',
          '<meta property="schema:accessibilitySummary">Conteúdo em português do Brasil, com estrutura de títulos, sumário navegável, tabelas com cabeçalhos%s e fonte adequada para dislexia (%s).</meta>'%(', imagens com texto alternativo' if alt_ok else '',E(nome_f))]
    opf=('<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="pt-BR" prefix="schema: http://schema.org/">\n'
         '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n%s\n</metadata>\n<manifest>\n%s\n</manifest>\n<spine toc="ncx">\n%s\n</spine>\n</package>\n')%('\n'.join(meta),'\n'.join(man),'\n'.join(spine))
    po=[1]
    def np_(rotulo,src,filhos=''):
        n=po[0];po[0]+=1
        return '<navPoint id="np%d" playOrder="%d"><navLabel><text>%s</text></navLabel><content src="%s"/>%s</navPoint>'%(n,n,E(rotulo),src,filhos)
    pts=[np_(titulo,'capa.xhtml')]
    for nome,sid,tit,h3 in toc:
        cab=np_(tit,nome+('#'+sid if sid else ''))
        filhos=''.join(np_(t_,'%s#%s'%(nome,i_)) for i_,t_ in h3)
        pts.append(cab[:-len('</navPoint>')]+filhos+'</navPoint>')
    prof=2 if any(h3 for _,_,_,h3 in toc) else 1
    ncx=('<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="pt-BR">\n<head>\n'
         '<meta name="dtb:uid" content="%s"/>\n<meta name="dtb:depth" content="%d"/>\n<meta name="dtb:totalPageCount" content="0"/>\n<meta name="dtb:maxPageNumber" content="0"/>\n</head>\n'
         '<docTitle><text>%s</text></docTitle>\n<navMap>\n%s\n</navMap>\n</ncx>\n')%(ident,prof,E(titulo_opf),'\n'.join(pts))
    container=('<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
               '<rootfiles>\n<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n</rootfiles>\n</container>\n')
    for x in(opf,ncx,container):etree.fromstring(x.encode('utf-8'))
    with zipfile.ZipFile(path,'w') as z:
        DT=(2026,1,1,0,0,0)
        def put(nm,dados,comp=zipfile.ZIP_DEFLATED):
            zi=zipfile.ZipInfo(nm,DT);zi.compress_type=comp;z.writestr(zi,dados)
        put('mimetype','application/epub+zip',zipfile.ZIP_STORED)  # primeiro item, sem compressão e sem nova linha
        put('META-INF/container.xml',container);put('OEBPS/content.opf',opf);put('OEBPS/toc.ncx',ncx);put('OEBPS/css/style.css',css)
        put('OEBPS/nav.xhtml',docs['nav.xhtml'])
        for _,nome,_,_,_ in arquivos:put('OEBPS/'+nome,docs[nome])
        for peso,estilo,arq,cam in faces:put('OEBPS/fonts/'+arq,open(cam,'rb').read())
        if faces and os.path.isfile(os.path.join(FONTES_DIR,ofl)):put('OEBPS/fonts/'+ofl,open(os.path.join(FONTES_DIR,ofl),'rb').read())
        for nm,mime,raw in cx.imgs.values():put('OEBPS/'+nm,raw)
    return path
