# -*- coding: utf-8 -*-
# GERADOR PADRÃO DE CURSO v3.4 (imagens em base64; temas: govbr [padrão] e classico) — Guia (HTML + DOCX) e Apresentação (HTML + PPTX) a partir de Markdown.
# Requisitos: Python 3 + python-docx + python-pptx (+ Pillow). HTML usa só biblioteca padrão.
# Uso: python gerador.py guia.md apresentacao.md --prefixo NOME --rodape "TEXTO" [--barra "TEXTO"] [--saida pasta] [--sem-embutir] [--tema govbr|classico]
# Imagens ![alt](caminho|URL) sao convertidas para data:URI base64 (texto puro) nos .md de saida.
# Saída: Treinamento_<prefixo>.md/.html/.docx  e  Apresentacao_<prefixo>.md/.html/.pptx
import re,html,argparse,os,base64,io,mimetypes
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
# ============================== PARSER COMUM ==============================
def slug(s):
    s=re.sub(r'<[^>]+>','',s).lower().translate(str.maketrans('áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn'))
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')
LI=re.compile(r'^(\s*)([-*]|\d+\.)\s+(.*)$')
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
    return IMG.sub(rep,md),ok[0],fail
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
# ============================== HTML ==============================
def inl(t):
    s=''
    for x,b,i,c,u in runs(t):
        if c==2:s+='<img class="il" src="%s" alt="%s">'%(E(u),E(x));continue
        h=E(x,quote=False)
        if c:h='<code>'+h+'</code>'
        if i:h='<em>'+h+'</em>'
        if b:h='<strong>'+h+'</strong>'
        if u:h='<a href="%s" target="_blank" rel="noopener">%s</a>'%(E(u),h)
        s+=h
    return s
def lst_html(it):
    def rec(k,d):
        tag='ol' if it[k][1] else 'ul';o=''
        while k<len(it) and it[k][0]>=d:
            if it[k][0]>d:sub,k=rec(k,it[k][0]);o=o[:-5]+sub+'</li>';continue
            dp,od,ck,t=it[k]
            o+=('<li class="task"><label><input type="checkbox"%s> %s</label></li>'%(' checked' if ck else '',inl(t))) if ck is not None else '<li>'+inl(t)+'</li>';k+=1
        return '<%s>%s</%s>'%(tag,o,tag),k
    return rec(0,it[0][0])[0]
def html_of(bl,toc=None):
    o=[]
    for b in bl:
        k=b[0]
        if k=='h':
            sid=slug(b[2])
            if toc is not None and b[1] in(2,3):toc.append((b[1],sid,plain(b[2])))
            o.append('<h%d id="%s">%s</h%d>'%(b[1],sid,inl(b[2]),b[1]))
        elif k=='p':o.append('<p>'+inl(b[1])+'</p>')
        elif k=='img':o.append('<figure><img src="%s" alt="%s">%s</figure>'%(E(b[2]),E(b[1]),'<figcaption>%s</figcaption>'%E(b[1]) if b[1] else ''))
        elif k=='table':
            r=b[1];t='<div class="tbl"><table><thead><tr>'+''.join('<th>%s</th>'%inl(c) for c in r[0])+'</tr></thead><tbody>'
            t+=''.join('<tr>'+''.join('<td>%s</td>'%inl(c) for c in x)+'</tr>' for x in r[1:]);o.append(t+'</tbody></table></div>')
        elif k=='list':o.append(lst_html(b[1]))
        elif k=='quote':o.append('<blockquote class="%s">%s</blockquote>'%(b[1],html_of(b[2])))
        elif k=='code':o.append('<div class="mw"><pre class="mermaid">%s</pre></div>'%E(b[2]) if b[1]=='mermaid' else '<pre class="code"><code>%s</code></pre>'%E(b[2]))
    return '\n'.join(o)
MER='<script type="module">try{const m=(await import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs")).default;m.initialize({startOnLoad:false});await m.run({querySelector:"pre.mermaid"})}catch(e){console.warn("Mermaid offline",e)}</script>'
# ============================== TEMAS (layout dos arquivos gerados) ==============================
# Cada tema troca a paleta e a fonte de TODOS os arquivos (HTML, DOCX e PPTX). As cores "base" do código são as do
# tema clássico; o mapa de cada tema diz por qual cor cada uma é trocada. Para criar um tema novo (ex.: ANAC),
# copie o bloco 'govbr', ajuste 'map', fontes e 'extra_*' e registre em TEMAS.
_GOV_MAP={'#0b3d6e':'#0c326f','#0a7cc1':'#1351b4','#19a974':'#168821','#0a5c9a':'#155bcb','#eaf1f8':'#dbe8fb','#dfe5ee':'#cccccc','#d9e2ee':'#cccccc',
 '#1b2430':'#333333','#5a6676':'#636363','#f6f8fb':'#f8f8f8','#eef4fa':'#edf5ff','#0d1b2a':'#071d41','#1e7b4f':'#168821','#e9f6f0':'#e3f5e1',
 '#fff4e0':'#fff5c2','#9a5b00':'#8a5c00','#f1f4f8':'#f8f8f8','#f2f7fc':'#edf5ff','#d6ecff':'#dbe8fb','#e8f2fb':'#edf5ff','#cfe3f5':'#c5d4eb'}
TEMAS={
 'govbr':{'nome':'Padrão gov.br (Design System do Governo Federal)','map':_GOV_MAP,
   'fonte':"'Rawline','Raleway',\"Segoe UI\",Arial,sans-serif",
   'import':"@import url('https://fonts.cdnfonts.com/css/rawline');@import url('https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;800&display=swap');",
   'extra_g':"""[data-theme=light] header{background:#fff;color:#333;border-top:4px solid #1351b4;box-shadow:0 1px 6px rgba(0,0,0,.16)}
[data-theme=light] header .t{color:#333}[data-theme=light] header #pg{color:#636363}
[data-theme=light] header button,[data-theme=light] header select{background:#fff;color:#1351b4;border:1px solid #1351b4;border-radius:100em;font-weight:600;padding:6px 14px}
[data-theme=light] header button:hover{background:rgba(19,81,180,.12)}
[data-theme=light] article{border:0;border-radius:4px;box-shadow:0 1px 6px rgba(0,0,0,.16)}
[data-theme=light] th{background:#ededed;color:#333}
h1,h2,h3{font-weight:700}.ab{border-radius:100em;font-weight:600;padding:8px 20px}
:focus-visible{outline:4px dashed #c2850c;outline-offset:4px}
nav a.on{font-weight:600}""",
   'extra_s':""".s h1{font-weight:700}.s.title h1{border-bottom-color:#ffcd07}.s.title:before{background:#ffcd07}
#hud button{border-radius:100em}""",
   'docx_font':'Arial','pptx_font':'Arial','pptx_destaque':'FFCD07'},
 'classico':{'nome':'Clássico (layout original do Conteudista)','map':{},'fonte':None,'import':'','extra_g':'','extra_s':'',
   'docx_font':'Calibri','pptx_font':'Segoe UI','pptx_destaque':None},
}
TEMA_PADRAO='govbr'
def tema_de(t):return TEMAS.get(t or TEMA_PADRAO) or TEMAS[TEMA_PADRAO]
def _cor(h,T):
    h=h.lower();h=h if h.startswith('#') else '#'+h;return T['map'].get(h,h)
def tcss(css,T,extra=''):
    css=re.sub(r'#[0-9a-fA-F]{6}\b',lambda m:_cor(m.group(0),T),css)
    if T.get('fonte'):css=css.replace('"Segoe UI",Roboto,Arial,sans-serif',T['fonte'])
    return (T.get('import') or '')+css+(extra or '')
def thex(h,T):return _cor(h,T)[1:].upper()
def trgb(h,T):
    from docx.shared import RGBColor as _R
    return _R.from_string(thex(h,T))
CSS_G=""":root{--bg:#f6f8fb;--pa:#fff;--ink:#1b2430;--pri:#0b3d6e;--acc:#0a7cc1;--line:#dfe5ee;--th:#eaf1f8;--ok:#1e7b4f;--wa:#9a5b00;--code:#f1f4f8}
[data-theme=dark]{--bg:#0f1520;--pa:#162030;--ink:#e6edf5;--pri:#8cc4ff;--acc:#5fb3ff;--line:#2a3a50;--th:#1e2c40;--ok:#5fd39b;--wa:#ffc266;--code:#1c283a}
[data-theme=contrast]{--bg:#000;--pa:#000;--ink:#fff;--pri:#ffd400;--acc:#00e5ff;--line:#fff;--th:#1a1a1a;--ok:#0f8;--wa:#ffd400;--code:#111}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Segoe UI",Roboto,Arial,sans-serif}
header{position:sticky;top:0;z-index:9;background:#0b3d6e;color:#fff;display:flex;align-items:center;gap:12px;padding:10px 18px}header .t{font-weight:700;flex:1;font-size:15px}
header button,header select{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:6px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer}header option{color:#000}
.wrap{display:grid;grid-template-columns:290px 1fr;max-width:1400px;margin:auto}nav{position:sticky;top:52px;height:calc(100vh - 52px);overflow:auto;padding:18px 12px;border-right:1px solid var(--line);font-size:14px}
nav ul{list-style:none;margin:0;padding:0}nav .lv3{padding-left:14px;font-size:13px}nav a{display:block;padding:4px 8px;border-radius:6px;color:var(--ink);text-decoration:none}nav a:hover,nav a.on{background:var(--th);color:var(--pri)}
main{padding:28px 40px 80px;min-width:0}article{background:var(--pa);border:1px solid var(--line);border-radius:12px;padding:36px 48px;max-width:1000px}
h1{color:var(--pri);font-size:30px;line-height:1.25}h2{color:var(--pri);font-size:23px;margin:42px 0 12px;padding-top:6px;border-top:3px solid var(--acc);scroll-margin-top:70px}h3{color:var(--pri);font-size:18px;margin:28px 0 8px;scroll-margin-top:70px}a{color:var(--acc);word-break:break-word}
.tbl{overflow-x:auto;margin:14px 0}table{border-collapse:collapse;width:100%;font-size:14.5px}th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{background:var(--th);color:var(--pri)}
code{background:var(--code);padding:1px 5px;border-radius:4px;font:.9em Consolas,monospace}pre.code{background:var(--code);padding:14px;border-radius:8px;overflow:auto}.mw{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin:14px 0;overflow-x:auto}pre.mermaid{margin:0;color:#333}
figure{margin:16px 0;text-align:center}figure img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:8px}figcaption{color:#5a6676;font-size:13px;margin-top:4px}img.il{max-height:1.6em;vertical-align:middle}
blockquote{margin:16px 0;padding:12px 16px;border-left:5px solid var(--acc);background:var(--th);border-radius:0 8px 8px 0}blockquote p{margin:4px 0}blockquote.tip{border-left-color:var(--ok)}blockquote.warning{border-left-color:var(--wa)}
li.task{list-style:none;margin-left:-22px}li.task input{transform:scale(1.15);margin-right:6px;accent-color:var(--acc)}.hid h3~*{filter:blur(6px);user-select:none;pointer-events:none}
.ab{margin:8px 0;background:var(--acc);color:#fff;border:0;border-radius:6px;padding:8px 14px;font:inherit;cursor:pointer}
@media(max-width:900px){.wrap{grid-template-columns:1fr}nav{display:none}main{padding:12px}article{padding:20px}}
@media print{header,nav,.ab{display:none}.wrap{display:block}article{border:0;padding:0;max-width:none}.hid h3~*{filter:none}h2{break-before:page}table,.mw,figure{break-inside:avoid}}"""
JS_G="""(function(){var K='__K__',th=document.getElementById('th'),v=localStorage.getItem(K+'t')||'light';document.documentElement.dataset.theme=v;th.value=v;
th.onchange=function(){document.documentElement.dataset.theme=th.value;localStorage.setItem(K+'t',th.value)};
var b=[].slice.call(document.querySelectorAll('li.task input')),s=JSON.parse(localStorage.getItem(K+'c')||'{}');
function p(){document.getElementById('pg').textContent='Checklists: '+b.filter(function(x){return x.checked}).length+'/'+b.length}
b.forEach(function(x,i){x.checked=!!s[i];x.onchange=function(){s[i]=x.checked;localStorage.setItem(K+'c',JSON.stringify(s));p()}});p();
document.getElementById('rs').onclick=function(){s={};localStorage.removeItem(K+'c');b.forEach(function(x){x.checked=false});p()};
var g=document.getElementById('gab');if(g){var a=document.createElement('button');a.className='ab';a.textContent='Mostrar gabarito';g.querySelector('h2').after(a);
a.onclick=function(){g.classList.toggle('hid');a.textContent=g.classList.contains('hid')?'Mostrar gabarito':'Ocultar gabarito'}}
var l=[].slice.call(document.querySelectorAll('nav a')),h=l.map(function(x){return document.getElementById(x.getAttribute('href').slice(1))});
addEventListener('scroll',function(){var y=scrollY+90,k=0;h.forEach(function(e,i){if(e&&e.offsetTop<=y)k=i});l.forEach(function(x,i){x.classList.toggle('on',i===k)})})})();"""
CSS_S=""":root{--pri:#0b3d6e;--acc:#0a7cc1;--ac2:#19a974;--ink:#1b2430;--mu:#5a6676;--line:#d9e2ee;--soft:#eef4fa}*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#0d1b2a;font-family:"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden}#st{position:absolute;left:50%;top:50%;width:1280px;height:720px}
.s{position:absolute;inset:0;background:#fff;color:var(--ink);display:none;overflow:hidden}.s.on{display:block}
.s:before{content:"";position:absolute;left:0;top:0;bottom:0;width:14px;background:linear-gradient(var(--pri),var(--acc))}
.s:after{content:"__F__";position:absolute;left:60px;bottom:22px;font-size:13px;color:var(--mu)}.in{position:absolute;left:60px;right:60px;top:44px;bottom:60px;display:flex;flex-direction:column}
.s h1{font-size:40px;color:var(--pri);margin:0 0 22px;padding-bottom:12px;border-bottom:3px solid var(--acc);line-height:1.15}.s h2{font-size:26px;color:var(--acc);margin:0 0 14px}
.s p,.s li{font-size:23px;line-height:1.45;margin:6px 0}.s ul,.s ol{padding-left:34px;margin:4px 0}.s li li{font-size:20px}.s li::marker{color:var(--acc);font-weight:700}
.s table{border-collapse:collapse;width:100%;font-size:19px;margin:4px 0 10px}.s th{background:var(--pri);color:#fff;text-align:left;padding:9px 12px}.s td{border-bottom:1px solid var(--line);padding:8px 12px;vertical-align:top}.s tr:nth-child(even) td{background:var(--soft)}
.s a{color:var(--acc)}.s code{background:var(--soft);padding:1px 6px;border-radius:4px;color:var(--pri)}.s strong{color:var(--pri)}.s blockquote{margin:14px 0 0;padding:12px 18px;background:#e9f6f0;border-left:6px solid var(--ac2);border-radius:0 10px 10px 0}.s blockquote p{font-size:21px;margin:0}
.s figure{margin:6px 0;text-align:center}.s figure img{max-width:100%;max-height:440px;object-fit:contain}.s figcaption{font-size:15px;color:var(--mu)}.s img.il{max-height:1.4em;vertical-align:middle}
.s .mw{border:1px solid var(--line);border-radius:10px;padding:8px;text-align:center}.s pre.mermaid{margin:0}
.s.title{background:linear-gradient(135deg,#0b3d6e,#0a5c9a 60%,#0a7cc1);color:#fff}.s.title:before{background:var(--ac2)}.s.title:after{color:#cfe3f5}.s.title .in{justify-content:center}
.s.title h1{color:#fff;font-size:58px;border-bottom:4px solid var(--ac2);display:inline-block}.s.title h2{color:#d6ecff;font-size:32px}.s.title p{color:#e8f2fb;font-size:22px}.s.title strong{color:#fff}
.s.highlight{background:linear-gradient(#fff,#f2f7fc)}.nt{display:none}.sn .s.on .nt{display:block;position:absolute;left:60px;right:60px;bottom:44px;background:#fff8d6;border:1px solid #e6cf6a;border-radius:8px;padding:10px 14px;font-size:16px}
#bar{position:fixed;left:0;bottom:0;height:5px;background:var(--ac2)}#hud{position:fixed;right:14px;bottom:12px;display:flex;gap:8px;align-items:center;font-size:13px;color:#cfe3f5;background:rgba(11,61,110,.9);padding:5px 8px;border-radius:10px;opacity:.35}#hud:hover{opacity:1}
#hud button{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:6px;padding:6px 10px;cursor:pointer}
@media print{html,body{overflow:visible;background:#fff}#st{position:static;transform:none!important}.s{display:block!important;position:relative;break-after:page}#hud,#bar{display:none}@page{size:1280px 720px;margin:0}}"""
JS_S="""(function(){var S=[].slice.call(document.querySelectorAll('.s')),i=0,st=document.getElementById('st'),D=document;
function f(){st.style.transform='translate(-50%,-50%) scale('+Math.min(innerWidth/1280,innerHeight/720)*.98+')'}
function g(n){i=Math.max(0,Math.min(S.length-1,n));S.forEach(function(x,k){x.classList.toggle('on',k===i)});D.getElementById('c').textContent=(i+1)+' / '+S.length;D.getElementById('bar').style.width=(i+1)/S.length*100+'%';history.replaceState(null,'','#'+(i+1))}
function fs(){D.fullscreenElement?D.exitFullscreen():D.documentElement.requestFullscreen()}function nt(){D.body.classList.toggle('sn')}
addEventListener('resize',f);f();var h=parseInt(location.hash.slice(1));g(isNaN(h)?0:h-1);
addEventListener('keydown',function(e){var k=e.key;if(['ArrowRight','PageDown',' ','Enter'].indexOf(k)>-1){e.preventDefault();g(i+1)}else if(['ArrowLeft','PageUp','Backspace'].indexOf(k)>-1){e.preventDefault();g(i-1)}
else if(k=='Home')g(0);else if(k=='End')g(S.length-1);else if(k=='n'||k=='N')nt();else if(k=='f'||k=='F')fs()});
D.getElementById('p').onclick=function(){g(i-1)};D.getElementById('n').onclick=function(){g(i+1)};D.getElementById('b1').onclick=nt;D.getElementById('b2').onclick=fs;
var x0=null;addEventListener('touchstart',function(e){x0=e.touches[0].clientX});addEventListener('touchend',function(e){if(x0===null)return;var d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50)g(i+(d<0?1:-1));x0=null})})();"""
def title_of(md,d):
    m=re.search(r'^#\s+(.+)$',md,re.M);return plain(m.group(1)).strip() if m else d
def guia_html(md,bar,tema=None):
    T=tema_de(tema)
    toc=[];b=html_of(blocks(md),toc)
    hs=list(re.finditer(r'<h2 id="[^"]+">(.*?)</h2>',b))
    for k,m in enumerate(hs):
        if 'gabarito' in m.group(1).lower():
            e=hs[k+1].start() if k+1<len(hs) else len(b);b=b[:m.start()]+'<section id="gab" class="hid">'+b[m.start():e]+'</section>'+b[e:];break
    t=title_of(md,'Guia');tc=''.join('<li class="lv%d"><a href="#%s">%s</a></li>'%(v,s,E(x)) for v,s,x in toc)
    return ('<!DOCTYPE html><html lang="pt-BR" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title><style>%s</style></head><body>'
    '<header><span class="t">%s</span><span id="pg" style="font-size:13px"></span><select id="th" aria-label="Tema"><option value="light">Tema claro</option><option value="dark">Tema escuro</option><option value="contrast">Alto contraste</option></select>'
    '<button id="rs">Limpar checklists</button><button onclick="print()">Imprimir / PDF</button></header><div class="wrap"><nav aria-label="Sumário"><ul>%s</ul></nav><main><article>%s</article></main></div><script>%s</script>%s</body></html>'
    )%(E(t),tcss(CSS_G,T,T['extra_g']),E(bar or t),tc,b,JS_G.replace('__K__',slug(t)[:40]),MER)
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
def slides_html(t,sl,foot,tema=None):
    T=tema_de(tema)
    o=''.join('<section class="s %s"><div class="in">%s</div><aside class="nt">%s</aside></section>'%(c,html_of(b),E(n)) for c,b,n in sl)
    return ('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title><style>%s</style></head><body>'
    '<div id="st">%s</div><div id="bar"></div><div id="hud"><button id="p">◀</button><span id="c"></span><button id="n">▶</button><button id="b1">Notas (N)</button><button id="b2">Tela cheia (F)</button></div><script>%s</script>%s</body></html>'
    )%(E(t),tcss(CSS_S.replace('__F__',foot.replace('"','')),T,T['extra_s']),o,JS_S,MER)
# ============================== DOCX ==============================
def guia_docx(md,path,foot,tema=None):
    T=tema_de(tema);C=lambda h:trgb(h,T);H=lambda h:thex(h,T);FONTE=T['docx_font']
    from docx import Document
    from docx.shared import Pt,RGBColor,Cm
    from docx.enum.text import WD_BREAK
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    PRI=C('0B3D6E');ACC=C('0A7CC1')
    d=Document();sec=d.sections[0];sec.page_height=Cm(29.7);sec.page_width=Cm(21)
    for a in('left_margin','right_margin'):setattr(sec,a,Cm(2.2))
    sec.top_margin=Cm(2);sec.bottom_margin=Cm(2)
    stl=d.styles['Normal'];stl.font.name=FONTE;stl.font.size=Pt(11);stl.paragraph_format.space_after=Pt(4)
    stl.element.rPr.rFonts.set(qn('w:eastAsia'),FONTE)
    for nm,sz in(('Title',24),('Heading 1',16),('Heading 2',13)):
        s=d.styles[nm];s.font.name=FONTE;s.font.size=Pt(sz);s.font.color.rgb=PRI;s.font.bold=True
    if T is not TEMAS['classico']:  # força a fonte do tema também nos títulos (remove a fonte do tema do Word)
        for nm in('Title','Heading 1','Heading 2','Heading 3','List Bullet','List Number'):
            try:
                st_=d.styles[nm];st_.font.name=FONTE;rf=st_.element.get_or_add_rPr().get_or_add_rFonts()
                for at in('w:asciiTheme','w:hAnsiTheme','w:eastAsiaTheme','w:cstheme'):rf.attrib.pop(qn(at),None)
                rf.set(qn('w:eastAsia'),FONTE)
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
    def pic(run,src,maxcm=16.0,hcm=None):
        raw=img_bytes(src)
        if raw is None:run.text='[imagem]';return False
        w,h=img_size(raw)
        try:
            if hcm:run.add_picture(io.BytesIO(raw),height=Cm(hcm))
            else:run.add_picture(io.BytesIO(raw),width=Cm(min(maxcm,w/96*2.54)))
            return True
        except Exception:run.text='[imagem]';return False
    def fill(p,t,color=None,size=None,bold=False):
        for x,b,i,c,u in runs(t):
            if c==2:pic(p.add_run(),u,hcm=0.5);continue
            if u:link(p,x,u,b,size);continue
            r=p.add_run(x);r.bold=bool(b) or bold;r.italic=bool(i)
            if c:r.font.name='Consolas';r.font.size=Pt(10);r.font.color.rgb=PRI
            if color is not None:r.font.color.rgb=color
            if size:r.font.size=Pt(size)
    def table(rows):
        nc=max(len(r) for r in rows);tb=d.add_table(rows=len(rows),cols=nc);tb.style='Table Grid'
        for ri,r in enumerate(rows):
            for ci in range(nc):
                cell=tb.cell(ri,ci);cell.text='';p=cell.paragraphs[0];p.paragraph_format.space_after=Pt(0)
                fill(p,r[ci] if ci<len(r) else '',size=10,bold=(ri==0))
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
                p=d.add_paragraph();p.alignment=1;pic(p.add_run(),b[2])
                if b[1]:
                    c=d.add_paragraph();c.alignment=1;r=c.add_run(b[1]);r.italic=True;r.font.size=Pt(9)
            elif k=='table':table(b[1])
            elif k=='list':
                for dp,od,ck,t in b[1]:
                    if ck is not None:
                        p=d.add_paragraph();p.paragraph_format.left_indent=Cm(0.6+0.6*dp);p.add_run(('☒ ' if ck else '☐ ')).font.size=Pt(12);fill(p,t)
                    else:
                        st='List Number' if od else 'List Bullet'
                        if dp:st+=' %d'%(min(dp,2)+1)
                        p=d.add_paragraph(style=st);fill(p,t)
                    p.paragraph_format.space_after=Pt(2)
                    if inq:shade(p._p,inq[0]);lborder(p,inq[1])
            elif k=='quote':
                col={'tip':(H('E9F6F0'),H('1E7B4F')),'warning':(H('FFF4E0'),H('9A5B00'))}.get(b[1],(H('EAF1F8'),H('0A7CC1')))
                render(b[2],col)
            elif k=='code':
                if b[1]=='mermaid':
                    p=d.add_paragraph();r=p.add_run('Fluxo (representação em tabela):');r.bold=True;r.font.color.rgb=ACC
                    table(mermaid_edges(b[2]))
                else:
                    p=d.add_paragraph();r=p.add_run(b[2]);r.font.name='Consolas';r.font.size=Pt(9);shade(p._p,H('F1F4F8'))
    bl=blocks(re.sub(r'<!--.*?-->','',md,flags=re.S))
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
    fp=sec.footer.paragraphs[0];fp.text=foot or ' ';fp.runs[0].font.size=Pt(8);fp.runs[0].font.color.rgb=C('5A6676')
    s=d.settings.element;u=OxmlElement('w:updateFields');u.set(qn('w:val'),'true');s.append(u)
    d.save(path)
# ============================== PPTX ==============================
def slides_pptx(t,sl,path,foot,tema=None):
    T=tema_de(tema);H=lambda h:thex(h,T);FONTE=T['pptx_font']
    from pptx import Presentation
    from pptx.util import Inches,Pt
    from pptx.dml.color import RGBColor
    C=lambda h:RGBColor.from_string(thex(h,T))
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import MSO_ANCHOR
    PRI=C('0B3D6E');ACC=C('0A7CC1');AC2=C('19A974');INK=C('1B2430')
    WH=C('FFFFFF');MU=C('5A6676');SOFT=C('EEF4FA');DEST=RGBColor.from_string(T['pptx_destaque']) if T.get('pptx_destaque') else AC2
    P=Presentation();P.slide_width=Inches(13.333);P.slide_height=Inches(7.5);W=13.333;L=0.62;CW=W-2*L
    def rect(s,x,y,w,h,col,shape=MSO_SHAPE.RECTANGLE):
        r=s.shapes.add_shape(shape,Inches(x),Inches(y),Inches(w),Inches(h));r.fill.solid();r.fill.fore_color.rgb=col;r.line.fill.background();r.shadow.inherit=False;return r
    def addruns(par,t,size,color,bold=False):
        for x,b,i,c,u in runs(t):
            if c==2:x='[%s]'%(x or 'imagem');u=None;c=0
            r=par.add_run();r.text=x;f=r.font;f.size=Pt(size);f.bold=bool(b) or bold;f.italic=bool(i);f.name='Consolas' if c else FONTE
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
            tb,tf=tbox(s,x,y,w,h);addruns(tf.paragraphs[0],b[1],size,col)
        elif k=='h':
            tb,tf=tbox(s,x,y,w,h);addruns(tf.paragraphs[0],b[2],size+4,ACC if col==INK else col,True)
        elif k=='list':
            tb,tf=tbox(s,x,y,w,h);n=0
            for dp,od,ck,t in b[1]:
                p=tf.paragraphs[0] if n==0 else tf.add_paragraph();n+=1
                p.space_after=Pt(4);sz=size-2*min(dp,1)
                bullet=('☑ ' if ck else '☐ ') if ck is not None else ('%d. '%n if od and dp==0 else '• ' if dp==0 else '– ')
                r=p.add_run();r.text='    '*dp+bullet;r.font.size=Pt(sz);r.font.bold=True;r.font.color.rgb=ACC if col==INK else col;r.font.name=FONTE
                addruns(p,t,sz,col)
        elif k=='table':
            rows=b[1];nc=max(len(r) for r in rows);ts=size-3
            gt=s.shapes.add_table(len(rows),nc,Inches(x),Inches(y),Inches(w),Inches(h-0.1)).table
            for ri,r in enumerate(rows):
                for ci in range(nc):
                    c=gt.cell(ri,ci);c.margin_left=c.margin_right=Inches(0.08);c.margin_top=c.margin_bottom=Inches(0.04)
                    tf=c.text_frame;tf.word_wrap=True;tf.paragraphs[0].text=''
                    addruns(tf.paragraphs[0],r[ci] if ci<len(r) else '',ts,WH if ri==0 else INK,ri==0)
                    c.fill.solid();c.fill.fore_color.rgb=PRI if ri==0 else (SOFT if ri%2==0 else WH)
        elif k=='quote':
            bg={'warning':C('FFF4E0')}.get(b[1],C('E9F6F0'))
            rect(s,x,y,w,h-0.05,bg);rect(s,x,y,0.08,h-0.05,AC2 if b[1]!='warning' else C('9A5B00'))
            yy=y+0.1
            for q in b[2]:draw(s,q,yy,size-1,col,x+0.2,w-0.3);yy+=est(q,size-1)
        elif k=='img':
            raw=img_bytes(b[2])
            if raw is None:
                tb,tf=tbox(s,x,y,w,0.4);addruns(tf.paragraphs[0],'[imagem: %s]'%(b[1] or 'sem descrição'),size,col)
            else:
                iw,ih=img_size(raw);hh=min(4.6,w*ih/max(iw,1),ih/96);ww=hh*iw/max(ih,1)
                s.shapes.add_picture(io.BytesIO(raw),Inches(x+(w-ww)/2),Inches(y),Inches(ww),Inches(hh))
                if b[1]:
                    tb,tf=tbox(s,x,y+hh+0.03,w,0.32);tf.paragraphs[0].alignment=2;addruns(tf.paragraphs[0],b[1],12,MU)
        elif k=='code':
            if b[1]=='mermaid':draw(s,('table',mermaid_edges(b[2])),y,size,col,x,w)
            else:
                tb,tf=tbox(s,x,y,w,h);r=tf.paragraphs[0].add_run();r.text=b[2];r.font.name='Consolas';r.font.size=Pt(12);r.font.color.rgb=col
        return h
    for idx,(cls,bl,notes) in enumerate(sl):
        s=P.slides.add_slide(P.slide_layouts[6]);istitle=cls=='title'
        if istitle:rect(s,0,0,W,7.5,PRI);rect(s,0,0,0.15,7.5,DEST)
        else:
            if cls=='highlight':rect(s,0,0,W,7.5,C('F2F7FC'))
            rect(s,0,0,0.15,7.5,PRI)
        h1=[b for b in bl if b[0]=='h' and b[1]==1];rest=[b for b in bl if not(b[0]=='h' and b[1]==1)]
        if istitle:
            sub=[b for b in rest if b[0]=='h'];body=[b for b in rest if b[0]!='h'];y=2.2
            if h1:
                tb,tf=tbox(s,L,y,CW,1.3);tf.vertical_anchor=MSO_ANCHOR.BOTTOM;addruns(tf.paragraphs[0],h1[0][2],50,WH,True);y+=1.4
                rect(s,L,y,min(CW,len(plain(h1[0][2]))*0.36),0.06,DEST);y+=0.25
            for b in sub:tb,tf=tbox(s,L,y,CW,0.7);addruns(tf.paragraphs[0],b[2],28,C('D6ECFF'),True);y+=0.75
            for b in body:y+=draw(s,b,y,20,C('E8F2FB'))
        else:
            y=0.45
            if h1:
                tb,tf=tbox(s,L,y,CW,0.9);tf.vertical_anchor=MSO_ANCHOR.BOTTOM;addruns(tf.paragraphs[0],h1[0][2],34,PRI,True);y+=0.95
                rect(s,L,y,CW,0.05,ACC);y+=0.25
            avail=6.75-y;size=22
            while size>12 and sum(est(b,size) for b in rest)>avail:size-=1
            for b in rest:y+=draw(s,b,y,size,INK)
        tb,tf=tbox(s,L,7.05,8,0.3);addruns(tf.paragraphs[0],foot,11,C('CFE3F5') if istitle else MU)
        tb,tf=tbox(s,W-1.5,7.05,1,0.3);addruns(tf.paragraphs[0],'%d / %d'%(idx+1,len(sl)),11,C('CFE3F5') if istitle else MU)
        if notes:s.notes_slide.notes_text_frame.text=notes
    P.core_properties.title=t;P.save(path)
# ============================== EXECUÇÃO ==============================
def gerar(gm,sm,prefixo='Curso',rodape='',barra='',saida='.',tema=None):
    tema=tema if tema in TEMAS else TEMA_PADRAO
    """Gera os 6 arquivos a partir do texto dos dois .md. Retorna (lista de caminhos, resumo)."""
    os.makedirs(saida,exist_ok=True)
    gm_=re.sub(r'<!--.*?-->','',gm,flags=re.S);g=guia_html(gm_,barra,tema);t,sl=split_slides(sm)
    P=lambda e,n:os.path.join(saida,n+prefixo+e)
    arqs=[P('.md','Treinamento_'),P('.html','Treinamento_'),P('.md','Apresentacao_'),P('.html','Apresentacao_')]
    open(arqs[1],'w',encoding='utf-8').write(g);open(arqs[3],'w',encoding='utf-8').write(slides_html(t,sl,rodape,tema))
    open(arqs[0],'w',encoding='utf-8').write(gm);open(arqs[2],'w',encoding='utf-8').write(sm)
    msg=''
    try:guia_docx(gm_,P('.docx','Treinamento_'),rodape or title_of(gm_,''),tema);arqs.append(P('.docx','Treinamento_'));msg+=' | docx: ok'
    except Exception as e:msg+=' | docx: ERRO %s'%e
    try:slides_pptx(t,sl,P('.pptx','Apresentacao_'),rodape,tema);arqs.append(P('.pptx','Apresentacao_'));msg+=' | pptx: ok'
    except Exception as e:msg+=' | pptx: ERRO %s'%e
    res='OK | slides: %d | checklists: %d | exercicios: %d%s | links: %d | imagens: %d'%(len(sl),g.count('class="task"'),len(re.findall(r'<h3 id="exercicio',g)),msg,g.count('<a href="http'),len(IMG.findall(gm))+len(IMG.findall(sm)))+' | tema: '+tema
    return arqs,res
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('guia');a.add_argument('apresentacao');a.add_argument('--prefixo',default='Curso');a.add_argument('--rodape',default='');a.add_argument('--barra',default='');a.add_argument('--saida',default='.')
    a.add_argument('--sem-embutir',action='store_true',help='não converter imagens para base64');a.add_argument('--tema',default=TEMA_PADRAO,choices=sorted(TEMAS),help='layout dos arquivos (padrão: %(default)s)');a=a.parse_args()
    gm=open(a.guia,encoding='utf-8').read();sm=open(a.apresentacao,encoding='utf-8').read()
    if not a.sem_embutir:
        gm,n1,f1=embed_images(gm,os.path.dirname(os.path.abspath(a.guia)));sm,n2,f2=embed_images(sm,os.path.dirname(os.path.abspath(a.apresentacao)))
        if n1+n2:print('Imagens embutidas em base64: %d'%(n1+n2))
        for f in f1+f2:print('AVISO: imagem não encontrada/baixada: %s'%f)
    _,res=gerar(gm,sm,a.prefixo,a.rodape,a.barra,a.saida,a.tema)
    print(res)
    if 'ERRO' in res:raise SystemExit(1)
