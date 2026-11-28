/* Integração visual do modo temporário (fase 2a). */
(() => {
  'use strict';
  const A = window.Armazenamento;
  const btn = document.getElementById('btnAnonimo');
  const status = document.getElementById('statusAnonimo');
  const app = document.getElementById('conteudo');
  if (!A || !btn || !status || !app) return;

  const anunciar = texto => { status.textContent = ''; setTimeout(() => { status.textContent = texto; }, 0); };
  const atualizar = () => {
    const ativo = !!A.anonimo;
    document.documentElement.toggleAttribute('data-anonimo', ativo);
    btn.setAttribute('aria-label', ativo ? 'Sair do modo temporário' : 'Ativar modo temporário');
    btn.setAttribute('aria-pressed', String(ativo));
    btn.title = ativo ? 'Sair do modo temporário (os dados desta sessão serão descartados)' : 'Ativar modo temporário (nada será guardado neste navegador)';
    btn.querySelector('.anonimo-rotulo').textContent = ativo ? 'Sair' : 'Temporário';
    anunciar(ativo ? 'Modo temporário ativo. Dados ficam somente nesta sessão e serão descartados ao sair.' : 'Modo normal ativo. Dados podem ser guardados neste navegador.');
    if (ativo) {
      const aviso = document.getElementById('avisoPersistencia');
      if (aviso) aviso.textContent = 'Modo temporário: rascunhos, versões e arquivos gerados ficam somente nesta sessão e serão descartados ao sair.';
    }
  };
  const bloquear = () => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modo-falha';
    dlg.setAttribute('aria-labelledby', 'modoFalhaTitulo');
    dlg.setAttribute('aria-describedby', 'modoFalhaTexto');
    dlg.innerHTML = '<h2 id="modoFalhaTitulo">Modo temporário indisponível</h2>' +
      '<p id="modoFalhaTexto">' + (A.erroAnonimo || 'Não foi possível isolar o armazenamento desta aba.') +
      ' Para evitar gravações inesperadas, a edição e a importação estão bloqueadas.</p>' +
      '<div class="modo-falha-acoes"><button type="button" class="sec" data-normal>Continuar no modo normal</button></div>';
    document.body.append(dlg);
    const controles = [...app.querySelectorAll('input, textarea, select, button, [contenteditable="true"]')];
    controles.forEach(el => { if (el !== btn) { el.dataset.modoBloqueado = ''; el.disabled = true; } });
    dlg.querySelector('[data-normal]').addEventListener('click', () => {
      controles.forEach(el => { delete el.dataset.modoBloqueado; el.disabled = false; });
      anunciar('Modo temporário não foi ativado. Continuando no modo normal.');
      dlg.close('normal');
    });
    dlg.addEventListener('close', () => { dlg.remove(); btn.focus(); });
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else { dlg.setAttribute('open', ''); dlg.querySelector('[data-normal]').focus(); }
  };
  btn.addEventListener('click', async () => {
    if (A.anonimo) {
      const confirmar = window.Dialogo && Dialogo.confirmar
        ? Dialogo.confirmar({ titulo: 'Sair do modo temporário?', descricao: 'Os dados desta sessão serão descartados.', rotulo: 'Sair' })
        : Promise.resolve(confirm('Sair do modo temporário? Os dados desta sessão serão descartados.'));
      if (await confirmar) await A.sairAnonimo();
      return;
    }
    const ok = await A.entrarAnonimo();
    if (!ok) anunciar(A.erroAnonimo || 'Não foi possível iniciar o modo temporário.');
  });
  A.pronto.then(() => {
    if (A.erroAnonimo) bloquear();
    atualizar();
  });
})();
