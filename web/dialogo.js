/* =====================================================================================
   Conteudista - Dialogo (1.97): janelas de confirmacao, de texto e de senha no padrao gov.br,
   no lugar de confirm() e prompt() do navegador (WCAG 2.4.3, 3.3.1, 3.3.2, 4.1.2).
   - <dialog> modal com role="alertdialog", titulo e descricao ligados por aria-labelledby/-describedby.
   - Confirmacao: foco inicial em Cancelar (acao segura); Esc cancela; o foco volta para onde estava.
   - Texto e senha: campo com rotulo; erro no proprio campo (aria-invalid); Enter confirma.
   - Se outro modulo substituir window.confirm ou window.prompt (ex.: testes), usa essa resposta.
   API: Dialogo.confirmar({titulo, descricao, rotulo, perigo}) -> Promise<boolean>
        Dialogo.texto({titulo, descricao, rotulo, campo, valor}) -> Promise<string|null>
        Dialogo.senha({titulo, descricao, rotulo, campo}) -> Promise<string|null>
        Dialogo.perguntar(mensagem) -> Promise<boolean>        (mesma mensagem do confirm() antigo)
        Dialogo.pedir(mensagem, valorInicial) -> Promise<string|null>   (mesma mensagem do prompt() antigo)
   ===================================================================================== */
(function () {
  'use strict';
  const NATIVO = window.confirm, NATIVO_PROMPT = window.prompt;
  const st = document.createElement('style');
  st.id = 'dlg-css';
  st.textContent = 'dialog.dlg-gov{width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;margin:auto;padding:24px;border:0;border-radius:8px;background:#fff;color:#333333;font:15px/1.5 "Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.35)}' +
    'dialog.dlg-gov::backdrop{background:rgba(0,0,0,.55)}' +
    'dialog.dlg-gov h2{margin:0 0 8px;font-size:20px;color:#0c326f}' +
    'dialog.dlg-gov p{margin:0 0 14px}' +
    'dialog.dlg-gov label{display:block;margin:0 0 4px;font-weight:600;font-size:13px;color:#0c326f}' +
    'dialog.dlg-gov input{width:100%;min-height:40px;padding:0 12px;border:1px solid #888888;border-radius:4px;font:inherit;box-sizing:border-box}' +
    'dialog.dlg-gov input[aria-invalid="true"]{border:2px solid #b00020}' +
    'dialog.dlg-gov .dlg-erro{margin:6px 0 0;color:#b00020;font-weight:600;font-size:13.5px}' +
    'dialog.dlg-gov .dlg-ac{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:18px}' +
    'dialog.dlg-gov .dlg-ac button{margin:0}' +
    'html.contraste dialog.dlg-gov{background:#000;color:#fff;border:2px solid #fff}html.contraste dialog.dlg-gov h2,html.contraste dialog.dlg-gov label{color:#ff0}' +
    '@media(max-width:480px){dialog.dlg-gov .dlg-ac button{flex:1}}';
  document.head.appendChild(st);
  // tipoCampo: '' (so confirmar), 'password' (senha obrigatoria) ou 'text' (texto livre; vazio e aceito)
  function montar(o, tipoCampo) {
    const comCampo = !!tipoCampo;
    return new Promise(ok => {
      const volta = document.activeElement;
      const d = document.createElement('dialog');
      d.className = 'dlg-gov'; d.setAttribute('role', 'alertdialog');
      d.setAttribute('aria-labelledby', 'dlgT'); d.setAttribute('aria-describedby', 'dlgD');
      d.innerHTML = '<h2 id="dlgT"></h2><p id="dlgD"></p>' +
        (comCampo ? '<label for="dlgI"></label><input id="dlgI" type="' + tipoCampo + '" autocomplete="off" aria-describedby="dlgE"><p id="dlgE" class="dlg-erro" hidden></p>' : '') +
        '<div class="dlg-ac"><button type="button" class="sec" data-d="nao">Cancelar</button><button type="button" data-d="sim"></button></div>';
      d.querySelector('#dlgT').textContent = o.titulo || '';
      const desc = d.querySelector('#dlgD'); desc.textContent = o.descricao || ''; if (!o.descricao) desc.hidden = true;
      const sim = d.querySelector('[data-d="sim"]'); sim.textContent = o.rotulo || 'Confirmar';
      if (o.perigo) sim.classList.add('dan');
      const inp = d.querySelector('#dlgI'), erro = d.querySelector('#dlgE');
      if (inp) { d.querySelector('label').textContent = o.campo || (tipoCampo === 'password' ? 'Senha' : 'Resposta'); if (o.valor != null) inp.value = String(o.valor); }
      document.body.appendChild(d);
      let feito = false;
      const fim = v => {
        if (feito) return; feito = true;
        try { d.close(); } catch (e) { /* ja fechado */ }
        d.remove();
        if (volta && volta.isConnected && volta.focus) volta.focus();
        ok(v);
      };
      d.addEventListener('cancel', e => { e.preventDefault(); fim(comCampo ? null : false); });
      d.addEventListener('click', e => {
        const b = e.target.closest ? e.target.closest('[data-d]') : null; if (!b) return;
        if (b.dataset.d === 'nao') { fim(comCampo ? null : false); return; }
        if (!comCampo) { fim(true); return; }
        if (tipoCampo === 'password' && !inp.value) { erro.textContent = 'Digite a senha.'; erro.hidden = false; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
        fim(inp.value);
      });
      if (inp) {
        inp.addEventListener('input', () => { if (inp.value) { erro.hidden = true; inp.removeAttribute('aria-invalid'); } });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sim.click(); } });
      }
      d.showModal();
      if (inp) { inp.focus(); if (tipoCampo === 'text') inp.select(); } else d.querySelector('[data-d="nao"]').focus();
    });
  }
  const temDialog = () => typeof HTMLDialogElement !== 'undefined' && typeof document.createElement('dialog').showModal === 'function';
  function confirmar(o) {
    o = o || {};
    if (window.confirm !== NATIVO) return Promise.resolve(!!window.confirm(o.descricao || o.titulo || ''));
    if (!temDialog()) return Promise.resolve(NATIVO.call(window, (o.titulo || '') + (o.descricao ? '\n\n' + o.descricao : '')));
    return montar(o, '');
  }
  function texto(o) {
    o = o || {};
    if (window.prompt !== NATIVO_PROMPT) return Promise.resolve(window.prompt(o.titulo || '', o.valor == null ? '' : o.valor));
    if (!temDialog()) return Promise.resolve(NATIVO_PROMPT.call(window, o.titulo || 'Digite', o.valor == null ? '' : o.valor));
    return montar(o, 'text');
  }
  function senha(o) {
    o = o || {};
    if (!temDialog()) return Promise.resolve(window.prompt(o.titulo || 'Senha'));
    return montar(o, 'password');
  }
  /* Atalhos: aceitam a mesma mensagem do confirm() e do prompt() antigos. O primeiro paragrafo (ou a frase
     ate a primeira interrogacao) vira o titulo; o resto vira a explicacao. O rotulo do botao vem do verbo. */
  function partir(msg) {
    msg = String(msg == null ? '' : msg).trim();
    let tit = msg, desc = '';
    const i = msg.indexOf('\n\n');
    if (i > 0) { tit = msg.slice(0, i); desc = msg.slice(i + 2); }
    else { const m = /^([^?]+\?)\s+(\S[\s\S]*)$/.exec(msg); if (m) { tit = m[1]; desc = m[2]; } }
    const lim = s => s.replace(/\s*\n\s*/g, ' ').trim();
    return { titulo: lim(tit), descricao: lim(desc) };
  }
  const VERBOS = { excluir: 'Excluir', apagar: 'Apagar', remover: 'Remover', substituir: 'Substituir', voltar: 'Voltar ao padrão' };
  function perguntar(msg) {
    const p = partir(msg), v = ((/^\s*([A-Za-z\u00C0-\u00FF]+)/.exec(p.titulo) || [])[1] || '').toLowerCase();
    return confirmar({ titulo: p.titulo, descricao: p.descricao, rotulo: VERBOS[v] || 'Confirmar', perigo: /^(excluir|apagar|remover|substituir)$/.test(v) });
  }
  function pedir(msg, valor) {
    let m = String(msg == null ? '' : msg).trim(), desc = '';
    const e = /\s*\((ex\.:[^)]*)\)/.exec(m);
    if (e) { desc = e[1]; m = m.replace(e[0], ''); }
    m = m.replace(/[:\s]+$/, '');
    const nome = /^nome/i.test(m);
    return texto({ titulo: m, descricao: desc, campo: nome ? 'Nome' : 'Resposta', rotulo: nome ? 'Salvar' : 'OK', valor });
  }
  window.Dialogo = { confirmar, texto, senha, perguntar, pedir };
})();
