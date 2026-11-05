# 0005 · Linha de comando `lac` e API com o mesmo modelo

**Estado:** aceita; implementação nas etapas 4 (linha de comando) e 11 (API)

**Decisão.** A linha de comando (`linguagem-acessivel`, atalho `lac`, decisão H) e a API são camadas finas sobre a biblioteca, com os mesmos comandos, opções, atalhos de uma letra e formatos de saída. A ajuda de ambas sai de um único `comandos.json`. Saída padrão no terminal: `texto` (decisão I). A API não guarda o conteúdo, usa `/v1` no caminho e erros no formato RFC 9457. O Conteudista não depende da API: usa a biblioteca no navegador.

**Consequências.** Um teste compara a resposta da linha de comando com a da API para o mesmo texto.
