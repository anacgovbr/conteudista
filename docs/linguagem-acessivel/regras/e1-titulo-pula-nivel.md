# Título que pula nível (`e1`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `titulo-pula-nivel`
- **Área e grupo:** Acessibilidade › Estrutura
- **Nível:** Para corrigir
- **Referência:** WCAG 1.3.1, 2.4.6 · eMAG 1.3

## O que aparece para quem escreve

> Este título pulou um nível

Variações:

- `pulou`: Este título pulou um nível. Depois de um título de nível {anterior}, use no máximo o nível {esperado}.
- `primeiro`: O primeiro título deve ser de nível 1 ou 2. Este é de nível {nivel}.

## Por que importa

Os níveis dos títulos formam o sumário e a navegação por leitor de tela. Pular um nível dá a impressão de que falta uma parte. (WCAG 1.3.1, eMAG 1.3)

## Correções

- **Ajustar nível** (`ajustar`)

## Exemplos

Acusa:

```markdown
# Processo

### Prazos
```

Melhor assim:

```markdown
# Processo

## Prazos
```

Acusa:

```markdown
### Prazos
```

Melhor assim:

```markdown
## Prazos
```

Não acusa:

```markdown
# Processo

## Etapas

### Análise

## Prazos
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar e1 -->
```
