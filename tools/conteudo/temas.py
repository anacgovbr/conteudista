import re, json, copy

# Temas embutidos e temas personalizados.
# - Os temas embutidos continuam iguais aos anteriores (govbr, classico, ANAC 20).
# - Um tema personalizado chega como dicionario ou JSON (vindo do editor no navegador) e e
#   normalizado aqui: cores, fontes, papeis de tela, imagens, Mermaid e posicoes.
# - O mesmo catalogo (recursos/temas/padroes.json) alimenta o editor web (config/temas.json).

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
 'anac20-claro':{'nome':'ANAC 20 anos — claro','map':_GOV_MAP,'fonte':"'Rawline','Raleway',\"Segoe UI\",Arial,sans-serif",'import':'','extra_g':'','extra_s':'',
   'docx_font':'Arial','pptx_font':'Arial','pptx_destaque':'D5A900','pptx_modelo':'anac20-claro','pptx_escuro':False},
 'anac20-escuro':{'nome':'ANAC 20 anos — escuro','map':_GOV_MAP,'fonte':"'Rawline','Raleway',\"Segoe UI\",Arial,sans-serif",'import':'','extra_g':'','extra_s':'',
   'docx_font':'Arial','pptx_font':'Arial','pptx_destaque':'D5A900','pptx_modelo':'anac20-escuro','pptx_escuro':True},
}
TEMA_PADRAO='govbr'

TELAS=('capa','interna_clara','interna_escura','finalizacao','licenciamento')
ROTULO_TELA={'capa':'Capa','interna_clara':'Tela interna clara','interna_escura':'Tela interna escura',
             'finalizacao':'Finalização','licenciamento':'Licenciamento'}

# Limites usados na normalizacao (o editor mostra os mesmos valores).
LIMITES={
 'fontes.tamanho_base':(14,32),'fontes.tamanho_titulo':(28,72),'fontes.tamanho_h2':(18,44),
 'fontes.entrelinha':(1.1,2.2),'fontes.espacamento':(-0.1,0.2),
 'telas.imagem_opacidade':(0,100),'telas.titulo_largura':(20,100),'telas.titulo_deslocamento_x':(0,80),
 'telas.titulo_deslocamento_y':(-40,40),'imagens.tamanho_base':(25,160),'imagens.arredondamento':(0,48),
 'mermaid.escala':(50,200),'posicoes.margem':(20,120),'posicoes.topo':(10,120),'posicoes.base':(20,120),
 'posicoes.titulo_espaco':(0,60)}

_CATALOGO=None
def catalogo():
    "Catalogo compartilhado dos temas embutidos (o mesmo arquivo do editor web)."
    global _CATALOGO
    if _CATALOGO is None:
        try:
            from .recursos import ler_recurso
            _CATALOGO=json.loads(ler_recurso('temas/padroes.json'))
        except Exception:
            _CATALOGO={'versao':1,'padrao':'govbr','temas':{k:{'nome':v['nome']} for k,v in TEMAS.items()}}
    return _CATALOGO

def _copia(v):return copy.deepcopy(v)

def _cor_valida(v,padrao):
    v=str(v or '').strip().lower()
    if not v.startswith('#'):v='#'+v
    return v if re.match(r'^#[0-9a-f]{6}$',v) else padrao

def _num(v,padrao,faixa=None,inteiro=False):
    try:n=float(v)
    except Exception:return padrao
    if inteiro:n=int(round(n))
    if faixa:n=max(faixa[0],min(faixa[1],n))
    return n

def _texto_curto(v,padrao,limite=120):
    v=re.sub(r'\s+',' ',str(v or '')).strip()
    return v[:limite] if v else padrao

def _tela_padrao(base,tela):
    return _copia(catalogo().get('temas',{}).get(base,{}).get('telas',{}).get(tela) or
                  catalogo().get('temas',{}).get('govbr',{}).get('telas',{}).get(tela) or
                  {'fundo':'#ffffff','texto':'#333333','imagem':'','imagem_opacidade':100,'imagem_posicao':'center',
                   'titulo_alinhamento':'left','titulo_largura':100,'titulo_deslocamento_x':0,'titulo_deslocamento_y':0})

def _modelo_padrao(base='govbr'):
    cat=catalogo().get('temas',{}).get(base) or catalogo().get('temas',{}).get('govbr') or {}
    base=base if base in catalogo().get('temas',{}) else 'govbr'
    modelo={'id':'','nome':'Novo tema','descricao':'','embutido':False,'base':base,
            'paleta':_copia(cat.get('paleta') or {}),'fontes':_copia(cat.get('fontes') or {}),
            'telas':{t:_tela_padrao(base,t) for t in TELAS},
            'imagens':_copia(cat.get('imagens') or {}),'mermaid':_copia(cat.get('mermaid') or {}),
            'posicoes':_copia(cat.get('posicoes') or {})}
    return modelo

PALETA_PADRAO={'primaria':'#0c326f','destaque':'#1351b4','apoio':'#168821','alerta':'#8a5c00','erro':'#e52207',
               'fundo':'#f8f8f8','superficie':'#ffffff','texto':'#333333','texto_suave':'#636363','linha':'#cccccc','suave':'#edf5ff'}
FONTES_PADRAO={'titulo':'Rawline, Raleway, Segoe UI, Arial, sans-serif','texto':'Rawline, Raleway, Segoe UI, Arial, sans-serif',
               'tamanho_base':23,'tamanho_titulo':40,'tamanho_h2':26,'entrelinha':1.45,'espacamento':0}
POSICOES_PADRAO={'margem':60,'topo':44,'base':60,'titulo_espaco':22}

def normalizar_tema(dados):
    "Aceita dict ou JSON e devolve um tema completo, com valores seguros e dentro dos limites."
    if isinstance(dados,str):
        try:dados=json.loads(dados)
        except Exception:dados={}
    if not isinstance(dados,dict):dados={}
    base=str(dados.get('base') or dados.get('id') or 'govbr')
    if base not in catalogo().get('temas',{}):base='govbr'
    T=_modelo_padrao(base)
    T['id']=_texto_curto(dados.get('id') or '', 'personalizado', 80)
    T['nome']=_texto_curto(dados.get('nome'), 'Tema personalizado', 80)
    T['descricao']=_texto_curto(dados.get('descricao') or '', '', 240)
    T['base']=base;T['embutido']=False
    for k,p in PALETA_PADRAO.items():
        T['paleta'][k]=_cor_valida((dados.get('paleta') or {}).get(k),T['paleta'].get(k,p))
    for k,p in FONTES_PADRAO.items():
        v=(dados.get('fontes') or {}).get(k)
        if k in ('titulo','texto'):
            v=re.sub(r'[;\n\r]',' ',str(v or '')).strip()
            T['fontes'][k]=v[:160] or p
        else:
            faixa=LIMITES.get('fontes.'+k)
            T['fontes'][k]=_num(v,T['fontes'].get(k,p),faixa,inteiro=k in ('tamanho_base','tamanho_titulo','tamanho_h2'))
    for t in TELAS:
        d=(dados.get('telas') or {}).get(t) or {}
        x=T['telas'].setdefault(t,_tela_padrao(base,t))
        x['fundo']=_cor_valida(d.get('fundo'),x.get('fundo','#ffffff'))
        x['texto']=_cor_valida(d.get('texto'),x.get('texto','#333333'))
        img=str(d.get('imagem') or '').strip()
        if img and not (img.startswith('data:image/') or re.match(r'^temas/[A-Za-z0-9_./-]+\.(png|jpe?g|webp)$',img)):
            img=''
        x['imagem']=img
        x['imagem_opacidade']=_num(d.get('imagem_opacidade'),x.get('imagem_opacidade',100),LIMITES['telas.imagem_opacidade'],True)
        x['imagem_posicao']=d.get('imagem_posicao') if d.get('imagem_posicao') in ('center','top','bottom','left','right') else x.get('imagem_posicao','center')
        x['titulo_alinhamento']=d.get('titulo_alinhamento') if d.get('titulo_alinhamento') in ('left','center','right') else x.get('titulo_alinhamento','left')
        x['titulo_largura']=_num(d.get('titulo_largura'),x.get('titulo_largura',100),LIMITES['telas.titulo_largura'],True)
        x['titulo_deslocamento_x']=_num(d.get('titulo_deslocamento_x'),x.get('titulo_deslocamento_x',0),LIMITES['telas.titulo_deslocamento_x'],True)
        x['titulo_deslocamento_y']=_num(d.get('titulo_deslocamento_y'),x.get('titulo_deslocamento_y',0),LIMITES['telas.titulo_deslocamento_y'],True)
    for k,p in (('tamanho_base',100),('arredondamento',0)):
        T['imagens'][k]=_num((dados.get('imagens') or {}).get(k),T['imagens'].get(k,p),LIMITES['imagens.'+k],True)
    T['imagens']['sombra']=bool((dados.get('imagens') or {}).get('sombra'))
    T['mermaid']['tema']=(dados.get('mermaid') or {}).get('tema') if (dados.get('mermaid') or {}).get('tema') in ('default','neutral','dark','forest') else T['mermaid'].get('tema','default')
    T['mermaid']['escala']=_num((dados.get('mermaid') or {}).get('escala'),T['mermaid'].get('escala',100),LIMITES['mermaid.escala'],True)
    T['mermaid']['fundo']=_cor_valida((dados.get('mermaid') or {}).get('fundo'),T['mermaid'].get('fundo','#ffffff'))
    for k,p in POSICOES_PADRAO.items():
        T['posicoes'][k]=_num((dados.get('posicoes') or {}).get(k),T['posicoes'].get(k,p),LIMITES['posicoes.'+k],True)
    T['custom']=True
    T['fonte']="'%s',sans-serif"%(T['fontes']['titulo'].split(',')[0].strip("'\" "))
    T['fonte_texto']="'%s',sans-serif"%(T['fontes']['texto'].split(',')[0].strip("'\" "))
    T['import']='';T['extra_g']='';T['extra_s']='';T['map']={}
    T['docx_font']=T['fontes']['texto'].split(',')[0].strip("'\" ") or 'Verdana'
    T['pptx_font']=T['fontes']['texto'].split(',')[0].strip("'\" ") or 'Arial'
    T['pptx_destaque']=T['paleta']['destaque'][1:].upper()
    return T

def tema_de(t):
    "Tema embutido (chave) ou personalizado (dict/JSON). Sempre devolve um tema valido."
    if isinstance(t,dict) or (isinstance(t,str) and t.lstrip().startswith('{')):
        return normalizar_tema(t)
    return TEMAS.get(t or TEMA_PADRAO) or TEMAS[TEMA_PADRAO]

def eh_personalizado(T):
    return bool(isinstance(T,dict) and T.get('custom'))

def _cor(h,T):
    h=h.lower();h=h if h.startswith('#') else '#'+h
    return (T.get('map') or {}).get(h,h)

def tcss(css,T,extra=''):
    css=re.sub(r'#[0-9a-fA-F]{6}\b',lambda m:_cor(m.group(0),T),css)
    if T.get('fonte'):css=css.replace('"Segoe UI",Roboto,Arial,sans-serif',T['fonte'])
    return (T.get('import') or '')+css+(extra or '')

def thex(h,T):return _cor(h,T)[1:].upper()

def trgb(h,T):
    from docx.shared import RGBColor as _R
    return _R.from_string(thex(h,T))

def cor(T,chave,padrao='#000000'):
    "Cor da paleta do tema (personalizado) ou a cor do mapa do tema embutido."
    if eh_personalizado(T):return (T.get('paleta') or {}).get(chave,padrao)
    return _cor(padrao,T)

# Cores fixas usadas pelos geradores antigos (DOCX/PPTX) -> chave semântica da paleta.
LEGADO_COR={'0B3D6E':'primaria','0A7CC1':'destaque','19A974':'apoio','1E7B4F':'apoio','9A5B00':'alerta',
            '5A6676':'texto_suave','EAF1F8':'suave','E9F6F0':'suave','FFF4E0':'suave','F1F4F8':'suave',
            'F2F7FC':'fundo','D6ECFF':'suave','E8F2FB':'suave','CFE3F5':'texto_suave','1B2430':'texto'}

def hex_legado(h,T):
    "Converte uma cor fixa antiga para a paleta do tema personalizado; nos embutidos, mantém o mapa."
    if eh_personalizado(T):
        h=(T.get('paleta') or {}).get(LEGADO_COR.get(str(h).upper().lstrip('#'),''),h)
    return thex(h,T)

def paleta(T):
    if eh_personalizado(T):return T['paleta']
    return {'primaria':_cor('#0b3d6e',T),'destaque':_cor('#0a7cc1',T),'apoio':_cor('#19a974',T),
            'alerta':_cor('#9a5b00',T),'erro':'#e52207','fundo':_cor('#f6f8fb',T),'superficie':'#ffffff',
            'texto':_cor('#1b2430',T),'texto_suave':_cor('#5a6676',T),'linha':_cor('#dfe5ee',T),'suave':_cor('#eef4fa',T)}

# ---------------------------- Contraste (WCAG 2.x) ----------------------------
def _canal(v):
    v=v/255.0
    return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4

def luminancia(hexcor):
    h=_cor_valida(hexcor,'#000000')[1:]
    r,g,b=(int(h[i:i+2],16) for i in (0,2,4))
    return 0.2126*_canal(r)+0.7152*_canal(g)+0.0722*_canal(b)

def contraste(a,b):
    la,lb=luminancia(a),luminancia(b)
    if la<lb:la,lb=lb,la
    return (la+0.05)/(lb+0.05)

def pares_contraste(T):
    "Pares essenciais avaliados no editor e antes de gerar. Nivel AA: 4,5 (texto) e 3,0 (titulo grande)."
    p=paleta(T);t=T['telas'] if eh_personalizado(T) else {k:_tela_padrao('govbr',k) for k in TELAS}
    pares=[
      ('corpo_claro','Texto da tela interna clara',t['interna_clara']['texto'],t['interna_clara']['fundo'],4.5),
      ('corpo_escuro','Texto da tela interna escura',t['interna_escura']['texto'],t['interna_escura']['fundo'],4.5),
      ('capa','Texto da capa',t['capa']['texto'],t['capa']['fundo'],3.0),
      ('finalizacao','Texto da finalização',t['finalizacao']['texto'],t['finalizacao']['fundo'],3.0),
      ('licenciamento','Texto do licenciamento',t['licenciamento']['texto'],t['licenciamento']['fundo'],4.5),
      ('texto_superficie','Texto sobre a superfície',p['texto'],p['superficie'],4.5),
      ('primaria_fundo','Cor primária sobre o fundo',p['primaria'],p['fundo'],4.5),
      ('branco_primaria','Texto branco sobre a cor primária','#ffffff',p['primaria'],4.5),
      ('destaque_fundo','Cor de destaque sobre o fundo',p['destaque'],p['fundo'],4.5),
    ]
    out=[]
    for chave,rotulo,a,b,minimo in pares:
        r=contraste(a,b)
        out.append({'chave':chave,'rotulo':rotulo,'a':a,'b':b,'minimo':minimo,'razao':round(r,2),'ok':r+1e-9>=minimo})
    return out

def _melhor_texto(fundo,minimo):
    "Preto ou branco, o que tiver maior contraste com o fundo."
    return '#000000' if contraste('#000000',fundo)>=contraste('#ffffff',fundo) else '#ffffff'

def _ajustar_cor(cor_atual,fundo,minimo):
    "Escurece ou clareia a cor ate atingir o contraste minimo, preservando o matiz quando possivel."
    if contraste(cor_atual,fundo)>=minimo:return cor_atual
    alvo='#000000' if luminancia(fundo)>0.5 else '#ffffff'
    h=_cor_valida(cor_atual,'#000000')[1:]
    r,g,b=(int(h[i:i+2],16) for i in (0,2,4))
    tr,tg,tb=(int(alvo[i:i+2],16) for i in (1,3,5))
    melhor=alvo
    for passo in range(1,101):
        f=passo/100.0
        c='#%02x%02x%02x'%(int(r+(tr-r)*f),int(g+(tg-g)*f),int(b+(tb-b)*f))
        if contraste(c,fundo)>=minimo:melhor=c;break
    return melhor

def corrigir_contraste(T):
    "Devolve uma copia do tema com os pares essenciais corrigidos (nunca altera o original)."
    T=_copia(T)
    if not eh_personalizado(T):return T
    p=T['paleta'];t=T['telas']
    for tela in ('interna_clara','interna_escura','licenciamento'):
        t[tela]['texto']=_ajustar_cor(t[tela]['texto'],t[tela]['fundo'],4.5)
    for tela in ('capa','finalizacao'):
        t[tela]['texto']=_ajustar_cor(t[tela]['texto'],t[tela]['fundo'],3.0)
    p['texto']=_ajustar_cor(p['texto'],p['superficie'],4.5)
    p['primaria']=_ajustar_cor(p['primaria'],p['fundo'],4.5)
    if contraste('#ffffff',p['primaria'])<4.5:p['primaria']=_ajustar_cor(p['primaria'],p['fundo'],4.5)
    p['destaque']=_ajustar_cor(p['destaque'],p['fundo'],4.5)
    # Se a primaria ficou clara demais para o branco, escurece ate o branco passar.
    passo=0
    while contraste('#ffffff',p['primaria'])<4.5 and passo<60:
        p['primaria']=_ajustar_cor(p['primaria'],'#000000',4.5);passo+=1
    return T

def falhas_contraste(T,nivel=None):
    minimo=6.0 if str(nivel or '').lower()=='aaa' else None
    return [p for p in pares_contraste(T) if (p['minimo'] if minimo is None else max(p['minimo'],minimo))>p['razao']+1e-9]

# ---------------------------- Papeis de tela ----------------------------
def papeis_slides(sl,tem_licenca=False):
    "Uma funcao por slide: capa, interna_clara, interna_escura, finalizacao e licenciamento."
    n=len(sl or [])
    ultimo_titulo=-1
    for i,(c,b,nt) in enumerate(sl or []):
        if c=='title' or any(x[0]=='h' and x[1]==1 for x in (b or [])):ultimo_titulo=i
    papeis=[]
    for i,(c,b,nt) in enumerate(sl or []):
        if c in TELAS:papel=c
        elif i==0:papel='capa'
        elif i==ultimo_titulo:papel='finalizacao'
        else:papel='interna_clara'
        papeis.append(papel)
    if tem_licenca:papeis.append('licenciamento')
    return papeis

# ---------------------------- CSS gerado ----------------------------
def _css_cores(T,p):
    return (':root{--pri:%s;--acc:%s;--ac2:%s;--ink:%s;--mu:%s;--line:%s;--soft:%s;--bg:%s;--pa:%s;--ok:%s;--wa:%s;--qi:%s;--qib:%s;--qt:%s;--qtb:%s;--qw:%s;--qwb:%s;--th:%s;--code:%s}'
            %(p['primaria'],p['destaque'],p['apoio'],p['texto'],p['texto_suave'],p['linha'],p['suave'],
              p['fundo'],p['superficie'],p['apoio'],p['alerta'],p['destaque'],p['suave'],p['apoio'],
              p['suave'],p['alerta'],p['suave'],p['suave'],p['suave']))

def css_apostila(T):
    "Camada de CSS do tema personalizado para a apostila. Vem depois do layout base."
    if not eh_personalizado(T):return ''
    p=T['paleta'];f=T['fontes'];img=T['imagens'];lic=T['telas']['licenciamento']
    sombra='0 2px 10px rgba(0,0,0,.18)' if img.get('sombra') else 'none'
    r=[
      _css_cores(T,p),
      f"body{{background:{p['fundo']};color:{p['texto']};font-family:{f['texto']},sans-serif;font-size:{f['tamanho_base']}px;line-height:{f['entrelinha']};letter-spacing:{f['espacamento']}em}}",
      f"header{{background:{p['primaria']};color:#fff}}header .t{{color:#fff}}header button,header select{{color:#fff;border-color:rgba(255,255,255,.55)}}",
      f"article{{background:{p['superficie']};border-color:{p['linha']};border-radius:{img['arredondamento']}px}}",
      f"h1{{color:{p['primaria']};font-family:{f['titulo']},sans-serif;font-size:{f['tamanho_titulo']}px}}h2{{color:{p['primaria']};border-top-color:{p['destaque']};font-family:{f['titulo']},sans-serif;font-size:{f['tamanho_h2']}px}}",
      f"h3{{color:{p['primaria']};font-family:{f['titulo']},sans-serif;font-size:{max(15,int(f['tamanho_base']*0.78))}px}}a{{color:{p['destaque']}}}",
      f"nav a.on,nav a:hover{{background:{p['suave']};color:{p['primaria']}}}",
      f"th{{background:{p['suave']};color:{p['primaria']}}}td,th{{border-color:{p['linha']}}}",
      f"blockquote{{background:{p['suave']};border-left-color:{p['destaque']}}}blockquote.info{{background:{p['suave']};border-left-color:{p['destaque']}}}",
      f"blockquote.tip{{background:{p['suave']};border-left-color:{p['apoio']}}}blockquote.warning{{background:{p['suave']};border-left-color:{p['alerta']}}}",
      f"figure img{{border-radius:{img['arredondamento']}px;box-shadow:{sombra};max-width:{img['tamanho_base']}%}}",
      f".mw{{background:{T['mermaid']['fundo']};border-color:{p['linha']}}}pre.mermaid{{color:{p['texto']}}}",
      f".licenciamento{{background:{lic['fundo']};color:{lic['texto']};border-radius:8px;padding:18px 22px}}",
      f".licenciamento h2,.licenciamento h3,.licenciamento p,.licenciamento a{{color:{lic['texto']}}}",
      "@media print{body{background:#fff;color:#000}article{box-shadow:none}}",
    ]
    return '\n'.join(r)

def _fundo_tela(tela):
    img=tela.get('imagem') or ''
    if not img:return tela['fundo']
    op=max(0,min(100,int(tela.get('imagem_opacidade',100))))
    veu=(100-op)/100.0
    h=tela['fundo'].lstrip('#')
    rgba='rgba(%d,%d,%d,%.3f)'%(int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),veu)
    pos=tela.get('imagem_posicao','center')
    return 'linear-gradient(%s,%s),url("%s") %s/cover no-repeat'%(rgba,rgba,img.replace('"','%22'),pos)

def css_apresentacao(T,papeis):
    "Camada de CSS do tema personalizado para os slides, por papel de tela."
    if not eh_personalizado(T):return ''
    p=T['paleta'];f=T['fontes'];pos=T['posicoes'];img=T['imagens']
    regras=[_css_cores(T,p)]
    for papel in TELAS:
        t=T['telas'][papel]
        seletor='.s.papel-'+papel.replace('_','-')
        regras.append('%s{background:%s;color:%s}'%(seletor,_fundo_tela(t),t['texto']))
        regras.append('%s h1,%s h2,%s h3,%s p,%s li,%s strong{color:%s}'%(seletor,seletor,seletor,seletor,seletor,seletor,t['texto']))
        regras.append('%s a{color:%s}%s code{background:rgba(0,0,0,.12);color:%s}'%(seletor,p['destaque'],seletor,t['texto']))
        regras.append('%s h1{font-family:%s,sans-serif;font-size:%spx;border-bottom-color:%s;text-align:%s}'%(seletor,f['titulo'],round(f['tamanho_titulo']*(1.45 if papel in ('capa','finalizacao') else 1)),p['destaque'],t['titulo_alinhamento']))
        regras.append('%s h2{font-family:%s,sans-serif;font-size:%spx;color:%s}'%(seletor,f['titulo'],f['tamanho_h2'],t['texto']))
        regras.append('%s .in{left:%spx;right:%spx;top:%spx;bottom:%spx}'%(seletor,pos['margem'],pos['margem'],pos['topo'],pos['base']))
        if papel in ('capa','finalizacao'):
            regras.append('%s .in{margin-left:%s%%;width:%s%%}'%(seletor,t['titulo_deslocamento_x'],t['titulo_largura']))
            regras.append('%s .in{transform:translateY(%s%%)}'%(seletor,t['titulo_deslocamento_y']))
        regras.append('%s table{background:%s;color:%s}%s th{background:%s;color:#fff}%s td{border-color:%s}%s tr:nth-child(even) td{background:%s}'%(seletor,p['superficie'],p['texto'],seletor,p['primaria'],seletor,p['linha'],seletor,p['suave']))
        regras.append('%s blockquote{background:%s;border-left-color:%s}%s blockquote p{color:%s}'%(seletor,p['suave'],p['apoio'],seletor,p['texto']))
        regras.append('%s .mw{background:%s;border-color:%s}%s pre.mermaid{color:%s}'%(seletor,T['mermaid']['fundo'],p['linha'],seletor,t['texto']))
    regras.append('.s p,.s li{font-size:%spx;line-height:%s}'%(f['tamanho_base'],f['entrelinha']))
    regras.append('.s .in{letter-spacing:%sem}'%f['espacamento'])
    regras.append('.s figure img{max-width:%s%%;border-radius:%spx;box-shadow:%s}'%(img['tamanho_base'],img['arredondamento'],'0 2px 10px rgba(0,0,0,.18)' if img.get('sombra') else 'none'))
    escala=max(0.5,min(2.0,float(T['mermaid'].get('escala',100))/100.0))
    regras.append('.s .mw img.fxi{max-height:%spx}'%int(520*escala))
    regras.append('.s .mw svg{max-height:%spx}'%int(520*escala))
    return '\n'.join(regras)

def css_mermaid_variaveis(T):
    "Variaveis do Mermaid (usadas no HTML da apostila e no tema do PPTX)."
    if not eh_personalizado(T):return ''
    p=T['paleta']
    return ('%%{init: {"theme": "%s", "themeVariables": {"primaryColor": "%s", "primaryTextColor": "%s", "lineColor": "%s", "secondaryColor": "%s", "tertiaryColor": "%s", "fontFamily": "%s"}}}%%'
            %(T['mermaid'].get('tema','default'),p['suave'],p['texto'],p['texto_suave'],p['superficie'],p['fundo'],T['fontes']['texto'].split(',')[0].strip("'\" ")))

def mermaid_config(T):
    "Configuracao entregue ao Mermaid no HTML gerado (vazia nos temas embutidos: comportamento anterior)."
    if not eh_personalizado(T):return '{}'
    p=T['paleta']
    cfg={'theme':T['mermaid'].get('tema','default'),
         'themeVariables':{'primaryColor':p['suave'],'primaryTextColor':p['texto'],'lineColor':p['texto_suave'],
                           'secondaryColor':p['superficie'],'tertiaryColor':p['fundo'],
                           'fontFamily':T['fontes']['texto'].split(',')[0].strip("'\" ")}}
    return json.dumps(cfg,ensure_ascii=False).replace('</','<\\/')

def nome_de(t):
    if isinstance(t,dict):return t.get('nome') or 'Tema personalizado'
    return (TEMAS.get(t or TEMA_PADRAO) or TEMAS[TEMA_PADRAO])['nome']

def chave_markdown(t):
    "Identificador curto e seguro para o frontmatter theme: de um tema personalizado."
    if isinstance(t,str) and not t.lstrip().startswith('{'):return t if t in TEMAS else TEMA_PADRAO
    n=nome_de(t)
    s=re.sub(r'[^a-z0-9]+','-',str(n).lower().translate(str.maketrans('áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn'))).strip('-')
    return s or 'personalizado'