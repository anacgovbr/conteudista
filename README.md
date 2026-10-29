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
| Gerar conteúdo | Apostila + apresentação em Markdown → 8 arquivos + ZIP (apostila MD, HTML, DOCX, EPUB e EPUB OpenDyslexic; apresentação MD, HTML e PPTX; PDF pela impressão do HTML), no layout **gov.br** (padrão) ou **Clássico** | Só na memória do navegador |
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
web/editor.js            ← editor Markdown leve (sem dependências)
web/ajuda.js             ← tutorial guiado, ajuda e atalhos de teclado
web/historico.js         ← histórico de versões, comparação (diff) e Importar link
web/gerados.js           ← arquivos gerados guardados no navegador (IndexedDB)
web/metadados.js         ← Nome do conteúdo, Rodapé (opcional) sempre visível (a Barra superior foi retirada)
web/dicas.js             ← dicas (tooltip) acessíveis dos botões da barra do editor
web/janelas.js           ← Importar, Salvar ▾ (menu), Compartilhar link e Histórico de arquivos (janelas, barra de ações e status do salvamento)
web/colar.js             ← Importar > Colar: subabas Apostila, Apresentação e Link
web/versoes.js           ← rascunhos e versões unificados (salvar, abrir, excluir e migração dos dados antigos)
web/locucao.js           ← aba Locução
web/locucao-worker.js    ← motor de voz Kokoro-82M (Web Worker)
web/ptbr-g2p.js          ← fonemizador interno pt-BR
web/changelog.js         ← botão Novidades (lê o CHANGELOG.md)
web/govbr.css            ← tema do Padrão Digital de Governo (gov.br/ds)
CHANGELOG.md             ← histórico de versões da aplicação
web/exemplo/             ← conteúdo de exemplo: guia de uso (apostila, apresentação com notas para narração e prompt padrão para IA)
tools/gerador.py         ← motor de conversão (o mesmo do agente "Gerador de Cursos ANAC"), v3.9
tools/fontes/            ← fontes de leitura (WOFF2), licenças OFL, manifesto.json, baixar-fontes.ps1 e verificar_fontes.py
tools/testar_acessibilidade.py ← testes de acessibilidade das saídas (EPUB, DOCX, PPTX e HTML)
tools/requirements.txt   ← python-docx, python-pptx, Pillow e lxml
.github/workflows/publicar-pagina.yml  ← testa e publica a página no GitHub Pages
```

## Leitura acessível

Os arquivos gerados foram ajustados para a leitura por pessoas com dislexia, sem retirar recursos.

| Formato | O que oferece |
|---|---|
| Apostila HTML | **Tema** (claro, escuro, alto contraste) e **Leitura** (Padrão/Verdana, Atkinson Hyperlegible Next, OpenDyslexic) independentes; a Leitura fica salva em `localStorage['conteudista.leitura']`. Texto em 18 px, entrelinha 1,7, à esquerda e sem hifenização; foco visível; tabelas e código com rolagem por teclado; **Tabela do fluxo** para cada Mermaid; gabarito com `aria-expanded`; **Imprimir / PDF** em A4 |
| Apresentação HTML | Mesmo seletor **Leitura**; **Modo leitura** (`L`) vertical, em fundo claro, com as notas visíveis; telas de até 900 px abrem nele (a escolha fica em `localStorage['conteudista.apresentacao.modo']`); ARIA de apresentação e de slide, contador anunciado, auto-ajuste até 0,85 e rolagem abaixo disso; impressão A4 com as notas |
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
- Legendas, audiodescrição e Libras estão fora do escopo.

### Fontes de leitura: manutenção

- `tools/fontes/manifesto.json` é a fonte de verdade: lista cada WOFF2 com peso, estilo, SHA-256 e origem. O aplicativo lê o manifesto e copia os arquivos para o Pyodide.
- Para baixar ou atualizar: `powershell -ExecutionPolicy Bypass -File .\tools\fontes\baixar-fontes.ps1`; depois `python tools/fontes/verificar_fontes.py`. Faça o commit da pasta inteira e atualize o parâmetro de cache (`?v=`) se trocar scripts.
- Se uma face faltar, a geração continua: o texto cai para Verdana e o resultado mostra um aviso.
- Créditos: Atkinson Hyperlegible Next — Braille Institute (Google Fonts); OpenDyslexic — Abbie Gonzalez (antijingoist/opendyslexic). Ambas sob a SIL Open Font License 1.1 (`OFL-*.txt` na mesma pasta).

## Manutenção

- Layout dos arquivos gerados: dicionário `TEMAS` em `tools/gerador.py` (`govbr` = padrão, `classico` = original). Para um tema novo (ex.: ANAC), copie o bloco `govbr`, ajuste cores e fontes e acrescente a opção no campo **Layout (tema)** do `web/index.html`. Linha de comando: `--tema govbr|classico`.

- **Regra global de interface (botões):** a confirmação de ação concluída é só visual (botão verde com tick por ~2,6 s). Nunca insira texto na tela; use `UXFeedback.confirmar(botao, mensagem)` em `web/ux-feedback.js`, que envia a mensagem a leitores de tela por uma região oculta.
- A cada mudança, acrescente uma entrada curta no topo do `CHANGELOG.md` e atualize `VERSAO` em `web/changelog.js`.
- O visual segue o Padrão Digital de Governo (https://www.gov.br/ds/). Ajuste cores e componentes em `web/govbr.css`.

- Alterou o visual dos arquivos gerados? Edite `tools/gerador.py`; o workflow testa e republica.
- Mantenha a mesma versão do `gerador.py` na PARTE 6 do `Pacote_Gerador_Cursos.txt` do agente.
- A versão 3.7 do gerador (1.56) preserva comentários HTML dentro de código, na apostila e na prévia; não trata exemplos de imagem escritos em código como imagens pendentes; e reinicia a numeração de cada lista numerada no DOCX.
- A versão 3.8 do gerador (1.61) acrescenta o parâmetro opcional `fluxos` (imagens dos fluxos Mermaid, por código, para o HTML dos slides) e passa a desenhar no navegador, com todos os slides mensuráveis, os fluxos que ficam como código.
- A página precisa de acesso a `cdn.jsdelivr.net` (motor Python e desenho dos fluxos Mermaid). O PrivateBin exige que a instância aceite chamadas de outros sites (CORS); se não aceitar, use o link autocontido.

## Execução local (opcional, com Python 3)

```
pip install -r tools/requirements.txt
python tools/gerador.py apostila.md apresentacao.md --prefixo Meu_Conteudo --rodape "SIGLA · ANAC" --saida saida
# só um dos dois: use '-' no lugar do arquivo ausente (ex.: python tools/gerador.py - apresentacao.md ...)
```

## Atalhos da aplicação

`Alt+Shift` + tecla (no Mac, `Option+Shift`): **G** gerar · **E** exemplo · **D** baixar .md · **P** salvar em pasta · **S** salvar versão · **A** ligar/desligar autossalvamento · **L** criar link · **O** abrir link · **V** versões do texto · **1/2** abas · **M** modo do editor · **F** tela cheia · **T** tutorial · **R** reiniciar tutorial · **H** ajuda · **K** lista de atalhos · **F1** ajuda.

## Conteúdo de exemplo e prompt padrão para IA

O botão **Carregar exemplo** carrega `web/exemplo/treinamento.md` (apostila) e `web/exemplo/apresentacao.md` (apresentação), que formam um **guia de uso do próprio Conteudista**. Os nomes dos arquivos são mantidos por compatibilidade com o carregamento em `web/index.html` e com o workflow de publicação.

| Arquivo | Conteúdo |
|---|---|
| `treinamento.md` | Apostila de 16 seções: Início rápido, funcionamento, percurso de aprendizado, edição, importação, formas de guardar, geração, locução e narração, o que cabe no Markdown, produção com IA, fluxo de trabalho, checklists, exercícios, gabarito e referências. Traz 5 fluxos Mermaid, 4 figuras, links para vídeos e o **prompt padrão para IA** (seção 11.3) |
| `apresentacao.md` | 34 slides, um assunto por slide, com notas para narração (63 a 81 palavras por slide, cerca de 15 minutos de áudio), 5 fluxos Mermaid e 3 figuras |

Manutenção do exemplo:

- É texto comum: edite os dois `.md`. As figuras são PNG embutidas em base64, de modo que cada arquivo é autossuficiente.
- O prompt padrão está em um único bloco de código. Qualquer mudança na sintaxe aceita pelo gerador deve ser refletida nas seções 5 e 6 do prompt e na tabela da seção 10 da apostila.
- As notas dos slides são escritas para serem ouvidas: texto corrido, sem símbolos, parênteses nem endereços.
- O workflow de publicação gera o exemplo com os temas `govbr` e `classico` como teste.
- Na apostila em HTML, os fluxos Mermaid são desenhados no navegador de quem lê e dependem de `cdn.jsdelivr.net`. Na apresentação em HTML, cada fluxo é convertido em imagem ao gerar os arquivos (`prepararFluxos`, em `web/index.html`; o gerador recebe o parâmetro `fluxos`); sem a imagem, o HTML desenha o fluxo no navegador com todos os slides mensuráveis (classe `mm`). O `.md` e o PPTX não mudam.

## Atalhos do editor (com o cursor no editor)

`Ctrl+Z` desfazer · `Ctrl+Y` / `Ctrl+Shift+Z` refazer · `Ctrl+B` negrito · `Ctrl+I` itálico · `Ctrl+E` código · `Ctrl+K` link · `Ctrl+Shift+1/2/3` títulos · `Ctrl+Shift+7/8/9` lista numerada / marcadores / checklist · `Ctrl+Shift+.` citação · `Ctrl+L` selecionar linha · `Ctrl+Shift+D` duplicar linha · `Alt+↑/↓` mover linha · `Tab`/`Shift+Tab` recuo · `Enter` continua listas.

<!-- locucao -->
## Locução (texto em fala, no navegador)

Aba **Locução** (`Alt+Shift+3`): gera áudio a partir de texto no navegador com **Piper** (padrão para português, voz `pt_BR-faber-medium`) ou **Kokoro-82M** (`onnx-community/Kokoro-82M-v1.0-ONNX`, `dtype: "q8"`, ~86 MB), 100% no navegador.

| Item | Como funciona |
|---|---|
| Motor Piper (padrão pt-BR) | `web/locucao-piper-worker.js` (Web Worker) com `@mintplex-labs/piper-tts-web`; voz `pt_BR-faber-medium` (~63 MB, guardada no navegador); fonemas pelo espeak-ng pt-br embutido. Plano em `MIGRACAO-LOCUCAO.md` |
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
| HTML | Áudio por slide dentro do próprio arquivo; tela “Iniciar com narração”; botões **Narração** (M) e **Avanço automático** (A, desligado por padrão) |
| PPTX | Áudio por slide com início automático (MP3, ou WAV se escolhido); com “Avançar os slides sozinho”, o slide avança ao fim do áudio — útil para **Exportar → Criar um vídeo** |

Formato do áudio: **MP3** (padrão; `lamejs`), **OGG/Opus** (WebCodecs) ou **WAV**. `<!-- narracao: texto -->` substitui a nota no áudio; `<!-- narracao: nao -->` deixa o slide sem som. Linha de comando: `python tools/gerador.py - apresentacao.md --audios pasta --avancar` (arquivos `1.mp3`, `2.ogg`, `3.wav`… pelo número do slide).
