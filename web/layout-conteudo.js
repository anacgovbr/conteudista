/* Conteudista: barra global, configuracoes do conteudo e inicio rapido. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const informacao = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v2"/></svg>';

  function montar() {
    const abas = $('abasApp'), menu = $('menuApp');
    const acoes = document.querySelector('.acoes-meta');
    if (!abas || !menu || !acoes || $('barConteudo')) return;

    const st = document.createElement('style');
    st.textContent = `
#barConteudo{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;box-sizing:border-box;width:calc(100% - 40px);max-width:1460px;margin:12px auto 0;padding:0 0 12px;border-bottom:1px solid var(--line,#ccc)}
#barConteudo .acoes-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0}
#barConteudo .acoes-meta button,#barConteudo .acoes-meta a{margin:0}
#barConteudo .acoes-meta{min-width:0}
#barConteudo .acoes-meta button{max-width:100%}
#barConteudo :focus-visible{outline:3px dashed #9a6700;outline-offset:2px}
#abasApp{margin-top:4px}
#bcAcoesEdicao,.acao-gerar,.fmt-lista{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
#bcAcoesEdicao{margin:8px 0 12px}
#bcAcoesEdicao button,.acao-gerar button,.acao-gerar label,.fmt-lista label{margin:0}
.bc-vh{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#bcPref{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}
#bcPref .bc-sw{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:44px;margin:0 0 12px;cursor:pointer}
#bcPref .bc-est{font-size:.875rem;color:#555}
@media(max-width:700px){#barConteudo{width:calc(100% - 20px)}}
@media print{#barConteudo{display:none!important}}`;
    document.head.appendChild(st);

    const barra = document.createElement('div');
    barra.id = 'barConteudo';
    barra.setAttribute('role', 'group');
    barra.setAttribute('aria-label', 'Conteúdo');
    abas.before(barra);

    barra.append(acoes);
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

    function interruptor() {
      const sw = [...document.querySelectorAll('input[type=checkbox]')].find(i => {
        const l = i.closest('label');
        return l && !i.closest('.jn-win,#dxShare,dialog') && /^\s*Salvar automático\s*$/.test(l.textContent);
      });
      if (!sw) return false;
      const lab = sw.closest('label');
      const menu = $('menuApp');
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-label', 'Salvar automático');
      lab.classList.add('bc-sw');
      const grupo = document.createElement('div');
      grupo.id = 'bcPref';
      grupo.setAttribute('role', 'group');
      grupo.setAttribute('aria-labelledby', 'bcPrefT');
      const t = document.createElement('h3');
      t.id = 'bcPrefT';
      t.textContent = 'Preferências';
      t.className = 'bc-vh';
      grupo.appendChild(t);
      grupo.appendChild(lab);
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
      menu.appendChild(grupo);
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
    menu.before(abrirComo);
    abrirComo.addEventListener('click', () => {
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

    window.atualizarInicioCriacao?.();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', montar);
  else montar();
})();
