# 0005 · Linha de comando `lac` e API com o mesmo modelo

**Estado:** aceita e implementada na entrega 1.89. Linha de comando (`tools/lac/`) e API HTTP local v1 usam a biblioteca 0.3.0.

**Decisão.** A linha de comando (`linguagem-acessivel`, atalho `lac`, decisão H) e a API são camadas finas sobre a biblioteca, com os mesmos comandos, opções, atalhos de uma letra e formatos de saída (`texto`, `json`, `jsonl`, `sarif`, `resumo`, `relatorio`). A ajuda de ambas sai de um único `tools/lac/comandos.json`, que também gera o manual (`lac.1`), o autocompletar, `docs/lac.md` e `openapi.json`. Saída padrão no terminal: `texto`, com "corrigir" e "sugestão" escritos por extenso (decisão I).

**Comportamento de ferramenta Unix.** Sem arquivo, lê da entrada (pipe); sem pipe, mostra a ajuda curta em vez de ficar esperando. Dados na saída padrão; avisos e erros na saída de erro. Códigos de saída: 0 nada a corrigir, 1 há itens para corrigir, 2 erro de uso, 3 erro interno. Cores só no terminal e sem `NO_COLOR`. Apenas `lac servir` abre o servidor quando solicitado.

**API v1.** Rotas iguais aos comandos (`POST /v1/conferir[/{seleção}]`, `/v1/ajustar`, `GET /v1/regras`…), `/v1` no caminho, erros RFC 9457, sem persistir nem registrar conteúdo. Corpo máximo 1 MiB, limite temporário de solicitações, ETag para regras e CORS negado por padrão. O servidor só escuta em `127.0.0.1` por padrão; configuração institucional e hospedagem seguem fora do código.

**Consequências.** Os testes conferem paridade de `lac` e API, os formatos, o OpenAPI gerado, os erros RFC 9457, o ETag, o CORS e os limites.
