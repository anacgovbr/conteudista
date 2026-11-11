import re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from .audio import MIME_AUDIO
from .contexto import aviso, decorativa
from . import licencas
from .fontes import fontes_css
from .markdown import blocks, mermaid_edges, plain, runs, slug, title_of
from .recursos import ler_recurso
from .temas import TEMA_PADRAO, tcss, tema_de

LEITURA_HEAD=ler_recurso('acessibilidade/preferencias.js')

LEITURA_SEL=ler_recurso('acessibilidade/fonte.html')

LEITURA_JS=ler_recurso('acessibilidade/fonte.js')

def inl(t):
    s=''
    for x,b,i,c,u in runs(t):
        if c==2:
            decor=decorativa(u,x);s+='<img class="il" src="%s" alt="%s">'%(E(u),E('' if decor else x));continue
        h=E(x,quote=False)
        if c:h='<code>'+h+'</code>'
        if i:h='<em>'+h+'</em>'
        if b:h='<strong>'+h+'</strong>'
        if u:
            if re.match(r'(?i)https?://',u):h='<a href="%s" target="_blank" rel="noopener noreferrer">%s<span class="vh"> (abre em nova aba)</span></a>'%(E(u),h)
            else:h='<a href="%s">%s</a>'%(E(u),h)
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

_TB=[0]
def _tabela_html(r,nome,cap=''):
    "1.93 (WCAG 1.3.1/2.4.6): cada tabela com nome proprio; 'Tabela: texto' antes da tabela vira legenda (caption)."
    _TB[0]+=1;n=_TB[0]
    if cap:
        cid='tbc%d'%n
        t='<div class="tbl" role="region" aria-labelledby="%s" tabindex="0"><table><caption id="%s">%s</caption>'%(cid,cid,inl(cap))
    else:
        t='<div class="tbl" role="region" aria-label="%s" tabindex="0"><table>'%E(('Tabela %d — %s'%(n,nome)) if nome else 'Tabela %d'%n)
    t+='<thead><tr>'+''.join('<th scope="col">%s</th>'%inl(x) for x in r[0])+'</tr></thead><tbody>'
    t+=''.join('<tr>'+''.join('<td>%s</td>'%inl(x) for x in y)+'</tr>' for y in r[1:])
    return t+'</tbody></table></div>'
def html_of(bl,toc=None,_ctx=None):
    o=[];ctx=_ctx if _ctx is not None else {'tit':''};cap=None
    for b in bl:
        k=b[0]
        if k=='p' and re.match(r'(?i)^tabela\s*:\s*\S',b[1]):
            if cap is not None:o.append('<p>'+inl('Tabela: '+cap)+'</p>')
            cap=re.sub(r'(?i)^tabela\s*:\s*','',b[1]).strip();continue
        if cap is not None and k!='table':o.append('<p>'+inl('Tabela: '+cap)+'</p>');cap=None
        if k=='h':
            sid=slug(b[2]);ctx['tit']=plain(b[2])
            if toc is not None and b[1] in(2,3):toc.append((b[1],sid,plain(b[2])))
            o.append('<h%d id="%s">%s</h%d>'%(b[1],sid,inl(b[2]),b[1]))
        elif k=='p':o.append('<p>'+inl(b[1])+'</p>')
        elif k=='img':
            decor=decorativa(b[2],b[1])
            if not b[1].strip() and not decor:aviso('Imagem sem descrição (texto alternativo vazio): %s'%(b[2][:60]+'…' if len(b[2])>60 else b[2]))
            alt='' if decor else b[1]
            o.append('<figure><img src="%s" alt="%s">%s</figure>'%(E(b[2]),E(alt),'<figcaption aria-hidden="true">%s</figcaption>'%E(b[1]) if b[1] and not decor else ''))
        elif k=='table':o.append(_tabela_html(b[1],ctx['tit'],cap or ''));cap=None
        elif k=='list':o.append(lst_html(b[1]))
        elif k=='quote':o.append('<blockquote class="%s">%s</blockquote>'%(b[1],html_of(b[2],None,ctx)))
        elif k=='code':o.append(_mermaid_html(b[2]) if b[1]=='mermaid' else '<pre class="code" tabindex="0"><code>%s</code></pre>'%E(b[2]))
    if cap is not None:o.append('<p>'+inl('Tabela: '+cap)+'</p>')
    return '\n'.join(o)
def _tabela_fluxo(code,foco=True):
    "Alternativa textual do fluxo Mermaid: tabela De / Condição / Para."
    try:rows=mermaid_edges(code)
    except Exception:rows=None
    if not rows or len(rows)<2:return '<pre class="code"%s><code>%s</code></pre>'%(' tabindex="0"' if foco else '',E(code))
    t='<table><thead><tr>'+''.join('<th scope="col">%s</th>'%E(c) for c in rows[0])+'</tr></thead><tbody>'
    t+=''.join('<tr>'+''.join('<td>%s</td>'%E(c) for c in x)+'</tr>' for x in rows[1:])+'</tbody></table>'
    return '<div class="tbl" role="region" aria-label="Tabela do fluxo" tabindex="0">%s</div>'%t if foco else '<div class="tbl">%s</div>'%t

def _mermaid_html(code):
    # Desenho (Mermaid) + tabela do fluxo em <details> na tela + cópia só para impressão (não depende de JavaScript).
    return ('<div class="mw" role="img" aria-label="%s"><pre class="mermaid">%s</pre></div>'
            '<details class="fluxo-tabela"><summary>Tabela do fluxo</summary>%s</details>'
            '<div class="fluxo-print" aria-hidden="true">%s</div>')%(E(_fluxo_alt(code)),E(code),_tabela_fluxo(code),_tabela_fluxo(code,False))

MER=ler_recurso('diagramas/apostila.html')

CSS_G=ler_recurso('apostila/layout.css')

JS_G=ler_recurso('apostila/controles.js')

CSS_S=ler_recurso('apresentacao/layout.css')

JS_S=ler_recurso('apresentacao/controles.js')

SLIDES_MODO_HEAD=ler_recurso('apresentacao/inicio-head.js')

SLIDES_MODO_BODY=ler_recurso('apresentacao/inicio-body.js')

CSS_S_A11Y=ler_recurso('apresentacao/acessibilidade.css')

CSS_G_A11Y=ler_recurso('apostila/acessibilidade.css')

TAM_HTML=ler_recurso('acessibilidade/tamanho.html')

TAM_JS=ler_recurso('acessibilidade/tamanho.js')

PAINEL_A11Y_CSS=ler_recurso('acessibilidade/painel.css')

def painel_a11y(vlibras=True, legendas=False, leitura=False):
        libras = ('<p class="a11y-aviso">Ativar VLibras acessa um serviço externo e precisa de internet. Desative para conteúdo interno.</p>'
            '<button type="button" class="sec" data-a11y="vlibras">Ativar VLibras</button>') if vlibras else ''
        legenda = '<label><input type="checkbox" data-a11y="legendas" checked> Legendas da narração</label>' if legendas else ''
        texto = ('<h3 class="a11y-sub">Texto e leitura</h3><div class="a11y-campo">'+LEITURA_SEL.replace('>Leitura</label>','>Fonte de leitura</label>')+'</div>'
            '<div id="tam" class="tam" role="group" aria-labelledby="tamL"><span id="tamL" class="tam-l">Tamanho do texto</span><div class="tam-b">'
            '<button id="tamM" type="button" aria-label="A\u2212: diminuir texto">A\u2212</button><button id="tamR" type="button" aria-label="Tamanho do texto: 100%. Voltar a 100%">100%</button><button id="tamP" type="button" aria-label="A+: aumentar texto">A+</button></div>'
            '<span id="tamS" class="vh" role="status" aria-live="polite"></span></div>') if leitura else ''
        return ('<dialog id="a11yPanel" class="a11y-panel" aria-labelledby="a11yPanelTitle">'
            '<header><h2 id="a11yPanelTitle" tabindex="-1">Acessibilidade</h2><button type="button" class="sec" data-a11y="fechar">Fechar</button></header>'
            '<div class="a11y-corpo">' + texto + '<h3 class="a11y-sub">Exibição</h3><label><input type="checkbox" data-a11y="contraste"> Alto contraste</label>'
            '<label><input type="checkbox" data-a11y="espacamento"> Espaçamento do texto (WCAG 1.4.12)</label>'
            '<label><input type="checkbox" data-a11y="regua"> Régua de leitura</label>'
            '<label><input type="checkbox" data-a11y="movimento"> Reduzir animações</label>'
            '<h3 class="a11y-sub">Controles</h3><label><input type="checkbox" data-a11y="barra"> Manter a barra de controles visível</label>' + legenda +
            '<h3 class="a11y-sub">Apoio</h3><button type="button" class="sec" data-a11y="ouvir">Ouvir texto atual</button>' + libras +
            '<p class="a11y-estado" id="a11yEstado" role="status" aria-live="polite"></p></div></dialog>' +
            '<div id="a11yRegua" class="a11y-ruler" aria-hidden="true"></div><p id="a11yLegendasLive" class="a11y-sr" role="status" aria-live="polite" aria-atomic="true"></p>')

A11Y_JS=ler_recurso('acessibilidade/painel.html')

def treinamento_html(md,bar,tema=None,vlibras=True,licenca=''):
    # Os temas ANAC 20 anos alteram somente a apresentação; a apostila permanece no padrão gov.br.
    T=tema_de('govbr' if str(tema or '').startswith('anac20-') else tema)
    _TB[0]=0;toc=[];b=html_of(blocks(md),toc)
    hs=list(re.finditer(r'<h2 id="[^"]+">(.*?)</h2>',b))
    for k,m in enumerate(hs):
        if 'gabarito' in m.group(1).lower():
            # o título fica visível; só o conteúdo (#gab) fica oculto, desfocado e fora da árvore de acessibilidade até ser mostrado
            e=hs[k+1].start() if k+1<len(hs) else len(b)
            b=b[:m.start()]+'<section class="gab-sec">'+m.group(0)+'<div id="gab" class="hid" aria-hidden="true" inert>'+b[m.end():e]+'</div></section>'+b[e:];break
    t=title_of(md,'Apostila');tc=''.join('<li class="lv%d"><a href="#%s">%s</a></li>'%(v,s,E(x)) for v,s,x in toc)
    b += licencas.aviso_html(licenca)
    return ('<!DOCTYPE html><html lang="pt-BR" data-theme="light" data-leitura="padrao"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title>'
    '<script>%s</script><style>%s%s%s%s</style></head><body><a class="skip" href="#conteudo">Ir para o conteúdo</a>'
    '<header><span class="t">%s</span><span id="pg" role="status" aria-live="polite"></span><label for="th" class="lt">Tema</label><select id="th"><option value="light">Tema claro</option><option value="dark">Tema escuro</option><option value="contrast">Alto contraste</option></select>'
    '%s%s<button type="button" id="a11yToggle" class="a11y-panel-toggle sec mini" aria-controls="a11yPanel" aria-expanded="false">Acessibilidade</button><button id="rs" type="button">Limpar checklists</button><button type="button" onclick="print()" title="Imprimir ou salvar em PDF em A4">Imprimir / PDF</button></header>'
    '<div class="wrap"><nav aria-label="Sumário"><ul>%s</ul></nav><main id="conteudo" tabindex="-1"><article>%s</article></main></div>%s<script>%s%s</script>%s%s</body></html>'
    )%(E(t),LEITURA_HEAD,fontes_css(),tcss(CSS_G,T,T['extra_g']),CSS_G_A11Y+ZOOM_CSS,PAINEL_A11Y_CSS+licencas.CSS,E(bar or t),LEITURA_SEL,TAM_HTML,tc,b,painel_a11y(vlibras),LEITURA_JS+TAM_JS+ZOOM_JS,JS_G.replace('__K__',slug(t)[:40]),A11Y_JS,MER)

ZOOM_CSS=ler_recurso('zoom/layout.css')

ZOOM_JS=ler_recurso('zoom/controles.js')

CSS_ESTREITO=ler_recurso('apresentacao/celular.css')

CSS_BPLUS=ler_recurso('apresentacao/barra.css')

CSS_NARR=ler_recurso('narracao/layout.css')

JS_NARR=ler_recurso('narracao/controles.js')

def _anac_html_css(tema,n,licenciada=False):
    if not str(tema or '').startswith('anac20-'):return ''
    pasta=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'temas',tema)
    def data(nome):
        cam=os.path.join(pasta,nome)
        return 'data:image/png;base64,'+base64.b64encode(open(cam,'rb').read()).decode('ascii') if os.path.isfile(cam) else ''
    imgs=[data('capa.png'),data('conteudo-a.png'),data('conteudo-b.png'),data('encerramento.png')]
    escuro=tema=='anac20-escuro'; tinta='#ffffff' if escuro else '#193f52'; mut='#dce8ee' if escuro else '#526d7c'
    regras=['.s{background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;color:%s!important}'%tinta,
      '.s h1,.s h2,.s h3,.s p,.s li{color:%s!important}.s .in{position:relative;z-index:1}.s:not(.title) .in{padding-top:1.2vh}'%tinta,
      '.s table{background:rgba(255,255,255,.94);color:#193f52}.s table *{color:#193f52!important}.s .nt{color:%s!important}'%mut]
    n_original=n-1 if licenciada else n
    for i in range(n):
        fundo=imgs[1 if i%2 else 2] if licenciada and i==n-1 else imgs[0] if i==0 else imgs[3] if i==n_original-1 else imgs[1 if i%2 else 2]
        if fundo:regras.append('.s:nth-child(%d){background-image:url("%s")!important}'%(i+1,fundo))
    if escuro:regras.append('.s.title .in{margin-left:37%;width:58%}.s.title h1{color:#fff!important}')
    else:regras.append('.s.title .in{margin-left:37%;width:58%}.s.title h1{color:#193f52!important}')
    return '\n'.join(regras)

MER_S=ler_recurso('diagramas/apresentacao.js')

def _mer_s(o):
    """Mermaid dos slides: so e carregado se algum fluxo ficou como codigo (sem imagem). Desenha com todos os slides mensuraveis (classe mm no CSS): o Mermaid nao desenha dentro de elemento oculto."""
    return MER_S if 'class="mermaid"' in o else ''

def _fluxos_dict(f):
    """Aceita o dicionario {codigo do fluxo: imagem em data URI} ou o mesmo em JSON (texto)."""
    if isinstance(f,str):
        try:
            import json;f=json.loads(f)
        except Exception:return {}
    return {str(k).strip():v for k,v in f.items() if isinstance(v,str) and v.startswith('data:image/')} if isinstance(f,dict) else {}

def _fluxo_alt(cod):
    """Texto alternativo do fluxo: as etapas na ordem em que aparecem."""
    try:
        vistos=[]
        for r in mermaid_edges(cod)[1:]:
            for x in (r[0],r[2]):
                if x and x not in vistos:vistos.append(x)
        return ('Fluxo: '+'; '.join(vistos))[:700] if vistos else 'Fluxo'
    except Exception:return 'Fluxo'

def _fluxos_img(o,fluxos):
    """Troca cada fluxo Mermaid do HTML dos slides pela imagem pre-renderizada do mesmo codigo, quando ela existe (a tabela do fluxo continua)."""
    if not fluxos:return o
    def rep(m):
        cod=html.unescape(m.group(1)).strip();img=fluxos.get(cod)
        if not img:return m.group(0)
        return '<figure class="mw fx fluxo"><img class="fxi" alt="%s" src="%s"><figcaption>Fluxo</figcaption></figure>'%(E(_fluxo_alt(cod)),img)
    return re.sub(r'<div class="mw"[^>]*><pre class="mermaid">(.*?)</pre></div>',rep,o,flags=re.S)

IMP_DLG=ler_recurso('apresentacao/impressao.html')

ICO_B={'prev':'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z','next':'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z','play':'M8 5v14l11-7z','pause':'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
 'von':'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
 'voff':'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z',
 'fs':'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z','fsx':'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z',
 'a11y':'M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z',
 'art':'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
 'sld':'M10 8v8l5-4-5-4zm9-5H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z',
 'more':'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'}

ICO_B.update({'nota':'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 14H6v-2h2v2zm0-3H6V9h2v2zm0-3H6V6h2v2zm7 6h-5v-2h5v2zm3-3h-8V9h8v2zm0-3h-8V6h8v2z','print':'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z','auto':'M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'})

def _ic(k,cls=''):
    return '<svg class="ic%s" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="%s"/></svg>'%((' '+cls) if cls else '',ICO_B[k])

def _slides_doc(t,sl,foot,tema=None,audios=None,avancar=False,fluxos=None,vlibras=True,licenca=''):
    """Monta o HTML da apresentação (com ou sem narração): ARIA, leitura, modo leitura, auto-ajuste e impressão A4."""
    _TB[0]=0;T=tema_de(tema);n_original=len(sl);n=n_original+bool(licenca);secs=[]
    for k,(c,b,nt) in enumerate(sl):
        rot='Slide %d de %d'%(k+1,n)
        nota='<aside class="nt" role="note" aria-label="Notas do apresentador"><p class="nt-t">Notas do apresentador</p><p class="nt-x">%s</p></aside>'%E(nt) if (nt or '').strip() else ''
        legenda='<p class="a11y-caption">%s</p>'%E(nt) if audios and k in audios and (nt or '').strip() else ''
        secs.append('<section class="s %s" role="group" aria-roledescription="slide" aria-label="%s" tabindex="-1"><p class="slide-num" aria-hidden="true">%s</p><div class="in"><div class="conteudo">%s</div></div>%s%s</section>'%(c,rot,rot,html_of(b),nota,legenda))
    if licenca:
        rot='Slide %d de %d'%(n,n)
        secs.append('<section class="s licenciamento" role="group" aria-roledescription="slide" aria-label="%s" tabindex="-1"><p class="slide-num" aria-hidden="true">%s</p><div class="in"><div class="conteudo">%s</div></div></section>'%(rot,rot,licencas.aviso_slide_html(licenca)))
    o=_fluxos_img(''.join(secs),fluxos)
    css=fontes_css()+tcss(CSS_S.replace('__F__',foot.replace('"','')),T,T['extra_s'])+_anac_html_css(tema,n,bool(licenca))+licencas.CSS
    narr=bool(audios);aud=''
    if narr:
        css+=CSS_NARR
        for k,cam in sorted(audios.items()):
            if 0<=k<n_original:
                mime=MIME_AUDIO.get(os.path.splitext(cam)[1].lower(),'audio/mpeg')
                aud+='<audio class="narr" data-s="%d" preload="auto" src="data:%s;base64,%s"></audio>'%(k,mime,base64.b64encode(open(cam,'rb').read()).decode())
    css+=CSS_S_A11Y+CSS_BPLUS+CSS_ESTREITO+ZOOM_CSS+PAINEL_A11Y_CSS
    hud=('<div id="hud" role="group" aria-label="Controles da apresentação" class="bplus" data-estado="visible">'
         '<button id="p" type="button" aria-label="Slide anterior" aria-keyshortcuts="ArrowLeft" data-dica="Slide anterior · ←">'+_ic('prev')+'</button>'
         '<button id="bp" type="button" aria-label="Reproduzir apresentação" aria-keyshortcuts="Space" data-on="false" data-dica="Reproduzir · Espaço">'+_ic('play','i-off')+_ic('pause','i-on')+'</button>'
         '<button id="n" type="button" aria-label="Próximo slide" aria-keyshortcuts="ArrowRight" data-dica="Próximo slide · →">'+_ic('next')+'</button>'
         '<button id="cbtn" class="cnt" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="irpara" aria-keyshortcuts="G" aria-label="Slide 1 de %d. Ir para o slide" data-dica="Ir para o slide · G">1 / %d</button>'%(n,n)+
         '<span id="c" role="status" aria-live="polite" aria-atomic="true" class="vh"></span>'
         +('<button id="bn" type="button" aria-pressed="false" aria-label="Som da narração" aria-keyshortcuts="S" data-dica="Som da narração: desligado · S">'+_ic('voff','i-off')+_ic('von','i-on')+'</button>' if narr else '')
         +'<button id="b1" type="button" aria-pressed="false" class="md" aria-label="Notas" aria-keyshortcuts="N" data-dica="Notas · N">'+_ic('nota')+'<span class="t-lt" aria-hidden="true">Notas</span></button>'
         '<span class="sep" aria-hidden="true"></span>'
         '<button id="a11yToggle" type="button" aria-label="Acessibilidade" aria-keyshortcuts="A" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11yPanel" data-dica="Acessibilidade · A">'+_ic('a11y')+'</button>'
         '<button id="bmais" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="bmais-menu" aria-label="Mais opções" aria-keyshortcuts="M" data-dica="Mais opções · M">'+_ic('more')+'</button>'
         '<div id="irpara" class="bplus-pop" role="dialog" aria-labelledby="irparaT" hidden><p id="irparaT" class="pop-t">Ir para o slide</p>'
         '<form id="irparaF" novalidate><label for="irparaN">Número (1–%d)</label><div class="irl"><input id="irparaN" type="number" min="1" max="%d" inputmode="numeric" autocomplete="off" aria-describedby="irparaE"><button type="submit" class="ir-go">Ir</button></div></form>'%(n,n)+
         '<p id="irparaE" class="ir-err" aria-live="polite"></p><ul id="irparaL" class="ir-lst" aria-label="Slides"></ul></div>'
         '<div id="bmais-menu" class="bplus-pop" hidden>'
         +('<button id="ba" type="button" aria-pressed="false">Avanço automático</button>' if narr else '')
         +'<button id="bLer" class="mi md" type="button" aria-keyshortcuts="L">'+_ic('art','i-lt')+_ic('sld','i-sl')+'<span class="mi-t">Modo leitura (L)</span></button>'
         '<button id="imp" type="button" aria-haspopup="dialog" aria-keyshortcuts="Control+P" aria-controls="dimp" class="mi">'+_ic('print')+'<span class="mi-t">Imprimir / PDF…</span></button>'
         '<div class="atalhos" id="atalhosB" tabindex="-1"><strong>Atalhos</strong><br><kbd>←/→</kbd> slides · <kbd>Espaço</kbd> reproduzir/pausar · <kbd>G</kbd> ir para o slide · <kbd>L</kbd> modo leitura/slides · <kbd>A</kbd> acessibilidade · <kbd>S</kbd> som · <kbd>N</kbd> notas · <kbd>F</kbd> tela cheia · <kbd>+</kbd> <kbd>−</kbd> zoom · <kbd>0</kbd> tamanho normal · <kbd>M</kbd> opções · <kbd>?</kbd> ajuda · <kbd>Esc</kbd> fechar</div></div></div>'
         '<button id="b2" type="button" aria-pressed="false" aria-label="Tela cheia" aria-keyshortcuts="F" data-dica="Tela cheia · F">'+_ic('fs','i-off')+_ic('fsx','i-on')+'</button>'
         '<div id="dica" role="tooltip" hidden></div>')
    hud+=IMP_DLG
    ini=('<div id="ini" role="dialog" aria-modal="true" aria-labelledby="iniT"><p id="iniT" class="it">Iniciar a apresentação</p>'
         '<button id="ini1" type="button">▶ Iniciar com narração</button><button id="ini0" type="button" class="ini0">Iniciar sem som</button></div>') if narr else ''
    js='<script>'+ZOOM_JS+'</script><script>'+LEITURA_JS+JS_S+'</script>'+('<script>'+JS_NARR.replace('__AUTO__','true' if avancar else 'false')+'</script>' if narr else '')
    return ('<!DOCTYPE html><html lang="pt-BR" data-leitura="padrao"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme" content="%s"><title>%s</title>'
    '<script>%s%s</script><style>%s</style></head><body><script>%s</script><a class="skip" href="#st">Ir para os slides</a>%s'
    '<div id="st" role="region" aria-roledescription="apresentação" aria-label="Apresentação" tabindex="-1">%s</div><div id="bar" aria-hidden="true"></div>%s%s%s%s%s%s</body></html>'
    )%(E(tema or TEMA_PADRAO),E(t),LEITURA_HEAD,SLIDES_MODO_HEAD,css,SLIDES_MODO_BODY,hud,o,ini,aud,painel_a11y(vlibras,narr,True),js,_mer_s(o),A11Y_JS)

def slides_html(t,sl,foot,tema=None,audios=None,avancar=False,fluxos=None,vlibras=True,licenca=''):
    return _slides_doc(t,sl,foot,tema,audios,avancar,fluxos,vlibras,licenca)

def _slides_html_narrado(t,sl,foot,tema,audios,avancar,fluxos=None,vlibras=True,licenca=''):
    """Compatibilidade: a montagem é a mesma de slides_html (_slides_doc); a narração escuta o evento conteudista:slide."""
    return _slides_doc(t,sl,foot,tema,audios,avancar,fluxos,vlibras,licenca)
