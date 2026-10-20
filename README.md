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
| Gerar curso | `guia.md` + `apresentacao.md` → 6 arquivos + ZIP | Só na memória do navegador |
| Imagens em base64 | Arraste, cole (Ctrl+V) ou insira pelo botão de imagem; no editor aparecem como `(img:N)` | No próprio texto `.md` |
| Rascunhos locais | Salvamento automático **ligado por padrão** (recupera o último trabalho ao reabrir) e rascunhos com nome | IndexedDB do navegador, só nesta máquina |
| Salvar em pasta | Grava os `.md` e os arquivos gerados numa pasta escolhida (Edge/Chrome) | Disco do usuário |
| Link autocontido | Conteúdo comprimido e cifrado (AES-256-GCM) no próprio link; chave no `#` ou senha (PBKDF2 310.000 iterações) | Somente no link |
| Tamanho antes do envio | Estimativa do conteúdo e do envio cifrado, com alerta perto do limite de 10 MB e confirmação antes de enviar | — |
| PrivateBin | Formato PrivateBin v2 (AES-256-GCM, PBKDF2-SHA256 100.000, chave base58 no `#`); **senha opcional** (chave ‖ senha, compatível com o site do PrivateBin); **imagens como anexo ZIP** (`.md` + `imagens/`), restauradas para base64 ao abrir aqui; expiração e leitura única | Servidor PrivateBin (somente conteúdo cifrado) |

## Estrutura

```
web/index.html           ← a página
web/editor.js            ← editor Markdown leve (sem dependências)
web/ajuda.js             ← tutorial guiado, ajuda e atalhos de teclado
web/exemplo/             ← curso de exemplo (fictício)
tools/gerador.py         ← motor de conversão (o mesmo do agente "Gerador de Cursos ANAC")
tools/requirements.txt
.github/workflows/publicar-pagina.yml  ← testa e publica a página no GitHub Pages
```

## Manutenção

- Alterou o visual dos arquivos gerados? Edite `tools/gerador.py`; o workflow testa e republica.
- Mantenha a mesma versão do `gerador.py` na PARTE 6 do `Pacote_Gerador_Cursos.txt` do agente.
- A página precisa de acesso a `cdn.jsdelivr.net` (motor Python e desenho dos fluxos Mermaid). O PrivateBin exige que a instância aceite chamadas de outros sites (CORS); se não aceitar, use o link autocontido.

## Execução local (opcional, com Python 3)

```
pip install -r tools/requirements.txt
python tools/gerador.py guia.md apresentacao.md --prefixo Meu_Curso --rodape "SIGLA · ANAC" --saida saida
```

## Atalhos da aplicação

`Alt+Shift` + tecla (no Mac, `Option+Shift`): **G** gerar · **E** exemplo · **D** baixar .md · **P** salvar em pasta · **S** salvar rascunho · **A** ligar/desligar autossalvamento · **L** criar link · **O** abrir link · **1/2** abas · **M** modo do editor · **F** tela cheia · **T** tutorial · **R** reiniciar tutorial · **H** ajuda · **K** lista de atalhos · **F1** ajuda.

## Atalhos do editor (com o cursor no editor)

`Ctrl+Z` desfazer · `Ctrl+Y` / `Ctrl+Shift+Z` refazer · `Ctrl+B` negrito · `Ctrl+I` itálico · `Ctrl+E` código · `Ctrl+K` link · `Ctrl+Shift+1/2/3` títulos · `Ctrl+Shift+7/8/9` lista numerada / marcadores / checklist · `Ctrl+Shift+.` citação · `Ctrl+L` selecionar linha · `Ctrl+Shift+D` duplicar linha · `Alt+↑/↓` mover linha · `Tab`/`Shift+Tab` recuo · `Enter` continua listas.
