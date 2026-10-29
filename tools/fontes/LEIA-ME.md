# Fontes de leitura do Conteudista

Esta pasta guarda as fontes usadas pelo seletor **Leitura** da apostila e da apresentação em HTML e pelos dois EPUB.

| Família | Uso | Licença | Origem |
|---|---|---|---|
| Atkinson Hyperlegible Next | Opção de leitura e EPUB base | SIL OFL 1.1 | Google Fonts / Braille Institute |
| OpenDyslexic | Opção de leitura e EPUB `_OpenDyslexic` | SIL OFL 1.1 | Repositório oficial `antijingoist/opendyslexic` |

A leitura **Padrão** usa Verdana (`Verdana, Tahoma, Arial, sans-serif`), que não fica nesta pasta.

## Arquivos

- `atkinson-hyperlegible-next-400.woff2`, `-400-italic`, `-700`, `-700-italic`
- `opendyslexic-400.woff2`, `-400-italic`, `-700`, `-700-italic`
- `OFL-Atkinson-Hyperlegible-Next.txt` e `OFL-OpenDyslexic.txt` (texto integral da licença e copyright)
- `manifesto.json` — fonte de verdade: lista cada arquivo com peso, estilo, SHA-256, origem e subconjunto
- `baixar-fontes.ps1` — baixa as fontes e as licenças e regrava o manifesto
- `verificar_fontes.py` — confere arquivos, assinatura WOFF2, SHA-256, licenças e (com fontTools) os acentos

O gerador (`tools/gerador.py`) lê esta pasta. No navegador, o aplicativo lê o `manifesto.json` e copia os arquivos para o Pyodide.
Se uma fonte faltar, a geração continua: o texto cai para Verdana e o resultado mostra um aviso.

## Atualizar as fontes

1. Na raiz do repositório, rode `powershell -ExecutionPolicy Bypass -File .\tools\fontes\baixar-fontes.ps1`.
2. Confira o resumo (devem ser 8 de 8 arquivos) e rode `python tools/fontes/verificar_fontes.py`, se tiver Python.
3. Faça o commit de toda a pasta (`.woff2`, `.txt` e `manifesto.json`) e publique.
4. Abra o site com Ctrl+F5 para não usar o cache antigo.

Para trocar uma fonte manualmente: substitua o `.woff2` mantendo o nome, atualize o `sha256` e a `origem` no manifesto e mantenha a licença OFL correspondente nesta pasta.

## Licenças

As duas famílias são distribuídas sob a SIL Open Font License 1.1, que permite embutir as fontes em documentos e programas.
Mantenha os arquivos `OFL-*.txt` junto das fontes. Não renomeie as famílias nem venda as fontes isoladamente.
Os arquivos OFL que acompanham o repositório trazem o texto integral da licença; o script `baixar-fontes.ps1` os substitui pelo texto oficial de cada projeto, com a linha de copyright.

## Observações

- Atkinson Hyperlegible Next vem do Google Fonts no subconjunto **latin**, que cobre todos os acentos do português (á à â ã é ê í ó ô õ ú ü ç).
- OpenDyslexic vem do repositório oficial completo. Se a família não tiver itálico real, o script não sintetiza: a face falta e a regular é usada.
- Não use CDN em tempo de execução: as fontes são embutidas no HTML (base64) e no EPUB.
