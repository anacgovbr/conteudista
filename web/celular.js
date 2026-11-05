/* =====================================================================================
   Conteudista — Editor no celular (1.79)
   Em telas de até 700 px:
   - Barra do editor em até duas linhas. Linha 1: Desfazer, Refazer, Negrito, Itálico e três
     "caixas" (menus): Formatar (títulos, código e listas), Inserir e Mais. Linha 2: modos Editar · Dividido · Prévia.
     Os botões originais continuam no lugar (escondidos) e cada item do menu aciona o original:
     atalhos, desfazer e os demais módulos seguem funcionando.
   - Contagem do texto em uma linha; tocar mostra os detalhes.
   - "Imagens do texto" fica recolhida e abre como folha inferior por Inserir › Imagens do texto.
   Padrão gov.br: menu suspenso (Dropdown) com itens de ícone + texto, alvos de 44 px, foco visível.
   Acessibilidade: aria-haspopup/expanded, setas, Home/End, Esc devolve o foco (WCAG 2.1.1, 2.4.3,
   2.5.8, 4.1.2). Ligar/desligar: web/config/opcoes.yaml, seção celular.
   ===================================================================================== */
(function () {
  'use strict';
  if (!window.matchMedia) return;
  const MQ = matchMedia('(max-width: 700px)');
  const op = (c, padrao) => (window.Opcoes ? Opcoes.ligado(c) : padrao);
  const BARRA = op('celular.barra_compacta', true), IMAGENS = op('celular.imagens_recolhidas', true);
  if (!BARRA && !IMAGENS) return;

  /* ---------------------------- Estilos ---------------------------- */
  const css = document.createElement('style'); css.id = 'mv-css';
  css.textContent = `
@media (max-width:700px){
.mde-tb.mv-tb{display:flex;flex-wrap:wrap;gap:2px;padding:4px}
.mde-tb.mv-tb>:not(.mv-keep):not(.mv-grp):not(.mv-quebra){display:none!important}
.mde-tb.mv-tb>.mv-keep,.mde-tb.mv-tb>.mv-grp{flex:1 1 0;min-width:32px;max-width:64px}
.mde-tb.mv-tb>.mv-keep,.mde-tb.mv-tb .mv-bt{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:2px;margin:0;padding:0 2px}
.mde-tb.mv-tb .mv-bt{width:100%;font:700 14px "Segoe UI",Arial,sans-serif}
.mde-tb.mv-tb>.mv-grp{display:inline-flex}
.mde-tb.mv-tb .mv-bt .mv-car{width:10px;height:10px;stroke-width:2.5}
.mde-tb.mv-tb .mv-bt[aria-expanded="true"]{background:#dbe8fb!important;border-color:#1351b4!important}
.mde-tb.mv-tb .mv-quebra{flex-basis:100%;height:0}
.mde-tb.mv-tb>[data-m]{max-width:none;min-height:40px}
.mde-tb.mv-tb [data-m]::after{content:attr(data-mv-rot);font:600 13px "Segoe UI",Arial,sans-serif;margin-left:6px}
.mde.mv-on .mde-st{flex-wrap:nowrap;white-space:nowrap;overflow:hidden;gap:10px;min-height:28px;align-items:center;cursor:pointer}
.mde.mv-on .mde-st>span{flex:0 0 auto}
.mde.mv-on .mde-st .st-img,.mde.mv-on .mde-st .st-esp{display:none}
.mde.mv-on .mde-st .st-kb{flex:0 1 auto;overflow:hidden;text-overflow:ellipsis}
.mde.mv-on .mde-st::after{content:'\\25B8';margin-left:auto;padding-left:6px;color:#1351b4}
.mde.mv-on .mde-st.mv-aberto{flex-wrap:wrap;white-space:normal}
.mde.mv-on .mde-st.mv-aberto .st-img{display:inline}
.mde.mv-on .mde-st.mv-aberto::after{content:'\\25BE'}
.mde.mv-img .mde-gal:not(.mv-folha){display:none}
}
.mv-menu{position:fixed;z-index:1960;min-width:220px;max-width:calc(100vw - 16px);overflow:auto;padding:6px;margin:0;background:#fff;border:1px solid #888888;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.mv-menu[hidden]{display:none}
.mv-menu .mv-it{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;margin:0;padding:0 12px;border:0;border-radius:6px;background:#fff;color:#1351b4;font:600 15px "Segoe UI",Roboto,Arial,sans-serif;text-align:left;cursor:pointer}
.mv-menu .mv-it:hover,.mv-menu .mv-it:focus{background:#edf5ff}
.mv-menu .mv-it:focus-visible{outline:3px solid #ffcd07;outline-offset:-3px}
.mv-menu .mv-it[aria-disabled="true"]{color:#888888;cursor:default}
.mv-menu .mv-it .mv-ic{flex:0 0 24px;display:inline-flex;justify-content:center;color:#333333;font-weight:700}
.mv-menu .mv-it svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mv-menu .mv-it .mv-at{margin-left:auto;padding-left:12px;color:#636363;font-weight:400;font-size:12.5px}
.mv-menu .mv-sep{height:1px;margin:4px 6px;background:#cccccc}
.mv-fundo{position:fixed;inset:0;z-index:1490;background:rgba(0,0,0,.5)}
.mde-gal.mv-folha{position:fixed;left:0;right:0;bottom:0;z-index:1500;max-height:82vh;overflow:auto;border-radius:16px 16px 0 0;box-shadow:0 -8px 24px rgba(0,0,0,.3);padding-bottom:env(safe-area-inset-bottom)}
.mde-gal.mv-folha>summary{position:sticky;top:0;z-index:1;background:#f8f8f8;padding:10px 12px;cursor:default}
.mde-gal.mv-folha>summary::before{display:none}
.mv-fecha{display:flex;justify-content:flex-end;padding:0 12px 6px}
.mv-fecha button{min-height:44px}
html.contraste .mv-menu{background:#000;border-color:#fff}
html.contraste .mv-menu .mv-it{background:#000;color:#ff0}
html.contraste .mv-menu .mv-it .mv-ic{color:#fff}
`;
  document.head.appendChild(css);

  /* ---------------------------- Classificação dos botões ---------------------------- */
  const rot = el => (el.getAttribute('title') || el.dataset.dica || el.getAttribute('aria-label') || el.textContent || '').trim();
  const nomeCurto = t => t.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+—.*$/, '').trim();
  const atalho = t => { const m = t.match(/\(([^)]*(Ctrl|Alt|Esc)[^)]*)\)\s*$/); return m ? m[1] : ''; };
  const MANTER = /^(Desfazer|Refazer|Negrito|It[aá]lico)\b/;
  const GRUPOS = [
    { id: 'fmt', rotulo: 'Títulos, código e listas', curto: 'H', re: /^(T[ií]tulo [123]|C[oó]digo|Lista|Checklist)/ },
    { id: 'ins', rotulo: 'Inserir', icone: 'plus', re: /^(Link \(|Imagem|Tabela|Caixa|Fluxo|Novo slide|Marcar slide|Notas do apresentador|Separador|Modelo de exerc)/ },
    { id: 'mais', rotulo: 'Mais opções', icone: 'mais', re: null },
  ];
  const SVG = {
    car: '<svg class="mv-car" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>',
    mais: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    img: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/></svg>',
  };
  const ROT_MODO = { e: 'Editar', s: 'Dividido', p: 'Prévia' };
  function grupoDe(el) {
    if (el.matches('.mv-grp,.mv-quebra,.sep,.sp')) return null;
    if (el.matches('[data-m]')) return 'modo';
    const t = rot(el);
    if (el.tagName === 'BUTTON' && MANTER.test(t)) return 'manter';
    for (const g of GRUPOS) if (g.re && g.re.test(t)) return g.id;
    return el.matches('button,select') ? 'mais' : null;
  }

  /* ---------------------------- Menu (padrão Dropdown) ---------------------------- */
  let aberto = null;
  function itensDe(tb, gid) {
    const l = [];
    [...tb.children].forEach(el => {
      if (grupoDe(el) !== gid) return;
      if (el.tagName === 'SELECT') {
        [...el.options].forEach((o, k) => { if (k > 0) l.push({ nome: 'Caixa: ' + o.text, ic: '❝', fazer: () => { el.selectedIndex = k; el.dispatchEvent(new Event('change', { bubbles: true })); } }); });
        return;
      }
      const t = rot(el), svg = el.querySelector('svg');
      let ic = svg ? svg.outerHTML : (el.textContent || '').trim().slice(0, 2);
      if (/^T[ií]tulo ([123])/.test(t)) ic = 'H' + t.match(/^T[ií]tulo ([123])/)[1];
      l.push({ nome: nomeCurto(t), at: atalho(t), ic, des: el.disabled, fazer: () => el.click() });
    });
    if (gid === 'ins' && IMAGENS) {
      const box = tb.closest('.mde'), gal = box && box.querySelector('.mde-gal');
      if (gal) { const n = ((gal.querySelector('.gc') || {}).textContent || '').replace(/\D/g, '') || '0'; l.push('sep', { nome: 'Imagens do texto (' + n + ')', ic: SVG.img, fazer: () => abrirFolha(gal) }); }
    }
    return l;
  }
  function abrirMenu(bt, foco) {
    fecharMenu(false);
    const tb = bt.closest('.mde-tb'), menu = bt._mvMenu, itens = itensDe(tb, bt.dataset.g);
    menu.innerHTML = ''; const els = [];
    itens.forEach(it => {
      if (it === 'sep') { const s = document.createElement('div'); s.className = 'mv-sep'; s.setAttribute('role', 'separator'); menu.append(s); return; }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mv-it'; b.setAttribute('role', 'menuitem'); b.tabIndex = -1;
      b.innerHTML = '<span class="mv-ic" aria-hidden="true">' + it.ic + '</span><span>' + it.nome.replace(/[<&]/g, c => c === '<' ? '&lt;' : '&amp;') + '</span>' + (it.at ? '<span class="mv-at" aria-hidden="true">' + it.at + '</span>' : '');
      if (it.des) b.setAttribute('aria-disabled', 'true');
      b.addEventListener('click', () => { if (it.des) return; fecharMenu(false); it.fazer(); });
      menu.append(b); els.push(b);
    });
    menu.hidden = false; bt.setAttribute('aria-expanded', 'true'); aberto = { bt, menu, els };
    posicionar(bt, menu);
    const alvo = foco === 'ultimo' ? els[els.length - 1] : els[0]; if (alvo) alvo.focus({ preventScroll: true });
  }
  function posicionar(bt, menu) {
    const r = bt.getBoundingClientRect(), w = Math.min(Math.max(menu.offsetWidth, 220), innerWidth - 16);
    let x = r.left; if (x + w > innerWidth - 8) x = Math.max(8, innerWidth - 8 - w);
    let y = r.bottom + 4; const livre = innerHeight - y - 8;
    if (livre < 200 && r.top > livre) { menu.style.maxHeight = (r.top - 12) + 'px'; y = Math.max(8, r.top - 4 - Math.min(menu.scrollHeight, r.top - 12)); }
    else menu.style.maxHeight = livre + 'px';
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
  }
  function fecharMenu(devolver) {
    if (!aberto) return; const a = aberto; aberto = null;
    a.menu.hidden = true; a.bt.setAttribute('aria-expanded', 'false');
    if (devolver) a.bt.focus();
  }
  document.addEventListener('pointerdown', e => { if (aberto && !aberto.menu.contains(e.target) && !aberto.bt.contains(e.target)) fecharMenu(false); }, true);
  addEventListener('resize', () => fecharMenu(false));
  addEventListener('scroll', e => {   // o menu acompanha o botão; some só se o botão sair da tela
    if (!aberto || aberto.menu.contains(e.target)) return;
    const r = aberto.bt.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) fecharMenu(false); else posicionar(aberto.bt, aberto.menu);
  }, true);

  function teclasMenu(e) {
    if (!aberto) return; const l = aberto.els, i = l.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharMenu(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); l[(i + 1) % l.length].focus({ preventScroll: false }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); l[(i - 1 + l.length) % l.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); l[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); l[l.length - 1].focus(); }
    else if (e.key === 'Tab') fecharMenu(false);
  }

  /* ---------------------------- Montar / desmontar ---------------------------- */
  function montar(tb) {
    if (tb.classList.contains('mv-tb')) return;
    const box = tb.closest('.mde'); if (!box) return;
    if (BARRA) {
      tb.classList.add('mv-tb');
      const mk = (g, ordem) => {
        const w = document.createElement('span'); w.className = 'mv-grp'; w.style.order = ordem;
        const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'mv-bt'; bt.dataset.g = g.id;
        bt.setAttribute('aria-haspopup', 'menu'); bt.setAttribute('aria-expanded', 'false'); bt.setAttribute('aria-label', g.rotulo);
        const id = 'mvM-' + g.id + '-' + Math.random().toString(36).slice(2, 7); bt.setAttribute('aria-controls', id);
        bt.innerHTML = (g.icone ? SVG[g.icone] : '') + (g.curto ? '<span aria-hidden="true">' + g.curto + '</span>' : '') + SVG.car;
        const m = document.createElement('div'); m.className = 'mv-menu'; m.id = id; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', g.rotulo); m.hidden = true;
        m.addEventListener('keydown', teclasMenu);
        bt.addEventListener('click', () => (aberto && aberto.bt === bt) ? fecharMenu(true) : abrirMenu(bt));
        bt.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); abrirMenu(bt, e.key === 'ArrowUp' ? 'ultimo' : 'primeiro'); } });
        w.append(bt); document.body.append(m);
        bt._mvMenu = m;
        return w;
      };
      const q = document.createElement('span'); q.className = 'mv-quebra'; q.style.order = 50; q.setAttribute('aria-hidden', 'true');
      let ordem = 1;
      [...tb.children].forEach(el => {
        const g = grupoDe(el);
        if (g === 'manter') { el.classList.add('mv-keep'); el.style.order = ordem++; }
        else if (g === 'modo') { el.classList.add('mv-keep'); el.style.order = 60 + ('esp'.indexOf(el.dataset.m) + 1); el.dataset.mvRot = ROT_MODO[el.dataset.m] || ''; }
      });
      GRUPOS.forEach((g, k) => tb.append(mk(g, 10 + k)));
      tb.append(q);
    }
    if (IMAGENS) box.classList.add('mv-img');
    box.classList.add('mv-on');
    const st = box.querySelector('.mde-st');
    if (st && !st.dataset.mv) {
      st.dataset.mv = '1';
      const alterna = () => { if (!box.classList.contains('mv-on')) return; const ab = st.classList.toggle('mv-aberto'); st.setAttribute('aria-expanded', ab ? 'true' : 'false'); };
      st.addEventListener('click', alterna);
      st.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && box.classList.contains('mv-on')) { e.preventDefault(); alterna(); } });
    }
    if (st) { st.setAttribute('role', 'button'); st.tabIndex = 0; st.setAttribute('aria-expanded', st.classList.contains('mv-aberto') ? 'true' : 'false'); st.setAttribute('aria-description', 'Contagem do texto. Toque para ver os detalhes.'); }
  }
  function desmontar(tb) {
    const box = tb.closest('.mde');
    fecharMenu(false);
    tb.classList.remove('mv-tb');
    tb.querySelectorAll('.mv-grp,.mv-quebra').forEach(x => { const b = x.querySelector('.mv-bt'); if (b) { const m = document.getElementById(b.getAttribute('aria-controls')); if (m) m.remove(); } x.remove(); });
    [...tb.children].forEach(el => { el.classList.remove('mv-keep'); el.style.order = ''; delete el.dataset.mvRot; });
    if (box) {
      box.classList.remove('mv-on', 'mv-img');
      const st = box.querySelector('.mde-st'); if (st) { st.removeAttribute('role'); st.removeAttribute('tabindex'); st.removeAttribute('aria-expanded'); st.removeAttribute('aria-description'); st.classList.remove('mv-aberto'); }
      const gal = box.querySelector('.mde-gal'); if (gal && gal.classList.contains('mv-folha')) fecharFolha(gal);
    }
  }
  function aplicar() { document.querySelectorAll('.mde > .mde-tb').forEach(tb => (MQ.matches ? montar(tb) : desmontar(tb))); }

  /* ---------------------------- Imagens do texto como folha inferior ---------------------------- */
  let folha = null;
  function abrirFolha(gal) {
    if (folha) return;
    const volta = document.activeElement, fundo = document.createElement('div'); fundo.className = 'mv-fundo';
    const fecha = document.createElement('div'); fecha.className = 'mv-fecha';
    fecha.innerHTML = '<button type="button" class="sec mini">Fechar <span aria-hidden="true">\u2715</span></button>';
    gal.querySelector('summary').after(fecha);
    gal.open = true; gal.classList.add('mv-folha');
    gal.setAttribute('role', 'dialog'); gal.setAttribute('aria-modal', 'true'); gal.setAttribute('aria-label', 'Imagens do texto');
    document.body.append(fundo); document.body.style.overflow = 'hidden';
    const sum = gal.querySelector('summary');
    const travar = e => { if (e.target === sum || (e.target.closest && e.target.closest('summary') === sum && !e.target.closest('select,button'))) e.preventDefault(); };
    const tecla = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
      else if (e.key === 'Tab') {
        const f = [...gal.querySelectorAll('button,select,input,[tabindex="0"]')].filter(x => !x.disabled && x.offsetParent !== null);
        if (!f.length) return; const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    const fechar = (viaVoltar) => {
      if (!folha) return; folha = null;
      sum.removeEventListener('click', travar); gal.removeEventListener('keydown', tecla); removeEventListener('popstate', aoVoltar);
      fecha.remove(); fundo.remove(); document.body.style.overflow = '';
      gal.classList.remove('mv-folha'); gal.open = false; ['role', 'aria-modal', 'aria-label'].forEach(a => gal.removeAttribute(a));
      if (!viaVoltar) { try { if (history.state && history.state.mvFolha) history.back(); } catch (e) { /* */ } }
      const ta = gal.closest('.mde') && gal.closest('.mde').querySelector('.mde-ta');
      if (volta && volta.isConnected && volta.offsetParent !== null) volta.focus(); else if (ta) ta.focus();
    };
    const aoVoltar = () => fechar(true);
    sum.addEventListener('click', travar); gal.addEventListener('keydown', tecla);
    fecha.querySelector('button').addEventListener('click', () => fechar(false));
    fundo.addEventListener('click', () => fechar(false));
    try { history.pushState({ mvFolha: 1 }, ''); addEventListener('popstate', aoVoltar); } catch (e) { /* */ }
    folha = { gal, fechar };
    fecha.querySelector('button').focus();
  }
  function fecharFolha() { if (folha) folha.fechar(false); }

  /* ---------------------------- Início ---------------------------- */
  const iniciar = () => {
    aplicar();
    if (MQ.addEventListener) MQ.addEventListener('change', aplicar); else if (MQ.addListener) MQ.addListener(aplicar);
    // barras criadas depois (outros módulos) também entram
    new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches('.mde') || n.querySelector && n.querySelector('.mde'))))) aplicar(); })
      .observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else setTimeout(iniciar, 0);
  window.EditorCelular = { aplicar, fecharMenu, fecharFolha };
})();
