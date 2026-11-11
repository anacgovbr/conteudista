# Negrito usado como título (`e6`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `titulo-falso`
- **Área e grupo:** Acessibilidade › Estrutura
- **Nível:** Sugestão
- **Referência:** WCAG 1.3.1 · eMAG 1.3

## O que aparece para quem escreve

> Esta linha parece um título. Use # para marcar o título

Variações:

- `texto`: "{texto}" parece um título. Use # para que ele entre no sumário e na navegação

## Por que importa

O leitor de tela só reconhece como título o que foi marcado como título. O negrito muda a aparência, mas não a estrutura. (WCAG 1.3.1, eMAG 1.3)

## Correções

- **Transformar em título** (`converter`)

## Exemplos

Acusa:

```markdown
# Curso

**Prazos de análise**

O pedido é analisado em dez dias.
```

Melhor assim:

```markdown
# Curso

## Prazos de análise

O pedido é analisado em dez dias.
```

Não acusa:

```markdown
**Atenção:** o prazo termina na sexta-feira.

Envie antes.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar e6 -->
```
