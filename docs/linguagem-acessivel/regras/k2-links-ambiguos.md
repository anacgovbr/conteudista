# Links iguais para lugares diferentes (`k2`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `links-ambiguos`
- **Área e grupo:** Acessibilidade › Links
- **Nível:** Sugestão
- **Referência:** WCAG 2.4.4, 2.4.9 · eMAG 3.5

## O que aparece para quem escreve

> Este link tem o mesmo texto de outro, mas leva a outro lugar

Variações:

- `mesmo`: O texto "{texto}" já leva a outro endereço. Use textos diferentes para destinos diferentes

## Por que importa

Na lista de links do leitor de tela, dois links com o mesmo texto parecem iguais. A pessoa não sabe qual escolher. (WCAG 2.4.4, eMAG 3.5)

## Correções

- **Editar o texto do link** (`editar`)

## Exemplos

Acusa:

```markdown
Leia o [manual](https://a.gov.br/1) e depois o [manual](https://a.gov.br/2).
```

Melhor assim:

```markdown
Leia o [manual de voo](https://a.gov.br/1) e depois o [manual de manutenção](https://a.gov.br/2).
```

Não acusa:

```markdown
Veja o [manual](https://a.gov.br/1). Depois, volte ao [manual](https://a.gov.br/1/).
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar k2 -->
```
