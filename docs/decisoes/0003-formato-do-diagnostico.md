# 0003 · Formato do diagnóstico e contagem de posições

**Estado:** aceita (biblioteca 0.1.0)

**Decisão.** O diagnóstico segue `web/lib/linguagem-acessivel/esquema/diagnostico.schema.json`, o mesmo formato na biblioteca, na linha de comando e na API.

- `regra` (nome) e `codigo` (letra do grupo + número) nunca mudam depois de publicados.
- `inicio`/`fim`: índices em unidades UTF-16, `fim` exclusivo, porque é o que o editor (JavaScript) usa.
- `linha`/`coluna`: começam em 1; a coluna conta **pontos de código**, para que sistemas em outras linguagens não errem com acentos ou emojis.
- `correcoes[]`: com `edicoes` (substituições de texto, que preservam o desfazer do editor) ou com `acao` (precisa de uma pessoa). `segura: true` marca a correção que não muda o sentido e pode ser aplicada sem revisão.
- Encontrar problemas não é erro: a análise funcionou. Na API, isso é HTTP 200; na linha de comando, código de saída 1.

**Consequências.** Mudar o formato ou um código de regra é mudança incompatível: versão maior da biblioteca e, na API, nova versão de caminho (`/v2`).
