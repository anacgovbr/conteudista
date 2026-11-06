(function (global) {
  'use strict';

  const CHAVE_SESSAO = 'conteudista.acessibilidade.naoPerguntarAoGerar';
  const plural = (n, singular, plural) => n + ' ' + (n === 1 ? singular : plural);

  function opcaoLigada() {
    return !global.Opcoes || Opcoes.ligado('acessibilidade_texto.confirmar_ao_gerar');
  }

  async function analisar() {
    const A = global.AcessibilidadeTexto;
    if (!A || typeof A.analisarAgora !== 'function') return [];
    const resultados = await Promise.all(['g', 's'].map(k => A.analisarAgora(k)));
    return resultados.map((resultado, i) => ({
      k: i ? 's' : 'g',
      resultado,
      corrigir: resultado ? resultado.resumo.corrigir : 0,
      sugestoes: resultado ? resultado.resumo.sugestoes : 0,
    }));
  }

  function confirmar(resultados) {
    const afetados = resultados.filter(x => x.corrigir > 0);
    const total = afetados.reduce((n, x) => n + x.corrigir, 0);
    if (!total) return Promise.resolve(true);

    const volta = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'la-gerar-dialog';
    dialog.setAttribute('aria-labelledby', 'laGerarTitulo');
    dialog.setAttribute('aria-describedby', 'laGerarResumo');
    const corpo = document.createElement('div');
    corpo.innerHTML = '<h2 id="laGerarTitulo">Há ' + total + ' ' + (total === 1 ? 'item' : 'itens') + ' de acessibilidade para corrigir</h2>' +
      '<p id="laGerarResumo">Você pode conferir agora ou gerar os arquivos assim mesmo.</p>' +
      '<label><input type="checkbox" id="laGerarSessao"> Não perguntar de novo nesta sessão</label>' +
      '<div class="la-gerar-acoes"><button type="button" data-acao="conferir" autofocus>Conferir agora</button>' +
      '<button type="button" class="sec" data-acao="gerar">Gerar assim mesmo</button>' +
      '<button type="button" class="sec" data-acao="cancelar">Cancelar</button></div>';
    dialog.append(corpo);
    document.body.append(dialog);

    const estilo = document.getElementById('la-gerar-css') || document.createElement('style');
    estilo.id = 'la-gerar-css';
    estilo.textContent = `
.la-gerar-dialog{width:min(520px,calc(100vw - 32px));max-width:none;padding:0;border:1px solid #888;border-radius:8px;color:#333;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.35);font:15px/1.5 "Segoe UI",Roboto,Arial,sans-serif}
.la-gerar-dialog::backdrop{background:rgba(0,0,0,.55)}
.la-gerar-dialog h2{margin:0;padding:20px 24px 8px;color:#0c326f;font-size:19px}
.la-gerar-dialog p{margin:0;padding:0 24px 14px}
.la-gerar-dialog label{display:flex;align-items:center;gap:8px;padding:0 24px 16px;font-weight:400;color:#333}
.la-gerar-acoes{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding:12px 24px;border-top:1px solid #ccc}
.la-gerar-acoes button{min-height:44px;margin:0}
.la-gerar-dialog :focus-visible{outline:3px dashed #c2850c;outline-offset:3px}
html.contraste .la-gerar-dialog{background:#000;color:#fff;border-color:#fff}
html.contraste .la-gerar-dialog h2,html.contraste .la-gerar-dialog label{color:#fff}
@media(max-width:600px){.la-gerar-dialog{width:100vw;max-width:none;max-height:100dvh;margin:auto 0 0;border-radius:12px 12px 0 0}.la-gerar-acoes{flex-direction:column}.la-gerar-acoes button{width:100%}}
@media(prefers-reduced-motion:reduce){.la-gerar-dialog *{scroll-behavior:auto!important}}`;
    if (!estilo.isConnected) document.head.append(estilo);

    let naoPerguntar = false;
    try { naoPerguntar = sessionStorage.getItem(CHAVE_SESSAO) === '1'; } catch (e) { /* armazenamento indisponível */ }
    const caixa = corpo.querySelector('#laGerarSessao');
    caixa.checked = naoPerguntar;
    caixa.addEventListener('change', () => {
      try { sessionStorage.setItem(CHAVE_SESSAO, caixa.checked ? '1' : '0'); } catch (e) { /* armazenamento indisponível */ }
    });

    return new Promise(resolve => {
      let resolvido = false;
      const finalizar = valor => {
        if (resolvido) return;
        resolvido = true;
        const acao = dialog.returnValue;
        dialog.remove();
        if (acao === 'conferir') {
          const selecionado = afetados.slice().sort((a, b) => b.corrigir - a.corrigir)[0];
          const aba = document.getElementById(selecionado.k === 's' ? 'ts' : 'tg');
          if (aba) aba.click();
          if (global.AcessibilidadeTexto) AcessibilidadeTexto.abrir(selecionado.k);
        } else if (volta && volta.isConnected) {
          volta.focus({ preventScroll: true });
        }
        resolve(valor);
      };
      dialog.addEventListener('close', () => finalizar(dialog.returnValue === 'gerar'));
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        dialog.close('cancelar');
      });
      corpo.querySelectorAll('[data-acao]').forEach(botao => botao.addEventListener('click', () => {
        dialog.close(botao.dataset.acao);
      }));
      dialog.showModal();
    });
  }

  async function antesDeGerar() {
    if (!opcaoLigada()) return true;
    try {
      let ignorar = false;
      try { ignorar = sessionStorage.getItem(CHAVE_SESSAO) === '1'; } catch (e) { /* armazenamento indisponível */ }
      if (ignorar) return true;
      const resultados = await analisar();
      return await confirmar(resultados);
    } catch (e) {
      if (global.console) console.warn('[Conteudista] Não foi possível conferir o texto antes de gerar:', e);
      return true;
    }
  }

  global.AcessibilidadeGeracao = { antesDeGerar };
})(window);