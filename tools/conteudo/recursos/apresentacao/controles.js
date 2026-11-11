(function(){'use strict';var D=document,H=D.documentElement,B=D.body,S=[].slice.call(D.querySelectorAll('.s')),N=S.length,i=0,st=D.getElementById('st'),hud=D.getElementById('hud'),K='conteudista.apresentacao.modo';
function $(x){return D.getElementById(x)}var bLer=$('bLer'),b1=$('b1'),b2=$('b2'),bp=$('bp'),menu=$('bmais-menu'),bmais=$('bmais'),cb=$('cbtn'),pk=$('irpara'),pkN=$('irparaN'),pkE=$('irparaE'),pkL=$('irparaL'),dica=$('dica');
var UI={estado:'visible',entrada:'mouse',ponteiro:null,inatividade:null,reproduzindo:false,relogio:null,sobre:false};
function campo(t){var n=(t&&t.tagName||'').toLowerCase();return n=='input'||n=='select'||n=='textarea'||(t&&t.isContentEditable)}
function ler(){return B.classList.contains('modo-leitura')}
function setEntrada(v){UI.entrada=v||UI.entrada;H.dataset.entrada=UI.entrada}
function setEstado(v){UI.estado=v;hud.dataset.estado=v;H.dataset.barra=v==='hidden'?'hidden':'visible';hud.classList.toggle('aberta',v!=='hidden');hud.classList.toggle('interagindo',camadaAberta());if(v==='hidden')esconderDica(true)}
function camadaAberta(){return UI.estado==='menu-open'||UI.estado==='pick-open'}
function cancelarInatividade(){clearTimeout(UI.inatividade);UI.inatividade=null}
function focoTeclado(){var a=D.activeElement;if(!a||!(hud.contains(a)||a===b2))return false;try{return a.matches(':focus-visible')}catch(e){return UI.entrada==='keyboard'}}
function programarInatividade(){cancelarInatividade();if(ler()||UI.sobre||camadaAberta()||UI.estado==='dialog-open'||UI.barraFixa)return;UI.inatividade=setTimeout(function(){if(ler())return;if(UI.barraFixa){setEstado('visible');return}if(UI.sobre||focoTeclado()||(dica&&!dica.hidden&&dica.matches(':hover'))){programarInatividade();return}setEstado('hidden')},2500)}
function mostrar(entrada){if(entrada)setEntrada(entrada);if(UI.estado==='hidden')setEstado('visible');programarInatividade()}
function fecharSilencioso(){if(menu)menu.hidden=true;if(pk)pk.hidden=true;[bmais,cb].forEach(function(b){if(b)b.setAttribute('aria-expanded','false')})}
function fecharCamadas(foco){fecharSilencioso();setEstado('visible');if(foco&&foco.focus)foco.focus();programarInatividade()}
function painelA11y(){var p=$('a11yPanel');return !!(p&&p.open)}
function estreito(){return !!(window.matchMedia&&matchMedia('(max-width:700px) and (orientation:portrait)').matches)}
function f(){if(ler()){st.style.transform='';st.style.width='';st.style.height='';H.classList.remove('estreito');return}
if(estreito()){var W=480,Hh=Math.max(560,Math.round(W*innerHeight/innerWidth));H.classList.add('estreito');st.style.width=W+'px';st.style.height=Hh+'px';st.style.transform='translate(-50%,-50%) scale('+(innerWidth/W)+')'}
else{H.classList.remove('estreito');st.style.width='';st.style.height='';st.style.transform='translate(-50%,-50%) scale('+Math.min(innerWidth/1280,innerHeight/720)*.98+')'}}
function ajustar(s){if(!s)return;var c=s.querySelector('.conteudo'),n=s.querySelector('.in');if(!c||!n)return;c.style.transform='';c.style.width='';c.style.transformOrigin='';n.classList.remove('rola');n.removeAttribute('tabindex');if(ler())return;var a=n.clientHeight,h=c.scrollHeight;if(!a||h<=a+2)return;var k=a/h;if(k<.85){k=.85;n.classList.add('rola');n.setAttribute('tabindex','0')}c.style.transformOrigin='top left';c.style.width=(100/k)+'%';c.style.transform='scale('+k+')'}
function marca(){S.forEach(function(x,k){var v=ler()||k===i;x.setAttribute('aria-hidden',v?'false':'true');if(v)x.removeAttribute('inert');else x.setAttribute('inert','')})}
function contador(){var c=$('c');if(c&&!ler())c.textContent='Slide '+(i+1)+' de '+N;if(cb){cb.textContent=(i+1)+' / '+N;cb.setAttribute('aria-label','Slide '+(i+1)+' de '+N+'. Ir para o slide')}var b=$('bar');if(b)b.style.width=(i+1)/N*100+'%';try{history.replaceState(null,'','#'+(i+1))}catch(e){}}
function g(n,forcar){var k=Math.max(0,Math.min(N-1,n));if(!forcar&&k===i&&S[k].classList.contains('on'))return;i=k;S.forEach(function(x,k){x.classList.toggle('on',k===i)});marca();contador();ajustar(S[i]);D.dispatchEvent(new CustomEvent('conteudista:slide',{detail:i}))}
function menosMov(){return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}
function slideLeitura(){var ref=innerHeight*.3,k=0;for(var j=0;j<N;j++){if(S[j].getBoundingClientRect().top<=ref)k=j;else break}return k}
function irLeitura(n,suave){var k=Math.max(0,Math.min(N-1,n));i=k;UI.travaL=Date.now()+700;contador();S[k].scrollIntoView({behavior:(suave&&!menosMov())?'smooth':'auto',block:'start'});if(UI.entrada==='keyboard'){try{S[k].focus({preventScroll:true})}catch(e){}}}
function anterior(){if(ler())irLeitura(i-1,true);else g(i-1)}
function proximo(){if(ler())irLeitura(i+1,true);else g(i+1)}
function telaCheia(){return D.fullscreenElement||D.webkitFullscreenElement||null}
function fs(){if(telaCheia()){var x=D.exitFullscreen||D.webkitExitFullscreen;if(x){var q=x.call(D);if(q&&q.catch)q.catch(function(){})}}else{var r=H.requestFullscreen||H.webkitRequestFullscreen;if(r){var p=r.call(H);if(p&&p.catch)p.catch(function(){})}}}
function marcaFs(){var on=!!telaCheia();if(b2){b2.setAttribute('aria-pressed',on?'true':'false');b2.setAttribute('data-dica',(on?'Sair da tela cheia':'Tela cheia')+' · F')}var m=$('b2m');if(m)m.textContent=(on?'Sair da tela cheia':'Tela cheia')+' (F)';atualizarDica()}
D.addEventListener('fullscreenchange',marcaFs);D.addEventListener('webkitfullscreenchange',marcaFs);
var podeFs=!!(H.requestFullscreen||H.webkitRequestFullscreen)&&(D.fullscreenEnabled!==false||D.webkitFullscreenEnabled===true);
if(!podeFs){if(b2)b2.hidden=true;var m2=$('b2m');if(m2)m2.hidden=true}
function nt(){var on=B.classList.toggle('sn');if(b1)b1.setAttribute('aria-pressed',on?'true':'false')}
function marcaModo(on){if(!bLer)return;var t=bLer.querySelector('.mi-t');if(t)t.textContent=on?'Modo slides (L)':'Modo leitura (L)'}
function modo(on,salvar){var era=ler();if(era&&!on)i=slideLeitura();B.classList.toggle('modo-leitura',on);H.classList.toggle('ml',on);marcaModo(on);if(on){parar();S.forEach(function(x){x.classList.add('on')});marca();contador();requestAnimationFrame(function(){f();if(salvar){UI.travaL=Date.now()+700;S[i].scrollIntoView({block:'start'})}})}else{S.forEach(function(x,k){x.classList.toggle('on',k===i)});f();g(i,true)}D.dispatchEvent(new CustomEvent('conteudista:modo',{detail:on?'leitura':'slides'}))}
addEventListener('scroll',function(){if(!ler()||UI.rafL)return;UI.rafL=requestAnimationFrame(function(){UI.rafL=0;if(Date.now()<(UI.travaL||0))return;var k=slideLeitura();if(k!==i){i=k;contador()}})},{passive:true});
function ativo(){return UI.reproduzindo||UI.audio}
function marcaPlay(){if(!bp)return;var a=ativo();bp.setAttribute('data-on',a?'true':'false');bp.setAttribute('aria-label',a?'Pausar apresentação':'Reproduzir apresentação');bp.setAttribute('data-dica',(a?'Pausar':'Reproduzir')+' · Espaço');atualizarDica()}
function parar(){UI.reproduzindo=false;clearTimeout(UI.relogio);UI.relogio=null;marcaPlay();D.dispatchEvent(new CustomEvent('conteudista:play',{detail:false}))}
function reproduzir(){if(ler())return;if(ativo()){D.dispatchEvent(new CustomEvent('conteudista:pausou'));parar();return}UI.reproduzindo=true;marcaPlay();var q={retomou:false};D.dispatchEvent(new CustomEvent('conteudista:retomar',{detail:q}));D.dispatchEvent(new CustomEvent('conteudista:play',{detail:true}));if(i>=N-1&&!q.retomou)g(0);else agendar()}
D.addEventListener('conteudista:audio',function(e){UI.audio=!!e.detail;marcaPlay()});
function palavras(s){var c=s.cloneNode(true);[].forEach.call(c.querySelectorAll('.nt,.slide-num,.tem-som,details,script,style,pre.mermaid,.fluxo-print,svg'),function(x){x.parentNode.removeChild(x)});var t=(c.textContent||'').replace(/\s+/g,' ').trim();return t?t.split(' ').length:0}
function tempoLeitura(s){var w=palavras(s),v=s.querySelectorAll('img,table,pre,.mw').length;return Math.min(120000,Math.max(5000,Math.round(w/160*60000)+v*3000+1500))}
function agendar(){clearTimeout(UI.relogio);UI.relogio=null;if(!UI.reproduzindo||ler())return;var q={i:i,narrado:false};D.dispatchEvent(new CustomEvent('conteudista:quanto',{detail:q}));if(q.narrado)return;UI.relogio=setTimeout(passo,tempoLeitura(S[i]))}
function passo(){UI.relogio=null;if(!UI.reproduzindo||ler())return;if(i>=N-1){parar();return}g(i+1)}
D.addEventListener('conteudista:slide',function(){if(UI.reproduzindo)agendar()});
D.addEventListener('conteudista:barra-fixa',function(e){UI.barraFixa=!!e.detail;if(UI.barraFixa){cancelarInatividade();setEstado('visible')}else programarInatividade()});
D.addEventListener('conteudista:narrfim',function(e){if(UI.reproduzindo&&!ler()&&e.detail===i){clearTimeout(UI.relogio);UI.relogio=setTimeout(passo,700)}});
D.addEventListener('conteudista:narrmudou',function(){if(UI.reproduzindo)agendar()});
D.addEventListener('conteudista:tocar',function(){if(!UI.reproduzindo&&!ler())reproduzir()});
function primeiro(el){return [].filter.call(el.querySelectorAll('button,select,input'),function(x){return x.offsetParent!==null&&!x.disabled})[0]}
function alternarMenu(){if(!menu)return;var abrir=menu.hidden;fecharSilencioso();esconderDica(true);if(abrir){if(UI.estado==='hidden')setEstado('visible');menu.hidden=false;bmais.setAttribute('aria-expanded','true');setEstado('menu-open');cancelarInatividade();var q=primeiro(menu);if(q)q.focus()}else{setEstado('visible');bmais.focus();programarInatividade()}}
function alternarA11y(){var t=$('a11yToggle');if(t)t.click()}
D.addEventListener('conteudista:a11y',function(e){if(e.detail){fecharSilencioso();esconderDica(true);setEstado('dialog-open');cancelarInatividade()}else{setEstado('visible');programarInatividade()}});
function montarLista(){if(!pkL)return;pkL.textContent='';S.forEach(function(s,k){var h=s.querySelector('h1,h2,h3'),t=h?h.textContent.replace(/\s+/g,' ').trim():'',li=D.createElement('li'),b=D.createElement('button'),nn=D.createElement('span');b.type='button';nn.className='num';nn.textContent=String(k+1);b.appendChild(nn);b.appendChild(D.createTextNode(t||('Slide '+(k+1))));if(k===i)b.setAttribute('aria-current','true');b.addEventListener('click',function(){irPara(k)});li.appendChild(b);pkL.appendChild(li)})}
function abrirPick(){if(!pk||!cb)return;if(!pk.hidden){fecharCamadas(cb);return}fecharSilencioso();esconderDica(true);if(UI.estado==='hidden')setEstado('visible');pk.hidden=false;cb.setAttribute('aria-expanded','true');setEstado('pick-open');cancelarInatividade();montarLista();pkN.value='';pkE.textContent='';pkN.removeAttribute('aria-invalid');pkN.focus();var c=pkL.querySelector('[aria-current]');if(c&&c.scrollIntoView)c.scrollIntoView({block:'nearest'})}
function irPara(k){fecharCamadas(cb);if(ler())irLeitura(k,false);else g(k)}
var pkF=$('irparaF');if(pkF)pkF.addEventListener('submit',function(e){e.preventDefault();var v=parseInt(pkN.value,10);if(isNaN(v)||v<1||v>N){pkE.textContent='Digite um número de 1 a '+N+'.';pkN.setAttribute('aria-invalid','true');pkN.focus();return}pkN.removeAttribute('aria-invalid');irPara(v-1)});
var dT=null,dH=null,dAlvo=null;
function posDica(){if(!dAlvo||!dica||dica.hidden)return;var r=dAlvo.getBoundingClientRect(),w=dica.offsetWidth,h=dica.offsetHeight,cx=r.left+r.width/2,x=Math.max(8,Math.min(innerWidth-w-8,cx-w/2)),baixo=(r.top-h-10)<4;dica.style.left=x+'px';dica.style.top=(baixo?r.bottom+10:r.top-h-10)+'px';dica.setAttribute('data-lado',baixo?'baixo':'cima');dica.style.setProperty('--x',Math.max(10,Math.min(w-10,cx-x))+'px')}
function mostrarDica(b){if(!dica||!b||UI.estado==='hidden'||b.getAttribute('aria-expanded')==='true')return;var t=b.getAttribute('data-dica');if(!t)return;if(dAlvo&&dAlvo!==b)dAlvo.removeAttribute('aria-describedby');dAlvo=b;dica.textContent=t;dica.hidden=false;b.setAttribute('aria-describedby','dica');posDica()}
function esconderDica(ja){clearTimeout(dT);clearTimeout(dH);var fz=function(){if(dica)dica.hidden=true;if(dAlvo)dAlvo.removeAttribute('aria-describedby');dAlvo=null};if(ja||!dica)fz();else dH=setTimeout(function(){if(!dica.matches(':hover'))fz()},150)}
function atualizarDica(){if(dAlvo&&dica&&!dica.hidden){dica.textContent=dAlvo.getAttribute('data-dica')||'';posDica()}}
[].slice.call(hud.querySelectorAll('button[data-dica]')).concat(b2?[b2]:[]).forEach(function(b){b.addEventListener('pointerenter',function(e){if(e.pointerType!=='mouse')return;clearTimeout(dT);clearTimeout(dH);dT=setTimeout(function(){mostrarDica(b)},300)});b.addEventListener('pointerleave',function(){clearTimeout(dT);esconderDica(false)});b.addEventListener('focus',function(){var fv=false;try{fv=b.matches(':focus-visible')}catch(x){}if(fv)mostrarDica(b)});b.addEventListener('blur',function(){esconderDica(true)});b.addEventListener('click',function(){esconderDica(true)})});
if(dica)dica.addEventListener('pointerleave',function(){esconderDica(false)});
function clique(id,fn){var b=$(id);if(b)b.addEventListener('click',function(e){fn(e);mostrar()})}
clique('p',anterior);clique('n',proximo);clique('bp',reproduzir);clique('b1',nt);clique('b2',fs);clique('b2m',fs);clique('cbtn',abrirPick);clique('bLer',function(){modo(!ler(),true);fecharCamadas(bmais)});clique('imp',function(){abrirImp()});clique('bmais',alternarMenu);
D.addEventListener('pointerdown',function(e){if(aberta())return;setEntrada(e.pointerType||'mouse');var dentro=!!(e.target&&e.target.closest&&e.target.closest('#hud,#b2,#dica'));if(camadaAberta()&&!dentro)fecharCamadas(null);if(e.pointerType==='touch'||e.pointerType==='pen'){if(UI.estado==='hidden'){e.preventDefault();mostrar(e.pointerType);UI.ponteiro=null;return}UI.ponteiro={id:e.pointerId,x:e.clientX,y:e.clientY,t:Date.now(),ignorar:!!e.target.closest('#hud,#b2,button,a,input,select,textarea,[contenteditable],.rola')}}else mostrar('mouse')},{passive:false});
D.addEventListener('pointermove',function(e){if(e.pointerType==='mouse'){mostrar('mouse');return}if(UI.ponteiro&&UI.ponteiro.id===e.pointerId)UI.ponteiro.mx=e.clientX,UI.ponteiro.my=e.clientY},{passive:true});
D.addEventListener('pointerup',function(e){if(aberta()){UI.ponteiro=null;return}var q=UI.ponteiro;UI.ponteiro=null;if(!q||q.id!==e.pointerId||q.ignorar||ler())return;var dx=e.clientX-q.x,dy=e.clientY-q.y;if(Math.abs(dx)>=50&&Math.abs(dx)>Math.abs(dy)*1.25){e.preventDefault();g(i+(dx<0?1:-1));mostrar()}else if(e.target===st||e.target.closest('.s'))programarInatividade()},{passive:false});
D.addEventListener('pointercancel',function(){UI.ponteiro=null});
function sobre(v){UI.sobre=v;if(v)cancelarInatividade();else programarInatividade()}
[hud,b2].forEach(function(el){if(!el)return;el.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse')sobre(true)});el.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')sobre(false)});el.addEventListener('focusin',function(){if(UI.estado==='hidden')setEstado('visible');cancelarInatividade()});el.addEventListener('focusout',function(){setTimeout(programarInatividade,0)})});
addEventListener('scroll',posDica,true);
D.addEventListener('conteudista:modo',function(){fecharSilencioso();esconderDica(true);setEstado('visible');programarInatividade()});
var TAMS=[90,100,110,125,150,175,200],TK='conteudista.leitura.tamanho',ti=1,tamM=$('tamM'),tamR=$('tamR'),tamP=$('tamP'),tamS=$('tamS');
function tamSalvo(){var v=100;try{v=parseInt(localStorage.getItem(TK),10)}catch(e){}var k=TAMS.indexOf(v);return k<0?1:k}
function aplicarTam(k,avisar){ti=Math.max(0,Math.min(TAMS.length-1,k));var v=TAMS[ti];H.style.setProperty('--lt',String(v/100));try{localStorage.setItem(TK,String(v))}catch(e){}
if(tamR){tamR.textContent=v+'%';tamR.setAttribute('aria-label','Tamanho do texto: '+v+'%. Voltar a 100%')}if(tamM)tamM.setAttribute('aria-disabled',ti===0?'true':'false');if(tamP)tamP.setAttribute('aria-disabled',ti===TAMS.length-1?'true':'false');
if(avisar&&tamS){tamS.textContent='';setTimeout(function(){tamS.textContent='Tamanho do texto: '+v+'%'},30)}
if(avisar&&ler()){var k0=i;requestAnimationFrame(function(){UI.travaL=Date.now()+700;S[k0].scrollIntoView({block:'start'})})}}
function passoTam(d){var k=d===0?1:ti+d;if(d!==0&&(k<0||k>TAMS.length-1))return;aplicarTam(k,true)}
if(tamM)tamM.addEventListener('click',function(){passoTam(-1)});if(tamP)tamP.addEventListener('click',function(){passoTam(1)});if(tamR)tamR.addEventListener('click',function(){passoTam(0)});
aplicarTam(tamSalvo(),false);
var dlg=$('dimp'),IMP=null,impPg=null;
function aberta(){return !!(dlg&&!dlg.hidden)}
function focaveis(){return [].slice.call(dlg.querySelectorAll('input:not([disabled]),button:not([disabled])')).filter(function(x){return x.offsetParent!==null})}
function abrirImp(){if(!dlg||aberta())return;fecharSilencioso();esconderDica(true);if(b2)b2.inert=true;
var r=dlg.querySelector('input[value="slides"]');if(r)r.checked=true;var cn=$('dimpN'),tem=!!D.querySelector('#st .s .nt');if(cn){cn.checked=false;cn.disabled=!tem;cn.parentNode.hidden=!tem}var sem=$('dimpSem');if(sem)sem.hidden=tem;
dlg.hidden=false;st.inert=true;hud.inert=true;var sk=D.querySelector('.skip');if(sk)sk.inert=true;setEstado('dialog-open');cancelarInatividade();var t=$('dimpT');if(t)t.focus()}
function fecharImp(){if(!aberta())return;dlg.hidden=true;st.inert=false;hud.inert=false;if(b2)b2.inert=false;var sk=D.querySelector('.skip');if(sk)sk.inert=false;setEstado('visible');if(bmais)bmais.focus();programarInatividade()}
function ajustarImp(s){var c=s.querySelector('.conteudo'),n=s.querySelector('.in');if(!c||!n)return;c.style.transform='';c.style.width='';c.style.transformOrigin='';var a=n.clientHeight,h=c.scrollHeight;if(!a||h<=a+2)return;var k=Math.max(.5,a/h);c.style.transformOrigin='top left';c.style.width=(100/k)+'%';c.style.transform='scale('+k+')'}
function limparEscala(){S.forEach(function(s){var c=s.querySelector('.conteudo');if(c){c.style.transform='';c.style.width='';c.style.transformOrigin=''}})}
function prepararImp(fmt,notas){if(IMP)return;IMP={ler:B.classList.contains('modo-leitura'),ml:H.classList.contains('ml'),fmt:fmt};
H.classList.add('imp',fmt==='doc'?'imp-doc':'imp-slides');H.classList.toggle('imp-notas',!!notas);
impPg=D.createElement('style');impPg.id='imp-page';impPg.textContent=fmt==='doc'?'@page{size:A4;margin:18mm 16mm}':'@page{size:13.333in 7.5in;margin:0}';D.head.appendChild(impPg);
if(fmt==='slides'){B.classList.remove('modo-leitura');H.classList.remove('ml');S.forEach(function(s){var v=s.style.display;s.style.display='block';ajustarImp(s);s.style.display=v});
if(notas)S.forEach(function(s,k){var x=s.querySelector('.nt-x');if(!x||!x.textContent.trim())return;var pg=D.createElement('section');pg.className='imp-nota';pg.setAttribute('aria-hidden','true');pg.innerHTML='<p class="imp-nota-t"></p><p class="imp-nota-x"></p>';pg.firstChild.textContent='Notas do apresentador · slide '+(k+1);pg.lastChild.textContent=x.textContent;s.parentNode.insertBefore(pg,s.nextSibling)})}
else limparEscala()}
function restaurarImp(){if(!IMP)return;H.classList.remove('imp','imp-doc','imp-slides','imp-notas');[].slice.call(D.querySelectorAll('.imp-nota')).forEach(function(x){x.remove()});if(impPg){impPg.remove();impPg=null}
B.classList.toggle('modo-leitura',IMP.ler);H.classList.toggle('ml',IMP.ml);IMP=null;limparEscala();f();ajustar(S[i])}
function imprimir(fmt,notas){prepararImp(fmt,notas);setTimeout(function(){try{print()}finally{setTimeout(function(){if(!(window.matchMedia&&matchMedia('print').matches))restaurarImp()},500)}},60)}
addEventListener('beforeprint',function(){if(!IMP)prepararImp(ler()?'doc':'slides',ler()||B.classList.contains('sn'))});
addEventListener('afterprint',restaurarImp);
if(dlg){dlg.querySelector('form').addEventListener('submit',function(e){e.preventDefault();var r=dlg.querySelector('input[name="dimpF"]:checked'),cn=$('dimpN');var fmt=r?r.value:'slides',nt2=!!(cn&&cn.checked&&!cn.disabled);fecharImp();imprimir(fmt,nt2)});
$('dimpC').addEventListener('click',fecharImp);
dlg.addEventListener('pointerdown',function(e){if(e.target===dlg)fecharImp()});
dlg.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fecharImp();return}if(e.key==='Tab'){var q=focaveis();if(!q.length)return;var a=q[0],z=q[q.length-1];if(e.shiftKey&&(D.activeElement===a||D.activeElement===$('dimpT'))){e.preventDefault();z.focus()}else if(!e.shiftKey&&D.activeElement===z){e.preventDefault();a.focus()}}e.stopPropagation()})}
addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='p'||e.key==='P')&&!$('ini')){e.preventDefault();e.stopPropagation();if(!aberta())abrirImp()}},true);
/* 1.91 (WCAG 2.1.4): atalhos de uma tecla so com o foco na apresentacao e com interruptor no painel. Desligados: Alt+Shift e a letra. */
function atalhosOn(){try{return localStorage.getItem('conteudista.gerados.atalhos')!=='0'}catch(e){return true}}
function noPalco(t){return !t||t===B||t===H||t===D||!!(t.closest&&t.closest('#st,#hud,#b2,#zr,#bmais-menu,#irpara'))}
var TECLA_ALT={Space:' '};
addEventListener('keydown',function(e){if(aberta()||painelA11y()||e.ctrlKey||e.metaKey||e.defaultPrevented||$('ini'))return;var alt=e.altKey&&e.shiftKey;if(e.altKey&&!alt)return;var k=e.key;
if(alt){var mc=/^Key([A-Z])$/.exec(e.code||'');k=mc?mc[1].toLowerCase():(TECLA_ALT[e.code]||'');if(!k)return}
else if(k.length===1&&(!atalhosOn()||!noPalco(e.target)))return;
if(k==='Escape'){if(dica&&!dica.hidden){e.preventDefault();esconderDica(true);return}if(UI.estado==='menu-open'){e.preventDefault();fecharCamadas(bmais);return}if(UI.estado==='pick-open'){e.preventDefault();fecharCamadas(cb);return}return}
if(campo(e.target))return;setEntrada('keyboard');mostrar('keyboard');var ctl=!alt&&/^(button|a|summary)$/i.test(e.target.tagName||'');
if(camadaAberta()&&/^(Arrow|Page|Home$|End$)/.test(k))return;
if(k==='?'){e.preventDefault();if(!menu||menu.hidden)alternarMenu();var hk=$('atalhosB');if(hk)hk.focus();return}
if(k==='m'||k==='M'){e.preventDefault();alternarMenu();return}if(k==='a'||k==='A'){e.preventDefault();alternarA11y();return}
if(k==='g'||k==='G'){e.preventDefault();abrirPick();return}
if(k==='n'||k==='N'){e.preventDefault();if(!ler())nt();return}if(k==='s'||k==='S'){var bn=$('bn');if(bn&&!ler()){e.preventDefault();bn.click()}return}
if(k==='l'||k==='L'){e.preventDefault();modo(!ler(),true);return}if(k==='f'||k==='F'){e.preventDefault();fs();return}
if(ler())return;if(k===' '&&!ctl){e.preventDefault();reproduzir();return}
if(k==='ArrowRight'||k==='PageDown'){e.preventDefault();g(i+1)}else if(k==='ArrowLeft'||k==='PageUp'){e.preventDefault();g(i-1)}else if(k==='Home'){e.preventDefault();g(0)}else if(k==='End'){e.preventDefault();g(N-1)}},true);
addEventListener('resize',function(){f();ajustar(S[i]);posDica()});D.addEventListener('conteudista:leitura',function(){ajustar(S[i])});if(D.fonts&&D.fonts.ready)D.fonts.ready.then(function(){ajustar(S[i])});
var h=parseInt(location.hash.slice(1));i=isNaN(h)?0:Math.max(0,Math.min(N-1,h-1));modo(ler(),false);if(ler()&&i>0)S[i].scrollIntoView();marcaFs();setEstado('visible');programarInatividade()})();