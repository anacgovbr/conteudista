/* =====================================================================================
   Conteudista — Ajustes de interface
   1. Seção "Gerar curso" recolhível (começa expandida ao abrir a página)
   2. Lista "Links criados": link exibido de forma curta (sem o texto enorme do link autocontido)
      e, no celular, cada link vira um cartão em vez de linha de tabela
   Não altera o funcionamento: o botão "Copiar" continua copiando o link completo.
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  /* ---------------------------- Estilos ---------------------------- */
  const st = document.createElement('style');
  st.textContent = `
details.sx>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:6px}details.sx>summary::-webkit-details-marker{display:none}
details.sx>summary h2,details.sx>summary h3{margin:0;flex:1}details.sx>summary::before{content:'▸';color:var(--acc,#1351b4);font-size:15px;transition:transform .15s}details.sx[open]>summary::before{transform:rotate(90deg)}
details.sx>summary .sxh{font-size:13px;color:var(--acc,#1351b4);font-weight:600}details.sx[open]>summary .sxh{display:none}details.sx[open]>summary{margin-bottom:10px}
details.sx>summary:hover h2,details.sx>summary:hover h3{color:var(--acc,#1351b4)}
details.sx>summary .sxr{font-size:13px;color:var(--acc,#1351b4);font-weight:600}details.sx:not([open])>summary .sxr{display:none}
details>summary .sxh,details>summary .sxr{font-size:13px;color:var(--acc,#1351b4);font-weight:600;white-space:nowrap}details[open]>summary .sxh{display:none}details:not([open])>summary .sxr{display:none}
#links td.url{font:inherit;font-size:13.5px;word-break:normal;max-width:360px}
#links .url-wrap{display:flex;align-items:center;gap:12px;min-width:250px}
#links .url-link{display:flex;flex-direction:column;gap:3px;min-width:130px;max-width:220px;color:var(--acc,#1351b4);text-decoration:none;border-radius:6px;padding:5px}
#links .url-link:hover,#links .url-link:focus{text-decoration:underline;background:#edf5ff;outline:2px solid transparent}
#links .url-link b{font-weight:600;color:var(--pri,#0c326f)}#links .url-link code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}#links .url-link small{color:var(--mu,#636363)}
#links .url-qr{width:88px;height:88px;flex:0 0 88px;background:#fff;display:grid;place-items:center;border:1px solid #ddd;border-radius:4px;padding:3px}
#links .url-qr img,#links .url-qr canvas{display:block;width:82px!important;height:82px!important}.qr-off{font-size:11px;text-align:center;color:#636363}
#links .copy-ok{display:block;max-width:230px;margin:5px 0 0;color:#0f5e17;font-size:12px;line-height:1.35}#links button.copiado{background:#168821!important;border-color:#168821!important}
#links .lk{display:inline-flex;align-items:center;gap:6px;max-width:100%}
#links .lk b{font-weight:600;color:var(--pri,#0c326f);white-space:nowrap}
#links .lk code{display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;font-size:12px}
#links .lk small{color:var(--mu,#636363);white-space:nowrap}
@media(max-width:700px){
  #links table,#links tbody,#links tr,#links td{display:block;width:100%}
  #links tr:first-child:has(th),#links thead{display:none}
  #links tr{border:1px solid var(--line,#ccc);border-radius:8px;padding:8px 10px;margin:0 0 10px;background:#fff}
  #links td{border:0!important;padding:3px 0!important;max-width:none}
  #links td[data-l]::before{content:attr(data-l) ': ';font-weight:600;color:var(--pri,#0c326f)}
  #links td.acs,#links td.link-acoes{padding-top:6px!important}#links td.acs button,#links td.acs a,#links td.link-acoes button,#links td.link-acoes a{margin:4px 6px 0 0}
  #links .url-wrap{justify-content:space-between;min-width:0}#links .url-link{max-width:170px;min-width:0}#links .copy-ok{max-width:none}
  #links .lk code{max-width:150px}
}`;
  document.head.appendChild(st);

  /* ---------------------------- 1. "Gerar curso" recolhível ---------------------------- */
  function recolhivel() {
    const go = $('go'), card = go && go.closest('section.card');
    if (!card || card.querySelector(':scope > details#dxGerar')) return;
    const h2 = [...card.children].find(el => el.tagName === 'H2');
    if (!h2) return;
    const d = document.createElement('details'); d.className = 'sx'; d.id = 'dxGerar'; d.open = true;
    const s = document.createElement('summary');
    s.appendChild(h2);
    const dica = document.createElement('span'); dica.className = 'sxh'; dica.textContent = 'mostrar';
    const rec = document.createElement('span'); rec.className = 'sxr'; rec.textContent = 'recolher';
    s.append(dica, rec);
    d.appendChild(s);
    while (card.firstChild) d.appendChild(card.firstChild);
    card.appendChild(d);
  }
  recolhivel();

  /* Todas as seções expansíveis mantêm a mesma identidade: mostrar / recolher */
  function rotularExpansiveis(raiz) {
    (raiz || document).querySelectorAll('details').forEach(d => {
      const s = d.querySelector(':scope > summary'); if (!s) return;
      if (!s.querySelector(':scope > .sxh')) { const a = document.createElement('span'); a.className = 'sxh'; a.textContent = 'mostrar'; s.appendChild(a); }
      if (!s.querySelector(':scope > .sxr')) { const b = document.createElement('span'); b.className = 'sxr'; b.textContent = 'recolher'; s.appendChild(b); }
    });
  }
  rotularExpansiveis();
  let tr = null;
  new MutationObserver(() => { clearTimeout(tr); tr = setTimeout(() => rotularExpansiveis(), 40); }).observe(document.body, { childList: true, subtree: true });
  // Qualquer ação que leve a um elemento dentro da seção recolhida (atalhos, tutorial, foco) a abre
  document.addEventListener('focusin', e => { const d = e.target.closest && e.target.closest('#dxGerar:not([open])'); if (d && !e.target.matches('summary')) d.open = true; });
  ['go', 'ex', 'tg', 'ts'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => { const d = $('dxGerar'); if (d) d.open = true; }, true); });
  const abrirOriginal = window.abrirSecao;
  if (!abrirOriginal) window.abrirSecao = el => { for (let d = el && el.closest ? el.closest('details') : null; d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; };

  /* ---------------------------- 2. Links criados: exibição curta ---------------------------- */
  const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function curto(txt) {
    const t = String(txt || '').replace(/…$/, '').trim();
    try {
      const u = new URL(t);
      if (u.hash.startsWith('#cx=')) {
        const f = u.hash.slice(4), senha = f.startsWith('2.');
        return { tipo: 'Autocontido' + (senha ? ' 🔒' : ''), id: f.slice(2, 10) + '…', host: u.host };
      }
      const id = (u.searchParams.get('pasteid') || u.search.replace(/^\?/, '').split('&')[0] || '').slice(0, 10);
      return { tipo: 'PrivateBin', id: (id || 'link') + '…', host: u.host };
    } catch { return { tipo: 'Link', id: t.slice(0, 18) + '…', host: '' }; }
  }
  function ajustarLinks() {
    const box = $('links'); if (!box) return;
    const tab = box.querySelector('table'); if (!tab || tab.dataset.aj) return;
    tab.dataset.aj = '1';
    const cab = [...tab.querySelectorAll('th')].map(th => th.textContent.trim());
    tab.querySelectorAll('tr').forEach(tr => {
      const tds = [...tr.children].filter(c => c.tagName === 'TD');
      tds.forEach((td, i) => {
        if (td.querySelector('button,a.btn')) { td.classList.add('acs'); return; }
        if (cab[i]) td.dataset.l = cab[i];
        if (td.classList.contains('url')) {
          // A versão atual já entrega link clicável + QR Code; preserve essa estrutura.
          if (td.querySelector('.url-link,.url-qr')) return;
          const full = td.textContent, c = curto(full);
          td.title = full.length > 300 ? full.slice(0, 300) + '…' : full;
          td.innerHTML = '<span class="lk"><b>' + escH(c.tipo) + '</b> <code>' + escH(c.id) + '</code>' + (c.host ? ' <small>' + escH(c.host) + '</small>' : '') + '</span>';
        }
      });
    });
  }
  const lk = $('links');
  if (lk) { new MutationObserver(ajustarLinks).observe(lk, { childList: true, subtree: false }); ajustarLinks(); }
  window.UIAjustes = { ajustarLinks, curto };
})();
