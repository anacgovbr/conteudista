# Novidades do Conteudista

## 1.42 - 22/10/2026
- **Metadados do curso**: a Barra superior do treinamento saiu da tela (o título do treinamento faz esse papel). O **Prefixo** passou a se chamar **Nome do curso**, com texto auxiliar e normalização ao sair do campo. O **Rodapé (opcional)** foi para **Mais opções**, recolhido, e fica lembrado neste navegador.
- **Versões do texto**: o antigo "Histórico e comparação" do editor agora se chama Versões (ícone + texto no desktop, só ícone no celular, com ícone próprio). "Histórico" fica reservado a arquivos gerados e áudios.
- **Dicas nos botões da barra do editor**: aparecem ao passar o mouse ou ao focar pelo teclado e fecham com Esc.

## 1.41 - 22/10/2026
- **Botão Abrir** (antes de Carregar exemplo): uma única janela com as abas **Arquivos**, **Rascunhos** e **Links**, com contador, que lembra a última aba usada. A aba Links traz URL e senha no topo e a lista "Links criados"; as três listas têm o mesmo formato de linha.
- **Excluir tudo** no rodapé da janela, só na aba aberta, com confirmação acessível (alertdialog, foco em Cancelar, Esc cancela, sem tempo limite, resultado anunciado a leitores de tela).
- Saíram da página o painel "Abrir um link", a seção "Links criados", a tabela de rascunhos e o painel de arquivos guardados. O atalho Alt+Shift+O abre a janela.

## 1.40 - 22/10/2026
- **Regra global de feedback em botões**: a confirmação de ação concluída agora é apenas visual (botão verde com tick por alguns segundos). A mensagem "Ação concluída." deixou de aparecer na tela e a largura do botão não muda mais. Vale para Carregar exemplo, Limpar tela, Importar e demais botões.
- O botão **Copiar** de "Links criados" e a mensagem "Texto importado" da Locução seguem a mesma regra; leitores de tela continuam recebendo o aviso por uma região oculta.

## 1.39 - 22/10/2026
- **Histórico unificado**: a janela aberta pelo botão **Histórico** (ao lado de "Arquivos gerados") agora reúne os **arquivos gerados** e os **rascunhos**, no mesmo formato de tabela. Rascunhos começam recolhidos e a lista só é recarregada quando a seção é aberta.
- No painel "Na sua máquina", a tabela de rascunhos deu lugar a uma linha discreta ("N rascunhos salvos") com o botão Histórico. Abrir um rascunho fecha a janela.
- Acompanhamento da publicação nos scripts de atualização sem repetição de blocos e com acentos corretos.

## 1.38 - 22/10/2026
- **Arquivos gerados**: os pacotes guardados no navegador agora ficam em uma janela, **Histórico de arquivos gerados**, aberta pelo botão **Histórico** ao lado do título (mesmo padrão do botão do editor). A página fica mais limpa e o histórico está sempre à mão, mesmo antes de gerar.

## 1.37 - 22/10/2026
- Em toda a aplicação, "Guia" passou a se chamar **Treinamento**: abas, botões, tutorial, ajuda, Histórico, Locução, mensagens e o curso de exemplo (`treinamento.md`).
- O histórico de novidades e o README também foram atualizados para o novo nome.

## 1.36 - 22/10/2026
- Botões 100% no padrão do Design System gov.br, definidos em um único arquivo (`ds-botoes.css`): rótulo em uma linha, altura fixa e cantos proporcionais. As regras antigas de botão foram removidas do `govbr.css` e dos scripts.
- Rótulos de botão com no máximo duas palavras (ex.: Carregar áudio, Salvar pasta, Apagar dados); tutorial e ajuda atualizados. As abas agora se chamam Treinamento e Apresentação.
- **Arquivos gerados**: Exibir treinamento, Exibir apresentação e .ZIP agora são botões, exibidos só depois de gerar e só para o que foi gerado (também nos arquivos guardados no navegador).
- Carregar exemplo, Limpar tela e Importar no mesmo padrão de botão.

## 1.35 - 21/10/2026
- Botões no padrão do Design System gov.br: rótulo sempre em uma linha, altura fixa (32, 40 ou 48 px) e cantos proporcionais à altura. Ao redimensionar a janela, o botão não vira mais uma "bola".
- Grupos de botões (cabeçalho, galeria de imagens e Histórico) quebram de linha como um todo, em vez de espremer os rótulos.
## 1.34 - 21/10/2026
- Locução: botão de carregar recursos oculto após ativação, inclusive com o CSS dos botões; confirmação genérica removida desta ação assíncrona.
- Atualizador: identifica a execução por ID textual e commit, sem converter listas JSON em Int64; preserva commits e alterações locais.

## 1.33 - 21/10/2026
- **Arquivos gerados** separados por linha: **Treinamento** (.MD .HTML .DOCX), **Apresentacao** (.MD .HTML .PPTX) e **Todos** (.ZIP), com os links Exibir na linha correspondente. Vale tambem para os arquivos guardados no navegador.
- Trocar entre as abas **Treinamento** e **Apresentacao** (e as demais abas e barras de navegacao) nao mostra mais confirmacao.

## 1.32 - 21/10/2026
- Regra global de interface: toda secao e subsecao expansivel tem um unico controle **mostrar/recolher**, sempre alinhado a direita (corrige a duplicacao na aba Locucao e em Opcoes avancadas de voz).

## 1.31 — 21/10/2026
- Regra global de alinhamento à direita para **mostrar/recolher** em toda a aplicação.
- Temas ANAC 20 anos claro/escuro aplicados tanto ao PPTX quanto ao HTML da apresentação.
- Tema selecionado registrado automaticamente como `theme` no frontmatter YAML da apresentação Markdown.
- Locução reorganizada com recursos de áudio no topo e todas as subseções recolhíveis; somente Texto inicia expandida.
- Downloads e visualizações convertidos em links tipográficos compactos, com atualização obrigatória dos scripts para evitar cache da versão anterior.

## 1.30 — 21/10/2026
- Arquivos agora aparecem como links tipográficos compactos: **⬇ .EXTENSÃO** para baixar e **▣ Exibir** para abrir na tela.
- Feedback visual padronizado nos botões após ações concluídas, sem janelas de confirmação em operações não destrutivas.
- Correção do QR Code com nível de correção apropriado e tratamento individual para links acima da capacidade física do QR.
- Aba Locução reorganizada: carregamento de recursos no topo, seções recolhíveis e somente Texto expandido por padrão.

## 1.29 — 21/10/2026
- Novos temas de apresentação PPTX **ANAC 20 anos — claro** e **ANAC 20 anos — escuro**, baseados nos dois modelos oficiais fornecidos.
- Nos dois novos temas, o Treinamento HTML/DOCX continua usando o padrão **gov.br**; somente a apresentação PPTX recebe a identidade ANAC 20 anos.

## 1.28 — 21/10/2026
- **Links criados**: cada link agora é clicável e exibe um **QR Code** do endereço completo, facilitando a abertura no celular.
- **Copiar** mostra confirmação visual: “URL copiada. Cole no navegador ou onde desejar guardar com Ctrl+V.” e registra a confirmação na tela.
- Todas as subseções expansíveis recebem automaticamente os textos **mostrar** / **recolher**.

## 1.27 — 21/10/2026
- Correção do Kokoro em computadores sem WebGPU: o modo **Automático** usa **WASM** diretamente, evitando que uma tentativa WebGPU sem adaptador contamine a inicialização do backend WASM. WebGPU continua disponível como opção experimental em Opções avançadas.

## 1.26 — 21/10/2026
- **Como funciona** e **Salvar e compartilhar** (antes “Guardar e compartilhar”) mostram “recolher” quando abertas.
- **Salvar na pasta…** (novo nome) e novo botão **Baixar .zip**, com os .md e os arquivos já gerados.
- **Carregar exemplo** e **Limpar tela** ficam logo abaixo dos campos do curso; **Gerar arquivos** ganhou destaque e, no celular, ocupa toda a largura.

## 1.25 — 21/10/2026
- Página mais leve: os **recursos de áudio** só são baixados ao clicar em **Carregar recursos de áudio** (aba Locução) ou ao ligar a **Narração dos slides**.
- A seção **Gerar curso** começa expandida e pode ser recolhida.
- **Links criados**: o link aparece de forma curta (tipo e identificador) e, no celular, cada link vira um cartão; **Copiar** continua copiando o link completo.

## 1.24 - 21/10/2026
- Narracao dos slides: idioma, voz, velocidade e formato ficam em **Opcoes avancadas de voz** (recolhidas), com um resumo da voz escolhida.
- Novo botao **Historico de audio** no painel: janela com busca, Ouvir, Baixar (MP3, OGG ou WAV), Usar esta voz e Excluir.

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
- Gera arquivos mesmo com só o **treinamento** ou só a **apresentação** preenchidos (apenas do que foi preenchido).
- Caixas **Informação**, **Dica** e **Atenção** com cores próprias (azul, verde e amarelo) no HTML, DOCX e PPTX, em qualquer layout e nos temas escuro e alto contraste do treinamento.

## 1.15 — 21/10/2026
- Arquivos guardados no navegador: botões renomeados para **Treinamento** e **Apresentação** (antes “Treinamento” e “Slides”).

## 1.14 — 21/10/2026
- Arquivos gerados (treinamento HTML/DOCX e apresentação HTML/PPTX) com **layout gov.br** por padrão.
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
- Página única: Markdown → treinamento (HTML/DOCX) e apresentação (HTML/PPTX) no navegador.
