(function(){var s=document.getElementById('leitura'),h=document.documentElement,V=['padrao','atkinson','opendyslexic'];if(!s)return;
s.value=V.indexOf(h.getAttribute('data-leitura'))>-1?h.getAttribute('data-leitura'):'padrao';
s.addEventListener('change',function(){var v=V.indexOf(s.value)>-1?s.value:'padrao';h.setAttribute('data-leitura',v);try{localStorage.setItem('conteudista.leitura',v)}catch(e){}
document.dispatchEvent(new CustomEvent('conteudista:leitura',{detail:v}))})})();