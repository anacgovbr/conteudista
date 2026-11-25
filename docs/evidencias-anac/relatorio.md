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

## Validação final da SPEC 10 (1.116)

Nenhum código dos temas ANAC foi alterado nesta fase: a investigação não encontrou defeito novo. Para fechar a cobertura que faltava, foram acrescentados os testes `6.21` (arte de capa/selo e encerramento no HTML/PPTX, com slide final sem texto), `6.22` (painel dentro dos temas ANAC em desktop e celular), `6.23` (ajuda de legendas/narração com áudio), `6.24` (DOCX gov.br e EPUB neutro com tema ANAC) e `6.25` (foco tracejado, hover e estado ativo do painel gov.br dentro do tema ANAC) em `tools/testes/grupos/geracao.py`.

- Comando: `python tools/testes/testar_apresentacao.py --navegador chrome --tentativas 2` → **335 ok, 0 falhas, 4 manuais**. Com `--tentativas 1`, o caso `8.4` (configuração YAML) falhou uma vez e passou isolado; é instabilidade conhecida do editor, sem relação com os temas.
- Grupo isolado: `--grupo 6 --navegador chrome --tentativas 1` → **50 ok, 0 falhas**. Os novos testes falharam primeiro por três erros no próprio teste (ZIP lido após fechamento em 6.21, `.s.on` antes de iniciar em 6.23 e `hover` medido depois de trocar de alvo em 6.25); corrigidos os testes, passaram sem alterar o produto.
- Os quatro formatos foram gerados para `anac20-claro`, `anac20-escuro` e `govbr` com `tools/gerador.py`; os hashes das artes ANAC coincidem no HTML (`data:image/png;base64`) e no PPTX (`ppt/media`), e o último slide do PPTX contém apenas a numeração.
- Medições: [spec10-medicoes.json](spec10-medicoes.json). Capturas atuais (capa, slide final e painel; desktop 1280×720 e celular 390×780): `spec10-1.116-<tema>-<área>-<largura>.png` para os três temas.
- Par antes/depois de 1.116: os commits `5ba5d54` e `33898fc` foram renderizados em *worktree* separado, com o mesmo HTML (SHA-256 idêntico) e capturas em 1280×720. [capa antes](spec10-antes-5ba5d54-anac20-claro-capa-desktop.png) / [capa depois](spec10-depois-33898fc-anac20-claro-capa-desktop.png), [final antes](spec10-antes-5ba5d54-anac20-claro-final-desktop.png) / [final depois](spec10-depois-33898fc-anac20-claro-final-desktop.png) e [painel antes](spec10-antes-5ba5d54-anac20-claro-painel-desktop.png) / [painel depois](spec10-depois-33898fc-anac20-claro-painel-desktop.png). [Diferença pixel a pixel](spec10-antes-depois.json): **0 pixels diferentes** nos três pares. Isso confirma que a entrega não alterou a apresentação ANAC; a arte da capa/selo e o encerramento vazio são atestados também pelos hashes e pelo teste 6.21.
- Antes/depois das correções anteriores permanecem válidos: [tabela](tabela-antes.png)/[tabela](tabela-atual.png), [capa](capa-antes.png)/[capa](capa-atual.png), [painel](painel-antes.png)/[painel](painel-atual.png) e [espaçamento](matriz-simples-anac20-claro-antes-spacing-1280.png)/[espaçamento](matriz-simples-anac20-claro-1280.png).
- Publicação: correção do menu ⋯ do celular em `5ba5d54`; testes seletivos `45513175009` e publicação `45513175259` concluídos com sucesso. Site servindo `VERSAO = '1.116'`.

## Estado atual das verificações manuais

- **M.2 e M.4:** confirmação anterior do usuário registrada abaixo (Android/gestos e impressão/PDF); os relatórios automatizados continuam listando esses itens como manuais porque não simulam esses ambientes.
- **M.3:** o usuário confirmou que o áudio do PPTX tocou; não confirmou explicitamente que o slide avançou ao fim do áudio. M.1 (Safari/iPhone real) segue sem confirmação. M.5 e o uso de webcam/câmera reais também foram confirmados pelo usuário, sem verificação independente do agente.
- As capturas históricas não são diff pixel a pixel; as paletas dos temas são diferentes por projeto. O par 1.116 (`spec10-antes-depois.json`) é o único comparado pixel a pixel.
- PPTX/EPUB/DOCX foram cobertos pelos testes de geração/acessibilidade disponíveis; não foi feita inspeção visual manual de cada formato neste relatório.
- Os testes automatizados não substituem as verificações físicas e no PowerPoint.


## Ajuda contextual — tooltip desktop e popover mobile

- **Problema reproduzido:** a ajuda da webcam abria abaixo da janela no mobile e era cortada pelo rodapé do painel no desktop. A causa era o posicionamento no fluxo abaixo do controle; no desktop o popover era posicionado para baixo, sem verificar o espaço visível.
- **Reutilização:** mantidos o botão `i`, `aria-expanded`, `aria-controls` e o parágrafo existente. Sem componente novo; desktop ancora a ajuda acima do controle e mobile mantém o popover no fluxo e rola até ele ao abrir.
- **Arquivos:** `tools/conteudo/html_saida.py` (ajuda passa a ser filha da linha de opção), `tools/conteudo/recursos/acessibilidade/painel.css` (posicionamento desktop/mobile), `tools/conteudo/recursos/acessibilidade/painel.html` (rolagem para a ajuda no mobile) e `tools/testes/grupos/geracao.py` (teste 6.14 verifica posição, estado acessível e ajuda dentro da viewport).
- **TDD:** a asserção de viewport falhou primeiro em `6.14-desktop` e `6.14-celular`; após a correção, ambos passaram.
- **Evidências:** Chrome, tema `anac20-claro`, 1280×720 e 390×780: [antes desktop](spec08-webcam-antes-desktop.png), [depois desktop](spec08-webcam-depois-desktop.png), [antes mobile](spec08-webcam-antes-mobile.png), [depois mobile](spec08-webcam-depois-mobile.png). Após a mudança, a caixa da ajuda ficou dentro da viewport nos dois tamanhos.
- **Validação:** grupo 6: **50 ok, 0 falhas**. Suíte completa `python tools/testes/testar_apresentacao.py --navegador chrome --tentativas 2`: **338 ok, 0 falhas, 4 verificações manuais no snapshot automatizado**, 345 s. M.2 e M.4 foram confirmados pelo usuário depois da execução; restam M.1 e M.3. Cobertura inclui HTML/PPTX/EPUB/DOCX, GOVBR e variantes ANAC; `git diff --check` sem erros.
- **Estado:** alterações locais não commitadas nem publicadas. M.2 e M.4 estão registrados como aprovados por confirmação do usuário; M.1 e M.3 ainda dependem de dispositivos/aplicativos reais.


## Auditoria de cobertura SPEC 08/09 (25/11/2026; revisada após suíte completa)

| Critério | Implementação/localização | Evidência automatizada atual | Estado/limite |
|---|---|---|---|
| Alto contraste | `html_saida.py:126`; estilo em `recursos/acessibilidade/painel.css` | 6.22 abre a ajuda em ambos os temas ANAC e verifica fundo preto, texto branco e borda amarela | Verificado por estilo calculado; leitores/monitores reais não são simulados. |
| Espaçamento, régua, animações, barra fixa e atalhos | `html_saida.py:127-131` | 6.22 verifica o conteúdo característico de cada ajuda, inclusive instrução de atalho | Conteúdo presente; efeito funcional das opções é testado separadamente, não por cada tooltip. |
| Webcam — gestos | `html_saida.py:132` | 6.14/6.22 verificam 🖐️, ✌️ e 👍; 6.15 simula palma/joinha no reconhecedor | Texto e ações simuladas passam; câmera e mão reais continuam dependentes de teste físico. |
| Webcam — recuperação de permissão | `html_saida.py:132` | 6.22 verifica as instruções para Chrome/Edge desktop, Chrome Android, Safari iPhone/iPad (Ajustes e aA) | Texto dos caminhos é assertado; revogar/conceder permissão em cada navegador/dispositivo não é automatizado. |
| Legendas/narração | `html_saida.py:133` | 6.23 verifica `aria-describedby`, explicação, leitor de tela e presença da legenda HTML | Coberto em tema ANAC com áudio; não testa todos os anúncios/estados em leitor de tela real. |
| Apoio/narração/VLibras | `html_saida.py:134` | 6.22 verifica o texto “Ouvir texto atual”; 6.14/6.22 verificam o botão de ajuda | Conteúdo da ajuda assertado; serviço VLibras externo não é exercitado pelo teste. |
| Desktop tooltip / mobile popover | `painel.css`, `painel.html`; botão `i` reutilizado | 6.14 e 6.22 verificam expansão, posição e caixa dentro da viewport; capturas desktop/mobile | Cobertura automatizada nos dois temas ANAC e no GOVBR; não há verificação com leitor de tela real. |

**Conclusão revisada:** não encontrei defeito de conteúdo nas ajudas SPEC 08/09. O componente `i`/popover já existia e é compartilhado; as verificações 6.14/6.22/6.23 cobrem a renderização nos temas, os tópicos das ajudas e as instruções de webcam. Não foi necessário alterar código: a lacuna era o relatório de auditoria desatualizado. Limites remanescentes são físicos (câmera/permissões/leitor de tela); não são falhas automatizadas observadas.


## Formatos padrão e opcionais em “Gerar arquivos” (25/11/2026)

- **Problema reproduzido:** as opções já existiam, mas estavam dentro de `<details id="dxFmt">` fechado por padrão; sem expandir “Formatos dos arquivos”, HTML/Markdown e os formatos opcionais não apareciam.
- **Diagnóstico:** `web/index.html:130` controla a expansão; os defaults e a persistência dos seletores estão em `web/index.html:133-138` e `web/opcoes.js:82-93`. GOVBR não é aplicável; foi reutilizado o `<details>` nativo. Nenhuma opção ou persistência foi removida.
- **Defaults exibidos:** HTML e Markdown (.md) marcados; DOCX, PPTX, EPUB e EPUB OpenDyslexic desmarcados. Preferências já salvas neste navegador continuam sendo respeitadas.
- **TDD:** o teste 16.10 falhou antes da mudança com `aberto: false`, mantendo a lista correta `[true,true,false,false,false,false]`; após deixar o `<details>` aberto inicialmente, passou. O teste 16.11 continua verificando que a escolha fica lembrada. Capturas: [opções recolhidas](spec10-formatos-antes.png) e [opções visíveis](spec10-formatos-depois.png).
- **Arquivos:** `web/index.html` e `tools/testes/grupos/acessibilidade_arquivos.py`. Grupo 16: **12 ok, 0 falhas**; `git diff --check` sem erros.


Capturas complementares da ajuda da webcam no tema escuro: [desktop](spec08-webcam-escuro-desktop.png) e [mobile](spec08-webcam-escuro-mobile.png). A ajuda abriu, manteve os três gestos e os nomes de navegadores, e sua caixa ficou dentro da viewport nos dois tamanhos.


## Regressões PPTX/HTML ANAC reportadas em M.3 (25/11/2026)

- **Causas reproduzidas:** `pptx.py` usava texto branco também sobre caixas claras e convertia Mermaid somente em tabela; `pptx.py` e `layout.css` desenhavam a faixa lateral; `web/exemplo/apresentacao.md` incluía o texto “Apresentação de uso da aplicação” abaixo do subtítulo da capa.
- **GOVBR/reuso:** estrutura e conversão de slides existentes foram mantidas; a imagem Mermaid pré-renderizada pelo navegador é encaminhada ao mesmo gerador PPTX. A faixa é removida, sem criar outro layout ou componente.
- **Alterações:** `tools/conteudo/pptx.py`, `tools/conteudo/html_saida.py`, `tools/gerador.py`, `web/exemplo/apresentacao.md` e `tools/testes/grupos/geracao.py`.
- **TDD:** novo teste 6.26 falhou antes nas duas variantes ANAC para contraste, faixa e ausência de imagem; passou após as correções. Teste 6.21 também confirma que o texto retirado do exemplo não aparece na capa.
- **Validação:** grupo 6: **52 ok, 0 falhas**. Suíte completa Chrome: **340 ok, 0 falhas, 355 s**. M.3 áudio no PowerPoint segue pendente de verificação manual; não foi validado neste ambiente.
- **Evidências HTML (Chrome 1280×720):** claro [antes simulado](m3-anac20-claro-antes-simulado.png) / [depois](m3-anac20-claro-depois.png); escuro [antes simulado](m3-anac20-escuro-antes-simulado.png) / [depois](m3-anac20-escuro-depois.png). As imagens “antes” reativam por CSS a faixa que existia antes; não são capturas históricas.
- **Limite manual:** PowerPoint não está instalado/disponível neste ambiente (`Get-Command POWERPNT.EXE` sem resultado). A abertura/renderização visual do PPTX e o áudio M.3 não foram verificados no aplicativo real; validação automatizada confirma a imagem Mermaid embutida e as formas/cores no arquivo.
- **Estado:** alterações e evidências locais, não commitadas nem publicadas.


## Barra do editor Markdown: extras sem gaveta “Mais” (25/11/2026)

- **Decisão atualizada pelo usuário:** Compartilhar, Versões, Tela cheia e Acessibilidade ficam fora dos menus. Não sobra conteúdo em “Mais”, então a gaveta foi removida; permanecem os menus Formatar e Inserir.
- **Correção mínima:** os botões existentes são exibidos e ordenados após edição/inserção e antes dos modos; removido o separador forçado entre linhas no celular para caber em até duas linhas.
- **TDD/validação:** o teste 26.21 falhou antes ao verificar extras ocultos e menu Mais. Após a alteração, os grupos `editor` e `12` passaram; o grupo `9` passou com **25 ok, 0 falhas**, incluindo inserção via menu, ordem móvel e acessibilidade.
- **Suíte completa após a correção:** `python tools/testes/testar_apresentacao.py --completo --navegador chrome --tentativas 2` — **342 ok, 0 falhas**, 351 s. M.1–M.4 continuam aparecendo como verificações manuais no relatório automatizado; M.3 tem confirmação do usuário de que o áudio tocou.
- **Arquivos:** `web/celular.js`, `tools/testes/grupos/editor.py`, `tools/testes/grupos/acessibilidade_texto.py`, `web/ajuda.js`.
- As capturas anteriores mostram a gaveta antiga e já não representam a interface atual.
- Capturas atuais da toolbar sem “Mais”, geradas após a suíte: [desktop](toolbar-sem-mais-desktop.png) e [celular](toolbar-sem-mais-mobile.png). No celular: 2 menus, 4 extras visíveis, 3 modos e sem overflow (390 px).

## Confirmação manual do PPTX (25/11/2026)

- O usuário confirmou que o áudio do PPTX funcionou. Não foi possível verificar independentemente neste ambiente; o avanço automático sincronizado ao fim do áudio não foi explicitamente confirmado.

## Matriz consolidada SPEC 02–10

| SPEC | Evidência existente | Situação |
|---|---|---|
| 02 — Tabelas | `matriz-tabelas.json`, 20/20 comparações GOVBR/ANAC (simples, larga, imagem, texto longo e muitas colunas; desktop/mobile); teste 6.17 | Estrutura, overflow e zoom iguais; paletas dos temas seguem intencionalmente diferentes. |
| 03 — Licença | Teste 6.11; sequência HTML `html_saida.py:268-283`, PPTX `pptx.py:59-68,189` | Inserção antes do slide de encerramento; apresentações sem licença e com licença cobertas pelo teste. |
| 04 — Encerramento | Testes 6.11/6.21; verificação estrutural do PPTX no registro 1.116 | Último slide de conteúdo sem texto; PPTX ANAC conserva apenas numeração/arte de encerramento conforme formato. |
| 05 — Capa ANAC | Testes 6.13/6.21/6.26; capturas `capa-atual.png`, `spec10-1.116-*-capa-*` | Logo/selo e geometria cobertos em HTML/PPTX; capturas históricas identificadas como simuladas quando aplicável. |
| 06 — Cores | Testes 6.18/6.26; temas em `temas.py`; capturas HTML claro/escuro | Contraste e ausência da faixa verde verificados; identidade de cor estrutural ANAC é azul, tokens de tema mantidos. |
| 07 — Acessibilidade | Testes 6.14/6.22/6.25/27; `painel.css` e `painel.html` | Botões, foco, hover, estado ativo e viewport testados. Não há validação assistiva manual independente. |
| 08 — Ajuda contextual | Auditoria acima (linhas 102–118); testes 6.14/6.22/6.23; capturas desktop/mobile | Tooltip/popover e conteúdo cobertos por partes; alto contraste e alguns textos/estados são limites documentados. |
| 09 — Webcam | Testes 6.14–6.16; ajuda inclui gestos e instruções Chrome/Android/Safari/Edge | Textos e gestos simulados cobertos. Permissões/câmera reais e recuperação em cada navegador requerem validação manual. |
| 10 — Validação final | Suíte completa após toolbar: **342 ok, 0 falhas**; testes de geração 6.21–6.26 | Chrome e saídas HTML/PPTX/EPUB/DOCX/GOVBR/ANAC cobertos automaticamente. M.1 e avanço automático M.3 ainda sem confirmação; M.2/M.4 confirmados pelo usuário. |

HTML independente: a apresentação gerada é aberta como arquivo HTML local nos testes, sem exigir o aplicativo web. Evidências e relatórios permanecem locais, sem commit/publicação nesta etapa.
