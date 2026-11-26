/* Conteudista: barra global, configuracoes do conteudo e inicio rapido. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const engrenagem = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/><circle cx="12" cy="12" r="7"/></svg>';
  const informacao = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v2"/></svg>';

  function montar() {
    const abas = $('abasApp'), nome = $('pref'), novidades = $('btnNews');
    const acoes = document.querySelector('.acoes-meta');
    const campos = nome && nome.closest('.row');
    if (!abas || !novidades || !acoes || !campos || $('barConteudo')) return;

    const st = document.createElement('style');
    st.textContent = `
#barConteudo{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;box-sizing:border-box;width:calc(100% - 40px);max-width:1460px;margin:12px auto 0;padding:0 0 12px;border-bottom:1px solid var(--line,#ccc)}
#barConteudo .bc-nome{flex:1 1 220px;min-width:0;max-width:420px}
#barConteudo .acoes-meta,#bcCfgAcoes,.bc-com-acoes{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0}
#barConteudo .acoes-meta button,#barConteudo .acoes-meta a,#bcCfgAcoes button,.bc-com-acoes button{margin:0}
#barConteudo #btnConfigConteudo{margin:0;width:44px;height:44px;padding:0;display:inline-grid;place-items:center;border:0;border-radius:50%;background:transparent;color:var(--acc,#1351b4)}
#btnConfigConteudo svg,#btnComoFunciona svg{width:20px;height:20px;vertical-align:middle}
#barConteudo #btnConfigConteudo:hover,#barConteudo #btnConfigConteudo[aria-expanded=true]{background:rgba(19,81,180,.12)}
#barConteudo :focus-visible,#bcConfig :focus-visible,#bcComo :focus-visible,#btnComoFunciona:focus-visible{outline:3px dashed #9a6700;outline-offset:2px}
#bcConfig,#bcComo{box-sizing:border-box;max-height:calc(100dvh - 24px);overflow:auto;border:1px solid var(--line,#ccc);border-radius:8px;background:#fff;color:#333;padding:20px}
#bcConfig:not([open]),#bcComo:not([open]){display:none}
#bcConfig{position:fixed;inset:12px 12px auto auto;margin:0;width:min(420px,calc(100vw - 24px));z-index:25;box-shadow:0 4px 20px #0003}
#bcComo{width:min(600px,calc(100vw - 24px))}
#bcComo::backdrop{background:#0007}
.bc-cab{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
.bc-cab h2{margin:0;font-size:1.2rem}
.bc-cab button{margin:0;min-width:44px;min-height:44px}
#bcConfig .row{grid-template-columns:minmax(0,1fr);margin:0 0 14px}
#bcConfig .row>*{min-width:0}
#bcConfig input[type=text],#bcConfig select,#barConteudo input[type=text]{min-height:40px}
#bcConfig small:empty{display:none}
#bcConfig .bc-sw{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:44px;margin:0 0 12px;cursor:pointer}
#bcConfig .bc-est{font-size:.875rem;color:#555}
#bcComo ol{padding-inline-start:1.4rem}
#bcComo li{margin-bottom:6px}
#abasApp{margin-top:4px}
#bcAcoesEdicao,.acao-gerar,.fmt-lista{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
#bcAcoesEdicao{margin:8px 0 12px}
#bcAcoesEdicao button,.acao-gerar button,.acao-gerar label,.fmt-lista label{margin:0}
#barConteudo .acoes-meta{min-width:0}
#barConteudo .acoes-meta button{max-width:100%}
header .hb #btnComoFunciona{display:inline-flex;align-items:center;justify-content:center;gap:6px}
#btnComoFunciona svg,#btnConfigConteudo svg{display:block;flex:none}
#barConteudo #btnConfigConteudo.bc-clique{background:#168821;color:#fff}
@media(min-width:1000px){
  #barConteudo{display:grid;grid-template-columns:minmax(0,420px) max-content 44px;grid-template-rows:auto auto;justify-content:start;row-gap:4px}
  #barConteudo .bc-nome{display:contents}
  #barConteudo label[for=pref]{grid-column:1;grid-row:1;margin:0}
  #barConteudo #pref{grid-column:1;grid-row:2;margin:0}
  #barConteudo .acoes-meta{grid-column:2;grid-row:2}
  #barConteudo #btnConfigConteudo{grid-column:3;grid-row:2}
}
.bc-vh{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:700px){#barConteudo{width:calc(100% - 20px)}#barConteudo .bc-nome{flex-basis:100%;max-width:none}#bcConfig{padding:14px}}
@media print{#barConteudo,#bcConfig,#bcComo{display:none!important}}`;
    document.head.appendChild(st);

    const barra = document.createElement('div');
    barra.id = 'barConteudo';
    barra.setAttribute('role', 'group');
    barra.setAttribute('aria-label', 'Conteúdo');
    abas.before(barra);

    const config = document.createElement('dialog');
    config.id = 'bcConfig';
    config.setAttribute('aria-labelledby', 'bcConfigT');
    config.innerHTML = '<div class="bc-cab"><h2 id="bcConfigT">Configurações do conteúdo</h2><button type="button" class="sec" id="bcConfigFechar">Fechar</button></div><div id="bcCfgAcoes"></div>';
    document.body.appendChild(config);

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.id = 'btnConfigConteudo';
    botao.setAttribute('data-c', '1');
    botao.setAttribute('aria-label', 'Configurações do conteúdo');
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-controls', config.id);
    botao.title = 'Configurações do conteúdo';
    botao.innerHTML = engrenagem;

    const campoNome = nome.parentElement;
    campoNome.classList.add('bc-nome');
    campoNome.querySelectorAll('small').forEach(el => el.classList.add('bc-vh'));
    barra.append(campoNome, acoes, botao);
    const acoesConfig = $('bcCfgAcoes');
    acoesConfig.before(campos);
    const secao = $('pg').closest('section');
    const titulo = secao.querySelector('h2');
    const locais = document.createElement('div');
    locais.id = 'bcAcoesEdicao';
    locais.setAttribute('role', 'group');
    locais.append($('ex'), $('clr'));
    const cabecalho = titulo.closest('summary') || titulo;
    cabecalho.after(locais);
    const contexto = () => {
      const area = $('ps').hidden ? 'Apostila' : 'Apresentação';
      locais.setAttribute('aria-label', 'Ações de ' + area);
      $('ex').setAttribute('aria-label', 'Carregar exemplo de ' + area);
      $('clr').setAttribute('aria-label', 'Limpar ' + area);
    };
    new MutationObserver(contexto).observe($('ps'), { attributes: true, attributeFilter: ['hidden'] });
    contexto();

    function fecharConfig() {
      if (!config.open) return;
      config.close();
      botao.setAttribute('aria-expanded', 'false');
      botao.focus();
    }
    let retornoClique;
    botao.addEventListener('click', () => {
      if (config.open) { fecharConfig(); return; }
      config.show();
      clearTimeout(retornoClique);
      botao.classList.add('bc-clique');
      retornoClique = setTimeout(() => botao.classList.remove('bc-clique'), 180);
      botao.setAttribute('aria-expanded', 'true');
      $('bcConfigFechar').focus();
    });
    $('bcConfigFechar').addEventListener('click', fecharConfig);
    config.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]:modal, .md-back')) {
        e.preventDefault();
        e.stopPropagation();
        fecharConfig();
      }
    });
    config.addEventListener('cancel', e => { e.preventDefault(); fecharConfig(); });

    function interruptor() {
      const sw = [...document.querySelectorAll('input[type=checkbox]')].find(i => {
        const l = i.closest('label');
        return l && !i.closest('.jn-win,#dxShare,dialog') && /^\s*Salvar automático\s*$/.test(l.textContent);
      });
      if (!sw) return false;
      const lab = sw.closest('label');
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-label', 'Salvar automático');
      lab.classList.add('bc-sw');
      acoesConfig.before(lab);
      const est = document.createElement('span');
      est.className = 'bc-est';
      est.setAttribute('aria-hidden', 'true');
      lab.appendChild(est);
      const atual = () => { est.textContent = sw.checked ? 'Ligado' : 'Desligado'; };
      document.addEventListener('change', () => setTimeout(atual), true);
      document.addEventListener('click', () => setTimeout(atual), true);
      atual();
      const nota = [...document.querySelectorAll('main p, main small, main span, main div')].find(e =>
        !e.children.length && /^Salvamento automático (ligado|desligado)/i.test(e.textContent.trim()));
      if (nota) { nota.classList.add('bc-vh'); nota.setAttribute('aria-live', 'polite'); }
      return true;
    }
    if (!interruptor()) setTimeout(interruptor, 1200);

    const como = document.createElement('dialog');
    como.id = 'bcComo';
    como.setAttribute('aria-labelledby', 'bcComoT');
    como.innerHTML = `
      <div class="bc-cab"><h2 id="bcComoT">Como funciona</h2><button type="button" class="sec" id="bcComoFechar" autofocus>Fechar</button></div>
      <h3>Início rápido</h3>
      <ol>
        <li><strong>Crie ou importe</strong> uma apresentação ou apostila.</li>
        <li><strong>Revise a prévia</strong> e confira a acessibilidade. Use a aba Narração se quiser adicionar áudio.</li>
        <li><strong>Gere e baixe</strong> os arquivos nos formatos que precisar.</li>
      </ol>
      <h3>Privacidade e acessibilidade por padrão</h3>
      <p>Edição, geração de arquivos e síntese de áudio rodam no navegador. Nessas operações, o Conteudista não envia seu conteúdo a servidores externos.</p>
      <p>O salvamento automático é local. Se escolher compartilhar pelo PrivateBin, o conteúdo é criptografado antes do envio.</p>
      <p>Use a navegação por teclado e a conferência de acessibilidade no editor para criar materiais mais fáceis de usar.</p>
      <div class="bc-com-acoes"><button type="button" id="bcComoTour">Iniciar tutorial</button><button type="button" class="sec" id="bcComoAjuda">Abrir ajuda</button></div>`;
    document.body.appendChild(como);

    const abrirComo = document.createElement('button');
    abrirComo.type = 'button';
    abrirComo.id = 'btnComoFunciona';
    abrirComo.setAttribute('aria-haspopup', 'dialog');
    abrirComo.setAttribute('aria-controls', como.id);
    abrirComo.innerHTML = informacao + '<span>Como funciona</span>';
    novidades.before(abrirComo);
    abrirComo.addEventListener('click', () => {
      if (config.open) fecharConfig();
      como.showModal();
      $('bcComoFechar').focus();
    });
    $('bcComoFechar').addEventListener('click', () => como.close());
    como.addEventListener('close', () => { if (!como.open) abrirComo.focus(); });
    function abrirRecurso(id) {
      como.addEventListener('close', () => { if ($(id)) $(id).click(); }, { once: true });
      como.close();
    }
    $('bcComoTour').addEventListener('click', () => abrirRecurso('btnTour'));
    $('bcComoAjuda').addEventListener('click', () => abrirRecurso('btnHelp'));

    const antigo = $('dxComo');
    if (antigo) {
      const pai = antigo.parentElement;
      if (pai.tagName === 'SECTION' && pai.children.length === 1) pai.remove();
      else antigo.remove();
    }
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', montar);
  else montar();
})();
