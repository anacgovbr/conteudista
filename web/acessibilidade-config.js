(function (global) {
  'use strict';

  const $ = id => document.getElementById(id);
  const prefixo = 'acessibilidade_texto.';
  const regrasPrefixo = prefixo + 'regras.';
  const esc = valor => String(valor == null ? '' : valor).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let dialog;
  let regras = [];

  function registro() {
    return Opcoes.REGISTRO.filter(r => r.caminho.startsWith(prefixo));
  }

  function valorYaml(r) {
    const atual = Opcoes.ler(r.chave, r.padrao);
    if (r.tipo === 'chave') return atual === '1' ? 'ligado' : 'desligado';
    if (r.tipo === 'numero') return Number(atual);
    return Object.keys(r.valores).find(k => r.valores[k] === atual) || r.padrao;
  }

  function controle(r, regra) {
    const id = 'lacfg-' + r.caminho.replace(/[^a-z0-9]+/gi, '-');
    if (r.tipo === 'chave') return '<label class="la-cfg-chave" for="' + id + '"><input id="' + id + '" data-caminho="' + esc(r.caminho) + '" type="checkbox" role="switch"' + (valorYaml(r) === 'ligado' ? ' checked' : '') + '><span>' + esc(regra ? regra.titulo + ' (' + regra.codigo + ')' : r.rotulo.replace(/^Acessibilidade do texto:\s*/, '')) + '</span></label>';
    if (r.tipo === 'numero') return '<label class="la-cfg-num" for="' + id + '"><span>' + esc(r.rotulo.replace(/^Acessibilidade do texto:\s*/, '')) + '</span><input id="' + id + '" data-caminho="' + esc(r.caminho) + '" type="number" min="' + r.min + '" max="' + r.max + '" step="1" value="' + valorYaml(r) + '"></label>';
    const opcoes = Object.keys(r.valores).map(v => '<option value="' + esc(v) + '"' + (v === valorYaml(r) ? ' selected' : '') + '>' + esc(v === 'desligado' ? 'Desligada' : v === 'corrigir' ? 'Para corrigir' : 'Sugestão') + '</option>').join('');
    return '<label class="la-cfg-num" for="' + id + '"><span>' + esc(regra ? regra.titulo + ' (' + regra.codigo + ')' : r.rotulo.replace(/^Acessibilidade do texto:\s*/, '')) + '</span><select id="' + id + '" data-caminho="' + esc(r.caminho) + '">' + opcoes + '</select></label>';
  }

  function corpo() {
    const todos = registro(), mapa = new Map(regras.map(r => [r.codigo, r]));
    const gerais = todos.filter(r => !r.caminho.startsWith(regrasPrefixo));
    const porRegra = todos.filter(r => r.caminho.startsWith(regrasPrefixo));
    return '<fieldset><legend>Preferências</legend>' + gerais.map(r => controle(r)).join('') + '</fieldset>' +
      '<fieldset><legend>Regras verificadas</legend><p class="la-cfg-ajuda">As opções de nível só mantêm ou reduzem a severidade padrão da regra.</p>' +
      porRegra.map(r => controle(r, mapa.get(r.caminho.split('.').pop()))).join('') + '</fieldset>';
  }

  function gerarDialogo() {
    if (dialog) { dialog.querySelector('.la-cfg-corpo').innerHTML = corpo(); return dialog; }
    dialog = document.createElement('dialog');
    dialog.className = 'la-cfg-dialog';
    dialog.setAttribute('aria-labelledby', 'laCfgTitulo');
    dialog.innerHTML = '<form method="dialog"><header><h2 id="laCfgTitulo">Configurar acessibilidade do texto</h2><button class="sec mini" value="cancelar" aria-label="Fechar configurações">Fechar</button></header>' +
      '<div class="la-cfg-corpo"></div><p class="la-cfg-status" role="status" aria-live="polite"></p>' +
      '<div class="la-cfg-arquivos"><button type="button" class="sec mini" data-exportar>Exportar configuração</button><button type="button" class="sec mini" data-importar>Importar configuração</button><input type="file" accept="application/json,.json" hidden></div>' +
      '<footer><button type="button" class="sec" value="cancelar" data-cancelar>Cancelar</button><button type="button" data-salvar>Aplicar</button></footer></form>';
    const estilo = document.createElement('style'); estilo.textContent = `
.la-cfg-dialog{width:min(720px,calc(100vw - 32px));max-width:none;max-height:min(88vh,900px);padding:0;border:1px solid #888;border-radius:8px;color:#333;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.35);font:15px/1.5 "Segoe UI",Roboto,Arial,sans-serif}
.la-cfg-dialog::backdrop{background:rgba(0,0,0,.55)}.la-cfg-dialog form{display:flex;flex-direction:column;max-height:inherit}
.la-cfg-dialog header,.la-cfg-dialog footer,.la-cfg-arquivos{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 20px;border-bottom:1px solid #ccc}
.la-cfg-dialog header h2{flex:1;margin:0;color:#0c326f;font-size:19px}.la-cfg-dialog footer{justify-content:flex-end;border-top:1px solid #ccc;border-bottom:0}.la-cfg-arquivos{border:0;padding-top:0}
.la-cfg-corpo{overflow:auto;padding:16px 20px 8px}.la-cfg-corpo fieldset{margin:0 0 16px;padding:10px 12px;border:1px solid #ccc;border-radius:4px}.la-cfg-corpo legend{padding:0 5px;color:#0c326f;font-weight:700}
.la-cfg-chave{display:flex;align-items:flex-start;gap:10px;margin:6px 0;padding:4px 0;color:#333;font-weight:400}.la-cfg-chave input{flex:0 0 auto;width:20px;height:20px;margin:1px 0;accent-color:#1351b4}
.la-cfg-num{display:grid;grid-template-columns:minmax(0,1fr) minmax(140px,200px);align-items:center;gap:10px;margin:8px 0;color:#333;font-weight:400}.la-cfg-num input,.la-cfg-num select{width:100%;min-height:40px;padding:6px 8px;border:1px solid #888;border-radius:4px;font:inherit}
.la-cfg-ajuda{margin:2px 0 10px;color:#636363}.la-cfg-status{min-height:1.5em;margin:0;padding:0 20px;color:#b00020}.la-cfg-dialog :focus-visible{outline:3px dashed #c2850c;outline-offset:3px}
html.contraste .la-cfg-dialog{background:#000;color:#fff;border-color:#fff}html.contraste .la-cfg-dialog h2,html.contraste .la-cfg-dialog legend{color:#fff}html.contraste .la-cfg-chave,html.contraste .la-cfg-num{color:#fff}
@media(max-width:600px){.la-cfg-dialog{width:100vw;max-width:none;max-height:100dvh;height:100dvh;border-radius:0}.la-cfg-num{grid-template-columns:1fr}.la-cfg-dialog header,.la-cfg-dialog footer,.la-cfg-arquivos{padding-left:16px;padding-right:16px}.la-cfg-dialog footer button,.la-cfg-arquivos button{min-height:44px}}
@media(prefers-reduced-motion:reduce){.la-cfg-dialog *{scroll-behavior:auto!important}}`;
    document.head.append(estilo); document.body.append(dialog);
    dialog.addEventListener('click', async event => {
      const botao = event.target.closest('button'); if (!botao) return;
      if (botao.hasAttribute('data-cancelar')) { dialog.close(); return; }
      if (botao.hasAttribute('data-exportar')) { exportar(); return; }
      if (botao.hasAttribute('data-importar')) { dialog.querySelector('input[type=file]').click(); return; }
      if (botao.hasAttribute('data-salvar')) { aplicar(); return; }
    });
    dialog.querySelector('input[type=file]').addEventListener('change', importar);
    return dialog;
  }

  function atualizarStatus(mensagem, erro = false) {
    const status = dialog && dialog.querySelector('.la-cfg-status');
    if (status) { status.textContent = mensagem; status.style.color = erro ? '#b00020' : '#168821'; }
  }

  function baixar(nome, texto) {
    const url = URL.createObjectURL(new Blob([texto], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function exportar() {
    const opcoes = {};
    try {
      registro().forEach(r => {
        const campo = dialog && [...dialog.querySelectorAll('[data-caminho]')].find(x => x.dataset.caminho === r.caminho);
        opcoes[r.caminho] = campo ? (r.tipo === 'chave' ? (campo.checked ? 'ligado' : 'desligado') : r.tipo === 'numero' ? Number(campo.value) : campo.value) : valorYaml(r);
      });
      baixar('conteudista-acessibilidade.json', JSON.stringify({ versao: 1, opcoes }, null, 2) + '\n');
      atualizarStatus('Configuração exportada.');
    } catch (erro) { atualizarStatus(erro.message || 'Não foi possível exportar a configuração.', true); }
  }

  async function importar(event) {
    const arquivo = event.target.files && event.target.files[0]; event.target.value = '';
    if (!arquivo) return;
    try {
      const dados = JSON.parse(await arquivo.text());
      if (dados.versao !== 1 || !dados.opcoes || typeof dados.opcoes !== 'object') throw new Error('O arquivo não é uma configuração compatível.');
      const aplicaveis = [];
      for (const [caminho, valor] of Object.entries(dados.opcoes)) {
        const r = Opcoes.REGISTRO.find(x => x.caminho === caminho);
        if (!r || !caminho.startsWith(prefixo)) continue;
        const n = Opcoes.normalizar(r, valor);
        if (!n.ok) throw new Error(caminho + ': ' + n.msg);
        aplicaveis.push([caminho, valor]);
      }
      if (!aplicaveis.length) throw new Error('O arquivo não contém opções reconhecidas.');
      const d = gerarDialogo();
      aplicaveis.forEach(([caminho, valor]) => {
        const r = Opcoes.REGISTRO.find(x => x.caminho === caminho), campo = [...d.querySelectorAll('[data-caminho]')].find(x => x.dataset.caminho === caminho);
        const normalizado = Opcoes.normalizar(r, valor).v;
        if (campo) { if (r.tipo === 'chave') campo.checked = normalizado === 'ligado'; else campo.value = String(normalizado); }
      });
      atualizarStatus('Configuração importada. Revise e aplique.');
    } catch (erro) { atualizarStatus(erro.message || 'Não foi possível ler a configuração.', true); }
  }

  function aplicar() {
    try {
      const campos = [...dialog.querySelectorAll('[data-caminho]')];
      const valores = campos.map(campo => {
        const r = Opcoes.REGISTRO.find(x => x.caminho === campo.dataset.caminho);
        const v = r.tipo === 'chave' ? (campo.checked ? 'ligado' : 'desligado') : r.tipo === 'numero' ? Number(campo.value) : campo.value;
        const n = Opcoes.normalizar(r, v);
        if (!n.ok) throw new Error(r.caminho + ': ' + n.msg);
        return [r.caminho, v];
      });
      valores.forEach(([caminho, valor]) => Opcoes.definir(caminho, valor));
      document.dispatchEvent(new CustomEvent('conteudista:opcoes'));
      if (global.AcessibilidadeTexto) AcessibilidadeTexto.atualizarOpcoes();
      atualizarStatus('Configuração aplicada.');
      dialog.close();
    } catch (erro) { atualizarStatus(erro.message || 'Não foi possível aplicar a configuração.', true); }
  }

  async function abrir() {
    const L = await import('./lib/linguagem-acessivel/index.js');
    regras = L.regras();
    const d = gerarDialogo();
    d.querySelector('.la-cfg-corpo').innerHTML = corpo();
    atualizarStatus('');
    d.showModal();
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.la-configurar')) return;
    event.preventDefault();
    abrir().catch(erro => atualizarStatus(erro.message || 'Não foi possível abrir as configurações.', true));
  });
  global.AcessibilidadeConfig = { abrir, exportar, importar };
})(window);