# Diagnóstico e evidências dos temas ANAC

Escopo analisado: `anac20-claro`, `anac20-escuro` e `govbr`. A correção do espaçamento foi publicada em `c6a3051`.

## Respostas do diagnóstico

- **O problema existia?** Sim. Os testes de regressão cobrem a licença seguida de encerramento vazio (6.11), tabelas (6.12), capa/cores (6.13) e painel de acessibilidade (6.14).
- **Onde?** Na renderização HTML/PPTX dos temas ANAC e no CSS/HTML compartilhado do painel de acessibilidade.
- **Arquivos responsáveis?** `tools/conteudo/html_saida.py`, `tools/conteudo/pptx.py`, `tools/conteudo/temas.py`, `tools/conteudo/docx.py`, `tools/conteudo/epub.py` e recursos CSS da apresentação/painel.
- **GOVBR já resolve?** Parcialmente: serve de base para tokens, tabelas, estilos do painel e saídas que não são a apresentação ANAC.
- **Pode reutilizar GOVBR?** Sim. É o caminho atualmente usado para estilos compartilhados e comportamento de tabela; o layout visual ANAC permanece específico.
- **É possível remover em vez de adicionar?** A base GOVBR foi reutilizada; as diferenças de capa, cores e ativos da marca ANAC ainda precisam de regras específicas. Não foi identificada remoção segura adicional nesta etapa.

## Diagnóstico

| Problema/área | Arquivo e linha | Causa/responsabilidade | Reutilizar GOVBR? |
|---|---|---|---|
| Tema e variantes ANAC 20 anos | `tools/conteudo/temas.py:9,31-34` | Os dois temas usam o mapa de cores compartilhado; diferem por variante clara/escura e modelo PPTX. | Sim, como base; preservar os ativos e parâmetros ANAC. |
| Tabelas na apresentação HTML | `tools/conteudo/recursos/apresentacao/layout.css:8`; `tools/conteudo/recursos/apresentacao/acessibilidade.css:13`; `tools/conteudo/html_saida.py:200-210` | O CSS comum define tabela/wrapper e rolagem; a regra ANAC de espaçamento no conteúdo deslocava a tabela verticalmente. O teste 6.17 compara geometria, overflow e zoom. | Sim. A estrutura é herdada; só as cores de tema diferem intencionalmente. |
| Tabelas em EPUB | `tools/conteudo/epub.py:57` | Renderizador EPUB compartilhado, sem regra ANAC específica identificada. | Sim. |
| Notas dos slides | `tools/conteudo/html_saida.py:277` | As notas são incluídas na estrutura comum dos slides; sem divergência ANAC identificada. | Sim. |
| Licença e encerramento no HTML | `tools/conteudo/html_saida.py:268-283` | A licença é colocada antes do slide final quando há mais de um slide; no ANAC, o encerramento fica sem conteúdo. | Sim, reutilizar a sequência comum; o slide final vazio é específico ao requisito ANAC. |
| Licença e encerramento no PPTX | `tools/conteudo/pptx.py:59-62,65-68,189` | A licença é inserida antes do último slide; o modelo ANAC usa arte de encerramento sem texto. | Parcialmente: fluxo comum de licença, arte ANAC específica. |
| Licença no EPUB/DOCX | `tools/conteudo/epub.py:134-139`; `tools/conteudo/docx.py:152` | Aviso de licença gerado pelos renderizadores existentes; DOCX ANAC usa tema GOVBR (`docx.py:11-13`). | Sim. |
| Capa e cores ANAC | `tools/conteudo/html_saida.py:200-216`; `tools/conteudo/recursos/apresentacao/layout.css:1,13-16`; `tools/conteudo/pptx.py:65-68` | Regras posicionam título à direita da arte e trocam os tokens de destaque para azul; PPTX seleciona os ativos ANAC. | Não integralmente: GOVBR não fornece logo/selo nem arte ANAC. Reutiliza-se a base de layout e sobrescrevem-se apenas as regras necessárias. |
| Acessibilidade do painel | `tools/conteudo/html_saida.py:145`; `tools/conteudo/recursos/acessibilidade/painel.css` e `painel.html` | Componente compartilhado do aplicativo; teste 6.14 verifica desktop/celular, controles, ajuda contextual e instruções webcam. | Sim, é compartilhado com o estilo GOVBR. |

## Evidências visuais

Capturas feitas em Chrome Desktop, viewport 1280×720. Os arquivos `*-antes.png` foram renderizados a partir do histórico anterior às correções originais: tabela em `73a528e`, capa e painel em `c436168`. Os três `*-atual.png` originais correspondem ao código publicado em `b3805ce`; a matriz `matriz-*.png` corresponde ao working tree após a correção local do espaçamento.

| Área | Antes | Atual |
|---|---|---|
| Tabela ANAC | [tabela-antes.png](tabela-antes.png) | [tabela-atual.png](tabela-atual.png) |
| Capa ANAC | [capa-antes.png](capa-antes.png) | [capa-atual.png](capa-atual.png) |
| Painel de acessibilidade | [painel-antes.png](painel-antes.png) | [painel-atual.png](painel-atual.png) |

As imagens são evidência visual, não comparação automatizada por diferença de pixels. A matriz expandida cobre cinco casos (`simples`, `larga`, `imagem`, `texto-longo`, `muitas-colunas`) nos três temas e em 1280×720/390×780: veja [dados e medições](matriz-tabelas.json) e os PNGs `matriz-<caso>-<tema>-<largura>.png`.

Resultado da matriz: **20/20 comparações** com geometria, overflow e zoom iguais entre GOVBR e ANAC claro/escuro. A única diferença diagnosticada antes era o deslocamento vertical de 8,45 px em desktop/7,60 px em celular, causado por `padding-top:1.2vh` no CSS ANAC. A regra foi removida para herdar o posicionamento do GOVBR. Cores de cabeçalho, texto e progresso continuam diferentes por serem tokens intencionais do tema; “zero diferença” aqui significa estrutura/comportamento da tabela, não igualdade de paleta.

Para o ajuste de espaçamento, a captura antes foi renderizada do commit `b3805ce` e a captura atual da mesma amostra após a remoção:

| Antes (wrapper y=140,1 px) | Depois (wrapper y=131,7 px; igual ao GOVBR) |
|---|---|
| [antes](matriz-simples-anac20-claro-antes-spacing-1280.png) | [depois](matriz-simples-anac20-claro-1280.png) |

## Validação registrada

- Suíte completa anterior: **314 ok, 0 falhas**; Chrome 157.0.8103.79; 269 s em 24/11/2026. Após atualizar o registro manual, o grupo 5 passou (**10 ok, 0 falhas**) e o grupo 13 isolado passou (**19 ok, 0 falhas**): M.5 consta como OK por confirmação do usuário e M.1–M.4 permanecem manuais. A nova execução completa foi encerrada pelo limite de 600 s enquanto estava no grupo 13, sem resultado final.
- Após a correção local, grupo 6: **35 ok, 0 falhas**; inclui a nova matriz 6.17. Antes da correção, 6.17 falhou em 4 comparações ANAC, reproduzindo o deslocamento.
- Na versão 1.115, grupos 6 e 9: **38/38** e **22/22**; verificações novas 6.18 (contraste ANAC escuro em HTML/PPTX) e 9.21 (centralização dos rótulos dos quatro botões).
- Publicação 1.115: commit `0cdaf90`, workflow `45497950654` concluído com sucesso (build, Chrome e deploy). Site: <https://anacgovbr.github.io/conteudista/>.
- Conferência pós-deploy no Chrome: os quatro botões mediram caixa de texto em **−0,5 px** do centro antes (CSS 1.114) e **0 px** depois (CSS servido pela 1.115); depois, `display:flex`, `align-items:center` e `line-height:normal`. Ver capturas [antes](botoes-antes-1.114.png) e [depois](botoes-depois-1.115.png). A captura “antes” foi reconstruída usando o CSS do commit anterior sobre a página publicada atual.
- Casos relacionados: 6.11 (licença/encerramento), 6.12 (tabela), 6.13 (capa/cores), 6.14 (painel desktop/celular), 6.15 (gestos simulados), 6.16 (relay remoto) e 6.17 (matriz de tabelas).
- CI do commit `c6a3051ffdd17167d3256890f1d3097d9483f7ff`: run `45481358350`, status/conclusão `completed/success`; build, testes Chrome e deploy concluídos com sucesso. A run seletiva `45481358246` também concluiu com sucesso.
- HTML independente: a apresentação é gerada como arquivo HTML e os testes abrem a saída local no navegador.

## Mudanças já publicadas relacionadas ao objetivo

| Commit | Arquivos | Escopo |
|---|---|---|
| `c436168` | `tools/conteudo/html_saida.py`, `tools/conteudo/pptx.py`, `tools/testes/grupos/geracao.py` | Licença penúltima, encerramento ANAC vazio e correção de tabelas. |
| `d8015f1` | `tools/conteudo/html_saida.py`, `tools/conteudo/recursos/acessibilidade/painel.css`, `painel.html`, `tools/testes/grupos/geracao.py` | Layout de capa, cores e painel/ajuda contextual. |
| `b3805ce` | `tools/conteudo/html_saida.py`, `tools/conteudo/recursos/apresentacao/controles.js`, `webcam.js`, `tools/testes/grupos/geracao.py`, `web/controle-remoto.html` | Gestos repetíveis e controle remoto cifrado por relay. |
| `c6a3051` | `tools/conteudo/html_saida.py:209`, `tools/testes/grupos/geracao.py:196-229`, `docs/evidencias-anac/` | Remove o espaçamento ANAC divergente; teste 6.17 e matriz visual de cinco tabelas. |
| `0cdaf90` | `tools/conteudo/html_saida.py`, `tools/conteudo/pptx.py`, `web/ds-botoes.css`, testes dos grupos 6/9, versão 1.115 | Fundo azul escuro e contraste em slides ANAC HTML/PPTX; rótulos dos botões centralizados. Publicado e verificado no site. |

O teste 6.17 reproduziu a diferença antes da correção e passou após a remoção; a suíte completa e o CI do commit publicado também passaram.

## Limites ainda não verificados

- M.1–M.4 aguardam validação conjunta: Safari real/áudio, Chrome Android/toque, áudio PPTX no PowerPoint e impressão/PDF. A escuta Kokoro/Piper (M.5), webcam com câmera/mão reais e controle remoto foram confirmados pelo usuário; os dois últimos não foram verificados independentemente pelo agente.
- As capturas não são diff pixel a pixel; as paletas dos temas são diferentes por projeto.
- PPTX/EPUB/DOCX foram cobertos pelos testes de geração/acessibilidade disponíveis; não foi feita inspeção visual manual de cada formato neste relatório.
- As verificações físicas listadas acima não são cobertas pelo CI automatizado e continuam pendentes.
