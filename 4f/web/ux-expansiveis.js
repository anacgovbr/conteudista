/* =====================================================================================
   Conteudista — Regra global de UI para seções expansíveis (mostrar / recolher)

   REGRA: toda seção ou subseção expansível (<details>) tem UM único controle de estado,
          sempre no extremo DIREITO da linha do título:
            · fechada → "mostrar"      · aberta → "recolher"

   Como funciona (à prova de duplicação):
   1. Os controles antigos (.sxh, .sxr, .loc-mostrar, .loc-recolher), criados por versões
      anteriores de outros scripts, são ESCONDIDOS por CSS — não são removidos, para que
      esses scripts não os recriem em loop.
   2. Cada <summary> recebe um único <span class="mr-toggle">. O texto vem do CSS
      (details[open] → "recolher"), portanto nunca fica desatualizado e não duplica.
   3. O <summary> vira uma linha flex: título à esquerda, controle à direita
      (margin-left:auto), inclusive quando o título é apenas texto (ex.: "Opções avançadas de voz").
   4. Seções criadas depois (editor de imagens, Locução, histórico…) são tratadas por um
      MutationObserver com debounce. A passagem é idempotente: se nada falta, não altera o DOM.
   ===================================================================================== */
(function () {
  'use strict';

  const css = `
/* 1. Controles legados escondidos (um só controle visível: .mr-toggle) */
html body .sxh, html body .sxr, html body .loc-mostrar, html body .loc-recolher { display: none !important; }

/* 2. Linha do título: título à esquerda, controle à direita */
html body details > summary {
  display: flex !important; align-items: center !important; gap: 10px !important;
  list-style: none !important; cursor: pointer; box-sizing: border-box; width: 100%;
}
html body details > summary::-webkit-details-marker { display: none !important; }
html body details > summary > h2,
html body details > summary > h3,
html body details > summary > h4,
html body details > summary > .summary-title { flex: 1 1 auto !important; min-width: 0; margin: 0; }

/* 3. Controle único */
html body details > summary > .mr-toggle {
  flex: 0 0 auto !important; margin-left: auto !important; padding-left: 12px;
  font-size: 13px; font-weight: 600; line-height: 1.2; white-space: nowrap; text-align: right;
  color: var(--acc, #1351b4); user-select: none;
}
html body details > summary > .mr-toggle::before { content: 'mostrar'; }
html body details[open] > summary > .mr-toggle::before { content: 'recolher'; }
html body details > summary:hover > .mr-toggle { text-decoration: underline; }

/* Exceções de layout interno */
html body .mde-gal > summary > .mr-toggle { margin-left: 8px !important; padding-left: 0; font-size: 12px; }   /* "Imagens do texto" (barra de ferramentas própria) */
html body #narrAv > summary::before { content: '▸'; color: var(--acc, #1351b4); transition: transform .15s; }       /* "Opções avançadas de voz" ganha a mesma seta das demais */
html body #narrAv[open] > summary::before { transform: rotate(90deg); }
@media (max-width: 700px) { html body details > summary { gap: 8px !important; } html body details > summary > .mr-toggle { padding-left: 8px; } }
@media print { .mr-toggle { display: none !important; } }
`;
  const st = document.createElement('style');
  st.id = 'ux-expansiveis-css';
  st.textContent = css;
  document.head.appendChild(st);

  /** Garante exatamente um .mr-toggle por <summary>; remove excedentes (caso apareçam). */
  function normalizar(raiz) {
    (raiz || document).querySelectorAll('details').forEach(d => {
      const s = d.querySelector(':scope > summary');
      if (!s) return;
      const t = s.querySelectorAll(':scope > .mr-toggle');
      if (t.length === 1 && s.lastElementChild === t[0]) return;           // já está correto: não mexe no DOM
      t.forEach(x => x.remove());
      const novo = document.createElement('span');
      novo.className = 'mr-toggle';
      novo.setAttribute('aria-hidden', 'true');                            // o estado já é anunciado pelo próprio <details>
      s.appendChild(novo);
    });
  }

  let timer = null;
  const agendar = () => { clearTimeout(timer); timer = setTimeout(() => normalizar(), 60); };
  normalizar();
  new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', agendar);

  // Foco em campo dentro de seção recolhida (atalhos, tutorial, Tab): abre a seção
  document.addEventListener('focusin', e => {
    const d = e.target.closest && e.target.closest('details:not([open])');
    if (d && !e.target.matches('summary')) d.open = true;
  });

  window.UXExpansiveis = { normalizar };
})();
