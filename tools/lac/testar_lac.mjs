#!/usr/bin/env node
/* Testes da linha de comando lac (tools/lac). Sem dependências: node tools/lac/testar_lac.mjs
   Roda o lac de verdade, como processo, com pipes e arquivos. Saída: 0 tudo certo · 1 há falhas. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as LA from '../../web/lib/linguagem-acessivel/index.js';
import { C, ajudaGeral, ajudaComando } from './ajuda.mjs';
import { gerados } from './gerar.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(AQUI, '..', '..');
const LAC = path.join(AQUI, 'lac.mjs');
const CASO = path.join(RAIZ, 'tools', 'linguagem-acessivel', 'casos', 'problemas.md');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lac-'));
let n = 0, f = 0;
const t = (nome, fn) => { n++; try { fn(); console.log('  ok   ' + nome); } catch (e) { f++; console.log('  FALHA ' + nome + '\n        ' + String(e && e.message || e).split('\n').join('\n        ')); } };
const igual = (a, b, m) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((m ? m + ': ' : '') + 'esperado ' + y + ', veio ' + x); };
const verdade = (c, m) => { if (!c) throw new Error(m || 'condição falsa'); };
const lac = (args, entrada, env) => {
  const r = spawnSync(process.execPath, [LAC, ...args], { input: entrada === undefined ? '' : entrada, encoding: 'utf8', cwd: RAIZ, env: Object.assign({}, process.env, { NO_COLOR: '' }, env || {}) });
  return { cod: r.status, out: r.stdout, err: r.stderr };
};
const RUIM = '# A\n\n### B\n\nVeja [aqui](x). O pedido segue o QWER.\n';
const BOM = '# A\n\n## B\n\nVeja o [portal da agência](https://www.gov.br/anac).\n';
const arq = (nome, txt) => { const p = path.join(TMP, nome); fs.writeFileSync(p, txt); return p; };
const fRuim = arq('ruim.md', RUIM), fBom = arq('bom.md', BOM);

console.log('1. Códigos de saída');
t('0 sem nada para corrigir; 1 com itens para corrigir', () => { igual(lac(['c', fBom]).cod, 0); igual(lac(['c', fRuim]).cod, 1); });
t('só sugestões: sai com 0', () => igual(lac(['c'], 'O QWER aprova.').cod, 0));
t('2 em erro de uso, com mensagem que aponta a ajuda', () => {
  for (const a of [['c', '--zz'], ['zz'], ['c', '-g', 'x9'], ['c', '-n', 'z'], ['c', '-l', '5'], ['c', '-f', 'xml'], ['r', '-n', 'c'], ['e', 'q9'], ['c', path.join(TMP, 'nao-existe.md')], ['p'], ['a', fRuim, fBom], ['s', '-p', '70000']]) {
    const r = lac(a); igual(r.cod, 2, a.join(' ')); verdade(/^lac: /.test(r.err) && !r.out, 'mensagem: ' + a.join(' ') + ' -> ' + r.err);
  }
});
t('sem comando: ajuda curta na saída de erro e código 2 (não fica esperando)', () => { const r = lac([]); igual(r.cod, 2); verdade(/lac h/.test(r.err) && !r.out); });
t('-q não escreve nada', () => { const r = lac(['c', '-q', fRuim]); igual([r.cod, r.out, r.err], [1, '', '']); });

console.log('2. Entrada e saída');
t('lê da entrada (pipe) e de arquivo com o mesmo resultado', () => { const a = JSON.parse(lac(['c', '-f', 'json'], RUIM).out), b = JSON.parse(lac(['c', '-f', 'json', fRuim]).out); a.arquivo = b.arquivo = 'X'; igual(a, b); });
t('"-" mistura entrada e arquivos', () => { const r = JSON.parse(lac(['c', '-f', 'json', fBom, '-'], RUIM).out); igual(r.arquivos.map(a => [a.arquivo, a.resumo.corrigir]), [[fBom, 0], ['(entrada)', 2]]); });
t('-o grava num arquivo e não escreve na saída', () => { const o = path.join(TMP, 'saida.json'); const r = lac(['c', '-f', 'json', '-o', o, fRuim]); igual([r.cod, r.out], [1, '']); verdade(JSON.parse(fs.readFileSync(o, 'utf8')).resumo.corrigir === 2); });
t('arquivo com BOM e CRLF: mesmas linhas e colunas', () => {
  const p = arq('crlf.md', '\uFEFF' + RUIM.replace(/\n/g, '\r\n'));
  igual(JSON.parse(lac(['c', '-f', 'json', '--agrupar', 'nenhum', p]).out).diagnosticos.map(d => [d.codigo, d.linha, d.coluna]), JSON.parse(lac(['c', '-f', 'json', '--agrupar', 'nenhum'], RUIM).out).diagnosticos.map(d => [d.codigo, d.linha, d.coluna]));
});
t('sem cores fora do terminal e com NO_COLOR', () => verdade(!/\x1b\[/.test(lac(['c', fRuim]).out + lac(['c', fRuim], '', { NO_COLOR: '1' }).out)));
t('formato texto escreve "corrigir" e "sugestão" por extenso', () => { const o = lac(['c', CASO]).out; verdade(/  corrigir  /.test(o) && /  sugestão  /.test(o) && /para corrigir · \d+ sugest/.test(o)); });

console.log('3. Seleção e opções');
t('-g por área, grupo e combinação; -r por código e nome; -n', () => {
  const cods = a => [...new Set(JSON.parse(lac(['c', '-f', 'json', '--agrupar', 'nenhum', ...a, CASO]).out).diagnosticos.map(d => d.codigo[0]))].sort().join('');
  igual(cods(['-g', 'l']), 'fns'); igual(cods(['-g', 'i,k']), 'ik'); igual(cods(['-r', 'f1']), 'f'); igual(cods(['--regra=frase-longa']), 'f');
  verdade(JSON.parse(lac(['c', '-f', 'json', '--agrupar', 'nenhum', '-n', 's', CASO]).out).diagnosticos.every(d => d.nivel === 'sugestao'));
});
t('atalhos curtos juntos: -qd e -gf', () => { igual(lac(['a', '-qd', fRuim]).out, ''); igual(lac(['c', '-gf', '-q', fRuim]).cod, 0); });
t('-l muda o limite de frase', () => { const tx = 'A área técnica analisa o pedido e envia a resposta ao interessado no prazo previsto.'; igual(JSON.parse(lac(['c', '-f', 'json', '-l', '10'], tx).out).resumo.sugestoes, 1); igual(JSON.parse(lac(['c', '-f', 'json'], tx).out).resumo.sugestoes, 0); });
t('--config lê YAML e a opção explícita prevalece', () => {
  const p = arq('opcoes.yaml', 'versao: 1\nacessibilidade_texto:\n  limite_frase_longa: 10\n  regras:\n    e1: desligado\n');
  const tx = 'A área técnica analisa o pedido e envia a resposta ao interessado no prazo previsto.';
  igual(JSON.parse(lac(['c', '-f', 'json', '--config', p], tx).out).resumo.sugestoes, 1);
  igual(JSON.parse(lac(['c', '-f', 'json', '--config', p, '-l', '25'], tx).out).resumo.sugestoes, 0);
  igual(JSON.parse(lac(['c', '-f', 'json', '--agrupar', 'nenhum', '--config', p], RUIM).out).diagnosticos.some(d => d.codigo === 'e1'), false);
});
t('opção que não serve para o comando é recusada', () => { const r = lac(['r', '-d']); igual(r.cod, 2); verdade(/não serve/.test(r.err)); });

console.log('4. Formatos');
t('json agrupado por grupo = biblioteca (mesmo resultado da API)', () => {
  const j = JSON.parse(lac(['c', '-f', 'json', fRuim]).out), b = LA.agrupar(LA.analisar(RUIM));
  igual(j, Object.assign({ arquivo: fRuim }, JSON.parse(JSON.stringify(b))));
});
t('json --agrupar regra e nenhum', () => {
  igual(Object.keys(JSON.parse(lac(['c', '-f', 'json', '--agrupar', 'regra', fRuim]).out).regras).sort(), ['e1', 'k1', 's1']);
  igual(JSON.parse(lac(['c', '-f', 'json', '--agrupar', 'nenhum', fRuim]).out).diagnosticos.length, 3);
});
t('jsonl: um item por linha, com arquivo e grupo', () => {
  const ls = lac(['c', '-f', 'jsonl', fRuim, fBom]).out.trim().split('\n').map(l => JSON.parse(l));
  igual(ls.length, 3); verdade(ls.every(x => x.arquivo === fRuim && x.grupo && x.codigo));
});
t('jsonl sem itens: saída vazia', () => igual(lac(['c', '-f', 'jsonl', fBom]).out, ''));
t('sarif 2.1.0: regras, níveis, região e colunas em pontos de código', () => {
  const s = JSON.parse(lac(['c', '-f', 'sarif', fRuim]).out), run = s.runs[0];
  igual([s.version, run.columnKind, run.tool.driver.rules.length], ['2.1.0', 'unicodeCodePoints', LA.regras().length]);
  const r = run.results.find(x => x.ruleId === 'e1'); igual([r.level, r.locations[0].physicalLocation.region.startLine, r.locations[0].physicalLocation.region.startColumn], ['error', 3, 1]);
  igual(run.results.find(x => x.ruleId === 's1').level, 'note'); verdade(run.results.every(x => run.tool.driver.rules[x.ruleIndex].id === x.ruleId));
});
t('resumo: uma linha por arquivo e total', () => { const o = lac(['c', '-f', 'resumo', fRuim, fBom]).out.trim().split('\n'); igual(o.length, 3); verdade(/^Total: 2 para corrigir · 1 sugestão$/.test(o[2]), o[2]); });
t('relatorio: HTML acessível com aviso e posições', () => { const r = lac(['c', '-f', 'relatorio', fRuim]); verdade(r.out.startsWith('<!doctype html>') && /não substitui uma avaliação completa/i.test(r.out) && r.out.includes('Linha')); igual(r.cod, 1); });

console.log('5. ajustar');
t('aplica só correções seguras; o resto fica', () => { const r = lac(['a'], RUIM); igual(r.out, RUIM.replace('### B', '## B')); verdade(/1 correção aplicada: e1 linha 3/.test(r.err)); });
t('ajustar é idempotente e preserva CRLF', () => { const crlf = RUIM.replace(/\n/g, '\r\n'), a = lac(['a'], crlf).out; igual(a, crlf.replace('### B', '## B')); igual(lac(['a'], a).out, a); });
t('-d mostra a diferença no formato unificado', () => { const d = lac(['a', '-d'], RUIM).out; verdade(/^--- \(entrada\)\n\+\+\+ /.test(d) && /\n-### B\n\+## B\n/.test(d), d); igual(lac(['a', '-d'], BOM).out, ''); });

console.log('6. regras, explicar, pedido, ajuda');
t('regras lista todas; -g filtra; json sem exemplos', () => { igual(lac(['r']).out.trim().split('\n').length, LA.regras().length); igual(lac(['r', '-g', 'k']).out.trim().split('\n').length, 1); verdade(JSON.parse(lac(['r', '-f', 'json']).out).every(r => !r.exemplos)); });
t('explicar por código e por nome', () => { verdade(/^f1 · Frase longa/.test(lac(['e', 'f1']).out)); igual(lac(['e', 'link-vago']).cod, 0); igual(JSON.parse(lac(['e', 'i1', '-f', 'json']).out).codigo, 'i1'); });
t('pedido simplificar usa a entrada e o --nome', () => { const o = lac(['p', 'simplificar', '--nome', 'Curso X'], 'Trecho longo.').out; verdade(o.includes('"Curso X"') && o.includes('Trecho longo.') && /SIMPLIFICAR TRECHO \(versão 1\.0\)/.test(o)); });
t('pedido descrever funciona sem entrada', () => { const r = lac(['p', 'descrever', '--legenda', 'Fluxo']); igual(r.cod, 0); verdade(r.out.includes('"Fluxo"') && r.out.includes('sem texto próximo')); });
t('pedido simplificar sem trecho: erro de uso', () => igual(lac(['p', 'simplificar']).cod, 2));
t('lac h = ajuda gerada de comandos.json; lac c -h = lac h c', () => { igual(lac(['h']).out, ajudaGeral()); igual(lac(['c', '-h']).out, ajudaComando('conferir')); igual(lac(['h', 'c']).out, lac(['h', 'conferir']).out); });
t('toda opção e comando de comandos.json aparece na ajuda', () => { const h = ajudaGeral(); C.comandos.forEach(c => verdade(h.includes(c.id), c.id)); C.opcoes.forEach(o => verdade(h.includes('--' + o.id) || ['grupo', 'regra', 'nivel'].includes(o.id), o.id)); });
t('atalhos de uma letra são únicos (comandos e opções)', () => {
  const ca = C.comandos.map(c => c.atalho).filter(Boolean), oa = C.opcoes.map(o => o.curta).filter(Boolean);
  igual(new Set(ca).size, ca.length); igual(new Set(oa).size, oa.length);
});
t('completar bash e zsh', () => { verdade(/complete -F _lac lac/.test(lac(['completar', 'bash']).out)); verdade(/#compdef lac/.test(lac(['completar', 'zsh']).out)); });
t('-v e --version mostram lac, API, biblioteca e pedidos; --help equivale a -h', () => {
  const esperado = 'lac ' + C.programa.versao + ' · API v1 · biblioteca ' + LA.VERSAO + ' · pedidos para IA ' + LA.VERSAO_PEDIDOS + '\n';
  for (const opcao of ['-v', '--version', '--versao']) { const r = lac([opcao]); igual([r.cod, r.out], [0, esperado], opcao); }
  const h = lac(['--help']); igual(h.cod, 0); igual(h.out, lac(['-h']).out); verdade(h.out.includes('lac · Linguagem Acessível ' + C.programa.versao));
  igual(lac(['--nada']).cod, 2);
});
t('versão única: package.json, comandos.json, OpenAPI e CHANGELOG da release coincidem', () => {
  const v = C.programa.versao, pkg = JSON.parse(fs.readFileSync(path.join(AQUI, 'package.json'), 'utf8')), api = JSON.parse(fs.readFileSync(path.join(AQUI, 'openapi.json'), 'utf8'));
  verdade(/^\d+\.\d+\.\d+$/.test(v), 'versão fora do formato x.y.z: ' + v);
  igual([pkg.version, api.info.version, C.api.versao.split('.')[0]], [v, C.api.versao, v.split('.')[0]]);
  verdade(new RegExp('^## ' + v.replace(/\./g, '\\.') + ' - \\d\\d/\\d\\d/\\d{4}', 'm').test(fs.readFileSync(path.join(AQUI, 'CHANGELOG.md'), 'utf8')), 'tools/lac/CHANGELOG.md sem a seção ' + v);
});
t('docs/lac.md, manual e autocompletar em dia (se falhar: node tools/lac/gerar.mjs)', () => {
  for (const [a, c] of gerados()) igual(fs.existsSync(a) && fs.readFileSync(a, 'utf8').replace(/\r\n/g, '\n'), c, path.relative(RAIZ, a));
});
t('lac não abre conexões (sem http, https, net, fetch no código)', () => {
  for (const a of ['lac.mjs', 'formatos.mjs', 'ajuda.mjs']) verdade(!/node:(http|https|net|dgram)|\bfetch\(/.test(fs.readFileSync(path.join(AQUI, a), 'utf8')), a);
});

console.log('7. Conteúdo de exemplo');
t('apostila e apresentação de exemplo: nada para corrigir', () => {
  const r = lac(['c', '-n', 'c', path.join(RAIZ, 'web', 'exemplo', 'treinamento.md'), path.join(RAIZ, 'web', 'exemplo', 'apresentacao.md')]);
  igual(r.cod, 0, r.out);
});

fs.rmSync(TMP, { recursive: true, force: true });
console.log('\n' + (n - f) + ' de ' + n + ' testes aprovados.');
process.exit(f ? 1 : 0);
