
(function(){var h=document.documentElement,T=[90,100,110,125,150,175,200],K='conteudista.leitura.tamanho',i=1,m=document.getElementById('tamM'),r=document.getElementById('tamR'),p=document.getElementById('tamP'),s=document.getElementById('tamS');if(!m||!r||!p)return;
try{var v=parseInt(localStorage.getItem(K),10),k=T.indexOf(v);if(k>-1)i=k}catch(e){}
function ap(k,av){i=Math.max(0,Math.min(T.length-1,k));var v=T[i];h.style.setProperty('--lt',String(v/100));try{localStorage.setItem(K,String(v))}catch(e){}r.textContent=v+'%';r.setAttribute('aria-label','Tamanho do texto: '+v+'%. Voltar a 100%');m.setAttribute('aria-disabled',i===0?'true':'false');p.setAttribute('aria-disabled',i===T.length-1?'true':'false');if(av&&s){s.textContent='';setTimeout(function(){s.textContent='Tamanho do texto: '+v+'%'},30)}}
function passo(d){var k=d===0?1:i+d;if(d!==0&&(k<0||k>T.length-1))return;ap(k,true)}
m.addEventListener('click',function(){passo(-1)});p.addEventListener('click',function(){passo(1)});r.addEventListener('click',function(){passo(0)});ap(i,false)})();
