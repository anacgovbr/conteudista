# Conteudista ANAC — Gerador de cursos no navegador

Página única que converte os arquivos Markdown de um curso em:

| Guia de treinamento | Apresentação |
|---|---|
| `Treinamento_<PREFIXO>.md` · `.html` · `.docx` | `Apresentacao_<PREFIXO>.md` · `.html` · `.pptx` |

**Nenhum curso é salvo no site.** A conversão roda no navegador de quem usa (Python via Pyodide). O repositório e o site contêm apenas a ferramenta e um curso de exemplo fictício, por isso podem ser públicos.

## Recursos

| Recurso | Como funciona | Onde o conteúdo fica |
|---|---|---|
| Editor Markdown | Barra de ferramentas, **desfazer/refazer** próprio (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z e botões; cobre botões, arquivos e rascunhos), atalhos (Ctrl+B/I/E/K, Ctrl+Shift+1/2/3 títulos, Ctrl+Shift+7/8/9 listas, Alt+↑/↓ mover linha, Ctrl+Shift+D duplicar), modos Editar/Dividido/Prévia, tela cheia, prévia fiel ao gerador (inclusive slides) | Só na memória do navegador |
| Tutorial, Ajuda e Atalhos | Tutorial guiado na primeira visita (ou botão ▶ Tutorial), com **reinício** (↺ no tutorial, botão na Ajuda ou `Alt+Shift+R`); Ajuda **com busca** e destaque dos termos (botão ou F1); atalhos `Alt+Shift+tecla` com janela de consulta (botão ⌨ Atalhos ou `Alt+Shift+K`) | — |
| Gerar curso | `guia.md` + `apresentacao.md` → 6 arquivos + ZIP, no layout **gov.br** (padrão) ou **Clássico** | Só na memória do navegador |
| Imagens em base64 | Arraste, cole (Ctrl+V) ou insira pelo botão de imagem; no editor aparecem como `(img:N)` | No próprio texto `.md` |
| Rascunhos locais | Salvamento automático **ligado por padrão** (recupera o último trabalho ao reabrir) e rascunhos com nome | IndexedDB do navegador, só nesta máquina |
| Salvar em pasta | Grava os `.md` e os arquivos gerados numa pasta escolhida (Edge/Chrome) | Disco do usuário |
| Link autocontido | Conteúdo comprimido e cifrado (AES-256-GCM) no próprio link; chave no `#` ou senha (PBKDF2 310.000 iterações) | Somente no link |
| Histórico e comparação | Botão **Histórico** na barra do editor ou `Alt+Shift+V`. Versões guardadas no navegador (edições da sessão a cada 3 min, arquivos carregados, links abertos, rascunhos, exemplo, versões marcadas ★, geração/compartilhamento; “antes de carregar/restaurar” automático; até 120). Diff “antes e depois” entre quaisquer duas versões ou o conteúdo atual: lado a lado ou unificado, só alterações ou texto completo, palavras destacadas, imagens como miniaturas e lista de imagens removidas/incluídas; restaurar, baixar A/B, excluir | IndexedDB do navegador, só nesta máquina |
| Tamanho antes do envio | Estimativa do conteúdo e do envio cifrado, com alerta perto do limite de 10 MB e confirmação antes de enviar | — |
| PrivateBin | Formato PrivateBin v2 (AES-256-GCM, PBKDF2-SHA256 100.000, chave base58 no `#`); **senha opcional** (chave ‖ senha, compatível com o site do PrivateBin); **imagens como anexo ZIP** (`.md` + `imagens/`), restauradas para base64 ao abrir aqui; expiração e leitura única | Servidor PrivateBin (somente conteúdo cifrado) |

## Estrutura

```
web/index.html           ← a página
web/editor.js            ← editor Markdown leve (sem dependências)
web/ajuda.js             ← tutorial guiado, ajuda e atalhos de teclado
web/historico.js         ← histórico de versões e comparação (diff)
web/gerados.js           ← arquivos gerados guardados no navegador (IndexedDB)
web/locucao.js           ← aba Locução
web/locucao-worker.js    ← motor de voz Kokoro-82M (Web Worker)
web/ptbr-g2p.js          ← fonemizador interno pt-BR
web/changelog.js         ← botão Novidades (lê o CHANGELOG.md)
web/govbr.css            ← tema do Padrão Digital de Governo (gov.br/ds)
CHANGELOG.md             ← histórico de versões da aplicação
web/exemplo/             ← curso de exemplo (fictício)
tools/gerador.py         ← motor de conversão (o mesmo do agente "Gerador de Cursos ANAC")
tools/requirements.txt
.github/workflows/publicar-pagina.yml  ← testa e publica a página no GitHub Pages
```

## Manutenção

- Layout dos arquivos gerados: dicionário `TEMAS` em `tools/gerador.py` (`govbr` = padrão, `classico` = original). Para um tema novo (ex.: ANAC), copie o bloco `govbr`, ajuste cores e fontes e acrescente a opção no campo **Layout dos arquivos gerados** do `web/index.html`. Linha de comando: `--tema govbr|classico`.

- A cada mudança, acrescente uma entrada curta no topo do `CHANGELOG.md` e atualize `VERSAO` em `web/changelog.js`.
- O visual segue o Padrão Digital de Governo (https://www.gov.br/ds/). Ajuste cores e componentes em `web/govbr.css`.

- Alterou o visual dos arquivos gerados? Edite `tools/gerador.py`; o workflow testa e republica.
- Mantenha a mesma versão do `gerador.py` na PARTE 6 do `Pacote_Gerador_Cursos.txt` do agente.
- A página precisa de acesso a `cdn.jsdelivr.net` (motor Python e desenho dos fluxos Mermaid). O PrivateBin exige que a instância aceite chamadas de outros sites (CORS); se não aceitar, use o link autocontido.

## Execução local (opcional, com Python 3)

```
pip install -r tools/requirements.txt
python tools/gerador.py guia.md apresentacao.md --prefixo Meu_Curso --rodape "SIGLA · ANAC" --saida saida
# só um dos dois: use '-' no lugar do arquivo ausente (ex.: python tools/gerador.py - apresentacao.md ...)
```

## Atalhos da aplicação

`Alt+Shift` + tecla (no Mac, `Option+Shift`): **G** gerar · **E** exemplo · **D** baixar .md · **P** salvar em pasta · **S** salvar rascunho · **A** ligar/desligar autossalvamento · **L** criar link · **O** abrir link · **B** marcar versão · **V** histórico e comparação · **1/2** abas · **M** modo do editor · **F** tela cheia · **T** tutorial · **R** reiniciar tutorial · **H** ajuda · **K** lista de atalhos · **F1** ajuda.

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
| Integração | Importa notas do apresentador, texto dos slides ou o guia (sem Markdown); ajuda e atalhos (`Alt+Shift+3`, `Alt+Shift+N`) |

## Arquivos gerados guardados no navegador

`web/gerados.js`: após cada **Gerar arquivos**, guarda os 6 arquivos + ZIP no IndexedDB `conteudista_arquivos` (últimos 10 por padrão), com download, visualização do HTML e exclusão.

> Para atualizar o repositório use sempre o `conteudista-web.zip` mais recente com o `atualizar-conteudista.ps1`.

## Hospedagem local dos modelos de voz

Para a Locução funcionar em redes que bloqueiam o Hugging Face ou o jsDelivr, o workflow pode copiar os modelos e bibliotecas para o próprio site (pasta `modelos/` e `vendor/`). Os workers usam `modelos/manifest.json` para buscar localmente; o que não estiver hospedado continua vindo da internet.

| Variável do repositório (Settings → Secrets and variables → Actions → Variables) | Padrão | Opções |
|---|---|---|
| `MODELOS_LOCAIS` | `piper-ptbr,piper-catalogo` | perfis de `web/modelos.json`: `piper-ptbr` (~63 MB), `piper-catalogo`, `kokoro-fp32` (~330 MB), `kokoro-q8` (~90 MB) ou `nenhum` |
| `BIBLIOTECAS_LOCAIS` | `piper,kokoro,espeak,lamejs` | pacotes npm copiados para `vendor/`; as dependências deles (ex.: `onnxruntime-web`) continuam vindo do jsDelivr. Se a biblioteca local falhar, a Locução usa a do CDN automaticamente. Use `nenhum` para sempre usar o CDN |

O GitHub Pages limita o site a ~1 GB. Para acrescentar outra voz do Piper, inclua um perfil em `web/modelos.json` com as URLs `.onnx` e `.onnx.json` da voz. Teste local: `python tools/hospedar_modelos.py --perfis piper-ptbr --saida site`.

## Narração dos slides

Na aba **Curso**, com a aba **Apresentação** selecionada, o painel **Narração dos slides** transforma as notas do apresentador (`<!-- notas: … -->`) em áudio embutido na apresentação:

| Arquivo | Como funciona |
|---|---|
| HTML | Áudio por slide dentro do próprio arquivo; tela “Iniciar com narração”; botões **Narração** (M) e **Avanço automático** (A, desligado por padrão) |
| PPTX | Áudio por slide com início automático (MP3, ou WAV se escolhido); com “Avançar os slides sozinho”, o slide avança ao fim do áudio — útil para **Exportar → Criar um vídeo** |

Formato do áudio: **MP3** (padrão; `lamejs`), **OGG/Opus** (WebCodecs) ou **WAV**. `<!-- narracao: texto -->` substitui a nota no áudio; `<!-- narracao: nao -->` deixa o slide sem som. Linha de comando: `python tools/gerador.py - apresentacao.md --audios pasta --avancar` (arquivos `1.mp3`, `2.ogg`, `3.wav`… pelo número do slide).
