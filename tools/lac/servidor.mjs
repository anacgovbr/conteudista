import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import * as LA from '../../web/lib/linguagem-acessivel/index.js';
import * as F from './formatos.mjs';
import { C, VERSAO_LAC, ajudaGeral, ajudaComando } from './ajuda.mjs';
import { documentoOpenApi } from './openapi.mjs';

const MAX_BODY = 1024 * 1024;
const LIMITE_JANELA = 60;
const DURACAO_JANELA = 60_000;
const tentativas = new Map();
const FORMATOS_CONFERIR = ['application/json', 'application/x-ndjson', 'application/sarif+json', 'text/plain', 'text/html'];

class ErroHttp extends Error {
  constructor(status, title, detail, headers = {}) {
    super(detail);
    this.status = status;
    this.title = title;
    this.headers = headers;
  }
}

function cabecalhosCors(req) {
  const origin = req.headers.origin;
  if (!origin) return {};
  const permitidas = (process.env.LAC_CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (permitidas.includes('*')) return { 'Access-Control-Allow-Origin': '*', Vary: 'Origin' };
  if (permitidas.includes(origin)) return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
  return { Vary: 'Origin' };
}

function json(res, status, valor, headers = {}) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers));
  res.end(JSON.stringify(valor));
}

function problema(req, res, erro, cors) {
  const status = erro instanceof ErroHttp ? erro.status : 500;
  const title = erro instanceof ErroHttp ? erro.title : 'Erro interno';
  const detail = erro instanceof ErroHttp ? erro.message : 'A solicitação não pôde ser concluída.';
  json(res, status, { type: 'about:blank', title, status, detail, instance: new URL(req.url, 'http://localhost').pathname },
    Object.assign({}, cors, erro instanceof ErroHttp ? erro.headers : {}, { 'Content-Type': 'application/problem+json; charset=utf-8' }));
}

function limitar(req) {
  const agora = Date.now(), ip = req.socket.remoteAddress || 'local';
  let atual = tentativas.get(ip);
  if (!atual || agora - atual.inicio >= DURACAO_JANELA) atual = { inicio: agora, quantidade: 0 };
  atual.quantidade++;
  tentativas.set(ip, atual);
  if (tentativas.size > 4096) for (const [chave, valor] of tentativas) if (agora - valor.inicio >= DURACAO_JANELA) tentativas.delete(chave);
  if (atual.quantidade <= LIMITE_JANELA) return null;
  return Math.max(1, Math.ceil((DURACAO_JANELA - (agora - atual.inicio)) / 1000));
}

async function corpo(req) {
  let bytes = 0, excedeu = false;
  const partes = [];
  for await (const parte of req) {
    bytes += parte.length;
    if (bytes > MAX_BODY) { excedeu = true; partes.length = 0; }
    else if (!excedeu) partes.push(parte);
  }
  if (excedeu) throw new ErroHttp(413, 'Conteúdo muito grande', 'O limite desta solicitação é 1 MiB.');
  return Buffer.concat(partes).toString('utf8');
}

async function entrada(req, precisaConteudo = true) {
  const tipo = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const texto = await corpo(req);
  if (tipo === 'text/markdown') return { conteudo: texto, tipo: req.headers['x-linguagem-acessivel-tipo'] || 'auto', config: {} };
  if (tipo !== 'application/json' && !tipo.endsWith('+json')) throw new ErroHttp(415, 'Tipo de conteúdo não aceito', 'Use text/markdown ou application/json.');
  let dados;
  try { dados = JSON.parse(texto); } catch { throw new ErroHttp(400, 'JSON inválido', 'Confira se o corpo contém JSON válido.'); }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new ErroHttp(422, 'Entrada inválida', 'Envie um objeto JSON.');
  if (precisaConteudo && typeof dados.conteudo !== 'string') throw new ErroHttp(422, 'Entrada inválida', 'O campo "conteudo" precisa ser um texto.');
  if (dados.tipo !== undefined && !['auto', 'apostila', 'apresentacao'].includes(dados.tipo)) throw new ErroHttp(422, 'Tipo inválido', 'Use auto, apostila ou apresentacao.');
  if (dados.config !== undefined && (!dados.config || typeof dados.config !== 'object' || Array.isArray(dados.config))) throw new ErroHttp(422, 'Configuração inválida', 'O campo "config" precisa ser um objeto.');
  return Object.assign({ tipo: 'auto', config: {} }, dados);
}

function formato(req, permitidos, padrao) {
  const aceitar = String(req.headers.accept || '').split(',').map(x => x.split(';')[0].trim());
  return aceitar.find(x => permitidos.includes(x)) || padrao;
}

function texto(res, status, corpo, tipo, headers = {}) {
  res.writeHead(status, Object.assign({ 'Content-Type': tipo + '; charset=utf-8', 'Cache-Control': 'no-store' }, headers));
  res.end(corpo);
}

function resumo(resultado) {
  return resultado.resumo.corrigir + ' para corrigir; ' + resultado.resumo.sugestoes + ' sugestoes';
}

async function atender(req, res) {
  const cors = cabecalhosCors(req);
  if (req.method === 'OPTIONS') {
    const origemPermitida = !req.headers.origin || cors['Access-Control-Allow-Origin'];
    if (!origemPermitida) throw new ErroHttp(403, 'Origem não permitida', 'Esta origem não está habilitada para CORS.');
    res.writeHead(204, Object.assign(cors, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Linguagem-Acessivel-Tipo, If-None-Match',
      'Access-Control-Max-Age': '600',
    }));
    res.end(); return;
  }
  const segundos = limitar(req);
  if (segundos) throw new ErroHttp(429, 'Muitas solicitações', 'Aguarde antes de tentar novamente.', { 'Retry-After': String(segundos) });

  const url = new URL(req.url, 'http://127.0.0.1');
  let caminho;
  try { caminho = decodeURIComponent(url.pathname); } catch { throw new ErroHttp(400, 'Caminho inválido', 'Confira os caracteres codificados no endereço.'); }
  if (caminho === '/v1/saude' && req.method === 'GET') {
    json(res, 200, { estado: 'ok', api: 'v1', versao: VERSAO_LAC, biblioteca: LA.VERSAO, pedidos: LA.VERSAO_PEDIDOS }, cors); return;
  }
  if (caminho === '/v1/openapi.json' && req.method === 'GET') {
    json(res, 200, documentoOpenApi(), Object.assign({}, cors, { 'Cache-Control': 'public, max-age=300' })); return;
  }
  if (caminho === '/v1/regras' && req.method === 'GET') {
    let regras = LA.regras();
    const grupo = url.searchParams.get('grupo');
    if (grupo) {
      let ids;
      try { ids = LA.selecionar(grupo); } catch (e) { throw new ErroHttp(422, 'Grupo inválido', e.message); }
      regras = regras.filter(r => ids.includes(r.id));
    }
    const corpoJson = JSON.stringify(regras);
    const etag = '"' + createHash('sha256').update(corpoJson).digest('hex') + '"';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, Object.assign(cors, { ETag: etag })); res.end(); return; }
    texto(res, 200, corpoJson, 'application/json', Object.assign({}, cors, { ETag: etag, 'Cache-Control': 'public, max-age=300' })); return;
  }
  const regra = /^\/v1\/regras\/([^/]+)$/.exec(caminho);
  if (regra && req.method === 'GET') {
    const codigo = regra[1].toLowerCase(), item = LA.regras().find(r => r.codigo === codigo || r.id === codigo);
    if (!item) throw new ErroHttp(404, 'Regra não encontrada', 'Confira o código da regra em GET /v1/regras.');
    json(res, 200, item, cors); return;
  }
  if (caminho === '/v1/ajuda' && req.method === 'GET') { texto(res, 200, ajudaGeral(), 'text/plain', cors); return; }
  const ajuda = /^\/v1\/ajuda\/([^/]+)$/.exec(caminho);
  if (ajuda && req.method === 'GET') {
    const saida = ajudaComando(ajuda[1]);
    if (!saida) throw new ErroHttp(404, 'Comando não encontrado', 'Confira o comando em GET /v1/ajuda.');
    texto(res, 200, saida, 'text/plain', cors); return;
  }

  const conferir = /^\/v1\/conferir(?:\/([^/]+))?$/.exec(caminho);
  if (conferir && req.method === 'POST') {
    const dados = await entrada(req), opcoes = { tipo: dados.tipo, config: dados.config };
    const selecao = conferir[1] || url.searchParams.get('grupo') || url.searchParams.get('regra');
    if (selecao) {
      try { opcoes.regras = LA.selecionar(selecao); } catch (e) { throw new ErroHttp(422, 'Seleção inválida', e.message); }
    }
    let resultado;
    try { resultado = LA.analisar(dados.conteudo, opcoes); } catch (e) { throw new ErroHttp(422, 'Configuração inválida', e.message); }
    const headers = Object.assign({}, cors, { 'Linguagem-Acessivel-Resumo': resumo(resultado) });
    const tipo = formato(req, FORMATOS_CONFERIR, 'application/json');
    const item = { arquivo: '(entrada)', conteudo: dados.conteudo, resultado };
    if (tipo === 'application/x-ndjson') texto(res, 200, F.jsonl([item]), tipo, headers);
    else if (tipo === 'application/sarif+json') texto(res, 200, F.sarif([item]), tipo, headers);
    else if (tipo === 'text/plain') texto(res, 200, F.texto([item], (x, s) => s), tipo, headers);
    else if (tipo === 'text/html') texto(res, 200, F.relatorio([item], dados.nome || '', dados.config || {}), tipo, headers);
    else texto(res, 200, F.json([item], 'nenhum'), tipo, headers);
    return;
  }
  if (caminho === '/v1/ajustar' && req.method === 'POST') {
    const dados = await entrada(req), opcoes = { tipo: dados.tipo, config: dados.config };
    if (dados.regras) {
      try { opcoes.regras = LA.selecionar(dados.regras); } catch (e) { throw new ErroHttp(422, 'Seleção inválida', e.message); }
    }
    let resultado;
    try { resultado = LA.aplicarSeguras(dados.conteudo, opcoes); } catch (e) { throw new ErroHttp(422, 'Configuração inválida', e.message); }
    const tipo = formato(req, ['text/markdown', 'application/json'], 'text/markdown');
    if (tipo === 'application/json') json(res, 200, resultado, cors);
    else texto(res, 200, resultado.texto, 'text/markdown', Object.assign({}, cors, { 'Linguagem-Acessivel-Resumo': resultado.aplicadas + ' correcoes aplicadas' }));
    return;
  }
  const pedido = /^\/v1\/pedidos\/(descrever|simplificar)$/.exec(caminho);
  if (pedido && req.method === 'POST') {
    const dados = await entrada(req, false);
    let saida;
    try { saida = LA.montarPedido(pedido[1], { nome: dados.nome, legenda: dados.legenda, contexto: dados.contexto || dados.conteudo, trecho: dados.trecho || dados.conteudo }); }
    catch (e) { throw new ErroHttp(422, 'Pedido inválido', e.message); }
    const tipo = formato(req, ['text/plain', 'application/json'], 'text/plain');
    if (tipo === 'application/json') json(res, 200, { pedido: saida, versao: LA.VERSAO_PEDIDOS }, cors);
    else texto(res, 200, saida, 'text/plain', cors);
    return;
  }
  throw new ErroHttp(404, 'Rota não encontrada', 'Confira as rotas em GET /v1/openapi.json.');
}

export function criarServidor() {
  return createServer((req, res) => {
    Promise.resolve(atender(req, res)).catch(erro => {
      if (res.headersSent) { res.destroy(); return; }
      problema(req, res, erro, cabecalhosCors(req));
    });
  });
}

export function iniciarServidor({ porta = 8787, host = process.env.LAC_HOST || '127.0.0.1' } = {}) {
  const servidor = criarServidor();
  return new Promise((resolve, reject) => {
    const falha = erro => reject(erro);
    servidor.once('error', falha);
    servidor.listen(porta, host, () => {
      servidor.removeListener('error', falha);
      const endereco = servidor.address();
      process.stdout.write('API da Linguagem Acessível em http://' + host + ':' + endereco.port + '/v1/saude\n');
      resolve(servidor);
    });
  });
}