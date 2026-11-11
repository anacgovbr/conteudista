# Mais de um título principal (`e5`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `titulo-principal`
- **Área e grupo:** Acessibilidade › Estrutura
- **Nível:** Sugestão
- **Referência:** WCAG 1.3.1, 2.4.6 · eMAG 1.3
- **Vale para:** apostila

## O que aparece para quem escreve

> A apostila deve ter um só título de nível 1

Variações:

- `varios`: A apostila tem {total} títulos de nível 1. Use o nível 2 para as seções

## Por que importa

O título de nível 1 é o nome do material. Com mais de um, o sumário e a navegação por leitor de tela ficam confusos. (WCAG 1.3.1, eMAG 1.3)

## Correções

- **Usar nível 2** (`ajustar`)

## Exemplos

Acusa:

```markdown
# Parte 1

Texto.

# Parte 2

Texto.
```

Melhor assim:

```markdown
# Curso

## Parte 1

Texto.

## Parte 2

Texto.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar e5 -->
```
