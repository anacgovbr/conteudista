# Imagem sem descrição (`i1`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `imagem-sem-descricao`
- **Área e grupo:** Acessibilidade › Imagens
- **Nível:** Para corrigir
- **Referência:** WCAG 1.1.1 · eMAG 3.6

## O que aparece para quem escreve

> Descreva esta imagem para quem não pode vê-la

## Por que importa

Quem usa leitor de tela ouve a descrição no lugar da imagem. Sem ela, a pessoa perde a informação. (WCAG 1.1.1, eMAG 3.6)

## Correções

- **Descrever** (`descrever`)
- **É decorativa** (`decorativa`)

## Exemplos

Acusa:

```markdown
![](fluxo-aprovacao.png)
```

Melhor assim:

```markdown
![Fluxo de aprovação: o pedido passa pela área técnica e segue para a coordenação](fluxo-aprovacao.png)
```

Acusa:

```markdown
Veja o símbolo ![ ](alerta.png) na tela.
```

Melhor assim:

```markdown
Veja o símbolo ![Alerta](alerta.png) na tela.
```

Não acusa:

```markdown
<!-- linguagem-acessivel: decorativa -->![](divisor.png)
```

Não acusa:

```markdown
Escreva `![](figura.png)` para inserir uma imagem.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar i1 -->
```
