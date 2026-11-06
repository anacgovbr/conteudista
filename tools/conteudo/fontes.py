import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from .contexto import aviso

FONTES_DIR=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'fontes')

LEITURAS={'atkinson':('Atkinson Hyperlegible Next','atkinson-hyperlegible-next','OFL-Atkinson-Hyperlegible-Next.txt'),
          'opendyslexic':('OpenDyslexic','opendyslexic','OFL-OpenDyslexic.txt')}

FACES=((400,'normal',''),(400,'italic','-italic'),(700,'normal',''),(700,'italic','-italic'))

PILHA_LEITURA='Verdana,Tahoma,Arial,sans-serif'

def fontes_faces(fonte):
    "Faces existentes da familia: [(peso, estilo, nome_do_arquivo, caminho)]. Face ausente gera aviso e e ignorada."
    nome,base,_=LEITURAS[fonte];r=[];faltam=[]
    for peso,estilo,suf in FACES:
        arq='%s-%d%s.woff2'%(base,peso,suf);cam=os.path.join(FONTES_DIR,arq)
        if os.path.isfile(cam):r.append((peso,estilo,arq,cam))
        else:faltam.append(arq)
    if faltam:aviso('Fonte de leitura %s: %d de 4 arquivos ausentes em tools/fontes (o texto usa %s)'%(nome,len(faltam),'Verdana' if len(faltam)==4 else 'a face disponível'))
    return r

_WOFF2_TAGS=('cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx '
             'BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG  sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty '
             'just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill').replace('cvt  ','cvt_ ').replace('CFF  ','CFF_ ').replace('SVG  ','SVG_ ').split()

def woff2_tabelas(b):
    "Etiquetas das tabelas de um WOFF2, lidas do diretório (não precisa descompactar). Lista vazia se o arquivo não for WOFF2 válido."
    if len(b)<48 or b[:4]!=b'wOF2':return []
    n=int.from_bytes(b[12:14],'big');i=48;tags=[]
    def base128(i):
        v=0
        for _ in range(5):
            if i>=len(b):raise ValueError
            c=b[i];i+=1;v=(v<<7)|(c&0x7f)
            if not c&0x80:return v,i
        raise ValueError
    try:
        for _ in range(n):
            fl=b[i];i+=1
            if fl&0x3f==0x3f:tag=b[i:i+4].decode('latin-1');i+=4
            else:tag=_WOFF2_TAGS[fl&0x3f].replace('_',' ')
            _,i=base128(i);tv=(fl>>6)&3
            if (tag in('glyf','loca') and tv==0) or (tag not in('glyf','loca') and tv!=0):_,i=base128(i)
            tags.append(tag)
    except (ValueError,IndexError):return []
    return tags

def fontes_faces_unicas(fonte):
    """Como fontes_faces, mas sem repetir arquivo: se dois pesos do mesmo estilo têm o mesmo conteúdo e a fonte é variável
    (tabela fvar), sai uma face só com faixa de peso (ex.: '400 700'); o navegador aplica o peso pelo eixo wght.
    Se o conteúdo for igual e a fonte NÃO for variável, o negrito não existe de fato: gera aviso e mantém só o peso 400.
    Retorna [(peso_css, estilo, arquivo, caminho)]."""
    nome=LEITURAS[fonte][0];grupos={}
    for peso,estilo,arq,cam in fontes_faces(fonte):
        h=hashlib.sha256(open(cam,'rb').read()).hexdigest()
        grupos.setdefault((estilo,h),[]).append((peso,arq,cam))
    r=[]
    for (estilo,_),it in grupos.items():
        it.sort();pesos=[p for p,_,_ in it];_,arq,cam=it[0]
        if len(it)==1:r.append((str(pesos[0]),estilo,arq,cam));continue
        if 'fvar' in woff2_tabelas(open(cam,'rb').read()):r.append(('%d %d'%(min(pesos),max(pesos)),estilo,arq,cam))
        else:
            aviso('Fonte de leitura %s (%s): os arquivos dos pesos %s são iguais e a fonte não é variável; o negrito será simulado pelo navegador. Rode tools/fontes/baixar-fontes.ps1.'%(nome,estilo,', '.join(map(str,pesos))))
            r.append((str(pesos[0]),estilo,arq,cam))
    return sorted(r,key=lambda x:(x[1]!='normal',x[0]))

_FONTES_CSS=None

def fontes_css():
    "@font-face em base64 (Atkinson Hyperlegible Next e OpenDyslexic) + variavel --leitura. Calculado uma vez por execucao."
    global _FONTES_CSS
    if _FONTES_CSS is None:
        o=[]
        for fonte,(nome,base,_) in LEITURAS.items():
            for peso,estilo,arq,cam in fontes_faces_unicas(fonte):
                o.append('@font-face{font-family:"%s";src:url(data:font/woff2;base64,%s) format("woff2");font-weight:%s;font-style:%s;font-display:swap}'
                         %(nome,base64.b64encode(open(cam,'rb').read()).decode(),peso,estilo))
        o.append(':root{--leitura:%s}html[data-leitura="padrao"]{--leitura:%s}'%(PILHA_LEITURA,PILHA_LEITURA))
        o.append('html[data-leitura="atkinson"]{--leitura:"Atkinson Hyperlegible Next",%s}html[data-leitura="opendyslexic"]{--leitura:"OpenDyslexic",%s}'%(PILHA_LEITURA,PILHA_LEITURA))
        _FONTES_CSS='\n'.join(o)+'\n'
    return _FONTES_CSS


def reiniciar_fontes():
    global _FONTES_CSS
    _FONTES_CSS = None
