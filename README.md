# Conteudista ANAC — Gerador de cursos no navegador

Página única que converte os arquivos Markdown de um curso em:

| Guia de treinamento | Apresentação |
|---|---|
| `Treinamento_<PREFIXO>.md` · `.html` · `.docx` | `Apresentacao_<PREFIXO>.md` · `.html` · `.pptx` |

**Nenhum curso é salvo.** A conversão roda no navegador de quem usa (Python via Pyodide). O conteúdo não é enviado a servidor algum e é descartado ao fechar a página. O repositório e o site contêm apenas a ferramenta e um curso de exemplo fictício, por isso podem ser públicos.

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
- A página precisa de acesso a `cdn.jsdelivr.net` (motor Python). As bibliotecas `python-docx` e `python-pptx` são servidas pelo próprio site (pasta `wheels/`).

## Execução local (opcional, com Python 3)

```
pip install -r tools/requirements.txt
python tools/gerador.py guia.md apresentacao.md --prefixo Meu_Curso --rodape "SIGLA · ANAC" --saida saida
```
