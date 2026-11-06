(function(){var K='__K__',th=document.getElementById('th'),v=localStorage.getItem(K+'t')||'light';document.documentElement.dataset.theme=v;th.value=v;
th.onchange=function(){document.documentElement.dataset.theme=th.value;localStorage.setItem(K+'t',th.value)};
var b=[].slice.call(document.querySelectorAll('li.task input')),s=JSON.parse(localStorage.getItem(K+'c')||'{}');
function p(){document.getElementById('pg').textContent='Checklists: '+b.filter(function(x){return x.checked}).length+'/'+b.length}
b.forEach(function(x,i){x.checked=!!s[i];x.onchange=function(){s[i]=x.checked;localStorage.setItem(K+'c',JSON.stringify(s));p()}});p();
document.getElementById('rs').onclick=function(){s={};localStorage.removeItem(K+'c');b.forEach(function(x){x.checked=false});p()};
var g=document.getElementById('gab');if(g){var a=document.createElement('button');a.type='button';a.className='ab';a.setAttribute('aria-controls','gab');g.before(a);
function sg(on){g.classList.toggle('hid',!on);if(on){g.removeAttribute('aria-hidden');g.removeAttribute('inert')}else{g.setAttribute('aria-hidden','true');g.setAttribute('inert','')}
a.setAttribute('aria-expanded',on?'true':'false');a.textContent=on?'Ocultar gabarito':'Mostrar gabarito'}sg(false);
a.onclick=function(){sg(g.classList.contains('hid'))}}
var l=[].slice.call(document.querySelectorAll('nav a')),h=l.map(function(x){return document.getElementById(x.getAttribute('href').slice(1))});
addEventListener('scroll',function(){var y=scrollY+90,k=0;h.forEach(function(e,i){if(e&&e.offsetTop<=y)k=i});l.forEach(function(x,i){x.classList.toggle('on',i===k)})})})();