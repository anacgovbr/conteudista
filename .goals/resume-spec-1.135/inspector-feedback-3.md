# Inspector Feedback — Iteration 3

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Criterion 1 — verified: a preparação de `web/armazenamento.js` permanece incorporada no histórico; o worktree atual não mostra perda, reset, stash ou limpeza dessa alteração.
- [x] Criterion 2 — verified: a reversão de falha parcial permanece implementada e coberta pelos testes de armazenamento e navegador aprovados.
- [x] Criterion 3 — verified: `#menuApp`, `#btnMenuApp`, `#btnNews` e `#btnComoFunciona`, seus comportamentos e a integração do controle temporário permanecem cobertos pela suíte completa.
- [x] Criterion 4 — verified: os grupos 28 e 29 passaram, cobrindo entrada única por `?anonimo`, recarga, compatibilidade de query/fragmento, rotas e `#cx=`.
- [x] Criterion 5 — verified: o grupo 28 passou integralmente, incluindo isolamento entre abas, descarte na recarga/saída e ausência de gravação persistente.
- [x] Criterion 6 — verified: os rótulos condicionais continuam presentes em `index.html`, `gerados.js`, `historico.js` e `janelas.js`.
- [x] Criterion 7 — verified: a suíte completa passou, inclusive os testes focados de contraste, foco, nomes/estados acessíveis, axe-core, alvos e ausência de overflow em larguras estreitas/zoom.
- [x] Criterion 8 — verified: o seletivo Python documentado passou com 68 testes; `bash tools/verificar.sh` passou; a suíte completa de navegador passou com 395 testes e nenhuma falha, instabilidade, aviso ou teste pulado.
- [ ] Criterion 9 — FAILED: branch, versão, cache-busters, escopo e o trailer de `8d7bdf0` estão corretos, mas o commit Builder anterior `cf6cad5` continua no histórico com `Assisted-by: OpenAI:GPT.5.6 Luna`. Sem reescrita, as mudanças do Goal ainda não possuem exclusivamente o trailer obrigatório exato.

## Quality Gate

- Command: `python tools/testes/executar_seletivos.py --grupos 28,29,15,20,21,23`
- Result: PASS
- Details: 68 ok, 0 falhas.
- Command: `bash tools/verificar.sh`
- Result: PASS
- Details: “VERIFICAÇÃO SEM NAVEGADOR: TUDO CERTO”.
- Command: `powershell -ExecutionPolicy Bypass -File tools/testes/executar-testes.ps1`
- Result: PASS
- Details: 395 ok, 0 falhas, 0 instáveis, 0 avisos e 0 pulados.
- Command: `python tools/testes/testar_seletivos.py`
- Result: PASS
- Details: 6 testes aprovados.

## Issues Found

1. O commit `8d7bdf0` contém exatamente `Assisted-by: OpenAI:GPT-5.6 Luna`, e o ajuste do runner funciona. Entretanto, `cf6cad5`, que contém as correções visuais desta mesma entrega, permanece com `Assisted-by: OpenAI:GPT.5.6 Luna`. Um commit posterior correto não corrige metadados de um commit anterior.
2. O estado funcional final está aprovado: as falhas anteriores de contraste, responsividade, armazenamento, URL, acessibilidade e execução do seletivo Python estão resolvidas. A única reprovação remanescente é a convenção histórica exigida pelo critério 9.

## What Must Be Fixed

1. Corrigir no histórico o trailer de `cf6cad5` para exatamente `Assisted-by: OpenAI:GPT-5.6 Luna`, preservando o conteúdo funcional e a convenção de commits exigida pelo Goal.
