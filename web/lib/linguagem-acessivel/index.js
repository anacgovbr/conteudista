/* =====================================================================================
   Linguagem Acessível — confere acessibilidade e linguagem simples em textos Markdown.
   API pública (o resto é interno e pode mudar):
     analisar(texto, opcoes)          -> { versao, tipo, resumo, diagnosticos }
     aplicar(texto, correcaoOuEdicoes) -> texto corrigido
     aplicarSeguras(texto, opcoes)    -> { texto, aplicadas }   (só correções que não mudam o sentido)
     criarSessao(opcoes)              -> { analisar(texto) }   (reanalisa só os blocos que mudaram)
     regras(), selecionar(lista), agrupar(resultado), VERSAO
     montarPedido(tipo, dados), lerRespostaDescricao(texto), lerRespostaSimplificar(texto)
   Sem dependências. Funciona no navegador (módulo), em Web Worker e no Node 18+.
   ===================================================================================== */
import { analisarEstrutura, detectarTipo } from './nucleo/analisador.js';
import { REGRAS, AREAS, GRUPOS } from './regras/index.js';
import MSG from './mensagens/pt-BR.js';
import PADRAO from './config/padrao.js';
import SIGLAS from './dados/siglas.js';
import { lerMarcadores } from './nucleo/marcadores.js';

export const VERSAO = '0.5.0';
export { detectarTipo };
export { dividirFrases, contarPalavras } from './nucleo/frases.js';
export { montarPedido, lerRespostaDescricao, lerRespostaSimplificar, PEDIDOS, VERSAO_PEDIDOS } from './pedidos.js';
export { AVISO_RELATORIO, criarRelatorio, relatorioHtml, relatorioMarkdown } from './relatorio.js';
export { lerMarcadores };

const POR_ID = new Map(REGRAS.map(r => [r.id, r]));
const POR_COD = new Map(REGRAS.map(r => [r.codigo, r]));
const GRUPO_POR_ID = new Map(Object.entries(GRUPOS).map(([l, g]) => [g.id, l]));

/** Metadados das regras (sem a função). */
export function regras() {
  return REGRAS.map(r => ({ id: r.id, codigo: r.codigo, area: r.area, grupo: r.grupo, nivel: r.nivel, titulo: MSG.regras[r.id].titulo,
    mensagem: MSG.regras[r.id].mensagem, porque: MSG.regras[r.id].porque, referencia: r.referencia, exemplos: r.exemplos,
    tipos: r.tipos || ['apostila', 'apresentacao'] }));
}
/** Textos para quem escreve (níveis, grupos, áreas). */
export const textos = () => ({ niveis: MSG.niveis, grupos: MSG.grupos, areas: MSG.areas });

/** Converte uma lista de seleção em ids de regra. Aceita: área (a, l, acessibilidade, linguagem), grupo (i, e, k, f, s, n
    ou o nome), código (i1) ou nome da regra (imagem-sem-descricao). Vazio = todas. Desconhecido: erro com a lista válida. */
export function selecionar(lista) {
  const itens = (Array.isArray(lista) ? lista : String(lista || '').split(',')).map(s => String(s).trim().toLowerCase()).filter(Boolean);
  if (!itens.length) return REGRAS.map(r => r.id);
  const ids = new Set();
  for (const x of itens) {
    const area = AREAS[x] || (Object.values(AREAS).includes(x) ? x : null);
    const grupo = GRUPOS[x] ? GRUPOS[x].id : (GRUPO_POR_ID.has(x) ? x : null);
    const r = POR_COD.get(x) || POR_ID.get(x);
    if (area) REGRAS.filter(q => q.area === area).forEach(q => ids.add(q.id));
    else if (grupo) REGRAS.filter(q => q.grupo === grupo).forEach(q => ids.add(q.id));
    else if (r) ids.add(r.id);
    else {
      const e = new Error('Seleção desconhecida: "' + x + '". Use uma área (a, l), um grupo (' + Object.keys(GRUPOS).join(', ') + '), um código (' + REGRAS.map(q => q.codigo).join(', ') + ') ou o nome da regra.');
      e.codigo = 'selecao-desconhecida'; throw e;
    }
  }
  return REGRAS.filter(r => ids.has(r.id)).map(r => r.id);   // ordem estável
}

const preencher = (t, d) => String(t).replace(/\{(\w+)\}/g, (m, k) => (d && d[k] !== undefined ? d[k] : m));

function montarConfig(o) {
  const c = Object.assign({}, PADRAO, o && o.config);
  c.regras = Object.assign({}, PADRAO.regras, o && o.config && o.config.regras);
  Object.entries(c.regras).forEach(([chave, valor]) => {
    const regra = POR_COD.get(chave);
    if (!regra) return;
    c.regras[regra.id] = valor === 'desligado' ? false : valor;
    if (chave !== regra.id) delete c.regras[chave];
  });
  ['limiteFraseLonga', 'limiteFraseNarracao', 'limiteParagrafo'].forEach(k => {
    const v = Number(c[k]); if (!Number.isInteger(v) || v < 3 || v > 1000) { const e = new Error(k + ' inválido: ' + c[k]); e.codigo = 'config-invalida'; throw e; }
  });
  return c;
}
function criarSiglas(cfg, texto) {
  const conteudo = {};
  lerMarcadores(texto).filter(m => m.tipo === 'siglas').forEach(m => Object.assign(conteudo, m.siglas));
  const glo = Object.assign({}, SIGLAS.glossario, cfg.siglas || {}, conteudo);
  const con = new Set([...SIGLAS.conhecidas, ...(cfg.siglasConhecidas || [])].map(s => String(s).toUpperCase()));
  return { nome: s => glo[s] || null, conhecida: s => !glo[s] && con.has(String(s).toUpperCase()) };
}
function regrasAtivas(o, cfg) {
  const sel = new Set(selecionar(o && o.regras));
  return REGRAS.filter(r => sel.has(r.id) && cfg.regras[r.id] !== false);
}
function nivelDe(r, cfg, d) {
  const n = cfg.regras[r.id];
  if (n === 'sugestao') return 'sugestao';
  if (n === 'corrigir' && r.nivel === 'corrigir') return 'corrigir';
  return d.nivel || r.nivel;
}
const ignorada = (r, lista) => lista && (lista.includes(r.id) || lista.includes(r.codigo) || lista.includes('tudo'));

/* Executa as regras de um bloco e devolve diagnósticos com posições relativas ao bloco (para o cache). */
function rodarBloco(regs, bloco, doc, cfg, siglas) {
  const out = [];
  for (const r of regs) {
    if (bloco.tipo !== 'paragrafo' && bloco.tipo !== 'titulo') continue;
    if (ignorada(r, bloco.ignorar)) continue;
    r.verificar({ bloco, tipo: doc.tipo, texto: doc.texto, config: cfg, siglas, decorativa: abs => doc.decorativas.has(abs),
      relatar: (inicio, fim, x) => out.push(Object.assign({ regra: r, inicio, fim }, x)) });
  }
  return out;
}

/* Monta o diagnóstico público. "rel" = deslocamento a somar (bloco.inicio) quando as posições são relativas. */
function publicar(d, rel, doc, cfg) {
  const r = d.regra, M = MSG.regras[r.id], nivel = nivelDe(r, cfg, d);
  const a = doc.local(d.inicio + rel), b = doc.local(d.fim + rel);
  const o = {
    regra: r.id, codigo: r.codigo, area: r.area, grupo: r.grupo, nivel,
    inicio: d.inicio + rel, fim: d.fim + rel, linha: a.linha, coluna: a.coluna, linhaFim: b.linha, colunaFim: b.coluna,
    mensagem: preencher(d.variante && M.variantes && M.variantes[d.variante] ? M.variantes[d.variante] : M.mensagem, d.dados),
    trecho: doc.texto.slice(d.inicio + rel, Math.min(d.fim + rel, d.inicio + rel + 120)),
    referencia: r.referencia,
    correcoes: (d.correcoes || []).map(c => {
      const x = { id: c.id, rotulo: (M.correcoes && M.correcoes[c.id]) || c.id, segura: !!c.segura };
      if (c.edicoes) x.edicoes = c.edicoes.map(e => ({ inicio: e.inicio + rel, fim: e.fim + rel, texto: e.texto }));
      if (c.acao) x.acao = c.acao;
      if (c.alvo) x.alvo = { inicio: c.alvo.inicio + rel, fim: c.alvo.fim + rel };
      return x;
    }),
  };
  if (d.variante) o.variante = d.variante;
  if (doc.tipo === 'apresentacao') { const s = doc.slides.findIndex(x => o.inicio >= x.inicio && o.inicio <= x.fim); if (s >= 0) o.slide = s + 1; }
  if (o.trecho.length < d.fim - d.inicio) o.trecho += '…';
  return o;
}

function executar(texto, opcoes, cache) {
  const cfg = montarConfig(opcoes), regs = regrasAtivas(opcoes, cfg), siglas = criarSiglas(cfg, texto);
  const doc = analisarEstrutura(texto, (opcoes && opcoes.tipo) || 'auto');
  const valeTipo = r => !r.tipos || r.tipos.includes(doc.tipo);
  const ignDoc = [...doc.ignorarDoc];
  const blocoRegs = regs.filter(r => r.escopo === 'bloco' && valeTipo(r) && !ignorada(r, ignDoc));
  const docRegs = regs.filter(r => r.escopo === 'documento' && valeTipo(r) && !ignorada(r, ignDoc));
  const chaveRegras = blocoRegs.map(r => r.id).join(',') + '|' + JSON.stringify(cfg) + '|' + doc.tipo;
  const novoCache = new Map(), lista = [];
  let reaproveitados = 0;
  for (const b of doc.blocos) {
    if (b.tipo !== 'paragrafo' && b.tipo !== 'titulo') continue;
    const dec = []; for (const x of doc.decorativas) if (x >= b.inicio && x < b.fim) dec.push(x - b.inicio);
    // fora das faixas mascaradas, a máscara é igual ao texto: ela basta como chave do bloco
    const chave = chaveRegras + '\u0001' + (b.ignorar || []).join(',') + '\u0001' + dec.join(',') + '\u0001' + b.tipo + '\u0001' + (b.sub || '') + '\u0001' + b.mascara;
    let ds = cache && cache.get(chave);
    if (ds) reaproveitados++; else ds = rodarBloco(blocoRegs, b, doc, cfg, siglas);
    novoCache.set(chave, ds);
    ds.forEach(d => lista.push([d, b.inicio]));
  }
  for (const r of docRegs) {
    r.verificar({ doc, tipo: doc.tipo, texto: doc.texto, config: cfg, siglas, relatar: (inicio, fim, x) => {
      const bl = doc.blocos.find(b => inicio >= b.inicio && inicio <= b.fim && b.tipo !== 'comentario');
      if (bl && ignorada(r, bl.ignorar)) return;
      lista.push([Object.assign({ regra: r, inicio, fim }, x), 0]);
    } });
  }
  let ds = lista.map(([d, rel]) => publicar(d, rel, doc, cfg));
  if (cfg.sugestoes === false) ds = ds.filter(d => d.nivel !== 'sugestao');
  if (opcoes && opcoes.nivel) {
    const n = String(opcoes.nivel).toLowerCase(), alvo = n === 'c' ? 'corrigir' : n === 's' ? 'sugestao' : n;
    if (alvo !== 'corrigir' && alvo !== 'sugestao') { const e = new Error('Nível desconhecido: "' + opcoes.nivel + '". Use c (corrigir) ou s (sugestão).'); e.codigo = 'nivel-desconhecido'; throw e; }
    ds = ds.filter(d => d.nivel === alvo);
  }
  ds.sort((x, y) => x.inicio - y.inicio || x.fim - y.fim || x.codigo.localeCompare(y.codigo));
  const resumo = { corrigir: ds.filter(d => d.nivel === 'corrigir').length, sugestoes: ds.filter(d => d.nivel === 'sugestao').length, total: ds.length };
  return { resultado: { versao: VERSAO, tipo: doc.tipo, resumo, diagnosticos: ds }, cache: novoCache, reaproveitados };
}

/** Analisa um texto Markdown. opcoes: { tipo: 'auto'|'apostila'|'apresentacao', regras: [...], nivel: 'corrigir'|'sugestao'|'c'|'s', config: {...} } */
export function analisar(texto, opcoes) { return executar(texto, opcoes, null).resultado; }

/** Sessão com cache: em edições seguidas, as regras de bloco só rodam nos blocos alterados. */
export function criarSessao(opcoes) {
  let cache = new Map(), ultimo = null;
  return {
    analisar(texto, extra) {
      const r = executar(texto, Object.assign({}, opcoes, extra), cache);
      cache = r.cache; ultimo = { blocos: r.cache.size, reaproveitados: r.reaproveitados };
      return r.resultado;
    },
    estatistica: () => ultimo,
    limpar() { cache = new Map(); },
  };
}

/** Aplica uma correção ({edicoes}) ou uma lista de edições [{inicio, fim, texto}]. As edições não podem se sobrepor. */
export function aplicar(texto, alvo) {
  texto = String(texto);
  const eds = Array.isArray(alvo) ? alvo : (alvo && alvo.edicoes) || null;
  if (!eds) { const e = new Error('Esta correção precisa de uma pessoa (' + ((alvo && alvo.acao) || 'sem edições') + ').'); e.codigo = 'correcao-manual'; throw e; }
  const ord = eds.map(e => ({ inicio: e.inicio | 0, fim: e.fim | 0, texto: String(e.texto) })).sort((a, b) => b.inicio - a.inicio || b.fim - a.fim);
  let limite = Infinity;
  for (const e of ord) {
    if (e.inicio < 0 || e.fim < e.inicio || e.fim > texto.length) { const x = new Error('Edição fora do texto: ' + e.inicio + '–' + e.fim); x.codigo = 'edicao-invalida'; throw x; }
    if (e.fim > limite) { const x = new Error('Edições sobrepostas.'); x.codigo = 'edicao-sobreposta'; throw x; }
    limite = e.inicio;
  }
  for (const e of ord) texto = texto.slice(0, e.inicio) + e.texto + texto.slice(e.fim);
  return texto;
}

/** Aplica todas as correções seguras, repetindo até não haver mais (no máximo 10 rodadas). */
export function aplicarSeguras(texto, opcoes) {
  let aplicadas = 0;
  const lista = [];
  for (let rodada = 0; rodada < 10; rodada++) {
    const r = analisar(texto, opcoes), eds = []; let limite = Infinity;
    for (const d of r.diagnosticos.slice().reverse()) {
      const c = d.correcoes.find(x => x.segura && x.edicoes); if (!c) continue;
      const a = Math.min(...c.edicoes.map(e => e.inicio)), b = Math.max(...c.edicoes.map(e => e.fim));
      if (b > limite) continue;                       // sobrepõe outra correção: fica para a próxima rodada
      eds.push(...c.edicoes); limite = a; aplicadas++; lista.push({ codigo: d.codigo, linha: d.linha, correcao: c.rotulo });
    }
    if (!eds.length) break;
    texto = aplicar(texto, eds);
  }
  return { texto, aplicadas, lista };
}

/** Agrupa um resultado por grupo (resposta "completa, agrupada"). */
export function agrupar(resultado) {
  const grupos = {};
  for (const d of resultado.diagnosticos) {
    const g = grupos[d.grupo] || (grupos[d.grupo] = { area: d.area, rotulo: MSG.grupos[d.grupo] || d.grupo, corrigir: 0, sugestoes: 0, itens: [] });
    g[d.nivel === 'corrigir' ? 'corrigir' : 'sugestoes']++; g.itens.push(d);
  }
  return { versao: resultado.versao, tipo: resultado.tipo, resumo: resultado.resumo, grupos };
}
