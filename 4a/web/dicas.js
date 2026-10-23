/* =====================================================================================
   Conteudista - Dicas (tooltip) dos botoes da barra do editor
   Padrao do Design System gov.br: o tooltip e o rotulo descritivo de botoes so com icone;
   aparece no foco por teclado e fecha com Esc.
   - Mouse: aparece apos ~0,45 s e continua visivel se o ponteiro for ate a dica (WCAG 1.4.13).
   - Teclado: aparece no foco visivel (Tab). Esc fecha sem mover o foco.
   - Toque: nao ha hover; o nome acessivel (aria-label) continua disponivel a leitores de tela.
   - O atributo title e movido para data-dica (evita a dica nativa duplicada); botoes que mostram
     so icone, ou 1-2 letras (B, I, H1...), recebem aria-label com o texto completo.
   ===================================================================================== */
(function () {
  'use strict';
  const SEL = '.mde-tb button, .mde-tb select';
  const css = `
.ux-dica{position:fixed;z-index:2300;max-width:260px;padding:6px 10px;border-radius:4px;background:#071d41;color:#fff;font:13px/1.35 "Rawline","Raleway","Segoe UI",Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:auto}
.ux-dica[hidden]{display:none}
.ux-dica::before{content:"";position:absolute;left:var(--seta,50%);width:8px;height:8px;background:inherit;transform:translateX(-50%) rotate(45deg)}
.ux-dica[data-lado="baixo"]::before{top:-4px}
.ux-dica[data-lado="cima"]::before{bottom:-4px}
html.contraste .ux-dica{background:#000;color:#ff0;border:2px solid #ff0}
@media (prefers-reduced-motion:no-preference){.ux-dica{animation:uxDica .12s ease-out}}
@keyframes uxDica{from{opacity:0}to{opacity:1}}
`;
  const st = document.createElement('style'); st.id = 'ux-dica-css'; st.textContent = css; document.head.appendChild(st);

  const tip = document.createElement('div');
  tip.className = 'ux-dica'; tip.id = 'uxDica'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.appendChild(tip);

  let alvo = null, tShow = 0, tHide = 0;

  function preparar() {
    document.querySelectorAll(SEL).forEach(el => {
      const t = el.getAttribute('title');
      if (t) { el.dataset.dica = t; el.removeAttribute('title'); }
      if (!el.dataset.dica || el.getAttribute('aria-label')) return;
      const txt = (el.textContent || '').trim();
      if (el.tagName === 'SELECT' || txt.length <= 2) el.setAttribute('aria-label', el.dataset.dica);
    });
  }

  function posicionar(el) {
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight, m = 8;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(m, Math.min(innerWidth - tw - m, left));
    let top = r.bottom + 8, lado = 'baixo';
    if (top + th > innerHeight - m && r.top - th - 8 > m) { top = r.top - th - 8; lado = 'cima'; }
    tip.style.left = left + 'px'; tip.style.top = top + 'px'; tip.dataset.lado = lado;
    tip.style.setProperty('--seta', Math.max(10, Math.min(tw - 10, r.left + r.width / 2 - left)) + 'px');
  }
  function mostrar(el) {
    const t = el.dataset.dica; if (!t) return;
    clearTimeout(tHide);
    if (alvo && alvo !== el) alvo.removeAttribute('aria-describedby');
    alvo = el; tip.textContent = t; tip.hidden = false;
    el.setAttribute('aria-describedby', 'uxDica');
    posicionar(el);
  }
  function ocultar() {
    clearTimeout(tShow); clearTimeout(tHide);
    if (alvo) { alvo.removeAttribute('aria-describedby'); alvo = null; }
    tip.hidden = true;
  }
  const agendarOcultar = () => { clearTimeout(tHide); tHide = setTimeout(ocultar, 150); };
  const achar = e => (e.target && e.target.closest ? e.target.closest(SEL) : null);

  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = achar(e); if (!el || !el.dataset.dica) return;
    clearTimeout(tHide);
    if (alvo === el) return;
    clearTimeout(tShow); tShow = setTimeout(() => mostrar(el), 450);
  });
  document.addEventListener('pointerout', e => {
    const el = achar(e); if (!el) return;
    clearTimeout(tShow);
    if (alvo === el) {
      if (e.relatedTarget && tip.contains(e.relatedTarget)) return;
      agendarOcultar();
    }
  });
  tip.addEventListener('pointerenter', () => clearTimeout(tHide));
  tip.addEventListener('pointerleave', agendarOcultar);
  document.addEventListener('focusin', e => {
    const el = achar(e);
    if (el && el.dataset.dica && el.matches(':focus-visible')) mostrar(el);
  });
  document.addEventListener('focusout', e => { if (alvo && e.target === alvo) ocultar(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !tip.hidden) { e.preventDefault(); e.stopPropagation(); ocultar(); }
  }, true);
  document.addEventListener('pointerdown', ocultar, true);
  addEventListener('scroll', () => { if (alvo) posicionar(alvo); }, true);
  addEventListener('resize', () => { if (alvo) posicionar(alvo); });

  preparar();
  addEventListener('load', preparar);
  window.UXDicas = { preparar, ocultar };
})();