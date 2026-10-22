/* =====================================================================================
   Conteudista - Abrir: arquivos gerados, rascunhos e links em uma unica janela

   - Botao "Abrir" antes de "Carregar exemplo". Abre uma janela com tres abas (Arquivos, Rascunhos,
     Links), com contador, e lembra a ultima aba usada.
   - Reaproveita os blocos que ja existem (lista de arquivos guardados, tabela de rascunhos, lista
     "Links criados" e os campos URL e senha): eles sao MOVIDOS para a janela, entao salvar, abrir e
     excluir continuam sendo feitos pelo mesmo codigo de antes.
   - Rodape com "Excluir tudo" (somente na aba aberta) e confirmacao acessivel:
       role="alertdialog" com titulo e descricao; foco inicial em "Cancelar"; Esc cancela;
       sem limite de tempo; foco devolvido ao final; resultado anunciado por regiao aria-live.
   - Teclado: Esc fecha; setas, Home e End trocam de aba; Tab nao sai da janela; Enter nos campos
     URL e senha aciona "Abrir".
   API: window.AbrirJanela = { abrir(aba), fechar(), aba() }
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const ex = $('ex');
  if (!ex || !ex.parentNode) return;

  const ABAS = [['arq', 'Arquivos'], ['rasc', 'Rascunhos'], ['lnk', 'Links']];
  const CHAVE = 'conteudista.abrir.aba';
  const ICONES = {
    arq: '<path d="M4 4h10l6 6v10H4z"/><path d="M14 4v6h6"/>',
    rasc: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    lnk: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'
  };
  const svg = k => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONES[k] + '</svg>';
  const uri = k => 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1351b4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONES[k] + '</svg>') + '")';

  /* ---------------------------- Estilos ---------------------------- */
  const css = `
.ab-back{position:fixed;inset:0;z-index:1800;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px 14px;overflow:auto}
.ab-back[hidden]{display:none}
.ab-win{--ab-line:#cccccc;--ab-mut:#636363;--ab-pri:#0c326f;--ab-acc:#1351b4;background:#fff;color:#333333;border-radius:8px;width:min(900px,100%);max-height:calc(100vh - 48px);display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.35)}
.ab-top{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--ab-line)}
.ab-top h2{flex:1;margin:0;font-size:19px;color:var(--ab-pri)}
.ab-win button{margin:0}
.ab-tabs{display:flex;padding:0 12px;border-bottom:1px solid var(--ab-line);overflow-x:auto}
#abBack .ab-tab{display:inline-flex;align-items:center;gap:7px;height:46px!important;min-height:46px!important;max-height:none!important;padding:0 16px!important;margin:0 0 -1px!important;background:transparent!important;color:var(--ab-mut)!important;border:0!important;border-bottom:3px solid transparent!important;border-radius:0!important;box-shadow:none!important;font-size:15px!important;font-weight:500!important;line-height:1!important;white-space:nowrap}
#abBack .ab-tab:hover{background:rgba(19,81,180,.08)!important}
#abBack .ab-tab[aria-selected="true"]{color:var(--ab-acc)!important;border-bottom-color:var(--ab-acc)!important;font-weight:600!important}
.ab-tab svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.ab-ct{background:#dbe8fb;color:#0c326f;border-radius:10px;padding:0 7px;font-size:12px;font-weight:700;line-height:18px}
.ab-ct:empty{display:none}
.ab-msg{margin:10px 18px 0;padding:8px 12px;border-left:6px solid #e52207;background:#fde0db;border-radius:0 6px 6px 0;font-size:13.5px}
.ab-msg.info{border-left-color:#155bcb;background:#edf5ff}
.ab-msg[hidden]{display:none}
.ab-panes{flex:1 1 auto;min-height:0;overflow:auto}
.ab-pane{padding:12px 18px 10px}
.ab-pane[hidden]{display:none}
.ab-foot{display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;padding:10px 18px;border-top:1px solid var(--ab-line)}
.ab-foot>button[hidden]{display:none}
.ab-conf{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:10px 14px;background:#fde0db;border-left:6px solid #e52207;border-radius:0 6px 6px 0}
.ab-conf[hidden]{display:none}
.ab-conf-tx{flex:1 1 280px;min-width:0}
.ab-conf-tx strong{display:block;color:#333333;font-size:15px}
.ab-conf-tx p{margin:3px 0 0;font-size:13.5px;color:#333333}
.ab-conf-bt{display:flex;gap:8px;flex:0 0 auto}
.ab-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.ab-form{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto;gap:8px 10px;align-items:end;margin:0 0 4px}
.ab-form label{display:block;margin:0 0 3px;font-size:13px}
.ab-form input{width:100%}
.ab-sub{margin:14px 0 2px;font-size:14px;color:var(--ab-mut)}
#abBack #gerBox{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
#abBack #gerBox>h3{display:none}
#abBack #gerLimpar{display:none}
#abBack #gerBox .gtop{margin:0 0 4px}
.ab-pane table{display:block;width:100%;margin:0;border:0;font-size:13.5px}
.ab-pane tbody{display:block}
.ab-pane tr{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0;padding:9px 2px;border:0;border-top:1px solid var(--ab-line);background:transparent}
.ab-pane tr:first-child,.ab-pane tr:has(> th) + tr{border-top:0}
.ab-pane tr:has(> th){display:none}
.ab-pane tr::before{content:"";flex:0 0 22px;width:22px;height:22px;background-repeat:no-repeat;background-position:center;background-size:contain}
.ab-arq tr::before{background-image:${uri('arq')}}
.ab-rasc tr::before{background-image:${uri('rasc')}}
.ab-lnk tr::before{background-image:${uri('lnk')}}
#abBack .ab-pane td{display:block;width:auto;max-width:none;margin:0;border:0!important;padding:0!important;font-size:13px;vertical-align:baseline}
#abBack .ab-pane td::before{content:none!important}
#abBack #links td,#abBack #links td.acs,#abBack #links td.link-acoes{padding:0!important}
.ab-pane td button,.ab-pane td .btn{margin:2px 4px 2px 0}
.ab-rasc td:nth-child(1){flex:1 1 180px;min-width:0}
.ab-rasc td:nth-child(2){color:var(--ab-mut)}
.ab-arq td:nth-child(2){order:1;flex:1 1 180px;min-width:0}
.ab-arq td:nth-child(1){order:2;color:var(--ab-mut)}
.ab-arq td:nth-child(4){order:3}
#abBack .ab-arq td:nth-child(3){order:4;flex:1 1 100%;padding-left:34px!important}
.ab-lnk td:nth-child(1){order:1;flex:1 1 170px;min-width:0}
.ab-lnk td:nth-child(2){order:2;color:var(--ab-mut)}
.ab-lnk td:nth-child(4){order:3}
#abBack .ab-lnk td:nth-child(3){order:4;flex:1 1 100%;padding-left:34px!important}
#abBack #links .url-wrap{min-width:0}
.ab-lnk tr:not(.ab-qr-on) .url-qr{display:none}
.ab-pane .ab-qr[aria-pressed="true"]{background:#dbe8fb!important}
@media(min-width:901px){#secShare .grid3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){
  .ab-back{padding:0;align-items:stretch}
  .ab-win{width:100%;max-height:none;min-height:100%;border-radius:0}
  .ab-top h2{font-size:16px}
  .ab-form{grid-template-columns:minmax(0,1fr)}
  .ab-conf-bt{flex:1 1 100%}
}
html.contraste #abBack .ab-win{background:#000!important;color:#fff!important;border:2px solid #fff}
html.contraste #abBack :is(h2,h3,label,a){color:#ff0!important}
html.contraste #abBack :is(.ab-conf,.ab-msg){background:#000!important;border-color:#ff0!important;color:#fff!important}
html.contraste #abBack :is(.ab-conf-tx strong,.ab-conf-tx p){color:#fff!important}
html.contraste #abBack .ab-tab[aria-selected="true"]{color:#ff0!important;border-bottom-color:#ff0!important}
`;
  const st = document.createElement('style');
  st.id = 'ab-css'; st.textContent = css; document.head.appendChild(st);

  /* ---------------------------- Estrutura da janela ---------------------------- */
  const back = document.createElement('div');
  back.className = 'ab-back'; back.id = 'abBack'; back.hidden = true;
  back.innerHTML = '<div class="ab-win" id="abWin" role="dialog" aria-modal="true" aria-labelledby="abTitulo">' +
    '<div class="ab-top"><h2 id="abTitulo">Abrir</h2><button type="button" class="sec mini" id="abFechar" title="Fechar (Esc)">Fechar \u2715</button></div>' +
    '<div class="ab-tabs" role="tablist" aria-label="Tipo de conte\u00fado">' +
    ABAS.map(a => '<button type="button" role="tab" class="ab-tab" id="abTab-' + a[0] + '" data-k="' + a[0] + '" aria-controls="abPane-' + a[0] + '" aria-selected="false" tabindex="-1">' + svg(a[0]) + '<span>' + a[1] + '</span><span class="ab-ct" aria-hidden="true"></span></button>').join('') +
    '</div>' +
    '<div class="ab-msg" id="abMsg" role="alert" hidden></div>' +
    '<div class="ab-panes">' +
    ABAS.map(a => '<div class="ab-pane ab-' + a[0] + '" role="tabpanel" id="abPane-' + a[0] + '" aria-labelledby="abTab-' + a[0] + '" hidden></div>').join('') +
    '</div>' +
    '<div class="ab-foot">' +
    '<button type="button" class="dan mini" id="abExcluir">Excluir tudo</button>' +
    '<div class="ab-conf" id="abConf" role="alertdialog" aria-labelledby="abConfT" aria-describedby="abConfD" hidden>' +
    '<div class="ab-conf-tx"><strong id="abConfT"></strong><p id="abConfD"></p></div>' +
    '<div class="ab-conf-bt"><button type="button" class="sec mini" id="abCancelar">Cancelar</button><button type="button" class="dan mini" id="abConfirmar">Confirmar</button></div>' +
    '</div>' +
    '</div>' +
    '<div class="ab-sr" id="abLive" role="status" aria-live="polite"></div>' +
    '</div>';
  document.body.appendChild(back);

  const win = $('abWin'), trig = $('abExcluir'), conf = $('abConf'), msg = $('abMsg'), live = $('abLive');
  const P = k => $('abPane-' + k);
  const nomeAba = k => (ABAS.find(a => a[0] === k) || [k, k])[1];

  /* ---------------------------- Mover os blocos existentes para a janela ---------------------------- */
  function cel(rot, el, id) {
    const d = document.createElement('div');
    if (rot) { const l = document.createElement('label'); l.htmlFor = id; l.textContent = rot; d.appendChild(l); }
    d.appendChild(el);
    return d;
  }
  (function mover() {
    const gb = $('gerBox'), dr = $('drafts'), lk = $('links'), ol = $('olink'), op = $('opw'), ob = $('open');
    const pds = $('dsave') && $('dsave').closest('p');
    if (gb) P('arq').appendChild(gb);
    if (dr) P('rasc').appendChild(dr);
    if (lk && ol && op && ob) {
      const form = document.createElement('div'); form.className = 'ab-form';
      form.append(cel('Endere\u00e7o do link', ol, 'olink'), cel('Senha (se houver)', op, 'opw'), cel('', ob, ''));
      const sub = document.createElement('h3'); sub.className = 'ab-sub'; sub.textContent = 'Links criados';
      P('lnk').append(form, sub, lk);
    } else if (lk) P('lnk').appendChild(lk);
    // Restos de scripts anteriores e da pagina antiga
    const antigoGer = $('gerBack'); if (antigoGer) antigoGer.remove();
    const hb = $('gerHistBtn'); if (hb) (hb.closest('.ger-tb') || hb).remove();
    document.querySelectorAll('.ger-ph').forEach(x => x.remove());
    const po = $('pOpen'); if (po) po.remove();
    const dl = $('dxLinks'); if (dl) dl.remove();
    if (pds && !$('abNotaLocal')) {
      const n = document.createElement('p'); n.className = 'note'; n.id = 'abNotaLocal';
      n.textContent = 'Arquivos gerados, rascunhos e links guardados: bot\u00e3o Abrir.';
      pds.after(n);
    }
  })();

  /* ---------------------------- Botao Abrir (antes de Carregar exemplo) ---------------------------- */
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'btnAbrir'; btn.className = ex.className; btn.textContent = 'Abrir';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.title = 'Abrir arquivos, rascunhos e links (Alt+Shift+O)';
  ex.parentNode.insertBefore(btn, ex);

  /* ---------------------------- Estado, abas e contadores ---------------------------- */
  let aba = 'arq', foco = null;
  try { const s = localStorage.getItem(CHAVE); if (ABAS.some(a => a[0] === s)) aba = s; } catch (e) { /* sem armazenamento */ }

  function contar(k) {
    const p = P(k); if (!p) return 0;
    return new Set([...p.querySelectorAll('td')].map(td => td.parentElement)).size;
  }
  function anunciar(t) { live.textContent = ''; setTimeout(() => { live.textContent = t || ''; }, 50); }
  function mostrarMsg(t, info) {
    if (!t) { msg.hidden = true; msg.textContent = ''; return; }
    msg.classList.toggle('info', !!info); msg.hidden = false; msg.textContent = '';
    setTimeout(() => { msg.textContent = t; }, 30);
  }
  function atualizarExcluir() {
    const n = contar(aba);
    trig.disabled = n === 0;
    trig.setAttribute('aria-label', 'Excluir tudo em ' + nomeAba(aba));
  }
  function atualizarContagens() {
    ABAS.forEach(a => {
      const n = contar(a[0]), t = $('abTab-' + a[0]);
      t.querySelector('.ab-ct').textContent = n ? String(n) : '';
      t.setAttribute('aria-label', a[1] + ', ' + (n ? n + (n === 1 ? ' item' : ' itens') : 'vazio'));
    });
    atualizarExcluir();
  }
  function ativar(k, comFoco) {
    cancelarConfirmacao(false); mostrarMsg('');
    aba = k;
    try { localStorage.setItem(CHAVE, k); } catch (e) { /* sem armazenamento */ }
    ABAS.forEach(a => {
      const on = a[0] === k, t = $('abTab-' + a[0]);
      t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; P(a[0]).hidden = !on;
    });
    atualizarExcluir();
    if (comFoco) $('abTab-' + k).focus();
  }

  /* ---------------------------- Linhas da aba Links: Abrir, QR e Excluir ---------------------------- */
  function decorarLinks() {
    const box = $('links'); if (!box) return;
    box.querySelectorAll('tr').forEach(tr => {
      const td = tr.querySelector('td.link-acoes'); if (!td || td.querySelector('.ab-abrir')) return;
      const a = tr.querySelector('a.url-link'), tipo = ((tr.children[1] && tr.children[1].textContent) || '').toLowerCase();
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mini sec ab-abrir'; b.textContent = 'Abrir';
      b.dataset.url = a ? a.getAttribute('href') : ''; b.dataset.senha = /senha/.test(tipo) ? '1' : '';
      const q = document.createElement('button'); q.type = 'button'; q.className = 'mini sec ab-qr'; q.textContent = 'QR';
      q.setAttribute('aria-pressed', 'false'); q.title = 'Mostrar ou ocultar o QR Code';
      td.insertBefore(q, td.firstChild); td.insertBefore(b, td.firstChild);
      const f = td.querySelector('[data-f]'); if (f) { f.textContent = 'Excluir'; f.classList.remove('sec'); f.classList.add('dan'); }
    });
  }
  function abrirDoLink(b) {
    const o = $('olink'), p = $('opw'); if (!o) return;
    o.value = b.dataset.url || '';
    if (b.dataset.senha) { if (p) { p.value = ''; p.focus(); } mostrarMsg('Este link tem senha. Informe a senha e clique em Abrir.', true); return; }
    mostrarMsg(''); if ($('open')) $('open').click();
  }
  // "Abrir" do formulario: fecha a janela quando o conteudo e carregado; mostra o erro dentro da janela
  if ($('open')) $('open').addEventListener('click', () => {
    mostrarMsg('');
    const lg = $('log'); if (!lg) return;
    const antes = lg.textContent.length;
    const mo = new MutationObserver(() => {
      const novo = lg.textContent.slice(antes);
      if (/Conte\u00fado carregado do link/.test(novo)) { mo.disconnect(); fechar(true); }
      else if (/Erro:/.test(novo)) { mo.disconnect(); mostrarMsg(novo.trim().split('\n').pop(), false); }
    });
    mo.observe(lg, { childList: true, subtree: true, characterData: true });
    setTimeout(() => mo.disconnect(), 120000);
  });

  /* ---------------------------- Excluir tudo com confirmacao acessivel ---------------------------- */
  const TEXTOS = {
    arq: n => ['Excluir ' + n + (n === 1 ? ' pacote' : ' pacotes') + ' de arquivos?', 'Todos os arquivos gerados guardados neste navegador ser\u00e3o apagados. Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.'],
    rasc: n => ['Excluir ' + n + (n === 1 ? ' rascunho?' : ' rascunhos?'), 'Isso inclui o salvamento autom\u00e1tico: o que estiver apenas nele n\u00e3o poder\u00e1 ser recuperado. Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.'],
    lnk: n => ['Excluir ' + n + (n === 1 ? ' link' : ' links') + ' da lista?', 'A lista deste navegador ser\u00e1 limpa. O conte\u00fado enviado ao PrivateBin n\u00e3o \u00e9 apagado no servidor e continua acess\u00edvel at\u00e9 expirar.']
  };
  const OK = { arq: 'Todos os pacotes de arquivos foram exclu\u00eddos.', rasc: 'Todos os rascunhos foram exclu\u00eddos.', lnk: 'Todos os links foram exclu\u00eddos da lista.' };

  function pedirConfirmacao() {
    const n = contar(aba); if (!n) return;
    const t = TEXTOS[aba](n);
    $('abConfT').textContent = t[0]; $('abConfD').textContent = t[1];
    conf.hidden = false; trig.hidden = true;
    $('abCancelar').focus();                      // foco na acao segura; o leitor de tela le titulo e descricao
  }
  function cancelarConfirmacao(devolverFoco) {
    if (conf.hidden) return;
    conf.hidden = true; trig.hidden = false;
    if (devolverFoco) trig.focus();
  }
  function semConfirmar(fn) { const o = window.confirm; window.confirm = () => true; try { fn(); } finally { window.confirm = o; } }
  async function limpar(k) {
    if (k === 'arq') { const b = $('gerLimpar'); if (!b) throw new Error('lista de arquivos indispon\u00edvel'); semConfirmar(() => b.click()); return; }
    if (typeof dbClear !== 'function') throw new Error('armazenamento indispon\u00edvel');
    if (k === 'rasc') { await dbClear('rascunhos'); if (typeof listarRascunhos === 'function') await listarRascunhos(); return; }
    try { if (typeof sessaoLinks !== 'undefined') sessaoLinks.length = 0; } catch (e) { /* sem lista da sessao */ }
    await dbClear('links'); if (typeof listarLinks === 'function') await listarLinks();
  }
  function aguardarVazio(k) {
    return new Promise(ok => { const t0 = Date.now(); (function p() { if (!contar(k) || Date.now() - t0 > 3000) return ok(); setTimeout(p, 100); })(); });
  }
  async function executarExclusao() {
    const k = aba;
    conf.hidden = true; trig.hidden = false;
    try {
      await limpar(k); await aguardarVazio(k);
      anunciar(OK[k]);
    } catch (err) {
      const t = 'N\u00e3o foi poss\u00edvel excluir: ' + ((err && err.message) || err);
      mostrarMsg(t, false);
    }
    atualizarContagens();
    (trig.disabled ? $('abTab-' + k) : trig).focus();
  }

  /* ---------------------------- Abrir e fechar a janela ---------------------------- */
  function abrir(k) {
    foco = document.activeElement;
    ativar(ABAS.some(a => a[0] === k) ? k : aba, false);
    back.hidden = false; back.scrollTop = 0; document.body.style.overflow = 'hidden';
    try { if (typeof listarRascunhos === 'function') Promise.resolve(listarRascunhos()).catch(() => {}); } catch (e) { /* sem lista */ }
    try { if (window.Gerados && Gerados.listar) Promise.resolve(Gerados.listar()).catch(() => {}); } catch (e) { /* sem lista */ }
    try { if (typeof listarLinks === 'function') Promise.resolve(listarLinks()).catch(() => {}); } catch (e) { /* sem lista */ }
    atualizarContagens();
    setTimeout(() => $('abTab-' + aba).focus(), 30);
  }
  function fechar(semFoco) {
    if (back.hidden) return;
    cancelarConfirmacao(false); mostrarMsg('');
    back.hidden = true; document.body.style.overflow = '';
    if (!semFoco && foco && foco.isConnected && foco.focus) foco.focus();
  }
  btn.addEventListener('click', () => abrir());

  back.addEventListener('click', e => {
    if (e.target === back) { fechar(); return; }
    const t = e.target.closest ? e.target.closest('button,a') : null; if (!t) return;
    if (t.id === 'abFechar') fechar();
    else if (t.classList.contains('ab-tab')) ativar(t.dataset.k, false);
    else if (t.id === 'abExcluir') pedirConfirmacao();
    else if (t.id === 'abCancelar') cancelarConfirmacao(true);
    else if (t.id === 'abConfirmar') executarExclusao();
    else if (t.classList.contains('ab-abrir')) abrirDoLink(t);
    else if (t.classList.contains('ab-qr')) { const tr = t.closest('tr'), on = tr.classList.toggle('ab-qr-on'); t.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    else if (t.matches('[data-ver]') || t.matches('[data-a="ab"]')) fechar(true);   // Exibir e Abrir rascunho levam ao conteudo da pagina
  });

  back.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!conf.hidden) cancelarConfirmacao(true); else fechar(); return; }
    if (e.key === 'Enter' && (e.target.id === 'olink' || e.target.id === 'opw')) { e.preventDefault(); if ($('open')) $('open').click(); return; }
    const tab = e.target.closest && e.target.closest('.ab-tab');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) >= 0) {
      e.preventDefault();
      const ks = ABAS.map(a => a[0]); let i = ks.indexOf(tab.dataset.k);
      if (e.key === 'ArrowRight') i = (i + 1) % ks.length; else if (e.key === 'ArrowLeft') i = (i + ks.length - 1) % ks.length; else if (e.key === 'Home') i = 0; else i = ks.length - 1;
      ativar(ks[i], true); return;
    }
    if (e.key === 'Tab') {
      const f = [...win.querySelectorAll('a[href],button,input,select,textarea')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || !win.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* ---------------------------- Observadores e integracoes ---------------------------- */
  let tC = null;
  const agendar = () => { clearTimeout(tC); tC = setTimeout(() => { decorarLinks(); atualizarContagens(); }, 60); };
  ABAS.forEach(a => new MutationObserver(agendar).observe(P(a[0]), { childList: true, subtree: true }));

  // Ao criar um link com sucesso, mostra a lista (antes a secao "Links criados" abria sozinha)
  const sh = $('share');
  if (sh) {
    let antes = -1;
    new MutationObserver(() => {
      if (sh.disabled) antes = contar('lnk');
      else if (antes >= 0) { const a0 = antes; antes = -1; setTimeout(() => { if (contar('lnk') > a0) abrir('lnk'); }, 500); }
    }).observe(sh, { attributes: true, attributeFilter: ['disabled'] });
  }

  ativar(aba, false);
  agendar();
  window.AbrirJanela = { abrir, fechar, aba: () => aba };
})();