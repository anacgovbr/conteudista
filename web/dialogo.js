/* =====================================================================================
   Conteudista - Dialogo (1.94): janelas de confirmacao e de senha no padrao gov.br,
   no lugar de confirm() e prompt() do navegador (WCAG 2.4.3, 3.3.1, 3.3.2, 4.1.2).
   - <dialog> modal com role="alertdialog", titulo e descricao ligados por aria-labelledby/-describedby.
   - Confirmacao: foco inicial em Cancelar (acao segura); Esc cancela; o foco volta para onde estava.
   - Senha: campo mascarado com rotulo; erro no proprio campo (aria-invalid); Enter confirma.
   - Se outro modulo substituir window.confirm (ex.: "Excluir tudo" ja confirmado), usa essa resposta.
   API: Dialogo.confirmar({titulo, descricao, rotulo, perigo}) -> Promise<boolean>
        Dialogo.senha({titulo, descricao, rotulo, campo}) -> Promise<string|null>
   ===================================================================================== */
(function () {
  'use strict';
  const NATIVO = window.confirm;
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
  function montar(o, comCampo) {
    return new Promise(ok => {
      const volta = document.activeElement;
      const d = document.createElement('dialog');
      d.className = 'dlg-gov'; d.setAttribute('role', 'alertdialog');
      d.setAttribute('aria-labelledby', 'dlgT'); d.setAttribute('aria-describedby', 'dlgD');
      d.innerHTML = '<h2 id="dlgT"></h2><p id="dlgD"></p>' +
        (comCampo ? '<label for="dlgI"></label><input id="dlgI" type="password" autocomplete="off" aria-describedby="dlgE"><p id="dlgE" class="dlg-erro" hidden></p>' : '') +
        '<div class="dlg-ac"><button type="button" class="sec" data-d="nao">Cancelar</button><button type="button" data-d="sim"></button></div>';
      d.querySelector('#dlgT').textContent = o.titulo || '';
      const desc = d.querySelector('#dlgD'); desc.textContent = o.descricao || ''; if (!o.descricao) desc.hidden = true;
      const sim = d.querySelector('[data-d="sim"]'); sim.textContent = o.rotulo || 'Confirmar';
      if (o.perigo) sim.classList.add('dan');
      const inp = d.querySelector('#dlgI'), erro = d.querySelector('#dlgE');
      if (inp) d.querySelector('label').textContent = o.campo || 'Senha';
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
        if (!inp.value) { erro.textContent = 'Digite a senha.'; erro.hidden = false; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
        fim(inp.value);
      });
      if (inp) {
        inp.addEventListener('input', () => { if (inp.value) { erro.hidden = true; inp.removeAttribute('aria-invalid'); } });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sim.click(); } });
      }
      d.showModal();
      (inp || d.querySelector('[data-d="nao"]')).focus();
    });
  }
  const temDialog = () => typeof HTMLDialogElement !== 'undefined' && typeof document.createElement('dialog').showModal === 'function';
  function confirmar(o) {
    o = o || {};
    if (window.confirm !== NATIVO) return Promise.resolve(!!window.confirm(o.descricao || o.titulo || ''));
    if (!temDialog()) return Promise.resolve(NATIVO.call(window, (o.titulo || '') + (o.descricao ? '\n\n' + o.descricao : '')));
    return montar(o, false);
  }
  function senha(o) {
    o = o || {};
    if (!temDialog()) return Promise.resolve(window.prompt(o.titulo || 'Senha'));
    return montar(o, true);
  }
  window.Dialogo = { confirmar, senha };
})();
