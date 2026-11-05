# Linguagem Acessível

Biblioteca que confere **acessibilidade** e **linguagem simples** em textos Markdown. É usada pelo Conteudista e, nas próximas etapas, pela linha de comando `lac` e pela API. Sem dependências: roda no navegador (como módulo), em Web Worker e no Node 18 ou mais novo.

## Uso

```js
import { analisar, aplicar, aplicarSeguras, criarSessao } from './lib/linguagem-acessivel/index.js';

const r = analisar(texto, { tipo: 'auto', regras: ['a'], nivel: 'c' });
// r = { versao, tipo, resumo: { corrigir, sugestoes, total }, diagnosticos: [...] }

const d = r.diagnosticos[0];
const c = d.correcoes.find(x => x.edicoes);   // correção em um clique
if (c) texto = aplicar(texto, c);

const s = criarSessao();                       // no editor: reanalisa só o parágrafo que mudou
s.analisar(texto);
```

| Opção | Valores |
|---|---|
| `tipo` | `auto` (padrão), `apostila`, `apresentacao` |
| `regras` | área (`a`, `l`), grupo (`i`, `e`, `k`, `f`, `s`, `n`), código (`i1`) ou nome (`link-vago`); vazio = todas |
| `nivel` | `corrigir` / `c` ou `sugestao` / `s` |
| `config` | `{ limiteFraseLonga, sugestoes, regras: { 'link-vago': false \| 'sugestao' } }` |

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
config/padrao.js    limites e regras ligadas
esquema/            JSON Schema do diagnóstico e do resultado
```

Regras e marcadores: `docs/linguagem-acessivel/`. Decisões de projeto: `docs/decisoes/`. Testes: `node tools/linguagem-acessivel/testar.mjs`.

## Regra nova

1. Crie `regras/<nome>.js` com `id`, `codigo`, `area`, `grupo`, `nivel`, `escopo`, `referencia`, `exemplos` e `verificar`.
2. Registre em `regras/index.js` e escreva os textos em `mensagens/pt-BR.js`.
3. Rode `node tools/linguagem-acessivel/gerar_docs.mjs` e `node tools/linguagem-acessivel/testar.mjs`.
4. Regra nova entra como **sugestão**; só passa a "para corrigir" depois de testada em conteúdo real.
