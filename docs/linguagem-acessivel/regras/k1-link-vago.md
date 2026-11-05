# Link que não diz aonde leva (`k1`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `link-vago`
- **Área e grupo:** Acessibilidade › Links
- **Nível:** Para corrigir
- **Referência:** WCAG 2.4.4 · eMAG 3.5

## O que aparece para quem escreve

> Diga aonde o link leva

Variações:

- `vago`: Troque "{texto}" por um texto que diga aonde o link leva
- `vazio`: Este link não tem texto. Escreva aonde ele leva
- `endereco`: Troque o endereço por um texto que diga aonde o link leva

## Por que importa

Quem usa leitor de tela costuma ouvir a lista de links fora do texto. "Clique aqui" ou um endereço longo não dizem o destino. (WCAG 2.4.4, eMAG 3.5)

## Correções

- **Editar o texto do link** (`editar`)

## Exemplos

Acusa:

```markdown
Os prazos estão no regulamento. [Clique aqui](https://www.gov.br/anac).
```

Melhor assim:

```markdown
Os prazos estão no [regulamento da ANAC](https://www.gov.br/anac).
```

Acusa:

```markdown
[](https://www.gov.br/anac)
```

Melhor assim:

```markdown
[Portal da ANAC](https://www.gov.br/anac)
```

Acusa (como sugestão):

```markdown
Veja [https://www.gov.br/anac/pt-br](https://www.gov.br/anac/pt-br).
```

Melhor assim:

```markdown
Veja o [portal da ANAC](https://www.gov.br/anac/pt-br).
```

Não acusa:

```markdown
Fonte: [gov.br/ds](https://www.gov.br/ds/).
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar k1 -->
```
