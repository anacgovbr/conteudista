/* =====================================================================================
   Conteudista — Arquivos gerados guardados no navegador (IndexedDB)
   - Banco próprio "conteudista_arquivos" / store "pacotes" (não interfere no banco principal)
   - Após cada "Gerar arquivos", guarda os 6 arquivos + ZIP (Blobs) deste navegador
   - Lista com download de cada arquivo/ZIP, visualização do HTML e exclusão
   - Mantém os últimos N pacotes (padrão 10) e mostra o espaço usado
   Integra-se sem alterar os outros arquivos: só precisa de <script src="gerados.js"></script>.
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const res = $('res'); if (!res) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch { /* */ } };
  const LIM = 'conteudista.gerados.limite', ATIVO = 'conteudista.gerados.ativo';

  /* ---------------------------- Banco ---------------------------- */
  let dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise((ok, err) => {
      const r = indexedDB.open('conteudista_arquivos', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('pacotes')) r.result.createObjectStore('pacotes', { keyPath: 'id', autoIncrement: true }); };
      r.onsuccess = () => { const d = r.result; d.onversionchange = () => { d.close(); dbP = null; }; ok(d); };
      r.onerror = () => { dbP = null; err(r.error); };
    });
    return dbP;
  }
  async function tx(modo, fn) { const d = await db(); return new Promise((ok, err) => { const t = d.transaction('pacotes', modo), r = fn(t.objectStore('pacotes')); t.oncomplete = () => ok(r && r.result); t.onerror = () => err(t.error); t.onabort = () => err(t.error); }); }

  /* ---------------------------- Interface ---------------------------- */
  const st = document.createElement('style');
  st.textContent = `#gerBox{margin-top:16px;border:1px solid #cccccc;border-radius:10px;padding:12px 14px;background:#f8f8f8}
#gerBox h3{margin:0 0 6px}#gerBox .gtop{display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:13.5px}
#gerBox select{width:auto;padding:4px 6px}#gerBox table{margin-top:8px}#gerBox td{vertical-align:top;font-size:13px}
#gerBox td .file-link{margin:2px 12px 2px 0}#gerBox td button{padding:3px 8px;font-size:12px;margin:2px 3px 2px 0}#gerBox .uso{color:#636363;font-size:12.5px;margin:6px 0 0}`;
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'gerBox';
  box.innerHTML = '<h3>Arquivos gerados guardados neste navegador</h3>' +
    '<div class="gtop"><label class="inl"><input type="checkbox" id="gerAtivo"> Guardar automaticamente cada geração</label>' +
    '<label class="inl">Manter os últimos <select id="gerLim"><option>5</option><option selected>10</option><option>20</option><option>50</option></select> pacotes</label>' +
    '<button type="button" class="dan mini" id="gerLimpar">Apagar todos</button></div>' +
    '<div id="gerLista" class="note">Nenhum pacote guardado.</div><p class="uso" id="gerUso"></p>';
  const prev = $('prev');
  (prev || res).insertAdjacentElement('afterend', box);
  $('gerAtivo').checked = localStorage.getItem(ATIVO) !== '0';
  $('gerLim').value = localStorage.getItem(LIM) || '10';
  $('gerAtivo').onchange = () => localStorage.setItem(ATIVO, $('gerAtivo').checked ? '1' : '0');
  $('gerLim').onchange = async () => { localStorage.setItem(LIM, $('gerLim').value); await podar(); listar(); };

  /* ---------------------------- Captura após "Gerar arquivos" ---------------------------- */
  const salvos = new WeakSet(); let ultimaAssin = '', tCap = null;
  async function arquivosAtuais() {
    try { if (typeof ultimos !== 'undefined' && Array.isArray(ultimos) && ultimos.length) return ultimos.map(f => ({ nome: f.nome, blob: f.blob })); } catch { /* sem variável global */ }
    const out = [];
    for (const a of res.querySelectorAll('a[download][href^="blob:"]')) { try { out.push({ nome: a.getAttribute('download'), blob: await (await fetch(a.href)).blob() }); } catch { /* revogado */ } }
    return out;
  }
  function resumoDoLog() { const l = $('log'); if (!l) return ''; const t = l.textContent.split('\n').reverse().find(x => /OK \| slides/.test(x)); return t ? t.trim() : ''; }
  async function capturar() {
    if (!$('gerAtivo').checked) return;
    const arqs = await arquivosAtuais(); if (!arqs.length) return;
    if (arqs.every(f => salvos.has(f.blob))) return;  // esta geração já foi guardada
    const assin = arqs.map(f => f.nome + ':' + f.blob.size).join('|');
    if (assin === ultimaAssin && arqs.some(f => salvos.has(f.blob))) return; ultimaAssin = assin;
    arqs.forEach(f => salvos.add(f.blob));
    const tam = arqs.reduce((a, f) => a + f.blob.size, 0), pref = ($('pref') && $('pref').value) || 'Curso';
    try {
      await tx('readwrite', s => s.add({ data: Date.now(), prefixo: pref, resumo: resumoDoLog(), tam, arquivos: arqs }));
      await podar(); listar();
      logApp('Arquivos gerados guardados neste navegador (' + fmt(tam) + ').', 'ok');
    } catch (e) { logApp('Não foi possível guardar os arquivos gerados no navegador (' + e.message + ').', 'wa'); }
  }
  new MutationObserver(() => { if (res.querySelector('a[download]')) { clearTimeout(tCap); tCap = setTimeout(capturar, 400); } }).observe(res, { childList: true, subtree: true });

  async function podar() {
    const lim = +$('gerLim').value || 10, l = (await tx('readonly', s => s.getAllKeys())) || [];
    l.sort((a, b) => a - b);
    for (const id of l.slice(0, Math.max(0, l.length - lim))) await tx('readwrite', s => s.delete(id));
  }

  /* ---------------------------- Lista ---------------------------- */
  const urls = new Map();
  function urlDe(chave, blob) { if (!urls.has(chave)) urls.set(chave, URL.createObjectURL(blob)); return urls.get(chave); }
  function limparUrls() { urls.forEach(u => URL.revokeObjectURL(u)); urls.clear(); }
  const rotulo = n => { const e = n.split('.').pop().toLowerCase(); return (/^Treinamento_/.test(n) ? 'Treinamento ' : /^Apresentacao_/.test(n) ? 'Apresentação ' : '') + e.toUpperCase(); };
  async function listar() {
    let l = [];
    try { l = await tx('readonly', s => s.getAll()); } catch (e) { $('gerLista').textContent = 'Armazenamento indisponível (' + e.message + ').'; return; }
    limparUrls(); l.sort((a, b) => b.id - a.id);
    if (!l.length) { $('gerLista').innerHTML = 'Nenhum pacote guardado. Ao clicar em <b>Gerar arquivos</b>, os arquivos ficam disponíveis aqui mesmo depois de fechar a página.'; uso(0); return; }
    $('gerLista').innerHTML = '<table><tr><th>Gerado em</th><th>Curso</th><th>Arquivos</th><th></th></tr>' + l.map(p => {
      const zip = p.arquivos.find(f => /\.zip$/i.test(f.nome)), outros = p.arquivos.filter(f => f !== zip);
      return '<tr><td>' + new Date(p.data).toLocaleString('pt-BR') + '<br><small>' + fmt(p.tam) + '</small></td><td><b>' + esc(p.prefixo) + '</b>' + (p.resumo ? '<br><small>' + esc(p.resumo) + '</small>' : '') + '</td><td>' +
        (zip ? '<a class="file-link download" href="' + urlDe(p.id + '/' + zip.nome, zip.blob) + '" download="' + esc(zip.nome) + '">.ZIP</a>' : '') +
        outros.map(f => '<a class="file-link download" href="' + urlDe(p.id + '/' + f.nome, f.blob) + '" download="' + esc(f.nome) + '" title="' + esc(f.nome) + ' · ' + fmt(f.blob.size) + '">.' + f.nome.split('.').pop().toUpperCase() + '</a>').join('') +
        outros.filter(f => /\.html$/i.test(f.nome)).map(f => '<a href="#" class="file-link view" data-ver="' + p.id + '/' + esc(f.nome) + '">Exibir ' + (/^Apresentacao_/.test(f.nome) ? 'apresentação' : 'treinamento') + '</a>').join('') +
        '</td><td><button type="button" class="dan" data-del="' + p.id + '">Excluir</button></td></tr>';
    }).join('') + '</table>';
    uso(l.reduce((a, p) => a + p.tam, 0));
  }
  async function uso(total) {
    let t = total ? 'Pacotes guardados: ' + fmt(total) + '.' : '';
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); t += ' Uso total deste site no navegador: ' + fmt(e.usage || 0) + ' de ' + fmt(e.quota || 0) + '.'; } } catch { /* */ }
    $('gerUso').textContent = t.trim();
  }
  $('gerLista').addEventListener('click', async e => {
    const v = e.target.closest('[data-ver]'), d = e.target.closest('[data-del]');
    if (v) {
      e.preventDefault();
      if (prev) {
        const u = urls.get(v.dataset.ver);
        if (u) {
          for (let d = prev.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
          prev.hidden = false;
          prev.src = u;
          prev.style.scrollMarginTop = '96px';
          requestAnimationFrame(() => requestAnimationFrame(() => prev.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })));
        }
      }
    }
    if (d) { if (!confirm('Excluir este pacote de arquivos guardado?')) return; await tx('readwrite', s => s.delete(+d.dataset.del)); listar(); }
  });
  $('gerLimpar').onclick = async () => { if (!confirm('Apagar todos os pacotes de arquivos gerados guardados neste navegador?')) return; await tx('readwrite', s => s.clear()); listar(); };
  const logEl = $('log');
  if (logEl) new MutationObserver(() => { if (/Dados locais apagados/.test(logEl.lastChild && logEl.lastChild.textContent || '')) tx('readwrite', s => s.clear()).then(listar).catch(() => {}); }).observe(logEl, { childList: true });

  listar();
  window.Gerados = { listar, capturar };
})();
