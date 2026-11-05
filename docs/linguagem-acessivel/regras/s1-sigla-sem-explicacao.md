# Sigla sem explicação (`s1`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `sigla-sem-explicacao`
- **Área e grupo:** Linguagem simples › Siglas
- **Nível:** Sugestão
- **Referência:** WCAG 3.1.4 · Lei 15.263/2025

## O que aparece para quem escreve

> Explique a sigla na primeira vez

Variações:

- `nunca`: Explique a sigla {sigla} na primeira vez em que ela aparece
- `depois`: A sigla {sigla} só é explicada mais adiante (linha {linha}). Explique na primeira vez

## Por que importa

Na primeira vez, escreva o nome completo e a sigla entre parênteses. Assim, quem não conhece a sigla entende o texto. (Lei 15.263/2025, art. 5º; WCAG 3.1.4)

## Correções

- **Explicar** (`explicar`)

## Exemplos

Acusa:

```markdown
O pedido segue o RBAC 145.
```

Melhor assim:

```markdown
O pedido segue o Regulamento Brasileiro da Aviação Civil (RBAC) 145. Depois, o RBAC define os prazos.
```

Acusa:

```markdown
O XYZW publica as regras. A Comissão Técnica (XYZW) revisa.
```

Melhor assim:

```markdown
A Comissão Técnica (XYZW) publica as regras. O XYZW revisa.
```

Não acusa:

```markdown
Baixe o PDF e o arquivo ZIP. Leia o capítulo IV.
```

Não acusa:

```markdown
NÃO envie o pedido antes do prazo.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar s1 -->
```
