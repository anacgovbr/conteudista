/* =====================================================================================
   Conteudista — Acessibilidade do texto: painel do verificador (1.80)
   - Botão "Acessibilidade" na barra de cada editor (Apostila e Apresentação), com o número de
     itens para corrigir. Abre o painel em dois níveis: "Para corrigir" e "Sugestões".
   - A análise usa a biblioteca Linguagem Acessível (web/lib/linguagem-acessivel) em segundo plano
     (Web Worker) e só roda 1 s depois que a pessoa para de digitar. Sem Worker, roda na página.
   - Correção em um clique: aplica as edições da biblioteca no editor (entra no Ctrl+Z como um passo).
     Correções que precisam de uma pessoa selecionam o trecho e dizem o que escrever.
   - Sugestões podem ser ignoradas: grava <!-- linguagem-acessivel: ignorar CÓDIGO --> no texto.
   - Aviso discreto perto de "Gerar arquivos" quando há itens para corrigir. Nunca bloqueia a geração.
   - No celular (até 900 px), o painel abre como folha inferior modal.
   - Atalhos (registrados em ajuda.js): Alt+Shift+C abre e fecha o painel; Alt+Shift+N vai ao próximo item.
   - Opções em web/config/opcoes.yaml, seção acessibilidade_texto.
   API: window.AcessibilidadeTexto = { alternar, abrir, fechar, proximo, resultado, analisarAgora }
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const op = (c, padrao) => (window.Opcoes ? Opcoes.ligado(c) : padrao);
  const CH_LIMITE = 'conteudista.acessibilidade.limite';
  const MOSTRAR_SUG = op('acessibilidade_texto.mostrar_sugestoes', true);
  const AVISO = op('acessibilidade_texto.aviso_ao_gerar', true);
  const ESPERA = 1000;                                   // ms sem digitar antes de conferir
  const LOTE = 40;                                       // itens mostrados por vez em cada nível
  const MQ = window.matchMedia ? matchMedia('(max-width: 900px)') : { matches: false };
  const anunciar = m => { try { if (window.UXFeedback && UXFeedback.anunciar) UXFeedback.anunciar(m); } catch (e) { /* sem anúncio */ } };
  const ROTULO = { g: 'Apostila', s: 'Apresentação' };
  const DICA = {
    'descrever-imagem': 'Escreva entre os colchetes [ ] o que a imagem mostra.',
    'simplificar-trecho': 'Trecho selecionado. Reescreva em frases curtas, com uma ideia em cada.',
    'explicar-sigla': 'Escreva o nome completo antes da sigla e ponha a sigla entre parênteses.',
    'editar-texto-do-link': 'Escreva entre os colchetes [ ] aonde o link leva.',
    'escrever-titulo': 'Escreva o título do slide no início, começando com # e um espaço.',
    'editar-cabecalho': 'Escreva na primeira linha da tabela o nome de cada coluna.',
  };
  const SVG = {
    btn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5h14M12 8.5v5.5M12 14l-3.5 6.5M12 14l3.5 6.5"/></svg>',
    corrigir: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5 1.5 21h21L12 2.5z" fill="#b00020"/><path d="M12 9v5.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.3" fill="#fff"/></svg>',
    sugestao: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="#8a5c00"/><path d="M12 10.5v6.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="7.2" r="1.3" fill="#fff"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="#e6f4ea"/><path d="m7 12.5 3.2 3.2L17.5 8.5" fill="none" stroke="#168821" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ---------------------------- Estilos (padrão gov.br) ---------------------------- */
  const css = document.createElement('style'); css.id = 'la-css';
  css.textContent = `
.mde-tb button.la-btn{display:inline-flex;align-items:center;gap:5px}
.mde-tb button.la-btn svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.mde-tb button.la-btn svg circle{fill:currentColor;stroke:none}
.mde-tb button.la-btn .la-cont{min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#b00020;color:#fff;font:700 12px/20px "Segoe UI",Arial,sans-serif;text-align:center}
.mde-tb button.la-btn .la-cont[hidden]{display:none}
.mde-tb button.la-btn[aria-expanded="true"]{background:#dbe8fb!important;border-color:#1351b4!important;color:#0c326f!important}
.la-painel{flex:0 0 min(380px,42%);min-width:0;display:flex;flex-direction:column;border-left:1px solid #cccccc;background:#fff;font:14px/1.45 "Segoe UI",Roboto,Arial,sans-serif;color:#333333}
.la-painel[hidden]{display:none}
.la-cab{display:flex;align-items:center;gap:8px;padding:10px 12px 4px 16px}
.la-cab h3{flex:1;margin:0;font-size:16px;color:#0c326f;outline:none}
.la-cab h3:focus-visible{outline:3px dashed #c2850c;outline-offset:2px}
.la-sub{margin:0;padding:0 16px 8px;color:#636363;font-size:12.5px;border-bottom:1px solid #cccccc}
.la-corpo{flex:1;overflow:auto;padding:4px 0 8px}
.la-sec h4{display:flex;align-items:baseline;gap:8px;margin:12px 16px 4px;font-size:12.5px;letter-spacing:.02em;text-transform:uppercase}
.la-sec h4 small{margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;color:#636363}
.la-sec.c h4{color:#b00020}.la-sec.s h4{color:#8a5c00}
.la-sec h4 button.la-abre{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;color:#8a5c00;font-weight:700;border-radius:4px}
.la-sec h4 button.la-abre:focus-visible{outline:3px dashed #c2850c;outline-offset:2px}
.la-sec h4 button.la-abre::before{content:'\\25B8';transition:transform .15s}
.la-sec h4 button.la-abre[aria-expanded="true"]::before{transform:rotate(90deg)}
.la-lista{list-style:none;margin:0;padding:0}
.la-it{display:flex;gap:10px;padding:10px 12px 10px 16px;border-top:1px solid #e6e6e6}
.la-it.atual{background:#edf5ff}
.la-it .la-ic{flex:0 0 20px;padding-top:1px}.la-it .la-ic svg{width:20px;height:20px;display:block}
.la-it .la-tx{flex:1;min-width:0}
.la-msg{margin:0;font-weight:600;color:#333333}
.la-loc{margin:2px 0 6px;color:#636363;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.la-loc code{font:12px Consolas,"Cascadia Mono",monospace;background:#f8f8f8;padding:0 3px;border-radius:3px;color:#333333}
.la-acoes{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center}
.la-acoes button{margin:0!important}
.la-painel button.la-ter{background:transparent!important;border-color:transparent!important;color:#1351b4!important;padding:0 8px!important;text-decoration:underline;text-underline-offset:3px}
.la-painel button.la-ter:hover{background:#edf5ff!important}
.la-pq{margin:6px 0 0;padding:8px 10px;background:#f8f8f8;border-left:4px solid #1351b4;font-size:13px}
.la-mais{margin:6px 16px}
.la-vazio{display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 16px;text-align:center}
.la-vazio svg{width:56px;height:56px}.la-vazio b{font-size:16px}.la-vazio p{margin:0;color:#636363}
.la-rod{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 16px;border-top:1px solid #cccccc;font-size:13px;color:#333333}
.la-rod input{width:4.5em;min-height:32px;padding:2px 6px;border:1px solid #888888;border-radius:4px;font:inherit}
.la-indisp{padding:16px;color:#636363}
.la-fundo{position:fixed;inset:0;z-index:1490;background:rgba(0,0,0,.5)}
.la-painel.folha{position:fixed;left:0;right:0;bottom:0;z-index:1500;max-height:min(80vh,640px);border:0;border-radius:16px 16px 0 0;box-shadow:0 -8px 24px rgba(0,0,0,.3);padding-bottom:env(safe-area-inset-bottom)}
.la-painel.folha button.mini{--btn-h:44px}
.la-painel.folha .la-cab{position:relative;padding-top:20px}
.la-painel.folha .la-cab::before{content:'';position:absolute;left:50%;top:6px;width:40px;height:4px;margin-left:-20px;border-radius:2px;background:#bbbbbb}
#laAviso{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;margin:-4px 0 12px;font-size:13.5px;color:#333333}
#laAviso[hidden]{display:none}
#laAviso svg{width:18px;height:18px;vertical-align:-3px}
#laAviso button{margin:0!important}
.la-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2100;max-width:min(560px,92vw);background:#0c326f;color:#fff;padding:10px 16px;border-radius:8px;font:14px/1.4 "Segoe UI",Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transition:opacity .2s;pointer-events:none}
.la-toast.on{opacity:1}
html.contraste .la-painel,html.contraste .la-it{background:#000;color:#fff;border-color:#fff}
html.contraste .la-msg,html.contraste .la-cab h3{color:#fff}html.contraste .la-loc,html.contraste .la-sub{color:#ff0}
@media (prefers-reduced-motion:reduce){.la-toast,.la-sec h4 button.la-abre::before{transition:none}}
@media print{.la-painel,.la-fundo,#laAviso,.la-toast{display:none!important}}
`;
  document.head.appendChild(css);

  /* ---------------------------- Motor: Worker ou a própria página ---------------------------- */
  let worker = null, motorLocal = null, metaRegras = [], indisponivel = false, seq = 0;
  const esperando = new Map();
  function iniciarMotor() {
    try {
      worker = new Worker('acessibilidade-worker.js', { type: 'module' });
      worker.onmessage = e => {
        const d = e.data || {};
        if (d.pronto) { metaRegras = d.regras || []; return; }
        const f = esperando.get(d.id); if (!f) return; esperando.delete(d.id);
        d.erro ? f.falha(new Error(d.erro)) : f.ok(d.resultado);
      };
      worker.onerror = ev => { if (ev && ev.preventDefault) ev.preventDefault(); worker = null; esperando.forEach(f => f.falha(new Error('worker'))); esperando.clear(); };
    } catch (e) { worker = null; }
  }
  async function local() {
    if (!motorLocal) motorLocal = import('./lib/linguagem-acessivel/index.js').then(L => { metaRegras = L.regras(); return L; });
    return motorLocal;
  }
  async function conferir(chave, texto, tipo, config) {
    if (worker) {
      try {
        return await new Promise((ok, falha) => { const id = ++seq; esperando.set(id, { ok, falha }); worker.postMessage({ id, chave, texto, tipo, config }); setTimeout(() => { if (esperando.has(id)) { esperando.delete(id); falha(new Error('tempo')); } }, 8000); });
      } catch (e) { worker = null; }                    // cai para a análise na página
    }
    const L = await local();
    return L.analisar(texto, { tipo, config });
  }
  const meta = c => metaRegras.find(r => r.codigo === c) || {};

  /* ---------------------------- Estado de cada editor ---------------------------- */
  const E = {};
  const limite = () => { const v = parseInt(window.Opcoes ? Opcoes.ler(CH_LIMITE, '25') : (localStorage.getItem(CH_LIMITE) || '25'), 10); return v >= 10 && v <= 60 ? v : 25; };
  const configAtual = () => ({ limiteFraseLonga: limite(), limiteFraseNarracao: limite(), sugestoes: MOSTRAR_SUG });

  function montar(k) {
    const pane = $(k === 's' ? 'ps' : 'pg'), box = pane && pane.querySelector('.mde');
    if (!box || box.dataset.la) return;
    box.dataset.la = '1';
    const ed = (typeof ED !== 'undefined' && ED[k]) || null, ta = box.querySelector('.mde-ta'), tb = box.querySelector('.mde-tb'), body = box.querySelector('.mde-body');
    const id = 'laP-' + k;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'la-btn'; btn.title = 'Conferir acessibilidade do texto (Alt+Shift+C)';
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id); btn.setAttribute('aria-keyshortcuts', 'Alt+Shift+C');
    btn.innerHTML = SVG.btn + '<span class="la-rot">Acessibilidade</span><span class="la-cont" hidden></span>';
    const sp = tb.querySelector('.sp'); if (sp) sp.after(btn); else tb.append(btn);
    const p = document.createElement('aside'); p.className = 'la-painel'; p.id = id; p.hidden = true; p.setAttribute('aria-labelledby', 'laT-' + k);
    p.innerHTML = '<div class="la-cab"><h3 id="laT-' + k + '" tabindex="-1">Acessibilidade do texto</h3><button type="button" class="sec mini la-x" title="Fechar (Esc)">Fechar <span aria-hidden="true">\u2715</span></button></div>' +
      '<p class="la-sub" role="status" aria-live="polite"></p><div class="la-corpo"></div>' +
      '<div class="la-rod"><label for="laL-' + k + '">Frase longa a partir de</label><input type="number" id="laL-' + k + '" min="10" max="60" step="1" inputmode="numeric"><span>palavras</span></div>';
    body.append(p);
    const st = E[k] = { k, box, ta, ed, btn, painel: p, resultado: null, analisado: null, t: 0, abertoSug: false, mostrar: { c: LOTE, s: LOTE }, atual: -1, fundo: null, volta: null };
    btn.addEventListener('click', () => (p.hidden ? abrir(k) : fechar(k)));
    p.querySelector('.la-x').addEventListener('click', () => fechar(k));
    p.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(k); return; }
      if (e.key === 'Tab' && p.classList.contains('folha')) {
        const f = [...p.querySelectorAll('button,input,[tabindex="0"],h3')].filter(x => !x.disabled && x.offsetParent !== null);
        if (!f.length) return; const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    p.addEventListener('click', e => acao(k, e));
    const inp = p.querySelector('#laL-' + k); inp.value = limite();
    inp.addEventListener('change', () => {
      const v = Math.round(Number(inp.value));
      if (!(v >= 10 && v <= 60)) { inp.value = limite(); dica('Use um número de 10 a 60.'); return; }
      try { localStorage.setItem(CH_LIMITE, String(v)); } catch (e) { /* sem armazenamento */ }
      Object.values(E).forEach(x => { const i = x.painel.querySelector('input[type=number]'); if (i) i.value = v; agendar(x.k, 0); });
    });
    const real = $(k);
    if (real) real.addEventListener('input', () => agendar(k));
    ta.addEventListener('input', () => agendar(k));
    agendar(k, 300);
  }

  function agendar(k, espera) {
    const st = E[k]; if (!st) return;
    clearTimeout(st.t); st.t = setTimeout(() => analisar(k), espera === undefined ? ESPERA : espera);
  }
  async function analisar(k) {
    const st = E[k]; if (!st || indisponivel) return st && st.resultado;
    const texto = st.ta.value, cfg = configAtual();
    try {
      const r = await conferir(k, texto, k === 's' ? 'apresentacao' : 'apostila', cfg);
      if (st.ta.value !== texto) { agendar(k); return st.resultado; }  // mudou enquanto analisava
      st.resultado = r; st.analisado = texto;
      atualizarBotao(k); atualizarAviso(); if (!st.painel.hidden) desenhar(k, st.focoApos);
      return r;
    } catch (e) {
      indisponivel = true; Object.keys(E).forEach(x => { E[x].btn.title = 'Conferência de acessibilidade indisponível neste navegador'; if (!E[x].painel.hidden) desenhar(x); });
      if (window.console) console.warn('[Conteudista] Acessibilidade do texto indisponível:', e);
      return null;
    }
  }
  // mudanças feitas por outros módulos (importar, exemplo, versões) não disparam digitação: confere em 0,3 s
setInterval(() => Object.values(E).forEach(st => { if (st.analisado !== null && st.ta.value !== st.analisado && document.activeElement !== st.ta) agendar(st.k, 300); }), 1000);

  /* ---------------------------- Botão, aviso e painel ---------------------------- */
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  function atualizarBotao(k) {
    const st = E[k], n = st.resultado ? st.resultado.resumo.corrigir : 0, c = st.btn.querySelector('.la-cont');
    c.hidden = !n; c.textContent = n > 99 ? '99+' : String(n);
    st.btn.setAttribute('aria-label', 'Conferir acessibilidade' + (n ? ', ' + plural(n, 'item para corrigir', 'itens para corrigir') : ''));
  }
  let aviso = null;
  function atualizarAviso() {
    if (!AVISO) return;
    const lugar = document.querySelector('.acao-gerar'); if (!lugar) return;
    if (!aviso) {
      aviso = document.createElement('p'); aviso.id = 'laAviso'; aviso.hidden = true; lugar.after(aviso);
      aviso.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k; const aba = $(k === 's' ? 'ts' : 'tg'); if (aba) aba.click(); abrir(k); });
    }
    const p = ['g', 's'].filter(k => E[k] && E[k].resultado && E[k].resultado.resumo.corrigir).map(k => ({ k, n: E[k].resultado.resumo.corrigir }));
    if (!p.length) { aviso.hidden = true; aviso.innerHTML = ''; return; }
    const partes = p.map(x => plural(x.n, 'item', 'itens') + ' para corrigir na ' + ROTULO[x.k].toLowerCase());
    aviso.innerHTML = SVG.corrigir + '<span>Acessibilidade: ' + esc(partes.join(' e ')) + '. Você pode gerar os arquivos assim mesmo.</span>' +
      p.map(x => '<button type="button" class="sec mini" data-k="' + x.k + '">Conferir ' + ROTULO[x.k].toLowerCase() + '</button>').join('');
    aviso.hidden = false;
  }

  function folha(k) { return MQ.matches; }
  function abrir(k, foco) {
    const st = E[k]; if (!st) return;
    Object.keys(E).forEach(x => { if (x !== k && !E[x].painel.hidden) fechar(x, true); });
    const p = st.painel, ehFolha = folha(k);
    st.volta = document.activeElement && document.activeElement !== document.body ? document.activeElement : st.btn;
    p.classList.toggle('folha', ehFolha);
    if (ehFolha) {
      p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
      st.fundo = document.createElement('div'); st.fundo.className = 'la-fundo'; st.fundo.addEventListener('click', () => fechar(k)); document.body.append(st.fundo);
      document.body.append(p); document.body.style.overflow = 'hidden';
    } else { p.setAttribute('role', 'region'); p.removeAttribute('aria-modal'); }
    p.hidden = false; st.btn.setAttribute('aria-expanded', 'true');
    desenhar(k);
    if (!st.resultado && !indisponivel) analisar(k);
    if (foco !== false) p.querySelector('h3').focus({ preventScroll: !ehFolha });
  }
  function fechar(k, semFoco) {
    const st = E[k]; if (!st || st.painel.hidden) return;
    const p = st.painel; p.hidden = true; st.btn.setAttribute('aria-expanded', 'false');
    if (p.classList.contains('folha')) { p.classList.remove('folha'); st.box.querySelector('.mde-body').append(p); document.body.style.overflow = ''; }
    if (st.fundo) { st.fundo.remove(); st.fundo = null; }
    if (!semFoco) { const v = st.volta; (v && v.isConnected && v.offsetParent !== null ? v : st.btn.offsetParent !== null ? st.btn : st.ta).focus(); }
  }
  function alternar(k) { k = k || visivel(); if (!k) return; E[k].painel.hidden ? abrir(k) : fechar(k); }
  function visivel() { const sl = $('secLoc'); if (sl && !sl.hidden) return null; return $('ps') && !$('ps').hidden ? 's' : 'g'; }

  function trecho(st, d) {
    const t = st.ta.value.slice(d.inicio, Math.min(d.fim, d.inicio + 60)).replace(/\s+/g, ' ').trim();
    return t + (d.fim - d.inicio > 60 ? '\u2026' : '');
  }
  function itens(st) {
    const ds = st.resultado ? st.resultado.diagnosticos : [];
    return { c: ds.filter(d => d.nivel === 'corrigir'), s: MOSTRAR_SUG ? ds.filter(d => d.nivel === 'sugestao') : [] };
  }
  function itemHtml(st, d, i) {
    const m = meta(d.codigo), botoes = [];
    d.correcoes.forEach((c, j) => {
      const pri = d.nivel === 'corrigir' && j === 0;
      botoes.push('<button type="button" class="' + (pri ? '' : 'sec ') + 'mini" data-a="cor" data-j="' + j + '">' + esc(c.rotulo) + '</button>');
    });
    if (d.nivel === 'sugestao' && !emComentario(st, d)) botoes.push('<button type="button" class="mini la-ter" data-a="ign" title="Não mostrar esta sugestão de novo neste texto">Ignorar</button>');
    botoes.push('<button type="button" class="mini la-ter" data-a="ir">Ir para</button>');
    if (m.porque) botoes.push('<button type="button" class="mini la-ter" data-a="pq" aria-expanded="false">Por quê?</button>');
    const onde = 'Linha ' + d.linha + (d.slide ? ' · slide ' + d.slide : '');
    return '<li class="la-it' + (i === st.atual ? ' atual' : '') + '" data-i="' + i + '"><span class="la-ic">' + SVG[d.nivel] + '</span><div class="la-tx">' +
      '<p class="la-msg">' + esc(d.mensagem) + '</p><p class="la-loc">' + onde + ' · <code>' + esc(trecho(st, d)) + '</code></p>' +
      '<div class="la-acoes" role="group" aria-label="' + esc(d.mensagem) + '">' + botoes.join('') + '</div>' +
      (m.porque ? '<p class="la-pq" hidden>' + esc(m.porque) + '</p>' : '') + '</div></li>';
  }
  function emComentario(st, d) { const v = st.ta.value, a = v.lastIndexOf('<!--', d.inicio), f = v.lastIndexOf('-->', d.inicio); return a >= 0 && a > f; }

  function desenhar(k, foco) {
    const st = E[k], p = st.painel, corpo = p.querySelector('.la-corpo'), sub = p.querySelector('.la-sub');
    // guarda o foco para devolvê-lo ao mesmo item depois de redesenhar
    const ae = document.activeElement, li = ae && corpo.contains(ae) ? ae.closest('.la-it') : null;
    const guardado = foco ? (st.focoApos = null, foco) : li ? { chave: li.dataset.chave, a: ae.dataset.a, j: ae.dataset.j, pos: [...corpo.querySelectorAll('.la-it')].indexOf(li) } : (ae && corpo.contains(ae) ? { abre: !!ae.closest('.la-abre') } : null);
    if (indisponivel) { sub.textContent = ''; corpo.innerHTML = '<p class="la-indisp">A conferência de acessibilidade não está disponível neste navegador. Use um navegador atualizado ou o comando lac.</p>'; return; }
    if (!st.resultado) { sub.textContent = 'Conferindo\u2026'; corpo.innerHTML = ''; return; }
    const { c, s } = itens(st), todos = st.resultado.diagnosticos;
    sub.textContent = ROTULO[k] + ' · ' + plural(c.length, 'item para corrigir', 'itens para corrigir') + (MOSTRAR_SUG ? ' · ' + plural(s.length, 'sugestão', 'sugestões') : '');
    let h = '';
    if (!c.length && !s.length) {
      h = '<div class="la-vazio">' + SVG.ok + '<b>Nada para corrigir</b><p>' + (MOSTRAR_SUG ? 'E nenhuma sugestão neste texto.' : 'Neste texto.') + '</p></div>';
    } else {
      h += '<section class="la-sec c" aria-labelledby="laHc-' + k + '"><h4 id="laHc-' + k + '">Para corrigir (' + c.length + ') <small>Impedem alguém de ler</small></h4>';
      h += c.length ? '<ul class="la-lista">' + c.slice(0, st.mostrar.c).map(d => itemHtml(st, d, todos.indexOf(d))).join('') + '</ul>' + (c.length > st.mostrar.c ? '<button type="button" class="sec mini la-mais" data-a="mais" data-n="c">Mostrar mais ' + Math.min(LOTE, c.length - st.mostrar.c) + '</button>' : '')
        : '<p class="la-loc" style="padding:0 16px;white-space:normal">' + SVG.ok.replace('<svg ', '<svg width="16" height="16" style="vertical-align:-3px" ') + ' Nada para corrigir.</p>';
      h += '</section>';
      if (MOSTRAR_SUG && s.length) {
        h += '<section class="la-sec s"><h4><button type="button" class="la-abre" aria-expanded="' + st.abertoSug + '" aria-controls="laLs-' + k + '">Sugestões (' + s.length + ')</button><small>Deixam o texto mais fácil</small></h4>' +
          '<div id="laLs-' + k + '"' + (st.abertoSug ? '' : ' hidden') + '><ul class="la-lista">' + s.slice(0, st.mostrar.s).map(d => itemHtml(st, d, todos.indexOf(d))).join('') + '</ul>' +
          (s.length > st.mostrar.s ? '<button type="button" class="sec mini la-mais" data-a="mais" data-n="s">Mostrar mais ' + Math.min(LOTE, s.length - st.mostrar.s) + '</button>' : '') + '</div></section>';
      }
    }
    corpo.innerHTML = h;
    corpo.querySelectorAll('.la-it').forEach(el => { const d = todos[+el.dataset.i]; el.dataset.chave = d.codigo + ':' + d.trecho; });
    if (!guardado) return;
    if (guardado.abre) { const b = corpo.querySelector('.la-abre'); if (b) b.focus(); return; }
    const lis = [...corpo.querySelectorAll('.la-it')];
    let alvo = lis.find(x => x.dataset.chave === guardado.chave);
    let bt = alvo && alvo.querySelector('[data-a="' + guardado.a + '"]' + (guardado.j !== undefined ? '[data-j="' + guardado.j + '"]' : ''));
    if (!bt) { alvo = lis[Math.min(guardado.pos, lis.length - 1)]; bt = alvo && alvo.querySelector('button'); }
    (bt || p.querySelector('h3')).focus({ preventScroll: true });
    if (bt) bt.scrollIntoView({ block: 'nearest' });
  }

  /* ---------------------------- Ações ---------------------------- */
  let tToast = 0;
  function dica(m) {
    let t = document.querySelector('.la-toast'); if (!t) { t = document.createElement('div'); t.className = 'la-toast'; t.setAttribute('aria-hidden', 'true'); document.body.append(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('on'), 4500);
    anunciar(m);
  }
  function inicioDoBloco(v, pos) {
    let i = v.lastIndexOf('\n', pos - 1) + 1;
    while (i > 0) {
      const ant = v.lastIndexOf('\n', i - 2) + 1, l = v.slice(ant, i - 1);
      if (!l.trim() || /^\s{0,3}#{1,6}(\s|$)/.test(l) || /^\s*(```|~~~|---\s*$)/.test(l)) break;
      i = ant;
    }
    return i;
  }
  async function acao(k, e) {
    const b = e.target.closest('button'); if (!b) return;
    const st = E[k], a = b.dataset.a;
    if (b.classList.contains('la-abre')) { st.abertoSug = !st.abertoSug; b.setAttribute('aria-expanded', String(st.abertoSug)); const l = $(b.getAttribute('aria-controls')); if (l) l.hidden = !st.abertoSug; return; }
    if (a === 'mais') { st.mostrar[b.dataset.n] += LOTE; desenhar(k); return; }
    const li = b.closest('.la-it'); if (!li || !st.resultado) return;
    const d = st.resultado.diagnosticos[+li.dataset.i]; if (!d) return;
    if (a === 'pq') { const q = li.querySelector('.la-pq'); q.hidden = !q.hidden; b.setAttribute('aria-expanded', String(!q.hidden)); return; }
    if (st.ta.value !== st.analisado) { await analisar(k); dica('O texto mudou. Confira a lista de novo.'); return; }
    // depois de corrigir ou ignorar, o foco volta ao painel (no mesmo item ou no seguinte)
    const marcarFoco = () => { st.focoApos = { chave: li.dataset.chave, a: 'cor', j: '0', pos: [...st.painel.querySelectorAll('.la-it')].indexOf(li) }; };
    if (a === 'ir') { irPara(k, d); return; }
    if (a === 'ign') {
      const v = st.ta.value, i = inicioDoBloco(v, d.inicio);
      marcarFoco(); aplicar(st, [{ inicio: i, fim: i, texto: '<!-- linguagem-acessivel: ignorar ' + d.codigo + ' -->\n' }]);
      dica('Sugestão ignorada neste texto. Para voltar a vê-la, apague o comentário "linguagem-acessivel: ignorar ' + d.codigo + '".');
      await analisar(k); return;
    }
    if (a === 'cor') {
      const c = d.correcoes[+b.dataset.j]; if (!c) return;
      if (c.edicoes) {
        marcarFoco();
        if (!aplicar(st, c.edicoes)) { st.focoApos = null; dica('Não foi possível aplicar. Confira o trecho no editor.'); return; }
        const r = await analisar(k);
        dica('Correção aplicada: ' + c.rotulo + '.' + (r ? ' ' + plural(r.resumo.corrigir, 'item para corrigir', 'itens para corrigir') + '.' : ''));
        return;
      }
      const alvo = c.alvo || { inicio: d.inicio, fim: d.fim };
      irPara(k, d, alvo); dica(DICA[c.acao] || 'Ajuste o trecho selecionado.');
    }
  }
  function aplicar(st, eds) {
    if (st.ed && st.ed.aplicarEdicoes) return st.ed.aplicarEdicoes(eds);
    // sem a API do editor: substitui no campo e avisa o editor
    const v = st.ta.value, ord = eds.slice().sort((x, y) => y.inicio - x.inicio); let n = v;
    for (const e of ord) n = n.slice(0, e.inicio) + e.texto + n.slice(e.fim);
    st.ta.value = n; st.ta.dispatchEvent(new Event('input', { bubbles: true })); return true;
  }
  function irPara(k, d, alvo) {
    const st = E[k], r = alvo || { inicio: d.inicio, fim: d.fim };
    if (st.painel.classList.contains('folha')) fechar(k, true);
    st.atual = st.resultado.diagnosticos.indexOf(d);
    if (st.ed && st.ed.selecionar) st.ed.selecionar(r.inicio, r.fim); else { st.ta.focus(); st.ta.setSelectionRange(r.inicio, r.fim); }
    st.painel.querySelectorAll('.la-it').forEach(x => x.classList.toggle('atual', +x.dataset.i === st.atual));
  }
  async function proximo() {
    const k = visivel(); if (!k || !E[k]) return;
    const st = E[k]; if (st.ta.value !== st.analisado || !st.resultado) await analisar(k);
    if (!st.resultado) return;
    const { c, s } = itens(st), lista = c.concat(s).sort((x, y) => x.inicio - y.inicio);
    if (!lista.length) { dica('Nada para corrigir neste texto.'); return; }
    const pos = st.ta.selectionStart, sel = st.ta.selectionEnd > st.ta.selectionStart;
    let i = lista.findIndex(d => sel ? d.inicio > pos : d.inicio >= pos); if (i < 0) i = 0;
    const d = lista[i];
    irPara(k, d);
    const n = d.nivel === 'corrigir' ? 'Para corrigir' : 'Sugestão';
    anunciar('Item ' + (i + 1) + ' de ' + lista.length + '. ' + n + ': ' + d.mensagem + '. Linha ' + d.linha + '.');
  }

  /* ---------------------------- Início ---------------------------- */
  function iniciar() {
    iniciarMotor();
    ['g', 's'].forEach(montar);
    if (MQ.addEventListener) MQ.addEventListener('change', () => Object.keys(E).forEach(k => { if (!E[k].painel.hidden) { fechar(k, true); abrir(k, false); } }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.AcessibilidadeTexto = { alternar, abrir, fechar, proximo, analisarAgora: k => analisar(k || visivel()), resultado: k => (E[k || visivel()] || {}).resultado || null };
})();
