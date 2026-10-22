/* =====================================================================================
   Conteudista - Importar > Colar: subabas Treinamento, Apresentacao e Link

   - Treinamento e Apresentacao sao dois textos distintos: cada um tem a sua caixa Markdown.
   - Link: endereco e senha. Colar um link numa das caixas de texto move o endereco para a subaba Link.
   - "Importar" envia o que estiver preenchido: um ou os dois textos (subabas de texto) ou o link
     (subaba Link). Antes de substituir, o texto atual dos editores vai para Versoes.
   - Cada subaba mostra um check quando esta preenchida; o aviso abaixo diz o que sera importado.
   - O link e aberto direto pela funcao abrirLink() da pagina (sem depender de #olink, #opw e #open).
   - Teclado: setas, Home e End trocam de subaba; Enter nos campos do link aciona Importar.
   API: window.ColarImportar = { linkSalvo(url, temSenha), abrirLink(url, senha) }
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const pane = $('jnImpPane-cl'), API = window.Importar;
  if (!pane || !API || typeof API.msg !== 'function' || typeof API.ativar !== 'function') return;

  const SUB = [['g', 'Treinamento'], ['s', 'Apresenta\u00e7\u00e3o'], ['l', 'Link']];
  const NOME = { g: 'Treinamento', s: 'Apresenta\u00e7\u00e3o' };
  const anunciar = m => { try { if (window.UXFeedback && UXFeedback.anunciar) UXFeedback.anunciar(m); } catch (e) { /* sem anuncio */ } };
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch (e) { /* sem log */ } };
  const lin = t => { const n = t ? t.split('\n').length : 0; return n + (n === 1 ? ' linha' : ' linhas'); };
  const ehLink = v => /^https?:\/\/\S+$/i.test(String(v || '').trim());
  // sinais fortes de apresentacao (evita confundir com os separadores "---" do treinamento)
  const sinalApresentacao = t => /<!--\s*(class|notas):/.test(t) || /^---\s*\n[\s\S]*?\btitle\s*:/.test(t);

  /* ---------------------------- Estilos ---------------------------- */
  const st = document.createElement('style');
  st.id = 'cl-css';
  st.textContent = `
.cl-tabs{display:flex;gap:4px;margin:0 0 10px;border-bottom:1px solid #cccccc;overflow-x:auto}
#jnImpBack .cl-tab{display:inline-flex;align-items:center;gap:6px;height:40px!important;min-height:40px!important;max-height:none!important;padding:0 14px!important;margin:0 0 -1px!important;background:transparent!important;background-image:none!important;color:#636363!important;border:0!important;border-bottom:3px solid transparent!important;border-radius:0!important;box-shadow:none!important;font-size:14.5px!important;font-weight:500!important;line-height:1!important;white-space:nowrap;overflow:visible!important}
#jnImpBack .cl-tab:hover{background:rgba(19,81,180,.08)!important}
#jnImpBack .cl-tab[aria-selected="true"]{color:#1351b4!important;border-bottom-color:#1351b4!important;font-weight:600!important}
.cl-ok{display:none;color:#168821;font-weight:700;font-size:14px}
.cl-tab.cheio .cl-ok{display:inline}
#jnImpPane-cl textarea{min-height:240px}
#jnImpPane-cl .cl-painel[hidden]{display:none}
#jnImpPane-cl .jn-lb:first-child{margin-top:0}
html.contraste #jnImpBack .cl-tab{color:#fff!important}
html.contraste #jnImpBack .cl-tab[aria-selected="true"]{color:#ff0!important;border-bottom-color:#ff0!important}
html.contraste .cl-ok{color:#0f8}
`;
  document.head.appendChild(st);

  /* ---------------------------- Estrutura ---------------------------- */
  pane.innerHTML =
    '<div class="cl-tabs" id="clTabs" role="tablist" aria-label="O que colar">' +
    SUB.map(a => '<button type="button" role="tab" class="cl-tab" id="clTab-' + a[0] + '" data-ck="' + a[0] + '" aria-controls="clPane-' + a[0] + '" aria-selected="false" tabindex="-1"><span>' + a[1] + '</span><span class="cl-ok" aria-hidden="true">\u2713</span></button>').join('') +
    '</div>' +
    '<div class="cl-painel" role="tabpanel" id="clPane-g" aria-labelledby="clTab-g" hidden>' +
    '<label class="jn-lb" for="clT-g">Markdown do treinamento</label>' +
    '<textarea id="clT-g" spellcheck="false" aria-describedby="clDica" placeholder="Cole aqui o texto do treinamento"></textarea></div>' +
    '<div class="cl-painel" role="tabpanel" id="clPane-s" aria-labelledby="clTab-s" hidden>' +
    '<label class="jn-lb" for="clT-s">Markdown da apresenta\u00e7\u00e3o</label>' +
    '<textarea id="clT-s" spellcheck="false" aria-describedby="clDica" placeholder="Cole aqui o texto da apresenta\u00e7\u00e3o"></textarea></div>' +
    '<div class="cl-painel" role="tabpanel" id="clPane-l" aria-labelledby="clTab-l" hidden>' +
    '<label class="jn-lb" for="clUrl">Endere\u00e7o do link</label>' +
    '<input type="url" id="clUrl" autocomplete="off" aria-describedby="clDica" placeholder="https://\u2026">' +
    '<label class="jn-lb" for="clSenha">Senha (se houver)</label>' +
    '<input type="password" id="clSenha" autocomplete="off"></div>' +
    '<p class="jn-hint" id="clDica"></p>' +
    '<div class="jn-acoes"><button type="button" class="sec" id="clColar">Colar agora</button><button type="button" id="clOk" disabled>Importar</button></div>';

  const campos = { g: $('clT-g'), s: $('clT-s') };
  let sub = 'g';

  /* ---------------------------- Estado ---------------------------- */
  function atualizar() {
    const v = { g: campos.g.value.trim(), s: campos.s.value.trim() }, u = $('clUrl').value.trim();
    SUB.forEach(a => {
      const k = a[0], cheio = k === 'l' ? !!u : !!v[k], t = $('clTab-' + k);
      t.classList.toggle('cheio', cheio);
      t.setAttribute('aria-label', a[1] + (cheio ? ', preenchido' : ''));
    });
    let txt;
    if (sub === 'l') txt = u ? 'Informe a senha, se houver, e clique em Importar.' : 'Cole o endere\u00e7o de um link criado aqui.';
    else {
      const p = [];
      ['g', 's'].forEach(k => { if (v[k]) p.push(NOME[k] + ' (' + lin(v[k]) + ')'); });
      txt = p.length ? 'Ser\u00e1 importado: ' + p.join(' e ') + '.' : 'Cole o Markdown de cada texto na sua aba.';
      if (['g', 's'].some(k => v[k] && $(k) && $(k).value.trim())) txt += ' O texto atual fica em Vers\u00f5es.';
      if (sub === 'g' && sinalApresentacao(v.g)) txt += ' Este texto parece uma apresenta\u00e7\u00e3o: use a aba Apresenta\u00e7\u00e3o.';
    }
    $('clDica').textContent = txt;
    $('clOk').disabled = sub === 'l' ? !u : !(v.g || v.s);
  }
  function ativar(k, foco) {
    sub = k;
    SUB.forEach(a => {
      const on = a[0] === k, t = $('clTab-' + a[0]);
      t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; $('clPane-' + a[0]).hidden = !on;
    });
    atualizar();
    if (foco) $('clTab-' + k).focus();
  }
  function moverLink(v) {
    $('clUrl').value = v; $('clSenha').value = '';
    ativar('l', false);
    $('clDica').textContent = 'Link detectado: movido para a aba Link. Informe a senha, se houver.';
    anunciar('Link detectado. Movido para a aba Link.');
    setTimeout(() => $('clUrl').focus(), 30);
  }

  /* ---------------------------- Importar textos ---------------------------- */
  async function importarTextos() {
    const itens = ['g', 's'].map(k => [k, campos[k].value.trim()]).filter(x => x[1]);
    if (!itens.length) return;
    API.msg('');
    const ok = $('clOk'); ok.disabled = true;
    try {
      if (window.Hist && Hist.registrar) await Hist.registrar('antes', 'Antes de colar texto');
      for (const x of itens) {
        const k = x[0], alvo = $(k); if (!alvo) continue;
        alvo.value = x[1]; alvo.dispatchEvent(new Event('input', { bubbles: true }));
        if (window.Hist && Hist.registrar) Hist.registrar('arquivo', 'Texto colado (' + (k === 'g' ? 'treinamento' : 'apresenta\u00e7\u00e3o') + ')');
      }
      const destino = itens[0][0];
      if (typeof aba === 'function') aba(destino);
      itens.forEach(x => { campos[x[0]].value = ''; });
      atualizar();
      logApp('Texto colado: ' + itens.map(x => NOME[x[0]]).join(' e ') + '.', 'ok');
      if (API.fechar) API.fechar(true);
      const ed = $(destino === 'g' ? 'pg' : 'ps'); if (ed && ed.scrollIntoView) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      anunciar(itens.length > 1 ? 'Treinamento e apresenta\u00e7\u00e3o importados.' : NOME[destino] + ' importado.');
      try { if (window.UXFeedback && $('btnImportar')) UXFeedback.confirmar($('btnImportar'), 'Texto importado.'); } catch (e) { /* sem feedback */ }
    } catch (err) {
      API.msg('Erro ao importar: ' + ((err && err.message) || err), false);
      atualizar();
    }
  }

  /* ---------------------------- Importar link ---------------------------- */
  async function importarLink(url, senha) {
    url = String(url || '').trim(); if (!url) return;
    if (typeof abrirLink !== 'function' || typeof aplicar !== 'function') { API.msg('Abertura de links indispon\u00edvel nesta p\u00e1gina.', false); return; }
    API.msg('');
    const ok = $('clOk'); ok.disabled = true;
    try {
      const d = await abrirLink(url, senha || '');
      if (window.Hist && Hist.registrar) await Hist.registrar('antes', 'Antes de abrir link');
      aplicar(d);
      logApp('Conte\u00fado carregado do link.', 'ok');
      if (window.Hist && Hist.registrar && typeof rotuloLink === 'function') Hist.registrar('link', rotuloLink(url));
      $('clUrl').value = ''; $('clSenha').value = ''; atualizar();
      if (API.fechar) API.fechar(true);
      const ed = $(($('ps') && !$('ps').hidden) ? 'ps' : 'pg'); if (ed && ed.scrollIntoView) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      anunciar('Conte\u00fado carregado do link.');
      try { if (window.UXFeedback && $('btnImportar')) UXFeedback.confirmar($('btnImportar'), 'Link importado.'); } catch (e) { /* sem feedback */ }
    } catch (err) {
      const t = 'Erro: ' + ((err && err.message) || err);
      API.msg(t, false); logApp(t, 'err');
      atualizar();
    }
  }
  // Botao "Abrir" de um link salvo (aba Salvos)
  function linkSalvo(url, temSenha) {
    if (temSenha) {
      $('clUrl').value = url; $('clSenha').value = '';
      API.ativar('cl', false); ativar('l', false);
      API.msg('Este link tem senha. Informe a senha e clique em Importar.', true);
      setTimeout(() => { const s = $('clSenha'); if (s) s.focus(); }, 30);
    } else importarLink(url, '');
  }

  /* ---------------------------- Colar agora (area de transferencia) ---------------------------- */
  function colarAgora() {
    if (!navigator.clipboard || !navigator.clipboard.readText) { API.msg('Seu navegador n\u00e3o permite ler a \u00e1rea de transfer\u00eancia. Use Ctrl+V no campo.', true); return; }
    navigator.clipboard.readText().then(t => {
      if (!t) { API.msg('A \u00e1rea de transfer\u00eancia est\u00e1 vazia.', true); return; }
      API.msg('');
      const v = t.trim();
      if (sub !== 'l' && ehLink(v)) { moverLink(v); return; }
      const alvo = sub === 'l' ? $('clUrl') : campos[sub];
      alvo.value = sub === 'l' ? v : t; atualizar(); alvo.focus();
    }).catch(() => API.msg('N\u00e3o foi poss\u00edvel ler a \u00e1rea de transfer\u00eancia. Use Ctrl+V no campo.', true));
  }

  /* ---------------------------- Eventos ---------------------------- */
  pane.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
    if (b.dataset.ck) ativar(b.dataset.ck, false);
    else if (b.id === 'clColar') colarAgora();
    else if (b.id === 'clOk') { if (sub === 'l') importarLink($('clUrl').value, $('clSenha').value); else importarTextos(); }
  });
  $('clTabs').addEventListener('keydown', e => {
    const t = e.target.closest ? e.target.closest('.cl-tab') : null;
    if (!t || ['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) < 0) return;
    e.preventDefault();
    const ks = SUB.map(a => a[0]); let i = ks.indexOf(t.dataset.ck);
    if (e.key === 'ArrowRight') i = (i + 1) % ks.length; else if (e.key === 'ArrowLeft') i = (i + ks.length - 1) % ks.length; else if (e.key === 'Home') i = 0; else i = ks.length - 1;
    ativar(ks[i], true);
  });
  ['g', 's'].forEach(k => {
    campos[k].addEventListener('input', atualizar);
    campos[k].addEventListener('paste', e => {
      const t = (e.clipboardData && e.clipboardData.getData) ? e.clipboardData.getData('text') : '';
      if (ehLink(t)) { e.preventDefault(); moverLink(t.trim()); }
    });
  });
  $('clUrl').addEventListener('input', atualizar);
  ['clUrl', 'clSenha'].forEach(id => $(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); if (!$('clOk').disabled) $('clOk').click(); }
  }));

  ativar('g', false);
  window.ColarImportar = { linkSalvo, abrirLink: importarLink };
})();