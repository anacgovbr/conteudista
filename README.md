# Conteudista ANAC — Gerador de cursos no navegador

Página única que converte os arquivos Markdown de um curso em:

| Guia de treinamento | Apresentação |
|---|---|
| `Treinamento_<PREFIXO>.md` · `.html` · `.docx` | `Apresentacao_<PREFIXO>.md` · `.html` · `.pptx` |

**Nenhum curso é salvo no site.** A conversão roda no navegador de quem usa (Python via Pyodide). O repositório e o site contêm apenas a ferramenta e um curso de exemplo fictício, por isso podem ser públicos.

## Recursos

| Recurso | Como funciona | Onde o conteúdo fica |
|---|---|---|
| Editor Markdown | Barra de ferramentas (títulos, negrito, listas, checklists, links, imagens, tabelas, caixas, Mermaid, slides, notas), atalhos (Ctrl+B/I/K, Tab, Enter continua listas), modos Editar/Dividido/Prévia, tela cheia, prévia fiel ao gerador (inclusive slides) | Só na memória do navegador |
| Gerar curso | `guia.md` + `apresentacao.md` → 6 arquivos + ZIP | Só na memória do navegador |
| Imagens em base64 | Arraste, cole (Ctrl+V) ou insira pelo botão de imagem; no editor aparecem como `(img:N)` e o texto real guarda `data:image/...;base64,...` | No próprio texto `.md` |
| Rascunhos locais | "Salvar rascunho" ou salvamento automático (opcional) | IndexedDB do navegador, só nesta máquina |
| Salvar em pasta | Grava os `.md` e os arquivos gerados numa pasta escolhida (Edge/Chrome) | Disco do usuário |
| Link autocontido | Conteúdo comprimido e cifrado (AES-256-GCM) no próprio link; chave no `#` (ou senha, PBKDF2 310.000 iterações) | Somente no link |
| PrivateBin | Cifrado no navegador (formato PrivateBin v2) e enviado à instância escolhida; expiração e leitura única opcionais | Servidor PrivateBin (apenas texto cifrado) |

## Estrutura

```
web/index.html           ← a página
web/editor.js            ← editor Markdown leve (sem dependências)
web/exemplo/             ← curso de exemplo (fictício)
tools/gerador.py         ← motor de conversão (o mesmo do agente "Gerador de Cursos ANAC")
tools/requirements.txt
.github/workflows/publicar-pagina.yml  ← testa e publica a página no GitHub Pages
```

## Manutenção

- Alterou o visual dos arquivos gerados? Edite `tools/gerador.py`; o workflow testa e republica.
- Mantenha a mesma versão do `gerador.py` na PARTE 6 do `Pacote_Gerador_Cursos.txt` do agente.
- A página precisa de acesso a `cdn.jsdelivr.net` (motor Python e desenho dos fluxos Mermaid na prévia).

## Execução local (opcional, com Python 3)

```
pip install -r tools/requirements.txt
python tools/gerador.py guia.md apresentacao.md --prefixo Meu_Curso --rodape "SIGLA · ANAC" --saida saida
```
