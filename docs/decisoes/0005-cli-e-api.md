# 0005 · Linha de comando `lac` e API com o mesmo modelo

**Estado:** aceita. Linha de comando entregue com a biblioteca 0.2.0 (`tools/lac/`); API na etapa 11.

**Decisão.** A linha de comando (`linguagem-acessivel`, atalho `lac`, decisão H) e a API são camadas finas sobre a biblioteca, com os mesmos comandos, opções, atalhos de uma letra e formatos de saída (`texto`, `json`, `jsonl`, `sarif`, `resumo`). A ajuda de ambas sai de um único `tools/lac/comandos.json`, que também gera o manual (`lac.1`), o autocompletar e `docs/lac.md`. Saída padrão no terminal: `texto`, com "corrigir" e "sugestão" escritos por extenso (decisão I).

**Comportamento de ferramenta Unix.** Sem arquivo, lê da entrada (pipe); sem pipe, mostra a ajuda curta em vez de ficar esperando. Dados na saída padrão; avisos e erros na saída de erro. Códigos de saída: 0 nada a corrigir, 1 há itens para corrigir, 2 erro de uso, 3 erro interno. Cores só no terminal e sem `NO_COLOR`. Nenhum comando abre conexão de rede (o `servir`, da etapa 11, será o único).

**API (etapa 11).** Rotas iguais aos comandos (`POST /v1/conferir[/{seleção}]`, `/v1/ajustar`, `GET /v1/regras`…), `/v1` no caminho, erros no formato RFC 9457, sem guardar o conteúdo. Encontrar problemas no texto não é erro: HTTP 200. O Conteudista não depende da API.

**Consequências.** Os testes conferem que `lac c -f json` devolve exatamente o resultado da biblioteca e que a ajuda do terminal é a gerada de `comandos.json`. Na etapa 11, um teste comparará a resposta da API com a do `lac` para o mesmo texto.
