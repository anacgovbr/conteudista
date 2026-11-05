/* =====================================================================================
   Conteudista — Opções padrão (web/config/opcoes.yaml)
   - Lê o arquivo YAML ao abrir a página e define como cada opção COMEÇA.
   - Prioridade: escolha da pessoa neste navegador > opcoes.yaml > padrão do código.
   - O mesmo arquivo roda no navegador e no Node (testes e verificação no GitHub).
   - Sem dependências. Lê um subconjunto simples de YAML: mapas por indentação de 2 espaços,
     valores de uma linha, comentários com #.
   ===================================================================================== */
(function (raiz) {
  'use strict';

  /* ---------------------------- Registro (fonte única) ----------------------------
     caminho   : nome da opção no YAML (grupo.opcao)
     tipo      : 'chave' (ligado/desligado) | 'escolha' | 'numero'
     padrao    : valor quando o YAML não define nada (igual ao comportamento anterior)
     valores   : valor do YAML -> valor gravado/usado pelo código
     chave     : nome no armazenamento do navegador (null = não é lembrado; vale só ao abrir)
     controles : identificação do controle na tela (usada pelo teste de cobertura)        */
  const LIG = { ligado: '1', desligado: '0' };
  const REGISTRO = [
    { caminho: 'editor.modo_inicial', tipo: 'escolha', padrao: 'dividido', valores: { editar: 'e', dividido: 's', previa: 'p' },
      chave: 'mde.modo', controles: [], rotulo: 'Modo do editor ao abrir', descricao: 'editar: só o texto · dividido: texto e prévia · previa: só a prévia.' },
    { caminho: 'editor.imagens.recomprimir_grandes', tipo: 'chave', padrao: 'ligado', valores: LIG,
      chave: null, controles: ['data-s'], rotulo: 'Reduzir imagens: recomprimir também as acima de 300 KB' },

    { caminho: 'aplicativo.layout', tipo: 'escolha', padrao: 'govbr',
      valores: { govbr: 'govbr', anac20_claro: 'anac20-claro', anac20_escuro: 'anac20-escuro', classico: 'classico' },
      chave: 'conteudista.tema', controles: ['tema'], rotulo: 'Layout (tema) dos arquivos gerados' },
    { caminho: 'aplicativo.alto_contraste', tipo: 'chave', padrao: 'desligado', valores: LIG,
      chave: 'conteudista.contraste', controles: ['btnContraste'], rotulo: 'Alto contraste no aplicativo' },

    { caminho: 'salvar.automaticamente', tipo: 'chave', padrao: 'ligado', valores: LIG,
      chave: 'conteudista.auto', controles: ['auto', 'jnAuto'], rotulo: 'Salvar automaticamente neste navegador' },
    { caminho: 'salvar.lembrar_links', tipo: 'chave', padrao: 'ligado', valores: LIG,
      chave: 'conteudista.keep', controles: ['keep'], rotulo: 'Lembrar os links criados neste navegador' },
    { caminho: 'salvar.guardar_cada_geracao', tipo: 'chave', padrao: 'ligado', valores: LIG,
      chave: 'conteudista.gerados.ativo', controles: ['gerAtivo'], rotulo: 'Guardar automaticamente cada geração no Histórico' },
    { caminho: 'salvar.limite_de_geracoes', tipo: 'numero', padrao: 10, min: 1, max: 100,
      chave: 'conteudista.gerados.limite', controles: ['gerLim'], rotulo: 'Quantas gerações o Histórico guarda' },

    { caminho: 'link.onde_guardar', tipo: 'escolha', padrao: 'autocontido', valores: { autocontido: 'self', privatebin: 'pb' },
      chave: null, controles: ['mode'], rotulo: 'Onde guardar o link criptografado' },
    { caminho: 'link.expira_em', tipo: 'escolha', padrao: '1_semana',
      valores: { '1_hora': '1hour', '1_dia': '1day', '1_semana': '1week', '1_mes': '1month', '1_ano': '1year', nunca: 'never' },
      chave: null, controles: ['exp'], rotulo: 'PrivateBin: prazo de validade do link' },
    { caminho: 'link.apagar_apos_primeira_leitura', tipo: 'chave', padrao: 'desligado', valores: LIG,
      chave: null, controles: ['burn'], rotulo: 'PrivateBin: apagar após a primeira leitura' },
    { caminho: 'link.imagens_como_anexo', tipo: 'chave', padrao: 'ligado', valores: LIG,
      chave: null, controles: ['anexo'], rotulo: 'PrivateBin: enviar as imagens como anexo (ZIP)' },

    { caminho: 'importar.aba_inicial', tipo: 'escolha', padrao: 'automatica',
      valores: { automatica: '', salvos: 'sav', computador: 'pc', colar: 'cl' },
      chave: null, controles: [], rotulo: 'Aba que abre em Importar',
      descricao: 'automatica: a última usada; na primeira vez, Salvos (se houver) ou Computador. A escolha da pessoa continua valendo.' },

    { caminho: 'narracao.narrar_slides', tipo: 'chave', padrao: 'desligado', valores: LIG,
      chave: 'narr.on', controles: ['narrOn'], rotulo: 'Narração dos slides (gerar áudio das notas)' },
    { caminho: 'narracao.avancar_sozinho', tipo: 'chave', padrao: 'desligado', valores: LIG,
      chave: 'narr.auto', controles: ['narrAuto'], rotulo: 'Avançar os slides sozinho ao fim da narração' },
    { caminho: 'narracao.formato_audio', tipo: 'escolha', padrao: 'mp3', valores: { mp3: 'mp3', ogg: 'ogg', wav: 'wav' },
      chave: 'narr.fmt', controles: ['narrFmt'], rotulo: 'Formato do áudio da narração' },

    { caminho: 'locucao.carregar_audio_ao_abrir', tipo: 'chave', padrao: 'desligado', valores: LIG,
      chave: 'loc.preload', controles: ['locPreload'], rotulo: 'Locução: carregar os recursos de áudio ao abrir a página' },
    { caminho: 'locucao.formato_audio', tipo: 'escolha', padrao: 'mp3', valores: { mp3: 'mp3', ogg: 'ogg', wav: 'wav' },
      chave: 'loc.fmt', controles: ['locFmt'], rotulo: 'Locução: formato do arquivo' },
    { caminho: 'locucao.notas_dos_slides', tipo: 'chave', padrao: 'ligado', valores: { ligado: 'notas', desligado: 'livre' },
      chave: 'conteudista.locucao.modo', controles: [], rotulo: 'Locução: começar em "Notas dos slides" (desligado: texto livre)' },
  ];
  // Caixas de seleção que NÃO são opções padrão (o teste de cobertura aceita só estas exceções).
  const EXCECOES = {
    'task': 'caixa de tarefa da prévia (somente leitura)',
    'data-so': '"Só substituir quando for menor" é marcada sozinha conforme girar ou cortar a imagem',
    'data-sel': 'seleção de imagens para editar em lote (vale só naquele momento)',
    'data-off': '"Sem narração" de cada slide (faz parte do texto, não é preferência)',
  };

  const POR_CAMINHO = new Map(REGISTRO.map(r => [r.caminho, r]));
  const POR_CHAVE = new Map(REGISTRO.filter(r => r.chave).map(r => [r.chave, r]));
  const ARQUIVO = 'config/opcoes.yaml';
  const VERSAO_FORMATO = 1;

  /* ---------------------------- Leitor de YAML (subconjunto) ---------------------------- */
  function semComentario(l) {
    let q = null;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '#' && (i === 0 || /\s/.test(l[i - 1]))) return l.slice(0, i);
    }
    return l;
  }
  function escalar(t) {
    t = t.trim();
    if (/^"(?:[^"\\]|\\.)*"$/.test(t)) { try { return JSON.parse(t); } catch (e) { return t.slice(1, -1); } }
    if (/^'.*'$/.test(t)) return t.slice(1, -1).replace(/''/g, "'");
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    return t;
  }
  function lerYaml(texto) {
    const raizObj = {}, pilha = [{ ind: -1, obj: raizObj }], erros = [];
    String(texto).replace(/^\uFEFF/, '').split(/\r?\n/).forEach((bruta, i) => {
      const n = i + 1;
      if (/^\s*\t/.test(bruta)) { erros.push({ linha: n, msg: 'use espaços, não tabulação' }); return; }
      const l = semComentario(bruta).replace(/\s+$/, '');
      if (!l.trim()) return;
      if (/^\s*-\s/.test(l)) { erros.push({ linha: n, msg: 'listas não são aceitas aqui' }); return; }
      const ind = l.match(/^ */)[0].length;
      const m = l.trim().match(/^([A-Za-z0-9_]+)\s*:(?:\s+(.*))?$/);
      if (!m) { erros.push({ linha: n, msg: 'linha não entendida (esperado "nome: valor")' }); return; }
      while (pilha.length > 1 && ind <= pilha[pilha.length - 1].ind) pilha.pop();
      const pai = pilha[pilha.length - 1];
      if (ind !== pai.ind + 2 && !(pai.ind === -1 && ind === 0)) { erros.push({ linha: n, msg: 'indentação deve ser de 2 espaços' }); return; }
      if (Object.prototype.hasOwnProperty.call(pai.obj, m[1])) erros.push({ linha: n, msg: '"' + m[1] + '" repetido; vale o último' });
      if (m[2] === undefined || m[2] === '') { const filho = {}; Object.defineProperty(filho, '__linha', { value: n }); pai.obj[m[1]] = filho; pilha.push({ ind, obj: filho }); }
      else { pai.obj[m[1]] = escalar(m[2]); Object.defineProperty(pai.obj, '__l_' + m[1], { value: n, configurable: true }); }
    });
    return { dados: raizObj, erros };
  }

  /* ---------------------------- Validação ---------------------------- */
  const SIM = /^(ligado|sim|true|on)$/i, NAO = /^(desligado|n[aã]o|false|off)$/i;
  function normalizar(r, v) {
    if (r.tipo === 'chave') {
      if (v === true || (typeof v === 'string' && SIM.test(v))) return { ok: true, v: 'ligado' };
      if (v === false || (typeof v === 'string' && NAO.test(v))) return { ok: true, v: 'desligado' };
      return { ok: false, msg: 'use ligado ou desligado' };
    }
    if (r.tipo === 'numero') {
      if (typeof v !== 'number' || !Number.isInteger(v)) return { ok: false, msg: 'use um número inteiro' };
      if (v < r.min || v > r.max) return { ok: false, msg: 'use um número de ' + r.min + ' a ' + r.max };
      return { ok: true, v };
    }
    const k = String(v).toLowerCase().replace(/-/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (Object.prototype.hasOwnProperty.call(r.valores, k)) return { ok: true, v: k };
    return { ok: false, msg: 'valores aceitos: ' + Object.keys(r.valores).join(', ') };
  }
  function interpretar(texto) {
    const { dados, erros } = lerYaml(texto);
    const avisos = erros.map(e => ({ linha: e.linha, msg: e.msg }));
    const valores = {};
    if (dados.versao !== undefined && dados.versao !== VERSAO_FORMATO) avisos.push({ linha: dados.__l_versao || 0, msg: 'versao ' + dados.versao + ' não reconhecida (esperado ' + VERSAO_FORMATO + ')' });
    (function andar(obj, prefixo) {
      Object.keys(obj).forEach(k => {
        if (!prefixo && k === 'versao') return;
        const cam = prefixo ? prefixo + '.' + k : k, v = obj[k];
        if (v && typeof v === 'object') { andar(v, cam); return; }
        const linha = obj['__l_' + k] || 0, r = POR_CAMINHO.get(cam);
        if (!r) { avisos.push({ linha, msg: '"' + cam + '" não existe; foi ignorada' }); return; }
        const n = normalizar(r, v);
        if (n.ok) valores[cam] = n.v; else avisos.push({ linha, msg: cam + ': ' + n.msg + '; vale o padrão (' + r.padrao + ')' });
      });
    })(dados, '');
    return { valores, avisos };
  }

  /* ---------------------------- Resolução de valores ---------------------------- */
  let doYaml = {};
  let avisosCarga = [];
  let carregado = false;
  const armaz = () => { try { return raiz.localStorage || null; } catch (e) { return null; } };
  const gravado = (r, v) => (r.tipo === 'numero' ? String(v) : r.valores[v]);
  function padraoDe(caminho) {                      // opcoes.yaml > padrão do código (formato do YAML)
    const r = POR_CAMINHO.get(caminho); if (!r) return undefined;
    return Object.prototype.hasOwnProperty.call(doYaml, caminho) ? doYaml[caminho] : r.padrao;
  }
  function inicial(caminho) {                        // valor pronto para o código (ex.: 's', '1', 'self')
    const r = POR_CAMINHO.get(caminho); if (!r) return undefined;
    return gravado(r, padraoDe(caminho));
  }
  function ler(chave, padraoCodigo) {                // escolha da pessoa > opcoes.yaml > padrão do código
    const ls = armaz();
    let v = null; try { v = ls ? ls.getItem(chave) : null; } catch (e) { v = null; }
    if (v !== null) return v;
    const r = POR_CHAVE.get(chave);
    return r ? gravado(r, padraoDe(r.caminho)) : (padraoCodigo === undefined ? null : padraoCodigo);
  }
  function ligado(caminho) { return padraoDe(caminho) === 'ligado'; }
  function restaurar() {
    const ls = armaz(), apagadas = [];
    if (!ls) return apagadas;
    REGISTRO.forEach(r => { if (!r.chave) return; try { if (ls.getItem(r.chave) !== null) { ls.removeItem(r.chave); apagadas.push(r.chave); } } catch (e) { /* */ } });
    try { ls.removeItem('conteudista.importar.aba'); } catch (e) { /* */ }
    return apagadas;
  }

  /* ---------------------------- Carga no navegador ---------------------------- */
  function carregar(url) {
    lerArquivo(url);
    if (avisosCarga.length && raiz.console) raiz.console.warn('[Conteudista] opcoes.yaml:\n' + avisosCarga.map(a => (a.linha ? 'linha ' + a.linha + ': ' : '') + a.msg).join('\n'));
  }
  function lerArquivo(url) {
    // Leitura síncrona proposital: as preferências precisam existir antes de o editor e os módulos montarem a tela.
    // O arquivo é pequeno e do mesmo endereço; em caso de falha, valem os padrões do código.
    try {
      const x = new raiz.XMLHttpRequest();
      x.open('GET', url, false);
      try { x.setRequestHeader('Cache-Control', 'no-cache'); } catch (e) { /* */ }
      x.send(null);
      if (x.status !== 200 && x.status !== 0) { avisosCarga = [{ linha: 0, msg: ARQUIVO + ' não encontrado (HTTP ' + x.status + '); valem os padrões' }]; return; }
      if (!x.responseText) { avisosCarga = [{ linha: 0, msg: ARQUIVO + ' vazio ou inacessível; valem os padrões' }]; return; }
      const r = interpretar(x.responseText);
      doYaml = r.valores; avisosCarga = r.avisos; carregado = true;
    } catch (e) {
      avisosCarga = [{ linha: 0, msg: 'não foi possível ler ' + ARQUIVO + ' (' + ((e && e.message) || e) + '); valem os padrões' }];
    }
  }

  const API = {
    VERSAO_FORMATO, ARQUIVO, REGISTRO, EXCECOES,
    lerYaml, interpretar, normalizar,
    ler, inicial, ligado, padraoDe, restaurar,
    carregado: () => carregado,
    avisos: () => avisosCarga.slice(),
    /* só para testes: define os valores como se viessem do YAML */
    _definir: (valores, avisos) => { doYaml = valores || {}; avisosCarga = avisos || []; carregado = true; },
  };

  if (typeof module === 'object' && module.exports) { module.exports = API; return; }
  raiz.Opcoes = API;
  carregar(ARQUIVO);
})(typeof window !== 'undefined' ? window : globalThis);
