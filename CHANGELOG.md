# Novidades do Conteudista

## 1.23 - 21/10/2026
- Curso de exemplo: a apresentacao traz o texto de narracao de cada slide nas notas do apresentador, pronto para gerar o audio em Narracao dos slides.

## 1.22 — 21/10/2026
- O painel **Narração dos slides** aparece somente com a aba **Apresentação (apresentacao.md)** selecionada.

## 1.21 — 21/10/2026
- Tela mais limpa: **Como funciona**, **Arquivos gerados**, **Guardar e compartilhar** e **Links criados** começam recolhidas e abrem ao clicar, ao gerar arquivos, ao criar links ou ao usar atalhos e o tutorial.

## 1.20.1 — 21/10/2026
- Correção do erro “Entry not found” ao preparar a voz Faber: se um repositório de vozes não tiver o arquivo, outro espelho é usado automaticamente.

## 1.20 — 21/10/2026
- **Narração dos slides**: as notas do apresentador viram áudio dentro da apresentação HTML (botões Narração e Avanço automático) e do PPTX (início automático; avanço opcional para exportar vídeo).
- **Locução mais simples**: só Idioma, Voz (Recomendadas/Outras), Velocidade e Pausa; troca automática para uma voz alternativa; detalhes técnicos em “Opções avançadas” (recolhidas).
- Download e narração em **MP3** (padrão), **OGG** ou **WAV**.

## 1.19.2 — 21/10/2026
- Correção do erro “Failed to resolve module specifier 'onnxruntime-web'” no Piper: bibliotecas hospedadas no site passam a apontar suas dependências para o jsDelivr e, se ainda falharem, a Locução usa automaticamente a versão do CDN (os modelos continuam vindo do site).

## 1.19.1 — 21/10/2026
- Correção na publicação: chave do cache dos modelos sem vírgulas (erro “cannot contain commas”).

## 1.19 — 21/10/2026
- Cabeçalho simplificado: apenas “Conteudista”.

## 1.18 — 21/10/2026
- Locução: escolha por **Motor → Idioma → Voz**. Piper com todos os idiomas do seu catálogo; Kokoro-82M v1.0 com inglês (EUA/Reino Unido), espanhol, francês, hindi, italiano e português (lang_code a, b, e, f, h, i, p).
- Kokoro corrigido: fonemas pelo espeak-ng com o mesmo pós-processamento do Kokoro original e precisão **fp32** como padrão (q8 só para inglês).
- **Velocidade no Piper** (ajuste no modelo ou, se não for possível, por processamento do áudio sem mudar o tom).
- **Hospedagem local dos modelos** no próprio site (perfis em `web/modelos.json`, variável `MODELOS_LOCAIS`).

## 1.17 — 21/10/2026
- Locução: novo motor **Piper** como padrão para português (voz **Faber**), com pronúncia pelo espeak-ng pt-br.
- **Kokoro mantido** para inglês e para as vozes pt-BR experimentais; o motor é escolhido pela voz.
- Plano de migração em `MIGRACAO-LOCUCAO.md`.

## 1.16 — 21/10/2026
- Gera arquivos mesmo com só o **guia** ou só a **apresentação** preenchidos (apenas do que foi preenchido).
- Caixas **Informação**, **Dica** e **Atenção** com cores próprias (azul, verde e amarelo) no HTML, DOCX e PPTX, em qualquer layout e nos temas escuro e alto contraste do guia.

## 1.15 — 21/10/2026
- Arquivos guardados no navegador: botões renomeados para **Treinamento** e **Apresentação** (antes “Guia” e “Slides”).

## 1.14 — 21/10/2026
- Arquivos gerados (guia HTML/DOCX e apresentação HTML/PPTX) com **layout gov.br** por padrão.
- Novo campo **Layout dos arquivos gerados**: gov.br ou Clássico (layout original, mantido sem alterações).

## 1.13 — 21/10/2026
- Visual alinhado ao **Padrão Digital de Governo (gov.br/ds)**: fonte Rawline, cores, botões, abas, foco, cabeçalho e rodapé.
- Atalhos de acessibilidade “Ir para o conteúdo” e alto contraste.

## 1.12 — 21/10/2026
- Removido o botão **Embutir imagens**: imagens citadas no texto (por nome ou URL) passam a ser convertidas automaticamente.

## 1.11 — 21/10/2026
- Botão **Histórico** adaptado ao celular: só ícone na barra, janela em tela cheia com cabeçalho fixo e exibição unificada.
- Changelog dentro da aplicação (botão **Novidades**).

## 1.10 — 21/10/2026
- Locução: pronúncia em português com fonemizador interno pt-BR quando o espeak-ng não oferece português.
- Histórico e comparação passou a abrir pelo botão **Histórico** na barra do editor.

## 1.9 — 21/10/2026
- Nova aba **Locução**: texto em fala no navegador (Kokoro-82M), com histórico local de áudios.
- Arquivos gerados guardados no navegador (últimos 10 pacotes).

## 1.8 — 20/10/2026
- Imagens: corte, rotação, espelhamento e edição em lote.
- Histórico de versões com comparação "antes e depois".

## 1.7 — 20/10/2026
- Imagens: ordenar (arrastar, ◀ ▶, menu) e redimensionar/comprimir.

## 1.6 — 20/10/2026
- Correção: imagens arrastadas ou coladas passam a entrar no texto.
- Painel **Imagens do texto** com legenda, localizar e remover.

## 1.5 — 20/10/2026
- Busca na Ajuda e reinício do tutorial.
- Desfazer/refazer próprio do editor e novos atalhos.

## 1.4 — 20/10/2026
- Salvamento automático ligado por padrão; tamanho mostrado antes do envio.
- Tutorial guiado, Ajuda e atalhos de teclado.

## 1.3 — 20/10/2026
- PrivateBin com senha e imagens em anexo ZIP.

## 1.2 — 20/10/2026
- Editor Markdown com barra de ferramentas e prévia.

## 1.1 — 20/10/2026
- Rascunhos locais, links criptografados e imagens em base64.

## 1.0 — 20/10/2026
- Página única: Markdown → guia (HTML/DOCX) e apresentação (HTML/PPTX) no navegador.
