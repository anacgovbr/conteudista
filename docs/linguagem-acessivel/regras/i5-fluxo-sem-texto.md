# Fluxo sem explicação em texto (`i5`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `fluxo-sem-texto`
- **Área e grupo:** Acessibilidade › Imagens
- **Nível:** Sugestão
- **Referência:** WCAG 1.1.1, 1.3.1

## O que aparece para quem escreve

> Explique o fluxo em texto, logo abaixo dele

## Por que importa

Quem usa leitor de tela não vê o desenho do fluxo. Um parágrafo ou uma lista com as etapas, na ordem, passa a mesma informação. (WCAG 1.1.1, 1.3.1)

## Correções

- **Explicar o fluxo** (`descrever`)

## Exemplos

Acusa:

```markdown
# Fluxo

```mermaid
flowchart LR
  A[Pedido] --> B[Análise]
```
```

Melhor assim:

```markdown
# Fluxo

```mermaid
flowchart LR
  A[Pedido] --> B[Análise]
```

O pedido chega e, em seguida, a área técnica faz a análise.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar i5 -->
```
