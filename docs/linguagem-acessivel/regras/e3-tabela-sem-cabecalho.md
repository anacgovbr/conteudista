# Tabela sem cabeçalho (`e3`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `tabela-sem-cabecalho`
- **Área e grupo:** Acessibilidade › Estrutura
- **Nível:** Para corrigir
- **Referência:** WCAG 1.3.1 · eMAG 3.10

## O que aparece para quem escreve

> Diga o que cada coluna mostra

Variações:

- `vazio`: A primeira linha da tabela está vazia. Diga o que cada coluna mostra
- `parcial`: Dê nome a todas as colunas desta tabela

## Por que importa

O leitor de tela lê o nome da coluna junto com cada valor. Sem cabeçalho, os números e textos perdem o sentido. (WCAG 1.3.1, eMAG 3.10)

## Correções

- **Usar a primeira linha** (`primeira-linha`)
- **Dar nome às colunas** (`editar`)

## Exemplos

Acusa:

```markdown
|  |  |
|---|---|
| Prazo | 10 dias |
```

Melhor assim:

```markdown
| Etapa | Prazo |
|---|---|
| Análise | 10 dias |
```

Acusa (como sugestão):

```markdown
| Etapa |  |
|---|---|
| Análise | 10 dias |
```

Melhor assim:

```markdown
| Etapa | Prazo |
|---|---|
| Análise | 10 dias |
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar e3 -->
```
