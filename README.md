# Conteudista ANAC — Gerador de cursos no navegador

Página única que converte os arquivos Markdown de um curso em:

| Guia de treinamento | Apresentação |
|---|---|
| `Treinamento_<PREFIXO>.md` · `.html` · `.docx` | `Apresentacao_<PREFIXO>.md` · `.html` · `.pptx` |

**Nenhum curso é salvo no site.** A conversão roda no navegador de quem usa (Python via Pyodide). O repositório e o site contêm apenas a ferramenta e um curso de exemplo fictício, por isso podem ser públicos.

## Recursos

| Recurso | Como funciona | Onde o conteúdo fica |
|---|---|---|
| Gerar curso | `guia.md` + `apresentacao.md` → 6 arquivos + ZIP | Só na memória do navegador |
| Imagens em base64 | Arraste o `.md` junto com as imagens (ou cole com Ctrl+V); `![alt](arquivo.png)` vira `![alt](data:image/png;base64,…)`. URLs públicas com CORS também são convertidas | No próprio texto `.md` |
| Rascunhos locais | "Salvar rascunho" ou salvamento automático (opcional) | IndexedDB do navegador, só nesta máquina |
| Salvar em pasta | Grava os `.md` e os arquivos gerados numa pasta escolhida (Edge/Chrome) | Disco do usuário |
| Link autocontido | Conteúdo comprimido e cifrado (AES-256-GCM) dentro do próprio link; chave no fragmento `#` (ou senha, PBKDF2 310.000 iterações) | Somente no link |
| PrivateBin | Cifrado no navegador (formato PrivateBin v2: AES-256-GCM, PBKDF2-SHA256, chave base58 no `#`) e enviado à instância escolhida; expiração e leitura única opcionais | Servidor PrivateBin (apenas o texto cifrado) |
| Abrir link | Cola um link autocontido ou PrivateBin e carrega nos editores | — |

Outros serviços (0bin, Pastebin): o 0bin não oferece API pública estável e o Pastebin não cifra o conteúdo nem permite chamadas a partir do navegador; por isso não foram integrados.

## Estrutura

```
web/index.html           ← a página
web/exemplo/             ← curso de exemplo (fictício)
tools/gerador.py         ← motor de conversão (o mesmo do agente "Gerador de Cursos ANAC")
tools/requirements.txt
.github/workflows/publicar-pagina.yml  ← testa o motor e publica a página no GitHub Pages
```

## Uso

1. Abra `https://anacgovbr.github.io/conteudista/`.
2. Cole ou arraste o `guia.md` e o `apresentacao.md`.
3. Clique em **Gerar arquivos** e baixe os arquivos ou o ZIP.

## Manutenção

- Alterou o visual ou o motor? Edite `tools/gerador.py` e faça commit; o workflow testa e republica a página.
- Mantenha a mesma versão do `gerador.py` na PARTE 6 do `Pacote_Gerador_Cursos.txt` do agente.
- A página precisa de acesso a `cdn.jsdelivr.net` (motor Python). O PrivateBin exige que a instância aceite chamadas de outros sites (CORS); se não aceitar, use o link autocontido.
- No CLI, imagens locais/URLs são embutidas em base64 automaticamente (use `--sem-embutir` para desativar). As bibliotecas `python-docx` e `python-pptx` são servidas pelo próprio site (pasta `wheels/`).

## Execução local (opcional, com Python 3)

```
pip install -r tools/requirements.txt
python tools/gerador.py guia.md apresentacao.md --prefixo Meu_Curso --rodape "SIGLA · ANAC" --saida saida
```
