import re

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
