# Novidades do lac e da API local

Versão da linha de comando `lac` e da API HTTP local. A biblioteca Linguagem Acessível tem versão própria (`web/lib/linguagem-acessivel/CHANGELOG.md`). Mudanças que quebrem a API `/v1` só entram em uma nova versão principal, com `/v2`.

## Instalador Linux - 10/11/2026

- Instalação por usuário com um comando curl, sem sudo: `tools/lac/instalar.sh`, disponível no branch `main`. Baixa a release publicada 1.0.0, confere SHA-256 e cria os comandos em `~/.local/bin`. Não modifica o shell, instala Node.js ou inicia a API; explica como adicionar a pasta ao PATH.
- Testes Linux cobrem instalação, repetição, espaços no caminho, arquivos e links de terceiros, versão inválida, Node.js antigo e falhas de download/checksum. O pacote das próximas releases também inclui o script. A tag e os arquivos publicados da release 1.0.0 não foram substituídos.

## 1.0.0 - 10/11/2026
Primeira release pública.

- **Linha de comando:** `lac conferir`, `ajustar`, `regras`, `explicar`, `pedido`, `servir`, ajuda e autocompletar para bash e zsh. Lê da entrada (pipe), escreve dados na saída padrão e avisos na saída de erro. Códigos de saída: 0 nada a corrigir, 1 há itens para corrigir, 2 erro de uso, 3 erro interno.
- **Formatos de saída:** `texto`, `json`, `jsonl`, `sarif`, `resumo` e `relatorio` (HTML acessível).
- **API local v1:** `lac servir` abre a API em `127.0.0.1:8787`, com as mesmas rotas, opções e formatos do `lac`. Erros RFC 9457, CORS fechado por padrão (`LAC_CORS_ORIGINS`), `ETag` em `/v1/regras`, corpo de até 1 MiB, limite temporário de solicitações e nenhum conteúdo guardado ou registrado. Especificação OpenAPI 3.1 em `tools/lac/openapi.json` e em `/v1/openapi.json`.
- **Versões:** `lac -v` e `--version` informam a versão do `lac` e da API, da biblioteca e dos pedidos para IA; `--help` equivale a `-h`. `GET /v1/saude` informa `api`, `versao`, `biblioteca` e `pedidos`.
- **Pacote:** `lac-1.0.0.tar.gz` com `SHA256SUMS`, publicado pela tag `lac-v1.0.0`. Só precisa do Node.js 18 ou mais novo, sem dependências.
