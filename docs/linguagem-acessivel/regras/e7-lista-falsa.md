# Lista feita com símbolos (`e7`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `lista-falsa`
- **Área e grupo:** Acessibilidade › Estrutura
- **Nível:** Sugestão
- **Referência:** WCAG 1.3.1

## O que aparece para quem escreve

> Use - no início de cada item para fazer uma lista

## Por que importa

Com símbolos como "•", o leitor de tela não anuncia a lista nem quantos itens ela tem. (WCAG 1.3.1)

## Correções

- **Transformar em lista** (`converter`)

## Exemplos

Acusa:

```markdown
Documentos:

• Primeiro documento
• Segundo documento
```

Melhor assim:

```markdown
Documentos:

- Primeiro documento
- Segundo documento
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar e7 -->
```
