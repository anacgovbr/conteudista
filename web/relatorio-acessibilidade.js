(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  let dialog;
  let biblioteca;

  const slug = texto => String(texto || 'Conteudo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'Conteudo';

  async function preparar() {
    const A = global.AcessibilidadeTexto;
    const L = biblioteca || (biblioteca = await import('./lib/linguagem-acessivel/index.js'));
    const nome = ($('pref') && $('pref').value.trim()) || '';
    const resultados = [];
    for (const [k, arquivo] of [['g', 'apostila.md'], ['s', 'apresentacao.md']]) {
      const campo = $(k), conteudo = campo && campo.value.trim();
      if (!conteudo || !A) continue;
      const resultado = await A.analisarAgora(k);
      if (resultado) resultados.push({ arquivo, nome, conteudo, resultado });
    }
    const limite = Number(global.Opcoes ? Opcoes.ler('conteudista.acessibilidade.limite', '25') : 25);
    const regras = {};
    if (global.Opcoes) Opcoes.REGISTRO.filter(r => r.caminho.startsWith('acessibilidade_texto.regras.')).forEach(r => {
      const codigo = r.caminho.split('.').pop(), regra = L.regras().find(x => x.codigo === codigo), nivel = Opcoes.ler(r.chave, r.padrao);
      if (regra) regras[regra.id] = nivel === 'desligado' ? false : nivel;
    });
    return L.criarRelatorio({
      nome,
      config: {
        versaoConteudista: global.Conteudista && Conteudista.versao,
        limiteFraseLonga: limite,
        limiteFraseNarracao: limite,
        regras,
      },
      resultados,
    });
  }

  function baixar(relatorio, formato) {
    const conteudo = formato === 'json' ? JSON.stringify(relatorio, null, 2) + '\n'
      : formato === 'markdown' ? biblioteca.relatorioMarkdown(relatorio)
        : biblioteca.relatorioHtml(relatorio);
    const tipo = formato === 'json' ? 'application/json' : formato === 'markdown' ? 'text/markdown' : 'text/html';
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo + ';charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = slug(relatorio.nome) + '_relatorio_acessibilidade.' + (formato === 'markdown' ? 'md' : formato);
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function garantirDialogo() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'la-relatorio-dialog';
    dialog.setAttribute('aria-labelledby', 'laRelatorioTitulo');
    dialog.innerHTML = '<h2 id="laRelatorioTitulo">Relatório de acessibilidade</h2>' +
      '<p>Escolha o formato do arquivo.</p><p role="status" aria-live="polite"></p><div class="la-relatorio-acoes">' +
      '<button type="button" data-formato="html">Baixar HTML</button>' +
      '<button type="button" class="sec" data-formato="json">Baixar JSON</button>' +
      '<button type="button" class="sec" data-formato="markdown">Baixar Markdown</button>' +
      '<button type="button" class="sec" data-fechar>Cancelar</button></div>';
    dialog.addEventListener('click', async event => {
      const botao = event.target.closest('button');
      if (!botao) return;
      if (botao.hasAttribute('data-fechar')) { dialog.close(); return; }
      const formato = botao.dataset.formato;
      botao.disabled = true;
      try { baixar(await preparar(), formato); dialog.close(); }
      catch (erro) {
        const status = dialog.querySelector('[role="status"]');
        if (status) status.textContent = 'Não foi possível gerar o relatório. ' + (erro.message || '');
      } finally { botao.disabled = false; }
    });
    const estilo = document.createElement('style');
    estilo.textContent = `
.la-relatorio-dialog{width:min(520px,calc(100vw - 32px));max-width:none;padding:0;border:1px solid #888;border-radius:8px;color:#333;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.35);font:15px/1.5 "Segoe UI",Roboto,Arial,sans-serif}
.la-relatorio-dialog::backdrop{background:rgba(0,0,0,.55)}
.la-relatorio-dialog h2{margin:0;padding:20px 24px 8px;color:#0c326f;font-size:19px}
.la-relatorio-dialog p{padding:0 24px;margin:0 0 12px}
.la-relatorio-acoes{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding:12px 24px;border-top:1px solid #ccc}
.la-relatorio-acoes button{min-height:44px;margin:0}
.la-relatorio-dialog :focus-visible{outline:3px dashed #c2850c;outline-offset:3px}
html.contraste .la-relatorio-dialog{background:#000;color:#fff;border-color:#fff}html.contraste .la-relatorio-dialog h2{color:#fff}
@media(max-width:600px){.la-relatorio-dialog{width:100vw;max-width:none;max-height:100dvh;margin:auto 0 0;border-radius:12px 12px 0 0}.la-relatorio-acoes{flex-direction:column}.la-relatorio-acoes button{width:100%}}`;
    document.head.append(estilo);
    document.body.append(dialog);
    return dialog;
  }

  async function abrir() {
    const d = garantirDialogo();
    const status = d.querySelector('[role="status"]');
    if (status) status.textContent = '';
    d.showModal();
  }

  async function html() {
    const L = biblioteca || (biblioteca = await import('./lib/linguagem-acessivel/index.js'));
    return L.relatorioHtml(await preparar());
  }

  document.addEventListener('click', event => {
    if (event.target.closest('#btnRelatorioAcessibilidade,.la-relatorio')) {
      event.preventDefault();
      abrir().catch(erro => {
        if (global.UXFeedback) UXFeedback.anunciar('Não foi possível abrir o relatório de acessibilidade.');
        if (global.console) console.error('[Conteudista] Relatório de acessibilidade:', erro);
      });
    }
  });

  global.RelatorioAcessibilidade = { abrir, preparar, html };
})(window);