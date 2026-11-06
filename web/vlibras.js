(function () {
  'use strict';

  const botao = document.getElementById('btnVlibras');
  if (!botao) return;
  let carregando = false;
  let carregado = false;
  let status;

  function anunciar(texto) {
    if (!status) {
      status = document.createElement('span');
      status.id = 'vlibrasStatus';
      status.className = 'sr-only';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      botao.after(status);
    }
    status.textContent = texto;
  }

  function carregar() {
    if (carregado && window.VLibras && window.VLibras.Widget) {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
      botao.setAttribute('aria-expanded', 'true');
      return;
    }
    if (carregando) return;
    carregando = true;
    botao.disabled = true;
    anunciar('Carregando VLibras. É necessário acesso à internet.');
    const widget = document.getElementById('vlibrasWidget') || document.createElement('div');
    widget.id = 'vlibrasWidget';
    widget.hidden = false;
    widget.setAttribute('vw', '');
    widget.className = 'enabled';
    widget.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.append(widget);
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    script.onload = () => {
      carregado = true; carregando = false; botao.disabled = false;
      if (window.VLibras && window.VLibras.Widget) new window.VLibras.Widget('https://vlibras.gov.br/app');
      botao.setAttribute('aria-expanded', 'true');
      anunciar('VLibras carregado.');
    };
    script.onerror = () => {
      carregando = false; botao.disabled = false; widget.hidden = true; widget.replaceChildren();
      anunciar('Não foi possível carregar VLibras. Verifique a conexão.');
    };
    document.head.append(script);
  }

  botao.addEventListener('click', carregar);
})();