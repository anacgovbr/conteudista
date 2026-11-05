# 0004 · Marcadores no texto: ignorar e decorativa

**Estado:** aceita (biblioteca 0.1.0)

**Contexto.** "Ignorar" e "É decorativa" precisam acompanhar o texto: no link compartilhado, no ZIP e em outro computador.

**Decisão.** Comentários HTML no próprio Markdown:

- `<!-- linguagem-acessivel: ignorar i1 k1 -->`: ignora as regras no bloco seguinte.
- `<!-- linguagem-acessivel: ignorar-documento i1 -->`: ignora em todo o texto.
- `<!-- linguagem-acessivel: decorativa -->`: a imagem logo a seguir é decorativa.

**Por quê.** O gerador já remove comentários HTML antes de montar os arquivos; foi conferido que uma imagem com o marcador continua saindo como figura. Uma convenção na sintaxe da imagem (título, atributos) mudaria o que o gerador lê.

**Consequências.** Marcadores dentro de blocos de código não valem. Na etapa 7, o gerador passa a usar o marcador `decorativa` para gerar texto alternativo vazio sem aviso.
