/* =====================================================================================
   Conteudista - Ajustes globais de UX: feedback de acoes e links de arquivo compactos

   REGRA GLOBAL - confirmacao de acao concluida em botao
     1. O feedback e SOMENTE visual: o botao fica verde com um tick por 1,2 s (verde imediato no clique,
        1 s em verde e 0,2 s de esmaecimento; sem esmaecer se o sistema pedir menos movimento).
     2. Nenhum texto ou elemento e inserido na tela (nada de "Acao concluida." ao lado do botao).
     3. A largura do botao nao muda: o tick (icone SVG de 14 x 14 px) fica na area de preenchimento
        (padding) do botao, equidistante da borda externa e do inicio do texto, em qualquer fonte
        (a posicao e medida, nao calculada). Em botoes estreitos o icone encolhe (minimo 10 px) e, se
        ainda assim nao houver 3 px de cada lado, ele e colocado antes do rotulo durante a confirmacao.
     4. Leitores de tela recebem a mensagem por uma regiao oculta (aria-live), sem mexer no layout.
     5. Botoes de navegacao (abas, barras de ferramentas, fechar janelas) e de exclusao (.dan) nao
        mostram confirmacao.
   API: UXFeedback.confirmar(botao, mensagemParaLeitorDeTela)  |  UXFeedback.anunciar(mensagem)
   ===================================================================================== */
(function () {
  'use strict';
  const TICK_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4.5 12.5l5 5L19.5 7' fill='none' stroke='%23000' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  const css = `
:root{--ux-tick:${TICK_SVG}}
.file-links{display:flex;flex-wrap:wrap;gap:5px 16px;align-items:center;margin:6px 0}
.file-link{display:inline-flex!important;align-items:center;gap:4px;background:none!important;border:0!important;border-radius:3px!important;color:var(--acc,#1351b4)!important;min-height:0!important;line-height:1.35!important;padding:3px 2px!important;margin:0!important;font-size:13px!important;font-weight:600!important;text-decoration:none!important;box-shadow:none!important}
.file-link:hover{text-decoration:underline!important;background:rgba(19,81,180,.08)!important}.file-link.view::before{content:'\u25A3';font-size:14px}.file-link.download::before{content:'\u2B07';font-size:13px}.file-link:focus-visible{outline-offset:2px!important}
.action-ok{background:#168821!important;border-color:#168821!important;color:#fff!important}
.action-saindo{transition:background-color .2s ease,border-color .2s ease,color .2s ease!important}
.action-tick{position:relative}
.action-tick::after,.ux-tick-in{content:'';display:block;width:var(--tick-size,14px);height:var(--tick-size,14px);background:currentColor;-webkit-mask:var(--ux-tick) center/contain no-repeat;mask:var(--ux-tick) center/contain no-repeat;pointer-events:none}
.action-tick::after{position:absolute;left:var(--tick-left,4px);top:50%;margin-top:calc(var(--tick-size,14px) / -2);color:#fff;opacity:0;transition:opacity .2s ease}
.action-tick.action-ok::after{opacity:1}
.ux-tick-in{display:inline-block;vertical-align:-2px;margin-right:6px;color:inherit}
@media(prefers-reduced-motion:reduce){.action-saindo,.action-tick::after{transition:none!important}}
.ux-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:700px){.file-links{gap:7px 14px}.file-link{font-size:13px!important}}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* Regiao oculta para leitores de tela (nao ocupa espaco na pagina) */
  const live = document.createElement('div');
  live.id = 'uxLive'; live.className = 'ux-sr'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  function anunciar(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg || ''; }, 30); }

  /* Tempos (ms): verde imediato no clique; 1 s em verde; 0,2 s de esmaecimento (total 1,2 s). */
  const VERDE = 1000, SAIDA = 200, BORDA_MIN = 3, TICK_PX = 14, TICK_MIN = 10, FOLGA_MAX = 12;
  const estado = new WeakMap();
  const menosMovimento = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function limpar(b, e) {
    clearTimeout(e.t1); clearTimeout(e.t2);
    if (e.inline && e.inline.parentNode) e.inline.parentNode.removeChild(e.inline);
    b.classList.remove('action-ok', 'action-tick', 'action-saindo'); b.style.removeProperty('--tick-left'); b.style.removeProperty('--tick-size');
    estado.delete(b);
  }
  function confirmar(b, msg) {
    if (!b || b.matches('.dan,[data-del],[data-a="excluir"],[data-a="rm"]')) return;
    let e = estado.get(b);
    if (e) { clearTimeout(e.t1); clearTimeout(e.t2); b.classList.remove('action-saindo'); }
    else {
      e = { inline: null, t1: 0, t2: 0 };
      /* Espaco real entre a borda externa do botao e o inicio do conteudo (texto/icone): medido, nao suposto,
         para nao depender da fonte, do padding nem do alinhamento do texto. */
      const cs = getComputedStyle(b), bl = parseFloat(cs.borderLeftWidth) || 0;
      const rg = document.createRange(); rg.selectNodeContents(b);
      const espaco = rg.getBoundingClientRect().left - b.getBoundingClientRect().left;
      /* Tick equidistante: (borda externa -> tick) = (tick -> texto). Em botoes estreitos o tick encolhe
         (minimo 10 px) para manter pelo menos 3 px de cada lado; em botoes largos com texto centralizado,
         a folga fica limitada a 12 px (o tick acompanha o texto em vez de ficar longe dele). */
      const tam = Math.min(TICK_PX, Math.floor(espaco - 2 * BORDA_MIN));
      if (espaco > 0 && tam >= TICK_MIN) {
        const folga = Math.min(FOLGA_MAX, (espaco - tam) / 2);
        const esq = espaco - tam - folga - bl;     /* a partir da borda interna (padding box) */
        b.style.setProperty('--tick-left', (Math.round(esq * 2) / 2) + 'px');
        b.style.setProperty('--tick-size', tam + 'px');
        b.classList.add('action-tick');
      } else {
        const i = document.createElement('span');
        i.className = 'ux-tick-in'; i.setAttribute('aria-hidden', 'true');
        b.insertBefore(i, b.firstChild); e.inline = i;
      }
      estado.set(b, e);
    }
    b.classList.add('action-ok');
    anunciar(msg || 'A\u00e7\u00e3o conclu\u00edda.');
    const total = VERDE + SAIDA;
    e.t1 = setTimeout(() => {
      if (menosMovimento()) return;
      b.classList.add('action-saindo'); b.classList.remove('action-ok');
    }, VERDE);
    e.t2 = setTimeout(() => limpar(b, e), total);
  }

  /* Feedback padrao: confirma apos o clique. Acoes longas (gerar, criar link...) confirmam ao terminar. */
  const SEM_CONFIRMACAO = '[data-c],summary *,#tg,#ts,#abasApp *,[data-aba],.tabs *,.mde-tb *,.hb *,[role=tab],#share,#go,#locCarregar,#locGerar,#narrHist,.jn-win *,[download],.file-link,.btn-exibir,.ger-top *,.ah-top *,.htop *,.md-hd *,.tr-pop *,.mde-dlg .ft *,.lj-jan *,.la-painel *,.la-balao *,#laAviso *';  // acessibilidade do texto: confirma pelo aviso próprio
  document.addEventListener('click', e => {
    const b = e.target.closest('button:not(.dan),a.btn:not(.dan)');
    if (!b || b.matches(SEM_CONFIRMACAO)) return;
    setTimeout(() => confirmar(b), 0);
  }, true);
  function aoConcluir(id, msg) {
    const b = document.getElementById(id); if (!b) return;
    let esteve = false;
    new MutationObserver(() => { if (b.disabled) esteve = true; else if (esteve) { esteve = false; confirmar(b, msg); } }).observe(b, { attributes: true, attributeFilter: ['disabled'] });
  }
  aoConcluir('go', 'Arquivos gerados.'); aoConcluir('share', 'Link criado.'); aoConcluir('locGerar', 'Locu\u00e7\u00e3o conclu\u00edda.');
  window.UXFeedback = { confirmar, anunciar };
})();
