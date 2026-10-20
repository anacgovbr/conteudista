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
.mde-tip{font-size:12px;color:#5a6676;padding:2px 10px 6px}
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
    body.append(ta, pv); box.append(tb, body, st);
    real.hidden = true; real.after(box);
    const fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.multiple = true; fileIn.hidden = true; box.append(fileIn);

    /* ---- sincronização com o textarea real ---- */
    let lastReal = null, tPv = null;
    function pushReal() { const v = expand(ta.value); if (v !== real.value) { real.value = v; lastReal = v; real.dispatchEvent(new Event('input', { bubbles: true })); } schedulePv(); status(); }
    function pull() { if (real.value === lastReal) return; lastReal = real.value; const c = collapse(real.value); if (c !== ta.value) ta.value = c; schedulePv(); status(); }
    function schedulePv() { clearTimeout(tPv); tPv = setTimeout(preview, 250); }
    function preview() {
      if (box.dataset.m === 'e') return;
      const md = real.value; pv.innerHTML = tipo === 'slides' ? renderSlides(md) : render(md); drawMermaid(pv);
    }
    function status() {
      const v = ta.value, words = (v.replace(/\(img:\d+\)/g, '').match(/[\wÀ-ÿ]+/g) || []).length;
      const ni = (real.value.match(/!\[[^\]]*\]\(/g) || []).length;
      const extra = tipo === 'slides' ? ' · Slides: ' + (real.value.replace(/^---\n[\s\S]*?\n---\n/, '').split(/\n---\s*\n/).filter(p => p.trim()).length)
        : ' · Seções: ' + (v.match(/^## /gm) || []).length;
      st.innerHTML = '<span>Palavras: ' + words.toLocaleString('pt-BR') + '</span><span>Linhas: ' + v.split('\n').length + '</span><span>Imagens: ' + ni + '</span><span>' + extra.slice(3) + '</span><span style="flex:1"></span><span>' + (real.value.length / 1024).toFixed(1) + ' KB</span>';
    }

    /* ---- edição preservando o desfazer (Ctrl+Z) ---- */
    function ins(text, selFrom, selTo) {
      ta.focus();
      const s = ta.selectionStart;
      if (!document.execCommand('insertText', false, text)) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); }
      if (selFrom !== undefined) ta.setSelectionRange(s + selFrom, s + (selTo !== undefined ? selTo : selFrom));
      pushReal();
    }
    function wrap(a, b, ph) {
      const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
      if (sel && ta.value.slice(s - a.length, s) === a && ta.value.slice(e, e + b.length) === b) { ta.setSelectionRange(s - a.length, e + b.length); ins(sel, 0, sel.length); return; }
      const t = sel || ph; ins(a + t + b, a.length, a.length + t.length);
    }
    function lineRange() { const v = ta.value; let s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1, e = v.indexOf('\n', ta.selectionEnd); if (e < 0) e = v.length; if (ta.selectionEnd > ta.selectionStart && v[ta.selectionEnd - 1] === '\n') e = ta.selectionEnd - 1; return [s, e]; }
    function prefix(fn) {
      const [s, e] = lineRange(), lines = ta.value.slice(s, e).split('\n');
      ta.setSelectionRange(s, e); const out = lines.map(fn).join('\n'); ins(out, 0, out.length);
    }
    function togglePrefix(p, re) { const all = ta.value.slice(...lineRange()).split('\n').every(l => re.test(l)); prefix((l, i) => all ? l.replace(re, '') : (typeof p === 'function' ? p(i) : p) + l.replace(/^(#{1,6} |[-*] \[[ x]\] |[-*] |\d+\. |> )/, '')); }
    function heading(n) { togglePrefix('#'.repeat(n) + ' ', new RegExp('^#{' + n + '} ')); }
    function block(text) {
      const v = ta.value, s = ta.selectionStart, before = v.slice(0, s);
      const pre = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const post = v.slice(ta.selectionEnd).startsWith('\n') ? '\n' : '\n\n';
      ins(pre + text + post, pre.length, pre.length + text.length);
    }
    async function link() {
      const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || 'texto do link';
      const url = prompt('Endereço (URL) do link:', 'https://'); if (!url) return;
      ins('[' + sel + '](' + url.trim().replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29') + ')', 1, 1 + sel.length);
    }
    async function imagensDeArquivos(files) {
      const out = [];
      for (const f of files) if (f.type.startsWith('image/')) {
        const d = await new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = err; r.readAsDataURL(f); });
        out.push('![' + f.name.replace(/\.[^.]+$/, '') + '](img:' + addImg(d) + ')');
      }
      return out;
    }
    function tabela() {
      const c = Math.max(1, Math.min(8, parseInt(prompt('Número de colunas:', '3')) || 3)), r = Math.max(1, Math.min(30, parseInt(prompt('Número de linhas (sem o cabeçalho):', '3')) || 3));
      const row = x => '| ' + Array.from({ length: c }, (_, i) => x(i)).join(' | ') + ' |';
      block([row(i => 'Coluna ' + (i + 1)), row(() => '---'), ...Array.from({ length: r }, () => row(() => ' '))].join('\n'));
    }
    const MERMAID = 'flowchart LR\n    T00((Início)) --> T01[01. Fazer tarefa<br/>Unidade]\n    T01 --> D01{Pergunta?}\n    D01 -->|Sim| T02[02. Próxima tarefa]\n    D01 -->|Não| T99(((Fim)))\n    T02 --> T99';

    /* ---- barra de ferramentas ---- */
    const B = [
      ['H1', 'Título 1', () => heading(1)], ['H2', 'Título 2 (seção)', () => heading(2)], ['H3', 'Título 3', () => heading(3)], '|',
      ['<b>B</b>', 'Negrito (Ctrl+B)', () => wrap('**', '**', 'texto')], ['<i>I</i>', 'Itálico (Ctrl+I)', () => wrap('*', '*', 'texto')], [IC.code, 'Código', () => wrap('`', '`', 'código')], '|',
      [IC.list, 'Lista', () => togglePrefix('- ', /^[-*] (?!\[)/)], [IC.olist, 'Lista numerada', () => togglePrefix(i => (i + 1) + '. ', /^\d+\. /)], [IC.check, 'Checklist', () => togglePrefix('- [ ] ', /^[-*] \[[ x]\] /)], '|',
      [IC.link, 'Link (Ctrl+K)', link], [IC.img, 'Imagem (convertida para base64)', () => fileIn.click()], [IC.table, 'Tabela', tabela], '|',
      ['❝', 'Citação / caixa', null, 'callout'],
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
      else b.onclick = x[2];
      tb.append(b);
    });
    function marcar() { tb.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === box.dataset.m)); }
    marcar();

    /* ---- eventos ---- */
    ta.addEventListener('input', pushReal);
    ta.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'b') { e.preventDefault(); wrap('**', '**', 'texto'); }
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
        if (!m[4].trim()) { const cur = ta.selectionStart; ta.focus(); ta.setSelectionRange(s, cur); if (!document.execCommand('delete')) ta.setRangeText('', s, cur, 'end'); ta.setSelectionRange(s, s); pushReal(); return; }
        const nx = m[3] ? (parseInt(m[3]) + 1) + '. ' : m[2].replace('[x]', '[ ]');
        ins('\n' + m[1] + nx);
      }
    });
    ta.addEventListener('paste', async e => {
      const files = [...((e.clipboardData || {}).files || [])].filter(f => f.type.startsWith('image/'));
      if (!files.length) return;
      e.preventDefault(); const t = await imagensDeArquivos(files); ins(t.join('\n'));
    });
    ta.addEventListener('dragover', e => e.preventDefault());
    ta.addEventListener('drop', async e => {
      const files = [...e.dataTransfer.files]; if (!files.length) return;
      e.preventDefault();
      const md = files.filter(f => !f.type.startsWith('image/'));
      if (md.length && opt.onFiles) { opt.onFiles(files); return; }
      const t = await imagensDeArquivos(files); if (t.length) ins(t.join('\n'));
    });
    fileIn.onchange = async () => { const t = await imagensDeArquivos([...fileIn.files]); if (t.length) block(t.join('\n\n')); fileIn.value = ''; };
    let sync = false;
    ta.addEventListener('scroll', () => { if (box.dataset.m !== 's' || sync) return; sync = true; pv.scrollTop = (ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight)) * (pv.scrollHeight - pv.clientHeight); requestAnimationFrame(() => sync = false); });
    pv.addEventListener('scroll', () => { if (box.dataset.m !== 's' || sync) return; sync = true; ta.scrollTop = (pv.scrollTop / Math.max(1, pv.scrollHeight - pv.clientHeight)) * (ta.scrollHeight - ta.clientHeight); requestAnimationFrame(() => sync = false); });

    pull(); preview(); status();
    setInterval(pull, 600);  // capta alterações feitas por código no textarea real
    return { refresh: pull, textarea: ta, element: box, render: () => preview() };
  }

  global.MDEditor = { create, render, renderSlides };
})(window);
