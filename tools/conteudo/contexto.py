import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from .markdown import CODIGO_RX

AVISOS=[]

def aviso(m):
    if m not in AVISOS:AVISOS.append(m)

DECORATIVAS={}

DECORATIVAS_VISTAS={}

DECOR_IMG_RX=re.compile(r'!\[([^\]\n]*)\]\(([^)\s]+)\)')

DECOR_RX=re.compile(r'<!--\s*linguagem-acessivel\s*:\s*decorativa\s*-->\s*!\[([^\]\n]*)\]\(([^)\s]+)\)')

def registrar_decorativas(md):
    "Associa marcadores às ocorrências exatas de imagem, sem vazar entre documentos ou formatos."
    texto=CODIGO_RX.sub('',md or '');DECORATIVAS.clear();DECORATIVAS_VISTAS.clear()
    for m in DECOR_RX.finditer(texto):
        chave=(m.group(2),m.group(1))
        indice=sum(1 for x in DECOR_IMG_RX.finditer(texto,0,m.start()) if (x.group(2),x.group(1))==chave)
        DECORATIVAS.setdefault(chave,set()).add(indice)

def decorativa(src,alt):
    chave=(src,alt);indice=DECORATIVAS_VISTAS.get(chave,0);DECORATIVAS_VISTAS[chave]=indice+1
    return indice in DECORATIVAS.get(chave,set())
