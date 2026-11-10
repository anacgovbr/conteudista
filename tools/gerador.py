# -*- coding: utf-8 -*-
# GERADOR PADRÃO DE CONTEÚDO v4.6 (imagens em base64; temas: govbr [padrão] e classico; narração das notas no HTML e no PPTX;
#   leitura acessível: Verdana / Atkinson Hyperlegible Next / OpenDyslexic, modo leitura dos slides, EPUB) — Apostila (HTML + DOCX + EPUB)
#   e Apresentação (HTML + PPTX) a partir de Markdown.
# Requisitos: Python 3 + python-docx + python-pptx + lxml (+ Pillow). HTML usa só biblioteca padrão.
# Fontes de leitura: tools/fontes/ (WOFF2 + OFL + manifesto.json). Sem as fontes, o conteúdo cai para Verdana e a geração continua.
# Uso: python gerador.py apostila.md apresentacao.md --prefixo NOME --rodape "TEXTO" [--barra "TEXTO"] [--saida pasta] [--sem-embutir] [--tema govbr|classico] [--audios pasta] [--avancar]
# Imagens ![alt](caminho|URL) sao convertidas para data:URI base64 (texto puro) nos .md de saida.
# Saída: Apostila_<prefixo>.md/.html/.docx/.epub/_OpenDyslexic.epub  e  Apresentacao_<prefixo>.md/.html/.pptx
import argparse,re,html,os,base64,io,mimetypes,zipfile,hashlib,uuid,datetime
from urllib.parse import unquote,unquote_to_bytes
E=html.escape
from conteudo.audio import (
    MIME_AUDIO, _icone_som, _mp3_dur, _narr, _wav_dur
)
from conteudo import licencas
from conteudo.contexto import (
    AVISOS, DECORATIVAS, DECORATIVAS_VISTAS, DECOR_IMG_RX, DECOR_RX, aviso,
    decorativa, registrar_decorativas
)
from conteudo.docx import (
    treinamento_docx
)
from conteudo.epub import (
    EPUB_CSS, _EpubCtx, _ep_blocks, _ep_doc, _ep_inl, _ep_list,
    _ep_tabela, treinamento_epub
)
from conteudo.fontes import (
    FACES, FONTES_DIR, LEITURAS, PILHA_LEITURA, _FONTES_CSS, _WOFF2_TAGS,
    fontes_css, fontes_faces, fontes_faces_unicas, woff2_tabelas, reiniciar_fontes
)
from conteudo.html_saida import (
    A11Y_JS, CSS_BPLUS, CSS_ESTREITO, CSS_G, CSS_G_A11Y, CSS_NARR,
    CSS_S, CSS_S_A11Y, ICO_B, IMP_DLG, JS_G, JS_NARR,
    JS_S, LEITURA_HEAD, LEITURA_JS, LEITURA_SEL, MER, MER_S,
    PAINEL_A11Y_CSS, SLIDES_MODO_BODY, SLIDES_MODO_HEAD, TAM_HTML, TAM_JS, ZOOM_CSS,
    ZOOM_JS, _anac_html_css, _fluxo_alt, _fluxos_dict, _fluxos_img, _ic,
    _mer_s, _mermaid_html, _slides_doc, _slides_html_narrado, _tabela_fluxo, html_of,
    inl, lst_html, painel_a11y, slides_html, treinamento_html
)
from conteudo.imagens import (
    IMG, _ep_img_raw, embed_images, img_bytes, img_size
)
from conteudo.markdown import (
    CODIGO_RX, LI, blocks, markdown_com_tema, mermaid_edges, notas_para_narracao,
    plain, runs, sem_comentarios, slug, split_slides, title_of
)
from conteudo.pptx import (
    _pptx_audio, slides_pptx
)
from conteudo.recursos import (
    ler_recurso
)
from conteudo.temas import (
    TEMAS, TEMA_PADRAO, _GOV_MAP, _cor, tcss, tema_de,
    thex, trgb
)

def gerar(gm,sm,prefixo='Conteudo',rodape='',barra='',saida='.',tema=None,narracao=None,fluxos=None,vlibras=True,licenca=None):
    tema=tema if tema in TEMAS else TEMA_PADRAO
    """Gera os arquivos do que estiver preenchido: apostila (MD/HTML/DOCX/EPUB/EPUB OpenDyslexic) e/ou apresentação (MD/HTML/PPTX)."""
    del AVISOS[:];reiniciar_fontes()  # relê as fontes a cada geração (o app mantém o módulo carregado)
    gm,lic_g=licencas.separar_markdown(gm or '');sm,lic_s=licencas.separar_markdown(sm or '')
    if licenca is None:
        if lic_g and lic_s and lic_g!=lic_s:raise ValueError('A apostila e a apresentação têm licenças diferentes; informe --licenca para escolher uma licença para os dois documentos.')
        licenca=lic_g or lic_s
    licenca=licencas.validar(licenca)
    DECORATIVAS.clear();DECORATIVAS_VISTAS.clear()
    tem_g,tem_s=bool(gm.strip()),bool(sm.strip())
    if not tem_g and not tem_s:raise ValueError('Nada para gerar: a apostila e a apresentação estão vazias.')
    os.makedirs(saida,exist_ok=True)
    P=lambda e,n:os.path.join(saida,n+prefixo+e)
    arqs=[];msg='';g='';sl=[]
    if tem_g:
        registrar_decorativas(gm)
        gm_=sem_comentarios(gm);g=treinamento_html(gm_,barra,tema,vlibras,licenca)
        open(P('.md','Apostila_'),'w',encoding='utf-8').write(licencas.anexar_markdown(gm,licenca))
        open(P('.html','Apostila_'),'w',encoding='utf-8').write(g)
        arqs+=[P('.md','Apostila_'),P('.html','Apostila_')]
        try:
            registrar_decorativas(gm);treinamento_docx(gm_,P('.docx','Apostila_'),rodape or title_of(gm_,''),tema,licenca);arqs.append(P('.docx','Apostila_'));msg+=' | docx: ok'
        except Exception as e:msg+=' | docx: ERRO %s'%e
        ne=0
        for suf,fonte in(('.epub','atkinson'),('_OpenDyslexic.epub','opendyslexic')):
            try:registrar_decorativas(gm);treinamento_epub(gm_,P(suf,'Apostila_'),rodape or title_of(gm_,''),tema,fonte,licenca);arqs.append(P(suf,'Apostila_'));ne+=1
            except Exception as e:msg+=' | epub %s: ERRO %s'%(fonte,e)
        msg+=' | epub: %d'%ne
    else:msg+=' | apostila: vazia (não gerada)'
    if tem_s:
        sm=markdown_com_tema(sm,tema);t,sl=split_slides(sm);nr=_narr(narracao)
        registrar_decorativas(sm)
        open(P('.md','Apresentacao_'),'w',encoding='utf-8').write(licencas.anexar_markdown(sm,licenca,True))
        open(P('.html','Apresentacao_'),'w',encoding='utf-8').write(slides_html(t,sl,rodape,tema,nr['html'],nr['avancar'],_fluxos_dict(fluxos),vlibras,licenca))
        arqs+=[P('.md','Apresentacao_'),P('.html','Apresentacao_')]
        try:registrar_decorativas(sm);slides_pptx(t,sl,P('.pptx','Apresentacao_'),rodape,tema,nr['pptx'],nr['avancar'],nr['duracoes'],licenca);arqs.append(P('.pptx','Apresentacao_'));msg+=' | pptx: ok'
        except Exception as e:msg+=' | pptx: ERRO %s'%e
        if nr['html'] or nr['pptx']:msg+=' | narração: %d slide(s)'%len(set(nr['html'])|set(nr['pptx']))
    else:msg+=' | apresentação: vazia (não gerada)'
    res='OK | slides: %d | checklists: %d | exercicios: %d%s | links: %d | imagens: %d'%(len(sl),g.count('class="task"'),len(re.findall(r'<h3 id="exercicio',g)),msg,g.count('<a href="http'),len(IMG.findall(CODIGO_RX.sub('',gm)))+len(IMG.findall(CODIGO_RX.sub('',sm))))+' | tema: '+tema
    if AVISOS:res+=' | avisos: '+' / '.join(AVISOS[:6])+(' (+%d)'%(len(AVISOS)-6) if len(AVISOS)>6 else '')
    return arqs,res
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('apostila',help="arquivo da apostila ('-' para não gerar)");a.add_argument('apresentacao',nargs='?',default='-',help="arquivo da apresentação ('-' ou omitido para não gerar)");a.add_argument('--prefixo',default='Curso');a.add_argument('--rodape',default='');a.add_argument('--barra',default='');a.add_argument('--saida',default='.');a.add_argument('--licenca',choices=['']+sorted(licencas.LICENCAS),default=None,help='licenciamento opcional do conteúdo')
    a.add_argument('--sem-embutir',action='store_true',help='não converter imagens para base64');a.add_argument('--sem-vlibras',action='store_true',help='não incluir o controle VLibras nos HTML gerados');a.add_argument('--tema',default=TEMA_PADRAO,choices=sorted(TEMAS),help='layout dos arquivos (padrão: %(default)s)');a.add_argument('--audios',default='',help='pasta com a narração por slide: 1.mp3, 2.ogg, 3.wav… (número do slide)');a.add_argument('--avancar',action='store_true',help='avançar os slides ao fim da narração');a=a.parse_args()
    ler=lambda f:'' if f in('-','') else open(f,encoding='utf-8').read()
    gm=ler(a.apostila);sm=ler(a.apresentacao)
    if not a.sem_embutir:
        gm,n1,f1=embed_images(gm,os.path.dirname(os.path.abspath(a.apostila if a.apostila!='-' else '.')));sm,n2,f2=embed_images(sm,os.path.dirname(os.path.abspath(a.apresentacao if a.apresentacao!='-' else '.')))
        if n1+n2:print('Imagens embutidas em base64: %d'%(n1+n2))
        for f in f1+f2:print('AVISO: imagem não encontrada/baixada: %s'%f)
    narr=None
    if a.audios and os.path.isdir(a.audios):
        narr={'html':{},'pptx':{},'avancar':a.avancar}
        for f in sorted(os.listdir(a.audios)):
            m=re.match(r'^(\d+)\.(mp3|ogg|wav)$',f,re.I)
            if not m:continue
            k=str(int(m.group(1))-1);cam=os.path.join(a.audios,f)
            narr['html'][k]=cam
            if m.group(2).lower()!='ogg' and (k not in narr['pptx'] or m.group(2).lower()=='mp3'):narr['pptx'][k]=cam
    try:_,res=gerar(gm,sm,a.prefixo,a.rodape,a.barra,a.saida,a.tema,narr,vlibras=not a.sem_vlibras,licenca=a.licenca)
    except ValueError as e:print('ERRO: %s'%e);raise SystemExit(1)
    print(res)
    if 'ERRO' in res:raise SystemExit(1)