import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from .markdown import CODIGO_RX

IMG=re.compile(r'!\[([^\]]*)\]\(([^)\s]+)\)')

def img_bytes(src):
    """Bytes de uma imagem data:URI ou arquivo local; None se indisponível ou SVG."""
    try:
        if src.startswith('data:'):
            h,d=src.split(',',1);mime=h[5:].split(';')[0]
            raw=base64.b64decode(d) if ';base64' in h else unquote_to_bytes(d)
        elif os.path.isfile(src):
            raw=open(src,'rb').read();mime=mimetypes.guess_type(src)[0] or ''
        else:return None
        if 'svg' in mime:return None
        return raw
    except Exception:return None

def img_size(raw):
    try:
        from PIL import Image
        return Image.open(io.BytesIO(raw)).size
    except Exception:return (800,450)

def embed_images(md,base_dir='.'):
    """Substitui imagens locais/remotas por data:URI base64. Retorna (md, embutidas, falhas)."""
    ok=[0];fail=[]
    def rep(m):
        alt,src=m.group(1),m.group(2)
        if src.startswith('data:'):return m.group(0)
        try:
            if re.match(r'https?://',src):
                import urllib.request
                with urllib.request.urlopen(src,timeout=15) as r:raw=r.read();mime=r.headers.get_content_type()
            else:
                p=unquote(src if os.path.isabs(src) else os.path.join(base_dir,src))
                raw=open(p,'rb').read();mime=mimetypes.guess_type(p)[0]
        except Exception:fail.append(src);return m.group(0)
        ok[0]+=1
        return '![%s](data:%s;base64,%s)'%(alt,mime or 'image/png',base64.b64encode(raw).decode())
    partes=[];p=0
    for m in CODIGO_RX.finditer(md):
        partes.append(IMG.sub(rep,md[p:m.start()]));partes.append(m.group(0));p=m.end()
    partes.append(IMG.sub(rep,md[p:]))
    return ''.join(partes),ok[0],fail

def _ep_img_raw(src):
    "Bytes e media-type de uma imagem (data URI ou arquivo local). Imagem remota não entra no EPUB."
    try:
        if src.startswith('data:'):
            h,d_=src.split(',',1);mime=h[5:].split(';')[0].lower()
            raw=base64.b64decode(d_) if ';base64' in h else unquote_to_bytes(d_)
        elif os.path.isfile(src):raw=open(src,'rb').read();mime=(mimetypes.guess_type(src)[0] or '').lower()
        else:return None,None
    except Exception:return None,None
    if mime=='image/jpg':mime='image/jpeg'
    if mime not in('image/png','image/jpeg','image/gif','image/svg+xml','image/webp'):
        try:
            from PIL import Image
            b=io.BytesIO();Image.open(io.BytesIO(raw)).save(b,'PNG');raw=b.getvalue();mime='image/png'
        except Exception:return None,None
    return raw,mime
