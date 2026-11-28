# Inspector Feedback — Iteration 2

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Criterion 1 — verified: a preparação de `web/armazenamento.js` continua incorporada no histórico, sem reset, stash ou limpeza; esta iteração não alterou o arquivo.
- [x] Criterion 2 — verified: a reversão de falha parcial continua coberta pela sonda de armazenamento e pelo teste real em Chrome, que restaurou os wrappers e manteve o modo normal.
- [x] Criterion 3 — verified: o diff preserva `#menuApp`, `#btnMenuApp`, `#btnNews` e `#btnComoFunciona`; em Chrome, Mais opções abriu pelo teclado e Escape fechou o menu devolvendo o foco a `#btnMenuApp`.
- [x] Criterion 4 — verified: em Chrome, `?x=1&anonimo#/apostila` virou `?x=1#/apostila`, preservou query e fragmento, ativou o modo uma vez e voltou ao normal após recarga. Os testes completos preservam a cobertura de `#cx=`.
- [x] Criterion 5 — verified: o grupo 28 passou. Uma falha parcial induzida em Chrome abriu o diálogo, desabilitou 170 controles, focou “Continuar no modo normal” e só restaurou controles e foco após a escolha explícita.
- [x] Criterion 6 — verified: os textos condicionais de `index.html`, `gerados.js`, `historico.js` e `janelas.js` permanecem presentes e esta correção não os removeu.
- [x] Criterion 7 — verified: o grupo 9 comprovou contraste AA e ausência de overflow em 360 px e largura efetiva de 200%. Chrome real confirmou cabeçalho branco no estado normal, preto em alto contraste e `#071d41` no temporário; o botão manteve texto branco sobre `#071d41`, foco visível por teclado e nomes/estados acessíveis.
- [x] Criterion 8 — verified: `bash tools/verificar.sh`, os grupos 28,29,15,20,21,23, o grupo 9 focado e a suíte completa de Chrome passaram; a suíte completa terminou com 395 testes aprovados e nenhuma falha, instabilidade, aviso ou teste pulado.
- [ ] Criterion 9 — FAILED: branch, versão, cache-busters, escopo e quantidade de commits estão corretos, mas o trailer obrigatório do commit Builder é `Assisted-by: OpenAI:GPT.5.6 Luna`; a convenção exige exatamente `Assisted-by: OpenAI:GPT-5.6 Luna`.

## Quality Gate

- Command: `bash tools/verificar.sh`
- Result: PASS
- Details: “VERIFICAÇÃO SEM NAVEGADOR: TUDO CERTO”.
- Command: `python tools/testes/executar_seletivos.py --grupos 28,29,15,20,21,23`
- Result: FAIL
- Details: código 2; o runner informou “Grupos desconhecidos: 15, 20, 21, 23, 28, 29”.
- Command: `powershell -ExecutionPolicy Bypass -File tools/testes/executar-testes.ps1 -Grupos "28,29,15,20,21,23"`
- Result: PASS
- Details: 68 ok, 0 falhas.
- Command: `powershell -ExecutionPolicy Bypass -File tools/testes/executar-testes.ps1 -Grupos "9"`
- Result: PASS
- Details: 34 ok, inclusive os novos testes 9.32 e 9.33.
- Command: `powershell -ExecutionPolicy Bypass -File tools/testes/executar-testes.ps1`
- Result: PASS
- Details: 395 ok, 0 falhas, 0 instáveis, 0 avisos e 0 pulados.

## Issues Found

1. O commit `cf6cad5` não contém o trailer obrigatório exato: usa ponto em `GPT.5.6`, em vez de hífen em `GPT-5.6`.
2. O comando seletivo registrado como quality gate em `goal.md` termina com código 2. O runner Python não reconhece IDs numéricos, embora o runner PowerShell equivalente passe.

As falhas anteriores de contraste do cabeçalho e do botão, cascata de `data-anonimo`, overflow em 360 px e 200% e ausência de testes automatizados específicos foram resolvidas. O diff está restrito a CSS, HTML e testes relacionados; não adiciona dependência nem acesso de rede, preserva os IDs/listeners exigidos e mantém `VERSAO` e cache-busters em `1.134`.

## What Must Be Fixed

1. Corrigir o trailer do commit Builder para o valor obrigatório exato `Assisted-by: OpenAI:GPT-5.6 Luna`, sem criar mais de um commit Builder para a iteração.
2. Fazer o quality gate seletivo documentado em `goal.md` aceitar e executar os grupos `28,29,15,20,21,23`, ou alinhar o runner aplicável sem modificar o `goal.md` imutável.
