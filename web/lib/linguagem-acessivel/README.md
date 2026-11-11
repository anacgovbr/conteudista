# Linguagem Acessível

Biblioteca que confere **acessibilidade** e **linguagem simples** em textos Markdown. É usada pelo Conteudista, pela linha de comando `lac` (`tools/lac/`) e, na etapa 11, pela API. Sem dependências: roda no navegador (como módulo), em Web Worker e no Node 18 ou mais novo.

## Uso

```js
import { analisar, aplicar, aplicarSeguras, criarSessao, montarPedido } from './lib/linguagem-acessivel/index.js';

const r = analisar(texto, { tipo: 'auto', regras: ['a'], nivel: 'c' });
// r = { versao, tipo, resumo: { corrigir, sugestoes, total }, diagnosticos: [...] }

const d = r.diagnosticos[0];
const c = d.correcoes.find(x => x.edicoes);   // correção em um clique
if (c) texto = aplicar(texto, c);

const s = criarSessao();                       // no editor: as regras de bloco só rodam no que mudou
s.analisar(texto);

const pedido = montarPedido('simplificar', { nome: 'Curso X', trecho: '...' });   // para colar na IA
```

| Opção | Valores |
|---|---|
| `tipo` | `auto` (padrão), `apostila`, `apresentacao` |
| `regras` | área (`a`, `l`), grupo (`i`, `e`, `k`, `f`, `s`, `n`), código (`i1`) ou nome (`link-vago`); vazio = todas |
| `nivel` | `corrigir` / `c` ou `sugestao` / `s` |
| `config` | `{ limiteFraseLonga, limiteFraseNarracao, limiteParagrafo, sugestoes, regras, siglas, siglasConhecidas }` |

## Regras

| Código | Regra | Nível |
|---|---|---|
| `i1` | Imagem sem descrição | Para corrigir |
| `i2` | Descrição que não descreve | Para corrigir |
| `e1` | Título que pula nível | Para corrigir |
| `e2` | Slide sem título (só apresentação) | Para corrigir |
| `e3` | Tabela sem cabeçalho | Para corrigir |
| `k1` | Link que não diz aonde leva | Para corrigir |
| `f1` | Frase longa | Sugestão |
| `f2` | Parágrafo longo | Sugestão |
| `f3` | Texto em maiúsculas | Sugestão |
| `s1` | Sigla sem explicação | Sugestão |
| `n1` | Frase longa na narração | Sugestão |
| `i3` | Descrição longa (mais de 150 caracteres) | Sugestão |
| `i4` | Descrição que começa com "imagem de" | Sugestão |
| `e4` | Título vazio | Sugestão |
| `e5` | Mais de um título de nível 1 (só apostila) | Sugestão |
| `k2` | Links iguais para lugares diferentes | Sugestão |
| `k3` | Link para arquivo sem o formato | Sugestão |

Detalhes e exemplos: `docs/linguagem-acessivel/`.

## Contrato

O formato do diagnóstico está em `esquema/diagnostico.schema.json`. Pontos principais:

- `inicio`/`fim`: índices do texto em unidades UTF-16 (o mesmo que `slice` no JavaScript); `fim` é exclusivo.
- `linha`/`coluna`: começam em 1; a coluna conta **pontos de código** (um emoji conta 1).
- `correcoes[]`: com `edicoes` (aplicável por `aplicar`) ou com `acao` (precisa de uma pessoa). `segura: true` não muda o sentido.

## Estrutura

```
index.js            API pública
nucleo/             analisador (Markdown -> blocos), frases, posições, marcadores
regras/             uma regra por arquivo + registro (regras/index.js)
mensagens/pt-BR.js  textos para quem escreve (revisáveis sem mexer no código)
dados/siglas.js     glossário de siglas e siglas conhecidas
pedidos.js          pedidos padronizados para IA e leitura das respostas
config/padrao.js    limites e regras ligadas
esquema/            JSON Schema do diagnóstico e do resultado
```

Testes: `node tools/linguagem-acessivel/testar.mjs`. Decisões de projeto: `docs/decisoes/`.

## Regra nova

1. Crie `regras/<nome>.js` com `id`, `codigo`, `area`, `grupo`, `nivel`, `escopo`, `referencia`, `exemplos` e `verificar`.
2. Registre em `regras/index.js` e escreva os textos em `mensagens/pt-BR.js`.
3. Rode `node tools/linguagem-acessivel/gerar_docs.mjs` e `node tools/linguagem-acessivel/testar.mjs`.
4. Regra nova entra como **sugestão**; só passa a "para corrigir" depois de testada em conteúdo real.
