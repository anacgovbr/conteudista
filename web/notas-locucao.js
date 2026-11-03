/* =====================================================================================
   Conteudista - Locução › Notas dos slides (1.74)

   A aba Locução passa a ter dois modos:
     - "Notas dos slides": edita a narração slide a slide, ligada ao Markdown da aba Apresentação;
     - "Texto livre": o modo anterior (qualquer texto em fala), sem mudanças.

   MODELO (o Markdown é a única fonte de verdade)
   1. "Importar notas" cria um RASCUNHO separado: um item por slide, com o texto da nota
      (<!-- notas: ... -->) e da narração (<!-- narracao: ... -->). O rascunho fica guardado neste
      navegador (localStorage) e sobrevive a recarregar a página.
   2. Nada muda nos slides até "Aplicar à apresentação". Só os slides alterados são gravados, e uma
      versão "Antes de aplicar as notas da Locução" é guardada em Versões antes.
   3. Estados por slide: Editada, Nova nota, Conflito (a nota mudou na apresentação E no rascunho),
      Atualizada pela apresentação (mudou só na apresentação: o rascunho acompanha sozinho).
   4. Cada slide grava em "Nota do apresentador" (aparece no slide e é narrada), em "Só narração"
      (<!-- narracao: texto -->, fala diferente da nota) ou fica "Sem narração" (<!-- narracao: nao -->).
   5. Versões: abre a MESMA janela de comparação, no documento "Notas dos slides"; com alterações
      pendentes, compara o texto atual com "Rascunho da Locução (não aplicado)".
   6. Compartilhar link: abre a MESMA janela de link. O link leva o Markdown; se houver alterações
      não aplicadas, pergunta antes se deve aplicá-las (senão elas não vão no link).
   Regras de leitura dos slides: as mesmas de tools/gerador.py (split_slides e notas_para_narracao).
   API: window.NotasSlides = { texto(md), temRascunho(), sComRascunho(), abrir(), importar() }
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const sec = $('secLoc'), sTa = $('s'), L = window.Locucao;
  if (!sec || !sTa || !L) return;

  const CHAVE = 'conteudista.locucao.notas', CHAVE_MODO = 'conteudista.locucao.modo';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const anunciar = m => { try { if (window.UXFeedback && UXFeedback.anunciar) UXFeedback.anunciar(m); } catch (e) { /* sem anúncio */ } };
  const confirmar = (b, m) => { try { if (window.UXFeedback && UXFeedback.confirmar) UXFeedback.confirmar(b, m); } catch (e) { /* sem feedback */ } };
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch (e) { /* sem log */ } };

  /* ---------------------------- Leitura e escrita do Markdown ---------------------------- */
  const RX_NOTA = /<!--\s*notas:\s*([\s\S]*?)-->/;
  const RX_NARR = /<!--\s*narra[cç][aã]o:\s*([\s\S]*?)-->/i;
  const NAO = /^(nao|não|no|off|0|-)$/i;
  const t = s => String(s || '').trim();
  const eq = (a, b) => t(a) === t(b);
  function partes(md) {
    md = md || ''; let fm = '';
    const m = md.match(/^---\n[\s\S]*?\n---\n/); if (m) { fm = m[0]; md = md.slice(fm.length); }
    return { fm, pp: md.split(/(\n---\s*\n)/) };          // [trecho, separador, trecho, ...]
  }
  function titulo(vis, n) {
    const h = vis.match(/^#{1,6}\s+(.+)$/m), l = h ? h[1] : vis.split('\n').find(x => x.trim()) || '';
    const r = l.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`>#]/g, '').trim();
    return (r || 'Slide ' + n).slice(0, 90);
  }
  function analisar(md) {
    const { fm, pp } = partes(md), sl = [];
    for (let i = 0; i < pp.length; i += 2) {
      const seg = pp[i], vis = seg.replace(/<!--[\s\S]*?-->/g, '').trim();
      if (!vis) continue;                                   // trecho só com comentários não vira slide
      const mn = seg.match(RX_NOTA), mx = seg.match(RX_NARR);
      sl.push({ i, t: titulo(vis, sl.length + 1), n: mn ? t(mn[1]) : '', x: mx ? (NAO.test(t(mx[1])) ? 'nao' : t(mx[1])) : '' });
    }
    return { fm, pp, sl };
  }
  const seguro = s => t(s).replace(/-->/g, '->');
  function acrescentar(seg, c) { const fim = seg.match(/\s*$/)[0]; return seg.slice(0, seg.length - fim.length) + '\n\n' + c + fim; }
  function escrever(seg, n, x) {
    if (t(n)) { const c = '<!-- notas: ' + seguro(n) + ' -->'; seg = RX_NOTA.test(seg) ? seg.replace(RX_NOTA, () => c) : acrescentar(seg, c); }
    else seg = seg.replace(/\n*[ \t]*<!--\s*notas:\s*[\s\S]*?-->[ \t]*/, '');
    if (t(x)) {
      const c = '<!-- narracao: ' + (x === 'nao' ? 'nao' : seguro(x)) + ' -->';
      if (RX_NARR.test(seg)) seg = seg.replace(RX_NARR, () => c);
      else if (RX_NOTA.test(seg)) seg = seg.replace(RX_NOTA, m => m + '\n' + c);
      else seg = acrescentar(seg, c);
    } else seg = seg.replace(/\n*[ \t]*<!--\s*narra[cç][aã]o:\s*[\s\S]*?-->[ \t]*/i, '');
    return seg;
  }
  function montar(md, mud) {                                // mud: Map(índice do slide -> {n, x})
    const A = analisar(md);
    mud.forEach((v, k) => { const s = A.sl[k]; if (s) A.pp[s.i] = escrever(A.pp[s.i], v.n, v.x); });
    return A.fm + A.pp.join('');
  }
  /* Texto para comparar versões: uma seção por slide, com a nota e a narração */
  function texto(md) {
    return analisar(md).sl.map((s, k) => '## Slide ' + (k + 1) + ' · ' + s.t + '\n' +
      (s.n ? 'Nota: ' + s.n : 'Nota: (sem nota)') + (s.x ? '\nNarração: ' + (s.x === 'nao' ? '(sem narração)' : s.x) : '')).join('\n\n');
  }

  /* ---------------------------- Rascunho ---------------------------- */
  let R = null;                                             // { itens: [{t, bn, bx, dn, dx, px, mk}] }
  try { const j = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (j && Array.isArray(j.itens)) R = j; } catch (e) { R = null; }
  let tGrava = null;
  function gravar() { clearTimeout(tGrava); tGrava = setTimeout(() => { try { if (R) localStorage.setItem(CHAVE, JSON.stringify(R)); else localStorage.removeItem(CHAVE); } catch (e) { /* cheio ou bloqueado */ } }, 300); }
  const atual = () => analisar(sTa.value).sl;
  const mesmaEstrutura = cur => !!R && cur.length === R.itens.length && cur.every((c, k) => c.t === R.itens[k].t);
  function estado(it, c) {
    const desCur = eq(it.dn, c.n) && eq(it.dx, c.x), baseCur = eq(it.bn, c.n) && eq(it.bx, c.x), desBase = eq(it.dn, it.bn) && eq(it.dx, it.bx);
    if (desCur) { if (!baseCur) { it.bn = c.n; it.bx = c.x; } return it.mk ? 'mk' : ''; }
    if (desBase) { it.bn = it.dn = c.n; it.bx = it.dx = c.x; it.mk = true; return 'mk'; }   // mudou só na apresentação: acompanha
    if (baseCur) return t(it.bn) || t(it.bx) ? 'ed' : 'nv';
    return 'cf';
  }
  function resumo() {
    const cur = atual(), r = { pend: 0, cf: 0, estr: !mesmaEstrutura(cur), cur };
    if (!R || r.estr) return r;
    R.itens.forEach((it, k) => { const e = estado(it, cur[k]); if (e === 'ed' || e === 'nv' || e === 'cf') r.pend++; if (e === 'cf') r.cf++; });
    return r;
  }
  function importar(manter) {
    const cur = atual(), velho = R, novos = cur.map(c => ({ t: c.t, bn: c.n, bx: c.x, dn: c.n, dx: c.x }));
    let kept = 0, lost = 0;
    if (manter && velho) {
      const conta = (l, ti) => l.filter(x => x.t === ti).length;
      velho.itens.forEach(o => {
        if (eq(o.dn, o.bn) && eq(o.dx, o.bx)) return;      // sem edição
        const k = novos.findIndex(x => x.t === o.t);
        if (k > -1 && conta(novos, o.t) === 1 && conta(velho.itens, o.t) === 1) { novos[k].dn = o.dn; novos[k].dx = o.dx; novos[k].px = o.px; kept++; } else lost++;
      });
    }
    R = { itens: novos }; gravar();
    return { n: cur.filter(c => c.n || c.x).length, total: cur.length, kept, lost };
  }
  const falado = it => it.dx && it.dx !== 'nao' ? it.dx : it.dn;
  const alvo = it => it.dx && it.dx !== 'nao' ? 'x' : 'n';
  function sComRascunho() {
    if (!R) return sTa.value;
    const cur = atual(); if (!mesmaEstrutura(cur)) return sTa.value;
    const mud = new Map();
    R.itens.forEach((it, k) => { const e = estado(it, cur[k]); if (e === 'ed' || e === 'nv' || e === 'cf') mud.set(k, { n: it.dn, x: it.dx }); });
    return montar(sTa.value, mud);
  }

  /* ---------------------------- Estilos ---------------------------- */
  const st = document.createElement('style');
  st.textContent = `
#secLoc .ln-modo{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 14px}
#secLoc .ln-modo button{margin:0;min-height:40px;border-radius:100em}
#secLoc .ln-modo button[aria-pressed="false"]{background:#fff;color:#1351b4;border:1px solid #1351b4}
#secLoc .ln-modo button[aria-pressed="true"]{background:#1351b4;color:#fff;border:1px solid #1351b4}
#locNotas{border:1px solid #cccccc;border-radius:10px;padding:14px 16px;background:#f8f8f8;margin-bottom:14px}
#locNotas[hidden]{display:none}
#locNotas>h3{margin:0 0 4px;color:#0c326f;font-size:15px}
#locNotas .ln-int{font-size:13.5px;color:#333;margin:0 0 10px}
#locNotas .ln-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#fff;border:1px solid #cccccc;border-radius:8px;padding:8px 10px;margin:0 0 10px}
#locNotas .ln-bar button{margin:0;display:inline-flex;align-items:center;gap:6px}
#locNotas .ln-bar svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#locNotas .ln-sp{flex:1 1 auto}
#locNotas .ln-cont{font-size:13px;color:#333}#locNotas .ln-cont b{color:#8a1c0e}
#locNotas .ln-msg{font-size:13px;padding:8px 10px;border-radius:0 6px 6px 0;margin:0 0 10px;border-left:4px solid #1351b4;background:#d4e5ff;color:#0c326f}
#locNotas .ln-msg.ok{background:#e3f5e1;border-left-color:#168821;color:#14532d}
#locNotas .ln-msg.wa{background:#fff5c2;border-left-color:#8a5c00;color:#5c4400}
#locNotas .ln-msg.er{background:#fde0db;border-left-color:#e52207;color:#8a1c0e}
#locNotas .ln-msg:empty{display:none}
#locNotas .ln-perg{background:#fff;border:2px solid #1351b4;border-radius:8px;padding:10px 12px;margin:0 0 10px}
#locNotas .ln-perg[hidden]{display:none}#locNotas .ln-perg p{margin:0 0 8px;font-size:13.5px}
#locNotas .ln-perg .b{display:flex;flex-wrap:wrap;gap:8px}#locNotas .ln-perg button{margin:0}
#locNotas ol.ln-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
#locNotas .ln-it{background:#fff;border:1px solid #cccccc;border-left:4px solid #cccccc;border-radius:8px;padding:10px 12px}
#locNotas .ln-it.ed{border-left-color:#1351b4}#locNotas .ln-it.cf{border-left-color:#e52207}#locNotas .ln-it.off{background:#fbfbfb}
#locNotas .ln-ch{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;margin:0 0 6px}
#locNotas .ln-ch h4{margin:0;font-size:14px;color:#1b2430}#locNotas .ln-num{color:#636363;font-weight:700;margin-right:4px}
#locNotas .ln-tag{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:100em;background:#eeeeee;color:#333}
#locNotas .ln-tag.ed{background:#dbe8fb;color:#0c326f}#locNotas .ln-tag.nv{background:#e3f5e1;color:#14532d}
#locNotas .ln-tag.cf{background:#fde0db;color:#8a1c0e}#locNotas .ln-tag.mk{background:#fff5c2;color:#5c4400}
#secLoc #locNotas textarea{width:100%;height:auto;min-height:74px;padding:8px 10px;border:1px solid #888888;border-radius:6px;font:14px/1.5 "Segoe UI",Roboto,Arial,sans-serif;resize:vertical;background:#fff}
#secLoc #locNotas textarea:disabled{background:#f3f3f3;color:#636363}
#locNotas fieldset{border:0;margin:6px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:13px}
#locNotas legend{float:left;margin-right:6px;padding:0;font-size:13px;font-weight:600;color:#0c326f}
#locNotas fieldset label{display:inline-flex;gap:5px;align-items:center;min-height:32px;cursor:pointer;font-weight:400;color:#333;font-size:13px;margin:0}
#locNotas fieldset .ln-ouv{margin:0 0 0 auto}
#locNotas .ln-cf{margin-top:8px;padding:8px 10px;background:#fff5f2;border:1px solid #f3b8ad;border-radius:6px;font-size:13px}
#locNotas .ln-cf q{font-style:italic}#locNotas .ln-cf .b{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}#locNotas .ln-cf button{margin:0}
#locNotas .ln-ouvir{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}#locNotas .ln-ouvir audio{flex:1 1 260px;min-width:0;margin:0}
#locNotas .ln-ouvir[hidden]{display:none}
#locNotas .vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#secLoc.ln-ativo .ln-livre{display:none!important}
@media(max-width:700px){#locNotas{padding:12px}#locNotas .ln-bar .ln-rl{display:none}#locNotas fieldset .ln-ouv{margin-left:0}}
@media(forced-colors:active){#locNotas .ln-it,#locNotas .ln-tag{border:1px solid CanvasText}}`;
  document.head.appendChild(st);

  /* ---------------------------- Estrutura ---------------------------- */
  const ICO = {
    ver: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/><path d="M5.5 9h3M5.5 13h3M15.5 9h3M15.5 13h3"/></svg>',
    lnk: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    imp: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'
  };
  const modo = document.createElement('div'); modo.className = 'ln-modo'; modo.setAttribute('role', 'group'); modo.setAttribute('aria-label', 'O que narrar');
  modo.innerHTML = '<button type="button" data-c="1" data-modo="notas" aria-pressed="true">Notas dos slides</button><button type="button" data-c="1" data-modo="livre" aria-pressed="false">Texto livre</button>';
  const nota = sec.querySelector(':scope > p.note'); (nota || sec.querySelector('h2')).after(modo);

  const box = document.createElement('section'); box.id = 'locNotas'; box.setAttribute('aria-labelledby', 'lnT');
  box.innerHTML = '<h3 id="lnT">Notas dos slides</h3>' +
    '<p class="ln-int">Edite aqui o que a narração fala em cada slide. As notas ficam no texto da aba <b>Apresentação</b>: <b>Importar notas</b> cria um rascunho e nada muda nos slides até você clicar em <b>Aplicar à apresentação</b>.</p>' +
    '<div class="ln-bar" role="toolbar" aria-label="Notas dos slides"></div>' +
    '<div class="ln-perg" id="lnPerg" role="group" aria-labelledby="lnPergT" hidden><p id="lnPergT"></p><div class="b"></div></div>' +
    '<p class="ln-msg" id="lnMsg" role="status" aria-live="polite"></p>' +
    '<ol class="ln-lista" id="lnLista" aria-label="Slides"></ol>' +
    '<div class="ln-ouvir" id="lnOuvir" hidden><span id="lnOuvirT"></span><audio id="lnAudio" controls preload="none"></audio></div>';
  const grade = sec.querySelector('.loc-grid > div');
  (grade || sec).insertBefore(box, grade ? grade.firstChild : null);
  // Partes do modo "Texto livre" que somem no modo "Notas dos slides" (voz e opções avançadas continuam)
  [($('locTexto') || {}).closest && $('locTexto').closest('details'), ($('locAudio') || {}).closest && $('locAudio').closest('details'), ($('locGerar') || {}).closest && $('locGerar').closest('p'),
    $('locBarC'), $('locSt')].forEach(el => { if (el) el.classList.add('ln-livre'); });

  const bar = box.querySelector('.ln-bar'), lista = $('lnLista'), msgEl = $('lnMsg'), perg = $('lnPerg'), player = $('lnAudio');
  function msg(classe, txt) { delete msgEl.dataset.intro; msgEl.className = 'ln-msg' + (classe ? ' ' + classe : ''); msgEl.textContent = txt || ''; }

  /* ---------------------------- Desenho ---------------------------- */
  const ROT = { ed: 'Editada', nv: 'Nova nota', cf: 'Conflito', mk: 'Atualizada pela apresentação' };
  function desenharBarra(r) {
    const tem = !!R, pend = r.pend, cf = r.cf;
    bar.innerHTML =
      '<button type="button" id="lnImp" data-c="1" class="' + (tem ? 'sec mini' : 'mini') + '">' + ICO.imp + '<span>' + (tem ? 'Importar de novo' : 'Importar notas') + '</span></button>' +
      '<button type="button" id="lnVer" data-c="1" class="sec mini" title="Comparar versões das notas (Alt+Shift+V)">' + ICO.ver + '<span class="ln-rl">Versões</span><span class="vh"> das notas</span></button>' +
      '<button type="button" id="lnLink" data-c="1" class="sec mini" aria-haspopup="dialog" title="Criar um link para continuar em outro computador">' + ICO.lnk + '<span class="ln-rl">Compartilhar link</span><span class="vh"> (compartilhar link)</span></button>' +
      '<span class="ln-sp"></span>' +
      (tem ? '<span class="ln-cont" id="lnCont">' + (r.estr ? 'Slides mudaram' : pend ? pend + (pend === 1 ? ' alteração' : ' alterações') + (cf ? ' · <b>' + cf + (cf === 1 ? ' conflito' : ' conflitos') + '</b>' : '') : 'Sem alterações') + '</span>' +
        '<button type="button" id="lnDesc" data-c="1" class="sec mini"' + (pend ? '' : ' disabled') + '>Descartar</button>' +
        '<button type="button" id="lnApl" class="mini"' + (pend && !cf && !r.estr ? '' : ' disabled') + '>Aplicar à apresentação</button>' : '');
    const v = bar.querySelector('#lnVer'), l = bar.querySelector('#lnLink');
    v.setAttribute('aria-label', 'Versões das notas'); l.setAttribute('aria-label', 'Compartilhar link');
  }
  function item(it, k, c) {
    const e = estado(it, c), off = it.dx === 'nao', a = alvo(it), val = a === 'x' ? it.dx : it.dn;
    const tags = (ROT[e] ? '<span class="ln-tag ' + e + '">' + ROT[e] + '</span>' : '') + (off ? '<span class="ln-tag">Sem narração</span>' : '') +
      (!t(it.dn) && !off && !(a === 'x') ? '<span class="ln-tag">Sem nota</span>' : '');
    return '<li class="ln-it ' + (e === 'cf' ? 'cf' : (e === 'ed' || e === 'nv') ? 'ed' : '') + (off ? ' off' : '') + '" data-k="' + k + '">' +
      '<div class="ln-ch"><h4 id="lnH' + k + '"><span class="ln-num">' + (k + 1) + '</span>' + esc(it.t) + '</h4><span class="ln-tags">' + tags + '</span></div>' +
      '<label class="vh" for="lnTx' + k + '">Texto narrado do slide ' + (k + 1) + ', ' + esc(it.t) + '</label>' +
      '<textarea id="lnTx' + k + '" data-k="' + k + '" spellcheck="true" lang="pt-BR"' + (off ? ' disabled' : '') + ' rows="3" placeholder="Escreva a nota deste slide">' + esc(off ? (it.px || it.dn) : val) + '</textarea>' +
      '<fieldset><legend>Gravar em:</legend>' +
      '<label><input type="radio" name="lnG' + k + '" data-g="' + k + '" value="n"' + (a === 'n' ? ' checked' : '') + (off ? ' disabled' : '') + '> Nota do apresentador</label>' +
      '<label><input type="radio" name="lnG' + k + '" data-g="' + k + '" value="x"' + (a === 'x' ? ' checked' : '') + (off ? ' disabled' : '') + '> Só narração</label>' +
      '<label><input type="checkbox" data-off="' + k + '"' + (off ? ' checked' : '') + '> Sem narração</label>' +
      '<button type="button" class="sec mini ln-ouv" data-c="1" data-ouvir="' + k + '"' + (off || !t(falado(it)) ? ' disabled' : '') + ' aria-describedby="lnH' + k + '">▶ Ouvir</button></fieldset>' +
      (e === 'cf' ? '<div class="ln-cf" role="group" aria-label="Conflito no slide ' + (k + 1) + '">A nota deste slide também mudou na aba Apresentação: <q>' + esc(c.x && c.x !== 'nao' ? c.x : c.n || '(sem nota)') + '</q>' +
        '<div class="b"><button type="button" class="sec mini" data-c="1" data-minha="' + k + '">Manter a minha</button><button type="button" class="sec mini" data-c="1" data-dela="' + k + '">Usar a da apresentação</button></div></div>' : '') +
      '</li>';
  }
  function desenhar() {
    if (box.hidden) return;
    const r = resumo();
    desenharBarra(r);
    if (!R) {
      lista.innerHTML = '';
      if (!msgEl.textContent || msgEl.dataset.intro) msg('', r.cur.length ? 'A apresentação tem ' + r.cur.length + ' slide(s), ' + r.cur.filter(c => c.n || c.x).length + ' com nota. Clique em Importar notas para começar.' : 'A aba Apresentação está vazia. Escreva os slides ou use Carregar exemplo.');
      msgEl.dataset.intro = '1';
      return;
    }
    if (r.estr) {
      lista.innerHTML = '';
      perguntar('Os slides da apresentação mudaram depois da importação (slide incluído, excluído, movido ou com título novo). Atualize a lista: as suas edições são mantidas nos slides de mesmo título.',
        [['Atualizar a lista', () => { const x = importar(true); msg(x.lost ? 'wa' : 'ok', 'Lista atualizada: ' + x.total + ' slide(s).' + (x.kept ? ' ' + x.kept + ' edição(ões) mantida(s).' : '') + (x.lost ? ' ' + x.lost + ' edição(ões) não puderam ser associadas a um slide.' : '')); desenhar(); }, true],
          ['Descartar o rascunho', () => { R = null; gravar(); msg('', 'Rascunho descartado.'); desenhar(); }]], true);
      return;
    }
    if (!perg.dataset.fixa) fecharPergunta();
    lista.innerHTML = R.itens.map((it, k) => item(it, k, r.cur[k])).join('');
    gravar();
  }
  function atualizarItem(k) {                               // sem redesenhar a lista (mantém o foco e o cursor)
    const r = resumo(); desenharBarra(r);
    const li = lista.querySelector('li[data-k="' + k + '"]'); if (!li || r.estr) return;
    const it = R.itens[k], c = r.cur[k], e = estado(it, c), novo = document.createElement('div'); novo.innerHTML = item(it, k, c);
    const nli = novo.firstChild;
    if ((li.querySelector('.ln-cf') ? 'cf' : '') !== (e === 'cf' ? 'cf' : '')) { const ta = li.querySelector('textarea'), p = ta.selectionStart; li.replaceWith(nli); const n = $('lnTx' + k); n.focus(); n.setSelectionRange(p, p); return; }
    li.className = nli.className; li.querySelector('.ln-tags').innerHTML = nli.querySelector('.ln-tags').innerHTML;
    li.querySelector('[data-ouvir]').disabled = nli.querySelector('[data-ouvir]').disabled;
    gravar();
  }

  /* ---------------------------- Pergunta (no lugar de confirm) ---------------------------- */
  function perguntar(txt, botoes, fixa) {
    if (!perg.hidden && $('lnPergT').textContent === txt) return;   // já aberta: não rouba o foco de novo
    $('lnPergT').textContent = txt; const b = perg.querySelector('.b'); b.innerHTML = '';
    botoes.forEach(([rot, fn, prim]) => { const x = document.createElement('button'); x.type = 'button'; x.className = (prim ? '' : 'sec ') + 'mini'; x.setAttribute('data-c', '1'); x.textContent = rot; x.addEventListener('click', () => { fecharPergunta(); fn(); }); b.appendChild(x); });
    perg.hidden = false; if (fixa) perg.dataset.fixa = '1'; else delete perg.dataset.fixa;
    const p = b.querySelector('button'); if (p) p.focus();
  }
  function fecharPergunta() { perg.hidden = true; delete perg.dataset.fixa; }
  perg.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharPergunta(); const b = $('lnImp'); if (b) b.focus(); } });

  /* ---------------------------- Ações ---------------------------- */
  function acaoImportar(btn) {
    const r = resumo();
    const vai = manter => { const x = importar(manter); msg('ok', 'Notas de ' + x.n + ' slide(s) importadas como rascunho (' + x.total + ' slides). A apresentação só muda quando você aplicar.' + (x.kept ? ' ' + x.kept + ' edição(ões) mantida(s).' : '')); anunciar('Notas importadas.'); desenhar(); const p = $('lnTx0'); if (p) p.focus(); else if (btn) btn.focus(); };
    if (R && r.pend) perguntar('Há ' + r.pend + ' alteração(ões) não aplicada(s). Importar de novo:', [['Manter as minhas edições', () => vai(true), true], ['Descartar as edições', () => vai(false)], ['Cancelar', () => { const b = $('lnImp'); if (b) b.focus(); }]]);
    else vai(false);
  }
  async function aplicar(btn) {
    const r = resumo(); if (!R || r.estr || !r.pend) return;
    if (r.cf) { msg('er', 'Resolva os ' + r.cf + ' conflito(s) antes de aplicar.'); return; }
    const mud = new Map();
    R.itens.forEach((it, k) => { const e = estado(it, r.cur[k]); if (e === 'ed' || e === 'nv') mud.set(k, { n: it.dn, x: it.dx }); });
    try { if (window.Hist && Hist.registrar) await Hist.registrar('antes', 'Antes de aplicar as notas da Locução'); } catch (e) { /* segue */ }
    sTa.value = montar(sTa.value, mud);
    sTa.dispatchEvent(new Event('input', { bubbles: true }));       // prévia, autossalvamento e desfazer (Ctrl+Z) do editor
    R.itens.forEach(it => { it.bn = it.dn; it.bx = it.dx; it.mk = false; }); gravar();
    msg('ok', mud.size + ' slide(s) atualizados na apresentação. Para desfazer, use Versões ou Ctrl+Z no editor da Apresentação.');
    logApp('Locução: notas de ' + mud.size + ' slide(s) aplicadas à apresentação.', 'ok');
    desenhar(); const b = $('lnApl'); confirmar(b || btn, 'Notas aplicadas à apresentação.'); if (b) b.focus();
    return mud.size;
  }
  function descartar() {
    perguntar('Descartar as alterações não aplicadas? As notas voltam a ser as da apresentação.', [['Descartar', () => { importar(false); msg('', 'Alterações descartadas.'); desenhar(); const b = $('lnImp'); if (b) b.focus(); }, true], ['Cancelar', () => { const b = $('lnDesc'); if (b) b.focus(); }]]);
  }
  function versoes(btn) {
    if (!window.Hist || !Hist.abrir) return;
    const r = resumo();
    Hist.abrir('n', r.pend && !r.estr ? { a: 'atual', b: 'rasc', foco: btn } : { foco: btn });
  }
  function compartilhar(btn) {
    if (!window.Compartilhar) return;
    const r = resumo();
    if (!R || !r.pend || r.estr) { Compartilhar.abrir(); return; }
    perguntar('O link leva o texto da apresentação. Há ' + r.pend + ' alteração(ões) nas notas que ainda não foram aplicadas e não iriam no link.' + (r.cf ? ' Resolva os conflitos para poder aplicar.' : ''),
      (r.cf ? [] : [['Aplicar e compartilhar', async () => { await aplicar(); Compartilhar.abrir(); }, true]]).concat([['Compartilhar sem aplicar', () => Compartilhar.abrir()], ['Cancelar', () => { if (btn) btn.focus(); }]]));
  }
  let ocupado = false;
  async function ouvir(k, btn) {
    const it = R && R.itens[k]; if (!it || ocupado) return;
    const txt = t(falado(it)); if (!txt) return;
    ocupado = true; const rot = btn.textContent; btn.disabled = true; btn.textContent = 'Gerando…';
    try {
      if (!L.recursosCarregados()) { msg('', 'Carregando os recursos de áudio. Na primeira vez pode levar alguns minutos.'); await L.carregarRecursos(); }
      msg('', 'Gerando o áudio do slide ' + (k + 1) + '…');
      const r = await L.sintetizar(L.limparMd ? L.limparMd(txt) : txt, $('locVoz').value, +$('locVel').value || 1, +$('locPausa').value || 300);
      if (!r || !r.blob) throw new Error('Nenhum áudio gerado.');
      if (player.src) URL.revokeObjectURL(player.src);
      player.src = URL.createObjectURL(r.blob); $('lnOuvirT').textContent = 'Slide ' + (k + 1) + ':'; player.setAttribute('aria-label', 'Áudio do slide ' + (k + 1));
      $('lnOuvir').hidden = false; msg('ok', 'Áudio do slide ' + (k + 1) + ' pronto.'); player.play().catch(() => { /* o navegador pode exigir clique */ });
    } catch (e) { msg('er', 'Não foi possível gerar o áudio: ' + ((e && e.message) || e)); }
    finally { ocupado = false; btn.textContent = rot; btn.disabled = false; }
  }

  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.id === 'lnImp') acaoImportar(b); else if (b.id === 'lnApl') aplicar(b); else if (b.id === 'lnDesc') descartar();
    else if (b.id === 'lnVer') versoes(b); else if (b.id === 'lnLink') compartilhar(b);
  });
  lista.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !R) return; let k;
    if ((k = b.getAttribute('data-ouvir')) != null) ouvir(+k, b);
    else if ((k = b.getAttribute('data-minha')) != null) { const c = atual()[k], it = R.itens[k]; it.bn = c.n; it.bx = c.x; msg('', 'Slide ' + (+k + 1) + ': mantida a sua versão.'); desenhar(); const x = $('lnTx' + k); if (x) x.focus(); }
    else if ((k = b.getAttribute('data-dela')) != null) { const c = atual()[k], it = R.itens[k]; it.bn = it.dn = c.n; it.bx = it.dx = c.x; it.mk = false; msg('', 'Slide ' + (+k + 1) + ': usada a versão da apresentação.'); desenhar(); const x = $('lnTx' + k); if (x) x.focus(); }
  });
  lista.addEventListener('input', e => {
    const ta = e.target; if (!R || ta.tagName !== 'TEXTAREA') return;
    const k = +ta.dataset.k, it = R.itens[k]; it.mk = false;
    if (alvo(it) === 'x') it.dx = ta.value; else it.dn = ta.value;
    atualizarItem(k);
  });
  lista.addEventListener('change', e => {
    const x = e.target; if (!R) return; let k;
    if ((k = x.getAttribute('data-g')) != null) {
      const it = R.itens[k]; it.mk = false;
      if (x.value === 'x') { if (!(it.dx && it.dx !== 'nao')) it.dx = it.dn; }
      else { if (it.dx && it.dx !== 'nao') { it.dn = it.dx; it.dx = ''; } }
      atualizarItem(+k); const n = lista.querySelector('[data-g="' + k + '"][value="' + x.value + '"]'); if (n) n.focus();
    } else if ((k = x.getAttribute('data-off')) != null) {
      const it = R.itens[k]; it.mk = false;
      if (x.checked) { it.px = it.dx && it.dx !== 'nao' ? it.dx : ''; it.dx = 'nao'; } else { it.dx = it.px || ''; it.px = ''; }
      desenhar(); const n = lista.querySelector('[data-off="' + k + '"]'); if (n) n.focus();
    }
  });

  /* ---------------------------- Modo e visibilidade ---------------------------- */
  function definirModo(m, salvar) {
    const notas = m !== 'livre';
    modo.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.modo === 'notas') === notas)));
    box.hidden = !notas; sec.classList.toggle('ln-ativo', notas);
    if (salvar) try { localStorage.setItem(CHAVE_MODO, notas ? 'notas' : 'livre'); } catch (e) { /* */ }
    if (notas) desenhar();
  }
  modo.addEventListener('click', e => { const b = e.target.closest('button[data-modo]'); if (b) definirModo(b.dataset.modo, true); });
  let modoIni = 'notas'; try { modoIni = localStorage.getItem(CHAVE_MODO) || 'notas'; } catch (e) { /* */ }
  definirModo(modoIni, false);
  new MutationObserver(() => { if (!sec.hidden) desenhar(); }).observe(sec, { attributes: true, attributeFilter: ['hidden'] });
  let tS = null;
  sTa.addEventListener('input', () => { if (sec.hidden || box.hidden) return; clearTimeout(tS); tS = setTimeout(desenhar, 400); });
  addEventListener('focus', () => { if (!sec.hidden && !box.hidden && !box.contains(document.activeElement)) desenhar(); });

  window.NotasSlides = {
    texto, analisar, montar,
    temRascunho: () => { if (!R) return false; const r = resumo(); return !r.estr && r.pend > 0; },
    sComRascunho,
    abrir: () => { if (window.Locucao && Locucao.mostrarAba) Locucao.mostrarAba('locucao'); definirModo('notas', true); const b = $('lnImp'); if (b) b.focus(); },
    importar: () => acaoImportar()
  };
})();
