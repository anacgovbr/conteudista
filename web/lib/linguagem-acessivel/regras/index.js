/* Registro das regras. Regra nova: um arquivo em regras/, um item aqui e os textos em mensagens/pt-BR.js.
   O código (letra do grupo + número) e o id nunca mudam depois de publicados (mudar é incompatível). */
import imagemSemDescricao from './imagem-sem-descricao.js';
import tituloPulaNivel from './titulo-pula-nivel.js';
import linkVago from './link-vago.js';

export const REGRAS = Object.freeze([imagemSemDescricao, tituloPulaNivel, linkVago]);

// Áreas e grupos (letra única em todo o conjunto, para os atalhos)
export const AREAS = Object.freeze({ a: 'acessibilidade', l: 'linguagem' });
export const GRUPOS = Object.freeze({
  i: { id: 'imagens', area: 'acessibilidade' }, e: { id: 'estrutura', area: 'acessibilidade' }, k: { id: 'links', area: 'acessibilidade' },
  f: { id: 'frases', area: 'linguagem' }, s: { id: 'siglas', area: 'linguagem' }, n: { id: 'narracao', area: 'linguagem' },
});
