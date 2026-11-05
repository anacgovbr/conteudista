# Slide sem título (`e2`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `slide-sem-titulo`
- **Área e grupo:** Acessibilidade › Estrutura
- **Nível:** Para corrigir
- **Referência:** WCAG 2.4.6, 1.3.1 · eMAG 1.3
- **Vale para:** apresentação

## O que aparece para quem escreve

> Dê um título a este slide

Variações:

- `numero`: Dê um título ao slide {slide}

## Por que importa

O título identifica o slide no sumário, no seletor de slides e para quem usa leitor de tela. (WCAG 2.4.6, eMAG 1.3)

## Correções

- **Escrever título** (`escrever`)

## Exemplos

Acusa:

```markdown
---
title: Curso
---

# Abertura

Texto.

---

Só texto, sem título.

```

Melhor assim:

```markdown
---
title: Curso
---

# Abertura

Texto.

---

# Prazos

Texto do slide.

```

Não acusa:

```markdown
---
title: Curso
---

# Abertura

---

## Etapas

- Uma

```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar e2 -->
```
