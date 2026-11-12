import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from .contexto import aviso, decorativa
from . import licencas
from .imagens import img_bytes, img_size
from .markdown import blocks, mermaid_edges, runs, sem_comentarios
from .temas import tema_de, thex, trgb, eh_personalizado, hex_legado

def treinamento_docx(md,path,foot,tema=None,licenca=''):
    # Os temas ANAC 20 anos alteram somente a apresentação; o DOCX permanece no padrão gov.br.
    # Leitura acessível (1.66): o DOCX é único, em Verdana 12 pt, entrelinha 1,5 e 6 pt após; T['docx_font'] não escolhe mais a fonte.
    T=tema_de('govbr' if str(tema or '').startswith('anac20-') else tema);custom=eh_personalizado(T)
    H=lambda h:hex_legado(h,T) if custom else thex(h,T);C=lambda h:trgb(h,T) if not custom else trgb(hex_legado(h,T),T);FONTE='Verdana'
    from docx import Document
    from docx.shared import Pt,RGBColor,Cm
    from docx.enum.text import WD_BREAK
    from docx.oxml.ns import qn
    def novo_num(doc):
        "Cria uma numeracao nova (reiniciada em 1) para cada lista numerada; sem isso o Word continua a contagem da lista anterior."
        sn=doc.styles['List Number'].element.pPr.numPr.numId.val
        nums=doc.part.numbering_part.numbering_definitions._numbering
        ab=[int(n.find(qn('w:abstractNumId')).get(qn('w:val'))) for n in nums.findall(qn('w:num')) if int(n.get(qn('w:numId')))==sn][0]
        n=nums.add_num(ab);n.add_lvlOverride(ilvl=0).add_startOverride(1);return n.numId
    def aplica_num(p,nid):
        np_=p._p.get_or_add_pPr().get_or_add_numPr();np_.get_or_add_ilvl().val=0;np_.get_or_add_numId().val=nid
    from docx.oxml import OxmlElement
    PRI=C('0B3D6E');ACC=C('0A7CC1')
    d=Document();sec=d.sections[0];sec.page_height=Cm(29.7);sec.page_width=Cm(21)
    for a in('left_margin','right_margin'):setattr(sec,a,Cm(2.2))
    sec.top_margin=Cm(2);sec.bottom_margin=Cm(2)
    stl=d.styles['Normal'];stl.font.name=FONTE;stl.font.size=Pt(12)
    pf=stl.paragraph_format;pf.line_spacing=1.5;pf.space_before=Pt(0);pf.space_after=Pt(6);pf.widow_control=True
    stl.element.rPr.rFonts.set(qn('w:eastAsia'),FONTE);stl.element.rPr.rFonts.set(qn('w:cs'),FONTE)
    def lang_pt(rpr):
        for x in rpr.findall(qn('w:lang')):rpr.remove(x)
        lg=OxmlElement('w:lang');lg.set(qn('w:val'),'pt-BR');lg.set(qn('w:eastAsia'),'pt-BR');lg.set(qn('w:bidi'),'pt-BR');rpr.append(lg)
    lang_pt(stl.element.get_or_add_rPr());d.core_properties.language='pt-BR'
    for nm,sz in(('Title',24),('Heading 1',16),('Heading 2',13),('Heading 3',12)):
        s=d.styles[nm];s.font.name=FONTE;s.font.size=Pt(sz);s.font.color.rgb=PRI;s.font.bold=True
    if True:  # força Verdana também nos títulos e listas (remove a fonte do tema do Word)
        for nm in('Title','Heading 1','Heading 2','Heading 3','List Bullet','List Number'):
            try:
                st_=d.styles[nm];st_.font.name=FONTE;rf=st_.element.get_or_add_rPr().get_or_add_rFonts()
                for at in('w:asciiTheme','w:hAnsiTheme','w:eastAsiaTheme','w:cstheme'):rf.attrib.pop(qn(at),None)
                rf.set(qn('w:eastAsia'),FONTE);rf.set(qn('w:cs'),FONTE)
            except KeyError:pass
        rf=stl.element.rPr.rFonts;rf.set(qn('w:eastAsia'),FONTE)
    def shade(el,fill):
        pr=el.get_or_add_tcPr() if hasattr(el,'get_or_add_tcPr') else el.get_or_add_pPr()
        sh=OxmlElement('w:shd');sh.set(qn('w:val'),'clear');sh.set(qn('w:color'),'auto');sh.set(qn('w:fill'),fill);pr.append(sh)
    def lborder(p,color):
        pPr=p._p.get_or_add_pPr();b=OxmlElement('w:pBdr');l=OxmlElement('w:left')
        for k,v in(('val','single'),('sz','24'),('space','8'),('color',color)):l.set(qn('w:'+k),v)
        b.append(l);pPr.append(b)
    def link(p,text,url,bold=False,size=None):
        r_id=p.part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True)
        h=OxmlElement('w:hyperlink');h.set(qn('r:id'),r_id);r=OxmlElement('w:r');rp=OxmlElement('w:rPr')
        c=OxmlElement('w:color');c.set(qn('w:val'),H('0A7CC1'));u=OxmlElement('w:u');u.set(qn('w:val'),'single');rp.append(c);rp.append(u)
        if bold:rp.append(OxmlElement('w:b'))
        if size:
            z=OxmlElement('w:sz');z.set(qn('w:val'),str(int(size*2)));rp.append(z)
        r.append(rp);t=OxmlElement('w:t');t.text=text;t.set(qn('xml:space'),'preserve');r.append(t);h.append(r);p._p.append(h)
    def pic(run,src,maxcm=16.0,hcm=None,alt='',decor=False):
        raw=img_bytes(src)
        if raw is None:run.text='[imagem%s]'%(': '+alt if alt else '');return False
        w,h=img_size(raw)
        try:
            if hcm:shp=run.add_picture(io.BytesIO(raw),height=Cm(hcm))
            else:shp=run.add_picture(io.BytesIO(raw),width=Cm(min(maxcm,w/96*2.54)))
            # texto alternativo: vem do Markdown; vazio continua vazio (não se inventa descrição) e gera aviso
            dp=shp._inline.docPr;dp.set('descr',alt or '');dp.set('title',alt or '')
            if not alt and not decor:aviso('Imagem sem descrição (texto alternativo vazio) na apostila DOCX.')
            return True
        except Exception:run.text='[imagem]';return False
    def fill(p,t,color=None,size=None,bold=False):
        for x,b,i,c,u in runs(t):
            if c==2:
                decor=decorativa(u,x);pic(p.add_run(),u,hcm=0.5,alt='' if decor else x,decor=decor);continue
            if u:link(p,x,u,b,size);continue
            r=p.add_run(x);r.bold=bool(b) or bold;r.italic=bool(i)
            if c:r.font.name='Consolas';r.font.size=Pt(10);r.font.color.rgb=PRI
            if color is not None:r.font.color.rgb=color
            if size:r.font.size=Pt(size)
    def table(rows):
        nc=max(len(r) for r in rows);tb=d.add_table(rows=len(rows),cols=nc);tb.style='Table Grid'
        for ri,r in enumerate(rows):
            for ci in range(nc):
                cell=tb.cell(ri,ci);cell.text='';p=cell.paragraphs[0];p.paragraph_format.space_after=Pt(0);p.paragraph_format.line_spacing=1.15
                fill(p,r[ci] if ci<len(r) else '',size=10.5,bold=(ri==0))
                if ri==0:
                    shade(cell._tc,H('EAF1F8'))
                    for x in p.runs:x.font.color.rgb=PRI
        tr=tb.rows[0]._tr;trPr=tr.get_or_add_trPr();h=OxmlElement('w:tblHeader');h.set(qn('w:val'),'true');trPr.append(h)
        d.add_paragraph().paragraph_format.space_after=Pt(2)
    def render(bl,inq=None):
        for b in bl:
            k=b[0]
            if k=='h':
                if b[1]==1:
                    p=d.add_paragraph(style='Title');fill(p,b[2],color=PRI);continue
                if b[1]==2 and 'gabarito' in b[2].lower():d.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
                p=d.add_heading(level=min(b[1]-1,3));fill(p,b[2])
                for r in p.runs:r.font.color.rgb=PRI if b[1]==2 else ACC
            elif k=='p':
                p=d.add_paragraph();fill(p,b[1])
                if inq:shade(p._p,inq[0]);lborder(p,inq[1])
            elif k=='img':
                decor=decorativa(b[2],b[1]);p=d.add_paragraph();p.alignment=1;pic(p.add_run(),b[2],alt='' if decor else b[1],decor=decor)
                if b[1] and not decor:
                    c=d.add_paragraph();c.alignment=1;r=c.add_run(b[1]);r.italic=True;r.font.size=Pt(9)
            elif k=='table':table(b[1])
            elif k=='list':
                nid=None
                for dp,od,ck,t in b[1]:
                    if ck is not None:
                        p=d.add_paragraph();p.paragraph_format.left_indent=Cm(0.6+0.6*dp);p.add_run(('☒ ' if ck else '☐ ')).font.size=Pt(12);fill(p,t)
                    else:
                        st='List Number' if od else 'List Bullet'
                        if dp:st+=' %d'%(min(dp,2)+1)
                        p=d.add_paragraph(style=st);fill(p,t)
                        if od and not dp:
                            if nid is None:nid=novo_num(d)
                            aplica_num(p,nid)
                    p.paragraph_format.space_after=Pt(6)
                    if inq:shade(p._p,inq[0]);lborder(p,inq[1])
            elif k=='quote':
                col={'tip':(H('E9F6F0'),H('1E7B4F')),'warning':(H('FFF4E0'),H('9A5B00'))}.get(b[1],(H('EAF1F8'),H('0A7CC1')))
                render(b[2],col)
            elif k=='code':
                if b[1]=='mermaid':
                    p=d.add_paragraph();r=p.add_run('Fluxo (representação em tabela):');r.bold=True;r.font.color.rgb=ACC
                    table(mermaid_edges(b[2]))
                else:
                    p=d.add_paragraph();p.paragraph_format.line_spacing=1.15;r=p.add_run(b[2]);r.font.name='Consolas';r.font.size=Pt(9.5);shade(p._p,H('F1F4F8'))
    bl=blocks(sem_comentarios(md))
    hi=next((i for i,x in enumerate(bl) if x[0]=='h' and x[1]==2),len(bl))
    render(bl[:hi])
    p=d.add_paragraph();r=p.add_run('Sumário');r.bold=True;r.font.size=Pt(14);r.font.color.rgb=PRI
    p=d.add_paragraph();r=p.add_run()
    for tag,txt in(('begin',None),(None,'TOC \\o "1-2" \\h \\z \\u'),('separate',None),(None,None),('end',None)):
        if tag:
            f=OxmlElement('w:fldChar');f.set(qn('w:fldCharType'),tag);r._r.append(f)
        elif txt:
            it=OxmlElement('w:instrText');it.set(qn('xml:space'),'preserve');it.text=txt;r._r.append(it)
        else:
            t=OxmlElement('w:t');t.text='Clique com o botão direito e escolha "Atualizar campo" para gerar o sumário.';r._r.append(t)
    d.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    render(bl[hi:])
    if licenca:
        info=licencas.LICENCAS[licencas.validar(licenca)]
        h=d.add_heading('Licenciamento',level=2)
        for r in h.runs:r.font.color.rgb=PRI
        p=d.add_paragraph();p.paragraph_format.keep_together=True
        p.add_run(licencas.frase_declarativa(licenca)+' Consulte a licenca: ')
        link(p,info['url'],info['url'])
        nota=d.add_paragraph(licencas.RESSALVA);nota.paragraph_format.keep_together=True
        for r in nota.runs:r.font.color.rgb=C('5A6676')
    fp=sec.footer.paragraphs[0];fp.text=foot or ' ';fp.runs[0].font.size=Pt(8);fp.runs[0].font.color.rgb=C('5A6676')
    s=d.settings.element;u=OxmlElement('w:updateFields');u.set(qn('w:val'),'true');s.append(u)
    for r_ in list(d.element.body.iter(qn('w:r')))+list(sec.footer._element.iter(qn('w:r'))):  # idioma pt-BR em todos os trechos (texto, links, tabelas, legendas)
        rpr=r_.find(qn('w:rPr'))
        if rpr is None:rpr=OxmlElement('w:rPr');r_.insert(0,rpr)
        lang_pt(rpr)
    d.save(path)
