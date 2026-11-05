/* Formatos de saída do lac (os mesmos da API): texto, json, jsonl, sarif, resumo; e a diferença do ajustar. */
import { agrupar, regras, textos, VERSAO } from '../../web/lib/linguagem-acessivel/index.js';

const T = textos();
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
export const resumoTexto = r => plural(r.corrigir, 'para corrigir', 'para corrigir') + ' · ' + plural(r.sugestoes, 'sugestão', 'sugestões');

/** Texto para pessoas. cor: função (tipo, s) -> s com cor, ou identidade. */
export function texto(itens, cor) {
  const o = [];
  for (const { arquivo, resultado: r } of itens) {
    o.push(cor('arq', arquivo) + (r.tipo === 'apresentacao' ? ' (apresentação)' : ''));
    if (!r.diagnosticos.length) o.push('  ' + cor('ok', 'Nada a corrigir e nenhuma sugestão.'));
    const larg = Math.max(0, ...r.diagnosticos.map(d => (d.linha + ':' + d.coluna).length));
    for (const d of r.diagnosticos) {
      const pos = (d.linha + ':' + d.coluna).padEnd(larg), niv = d.nivel === 'corrigir' ? 'corrigir' : 'sugestão';
      o.push('  ' + pos + '  ' + cor(d.nivel, niv.padEnd(8)) + '  ' + d.codigo.padEnd(3) + ' ' + d.mensagem + (d.slide ? ' (slide ' + d.slide + ')' : ''));
    }
    o.push('  ' + resumoTexto(r.resumo), '');
  }
  if (itens.length > 1) o.push('Total: ' + resumoTexto(soma(itens)));
  return o.join('\n').replace(/\n+$/, '') + '\n';
}
export const soma = itens => itens.reduce((s, x) => ({ corrigir: s.corrigir + x.resultado.resumo.corrigir, sugestoes: s.sugestoes + x.resultado.resumo.sugestoes, total: s.total + x.resultado.resumo.total }), { corrigir: 0, sugestoes: 0, total: 0 });

/** Uma linha por item (pipes). */
export function jsonl(itens) {
  return itens.flatMap(({ arquivo, resultado }) => resultado.diagnosticos.map(d => JSON.stringify(Object.assign({ arquivo }, d)))).join('\n') + (itens.some(x => x.resultado.diagnosticos.length) ? '\n' : '');
}

/** Resposta completa. agrupar: grupo (padrão) | regra | nenhum. Um arquivo: objeto; vários: { versao, resumo, arquivos: [...] }. */
export function json(itens, modo = 'grupo') {
  const um = ({ arquivo, resultado }) => {
    if (modo === 'nenhum') return Object.assign({ arquivo }, resultado);
    if (modo === 'regra') {
      const regs = {};
      resultado.diagnosticos.forEach(d => { const g = regs[d.codigo] || (regs[d.codigo] = { regra: d.regra, nivel: d.nivel, total: 0, itens: [] }); g.total++; g.itens.push(d); });
      return { arquivo, versao: resultado.versao, tipo: resultado.tipo, resumo: resultado.resumo, regras: regs };
    }
    return Object.assign({ arquivo }, agrupar(resultado));
  };
  const v = itens.length === 1 ? um(itens[0]) : { versao: VERSAO, resumo: soma(itens), arquivos: itens.map(um) };
  return JSON.stringify(v, null, 2) + '\n';
}

export const resumo = itens => itens.map(x => x.arquivo + ': ' + resumoTexto(x.resultado.resumo)).join('\n') + (itens.length > 1 ? '\nTotal: ' + resumoTexto(soma(itens)) : '') + '\n';

/** SARIF 2.1.0 (GitHub code scanning). Colunas em pontos de código, como no contrato. */
export function sarif(itens) {
  const rs = regras();
  const driver = { name: 'linguagem-acessivel', semanticVersion: VERSAO, informationUri: 'https://github.com/anacgovbr/conteudista/tree/main/docs/linguagem-acessivel',
    rules: rs.map(r => ({ id: r.codigo, name: r.id, shortDescription: { text: r.titulo }, fullDescription: { text: r.porque },
      helpUri: 'https://github.com/anacgovbr/conteudista/blob/main/docs/linguagem-acessivel/regras/' + r.codigo + '-' + r.id + '.md',
      defaultConfiguration: { level: r.nivel === 'corrigir' ? 'error' : 'note' }, properties: { tags: [r.area, r.grupo] } })) };
  const results = itens.flatMap(({ arquivo, resultado }) => resultado.diagnosticos.map(d => ({
    ruleId: d.codigo, ruleIndex: rs.findIndex(r => r.codigo === d.codigo), level: d.nivel === 'corrigir' ? 'error' : 'note', message: { text: d.mensagem },
    locations: [{ physicalLocation: { artifactLocation: { uri: arquivo === '(entrada)' ? 'entrada.md' : arquivo.replace(/\\/g, '/') },
      region: { startLine: d.linha, startColumn: d.coluna, endLine: d.linhaFim, endColumn: d.colunaFim } } }],
  })));
  return JSON.stringify({ $schema: 'https://json.schemastore.org/sarif-2.1.0.json', version: '2.1.0',
    runs: [{ tool: { driver }, columnKind: 'unicodeCodePoints', results }] }, null, 2) + '\n';
}

/** Diferença simples por linhas (formato unificado) entre dois textos. */
export function diferenca(a, b, nome = 'texto') {
  if (a === b) return '';
  const A = a.split('\n'), B = b.split('\n');
  let i = 0; while (i < A.length && i < B.length && A[i] === B[i]) i++;
  let ja = A.length - 1, jb = B.length - 1; while (ja >= i && jb >= i && A[ja] === B[jb]) { ja--; jb--; }
  // dentro do trecho que mudou, alinha as linhas iguais (LCS) para mostrar só o que mudou
  const x = A.slice(i, ja + 1), y = B.slice(i, jb + 1), m = x.length, n = y.length;
  const out = [];
  if (m * n <= 4e6) {
    const L = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
    for (let p = m - 1; p >= 0; p--) for (let q = n - 1; q >= 0; q--) L[p][q] = x[p] === y[q] ? L[p + 1][q + 1] + 1 : Math.max(L[p + 1][q], L[p][q + 1]);
    let p = 0, q = 0;
    while (p < m || q < n) {
      if (p < m && q < n && x[p] === y[q]) { out.push(' ' + x[p]); p++; q++; }
      else if (p < m && (q >= n || L[p + 1][q] >= L[p][q + 1])) out.push('-' + x[p++]);
      else out.push('+' + y[q++]);
    }
  } else { x.forEach(s => out.push('-' + s)); y.forEach(s => out.push('+' + s)); }
  const ctx = 2, ini = Math.max(0, i - ctx);
  const antes = A.slice(ini, i).map(s => ' ' + s), depois = A.slice(ja + 1, ja + 1 + ctx).map(s => ' ' + s);
  const corpo = [...antes, ...out, ...depois];
  const na = corpo.filter(s => s[0] !== '+').length, nb = corpo.filter(s => s[0] !== '-').length;
  return '--- ' + nome + '\n+++ ' + nome + ' (ajustado)\n@@ -' + (ini + 1) + ',' + na + ' +' + (ini + 1) + ',' + nb + ' @@\n' + corpo.join('\n') + '\n';
}
