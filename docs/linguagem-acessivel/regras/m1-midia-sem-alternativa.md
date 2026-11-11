# Vídeo ou áudio sem indicação de legenda (`m1`)

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

- **Nome:** `midia-sem-alternativa`
- **Área e grupo:** Acessibilidade › Mídia
- **Nível:** Sugestão
- **Referência:** WCAG 1.2.1, 1.2.2

## O que aparece para quem escreve

> Diga se o vídeo ou o áudio tem legenda ou transcrição

## Por que importa

Pessoas surdas ou com deficiência auditiva precisam de legenda ou transcrição. Avise antes, para a pessoa saber se vai conseguir acompanhar. (WCAG 1.2.1, 1.2.2)

## Correções

- **Indicar legenda ou transcrição** (`indicar`)

## Exemplos

Acusa:

```markdown
Assista ao [vídeo de apresentação](https://www.youtube.com/watch?v=abc).
```

Melhor assim:

```markdown
Assista ao [vídeo de apresentação, com legendas](https://www.youtube.com/watch?v=abc).
```

Não acusa:

```markdown
Ouça o [áudio da aula](aula.mp3). A transcrição está no fim da apostila.
```

## Para não acusar

Se o caso for uma exceção, ignore a regra no bloco seguinte:

```markdown
<!-- linguagem-acessivel: ignorar m1 -->
```
