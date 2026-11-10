#!/usr/bin/env node
import { criarServidor } from './servidor.mjs';
import { iniciarServidor } from './servidor.mjs';
import { createServer } from 'node:http';
import * as LA from '../../web/lib/linguagem-acessivel/index.js';
import { C } from './ajuda.mjs';

let ok = 0, falhas = 0;
function afirmar(condicao, nome, detalhe = '') {
  if (condicao) { ok++; console.log('  ok   ' + nome); }
  else { falhas++; console.log('  FALHA ' + nome + (detalhe ? ': ' + detalhe : '')); }
}

process.env.LAC_CORS_ORIGINS = 'https://cliente.example';
const ocupado = createServer();
await new Promise(resolve => ocupado.listen(0, '127.0.0.1', resolve));
let rejeitouPorta = false;
try { await iniciarServidor({ porta: ocupado.address().port, host: '127.0.0.1' }); } catch { rejeitouPorta = true; }
ocupado.closeAllConnections(); await new Promise(resolve => ocupado.close(resolve));
afirmar(rejeitouPorta, 'porta ocupada é reportada como erro de inicialização');
const servidor = criarServidor();
await new Promise((resolve, reject) => {
  servidor.once('error', reject);
  servidor.listen(0, '127.0.0.1', resolve);
});
const base = 'http://127.0.0.1:' + servidor.address().port;
const requisitar = (rota, opcoes) => fetch(base + rota, opcoes);
const postJson = (rota, dados, headers = {}) => requisitar(rota, {
  method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify(dados),
});

try {
  console.log('1. Rotas públicas');
  let resposta = await requisitar('/v1/saude', { headers: { Origin: 'https://cliente.example' } });
  const saude = await resposta.json();
  afirmar(resposta.status === 200 && saude.estado === 'ok' && resposta.headers.get('access-control-allow-origin') === 'https://cliente.example', 'saúde e CORS configurável');
  afirmar(saude.api === 'v1' && saude.versao === C.programa.versao && saude.biblioteca === LA.VERSAO, 'saúde informa API v1, versão da release e da biblioteca');

  resposta = await requisitar('/v1/openapi.json');
  const api = await resposta.json();
  afirmar(api.openapi === '3.1.0' && api.paths['/v1/conferir'] && api.paths['/v1/saude'], 'OpenAPI 3.1 inclui rotas declaradas');

  resposta = await requisitar('/v1/regras');
  const etag = resposta.headers.get('etag'), regras = await resposta.json();
  afirmar(resposta.status === 200 && regras.length > 0 && !!etag, 'lista de regras retorna ETag');
  resposta = await requisitar('/v1/regras', { headers: { 'If-None-Match': etag } });
  afirmar(resposta.status === 304 && !await resposta.text(), 'ETag condicional responde 304');
  resposta = await requisitar('/v1/regras/f1');
  afirmar(resposta.status === 200 && (await resposta.json()).codigo === 'f1', 'detalhe de regra');
  resposta = await requisitar('/v1/ajuda/conferir');
  afirmar(resposta.status === 200 && (await resposta.text()).includes('lac conferir'), 'ajuda do comando');

  console.log('2. Conferir, ajustar e pedidos');
  const conteudoParidade = '# Título\n\nConteúdo simples.\n';
  resposta = await requisitar('/v1/conferir', { method: 'POST', headers: { 'Content-Type': 'text/markdown', Accept: 'application/json' }, body: conteudoParidade });
  let resultado = await resposta.json();
  const direto = LA.analisar(conteudoParidade);
  afirmar(resposta.status === 200 && JSON.stringify(resultado.diagnosticos) === JSON.stringify(direto.diagnosticos) && resposta.headers.has('linguagem-acessivel-resumo'), 'paridade biblioteca × API, text/markdown e resumo');

  resposta = await postJson('/v1/conferir/f1', { conteudo: 'Uma frase longa sem itens.', tipo: 'apostila' }, { Accept: 'application/x-ndjson' });
  const ndjson = await resposta.text();
  afirmar(resposta.status === 200 && resposta.headers.get('content-type').includes('application/x-ndjson') && (ndjson === '' || ndjson.trim().split('\n').every(x => JSON.parse(x).codigo)), 'seleção de regra e saída NDJSON');

  resposta = await requisitar('/v1/conferir', { method: 'POST', headers: { 'Content-Type': 'text/markdown', Accept: 'application/sarif+json' }, body: '### Título\n\nVeja aqui.\n' });
  resultado = await resposta.json();
  afirmar(resposta.status === 200 && resultado.version === '2.1.0', 'saída SARIF');

  resposta = await postJson('/v1/ajustar', { conteudo: '# Título\n\n### Seção\n' }, { Accept: 'text/markdown' });
  afirmar(resposta.status === 200 && (await resposta.text()).includes('## Seção'), 'ajustar em Markdown');

  resposta = await postJson('/v1/pedidos/simplificar', { nome: 'Curso', trecho: 'Uma solicitação longa.' });
  afirmar(resposta.status === 200 && (await resposta.text()).includes('Uma solicitação longa.'), 'pedido padronizado');

  console.log('3. Erros RFC 9457');
  resposta = await requisitar('/v1/conferir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  let erro = await resposta.json();
  afirmar(resposta.status === 400 && erro.status === 400 && resposta.headers.get('content-type').includes('application/problem+json'), 'JSON inválido retorna 400 RFC 9457');

  resposta = await requisitar('/v1/conferir', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'texto' });
  erro = await resposta.json();
  afirmar(resposta.status === 415 && erro.status === 415, 'tipo não aceito retorna 415');

  resposta = await postJson('/v1/conferir', { conteudo: '# Título', config: { limiteFraseLonga: 2 } });
  erro = await resposta.json();
  afirmar(resposta.status === 422 && erro.status === 422, 'configuração inválida retorna 422');

  resposta = await requisitar('/v1/conferir', { method: 'POST', headers: { 'Content-Type': 'text/markdown' }, body: 'x'.repeat(1024 * 1024 + 1) });
  erro = await resposta.json();
  afirmar(resposta.status === 413 && erro.status === 413, 'corpo maior que 1 MiB retorna 413');

  let recebeu429 = false;
  for (let i = 0; i < 70; i++) {
    resposta = await requisitar('/v1/saude');
    if (resposta.status === 429) { recebeu429 = !!resposta.headers.get('retry-after'); break; }
  }
  afirmar(recebeu429, 'limite de solicitações retorna 429 com Retry-After');
} finally {
  servidor.closeAllConnections();
  await new Promise(resolve => servidor.close(resolve));
}

console.log('\n' + ok + ' verificações aprovadas, ' + falhas + ' falha(s).');
process.exitCode = falhas ? 1 : 0;