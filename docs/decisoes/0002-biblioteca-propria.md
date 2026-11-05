# 0002 · Biblioteca própria, sem dependências, dentro do repositório

**Estado:** aceita (biblioteca 0.1.0)

**Contexto.** O verificador de acessibilidade precisa servir o painel, as marcas no texto, a linha de comando e a API, sempre com o mesmo resultado. Foram avaliadas ferramentas prontas: textlint, markdownlint e o ecossistema remark/retext.

**Decisão.** Criar a biblioteca **Linguagem Acessível** em `web/lib/linguagem-acessivel/`, em JavaScript puro (módulo ES), sem dependências e sem etapa de empacotamento, seguindo o modelo daquelas ferramentas: o texto é analisado em blocos com posição e cada regra devolve diagnósticos. O núcleo não acessa a tela; quem desenha marcas e janelas são os adaptadores do editor.

**Por quê.** As ferramentas prontas exigem empacotamento, que o Conteudista não usa, e não trazem regras de linguagem simples em português nem as correções em um clique. Manter no mesmo repositório evita o trabalho de versão e publicação duplicadas enquanto só o Conteudista usa a biblioteca.

**Consequências.** A biblioteca tem versão, CHANGELOG, documentação e testes próprios. Se outro sistema da ANAC quiser usá-la, ela pode ir para um repositório separado sem mudar a API.
