#!/usr/bin/env node
/* =====================================================================================
   lac · linha de comando da Linguagem Acessível
   Lê arquivos ou a entrada (pipe) e escreve na saída; avisos e erros vão para a saída de erro.
   Códigos de saída: 0 nada a corrigir · 1 há itens para corrigir · 2 erro de uso · 3 erro interno.
   Comandos, opções e textos de ajuda: tools/lac/comandos.json (fonte única, também da API).
   Sem dependências; Node 18 ou mais novo. Não abre conexões de rede.
   ===================================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as LA from '../../web/lib/linguagem-acessivel/index.js';
import { C, VERSAO_LAC, comandoPor, opcaoPor, ajudaGeral, ajudaCurta, ajudaComando, completarBash, completarZsh } from './ajuda.mjs';
import * as F from './formatos.mjs';

const require = createRequire(import.meta.url);
const OpcoesYaml = require('../../web/opcoes.js');

class ErroUso extends Error {}
const sair = (codigo) => { process.exitCode = codigo; };
/** Nomes em inglês que toda ferramenta de terminal aceita; as opções oficiais continuam --versao e --ajuda. */
const ALIAS_LONGOS = { version: 'versao', help: 'ajuda' };

/* ---------------------------------------------------------------- argumentos */
export function lerArgumentos(argv) {
  const a = { comando: null, args: [], op: {} };
  const toma = (o, nome, resto, i) => {
    const destino = o.id === 'config' ? 'configPath' : o.id;
    if (!o.valor) { a.op[destino] = true; return i; }
    let v = resto;
    if (v === undefined || v === '') { v = argv[++i]; if (v === undefined) throw new ErroUso('A opção ' + nome + ' precisa de um valor (' + o.valor + ').'); }
    a.op[destino] = v; return i;
  };
  let soArgs = false;
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (soArgs || x === '-' || !x.startsWith('-')) { if (!a.comando && !soArgs && x !== '-') a.comando = x; else a.args.push(x); continue; }
    if (x === '--') { soArgs = true; continue; }
    if (x.startsWith('--')) {
      const [bruto, ...r] = x.slice(2).split('='), nome = ALIAS_LONGOS[bruto] || bruto, o = C.opcoes.find(q => q.id === nome);
      if (!o) throw new ErroUso('Opção desconhecida: --' + bruto + '. Veja: lac h');
      i = toma(o, '--' + nome, r.length ? r.join('=') : undefined, i);
      continue;
    }
    // curtas: -g f, -gf, -qd
    for (let k = 1; k < x.length; k++) {
      const o = C.opcoes.find(q => q.curta === x[k]);
      if (!o) throw new ErroUso('Opção desconhecida: -' + x[k] + '. Veja: lac h');
      if (o.valor) { i = toma(o, '-' + x[k], x.slice(k + 1) || undefined, i); break; }
      a.op[o.id] = true;
    }
  }
  return a;
}

/* ---------------------------------------------------------------- entrada */
function lerEntrada() {
  if (process.stdin.isTTY) return null;
  try { return fs.readFileSync(0, 'utf8'); } catch (e) { if (e.code === 'EAGAIN' || e.code === 'EOF') return ''; throw e; }
}
const semBom = s => s.replace(/^\uFEFF/, '');
function entradas(args, exigir) {
  const lista = args.length ? args : ['-'];
  return lista.map(n => {
    if (n === '-') { const t = lerEntrada(); if (t === null) { if (exigir) throw new ErroUso('Nada para ler. Informe um arquivo ou use um pipe: cat arquivo.md | lac c'); return { arquivo: '(entrada)', texto: '' }; } return { arquivo: '(entrada)', texto: semBom(t) }; }
    let t; try { t = fs.readFileSync(n, 'utf8'); } catch (e) { throw new ErroUso('Não foi possível ler "' + n + '": ' + (e.code === 'ENOENT' ? 'arquivo não encontrado' : e.code === 'EISDIR' ? 'é uma pasta' : e.message)); }
    return { arquivo: n, texto: semBom(t) };
  });
}

/* ---------------------------------------------------------------- opções da biblioteca */
function opcoesLib(op) {
  const o = { config: {} };
  if (op.configPath) {
    let texto;
    try { texto = fs.readFileSync(op.configPath, 'utf8'); } catch (e) { throw new ErroUso('Não foi possível ler a configuração "' + op.configPath + '": ' + (e.code === 'ENOENT' ? 'arquivo não encontrado' : e.message)); }
    const leitura = OpcoesYaml.interpretar(texto);
    if (leitura.avisos.length) throw new ErroUso('Configuração inválida: ' + leitura.avisos.map(x => (x.linha ? 'linha ' + x.linha + ': ' : '') + x.msg).join('; '));
    const valores = leitura.valores;
    if (valores['acessibilidade_texto.limite_frase_longa'] !== undefined) {
      o.config.limiteFraseLonga = valores['acessibilidade_texto.limite_frase_longa'];
      o.config.limiteFraseNarracao = valores['acessibilidade_texto.limite_frase_longa'];
    }
    if (valores['acessibilidade_texto.mostrar_sugestoes'] !== undefined) o.config.sugestoes = valores['acessibilidade_texto.mostrar_sugestoes'] === 'ligado';
    const regras = {};
    Object.entries(valores).forEach(([caminho, valor]) => {
      const m = /^acessibilidade_texto\.regras\.([a-z0-9]+)$/.exec(caminho);
      if (m) regras[m[1]] = valor === 'desligado' ? false : valor;
    });
    if (Object.keys(regras).length) o.config.regras = regras;
  }
  const sel = [op.grupo, op.regra].filter(Boolean).join(',');
  if (sel) { try { o.regras = LA.selecionar(sel); } catch (e) { throw new ErroUso(e.message); } }
  if (op.nivel) { const n = String(op.nivel).toLowerCase(); if (!['c', 's', 'corrigir', 'sugestao', 'sugestão'].includes(n)) throw new ErroUso('Nível desconhecido: "' + op.nivel + '". Use c (corrigir) ou s (sugestão).'); o.nivel = n === 'sugestão' ? 's' : n; }
  if (op.tipo) { if (!['auto', 'apostila', 'apresentacao', 'apresentação'].includes(op.tipo)) throw new ErroUso('Tipo desconhecido: "' + op.tipo + '". Use auto, apostila ou apresentacao.'); o.tipo = op.tipo.replace('ç', 'c').replace('ã', 'a'); }
  if (op.limite !== undefined) { const l = Number(op.limite); if (!Number.isInteger(l) || l < 10 || l > 60) throw new ErroUso('Limite inválido: "' + op.limite + '". Use um número de 10 a 60.'); o.config.limiteFraseLonga = l; o.config.limiteFraseNarracao = l; }
  return o;
}
function formato(op, permitidos, padrao = 'texto') {
  const f = op.formato || padrao;
  if (!permitidos.includes(f)) throw new ErroUso('Formato "' + f + '" não serve para este comando. Use: ' + permitidos.join(', ') + '.');
  return f;
}
function escrever(op, s) {
  if (op.quieto || !s) return;
  if (op.saida) fs.writeFileSync(op.saida, s); else process.stdout.write(s);
}
const usaCor = () => process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb';
const COR = { corrigir: '\x1b[1;31m', sugestao: '\x1b[33m', arq: '\x1b[1m', ok: '\x1b[32m' };
const pintor = (op) => (usaCor() && !op.saida) ? (t, s) => COR[t] + s + '\x1b[0m' : (t, s) => s;

/* ---------------------------------------------------------------- comandos */
const COMANDOS = {
  conferir(a) {
    const c = comandoPor('conferir'), f = formato(a.op, c.formatos), o = opcoesLib(a.op);
    const modo = a.op.agrupar || 'grupo';
    if (!['grupo', 'regra', 'nenhum'].includes(modo)) throw new ErroUso('Agrupamento desconhecido: "' + modo + '". Use grupo, regra ou nenhum.');
    const itens = entradas(a.args, true).map(e => ({ arquivo: e.arquivo, conteudo: e.texto, resultado: LA.analisar(e.texto, o) }));
    const s = f === 'texto' ? F.texto(itens, pintor(a.op)) : f === 'json' ? F.json(itens, modo) : f === 'jsonl' ? F.jsonl(itens) : f === 'sarif' ? F.sarif(itens) : f === 'relatorio' ? F.relatorio(itens, a.op.nome || '', o.config) : F.resumo(itens);
    escrever(a.op, s);
    return F.soma(itens).corrigir ? 1 : 0;
  },
  ajustar(a) {
    if (a.args.length > 1) throw new ErroUso('ajustar trabalha com um arquivo por vez.');
    const o = opcoesLib(a.op); delete o.nivel;
    const [e] = entradas(a.args, true), r = LA.aplicarSeguras(e.texto, o);
    escrever(a.op, a.op.diferenca ? F.diferenca(e.texto, r.texto, e.arquivo) : r.texto);
    if (!a.op.quieto) process.stderr.write(r.aplicadas ? r.aplicadas + (r.aplicadas === 1 ? ' correção aplicada' : ' correções aplicadas') + ': ' + r.lista.map(x => x.codigo + ' linha ' + x.linha).join(', ') + '\n' : 'Nenhuma correção segura a aplicar.\n');
    return 0;
  },
  regras(a) {
    const f = formato(a.op, comandoPor('regras').formatos);
    let rs = LA.regras();
    if (a.op.grupo) { let ids; try { ids = LA.selecionar(a.op.grupo); } catch (e) { throw new ErroUso(e.message); } rs = rs.filter(r => ids.includes(r.id)); }
    if (f === 'json') { escrever(a.op, JSON.stringify(rs.map(({ exemplos, ...r }) => r), null, 2) + '\n'); return 0; }
    const t = LA.textos();
    escrever(a.op, rs.map(r => r.codigo.padEnd(4) + r.id.padEnd(24) + (t.grupos[r.grupo] || r.grupo).padEnd(11) + (r.nivel === 'corrigir' ? 'corrigir' : 'sugestão').padEnd(10) + r.titulo).join('\n') + '\n');
    return 0;
  },
  explicar(a) {
    const f = formato(a.op, comandoPor('explicar').formatos);
    const q = (a.args[0] || '').toLowerCase(); if (!q) throw new ErroUso('Informe a regra: lac e f1');
    const r = LA.regras().find(x => x.codigo === q || x.id === q);
    if (!r) throw new ErroUso('Regra desconhecida: "' + a.args[0] + '". Veja a lista: lac r');
    if (f === 'json') { escrever(a.op, JSON.stringify(r, null, 2) + '\n'); return 0; }
    const t = LA.textos(), l = [r.codigo + ' · ' + r.titulo + ' (' + r.id + ')', '', t.areas[r.area] + ' › ' + (t.grupos[r.grupo] || r.grupo) + ' · ' + (r.nivel === 'corrigir' ? 'para corrigir' : 'sugestão') + (r.tipos.length === 1 ? ' · só em ' + (r.tipos[0] === 'apresentacao' ? 'apresentação' : r.tipos[0]) : ''), '',
      'Mensagem: ' + r.mensagem, '', 'Por que importa: ' + r.porque, ''];
    r.exemplos.forEach(ex => { if (ex.ruim) l.push('Acusa:', '  ' + ex.ruim.split('\n').join('\n  '), 'Melhor assim:', '  ' + ex.bom.split('\n').join('\n  '), ''); });
    l.push('Para não acusar num bloco: <!-- linguagem-acessivel: ignorar ' + r.codigo + ' -->');
    escrever(a.op, l.join('\n') + '\n');
    return 0;
  },
  pedido(a) {
    const tipo = (a.args[0] || '').toLowerCase();
    if (!tipo) throw new ErroUso('Informe o pedido: lac p descrever  ou  lac p simplificar');
    const e = (a.args.length > 1 ? entradas(a.args.slice(1), false) : entradas([], false))[0];
    let s;
    try { s = LA.montarPedido(tipo, { nome: a.op.nome, legenda: a.op.legenda, contexto: e.texto, trecho: e.texto }); }
    catch (x) { throw new ErroUso(x.codigo === 'trecho-vazio' ? 'Envie o trecho pela entrada: lac p simplificar < trecho.txt' : x.message); }
    escrever(a.op, s + '\n');
    return 0;
  },
  servir(a) {
    const porta = Number(a.op.porta || 8787);
    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new ErroUso('Porta inválida. Use um número de 1 a 65535.');
    import('./servidor.mjs').then(({ iniciarServidor }) => iniciarServidor({ porta })).catch(e => {
      process.stderr.write('lac: não foi possível iniciar a API: ' + e.message + '\n');
      process.exitCode = 3;
    });
    return 0;
  },
  ajuda(a) {
    if (!a.args[0]) { escrever(a.op, ajudaGeral()); return 0; }
    const t = ajudaComando(a.args[0]); if (!t) throw new ErroUso('Comando desconhecido: "' + a.args[0] + '". Veja: lac h');
    escrever(a.op, t); return 0;
  },
  completar(a) {
    const s = a.args[0] === 'bash' ? completarBash() : a.args[0] === 'zsh' ? completarZsh() : null;
    if (!s) throw new ErroUso('Use: lac completar bash  ou  lac completar zsh');
    escrever(a.op, s); return 0;
  },
};

/* ---------------------------------------------------------------- principal */
export function principal(argv) {
  try {
    const a = lerArgumentos(argv);
    if (a.op.versao) { process.stdout.write('lac ' + VERSAO_LAC + ' · API v1 · biblioteca ' + LA.VERSAO + ' · pedidos para IA ' + LA.VERSAO_PEDIDOS + '\n'); return 0; }
    if (!a.comando) {
      if (a.op.ajuda) { process.stdout.write(ajudaGeral()); return 0; }
      process.stderr.write(ajudaCurta()); return 2;
    }
    const c = comandoPor(a.comando);
    if (!c) throw new ErroUso('Comando desconhecido: "' + a.comando + '". Veja: lac h');
    if (a.op.ajuda) { process.stdout.write(ajudaComando(c.id)); return 0; }
    for (const k of Object.keys(a.op)) { const id = k === 'configPath' ? 'config' : k, o = opcaoPor(id); if (!o.global && !c.opcoes.includes(id)) throw new ErroUso('A opção --' + id + ' não serve para "' + c.id + '". Veja: lac h ' + (c.atalho || c.id)); }
    if (a.op.saida) { const d = path.dirname(path.resolve(a.op.saida)); if (!fs.existsSync(d)) throw new ErroUso('A pasta de saída não existe: ' + d); }
    return COMANDOS[c.id](a);
  } catch (e) {
    if (e instanceof ErroUso) { process.stderr.write('lac: ' + e.message + '\n'); return 2; }
    process.stderr.write('lac: erro interno: ' + (e && e.stack || e) + '\nInforme este erro com o texto que o causou.\n'); return 3;
  }
}

const real = p => { try { return fs.realpathSync(p); } catch (e) { return path.resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) sair(principal(process.argv.slice(2)));
