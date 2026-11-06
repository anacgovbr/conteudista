import { C } from './ajuda.mjs';

const problema = {
  type: 'object',
  required: ['type', 'title', 'status', 'detail'],
  properties: {
    type: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'integer' },
    detail: { type: 'string' },
    instance: { type: 'string' },
  },
};

const respostaProblema = {
  description: 'Erro no formato RFC 9457.',
  content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problema' } } },
};

function caminhoApi(caminho) {
  return caminho.replace(/\[\/\{([^}]+)\}\]/g, '/{$1}');
}

function parametros(caminho) {
  return [...caminho.matchAll(/\{([^}]+)\}/g)].map(m => ({
    name: m[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
}

function operacao(comando, rota) {
  const metodo = rota.metodo.toLowerCase();
  const entrada = ['POST', 'PUT', 'PATCH'].includes(rota.metodo);
  const tiposEntrada = comando.id === 'ajustar'
    ? ['text/markdown', 'application/json']
    : ['text/markdown', 'application/json'];
  const saidas = comando.id === 'conferir'
    ? ['application/json', 'application/x-ndjson', 'application/sarif+json', 'text/plain', 'text/html']
    : comando.id === 'ajustar'
      ? ['text/markdown', 'application/json']
      : ['application/json', 'text/plain'];
  const respostas = { '200': { description: comando.descricao } };
  if (comando.id === 'conferir') respostas['200'].headers = {
    'Linguagem-Acessivel-Resumo': { description: 'Contagem de itens para corrigir e sugestões.', schema: { type: 'string' } },
  };
  for (const status of ['400', '404', '413', '415', '422', '429', '500']) respostas[status] = respostaProblema;
  const o = {
    operationId: comando.id + (rota.sufixo || ''),
    summary: comando.resumo,
    description: comando.descricao,
    parameters: parametros(rota.caminho),
    responses: respostas,
  };
  if (entrada) {
    const schema = comando.id === 'pedido' ? 'PedidoEntrada' : 'Entrada';
    o.requestBody = {
      required: true,
      content: {
        [tiposEntrada[0]]: { schema: { type: 'string' } },
        [tiposEntrada[1]]: { schema: { $ref: '#/components/schemas/' + schema } },
      },
    };
  }
  respostas['200'].content = Object.fromEntries(saidas.map(tipo => [tipo, { schema: tipo === 'application/json' ? { type: 'object' } : { type: 'string' } }]));
  return [metodo, o];
}

export function documentoOpenApi() {
  const paths = {};
  for (const comando of C.comandos) {
    if (!comando.api) continue;
    const original = comando.api.caminho;
    const opcionais = [...original.matchAll(/\[\/\{([^}]+)\}\]/g)];
    const base = original.replace(/\[\/\{[^}]+\}\]/g, '');
    const rotas = [{ caminho: base }];
    for (const match of opcionais) rotas.push({ caminho: base + '/{' + match[1] + '}', sufixo: 'Por' + match[1][0].toUpperCase() + match[1].slice(1) });
    for (const rota of rotas) {
      const caminho = caminhoApi(rota.caminho);
      const [metodo, op] = operacao(comando, Object.assign({}, rota, { metodo: comando.api.metodo }));
      paths[caminho] = Object.assign(paths[caminho] || {}, { [metodo]: op });
    }
  }
  for (const rota of C.api.rotasSistemicas) {
    const metodo = rota.metodo.toLowerCase();
    paths[rota.caminho] = Object.assign(paths[rota.caminho] || {}, {
      [metodo]: {
        operationId: rota.caminho.split('/').pop().replace(/\.json$/, '') || 'saude',
        summary: rota.descricao,
        responses: { '200': { description: rota.descricao, content: { 'application/json': { schema: { type: 'object' } } } } },
      },
    });
  }
  return {
    openapi: C.api.openapi,
    info: { title: C.programa.titulo + ' API', version: C.api.versao, description: C.programa.descricao },
    servers: [{ url: '/' }],
    paths,
    components: {
      schemas: {
        Entrada: {
          type: 'object',
          required: ['conteudo'],
          properties: {
            conteudo: { type: 'string' },
            tipo: { type: 'string', enum: ['auto', 'apostila', 'apresentacao'] },
            config: { type: 'object' },
          },
        },
        PedidoEntrada: {
          type: 'object',
          properties: {
            nome: { type: 'string' },
            conteudo: { type: 'string', description: 'Texto de contexto para o pedido.' },
            contexto: { type: 'string' },
            trecho: { type: 'string' },
            legenda: { type: 'string' },
          },
        },
        Problema: problema,
      },
    },
  };
}