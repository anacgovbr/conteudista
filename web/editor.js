/* =====================================================================================
   Conteudista — Editor Markdown leve (sem dependências)
   - Barra de ferramentas, atalhos, continuação de listas, Tab/Shift+Tab
   - Modos: Editar | Dividido | Prévia; tela cheia; rolagem sincronizada
   - Imagens base64 recolhidas como (img:N) no editor; o texto real continua completo
   - Prévia compatível com o gerador (callouts, checklists, tabelas, Mermaid, slides)
   Uso: const ed = MDEditor.create(textareaReal, { tipo: 'guia' | 'slides', onFiles })
   ===================================================================================== */
(function (global) {
  'use strict';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EXT_IMG = /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif)$/i;
  const MIME_EXT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif' };
  const ehImagem = f => !!f && ((f.type || '').startsWith('image/') || EXT_IMG.test(f.name || ''));
  function lerImagem(f) {  // → data URL com MIME correto mesmo quando o sistema não informa o tipo
    return new Promise((ok, err) => {
      const r = new FileReader();
      r.onload = () => { let d = String(r.result); if (!/^data:image\//.test(d)) { const e = ((f.name || '').split('.').pop() || 'png').toLowerCase(); d = 'data:' + (MIME_EXT[e] || 'image/png') + d.slice(d.indexOf(';')); } ok(d); };
      r.onerror = err; r.readAsDataURL(f);
    });
  }
  const tamanhoB64 = d => Math.round((d.length - d.indexOf(',') - 1) * 3 / 4);
  const fmtTam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const DATA_IMG = /\(data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+\)/gi;

  /* ---------------------------- Renderizador ---------------------------- */
  function inline(t) {
    const tok = [];
    const keep = h => '\u0000' + (tok.push(h) - 1) + '\u0000';
    t = t.replace(/`([^`]+)`/g, (m, c) => keep('<code>' + esc(c) + '</code>'));
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, a, s) => keep('<img class="il" src="' + esc(s) + '" alt="' + esc(a) + '">'));
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, s) => keep('<a href="' + esc(s) + '" target="_blank" rel="noopener">' + inline(a) + '</a>'));
    t = esc(t);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, '$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g, (m, i) => tok[+i]);
  }
  const LI = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
  function render(md) {
    const L = md.replace(/<!--[\s\S]*?-->/g, '').split('\n'); let i = 0; const o = [];
    const start = l => /^(#|```|\||>)/.test(l) || LI.test(l) || /^\s*$/.test(l) || l.trim() === '---';
    while (i < L.length) {
      const l = L[i];
      if (!l.trim() || l.trim() === '---') { i++; continue; }
      if (l.startsWith('```')) {
        const lg = l.slice(3).trim(), b = []; i++;
        while (i < L.length && !L[i].startsWith('```')) b.push(L[i++]); i++;
        o.push(lg === 'mermaid' ? '<div class="mw"><pre class="mermaid">' + esc(b.join('\n')) + '</pre></div>' : '<pre class="code"><code>' + esc(b.join('\n')) + '</code></pre>');
        continue;
      }
      let m = l.match(/^(#{1,6})\s+(.*)$/);
      if (m) { o.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
      m = l.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
      if (m) { o.push('<figure><img src="' + esc(m[2]) + '" alt="' + esc(m[1]) + '">' + (m[1] ? '<figcaption>' + esc(m[1]) + '</figcaption>' : '') + '</figure>'); i++; continue; }
      if (l.startsWith('|')) {
        const r = []; while (i < L.length && L[i].startsWith('|')) r.push(L[i++]);
        const cells = x => x.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
        let h = '<div class="tbl"><table><thead><tr>' + cells(r[0]).map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
        r.slice(2).forEach(x => { h += '<tr>' + cells(x).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>'; });
        o.push(h + '</tbody></table></div>'); continue;
      }
      if (l.startsWith('>')) {
        const b = []; while (i < L.length && L[i].startsWith('>')) b.push(L[i++].slice(1).replace(/^ /, ''));
        let k = ''; const mm = b[0].match(/^\[!(\w+)\]\s*/); if (mm) { k = mm[1].toLowerCase(); b[0] = b[0].slice(mm[0].length); }
        o.push('<blockquote class="' + k + '">' + render(b.join('\n')) + '</blockquote>'); continue;
      }
      if (LI.test(l)) {
        const it = []; let base = null;
        while (i < L.length && (LI.test(L[i]) || (/^  /.test(L[i]) && L[i].trim()))) {
          const mm = L[i].match(LI);
          if (mm) { const ind = mm[1].length; if (base === null) base = ind; let t = mm[3], ck = null; const c = t.match(/^\[( |x)\]\s(.*)$/); if (c) { ck = c[1] === 'x'; t = c[2]; } it.push({ d: Math.max(0, Math.min(3, (ind - base) >> 1)), ol: /\d/.test(mm[2]), ck, t }); }
          else if (it.length) it[it.length - 1].t += ' ' + L[i].trim();
          i++;
        }
        o.push(renderList(it)); continue;
      }
      const b = []; while (i < L.length && !start(L[i])) b.push(L[i++].trim());
      if (!b.length) b.push(L[i++].trim());
      o.push('<p>' + inline(b.join(' ')) + '</p>');
    }
    return o.join('\n');
  }
  function renderList(it) {
    let k = 0;
    function rec(d) {
      const tag = it[k].ol ? 'ol' : 'ul'; let h = '';
      while (k < it.length && it[k].d >= d) {
        if (it[k].d > d) { h = h.replace(/<\/li>$/, '') + rec(it[k].d) + '</li>'; continue; }
        const x = it[k++];
        h += x.ck !== null ? '<li class="task"><label><input type="checkbox" disabled' + (x.ck ? ' checked' : '') + '> ' + inline(x.t) + '</label></li>' : '<li>' + inline(x.t) + '</li>';
      }
      return '<' + tag + '>' + h + '</' + tag + '>';
    }
    return rec(it[0].d);
  }
  function renderSlides(md) {
    md = md.replace(/^---\n[\s\S]*?\n---\n/, '');
    const parts = md.split(/\n---\s*\n/).map(p => p.trim()).filter(Boolean);
    return '<div class="slides">' + parts.map((p, n) => {
      const c = (p.match(/<!--\s*class:\s*(\w+)\s*-->/) || [])[1] || '';
      const nt = (p.match(/<!--\s*notas:\s*([\s\S]*?)-->/) || [])[1] || '';
      return '<div class="sl ' + c + '"><span class="sn">' + (n + 1) + '</span>' + render(p) + (nt ? '<div class="nt">Notas: ' + esc(nt.trim()) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  let mermaidP = null;
  async function drawMermaid(root) {
    const els = root.querySelectorAll('pre.mermaid'); if (!els.length) return;
    try {
      if (!mermaidP) mermaidP = import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs').then(m => { m.default.initialize({ startOnLoad: false, securityLevel: 'strict' }); return m.default; });
      const mm = await mermaidP; await mm.run({ nodes: els });
    } catch (e) { /* offline: mantém o código */ }
  }

  /* ---------------------------- Ícones (SVG) ---------------------------- */
  const sv = d => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const IC = {
    link: sv('<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'),
    img: sv('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>'),
    table: sv('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>'),
    flow: sv('<rect x="2" y="9" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="16" y="15" width="6" height="6" rx="1"/><path d="M8 12h4M12 6v12M12 6h4M12 18h4"/>'),
    list: sv('<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
    olist: sv('<path d="M10 6h11M10 12h11M10 18h11M4 4v4M3 18h3l-3 3h3"/>'),
    check: sv('<rect x="3" y="4" width="7" height="7" rx="1"/><path d="M4.5 7.5l1.5 1.5 3-3M13 7.5h8M3 14h7v7H3zM13 17.5h8"/>'),
    code: sv('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>'),
    hr: sv('<path d="M3 12h18"/>'),
    plus: sv('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 9v6M9 12h6"/>'),
    note: sv('<path d="M5 3h10l4 4v14H5z"/><path d="M9 11h6M9 15h6"/>'),
    edit: sv('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    split: sv('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M12 4v16"/>'),
    eye: sv('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    full: sv('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    undo: sv('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    redo: sv('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
    ex: sv('<path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="2"/>')
  };

  /* ---------------------------- Estilos ---------------------------- */
  const CSS = `
.mde{border:1px solid #dfe5ee;border-radius:8px;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.mde.fs{position:fixed;inset:0;z-index:1000;border-radius:0}
.mde-tb{display:flex;flex-wrap:wrap;gap:2px;align-items:center;padding:4px 6px;background:#f3f6fa;border-bottom:1px solid #dfe5ee}
.mde-tb svg{width:16px;height:16px;vertical-align:-3px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mde-tb button{background:transparent!important;color:#1b2430!important;border:1px solid transparent!important;border-radius:5px;margin:0;padding:4px 7px;min-width:28px;font:600 13px "Segoe UI",Arial,sans-serif;cursor:pointer;line-height:1.2}
.mde-tb button:hover{background:#e3ebf5!important;border-color:#c9d6e6!important}
.mde-tb button:disabled{opacity:.35;cursor:default}
.mde-tb button.on{background:#0a7cc1!important;color:#fff!important}
.mde-tb .sep{width:1px;height:20px;background:#d3dbe6;margin:0 4px}
.mde-tb .sp{flex:1}
.mde-tb select{width:auto;padding:3px 4px;font-size:12.5px;border:1px solid #d3dbe6;border-radius:5px;background:#fff}
.mde-body{display:flex;flex:0 0 auto;height:min(68vh,620px);min-height:240px;resize:vertical;overflow:hidden}
.mde.fs .mde-body{flex:1 1 auto;height:auto;resize:none}
.mde-ta{flex:1;min-width:0;align-self:stretch;border:0!important;border-radius:0!important;outline:none;resize:none!important;height:auto!important;padding:12px!important;font:13px/1.55 Consolas,"Cascadia Mono",monospace!important;tab-size:2;background:#fff}
.mde-pv{flex:1;min-width:0;overflow:auto;padding:14px 20px;border-left:1px solid #dfe5ee;background:#fcfdff;font:14.5px/1.55 "Segoe UI",Roboto,Arial,sans-serif;color:#1b2430}
.mde[data-m="e"] .mde-pv{display:none}.mde[data-m="p"] .mde-ta{display:none}.mde[data-m="p"] .mde-pv{border-left:0}
.mde-st{display:flex;gap:14px;padding:3px 10px;font-size:12px;color:#5a6676;background:#f3f6fa;border-top:1px solid #dfe5ee}
.mde-pv h1{font-size:24px;color:#0b3d6e;margin:4px 0 10px}.mde-pv h2{font-size:19px;color:#0b3d6e;border-top:3px solid #0a7cc1;padding-top:6px;margin:22px 0 8px}
.mde-pv h3{font-size:16px;color:#0b3d6e;margin:16px 0 6px}.mde-pv a{color:#0a7cc1}
.mde-pv table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}.mde-pv th,.mde-pv td{border:1px solid #dfe5ee;padding:5px 7px;text-align:left;vertical-align:top}.mde-pv th{background:#eaf1f8;color:#0b3d6e}
.mde-pv code{background:#eef2f7;padding:1px 4px;border-radius:4px;font-size:.9em}.mde-pv pre.code{background:#eef2f7;padding:10px;border-radius:6px;overflow:auto}
.mde-pv .mw{border:1px solid #dfe5ee;border-radius:8px;padding:8px;background:#fff;overflow:auto}.mde-pv pre.mermaid{margin:0;font-size:12px}
.mde-pv blockquote{margin:10px 0;padding:8px 12px;border-left:4px solid #0a7cc1;background:#eaf1f8;border-radius:0 6px 6px 0}.mde-pv blockquote p{margin:3px 0}
.mde-pv blockquote.tip{border-left-color:#1e7b4f;background:#e9f6f0}.mde-pv blockquote.warning{border-left-color:#9a5b00;background:#fff4e0}
.mde-pv li.task{list-style:none;margin-left:-20px}.mde-pv figure{margin:10px 0;text-align:center}.mde-pv figure img{max-width:100%;border:1px solid #dfe5ee;border-radius:6px}
.mde-pv figcaption{font-size:12px;color:#5a6676}.mde-pv img.il{max-height:1.4em;vertical-align:middle}
.mde-pv .slides{display:flex;flex-direction:column;gap:14px}
.mde-pv .sl{position:relative;aspect-ratio:16/9;overflow:hidden;background:#fff;border:1px solid #d3dbe6;border-left:8px solid #0b3d6e;border-radius:6px;padding:14px 22px;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.mde-pv .sl h1{font-size:20px;border-bottom:2px solid #0a7cc1;padding-bottom:4px}.mde-pv .sl h2{border:0;font-size:15px;color:#0a7cc1;margin:4px 0}
.mde-pv .sl.title{background:linear-gradient(135deg,#0b3d6e,#0a7cc1);color:#fff;border-left-color:#19a974;display:flex;flex-direction:column;justify-content:center}
.mde-pv .sl.title h1,.mde-pv .sl.title h2{color:#fff;border-color:#19a974}.mde-pv .sl.highlight{background:#f2f7fc}
.mde-pv .sl .sn{position:absolute;right:8px;bottom:4px;font-size:11px;color:#8a96a6}.mde-pv .sl.title .sn{color:#cfe3f5}.mde-pv .sl.title .nt{color:#ffe08a}
.mde-pv .sl .nt{position:absolute;left:22px;right:40px;bottom:4px;font-size:11px;color:#7a6400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mde-pv .sl figure img{max-height:180px}
.mde{position:relative}
.mde.drag::after{content:'Solte as imagens para inserir no texto';position:absolute;inset:38px 0 24px 0;display:flex;align-items:center;justify-content:center;background:rgba(10,124,193,.12);border:3px dashed #0a7cc1;color:#0b3d6e;font:600 16px "Segoe UI",Arial,sans-serif;z-index:5;pointer-events:none}
.mde-gal{border-top:1px solid #dfe5ee;background:#fbfcfe}
.mde-gal>summary{cursor:pointer;padding:6px 10px;font:600 13px "Segoe UI",Arial,sans-serif;color:#0b3d6e;list-style:none;display:flex;gap:8px;align-items:center}
.mde-gal>summary::-webkit-details-marker{display:none}.mde-gal>summary::before{content:'▸';transition:transform .15s}.mde-gal[open]>summary::before{transform:rotate(90deg)}
.mde-gal>summary .gb{margin-left:auto}
.mde-gl{display:flex;flex-wrap:wrap;gap:10px;padding:4px 10px 10px}
.mde-gi{width:176px;border:1px solid #dfe5ee;border-radius:8px;background:#fff;overflow:hidden;font:12px "Segoe UI",Arial,sans-serif;display:flex;flex-direction:column}
.mde-gi .th{height:90px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#f3f6fa 0 25%,#fff 0 50%) 50%/14px 14px;cursor:pointer}
.mde-gi .th img{max-width:100%;max-height:90px;object-fit:contain}
.mde-gi .mt{padding:4px 6px;color:#1b2430;line-height:1.3}.mde-gi .mt b{color:#0b3d6e}.mde-gi .mt span{color:#5a6676}
.mde-gi input{width:100%;border:1px solid #dfe5ee;border-radius:4px;padding:2px 4px;font:12px "Segoe UI",Arial,sans-serif;margin-top:3px}
.mde-gi .ac{display:flex;gap:2px;padding:0 4px 5px}.mde-gi .ac button{flex:1;margin:0!important;padding:3px 0!important;font:600 11.5px "Segoe UI",Arial,sans-serif!important;border-radius:4px!important;background:#eaf1f8!important;color:#0b3d6e!important;border:1px solid #c9d6e6!important;cursor:pointer}
.mde-gi .ac button.rm{background:#fff!important;color:#b42318!important;border-color:#e8b4ae!important}
.mde-gi.nu{opacity:.6}.mde-gi.nu .mt::after{content:' · não usada';color:#9a5b00}
.mde-ge{padding:4px 12px 10px;color:#5a6676;font:13px "Segoe UI",Arial,sans-serif}
.mde-gb{background:#0a7cc1!important;color:#fff!important;border:0!important;border-radius:5px;padding:3px 10px!important;margin:0!important;font:600 12px "Segoe UI",Arial,sans-serif!important;cursor:pointer}
@media(max-width:900px){.mde-body{flex-direction:column;height:auto;resize:none}.mde-ta{min-height:300px}.mde-pv{border-left:0;border-top:1px solid #dfe5ee;min-height:300px}}`;
  function injectCSS() { if (document.getElementById('mde-css')) return; const s = document.createElement('style'); s.id = 'mde-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------------------------- Editor ---------------------------- */
  function create(real, opt) {
    opt = opt || {}; injectCSS();
    const tipo = opt.tipo || 'guia', imgs = [], idx = new Map();
    const collapse = t => t.replace(DATA_IMG, m => { const d = m.slice(1, -1).replace(/\s+/g, ''); if (!idx.has(d)) { imgs.push(d); idx.set(d, imgs.length); } return '(img:' + idx.get(d) + ')'; });
    const expand = t => t.replace(/\(img:(\d+)\)/g, (m, n) => imgs[n - 1] ? '(' + imgs[n - 1] + ')' : m);
    const addImg = d => { if (!idx.has(d)) { imgs.push(d); idx.set(d, imgs.length); } return idx.get(d); };

    const box = document.createElement('div'); box.className = 'mde'; box.dataset.m = localStorage.getItem('mde.modo') || 's';
    const tb = document.createElement('div'); tb.className = 'mde-tb';
    const body = document.createElement('div'); body.className = 'mde-body';
    const ta = document.createElement('textarea'); ta.className = 'mde-ta'; ta.spellcheck = true; ta.lang = 'pt-BR'; ta.placeholder = real.placeholder || '';
    const pv = document.createElement('div'); pv.className = 'mde-pv';
    const st = document.createElement('div'); st.className = 'mde-st';
    body.append(ta, pv);
    const gal = document.createElement('details'); gal.className = 'mde-gal';
    gal.innerHTML = '<summary>Imagens do texto <span class="gc">(0)</span><button type="button" class="mde-gb gb">+ Adicionar imagens</button></summary><div class="mde-gl"></div>';
    box.append(tb, body, st, gal);
    real.hidden = true; real.after(box);
    const fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.multiple = true; fileIn.hidden = true; box.append(fileIn);

    let lastReal = null, tPv = null;
    /* ---- histórico próprio (Ctrl+Z / Ctrl+Y): cobre digitação, botões e alterações externas ---- */
    const hist = [], HMAX = 300; let hpos = -1, hT = 0, hTipo = '';
    function snap(tipo) {
      const v = ta.value, cur = hist[hpos];
      if (cur && cur.v === v) { cur.s = ta.selectionStart; cur.e = ta.selectionEnd; return; }
      const agora = Date.now(), agrupa = tipo === 'dig' && hTipo === 'dig' && agora - hT < 900 && hpos === hist.length - 1 && hpos > 0;
      if (agrupa) hist[hpos] = { v, s: ta.selectionStart, e: ta.selectionEnd };
      else { hist.splice(hpos + 1); hist.push({ v, s: ta.selectionStart, e: ta.selectionEnd }); if (hist.length > HMAX) hist.shift(); hpos = hist.length - 1; }
      hT = agora; hTipo = tipo; atualizaUR();
    }
    function restaura(d) {
      const n = hpos + d; if (n < 0 || n >= hist.length) return false;
      hpos = n; const h = hist[n]; ta.value = h.v; ta.focus(); ta.setSelectionRange(h.s, h.e); hTipo = '';
      pushReal(true); atualizaUR(); return true;
    }
    const desfazer = () => restaura(-1), refazer = () => restaura(1);
    function atualizaUR() { const u = tb.querySelector('[data-ur="u"]'), r = tb.querySelector('[data-ur="r"]'); if (u) u.disabled = hpos <= 0; if (r) r.disabled = hpos >= hist.length - 1; }
    function pushReal(semHist, tipo) { if (!semHist) snap(tipo || 'cmd'); const v = expand(ta.value); if (v !== real.value) { real.value = v; lastReal = v; real.dispatchEvent(new Event('input', { bubbles: true })); } schedulePv(); status(); }
    function pull() { if (real.value === lastReal) return; lastReal = real.value; const c = collapse(real.value); if (c !== ta.value) { ta.value = c; snap('ext'); } schedulePv(); status(); }
    function schedulePv() { clearTimeout(tPv); tPv = setTimeout(preview, 250); }
    function preview() { if (box.dataset.m === 'e') return; const md = real.value; pv.innerHTML = tipo === 'slides' ? renderSlides(md) : render(md); drawMermaid(pv); }
    function status() {
      const v = ta.value, words = (v.replace(/\(img:\d+\)/g, '').match(/[\wÀ-ÿ]+/g) || []).length;
      const ni = (real.value.match(/!\[[^\]]*\]\(/g) || []).length;
      const extra = tipo === 'slides' ? 'Slides: ' + (real.value.replace(/^---\n[\s\S]*?\n---\n/, '').split(/\n---\s*\n/).filter(p => p.trim()).length) : 'Seções: ' + (v.match(/^## /gm) || []).length;
      galeria();
      st.innerHTML = '<span>Palavras: ' + words.toLocaleString('pt-BR') + '</span><span>Linhas: ' + v.split('\n').length + '</span><span>Imagens: ' + ni + '</span><span>' + extra + '</span><span style="flex:1"></span><span>' + (real.value.length / 1024).toFixed(1) + ' KB</span>';
    }

    let emCmd = false, tocado = false;
    ta.addEventListener('focus', () => { tocado = true; });
    ta.addEventListener('mousedown', () => { tocado = true; });
    function ins(text, selFrom, selTo) {
      ta.focus();
      const s = ta.selectionStart;
      emCmd = true; hTipo = '';
      try { if (!document.execCommand('insertText', false, text)) ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); } finally { emCmd = false; }
      if (selFrom !== undefined) ta.setSelectionRange(s + selFrom, s + (selTo !== undefined ? selTo : selFrom));
      pushReal();
    }
    function wrap(a, b, ph) {
      const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
      if (sel && ta.value.slice(s - a.length, s) === a && ta.value.slice(e, e + b.length) === b) { ta.setSelectionRange(s - a.length, e + b.length); ins(sel, 0, sel.length); return; }
      const t = sel || ph; ins(a + t + b, a.length, a.length + t.length);
    }
    function lineRange() { const v = ta.value; let s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1, e = v.indexOf('\n', ta.selectionEnd); if (e < 0) e = v.length; if (ta.selectionEnd > ta.selectionStart && v[ta.selectionEnd - 1] === '\n') e = ta.selectionEnd - 1; return [s, e]; }
    function prefix(fn) { const [s, e] = lineRange(), lines = ta.value.slice(s, e).split('\n'); ta.setSelectionRange(s, e); const out = lines.map(fn).join('\n'); ins(out, 0, out.length); }
    function togglePrefix(p, re) { const all = ta.value.slice(...lineRange()).split('\n').every(l => re.test(l)); prefix((l, i) => all ? l.replace(re, '') : (typeof p === 'function' ? p(i) : p) + l.replace(/^(#{1,6} |[-*] \[[ x]\] |[-*] |\d+\. |> )/, '')); }
    function heading(n) { togglePrefix('#'.repeat(n) + ' ', new RegExp('^#{' + n + '} ')); }
    function block(text) {
      const v = ta.value, s = ta.selectionStart, before = v.slice(0, s);
      const pre = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const post = v.slice(ta.selectionEnd).startsWith('\n') ? '\n' : '\n\n';
      ins(pre + text + post, pre.length, pre.length + text.length);
    }
    function moverLinha(d) {
      const v = ta.value, [s, e] = lineRange(), bloco = v.slice(s, e), ss = ta.selectionStart - s, se = ta.selectionEnd - s;
      if (d < 0) { if (s === 0) return; const ps = v.lastIndexOf('\n', s - 2) + 1, ant = v.slice(ps, s - 1); ta.setSelectionRange(ps, e); ins(bloco + '\n' + ant); ta.setSelectionRange(ps + ss, ps + se); }
      else { if (e >= v.length) return; let ne = v.indexOf('\n', e + 1); if (ne < 0) ne = v.length; const prox = v.slice(e + 1, ne); ta.setSelectionRange(s, ne); ins(prox + '\n' + bloco); const o = s + prox.length + 1; ta.setSelectionRange(o + ss, o + se); }
    }
    function duplicarLinha() { const [s, e] = lineRange(), bloco = ta.value.slice(s, e); ta.setSelectionRange(e, e); ins('\n' + bloco); ta.setSelectionRange(e + 1, e + 1 + bloco.length); }
    function link() {
      const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || 'texto do link';
      const url = prompt('Endereço (URL) do link:', 'https://'); if (!url) return;
      ins('[' + sel + '](' + url.trim().replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29') + ')', 1, 1 + sel.length);
    }
    async function imagensDeArquivos(files) {
      const out = [];
      for (const f of files) if (ehImagem(f)) {
        const d = await lerImagem(f), nome = (f.name && f.name !== 'image.png' ? f.name : 'imagem colada').replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '');
        out.push('![' + nome + '](img:' + addImg(d) + ')');
      }
      return out;
    }
    async function inserirImagens(files, comoBloco) {  // insere no cursor; retorna quantas
      if (!tocado) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      const t = await imagensDeArquivos([...files]); if (!t.length) return 0;
      const v = ta.value, p = ta.selectionStart, sozinha = (!v.slice(0, p).trim() || v.slice(0, p).endsWith('\n')) && (!v.slice(ta.selectionEnd).trim() || v.slice(ta.selectionEnd).startsWith('\n'));
      if (comoBloco || t.length > 1 || sozinha) block(t.join('\n\n')); else ins(t.join(' '));
      ta.setSelectionRange(ta.selectionEnd, ta.selectionEnd);  // cursor após as imagens (não deixa seleção)
      galeria(); if (!gal.open) gal.open = true;
      return t.length;
    }
    function imagensNoTexto() {  // [{n, dados, alts:[], usos}]
      const mapa = new Map(), re = /!\[([^\]]*)\]\(img:(\d+)\)/g; let m;
      while ((m = re.exec(ta.value))) { const n = +m[2]; if (!imgs[n - 1]) continue; const it = mapa.get(n) || { n, dados: imgs[n - 1], alts: [], usos: 0 }; it.usos++; it.alts.push(m[1]); mapa.set(n, it); }
      return [...mapa.values()].sort((a, b) => a.n - b.n);
    }
    let galAssin = '';
    function galeria() {
      const l = imagensNoTexto(), assin = l.map(x => x.n + ':' + x.usos + ':' + x.alts.join('|')).join(',');
      gal.querySelector('.gc').textContent = '(' + l.length + ')';
      if (assin === galAssin) return; galAssin = assin;
      const gl = gal.querySelector('.mde-gl');
      if (!l.length) { gl.innerHTML = '<div class="mde-ge">Nenhuma imagem no texto. Arraste imagens para o editor, cole com Ctrl+V ou use “+ Adicionar imagens”. Elas são guardadas em base64 dentro do próprio Markdown.</div>'; return; }
      gl.innerHTML = l.map(x => '<div class="mde-gi" data-n="' + x.n + '"><div class="th" title="Ir para a imagem no texto"><img alt="" src="' + x.dados + '"></div>' +
        '<div class="mt"><b>(img:' + x.n + ')</b> <span>' + fmtTam(tamanhoB64(x.dados)) + (x.usos > 1 ? ' · ' + x.usos + ' usos' : '') + '</span>' +
        '<input type="text" value="' + esc(x.alts[0]) + '" title="Descrição (texto alternativo / legenda)" placeholder="Descrição / legenda"></div>' +
        '<div class="ac"><button type="button" data-a="ins" title="Inserir de novo no cursor">Inserir</button><button type="button" data-a="ver" title="Localizar no texto">Localizar</button><button type="button" class="rm" data-a="rm" title="Remover do texto">Remover</button></div></div>').join('');
      gl.querySelectorAll('.mde-gi').forEach(card => {
        const n = +card.dataset.n, ref = '](img:' + n + ')';
        const localizar = () => { const i = ta.value.indexOf(ref); if (i < 0) return; const a = ta.value.lastIndexOf('![', i); ta.focus(); ta.setSelectionRange(a, i + ref.length); const lin = ta.value.slice(0, a).split('\n').length; ta.scrollTop = Math.max(0, (lin - 3) * parseFloat(getComputedStyle(ta).lineHeight || 20)); };
        card.querySelector('.th').onclick = localizar;
        card.querySelector('[data-a="ver"]').onclick = localizar;
        card.querySelector('[data-a="ins"]').onclick = () => { const alt = card.querySelector('input').value.replace(/[\[\]]/g, ''); ins('![' + alt + '](img:' + n + ')'); };
        card.querySelector('[data-a="rm"]').onclick = () => {
          if (!confirm('Remover esta imagem do texto (todas as ocorrências)? Use Ctrl+Z para desfazer.')) return;
          const pc = ta.selectionStart; ta.focus(); ta.setSelectionRange(0, ta.value.length);
          ins(ta.value.replace(new RegExp('\\n?!\\[[^\\]]*\\]\\(img:' + n + '\\)\\n?', 'g'), m => m.startsWith('\n') && m.endsWith('\n') ? '\n' : ''), 0, 0);
          const q = Math.min(pc, ta.value.length); ta.setSelectionRange(q, q); galeria();
        };
        card.querySelector('input').onchange = e => {
          const alt = e.target.value.replace(/[\[\]]/g, ''), novo = ta.value.replace(new RegExp('!\\[[^\\]]*\\]\\(img:' + n + '\\)', 'g'), '![' + alt + '](img:' + n + ')');
          if (novo !== ta.value) { const p = ta.selectionStart; ta.focus(); ta.setSelectionRange(0, ta.value.length); ins(novo, 0, 0); ta.setSelectionRange(p, p); galeria(); }
        };
      });
    }
    function tabela() {
      const c = Math.max(1, Math.min(8, parseInt(prompt('Número de colunas:', '3')) || 3)), r = Math.max(1, Math.min(30, parseInt(prompt('Número de linhas (sem o cabeçalho):', '3')) || 3));
      const row = x => '| ' + Array.from({ length: c }, (_, i) => x(i)).join(' | ') + ' |';
      block([row(i => 'Coluna ' + (i + 1)), row(() => '---'), ...Array.from({ length: r }, () => row(() => ' '))].join('\n'));
    }
    const MERMAID = 'flowchart LR\n    T00((Início)) --> T01[01. Fazer tarefa<br/>Unidade]\n    T01 --> D01{Pergunta?}\n    D01 -->|Sim| T02[02. Próxima tarefa]\n    D01 -->|Não| T99(((Fim)))\n    T02 --> T99';

    const B = [
      [IC.undo, 'Desfazer (Ctrl+Z)', () => desfazer(), 'u'], [IC.redo, 'Refazer (Ctrl+Y ou Ctrl+Shift+Z)', () => refazer(), 'r'], '|',
      ['H1', 'Título 1 (Ctrl+Shift+1)', () => heading(1)], ['H2', 'Título 2 — seção (Ctrl+Shift+2)', () => heading(2)], ['H3', 'Título 3 (Ctrl+Shift+3)', () => heading(3)], '|',
      ['<b>B</b>', 'Negrito (Ctrl+B)', () => wrap('**', '**', 'texto')], ['<i>I</i>', 'Itálico (Ctrl+I)', () => wrap('*', '*', 'texto')], [IC.code, 'Código (Ctrl+E)', () => wrap('`', '`', 'código')], '|',
      [IC.list, 'Lista (Ctrl+Shift+8)', () => togglePrefix('- ', /^[-*] (?!\[)/)], [IC.olist, 'Lista numerada (Ctrl+Shift+7)', () => togglePrefix(i => (i + 1) + '. ', /^\d+\. /)], [IC.check, 'Checklist (Ctrl+Shift+9)', () => togglePrefix('- [ ] ', /^[-*] \[[ x]\] /)], '|',
      [IC.link, 'Link (Ctrl+K)', link], [IC.img, 'Imagem (convertida para base64)', () => fileIn.click()], [IC.table, 'Tabela', tabela], '|',
      ['', 'Caixa / citação (Ctrl+Shift+. cita)', null, 'callout'],
      [IC.flow, 'Fluxo Mermaid', () => block('```mermaid\n' + MERMAID + '\n```')],
    ];
    if (tipo === 'slides') B.push('|', [IC.plus + ' Slide', 'Novo slide', () => block('---\n\n# Título do slide\n\n- Tópico')], ['Capa', 'Marcar slide como capa/encerramento', () => ins('<!-- class: title -->\n')], ['Destaque', 'Marcar slide como destaque', () => ins('<!-- class: highlight -->\n')], [IC.note + ' Notas', 'Notas do apresentador', () => block('<!-- notas: texto para o apresentador -->')]);
    else B.push('|', [IC.hr, 'Separador', () => block('---')], [IC.ex + ' Exercício', 'Modelo de exercício', () => block('### Exercício N — Título\n\nEnunciado.')]);
    B.push('sp', [IC.edit, 'Somente editor', null, 'm:e'], [IC.split, 'Editor + prévia', null, 'm:s'], [IC.eye, 'Somente prévia', null, 'm:p'], [IC.full, 'Tela cheia (Esc para sair)', null, 'fs']);
    B.forEach(x => {
      if (x === '|') { const d = document.createElement('span'); d.className = 'sep'; tb.append(d); return; }
      if (x === 'sp') { const d = document.createElement('span'); d.className = 'sp'; tb.append(d); return; }
      if (x[3] === 'callout') {
        const sel = document.createElement('select'); sel.title = x[1];
        sel.innerHTML = '<option value="">Caixa / citação…</option><option value="">Citação simples</option><option value="info">Informação</option><option value="tip">Dica</option><option value="warning">Atenção</option>';
        sel.onchange = () => { const k = sel.selectedIndex; if (k > 0) { const v = sel.value; togglePrefix(v ? (i => i ? '> ' : '> [!' + v + '] ') : '> ', /^> (\[!\w+\] )?/); } sel.selectedIndex = 0; };
        tb.append(sel); return;
      }
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = x[0]; b.title = x[1];
      if (x[3] && x[3].startsWith('m:')) { b.dataset.m = x[3].slice(2); b.onclick = () => { box.dataset.m = b.dataset.m; localStorage.setItem('mde.modo', b.dataset.m); marcar(); preview(); }; }
      else if (x[3] === 'fs') b.onclick = () => { box.classList.toggle('fs'); document.body.style.overflow = box.classList.contains('fs') ? 'hidden' : ''; ta.focus(); };
      else { b.onclick = x[2]; if (x[3] === 'u' || x[3] === 'r') b.dataset.ur = x[3]; }
      tb.append(b);
    });
    function marcar() { tb.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === box.dataset.m)); }
    marcar();

    ta.addEventListener('input', e => pushReal(false, !emCmd && e && e.inputType && /^insert(Text|CompositionText)$|^delete(Content|Word)/.test(e.inputType) ? 'dig' : 'cmd'));
    ta.addEventListener('beforeinput', e => { if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') { e.preventDefault(); e.inputType === 'historyUndo' ? desfazer() : refazer(); } });
    ta.addEventListener('keydown', e => {
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey, dg = e.code.startsWith('Digit') ? e.code.slice(5) : '';
      if (mod && !e.altKey && k === 'z' && !e.shiftKey) { e.preventDefault(); desfazer(); }
      else if (mod && !e.altKey && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); refazer(); }
      else if (mod && e.shiftKey && !e.altKey && ['1', '2', '3'].includes(dg)) { e.preventDefault(); heading(+dg); }
      else if (mod && e.shiftKey && !e.altKey && dg === '7') { e.preventDefault(); togglePrefix(i => (i + 1) + '. ', /^\d+\. /); }
      else if (mod && e.shiftKey && !e.altKey && dg === '8') { e.preventDefault(); togglePrefix('- ', /^[-*] (?!\[)/); }
      else if (mod && e.shiftKey && !e.altKey && dg === '9') { e.preventDefault(); togglePrefix('- [ ] ', /^[-*] \[[ x]\] /); }
      else if (mod && e.shiftKey && !e.altKey && e.code === 'Period') { e.preventDefault(); togglePrefix('> ', /^> (\[!\w+\] )?/); }
      else if (mod && !e.shiftKey && !e.altKey && k === 'e') { e.preventDefault(); wrap('`', '`', 'código'); }
      else if (mod && !e.shiftKey && !e.altKey && k === 'l') { e.preventDefault(); const [a, b] = lineRange(); ta.setSelectionRange(a, b); }
      else if (e.altKey && !mod && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moverLinha(e.key === 'ArrowUp' ? -1 : 1); }
      else if (mod && e.shiftKey && !e.altKey && k === 'd') { e.preventDefault(); duplicarLinha(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'b') { e.preventDefault(); wrap('**', '**', 'texto'); }
      else if ((e.ctrlKey || e.metaKey) && k === 'i') { e.preventDefault(); wrap('*', '*', 'texto'); }
      else if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); link(); }
      else if (e.key === 'Escape' && box.classList.contains('fs')) { box.classList.remove('fs'); document.body.style.overflow = ''; }
      else if (e.key === 'Tab') {
        e.preventDefault();
        if (ta.selectionStart !== ta.selectionEnd || LI.test(ta.value.slice(...lineRange()))) prefix(l => e.shiftKey ? l.replace(/^ {1,2}/, '') : '  ' + l);
        else ins('  ');
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        const v = ta.value, s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1, line = v.slice(s, ta.selectionStart);
        const m = line.match(/^(\s*)([-*] \[[ x]\] |[-*] |(\d+)\. |> )(.*)$/);
        if (!m) return;
        e.preventDefault();
        if (!m[4].trim()) { const cur = ta.selectionStart; ta.focus(); ta.setSelectionRange(s, cur); emCmd = true; hTipo = ''; const okd = document.execCommand('delete'); emCmd = false; if (!okd) ta.setRangeText('', s, cur, 'end'); ta.setSelectionRange(s, s); pushReal(); return; }
        const nx = m[3] ? (parseInt(m[3]) + 1) + '. ' : m[2].replace('[x]', '[ ]');
        ins('\n' + m[1] + nx);
      }
    });
    ta.addEventListener('paste', async e => {
      const cd = e.clipboardData; if (!cd) return;
      let files = [...(cd.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(ehImagem);
      if (!files.length) files = [...(cd.files || [])].filter(ehImagem);
      if (!files.length) {  // imagem copiada de página web (HTML com <img src="data:...">)
        const h = cd.getData('text/html'), m = h && h.match(/<img[^>]+src="(data:image\/[^"]+)"/i);
        if (m) { e.preventDefault(); ins('![imagem colada](img:' + addImg(m[1]) + ')'); galeria(); }
        return;
      }
      e.preventDefault(); const n = await inserirImagens(files, true); if (n && opt.onInfo) opt.onInfo(n + ' imagem(ns) colada(s) no texto.');
    });
    let dragN = 0;
    const temArquivos = e => [...((e.dataTransfer || {}).types || [])].includes('Files');
    box.addEventListener('dragenter', e => { if (!temArquivos(e)) return; e.preventDefault(); dragN++; box.classList.add('drag'); });
    box.addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; box.classList.remove('drag'); } });
    box.addEventListener('dragover', e => { if (temArquivos(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    box.addEventListener('drop', async e => {
      dragN = 0; box.classList.remove('drag');
      const files = [...((e.dataTransfer || {}).files || [])]; if (!files.length) return;
      e.preventDefault(); e.stopPropagation();
      if (files.some(f => !ehImagem(f)) && opt.onFiles) { opt.onFiles(files); return; }
      if (e.target === ta && document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(e.clientX, e.clientY); if (c && c.offsetNode === ta) ta.setSelectionRange(c.offset, c.offset); }
      const n = await inserirImagens(files); if (n && opt.onInfo) opt.onInfo(n + ' imagem(ns) inserida(s) no texto.');
    });
    gal.querySelector('.gb').onclick = e => { e.preventDefault(); fileIn.click(); };
    fileIn.onchange = async () => { const n = await inserirImagens([...fileIn.files], true); if (n && opt.onInfo) opt.onInfo(n + ' imagem(ns) inserida(s) no texto.'); fileIn.value = ''; };
    let sync = false;
    ta.addEventListener('scroll', () => { if (box.dataset.m !== 's' || sync) return; sync = true; pv.scrollTop = (ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight)) * (pv.scrollHeight - pv.clientHeight); requestAnimationFrame(() => sync = false); });
    pv.addEventListener('scroll', () => { if (box.dataset.m !== 's' || sync) return; sync = true; ta.scrollTop = (pv.scrollTop / Math.max(1, pv.scrollHeight - pv.clientHeight)) * (ta.scrollHeight - ta.clientHeight); requestAnimationFrame(() => sync = false); });

    pull(); snap('ini'); preview(); status(); atualizaUR();
    setInterval(pull, 600);
    return { refresh: pull, textarea: ta, element: box, render: () => preview(), desfazer, refazer, inserirImagens, ehImagem };
  }

  const ATALHOS = [
    ['Ctrl + Z', 'Desfazer'], ['Ctrl + Y  ou  Ctrl + Shift + Z', 'Refazer'],
    ['Ctrl + B', 'Negrito'], ['Ctrl + I', 'Itálico'], ['Ctrl + E', 'Código em linha'], ['Ctrl + K', 'Inserir link'],
    ['Ctrl + Shift + 1 / 2 / 3', 'Título 1 / 2 / 3'], ['Ctrl + Shift + 7', 'Lista numerada'], ['Ctrl + Shift + 8', 'Lista com marcadores'], ['Ctrl + Shift + 9', 'Checklist'],
    ['Ctrl + Shift + .', 'Citação'], ['Ctrl + L', 'Selecionar a linha'], ['Ctrl + Shift + D', 'Duplicar linha'], ['Alt + ↑ / ↓', 'Mover linha para cima / baixo'],
    ['Tab / Shift + Tab', 'Aumentar / diminuir recuo (listas)'], ['Enter', 'Continuar lista ou checklist (Enter em item vazio encerra)'],
    ['Ctrl + V', 'Colar texto ou imagem (imagem vira base64)'], ['Esc', 'Sair da tela cheia']
  ];
  global.MDEditor = { create, render, renderSlides, ATALHOS, ehImagem, lerImagem };
})(window);
