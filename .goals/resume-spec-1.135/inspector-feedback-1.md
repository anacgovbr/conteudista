# Inspector Feedback — Iteration 1

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Criterion 1 — verified: a alteração preparatória de `web/armazenamento.js` foi incorporada deliberadamente no commit `55110a2`; não há evidência de reset, stash ou limpeza no diff inspecionado.
- [x] Criterion 2 — verified: `substituir()` registra apenas descritores próprios tocados e a reversão restaura o descritor próprio anterior ou remove a propriedade criada. A sonda Node de falha parcial passou.
- [x] Criterion 3 — verified: `#menuApp`, `#btnMenuApp`, `#btnNews` e `#btnComoFunciona` permanecem no DOM. Smoke real confirmou o listener de `#btnMenuApp` e a abertura do diálogo de `#btnComoFunciona`.
- [x] Criterion 4 — verified: em Chrome real, `?x=1&anonimo#/apostila` virou `?x=1#/apostila`, ativou o modo uma vez e preservou query/hash. A sonda Node cobriu `#cx=abc`; a limpeza de `#cx=` agora preserva `location.search`.
- [x] Criterion 5 — verified: grupos 28 e teste focado comprovaram isolamento, duas abas, recarga, saída e ausência de persistência. Falha parcial real abriu bloqueio modal com 170 controles desabilitados; a escolha explícita “Continuar no modo normal” restaurou os controles e o foco.
- [x] Criterion 6 — verified: os textos condicionais foram atualizados em `index.html`, `gerados.js`, `historico.js` e `janelas.js`.
- [ ] Criterion 7 — FAILED: o controle novo tem contraste 1,00:1 no modo normal e a página apresenta rolagem horizontal mensurável em 360 px e em largura efetiva equivalente a zoom de 200%.
- [ ] Criterion 8 — FAILED: os gates automatizados passaram, mas os testes focados reais obrigatórios de cor e responsividade reprovaram; portanto, a etapa não satisfaz o conjunto de testes de aceite.
- [x] Criterion 9 — verified: branch `versao-1.135`; `VERSAO` e todos os cache-busters continuam em `1.134`; há um único commit Builder nesta iteração, convencional e com o trailer exigido.

## Quality Gate

- Command: `bash tools/verificar.sh`
- Result: PASS
- Details: código 0, “VERIFICAÇÃO SEM NAVEGADOR: TUDO CERTO”.
- Command: `powershell -ExecutionPolicy Bypass -File tools/testes/executar-testes.ps1 -Grupos "28,29,15,20,21,23"`
- Result: PASS
- Details: 68 ok, 0 falhas, Chrome 158.
- Command: `powershell -ExecutionPolicy Bypass -File tools/testes/executar-testes.ps1`
- Result: PASS
- Details: 392 ok, 0 falhas, 0 instáveis, 0 avisos e 0 pulados.

## Issues Found

1. **Contraste impossível de perceber no controle Temporário.** Em modo normal, o Chrome calculou texto branco `rgb(255,255,255)` e fundo transparente sobre cabeçalho branco `rgb(255,255,255)`: contraste **1,00:1**. A regra nova perde para `body > header { background:#fff!important }` em `govbr.css`. O botão fica visualmente branco sobre branco, embora mantenha nome acessível.
2. **Modo temporário não aplica a cor planejada ao cabeçalho.** Mesmo com `data-anonimo` presente, o cabeçalho continuou branco pelo mesmo `!important`; a regra `html[data-anonimo] header` não vence a cascata.
3. **Rolagem horizontal em 360 px e 200%.** Com viewport de 360 px, `documentElement.clientWidth` foi 345 e `scrollWidth` 655: **310 px de overflow**. Em largura efetiva de 180 px, usada para verificar 200%, o overflow foi **490 px**. Entre os contribuintes medidos estão `#statusAnonimo` (`scrollWidth` 473), `#promptIA` (`scrollWidth` 598) e `#boasVindas` (`scrollWidth` 611). Isso viola diretamente o critério de aceite.

## What Must Be Fixed

1. Corrigir a cascata do cabeçalho e definir cores do botão nos estados normal e temporário; comprovar contraste WCAG AA com medição.
2. Fazer o estado temporário aplicar de fato o fundo `#071D41` sem regressão no cabeçalho normal.
3. Eliminar o overflow horizontal do aplicativo em 360 px e em zoom 200%, incluindo a região visualmente oculta `#statusAnonimo` e o conteúdo de boas-vindas.
4. Adicionar testes automatizados específicos para contraste/estado visual do novo botão e para `scrollWidth <= clientWidth` na página principal em 360 px e 200%.
