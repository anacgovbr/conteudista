/* =====================================================================================
   Conteudista: rotas por hash (SPEC 1.135, fase 1c).
   #/apostila · #/apresentacao · #/apresentacao/narracao  ->  abas do #abasApp (locucao.js).

   Regras para não conflitar com o que já existe:
   - só lê e só escreve hashes que começam com "#/"; #cx= (conteúdo por link), #tema= (tema por
     link), #conteudo (pular para o conteúdo) e qualquer outro fragmento ficam intocados;
   - atualiza a URL com history.replaceState preservando history.state: não cria entradas no
     histórico nem apaga o estado da folha do celular (celular.js usa pushState/popstate);
   - replaceState não dispara hashchange: os ouvintes de index.html e temas.js não são acionados;
   - só troca de aba quando o editor e as abas estão visíveis (na tela de boas-vindas a rota é ignorada);
   - na abertura, a rota da URL vale mais que a aba salva; deixa de insistir assim que a pessoa
     interage ou o tutorial está aberto;
   - troca de aba sempre pela API existente (Locucao.mostrarAba), sem duplicar lógica.
   ===================================================================================== */
(function () {
  'use strict';
  if (window.Rotas) return;

  var PREFIXO = '#/';
  var ABA_DA_ROTA = { 'apostila': 'apostila', 'apresentacao': 'apresentacao', 'apresentacao/narracao': 'locucao' };
  var ROTA_DA_ABA = { apostila: 'apostila', apresentacao: 'apresentacao', locucao: 'apresentacao/narracao' };
  var REFORCOS_MS = [0, 400, 1200];

  var abas = document.getElementById('abasApp');
  if (!abas) return;                                   // sem as abas (locucao.js não carregou): não faz nada

  function rotaDoHash(h) {
    h = String(h === undefined ? location.hash : h);
    if (h.indexOf(PREFIXO) !== 0) return null;
    var r = h.slice(PREFIXO.length);
    try { r = decodeURIComponent(r); } catch (e) { /* mantém */ }
    return r.replace(/^\/+|\/+$/g, '').toLowerCase();
  }
  function hashLivre() { var h = location.hash; return !h || h === '#' || h.indexOf(PREFIXO) === 0; }
  function visiveis() { return !abas.hidden && abas.getClientRects().length > 0; }
  // Boas-vindas: o editor fica oculto (atributo hidden em #editorArea). As abas podem ainda estar
  // visíveis nesse instante (locucao.js cria #abasApp depois do primeiro atualizarInicioCriacao),
  // por isso a checagem usa o editor, e não só as abas.
  function podeNavegar() {
    var ed = document.getElementById('editorArea');
    if (ed && ed.hidden) return false;
    return visiveis();
  }
  function abaAtual() {
    var b = abas.querySelector('button[data-aba][aria-selected="true"]');
    return b ? b.getAttribute('data-aba') : null;
  }
  function escrever(rota) {
    if (!rota || !hashLivre()) return false;
    var alvo = PREFIXO + rota;
    if (location.hash === alvo) return false;
    try { history.replaceState(history.state, '', location.pathname + location.search + alvo); return true; } catch (e) { return false; }
  }
  function mostrar(aba) {
    if (abaAtual() === aba) return true;
    if (window.Locucao && typeof window.Locucao.mostrarAba === 'function') window.Locucao.mostrarAba(aba);
    else if (aba !== 'locucao') { var b = document.getElementById(aba === 'apostila' ? 'tg' : 'ts'); if (b) b.click(); }
    return abaAtual() === aba;
  }
  function aplicar(rota) {
    var aba = ABA_DA_ROTA[rota];
    if (!aba || !podeNavegar()) return false;
    return mostrar(aba);
  }

  /* ---------- sincroniza a URL quando a aba muda (só depois da abertura) ---------- */
  var pronto = false, ultima = null;
  function sincronizar() {
    if (!pronto || !podeNavegar()) return;
    var aba = abaAtual(); if (!aba) return;
    var rota = ROTA_DA_ABA[aba];
    var naUrl = rotaDoHash();
    if (naUrl !== null) { if (naUrl !== rota) escrever(rota); }   // rota na URL: mantém igual à aba
    else if (aba !== ultima) escrever(rota);                        // URL limpa: escreve só quando a aba muda
    ultima = aba;
  }
  new MutationObserver(sincronizar).observe(abas, { attributes: true, subtree: true, attributeFilter: ['aria-selected', 'hidden'] });

  /* ---------- abertura ---------- */
  var inicial = rotaDoHash(), interagiu = false;
  function marcar(e) { if (e && e.isTrusted) interagiu = true; }
  document.addEventListener('pointerdown', marcar, true);
  document.addEventListener('keydown', marcar, true);
  function reforcar() {
    if (interagiu || !inicial || !ABA_DA_ROTA[inicial] || document.querySelector('.tr-pop')) return;
    if (abaAtual() !== ABA_DA_ROTA[inicial]) aplicar(inicial);
  }
  reforcar();
  function aposCarregar() {
    var feitos = 0;
    REFORCOS_MS.forEach(function (ms) {
      setTimeout(function () {
        reforcar();
        if (++feitos === REFORCOS_MS.length) { pronto = true; ultima = abaAtual(); sincronizar(); }
      }, ms);
    });
  }
  if (document.readyState === 'complete') aposCarregar(); else window.addEventListener('load', aposCarregar, { once: true });

  /* ---------- rota digitada na barra de endereço ---------- */
  window.addEventListener('hashchange', function () {
    var r = rotaDoHash(); if (r === null) return;
    interagiu = true;
    if (!aplicar(r)) sincronizar();
  });

  window.Rotas = {
    atual: function () { return rotaDoHash(); },
    rotaDaAba: function (aba) { return ROTA_DA_ABA[aba] || null; },
    abaDaRota: function (rota) { return ABA_DA_ROTA[String(rota || '').replace(/^#?\/+/, '')] || null; },
    ir: function (rota) {
      rota = String(rota || '').replace(/^#?\/+/, '').toLowerCase();
      if (!ABA_DA_ROTA[rota]) return false;
      interagiu = true;
      var ok = aplicar(rota);
      if (ok) escrever(rota);
      return ok;
    }
  };
})();
