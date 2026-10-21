/* =====================================================================================
   Conteudista — Histórico de versões e comparação "antes e depois" (diff)
   - Versões guardadas SOMENTE neste navegador (IndexedDB, store "versoes")
   - Origens: sessão (automático), versão marcada, arquivo carregado, link, rascunho,
     exemplo, antes de carregar/restaurar, arquivos gerados, compartilhado
   - Diff por linhas (Myers) com destaque de palavras; imagens base64 mostradas como miniaturas
   Depende de: pacote(), aplicar(), dbAll/dbPut/dbDel/dbClear, log(), esc(), tamanho()  (index.html)
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const SESS = Date.now().toString(36) + Math.random().toString(36).slice(2, 6), INI = new Date();
  const MAX_VERSOES = 120, INTERVALO_SESSAO = 3 * 60 * 1000;
  const ORIGENS = {
    sessao: 'Edição (automático)', marco: 'Versão marcada', arquivo: 'Arquivo carregado', link: 'Link aberto',
    rascunho: 'Rascunho aberto', exemplo: 'Exemplo', antes: 'Antes de carregar', gerado: 'Arquivos gerados',
    compartilhado: 'Link criado', restaurado: 'Versão restaurada'
  };
  const GRUPOS = [
    ['sess', 'Esta sessão (desde ' + INI.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ')'],
    ['arquivo', 'Arquivos carregados'], ['link', 'Arquivos carregados de links'], ['marco', 'Versões marcadas'],
    ['outros', 'Rascunhos e exemplos'], ['antigas', 'Sessões anteriores']
  ];
  const grupoDe = v => v.origem === 'arquivo' ? 'arquivo' : v.origem === 'link' ? 'link' : v.origem === 'marco' ? 'marco'
    : (v.origem === 'rascunho' || v.origem === 'exemplo') ? 'outros' : v.sess === SESS ? 'sess' : 'antigas';

  /* ---------------------------- Utilidades ---------------------------- */
  function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
  const dataCurta = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const todas = async () => (await dbAll('versoes')).sort((a, b) => b.data - a.data);
  let cache = null; const invalidar = () => { cache = null; };
  async function lista() { if (!cache) cache = await todas(); return cache; }

  /* ---------------------------- Registro de versões ---------------------------- */
  let ultimaSessao = 0, fila = Promise.resolve();
  function registrar(origem, rotulo, d) {
    fila = fila.then(() => registrar_(origem, rotulo, d)).catch(e => console.warn('Histórico:', e));
    return fila;
  }
  async function registrar_(origem, rotulo, d) {
    d = d || pacote(); if (!(d.g || '').trim() && !(d.s || '').trim()) return null;
    const h = hash((d.g || '') + '\u0001' + (d.s || '')), l = await lista();
    const igual = l.find(v => v.h === h);
    if (l[0] && l[0].h === h && !['marco', 'arquivo', 'link'].includes(origem)) return null;  // nada mudou
    if (igual && ['sessao', 'antes', 'gerado', 'compartilhado'].includes(origem) && Date.now() - igual.data < 10 * 60 * 1000) return null;
    const v = { data: Date.now(), origem, rotulo: rotulo || ORIGENS[origem] || origem, sess: SESS, h, g: d.g || '', s: d.s || '', p: d.p || '', r: d.r || '', b: d.b || '', tam: (d.g || '').length + (d.s || '').length };
    await dbPut('versoes', v); if (origem === 'sessao' || origem === 'marco') ultimaSessao = Date.now();
    invalidar(); await podar(); agendarUI();
    return v;
  }
  async function podar() {
    const l = await lista(); if (l.length <= MAX_VERSOES) return;
    const rem = l.filter(v => v.origem !== 'marco').slice(MAX_VERSOES - l.filter(v => v.origem === 'marco').length);
    for (const v of rem) await dbDel('versoes', v.id);
    invalidar();
  }
  let tS = null;
  function sessao() { clearTimeout(tS); tS = setTimeout(() => { if (Date.now() - ultimaSessao >= INTERVALO_SESSAO) registrar('sessao'); }, 5000); }

  /* ---------------------------- Diff (Myers, por linhas) ---------------------------- */
  function myers(a, b) {
    let ini = 0; while (ini < a.length && ini < b.length && a[ini] === b[ini]) ini++;
    let fa = a.length, fb = b.length; while (fa > ini && fb > ini && a[fa - 1] === b[fb - 1]) { fa--; fb--; }
    const A = a.slice(ini, fa), B = b.slice(ini, fb), N = A.length, M = B.length, ops = [];
    for (let i = 0; i < ini; i++) ops.push(['=', i, i]);
    if (N + M > 0) {
      const MAX = N + M, off = MAX + 1, v = new Int32Array(2 * MAX + 3), trace = [];
      let achou = false;
      if (MAX > 30000) {  // proteção para textos enormes: substituição em bloco
        for (let i = 0; i < N; i++) ops.push(['-', ini + i, -1]); for (let j = 0; j < M; j++) ops.push(['+', -1, ini + j]);
      } else {
        for (let d = 0; d <= MAX && !achou; d++) {
          trace.push(v.slice());
          for (let k = -d; k <= d; k += 2) {
            let x = (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) ? v[off + k + 1] : v[off + k - 1] + 1, y = x - k;
            while (x < N && y < M && A[x] === B[y]) { x++; y++; }
            v[off + k] = x; if (x >= N && y >= M) { achou = true; break; }
          }
        }
        const res = []; let x = N, y = M;
        for (let d = trace.length - 1; d >= 0; d--) {
          const t = trace[d], k = x - y, pk = (k === -d || (k !== d && t[off + k - 1] < t[off + k + 1])) ? k + 1 : k - 1, px = t[off + pk], py = px - pk;
          while (x > px && y > py) { res.push(['=', ini + x - 1, ini + y - 1]); x--; y--; }
          if (d > 0) { if (x === px) res.push(['+', -1, ini + y - 1]); else res.push(['-', ini + x - 1, -1]); }
          x = px; y = py;
        }
        res.reverse(); ops.push(...res);
      }
    }
    for (let i = 0; i < a.length - fa; i++) ops.push(['=', fa + i, fb + i]);
    return ops;
  }

  /* ---------------------------- Preparação do texto ---------------------------- */
  const imgs = new Map();  // hash → dataURL
  function tokenizarImagens(t) {
    return (t || '').replace(/\(data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+\)/gi, m => { const d = m.slice(1, -1).replace(/\s+/g, ''), h = hash(d); imgs.set(h, d); return '(⟦img:' + h + '⟧)'; });
  }
  const linhas = t => tokenizarImagens(t).replace(/\r\n?/g, '\n').split('\n');
  const tamImg = d => Math.round((d.length - d.indexOf(',') - 1) * 3 / 4);
  const fmt = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function html(t) {
    return esc(t).replace(/⟦img:([0-9a-z]+)⟧/g, (m, h) => { const d = imgs.get(h); return d ? '<img class="dfi" src="' + d + '" title="Imagem ' + fmt(tamImg(d)) + '" alt="imagem">' : m; });
  }
  const TOK = /⟦img:[0-9a-z]+⟧|\s+|[\wÀ-ÿ]+|[^\s\wÀ-ÿ]/g;
  function palavras(a, b) {  // destaca palavras alteradas entre duas linhas
    const ta = a.match(TOK) || [], tb = b.match(TOK) || [];
    if (ta.length + tb.length > 1200) return [html(a), html(b)];
    const ops = myers(ta, tb); let ha = '', hb = '';
    for (const [t, i, j] of ops) {
      if (t === '=') { ha += html(ta[i]); hb += html(tb[j]); }
      else if (t === '-') ha += '<del>' + html(ta[i]) + '</del>';
      else hb += '<ins>' + html(tb[j]) + '</ins>';
    }
    return [ha, hb];
  }

  /* ---------------------------- Montagem da comparação ---------------------------- */
  function comparar(ta, tb, modo, contexto) {
    const A = linhas(ta), B = linhas(tb), ops = myers(A, B);
    // agrupa em linhas de exibição; pares (−,+) consecutivos viram "alterada"
    const rows = []; let i = 0, mais = 0, menos = 0;
    while (i < ops.length) {
      if (ops[i][0] === '=') { rows.push({ t: '=', a: ops[i][1], b: ops[i][2] }); i++; continue; }
      const del = [], add = [];
      while (i < ops.length && ops[i][0] !== '=') { (ops[i][0] === '-' ? del : add).push(ops[i]); i++; }
      menos += del.length; mais += add.length;
      const n = Math.max(del.length, add.length);
      for (let k = 0; k < n; k++) rows.push({ t: del[k] && add[k] ? '~' : del[k] ? '-' : '+', a: del[k] ? del[k][1] : -1, b: add[k] ? add[k][2] : -1 });
    }
    // contexto: oculta trechos iguais longos
    const mostrar = rows.map(r => r.t !== '=');
    if (contexto >= 0) rows.forEach((r, k) => { if (r.t !== '=') for (let j = Math.max(0, k - contexto); j <= Math.min(rows.length - 1, k + contexto); j++) mostrar[j] = true; });
    else mostrar.fill(true);
    let h = '<table class="df ' + (modo === 'u' ? 'uni' : 'lado') + '">';
    if (modo !== 'u') h += '<colgroup><col class="n"><col><col class="n"><col></colgroup>';
    let k = 0;
    while (k < rows.length) {
      if (!mostrar[k]) {
        let j = k; while (j < rows.length && !mostrar[j]) j++;
        h += '<tr class="gap" data-ini="' + k + '" data-fim="' + j + '"><td colspan="' + (modo === 'u' ? 3 : 4) + '">⋯ ' + (j - k) + ' linha(s) igual(is) — clique para mostrar</td></tr>';
        h += rows.slice(k, j).map(r => linha(r, A, B, modo, true)).join(''); k = j; continue;
      }
      h += linha(rows[k], A, B, modo, false); k++;
    }
    h += '</table>';
    if (!mais && !menos) h = '<p class="igual">Nenhuma diferença de texto.</p>';
    // imagens
    const ia = new Set((ta.match(/\(data:image\/[^)]+\)/g) || []).map(m => hash(m.slice(1, -1).replace(/\s+/g, ''))));
    const ib = new Set((tb.match(/\(data:image\/[^)]+\)/g) || []).map(m => hash(m.slice(1, -1).replace(/\s+/g, ''))));
    const rem = [...ia].filter(x => !ib.has(x)), nov = [...ib].filter(x => !ia.has(x));
    let hi = '';
    if (rem.length || nov.length) {
      const g = (l, cls) => l.map(x => '<figure class="' + cls + '"><img src="' + imgs.get(x) + '" alt=""><figcaption>' + fmt(tamImg(imgs.get(x))) + '</figcaption></figure>').join('');
      hi = '<div class="dimg"><div><b>Antes (só em A): ' + rem.length + '</b><div class="dg">' + (g(rem, 'rm') || '<span class="nd">—</span>') + '</div></div>' +
        '<div><b>Depois (só em B): ' + nov.length + '</b><div class="dg">' + (g(nov, 'nv') || '<span class="nd">—</span>') + '</div></div></div>';
    }
    return { html: h, imagens: hi, mais, menos, imgRem: rem.length, imgNov: nov.length };
  }
  function linha(r, A, B, modo, oculta) {
    const cls = { '=': 'eq', '-': 'del', '+': 'add', '~': 'chg' }[r.t], hid = oculta ? ' hidden data-oc' : '';
    const ta = r.a >= 0 ? A[r.a] : '', tb = r.b >= 0 ? B[r.b] : '';
    let ha = html(ta), hb = html(tb); if (r.t === '~') [ha, hb] = palavras(ta, tb);
    if (modo === 'u') {
      if (r.t === '=') return '<tr class="eq"' + hid + '><td class="n">' + (r.a + 1) + '</td><td class="sg"> </td><td>' + ha + '</td></tr>';
      let s = '';
      if (r.a >= 0) s += '<tr class="del"' + hid + '><td class="n">' + (r.a + 1) + '</td><td class="sg">−</td><td>' + ha + '</td></tr>';
      if (r.b >= 0) s += '<tr class="add"' + hid + '><td class="n">' + (r.b + 1) + '</td><td class="sg">+</td><td>' + hb + '</td></tr>';
      return s;
    }
    return '<tr class="' + cls + '"' + hid + '><td class="n">' + (r.a >= 0 ? r.a + 1 : '') + '</td><td class="a">' + (r.a >= 0 ? ha : '') + '</td><td class="n">' + (r.b >= 0 ? r.b + 1 : '') + '</td><td class="b">' + (r.b >= 0 ? hb : '') + '</td></tr>';
  }

  /* ---------------------------- Interface ---------------------------- */
  const css = `
#secHist .hrow{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:8px 0}
#secHist .hrow>div{display:flex;flex-direction:column;min-width:150px}#secHist .hrow>div.lg{flex:1;min-width:260px}
#secHist select{width:100%}#secHist .hrow button{margin:0}
#secHist .hint{font-size:12.5px;color:#636363;margin:2px 0 0}
#secHist .dfst{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:12px 0 6px;font-size:13.5px}
#secHist .dfst .p{color:#168821;font-weight:700}#secHist .dfst .m{color:#e52207;font-weight:700}
#secHist .dfwrap{border:1px solid #cccccc;border-radius:8px;max-height:65vh;overflow:auto;background:#fff}
#secHist h4{margin:14px 0 6px;color:#0c326f;font-size:15px}
table.df{border-collapse:collapse;width:100%;table-layout:fixed;font:12.5px/1.5 Consolas,"Cascadia Mono",monospace;margin:0}
table.df td{border:0;border-bottom:1px solid #f0f3f7;padding:1px 6px;vertical-align:top;white-space:pre-wrap;word-break:break-word}
table.df col.n{width:46px}table.df td.n{color:#888888;text-align:right;user-select:none;background:#f8f8f8;width:46px}
table.df.uni td.sg{width:18px;text-align:center;user-select:none;color:#636363}table.df.uni td.n{width:46px}
table.df tr.del td.a,table.df.uni tr.del td{background:#fde0db}table.df tr.add td.b,table.df.uni tr.add td{background:#e8f5ec}
table.df tr.chg td.a{background:#fdf1ef}table.df tr.chg td.b{background:#eef8f1}
table.df tr.del td.b,table.df tr.add td.a{background:#f6f7f9}
table.df del{background:#f5b8b0;text-decoration:line-through;text-decoration-color:#e52207;border-radius:2px}table.df ins{background:#a8dfb8;text-decoration:none;border-radius:2px}
table.df tr.gap td{background:#dbe8fb;color:#0c326f;text-align:center;cursor:pointer;font-family:"Segoe UI",Arial,sans-serif;padding:3px}
table.df img.dfi{height:42px;max-width:120px;object-fit:contain;vertical-align:middle;border:1px solid #cccccc;border-radius:3px;background:#fff}
#secHist .igual{padding:12px;color:#168821;margin:0}
#secHist .dimg{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}#secHist .dimg>div{border:1px solid #cccccc;border-radius:8px;padding:8px}
#secHist .dg{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}#secHist .dg figure{margin:0;text-align:center;font-size:11.5px;color:#636363}
#secHist .dg img{height:90px;max-width:160px;object-fit:contain;border-radius:4px;background:repeating-conic-gradient(#f8f8f8 0 25%,#fff 0 50%) 50%/12px 12px}
#secHist .dg figure.rm img{outline:3px solid #f5b8b0}#secHist .dg figure.nv img{outline:3px solid #a8dfb8}#secHist .nd{color:#888888}
@media(max-width:900px){#secHist .dimg{grid-template-columns:1fr}}
.hist-back{position:fixed;inset:0;z-index:1800;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px 14px;overflow:auto}
.hist-back[hidden]{display:none}
.hist-back #secHist{width:min(1400px,100%);margin:0;box-shadow:0 10px 40px rgba(0,0,0,.35);position:relative}
.mde-tb button.hbtn{display:inline-flex;align-items:center;gap:4px}
#secHist .htop{display:flex;align-items:center;gap:10px;margin:0 0 6px}#secHist .htop h2{flex:1;margin:0}
#secHist .htop .hx{flex:0 0 auto;margin:0}
@media(max-width:700px){
  .mde-tb button.hbtn .ht{display:none}
  .mde-tb button.hbtn{min-width:36px;min-height:34px;justify-content:center}
  .hist-back{padding:0;align-items:stretch}
  .hist-back #secHist{width:100%;min-height:100%;border-radius:0;border:0;padding:0 14px 20px}
  #secHist .htop{position:sticky;top:0;z-index:3;background:#fff;margin:0 -14px 8px;padding:10px 14px;border-bottom:1px solid #cccccc}
  #secHist .htop h2{font-size:16px;line-height:1.25}
  #secHist .htop .hx{min-height:38px;padding:6px 12px}
  #secHist>.note{font-size:12.5px;margin:4px 0 8px}
  #secHist .hrow{gap:8px}#secHist .hrow>div,#secHist .hrow>div.lg{min-width:0;flex:1 1 100%}
  #secHist .hrow.op>div{flex:1 1 calc(50% - 8px)}
  #secHist .hrow.op>div.go{flex:1 1 100%}#secHist .hrow.op>div.go button{width:100%;min-height:42px}
  #secHist .hrow.troca{justify-content:center;margin:2px 0}
  #secHist .hrow.acts{display:grid;grid-template-columns:1fr 1fr;gap:6px}#secHist .hrow.acts button{width:100%;min-height:38px}
  #secHist .dfst{font-size:12.5px;gap:6px 12px}
  #secHist .dfwrap{max-height:none}
  table.df{font-size:11.5px}table.df col.n,table.df td.n{width:30px}table.df td{padding:1px 4px}
  #secHist .dg img{height:70px;max-width:120px}
}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const sec = document.createElement('section'); sec.className = 'card'; sec.id = 'secHist';
  sec.innerHTML = '<div class="htop"><h2>Histórico e comparação</h2><button type="button" class="sec mini hx" id="hFechar" title="Fechar (Esc)">Fechar ✕</button></div>' +
    '<p class="note">Versões guardadas <b>somente neste navegador</b>: edições da sessão (a cada 3 min de edição), arquivos carregados, conteúdos abertos de links, rascunhos, exemplo, versões marcadas e momentos de geração/compartilhamento. Escolha duas versões e compare.</p>' +
    '<div class="hrow"><div class="lg"><label for="hA">Versão A (antes)</label><select id="hA"></select></div>' +
    '<div class="hrow troca" style="min-width:auto;margin:0"><button type="button" class="sec mini" id="hTroca" title="Trocar A e B">⇄</button></div>' +
    '<div class="lg"><label for="hB">Versão B (depois)</label><select id="hB"></select></div></div>' +
    '<div class="hrow op"><div><label for="hDoc">Documento</label><select id="hDoc"><option value="g">Guia</option><option value="s">Apresentação</option><option value="a">Ambos</option></select></div>' +
    '<div><label for="hModo">Exibição</label><select id="hModo"><option value="l">Lado a lado</option><option value="u">Unificada</option></select></div>' +
    '<div><label for="hCtx">Mostrar</label><select id="hCtx"><option value="3">Só alterações (± 3 linhas)</option><option value="10">Alterações (± 10 linhas)</option><option value="-1">Texto completo</option></select></div>' +
    '<div class="go" style="min-width:auto"><button type="button" id="hGo">Comparar</button></div></div>' +
    '<div class="hrow acts"><button type="button" class="sec mini" id="hMarca">★ Marcar versão atual…</button><button type="button" class="sec mini" id="hResA">Restaurar A</button><button type="button" class="sec mini" id="hResB">Restaurar B</button><button type="button" class="file-link download" id="hBx" title="Baixar as versões A e B">.MD A e B</button><button type="button" class="dan mini" id="hDel">Excluir A</button><button type="button" class="dan mini" id="hLimpa">Limpar histórico</button></div>' +
    '<p class="hint" id="hInfo"></p><div id="hRes"></div>';
  // Janela sobreposta: só aparece quando o botão "Histórico" (barra do editor) é clicado
  const back = document.createElement('div'); back.className = 'hist-back'; back.hidden = true; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', 'Histórico e comparação');
  back.appendChild(sec); document.body.appendChild(back);
  function abrir(doc) {
    if (doc) $('hDoc').value = doc;
    if (matchMedia('(max-width: 700px)').matches && !abrir.modoDefinido) { $('hModo').value = 'u'; abrir.modoDefinido = true; }  // celular: exibição unificada
    back.hidden = false; back.scrollTop = 0; document.body.style.overflow = 'hidden';
    montarSelects().then(async () => { const l = await lista(); if ($('hA').value === 'atual' && l[0]) $('hA').value = String(l[0].id); $('hB').value = 'atual'; executar(); });
    setTimeout(() => $('hA').focus(), 30);
  }
  function fecharHist() { back.hidden = true; document.body.style.overflow = ''; }
  back.addEventListener('click', e => { if (e.target === back) fecharHist(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !back.hidden) { e.preventDefault(); e.stopPropagation(); fecharHist(); } }, true);
  // Botão "Histórico" na barra de cada editor, logo antes do botão de tela cheia
  const ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 3"/></svg>';
  [['pg', 'g'], ['ps', 's']].forEach(([id, doc]) => {
    const tb = document.querySelector('#' + id + ' .mde-tb'); if (!tb) return;
    const fs = [...tb.querySelectorAll('button')].pop();
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hbtn'; b.title = 'Histórico e comparação de versões (Alt+Shift+V)';
    b.innerHTML = ICO + '<span class="ht"> Histórico</span>'; b.setAttribute('aria-label', 'Histórico e comparação'); b.onclick = () => abrir(doc);
    tb.insertBefore(b, fs);
  });

  let tUI = null; function agendarUI() { clearTimeout(tUI); tUI = setTimeout(montarSelects, 250); }
  async function montarSelects() {
    const l = await lista(), selA = $('hA'), selB = $('hB'), va = selA.value, vb = selB.value;
    const opt = v => '<option value="' + v.id + '">' + dataCurta(v.data) + ' — ' + esc(v.rotulo) + (v.p ? ' · ' + esc(v.p) : '') + ' · ' + fmt(v.tam) + '</option>';
    let h = '<option value="atual">★ Atual (conteúdo dos editores)</option>';
    for (const [g, nome] of GRUPOS) { const it = l.filter(v => grupoDe(v) === g); if (it.length) h += '<optgroup label="' + esc(nome) + ' (' + it.length + ')">' + it.map(opt).join('') + '</optgroup>'; }
    selA.innerHTML = h; selB.innerHTML = h;
    const existe = (s, v) => v && [...s.options].some(o => o.value === v);
    selA.value = existe(selA, va) ? va : (l[0] ? String(l[0].id) : 'atual');
    selB.value = existe(selB, vb) ? vb : 'atual';
    const nArq = l.filter(v => v.origem === 'arquivo').length, nLink = l.filter(v => v.origem === 'link').length;
    $('hInfo').textContent = l.length + ' versão(ões) guardada(s) neste navegador · ' + nArq + ' de arquivos · ' + nLink + ' de links · limite ' + MAX_VERSOES + ' (as marcadas não são apagadas automaticamente).';
  }
  async function obter(id) {
    if (id === 'atual') { const d = pacote(); return { rotulo: 'Atual (editores)', data: Date.now(), g: d.g, s: d.s, p: d.p, r: d.r, b: d.b, atual: true }; }
    return (await lista()).find(v => String(v.id) === String(id));
  }
  async function executar() {
    const A = await obter($('hA').value), B = await obter($('hB').value); if (!A || !B) return;
    const docs = $('hDoc').value === 'a' ? ['g', 's'] : [$('hDoc').value], modo = $('hModo').value, ctx = +$('hCtx').value;
    let out = '', mais = 0, menos = 0, ir = 0, inv = 0;
    for (const d of docs) {
      const r = comparar(A[d] || '', B[d] || '', modo, ctx); mais += r.mais; menos += r.menos; ir += r.imgRem; inv += r.imgNov;
      out += (docs.length > 1 ? '<h4>' + (d === 'g' ? 'Guia de treinamento' : 'Apresentação') + '</h4>' : '') + '<div class="dfwrap">' + r.html + '</div>' + r.imagens;
    }
    $('hRes').innerHTML = '<div class="dfst"><span><b>A:</b> ' + esc(A.rotulo) + ' (' + dataCurta(A.data) + ')</span><span><b>B:</b> ' + esc(B.rotulo) + ' (' + dataCurta(B.data) + ')</span>' +
      '<span class="p">+' + mais + ' linha(s)</span><span class="m">−' + menos + ' linha(s)</span>' + (ir || inv ? '<span>Imagens: <span class="m">−' + ir + '</span> / <span class="p">+' + inv + '</span></span>' : '') + '</div>' + out;
    $('hRes').querySelectorAll('tr.gap').forEach(tr => tr.onclick = () => {
      let n = tr.nextElementSibling; while (n && n.hasAttribute('data-oc')) { n.hidden = false; n.removeAttribute('data-oc'); n = n.nextElementSibling; } tr.remove();
    });
  }
  async function restaurar(id) {
    const v = await obter(id); if (!v || v.atual) { log('Escolha uma versão guardada para restaurar.', 'wa'); return; }
    if (!confirm('Substituir o conteúdo dos editores pela versão:\n' + v.rotulo + ' (' + dataCurta(v.data) + ')?\n\nO conteúdo atual será guardado no histórico antes.')) return;
    await registrar('antes', 'Antes de restaurar');
    aplicar(v); fecharHist(); log('Versão restaurada: ' + v.rotulo + ' (' + dataCurta(v.data) + '). Ctrl+Z no editor também desfaz.', 'ok');
    await registrar('restaurado', 'Restaurada: ' + v.rotulo);
  }
  function baixarMd(v, sufixo) {
    const x = (v.p || 'Curso').replace(/[^\w.-]+/g, '_'), t = new Date(v.data).toISOString().slice(0, 16).replace(/[:T]/g, '-');
    [['Treinamento_', v.g], ['Apresentacao_', v.s]].forEach(([n, c], i) => setTimeout(() => {
      const u = URL.createObjectURL(new Blob([c || ''], { type: 'text/markdown' })), a = document.createElement('a'); a.href = u; a.download = n + x + '_' + sufixo + '_' + t + '.md'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    }, i * 400));
  }

  $('hGo').onclick = executar;
  $('hFechar').onclick = fecharHist;
  ['hDoc', 'hModo', 'hCtx'].forEach(id => $(id).onchange = () => { if ($('hRes').innerHTML) executar(); });
  $('hTroca').onclick = () => { const a = $('hA').value; $('hA').value = $('hB').value; $('hB').value = a; if ($('hRes').innerHTML) executar(); };
  $('hMarca').onclick = async () => { const n = prompt('Nome desta versão (ex.: "Versão enviada para revisão"):', 'Versão de ' + new Date().toLocaleString('pt-BR')); if (n === null) return; const v = await registrar('marco', '★ ' + (n.trim() || 'Versão marcada')); if (v) { await montarSelects(); $('hA').value = String(v.id); log('Versão marcada no histórico.', 'ok'); } };
  $('hResA').onclick = () => restaurar($('hA').value);
  $('hResB').onclick = () => restaurar($('hB').value);
  $('hBx').onclick = async () => { const A = await obter($('hA').value), B = await obter($('hB').value); if (A) baixarMd(A, 'A'); if (B) setTimeout(() => baixarMd(B, 'B'), 900); };
  $('hDel').onclick = async () => { const v = await obter($('hA').value); if (!v || v.atual) return; if (!confirm('Excluir do histórico a versão:\n' + v.rotulo + ' (' + dataCurta(v.data) + ')?')) return; await dbDel('versoes', v.id); invalidar(); await montarSelects(); $('hRes').innerHTML = ''; log('Versão excluída do histórico.', 'ok'); };
  $('hLimpa').onclick = async () => { if (!confirm('Apagar TODO o histórico de versões deste navegador?')) return; await dbClear('versoes'); invalidar(); await montarSelects(); $('hRes').innerHTML = ''; log('Histórico apagado.', 'ok'); };

  window.Hist = { registrar, sessao, atualizar: () => { invalidar(); agendarUI(); }, abrir: () => abrir($('ps') && !$('ps').hidden ? 's' : 'g'), fechar: fecharHist, comparar: executar, _myers: myers };
  montarSelects();
})();
