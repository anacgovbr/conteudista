# Linguagem Acessível · versões

Segue versionamento semântico. Mudar o id ou o código de uma regra, ou o formato do diagnóstico, é mudança incompatível (versão maior). Regra nova entra como versão menor.

## 0.2.0 - 05/11/2026
- Oito regras novas. Para corrigir: `i2` descrição que não descreve, `e2` slide sem título e `e3` tabela sem cabeçalho. Sugestões: `f1` frase longa (mais de 25 palavras), `f2` parágrafo longo (mais de 100 palavras), `f3` texto em maiúsculas, `s1` sigla sem explicação na primeira vez e `n1` frase longa na narração.
- Glossário de siglas (`dados/siglas.js`): nome completo para "Explicar" com um clique e lista de siglas conhecidas que dispensam explicação. Cada conteúdo pode acrescentar siglas por `config.siglas`.
- Pedidos padronizados para IA, versão 1.0 (`pedidos.js`): `montarPedido('descrever' | 'simplificar')`, `lerRespostaDescricao` e `lerRespostaSimplificar`.
- `aplicarSeguras` devolve também a lista do que foi aplicado. `textos()` expõe os rótulos de níveis, grupos e áreas.
- Novos limites em `config`: `limiteFraseNarracao` e `limiteParagrafo`.
- Linha de comando `lac` (em `tools/lac/`), sobre esta mesma biblioteca.

## 0.1.0 - 05/11/2026
- Núcleo da biblioteca: `analisar`, `aplicar`, `aplicarSeguras`, `criarSessao` (cache por bloco), `selecionar`, `agrupar` e `regras`.
- Analisador de Markdown com posições (títulos, parágrafos, listas, tabelas, código, comentários, cabeçalho e slides).
- Divisão de frases em português (abreviações, números, reticências, endereços e itens de lista).
- Primeiras regras: `i1` imagem-sem-descricao, `e1` titulo-pula-nivel e `k1` link-vago.
- Marcadores no texto: `ignorar`, `ignorar-documento` e `decorativa`.
- Contrato do diagnóstico em JSON Schema (`esquema/`), o mesmo da linha de comando (`lac`) e da API.
