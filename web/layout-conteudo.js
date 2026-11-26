/* =====================================================================================
   Conteudista — Barra do conteúdo (1.125)
   Nome e ações acima das abas (valem para o conteúdo todo); tema, licença e rodapé
   junto de "Gerar arquivos". Só move elementos existentes: ids e eventos continuam.
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const vh = el => { if (el) el.classList.add('bc-vh'); };
  function interruptor(barra) {
    const sw = [...document.querySelectorAll('input[type=checkbox]')].find(i => { const l = i.closest('label'); return l && /^\s*Salvar automático\s*$/.test(l.textContent) && !i.closest('.jn-win,#dxShare,dialog'); });
    if (!sw || sw.dataset.bc) return !!sw;
    sw.dataset.bc = '1'; sw.setAttribute('role', 'switch');
    const lab = sw.closest('label'); lab.classList.add('bc-sw');
    if (!barra.contains(lab)) barra.appendChild(lab);
    const est = document.createElement('span'); est.className = 'bc-est'; est.setAttribute('aria-hidden', 'true'); lab.appendChild(est);
    const atual = () => { est.textContent = sw.checked ? 'Ligado' : 'Desligado'; };
    document.addEventListener('change', () => setTimeout(atual), true);
    document.addEventListener('click', () => setTimeout(atual), true);
    atual();
    const nota = [...document.querySelectorAll('main p, main small, main span, main div')].find(e => !e.children.length && /^Salvamento automático (ligado|desligado)/i.test(e.textContent.trim()));
    if (nota) { vh(nota); nota.setAttribute('aria-live', 'polite'); }
    return true;
  }
  function montar() {
    const abas = $('abasApp'), pref = $('pref'), go = $('go');
    if (!abas || !pref || !go || $('barConteudo')) return;
    const st = document.createElement('style');
    st.textContent = `
#barConteudo{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 12px;box-sizing:border-box;width:calc(100% - 40px);max-width:1460px;margin:14px auto 0;padding:12px 16px;background:#fff;border:1px solid #cccccc;border-radius:8px}
#barConteudo .bc-nome{flex:1 1 220px;min-width:0;margin:0}
#barConteudo .acoes-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0}
#barConteudo .acoes-meta button,#barConteudo .acoes-meta a{margin:0}
#barConteudo label.bc-sw{display:inline-flex;align-items:center;gap:10px;margin:0 0 0 auto;min-height:40px;font-weight:400;font-size:15px;color:#333333;cursor:pointer}
#barConteudo .bc-est{min-width:72px;color:#555555;font-size:14px}
#abasApp{margin-top:8px}
.bc-tit{margin:16px 0 8px;font-size:17px;color:#333333}
.bc-vh{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:700px){#barConteudo{width:calc(100% - 20px)}#barConteudo label.bc-sw{margin-left:0}}
@media print{#barConteudo{display:none}}`;
    document.head.appendChild(st);
    const barra = document.createElement('div'); barra.id = 'barConteudo'; barra.setAttribute('role', 'group'); barra.setAttribute('aria-label', 'Conteúdo');
    abas.parentNode.insertBefore(barra, abas);
    const row = pref.closest('.row');
    const campoNome = pref.parentElement; campoNome.classList.add('bc-nome');
    campoNome.querySelectorAll('small').forEach(vh);
    barra.appendChild(campoNome);
    const acoes = document.querySelector('.acoes-meta'); if (acoes) barra.appendChild(acoes);
    if (row) {
      row.querySelectorAll('small,.lic-aux').forEach(vh);
      const gp = go.parentElement, tit = document.createElement('h3'); tit.className = 'bc-tit'; tit.textContent = 'Gerar arquivos';
      gp.parentNode.insertBefore(tit, gp); gp.parentNode.insertBefore(row, gp);
    }
    if (!interruptor(barra)) { setTimeout(() => interruptor(barra), 0); setTimeout(() => interruptor(barra), 1200); }
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', montar); else montar();
})();