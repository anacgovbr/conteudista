# 0001 · Opções padrão em YAML

**Estado:** aceita (versão 1.78)

**Contexto.** As opções de ligar e desligar estavam espalhadas no código. Mudar um padrão exigia programar.

**Decisão.** O arquivo `web/config/opcoes.yaml` define como cada opção começa. O navegador lê o arquivo direto, com um leitor pequeno de um subconjunto do YAML (decisão K). A escolha da pessoa no navegador prevalece sobre o arquivo (decisão L). O arquivo fica em `web/config/` (decisão M). Um registro único em `web/opcoes.js` gera o exemplo, o esquema e a documentação; um teste impede caixa de ligar e desligar sem registro.

**Consequências.** Arquivo com erro não quebra a página: valem os padrões do código. A verificação do GitHub recusa publicação com erro e indica a linha.
