# 0006 · Regras de linguagem simples como sugestão; glossário de siglas

**Estado:** aceita (biblioteca 0.2.0)

**Contexto.** A Lei 15.263/2025 (Política Nacional de Linguagem Simples) pede frases curtas, ordem direta e siglas explicadas, mas não fixa números. Texto técnico gera muitos avisos, e avisos demais fazem o autor ignorar todos.

**Decisão.**
- Todas as regras de linguagem (`f1`, `f2`, `f3`, `s1`, `n1`) são **sugestões**: não contam como erro, não mudam o código de saída do `lac` e não bloqueiam a publicação.
- Limites ajustáveis: 25 palavras por frase (decisão F), 25 na narração e 100 por parágrafo.
- Siglas: só a **primeira** ocorrência no texto corrido é cobrada; o título não conta. Ficam de fora numerais romanos, palavras com acento e palavras comuns escritas em maiúsculas para ênfase ("NÃO"), além das siglas conhecidas (formatos de arquivo, CPF etc.).
- O glossário (`dados/siglas.js`) é um arquivo de dados, mantido por quem conhece o assunto. Ele alimenta o "Explicar" com um clique. Cada conteúdo pode acrescentar siglas pela configuração.
- Nenhuma correção de linguagem é "segura": todas precisam de uma pessoa. Converter maiúsculas e explicar siglas oferecem a edição pronta, mas a pessoa decide.

**Consequências.** Uma regra de linguagem só passa a "para corrigir" depois de testada em conteúdo real, com registro de nova decisão.
