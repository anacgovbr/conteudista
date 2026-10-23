/* =====================================================================================
   Conteudista — Arquivos agrupados por tipo + abas sem confirmação

   1. LISTAS DE ARQUIVOS (em "Arquivos gerados" e em "Arquivos gerados guardados neste navegador")
      Cada tipo de arquivo ocupa a sua própria linha:
          Apostila:            .MD  .HTML  .DOCX   Exibir apostila
          Apresentação: .MD  .HTML  .PPTX   Exibir apresentação
          Todos:        .ZIP
      Os próprios elementos (links e "Exibir") são MOVIDOS, não copiados, portanto os eventos
      originais continuam funcionando. A reorganização é idempotente e refeita sempre que a
      lista for redesenhada.

   2. ABAS "Apostila" / "Apresentação"
      Trocar de aba é navegação: não mostra "✓" nem mensagem de confirmação. A mesma regra vale
      para as abas Conteúdo/Locução, a barra de ferramentas do editor e os botões do cabeçalho
      que abrem janelas.
   ===================================================================================== */
(function () {
  'use strict';

  /* ---------------------------- Estilos ---------------------------- */
  const st = document.createElement('style');
  st.textContent = `
.file-grupos{display:flex;flex-direction:column;gap:5px;margin:6px 0}
.file-grupo{display:flex;align-items:baseline;gap:4px 10px}
.file-grupo>b{flex:0 0 108px;font-size:13px;font-weight:700;color:var(--pri,#0c326f)}
.file-grupo-itens{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 14px;min-width:0;flex:1 1 auto}
#gerBox td .file-grupo>b{flex-basis:100px}
@media(max-width:700px){.file-grupo>b{flex-basis:92px}}`;
  document.head.appendChild(st);

  /* ---------------------------- 1. Agrupamento ---------------------------- */
  const ORDEM = { md: 1, html: 2, docx: 3, pptx: 3, zip: 9 };
  const GRUPOS = [['treinamento', 'Apostila:'], ['apres', 'Apresenta\u00e7\u00e3o:'], ['todos', 'Todos:']];

  function extensao(el) {
    const nome = (el.getAttribute('download') || '').toLowerCase();
    const m = nome.match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }
  function grupoDe(el) {
    const nome = (el.getAttribute('download') || '').toLowerCase();
    if (nome) {
      if (/\.zip$/.test(nome)) return 'todos';
      if (/^apresentacao_/.test(nome) || /\.pptx$/.test(nome)) return 'apres';
      if (/^(apostila|treinamento)_/.test(nome) || /\.docx$/.test(nome)) return 'treinamento';
      return 'todos';
    }
    // "Exibir treinamento" / "Exibir apresenta\u00e7\u00e3o" (sem atributo download)
    return /apresenta/i.test(el.textContent || '') ? 'apres' : 'treinamento';
  }
  function agrupar(host) {
    const itens = [...host.children].filter(el => el.matches('a.file-link, button.file-link, .btn-arq'));
    if (!itens.some(el => el.matches('a[download]'))) return;           // s\u00f3 listas de arquivos gerados
    const grupos = { treinamento: [], apres: [], todos: [] };
    itens.forEach((el, i) => grupos[grupoDe(el)].push({ el, ord: el.matches('a[download]') ? (ORDEM[extensao(el)] || 8) : 50, i }));
    const wrap = document.createElement('div'); wrap.className = 'file-grupos';
    GRUPOS.forEach(([k, rotulo]) => {
      const lista = grupos[k]; if (!lista.length) return;
      lista.sort((a, b) => (a.ord - b.ord) || (a.i - b.i));
      const linha = document.createElement('div'); linha.className = 'file-grupo';
      const r = document.createElement('b'); r.textContent = rotulo;
      const box = document.createElement('div'); box.className = 'file-grupo-itens';
      lista.forEach(x => box.appendChild(x.el));
      linha.append(r, box); wrap.appendChild(linha);
    });
    host.classList.remove('file-links');
    host.appendChild(wrap);
  }
  function processar() {
    const hosts = new Set();
    document.querySelectorAll('#res a[download], #gerLista a[download]').forEach(a => {
      const p = a.parentElement;
      if (p && !p.classList.contains('file-grupo-itens')) hosts.add(p);
    });
    hosts.forEach(agrupar);
  }
  let t = null;
  const agendar = () => { clearTimeout(t); t = setTimeout(processar, 30); };
  new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
  processar();

  /* ---------------------------- 2. Abas e navegação: sem confirma\u00e7\u00e3o ---------------------------- */
  const SEM_CONFIRMACAO = '#tg, #ts, #abasApp button, [data-aba], .tabs button, .mde-tb button, .hb button, [role="tab"]';
  const guardado = new WeakMap();
  // guarda o conte\u00fado do bot\u00e3o antes de qualquer outro script mexer nele
  window.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest(SEM_CONFIRMACAO);
    if (b && b.tagName === 'BUTTON') guardado.set(b, b.innerHTML);
  }, true);
  // rede de seguran\u00e7a: se algum script marcar esses bot\u00f5es como "conclu\u00eddo", desfaz na hora (antes de pintar)
  new MutationObserver(lista => {
    for (const m of lista) {
      const b = m.target;
      if (!(b instanceof HTMLElement) || !b.classList.contains('action-ok') || !b.matches(SEM_CONFIRMACAO)) continue;
      b.classList.remove('action-ok');
      if (guardado.has(b)) b.innerHTML = guardado.get(b);
      const s = b.nextElementSibling;
      if (s && s.classList.contains('action-msg')) s.remove();
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });

  // Botao .ZIP: confirmacao visual discreta, como nos demais botoes de acao
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('a.btn-arq[download]');
    if (b && window.UXFeedback) setTimeout(() => window.UXFeedback.confirmar(b, 'Download iniciado.'), 60);
  }, true);
  window.UXArquivos = { processar };
})();
