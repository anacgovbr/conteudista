# Descrição que não descreve (`i2`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `descricao-vaga`
- **Área e grupo:** Acessibilidade › Imagens
- **Nível:** Para corrigir
- **Referência:** WCAG 1.1.1 · eMAG 3.6

## O que aparece para quem escreve

> Esta descrição não diz o que a imagem mostra

Variações:

- `generica`: A descrição "{texto}" não diz o que a imagem mostra. Escreva o que ela mostra e por que está aqui
- `arquivo`: A descrição é o nome do arquivo. Escreva o que a imagem mostra
- `curta`: A descrição "{texto}" é curta demais. Escreva o que a imagem mostra

## Por que importa

Palavras como "imagem" ou o nome do arquivo não ajudam quem não vê a imagem. (WCAG 1.1.1, eMAG 3.6)

## Correções

- **Descrever** (`descrever`)

## Exemplos

Acusa:

```markdown
![Imagem](fluxo.png)
```

Melhor assim:

```markdown
![Fluxo de aprovação em três etapas](fluxo.png)
```

Acusa:

```markdown
![Figura 2](tela.png)
```

Melhor assim:

```markdown
![Figura 2 — Janela Importar, aba Link](tela.png)
```

Acusa:

```markdown
![fluxo-aprovacao.png](fluxo-aprovacao.png)
```

Melhor assim:

```markdown
![Fluxo de aprovação](fluxo-aprovacao.png)
```

Acusa:

```markdown
![x](a.png)
```

Melhor assim:

```markdown
![Alerta](alerta.png)
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar i2 -->
```
