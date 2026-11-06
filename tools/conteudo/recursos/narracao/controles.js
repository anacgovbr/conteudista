(function(){var D=document,S=[].slice.call(D.querySelectorAll('.s')),A={},F={},on=false,auto=__AUTO__,tocando=false,pausado=false,cur=-1,bn=D.getElementById('bn'),ba=D.getElementById('ba'),ini=D.getElementById('ini');
function ler(){return D.body.classList.contains('modo-leitura')}
function avisa(n,d){D.dispatchEvent(new CustomEvent(n,{detail:d}))}
[].slice.call(D.querySelectorAll('audio.narr')).forEach(function(a){var k=+a.dataset.s;A[k]=a;a.addEventListener('playing',function(){if(k===cur)avisa('conteudista:audio',true)});a.addEventListener('pause',function(){if(k===cur)avisa('conteudista:audio',false)});a.addEventListener('ended',function(){if(k===cur){avisa('conteudista:audio',false);avisa('conteudista:narrfim',k)}});a.addEventListener('error',function(){F[k]=true;if(k===cur)avisa('conteudista:narrmudou',k)})});
function atual(){for(var k=0;k<S.length;k++)if(S[k].classList.contains('on'))return k;return 0}
function parar(){Object.keys(A).forEach(function(x){A[x].pause()})}
function tocar(k){parar();Object.keys(A).forEach(function(x){try{A[x].currentTime=0}catch(e){}});cur=k;if(!on||ler()||!A[k]||F[k]||pausado){avisa('conteudista:audio',false);return}var p=A[k].play();if(p&&p.catch)p.catch(function(er){if(er&&er.name==='AbortError')return;F[k]=true;if(k===cur)avisa('conteudista:narrmudou',k)})}
D.addEventListener('conteudista:quanto',function(e){var q=e.detail,k=q.i,a=A[k];if(!on||ler()||!a||F[k])return;q.narrado=true;if(a.ended&&k===cur)setTimeout(function(){avisa('conteudista:narrfim',k)},0)});
function marca(){if(bn){bn.setAttribute('aria-pressed',on?'true':'false');bn.setAttribute('data-dica','Som da narração: '+(on?'ligado':'desligado')+' · S');var d=D.getElementById('dica');if(d&&!d.hidden&&bn.getAttribute('aria-describedby')==='dica')d.textContent=bn.getAttribute('data-dica')}
if(ba){ba.setAttribute('aria-pressed',tocando?'true':'false');ba.textContent=tocando?'⏭ Avanço automático: sim':'⏭ Avanço automático: não'}}
function narr(v){on=v;if(v)pausado=false;marca();if(on)tocar(atual());else parar();avisa('conteudista:narrmudou',cur)}
D.addEventListener('conteudista:slide',function(e){tocar(e.detail)});
D.addEventListener('conteudista:modo',function(e){if(e.detail==='leitura')narr(false)});
D.addEventListener('conteudista:play',function(e){tocando=!!e.detail;marca();var a=A[cur];if(!tocando&&a&&!a.paused)a.pause()});
D.addEventListener('conteudista:pausou',function(){pausado=true});
D.addEventListener('conteudista:retomar',function(e){pausado=false;var a=A[cur],k=cur;if(!on||ler()||!a||F[k]||!a.paused||a.ended)return;e.detail.retomou=true;var p=a.play();if(p&&p.catch)p.catch(function(er){if(er&&er.name==='AbortError')return;F[k]=true;avisa('conteudista:narrmudou',k)})});
if(bn)bn.addEventListener('click',function(){narr(!on)});
if(ba)ba.addEventListener('click',function(){var p=D.getElementById('bp');if(p)p.click()});
function fecharIni(som){if(!ini)return;var x=ini;ini=null;x.remove();narr(som);var st=D.getElementById('st');if(st)st.focus();if(som&&auto)avisa('conteudista:tocar')}
if(ini){if(ler())fecharIni(false);else{var i1=D.getElementById('ini1'),i0=D.getElementById('ini0');
if(i1)i1.addEventListener('click',function(){fecharIni(true)});if(i0)i0.addEventListener('click',function(){fecharIni(false)});setTimeout(function(){if(ini&&i1)i1.focus()},30)}}
function campo(e){var n=(e.target.tagName||'').toLowerCase();return e.ctrlKey||e.metaKey||e.altKey||n=='input'||n=='select'||n=='textarea'||e.target.isContentEditable}
addEventListener('keydown',function(e){if(ini){var i1=D.getElementById('ini1'),i0=D.getElementById('ini0');
if(e.key==='Escape'){e.preventDefault();fecharIni(false)}else if(e.key==='Tab'){e.preventDefault();(D.activeElement===i1?i0:i1).focus()}return}
if(campo(e))return},true);
S.forEach(function(x,k){if(A[k]){var m=D.createElement('span');m.className='tem-som';m.title='Este slide tem narração';m.setAttribute('aria-hidden','true');m.textContent='🔊';x.appendChild(m)}});marca()})();