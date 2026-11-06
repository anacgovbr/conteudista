import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape

def _narr(narr):
    """Normaliza a configuração de narração: {'html':{idx:caminho},'pptx':{idx:caminho},'avancar':bool,'duracoes':{idx:s}}."""
    if not narr:return {'html':{},'pptx':{},'avancar':False,'duracoes':{}}
    if isinstance(narr,str):
        import json as _j;narr=_j.loads(narr) if narr.strip() else {}
    f=lambda d:{int(k):v for k,v in (d or {}).items() if v and os.path.isfile(v)}
    dur={}
    for k,v in (narr.get('duracoes') or {}).items():
        try:dur[int(k)]=float(v)
        except Exception:pass
    return {'html':f(narr.get('html')),'pptx':f(narr.get('pptx')),'avancar':bool(narr.get('avancar')),'duracoes':dur}

MIME_AUDIO={'.mp3':'audio/mpeg','.ogg':'audio/ogg','.oga':'audio/ogg','.opus':'audio/ogg','.wav':'audio/wav','.m4a':'audio/mp4'}

def _icone_som():
    try:
        from PIL import Image,ImageDraw
        im=Image.new('RGBA',(96,96),(0,0,0,0));d=ImageDraw.Draw(im)
        d.rounded_rectangle((2,2,94,94),18,fill=(19,81,180,255));d.polygon([(22,38),(38,38),(56,22),(56,74),(38,58),(22,58)],fill='white')
        d.arc((50,30,78,66),-50,50,fill='white',width=5);d.arc((52,20,90,76),-50,50,fill='white',width=5)
        b=io.BytesIO();im.save(b,'PNG');return b.getvalue()
    except Exception:
        return base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')

def _wav_dur(dados):
    try:
        import struct
        if dados[:4]==b'RIFF':
            p=12;br=0
            while p+8<=len(dados):
                cid=dados[p:p+4];tam=struct.unpack('<I',dados[p+4:p+8])[0]
                if cid==b'fmt ':br=struct.unpack('<I',dados[p+16:p+20])[0]
                if cid==b'data' and br:return tam/br
                p+=8+tam+(tam&1)
    except Exception:pass
    return None

def _mp3_dur(dados):
    """Duração aproximada de um MP3 (CBR) pelo cabeçalho do primeiro quadro."""
    try:
        i=0
        if dados[:3]==b'ID3':i=10+((dados[6]&127)<<21|(dados[7]&127)<<14|(dados[8]&127)<<7|(dados[9]&127))
        while i<len(dados)-4 and not(dados[i]==0xFF and dados[i+1]&0xE0==0xE0):i+=1
        h=dados[i+1:i+3];ver=(h[0]>>3)&3;br_i=(h[1]>>4)&15
        tab1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320];tab2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]
        br=(tab1 if ver==3 else tab2)[br_i]*1000
        return (len(dados)-i)*8/br if br else None
    except Exception:return None
