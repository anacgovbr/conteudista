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
  /* Metadados minimos de cada pacote: nome do conteudo, data e hora, tamanho e layout (tema) */
  const TEMAS_ROTULO = { govbr: 'Padr\u00e3o gov.br', 'anac20-claro': 'ANAC 20 anos \u2014 claro', 'anac20-escuro': 'ANAC 20 anos \u2014 escuro', classico: 'Cl\u00e1ssico' };
  function temaRotulo(v) {
    if (!v) return '';
    if (Object.prototype.hasOwnProperty.call(TEMAS_ROTULO, v)) return TEMAS_ROTULO[v];
    const sel = $('tema'), o = sel ? [...sel.options].find(x => x.value === v) : null;
    return o ? o.text : String(v);
  }
  /* Texto que a busca do Historico consulta (nome, data, tamanho, layout, rodape, narracao e tipos de arquivo) */
  function buscaDe(p) {
    const bm = window.BuscaMeta, t = [];
    t.push(p.prefixo, bm ? bm.data(p.data) : new Date(p.data).toLocaleString('pt-BR'), bm ? bm.tam(p.tam) : fmt(p.tam), bm ? bm.tema(p.tema) : temaRotulo(p.tema), p.rodape);
    if (p.narracao) t.push('narração narracao com narração', p.narracao.voz, p.narracao.formato, p.narracao.avanco ? 'avanço automático' : '');
    (p.arquivos || []).forEach(f => {
      const n = f.nome, e = (n.split('.').pop() || '').toLowerCase();
      t.push(n, '.' + e, e, e === 'md' ? 'markdown' : '', /^(Apostila|Treinamento)_/.test(n) ? 'apostila treinamento' : /^Apresentacao_/.test(n) ? 'apresentação apresentacao slides' : 'todos', f.blob ? fmt(f.blob.size) : '');
    });
    return t.filter(Boolean).join(' ');
  }
  function metaHtml(p) {
    const q = new Date(p.data), itens = [], t = temaRotulo(p.tema);
    if (!isNaN(q.getTime())) itens.push('<time class="m" datetime="' + q.toISOString() + '">' + q.toLocaleString('pt-BR') + '</time>');
    if (p.tam > 0) itens.push('<span class="m">' + fmt(p.tam) + '</span>');
    if (t) itens.push('<span class="m">' + esc(t) + '</span>');
    return '<div class="ger-info"><p class="ger-nome">' + esc(p.prefixo || 'Conteudo') + '</p>' + (itens.length ? '<p class="ger-meta">' + itens.join(' \u00b7 ') + '</p>' : '') + '</div>';
  }

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
#gerBox td .file-link{margin:2px 12px 2px 0}
.ger-info{min-width:0}
.ger-nome{margin:0;font-size:15px;font-weight:700;line-height:1.3;color:var(--pri,#0c326f);overflow-wrap:anywhere}
.ger-meta{margin:2px 0 0;font-size:13px;line-height:1.4;color:var(--mu,#636363)}
.ger-meta .m{white-space:nowrap}
#res .ger-atual>.ger-info{margin:0 0 8px}
#prevPkg{margin:14px 0 0;padding:12px 14px;border:1px solid #cccccc;border-radius:8px;background:#f8f8f8}
#prevPkg[hidden]{display:none}
#prevPkg>.ger-info{margin:0 0 8px}
#prevPkg .file-grupos{margin:0}
.ger-pkg-rot{margin:0 0 4px;font-size:12.5px;font-weight:700;color:#155bcb}
body #prevPkg .btn-exibir[aria-pressed="true"]{background-color:#0c326f}
body #prevPkg .btn-exibir[aria-pressed="true"]::before{content:"✓ "}
#dxRes.tem-pkg #res:not(:has(.ger-atual)){display:none}
@media(max-width:700px){#prevPkg .file-grupo{flex-wrap:wrap}#prevPkg .file-grupo>b{flex:1 1 100%}#prevPkg .file-grupo-itens{flex:1 1 100%}}
html.contraste #prevPkg{background:#000!important;border-color:#fff!important}
html.contraste .ger-pkg-rot{color:#ff0!important}
html.contraste .ger-nome{color:#ff0!important}
html.contraste .ger-meta{color:#fff!important}#gerBox .uso{color:#636363;font-size:12.5px;margin:6px 0 0}`;
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'gerBox';
  box.innerHTML = '' +
    '<div class="gtop"><label class="inl"><input type="checkbox" id="gerAtivo"> Guardar automaticamente cada geração</label>' +
    '<label class="inl">Manter os últimos <select id="gerLim"><option>5</option><option selected>10</option><option>20</option><option>50</option></select> pacotes</label>' +
    '<button type="button" class="dan mini" id="gerLimpar">Apagar todos</button></div>' +
    '<div id="gerLista" class="note">Nenhum pacote guardado.</div><p class="uso" id="gerUso"></p>';
  const prev = $('prev');
  /* Historico de arquivos e rascunhos: a lista sai da pagina e abre em uma janela (mesmo padrao do Historico do editor) */
  const icoHist = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 3"/></svg>';
  const stJanela = document.createElement('style');
  stJanela.textContent = `
.ger-back{position:fixed;inset:0;z-index:1800;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px 14px;overflow:auto}
.ger-back[hidden]{display:none}
.ger-win{background:#fff;color:var(--ink,#333);border-radius:8px;width:min(1000px,100%);box-shadow:0 10px 40px rgba(0,0,0,.35);padding:0 20px 18px;position:relative}
.ger-top{display:flex;align-items:center;gap:10px;padding:14px 0 10px;border-bottom:1px solid var(--line,#ccc);margin-bottom:10px;position:sticky;top:0;background:#fff;z-index:2}
.ger-top h2{flex:1;margin:0;font-size:19px}.ger-top button{margin:0}
.ger-win>.note{margin:0 0 10px}
.ger-win details.ger-sec{border:1px solid var(--line,#ccc);border-radius:8px;padding:10px 14px;margin:0 0 12px;background:#fff}
.ger-win details.ger-sec>summary h3{margin:0;font-size:16px}
.ger-win #gerBox{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
.ger-win table{margin-top:8px}.ger-win td{vertical-align:top;font-size:13px}
.ger-win #drafts{margin:0}
.ger-tit{display:flex;align-items:center;gap:10px}
.ger-tb.mde-tb{display:inline-flex!important;padding:0!important;background:transparent!important;border:0!important;flex:0 0 auto}
.ger-ph{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0}.ger-ph .note{margin:0}
@media(max-width:700px){.ger-back{padding:0;align-items:stretch}.ger-win{border-radius:0;width:100%;min-height:100%;padding:0 14px 18px}.ger-top h2{font-size:16px}}`;
  document.head.appendChild(stJanela);
  const gerBack = document.createElement('div');
  gerBack.className = 'ger-back'; gerBack.id = 'gerBack'; gerBack.hidden = true;
  gerBack.setAttribute('role', 'dialog'); gerBack.setAttribute('aria-modal', 'true'); gerBack.setAttribute('aria-label', 'Arquivos e rascunhos');
  const gerWin = document.createElement('div'); gerWin.className = 'ger-win';
  gerWin.innerHTML = '<div class="ger-top"><h2>Arquivos e rascunhos</h2><button type="button" class="sec mini" id="gerFechar" title="Fechar (Esc)">Fechar \u2715</button></div>' +
    '<p class="note">Guardados somente neste navegador. Os pacotes mais antigos s\u00e3o apagados conforme o limite escolhido em Arquivos gerados.</p>' +
    '<details class="sx ger-sec" id="gerSecArq" open><summary><h3 id="gerTArq">Arquivos gerados</h3></summary><div id="gerSbArq"></div></details>' +
    '<details class="sx ger-sec" id="gerSecRasc"><summary><h3 id="gerTRasc">Rascunhos</h3></summary><div id="gerSbRasc"></div></details>';
  gerBack.appendChild(gerWin); document.body.appendChild(gerBack);
  gerWin.querySelector('#gerSbArq').appendChild(box);
  const drafts = $('drafts');
  let rascN = null;
  if (drafts) {
    // A tabela de rascunhos sai do painel "1. Na sua maquina" e vai para a janela (secao recolhida)
    const ph = document.createElement('div'); ph.className = 'ger-ph';
    ph.innerHTML = '<span class="note" id="gerRascN">Nenhum rascunho salvo.</span><span class="mde-tb ger-tb"><button type="button" class="hbtn" id="gerHistBtn2" title="Hist\u00f3rico: abrir os rascunhos" aria-label="Hist\u00f3rico de rascunhos">' + icoHist + '<span class="ht"> Hist\u00f3rico</span></button></span>';
    drafts.parentNode.insertBefore(ph, drafts);
    gerWin.querySelector('#gerSbRasc').appendChild(drafts);
    rascN = ph.querySelector('#gerRascN');
    ph.querySelector('#gerHistBtn2').addEventListener('click', e => { e.preventDefault(); abrirGer('rascunhos'); });
    // "Abrir" um rascunho fecha a janela para mostrar o editor
    drafts.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-a="ab"]')) setTimeout(() => fecharGer(true), 60); });
  }
  const secArq = gerWin.querySelector('#gerSecArq'), secRasc = gerWin.querySelector('#gerSecRasc');
  // Rascunhos so sao (re)carregados quando a secao e aberta
  secRasc.addEventListener('toggle', () => { if (secRasc.open && typeof window.listarRascunhos === 'function') { try { Promise.resolve(window.listarRascunhos()).catch(() => {}); } catch (err) { /* sem lista */ } } });
  let gerFoco = null;
  function abrirGer(sec) {
    gerFoco = document.activeElement;
    if (sec === 'rascunhos') secRasc.open = true; else if (sec === 'arquivos') secArq.open = true;
    gerBack.hidden = false; gerBack.scrollTop = 0; document.body.style.overflow = 'hidden';
    listar();
    setTimeout(() => { const f = $('gerFechar'); if (f) f.focus(); }, 30);
  }
  function fecharGer(semFoco) {
    if (gerBack.hidden) return;
    gerBack.hidden = true; document.body.style.overflow = '';
    if (!semFoco && gerFoco && gerFoco.focus) gerFoco.focus();
  }
  $('gerFechar').onclick = () => fecharGer();
  gerBack.addEventListener('click', e => { if (e.target === gerBack) fecharGer(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !gerBack.hidden) { e.preventDefault(); e.stopPropagation(); fecharGer(); } }, true);
  // Botao "Historico" ao lado do titulo de "Arquivos gerados" (mesmo visual do botao da barra do editor)
  let btnHist = null;
  (function () {
    const dx = $('dxRes'), sum = dx && dx.querySelector(':scope > summary'), tit = sum && sum.querySelector(':scope > h3');
    if (!sum || !tit || $('gerHistBtn')) return;
    const grp = document.createElement('div'); grp.className = 'summary-title ger-tit';
    const tb = document.createElement('span'); tb.className = 'mde-tb ger-tb';
    const b = document.createElement('button'); b.type = 'button'; b.id = 'gerHistBtn'; b.className = 'hbtn';
    b.title = 'Hist\u00f3rico: arquivos gerados e rascunhos'; b.setAttribute('aria-label', 'Hist\u00f3rico de arquivos gerados e rascunhos');
    b.innerHTML = icoHist + '<span class="ht"> Hist\u00f3rico</span>';
    tb.appendChild(b); sum.insertBefore(grp, tit); grp.append(tit, tb);
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); abrirGer(); });
    btnHist = b;
  })();
  // Contagens nos titulos das secoes, na linha do painel e no tooltip do botao
  const contarLinhas = el => el ? Math.max(0, el.querySelectorAll('tr').length - 1) : 0;
  function atualizarContagens() {
    if (!$('gerTArq') || !$('gerTRasc')) return;   // janela antiga removida por janelas.js
    const na = contarLinhas($('gerLista')), nr = contarLinhas(drafts);
    $('gerTArq').textContent = 'Arquivos gerados' + (na ? ' (' + na + ')' : '');
    $('gerTRasc').textContent = 'Rascunhos' + (nr ? ' (' + nr + ')' : '');
    if (rascN) rascN.textContent = nr ? nr + (nr > 1 ? ' rascunhos salvos.' : ' rascunho salvo.') : 'Nenhum rascunho salvo.';
    if (btnHist) btnHist.title = 'Hist\u00f3rico: ' + na + (na === 1 ? ' pacote' : ' pacotes') + ' e ' + nr + (nr === 1 ? ' rascunho' : ' rascunhos');
  }
  new MutationObserver(atualizarContagens).observe($('gerLista'), { childList: true, subtree: true });
  if (drafts) new MutationObserver(atualizarContagens).observe(drafts, { childList: true, subtree: true });
  setTimeout(atualizarContagens, 600);
  /* fim: historico de arquivos e rascunhos */
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
    const tam = arqs.reduce((a, f) => a + f.blob.size, 0), pref = ($('pref') && $('pref').value) || 'Conteudo';
    try {
      const gm = window.GeracaoMeta || {};
      await tx('readwrite', s => s.add({ data: gm.data || Date.now(), prefixo: gm.prefixo || pref, tema: gm.tema || ($('tema') ? $('tema').value : ''), rodape: gm.rodape || ($('rod') ? $('rod').value.trim() : ''), narracao: gm.narracao || null, resumo: resumoDoLog(), tam, arquivos: arqs }));
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
  const rotulo = n => { const e = n.split('.').pop().toLowerCase(); return (/^(Apostila|Treinamento)_/.test(n) ? 'Apostila ' : /^Apresentacao_/.test(n) ? 'Apresentação ' : '') + e.toUpperCase(); };
  async function listar() {
    let l = [];
    try { l = await tx('readonly', s => s.getAll()); } catch (e) { $('gerLista').textContent = 'Armazenamento indisponível (' + e.message + ').'; return; }
    limparUrls(); l.sort((a, b) => b.id - a.id);
    if (!l.length) { $('gerLista').innerHTML = 'Nenhum pacote guardado. Ao clicar em <b>Gerar arquivos</b>, os arquivos ficam disponíveis aqui mesmo depois de fechar a página.'; uso(0); return; }
    $('gerLista').innerHTML = '<table><tr><th>Conteúdo</th><th>Arquivos</th><th></th></tr>' + l.map(p => {
      const zip = p.arquivos.find(f => /\.zip$/i.test(f.nome)), outros = p.arquivos.filter(f => f !== zip);
      return '<tr data-busca="' + esc(buscaDe(p)) + '"><td>' + metaHtml(p) + '</td><td>' +
        (zip ? '<a class="btn btn-arq download" href="' + urlDe(p.id + '/' + zip.nome, zip.blob) + '" download="' + esc(zip.nome) + '">.ZIP</a>' : '') +
        outros.map(f => '<a class="file-link download" href="' + urlDe(p.id + '/' + f.nome, f.blob) + '" download="' + esc(f.nome) + '" title="' + esc(f.nome) + ' · ' + fmt(f.blob.size) + '">.' + f.nome.split('.').pop().toUpperCase() + '</a>').join('') +
        outros.filter(f => /\.html$/i.test(f.nome)).map(f => '<button type="button" class="btn btn-arq btn-exibir" data-ver="' + p.id + '/' + esc(f.nome) + '">Exibir ' + (/^Apresentacao_/.test(f.nome) ? 'apresentação' : 'apostila') + '</button>').join('') +
        '</td><td><button type="button" class="dan" data-del="' + p.id + '">Excluir</button></td></tr>';
    }).join('') + '</table>';
    uso(l.reduce((a, p) => a + p.tam, 0));
  }
  async function uso(total) {
    let t = total ? 'Pacotes guardados: ' + fmt(total) + '.' : '';
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); t += ' Uso total deste site no navegador: ' + fmt(e.usage || 0) + ' de ' + fmt(e.quota || 0) + '.'; } } catch { /* */ }
    $('gerUso').textContent = t.trim();
  }
  /* ---------------------------- Pacote em exibicao: arquivos e ZIP acima da previa ---------------------------- */
  const pkg = $('prevPkg'), dxRes = $('dxRes');
  let pkgUrls = new Map(), pkgId = null;
  const limparPkgUrls = () => { pkgUrls.forEach(u => URL.revokeObjectURL(u)); pkgUrls.clear(); };
  function ocultarPkg() {
    if (!pkg) return;
    pkg.hidden = true; pkg.innerHTML = ''; pkgId = null; limparPkgUrls();
    if (dxRes) dxRes.classList.remove('tem-pkg');
  }
  /* Fecha a exibicao do pacote (bloco e previa) quando o pacote deixa de existir */
  function fecharExibicaoDoPacote() { if (pkgId === null) return; ocultarPkg(); if (prev) { prev.hidden = true; prev.src = 'about:blank'; } }
  function marcarPkg(nome) { if (pkg) pkg.querySelectorAll('[data-pv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pv === nome ? 'true' : 'false')); }
  const tipoDe = n => /^Apresentacao_/.test(n) ? 'apresentação' : 'apostila';
  const anunciarPkg = m => { try { if (window.UXFeedback && UXFeedback.anunciar) UXFeedback.anunciar(m); } catch { /* sem anuncio */ } };
  function rolarPara(el) {
    if (!el) return;
    el.style.scrollMarginTop = '96px';
    requestAnimationFrame(() => requestAnimationFrame(() => el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })));
  }
  async function mostrarPkg(id, nome) {
    if (!pkg) return null;
    let p = null;
    try { p = await tx('readonly', s => s.get(id)); } catch { p = null; }
    if (!p || !(p.arquivos || []).some(f => f.nome === nome)) return null;
    limparPkgUrls();
    const zip = p.arquivos.find(f => /\.zip$/i.test(f.nome)), outros = p.arquivos.filter(f => f !== zip);
    const url = f => { if (!pkgUrls.has(f.nome)) pkgUrls.set(f.nome, URL.createObjectURL(f.blob)); return pkgUrls.get(f.nome); };
    pkg.innerHTML = '<p class="ger-pkg-rot">Em exibição</p>' + metaHtml(p) + '<div class="file-links">' +
      (zip ? '<a class="btn btn-arq download" href="' + url(zip) + '" download="' + esc(zip.nome) + '">.ZIP</a>' : '') +
      outros.map(f => '<a class="file-link download" href="' + url(f) + '" download="' + esc(f.nome) + '" title="' + esc(f.nome) + ' · ' + fmt(f.blob.size) + '">.' + f.nome.split('.').pop().toUpperCase() + '</a>').join('') +
      outros.filter(f => /\.html$/i.test(f.nome)).map(f => '<button type="button" class="btn btn-arq btn-exibir" data-pv="' + esc(f.nome) + '" aria-pressed="false">Exibir ' + tipoDe(f.nome) + '</button>').join('') + '</div>';
    pkgId = id; pkg.hidden = false; if (dxRes) dxRes.classList.add('tem-pkg');
    marcarPkg(nome);
    if (window.UXArquivos && UXArquivos.processar) UXArquivos.processar();
    return pkgUrls.get(nome) || null;
  }
  function abrirSecaoPrev() { for (let d = prev && prev.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }
  // a previa some (Limpar tela, nova geracao): o bloco do pacote some junto
  if (prev && pkg) new MutationObserver(() => { if (prev.hidden) ocultarPkg(); }).observe(prev, { attributes: true, attributeFilter: ['hidden'] });
  // Exibir da geracao atual (em Arquivos gerados): o bloco do historico sai, para nao duplicar
  res.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-u]')) ocultarPkg(); });
  // Trocar entre apostila e apresentacao do pacote em exibicao
  if (pkg) pkg.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('[data-pv]') : null; if (!b) return;
    e.preventDefault();
    const u = pkgUrls.get(b.dataset.pv); if (!u || !prev) return;
    prev.hidden = false; prev.src = u; marcarPkg(b.dataset.pv);
    anunciarPkg('Exibindo a ' + tipoDe(b.dataset.pv) + '.');
    rolarPara(pkg);
  });

  $('gerLista').addEventListener('click', async e => {
    const v = e.target.closest('[data-ver]'), d = e.target.closest('[data-del]'); if (v) fecharGer(true);
    if (v) {
      e.preventDefault();
      if (prev) {
        const k = v.dataset.ver.indexOf('/'), id = +v.dataset.ver.slice(0, k), nome = v.dataset.ver.slice(k + 1);
        let u = await mostrarPkg(id, nome);
        const comBloco = !!u;
        if (!u) { ocultarPkg(); u = urls.get(v.dataset.ver); }   // alternativa: exibicao simples, sem bloco (e sem restos do pacote anterior)
        if (u) {
          abrirSecaoPrev();
          prev.hidden = false;
          prev.src = u;
          if (comBloco) { pkg.focus({ preventScroll: true }); anunciarPkg('Exibindo a ' + tipoDe(nome) + '. Os arquivos do pacote est\u00e3o acima da exibi\u00e7\u00e3o.'); }
          rolarPara(comBloco ? pkg : prev);
        }
      }
    }
    if (d) {
      if (!confirm('Excluir este pacote de arquivos guardado?')) return;
      const id = +d.dataset.del;
      await tx('readwrite', s => s.delete(id));
      if (pkgId === id) fecharExibicaoDoPacote();
      listar();
    }
  });
  $('gerLimpar').onclick = async () => { if (!confirm('Apagar todos os pacotes de arquivos gerados guardados neste navegador?')) return; await tx('readwrite', s => s.clear()); fecharExibicaoDoPacote(); listar(); };
  const logEl = $('log');
  if (logEl) new MutationObserver(() => { if (/Dados locais apagados/.test(logEl.lastChild && logEl.lastChild.textContent || '')) tx('readwrite', s => s.clear()).then(() => { fecharExibicaoDoPacote(); listar(); }).catch(() => {}); }).observe(logEl, { childList: true });

  listar();
  window.Gerados = { listar, capturar, abrir: abrirGer, fechar: fecharGer, metaHtml, temaRotulo };
})();
