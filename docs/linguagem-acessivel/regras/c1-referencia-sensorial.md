# Referência só pela cor, forma ou posição (`c1`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `referencia-sensorial`
- **Área e grupo:** Acessibilidade › Sentido
- **Nível:** Sugestão
- **Referência:** WCAG 1.3.3, 1.4.1

## O que aparece para quem escreve

> Não use só a cor, a forma ou a posição para indicar algo

Variações:

- `texto`: "{texto}" depende de ver a tela. Diga também o nome do elemento

## Por que importa

Quem não vê a tela, ou não distingue as cores, não encontra "o botão verde" ou "o item à direita". (WCAG 1.3.3, 1.4.1)

## Correções

- **Reescrever** (`reescrever`)

## Exemplos

Acusa:

```markdown
Clique no botão verde para enviar o pedido.
```

Melhor assim:

```markdown
Clique no botão Enviar para mandar o pedido.
```

Acusa:

```markdown
O menu fica à direita da tela.
```

Melhor assim:

```markdown
O menu fica na barra de opções, chamada Mais opções.
```

Não acusa:

```markdown
A tabela abaixo mostra os prazos.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar c1 -->
```
