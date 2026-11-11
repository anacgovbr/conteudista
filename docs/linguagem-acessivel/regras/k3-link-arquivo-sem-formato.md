# Link para arquivo sem o formato (`k3`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `link-arquivo-sem-formato`
- **Área e grupo:** Acessibilidade › Links
- **Nível:** Sugestão
- **Referência:** WCAG 2.4.4 · eMAG 3.5

## O que aparece para quem escreve

> Diga o formato do arquivo no texto do link

Variações:

- `formato`: Este link abre um arquivo {formato}. Diga isso no texto do link

## Por que importa

Antes de clicar, a pessoa precisa saber que vai baixar um arquivo e qual programa vai abri-lo. (WCAG 2.4.4, eMAG 3.5)

## Correções

- **Acrescentar o formato** (`formato`)

## Exemplos

Acusa:

```markdown
Baixe o [relatório anual](https://a.gov.br/relatorio.pdf).
```

Melhor assim:

```markdown
Baixe o [relatório anual (PDF)](https://a.gov.br/relatorio.pdf).
```

Não acusa:

```markdown
Use a [planilha de prazos](https://a.gov.br/prazos.xlsx).
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar k3 -->
```
