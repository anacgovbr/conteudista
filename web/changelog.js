/* =====================================================================================
   Conteudista — Novidades (changelog)
   - Botão "Novidades" no cabeçalho; mostra CHANGELOG.md (publicado com o site)
   - Marca versões não vistas com um ponto; Alt+Shift+U abre
   ===================================================================================== */
(function () {
  'use strict';
  const VERSAO = '1.35';
  const CHAVE = 'conteudista.versaoVista';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = document.createElement('style');
  st.textContent = `#btnNews{position:relative}#btnNews .pt{position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#168821;border:2px solid #fff}
.cl-v{border-left:4px solid #1351b4;padding:2px 0 2px 12px;margin:0 0 14px}.cl-v h4{margin:0 0 4px!important;color:#0c326f;font-size:15px}.cl-v h4 small{color:#636363;font-weight:400}
.cl-v.nova{border-left-color:#168821}.cl-v.nova h4::after{content:' nova';font-size:11px;background:#168821;color:#fff;border-radius:8px;padding:1px 7px;margin-left:6px;vertical-align:2px}
.cl-v ul{margin:2px 0;padding-left:20px}.cl-v li{margin:2px 0}`;
  document.head.appendChild(st);
  const nav = document.querySelector('header .hb'); if (!nav) return;
  const b = document.createElement('button'); b.type = 'button'; b.id = 'btnNews'; b.title = 'Novidades da versão ' + VERSAO + ' (Alt+Shift+U)';
  b.innerHTML = '★ Novidades';
  nav.insertBefore(b, nav.firstChild);
  const vista = localStorage.getItem(CHAVE);
  const cmp = (a, c) => { const x = String(a).split('.').map(Number), y = String(c).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  if (!vista || cmp(VERSAO, vista) > 0) { const p = document.createElement('span'); p.className = 'pt'; b.appendChild(p); }
  function inline(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function html(md) {
    return md.split(/\n(?=## )/).filter(x => x.startsWith('## ')).map(bl => {
      const ls = bl.split('\n'), m = ls[0].match(/^##\s+([\d.]+)\s*[—-]\s*(.*)$/), v = m ? m[1] : '', d = m ? m[2] : ls[0].slice(3);
      const nova = vista && cmp(v, vista) > 0;
      return '<div class="cl-v' + (nova ? ' nova' : '') + '"><h4>Versão ' + esc(v) + ' <small>· ' + esc(d) + '</small></h4><ul>' +
        ls.slice(1).filter(l => /^\s*-\s+/.test(l)).map(l => '<li>' + inline(l.replace(/^\s*-\s+/, '')) + '</li>').join('') + '</ul></div>';
    }).join('');
  }
  let cache = null;
  async function texto() {
    if (cache) return cache;
    try { const r = await fetch('CHANGELOG.md', { cache: 'no-store' }); if (r.ok) { cache = await r.text(); return cache; } } catch { /* offline */ }
    return '## ' + VERSAO + ' — atual\n- Lista completa indisponível (arquivo CHANGELOG.md não encontrado).';
  }
  function fechar() { const x = $('clBack'); if (x) x.remove(); }
  async function abrir() {
    fechar(); const old = $('mdBack'); if (old) old.remove();
    const back = document.createElement('div'); back.className = 'md-back'; back.id = 'clBack';
    back.innerHTML = '<div class="md-win" role="dialog" aria-modal="true" aria-label="Novidades"><div class="md-hd"><h3>Novidades — versão atual ' + VERSAO + '</h3><button type="button" class="sec" id="clX">Fechar ✕</button></div><div class="md-bd" id="clBd">Carregando…</div></div>';
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) fechar(); });
    $('clX').onclick = fechar; $('clX').focus();
    $('clBd').innerHTML = html(await texto());
    localStorage.setItem(CHAVE, VERSAO); const p = b.querySelector('.pt'); if (p) p.remove();
  }
  b.onclick = abrir;
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('clBack')) { e.preventDefault(); e.stopPropagation(); fechar(); return; }
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyU') { e.preventDefault(); abrir(); }
  }, true);
  window.Conteudista = Object.assign(window.Conteudista || {}, { versao: VERSAO, novidades: abrir });
})();
