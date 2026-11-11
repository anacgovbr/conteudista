(function(){'use strict';var D=document,H=D.documentElement;
/* Zoom e "Ampliar imagem" (1.79): apostila e apresentação. Sem dependências. */
function $(id){return D.getElementById(id)}
function campo(t){return !!(t&&t.closest&&t.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])'))}
var LUPA='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/></svg>';
var live=D.createElement('p');live.className='zm-vh';live.setAttribute('role','status');live.setAttribute('aria-live','polite');D.body.appendChild(live);
var tAn=0;function anunciar(t,adiar){clearTimeout(tAn);tAn=setTimeout(function(){live.textContent='';setTimeout(function(){live.textContent=t},40)},adiar?450:0)}
function pct(z){return Math.round(z*100)+'%'}
/* ------------------------------------------------ Ampliar imagem ------------------------------------------------ */
var ALVO='figure img,.mw';
function alvoDe(el){return el.tagName==='IMG'?el:el.closest('.mw')}
function nomeDe(el){var f=el.closest('figure'),c=f&&f.querySelector('figcaption'),img=el.tagName==='IMG'?el:el.querySelector('img');
var t=(c&&c.textContent.trim())||(img&&img.getAttribute('alt'))||'';return t||(el.classList&&el.classList.contains('mw')?'fluxo':'imagem')}
function botoes(){[].forEach.call(D.querySelectorAll(ALVO),function(el){if(el.closest('.zm-lb')||(el.tagName==='IMG'&&el.closest('.mw')))return;
var box=el.tagName==='IMG'?(el.closest('figure')||el.parentNode):el;if(!box||box.querySelector(':scope>.zm-amp'))return;
var b=D.createElement('button');b.type='button';b.className='zm-amp';b.setAttribute('aria-label','Ampliar '+nomeDe(el));b.title='Ampliar';b.innerHTML=LUPA;
b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();abrir(el,b)});
if(getComputedStyle(box).position==='static')box.style.position='relative';box.appendChild(b)})}
var lb=null,cont=null,area=null,lz=1,lx=0,ly=0,volta=null,inertes=[],lp={},lpinch=null,larr=null,ltoque=null;
function aplicarLb(){var aw=area.clientWidth,ah=area.clientHeight,cw=cont.offsetWidth*lz,ch=cont.offsetHeight*lz,mx=Math.max(0,(cw-aw)/2+20),my=Math.max(0,(ch-ah)/2+20);
lx=Math.max(-mx,Math.min(mx,lx));ly=Math.max(-my,Math.min(my,ly));if(lz<=1.001){lz=1;lx=0;ly=0}
cont.style.transform='translate('+lx+'px,'+ly+'px) scale('+lz+')';lb.querySelector('.zm-pct').textContent=pct(lz);lb.classList.toggle('ampliado',lz>1)}
function zLb(z,cx,cy){var r=area.getBoundingClientRect(),dx=(cx===undefined?0:cx-(r.left+r.width/2)),dy=(cy===undefined?0:cy-(r.top+r.height/2));
z=Math.max(1,Math.min(8,z));lx=dx-(dx-lx)*z/lz;ly=dy-(dy-ly)*z/lz;lz=z;aplicarLb()}
function abrir(el,b){if(lb)return;el=alvoDe(el);if(!el)return;volta=b||D.activeElement;
lb=D.createElement('div');lb.className='zm-lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Imagem ampliada: '+nomeDe(el));
lb.innerHTML='<div class="zm-bar"><span class="zm-pct" aria-hidden="true">100%</span>'+
'<button type="button" data-z="-" aria-label="Reduzir" aria-keyshortcuts="-" title="Reduzir (−)">−</button>'+
'<button type="button" data-z="0" aria-label="Tamanho inicial" aria-keyshortcuts="0" title="Tamanho inicial (0)">1:1</button>'+
'<button type="button" data-z="+" aria-label="Ampliar" aria-keyshortcuts="+" title="Ampliar (+)">+</button>'+
'<button type="button" data-z="x" class="zm-fechar" aria-keyshortcuts="Escape">Fechar <span aria-hidden="true">✕</span></button></div>'+
'<div class="zm-area"><div class="zm-cont"></div></div><p class="zm-dica">Use a pinça, a roda do mouse ou as teclas + e −. Arraste para mover.</p>';
area=lb.querySelector('.zm-area');cont=lb.querySelector('.zm-cont');
var c=el.cloneNode(true);if(c.tagName!=='IMG'){[].forEach.call(c.querySelectorAll('.zm-amp'),function(x){x.parentNode.removeChild(x)})}c.removeAttribute('tabindex');cont.appendChild(c);
inertes=[].filter.call(D.body.children,function(x){return x!==live&&!x.inert});inertes.forEach(function(x){x.inert=true});
D.body.appendChild(lb);H.classList.add('zm-aberto');lz=1;lx=0;ly=0;aplicarLb();
lb.addEventListener('click',function(e){var t=e.target.closest('[data-z]');if(!t)return;var k=t.getAttribute('data-z');
if(k==='x')fechar();else if(k==='0'){zLb(1);anunciar('Tamanho inicial')}else{zLb(lz*(k==='+'?1.5:1/1.5));anunciar('Zoom em '+pct(lz))}});
lb.addEventListener('keydown',teclaLb);
area.addEventListener('wheel',function(e){e.preventDefault();var d=e.deltaMode===1?e.deltaY*16:e.deltaY;zLb(lz*Math.exp(-d*.0025),e.clientX,e.clientY);anunciar('Zoom em '+pct(lz),true)},{passive:false});
area.addEventListener('pointerdown',ptrDown);area.addEventListener('pointermove',ptrMove);['pointerup','pointercancel'].forEach(function(n){area.addEventListener(n,ptrUp)});
area.addEventListener('dblclick',function(e){zLb(lz>1?1:2.5,e.clientX,e.clientY);anunciar(lz>1?'Zoom em '+pct(lz):'Tamanho inicial')});
lb.querySelector('.zm-fechar').focus();anunciar('Imagem ampliada. Esc fecha.')}
function fechar(){if(!lb)return;lb.parentNode.removeChild(lb);lb=null;H.classList.remove('zm-aberto');inertes.forEach(function(x){x.inert=false});inertes=[];lp={};lpinch=null;larr=null;
if(volta&&volta.isConnected&&volta.focus)volta.focus();volta=null}
function teclaLb(e){var k=e.key;if(k==='Escape'){e.preventDefault();e.stopPropagation();fechar();return}
if(k==='Tab'){var q=[].slice.call(lb.querySelectorAll('button'));var a=q[0],z=q[q.length-1];if(e.shiftKey&&D.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&D.activeElement===z){e.preventDefault();a.focus()}e.stopPropagation();return}
var feito=true;if(k==='+'||k==='='||k==='Add'){zLb(lz*1.5);anunciar('Zoom em '+pct(lz))}else if(k==='-'||k==='_'||k==='Subtract'){zLb(lz/1.5);anunciar(lz>1?'Zoom em '+pct(lz):'Tamanho inicial')}else if(k==='0'){zLb(1);anunciar('Tamanho inicial')}
else if(lz>1&&k==='ArrowLeft'){lx+=60;aplicarLb()}else if(lz>1&&k==='ArrowRight'){lx-=60;aplicarLb()}else if(lz>1&&k==='ArrowUp'){ly+=60;aplicarLb()}else if(lz>1&&k==='ArrowDown'){ly-=60;aplicarLb()}else feito=false;
if(feito){e.preventDefault()}e.stopPropagation()}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)||1}
function ptrDown(e){lp[e.pointerId]={x:e.clientX,y:e.clientY};var ids=Object.keys(lp);try{area.setPointerCapture(e.pointerId)}catch(x){}
if(ids.length===2){var a=lp[ids[0]],b=lp[ids[1]];lpinch={d:dist(a,b),z:lz};larr=null}else if(ids.length===1){larr={x:e.clientX,y:e.clientY,lx:lx,ly:ly,m:false}}}
function ptrMove(e){if(!lp[e.pointerId])return;lp[e.pointerId]={x:e.clientX,y:e.clientY};var ids=Object.keys(lp);
if(lpinch&&ids.length===2){var a=lp[ids[0]],b=lp[ids[1]];zLb(lpinch.z*dist(a,b)/lpinch.d,(a.x+b.x)/2,(a.y+b.y)/2)}
else if(larr){var dx=e.clientX-larr.x,dy=e.clientY-larr.y;if(Math.abs(dx)+Math.abs(dy)>4)larr.m=true;if(lz>1){lx=larr.lx+dx;ly=larr.ly+dy;aplicarLb()}}}
function ptrUp(e){var eraPinca=!!lpinch,tap=larr&&!larr.m&&e.type==='pointerup'&&e.pointerType!=='mouse';delete lp[e.pointerId];if(Object.keys(lp).length<2)lpinch=null;if(!Object.keys(lp).length)larr=null;
if(eraPinca&&!lpinch)anunciar(lz>1?'Zoom em '+pct(lz):'Tamanho inicial');
if(tap){var t=Date.now();if(ltoque&&t-ltoque.t<320&&Math.abs(e.clientX-ltoque.x)<30&&Math.abs(e.clientY-ltoque.y)<30){zLb(lz>1?1:2.5,e.clientX,e.clientY);ltoque=null}else ltoque={t:t,x:e.clientX,y:e.clientY}}}
/* clique ou toque na própria imagem também abre (sem contar arrastos e gestos) */
var ini=null;D.addEventListener('pointerdown',function(e){ini={x:e.clientX,y:e.clientY}},true);
D.addEventListener('click',function(e){if(lb||e.defaultPrevented||e.button)return;var t=e.target;if(!t.closest||t.closest('a,button,.zm-amp,summary'))return;var el=t.closest(ALVO);if(!el)return;
var s=el.closest('.s');if(s&&!s.classList.contains('on')&&!D.body.classList.contains('modo-leitura'))return;
if(ini&&Math.abs(e.clientX-ini.x)+Math.abs(e.clientY-ini.y)>10)return;var el2=alvoDe(el),bx=(el2.closest('figure')||el2).querySelector('.zm-amp');abrir(el2,bx)});
botoes();if(D.readyState!=='complete')addEventListener('load',botoes);setTimeout(botoes,1500);
/* ------------------------------------------------ Zoom do slide (apresentação) ------------------------------------------------ */
var st=$('st');if(!st){window.ZoomConteudista={abrir:abrir,fechar:fechar};return}
var sz=1,sx=0,sy=0,sp={},spinch=null,sarr=null,stoque=null;
var zr=D.createElement('button');zr.type='button';zr.id='zr';zr.className='zm-reset';zr.hidden=true;zr.setAttribute('aria-keyshortcuts','0');D.body.appendChild(zr);
zr.addEventListener('click',function(){resetar(true);st.focus({preventScroll:true})});
function lendo(){return D.body.classList.contains('modo-leitura')}
function camada(){return !!(lb||$('ini')||D.querySelector('#dimp:not([hidden]),#hud .bplus-pop:not([hidden])'))}
function ativo(){return st.querySelector('.s.on')}
function escala(){return (st.getBoundingClientRect().width/st.offsetWidth)||1}
function aplicar(an){var s=ativo();[].forEach.call(st.querySelectorAll('.s'),function(x){if(x!==s&&x.style.transform){x.style.transform='';x.style.transformOrigin=''}});
if(!s)return;var w=st.offsetWidth,h=st.offsetHeight;
if(sz<=1.001){sz=1;sx=0;sy=0;s.style.transform='';s.style.transformOrigin='';H.classList.remove('zoom-slide')}
else{sx=Math.min(0,Math.max(w-w*sz,sx));sy=Math.min(0,Math.max(h-h*sz,sy));s.style.transformOrigin='0 0';s.style.transform='translate('+sx+'px,'+sy+'px) scale('+sz+')';H.classList.add('zoom-slide')}
zr.hidden=sz===1;zr.innerHTML=pct(sz)+' <span aria-hidden="true">↺</span>';zr.setAttribute('aria-label','Zoom em '+pct(sz)+'. Voltar ao tamanho normal');
if(an)anunciar(sz===1?'Tamanho normal':'Zoom em '+pct(sz)+'. Setas movem. 0 volta ao normal.',an==='adiar')}
function zoomEm(z,cx,cy,an){var r=st.getBoundingClientRect(),e=escala();if(cx===undefined){cx=r.left+r.width/2;cy=r.top+r.height/2}
var px=(cx-r.left)/e,py=(cy-r.top)/e;z=Math.max(1,Math.min(4,z));var qx=(px-sx)/sz,qy=(py-sy)/sz;sx=px-qx*z;sy=py-qy*z;sz=z;aplicar(an)}
function resetar(an){if(sz===1&&!H.classList.contains('zoom-slide'))return;sz=1;aplicar(an)}
addEventListener('wheel',function(e){if(!e.ctrlKey||lendo()||camada())return;e.preventDefault();var d=e.deltaMode===1?e.deltaY*16:e.deltaY;zoomEm(sz*Math.exp(-d*.0025),e.clientX,e.clientY,'adiar')},{passive:false});
/* 1.91 (WCAG 2.1.4): + - 0 so com o foco na apresentacao e com o interruptor ligado. Desligados: Alt+Shift e a tecla, ou Ctrl+roda e o botao 100%. */
function atalhosOn(){try{return localStorage.getItem('conteudista.gerados.atalhos')!=='0'}catch(e){return true}}
function noPalco(t){return !t||t===D.body||t===H||t===D||!!(t.closest&&t.closest('#st,#hud,#b2,#zr,#bmais-menu,#irpara'))}
var ZALT={Equal:'+',NumpadAdd:'+',Minus:'-',NumpadSubtract:'-',Digit0:'0',Numpad0:'0'};
addEventListener('keydown',function(e){if(lb||camada()||lendo()||e.metaKey||campo(e.target))return;var alt=e.altKey&&e.shiftKey;if(e.altKey&&!alt)return;var k=e.key,feito=true;
if(alt){k=ZALT[e.code]||'';if(!k)return}else if(!e.ctrlKey&&k.length===1&&(!atalhosOn()||!noPalco(e.target)))return;
var mod=e.ctrlKey||alt;
if(k==='+'||k==='='||k==='Add')zoomEm(sz*1.25,undefined,undefined,true);else if(k==='-'||k==='_'||k==='Subtract'){if(sz===1&&!mod)feito=false;else zoomEm(sz/1.25,undefined,undefined,true)}
else if(k==='0'){if(sz===1&&!mod)feito=false;else resetar(true)}
else if(sz>1&&!e.ctrlKey&&k==='ArrowLeft'){sx+=80;aplicar()}else if(sz>1&&!e.ctrlKey&&k==='ArrowRight'){sx-=80;aplicar()}
else if(sz>1&&!e.ctrlKey&&k==='ArrowUp'){sy+=80;aplicar()}else if(sz>1&&!e.ctrlKey&&k==='ArrowDown'){sy-=80;aplicar()}
else if(sz>1&&k==='Escape')resetar(true);else feito=false;
if(feito){e.preventDefault();e.stopPropagation()}},true);
function vvZoom(){return !!(window.visualViewport&&visualViewport.scale>1.05)}
if(window.visualViewport)visualViewport.addEventListener('resize',function(){H.classList.toggle('vv-zoom',vvZoom())});
st.addEventListener('pointerdown',function(e){if(lendo()||camada()||e.button>0||(e.target.closest&&e.target.closest('button,a,input,select,textarea,.rola,.tbl')))return;
sp[e.pointerId]={x:e.clientX,y:e.clientY};var ids=Object.keys(sp);
if(ids.length===2&&sz>1){var a=sp[ids[0]],b=sp[ids[1]];spinch={d:dist(a,b),z:sz};sarr=null}else if(ids.length===1&&sz>1){sarr={x:e.clientX,y:e.clientY,sx:sx,sy:sy,m:false};if(e.pointerType==='mouse')e.preventDefault()}
else if(ids.length===1)sarr={x:e.clientX,y:e.clientY,m:false,livre:true}});
addEventListener('pointermove',function(e){if(!sp[e.pointerId])return;sp[e.pointerId]={x:e.clientX,y:e.clientY};var ids=Object.keys(sp);
if(spinch&&ids.length===2){var a=sp[ids[0]],b=sp[ids[1]];zoomEm(spinch.z*dist(a,b)/spinch.d,(a.x+b.x)/2,(a.y+b.y)/2)}
else if(sarr){var dx=e.clientX-sarr.x,dy=e.clientY-sarr.y;if(Math.abs(dx)+Math.abs(dy)>6)sarr.m=true;if(!sarr.livre&&sz>1){var es=escala();sx=sarr.sx+dx/es;sy=sarr.sy+dy/es;aplicar()}}},{passive:true});
function fim(e){var q=sp[e.pointerId];if(!q)return;var bloq=sz>1||!!spinch||vvZoom();var tap=sarr&&!sarr.m&&e.type==='pointerup'&&e.pointerType==='touch';var eraPinca=!!spinch;
delete sp[e.pointerId];if(Object.keys(sp).length<2)spinch=null;if(!Object.keys(sp).length)sarr=null;if(eraPinca&&!spinch)aplicar(true);
if(tap&&!camada()){var t=Date.now();if(stoque&&t-stoque.t<320&&Math.abs(e.clientX-stoque.x)<30&&Math.abs(e.clientY-stoque.y)<30){stoque=null;if(sz>1)resetar(true);else zoomEm(2,e.clientX,e.clientY,true);bloq=true}else stoque={t:t,x:e.clientX,y:e.clientY}}
if(bloq)e.stopPropagation()}
addEventListener('pointerup',fim,true);addEventListener('pointercancel',fim,true);
D.addEventListener('conteudista:slide',function(){resetar(false)});D.addEventListener('conteudista:leitura',function(){resetar(false)});
addEventListener('resize',function(){resetar(false)});addEventListener('beforeprint',function(){resetar(false)});
window.ZoomConteudista={abrir:abrir,fechar:fechar,zoom:function(z){zoomEm(z)},nivel:function(){return sz}};
})();