/* =====================================================================================
   Conteudista — utilidades comuns da página (carregado antes de todos os outros scripts)
   $(id), esc(texto) para HTML e fmtTam(bytes). Uma cópia só: corrigir aqui vale para todos.
   ===================================================================================== */
(function (g) {
  'use strict';
  g.$ = id => document.getElementById(id);
  g.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  g.fmtTam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
})(window);
