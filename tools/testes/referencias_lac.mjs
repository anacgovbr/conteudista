// Auxiliar dos testes de referencia (testar_modulos.py): le o validador real e devolve JSON.
// Entrada (stdin): { "textos": ["markdown", ...] }. Saida: regras, limites e diagnosticos de cada texto.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const lib = p => pathToFileURL(path.join(raiz, 'web', 'lib', 'linguagem-acessivel', p)).href;
const { regras, criarSessao } = await import(lib('index.js'));
const padrao = (await import(lib('config/padrao.js'))).default;
const entrada = JSON.parse(readFileSync(0, 'utf8') || '{}');
const sessao = criarSessao();
const saida = {
  regras: regras().map(r => ({ codigo: r.codigo, id: r.id, nivel: r.nivel })),
  limites: { frase: padrao.limiteFraseLonga, narracao: padrao.limiteFraseNarracao, paragrafo: padrao.limiteParagrafo },
  exemplos: regras().map(r => { const e = r.exemplos.find(x => x.ruim && x.bom), f = s => s.replace(/\n/g, ' ↵ '), cut = s => s.length > 120 ? s.slice(0, 100) + '…' : s;
    return { codigo: r.codigo, id: r.id, ruim: cut(f(e.ruim)).replace(/`/g, "'"), bom: f(e.bom).replace(/`/g, "'") }; }),
  descricaoLonga: Number(/const LIMITE = (\d+)/.exec(readFileSync(path.join(raiz, 'web', 'lib', 'linguagem-acessivel', 'regras', 'descricao-longa.js'), 'utf8'))[1]),
  resultados: (entrada.textos || []).map(t => { const r = typeof t === 'string' ? sessao.analisar(t) : sessao.analisar(t.texto, { tipo: t.tipo }); return { resumo: r.resumo, codigos: r.diagnosticos.map(d => d.codigo) }; }),
};
process.stdout.write(JSON.stringify(saida));
