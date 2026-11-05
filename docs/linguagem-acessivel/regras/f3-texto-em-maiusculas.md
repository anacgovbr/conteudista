# Texto em maiúsculas (`f3`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `texto-em-maiusculas`
- **Área e grupo:** Linguagem simples › Frases
- **Nível:** Sugestão
- **Referência:** WCAG 1.4.8

## O que aparece para quem escreve

> Texto todo em maiúsculas é mais difícil de ler

## Por que importa

Palavras em maiúsculas perdem o formato que ajuda a reconhecê-las, e alguns leitores de tela soletram as letras. Para destacar, use negrito. (WCAG 1.4.8)

## Correções

- **Converter** (`converter`)

## Exemplos

Acusa:

```markdown
ATENÇÃO: O PRAZO TERMINA NA SEXTA-FEIRA.
```

Melhor assim:

```markdown
**Atenção:** o prazo termina na sexta-feira.
```

Não acusa:

```markdown
A ANAC e o DECEA publicam as regras.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar f3 -->
```
