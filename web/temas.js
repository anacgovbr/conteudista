/* =====================================================================================
   Conteudista — Temas personalizados (1.98)

   - Catálogo dos temas embutidos em config/temas.json (o mesmo arquivo de tools/conteudo).
   - Tema como recurso de primeira classe: IndexedDB (temas, temas_versoes e tema_imagens),
     editor com prévia, contraste WCAG, variantes escura/alto contraste, importação,
     exportação, cópia, link e comparação semântica de versões.
   - O editor NÃO altera o Design System do aplicativo: muda apenas os arquivos gerados e a prévia.
   - DOCX, EPUB e PPTX recebem um subconjunto seguro (cores e, no PPTX, fontes/posições);
     a leitura em DOCX/EPUB continua no padrão acessível.
   API: window.Temas (abrir, atualizarSeletor, aoSelecionar, carregar, salvar, remover,
        importarTexto, garantirContraste, snapshotPacote, jsonParaGeracao, aplicarSnapshot,
        chaveMarkdown, link, iniciar).
   ===================================================================================== */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = v => JSON.parse(JSON.stringify(v == null ? null : v));
  const agora = () => Date.now();
  const num = (v, padrao, faixa, inteiro) => {
    let n = Number(v); if (!isFinite(n)) n = padrao;
    if (inteiro) n = Math.round(n);
    if (faixa) n = Math.max(faixa[0], Math.min(faixa[1], n));
    return n;
  };
  const texto = (v, padrao, limite) => {
    const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return (s || padrao || '').slice(0, limite || 120);
  };
  const corValida = (v, padrao) => {
    let s = String(v == null ? '' : v).trim().toLowerCase();
    if (!s.startsWith('#')) s = '#' + s;
    return /^#[0-9a-f]{6}$/.test(s) ? s : padrao;
  };
  const bool = v => v === true || v === 'sim' || v === 'ligado' || v === 1 || v === '1';
  const slug = s => {
    let t = String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };
  const idSeguro = v => {
    let s = String(v == null ? '' : v).trim().toLowerCase();
    s = s.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    return /^[a-z0-9][a-z0-9_-]*$/.test(s) ? s : '';
  };
  const idNovo = nome => (slug(nome).slice(0, 40) || 'tema') + '-' + agora().toString(36);
  const uidImagem = () => 'img-' + agora().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const formatarData = ms => { try { return new Date(ms || 0).toLocaleString('pt-BR'); } catch (e) { return ''; } };

  /* ---------------------------- Constantes do catálogo ---------------------------- */
  const TELAS = ['capa', 'interna_clara', 'interna_escura', 'finalizacao', 'licenciamento'];
  const ROTULO_TELA = {
    capa: 'Capa', interna_clara: 'Tela interna clara', interna_escura: 'Tela interna escura',
    finalizacao: 'Finalização', licenciamento: 'Licenciamento'
  };
  const PALETA_PADRAO = {
    primaria: '#0c326f', destaque: '#1351b4', apoio: '#168821', alerta: '#8a5c00', erro: '#e52207',
    fundo: '#f8f8f8', superficie: '#ffffff', texto: '#333333', texto_suave: '#636363',
    linha: '#cccccc', suave: '#edf5ff'
  };
  const ROTULO_COR = {
    primaria: 'Primária', destaque: 'Destaque', apoio: 'Apoio', alerta: 'Alerta', erro: 'Erro',
    fundo: 'Fundo da página', superficie: 'Superfície', texto: 'Texto', texto_suave: 'Texto suave',
    linha: 'Linhas', suave: 'Fundo suave'
  };
  const FONTES_PADRAO = {
    titulo: 'Rawline, Raleway, Segoe UI, Arial, sans-serif',
    texto: 'Rawline, Raleway, Segoe UI, Arial, sans-serif',
    tamanho_base: 23, tamanho_titulo: 40, tamanho_h2: 26, entrelinha: 1.45, espacamento: 0
  };
  const ROTULO_FONTE = {
    tamanho_base: 'Tamanho do texto (px)', tamanho_titulo: 'Tamanho do título (px)',
    tamanho_h2: 'Tamanho do subtítulo (px)', entrelinha: 'Entrelinha', espacamento: 'Espaçamento entre letras (em)'
  };
  const IMAGENS_PADRAO = { tamanho_base: 100, arredondamento: 0, sombra: false };
  const MERMAID_PADRAO = { tema: 'default', escala: 100, fundo: '#ffffff' };
  const POSICOES_PADRAO = { margem: 60, topo: 44, base: 60, titulo_espaco: 22 };
  const ROTULO_POSICAO = {
    margem: 'Margem lateral (px)', topo: 'Distância do topo (px)', base: 'Distância da base (px)',
    titulo_espaco: 'Espaço abaixo do título (px)'
  };
  const LIMITES = {
    'fontes.tamanho_base': [14, 32], 'fontes.tamanho_titulo': [28, 72], 'fontes.tamanho_h2': [18, 44],
    'fontes.entrelinha': [1.1, 2.2], 'fontes.espacamento': [-0.1, 0.2],
    'telas.imagem_opacidade': [0, 100], 'telas.titulo_largura': [20, 100],
    'telas.titulo_deslocamento_x': [0, 80], 'telas.titulo_deslocamento_y': [-40, 40],
    'imagens.tamanho_base': [25, 160], 'imagens.arredondamento': [0, 48],
    'mermaid.escala': [50, 200], 'posicoes.margem': [20, 120], 'posicoes.topo': [10, 120],
    'posicoes.base': [20, 120], 'posicoes.titulo_espaco': [0, 60]
  };
  const FONTES_CURADAS = [
    ['Rawline, Raleway, Segoe UI, Arial, sans-serif', 'Rawline (padrão gov.br)'],
    ['Segoe UI, Roboto, Arial, sans-serif', 'Segoe UI'],
    ['Verdana, Geneva, sans-serif', 'Verdana (leitura)'],
    ['Atkinson Hyperlegible Next, Verdana, sans-serif', 'Atkinson Hyperlegible Next (leitura)'],
    ['OpenDyslexic, Verdana, sans-serif', 'OpenDyslexic (dislexia)'],
    ['Georgia, Times New Roman, serif', 'Georgia (serifada)'],
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['system-ui, Segoe UI, sans-serif', 'Fonte do sistema']
  ];
  const TELAS_PADRAO = {
    fundo: '#ffffff', texto: '#333333', imagem: '', imagem_opacidade: 100, imagem_posicao: 'center',
    titulo_alinhamento: 'left', titulo_largura: 100, titulo_deslocamento_x: 0, titulo_deslocamento_y: 0
  };

  let catalogo = null;
  let temaAvulso = null;             // tema recebido por link, ainda não salvo neste navegador
  let janela = null, editor = null, previaTela = 'capa', pastaUI = null;
  let cacheNomes = {};               // id personalizado -> nome (para chaveMarkdown síncrona)
  let cacheTemas = [];               // lista usada pelo seletor e pela janela
  let tRascunho = null, rascunhoPendente = false;

  const catalogoVazio = () => ({
    versao: 1, padrao: 'govbr', telas: TELAS.slice(),
    temas: {
      govbr: { id: 'govbr', nome: 'Padrão gov.br', descricao: 'Design System do Governo Federal.', embutido: true, base: 'govbr', paleta: clone(PALETA_PADRAO), fontes: clone(FONTES_PADRAO), imagens: clone(IMAGENS_PADRAO), mermaid: clone(MERMAID_PADRAO), posicoes: clone(POSICOES_PADRAO), telas: {} },
      classico: { id: 'classico', nome: 'Clássico', descricao: 'Layout original do Conteudista.', embutido: true, base: 'classico', paleta: { primaria: '#0b3d6e', destaque: '#0a7cc1', apoio: '#19a974', alerta: '#9a5b00', erro: '#e52207', fundo: '#f6f8fb', superficie: '#ffffff', texto: '#1b2430', texto_suave: '#5a6676', linha: '#dfe5ee', suave: '#eef4fa' }, fontes: { titulo: 'Segoe UI, Roboto, Arial, sans-serif', texto: 'Segoe UI, Roboto, Arial, sans-serif', tamanho_base: 23, tamanho_titulo: 40, tamanho_h2: 26, entrelinha: 1.45, espacamento: 0 }, imagens: clone(IMAGENS_PADRAO), mermaid: clone(MERMAID_PADRAO), posicoes: clone(POSICOES_PADRAO), telas: {} },
      'anac20-claro': { id: 'anac20-claro', nome: 'ANAC 20 anos — claro', descricao: 'Muda a apresentação; a apostila segue o padrão gov.br.', embutido: true, base: 'anac20-claro', paleta: clone(PALETA_PADRAO), fontes: clone(FONTES_PADRAO), imagens: clone(IMAGENS_PADRAO), mermaid: clone(MERMAID_PADRAO), posicoes: clone(POSICOES_PADRAO), telas: {} },
      'anac20-escuro': { id: 'anac20-escuro', nome: 'ANAC 20 anos — escuro', descricao: 'Muda a apresentação; a apostila segue o padrão gov.br.', embutido: true, base: 'anac20-escuro', paleta: { primaria: '#ffffff', destaque: '#d5a900', apoio: '#16b8c4', alerta: '#ffc266', erro: '#ff8a80', fundo: '#071d41', superficie: '#0d2a4f', texto: '#ffffff', texto_suave: '#dce8ee', linha: '#2f4d6e', suave: '#14334a' }, fontes: clone(FONTES_PADRAO), imagens: clone(IMAGENS_PADRAO), mermaid: { tema: 'dark', escala: 100, fundo: '#071d41' }, posicoes: clone(POSICOES_PADRAO), telas: {} }
    }
  });

  function carregarCatalogo() {
    if (catalogo) return Promise.resolve(catalogo);
    return fetch('config/temas.json', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(j => {
        if (!j || !j.temas || !j.temas.govbr) throw new Error('catálogo sem o tema gov.br');
        catalogo = j;
        return catalogo;
      })
      .catch(e => {
        catalogo = catalogoVazio();
        if (window.console) console.warn('[Conteudista] config/temas.json indisponível; usando o catálogo mínimo.', e);
        return catalogo;
      });
  }

  function modeloEmbutido(id) {
    const c = catalogo && catalogo.temas ? catalogo.temas[id] : null;
    const base = c || (catalogo && catalogo.temas ? catalogo.temas.govbr : null) || {};
    const T = {
      id: base.id || id || 'govbr', nome: base.nome || 'Padrão gov.br',
      descricao: base.descricao || '', embutido: true, base: base.base || id || 'govbr',
      paleta: Object.assign({}, PALETA_PADRAO, base.paleta || {}),
      fontes: Object.assign({}, FONTES_PADRAO, base.fontes || {}),
      telas: {}, imagens: Object.assign({}, IMAGENS_PADRAO, base.imagens || {}),
      mermaid: Object.assign({}, MERMAID_PADRAO, base.mermaid || {}),
      posicoes: Object.assign({}, POSICOES_PADRAO, base.posicoes || {})
    };
    TELAS.forEach(t => { T.telas[t] = Object.assign({}, TELAS_PADRAO, (base.telas || {})[t] || {}); });
    return T;
  }

  function modeloPadrao(baseId) {
    const base = modeloEmbutido(baseId || 'govbr');
    base.id = ''; base.nome = 'Novo tema'; base.descricao = ''; base.embutido = false;
    base.base = (catalogo && catalogo.temas && catalogo.temas[baseId]) ? baseId : 'govbr';
    TELAS.forEach(t => { base.telas[t] = Object.assign({}, modeloEmbutido(base.base).telas[t] || TELAS_PADRAO); });
    return base;
  }

  /* ---------------------------- Normalização ---------------------------- */
  function imagemValida(v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return '';
    if (/^img:[A-Za-z0-9_-]+$/.test(s)) return s;
    if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return s;
    if (/^temas\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp)$/i.test(s)) return s;
    return '';
  }

  function normalizar(dados) {
    if (typeof dados === 'string') {
      try { dados = JSON.parse(dados); } catch (e) { dados = {}; }
    }
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) dados = {};
    let base = String(dados.base || dados.id || 'govbr');
    if (!catalogo || !catalogo.temas || !catalogo.temas[base]) base = 'govbr';
    const T = modeloPadrao(base);
    T.id = idSeguro(dados.id || '');
    T.nome = texto(dados.nome, 'Tema personalizado', 80);
    T.descricao = texto(dados.descricao || '', '', 240).replace(/^\s+$/, '');
    T.base = base; T.embutido = false;
    for (const k of Object.keys(PALETA_PADRAO)) T.paleta[k] = corValida((dados.paleta || {})[k], T.paleta[k] || PALETA_PADRAO[k]);
    for (const k of Object.keys(FONTES_PADRAO)) {
      const v = (dados.fontes || {})[k];
      if (k === 'titulo' || k === 'texto') {
        const s = String(v == null ? '' : v).replace(/[;\n\r]/g, ' ').trim();
        T.fontes[k] = s.slice(0, 160) || FONTES_PADRAO[k];
      } else {
        T.fontes[k] = num(v, T.fontes[k] == null ? FONTES_PADRAO[k] : T.fontes[k], LIMITES['fontes.' + k], ['tamanho_base', 'tamanho_titulo', 'tamanho_h2'].includes(k));
      }
    }
    for (const t of TELAS) {
      const d = (dados.telas || {})[t] || {};
      const x = T.telas[t] = Object.assign({}, TELAS_PADRAO, T.telas[t] || {});
      x.fundo = corValida(d.fundo, x.fundo || TELAS_PADRAO.fundo);
      x.texto = corValida(d.texto, x.texto || TELAS_PADRAO.texto);
      x.imagem = imagemValida(d.imagem);
      x.imagem_opacidade = num(d.imagem_opacidade, x.imagem_opacidade == null ? 100 : x.imagem_opacidade, LIMITES['telas.imagem_opacidade'], true);
      x.imagem_posicao = ['center', 'top', 'bottom', 'left', 'right'].includes(d.imagem_posicao) ? d.imagem_posicao : (x.imagem_posicao || 'center');
      x.titulo_alinhamento = ['left', 'center', 'right'].includes(d.titulo_alinhamento) ? d.titulo_alinhamento : (x.titulo_alinhamento || 'left');
      x.titulo_largura = num(d.titulo_largura, x.titulo_largura == null ? 100 : x.titulo_largura, LIMITES['telas.titulo_largura'], true);
      x.titulo_deslocamento_x = num(d.titulo_deslocamento_x, x.titulo_deslocamento_x == null ? 0 : x.titulo_deslocamento_x, LIMITES['telas.titulo_deslocamento_x'], true);
      x.titulo_deslocamento_y = num(d.titulo_deslocamento_y, x.titulo_deslocamento_y == null ? 0 : x.titulo_deslocamento_y, LIMITES['telas.titulo_deslocamento_y'], true);
    }
    for (const k of ['tamanho_base', 'arredondamento']) {
      T.imagens[k] = num((dados.imagens || {})[k], T.imagens[k] == null ? IMAGENS_PADRAO[k] : T.imagens[k], LIMITES['imagens.' + k], true);
    }
    T.imagens.sombra = bool((dados.imagens || {}).sombra);
    const mer = dados.mermaid || {};
    T.mermaid.tema = ['default', 'neutral', 'dark', 'forest'].includes(mer.tema) ? mer.tema : (T.mermaid.tema || 'default');
    T.mermaid.escala = num(mer.escala, T.mermaid.escala == null ? 100 : T.mermaid.escala, LIMITES['mermaid.escala'], true);
    T.mermaid.fundo = corValida(mer.fundo, T.mermaid.fundo || '#ffffff');
    for (const k of Object.keys(POSICOES_PADRAO)) T.posicoes[k] = num((dados.posicoes || {})[k], T.posicoes[k] == null ? POSICOES_PADRAO[k] : T.posicoes[k], LIMITES['posicoes.' + k], true);
    const vd = idSeguro(dados.variante_de || '');
    if (vd) T.variante_de = vd;
    T.custom = true;
    return T;
  }

  /* ---------------------------- Contraste (WCAG 2.x) ---------------------------- */
  function canal(v) {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function luminancia(hexcor) {
    const h = corValida(hexcor, '#000000').slice(1);
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  }
  function contraste(a, b) {
    let la = luminancia(a), lb = luminancia(b);
    if (la < lb) { const t = la; la = lb; lb = t; }
    return (la + 0.05) / (lb + 0.05);
  }
  function nivelContraste() {
    return window.Opcoes ? String(Opcoes.ler('conteudista.temas.contraste', 'aa') || 'aa').toLowerCase() : 'aa';
  }
  function paresContraste(T) {
    const p = T.paleta || PALETA_PADRAO, t = T.telas || {};
    const par = (chave, rotulo, a, b, minimo) => {
      const r = contraste(a, b);
      return { chave, rotulo, a, b, minimo, razao: Math.round(r * 100) / 100, ok: r + 1e-9 >= minimo };
    };
    return [
      par('corpo_claro', 'Texto da tela interna clara', t.interna_clara.texto, t.interna_clara.fundo, 4.5),
      par('corpo_escuro', 'Texto da tela interna escura', t.interna_escura.texto, t.interna_escura.fundo, 4.5),
      par('capa', 'Texto da capa', t.capa.texto, t.capa.fundo, 3.0),
      par('finalizacao', 'Texto da finalização', t.finalizacao.texto, t.finalizacao.fundo, 3.0),
      par('licenciamento', 'Texto do licenciamento', t.licenciamento.texto, t.licenciamento.fundo, 4.5),
      par('texto_superficie', 'Texto sobre a superfície', p.texto, p.superficie, 4.5),
      par('primaria_fundo', 'Cor primária sobre o fundo', p.primaria, p.fundo, 4.5),
      par('branco_primaria', 'Texto branco sobre a cor primária', '#ffffff', p.primaria, 4.5),
      par('destaque_fundo', 'Cor de destaque sobre o fundo', p.destaque, p.fundo, 4.5)
    ];
  }
  function paresExtras(T) {
    const p = T.paleta || PALETA_PADRAO;
    const r = contraste(p.texto, T.mermaid.fundo || '#ffffff');
    return [{ chave: 'mermaid', rotulo: 'Texto da apostila sobre o fundo do Mermaid', a: p.texto, b: T.mermaid.fundo || '#ffffff', minimo: 4.5, razao: Math.round(r * 100) / 100, ok: r + 1e-9 >= 4.5 }];
  }
  function falhasContraste(T, nivel) {
    const min = nivel == null ? nivelContraste() : nivel;
    const extra = min === 'aaa' ? 6.0 : null;
    return paresContraste(T).filter(p => (extra == null ? p.minimo : Math.max(p.minimo, extra)) > p.razao + 1e-9);
  }
  function melhorTexto(fundo) {
    return contraste('#000000', fundo) >= contraste('#ffffff', fundo) ? '#000000' : '#ffffff';
  }
  function ajustarCor(corAtual, fundo, minimo) {
    if (contraste(corAtual, fundo) >= minimo) return corAtual;
    const alvo = luminancia(fundo) > 0.5 ? '#000000' : '#ffffff';
    const h = corValida(corAtual, '#000000').slice(1);
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const tr = parseInt(alvo.slice(1, 3), 16), tg = parseInt(alvo.slice(3, 5), 16), tb = parseInt(alvo.slice(5, 7), 16);
    let melhor = alvo;
    for (let passo = 1; passo <= 100; passo++) {
      const f = passo / 100;
      const c = '#' + [r + (tr - r) * f, g + (tg - g) * f, b + (tb - b) * f].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
      if (contraste(c, fundo) >= minimo) { melhor = c; break; }
    }
    return melhor;
  }
  function corrigirContraste(T) {
    const C = normalizar(T);
    const p = C.paleta, t = C.telas;
    ['interna_clara', 'interna_escura', 'licenciamento'].forEach(tela => { t[tela].texto = ajustarCor(t[tela].texto, t[tela].fundo, 4.5); });
    ['capa', 'finalizacao'].forEach(tela => { t[tela].texto = ajustarCor(t[tela].texto, t[tela].fundo, 3.0); });
    p.texto = ajustarCor(p.texto, p.superficie, 4.5);
    p.primaria = ajustarCor(p.primaria, p.fundo, 4.5);
    if (contraste('#ffffff', p.primaria) < 4.5) p.primaria = ajustarCor(p.primaria, p.fundo, 4.5);
    p.destaque = ajustarCor(p.destaque, p.fundo, 4.5);
    let passo = 0;
    while (contraste('#ffffff', p.primaria) < 4.5 && passo < 60) {
      p.primaria = ajustarCor(p.primaria, '#000000', 4.5); passo++;
    }
    return normalizar(C);
  }

  /* ---------------------------- Variantes ---------------------------- */
  function clarear(cor, fator) {
    const h = corValida(cor, '#000000').slice(1);
    const rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    const alvo = 255;
    return '#' + rgb.map(v => Math.round(v + (alvo - v) * fator).toString(16).padStart(2, '0')).join('');
  }
  function variante(T, tipo) {
    const V = normalizar(T);
    V.id = ''; V.embutido = false; V.variante_de = T.id || '';
    delete V.variante_de;
    if (T.id) V.variante_de = idSeguro(T.id);
    if (tipo === 'escuro') {
      V.nome = texto(T.nome + ' — escuro', 'Tema escuro', 80);
      V.descricao = 'Variante com telas escuras derivada de ' + (T.nome || 'um tema personalizado') + '.';
      const fundos = { capa: '#0c326f', interna_clara: '#0d2a4f', interna_escura: '#071d41', finalizacao: '#0c326f', licenciamento: '#f8f8f8' };
      const textos = { capa: '#ffffff', interna_clara: '#ffffff', interna_escura: '#ffffff', finalizacao: '#ffffff', licenciamento: '#333333' };
      TELAS.forEach(tela => {
        V.telas[tela].fundo = fundos[tela];
        V.telas[tela].texto = textos[tela];
        V.telas[tela].titulo_alinhamento = T.telas[tela] && T.telas[tela].titulo_alinhamento || V.telas[tela].titulo_alinhamento;
        if (V.telas[tela].imagem && tela !== 'licenciamento') V.telas[tela].imagem_opacidade = Math.min(V.telas[tela].imagem_opacidade, 35);
      });
      V.paleta.fundo = '#f8f8f8'; V.paleta.superficie = '#ffffff'; V.paleta.texto = '#333333';
      V.paleta.texto_suave = '#636363'; V.paleta.linha = '#cccccc'; V.paleta.suave = '#edf5ff';
      V.mermaid.tema = 'default'; V.mermaid.fundo = '#ffffff';
    } else {
      V.nome = texto(T.nome + ' — alto contraste', 'Tema de alto contraste', 80);
      V.descricao = 'Variante de alto contraste derivada de ' + (T.nome || 'um tema personalizado') + '.';
      V.paleta = {
        primaria: '#000000', destaque: '#004a99', apoio: '#005a00', alerta: '#6b4300', erro: '#a00020',
        fundo: '#ffffff', superficie: '#ffffff', texto: '#000000', texto_suave: '#222222',
        linha: '#000000', suave: '#ffff00'
      };
      TELAS.forEach(tela => {
        V.telas[tela].fundo = '#ffffff'; V.telas[tela].texto = '#000000';
        V.telas[tela].imagem = ''; V.telas[tela].imagem_opacidade = 0;
        V.telas[tela].titulo_alinhamento = 'left';
      });
      V.imagens.sombra = false; V.imagens.arredondamento = 0;
      V.mermaid.tema = 'neutral'; V.mermaid.fundo = '#ffffff';
    }
    return normalizar(V);
  }

  /* ---------------------------- Imagens ---------------------------- */
  const bytesDeDataUrl = d => Math.max(0, Math.round((String(d).length - String(d).indexOf(',') - 1) * 3 / 4));
  const limiteImagem = () => Math.max(512, Number(window.Opcoes ? Opcoes.ler('conteudista.temas.limiteImagem', 2048) : 2048) || 2048) * 1024;
  const limiteTotal = () => Math.max(1024, Number(window.Opcoes ? Opcoes.ler('conteudista.temas.limiteTotal', 6144) : 6144) || 6144) * 1024;
  const guardarVersoes = () => !window.Opcoes || Opcoes.ligado('temas.guardar_versoes');
  const variantesAuto = () => !window.Opcoes || Opcoes.ligado('temas.variantes_automaticas');
  const corrigirAuto = () => !window.Opcoes || Opcoes.ligado('temas.corrigir_contraste');
  const limiteVersoes = () => Math.max(1, Math.min(100, Number(window.Opcoes ? Opcoes.ler('conteudista.temas.limiteVersoes', 20) : 20) || 20));

  function bitmapDe(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null).then(b => b || bitmapDeImagem(file));
    }
    return bitmapDeImagem(file);
  }
  function bitmapDeImagem(file) {
    return new Promise((ok, err) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); err(new Error('A imagem não pôde ser lida.')); };
      img.src = url;
    });
  }
  async function recomprimirImagem(file) {
    if (!file) throw new Error('Escolha uma imagem.');
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type || '')) throw new Error('Use uma imagem PNG, JPEG ou WebP. SVG não é aceito por segurança.');
    if (file.size > 20 * 1024 * 1024) throw new Error('A imagem original passa de 20 MB. Reduza antes de enviar.');
    const bmp = await bitmapDe(file);
    const larg = bmp.width || bmp.naturalWidth, alt = bmp.height || bmp.naturalHeight;
    if (!larg || !alt) throw new Error('A imagem não tem dimensões válidas.');
    const escala = Math.min(1, 2400 / Math.max(larg, alt));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(larg * escala)); c.height = Math.max(1, Math.round(alt * escala));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) try { bmp.close(); } catch (e) { /* */ }
    let data = c.toDataURL('image/webp', 0.85);
    if (!/^data:image\/webp/i.test(data)) data = c.toDataURL('image/png');
    const bytes = bytesDeDataUrl(data);
    if (bytes > limiteImagem()) {
      throw new Error('A imagem ficou com ' + Math.ceil(bytes / 1024) + ' KB; o limite é ' + Math.round(limiteImagem() / 1024) + ' KB. Reduza as dimensões e tente de novo.');
    }
    return { data, bytes, largura: c.width, altura: c.height, tipo: /^data:image\/webp/i.test(data) ? 'image/webp' : 'image/png' };
  }
  function extrairImagens(tema, temaId) {
    const T = normalizar(tema), map = new Map();
    TELAS.forEach(tela => {
      const v = T.telas[tela].imagem;
      if (/^data:image\//i.test(v)) {
        const id = uidImagem();
        map.set(id, { id, tema: temaId || '', papel: tela, nome: 'imagem-' + tela, tipo: /^data:image\/([a-z]+)/i.exec(v)[1].toLowerCase(), bytes: bytesDeDataUrl(v), largura: 0, altura: 0, data: v, criado: agora() });
        T.telas[tela].imagem = 'img:' + id;
      }
    });
    return { tema: T, imagens: map };
  }
  function resolverImagens(tema, map) {
    const T = clone(tema), faltando = [];
    TELAS.forEach(tela => {
      const v = T.telas[tela].imagem;
      if (/^img:/i.test(v)) {
        const id = v.slice(4), rec = map && map.get(id);
        if (rec && rec.data) T.telas[tela].imagem = rec.data;
        else { T.telas[tela].imagem = ''; faltando.push(ROTULO_TELA[tela]); }
      }
    });
    return { tema: T, faltando };
  }
  function totalImagens(map, ignorarId) {
    let n = 0;
    if (map) map.forEach((r, id) => { if (id !== ignorarId) n += Number(r.bytes) || 0; });
    return n;
  }

  /* ---------------------------- IndexedDB (v3) ---------------------------- */
  const DB_NOME = 'conteudista', DB_VERSAO = 3;
  let dbp = null;
  function abrirDB() {
    if (dbp) return dbp;
    dbp = new Promise((ok, err) => {
      const r = indexedDB.open(DB_NOME, DB_VERSAO);
      r.onupgradeneeded = () => {
        const d = r.result, n = [...d.objectStoreNames];
        if (!n.includes('rascunhos')) d.createObjectStore('rascunhos', { keyPath: 'nome' });
        if (!n.includes('links')) d.createObjectStore('links', { keyPath: 'id', autoIncrement: true });
        if (!n.includes('versoes')) d.createObjectStore('versoes', { keyPath: 'id', autoIncrement: true });
        if (!n.includes('temas')) d.createObjectStore('temas', { keyPath: 'id' });
        if (!n.includes('temas_versoes')) d.createObjectStore('temas_versoes', { keyPath: 'id', autoIncrement: true });
        if (!n.includes('tema_imagens')) d.createObjectStore('tema_imagens', { keyPath: 'id' });
      };
      r.onsuccess = () => {
        const d = r.result;
        d.onversionchange = () => { try { d.close(); } catch (e) { /* */ } dbp = null; };
        ok(d);
      };
      r.onerror = () => { dbp = null; err(r.error || new Error('IndexedDB indisponível.')); };
      r.onblocked = () => { dbp = null; err(new Error('Feche as outras abas do Conteudista para atualizar o banco de temas.')); };
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return abrirDB().then(d => new Promise((ok, err) => {
      let t;
      try { t = d.transaction(store, mode); } catch (e) { err(e); return; }
      const s = t.objectStore(store);
      let r;
      try { r = fn(s); } catch (e) { err(e); return; }
      t.oncomplete = () => ok(r && typeof r === 'object' && 'result' in r ? r.result : r);
      t.onerror = () => err(t.error || (r && r.error) || new Error('Falha no banco de temas.'));
      t.onabort = () => err(t.error || new Error('Operação cancelada no banco de temas.'));
    }));
  }
  const dbAll = st => tx(st, 'readonly', s => s.getAll());
  const dbGet = (st, k) => tx(st, 'readonly', s => s.get(k));
  const dbPut = (st, v) => tx(st, 'readwrite', s => s.put(v));
  const dbDel = (st, k) => tx(st, 'readwrite', s => s.delete(k));
  const dbClear = st => tx(st, 'readwrite', s => s.clear());

  /* ---------------------------- Leitura e gravação de temas ---------------------------- */
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch (e) { /* sem log */ } };
  const anunciar = m => { try { if (janela) janela.anunciar(m); } catch (e) { /* */ } };
  const extrairId = v => String(v || '').replace(/^custom:/, '');

  async function temasBrutos() {
    const all = await dbAll('temas');
    return all.filter(t => t && !String(t.id).startsWith('__'));
  }
  async function temasPersonalizados() {
    const all = await temasBrutos();
    return all.map(t => { const n = normalizar(t); n._atualizado = t.atualizado || 0; n._criado = t.criado || 0; return n; })
      .sort((a, b) => (b._atualizado || 0) - (a._atualizado || 0));
  }
  async function imagensDoTema(id) {
    const raw = id ? await dbGet('temas', id) : null;
    const all = await dbAll('tema_imagens');
    const map = new Map();
    const ids = new Set();
    if (raw && raw.telas) TELAS.forEach(t => { const v = raw.telas[t] && raw.telas[t].imagem; if (/^img:/i.test(String(v || ''))) ids.add(String(v).slice(4)); });
    all.forEach(r => { if (!id || r.tema === id || ids.has(r.id)) map.set(r.id, r); });
    return map;
  }
  async function temaDe(valor) {
    const s = String(valor == null ? '' : valor).trim();
    if (!s) return null;
    if (s.startsWith('custom:')) {
      const id = extrairId(s);
      if (!id) return null;
      if (temaAvulso && temaAvulso.id === id) return normalizar(temaAvulso);
      const raw = await dbGet('temas', id);
      return raw ? normalizar(raw) : null;
    }
    await carregarCatalogo();
    if (!catalogo.temas[s]) return null;
    return modeloEmbutido(s);
  }
  async function temaResolvido(valor) {
    const T = await temaDe(valor);
    if (!T) return null;
    let map = new Map();
    if (!T.embutido) map = await imagensDoTema(T.id);
    const r = resolverImagens(T, map);
    return { tema: r.tema, faltando: r.faltando, original: T };
  }

  async function registrarVersao(temaId, T, rotulo, marco) {
    const dados = clone(T);
    delete dados._atualizado; delete dados._criado; delete dados._alvo; delete dados._novo; delete dados._data;
    dados.id = temaId;
    const v = { tema_id: temaId, data: agora(), rotulo: rotulo || (marco ? 'Versão marcada' : 'Salvamento'), marco: !!marco, dados };
    if (!marco) {
      const todas = (await dbAll('temas_versoes')).filter(x => x.tema_id === temaId).sort((a, b) => (b.data || 0) - (a.data || 0) || (b.id || 0) - (a.id || 0));
      const ultima = todas.find(x => !x.marco);
      if (ultima && JSON.stringify(ultima.dados) === JSON.stringify(dados)) return ultima;
    }
    const id = await dbPut('temas_versoes', v);
    v.id = id;
    await podarVersoes(temaId);
    return v;
  }
  async function podarVersoes(temaId) {
    const limite = limiteVersoes();
    const todas = (await dbAll('temas_versoes')).filter(x => x.tema_id === temaId).sort((a, b) => (b.data || 0) - (a.data || 0) || (b.id || 0) - (a.id || 0));
    const autos = todas.filter(x => !x.marco);
    for (const v of autos.slice(limite)) { try { await dbDel('temas_versoes', v.id); } catch (e) { /* */ } }
  }

  async function persistirTema(tema, opcoes) {
    opcoes = opcoes || {};
    let T = normalizar(tema);
    if (opcoes.idForcado) T.id = idSeguro(opcoes.idForcado);
    if (!T.id || (catalogo && catalogo.temas && catalogo.temas[T.id])) T.id = idNovo(T.nome);
    const existente = await dbGet('temas', T.id);
    const reg = Object.assign({}, T, { atualizado: agora(), criado: (existente && existente.criado) || agora() });
    await dbPut('temas', reg);
    const map = opcoes.imagens || new Map();
    const usados = new Set();
    for (const tela of TELAS) {
      const v = T.telas[tela].imagem;
      if (!/^img:/i.test(v)) continue;
      const id = v.slice(4); usados.add(id);
      const rec = map.get(id);
      if (rec && (!rec.tema || rec.tema === '__rascunho__' || rec.tema === T.id)) {
        rec.id = id; rec.tema = T.id; rec.papel = tela;
        if (!rec.tipo) rec.tipo = 'image/webp';
        await dbPut('tema_imagens', rec);
      }
    }
    // Versões antigas continuam precisando das imagens que usavam.
    const refsVersoes = new Set();
    const versoes = (await dbAll('temas_versoes')).filter(v => v && v.tema_id === T.id && v.dados);
    versoes.forEach(v => TELAS.forEach(tela => {
      const x = v.dados.telas && v.dados.telas[tela] && v.dados.telas[tela].imagem;
      if (/^img:/i.test(String(x || ''))) refsVersoes.add(String(x).slice(4));
    }));
    const atuais = (await dbAll('tema_imagens')).filter(r => r.tema === T.id);
    for (const r of atuais) if (!usados.has(r.id) && !refsVersoes.has(r.id)) { try { await dbDel('tema_imagens', r.id); } catch (e) { /* */ } }
    if (opcoes.versao !== false && (opcoes.marco || guardarVersoes())) {
      await registrarVersao(T.id, T, opcoes.rotulo || (opcoes.marco ? 'Versão marcada' : 'Salvamento'), !!opcoes.marco);
    }
    if (opcoes.variantes !== false && !opcoes.semVariantes && variantesAuto() && !T.variante_de) {
      const todas = await temasBrutos();
      const temVariante = tipo => todas.some(x => String(x.variante_de || '') === T.id && (tipo === 'escuro' ? /escuro/i.test(x.nome || '') : /alto contraste/i.test(x.nome || '')));
      for (const tipo of ['escuro', 'contraste']) {
        if (temVariante(tipo)) continue;
        const V = variante(T, tipo);
        V.id = idNovo(V.nome);
        try { await persistirTema(V, { imagens: map, semVariantes: true, versao: true, rotulo: 'Variante automática' }); } catch (e) { if (window.console) console.warn('Variante do tema:', e); }
      }
    }
    return T;
  }

  async function salvar(tema, opcoes) {
    opcoes = opcoes || {};
    let T = normalizar(tema);
    let corrigido = false;
    if (opcoes.corrigir !== false && corrigirAuto() && falhasContraste(T).length) { T = corrigirContraste(T); corrigido = true; }
    T = await persistirTema(T, opcoes);
    T._corrigido = corrigido;
    return T;
  }

  async function removerTema(idOuValor, opcoes) {
    opcoes = opcoes || {};
    const id = extrairId(idOuValor);
    if (!id) return false;
    const raw = await dbGet('temas', id);
    if (!raw) return false;
    if (!opcoes.semConfirmar) {
      const usa = $('tema') && $('tema').value === 'custom:' + id;
      const pergunta = 'Excluir o tema “' + (raw.nome || 'personalizado') + '” deste navegador? As versões guardadas dele também serão apagadas.' + (usa ? ' Ele está em uso agora; o seletor voltará ao Padrão gov.br.' : '');
      const ok = window.Dialogo ? await Dialogo.confirmar({ titulo: 'Excluir tema personalizado?', descricao: pergunta, rotulo: 'Excluir tema', perigo: true }) : Promise.resolve(confirm(pergunta));
      if (!ok) return false;
    }
    await dbDel('temas', id);
    for (const v of (await dbAll('temas_versoes')).filter(x => x.tema_id === id)) { try { await dbDel('temas_versoes', v.id); } catch (e) { /* */ } }
    const restantes = await temasBrutos();
    const refs = new Set();
    restantes.forEach(t => TELAS.forEach(tela => { const v = t.telas && t.telas[tela] && t.telas[tela].imagem; if (/^img:/i.test(String(v || ''))) refs.add(String(v).slice(4)); }));
    for (const r of (await dbAll('tema_imagens')).filter(x => x.tema === id)) if (!refs.has(r.id)) { try { await dbDel('tema_imagens', r.id); } catch (e) { /* */ } }
    if (temaAvulso && temaAvulso.id === id) temaAvulso = null;
    if (editor && editor.originalId === id) editor = null;
    if ($('tema') && $('tema').value === 'custom:' + id) {
      try { localStorage.setItem('conteudista.tema', 'govbr'); } catch (e) { /* */ }
      await atualizarSeletor('govbr');
      if (typeof aplicarTemaNoMarkdown === 'function') aplicarTemaNoMarkdown('govbr');
    } else await atualizarSeletor();
    if (janela && !janela.back.hidden) { await listarTemas(); await preencherVersoes(); }
    logApp('Tema “' + (raw.nome || id) + '” excluído.', 'ok');
    anunciar('Tema excluído.');
    return true;
  }

  async function salvarVersaoMarcada(temaId, nome) {
    const raw = await dbGet('temas', temaId);
    if (!raw) throw new Error('Salve o tema antes de marcar uma versão.');
    const T = normalizar(raw);
    const rotulo = texto(nome, 'Versão de ' + formatarData(agora()), 80);
    return registrarVersao(temaId, T, rotulo, true);
  }

  /* ---------------------------- Seletor da página ---------------------------- */
  function textoAux(valor) {
    const el = $('temaAux'); if (!el) return;
    const base = 'Os temas personalizados mudam a apostila e a apresentação; DOCX, EPUB e PPTX usam um subconjunto compatível com a leitura.';
    const id = extrairId(valor);
    if (String(valor).startsWith('custom:')) {
      const nome = (cacheNomes[id] || (temaAvulso && temaAvulso.id === id ? temaAvulso.nome : '') || 'personalizado');
      el.textContent = 'Tema personalizado “' + nome + '”. ' + base;
    } else el.textContent = base;
  }

  async function atualizarSeletor(valor) {
    const sel = $('tema'); if (!sel) return null;
    await carregarCatalogo();
    const atual = valor == null ? sel.value : valor;
    const customs = await temasPersonalizados();
    cacheTemas = customs;
    cacheNomes = {};
    customs.forEach(t => { cacheNomes[t.id] = t.nome; });
    if (temaAvulso) cacheNomes[temaAvulso.id] = temaAvulso.nome;
    let html = '<optgroup label="Embutidos">';
    Object.keys(catalogo.temas).forEach(k => {
      const t = catalogo.temas[k];
      html += '<option value="' + esc(k) + '">' + esc(t.nome || k) + '</option>';
    });
    html += '</optgroup>';
    if (customs.length) {
      html += '<optgroup label="Meus temas">';
      customs.forEach(t => { html += '<option value="custom:' + esc(t.id) + '">' + esc(t.nome) + '</option>'; });
      html += '</optgroup>';
    }
    if (temaAvulso && !customs.some(t => t.id === temaAvulso.id)) {
      html += '<optgroup label="Recebido por link"><option value="custom:' + esc(temaAvulso.id) + '">' + esc(temaAvulso.nome) + ' (do link)</option></optgroup>';
    }
    html += '<optgroup label="Gerenciar"><option value="__abrir__">Editar, criar ou importar tema\u2026</option></optgroup>';
    sel.innerHTML = html;
    let alvo = atual;
    if (![...sel.options].some(o => o.value === alvo)) {
      alvo = temaAvulso ? 'custom:' + temaAvulso.id : 'govbr';
      if (![...sel.options].some(o => o.value === alvo)) alvo = 'govbr';
    }
    sel.value = alvo;
    textoAux(alvo);
    return alvo;
  }

  async function aoSelecionar(valor) {
    if (valor === '__abrir__') {
      const sel = $('tema');
      if (sel) {
        let ant = '';
        try { ant = localStorage.getItem('conteudista.tema') || ''; } catch (e) { ant = ''; }
        if (!ant || ant === '__abrir__' || ![...sel.options].some(o => o.value === ant)) ant = 'govbr';
        sel.value = ant; textoAux(ant);
      }
      abrir('meus');
      return;
    }
    textoAux(valor);
    if (!String(valor || '').startsWith('custom:')) return;
    const T = await temaDe(valor);
    if (!T) {
      logApp('O tema personalizado escolhido não existe mais neste navegador. Voltando ao Padrão gov.br.', 'wa');
      try { localStorage.setItem('conteudista.tema', 'govbr'); } catch (e) { /* */ }
      await atualizarSeletor('govbr');
      if (typeof aplicarTemaNoMarkdown === 'function') aplicarTemaNoMarkdown('govbr');
      return;
    }
    const f = falhasContraste(T);
    if (f.length) logApp('O tema “' + T.nome + '” tem ' + f.length + (f.length === 1 ? ' par' : ' pares') + ' de contraste abaixo do mínimo. A geração vai pedir correção.', 'wa');
  }

  function chaveMarkdown(valor) {
    if (valor && typeof valor === 'object') return slug(valor.nome) || 'personalizado';
    const s = String(valor == null ? '' : valor);
    if (!s.startsWith('custom:')) {
      if (s.trim().startsWith('{')) { try { return slug((JSON.parse(s).nome || '')) || 'personalizado'; } catch (e) { /* */ } }
      return s;
    }
    const id = extrairId(s);
    return slug(cacheNomes[id] || (temaAvulso && temaAvulso.id === id ? temaAvulso.nome : id)) || 'personalizado';
  }

  /* ---------------------------- Pacotes, geração e links ---------------------------- */
  async function snapshotPacote(valor) {
    const T = await temaDe(valor);
    if (!T) return null;
    if (T.embutido) return { tema: T.id, tema_dados: null };
    const r = await temaResolvido(valor);
    if (!r) return null;
    return { tema: 'custom:' + T.id, tema_dados: r.tema };
  }
  async function jsonParaGeracao(valor) {
    const T = await temaDe(valor);
    if (!T || T.embutido) return '';
    const r = await temaResolvido(valor);
    if (!r) return '';
    if (r.faltando.length) logApp('Imagem de fundo ausente em: ' + r.faltando.join(', ') + '. A geração segue sem ela.', 'wa');
    return JSON.stringify(r.tema);
  }
  function dadosAtuais(valor) {
    if (!temaAvulso || !String(valor || '').startsWith('custom:')) return null;
    return temaAvulso.id === extrairId(valor) ? clone(temaAvulso) : null;
  }

  async function aplicarSnapshot(s) {
    if (!s) return;
    if (s.tema_dados && typeof s.tema_dados === 'object') {
      const T = normalizar(s.tema_dados);
      T.id = idSeguro(T.id) || idNovo(T.nome);
      T.embutido = false;
      // Um snapshot nunca sobrescreve um tema local: se o id colidir, o avulso recebe um id próprio.
      if (await dbGet('temas', T.id)) T.id = idNovo(T.nome);
      temaAvulso = normalizar(T);
      // O snapshot é a fonte da verdade nesta sessão, inclusive quando o id coincide com um tema local.
      const alvo = await atualizarSeletor('custom:' + temaAvulso.id);
      try { localStorage.setItem('conteudista.tema', alvo); } catch (e) { /* */ }
      logApp('Tema recebido com o conteúdo: “' + temaAvulso.nome + '”. Use Temas… para guardar nos meus temas.', 'ok');
      return;
    }
    if (s.tema) {
      const alvo = await atualizarSeletor(s.tema);
      if (alvo !== s.tema) logApp('O tema do conteúdo não está mais neste navegador. Aplicando o Padrão gov.br.', 'wa');
      try { localStorage.setItem('conteudista.tema', alvo); } catch (e) { /* */ }
    }
  }

  function b64url(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function deB64url(s) {
    let t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    const bin = atob(t), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function compactar(txt) {
    if (!window.CompressionStream) return 'j' + b64url(new TextEncoder().encode(txt));
    try {
      const st = new Blob([txt]).stream().pipeThrough(new CompressionStream('deflate'));
      const buf = await new Response(st).arrayBuffer();
      return 'z' + b64url(new Uint8Array(buf));
    } catch (e) {
      return 'j' + b64url(new TextEncoder().encode(txt));
    }
  }
  async function descompactar(s) {
    s = String(s || '');
    if (!s) throw new Error('Link de tema vazio.');
    const tipo = s[0], dados = deB64url(s.slice(1));
    if (tipo === 'j') return new TextDecoder().decode(dados);
    if (tipo !== 'z') throw new Error('Formato de link de tema não reconhecido.');
    if (!window.DecompressionStream) throw new Error('Este navegador não abre links de tema compactados.');
    const st = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new TextDecoder().decode(await new Response(st).arrayBuffer());
  }
  async function linkDoTema(valor) {
    const r = await temaResolvido(valor);
    if (!r) throw new Error('Escolha um tema para gerar o link.');
    const txt = JSON.stringify(r.tema);
    const payload = await compactar(txt);
    const url = location.origin + location.pathname + location.search + '#tema=' + payload;
    if (url.length > 30000) throw new Error('O link do tema ficaria com ' + url.length + ' caracteres, acima do limite de 30.000. Baixe o JSON e envie o arquivo; imagens de fundo deixam o link muito longo.');
    return url;
  }
  async function temaDoHash() {
    const h = String(location.hash || '');
    if (!h.startsWith('#tema=')) return null;
    try {
      const txt = await descompactar(h.slice(6));
      const d = JSON.parse(txt);
      return d && d.tema ? d.tema : d;
    } catch (e) {
      logApp('Não foi possível abrir o tema do link: ' + ((e && e.message) || e), 'err');
      return null;
    }
  }

  /* ---------------------------- Gate de contraste ---------------------------- */
  const confirmar = o => window.Dialogo ? Dialogo.confirmar(o) : Promise.resolve(confirm((o.titulo || '') + '\n\n' + (o.descricao || '')));
  async function garantirContraste(valor) {
    const T = await temaDe(valor);
    if (!T || T.embutido) return true;
    let f = falhasContraste(T);
    if (!f.length) return true;
    const lista = f.slice(0, 4).map(p => '• ' + p.rotulo + ': ' + p.razao.toFixed(2) + ':1 (mínimo ' + p.minimo + ':1)').join('\n') + (f.length > 4 ? '\n• e mais ' + (f.length - 4) + '.' : '');
    const querCorrigir = await confirmar({
      titulo: 'Contraste abaixo do mínimo (WCAG ' + nivelContraste().toUpperCase() + ')',
      descricao: 'O tema “' + T.nome + '” tem ' + f.length + (f.length === 1 ? ' par' : ' pares') + ' de cores abaixo do mínimo:\n\n' + lista + '\n\nPosso corrigir as cores automaticamente e guardar o tema corrigido?',
      rotulo: 'Corrigir e gerar'
    });
    if (querCorrigir) {
      const C = corrigirContraste(T);
      if (temaAvulso && temaAvulso.id === T.id) temaAvulso = normalizar(C);
      else {
        const map = await imagensDoTema(T.id);
        await persistirTema(C, { imagens: map, rotulo: 'Contraste corrigido', versao: true, variantes: false });
        await atualizarSeletor($('tema') ? $('tema').value : 'custom:' + T.id);
      }
      f = falhasContraste(C);
      logApp('Contraste do tema corrigido automaticamente.', 'ok');
      if (!f.length) return true;
    }
    const lista2 = f.slice(0, 4).map(p => '• ' + p.rotulo + ': ' + p.razao.toFixed(2) + ':1').join('\n') + (f.length > 4 ? '\n• e mais ' + (f.length - 4) + '.' : '');
    const seguir = await confirmar({
      titulo: 'Gerar com contraste insuficiente?',
      descricao: 'Ainda há ' + f.length + (f.length === 1 ? ' par' : ' pares') + ' abaixo do mínimo:\n\n' + lista2 + '\n\nGerar assim pode prejudicar a leitura. Você pode voltar ao editor, ajustar as cores ou autorizar a geração mesmo assim.',
      rotulo: 'Gerar mesmo assim',
      perigo: true
    });
    if (seguir) logApp('Geração autorizada com contraste insuficiente no tema “' + T.nome + '”.', 'wa');
    return !!seguir;
  }

  /* ---------------------------- Interface: estilos ---------------------------- */
  const CSS = `
#jnTemasWin{width:min(1120px,100%)}
#jnTemasWin .jn-panes{overflow:auto}
#jnTemasWin .jn-pane{padding:14px 18px 18px}
.tm-cab{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin:0 0 10px}
.tm-cab>div:first-child{flex:1;min-width:220px}
.tm-intro{margin:0;color:#636363;font-size:14px;line-height:1.45}
.tm-nota{margin:6px 0 0;color:#636363;font-size:13px;line-height:1.4}
.tm-lista{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:9px}
.tm-item{display:grid;grid-template-columns:46px minmax(0,1fr);gap:10px 12px;border:1px solid #cccccc;border-radius:8px;padding:10px 12px;background:#fff}
.tm-item.emuso{border-color:#1351b4;box-shadow:inset 4px 0 0 #1351b4}
.tm-swatches{display:flex;flex-wrap:wrap;gap:3px;align-content:flex-start;max-width:46px}
.tm-sw{width:18px;height:18px;border-radius:4px;border:1px solid rgba(0,0,0,.28);display:inline-block}
.tm-info{min-width:0}
.tm-info strong{color:#0c326f;font-size:16px;line-height:1.25}
.tm-info p{margin:3px 0 0;color:#636363;font-size:13px;line-height:1.4}
.tm-meta{display:flex;flex-wrap:wrap;gap:5px 10px;margin-top:5px;color:#636363;font-size:12px}
.tm-selo{display:inline-block;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700;background:#edf5ff;color:#0c326f;margin-left:6px;vertical-align:2px}
.tm-selo.avulso{background:#fff5c2;color:#5c4300}
.tm-selo.atual{background:#e3f5e1;color:#0b5c1b}
.tm-acoes{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;padding-top:2px}
.tm-acoes button{min-height:34px;height:auto;padding:5px 10px;font-size:13px}
.tm-vazio{border:2px dashed #cccccc;border-radius:8px;padding:16px;color:#636363;text-align:center;margin:12px 0}
.tm-ed{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:18px;align-items:start}
.tm-sec{border:1px solid #cccccc;border-radius:8px;padding:12px;margin:0 0 12px;background:#fff}
.tm-sec h3{margin:0 0 8px;color:#0c326f;font-size:16px}
.tm-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.tm-grade.estreita{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.tm-campo{min-width:0}
.tm-campo label,.tm-rotulo{display:block;font-weight:600;font-size:13px;color:#0c326f;margin:0 0 4px}
.tm-campo input[type=text],.tm-campo input[type=number],.tm-campo select,.tm-campo textarea{width:100%}
.tm-campo input[type=number]{max-width:120px}
.tm-cor{display:flex;gap:6px;align-items:center}
.tm-cor input[type=color]{width:48px;height:40px;padding:2px;border:1px solid #cccccc;border-radius:6px;background:#fff;flex:none}
.tm-cor input[type=text]{flex:1;min-width:0;font-family:Consolas,monospace}
.tm-detalhe{border:1px solid #cccccc;border-radius:8px;margin:8px 0;padding:0 10px 10px;background:#fff}
.tm-detalhe summary{cursor:pointer;font-weight:700;color:#0c326f;padding:9px 2px;font-size:14px}
.tm-detalhe[open] summary{border-bottom:1px solid #e5e5e5;margin-bottom:10px}
.tm-img{display:grid;grid-template-columns:150px minmax(0,1fr);gap:10px;align-items:start;margin-top:8px}
.tm-imgprev{width:150px;aspect-ratio:16/9;border:1px solid #cccccc;border-radius:6px;background-color:#f8f8f8;background-size:cover;background-position:center;display:flex;align-items:flex-end;justify-content:center;color:#636363;font-size:11px;padding:4px;overflow:hidden}
.tm-imgacoes{display:flex;flex-wrap:wrap;gap:6px}
.tm-imgacoes button{min-height:34px}
.tm-msg{margin:8px 0 0;font-size:13px;line-height:1.4;color:#0c326f}
.tm-msg.erro{color:#b00020;font-weight:600}
.tm-msg.ok{color:#0b5c1b;font-weight:600}
.tm-prev{position:sticky;top:0;border:1px solid #cccccc;border-radius:8px;padding:10px;background:#f8f8f8}
.tm-prev h3{margin:0 0 8px;color:#0c326f;font-size:16px}
.tm-prev-slides{display:flex;flex-direction:column;gap:8px}
.tm-prev-card{border:1px solid rgba(0,0,0,.22);border-radius:6px;padding:8px 10px;min-height:86px;overflow:hidden;background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:center}
.tm-prev-card small{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;opacity:.9;margin-bottom:3px}
.tm-prev-card b{font-size:15px;line-height:1.15;display:block}
.tm-prev-card span{font-size:11px;line-height:1.3;margin-top:4px;display:block}
.tm-prev-apostila{margin-top:10px;border:1px solid #cccccc;border-radius:6px;overflow:hidden;background:#fff}
.tm-prev-apostila header{padding:5px 8px;font-size:11px;font-weight:700}
.tm-prev-apostila article{padding:8px 10px}
.tm-prev-apostila h4{margin:0 0 4px;font-size:14px;line-height:1.15}
.tm-prev-apostila p{margin:0 0 6px;font-size:11px;line-height:1.35}
.tm-prev-apostila .fake-img{height:38px;border-radius:4px;background:linear-gradient(135deg,#dbe8fb,#c5d4eb);border:1px solid #cccccc;margin:4px 0}
.tm-prev-apostila blockquote{margin:4px 0;padding:4px 7px;font-size:10px;border-left:3px solid #168821;background:#edf5ff}
.tm-prev-mermaid{margin-top:8px;border:1px solid #cccccc;border-radius:6px;padding:6px 8px;font-size:11px;line-height:1.35;background:#fff;color:#333}
.tm-contraste{margin-top:10px;border-top:1px solid #cccccc;padding-top:8px}
.tm-contraste h4{margin:0 0 5px;color:#0c326f;font-size:14px}
.tm-contraste ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;font-size:11px}
.tm-contraste li{display:flex;gap:6px;justify-content:space-between;align-items:baseline}
.tm-contraste li span:first-child{flex:1;min-width:0;overflow-wrap:anywhere}
.tm-falha{color:#b00020;font-weight:700}
.tm-ok{color:#0b5c1b;font-weight:700}
.tm-aviso{color:#8a5c00;font-weight:700}
.tm-linkbox{border:1px solid #cccccc;border-radius:8px;padding:10px;margin:10px 0;background:#f8f8f8}
.tm-linkbox label{display:block;font-weight:700;color:#0c326f;margin-bottom:4px;font-size:13px}
.tm-linha{display:flex;gap:6px;align-items:stretch}
.tm-linha input{flex:1;min-width:0}
.tm-imp textarea{min-height:170px;width:100%;font-family:Consolas,monospace;font-size:12.5px}
.tm-imp .tm-acoes{margin-top:10px}
.tm-versoes .tm-grade{margin-bottom:10px}
.tm-diff{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
.tm-diff caption{text-align:left;font-weight:700;color:#0c326f;padding-bottom:5px}
.tm-diff th,.tm-diff td{border:1px solid #cccccc;padding:5px 7px;text-align:left;vertical-align:top}
.tm-diff th{background:#edf5ff;color:#0c326f}
.tm-diff td code{font-size:12px;overflow-wrap:anywhere}
.tm-diff h4{margin:12px 0 4px;color:#0c326f;font-size:14px}
.tm-resumo{border:1px solid #cccccc;border-radius:6px;padding:8px 10px;background:#f8f8f8;font-size:13px;margin-top:10px}
.tm-json{margin-top:8px}
.tm-json label{display:block;font-weight:700;font-size:13px;color:#0c326f;margin:6px 0 3px}
.tm-json textarea{width:100%;min-height:160px;font:12px/1.4 Consolas,monospace;resize:vertical}
.tm-json pre,.tm-json-diff{white-space:pre-wrap;word-break:break-word;font:12px/1.45 Consolas,monospace;background:#f8f8f8;border:1px solid #cccccc;border-radius:6px;padding:8px;max-height:360px;overflow:auto;margin:8px 0 0}
.tm-json-diff span{display:block}
.tm-json-diff .add{color:#0b5c1b;background:#e6f6e4}
.tm-json-diff .del{color:#9b0016;background:#fde8eb}
.tm-versoes select{min-width:0;width:100%}
.tm-versoes .tm-acoes{margin:8px 0}
.tm-bt{display:flex;flex-wrap:wrap;gap:8px}
.tm-bt button{min-height:40px}
#jnTemasWin :focus-visible{outline:3px solid #1351b4;outline-offset:2px}
html.contraste #jnTemasWin{background:#000;color:#fff}
html.contraste #jnTemasWin .tm-sec,html.contraste #jnTemasWin .tm-item,html.contraste #jnTemasWin .tm-detalhe,html.contraste #jnTemasWin .tm-prev,html.contraste #jnTemasWin .tm-linkbox,html.contraste #jnTemasWin .tm-prev-apostila,html.contraste #jnTemasWin .tm-prev-mermaid{background:#000;color:#fff;border-color:#fff}
html.contraste #jnTemasWin .tm-info strong,html.contraste #jnTemasWin .tm-sec h3,html.contraste #jnTemasWin .tm-campo label,html.contraste #jnTemasWin .tm-rotulo,html.contraste #jnTemasWin .tm-prev h3,html.contraste #jnTemasWin .tm-detalhe summary,html.contraste #jnTemasWin .tm-contraste h4{color:#fff}
html.contraste #jnTemasWin .tm-intro,html.contraste #jnTemasWin .tm-nota,html.contraste #jnTemasWin .tm-info p,html.contraste #jnTemasWin .tm-meta{color:#fff}
html.contraste #jnTemasWin .tm-json pre,html.contraste #jnTemasWin .tm-json-diff{background:#000;color:#fff;border-color:#fff}
html.contraste #jnTemasWin .tm-json-diff .add{background:#000;color:#00ff66}
html.contraste #jnTemasWin .tm-json-diff .del{background:#000;color:#ff7a7a}
html.contraste #jnTemasWin :focus-visible{outline-color:#ffff00}
@media(max-width:820px){.tm-ed{grid-template-columns:1fr}.tm-prev{position:static}.tm-img{grid-template-columns:1fr}.tm-imgprev{width:100%;max-width:240px}}
@media(max-width:520px){.tm-item{grid-template-columns:1fr}.tm-swatches{max-width:none}.tm-acoes button{flex:1 1 auto}}
`;
  function montarCSS() {
    if ($('tmCss')) return;
    const st = document.createElement('style'); st.id = 'tmCss'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------------------------- Interface: janela ---------------------------- */
  function montarRodape(k) {
    if (!janela) return;
    const bt = janela.bt;
    if (k === 'meus') {
      bt.innerHTML = '<button type="button" class="go mini" id="tmNovoTema">Novo tema</button><button type="button" class="sec mini" id="tmAbrirImportar">Importar JSON ou YAML</button>';
      $('tmNovoTema').onclick = () => novoEditor();
      $('tmAbrirImportar').onclick = () => janela.ativar('importar', true);
    } else if (k === 'editor') {
      bt.innerHTML = '<button type="button" class="go mini" id="tmSalvarEd">Salvar tema</button><button type="button" class="sec mini" id="tmDescartarEd">Descartar alterações</button>';
      $('tmSalvarEd').onclick = () => salvarEditor();
      $('tmDescartarEd').onclick = () => descartarEditor();
    } else if (k === 'versoes') {
      bt.innerHTML = '<button type="button" class="sec mini" id="tmMarcarRodape">Salvar versão marcada</button>';
      $('tmMarcarRodape').onclick = () => marcarVersaoSelecionada();
    }
    janela.rodape();
  }

  function criarJanelaTemas() {
    if (janela) return janela;
    if (!window.Janelas || !window.Janelas.criarJanela) throw new Error('A fábrica de janelas não foi carregada.');
    montarCSS();
    janela = Janelas.criarJanela({
      id: 'jnTemas', rotuloAbas: 'Temas personalizados',
      abas: [['meus', 'Meus temas', 'sav'], ['editor', 'Editor', 'rasc'], ['versoes', 'Versões', 'hist'], ['importar', 'Importar', 'up']],
      resolver: k => k || 'meus',
      rodape: k => k === 'meus' || k === 'editor' || k === 'versoes',
      aoAbrir: () => {
        if (!montado) { montarMeus(); montarEditor(); montarVersoes(); montarImportar(); montado = true; }
        listarTemas(); preencherVersoes();
      },
      aoAtivar: k => {
        janela.titulo('Temas personalizados');
        montarRodape(k);
        if (k === 'meus') listarTemas();
        else if (k === 'versoes') preencherVersoes();
        else if (k === 'importar') { const t = $('tmImpTexto'); if (t) setTimeout(() => t.focus(), 40); }
      },
      depoisAbrir: k => { if (k === 'meus') { const b = $('tmNovoTema'); if (b) b.focus(); } }
    });
    return janela;
  }

  let montado = false;

  async function abrir(aba) {
    await carregarCatalogo();
    criarJanelaTemas();
    janela.abrir(aba || 'meus');
    if (aba === 'editor' && !editor) renderEditorVazio();
  }

  /* ---------------------------- Meus temas ---------------------------- */
  function montarMeus() {
    const p = janela.pane('meus');
    p.innerHTML = '<div class="tm-cab"><div><p class="tm-intro">Crie temas derivados do Design System gov.br para a <strong>apresentação</strong> e a <strong>apostila</strong>. Cores, fontes, posição dos títulos, imagens de fundo, Mermaid e medidas do CSS ficam neste navegador e podem ser reutilizados, exportados, importados e compartilhados.</p><p class="tm-nota">DOCX e EPUB mantêm a leitura acessível; o PPTX recebe cores, fontes e posições compatíveis. Temas embutidos são somente leitura — duplique para editar.</p></div></div>' +
      '<div class="tm-linkbox" id="tmLinkBox" hidden><label for="tmLinkUrl">Link do tema (snapshot)</label><div class="tm-linha"><input id="tmLinkUrl" type="text" readonly aria-describedby="tmLinkDica"><button type="button" class="sec mini" id="tmLinkCopiar">Copiar</button></div><p class="tm-nota" id="tmLinkDica">O link leva uma cópia do tema. Imagens de fundo podem deixá-lo longo; nesse caso, baixe o JSON.</p></div>' +
      '<p class="tm-msg" id="tmMeusMsg" role="status" aria-live="polite"></p><div id="tmLista" class="tm-lista" aria-live="polite"></div>';
    p.addEventListener('click', async e => {
      const b = e.target.closest('button[data-a]'); if (!b) return;
      const box = b.closest('[data-valor]'); if (!box) return;
      const valor = box.dataset.valor, id = box.dataset.id, embutido = box.dataset.embutido === '1', avulso = box.dataset.avulso === '1';
      const msg = (t, c) => { const m = $('tmMeusMsg'); if (m) { m.textContent = t || ''; m.className = 'tm-msg' + (c ? ' ' + c : ''); } if (t) anunciar(t); };
      try {
        if (b.dataset.a === 'usar') {
          const alvo = await atualizarSeletor(valor);
          try { localStorage.setItem('conteudista.tema', alvo); } catch (err) { /* */ }
          if (typeof aplicarTemaNoMarkdown === 'function') aplicarTemaNoMarkdown(alvo);
          await aoSelecionar(alvo);
          await listarTemas();
          msg('Tema aplicado à apresentação e à apostila.', 'ok');
          logApp('Tema “' + (box.querySelector('strong') || {}).textContent + '” aplicado.', 'ok');
        } else if (b.dataset.a === 'editar') {
          await abrirEditor(valor, id, false);
        } else if (b.dataset.a === 'duplicar') {
          await duplicarTema(valor);
        } else if (b.dataset.a === 'exportar') {
          const r = await temaResolvido(valor);
          if (!r) throw new Error('O tema não foi encontrado.');
          baixarJSON(r.tema);
          msg('JSON do tema baixado.', 'ok');
        } else if (b.dataset.a === 'exportar-yaml') {
          const ry = await temaResolvido(valor);
          if (!ry) throw new Error('O tema não foi encontrado.');
          baixarYAML(ry.tema);
          msg('YAML do tema baixado.', 'ok');
        } else if (b.dataset.a === 'copiar') {
          const r = await temaResolvido(valor);
          if (!r) throw new Error('O tema não foi encontrado.');
          await copiarTexto(JSON.stringify(r.tema, null, 2));
          msg('JSON do tema copiado para a área de transferência.', 'ok');
        } else if (b.dataset.a === 'link') {
          const url = await linkDoTema(valor);
          mostrarLink(url);
          msg('Link do tema criado. Ele abre com o snapshot do tema, sem alterar os temas deste navegador.', 'ok');
        } else if (b.dataset.a === 'excluir') {
          await removerTema(id);
        } else if (b.dataset.a === 'salvar-avulso') {
          await guardarAvulso();
        }
      } catch (err) { msg('Não foi possível concluir: ' + ((err && err.message) || err), 'erro'); }
      if (avulso && b.dataset.a !== 'salvar-avulso') { /* ações do tema do link seguem disponíveis */ }
    });
    const box = $('tmLinkBox');
    if (box) { box.hidden = true; }
    setTimeout(() => {
      const copiar = $('tmLinkCopiar');
      if (copiar) copiar.onclick = async () => {
        const u = $('tmLinkUrl'); if (!u || !u.value) return;
        await copiarTexto(u.value);
        const m = $('tmMeusMsg'); if (m) { m.textContent = 'Link copiado.'; m.className = 'tm-msg ok'; }
      };
    }, 0);
  }

  /*
   * YAML: troca simples para quem prefere editar o tema à mão. Só cobre o que o
   * tema usa (objetos, listas, textos, números, booleanos e textos de várias linhas),
   * sem dependência externa. As imagens entram sempre em base64.
   */
  function _yamlTexto(v) {
    const s = String(v);
    if (!s) return "''";
    if (/[\n\r\t]/.test(s)) return '|';
    if (/^[\s]|[\s]$/.test(s) || /[:#\[\]{}&*?|<>=!%@`"',]/.test(s) ||
      /^(true|false|null|yes|no|on|off|~)$/i.test(s) || /^[-+]?[\d.]/.test(s) || /^-/.test(s)) {
      return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return s;
  }

  function _yamlDump(obj, ind) {
    ind = ind || 0;
    const p = '  '.repeat(ind);
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return Number.isFinite(obj) ? String(obj) : 'null';
    if (typeof obj === 'string') {
      const t = _yamlTexto(obj);
      if (t !== '|') return t;
      return '|\n' + obj.split(/\r?\n/).map(l => p + '  ' + l).join('\n');
    }
    if (Array.isArray(obj)) {
      if (!obj.length) return '[]';
      return '\n' + obj.map(v => {
        const d = _yamlDump(v, ind + 1);
        return p + '- ' + (d.charAt(0) === '\n' ? d.slice(1).replace(/^ {2}/, '') : d);
      }).join('\n');
    }
    if (typeof obj === 'object') {
      const ks = Object.keys(obj);
      if (!ks.length) return '{}';
      return '\n' + ks.map(k => {
        const d = _yamlDump(obj[k], ind + 1);
        return p + _yamlTexto(k) + ':' + (d.charAt(0) === '\n' ? d : ' ' + d);
      }).join('\n');
    }
    return _yamlTexto(obj);
  }

  function _yamlLimpar(txt) {
    return String(txt).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  }

  function _yamlParse(txt) {
    const ls = _yamlLimpar(txt).split('\n');
    const vazio = l => !l.trim() || l.trim().charAt(0) === '#';
    const recuo = l => l.length - l.replace(/^ +/, '').length;
    function valor(s) {
      s = String(s).trim();
      if (!s) return null;
      if (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"' && s.length > 1) {
        return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      if (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'" && s.length > 1) return s.slice(1, -1);
      if (s === 'null' || s === '~') return null;
      if (/^(true|yes|on)$/i.test(s)) return true;
      if (/^(false|no|off)$/i.test(s)) return false;
      if (/^[-+]?\d+$/.test(s)) return parseInt(s, 10);
      if (/^[-+]?(\d+\.\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return parseFloat(s);
      if (s === '[]') return [];
      if (s === '{}') return {};
      return s;
    }
    function bloco(i, base) {
      if (i >= ls.length) return { i, v: null };
      const primeiro = ls[i];
      const rec = recuo(primeiro);
      const lista = /^\s*-(\s|$)/.test(primeiro) && rec >= base - 1;
      if (lista) {
        const arr = [];
        while (i < ls.length) {
          if (vazio(ls[i])) { i++; continue; }
          const r = recuo(ls[i]);
          if (r < base || !/^\s*-(\s|$)/.test(ls[i])) break;
          const resto = ls[i].slice(r + 1).trim();
          i++;
          if (!resto) {
            const s = bloco(i, r + 1);
            i = s.i; arr.push(s.v);
          } else {
            const dois = resto.indexOf(': ');
            const so = resto.indexOf(':');
            if (so > 0 && (so === resto.length - 1 || dois === so)) {
              const obj = {};
              const k = valor(resto.slice(0, so));
              const v = resto.slice(so + 1).trim();
              if (v) obj[k] = valor(v);
              else { const s = bloco(i, r + 2); i = s.i; obj[k] = s.v; }
              while (i < ls.length && !vazio(ls[i]) && recuo(ls[i]) > r && !/^\s*-(\s|$)/.test(ls[i])) {
                const l2 = ls[i].trim();
                const p2 = l2.indexOf(':');
                if (p2 < 0) { i++; continue; }
                const k2 = valor(l2.slice(0, p2));
                const r2 = l2.slice(p2 + 1).trim();
                i++;
                if (r2) obj[k2] = valor(r2);
                else { const s2 = bloco(i, recuo(ls[i - 1]) + 1); i = s2.i; obj[k2] = s2.v; }
              }
              arr.push(obj);
            } else {
              arr.push(valor(resto));
              while (i < ls.length && !vazio(ls[i]) && recuo(ls[i]) > r) { arr.push(valor(ls[i].trim())); i++; }
            }
          }
        }
        return { i, v: arr };
      }
      const obj = {};
      while (i < ls.length) {
        if (vazio(ls[i])) { i++; continue; }
        const r = recuo(ls[i]);
        if (r < base) break;
        const l = ls[i].trim();
        const p = l.indexOf(':');
        if (p < 0) { i++; continue; }
        const k = valor(l.slice(0, p));
        const resto = l.slice(p + 1).trim();
        i++;
        if (resto === '|' || resto === '|-') {
          const linhas = [];
          while (i < ls.length && (vazio(ls[i]) || recuo(ls[i]) > r)) {
            linhas.push(ls[i].replace(/^ {0,2}/, '').trim()); i++;
          }
          while (linhas.length && !linhas[linhas.length - 1]) linhas.pop();
          obj[k] = linhas.join('\n');
        } else if (resto) {
          obj[k] = valor(resto);
        } else {
          const alvo = i;
          let profundidade = -1;
          for (let j = alvo; j < ls.length; j++) {
            if (vazio(ls[j])) continue;
            profundidade = recuo(ls[j]); break;
          }
          if (profundidade <= r) { obj[k] = null; }
          else { const s = bloco(i, profundidade); i = s.i; obj[k] = s.v; }
        }
      }
      return { i, v: obj };
    }
    const s = bloco(0, 0);
    return s.v;
  }

  function baixarYAML(T) {
    const nome = 'Tema_' + (slug(T.nome) || 'personalizado') + '.yaml';
    const txt = '# Tema do Conteudista\n' + 'tema:' + _yamlDump(T, 1) + '\n';
    const blob = new Blob([txt], { type: 'text/yaml;charset=utf-8' });
    if (typeof baixar === 'function') baixar(nome, blob);
    else {
      const u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    }
  }

  function baixarJSON(T) {
    const nome = 'Tema_' + (slug(T.nome) || 'personalizado') + '.json';
    const blob = new Blob([JSON.stringify(T, null, 2)], { type: 'application/json' });
    if (typeof baixar === 'function') baixar(nome, blob);
    else {
      const u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    }
  }
  async function copiarTexto(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); return; }
    const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.left = '-9999px';
    document.body.appendChild(t); t.select();
    try { if (!document.execCommand('copy')) throw new Error('A cópia não foi permitida pelo navegador.'); } finally { t.remove(); }
  }
  function mostrarLink(url) {
    const box = $('tmLinkBox'), inp = $('tmLinkUrl');
    if (!box || !inp) return;
    box.hidden = false; inp.value = url; inp.focus(); inp.select();
  }

  function selosTema(t, atual) {
    let s = '<span class="tm-selo">Embutido</span>';
    if (t.embutido === false) s = '<span class="tm-selo">Personalizado</span>';
    if (t._avulso) s = '<span class="tm-selo avulso">Recebido por link</span>';
    if (atual) s += '<span class="tm-selo atual">Em uso</span>';
    return s;
  }
  function itemTema(t, atual) {
    const sw = Object.keys(PALETA_PADRAO).slice(0, 7).map(k => '<span class="tm-sw" style="background:' + esc(t.paleta[k]) + '" title="' + esc(ROTULO_COR[k] + ': ' + t.paleta[k]) + '"></span>').join('');
    const telasComImg = TELAS.filter(x => t.telas[x] && t.telas[x].imagem).length;
    const valor = t.embutido ? t.id : (t._avulso ? 'custom:' + t.id : 'custom:' + t.id);
    const id = t.id, dados = 'data-valor="' + esc(valor) + '" data-id="' + esc(id) + '" data-embutido="' + (t.embutido ? '1' : '0') + '" data-avulso="' + (t._avulso ? '1' : '0') + '"';
    let acoes = '<button type="button" class="sec mini" data-a="usar">Usar</button>';
    if (t.embutido) {
      acoes += '<button type="button" class="sec mini" data-a="duplicar">Duplicar para editar</button>';
      acoes += '<button type="button" class="sec mini" data-a="exportar">Baixar JSON</button><button type="button" class="sec mini" data-a="exportar-yaml">Baixar YAML</button><button type="button" class="sec mini" data-a="copiar">Copiar JSON</button>';
    } else if (t._avulso) {
      acoes += '<button type="button" class="go mini" data-a="salvar-avulso">Guardar nos meus temas</button>';
      acoes += '<button type="button" class="sec mini" data-a="exportar">Baixar JSON</button><button type="button" class="sec mini" data-a="exportar-yaml">Baixar YAML</button><button type="button" class="sec mini" data-a="copiar">Copiar JSON</button><button type="button" class="sec mini" data-a="link">Link</button>';
    } else {
      acoes += '<button type="button" class="sec mini" data-a="editar">Editar</button><button type="button" class="sec mini" data-a="duplicar">Duplicar</button><button type="button" class="sec mini" data-a="exportar">Baixar JSON</button><button type="button" class="sec mini" data-a="exportar-yaml">Baixar YAML</button><button type="button" class="sec mini" data-a="copiar">Copiar JSON</button><button type="button" class="sec mini" data-a="link">Link</button><button type="button" class="dan mini" data-a="excluir">Excluir</button>';
    }
    const meta = [];
    if (!t.embutido) meta.push('Atualizado em ' + (t._atualizado ? formatarData(t._atualizado) : '—'));
    meta.push(telasComImg ? telasComImg + (telasComImg === 1 ? ' tela com imagem' : ' telas com imagem') : 'Sem imagem de fundo');
    if (!t.embutido && t.variante_de) meta.push('Variante de outro tema');
    return '<div class="tm-item' + (atual ? ' emuso' : '') + '" ' + dados + '><div class="tm-swatches" aria-hidden="true">' + sw + '</div>' +
      '<div class="tm-info"><strong>' + esc(t.nome) + '</strong>' + selosTema(t, atual) + '<p>' + esc(t.descricao || 'Sem descrição.') + '</p><div class="tm-meta">' + meta.map(esc).join(' · ') + '</div></div>' +
      '<div class="tm-acoes">' + acoes + '</div></div>';
  }

  async function listarTemas() {
    if (!janela) return;
    const el = $('tmLista'); if (!el) return;
    try {
      await carregarCatalogo();
      const atual = $('tema') ? $('tema').value : '';
      const customs = await temasPersonalizados();
      let html = '<h3 style="margin:2px 0 0;color:#0c326f;font-size:16px">Embutidos</h3><ul class="tm-lista">';
      Object.keys(catalogo.temas).forEach(k => { html += '<li>' + itemTema(modeloEmbutido(k), atual === k) + '</li>'; });
      html += '</ul><h3 style="margin:14px 0 0;color:#0c326f;font-size:16px">Meus temas</h3>';
      if (!customs.length && !temaAvulso) html += '<div class="tm-vazio">Nenhum tema personalizado ainda. Use <strong>Novo tema</strong> ou duplique um tema embutido.</div>';
      else {
        html += '<ul class="tm-lista">';
        if (temaAvulso && !customs.some(t => t.id === temaAvulso.id)) {
          const A = normalizar(temaAvulso); A._avulso = true; A._atualizado = agora();
          html += '<li>' + itemTema(A, atual === 'custom:' + A.id) + '</li>';
        }
        customs.forEach(t => { html += '<li>' + itemTema(t, atual === 'custom:' + t.id) + '</li>'; });
        html += '</ul>';
      }
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<div class="tm-vazio">Não foi possível ler os temas deste navegador: ' + esc((e && e.message) || e) + '</div>';
    }
  }

  async function duplicarTema(valor) {
    const r = await temaResolvido(valor);
    if (!r) throw new Error('O tema não foi encontrado.');
    const T = normalizar(r.tema);
    T.id = ''; T.embutido = false; T.nome = texto((T.nome || 'Tema') + ' (cópia)', 'Tema (cópia)', 80);
    delete T.variante_de;
    await abrirEditorCom(T, '', true, null);
  }
  async function guardarAvulso() {
    if (!temaAvulso) throw new Error('Não há tema recebido por link para guardar.');
    const T = normalizar(temaAvulso);
    const existente = await dbGet('temas', T.id);
    if (existente) T.id = idNovo(T.nome);
    const ex = extrairImagens(T, T.id);
    const salvo = await salvar(ex.tema, { imagens: ex.imagens, idForcado: T.id, versao: true, rotulo: 'Importado de link' });
    temaAvulso = null;
    await atualizarSeletor('custom:' + salvo.id);
    try { localStorage.setItem('conteudista.tema', 'custom:' + salvo.id); } catch (e) { /* */ }
    if (typeof aplicarTemaNoMarkdown === 'function') aplicarTemaNoMarkdown('custom:' + salvo.id);
    await listarTemas();
    const m = $('tmMeusMsg'); if (m) { m.textContent = 'Tema guardado nos meus temas.'; m.className = 'tm-msg ok'; }
    logApp('Tema “' + salvo.nome + '” guardado nos meus temas.', 'ok');
  }

  /* ---------------------------- Editor ---------------------------- */
  const idCampo = path => 'tm_' + String(path).replace(/[^a-zA-Z0-9]+/g, '_');
  const rotuloBase = id => (catalogo && catalogo.temas[id] && catalogo.temas[id].nome) || id || 'Padrão gov.br';

  function campoTexto(path, rotulo, valor, limite, ajuda) {
    const id = idCampo(path);
    return '<div class="tm-campo"><label for="' + id + '">' + esc(rotulo) + '</label><input type="text" id="' + id + '" data-campo="' + esc(path) + '" value="' + esc(valor) + '" maxlength="' + (limite || 120) + '">' + (ajuda ? '<small class="tm-nota">' + esc(ajuda) + '</small>' : '') + '</div>';
  }
  function campoCor(path, rotulo, valor) {
    const id = idCampo(path);
    return '<div class="tm-campo"><label for="' + id + 'Txt">' + esc(rotulo) + '</label><div class="tm-cor"><input type="color" id="' + id + 'C" data-campo="' + esc(path) + '" value="' + esc(valor) + '" aria-label="' + esc('Selecionar a cor ' + rotulo.toLowerCase()) + '"><input type="text" id="' + id + 'Txt" data-campo="' + esc(path) + '" data-hex="1" value="' + esc(valor) + '" maxlength="7" spellcheck="false" aria-label="' + esc(rotulo + ' em hexadecimal') + '"></div></div>';
  }
  function campoNum(path, rotulo, valor, min, max, passo, ajuda) {
    const id = idCampo(path);
    return '<div class="tm-campo"><label for="' + id + '">' + esc(rotulo) + '</label><input type="number" id="' + id + '" data-campo="' + esc(path) + '" min="' + min + '" max="' + max + '" step="' + (passo || 1) + '" value="' + esc(valor) + '">' + (ajuda ? '<small class="tm-nota">' + esc(ajuda) + '</small>' : '') + '</div>';
  }
  function campoSelect(path, rotulo, valor, opcoes, ajuda) {
    const id = idCampo(path);
    return '<div class="tm-campo"><label for="' + id + '">' + esc(rotulo) + '</label><select id="' + id + '" data-campo="' + esc(path) + '">' +
      opcoes.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(valor) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') +
      '</select>' + (ajuda ? '<small class="tm-nota">' + esc(ajuda) + '</small>' : '') + '</div>';
  }
  function campoRange(path, rotulo, valor, min, max, passo, sufixo) {
    const id = idCampo(path);
    return '<div class="tm-campo"><label for="' + id + '">' + esc(rotulo) + ' (<output id="' + id + 'Out">' + esc(valor) + '</output>' + esc(sufixo || '') + ')</label><input type="range" id="' + id + '" data-campo="' + esc(path) + '" min="' + min + '" max="' + max + '" step="' + (passo || 1) + '" value="' + esc(valor) + '"></div>';
  }
  function opcoesFonte(valor) {
    const ops = FONTES_CURADAS.slice();
    if (!ops.some(o => o[0] === valor)) ops.unshift([valor, 'Personalizada (atual)']);
    return ops;
  }
  function urlImagemDe(v) {
    if (!v) return '';
    if (/^img:/i.test(v)) { const r = editor && editor.imagens ? editor.imagens.get(v.slice(4)) : null; return r && r.data ? r.data : ''; }
    if (/^data:image\//i.test(v) || /^temas\//i.test(v)) return v;
    return '';
  }
  function blocoImagem(tela) {
    const T = editor.tema, v = T.telas[tela].imagem;
    const rec = /^img:/i.test(v) && editor.imagens ? editor.imagens.get(v.slice(4)) : null;
    const url = rec && rec.data ? rec.data : (/^data:image\//i.test(v) || /^temas\//i.test(v) ? v : '');
    const nome = rec ? (rec.nome + ' · ' + Math.ceil((rec.bytes || 0) / 1024) + ' KB') : (v ? 'Imagem do tema' : 'Sem imagem de fundo');
    const idf = 'tmFile_' + tela;
    return '<div class="tm-img" id="tmImg_' + tela + '"><div class="tm-imgprev" style="' + (url ? 'background-image:url(&quot;' + esc(url).replace(/&quot;/g, '%22') + '&quot;);' : '') + '" role="img" aria-label="' + esc('Prévia do fundo da tela ' + ROTULO_TELA[tela]) + '"></div><div><p class="tm-nota" data-nome-imagem>' + esc(nome) + '</p><div class="tm-imgacoes"><button type="button" class="sec mini" data-a="img-escolher" data-papel="' + tela + '">Escolher imagem</button><button type="button" class="sec mini" data-a="img-remover" data-papel="' + tela + '"' + (v ? '' : ' disabled') + '>Remover imagem</button><input type="file" id="' + idf + '" data-papel="' + tela + '" accept="image/png,image/jpeg,image/webp" hidden><small class="tm-nota">PNG, JPEG ou WebP; a imagem é reduzida e convertida para WebP. Limite por imagem e total definido em Opções.</small></div></div></div>';
  }
  function blocoTela(tela) {
    const x = editor.tema.telas[tela];
    const det = '<details class="tm-detalhe" data-tela="' + tela + '"' + (tela === previaTela ? ' open' : '') + '><summary data-tela="' + tela + '">' + esc(ROTULO_TELA[tela]) + '</summary>' +
      '<div class="tm-grade">' + campoCor('telas.' + tela + '.fundo', 'Cor de fundo', x.fundo) + campoCor('telas.' + tela + '.texto', 'Cor do texto', x.texto) + '</div>' +
      blocoImagem(tela) +
      '<div class="tm-grade">' + campoRange('telas.' + tela + '.imagem_opacidade', 'Opacidade da imagem', x.imagem_opacidade, 0, 100, 1, '%') +
      campoSelect('telas.' + tela + '.imagem_posicao', 'Posição da imagem', x.imagem_posicao, [['center', 'Centro'], ['top', 'Topo'], ['bottom', 'Base'], ['left', 'Esquerda'], ['right', 'Direita']]) +
      campoSelect('telas.' + tela + '.titulo_alinhamento', 'Alinhamento do título', x.titulo_alinhamento, [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]) + '</div>' +
      (tela === 'capa' || tela === 'finalizacao'
        ? '<div class="tm-grade">' + campoNum('telas.' + tela + '.titulo_largura', 'Largura do bloco de título (%)', x.titulo_largura, 20, 100, 1) + campoNum('telas.' + tela + '.titulo_deslocamento_x', 'Deslocamento do título para a direita (%)', x.titulo_deslocamento_x, 0, 80, 1) + campoNum('telas.' + tela + '.titulo_deslocamento_y', 'Deslocamento vertical do título (%)', x.titulo_deslocamento_y, -40, 40, 1) + '</div>'
        : '<p class="tm-nota">Nas telas internas, a posição do texto segue as margens e o topo definidos em “Posições”. Deixe a imagem vazia ou reduza a opacidade para isolar a área de leitura.</p>') +
      '</details>';
    return det;
  }

  function renderEditorVazio() {
    const v = $('tmEditorVazio'), b = $('tmEditorBox');
    if (v) v.hidden = false;
    if (b) { b.hidden = true; b.innerHTML = ''; }
  }

  function renderEditor() {
    if (!janela) return;
    const v = $('tmEditorVazio'), b = $('tmEditorBox');
    if (!editor) { renderEditorVazio(); return; }
    if (v) v.hidden = true;
    if (!b) return;
    b.hidden = false;
    const T = editor.tema, p = T.paleta;
    const partes = [];
    partes.push('<div class="tm-ed"><div>');
    partes.push('<section class="tm-sec"><h3>Identidade <span class="tm-selo avulso" id="tmDirty"' + (editor.sujo ? '' : ' hidden') + '>Alterações não salvas</span></h3><div class="tm-grade">' +
      campoTexto('nome', 'Nome do tema', T.nome, 80) + campoTexto('descricao', 'Descrição curta', T.descricao, 240) + '</div>' +
      '<p class="tm-nota">Base: <strong>' + esc(rotuloBase(T.base)) + '</strong>' + (editor.novo ? ' · este tema ainda não foi salvo.' : ' · salvo neste navegador.') + '</p>' +
      '<p class="tm-msg" id="tmEdMsg" role="status" aria-live="polite"></p></section>');
    partes.push('<section class="tm-sec"><h3>Cores</h3><div class="tm-grade">' + Object.keys(PALETA_PADRAO).map(k => campoCor('paleta.' + k, ROTULO_COR[k], p[k])).join('') + '</div><p class="tm-nota">O contraste é conferido nos pares essenciais antes de gerar. Você pode corrigir automaticamente ou autorizar a geração.</p></section>');
    partes.push('<section class="tm-sec"><h3>Fontes e texto</h3><div class="tm-grade">' + campoSelect('fontes.titulo', 'Fonte dos títulos', T.fontes.titulo, opcoesFonte(T.fontes.titulo)) + campoSelect('fontes.texto', 'Fonte do texto', T.fontes.texto, opcoesFonte(T.fontes.texto)) + '</div><div class="tm-grade">' +
      campoNum('fontes.tamanho_base', 'Tamanho do texto (px)', T.fontes.tamanho_base, 14, 32, 1) + campoNum('fontes.tamanho_titulo', 'Tamanho do título (px)', T.fontes.tamanho_titulo, 28, 72, 1) +
      campoNum('fontes.tamanho_h2', 'Tamanho do subtítulo (px)', T.fontes.tamanho_h2, 18, 44, 1) + campoNum('fontes.entrelinha', 'Entrelinha', T.fontes.entrelinha, 1.1, 2.2, 0.05) +
      campoNum('fontes.espacamento', 'Espaçamento entre letras (em)', T.fontes.espacamento, -0.1, 0.2, 0.01) + '</div><p class="tm-nota">Atkinson Hyperlegible Next e OpenDyslexic são opções de leitura. O navegador usa a fonte se ela estiver instalada; senão, usa a fonte de apoio.</p></section>');
    partes.push('<section class="tm-sec"><h3>Telas</h3><p class="tm-nota">Cada papel isola um uso: capa, duas telas internas, finalização e licenciamento. A imagem de fundo é opcional por tela.</p>' + TELAS.map(blocoTela).join('') + '</section>');
    partes.push('<section class="tm-sec"><h3>Imagens e Mermaid</h3><div class="tm-grade">' +
      campoRange('imagens.tamanho_base', 'Tamanho base das imagens', T.imagens.tamanho_base, 25, 160, 1, '%') +
      campoNum('imagens.arredondamento', 'Arredondamento das imagens (px)', T.imagens.arredondamento, 0, 48, 1) +
      campoSelect('imagens.sombra', 'Sombra nas imagens', T.imagens.sombra ? 'sim' : 'nao', [['nao', 'Sem sombra'], ['sim', 'Com sombra']]) + '</div>' +
      '<div class="tm-grade">' + campoSelect('mermaid.tema', 'Tema do Mermaid', T.mermaid.tema, [['default', 'Padrão'], ['neutral', 'Neutro'], ['dark', 'Escuro'], ['forest', 'Floresta']]) +
      campoRange('mermaid.escala', 'Escala do Mermaid', T.mermaid.escala, 50, 200, 1, '%') + campoCor('mermaid.fundo', 'Fundo do Mermaid', T.mermaid.fundo) + '</div></section>');
    partes.push('<section class="tm-sec"><h3>Posições</h3><div class="tm-grade">' + Object.keys(POSICOES_PADRAO).map(k => campoNum('posicoes.' + k, ROTULO_POSICAO[k], T.posicoes[k], LIMITES['posicoes.' + k][0], LIMITES['posicoes.' + k][1], 1)).join('') + '</div></section>');
    partes.push('<section class="tm-sec"><h3>Variantes</h3><p class="tm-nota">As variantes são temas novos, editáveis. A variante escura escurece as telas e mantém a apostila legível; a de alto contraste usa fundo branco, texto preto e remove imagens de fundo.</p><div class="tm-acoes"><button type="button" class="sec mini" data-a="variante-escura">Criar variante escura</button><button type="button" class="sec mini" data-a="variante-contraste">Criar variante de alto contraste</button><button type="button" class="sec mini" data-a="corrigir">Corrigir contrastes agora</button></div></section>');
    partes.push('</div><aside class="tm-prev" aria-label="Prévia do tema"><h3>Prévia</h3><div class="tm-prev-slides" id="tmPrevSlides"></div><div id="tmPrevApostila"></div><div id="tmPrevMermaid"></div><div class="tm-contraste" id="tmPrevContraste"></div><p class="tm-nota">A prévia é uma aproximação. Gere os arquivos para conferir o layout final.</p></aside></div>');
    b.innerHTML = partes.join('');
    atualizarPreview();
  }

  async function refsImagensGlobais() {
    const all = await dbAll('temas'), set = new Set();
    all.forEach(t => {
      if (!t || t.id === '__rascunho__') return;
      TELAS.forEach(tela => { const v = t.telas && t.telas[tela] && t.telas[tela].imagem; if (/^img:/i.test(String(v || ''))) set.add(String(v).slice(4)); });
    });
    return set;
  }
  async function limparRascunho() {
    clearTimeout(tRascunho); tRascunho = null;
    try { await dbDel('temas', '__rascunho__'); } catch (e) { /* */ }
    const refs = await refsImagensGlobais();
    for (const r of (await dbAll('tema_imagens')).filter(x => x.tema === '__rascunho__')) if (!refs.has(r.id)) { try { await dbDel('tema_imagens', r.id); } catch (e) { /* */ } }
  }

  async function abrirEditor(valor, idOriginal, novo) {
    if (!janela) await abrir();
    let T = null, map = new Map(), recuperado = false;
    if (idOriginal) {
      const raw = await dbGet('temas', idOriginal);
      if (raw) { T = normalizar(raw); map = await imagensDoTema(idOriginal); }
    }
    if (!T) {
      if (valor) {
        const r = await temaResolvido(valor);
        if (!r) throw new Error('O tema não foi encontrado.');
        T = normalizar(r.tema);
      } else T = modeloPadrao('govbr');
      T.id = '';
      const ex = extrairImagens(T, '__rascunho__');
      T = ex.tema;
      ex.imagens.forEach((r, id) => map.set(id, r));
    }
    const draft = await dbGet('temas', '__rascunho__');
    if (draft && draft._data && String(draft._alvo || '') === String(idOriginal || '')) {
      const quando = formatarData(draft._data);
      const ok = window.Dialogo ? await Dialogo.confirmar({ titulo: 'Recuperar rascunho não salvo?', descricao: 'Há alterações do tema “' + (draft.nome || 'sem nome') + '” guardadas automaticamente em ' + quando + '. Deseja continuar de onde parou?', rotulo: 'Recuperar rascunho' }) : Promise.resolve(confirm('Recuperar o rascunho não salvo deste tema?'));
      if (ok) {
        T = normalizar(draft); T.id = idOriginal || '';
        const dm = await imagensDoTema('__rascunho__');
        dm.forEach((r, id) => map.set(id, r));
        recuperado = true;
      } else await limparRascunho();
    }
    await abrirEditorCom(T, idOriginal || '', novo && !recuperado, map, recuperado);
  }

  async function abrirEditorCom(T, idOriginal, novo, map, recuperado) {
    if (!map) {
      const ex = extrairImagens(T, '__rascunho__');
      T = ex.tema; map = ex.imagens;
    }
    T = normalizar(T); T.id = idOriginal || ''; T.embutido = false;
    for (const rec of map.values()) if (rec.tema === '__rascunho__' && rec.data) { try { await dbPut('tema_imagens', rec); } catch (e) { /* */ } }
    editor = { tema: T, originalId: idOriginal || '', novo: !!novo, imagens: map, sujo: false, base: T.base };
    renderEditor();
    if (janela) { janela.ativar('editor', true); setTimeout(() => { const n = $('tmNome') || $('tm_nome'); if (n) n.focus(); }, 50); }
    if (recuperado) edMsg('Rascunho recuperado. Salve o tema quando terminar.', 'ok');
  }

  function edMsg(t, tipo) {
    const m = $('tmEdMsg'); if (!m) return;
    m.textContent = t || ''; m.className = 'tm-msg' + (tipo ? ' ' + tipo : '');
    if (t) anunciar(t);
  }
  function marcarSujo() {
    if (!editor) return;
    editor.sujo = true;
    const d = $('tmDirty'); if (d) d.hidden = false;
    agendarRascunho();
  }
  function agendarRascunho() {
    if (!editor) return;
    clearTimeout(tRascunho);
    tRascunho = setTimeout(gravarRascunho, 700);
  }
  async function gravarRascunho() {
    if (!editor) return;
    try {
      const T = normalizar(editor.tema);
      const reg = Object.assign({}, T, { id: '__rascunho__', _alvo: editor.originalId || '', _novo: !!editor.novo, _data: agora() });
      await dbPut('temas', reg);
    } catch (e) { /* rascunho é best effort */ }
  }

  function novoEditor() {
    if (editor && editor.sujo && window.Dialogo) {
      Dialogo.confirmar({ titulo: 'Começar um novo tema?', descricao: 'As alterações não salvas do tema atual serão descartadas. O rascunho automático será apagado.', rotulo: 'Começar novo', perigo: true }).then(ok => { if (ok) { limparRascunho().then(() => abrirEditor('', '', true)); } });
      return;
    }
    abrirEditor('', '', true);
  }

  /* ---------------------------- Editor: eventos, prévia e salvamento ---------------------------- */
  function getPath(obj, path) {
    const p = String(path).split('.');
    let o = obj;
    for (const k of p) { if (o == null) return undefined; o = o[k]; }
    return o;
  }
  function setPath(obj, path, valor) {
    const p = String(path).split('.');
    let o = obj;
    for (let i = 0; i < p.length - 1; i++) { if (o[p[i]] == null || typeof o[p[i]] !== 'object') o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = valor;
  }
  let tPrev = null;
  function agendarPreview() { clearTimeout(tPrev); tPrev = setTimeout(atualizarPreview, 70); }

  function estiloTela(t) {
    const s = ['background-color:' + t.fundo, 'color:' + t.texto];
    const url = urlImagemDe(t.imagem);
    if (url) {
      const op = Math.max(0, Math.min(100, Number(t.imagem_opacidade)));
      const alfa = (100 - op) / 100;
      const h = corValida(t.fundo, '#ffffff').slice(1);
      const rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
      const veu = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alfa.toFixed(3) + ')';
      s.push('background-image:linear-gradient(' + veu + ',' + veu + '),url("' + url.replace(/"/g, '%22') + '")');
      s.push('background-size:cover');
      s.push('background-position:' + t.imagem_posicao);
    }
    return s.join(';') + ';';
  }

  function atualizarPreview() {
    if (!editor) return;
    const T = editor.tema;
    const slides = $('tmPrevSlides');
    if (slides) {
      slides.innerHTML = TELAS.map(tela => {
        const x = T.telas[tela];
        const capa = tela === 'capa' || tela === 'finalizacao';
        const tamTit = Math.max(12, Math.round((capa ? T.fontes.tamanho_titulo : T.fontes.tamanho_h2) * 0.36));
        const tamTxt = Math.max(9, Math.round(T.fontes.tamanho_base * 0.45));
        const larg = capa ? 'width:' + x.titulo_largura + '%;margin-left:' + x.titulo_deslocamento_x + '%;' : '';
        const titulo = tela === 'capa' ? 'Título da capa' : tela === 'finalizacao' ? 'Título da finalização' : tela === 'licenciamento' ? 'Licenciamento' : (tela === 'interna_escura' ? 'Título da tela escura' : 'Título da tela clara');
        return '<div class="tm-prev-card" style="' + estiloTela(x) + '" aria-label="' + esc('Prévia da ' + ROTULO_TELA[tela]) + '"><small>' + esc(ROTULO_TELA[tela]) + '</small><b style="font-family:' + esc(T.fontes.titulo) + ';font-size:' + tamTit + 'px;text-align:' + x.titulo_alinhamento + ';' + larg + '">' + esc(titulo) + '</b><span style="font-family:' + esc(T.fontes.texto) + ';font-size:' + tamTxt + 'px;text-align:' + x.titulo_alinhamento + ';">Texto de exemplo com a fonte e a cor desta tela.</span></div>';
      }).join('');
    }
    const p = T.paleta, img = T.imagens;
    const ap = $('tmPrevApostila');
    if (ap) ap.innerHTML = '<div class="tm-prev-apostila"><header style="background:' + esc(p.primaria) + ';color:#fff;font-family:' + esc(T.fontes.titulo) + '">Apostila · ' + esc(T.nome) + '</header><article style="background:' + esc(p.superficie) + ';color:' + esc(p.texto) + ';border-color:' + esc(p.linha) + '"><h4 style="font-family:' + esc(T.fontes.titulo) + ';color:' + esc(p.primaria) + ';font-size:' + Math.max(11, Math.round(T.fontes.tamanho_h2 * 0.42)) + 'px">Título de exemplo</h4><p style="font-family:' + esc(T.fontes.texto) + ';font-size:' + Math.max(9, Math.round(T.fontes.tamanho_base * 0.44)) + 'px;line-height:' + T.fontes.entrelinha + ';letter-spacing:' + T.fontes.espacamento + 'em">Texto da apostila com a fonte, o tamanho e a entrelinha escolhidos. O contraste do corpo é conferido antes de gerar.</p><div class="fake-img" style="width:' + img.tamanho_base + '%;border-radius:' + img.arredondamento + 'px;box-shadow:' + (img.sombra ? '0 2px 10px rgba(0,0,0,.18)' : 'none') + '"></div><blockquote style="background:' + esc(p.suave) + ';border-left-color:' + esc(p.destaque) + ';color:' + esc(p.texto) + '">Exemplo de citação com a cor de apoio.</blockquote></article></div>';
    const mm = $('tmPrevMermaid');
    if (mm) mm.innerHTML = '<div class="tm-prev-mermaid" style="background:' + esc(T.mermaid.fundo) + ';color:' + esc(p.texto) + ';border-color:' + esc(p.linha) + '">Mermaid: tema <strong>' + esc(T.mermaid.tema) + '</strong> · escala ' + esc(T.mermaid.escala) + '% · fundo ' + esc(T.mermaid.fundo) + '</div>';
    atualizarContraste();
  }

  function atualizarContraste() {
    if (!editor) return;
    const box = $('tmPrevContraste'); if (!box) return;
    const T = editor.tema;
    const f = falhasContraste(T), extras = paresExtras(T).filter(x => !x.ok);
    const avisos = [];
    TELAS.forEach(tela => {
      const x = T.telas[tela];
      if (x.imagem && x.imagem_opacidade > 40) avisos.push('A imagem de fundo em “' + ROTULO_TELA[tela] + '” está a ' + x.imagem_opacidade + '%: o contraste real depende da imagem. Reduza a opacidade ou deixe sem imagem para proteger a leitura.');
    });
    let h = '<h4>Contraste ' + esc(nivelContraste().toUpperCase()) + '</h4>';
    if (!f.length) h += '<p class="tm-ok">Todos os pares essenciais atendem ao mínimo.</p>';
    else {
      h += '<p class="tm-falha">' + f.length + (f.length === 1 ? ' par abaixo do mínimo:' : ' pares abaixo do mínimo:') + '</p><ul>' +
        f.map(x => '<li><span>' + esc(x.rotulo) + '</span><strong class="tm-falha">' + x.razao.toFixed(2) + ':1</strong></li>').join('') + '</ul>';
    }
    if (extras.length) h += '<p class="tm-aviso">Atenção fora dos pares essenciais:</p><ul>' + extras.map(x => '<li><span>' + esc(x.rotulo) + '</span><strong class="tm-aviso">' + x.razao.toFixed(2) + ':1</strong></li>').join('') + '</ul>';
    if (avisos.length) h += '<ul>' + avisos.map(a => '<li><span class="tm-aviso">' + esc(a) + '</span></li>').join('') + '</ul>';
    h += '<button type="button" class="sec mini" data-a="corrigir" style="margin-top:6px">Corrigir contrastes</button>';
    box.innerHTML = h;
  }

  function atualizarBlocoImagem(tela) {
    if (!editor) return;
    const wrap = $('tmImg_' + tela); if (!wrap) return;
    const v = editor.tema.telas[tela].imagem;
    const rec = /^img:/i.test(v) ? editor.imagens.get(v.slice(4)) : null;
    const url = rec && rec.data ? rec.data : (/^data:image\//i.test(v) || /^temas\//i.test(v) ? v : '');
    const prev = wrap.querySelector('.tm-imgprev');
    if (prev) { prev.style.backgroundImage = url ? 'url("' + url.replace(/"/g, '%22') + '")' : ''; prev.textContent = url ? '' : 'Sem imagem'; }
    const nome = wrap.querySelector('[data-nome-imagem]');
    if (nome) nome.textContent = rec ? (rec.nome + ' · ' + Math.ceil((rec.bytes || 0) / 1024) + ' KB') : (v ? 'Imagem do tema' : 'Sem imagem de fundo');
    const rem = wrap.querySelector('[data-a="img-remover"]'); if (rem) rem.disabled = !v;
  }

  function aoEditar(e) {
    if (!editor) return;
    const el = e.target, campo = el.dataset.campo;
    if (!campo) return;
    const T = editor.tema;
    if (el.dataset.hex) {
      const v = String(el.value).trim();
      if (!/^#?[0-9a-f]{6}$/i.test(v)) return;
      const cor = corValida(v);
      setPath(T, campo, cor);
      const c = $(el.id.replace(/Txt$/, 'C')); if (c) c.value = cor;
      marcarSujo(); agendarPreview(); return;
    }
    if (el.type === 'color') {
      const cor = corValida(el.value, getPath(T, campo));
      setPath(T, campo, cor);
      const txt = $(el.id.replace(/C$/, 'Txt')); if (txt) txt.value = cor;
      marcarSujo(); agendarPreview(); return;
    }
    if (el.type === 'number' || el.type === 'range') {
      let v = Number(el.value); if (!isFinite(v)) return;
      const lim = LIMITES[campo]; if (lim) v = Math.max(lim[0], Math.min(lim[1], v));
      setPath(T, campo, v);
      if (el.type === 'range') { const out = $(el.id + 'Out'); if (out) out.textContent = v; }
      marcarSujo(); agendarPreview(); return;
    }
    if (el.tagName === 'SELECT') {
      let v = el.value;
      if (campo === 'imagens.sombra') v = v === 'sim';
      setPath(T, campo, v);
      marcarSujo(); agendarPreview(); return;
    }
    setPath(T, campo, el.value);
    marcarSujo(); agendarPreview();
  }

  function aoMudar(e) {
    if (!editor) return;
    const el = e.target;
    if (el.matches && el.matches('input[type=file][data-papel]')) {
      const f = el.files && el.files[0];
      const papel = el.dataset.papel;
      el.value = '';
      if (f) processarImagem(f, papel);
      return;
    }
    const campo = el.dataset.campo; if (!campo) return;
    const T = editor.tema;
    if (el.dataset.hex) {
      const v = corValida(el.value, getPath(T, campo));
      setPath(T, campo, v); el.value = v;
      const c = $(el.id.replace(/Txt$/, 'C')); if (c) c.value = v;
      marcarSujo(); agendarPreview(); return;
    }
    if (el.type === 'number') {
      const v = Number(getPath(T, campo));
      if (isFinite(v)) el.value = v;
    }
  }

  function aoClicar(e) {
    if (!editor) return;
    const sum = e.target.closest && e.target.closest('summary[data-tela]');
    if (sum) { previaTela = sum.dataset.tela; setTimeout(atualizarPreview, 0); return; }
    const b = e.target.closest && e.target.closest('button[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'corrigir') {
      editor.tema = corrigirContraste(editor.tema);
      renderEditor(); marcarSujo();
      edMsg('Contrastes corrigidos. Confira a prévia e salve o tema.', 'ok');
    } else if (a === 'variante-escura' || a === 'variante-contraste') {
      const tipo = a === 'variante-escura' ? 'escuro' : 'contraste';
      const V = variante(editor.tema, tipo);
      V.id = '';
      editor.tema = V; editor.originalId = ''; editor.novo = true; editor.base = V.base;
      renderEditor(); marcarSujo();
      edMsg('Variante “' + V.nome + '” criada como novo tema. Ajuste e clique em Salvar tema.', 'ok');
    } else if (a === 'img-escolher') {
      const f = $('tmFile_' + b.dataset.papel); if (f) f.click();
    } else if (a === 'img-remover') {
      removerImagem(b.dataset.papel);
    }
  }

  async function processarImagem(file, papel) {
    if (!editor) return;
    try {
      edMsg('Preparando a imagem…');
      const rec = await recomprimirImagem(file);
      const total = totalImagens(editor.imagens) + rec.bytes;
      if (total > limiteTotal()) throw new Error('As imagens do tema passariam de ' + Math.round(limiteTotal() / 1024) + ' KB. Remova alguma imagem antes de adicionar outra.');
      const id = uidImagem();
      const reg = { id, tema: '__rascunho__', papel, nome: texto(file.name, 'imagem', 120), tipo: rec.tipo, bytes: rec.bytes, largura: rec.largura, altura: rec.altura, data: rec.data, criado: agora() };
      editor.imagens.set(id, reg);
      editor.tema.telas[papel].imagem = 'img:' + id;
      try { await dbPut('tema_imagens', reg); } catch (e) { /* o tema ainda pode ser salvo */ }
      atualizarBlocoImagem(papel); atualizarPreview(); marcarSujo();
      edMsg('Imagem adicionada à ' + ROTULO_TELA[papel].toLowerCase() + ' (' + Math.ceil(rec.bytes / 1024) + ' KB).', 'ok');
    } catch (e) {
      edMsg('Não foi possível usar a imagem: ' + ((e && e.message) || e), 'erro');
    }
  }

  async function removerImagem(papel) {
    if (!editor) return;
    const T = editor.tema, v = T.telas[papel].imagem;
    if (!v) return;
    T.telas[papel].imagem = '';
    if (/^img:/i.test(v)) {
      const id = v.slice(4);
      const usadoEmOutra = TELAS.some(t => t !== papel && T.telas[t].imagem === v);
      const rec = editor.imagens.get(id);
      if (!usadoEmOutra && rec && rec.tema === '__rascunho__') { try { await dbDel('tema_imagens', id); } catch (e) { /* */ } editor.imagens.delete(id); }
    }
    atualizarBlocoImagem(papel); atualizarPreview(); marcarSujo();
    edMsg('Imagem removida da ' + ROTULO_TELA[papel].toLowerCase() + '.', 'ok');
  }

  async function salvarEditor() {
    if (!editor) return;
    try {
      edMsg('Salvando o tema…');
      const T = normalizar(editor.tema);
      T.id = editor.originalId || '';
      const antes = falhasContraste(T);
      const salvo = await salvar(T, { imagens: editor.imagens, idForcado: editor.originalId || undefined, versao: true, rotulo: 'Salvamento' });
      const corrigido = !!salvo._corrigido;
      editor.tema = normalizar(salvo);
      editor.originalId = salvo.id; editor.novo = false; editor.sujo = false;
      await limparRascunho();
      const alvo = await atualizarSeletor('custom:' + salvo.id);
      try { localStorage.setItem('conteudista.tema', alvo); } catch (e) { /* */ }
      if (typeof aplicarTemaNoMarkdown === 'function') aplicarTemaNoMarkdown(alvo);
      await listarTemas(); await preencherVersoes();
      renderEditor();
      if (corrigido) edMsg('Tema salvo. As cores com contraste insuficiente foram corrigidas automaticamente.', 'ok');
      else if (antes.length) edMsg('Tema salvo, mas ainda há contraste abaixo do mínimo. A geração vai pedir correção ou autorização.', '');
      else edMsg('Tema salvo neste navegador. Use “Usar” para aplicá-lo ao conteúdo.', 'ok');
      logApp('Tema “' + salvo.nome + '” salvo neste navegador.', 'ok');
      anunciar('Tema salvo.');
    } catch (e) {
      edMsg('Não foi possível salvar o tema: ' + ((e && e.message) || e), 'erro');
    }
  }

  async function descartarEditor() {
    if (!editor) { if (janela) janela.ativar('meus'); return; }
    if (editor.sujo) {
      const ok = window.Dialogo ? await Dialogo.confirmar({ titulo: 'Descartar alterações do tema?', descricao: 'As alterações não salvas e o rascunho automático deste tema serão apagados.', rotulo: 'Descartar', perigo: true }) : Promise.resolve(confirm('Descartar as alterações não salvas do tema?'));
      if (!ok) return;
    }
    await limparRascunho();
    editor = null;
    renderEditorVazio();
    await listarTemas();
    if (janela) janela.ativar('meus', true);
    logApp('Alterações do tema descartadas.', 'ok');
  }

  function montarEditor() {
    const p = janela.pane('editor');
    p.innerHTML = '<div class="tm-vazio" id="tmEditorVazio">Escolha um tema em <strong>Meus temas</strong> ou crie um <strong>Novo tema</strong> para editar cores, fontes, telas, imagens e Mermaid.</div><div id="tmEditorBox" hidden></div>';
    p.addEventListener('input', aoEditar);
    p.addEventListener('change', aoMudar);
    p.addEventListener('click', aoClicar);
  }

  /* ---------------------------- Versões ---------------------------- */
  function msgVersoes(t, tipo) {
    const m = $('tmVerMsg');
    if (m) { m.textContent = t || ''; m.className = 'tm-msg' + (tipo ? ' ' + tipo : ''); }
    if (t) anunciar(t);
  }
  function msgImportar(t, tipo) {
    const m = $('tmImpMsg');
    if (m) { m.textContent = t || ''; m.className = 'tm-msg' + (tipo ? ' ' + tipo : ''); }
    if (t) anunciar(t);
  }
  function rotuloVersao(v) {
    const partes = [formatarData(v.data)];
    if (v.rotulo) partes.push(v.rotulo);
    if (v.marco) partes.push('marcada');
    return partes.join(' · ');
  }
  async function versoesDoTema(temaId) {
    const todas = await dbAll('temas_versoes');
    return todas.filter(v => v && v.tema_id === temaId)
      .sort((a, b) => (b.data || 0) - (a.data || 0) || (Number(b.id) || 0) - (Number(a.id) || 0));
  }
  async function dadosDaVersao(valor, temaId) {
    if (valor === 'atual') {
      const raw = await dbGet('temas', temaId);
      if (raw) return { dados: normalizar(raw), rotulo: 'Atual', data: raw.atualizado || 0, atual: true };
      if (temaAvulso && temaAvulso.id === temaId) return { dados: normalizar(temaAvulso), rotulo: 'Atual (recebido por link)', data: 0, atual: true };
      return null;
    }
    const v = await dbGet('temas_versoes', Number(valor));
    if (!v) return null;
    return { dados: normalizar(v.dados), rotulo: v.rotulo || 'Versão', data: v.data || 0, marco: !!v.marco, id: v.id };
  }

  function secoesTema(T) {
    const S = [];
    S.push({ chave: 'identidade', rotulo: 'Identidade', campos: [
      { chave: 'nome', rotulo: 'Nome', valor: T.nome, tipo: 'texto' },
      { chave: 'descricao', rotulo: 'Descrição', valor: T.descricao || '', tipo: 'texto' },
      { chave: 'base', rotulo: 'Base', valor: T.base || '', tipo: 'texto' },
      { chave: 'variante_de', rotulo: 'Variante de', valor: T.variante_de || '', tipo: 'texto' }
    ] });
    S.push({ chave: 'paleta', rotulo: 'Cores', campos: Object.keys(PALETA_PADRAO).map(k => ({ chave: 'paleta.' + k, rotulo: ROTULO_COR[k], valor: T.paleta[k], tipo: 'cor' })) });
    S.push({ chave: 'fontes', rotulo: 'Fontes e texto', campos: [
      { chave: 'fontes.titulo', rotulo: 'Fonte dos títulos', valor: T.fontes.titulo, tipo: 'fonte' },
      { chave: 'fontes.texto', rotulo: 'Fonte do texto', valor: T.fontes.texto, tipo: 'fonte' },
      { chave: 'fontes.tamanho_base', rotulo: 'Tamanho do texto', valor: T.fontes.tamanho_base, tipo: 'px' },
      { chave: 'fontes.tamanho_titulo', rotulo: 'Tamanho do título', valor: T.fontes.tamanho_titulo, tipo: 'px' },
      { chave: 'fontes.tamanho_h2', rotulo: 'Tamanho do subtítulo', valor: T.fontes.tamanho_h2, tipo: 'px' },
      { chave: 'fontes.entrelinha', rotulo: 'Entrelinha', valor: T.fontes.entrelinha, tipo: 'numero' },
      { chave: 'fontes.espacamento', rotulo: 'Espaçamento entre letras', valor: T.fontes.espacamento, tipo: 'em' }
    ] });
    TELAS.forEach(tela => {
      const x = T.telas[tela];
      S.push({ chave: 'telas.' + tela, rotulo: ROTULO_TELA[tela], campos: [
        { chave: 'telas.' + tela + '.fundo', rotulo: 'Cor de fundo', valor: x.fundo, tipo: 'cor' },
        { chave: 'telas.' + tela + '.texto', rotulo: 'Cor do texto', valor: x.texto, tipo: 'cor' },
        { chave: 'telas.' + tela + '.imagem', rotulo: 'Imagem de fundo', valor: x.imagem, tipo: 'imagem' },
        { chave: 'telas.' + tela + '.imagem_opacidade', rotulo: 'Opacidade da imagem', valor: x.imagem_opacidade, tipo: 'percentual' },
        { chave: 'telas.' + tela + '.imagem_posicao', rotulo: 'Posição da imagem', valor: x.imagem_posicao, tipo: 'texto' },
        { chave: 'telas.' + tela + '.titulo_alinhamento', rotulo: 'Alinhamento do título', valor: x.titulo_alinhamento, tipo: 'texto' },
        { chave: 'telas.' + tela + '.titulo_largura', rotulo: 'Largura do título', valor: x.titulo_largura, tipo: 'percentual' },
        { chave: 'telas.' + tela + '.titulo_deslocamento_x', rotulo: 'Deslocamento horizontal do título', valor: x.titulo_deslocamento_x, tipo: 'percentual' },
        { chave: 'telas.' + tela + '.titulo_deslocamento_y', rotulo: 'Deslocamento vertical do título', valor: x.titulo_deslocamento_y, tipo: 'percentual' }
      ] });
    });
    S.push({ chave: 'imagens', rotulo: 'Imagens', campos: [
      { chave: 'imagens.tamanho_base', rotulo: 'Tamanho base das imagens', valor: T.imagens.tamanho_base, tipo: 'percentual' },
      { chave: 'imagens.arredondamento', rotulo: 'Arredondamento das imagens', valor: T.imagens.arredondamento, tipo: 'px' },
      { chave: 'imagens.sombra', rotulo: 'Sombra nas imagens', valor: T.imagens.sombra, tipo: 'booleano' }
    ] });
    S.push({ chave: 'mermaid', rotulo: 'Mermaid', campos: [
      { chave: 'mermaid.tema', rotulo: 'Tema do Mermaid', valor: T.mermaid.tema, tipo: 'texto' },
      { chave: 'mermaid.escala', rotulo: 'Escala do Mermaid', valor: T.mermaid.escala, tipo: 'percentual' },
      { chave: 'mermaid.fundo', rotulo: 'Fundo do Mermaid', valor: T.mermaid.fundo, tipo: 'cor' }
    ] });
    S.push({ chave: 'posicoes', rotulo: 'Posições', campos: Object.keys(POSICOES_PADRAO).map(k => ({ chave: 'posicoes.' + k, rotulo: ROTULO_POSICAO[k], valor: T.posicoes[k], tipo: 'px' })) });
    return S;
  }
  function valorComparavel(c) {
    if (c.tipo === 'imagem') return c.valor ? 'com' : 'sem';
    if (c.tipo === 'booleano') return c.valor ? 'sim' : 'nao';
    if (c.tipo === 'fonte') return String(c.valor || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return String(c.valor == null ? '' : c.valor);
  }
  function formatarValor(c) {
    if (c.tipo === 'cor') return '<span class="tm-sw" style="background:' + esc(c.valor) + '" aria-hidden="true"></span> <code>' + esc(c.valor) + '</code>';
    if (c.tipo === 'imagem') return c.valor ? 'Com imagem' : 'Sem imagem';
    if (c.tipo === 'booleano') return c.valor ? 'Sim' : 'Não';
    if (c.tipo === 'percentual') return esc(String(c.valor)) + '%';
    if (c.tipo === 'px') return esc(String(c.valor)) + ' px';
    if (c.tipo === 'em') return esc(String(c.valor)) + ' em';
    if (c.tipo === 'fonte') return '<span style="font-family:' + esc(c.valor) + '">Amostra</span> <code>' + esc(c.valor) + '</code>';
    return esc(c.valor === '' || c.valor == null ? '—' : String(c.valor));
  }
  function compararSecoes(A, B) {
    const SA = secoesTema(A), SB = secoesTema(B), res = [];
    SA.forEach((sa, i) => {
      const sb = SB[i]; if (!sb) return;
      const mapaB = new Map(sb.campos.map(c => [c.chave, c]));
      const difs = sa.campos.filter(c => {
        const d = mapaB.get(c.chave);
        return d && valorComparavel(c) !== valorComparavel(d);
      }).map(c => ({ rotulo: c.rotulo, a: formatarValor(c), b: formatarValor(mapaB.get(c.chave)) }));
      if (difs.length) res.push({ rotulo: sa.rotulo, campos: difs });
    });
    return res;
  }
  function renderComparacao(res) {
    const box = $('tmVerRes'); if (!box) return;
    if (!res.length) {
      box.innerHTML = '<p class="tm-ok">As versões são iguais nos campos do tema. A comparação ignora o conteúdo binário das imagens.</p>';
      return;
    }
    let total = 0; res.forEach(s => { total += s.campos.length; });
    box.innerHTML = '<p class="tm-resumo"><strong>' + total + '</strong> campo(s) alterado(s) em <strong>' + res.length + '</strong> seção(ões).</p>' +
      res.map(s => '<h4>' + esc(s.rotulo) + '</h4><table class="tm-diff"><thead><tr><th>Campo</th><th>Versão A (antes)</th><th>Versão B (depois)</th></tr></thead><tbody>' +
        s.campos.map(c => '<tr><td>' + esc(c.rotulo) + '</td><td>' + c.a + '</td><td>' + c.b + '</td></tr>').join('') + '</tbody></table>').join('');
  }

  function diffLinhas(a, b) {
    const A = String(a).split('\n'), B = String(b).split('\n');
    if (A.length > 2000 || B.length > 2000) return A.map(x => ['-', x]).concat(B.map(x => ['+', x]));
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
    const out = []; let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && A[i] === B[j]) { out.push(['=', A[i]]); i++; j++; }
      else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { out.push(['+', B[j]]); j++; }
      else { out.push(['-', A[i]]); i++; }
    }
    return out;
  }

  async function compararSelecionadas() {
    const temaId = $('tmVerTema') ? $('tmVerTema').value : '';
    if (!temaId) throw new Error('Escolha um tema personalizado.');
    const A = await dadosDaVersao($('tmVerA').value, temaId);
    const B = await dadosDaVersao($('tmVerB').value, temaId);
    if (!A || !B) throw new Error('Uma das versões não existe mais. Atualize a lista.');
    const res = compararSecoes(A.dados, B.dados);
    renderComparacao(res);
    const ja = $('tmJsonA'), jb = $('tmJsonB');
    if (ja) ja.value = JSON.stringify(A.dados, null, 2);
    if (jb) jb.value = JSON.stringify(B.dados, null, 2);
    msgVersoes(res.length ? 'Comparação concluída.' : 'As versões são iguais nos campos do tema.', res.length ? '' : 'ok');
    return res;
  }

  async function marcarVersaoSelecionada() {
    const temaId = $('tmVerTema') ? $('tmVerTema').value : '';
    try {
      if (!temaId) throw new Error('Escolha um tema personalizado.');
      const raw = await dbGet('temas', temaId);
      if (!raw) throw new Error('Salve o tema antes de marcar uma versão.');
      const sugerido = 'Versão de ' + formatarData(agora());
      const nome = window.Dialogo
        ? await Dialogo.texto({ titulo: 'Salvar versão marcada', descricao: 'A versão marcada não é apagada automaticamente; use um nome que ajude a reconhecer o momento.', rotulo: 'Salvar versão', campo: 'Nome da versão', valor: sugerido })
        : prompt('Nome da versão marcada:', sugerido);
      if (nome == null) return;
      const v = await salvarVersaoMarcada(temaId, String(nome).trim() || sugerido);
      await preencherVersoesDoTema(temaId);
      const a = $('tmVerA'), b = $('tmVerB');
      if (v && v.id != null) { if (b) b.value = String(v.id); if (a) a.value = 'atual'; }
      await compararSelecionadas();
      msgVersoes('Versão marcada salva: ' + v.rotulo + '.', 'ok');
      logApp('Versão marcada do tema salva.', 'ok');
    } catch (e) { msgVersoes('Não foi possível salvar a versão: ' + ((e && e.message) || e), 'erro'); }
  }

  async function restaurarA() {
    try {
      const temaId = $('tmVerTema').value;
      const A = await dadosDaVersao($('tmVerA').value, temaId);
      if (!A || A.atual) throw new Error('Escolha uma versão guardada em A (não “Atual”).');
      const ok = await confirmar({
        titulo: 'Carregar esta versão no editor?',
        descricao: 'A versão de ' + formatarData(A.data) + ' (' + A.rotulo + ') será carregada no editor. O tema atual só muda quando você clicar em Salvar tema.',
        rotulo: 'Carregar no editor'
      });
      if (!ok) return;
      const map = await imagensDoTema(temaId);
      const r = resolverImagens(A.dados, map);
      const ex = extrairImagens(r.tema, '__rascunho__');
      ex.imagens.forEach((rec, id) => map.set(id, rec));
      await abrirEditorCom(ex.tema, temaId, false, map);
      if (janela) janela.ativar('editor', true);
      edMsg('Versão A carregada. Revise e clique em Salvar tema para confirmar.' + (r.faltando.length ? ' A imagem de ' + r.faltando.join(', ') + ' não está mais guardada.' : ''), r.faltando.length ? '' : 'ok');
      logApp('Versão do tema carregada no editor.', 'ok');
    } catch (e) { msgVersoes('Não foi possível carregar a versão: ' + ((e && e.message) || e), 'erro'); }
  }

  async function baixarVersaoB() {
    try {
      const temaId = $('tmVerTema').value;
      const B = await dadosDaVersao($('tmVerB').value, temaId);
      if (!B) throw new Error('Escolha uma versão em B.');
      const map = await imagensDoTema(temaId);
      const r = resolverImagens(B.dados, map);
      baixarJSON(r.tema);
      msgVersoes('JSON da versão B baixado.' + (r.faltando.length ? ' A imagem de ' + r.faltando.join(', ') + ' não está mais guardada.' : ''), r.faltando.length ? '' : 'ok');
    } catch (e) { msgVersoes('Não foi possível baixar a versão: ' + ((e && e.message) || e), 'erro'); }
  }

  async function excluirA() {
    try {
      const temaId = $('tmVerTema').value, valor = $('tmVerA').value;
      if (valor === 'atual' || !valor) throw new Error('Escolha uma versão guardada em A para excluir.');
      const v = await dbGet('temas_versoes', Number(valor));
      if (!v) throw new Error('Esta versão não existe mais.');
      const ok = await confirmar({
        titulo: 'Excluir esta versão?',
        descricao: formatarData(v.data) + ' · ' + (v.rotulo || 'Versão') + (v.marco ? ' (marcada)' : '') + '. Esta ação não pode ser desfeita.',
        rotulo: 'Excluir versão', perigo: true
      });
      if (!ok) return;
      await dbDel('temas_versoes', v.id);
      await preencherVersoesDoTema(temaId);
      msgVersoes('Versão excluída do histórico.', 'ok');
      logApp('Versão do tema excluída.', 'ok');
    } catch (e) { msgVersoes('Não foi possível excluir a versão: ' + ((e && e.message) || e), 'erro'); }
  }

  function compararJson() {
    try {
      const a = $('tmJsonA') ? $('tmJsonA').value.trim() : '';
      const b = $('tmJsonB') ? $('tmJsonB').value.trim() : '';
      const box = $('tmVerJsonRes');
      if (!a || !b) throw new Error('Preencha os dois JSONs.');
      let A, B;
      try { A = JSON.parse(a); } catch (e) { throw new Error('JSON A inválido: ' + e.message); }
      try { B = JSON.parse(b); } catch (e) { throw new Error('JSON B inválido: ' + e.message); }
      const linhas = diffLinhas(JSON.stringify(A, null, 2), JSON.stringify(B, null, 2));
      const iguais = linhas.every(l => l[0] === '=');
      const vis = linhas.slice(0, 500);
      if (box) box.innerHTML = '<p class="tm-resumo">' + (iguais ? 'Os dois JSONs são iguais.' : 'Diferenças no JSON (modo avançado).') +
        (linhas.length > 500 ? ' Mostrando as primeiras 500 linhas de ' + linhas.length + '.' : '') + '</p>' +
        '<pre class="tm-json-diff">' + vis.map(l => '<span class="' + (l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : '') + '">' + esc(l[0] + ' ' + l[1]) + '</span>').join('\n') + '</pre>';
      msgVersoes(iguais ? 'JSONs iguais.' : 'Comparação avançada concluída.', iguais ? 'ok' : '');
    } catch (e) { msgVersoes('Não foi possível comparar os JSONs: ' + ((e && e.message) || e), 'erro'); }
  }

  async function preencherJsonSelecionadas() {
    try {
      const temaId = $('tmVerTema').value;
      const A = await dadosDaVersao($('tmVerA').value, temaId);
      const B = await dadosDaVersao($('tmVerB').value, temaId);
      if (!A || !B) throw new Error('Escolha duas versões válidas.');
      if ($('tmJsonA')) $('tmJsonA').value = JSON.stringify(A.dados, null, 2);
      if ($('tmJsonB')) $('tmJsonB').value = JSON.stringify(B.dados, null, 2);
      msgVersoes('JSONs de A e B preenchidos.', 'ok');
    } catch (e) { msgVersoes('Não foi possível preencher os JSONs: ' + ((e && e.message) || e), 'erro'); }
  }

  async function preencherVersoesDoTema(temaId) {
    if (!janela || !$('tmVerA')) return;
    const selA = $('tmVerA'), selB = $('tmVerB'), info = $('tmVerInfo'), res = $('tmVerRes');
    if (res) res.innerHTML = '';
    msgVersoes('');
    if (!temaId) {
      selA.innerHTML = ''; selB.innerHTML = '';
      if (info) info.textContent = 'Nenhum tema personalizado para comparar.';
      return;
    }
    const raw = await dbGet('temas', temaId);
    const avulso = temaAvulso && temaAvulso.id === temaId;
    if (!raw && !avulso) {
      selA.innerHTML = ''; selB.innerHTML = '';
      if (info) info.textContent = 'O tema não está mais neste navegador.';
      return;
    }
    const versoes = await versoesDoTema(temaId);
    const opAtual = '<option value="atual">Atual (' + (avulso && !raw ? 'recebido por link' : 'conteúdo salvo') + ')</option>';
    const opts = versoes.map(v => '<option value="' + esc(String(v.id)) + '">' + esc(rotuloVersao(v)) + '</option>').join('');
    selA.innerHTML = opAtual + opts; selB.innerHTML = opAtual + opts;
    if (versoes.length >= 2) { selA.value = String(versoes[1].id); selB.value = String(versoes[0].id); }
    else if (versoes.length === 1) { selA.value = 'atual'; selB.value = String(versoes[0].id); }
    else { selA.value = 'atual'; selB.value = 'atual'; }
    if (info) info.textContent = versoes.length
      ? versoes.length + ' versão(ões) guardada(s) · limite de ' + limiteVersoes() + ' automáticas · as marcadas são preservadas.'
      : 'Nenhuma versão guardada ainda. Salve o tema para começar o histórico.';
    const marcar = $('tmVerMarcar'); if (marcar) marcar.disabled = !raw;
    const rodape = $('tmMarcarRodape'); if (rodape) rodape.disabled = !raw;
  }

  async function preencherVersoes() {
    if (!janela || !$('tmVerTema')) return;
    try {
      const customs = await temasPersonalizados();
      const sel = $('tmVerTema');
      const antes = sel.value;
      let html = '';
      if (temaAvulso && !customs.some(t => t.id === temaAvulso.id)) html += '<option value="' + esc(temaAvulso.id) + '">' + esc(temaAvulso.nome) + ' (do link)</option>';
      customs.forEach(t => { html += '<option value="' + esc(t.id) + '">' + esc(t.nome) + '</option>'; });
      if (!html) {
        sel.innerHTML = '<option value="">Nenhum tema personalizado</option>';
        sel.disabled = true;
        await preencherVersoesDoTema('');
        return;
      }
      sel.disabled = false;
      sel.innerHTML = html;
      const atual = $('tema') && String($('tema').value).startsWith('custom:') ? extrairId($('tema').value) : '';
      const alvo = [...sel.options].some(o => o.value === antes) ? antes
        : ([...sel.options].some(o => o.value === atual) ? atual : sel.options[0].value);
      sel.value = alvo;
      await preencherVersoesDoTema(alvo);
    } catch (e) { msgVersoes('Não foi possível carregar as versões: ' + ((e && e.message) || e), 'erro'); }
  }

  function montarVersoes() {
    const p = janela.pane('versoes');
    p.innerHTML = '<div class="tm-versoes">' +
      '<p class="tm-intro">Compare duas versões guardadas do mesmo tema. A comparação mostra só os campos alterados, seção por seção. Use o modo avançado para comparar o JSON completo.</p>' +
      '<div class="tm-grade">' +
      '<div class="tm-campo"><label for="tmVerTema">Tema</label><select id="tmVerTema"></select></div>' +
      '<div class="tm-campo"><label for="tmVerA">Versão A (antes)</label><select id="tmVerA"></select></div>' +
      '<div class="tm-campo"><label for="tmVerB">Versão B (depois)</label><select id="tmVerB"></select></div>' +
      '</div>' +
      '<div class="tm-acoes"><button type="button" class="go mini" id="tmVerComparar">Comparar</button>' +
      '<button type="button" class="sec mini" id="tmVerTrocar">Trocar A e B</button>' +
      '<button type="button" class="sec mini" id="tmVerMarcar">Salvar versão marcada</button>' +
      '<button type="button" class="sec mini" id="tmVerRestaurar">Restaurar A no editor</button>' +
      '<button type="button" class="sec mini" id="tmVerBaixar">Baixar B (JSON)</button>' +
      '<button type="button" class="dan mini" id="tmVerExcluir">Excluir A</button></div>' +
      '<p class="tm-msg" id="tmVerMsg" role="status" aria-live="polite"></p>' +
      '<p class="tm-nota" id="tmVerInfo"></p>' +
      '<div id="tmVerRes"></div>' +
      '<details class="tm-detalhe tm-json" id="tmVerAvancado"><summary>JSON avançado</summary>' +
      '<p class="tm-nota">Para quem quer comparar o arquivo completo. As imagens aparecem como referências <code>img:…</code>; o conteúdo binário não é comparado.</p>' +
      '<div class="tm-grade"><div class="tm-campo"><label for="tmJsonA">JSON A</label><textarea id="tmJsonA" spellcheck="false" aria-label="JSON da versão A"></textarea></div>' +
      '<div class="tm-campo"><label for="tmJsonB">JSON B</label><textarea id="tmJsonB" spellcheck="false" aria-label="JSON da versão B"></textarea></div></div>' +
      '<div class="tm-acoes"><button type="button" class="sec mini" id="tmVerPreencher">Preencher com A e B</button>' +
      '<button type="button" class="go mini" id="tmVerJson">Comparar JSON</button></div>' +
      '<div id="tmVerJsonRes"></div></details></div>';
    $('tmVerTema').addEventListener('change', () => {
      preencherVersoesDoTema($('tmVerTema').value).catch(e => msgVersoes('Não foi possível carregar as versões: ' + ((e && e.message) || e), 'erro'));
    });
    $('tmVerComparar').onclick = () => compararSelecionadas().catch(e => msgVersoes('Não foi possível comparar: ' + ((e && e.message) || e), 'erro'));
    $('tmVerTrocar').onclick = () => {
      const a = $('tmVerA'), b = $('tmVerB'), x = a.value; a.value = b.value; b.value = x;
      compararSelecionadas().catch(e => msgVersoes('Não foi possível comparar: ' + ((e && e.message) || e), 'erro'));
    };
    $('tmVerMarcar').onclick = () => marcarVersaoSelecionada();
    $('tmVerRestaurar').onclick = () => restaurarA();
    $('tmVerBaixar').onclick = () => baixarVersaoB();
    $('tmVerExcluir').onclick = () => excluirA();
    $('tmVerPreencher').onclick = () => preencherJsonSelecionadas();
    $('tmVerJson').onclick = () => compararJson();
  }

  /* ---------------------------- Importar ---------------------------- */
  function lerArquivo(file) {
    return new Promise((ok, err) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result || ''));
      r.onerror = () => err(new Error('Falha ao ler o arquivo.'));
      r.readAsText(file);
    });
  }

  async function importarTexto(txt, opcoes) {
    opcoes = opcoes || {};
    let dados;
    if (txt && typeof txt === 'object') dados = txt;
    else {
      const s = String(txt == null ? '' : txt).trim();
      if (!s) throw new Error('Cole o JSON ou o YAML do tema, ou o link com #tema=...');
      const m = s.match(/#tema=([A-Za-z0-9_-]+)/);
      if (m) dados = JSON.parse(await descompactar(m[1]));
      else if (/^[zj][A-Za-z0-9_-]{20,}$/.test(s)) dados = JSON.parse(await descompactar(s));
      else if (/^https?:\/\//i.test(s)) throw new Error('O link não tem um tema no formato #tema=...');
      else {
        try { dados = JSON.parse(s); }
        catch (e) {
          try { dados = _yamlParse(s); } catch (e2) {
            throw new Error('O texto não é um JSON ou YAML de tema válido nem um link com #tema=...');
          }
        }
      }
    }
    if (dados && dados.tema_dados && typeof dados.tema_dados === 'object') dados = dados.tema_dados;
    else if (dados && dados.tema && typeof dados.tema === 'object' && !dados.paleta) dados = dados.tema;
    if (!dados || typeof dados !== 'object' || Array.isArray(dados) || (!dados.paleta && !dados.telas)) {
      throw new Error('O JSON não parece um tema do Conteudista (faltam as cores e as telas).');
    }
    const T = normalizar(dados);
    T.nome = texto(T.nome, 'Tema importado', 80);
    const existente = T.id ? await dbGet('temas', T.id) : null;
    const substituir = !!existente && opcoes.conflito === 'substituir';
    let idFinal = '';
    if (substituir) idFinal = T.id;
    else if (existente || (catalogo && catalogo.temas && catalogo.temas[T.id]) || !T.id) idFinal = idNovo(T.nome);
    else idFinal = T.id;
    const ex = extrairImagens(T, opcoes.salvar ? idFinal : '__rascunho__');
    const tema = ex.tema;
    if (opcoes.salvar) {
      if (substituir) {
        const ok = await confirmar({
          titulo: 'Substituir o tema existente?',
          descricao: 'Já existe um tema chamado “' + (existente.nome || T.nome) + '”. A versão atual será guardada no histórico e substituída pelo conteúdo importado.',
          rotulo: 'Substituir tema', perigo: true
        });
        if (!ok) return { cancelado: true };
        try { await registrarVersao(T.id, normalizar(existente), 'Antes de importar', false); } catch (e) { /* */ }
      }
      const salvo = await salvar(tema, { imagens: ex.imagens, idForcado: idFinal, versao: true, rotulo: 'Importado', variantes: true });
      const alvo = await atualizarSeletor('custom:' + salvo.id);
      try { localStorage.setItem('conteudista.tema', alvo); } catch (e) { /* */ }
      if (typeof aplicarTemaNoMarkdown === 'function') aplicarTemaNoMarkdown(alvo);
      await listarTemas(); await preencherVersoes();
      logApp('Tema “' + salvo.nome + '” importado' + (substituir ? ' e substituiu o anterior.' : '.'), 'ok');
      return { tema: salvo, substituir, id: salvo.id };
    }
    await abrirEditorCom(tema, substituir ? idFinal : '', !substituir, ex.imagens);
    if (janela) janela.ativar('editor', true);
    edMsg('Tema importado. Revise as cores, as telas e as imagens e clique em Salvar tema.', 'ok');
    return { tema, substituir };
  }

  async function importarDoCampo(salvar) {
    try {
      msgImportar('Importando…');
      const r = await importarTexto($('tmImpTexto').value, { salvar: salvar, conflito: $('tmImpConflito').value });
      if (r && r.cancelado) { msgImportar('Importação cancelada.', ''); return; }
      if (salvar) {
        msgImportar('Tema “' + r.tema.nome + '” importado e salvo.', 'ok');
        if ($('tmImpTexto')) $('tmImpTexto').value = '';
      } else {
        msgImportar('Tema importado no editor. Revise e salve.', 'ok');
        if (janela) janela.ativar('editor', true);
      }
    } catch (e) { msgImportar('Não foi possível importar: ' + ((e && e.message) || e), 'erro'); }
  }

  function montarImportar() {
    const p = janela.pane('importar');
    p.innerHTML = '<div class="tm-cab"><div><p class="tm-intro">Importe um tema exportado por outra pessoa ou um link com <code>#tema=…</code>. O tema entra como um novo recurso deste navegador; você revisa antes de salvar.</p>' +
      '<p class="tm-nota">Se já existir um tema com o mesmo identificador, o padrão é duplicar. Substituir exige confirmação e guarda a versão anterior no histórico.</p></div></div>' +
      '<div class="tm-sec tm-imp">' +
      '<label class="tm-rotulo" for="tmImpTexto">JSON ou YAML do tema, ou link com #tema=...</label>' +
      '<textarea id="tmImpTexto" spellcheck="false" placeholder="Cole aqui o JSON ou o YAML do tema, ou o link completo com #tema=..."></textarea>' +
      '<div class="tm-grade"><div class="tm-campo"><label for="tmImpConflito">Se o tema já existir</label><select id="tmImpConflito">' +
      '<option value="duplicar">Duplicar com um novo identificador (padrão)</option><option value="substituir">Substituir o tema existente</option></select></div></div>' +
      '<div class="tm-acoes"><button type="button" class="sec mini" id="tmImpArquivo">Escolher arquivo JSON ou YAML</button>' +
      '<button type="button" class="go mini" id="tmImpRevisar">Revisar no editor</button>' +
      '<button type="button" class="sec mini" id="tmImpSalvar">Salvar direto</button>' +
      '<input type="file" id="tmImpFile" accept=".json,.yaml,.yml,application/json,text/yaml" hidden></div>' +
      '<p class="tm-msg" id="tmImpMsg" role="status" aria-live="polite"></p></div>' +
      '<details class="tm-detalhe"><summary>O que é importado</summary><p class="tm-nota">Cores, fontes, telas, imagens de fundo, Mermaid, posições e variantes do tema. DOCX e EPUB continuam com a leitura acessível; o PPTX recebe o subconjunto compatível. Imagens PNG, JPEG ou WebP são guardadas no banco do navegador e o JSON e o YAML exportados levam uma cópia delas em base64.</p></details>';
    $('tmImpArquivo').onclick = () => { const f = $('tmImpFile'); if (f) f.click(); };
    $('tmImpFile').onchange = async e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const txt = await lerArquivo(file);
        if ($('tmImpTexto')) $('tmImpTexto').value = txt;
        msgImportar('Arquivo “' + file.name + '” carregado. Revise o conteúdo e escolha a ação.', 'ok');
        if ($('tmImpTexto')) $('tmImpTexto').focus();
      } catch (err) { msgImportar('Não foi possível ler o arquivo: ' + ((err && err.message) || err), 'erro'); }
    };
    $('tmImpRevisar').onclick = () => importarDoCampo(false);
    $('tmImpSalvar').onclick = () => importarDoCampo(true);
  }

  /* ---------------------------- Iniciar e API ---------------------------- */
  let iniciado = false;
  async function iniciar() {
    if (iniciado) return;
    iniciado = true;
    try {
      await carregarCatalogo();
      const btn = $('btnTemas');
      if (btn) btn.addEventListener('click', () => {
        abrir('meus').catch(e => logApp('Não foi possível abrir os temas: ' + ((e && e.message) || e), 'err'));
      });
      if (window.__temaPendente) {
        const p = window.__temaPendente;
        window.__temaPendente = null;
        await aplicarSnapshot(p);
      }
      const doHash = await temaDoHash();
      if (doHash) {
        await aplicarSnapshot({ tema_dados: doHash });
        logApp('Tema recebido pelo link aplicado. Use Temas… para guardar nos meus temas.', 'ok');
      } else {
        const sel = $('tema');
        let valor = sel ? sel.value : '';
        // O index.html grava o tema salvo antes de este módulo montar as opções; nesse momento
        // um tema personalizado ainda não existe no <select> e o valor fica vazio. Recupera a escolha.
        if (!valor) { try { valor = localStorage.getItem('conteudista.tema') || ''; } catch (e) { valor = ''; } }
        const alvo = await atualizarSeletor(valor);
        if (sel && alvo && alvo !== valor) { try { localStorage.setItem('conteudista.tema', alvo); } catch (e) { /* */ } }
        if (alvo && String(alvo).startsWith('custom:')) await aoSelecionar(alvo);
      }
      addEventListener('hashchange', async () => {
        const t = await temaDoHash();
        if (!t) return;
        await aplicarSnapshot({ tema_dados: t });
        logApp('Tema do link aplicado ao seletor.', 'ok');
      });
    } catch (e) {
      logApp('Temas personalizados: ' + ((e && e.message) || e), 'err');
    }
  }

  window.Temas = {
    abrir, iniciar, atualizarSeletor, aoSelecionar,
    carregar: temaDe, tema: temaDe,
    salvar, remover: removerTema, removerTema,
    importarTexto, garantirContraste, snapshotPacote, jsonParaGeracao, dadosAtuais,
    aplicarSnapshot, chaveMarkdown, link: linkDoTema, linkDoTema,
    normalizar, corrigir: corrigirContraste, variante, contraste, falhas: falhasContraste,
    catalogo: carregarCatalogo, listar: temasPersonalizados, doHash: temaDoHash,
    _db: { all: dbAll, get: dbGet, put: dbPut, del: dbDel, clear: dbClear }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { iniciar(); }, { once: true });
  else iniciar();
})();