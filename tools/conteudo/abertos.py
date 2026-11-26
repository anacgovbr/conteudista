"""Formatos abertos de exportacao (1.131): TXT, Wiki, RTF, ODT, ODP, PDF, YAML e JSON.
Tudo a partir dos blocos de markdown.blocks(), sem dependencia nova (so a biblioteca padrao).
shortcut: imagens saem como texto alternativo e o ODP nao leva as notas; PDF e texto simples sem etiquetas de
acessibilidade (so titulo e idioma). Embutir imagens/etiquetar o PDF so se esses formatos virarem entrega principal."""
import re,json,zipfile,io,html
from .markdown import runs,plain,split_slides,blocks,title_of

E=lambda s:html.escape(str(s),quote=True)

def _doc_slides(sl):
    "Apresentacao como documento corrido: blocos de cada slide, com as notas ao fim."
    o=[]
    for c,bl,notas,ly in sl:
        o+=list(bl)
        if notas:o.append(('p','Notas do apresentador: '+notas))
    return o

def _txt_runs(t):return ''.join(r[0] if r[3]!=2 else '[Imagem: %s]'%r[0] for r in runs(t))

# ------------------------------------------------------------------ TXT
def txt(titulo,bl):
    o=[titulo,'='*len(titulo),'']
    def rec(bl,pre=''):
        for b in bl:
            k=b[0]
            if k=='h':t=_txt_runs(b[2]);o.extend([pre+t,pre+('=-~.,.'[min(b[1],5)])*max(3,len(t)),''])
            elif k=='p':o.extend([pre+_txt_runs(b[1]),''])
            elif k=='img':o.extend([pre+'[Imagem: %s]'%(b[1] or 'sem descricao'),''])
            elif k=='code':o.extend([pre+'    '+x for x in b[2].split('\n')]+[''])
            elif k=='table':o.extend([pre+' | '.join(_txt_runs(c) for c in r) for r in b[1]]+[''])
            elif k=='list':
                n=0
                for lv,ordn,ck,t in b[1]:
                    n=n+1 if ordn else 0;m=('%d. '%n) if ordn else '- ';m+=('[x] ' if ck else '[ ] ') if ck is not None else ''
                    o.append(pre+'  '*lv+m+_txt_runs(t))
                o.append('')
            elif k=='quote':rec(b[2],pre+'> ')
    rec(bl);return ('\n'.join(o).rstrip()+'\n').encode('utf-8')

# ------------------------------------------------------------------ Wiki (MediaWiki)
def _wk(t):
    s=''
    for x,neg,it,kind,url in runs(t):
        x=x.replace('|','&#124;')
        if kind==1:s+='<code>%s</code>'%html.escape(x,quote=False)
        elif kind==2:s+="''[Imagem: %s]''"%x
        else:
            if neg:x="'''%s'''"%x
            if it:x="''%s''"%x
            s+='[%s %s]'%(url,x) if url else x
    return s
def wiki(titulo,bl):
    o=['= %s ='%titulo,'']
    def rec(bl):
        for b in bl:
            k=b[0]
            if k=='h':n=min(6,b[1]+1);o.extend(['%s %s %s'%('='*n,_wk(b[2]),'='*n),''])
            elif k=='p':o.extend([_wk(b[1]),''])
            elif k=='img':o.extend(["''[Imagem: %s]''"%(b[1] or 'sem descricao'),''])
            elif k=='code':o.extend(['<pre>%s</pre>'%html.escape(b[2],quote=False),''])
            elif k=='table':
                o.append('{| class="wikitable"')
                for i,r in enumerate(b[1]):
                    o.append('|-');o.append(('! ' if i==0 else '| ')+(' !! ' if i==0 else ' || ').join(_wk(c) for c in r))
                o.extend(['|}',''])
            elif k=='list':
                for lv,ordn,ck,t in b[1]:o.append(('#' if ordn else '*')*(lv+1)+' '+(('[x] ' if ck else '[ ] ') if ck is not None else '')+_wk(t))
                o.append('')
            elif k=='quote':o.append('<blockquote>');rec(b[2]);o.append('</blockquote>');o.append('')
    rec(bl);return ('\n'.join(o).rstrip()+'\n').encode('utf-8')

# ------------------------------------------------------------------ RTF
def _rt(s):
    o=[]
    for ch in str(s):
        c=ord(ch)
        if ch in '\\{}':o.append('\\'+ch)
        elif ch=='\n':o.append('\\line ')
        elif c<128:o.append(ch)
        else:o.append('\\u%d?'%(c if c<32768 else c-65536))
    return ''.join(o)
def _rtr(t):
    s=''
    for x,neg,it,kind,url in runs(t):
        if kind==2:x='[Imagem: %s]'%x
        x=_rt(x)
        if kind==1:x='{\\f1 %s}'%x
        if neg:x='{\\b %s}'%x
        if it:x='{\\i %s}'%x
        s+=x
    return s
def rtf(titulo,bl):
    o=['{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1046{\\fonttbl{\\f0\\fswiss Arial;}{\\f1\\fmodern Courier New;}}\\fs22',
       '{\\info{\\title %s}}'%_rt(titulo),'{\\pard\\sa240\\b\\fs40 %s\\par}'%_rt(titulo)]
    def rec(bl,ind=0):
        for b in bl:
            k=b[0]
            if k=='h':o.append('{\\pard\\sb240\\sa120\\keepn\\b\\fs%d %s\\par}'%({1:36,2:30,3:26}.get(b[1],24),_rtr(b[2])))
            elif k=='p':o.append('{\\pard\\li%d\\sa160 %s\\par}'%(ind,_rtr(b[1])))
            elif k=='img':o.append('{\\pard\\sa160\\i [Imagem: %s]\\par}'%_rt(b[1] or 'sem descricao'))
            elif k=='code':o.extend('{\\pard\\li%d\\f1 %s\\par}'%(ind+360,_rt(x)) for x in b[2].split('\n'))
            elif k=='table':
                n=max(len(r) for r in b[1]);w=9000//n
                for i,r in enumerate(b[1]):
                    o.append('\\trowd\\trgaph108'+''.join('\\clbrdrt\\brdrs\\clbrdrl\\brdrs\\clbrdrb\\brdrs\\clbrdrr\\brdrs\\cellx%d'%(w*(j+1)) for j in range(n)))
                    o.append(''.join('\\pard\\intbl %s%s\\cell'%('\\b ' if i==0 else '',_rtr(r[j]) if j<len(r) else '') for j in range(n))+'\\row')
            elif k=='list':
                n=0
                for lv,ordn,ck,t in b[1]:
                    n=n+1 if ordn else 0;m=('%d.'%n) if ordn else '\\bullet';m+=(' [x]' if ck else ' [ ]') if ck is not None else ''
                    o.append('{\\pard\\li%d\\fi-360\\sa60 %s\\tab %s\\par}'%(ind+720+360*lv,m,_rtr(t)))
            elif k=='quote':rec(b[2],ind+720)
    rec(bl);o.append('}');return '\n'.join(o).encode('ascii')

# ------------------------------------------------------------------ OpenDocument (ODT / ODP)
NS=('xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" '
    'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
    'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" '
    'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" '
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.3"')
def _od_zip(mime,arqs):
    b=io.BytesIO()
    with zipfile.ZipFile(b,'w') as z:
        z.writestr(zipfile.ZipInfo('mimetype'),mime,zipfile.ZIP_STORED)
        for n,d in arqs:z.writestr(n,d,zipfile.ZIP_DEFLATED)
    return b.getvalue()
def _manifest(mime):
    return ('<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">'
            '<manifest:file-entry manifest:full-path="/" manifest:media-type="%s"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>'
            '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/></manifest:manifest>')%mime
def _meta(titulo):
    return '<?xml version="1.0" encoding="UTF-8"?><office:document-meta %s><office:meta><dc:title>%s</dc:title><dc:language>pt-BR</dc:language></office:meta></office:document-meta>'%(NS,E(titulo))
def _odr(t):
    s=''
    for x,neg,it,kind,url in runs(t):
        if kind==2:x='[Imagem: %s]'%x
        x=E(x)
        if kind==1:x='<text:span text:style-name="Codigo">%s</text:span>'%x
        if neg:x='<text:span text:style-name="Negrito">%s</text:span>'%x
        if it:x='<text:span text:style-name="Italico">%s</text:span>'%x
        if url:x='<text:a xlink:href="%s" xmlns:xlink="http://www.w3.org/1999/xlink">%s</text:a>'%(E(url),x)
        s+=x
    return s
_ESTILOS_TXT=''.join('<style:style style:name="Heading_20_%d" style:display-name="Heading %d" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.4cm" fo:margin-bottom="0.2cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="%dpt" fo:font-weight="bold"/></style:style>'%(i,i,s) for i,s in zip(range(1,7),(20,17,14,12,11,11)))
_ESTILOS=('<style:default-style style:family="paragraph"><style:text-properties fo:font-size="11pt" style:font-name-asian="Arial" fo:language="pt" fo:country="BR" style:font-name="Arial"/></style:default-style>'
  '<style:style style:name="Standard" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.25cm"/></style:style>'+_ESTILOS_TXT+
  '<style:style style:name="Preformatted_20_Text" style:display-name="Preformatted Text" style:family="paragraph"><style:paragraph-properties fo:margin-left="0.5cm"/><style:text-properties style:font-name="Courier New" fo:font-size="10pt"/></style:style>'
  '<style:style style:name="Quotation" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm"/><style:text-properties fo:font-style="italic"/></style:style>'
  '<style:style style:name="Negrito" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>'
  '<style:style style:name="Italico" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>'
  '<style:style style:name="Codigo" style:family="text"><style:text-properties style:font-name="Courier New"/></style:style>')
def odt(titulo,bl):
    c=[]
    c.append('<text:p text:style-name="Heading_20_1">%s</text:p>'%E(titulo))
    def lista(items):
        o=[];n=-1
        for lv,ordn,ck,t in items:
            lv=min(lv,n+1)
            if lv>n:o.append('<text:list text:style-name="%s"><text:list-item>'%('LN' if ordn else 'LB'));n+=1
            elif lv==n:o.append('</text:list-item><text:list-item>')
            else:
                while n>lv:o.append('</text:list-item></text:list>');n-=1
                o.append('</text:list-item><text:list-item>')
            o.append('<text:p>%s%s</text:p>'%(('[x] ' if ck else '[ ] ') if ck is not None else '',_odr(t)))
        while n>=0:o.append('</text:list-item></text:list>');n-=1
        return ''.join(o)
    def rec(bl,quote=False):
        st=' text:style-name="Quotation"' if quote else ''
        for b in bl:
            k=b[0]
            if k=='h':c.append('<text:h text:style-name="Heading_20_%d" text:outline-level="%d">%s</text:h>'%(min(6,b[1]+1),min(6,b[1]+1),_odr(b[2])))
            elif k=='p':c.append('<text:p%s>%s</text:p>'%(st,_odr(b[1])))
            elif k=='img':c.append('<text:p%s>[Imagem: %s]</text:p>'%(st,E(b[1] or 'sem descricao')))
            elif k=='code':c.extend('<text:p text:style-name="Preformatted_20_Text">%s</text:p>'%E(x) for x in b[2].split('\n'))
            elif k=='table':
                n=max(len(r) for r in b[1]);t='<table:table table:name="Tabela%d"><table:table-column table:number-columns-repeated="%d"/>'%(len(c),n)
                for i,r in enumerate(b[1]):
                    row=''.join('<table:table-cell table:style-name="Tc" office:value-type="string"><text:p>%s</text:p></table:table-cell>'%(_odr(r[j]) if j<len(r) else '') for j in range(n))
                    t+=('<table:table-header-rows><table:table-row>%s</table:table-row></table:table-header-rows>' if i==0 else '<table:table-row>%s</table:table-row>')%row
                c.append(t+'</table:table>')
            elif k=='list':c.append(lista(b[1]))
            elif k=='quote':rec(b[2],True)
    rec(bl)
    auto=('<office:automatic-styles><style:style style:name="Tc" style:family="table-cell"><style:table-cell-properties fo:border="0.5pt solid #000000" fo:padding="0.1cm"/></style:style>'
          '<text:list-style style:name="LB"><text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1cm" fo:text-indent="-0.5cm" fo:margin-left="1cm"/></style:list-level-properties></text:list-level-style-bullet></text:list-style>'
          '<text:list-style style:name="LN"><text:list-level-style-number text:level="1" style:num-suffix="." style:num-format="1"><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1cm" fo:text-indent="-0.5cm" fo:margin-left="1cm"/></style:list-level-properties></text:list-level-style-number></text:list-style></office:automatic-styles>')
    cont='<?xml version="1.0" encoding="UTF-8"?><office:document-content %s>%s<office:body><office:text>%s</office:text></office:body></office:document-content>'%(NS,auto,''.join(c))
    sty='<?xml version="1.0" encoding="UTF-8"?><office:document-styles %s><office:styles>%s</office:styles></office:document-styles>'%(NS,_ESTILOS)
    mime='application/vnd.oasis.opendocument.text'
    return _od_zip(mime,[('content.xml',cont),('styles.xml',sty),('meta.xml',_meta(titulo)),('META-INF/manifest.xml',_manifest(mime))])
def odp(titulo,sl):
    pg=[]
    for i,(cls,bl,notas,ly) in enumerate(sl,1):
        tit='';corpo=[]
        for b in bl:
            if b[0]=='h' and not tit:tit=_odr(b[2]);continue
            if b[0]=='h':corpo.append('<text:p text:style-name="Sub">%s</text:p>'%_odr(b[2]))
            elif b[0]=='p':corpo.append('<text:p text:style-name="Corpo">%s</text:p>'%_odr(b[1]))
            elif b[0]=='img':corpo.append('<text:p text:style-name="Corpo">[Imagem: %s]</text:p>'%E(b[1] or 'sem descricao'))
            elif b[0]=='code':corpo.extend('<text:p text:style-name="Corpo">%s</text:p>'%E(x) for x in b[2].split('\n'))
            elif b[0]=='table':corpo.extend('<text:p text:style-name="Corpo">%s</text:p>'%E(' | '.join(plain(x) for x in r)) for r in b[1])
            elif b[0]=='list':corpo.extend('<text:p text:style-name="Corpo">%s%s%s</text:p>'%('    '*lv,'• ' if not ordn else '',_odr(t)) for lv,ordn,ck,t in b[1])
            elif b[0]=='quote':corpo.extend('<text:p text:style-name="Corpo">%s</text:p>'%E(plain(x[1])) for x in b[2] if x[0]=='p')
        pg.append('<draw:page draw:name="Slide%d" draw:master-page-name="Default">'
                  '<draw:frame svg:x="1.4cm" svg:y="0.8cm" svg:width="25.2cm" svg:height="2.4cm"><draw:text-box><text:p text:style-name="Titulo">%s</text:p></draw:text-box></draw:frame>'
                  '<draw:frame svg:x="1.4cm" svg:y="3.4cm" svg:width="25.2cm" svg:height="11cm"><draw:text-box>%s</draw:text-box></draw:frame></draw:page>'%(i,tit or E(titulo),''.join(corpo)))
    cont='<?xml version="1.0" encoding="UTF-8"?><office:document-content %s><office:body><office:presentation>%s</office:presentation></office:body></office:document-content>'%(NS,''.join(pg))
    sty=('<?xml version="1.0" encoding="UTF-8"?><office:document-styles %s><office:styles>'
         '<style:default-style style:family="paragraph"><style:text-properties fo:language="pt" fo:country="BR" style:font-name="Arial"/></style:default-style>'
         '<style:style style:name="Titulo" style:family="paragraph"><style:text-properties fo:font-size="32pt" fo:font-weight="bold"/></style:style>'
         '<style:style style:name="Sub" style:family="paragraph"><style:text-properties fo:font-size="24pt" fo:font-weight="bold"/></style:style>'
         '<style:style style:name="Corpo" style:family="paragraph"><style:text-properties fo:font-size="20pt"/></style:style>'
         '<style:style style:name="Negrito" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>'
         '<style:style style:name="Italico" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>'
         '<style:style style:name="Codigo" style:family="text"><style:text-properties style:font-name="Courier New"/></style:style>'
         '</office:styles><office:automatic-styles><style:page-layout style:name="PL1"><style:page-layout-properties fo:page-width="28cm" fo:page-height="15.75cm" fo:margin-top="0cm" fo:margin-bottom="0cm" fo:margin-left="0cm" fo:margin-right="0cm"/></style:page-layout></office:automatic-styles>'
         '<office:master-styles><style:master-page style:name="Default" style:page-layout-name="PL1"/></office:master-styles></office:document-styles>')%NS
    mime='application/vnd.oasis.opendocument.presentation'
    return _od_zip(mime,[('content.xml',cont),('styles.xml',sty),('meta.xml',_meta(titulo)),('META-INF/manifest.xml',_manifest(mime))])

# ------------------------------------------------------------------ PDF (texto simples)
def pdf(titulo,bl):
    LARG,ALT,M=595,842,56;usa=LARG-2*M;linhas=[]   # (fonte, tamanho, texto)
    def _quebra(t,n):
        o=[];l=''
        for w in t.split():
            if len(l)+len(w)+1>n and l:o.append(l);l=w
            else:l=(l+' '+w).strip()
        return o+[l]
    def quebra(t,tam,pre=''):return _quebra(pre+t,max(20,int(usa/(tam*0.55))))
    def add(f,tam,t,pre='',depois=6):
        for x in quebra(t,tam,pre):linhas.append((f,tam,x))
        linhas.append(('F1',depois,''))
    add('F2',18,titulo,depois=10)
    def rec(bl,pre=''):
        for b in bl:
            k=b[0]
            if k=='h':add('F2',{1:16,2:14}.get(b[1],12),_txt_runs(b[2]),pre,8)
            elif k=='p':add('F1',11,_txt_runs(b[1]),pre)
            elif k=='img':add('F1',11,'[Imagem: %s]'%(b[1] or 'sem descricao'),pre)
            elif k=='code':
                for x in b[2].split('\n'):linhas.append(('F3',10,pre+'    '+x[:90]))
                linhas.append(('F1',6,''))
            elif k=='table':add('F1',11,'\n'.join(' | '.join(_txt_runs(c) for c in r) for r in b[1]).replace('\n',' // '),pre)
            elif k=='list':
                n=0
                for lv,ordn,ck,t in b[1]:
                    n=n+1 if ordn else 0;add('F1',11,_txt_runs(t),pre+'  '*lv+(('%d. '%n) if ordn else '- ')+(('[x] ' if ck else '[ ] ') if ck is not None else ''),2)
            elif k=='quote':rec(b[2],pre+'> ')
    rec(bl)
    paginas=[[]];y=ALT-M
    for f,tam,t in linhas:
        h=tam*1.25
        if y-h<M:paginas.append([]);y=ALT-M
        y-=h;paginas[-1].append((f,tam,t,y))
    cp=lambda s:s.encode('cp1252','replace')
    def esc(b):return b.replace(b'\\',b'\\\\').replace(b'(',b'\\(').replace(b')',b'\\)')
    objs=[b'<< /Type /Catalog /Pages 2 0 R /Lang (pt-BR) /ViewerPreferences << /DisplayDocTitle true >> >>']
    n=len(paginas);kids=' '.join('%d 0 R'%(6+2*i) for i in range(n))
    objs.append(('<< /Type /Pages /Kids [%s] /Count %d >>'%(kids,n)).encode())
    objs.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    objs.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    objs.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>')
    for i,p in enumerate(paginas):
        c=b''.join(b'BT /%s %d Tf %d %.1f Td (%s) Tj ET\n'%(f.encode(),tam,M,y,esc(cp(t))) for f,tam,t,y in p if t)
        objs.append(('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] /Contents %d 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>'%(LARG,ALT,7+2*i)).encode())
        objs.append(b'<< /Length %d >>\nstream\n'%len(c)+c+b'endstream')
    info=len(objs)+1;objs.append(b'<< /Title <'+('\ufeff'+titulo).encode('utf-16-be').hex().encode()+b'> /Producer (Conteudista) >>')
    out=b'%PDF-1.4\n';pos=[]
    for i,o in enumerate(objs,1):pos.append(len(out));out+=b'%d 0 obj\n'%i+o+b'\nendobj\n'
    x=len(out);out+=b'xref\n0 %d\n0000000000 65535 f \n'%(len(objs)+1)+b''.join(b'%010d 00000 n \n'%p for p in pos)
    return out+b'trailer\n<< /Size %d /Root 1 0 R /Info %d 0 R >>\nstartxref\n%d\n%%%%EOF\n'%(len(objs)+1,info,x)

# ------------------------------------------------------------------ YAML e JSON
def _bloco(b):
    k=b[0]
    if k=='h':return {'tipo':'titulo','nivel':b[1],'texto':plain(b[2])}
    if k=='p':return {'tipo':'paragrafo','texto':plain(b[1])}
    if k=='img':return {'tipo':'imagem','descricao':b[1],'origem':b[2] if not b[2].startswith('data:') else '(embutida)'}
    if k=='code':return {'tipo':'codigo','linguagem':b[1],'texto':b[2]}
    if k=='table':return {'tipo':'tabela','linhas':[[plain(c) for c in r] for r in b[1]]}
    if k=='list':return {'tipo':'lista','itens':[{'nivel':lv,'ordenada':bool(o),'concluido':ck,'texto':plain(t)} for lv,o,ck,t in b[1]]}
    if k=='quote':return {'tipo':'destaque','variante':b[1],'blocos':[_bloco(x) for x in b[2]]}
    return {'tipo':k}
def estrutura(titulo,gm,sm):
    d={'titulo':titulo,'idioma':'pt-BR'}
    if gm and gm.strip():d['apostila']=[_bloco(b) for b in blocks(gm)]
    if sm and sm.strip():
        t,sl=split_slides(sm);d['apresentacao']={'titulo':t,'slides':[{'numero':i,'classe':c,'modelo':ly,'notas':n,'blocos':[_bloco(b) for b in bl]} for i,(c,bl,n,ly) in enumerate(sl,1)]}
    return d
def json_(d):return (json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
def yaml(d):
    # Strings via json.dumps: JSON e um subconjunto valido de YAML, sem risco de aspas ou dois-pontos quebrarem o arquivo.
    def sc(v):return 'null' if v is None else 'true' if v is True else 'false' if v is False else json.dumps(v,ensure_ascii=False)
    simples=lambda v:not isinstance(v,(dict,list))
    o=[]
    def em(v,ind):
        p='  '*ind
        if isinstance(v,dict):
            for k,x in v.items():
                if isinstance(x,dict) and x:o.append('%s%s:'%(p,k));em(x,ind+1)
                elif isinstance(x,list) and x and not all(simples(i) or (isinstance(i,list) and all(map(simples,i))) for i in x):o.append('%s%s:'%(p,k));em(x,ind+1)
                else:o.append('%s%s: %s'%(p,k,json.dumps(x,ensure_ascii=False) if isinstance(x,(dict,list)) else sc(x)))
        else:
            for x in v:
                if isinstance(x,dict) and x:
                    m=len(o);em(x,ind+1);o[m]=p+'- '+o[m][len(p)+2:]
                else:o.append('%s- %s'%(p,json.dumps(x,ensure_ascii=False) if isinstance(x,(dict,list)) else sc(x)))
    em(d,0);return ('\n'.join(o)+'\n').encode('utf-8')
# ------------------------------------------------------------------ Tabela de formatos
DOC={'txt':('.txt',txt),'wiki':('.wiki',wiki),'rtf':('.rtf',rtf),'pdf':('.pdf',pdf)}   # um arquivo por documento (apostila/apresentacao)
def gerar_doc(fmt,titulo,bl):return DOC[fmt][1](titulo,bl)
