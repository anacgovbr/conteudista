import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from .temas import TEMAS, TEMA_PADRAO

def slug(s):
    s=re.sub(r'<[^>]+>','',s).lower().translate(str.maketrans('áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn'))
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')

LI=re.compile(r'^(\s*)([-*]|\d+\.)\s+(.*)$')

CODIGO_RX=re.compile(r'(?ms)(^```[^\n]*\n.*?^```[ \t]*$|`[^`\n]+`)')

def sem_comentarios(md):
    """Remove comentarios HTML (<!-- -->) do texto, preservando os que aparecem em blocos de codigo e em codigo em linha."""
    out=[];p=0
    for m in CODIGO_RX.finditer(md):
        out.append(re.sub(r'<!--.*?-->','',md[p:m.start()],flags=re.S));out.append(m.group(0));p=m.end()
    out.append(re.sub(r'<!--.*?-->','',md[p:],flags=re.S))
    return ''.join(out)

def blocks(md):
    L=md.split('\n');n=len(L);i=0;o=[]
    st=lambda l:l.startswith(('#','```','|','>')) or LI.match(l) or l.strip() in('','---')
    while i<n:
        l=L[i]
        if not l.strip() or l.strip()=='---':i+=1;continue
        if l.startswith('```'):
            lg=l[3:].strip();b=[];i+=1
            while i<n and not L[i].startswith('```'):b.append(L[i]);i+=1
            i+=1;o.append(('code',lg,'\n'.join(b)));continue
        m=re.match(r'^(#{1,6})\s+(.*)$',l)
        if m:o.append(('h',len(m.group(1)),m.group(2).strip()));i+=1;continue
        m=re.match(r'^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$',l)
        if m:o.append(('img',m.group(1),m.group(2)));i+=1;continue
        if l.startswith('|'):
            r=[]
            while i<n and L[i].startswith('|'):r.append(L[i]);i+=1
            cs=lambda x:[y.strip().replace('\\|','|') for y in re.split(r'(?<!\\)\|',x.strip().strip('|'))]
            rows=[cs(r[0])]+[cs(x) for x in r[2:]];o.append(('table',rows));continue
        if l.startswith('>'):
            b=[]
            while i<n and L[i].startswith('>'):b.append(L[i][1:].lstrip());i+=1
            k=''
            if b and b[0].startswith('[!') and ']' in b[0]:k=b[0][2:b[0].index(']')].lower();b[0]=b[0][b[0].index(']')+1:].strip()
            o.append(('quote',k,blocks('\n'.join(b))));continue
        if LI.match(l):
            it=[];base=None
            while i<n and (LI.match(L[i]) or (L[i].startswith('  ') and L[i].strip())):
                m=LI.match(L[i])
                if m:
                    ind=len(m.group(1));base=ind if base is None else base
                    t=m.group(3);ck=None;mm=re.match(r'^\[( |x)\]\s(.*)$',t)
                    if mm:ck=mm.group(1)=='x';t=mm.group(2)
                    it.append([min(3,max(0,(ind-base)//2)),m.group(2)[0].isdigit(),ck,t])
                elif it:it[-1][3]+=' '+L[i].strip()
                i+=1
            o.append(('list',it));continue
        b=[]
        while i<n and not st(L[i]):b.append(L[i].strip());i+=1
        if not b:b=[l.strip()];i+=1
        o.append(('p',' '.join(b)))
    return o

def runs(t):
    """Inline -> lista de (texto, negrito, itálico, tipo[0 texto|1 código|2 imagem], url)."""
    out=[];pat=re.compile(r'`([^`]+)`|!\[([^\]]*)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])')
    p=0
    for m in pat.finditer(t):
        if m.start()>p:out.append((t[p:m.start()],0,0,0,None))
        if m.group(1) is not None:out.append((m.group(1),0,0,1,None))
        elif m.group(3) is not None:out.append((m.group(2),0,0,2,m.group(3)))
        elif m.group(4) is not None:
            for x in runs(m.group(4)):out.append((x[0],1,x[2],x[3],x[4]))
        elif m.group(6) is not None:out.append((m.group(5),0,0,0,m.group(6)))
        else:out.append((m.group(7),0,1,0,None))
        p=m.end()
    if p<len(t):out.append((t[p:],0,0,0,None))
    return out

def plain(t):return ''.join(r[0] for r in runs(t) if r[3]!=2)

def mermaid_edges(code):
    lab={};rows=[]
    node=r'([A-Za-z0-9_]+)\s*(\(\(\(.*?\)\)\)|\(\(.*?\)\)|\[.*?\]|\{.*?\}|\(.*?\))?'
    def nm(i,s):
        if s:
            s=re.sub(r'^[\[\(\{]+|[\]\)\}]+$','',s);s=re.sub(r'<br\s*/?>',' — ',s).replace('**','');lab[i]=s.strip()
        return i
    for ln in code.split('\n'):
        ln=ln.strip()
        if '-->' not in ln:
            m=re.match(node+r'\s*$',ln)
            if m and m.group(2):nm(m.group(1),m.group(2))
            continue
        parts=re.split(r'\s*-->\s*',ln);prev=None
        for pt in parts:
            cond='';m=re.match(r'^\|([^|]*)\|\s*(.*)$',pt)
            if m:cond=m.group(1);pt=m.group(2)
            m=re.match(node,pt)
            if not m:continue
            cur=nm(m.group(1),m.group(2))
            if prev:rows.append([prev,cond,cur])
            prev=cur
    f=lambda x:lab.get(x,x) if lab.get(x,x) not in('O','**O**') else ('Início' if x.endswith('00') else 'Fim' if x.endswith('99') else x)
    return [['De','Condição','Para']]+[[f(a),c or '—',f(b)] for a,c,b in rows]

def title_of(md,d):
    m=re.search(r'^#\s+(.+)$',md,re.M);return plain(m.group(1)).strip() if m else d

def split_slides(md):
    t='Apresentação';fm=re.match(r'^---\n(.*?)\n---\n',md,re.S)
    if fm:
        x=re.search(r'^title:\s*(.+)$',fm.group(1),re.M);t=x.group(1).strip() if x else t;md=md[fm.end():]
    out=[]
    for p in [p.strip() for p in re.split(r'\n---\s*\n',md) if p.strip()]:
        c='';n=''
        m=re.search(r'<!--\s*class:\s*(\w+)\s*-->',p)
        if m:c=m.group(1);p=p.replace(m.group(0),'')
        m=re.search(r'<!--\s*notas:\s*(.*?)-->',p,re.S)
        if m:n=m.group(1).strip();p=p.replace(m.group(0),'')
        p=re.sub(r'<!--.*?-->','',p,flags=re.S).strip()
        if p:out.append((c,blocks(p),n))
    return t,out

def notas_para_narracao(md):
    """Texto a narrar em cada slide (mesma ordem de split_slides). <!-- narracao: texto --> substitui a nota;
    <!-- narracao: nao --> deixa o slide sem áudio. Slides sem notas: ''."""
    fm=re.match(r'^---\n(.*?)\n---\n',md or '',re.S)
    if fm:md=md[fm.end():]
    out=[]
    for p in [p.strip() for p in re.split(r'\n---\s*\n',md or '') if p.strip()]:
        n='';m=re.search(r'<!--\s*notas:\s*(.*?)-->',p,re.S)
        if m:n=m.group(1).strip()
        m=re.search(r'<!--\s*narra[cç][aã]o:\s*(.*?)-->',p,re.S|re.I)
        if m:
            v=m.group(1).strip();n='' if v.lower() in('nao','não','no','off','0','-') else v
        if re.sub(r'<!--.*?-->','',p,flags=re.S).strip():out.append(n)
    return out

def markdown_com_tema(md,tema):
    """Insere ou atualiza `theme` no frontmatter YAML sem alterar o restante do Markdown."""
    md=md or '';tema=tema if tema in TEMAS else TEMA_PADRAO
    if md.startswith('---\n'):
        fim=md.find('\n---',4)
        if fim!=-1:
            cab=md[4:fim]
            if re.search(r'(?m)^theme\s*:',cab):cab=re.sub(r'(?m)^theme\s*:.*$','theme: '+tema,cab)
            else:cab=cab.rstrip()+'\ntheme: '+tema
            return '---\n'+cab+'\n---'+md[fim+4:]
    return '---\ntheme: '+tema+'\n---\n\n'+md.lstrip()
