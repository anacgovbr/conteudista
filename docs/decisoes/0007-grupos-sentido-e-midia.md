# 0007 · Grupos "sentido" e "mídia" na Linguagem Acessível

**Estado:** aceita (biblioteca 0.5.0)

**Contexto.** A avaliação NBR 17225 pediu regras para referências só pela cor, forma ou posição (WCAG 1.3.3 e 1.4.1) e para vídeo ou áudio sem legenda ou transcrição (WCAG 1.2.1 e 1.2.2). Elas não cabem nos grupos existentes.

**Decisão.** Dois grupos novos na área acessibilidade: `c` sentido (regra `c1`) e `m` mídia (regra `m1`). As letras não repetem áreas (`a`, `l`) nem grupos (`i`, `e`, `k`, `f`, `s`, `n`). O esquema do diagnóstico aceita os valores `sentido` e `midia`. Todas as regras novas entram como sugestão.

**Consequências.** Quem consome o diagnóstico (lac, API, relatório) precisa aceitar os dois grupos. Os códigos da NBR 17225 ainda não entram em `referencia`: só depois de obtidos os códigos oficiais do checklist.
