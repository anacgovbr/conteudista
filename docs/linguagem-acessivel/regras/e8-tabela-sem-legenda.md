# Tabela sem legenda (`e8`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `tabela-sem-legenda`
- **Área e grupo:** Acessibilidade › Estrutura
- **Nível:** Sugestão
- **Referência:** WCAG 1.3.1, 2.4.6 · eMAG 3.10

## O que aparece para quem escreve

> Escreva, na linha acima da tabela, "Tabela:" e o que ela mostra

## Por que importa

A legenda diz o assunto da tabela antes de a pessoa ouvir as linhas. Ela também dá nome à tabela na navegação. (WCAG 1.3.1, 2.4.6)

## Correções

- **Escrever legenda** (`legenda`)

## Exemplos

Acusa:

```markdown
| Etapa | Prazo |
|---|---|
| Análise | 10 dias |
```

Melhor assim:

```markdown
Tabela: Prazos de cada etapa

| Etapa | Prazo |
|---|---|
| Análise | 10 dias |
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar e8 -->
```
