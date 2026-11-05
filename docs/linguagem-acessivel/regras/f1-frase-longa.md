# Frase longa (`f1`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `frase-longa`
- **Área e grupo:** Linguagem simples › Frases
- **Nível:** Sugestão
- **Referência:** WCAG 3.1.5 · Lei 15.263/2025

## O que aparece para quem escreve

> Frase longa. Tente dividir

Variações:

- `palavras`: Frase longa ({palavras} palavras). Tente dividir em duas ou mais

## Por que importa

Frases curtas, com uma ideia cada, são mais fáceis de ler e de entender. (Lei 15.263/2025, art. 5º; WCAG 3.1.5)

## Correções

- **Simplificar** (`simplificar`)

## Exemplos

Acusa:

```markdown
A solicitação deverá ser instruída pelo interessado com a documentação comprobatória prevista no regulamento, sendo encaminhada à área técnica competente, que procederá à análise no prazo regulamentar.
```

Melhor assim:

```markdown
Envie o pedido com os documentos exigidos pelo regulamento. A área técnica analisa o pedido no prazo previsto.
```

Não acusa:

```markdown
| Coluna | Texto longo de tabela não é frase corrida e não é conferido por esta regra, mesmo quando passa de vinte e cinco palavras na mesma célula da tabela |
|---|---|
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar f1 -->
```
