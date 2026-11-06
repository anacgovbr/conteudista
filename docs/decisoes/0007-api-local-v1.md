# Decisão 0007: API local da Linguagem Acessível v1

- **Estado:** aceita
- **Data:** 05/11/2026
- **Escopo:** implementação do servidor HTTP local `lac servir`.

## Decisão

A primeira versão roda no próprio computador e usa o módulo HTTP nativo do Node.js. Por padrão, escuta somente em `127.0.0.1`; `LAC_HOST` permite escolher explicitamente outro endereço. A porta padrão é `8787`, alterável por `-p`.

O servidor não persiste nem registra o conteúdo recebido. O corpo tem limite de 1 MiB, há limitação temporária de solicitações por endereço, os erros seguem RFC 9457, e o CORS nega origens por padrão. Para liberar origens, use `LAC_CORS_ORIGINS` com uma lista separada por vírgulas.

OpenAPI 3.1 é gerado em `tools/lac/openapi.json` a partir de `tools/lac/comandos.json`, que também alimenta ajuda, man page e completadores. Hospedagem compartilhada e autenticação institucional continuam sob decisão da TI e não são habilitadas por esta API local.

## Consequências

- A API usa a mesma biblioteca e opções do editor e do `lac`.
- `/v1/regras` usa `ETag` para cache condicional.
- Problemas encontrados no texto retornam HTTP 200; erros da solicitação retornam `application/problem+json`.
- A API não inicia até a pessoa executar `lac servir`.
