# Descrição longa (`i3`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `descricao-longa`
- **Área e grupo:** Acessibilidade › Imagens
- **Nível:** Sugestão
- **Referência:** WCAG 1.1.1 · eMAG 3.6

## O que aparece para quem escreve

> Descrição longa. Deixe até 150 caracteres

Variações:

- `caracteres`: A descrição tem {caracteres} caracteres. Deixe até 150 e passe o resto para a descrição detalhada

## Por que importa

O leitor de tela lê a descrição inteira de uma vez. Uma descrição curta diz o essencial; os detalhes ficam no texto, logo abaixo da imagem. (WCAG 1.1.1, eMAG 3.6)

## Correções

- **Descrever** (`descrever`)

## Exemplos

Acusa:

```markdown
![Fluxo de aprovação do pedido de certificação: o requerente envia os documentos, a área técnica confere, a coordenação revisa o parecer e a diretoria publica a decisão final no sistema](fluxo.png)
```

Melhor assim:

```markdown
![Fluxo de aprovação do pedido de certificação em quatro etapas](fluxo.png)
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar i3 -->
```
