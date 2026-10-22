/* Ajustes globais de UX: feedback visual discreto para ações e links de arquivo compactos. */
(function(){
'use strict';
const css=`
.file-links{display:flex;flex-wrap:wrap;gap:5px 16px;align-items:center;margin:6px 0}
.file-link{display:inline-flex!important;align-items:center;gap:4px;background:none!important;border:0!important;border-radius:3px!important;color:var(--acc,#1351b4)!important;min-height:0!important;line-height:1.35!important;padding:3px 2px!important;margin:0!important;font-size:13px!important;font-weight:600!important;text-decoration:none!important;box-shadow:none!important}
.file-link:hover{text-decoration:underline!important;background:rgba(19,81,180,.08)!important}.file-link.view::before{content:'▣';font-size:14px}.file-link.download::before{content:'⬇';font-size:13px}.file-link:focus-visible{outline-offset:2px!important}
.action-ok{background:#168821!important;border-color:#168821!important;color:#fff!important}.action-msg{display:inline-block;margin:0 6px;color:#0f5e17;font-size:12px;line-height:1.25;vertical-align:middle}
@media(max-width:700px){.file-links{gap:7px 14px}.file-link{font-size:13px!important}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const original=new WeakMap(), timers=new WeakMap();
function confirmar(b,msg){
 if(!b||b.matches('.dan,[data-del],[data-a="excluir"],[data-a="rm"]'))return;
 if(!original.has(b))original.set(b,b.innerHTML);
 clearTimeout(timers.get(b));b.classList.add('action-ok');
 const txt=(b.textContent||'').trim();b.textContent='✓ '+(txt.replace(/^✓\s*/, '')||'Concluído');
 let s=b.nextElementSibling;
 if(!s||!s.classList.contains('action-msg')){s=document.createElement('span');s.className='action-msg';s.setAttribute('role','status');s.setAttribute('aria-live','polite');b.after(s)}
 s.textContent=msg||'Ação concluída.';
 timers.set(b,setTimeout(()=>{b.innerHTML=original.get(b);b.classList.remove('action-ok');s.remove()},2600));
}
// Feedback padrão. Ações longas concluem quando ficam habilitadas novamente; as demais confirmam após o evento.
document.addEventListener('click',e=>{
 const b=e.target.closest('button:not(.dan),a.btn:not(.dan)');if(!b||b.matches('[data-c],summary *,#tg,#ts,#abasApp *,[data-aba],.tabs *,.mde-tb *,.hb *,[role=tab],#share,#go,#locCarregar,#locGerar,#narrHist,[download],.file-link'))return;
 setTimeout(()=>confirmar(b),80);
},true);
function aoConcluir(id,msg){const b=document.getElementById(id);if(!b)return;let esteve=false;new MutationObserver(()=>{if(b.disabled)esteve=true;else if(esteve){esteve=false;confirmar(b,msg)}}).observe(b,{attributes:true,attributeFilter:['disabled']})}
aoConcluir('go','Arquivos gerados.');aoConcluir('share','Link criado.');aoConcluir('locGerar','Locução concluída.');
window.UXFeedback={confirmar};
})();
