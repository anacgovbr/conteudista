import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from .audio import MIME_AUDIO, _icone_som, _mp3_dur, _wav_dur
from .contexto import aviso, decorativa
from . import licencas
from .imagens import img_bytes, img_size
from .markdown import mermaid_edges, plain, runs
from .temas import tema_de, thex, paleta, eh_personalizado, papeis_slides, contraste, hex_legado

def _imagem_bytes(src):
    "Imagem de fundo do tema: data URI (editor) ou arquivo institucional em tools/temas."
    src=str(src or '')
    if src.startswith('data:image/'):
        try:return base64.b64decode(src.split(',',1)[1])
        except Exception:return None
    m=re.match(r'^temas/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$',src)
    if m:
        cam=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'temas',m.group(1),m.group(2))
        if os.path.isfile(cam):return open(cam,'rb').read()
    return None

def slides_pptx(t,sl,path,foot,tema=None,audios=None,avancar=False,duracoes=None,licenca=''):
    T=tema_de(tema);custom=eh_personalizado(T);PAL=paleta(T);FONTE=T['pptx_font']
    FONTE_TITULO=(T['fontes']['titulo'].split(',')[0].strip("'\" ") if custom else FONTE)
    from pptx import Presentation
    from pptx.util import Inches,Pt
    from pptx.dml.color import RGBColor
    def H(h):return hex_legado(h,T) if custom else thex(h,T)
    def C(h):return RGBColor.from_string(H(h))
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import MSO_ANCHOR
    from pptx.enum.lang import MSO_LANGUAGE_ID
    PT_BR=MSO_LANGUAGE_ID.BRAZILIAN_PORTUGUESE
    MIN_CORPO=16  # leitura acessível (1.66): corpo nunca abaixo de 16 pt; tabelas, código e legendas no mínimo 12 pt
    def alt_pic(pic,alt,decorativa=False):
        "Texto alternativo da imagem; fundo do modelo é marcado como decorativo (descr vazio)."
        c=pic._element.nvPicPr.cNvPr;c.set('descr',alt or '');c.set('title',alt or '')
        if decorativa:
            from pptx.oxml import parse_xml
            c.append(parse_xml('<a:extLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}">'
                               '<adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/></a:ext></a:extLst>'))
        elif not alt:aviso('Imagem sem descrição (texto alternativo vazio) na apresentação PPTX.')
    def esp(par,linha,depois):par.line_spacing=linha;par.space_after=Pt(depois)
    PRI=C('0B3D6E');ACC=C('0A7CC1');AC2=C('19A974');INK=C('1B2430')
    WH=C('FFFFFF');MU=C('5A6676');SOFT=C('EEF4FA');DEST=RGBColor.from_string(T['pptx_destaque']) if T.get('pptx_destaque') else AC2
    modelo=T.get('pptx_modelo'); escuro=bool(T.get('pptx_escuro'))
    if modelo:
        # Paleta extraída dos arquivos oficiais de referência ANAC 20 anos.
        PRI=RGBColor.from_string('FFFFFF' if escuro else '163B57');ACC=RGBColor.from_string('D5A900');AC2=RGBColor.from_string('16B8C4')
        INK=RGBColor.from_string('FFFFFF' if escuro else '1F3545');WH=RGBColor.from_string('FFFFFF');MU=RGBColor.from_string('DCE8EE' if escuro else '607786');SOFT=RGBColor.from_string('14334A' if escuro else 'EFF7FA')
    P=Presentation();P.slide_width=Inches(13.333);P.slide_height=Inches(7.5);W=13.333;L=0.62;CW=W-2*L
    papeis=papeis_slides(sl,bool(licenca)) if custom else None
    pos=T.get('posicoes') or {}
    def px(v):return max(0.15,float(v or 0)/96.0)
    if custom:
        L=px(pos.get('margem',60));CW=W-2*L
    n_original=len(sl)
    if licenca:sl=list(sl)+[('licenciamento',licencas.blocos_slide(licenca),'')]
    pasta_modelo=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'temas',modelo) if modelo else ''
    def fundo_anac(s,idx,cls):
        if not modelo:return False
        if cls=='title' and idx==0:nome='capa.png'
        elif cls=='title' and idx==n_original-1:nome='encerramento.png'
        else:nome='conteudo-%s.png'%('a' if idx%2 else 'b')
        cam=os.path.join(pasta_modelo,nome)
        if os.path.isfile(cam):alt_pic(s.shapes.add_picture(cam,0,0,width=Inches(W),height=Inches(7.5)),'',True);return True
        return False
    def rect(s,x,y,w,h,col,shape=MSO_SHAPE.RECTANGLE):
        r=s.shapes.add_shape(shape,Inches(x),Inches(y),Inches(w),Inches(h));r.fill.solid();r.fill.fore_color.rgb=col;r.line.fill.background();r.shadow.inherit=False;return r
    def _alpha(shape,pct):
        "Transparência do véu sobre a imagem de fundo (0–100)."
        from pptx.oxml import parse_xml
        from pptx.oxml.ns import qn
        sf=shape.fill._xPr.find(qn('a:solidFill'))
        clr=sf.find(qn('a:srgbClr')) if sf is not None else None
        if clr is None:return
        for velho in clr.findall(qn('a:alpha')):clr.remove(velho)
        clr.append(parse_xml('<a:alpha xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" val="%d"/>'%int(pct*1000)))
    def fundo_custom(s,papel):
        "Fundo do papel de tela: cor, imagem (cover) e véu da cor de fundo conforme a opacidade."
        tela=T['telas'].get(papel) or T['telas']['interna_clara']
        rect(s,0,0,W,7.5,C(tela['fundo']))
        raw=_imagem_bytes(tela.get('imagem'))
        if raw:
            iw,ih=img_size(raw)
            if iw/max(ih,1)>W/7.5:
                ww,hh=7.5*iw/max(ih,1),7.5
                x={'left':0,'right':W-ww}.get(tela.get('imagem_posicao'),(W-ww)/2);y=0
            else:
                ww,hh=W,W*ih/max(iw,1)
                x=0;y={'top':0,'bottom':7.5-hh}.get(tela.get('imagem_posicao'),(7.5-hh)/2)
            alt_pic(s.shapes.add_picture(io.BytesIO(raw),Inches(x),Inches(y),width=Inches(ww),height=Inches(hh)),'',True)
            op=max(0,min(100,int(tela.get('imagem_opacidade',100))))
            if op<100:_alpha(rect(s,0,0,W,7.5,C(tela['fundo'])),100-op)
        return tela
    def addruns(par,t,size,color,bold=False,fonte=None):
        for x,b,i,c,u in runs(t):
            if c==2:decorativa(u,x);x='[%s]'%(x or 'imagem');u=None;c=0
            r=par.add_run();r.text=x;f=r.font;f.size=Pt(size);f.bold=bool(b) or bold;f.italic=bool(i);f.name='Consolas' if c else (fonte or FONTE);f.language_id=PT_BR
            f.color.rgb=ACC if (u and color==INK) else (PRI if (b and color==INK) else color)
            if u:r.hyperlink.address=u;f.underline=True
    def tbox(s,x,y,w,h):
        tb=s.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h));tf=tb.text_frame;tf.word_wrap=True
        for a in('margin_left','margin_right','margin_top','margin_bottom'):setattr(tf,a,Inches(0.04))
        return tb,tf
    def lines(t,size,width):
        cpl=max(10,int(width*72/(size*0.60)));return max(1,-(-len(plain(t))//cpl))
    def est(b,size):
        k=b[0];lh=size*1.42/72
        if k=='p':return lines(b[1],size,CW)*lh+0.08
        if k=='list':return sum(lines(x[3],size-2*min(x[0],1),CW-0.4-0.3*x[0])*lh+0.08 for x in b[1])+0.12
        if k=='table':
            nc=len(b[1][0]);cw=CW/nc;ts=size-3
            return sum(max(lines(c,ts,cw-0.2) for c in r)*ts*1.4/72+0.16 for r in b[1])+0.18
        if k=='quote':return sum(est(x,size-1) for x in b[2])+0.32
        if k=='code':return est(('table',mermaid_edges(b[2])),size) if b[1]=='mermaid' else len(b[2].split('\n'))*0.22+0.2
        if k=='h':return 0.5
        if k=='img':
            raw=img_bytes(b[2])
            if raw is None:return 0.4
            w,h=img_size(raw);hh=min(4.6,CW*h/max(w,1),h/96)
            return hh+(0.35 if b[1] else 0)+0.1
        return 0.4
    def draw(s,b,y,size,col,x=L,w=CW):
        k=b[0];h=est(b,size)
        if k=='p':
            tb,tf=tbox(s,x,y,w,h);esp(tf.paragraphs[0],1.2,6);addruns(tf.paragraphs[0],b[1],size,col)
        elif k=='h':
            tb,tf=tbox(s,x,y,w,h);esp(tf.paragraphs[0],1.1,4);addruns(tf.paragraphs[0],b[2],size+4,ACC if col==INK else col,True,FONTE_TITULO)
        elif k=='list':
            tb,tf=tbox(s,x,y,w,h);n=0
            for dp,od,ck,t in b[1]:
                p=tf.paragraphs[0] if n==0 else tf.add_paragraph();n+=1
                esp(p,1.2,6);sz=max(MIN_CORPO,size-2*min(dp,1))
                bullet=('☑ ' if ck else '☐ ') if ck is not None else ('%d. '%n if od and dp==0 else '• ' if dp==0 else '– ')
                r=p.add_run();r.text='    '*dp+bullet;r.font.size=Pt(sz);r.font.bold=True;r.font.color.rgb=ACC if col==INK else col;r.font.name=FONTE;r.font.language_id=PT_BR
                addruns(p,t,sz,col)
        elif k=='table':
            rows=b[1];nc=max(len(r) for r in rows);ts=max(12,size-3)
            gt=s.shapes.add_table(len(rows),nc,Inches(x),Inches(y),Inches(w),Inches(h-0.1)).table
            gt.first_row=True;gt.horz_banding=True  # cabeçalho estrutural (firstRow), não só visual
            for ri,r in enumerate(rows):
                for ci in range(nc):
                    c=gt.cell(ri,ci);c.margin_left=c.margin_right=Inches(0.08);c.margin_top=c.margin_bottom=Inches(0.04)
                    tf=c.text_frame;tf.word_wrap=True;tf.paragraphs[0].text='';esp(tf.paragraphs[0],1.1,0)
                    addruns(tf.paragraphs[0],r[ci] if ci<len(r) else '',ts,WH if ri==0 else INK,ri==0)
                    c.fill.solid();c.fill.fore_color.rgb=PRI if ri==0 else (SOFT if ri%2==0 else WH)
        elif k=='quote':
            if custom:
                bg=C(PAL['suave']);bd={'info':ACC,'tip':AC2,'warning':C(PAL['alerta'])}.get(b[1],AC2)
            else:
                bg,bd={'info':(C('EAF1F8'),C('0A7CC1')),'tip':(C('E9F6F0'),C('1E7B4F')),'warning':(C('FFF4E0'),C('9A5B00'))}.get(b[1],(C('E9F6F0'),AC2))
            rect(s,x,y,w,h-0.05,bg);rect(s,x,y,0.08,h-0.05,bd)
            yy=y+0.1
            for q in b[2]:draw(s,q,yy,max(MIN_CORPO,size-1),col,x+0.2,w-0.3);yy+=est(q,max(MIN_CORPO,size-1))
        elif k=='img':
            raw=img_bytes(b[2])
            if raw is None:
                tb,tf=tbox(s,x,y,w,0.4);addruns(tf.paragraphs[0],'[imagem: %s]'%(b[1] or 'sem descrição'),size,col)
            else:
                iw,ih=img_size(raw);hh=min(4.6,w*ih/max(iw,1),ih/96);ww=hh*iw/max(ih,1)
                decor=decorativa(b[2],b[1])
                alt_pic(s.shapes.add_picture(io.BytesIO(raw),Inches(x+(w-ww)/2),Inches(y),Inches(ww),Inches(hh)),'' if decor else b[1],decor)
                if b[1]:
                    tb,tf=tbox(s,x,y+hh+0.03,w,0.32);tf.paragraphs[0].alignment=2;addruns(tf.paragraphs[0],b[1],12,col if custom else MU)
        elif k=='code':
            if b[1]=='mermaid':draw(s,('table',mermaid_edges(b[2])),y,size,col,x,w)
            else:
                tb,tf=tbox(s,x,y,w,h);r=tf.paragraphs[0].add_run();r.text=b[2];r.font.name='Consolas';r.font.size=Pt(12);r.font.color.rgb=col;r.font.language_id=PT_BR
        return h
    for idx,(cls,bl,notes) in enumerate(sl):
        s=P.slides.add_slide(P.slide_layouts[6])
        if custom:
            papel=papeis[idx];tela=fundo_custom(s,papel);istitle=papel in ('capa','finalizacao')
            rect(s,0,0,0.12,7.5,DEST);cor_txt=C(tela['texto'])
        else:
            istitle=cls=='title';tem_fundo=fundo_anac(s,idx,cls)
            if not tem_fundo:
                if istitle:rect(s,0,0,W,7.5,PRI);rect(s,0,0,0.15,7.5,DEST)
                else:
                    if cls=='highlight':rect(s,0,0,W,7.5,C('F2F7FC'))
                    rect(s,0,0,0.15,7.5,PRI)
        h1=[b for b in bl if b[0]=='h' and b[1]==1];rest=[b for b in bl if not(b[0]=='h' and b[1]==1)]
        if istitle:
            sub=[b for b in rest if b[0]=='h'];body=[b for b in rest if b[0]!='h'];y=2.2
            if custom:
                L0=min(W-1.2,L+(float(tela.get('titulo_deslocamento_x',0))/100.0)*CW)
                CW0=max(1.5,min(W-L0-0.3,CW*(float(tela.get('titulo_largura',100))/100.0)))
                y=max(0.5,min(4.6,2.2+float(tela.get('titulo_deslocamento_y',0))/100.0*3.0))
                fs_t=max(28,min(60,round(float(T['fontes']['tamanho_titulo'])*1.15)))
                fs_sub=max(18,min(32,round(float(T['fontes']['tamanho_h2'])*1.05)))
                fs_body=max(16,min(24,round(float(T['fontes']['tamanho_base'])*0.9)))
            elif modelo and idx==0:L0=5.15;CW0=7.35
            elif modelo and idx==len(sl)-1:L0=0.85;CW0=11.63;y=4.65
            else:L0=L;CW0=CW
            if h1:
                tb,tf=tbox(s,L0,y,CW0,1.3);tf.vertical_anchor=MSO_ANCHOR.BOTTOM;esp(tf.paragraphs[0],1.1,0)
                addruns(tf.paragraphs[0],h1[0][2],fs_t if custom else 50,cor_txt if custom else (WH if not modelo or escuro else PRI),True,FONTE_TITULO);y+=1.4
                rect(s,L0,y,min(CW0,len(plain(h1[0][2]))*0.36),0.06,DEST);y+=0.25
            for b in sub:
                tb,tf=tbox(s,L0,y,CW0,0.7);addruns(tf.paragraphs[0],b[2],fs_sub if custom else 28,cor_txt if custom else (C('D6ECFF') if not modelo else (WH if escuro else INK)),True,FONTE_TITULO);y+=0.75
            for b in body:y+=draw(s,b,y,fs_body if custom else 20,cor_txt if custom else ((WH if escuro else INK) if modelo else C('E8F2FB')),L0,CW0)
        else:
            if custom:
                y=max(0.3,px(pos.get('topo',44)))
                if h1:
                    fs=max(24,min(44,round(float(T['fontes']['tamanho_titulo'])*0.85)))
                    tb,tf=tbox(s,L,y,CW,0.9);tf.vertical_anchor=MSO_ANCHOR.BOTTOM;esp(tf.paragraphs[0],1.1,0);addruns(tf.paragraphs[0],h1[0][2],fs,cor_txt,True,FONTE_TITULO);y+=0.95
                    rect(s,L,y,CW,0.05,DEST);y+=0.25
                avail=max(0.8,7.5-px(pos.get('base',60))-y);size=max(MIN_CORPO,min(28,round(float(T['fontes']['tamanho_base']))))
                while size>MIN_CORPO and sum(est(b,size) for b in rest)>avail:size-=1
                for b in rest:y+=draw(s,b,y,size,cor_txt)
            else:
                y=0.62 if modelo else 0.45
                if h1:
                    tb,tf=tbox(s,L,y,CW,0.9);tf.vertical_anchor=MSO_ANCHOR.BOTTOM;esp(tf.paragraphs[0],1.1,0);addruns(tf.paragraphs[0],h1[0][2],34,PRI,True,FONTE_TITULO);y+=0.95
                    rect(s,L,y,CW,0.05,ACC);y+=0.25
                avail=6.75-y;size=22
                while size>MIN_CORPO and sum(est(b,size) for b in rest)>avail:size-=1  # se não couber em 16 pt, o texto flui (não volta a 12 pt)
                for b in rest:y+=draw(s,b,y,size,INK)
        cor_rod=cor_txt if custom else ((WH if modelo and escuro else MU) if modelo else (C('CFE3F5') if istitle else MU))
        tb,tf=tbox(s,L,7.05,8,0.3);addruns(tf.paragraphs[0],foot,11,cor_rod)
        tb,tf=tbox(s,W-1.5,7.05,1,0.3);addruns(tf.paragraphs[0],'%d / %d'%(idx+1,len(sl)),11,cor_rod)
        if notes:
            ntf=s.notes_slide.notes_text_frame;ntf.text=notes
            for pp in ntf.paragraphs:
                for rr in pp.runs:rr.font.language_id=PT_BR
        if audios and idx<n_original and idx in audios:
            try:_pptx_audio(s,audios[idx],W,avancar,(duracoes or {}).get(idx))
            except Exception as e:print('AVISO: narração do slide %d não incluída no PPTX: %s'%(idx+1,e))
    P.core_properties.title=t;P.core_properties.language='pt-BR';P.save(path)

def _pptx_audio(s,cam,W,avancar,dur=None):
    """Embute o áudio no slide (início automático, ícone fora da área visível) e, se pedido, avança o slide ao fim."""
    from pptx.media import Video
    from pptx.oxml import parse_xml
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    from pptx.util import Inches
    ext=os.path.splitext(cam)[1].lower();mime=MIME_AUDIO.get(ext,'audio/mpeg');dados=open(cam,'rb').read()
    part=s.part;media=Video.from_blob(dados,mime,'narracao'+ext)
    mp=part.package.get_or_add_media_part(media)
    r_media=part.relate_to(mp,RT.MEDIA);r_audio=part.relate_to(mp,RT.AUDIO)
    _,r_img=part.get_or_add_image_part(io.BytesIO(_icone_som()))
    tree=s.shapes._spTree;sid=max([int(x) for x in tree.xpath('//p:cNvPr/@id')]+[1])+1
    x,y,tam=Inches(W+0.3),Inches(0.3),Inches(0.4)
    pic=parse_xml(('<p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      '<p:nvPicPr><p:cNvPr id="%d" name="Narração" descr="Narração do slide"><a:hlinkClick r:id="" action="ppaction://media"/></p:cNvPr><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>'
      '<p:nvPr><a:audioFile r:link="%s"/><p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}"><p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="%s"/></p:ext></p:extLst></p:nvPr></p:nvPicPr>'
      '<p:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
      '<p:spPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')%(sid,r_audio,r_media,r_img,x,y,tam,tam))
    tree.append(pic)
    sld=s._element
    for velho in sld.xpath('./p:transition|./p:timing'):sld.remove(velho)
    ns='xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
    novos=[]
    dur=dur or (_wav_dur(dados) if ext=='.wav' else _mp3_dur(dados) if ext=='.mp3' else None)
    if avancar and dur:novos.append(parse_xml('<p:transition %s advTm="%d"/>'%(ns,int(dur*1000)+800)))
    novos.append(parse_xml(('<p:timing %s><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
      '<p:par><p:cTn id="2" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
      '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
      '<p:par><p:cTn id="4" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="afterEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
      '<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="5" dur="%d" fill="hold"/><p:tgtEl><p:spTgt spid="%d"/></p:tgtEl></p:cBhvr></p:cmd>'
      '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>'
      '<p:audio><p:cMediaNode vol="80000"><p:cTn id="6" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst>'
      '<p:endCondLst><p:cond evt="onStopAudio" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst></p:cTn><p:tgtEl><p:spTgt spid="%d"/></p:tgtEl></p:cMediaNode></p:audio>'
      '</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>')%(ns,int((dur or 1)*1000),sid,sid)))
    ext_=sld.xpath('./p:extLst')
    for el in novos:
        if ext_:ext_[0].addprevious(el)
        else:sld.append(el)
