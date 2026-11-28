# Goal: Retomar a SPEC Conteudista 1.135

## User Request

“/copilot-goal-skill:goal [HANDOFF_Conteudista_1.135_atualizado.md] retome a implementação da SPEC conforme os arquivos anexos. Tanto da SPEC quanto da implementação que estava sendo feita.”

## Refined Goal

Retomar a implementação da versão 1.135 no checkout real a partir do estado comprovado no handoff: preservar a alteração não commitada existente em `web/armazenamento.js`, concluir a etapa preparatória de isolamento parcial do modo temporário e integrar o modo temporário ao cabeçalho na fase 2a da SPEC. A entrega deve manter o menu Mais opções, as rotas existentes e o armazenamento normal e temporário funcionando, sem introduzir persistência em modo temporário nem quebrar a acessibilidade WCAG 2.2 AA.

## Acceptance Criteria

- [ ] Criterion 1: O worktree é tratado sem reset, stash, limpeza ou perda da alteração pendente em `web/armazenamento.js`; a alteração é preservada ou incorporada de forma deliberada.
- [ ] Criterion 2: Na instalação dos wrappers, registram-se os descritores próprios efetivamente tocados; em falha parcial, restauram-se os descritores originais próprios ou removem-se as propriedades próprias criadas quando antes eram herdadas.
- [ ] Criterion 3: A interface expõe um controle de modo temporário no cabeçalho sem substituir nem remover `#menuApp`, `#btnMenuApp`, `#btnNews`, `#btnComoFunciona` ou seus listeners.
- [ ] Criterion 4: `?anonimo` preserva compatibilidade com query e fragmento existentes, inicia o uso temporário uma única vez por carga e não reativa o modo após recarga quando o pedido não estiver presente; `#cx=` continua funcionando.
- [ ] Criterion 5: Falha do isolamento bloqueia edição/importação até escolha explícita de continuar no modo normal; uma sessão temporária bem-sucedida não mostra persistência ativa e não cria novos registros persistentes em IndexedDB ou localStorage.
- [ ] Criterion 6: Rótulos e avisos distinguem dados persistentes de dados mantidos apenas durante a sessão em `index.html`, `gerados.js`, `historico.js` e `janelas.js`, sem remover textos ou controles necessários.
- [ ] Criterion 7: Navegação por teclado, foco, nomes acessíveis, foco visível, estados ativos, regiões `aria-live` e alvos de toque atendem WCAG 2.2 AA; não há rolagem horizontal em 360 px nem em zoom 200%.
- [ ] Criterion 8: Testes afetados passam: grupo de armazenamento, suíte seletiva da fase 2a, `bash tools/verificar.sh`, suíte completa de navegador ao fim da etapa e testes manuais reais de entrada, falha parcial, recarga, saída, duas abas e ausência de gravação persistente.
- [ ] Criterion 9: O branch permanece `versao-1.135`, a versão e os cache-busters permanecem em `1.134` até a release planejada e as mudanças recebem um único commit convencional desta iteração.

## Scope Boundaries

**In scope:**
- Concluir a preparação do isolamento temporário descrita no handoff.
- Integrar o modo temporário ao cabeçalho e aos avisos da interface relacionados.
- Ajustar compatibilidade de URL, fragmentos, histórico e modo temporário.
- Atualizar testes e documentação diretamente relacionados à fase 2a.
- Executar gates estáticos e de navegador aplicáveis.

**Out of scope:**
- Motor Python/Pyodide e formatos de saída.
- Biblioteca `linguagem-acessivel` e regras de conferência.
- Estrutura de dados de `opcoes.yaml`, exceto apresentação em Preferências.
- Escuro automático definitivo, início por tipo, migalhas, novos subcontextos e folha de link já atribuídos às fases seguintes.
- Mover `#secShare` e seus controles até existir substituição funcional.
- Busca ou limite do histórico de gerações; manutenção do limite atual.
- Publicação, push ou alteração da versão pública para 1.135.

## Applicable Project Conventions

**Quality gate command:**
- `bash tools/verificar.sh`
- `python tools/testes/executar_seletivos.py --grupos 28,29,15,20,21,23` para a fase de preparação
- `python tools/testes/executar-testes.ps1` para a suíte completa ao final da fase

**Commit convention:**
- O projeto usa commits convencionais recentes como `feat(escopo):` e `fix(escopo):`.
- Para a iteração do Goal, título do Builder: `feat(escopo): [B] descricao`
- Assisted-by trailer obrigatório: `Assisted-by: OpenAI:GPT-5.6 Luna`

**Guidelines:**
- Nenhum `AGENTS.md`, `CONSTITUTION.md`, `.agents/` ou `.github/guidelines/` foi encontrado no checkout.
- [SPEC-conteudista-1.135.md](../../../../../../Downloads/SPEC-conteudista-1.135.md)
- [HANDOFF_Conteudista_1.135_atualizado.md](../../../../../../Downloads/HANDOFF_Conteudista_1.135_atualizado.md)

**Rules:**
- Preservar alterações existentes; não executar reset, stash ou limpeza.
- Não alterar o motor Python/Pyodide, a biblioteca de linguagem acessível ou os formatos de saída.
- Preservar IDs e listeners existentes, incluindo `#go`, `#btnHistorico`, `#log`, `#menuApp`, `#btnMenuApp`, `#btnNews`, `#btnComoFunciona` e os controles de link.
- Manter BOM, UTF-8 e finais de linha por arquivo; não ampliar dependências ou rede.
- WCAG 2.2 AA e NBR 17225 devem ser preservados.
