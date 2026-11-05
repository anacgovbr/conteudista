/* =====================================================================================
   Conteudista — Acessibilidade do texto: marcas no próprio texto (1.81)
   - Sublinha no editor os trechos que o verificador encontrou, como um corretor ortográfico:
       para corrigir: linha ondulada vermelha (#b00020) e fundo leve;
       sugestão:      linha pontilhada âmbar (#8a5c00) e fundo leve (só se "Marcar também as sugestões").
     A cor nunca vem sozinha: o traço muda (WCAG 1.4.1) e as cores têm contraste de 3:1 ou mais (1.4.11).
   - As marcas ficam numa camada transparente sobre o campo de texto, com a mesma fonte, recuo e
     quebra de linha; não entram no texto, no link nem nos arquivos gerados. Somem ao digitar e voltam
     quando a conferência termina (1 s depois da última tecla).
   - Clicar numa marca abre um balão (padrão Dropdown do gov.br) com a mensagem e as correções.
     Pelo teclado: Alt+Shift+N vai ao próximo item e mostra o balão; Alt+Shift+I leva o foco para as
     correções do item no cursor; Esc volta ao texto.
   - Resumo no rodapé do editor (computador): "Acessibilidade: N para corrigir".
   - Opções: web/config/opcoes.yaml (acessibilidade_texto.marcas_no_texto e .marcas_sugestoes) e os
     interruptores no rodapé do painel Acessibilidade.
   API: window.MarcasTexto = { atualizar, abrirNoCursor, fecharBalao, ligado }
   ===================================================================================== */
(function () {
  'use strict';
  const A = () => window.AcessibilidadeTexto;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CH = { marcas: 'conteudista.acessibilidade.marcas', sug: 'conteudista.acessibilidade.marcasSug' };
  const ler = (ch, padrao) => { try { const v = window.Opcoes ? Opcoes.ler(ch, padrao) : localStorage.getItem(ch); return (v === null ? padrao : v) === '1'; } catch (e) { return padrao === '1'; } };
  const gravar = (ch, on) => { try { localStorage.setItem(ch, on ? '1' : '0'); } catch (e) { /* sem armazenamento */ } };
  const prefs = { marcas: ler(CH.marcas, '1'), sug: ler(CH.sug, '0') };
  const MQ_RODAPE = window.matchMedia ? matchMedia('(max-width: 700px)') : { matches: false };
  const anunciar = m => { try { if (window.UXFeedback && UXFeedback.anunciar) UXFeedback.anunciar(m); } catch (e) { /* */ } };
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  const ICONE = {
    corrigir: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5 1.5 21h21L12 2.5z" fill="#b00020"/><path d="M12 9v5.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.3" fill="#fff"/></svg>',
    sugestao: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="#8a5c00"/><path d="M12 10.5v6.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="7.2" r="1.3" fill="#fff"/></svg>',
  };

  const css = document.createElement('style'); css.id = 'la-marcas-css';
  css.textContent = `
.mde-body{position:relative}
.la-camada{position:absolute;z-index:2;overflow:hidden;pointer-events:none;color:transparent;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:border-box;border:0;margin:0;background:transparent}
.la-camada[hidden]{display:none}
.la-m{border-radius:2px;text-decoration-skip-ink:none;text-underline-offset:3px}
.la-m.c{background:rgba(176,0,32,.09);text-decoration:underline wavy #b00020;text-decoration-thickness:1.5px}
.la-m.s{background:rgba(138,92,0,.09);text-decoration:underline dotted #8a5c00;text-decoration-thickness:2px}
.la-m.atual{outline:2px solid #1351b4;outline-offset:1px}
.la-balao{position:fixed;z-index:1600;width:max-content;max-width:min(380px,calc(100vw - 16px));padding:12px 12px 10px;background:#fff;border:1px solid #888888;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:14px/1.45 "Segoe UI",Roboto,Arial,sans-serif;color:#333333}
.la-balao[hidden]{display:none}
.la-balao .lb-cab{display:flex;gap:8px;align-items:flex-start}
.la-balao .lb-cab svg{flex:0 0 20px;width:20px;height:20px;margin-top:1px}
.la-balao .lb-msg{margin:0;font-weight:600}
.la-balao .lb-niv{margin:2px 0 8px 28px;color:#636363;font-size:12.5px}
.la-balao .lb-acoes{display:flex;flex-wrap:wrap;gap:4px 6px;margin-left:28px}
.la-balao .lb-acoes button{margin:0!important}
.la-balao button.lb-ter{background:transparent!important;border-color:transparent!important;color:#1351b4!important;padding:0 8px!important;text-decoration:underline;text-underline-offset:3px}
.la-balao button.lb-ter:hover{background:#edf5ff!important}
.la-balao .lb-atalho{margin:8px 0 0 28px;color:#636363;font-size:12px}
.mde-st .st-la{all:unset;cursor:pointer;margin-left:auto;padding:0 6px;border-radius:4px;color:#b00020;font-weight:700;white-space:nowrap}
.mde-st .st-la.ok{color:#168821;font-weight:600}
.mde-st .st-la:hover{text-decoration:underline}
.mde-st .st-la:focus-visible{outline:3px dashed #c2850c;outline-offset:1px}
.la-rod .la-sw{display:flex;align-items:center;gap:8px;flex-basis:100%;margin:2px 0;cursor:pointer}
.la-rod .la-sw input{width:auto;min-height:auto;margin:0}
@media (forced-colors:active){.la-m.c,.la-m.s{text-decoration-color:Highlight;background:transparent}}
html.contraste .la-m.c{text-decoration-color:#ff4d4d;background:transparent}html.contraste .la-m.s{text-decoration-color:#ffff00;background:transparent}
html.contraste .la-balao{background:#000;color:#fff;border-color:#fff}
@media print{.la-camada,.la-balao{display:none!important}}
`;
  document.head.appendChild(css);

  /* ---------------------------- Camada de marcas de cada editor ---------------------------- */
  const C = {};
  const PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'wordSpacing', 'tabSize', 'textIndent', 'textTransform',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'wordBreak', 'direction'];
  function montar(k) {
    const st = A() && A().estado(k); if (!st || C[k]) return;
    const body = st.ta.parentNode, cam = document.createElement('div');
    cam.className = 'la-camada'; cam.setAttribute('aria-hidden', 'true'); cam.hidden = true;
    body.insertBefore(cam, st.ta.nextSibling);
    const c = C[k] = { k, ta: st.ta, box: st.box, cam, desenhado: null, ids: [] };
    st.ta.addEventListener('scroll', () => { cam.scrollTop = st.ta.scrollTop; cam.scrollLeft = st.ta.scrollLeft; posBalao(); }, { passive: true });
    st.ta.addEventListener('input', () => { limpar(k); fecharBalao(); });
    st.ta.addEventListener('click', () => { if (st.ta.selectionStart === st.ta.selectionEnd) abrirEm(k, st.ta.selectionStart, false); });
    st.ta.addEventListener('keydown', e => { if (e.key === 'Escape' && balao && !balao.hidden) { e.preventDefault(); fecharBalao(); } });
    if (window.ResizeObserver) new ResizeObserver(() => { geometria(k); posBalao(); }).observe(st.ta);
    // modo do editor (Editar / Dividido / Prévia) e tela cheia mudam o tamanho do campo
    new MutationObserver(() => { geometria(k); if (st.ta.offsetParent === null) fecharBalao(); }).observe(st.box, { attributes: true, attributeFilter: ['data-m', 'class'] });
    montarRodape(k); montarInterruptores(k);
  }
  function geometria(k) {
    const c = C[k]; if (!c) return;
    const ta = c.ta, cam = c.cam;
    if (ta.offsetParent === null || !prefs.marcas) { cam.hidden = true; return; }
    const cs = getComputedStyle(ta);
    PROPS.forEach(p => { cam.style[p] = cs[p]; });
    Object.assign(cam.style, {
      left: (ta.offsetLeft + ta.clientLeft) + 'px', top: (ta.offsetTop + ta.clientTop) + 'px',
      width: ta.clientWidth + 'px', height: ta.clientHeight + 'px',
    });
    cam.hidden = false; cam.scrollTop = ta.scrollTop; cam.scrollLeft = ta.scrollLeft;
  }
  function limpar(k) { const c = C[k]; if (!c) return; if (c.desenhado !== null) { c.cam.textContent = ''; c.desenhado = null; c.ids = []; } }
  function visiveis(st) {
    if (!st || !st.resultado) return [];
    return st.resultado.diagnosticos.map((d, i) => ({ d, i })).filter(x => x.d.nivel === 'corrigir' || prefs.sug);
  }
  function desenhar(k) {
    const c = C[k], st = A() && A().estado(k); if (!c || !st) return;
    atualizarRodape(k);
    if (!prefs.marcas || !st.resultado || st.analisado !== c.ta.value) { limpar(k); geometria(k); return; }
    const v = c.ta.value, lista = visiveis(st).sort((x, y) => x.d.inicio - y.d.inicio || y.d.fim - x.d.fim);
    let h = '', p = 0; c.ids = [];
    for (const { d, i } of lista) {
      let a = Math.max(d.inicio, p), f = Math.min(d.fim, v.length);
      if (f <= a) continue;                                         // sobreposto a outro já marcado
      h += esc(v.slice(p, a)) + '<span class="la-m ' + (d.nivel === 'corrigir' ? 'c' : 's') + '" data-i="' + i + '">' + esc(v.slice(a, f)) + '</span>';
      p = f; c.ids.push(i);
    }
    h += esc(v.slice(p)) + '\u200b';                                 // linha final vazia também ocupa altura, como no campo
    c.cam.innerHTML = h; c.desenhado = v;
    geometria(k);
    if (balao && !balao.hidden && balaoK === k) { const ok = st.resultado.diagnosticos[balaoI]; if (!ok) fecharBalao(); else posBalao(); }
  }

  /* ---------------------------- Balão com as correções ---------------------------- */
  let balao = null, balaoK = null, balaoI = -1, voltaTa = null;
  function criarBalao() {
    balao = document.createElement('div'); balao.className = 'la-balao'; balao.hidden = true;
    balao.setAttribute('role', 'dialog'); balao.setAttribute('aria-modal', 'false'); balao.setAttribute('aria-labelledby', 'laBalaoMsg');
    document.body.append(balao);
    balao.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharBalao(true); return; }
      if (e.key === 'Tab') {
        const f = [...balao.querySelectorAll('button')]; if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    balao.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = balaoK, i = balaoI, a = b.dataset.a;
      if (a === 'fechar') { fecharBalao(true); return; }
      if (a === 'painel') { fecharBalao(false); A().abrir(k); return; }
      if (a === 'pq') { const q = balao.querySelector('.lb-pq'); q.hidden = !q.hidden; b.setAttribute('aria-expanded', String(!q.hidden)); posBalao(); return; }
      fecharBalao(false);
      await A().executar(k, i, a, +b.dataset.j || 0);
      // correção aplicada ou ignorada: o foco volta ao texto (quando a correção selecionou um trecho, ele continua selecionado)
      const ta = C[k] && C[k].ta, ae = document.activeElement;
      if (ta && (ae === document.body || !ae || balao.contains(ae))) ta.focus({ preventScroll: true });
    });
    document.addEventListener('pointerdown', e => { if (balao && !balao.hidden && !balao.contains(e.target) && !(C[balaoK] && e.target === C[balaoK].ta)) fecharBalao(false); }, true);
    addEventListener('resize', () => posBalao());
    addEventListener('scroll', () => posBalao(), true);
  }
  function itemEm(k, pos) {
    const st = A() && A().estado(k), c = C[k];
    if (!st || !c || !st.resultado || st.analisado !== c.ta.value) return -1;
    const l = visiveis(st).filter(x => x.d.inicio <= pos && pos <= x.d.fim);
    if (!l.length) return -1;
    l.sort((x, y) => (x.d.nivel === y.d.nivel ? 0 : x.d.nivel === 'corrigir' ? -1 : 1) || (x.d.fim - x.d.inicio) - (y.d.fim - y.d.inicio));
    return l[0].i;
  }
  function abrirEm(k, pos, focar) {
    const i = itemEm(k, pos);
    if (i < 0) { fecharBalao(false); return false; }
    mostrar(k, i, focar); return true;
  }
  function mostrar(k, i, focar) {
    if (!prefs.marcas) return;
    const st = A().estado(k), d = st && st.resultado && st.resultado.diagnosticos[i]; if (!d) return;
    if (!balao) criarBalao();
    balaoK = k; balaoI = i; voltaTa = C[k].ta;
    const m = A().meta ? A().meta(d.codigo) : {};
    const botoes = d.correcoes.map((c, j) => '<button type="button" class="' + (d.nivel === 'corrigir' && j === 0 ? '' : 'sec ') + 'mini" data-a="cor" data-j="' + j + '">' + esc(c.rotulo) + '</button>');
    if (d.nivel === 'sugestao') botoes.push('<button type="button" class="mini lb-ter" data-a="ign">Ignorar</button>');
    if (m.porque) botoes.push('<button type="button" class="mini lb-ter" data-a="pq" aria-expanded="false">Por quê?</button>');
    botoes.push('<button type="button" class="mini lb-ter" data-a="painel">Ver no painel</button>');
    balao.innerHTML = '<div class="lb-cab">' + ICONE[d.nivel] + '<p class="lb-msg" id="laBalaoMsg">' + esc(d.mensagem) + '</p></div>' +
      '<p class="lb-niv">' + (d.nivel === 'corrigir' ? 'Para corrigir' : 'Sugestão') + ' · linha ' + d.linha + '</p>' +
      '<div class="lb-acoes">' + botoes.join('') + '</div>' + (m.porque ? '<p class="lb-pq lb-niv" hidden style="margin-top:6px">' + esc(m.porque) + '</p>' : '') +
      '<p class="lb-atalho">' + (focar ? 'Esc volta ao texto.' : 'Teclado: Alt+Shift+I leva às correções. Esc fecha.') + '</p>';
    balao.hidden = false;
    C[k].cam.querySelectorAll('.la-m.atual').forEach(x => x.classList.remove('atual'));
    const sp = C[k].cam.querySelector('.la-m[data-i="' + i + '"]'); if (sp) sp.classList.add('atual');
    posBalao();
    if (focar) { const b = balao.querySelector('button'); if (b) b.focus(); }
  }
  function posBalao() {
    if (!balao || balao.hidden) return;
    const c = C[balaoK]; if (!c) return;
    const sp = c.cam.querySelector('.la-m[data-i="' + balaoI + '"]');
    const rt = c.ta.getBoundingClientRect();
    let r = sp && sp.getClientRects()[0];
    if (!r || r.bottom < rt.top || r.top > rt.bottom) { if (document.activeElement !== balao && !balao.contains(document.activeElement)) { fecharBalao(false); return; } r = { left: rt.left + 16, top: rt.top + 8, bottom: rt.top + 8 }; }
    const w = balao.offsetWidth, hgt = balao.offsetHeight;
    let x = Math.max(8, Math.min(r.left, innerWidth - w - 8)), y = r.bottom + 6;
    if (y + hgt > innerHeight - 8 && r.top - hgt - 6 > 8) y = r.top - hgt - 6;
    balao.style.left = x + 'px'; balao.style.top = Math.max(8, y) + 'px';
  }
  function fecharBalao(voltar) {
    if (!balao || balao.hidden) return;
    balao.hidden = true;
    if (C[balaoK]) C[balaoK].cam.querySelectorAll('.la-m.atual').forEach(x => x.classList.remove('atual'));
    if (voltar && voltaTa) voltaTa.focus({ preventScroll: true });
  }
  function abrirNoCursor(focar) {
    const k = A() && A().visivel(); if (!k || !C[k]) return;
    const ta = C[k].ta;
    if (!prefs.marcas) { A().dica('As marcas no texto estão desligadas. Ligue em Acessibilidade › Marcar no texto.'); return; }
    if (!abrirEm(k, ta.selectionStart, focar)) A().dica('Não há marca no cursor. Use Alt+Shift+N para ir ao próximo item.');
  }

  /* ---------------------------- Rodapé e interruptores ---------------------------- */
  function montarRodape(k) {
    const c = C[k], st = c.box.querySelector('.mde-st'); if (!st) return;
    c.rod = document.createElement('button'); c.rod.type = 'button'; c.rod.className = 'st-la'; c.rod.hidden = true;
    c.rod.addEventListener('click', e => { e.stopPropagation(); A().abrir(k); });
    // o editor reescreve o rodapé a cada tecla: devolve o resumo ao fim
    new MutationObserver(() => { if (!MQ_RODAPE.matches && c.rod.parentNode !== st) st.append(c.rod); }).observe(st, { childList: true });
    if (!MQ_RODAPE.matches) st.append(c.rod);
  }
  function atualizarRodape(k) {
    const c = C[k], st = A().estado(k); if (!c || !c.rod) return;
    const n = st.resultado ? st.resultado.resumo.corrigir : 0;
    c.rod.hidden = !st.resultado || MQ_RODAPE.matches;
    c.rod.classList.toggle('ok', !n);
    c.rod.textContent = n ? 'Acessibilidade: ' + plural(n, 'para corrigir', 'para corrigir') : 'Acessibilidade: nada para corrigir';
    c.rod.title = 'Abrir o painel Acessibilidade (Alt+Shift+C)';
  }
  function montarInterruptores(k) {
    const st = A().estado(k), rod = st.painel.querySelector('.la-rod'); if (!rod || rod.querySelector('[data-la-marcas]')) return;
    const l1 = document.createElement('label'); l1.className = 'la-sw';
    l1.innerHTML = '<input type="checkbox" role="switch" data-la-marcas> Marcar no texto';
    const l2 = document.createElement('label'); l2.className = 'la-sw';
    l2.innerHTML = '<input type="checkbox" role="switch" data-la-marcas-sug> Marcar também as sugestões';
    rod.prepend(l1, l2);
    sincronizar();
  }
  function sincronizar() {
    document.querySelectorAll('[data-la-marcas]').forEach(i => { i.checked = prefs.marcas; });
    document.querySelectorAll('[data-la-marcas-sug]').forEach(i => { i.checked = prefs.sug; i.disabled = !prefs.marcas; });
  }
  document.addEventListener('change', e => {
    const t = e.target; if (!t.matches) return;
    if (t.matches('[data-la-marcas]')) { prefs.marcas = t.checked; gravar(CH.marcas, t.checked); }
    else if (t.matches('[data-la-marcas-sug]')) { prefs.sug = t.checked; gravar(CH.sug, t.checked); }
    else return;
    sincronizar(); if (!prefs.marcas) fecharBalao(false);
    Object.keys(C).forEach(desenhar);
    anunciar(prefs.marcas ? 'Marcas no texto ligadas' + (prefs.sug ? ', com sugestões.' : ', só o que é para corrigir.') : 'Marcas no texto desligadas.');
  });

  /* ---------------------------- Início ---------------------------- */
  document.addEventListener('acessibilidade:resultado', e => { const k = e.detail && e.detail.k; montar(k); desenhar(k); });
  document.addEventListener('acessibilidade:item', e => { const { k, i } = e.detail || {}; if (C[k]) { const st = A().estado(k), d = st.resultado.diagnosticos[i]; if (d && (d.nivel === 'corrigir' || prefs.sug)) mostrar(k, i, false); } });
  if (MQ_RODAPE.addEventListener) MQ_RODAPE.addEventListener('change', () => Object.keys(C).forEach(k => { const c = C[k], st = c.box.querySelector('.mde-st'); if (!MQ_RODAPE.matches && st && c.rod.parentNode !== st) st.append(c.rod); else if (MQ_RODAPE.matches) c.rod.remove(); atualizarRodape(k); }));
  const iniciar = () => ['g', 's'].forEach(k => { if (A()) montar(k); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(iniciar, 0)); else setTimeout(iniciar, 0);
  window.MarcasTexto = { atualizar: k => desenhar(k), abrirNoCursor, fecharBalao: () => fecharBalao(true), ligado: () => prefs.marcas };
})();
