/* Painel de ações do cabeçalho: preserva os botões e seus handlers. */
(() => {
  'use strict';
  const botao = document.getElementById('btnMenuApp');
  const painel = document.getElementById('menuApp');
  if (!botao || !painel) return;

  function definir(aberto, devolverFoco = false) {
    painel.hidden = !aberto;
    botao.setAttribute('aria-expanded', String(aberto));
    if (devolverFoco) botao.focus();
  }

  botao.addEventListener('click', () => definir(painel.hidden));
  botao.parentElement.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || painel.hidden || e.defaultPrevented) return;
    if (e.target !== botao && !painel.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    definir(false, true);
  });
  document.addEventListener('pointerdown', e => {
    if (!painel.hidden && !painel.contains(e.target) && !botao.contains(e.target)) definir(false);
  });

  painel.dataset.painel = '';
  definir(false);
  botao.hidden = false;
})();
