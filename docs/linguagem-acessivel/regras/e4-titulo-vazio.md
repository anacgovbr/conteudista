# Título vazio (`e4`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `titulo-vazio`
- **Área e grupo:** Acessibilidade › Estrutura
- **Nível:** Sugestão
- **Referência:** WCAG 2.4.6, 1.3.1 · eMAG 1.3

## O que aparece para quem escreve

> Este título está vazio. Escreva o título ou apague a linha

## Por que importa

Um título vazio aparece no sumário e na navegação por leitor de tela sem dizer nada. (WCAG 2.4.6, eMAG 1.3)

## Correções

- **Escrever título** (`escrever`)

## Exemplos

Acusa:

```markdown
# Processo

##

Texto.
```

Melhor assim:

```markdown
# Processo

## Prazos

Texto.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar e4 -->
```
