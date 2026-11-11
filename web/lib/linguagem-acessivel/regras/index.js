/* Registro das regras. Regra nova: um arquivo em regras/, um item aqui e os textos em mensagens/pt-BR.js.
   O código (letra do grupo + número) e o id nunca mudam depois de publicados (mudar é incompatível). */
import imagemSemDescricao from './imagem-sem-descricao.js';
import descricaoVaga from './descricao-vaga.js';
import tituloPulaNivel from './titulo-pula-nivel.js';
import slideSemTitulo from './slide-sem-titulo.js';
import tabelaSemCabecalho from './tabela-sem-cabecalho.js';
import linkVago from './link-vago.js';
import fraseLonga from './frase-longa.js';
import paragrafoLongo from './paragrafo-longo.js';
import textoEmMaiusculas from './texto-em-maiusculas.js';
import siglaSemExplicacao from './sigla-sem-explicacao.js';
import narracaoFraseLonga from './narracao-frase-longa.js';
import descricaoLonga from './descricao-longa.js';
import descricaoRedundante from './descricao-redundante.js';
import tituloVazio from './titulo-vazio.js';
import tituloPrincipal from './titulo-principal.js';
import linksAmbiguos from './links-ambiguos.js';
import linkArquivoSemFormato from './link-arquivo-sem-formato.js';

export const REGRAS = Object.freeze([imagemSemDescricao, descricaoVaga, tituloPulaNivel, slideSemTitulo, tabelaSemCabecalho, linkVago,
  fraseLonga, paragrafoLongo, textoEmMaiusculas, siglaSemExplicacao, narracaoFraseLonga,
  descricaoLonga, descricaoRedundante, tituloVazio, tituloPrincipal, linksAmbiguos, linkArquivoSemFormato]);

// Áreas e grupos (letra única em todo o conjunto, para os atalhos)
export const AREAS = Object.freeze({ a: 'acessibilidade', l: 'linguagem' });
export const GRUPOS = Object.freeze({
  i: { id: 'imagens', area: 'acessibilidade' }, e: { id: 'estrutura', area: 'acessibilidade' }, k: { id: 'links', area: 'acessibilidade' },
  f: { id: 'frases', area: 'linguagem' }, s: { id: 'siglas', area: 'linguagem' }, n: { id: 'narracao', area: 'linguagem' },
});
