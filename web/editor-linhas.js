/* =====================================================================================
   Conteudista — régua de linhas do editor
   - Números de linha alinhados ao texto, com a rolagem sincronizada
   - Destaque discreto da linha em que o cursor está
   - Marcadores de títulos e de blocos de código na régua
   - Recolhimento de H1–H3 e de blocos de código/Mermaid
   O recolhimento não altera o Markdown guardado: enquanto houver blocos fechados, o
   texto aparece numa visão compacta somente para leitura (os números e o conteúdo
   recolhido realmente sobem). Clicar em qualquer linha volta a editar no ponto clicado.
   ===================================================================================== */
(function (global) {
  'use strict';

  const CSS = `
.mde-body{position:relative}
.mde-ln{flex:0 0 46px;width:46px;align-self:stretch;overflow:hidden;position:relative;background:#f7f7f7;border-right:1px solid #e4e4e4;color:#5c5c5c;font-family:Consolas,"Cascadia Mono",monospace;font-size:11.5px;-webkit-user-select:none;user-select:none}
.mde-ln-in{position:absolute;left:0;right:0;top:0;padding-top:12px;will-change:transform}
.mde-ln-l{position:relative;overflow:hidden}
.mde-ln-n{position:absolute;right:8px;top:0;line-height:var(--mde-lh,20px);color:#636363;font-variant-numeric:tabular-nums;text-align:right}
.mde-ln-l.at{background:rgba(19,81,180,.07)}
.mde-ln-l.at .mde-ln-n,.mde-ln-l.fch .mde-ln-n{color:#0c326f;font-weight:700}
.mde-ln-mk{position:absolute;left:0;top:0;width:18px;height:var(--mde-lh,20px);display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:3px;background:transparent;color:#1351b4;font:700 10px/1 "Segoe UI",Arial,sans-serif;cursor:pointer}
.mde-ln-mk:hover{background:#dbe8fb}
.mde-ln-mk:focus-visible{outline:2px solid #1351b4;outline-offset:-2px}
.mde-ln-mk.est{cursor:default;pointer-events:none}
.mde-ln-mk .pt{width:5px;height:5px;border-radius:50%;background:currentColor}
.mde-ln-mk.h1 .pt{width:7px;height:7px}
.mde-ln-mk.h3 .pt{width:4px;height:4px;background:#5c5c5c}
.mde-ln-mk.cd{color:#5c5c5c;font-size:9px}
.mde-ln-mk.cd .pt{width:3px;height:9px;border-radius:1px}
.mde-ln-camada{position:absolute;overflow:hidden;pointer-events:none;z-index:3}
.mde-ln-rol{position:absolute;left:0;right:0;top:0;will-change:transform}
.mde-ln-cur{position:absolute;left:0;right:0;background:rgba(19,81,180,.06);border-left:2px solid #1351b4;pointer-events:none}
.mde-ln-visao{position:absolute;z-index:4;overflow-y:auto;overflow-x:hidden;background:#fff;padding:12px;box-sizing:border-box;outline:none;color:#333333}
.mde-ln-visao:focus{outline:none!important}
.mde-ln-visao:focus-visible{box-shadow:inset 3px 0 0 #1351b4}
.mde-ln-vcorpo{white-space:pre-wrap;overflow-wrap:break-word;word-break:normal}
.mde-ln-vl{white-space:pre-wrap;overflow-wrap:break-word;cursor:text}
.mde-ln-vl:hover{background:#f4f7fc}
.mde-ln-veu{display:flex;align-items:center;gap:6px;width:100%;height:24px;padding:0 8px;margin:0;border:0;border-top:1px dashed #b8c6e0;border-bottom:1px dashed #b8c6e0;background:#f4f7fc;color:#0c326f;font:600 11.5px "Segoe UI",Arial,sans-serif;text-align:left;cursor:pointer;overflow:hidden;white-space:nowrap}
.mde-ln-veu:hover{background:#dbe8fb}
.mde-ln-veu:focus-visible{outline:2px solid #1351b4;outline-offset:-2px}
.mde-ln-veu .mde-ln-veu-i{font-size:14px;line-height:1}
.mde-ln-veu .mde-ln-veu-t{overflow:hidden;text-overflow:ellipsis}
.mde-ln-esp{position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;box-sizing:border-box}
.mde-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.mde[data-m="p"] .mde-ln,.mde[data-m="p"] .mde-ln-camada,.mde[data-m="p"] .mde-ln-visao{display:none}
html.contraste .mde-ln{background:#000;color:#fff;border-right-color:#fff}
html.contraste .mde-ln-n{color:#fff}
html.contraste .mde-ln-l.at{background:rgba(255,255,0,.16)}
html.contraste .mde-ln-l.at .mde-ln-n,html.contraste .mde-ln-l.fch .mde-ln-n{color:#ff0}
html.contraste .mde-ln-mk{color:#ff0}
html.contraste .mde-ln-mk:hover{background:#333333;color:#ff0}
html.contraste .mde-ln-mk.h3 .pt,html.contraste .mde-ln-mk.cd{color:#fff}
html.contraste .mde-ln-cur{background:rgba(255,255,0,.14);border-left-color:#ff0}
html.contraste .mde-ln-visao{background:#000;color:#fff}
html.contraste .mde-ln-visao:focus-visible{box-shadow:inset 3px 0 0 #ff0}
html.contraste .mde-ln-vl:hover{background:#222222}
html.contraste .mde-ln-veu{background:#000;color:#ff0;border-color:#ff0}
html.contraste .mde-ln-veu:hover{background:#333333}
@media(max-width:900px){.mde-ln{flex-basis:40px;width:40px}.mde-ln-n{right:6px}}
@media(max-width:520px){.mde-ln{flex-basis:33px;width:33px;font-size:10.5px}.mde-ln-n{right:4px}.mde-ln-mk{width:15px}}
@media(prefers-reduced-motion:reduce){.mde-ln-in,.mde-ln-rol{will-change:auto}}`;

  function injectCSS() {
    if (document.getElementById('mde-ln-css')) return;
    const s = document.createElement('style');
    s.id = 'mde-ln-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;
  const TITULO = /^(#{1,3})\s+\S/;
  const QUALQUER_TITULO = /^(#{1,6})\s+\S/;
  const ALTURA_VEU = 24;

  function criar(cfg) {
    const ta = cfg.textarea, corpo = cfg.corpo;
    if (!ta || !corpo || !ta.parentNode) return null;
    injectCSS();

    const op = {
      numeros: cfg.numeros !== false,
      atual: cfg.atual !== false,
      marcadores: cfg.marcadores !== false,
      recolher: cfg.recolher !== false
    };

    const gutter = document.createElement('div');
    gutter.className = 'mde-ln';
    gutter.setAttribute('aria-hidden', 'true');
    const dentro = document.createElement('div');
    dentro.className = 'mde-ln-in';
    gutter.appendChild(dentro);
    ta.parentNode.insertBefore(gutter, ta);

    const camada = document.createElement('div');
    camada.className = 'mde-ln-camada';
    const rol = document.createElement('div');
    rol.className = 'mde-ln-rol';
    camada.appendChild(rol);
    corpo.appendChild(camada);

    const visao = document.createElement('div');
    visao.className = 'mde-ln-visao';
    visao.tabIndex = 0;
    visao.hidden = true;
    visao.setAttribute('role', 'region');
    visao.setAttribute('aria-label', 'Texto com blocos recolhidos. Clique em uma linha para voltar a editar.');
    const vcorpo = document.createElement('div');
    vcorpo.className = 'mde-ln-vcorpo';
    visao.appendChild(vcorpo);
    corpo.appendChild(visao);

    const viva = document.createElement('div');
    viva.className = 'mde-sr';
    viva.setAttribute('role', 'status');
    viva.setAttribute('aria-live', 'polite');
    corpo.appendChild(viva);

    const espelho = document.createElement('div');
    espelho.className = 'mde-ln-esp';
    espelho.setAttribute('aria-hidden', 'true');
    corpo.appendChild(espelho);

    let linhas = [], alturas = [], inicios = [], blocos = [];
    let porInicio = new Map(), fechados = new Set();
    let assinatura = '', LINHA = 20, raf = 0, tMedir = 0;
    let linhaAtual = -1, caretSalvo = null;

    /* ---------------------------- Estrutura do Markdown ---------------------------- */
    // Títulos H1–H3 e blocos de código/Mermaid. O bloco vai até o próximo título de
    // nível igual ou superior (ou o fechamento da cerca), sem engolir linhas vazias finais.
    function analisar(ls) {
      const n = ls.length, emCodigo = new Array(n).fill(false), saida = [];
      let cerca = null;
      for (let i = 0; i < n; i++) {
        const l = ls[i];
        if (cerca) {
          emCodigo[i] = true;
          const re = cerca.c === '`' ? /^\s*`{3,}\s*$/ : /^\s*~{3,}\s*$/;
          if (re.test(l)) { saida.push({ i: cerca.i, fim: i + 1, tipo: 'code', nivel: 0 }); cerca = null; }
          continue;
        }
        const m = FENCE.exec(l);
        if (m) { emCodigo[i] = true; cerca = { i, c: m[1][0] }; }
      }
      if (cerca) saida.push({ i: cerca.i, fim: n, tipo: 'code', nivel: 0 });
      for (let i = 0; i < n; i++) {
        if (emCodigo[i]) continue;
        const h = TITULO.exec(ls[i]);
        if (!h) continue;
        const nivel = h[1].length;
        let fim = n;
        for (let j = i + 1; j < n; j++) {
          if (emCodigo[j]) continue;
          const o = QUALQUER_TITULO.exec(ls[j]);
          if (o && o[1].length <= nivel) { fim = j; break; }
        }
        while (fim - 1 > i && !ls[fim - 1].trim()) fim--;
        if (fim - i > 1) saida.push({ i, fim, tipo: 'head', nivel });
      }
      return saida.sort((a, b) => a.i - b.i || a.fim - b.fim);
    }

    function marcaDe(i, b, fch) {
      if (b && op.recolher) {
        const rot = b.tipo === 'code' ? 'bloco de código' : 'bloco do título';
        const dica = (fch ? 'Expandir' : 'Recolher') + ' o ' + rot + ' (Ctrl+Shift+[)';
        return '<button type="button" class="mde-ln-mk ' + (b.tipo === 'code' ? 'cd' : 'h' + b.nivel) +
          '" tabindex="-1" data-f="' + i + '" title="' + dica + '" aria-label="' + dica + '">' + (fch ? '\u25B8' : '\u25BE') + '</button>';
      }
      if (!op.marcadores) return '';
      const h = TITULO.exec(linhas[i] || '');
      if (h) return '<span class="mde-ln-mk est h' + h[1].length + '"><span class="pt"></span></span>';
      if (b && b.tipo === 'code') return '<span class="mde-ln-mk est cd"><span class="pt"></span></span>';
      return '';
    }

    /* ---------------------------- Desenho ---------------------------- */
    function desenhar() {
      const n = linhas.length;
      const oculto = new Array(n).fill(false);
      const visiveis = [];
      blocos.forEach(b => {
        if (!fechados.has(b.i) || oculto[b.i]) return;
        for (let k = b.i + 1; k < b.fim; k++) oculto[k] = true;
        visiveis.push(b);
      });
      const fechaEm = new Map(visiveis.map(b => [b.fim, b]));

      inicios = new Array(n).fill(null);
      let y = 0, html = '', vhtml = '';
      for (let i = 0; i <= n; i++) {
        const v = fechaEm.get(i);
        if (v) {
          const q = v.fim - v.i - 1;
          vhtml += '<button type="button" class="mde-ln-veu" data-e="' + v.i + '" style="height:' + ALTURA_VEU +
            'px" title="Expandir as linhas recolhidas" aria-label="Expandir ' + q +
            (q === 1 ? ' linha recolhida' : ' linhas recolhidas') + '"><span class="mde-ln-veu-i" aria-hidden="true">\u22EF</span>' +
            '<span class="mde-ln-veu-t">' + q + (q === 1 ? ' linha recolhida' : ' linhas recolhidas') + '</span></button>';
          y += ALTURA_VEU;
        }
        if (i === n) break;
        if (oculto[i]) continue;
        inicios[i] = y;
        const h = Math.max(1, alturas[i] || LINHA);
        const b = porInicio.get(i);
        const fch = !!(b && fechados.has(b.i));
        html += '<div class="mde-ln-l' + (fch ? ' fch' : '') + '" data-l="' + i + '" style="height:' + h + 'px">' +
          (op.numeros ? '<span class="mde-ln-n">' + (i + 1) + '</span>' : '') + marcaDe(i, b, fch) + '</div>';
        vhtml += '<div class="mde-ln-vl" data-l="' + i + '" style="height:' + h + 'px" title="Voltar a editar nesta linha">' +
          (linhas[i] === '' ? '\u200b' : escapar(linhas[i])) + '</div>';
        y += h;
      }
      gutter.classList.toggle('sem-n', !op.numeros);
      dentro.innerHTML = html;
      rol.innerHTML = '<div class="mde-ln-cur" style="display:none"></div>';

      const temFechado = visiveis.length > 0;
      if (temFechado) {
        vcorpo.innerHTML = vhtml;
        if (visao.hidden) { visao.scrollTop = ta.scrollTop; visao.hidden = false; ta.style.visibility = 'hidden'; }
      } else {
        vcorpo.innerHTML = '';
        if (!visao.hidden) { ta.style.visibility = ''; visao.hidden = true; }
        if (caretSalvo) { ta.setSelectionRange(caretSalvo.s, caretSalvo.e); ta.scrollTop = caretSalvo.top; caretSalvo = null; }
      }

      linhaAtual = -1;
      atualizarLinhaAtual();
      geometria();
      pintarScroll();
    }

    function escapar(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function geometria() {
      const w = ta.clientWidth, h = ta.clientHeight;
      if (!w || !h) { camada.style.display = 'none'; visao.style.display = 'none'; return; }
      camada.style.display = '';
      camada.style.left = ta.offsetLeft + 'px';
      camada.style.top = ta.offsetTop + 'px';
      camada.style.width = w + 'px';
      camada.style.height = h + 'px';
      visao.style.left = ta.offsetLeft + 'px';
      visao.style.top = ta.offsetTop + 'px';
      visao.style.width = ta.offsetWidth + 'px';
      visao.style.height = ta.offsetHeight + 'px';
      vcorpo.style.width = Math.max(0, w - 24) + 'px';
      const cs = getComputedStyle(ta);
      ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'tabSize']
        .forEach(k => { visao.style[k] = cs[k]; });
      visao.style.display = '';
    }

    function pintarScroll() {
      const s = visao.hidden ? ta : visao;
      const t = 'translate3d(0,' + (-(s.scrollTop || 0)) + 'px,0)';
      dentro.style.transform = t;
      rol.style.transform = t;
    }

    /* ---------------------------- Medição ---------------------------- */
    function medir() {
      clearTimeout(tMedir);
      if (!ta.isConnected) return;
      const largura = ta.clientWidth;
      if (!largura) return;                       // editor escondido: mede quando aparecer
      const v = ta.value, ls = v.split('\n'), cs = getComputedStyle(ta);
      LINHA = parseFloat(cs.lineHeight) || 20;
      const assin = ls.length + ':' + v.length + ':' + largura + ':' + cs.lineHeight + ':' + cs.fontSize;
      if (assin !== assinatura) {
        assinatura = assin;
        espelho.style.width = largura + 'px';
        ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
          'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'tabSize', 'wordSpacing']
          .forEach(k => { espelho.style[k] = cs[k]; });
        espelho.textContent = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < ls.length; i++) {
          const d = document.createElement('div');
          d.textContent = ls[i] === '' ? '\u200b' : ls[i];
          frag.appendChild(d);
        }
        espelho.appendChild(frag);
        alturas = [];
        for (let i = 0; i < espelho.children.length; i++) alturas.push(espelho.children[i].offsetHeight);
        espelho.textContent = '';
      }
      linhas = ls;
      blocos = (op.recolher || op.marcadores) ? analisar(ls) : [];
      porInicio = new Map(blocos.map(b => [b.i, b]));
      [...fechados].forEach(i => { if (!porInicio.has(i)) fechados.delete(i); });
      gutter.style.setProperty('--mde-lh', LINHA + 'px');
      camada.style.setProperty('--mde-lh', LINHA + 'px');
      desenhar();
    }

    function agendar(ms) { clearTimeout(tMedir); tMedir = setTimeout(medir, ms === undefined ? 160 : ms); }

    /* ---------------------------- Linha atual ---------------------------- */
    function linhaDoCursor() {
      const v = ta.value, p = ta.selectionStart;
      let n = 0;
      for (let i = 0; i < p; i++) if (v.charCodeAt(i) === 10) n++;
      return n;
    }

    function atualizarLinhaAtual() {
      const cur = rol.querySelector('.mde-ln-cur');
      if (!visao.hidden) {
        const ant = dentro.querySelector('.mde-ln-l.at');
        if (ant) ant.classList.remove('at');
        linhaAtual = -1;
        if (cur) cur.style.display = 'none';
        return;
      }
      const li = linhaDoCursor();
      // O cursor nunca fica escondido: se a linha estiver dentro de um bloco fechado, reabre.
      const escondido = blocos.find(b => fechados.has(b.i) && li > b.i && li < b.fim);
      if (escondido) { fechados.delete(escondido.i); desenhar(); anunciar('Bloco reaberto para edição.'); return; }

      if (li !== linhaAtual) {
        const ant = dentro.querySelector('.mde-ln-l.at');
        if (ant) ant.classList.remove('at');
        const el = dentro.querySelector('.mde-ln-l[data-l="' + li + '"]');
        if (el) el.classList.add('at');
        linhaAtual = li;
      }
      if (!cur) return;
      const y = inicios[li], h = alturas[li];
      if (!op.atual || y == null || h == null) { cur.style.display = 'none'; return; }
      cur.style.display = '';
      cur.style.top = y + 'px';
      cur.style.height = Math.max(1, h) + 'px';
    }

    function anunciar(msg) {
      viva.textContent = '';
      setTimeout(() => { viva.textContent = msg; }, 30);
    }

    /* ---------------------------- Recolhimento ---------------------------- */
    function posInicioLinha(i) {
      const v = ta.value;
      let p = 0;
      for (let k = 0; k < i; k++) { const j = v.indexOf('\n', p); if (j < 0) return v.length; p = j + 1; }
      return p;
    }

    function alternar(i, focarEditor, focarVisao) {
      if (!op.recolher) return false;
      const b = porInicio.get(i);
      if (!b) return false;
      const fechando = !fechados.has(i);
      if (fechando) {
        if (!caretSalvo) caretSalvo = { s: ta.selectionStart, e: ta.selectionEnd, top: ta.scrollTop };
        fechados.add(i);
        const q = b.fim - i - 1;
        anunciar(q + (q === 1 ? ' linha recolhida.' : ' linhas recolhidas.') + ' O texto está na visão compacta; clique em uma linha para editar.');
      } else {
        fechados.delete(i);
        anunciar('Bloco expandido.');
      }
      desenhar();
      if (!visao.hidden) { if (focarVisao) visao.focus({ preventScroll: true }); }
      else if (focarEditor !== false) { ta.focus({ preventScroll: true }); }
      return true;
    }

    function recolherAtual() {
      if (!op.recolher) return;
      const li = linhaDoCursor();
      const cand = blocos.filter(b => b.i <= li && li < b.fim).sort((a, b) => b.i - a.i)[0];
      if (!cand) { anunciar('Nenhum bloco recolhível nesta linha.'); return; }
      alternar(cand.i, true, true);
    }

    function expandirTudo() {
      if (!fechados.size) return;
      fechados.clear();
      desenhar();
      ta.focus({ preventScroll: true });
      anunciar('Todos os blocos expandidos. De volta ao editor.');
    }

    function irParaLinha(i) {
      fechados.clear();
      desenhar();
      ta.focus({ preventScroll: true });
      const p = posInicioLinha(i);
      ta.setSelectionRange(p, p);
      if (inicios[i] != null) ta.scrollTop = Math.max(0, inicios[i] - LINHA * 2);
      pintarScroll();
      atualizarLinhaAtual();
    }

    /* ---------------------------- Eventos ---------------------------- */
    function aoRolar() {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; pintarScroll(); });
    }
    ta.addEventListener('scroll', () => { if (visao.hidden) aoRolar(); }, { passive: true });
    visao.addEventListener('scroll', aoRolar, { passive: true });
    ta.addEventListener('input', () => { atualizarLinhaAtual(); agendar(); });
    ta.addEventListener('click', atualizarLinhaAtual);
    ta.addEventListener('keyup', atualizarLinhaAtual);
    ta.addEventListener('focus', atualizarLinhaAtual);
    const aoSelecao = () => { if (document.activeElement === ta && visao.hidden) atualizarLinhaAtual(); };
    document.addEventListener('selectionchange', aoSelecao);

    dentro.addEventListener('mousedown', e => { if (e.target.closest('[data-f]')) e.preventDefault(); });
    dentro.addEventListener('click', e => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      e.preventDefault();
      alternar(+b.dataset.f, true, false);
    });
    visao.addEventListener('click', e => {
      const v = e.target.closest('[data-e]');
      if (v) { e.preventDefault(); alternar(+v.dataset.e, true, false); return; }
      const l = e.target.closest('[data-l]');
      if (l) irParaLinha(+l.dataset.l);
    });
    visao.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); expandirTudo(); }
    });

    let ro = null;
    if (global.ResizeObserver) {
      ro = new ResizeObserver(() => agendar(120));
      ro.observe(ta); ro.observe(corpo);
    }
    global.addEventListener('resize', () => agendar(120));

    function destruir() {
      if (ro) ro.disconnect();
      document.removeEventListener('selectionchange', aoSelecao);
      gutter.remove(); camada.remove(); visao.remove(); viva.remove(); espelho.remove();
    }

    medir();
    setTimeout(medir, 250);

    return { atualizar: () => { atualizarLinhaAtual(); agendar(200); }, medir, alternar, recolherAtual, expandirTudo, destruir, elemento: gutter };
  }

  global.EditorLinhas = { criar };
})(window);