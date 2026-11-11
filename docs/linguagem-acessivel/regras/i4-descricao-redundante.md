# Descrição que começa com "imagem de" (`i4`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `descricao-redundante`
- **Área e grupo:** Acessibilidade › Imagens
- **Nível:** Sugestão
- **Referência:** WCAG 1.1.1

## O que aparece para quem escreve

> Não comece a descrição com "imagem de" ou "foto de"

## Por que importa

O leitor de tela já avisa que é uma imagem. Começar com "imagem de" repete a informação e atrasa o que importa. (WCAG 1.1.1)

## Correções

- **Remover o início** (`remover`)

## Exemplos

Acusa:

```markdown
![Imagem de um fluxo de aprovação em três etapas](fluxo.png)
```

Melhor assim:

```markdown
![Fluxo de aprovação em três etapas](fluxo.png)
```

Acusa:

```markdown
![Foto da equipe técnica reunida na sala](equipe.jpg)
```

Melhor assim:

```markdown
![Equipe técnica reunida na sala](equipe.jpg)
```

Não acusa:

```markdown
![Figura 1 — Tela principal do sistema](tela.png)
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar i4 -->
```
