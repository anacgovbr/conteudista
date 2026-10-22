/* =====================================================================================
   Conteudista - Ajustes globais de UX: feedback de acoes e links de arquivo compactos

   REGRA GLOBAL - confirmacao de acao concluida em botao
     1. O feedback e SOMENTE visual: o botao fica verde com um tick por alguns segundos.
     2. Nenhum texto ou elemento e inserido na tela (nada de "Acao concluida." ao lado do botao).
     3. A largura do botao nao muda: o tick fica na area de preenchimento (padding) do botao.
        Se o botao nao tiver espaco para isso (padding < 14 px), o tick e colocado antes do
        rotulo por alguns segundos.
     4. Leitores de tela recebem a mensagem por uma regiao oculta (aria-live), sem mexer no layout.
     5. Botoes de navegacao (abas, barras de ferramentas, fechar janelas) e de exclusao (.dan) nao
        mostram confirmacao.
   API: UXFeedback.confirmar(botao, mensagemParaLeitorDeTela)  |  UXFeedback.anunciar(mensagem)
   ===================================================================================== */
(function () {
  'use strict';
  const css = `
.file-links{display:flex;flex-wrap:wrap;gap:5px 16px;align-items:center;margin:6px 0}
.file-link{display:inline-flex!important;align-items:center;gap:4px;background:none!important;border:0!important;border-radius:3px!important;color:var(--acc,#1351b4)!important;min-height:0!important;line-height:1.35!important;padding:3px 2px!important;margin:0!important;font-size:13px!important;font-weight:600!important;text-decoration:none!important;box-shadow:none!important}
.file-link:hover{text-decoration:underline!important;background:rgba(19,81,180,.08)!important}.file-link.view::before{content:'\u25A3';font-size:14px}.file-link.download::before{content:'\u2B07';font-size:13px}.file-link:focus-visible{outline-offset:2px!important}
.action-ok{background:#168821!important;border-color:#168821!important;color:#fff!important}
.action-ok.action-tick{position:relative}
.action-ok.action-tick::after{content:'\u2713';position:absolute;left:var(--tick-left,4px);top:50%;transform:translateY(-50%);font-size:14px;font-weight:700;line-height:1;color:#fff;pointer-events:none}
.ux-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:700px){.file-links{gap:7px 14px}.file-link{font-size:13px!important}}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* Regiao oculta para leitores de tela (nao ocupa espaco na pagina) */
  const live = document.createElement('div');
  live.id = 'uxLive'; live.className = 'ux-sr'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  function anunciar(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg || ''; }, 30); }

  const TEMPO = 2600, MIN_PAD = 14, TICK = '\u2713 ';
  const estado = new WeakMap();
  function confirmar(b, msg) {
    if (!b || b.matches('.dan,[data-del],[data-a="excluir"],[data-a="rm"]')) return;
    let e = estado.get(b);
    if (e) clearTimeout(e.t);
    else {
      e = { html: b.innerHTML, tick: false, t: 0 };
      const pl = parseFloat(getComputedStyle(b).paddingLeft) || 0;
      if (pl >= MIN_PAD) {
        e.tick = true;
        b.style.setProperty('--tick-left', Math.max(2, Math.round((pl - 14) / 2)) + 'px');
        b.classList.add('action-tick');
      } else {
        const txt = (b.textContent || '').trim();
        b.textContent = TICK + (txt || 'Conclu\u00eddo');
      }
      estado.set(b, e);
    }
    b.classList.add('action-ok');
    anunciar(msg || 'A\u00e7\u00e3o conclu\u00edda.');
    e.t = setTimeout(() => {
      if (!e.tick) b.innerHTML = e.html;
      b.classList.remove('action-ok', 'action-tick'); b.style.removeProperty('--tick-left');
      estado.delete(b);
    }, TEMPO);
  }

  /* Feedback padrao: confirma apos o clique. Acoes longas (gerar, criar link...) confirmam ao terminar. */
  const SEM_CONFIRMACAO = '[data-c],summary *,#tg,#ts,#abasApp *,[data-aba],.tabs *,.mde-tb *,.hb *,[role=tab],#share,#go,#locCarregar,#locGerar,#narrHist,.jn-win *,[download],.file-link,.btn-exibir,.ger-top *,.ah-top *,.htop *,.md-hd *,.tr-pop *,.mde-dlg .ft *';
  document.addEventListener('click', e => {
    const b = e.target.closest('button:not(.dan),a.btn:not(.dan)');
    if (!b || b.matches(SEM_CONFIRMACAO)) return;
    setTimeout(() => confirmar(b), 80);
  }, true);
  function aoConcluir(id, msg) {
    const b = document.getElementById(id); if (!b) return;
    let esteve = false;
    new MutationObserver(() => { if (b.disabled) esteve = true; else if (esteve) { esteve = false; confirmar(b, msg); } }).observe(b, { attributes: true, attributeFilter: ['disabled'] });
  }
  aoConcluir('go', 'Arquivos gerados.'); aoConcluir('share', 'Link criado.'); aoConcluir('locGerar', 'Locu\u00e7\u00e3o conclu\u00edda.');
  window.UXFeedback = { confirmar, anunciar };
})();