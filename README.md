# Conteudista ANAC — Gerador de conteúdos no navegador

Página única que converte os arquivos Markdown de um conteúdo em:

| Apostila | Apresentação |
|---|---|
| `Apostila_<NOME>.md` · `.html` · `.docx` | `Apresentacao_<NOME>.md` · `.html` · `.pptx` |

**Nenhum conteúdo é salvo no site.** A conversão roda no navegador de quem usa (Python via Pyodide). O repositório e o site contêm apenas a ferramenta e um conteúdo de exemplo (o guia de uso do próprio Conteudista), por isso podem ser públicos.

## Recursos

| Recurso | Como funciona | Onde o conteúdo fica |
|---|---|---|
| Editor Markdown | Barra de ferramentas, **desfazer/refazer** próprio (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z e botões; cobre botões, arquivos e rascunhos), atalhos (Ctrl+B/I/E/K, Ctrl+Shift+1/2/3 títulos, Ctrl+Shift+7/8/9 listas, Alt+↑/↓ mover linha, Ctrl+Shift+D duplicar), modos Editar/Dividido/Prévia, tela cheia, prévia fiel ao gerador (inclusive slides) | Só na memória do navegador |
| Tutorial, Ajuda e Atalhos | Tutorial guiado na primeira visita (ou botão ▶ Tutorial), com **reinício** (↺ no tutorial, botão na Ajuda ou `Alt+Shift+R`); Ajuda **com busca** e destaque dos termos (botão ou F1); atalhos `Alt+Shift+tecla` com janela de consulta (botão ⌨ Atalhos ou `Alt+Shift+K`) | — |
| Gerar conteúdo | Apostila + apresentação em Markdown → 8 arquivos + ZIP (apostila MD, HTML, DOCX, EPUB e EPUB OpenDyslexic; apresentação MD, HTML e PPTX; PDF pela impressão do HTML). O licenciamento Creative Commons é opcional; por padrão, não há declaração. Se houver itens para corrigir, a pessoa escolhe conferir, gerar mesmo assim ou cancelar. O relatório pode ser incluído no ZIP | Só na memória do navegador |
| Imagens em base64 | Arraste, cole (Ctrl+V) ou insira pelo botão de imagem; no editor aparecem como `(img:N)` | No próprio texto `.md` |
| Versões salvas | Salvamento automático ligado por padrão (recupera o último trabalho ao reabrir) e **versões salvas** (**Salvar ▾ → Guardar no navegador**), reunidas em **Versões** e em **Importar → Salvos**. O horário do último salvamento automático aparece sob a barra de ações | IndexedDB do navegador, só nesta máquina |
| Salvar ▾ | Botão ao lado de **Gerar arquivos** que reúne as formas de guardar neste computador. Itens: **Guardar no navegador** (versão), **Baixar tudo (.zip)**, **Salvar na pasta** (grava os `.md` e os arquivos gerados numa pasta escolhida, Edge/Chrome) e **Baixar .md** | Navegador ou disco do usuário |
| Compartilhar link | Botão na **barra de ações**, depois de **Importar**; ícone na **barra de ferramentas de cada editor**; botão **ao lado de Salvar ▾** (fora do menu). Os três abrem a **mesma janela** (**Link do conteúdo**; `Alt+Shift+L`). No celular o rótulo vira **Link** | Somente no link |
| Link autocontido | Conteúdo comprimido e cifrado (AES-256-GCM) no próprio link; chave no `#` ou senha (PBKDF2 310.000 iterações) | Somente no link |
| Versões do texto | Botão **Versões** na barra do editor ou `Alt+Shift+V`. Versões guardadas no navegador (edições da sessão a cada 3 min, arquivos carregados, links abertos, rascunhos, exemplo, versões marcadas ★, geração/compartilhamento; “antes de carregar/restaurar” automático; até 120). Diff “antes e depois” entre quaisquer duas versões ou o conteúdo atual: lado a lado ou unificado, só alterações ou texto completo, palavras destacadas, imagens como miniaturas e lista de imagens removidas/incluídas; restaurar, baixar A/B, excluir. **Importar link** traz o texto-fonte de um link como versão **via link**, sem alterar os editores | IndexedDB do navegador, só nesta máquina |
| Tamanho antes do envio | Estimativa do conteúdo e do envio cifrado, com alerta perto do limite de 10 MB e confirmação antes de enviar | — |
| PrivateBin | Formato PrivateBin v2 (AES-256-GCM, PBKDF2-SHA256 100.000, chave base58 no `#`); **senha opcional** (chave ‖ senha, compatível com o site do PrivateBin); **imagens como anexo ZIP** (`.md` + `imagens/`), restauradas para base64 ao abrir aqui; expiração e leitura única | Servidor PrivateBin (somente conteúdo cifrado) |

## Estrutura

```
web/index.html           ← a página
web/motor-python.js      ← inicialização do Pyodide e carregamento do pacote Python
tools/gerador.py         ← API gerar e comando de geração; reexporta as funções existentes
tools/conteudo/          ← Markdown, imagens, estado, fontes, áudio e exportadores por formato
tools/conteudo/temas.py  ← paletas, tipografia e conversão de cores
tools/conteudo/recursos/ ← CSS, JavaScript e HTML por funcionalidade, embutidos nos arquivos gerados
tools/conteudo/arquivos.json ← manifesto dos módulos e recursos carregados no navegador
tools/testes/grupos/     ← roteiro de navegador separado por funcionalidade
tools/testes/casos/      ← exemplos mínimos de teste; o curso demonstrativo fica em web/exemplo
web/editor.js            ← editor Markdown leve (sem dependências)
web/opcoes.js            ← opções padrão (lê web/config/opcoes.yaml)
web/config/opcoes.yaml   ← padrão de cada opção de ligar e desligar (edite aqui)
docs/OPCOES.md           ← lista das opções (gerada)
tools/opcoes/            ← verificação e testes das opções (Node, sem dependências)
web/lib/linguagem-acessivel/ ← biblioteca de acessibilidade e linguagem simples (módulo ES, sem dependências)
tools/linguagem-acessivel/   ← testes e geração da documentação da biblioteca
tools/lac/               ← linha de comando lac (comandos.json é a fonte única da ajuda e da futura API)
tools/pacote/            ← pacotes de atualização: criar, aplicar, testar e cdt (Termux)
tools/verificar.sh       ← verificação completa sem navegador (usada pelos fluxos do GitHub)
pacotes/                 ← pasta opcional para enviar os pacotes .zip
docs/decisoes/           ← registro de decisões do projeto
web/ajuda.js             ← tutorial guiado, ajuda e atalhos de teclado
web/historico.js         ← histórico de versões, comparação (diff) e Importar link
web/gerados.js           ← arquivos gerados guardados no navegador (IndexedDB)
web/metadados.js         ← Nome do conteúdo, Rodapé (opcional) sempre visível (a Barra superior foi retirada)
web/dicas.js             ← dicas (tooltip) acessíveis dos botões da barra do editor
web/janelas.js           ← Importar, Salvar ▾ (menu), Compartilhar link e Histórico de arquivos (janelas, barra de ações e status do salvamento)
web/colar.js             ← Importar > Link (primeira aba) e Importar > Colar (subabas Apostila e Apresentação)
web/acessibilidade.js    ← painel Acessibilidade do texto (usa web/acessibilidade-worker.js e a biblioteca)
web/relatorio-acessibilidade.js ← exportação do relatório HTML, JSON e Markdown
web/acessibilidade-config.js ← configuração avançada e importação/exportação JSON
web/acessibilidade-geracao.js ← confirmação não bloqueante antes de gerar
web/vlibras.js           ← carrega VLibras no aplicativo somente após clique
web/acessibilidade-marcas.js ← marcas no texto e balão de correções (1.81)
web/acessibilidade-janelas.js ← janelas Descrever imagem, Simplificar trecho e Explicar sigla, com pedido para IA (1.82)
web/celular.js           ← editor no celular: barra em até duas linhas, contagem em uma linha, Imagens do texto em folha inferior
web/versoes.js           ← rascunhos e versões unificados (salvar, abrir, excluir e migração dos dados antigos)
web/locucao.js           ← aba Locução
web/notas-locucao.js     ← Locução › Notas dos slides (rascunho, aplicar, versões e link)
web/locucao-worker.js    ← motor de voz Kokoro-82M (Web Worker)
web/ptbr-g2p.js          ← fonemizador interno pt-BR
web/changelog.js         ← botão Novidades (lê o CHANGELOG.md)
web/govbr.css            ← tema do Padrão Digital de Governo (gov.br/ds)
CHANGELOG.md             ← histórico de versões da aplicação
web/exemplo/             ← conteúdo de exemplo: guia de uso (apostila, apresentação com notas para narração e prompt padrão para IA)
tools/fontes/            ← fontes de leitura (WOFF2), licenças OFL, manifesto.json, baixar-fontes.ps1 e verificar_fontes.py
tools/testar_acessibilidade.py ← testes de acessibilidade das saídas (EPUB, DOCX, PPTX e HTML)
tools/requirements.txt   ← python-docx, python-pptx, Pillow e lxml
.github/workflows/publicar-pagina.yml  ← testa e publica a página no GitHub Pages
```

## Leitura acessível

Os arquivos gerados foram ajustados para a leitura por pessoas com dislexia, sem retirar recursos.

| Formato | O que oferece |
|---|---|
| Apostila HTML | **Tema** (claro, escuro, alto contraste) e **Leitura** (Padrão/Verdana, Atkinson Hyperlegible Next, OpenDyslexic) independentes; a Leitura fica salva em `localStorage['conteudista.leitura']`. Texto em 16 px na Verdana (18 px em Atkinson e OpenDyslexic), entrelinha 1,7, à esquerda e sem hifenização; **Tamanho do texto** (A− · 100% · A+, de 90% a 150%) no cabeçalho, mesma preferência da apresentação (`localStorage['conteudista.leitura.tamanho']`); painel lateral Acessibilidade com contraste, espaçamento WCAG 1.4.12, régua, leitura em voz alta e VLibras sob demanda; foco visível; tabelas e código com rolagem por teclado; **Tabela do fluxo** para cada Mermaid; gabarito com `aria-expanded`; **Imprimir / PDF** em A4 |
| Apresentação HTML | Mesmo seletor **Leitura**; **Modo leitura** (`L`) vertical, em fundo claro, com as notas visíveis; barra de controles, contador, Slides/Leitura, zoom, narração e impressão A4; painel lateral Acessibilidade (folha inferior no celular) com alto contraste, espaçamento, régua, leitura em voz alta, legendas ligadas por padrão, movimento reduzido e opção de manter a barra visível; VLibras só carrega após clique |
| Apostila EPUB | `Apostila_<nome>.epub` (Atkinson Hyperlegible Next) e `Apostila_<nome>_OpenDyslexic.epub`; XHTML, sumário (nav e NCX), fontes embutidas, Mermaid em tabela, checklists ☐/☒ e metadados de acessibilidade (EPUB Accessibility 1.1) |
| Apostila DOCX | Verdana 12 pt, entrelinha 1,5, 6 pt após parágrafos, texto alternativo nas imagens, idioma pt-BR e cabeçalho de tabela repetido |
| Apresentação PPTX | Mantém a fonte do layout (`pptx_font`); texto alternativo, notas em pt-BR, cabeçalho de tabela (`firstRow`), entrelinha 1,2 e corpo de no mínimo 16 pt |

As fontes Atkinson Hyperlegible Next e OpenDyslexic ficam em `tools/fontes/` e são embutidas em base64 no HTML e como arquivo no EPUB; não há CDN para elas. A leitura padrão (Verdana) não precisa de arquivo.

## Acessibilidade

Referências: WCAG 2.2 (nível AA), ABNT NBR 17225:2025, Lei 13.146/2015 (LBI) e EPUB Accessibility 1.1. O objetivo é aproximar as saídas dessas referências; **não há certificação formal**.

Limitações conhecidas:

- O PDF da apostila é uma impressão do HTML em A4. Ele usa a fonte de leitura escolhida, mas **não é um PDF/UA**. Para um PDF com tags, use um conversor que preserve a estrutura ou o recurso de exportação acessível do Word.
- O DOCX não embute fonte: se o computador não tiver Verdana, o Word usa outra.
- O PPTX não tem modo leitura nem placeholders de título; a ordem de leitura dos objetos não foi revista. Recebe só texto alternativo, notas, cabeçalho de tabela, entrelinha, tamanho mínimo e idioma.
- O EPUB depende do leitor: leitores antigos podem não aceitar fontes WOFF2 e usam a fonte do aparelho.
- Imagem sem descrição (`![](…)`) continua sem texto alternativo; a geração mostra um aviso. A descrição não é inventada.
- As legendas dos arquivos HTML usam as notas do apresentador e ficam ligadas por padrão. O VLibras é opcional na geração, carregado somente após clique e requer internet. O painel HTML não transforma automaticamente o arquivo em PDF/UA.

### Fontes de leitura: manutenção

- `tools/fontes/manifesto.json` é a fonte de verdade: lista cada WOFF2 com peso, estilo, SHA-256 e origem. O aplicativo lê o manifesto e copia os arquivos para o Pyodide.
- Para baixar ou atualizar: `powershell -ExecutionPolicy Bypass -File .\tools\fontes\baixar-fontes.ps1`; depois `python tools/fontes/verificar_fontes.py`. Faça o commit da pasta inteira e atualize o parâmetro de cache (`?v=`) se trocar scripts.
- Se uma face faltar, a geração continua: o texto cai para Verdana e o resultado mostra um aviso.
- Créditos: Atkinson Hyperlegible Next — Braille Institute (Google Fonts); OpenDyslexic — Abbie Gonzalez (antijingoist/opendyslexic). Ambas sob a SIL Open Font License 1.1 (`OFL-*.txt` na mesma pasta).

## Acessibilidade do texto (painel do editor)

- **Botão Acessibilidade** na barra de cada editor (Alt+Shift+C). Mostra o número de itens para corrigir e abre um painel com dois níveis: **Para corrigir** e **Sugestões** (recolhidas). Cada item tem a correção em um clique (quando existe), **Ir para**, **Por quê?** e, nas sugestões, **Ignorar** (grava `<!-- linguagem-acessivel: ignorar CÓDIGO -->`). Alt+Shift+N vai ao próximo item.
- Usa a biblioteca `web/lib/linguagem-acessivel` em um Web Worker (`web/acessibilidade-worker.js`), 1 s depois da última tecla; sem Worker, roda na página. Nada sai do navegador. As correções usam `aplicarEdicoes` do editor (um passo no Ctrl+Z).
- Aviso perto de **Gerar arquivos** quando há itens para corrigir; nunca bloqueia. No celular, o painel é uma folha inferior modal e o botão fica no menu ⋯.
- **Conferência ao gerar:** com itens para corrigir, escolha **Conferir agora**, **Gerar assim mesmo** ou **Cancelar**. Sugestões não abrem confirmação. **Não perguntar de novo nesta sessão** é temporário; Alt+Shift+G segue o mesmo fluxo.
- **Relatório de acessibilidade:** exporte HTML, JSON ou Markdown pelo painel ou por Arquivos gerados. O aviso do relatório deixa claro que a verificação automática não substitui avaliação WCAG/eMAG. A opção `incluir_relatorio_no_zip` é desligada por padrão.
- **Configurar acessibilidade do texto:** ajuste sugestões, limite, aviso, confirmação, regras, marcas e ajuda de IA; níveis só podem ser rebaixados. Configurações podem ser importadas/exportadas em JSON.
- **Glossário por conteúdo:** `<!-- linguagem-acessivel: siglas QWER=Quadro de Registro -->`; as definições do conteúdo prevalecem sobre o glossário institucional e as siglas conhecidas.
- Opções: `acessibilidade_texto` no `opcoes.yaml` (mostrar sugestões, limite de palavras por frase, aviso perto de Gerar arquivos). Código: `web/acessibilidade.js`. Testes: grupo 12 do roteiro do navegador.
- **Janelas de apoio (1.82):** `web/acessibilidade-janelas.js` abre Descrever imagem, Simplificar trecho e Explicar sigla quando a correção tem `acao`. Descrever e Simplificar têm a aba **Pedir ajuda a uma IA**, que usa `montarPedido` e `lerResposta*` da biblioteca (pedidos versão 1.0). A IA fica fora do Conteudista. Opção `acessibilidade_texto.ajuda_ia`. Testes: grupo 14.
- **Imagens decorativas:** o gerador lê `<!-- linguagem-acessivel: decorativa -->` antes da imagem (`DECORATIVAS` em `tools/conteudo/contexto.py`): texto alternativo vazio sem aviso e, no PPTX, a marca de imagem decorativa.
- **Marcas no texto (1.81):** `web/acessibilidade-marcas.js` desenha, numa camada transparente sobre o campo (mesma fonte, recuo e quebra de linha), sublinhado ondulado vermelho para o que é para corrigir e pontilhado âmbar para sugestões. Clique numa marca abre o balão com as correções; Alt+Shift+I leva o foco a ele. As marcas somem ao digitar e voltam com a próxima conferência. Resumo no rodapé do editor. Opções `marcas_no_texto` e `marcas_sugestoes`. Testes: grupo 13.

## Celular e zoom

- **Editor no celular (até 700 px):** barra em no máximo duas linhas, com menus no padrão Dropdown do gov.br (H: títulos, código e listas; +: Inserir; ⋯: Mais), contagem em uma linha e **Imagens do texto** recolhida, aberta como folha inferior por **Inserir**. Os botões originais continuam no lugar, escondidos, e os menus acionam esses botões. Liga e desliga em `celular` no `opcoes.yaml`.
- **Importar:** **Link** é a primeira aba e abre selecionada (`importar.aba_inicial: link`; `ultima` volta ao comportamento anterior). Erros do link em linguagem simples.
- **Zoom nos arquivos gerados:** a apostila aceita a pinça e o Ctrl + roda do navegador. Na apresentação, o palco se ajusta à tela, então o zoom é próprio: pinça nativa no celular, toque duplo, Ctrl + roda, teclas + − 0 e botão **100% ↺**; com zoom, as setas movem a visão e o deslizar não troca de slide. Imagens e fluxos têm o botão **Ampliar** (lupa), que abre a imagem em tela cheia com zoom (recursos em `tools/conteudo/recursos/zoom/`).

## Biblioteca Linguagem Acessível (`web/lib/linguagem-acessivel/`)

Confere acessibilidade e linguagem simples em textos Markdown. É a base do editor, do gerador, do `lac` e da API HTTP local. Nesta versão (0.3.0) traz 11 regras. Para corrigir: `i1`, `i2`, `e1`, `e2`, `e3` e `k1`; sugestões: `f1`, `f2`, `f3`, `s1` e `n1`. O glossário pode vir do conteúdo, de `config.siglas` ou da lista institucional, nessa ordem.

- **Linha de comando `lac`** (`tools/lac/`): `lac c apostila.md`, `lac c -f relatorio apostila.md`, `lac c --config web/config/opcoes.yaml apostila.md`, `lac a -d apostila.md`, `lac p simplificar < trecho.txt`. No Windows: `tools\lac\lac.cmd`. `lac servir -p 8787` inicia a API local; OpenAPI 3.1 em `tools/lac/openapi.json`. CORS é negado por padrão; `LAC_CORS_ORIGINS` configura origens permitidas. O servidor não registra nem guarda conteúdo.

- Uso, contrato e estrutura: `web/lib/linguagem-acessivel/README.md`. Regras e marcadores: `docs/linguagem-acessivel/`.
- Testes (sem dependências): `node tools/linguagem-acessivel/testar.mjs`. Rodam antes de cada publicação; o conteúdo de exemplo não pode ter nenhum item "para corrigir".
- Decisões de projeto: `docs/decisoes/`.

## Atualizar pelo celular (pacotes)

Cada versão nova chega como `conteudista-pacote-<versão>.zip`. Envie o ZIP para a raiz do repositório (**Add file › Upload files › Commit changes**) ou use `cdt` no Termux. O fluxo **Aplicar pacote** (`.github/workflows/aplicar-pacote.yml`) confere o manifesto, roda `tools/verificar.sh` e o roteiro no Chrome, grava no `main`, apaga o ZIP e inicia a publicação. Se falhar, nada muda e abre uma issue com o rótulo `pacote`. Detalhes, instalação do `cdt` e formato: `tools/pacote/LEIA-ME.md`.

Uma vez: **Settings › Actions › General › Workflow permissions › Read and write permissions**.

## Opções padrão (`web/config/opcoes.yaml`)

As opções de ligar e desligar da página (salvar automático, lembrar links, guardar cada geração, narração, modo do editor, PrivateBin, aba inicial de Importar etc.) começam como define `web/config/opcoes.yaml`.

- **Mudar um padrão:** troque o valor depois dos dois-pontos (`ligado` / `desligado`, ou uma das opções indicadas no comentário), salve e publique. Use 2 espaços para recuar.
- **Quem prevalece:** a escolha da pessoa no próprio navegador > `opcoes.yaml` > padrão do código. O botão **Restaurar padrão** (rodapé) volta ao arquivo sem apagar textos, rascunhos ou versões.
- **Erro no arquivo:** a página abre com os padrões do código e registra o aviso no console; a publicação no GitHub é recusada e a mensagem diz a linha.
- **Lista completa:** `docs/OPCOES.md`. No VS Code, `opcoes.schema.json` completa e valida enquanto você digita.
- **Opção nova no código:** registre em `REGISTRO` (`web/opcoes.js`) e rode `node tools/opcoes/verificar_opcoes.js --gerar`. O teste falha se uma caixa de ligar/desligar da página não estiver registrada.

## Manutenção

- Layout dos arquivos gerados: dicionário `TEMAS` em `tools/conteudo/temas.py` (`govbr` = padrão, `classico` = original). Para um tema novo (ex.: ANAC), copie o bloco `govbr`, ajuste cores e fontes e acrescente a opção no campo **Layout (tema)** do `web/index.html`. Linha de comando: `--tema govbr|classico`.

- **Licenciamento do conteúdo:** o seletor **Licenciamento**, ao lado de **Layout (tema)**, começa em **Sem licenciamento**. Quando escolhido, o aviso completo e discreto aparece ao final da Apostila e em um slide próprio ao final da Apresentação, inclusive nos formatos Markdown, HTML, DOCX, EPUB e PPTX. A escolha acompanha o trabalho salvo, as versões e os links; não é uma preferência global. Selecione uma licença apenas se tiver autorização para licenciar o conteúdo; indique os créditos necessários no próprio material. Marcas e materiais de terceiros não são abrangidos automaticamente.

- **Regra global de interface (botões):** a confirmação de ação concluída é só visual (botão verde com tick por 1,2 s: verde imediato, 1 s em verde e 0,2 s de esmaecimento; tick em SVG equidistante da borda e do texto). Nunca insira texto na tela; use `UXFeedback.confirmar(botao, mensagem)` em `web/ux-feedback.js`, que envia a mensagem a leitores de tela por uma região oculta.
- A cada mudança, acrescente uma entrada curta no topo do `CHANGELOG.md` e atualize `VERSAO` em `web/changelog.js`.
- O visual segue o Padrão Digital de Governo (https://www.gov.br/ds/). Ajuste cores e componentes em `web/govbr.css`.

- Alterou o visual dos arquivos gerados? Edite o recurso da funcionalidade em `tools/conteudo/recursos/` ou as definições em `tools/conteudo/temas.py`; o workflow testa e republica. Arquivos novos precisam entrar em `tools/conteudo/arquivos.json`.
- A versão 3.7 do gerador (1.56) preserva comentários HTML dentro de código, na apostila e na prévia; não trata exemplos de imagem escritos em código como imagens pendentes; e reinicia a numeração de cada lista numerada no DOCX.
- A versão 3.8 do gerador (1.61) acrescenta o parâmetro opcional `fluxos` (imagens dos fluxos Mermaid, por código, para o HTML dos slides) e passa a desenhar no navegador, com todos os slides mensuráveis, os fluxos que ficam como código.
- A página precisa de acesso a `cdn.jsdelivr.net` (motor Python e desenho dos fluxos Mermaid). O PrivateBin exige que a instância aceite chamadas de outros sites (CORS); se não aceitar, use o link autocontido.

## Execução local (opcional, com Python 3)

```
pip install -r tools/requirements.txt
python tools/gerador.py apostila.md apresentacao.md --prefixo Meu_Conteudo --rodape "SIGLA · ANAC" --licenca cc-by-4.0 --saida saida
# só um dos dois: use '-' no lugar do arquivo ausente (ex.: python tools/gerador.py - apresentacao.md ...)
```

Opções de `--licenca`: `cc-by-4.0`, `cc-by-sa-4.0`, `cc-by-nd-4.0`, `cc-by-nc-4.0`, `cc-by-nc-sa-4.0`, `cc-by-nc-nd-4.0` e `cc0-1.0`. Se omitido e os Markdown tiverem sido exportados pelo Conteudista, o gerador reaproveita o metadado de licença; sem seleção, não inclui aviso.

## Controles da apresentação HTML (B+)
No celular em retrato (até 700 px), o Modo slides usa um palco de 480 px de largura que preenche a tela, com texto legível; em paisagem e em telas maiores o palco continua em 1280 × 720 ajustado à tela. A barra usa Pointer Events e estado centralizado, adaptando densidade e interação à largura e à entrada atual (mouse, teclado, toque ou caneta). Barra em pílula branca com ícones SVG, legenda com nome e atalho em cada botão, som da narração sempre visível e tela cheia flutuante no canto superior direito; some por completo após 2,5 s sem interação. Atalhos: `←` anterior · `→` próximo · `Espaço` reproduzir/pausar (a pausa vale também para o áudio da narração e é respeitada ao mudar de slide) · `G` ir para o slide (ou clique no contador) · `L` modo leitura/slides · `A` acessibilidade · `S` som da narração · `N` notas · `F` tela cheia · `M` mais opções · `?` ajuda · `Esc` fechar a camada atual. No toque, o primeiro toque revela os controles e o gesto horizontal navega entre slides.

**Imprimir / PDF…** (menu Mais opções ou Ctrl+P) abre a janela *Imprimir apresentação*, com os formatos **Slides** (um slide por página, 16:9) e **Documento** (linear, A4), notas opcionais. A impressão nunca altera o Modo slides/Modo leitura.

## Testes automatizados

O roteiro de validação roda no **Google Chrome** (Playwright) e cobre os grupos 1–21: editor, geração, confirmação, relatório/schema, configurações, API, axe-core, viewports 320–1920 px, preferências do sistema e arquivos gerados. Ele roda quando código relevante muda, em pull requests ou manualmente; pacotes passam pela bateria uma vez e não repetem a mesma validação na publicação. No computador: `powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1` (usa o Chrome instalado). Detalhes e pendências manuais em `tools/testes/LEIA-ME.md`; resultado da entrega 1.89 em `docs/auditoria-1.89.md`.

## Atalhos da aplicação

`Alt+Shift` + tecla (no Mac, `Option+Shift`): **G** gerar · **E** exemplo · **D** baixar .md · **P** salvar em pasta · **S** salvar versão · **A** ligar/desligar autossalvamento · **L** criar link · **O** abrir link · **V** versões do texto · **1/2** abas · **M** modo do editor · **F** tela cheia · **T** tutorial · **R** reiniciar tutorial · **H** ajuda · **K** lista de atalhos · **F1** ajuda.

## Conteúdo de exemplo e prompt padrão para IA

O botão **Carregar exemplo** carrega `web/exemplo/treinamento.md` (apostila) e `web/exemplo/apresentacao.md` (apresentação), que formam um **guia de uso do próprio Conteudista**. Os nomes dos arquivos são mantidos por compatibilidade com o carregamento em `web/index.html` e com o workflow de publicação.

| Arquivo | Conteúdo |
|---|---|
| `treinamento.md` | Apostila de 16 seções: Início rápido, funcionamento, percurso de aprendizado, edição, importação, formas de guardar, geração, locução e narração, o que cabe no Markdown, produção com IA, fluxo de trabalho, checklists, exercícios, gabarito e referências. Traz 5 fluxos Mermaid, 5 capturas de tela atuais, links para vídeos e o **prompt padrão para IA** (seção 11.3) |
| `apresentacao.md` | 39 slides, um assunto por slide, com notas para narração (cerca de 17 minutos de áudio), 7 fluxos Mermaid e 3 figuras; inclui 5 slides sobre acessibilidade do texto |

Manutenção do exemplo:

- É texto comum: edite os dois `.md`. As figuras são PNG embutidas em base64, de modo que cada arquivo é autossuficiente.
- As capturas mostram Licenciamento, o menu Salvar, Importar › Salvos, Arquivos gerados e o painel de revisão do editor. Use conteúdo demonstrativo sem dados pessoais; mantenha descrições e instruções equivalentes em texto. Não dependa da posição, da cor ou de números sobre a imagem.
- O prompt padrão está em um único bloco de código (versão 1.1). Qualquer mudança na sintaxe aceita pelo gerador deve ser refletida nas seções 5 e 6 do prompt e na tabela da seção 10 da apostila. A versão 1.1 acrescentou à seção 4 as regras de acessibilidade e linguagem simples (itens 8 a 17) e à seção 8 a conferência correspondente. Ao mudar o texto do prompt, suba a versão.
- O exemplo precisa ficar sem itens **para corrigir** (`node tools/lac/lac.mjs c -n c web/exemplo/*.md`); a publicação no GitHub confere. As sugestões que restam estão registradas em `tools/linguagem-acessivel/resultados/` (atualize com `node tools/linguagem-acessivel/testar.mjs --atualizar-exemplo` e revise o diff). Exemplos de texto "ruim" ficam em código, para não serem acusados.
- Seções sobre acessibilidade: 5.6 (uso do painel e das marcas) e 10.6 (como escrever), além de 5 slides antes de "Gerar arquivos".
- As notas dos slides são escritas para serem ouvidas: texto corrido, sem símbolos, parênteses nem endereços.
- O workflow de publicação gera o exemplo com os temas `govbr` e `classico` como teste.
- Na apostila em HTML, os fluxos Mermaid são desenhados no navegador de quem lê e dependem de `cdn.jsdelivr.net`. Na apresentação em HTML, cada fluxo é convertido em imagem ao gerar os arquivos (`prepararFluxos`, em `web/index.html`; o gerador recebe o parâmetro `fluxos`); sem a imagem, o HTML desenha o fluxo no navegador com todos os slides mensuráveis (classe `mm`). O `.md` e o PPTX não mudam.

## Atalhos do editor (com o cursor no editor)

`Ctrl+Z` desfazer · `Ctrl+Y` / `Ctrl+Shift+Z` refazer · `Ctrl+B` negrito · `Ctrl+I` itálico · `Ctrl+E` código · `Ctrl+K` link · `Ctrl+Shift+1/2/3` títulos · `Ctrl+Shift+7/8/9` lista numerada / marcadores / checklist · `Ctrl+Shift+.` citação · `Ctrl+L` selecionar linha · `Ctrl+Shift+D` duplicar linha · `Alt+↑/↓` mover linha · `Tab`/`Shift+Tab` recuo · `Enter` continua listas.

<!-- locucao -->
## Locução (texto em fala, no navegador)

Aba **Locução** (`Alt+Shift+3`): gera áudio a partir de texto no navegador com **Piper** (padrão para português, voz `pt_BR-faber-medium`) ou **Kokoro-82M** (`onnx-community/Kokoro-82M-v1.0-ONNX`, `dtype: "q8"`, ~86 MB), 100% no navegador.

A aba tem dois modos. **Notas dos slides** (`web/notas-locucao.js`) edita a narração slide a slide: **Importar notas** cria um rascunho (guardado em `localStorage['conteudista.locucao.notas']`) com um campo por slide; **Aplicar à apresentação** grava de volta, no Markdown da aba Apresentação, só os slides alterados (`<!-- notas: … -->`, `<!-- narracao: … -->` ou `<!-- narracao: nao -->`), depois de guardar uma versão "Antes de aplicar as notas da Locução". Conflitos (nota alterada nos dois lados) são resolvidos por slide. **Versões** abre a janela de comparação no documento **Notas dos slides** (e oferece a pseudo-versão "Rascunho da Locução"); **Compartilhar link** abre a mesma janela de link do editor e, se houver alterações não aplicadas, pergunta antes se deve aplicá-las. A leitura dos slides segue as mesmas regras de `split_slides`/`notas_para_narracao` do gerador. **Texto livre** é o modo anterior.

| Item | Como funciona |
|---|---|
| Motor Piper (padrão pt-BR) | `web/locucao-piper-worker.js` (Web Worker) com `@mintplex-labs/piper-tts-web`; voz `pt_BR-faber-medium` (~63 MB, guardada no navegador); fonemas pelo espeak-ng pt-br embutido. Selecionar uma voz Kokoro mantém a alternativa de locução, sem perder os áudios salvos. |
| Motor Kokoro (mantido) | `web/locucao-worker.js` (Web Worker) com `kokoro-js@1.2.1`; WebGPU com fallback automático para WASM; teste de áudio após carregar; barra de progresso real do download |
| Vozes pt-BR | `pf_dora`, `pm_alex`, `pm_santa`. O `kokoro-js` 1.2.1 e o `phonemizer` 1.2.1 só tratam inglês. Para pt-BR o worker tenta o espeak-ng em WebAssembly e, se indisponível, usa o fonemizador interno `ptbr-g2p.js`; seletor “Pronúncia em português” no painel Motor de voz |
| Textos longos | Fragmentação por frases (≤ 250 caracteres em pt-BR), geração trecho a trecho, cancelamento |
| Áudio | Costura PCM via Web Audio API com micro-fades (sem estalos) e pausa configurável; WAV PCM 16 bits, 24 kHz |
| Histórico/cache | IndexedDB `KokoroTTS_DB` / `audio_history` (índice `text + voice + speed`); texto idêntico com a mesma voz, velocidade e pausa é servido do histórico; painel com Ouvir, Baixar, Usar texto, Excluir e busca |
| Integração | Importa notas do apresentador, texto dos slides ou a apostila (sem Markdown); ajuda e atalhos (`Alt+Shift+3`, `Alt+Shift+N`) |

## Arquivos gerados guardados no navegador

`web/gerados.js`: após cada **Gerar arquivos**, guarda os 8 arquivos + ZIP no IndexedDB `conteudista_arquivos` (últimos 10 por padrão), com download, visualização do HTML e exclusão. A lista abre em uma janela pelo botão **Histórico**, no cabeçalho da seção **Arquivos gerados**. Cada pacote guarda o nome do conteúdo, a data e a hora, o tamanho, o layout, o rodapé e a narração; o campo **Buscar** da janela (e o de **Importar › Salvos**) filtra por qualquer desses dados e pelo tipo de arquivo (`web/janelas.js`, padrão de campo de busca do Design System gov.br).

> Para atualizar o repositório use sempre o `conteudista-web.zip` mais recente com o `atualizar-conteudista.ps1`.

## Hospedagem local dos modelos de voz

Para a Locução funcionar em redes que bloqueiam o Hugging Face ou o jsDelivr, o workflow pode copiar os modelos e bibliotecas para o próprio site (pasta `modelos/` e `vendor/`). Os workers usam `modelos/manifest.json` para buscar localmente; o que não estiver hospedado continua vindo da internet.

| Variável do repositório (Settings → Secrets and variables → Actions → Variables) | Padrão | Opções |
|---|---|---|
| `MODELOS_LOCAIS` | `piper-ptbr,piper-catalogo` | perfis de `web/modelos.json`: `piper-ptbr` (~63 MB), `piper-catalogo`, `kokoro-fp32` (~330 MB), `kokoro-q8` (~90 MB) ou `nenhum` |
| `BIBLIOTECAS_LOCAIS` | `piper,kokoro,espeak,lamejs` | pacotes npm copiados para `vendor/`; as dependências deles (ex.: `onnxruntime-web`) continuam vindo do jsDelivr. Se a biblioteca local falhar, a Locução usa a do CDN automaticamente. Use `nenhum` para sempre usar o CDN |

O GitHub Pages limita o site a ~1 GB. Para acrescentar outra voz do Piper, inclua um perfil em `web/modelos.json` com as URLs `.onnx` e `.onnx.json` da voz. Teste local: `python tools/hospedar_modelos.py --perfis piper-ptbr --saida site`.

## Narração dos slides

Na aba **Conteúdo**, com a aba **Apresentação** selecionada, o painel **Narração dos slides** transforma as notas do apresentador (`<!-- notas: … -->`) em áudio embutido na apresentação:

| Arquivo | Como funciona |
|---|---|
| HTML | Áudio por slide dentro do próprio arquivo; tela “Iniciar com narração”; botões **Narração** (S) e **Avanço automático** (A, desligado por padrão); **Pausar** (`Espaço`) para o áudio no ponto exato e **Reproduzir** continua dali; se a pessoa pausar e mudar de slide, a narração do novo slide só começa com **Reproduzir** (ou ao ligar o som de novo); no último slide, Próximo não reinicia a narração; no Modo leitura a narração não toca e o botão de tela cheia fica no canto superior direito |
| PPTX | Áudio por slide com início automático (MP3, ou WAV se escolhido); com “Avançar os slides sozinho”, o slide avança ao fim do áudio — útil para **Exportar → Criar um vídeo** |

Formato do áudio: **MP3** (padrão; `lamejs`), **OGG/Opus** (WebCodecs) ou **WAV**. `<!-- narracao: texto -->` substitui a nota no áudio; `<!-- narracao: nao -->` deixa o slide sem som. Linha de comando: `python tools/gerador.py - apresentacao.md --audios pasta --avancar` (arquivos `1.mp3`, `2.ogg`, `3.wav`… pelo número do slide).