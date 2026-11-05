# Frase longa na narração (`n1`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `narracao-frase-longa`
- **Área e grupo:** Linguagem simples › Narração
- **Nível:** Sugestão
- **Referência:** WCAG 1.2.2 · Lei 15.263/2025

## O que aparece para quem escreve

> Frase longa na narração

Variações:

- `palavras`: Frase longa na narração ({palavras} palavras). A legenda fica difícil de ler

## Por que importa

Na narração, a pessoa ouve uma vez só e lê a legenda enquanto o áudio toca. Frases curtas são mais fáceis de acompanhar. (WCAG 1.2.2; Lei 15.263/2025)

## Correções

- **Simplificar** (`simplificar`)

## Exemplos

Acusa:

```markdown
# Prazos

<!-- notas: Nesta etapa, depois de receber o pedido com todos os documentos exigidos pelo regulamento, a área técnica faz a análise completa e, em seguida, encaminha o processo à coordenação para a decisão final. -->
```

Melhor assim:

```markdown
# Prazos

<!-- notas: Nesta etapa, a área técnica analisa o pedido. Depois, a coordenação decide. -->
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar n1 -->
```
