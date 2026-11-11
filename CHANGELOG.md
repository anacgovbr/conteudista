# Novidades do Conteudista
## 1.97 - 11/11/2026
- **Mais caixas do navegador trocadas por janelas do padrão gov.br (WCAG 3.3.2 e 4.1.2):** restaurar o padrão das opções, remover uma imagem do texto, restaurar, excluir e limpar versões do histórico, e excluir ou limpar áudios da Locução e da narração. Salvar uma versão com nome usa um campo de texto com rótulo. As janelas abrem com o foco em Cancelar, Esc cancela e o foco volta ao botão que as abriu.
- **Esc numa confirmação aberta sobre outra janela:** em Versões, Arquivos e rascunhos e Áudios gerados, o Esc agora fecha só a confirmação. Antes, a janela de baixo fechava junto e a confirmação ficava aberta.
- Novos testes de navegador: grupo 23 (abas e áreas de arquivo pelo teclado, mensagens anunciadas) e mais 6 casos no grupo 24.
## 1.96 - 11/11/2026
- **Mais seis sugestões no painel Acessibilidade** (biblioteca Linguagem Acessível 0.5.0): fluxo sem explicação em texto, linha em negrito usada como título, lista feita com "•" ou "–", tabela sem a linha "Tabela:" de legenda, referência só pela cor, forma ou posição ("clique no botão verde", "à direita") e link para vídeo ou áudio sem dizer se há legenda ou transcrição. Título e lista podem ser corrigidos com um clique.
## 1.95 - 11/11/2026
- **Seis sugestões novas no painel Acessibilidade** (biblioteca Linguagem Acessível 0.4.0): descrição de imagem longa demais, descrição que começa com "imagem de", título vazio, mais de um título principal na apostila, links com o mesmo texto para lugares diferentes e link para arquivo (PDF, DOCX, planilha) sem o formato no texto. "Imagem de" e o formato do arquivo podem ser corrigidos com um clique.
## 1.94 - 10/11/2026
- **Figuras sem leitura dupla:** quando a legenda repete a descrição da imagem, o leitor de tela lê o texto uma só vez.
- **Tamanho do texto até 200% (WCAG 1.4.4):** o Modo leitura da apresentação passa a ir de 90% a 200%.
- **Rótulo visível "Tema" (WCAG 3.3.2):** o seletor de tema da apostila tem rótulo na tela.
- **Menu Mais opções e barra da apresentação (WCAG 4.1.2):** papéis coerentes com o uso pelo teclado.
- **Janelas no padrão gov.br:** excluir pacote, apagar pacotes, apagar os dados do navegador e a senha de um link abrem janelas próprias, com foco em Cancelar, Esc para cancelar e erro no próprio campo, em vez das caixas do navegador.
## 1.93 - 10/11/2026
- **Mensagens anunciadas (WCAG 4.1.3):** a área de mensagens da geração passa a ser lida pelo leitor de tela, sem precisar ir até ela.
- **Links que abrem em nova aba (eMAG 1.9):** nos arquivos HTML gerados, links externos avisam "(abre em nova aba)" ao leitor de tela.
- **Tabelas com nome próprio (WCAG 1.3.1 e 2.4.6):** cada tabela é anunciada com número e título da seção, em vez de só "Tabela". Uma linha **Tabela: texto** logo antes da tabela vira a legenda dela (HTML e EPUB).
- **Sumário em telas estreitas (WCAG 1.4.10):** na apostila, o sumário não some mais abaixo de 900 px nem com zoom de 400%; ele aparece no topo, com rolagem própria.
## 1.92 - 10/11/2026
- **Áreas de arquivo pelo teclado (WCAG 2.1.1):** as áreas "Arraste o .md … ou clique para selecionar" recebem o foco com Tab e abrem o seletor com Enter ou Espaço.
- **Abas Apostila e Apresentação (WCAG 4.1.2):** agora são anunciadas como abas, com a aba selecionada; as setas, Home e End trocam de aba.
- **Botão Histórico (WCAG 4.1.2):** saiu de dentro do título recolhível de **Arquivos gerados** e fica logo acima dele, sem abrir ou fechar a seção ao ser usado.
## 1.91 - 10/11/2026
- **Atalhos de uma tecla na apresentação (WCAG 2.1.4):** N, S, L, F, M, A, G, ?, Espaço, +, − e 0 só funcionam com o foco na apresentação ou na barra, nunca no painel, em campos ou em janelas. Novo interruptor **Atalhos de uma tecla** no painel Acessibilidade; desligado, use Alt+Shift e a letra. Setas, Page Up/Down, Home, End e Esc continuam iguais.
- **Leitura em voz alta (WCAG 1.4.2):** enquanto lê, o botão vira **Parar leitura**. A leitura para ao clicar de novo, ao fechar o painel e ao mudar de slide ou de modo.
## 1.90 - 10/11/2026
- **Licenciamento opcional do conteúdo:** seletor Creative Commons ao lado de Layout, sem licença por padrão; declaração ao final da Apostila e em slide final próprio da Apresentação, com link oficial. A escolha é preservada em versões, links e arquivos Markdown.
- **Geração:** suporte a CC BY, BY-SA, BY-ND, BY-NC, BY-NC-SA, BY-NC-ND 4.0 e CC0 1.0 em HTML, DOCX, EPUB, PPTX e Markdown; CLI aceita `--licenca`.
- **Ajuda e manuais:** instruções breves para a escolha e a preservação dos créditos de terceiros.

## 1.89 - 05/11/2026
- **Testes seletivos:** classificação conservadora por domínio, executor local e aliases dos 21 grupos existentes. Documentação e versão não abrem navegador; formatos usam o curso e os validadores existentes. PRs executam os grupos relacionados; publicações mantêm a bateria completa no mesmo SHA, sem repeti-la no workflow seletivo. Pacotes continuam com validação completa antes de gravar e na publicação do SHA final; não há novos testes de voz real nesta entrega.
- **Conferência antes de gerar:** itens para corrigir abrem uma confirmação com Conferir agora, Gerar assim mesmo e Cancelar; sugestões não interrompem. A preferência de sessão e Alt+Shift+G usam o mesmo fluxo.
- **Relatório de acessibilidade:** exportação em HTML, JSON e Markdown, com versões, limites, regras, marcadores, itens, linhas e trechos. Pode ser incluído no ZIP. O relatório informa que não substitui avaliação WCAG/eMAG.
- **API Linguagem Acessível v1:** `lac servir`, rotas de conferir, ajustar, regras, pedidos, ajuda e saúde; OpenAPI 3.1, erros RFC 9457, CORS configurável, ETag, limites de corpo e taxa, sem registrar conteúdo.
- **Configuração avançada:** janela para sugestões, limite, regras, confirmação, marcas e IA; importar/exportar JSON. O marcador `<!-- linguagem-acessivel: siglas QWER=Quadro de Registro -->` define o glossário do conteúdo.
- **Arquivos HTML gerados:** painel lateral responsivo de acessibilidade, alto contraste, espaçamento WCAG 1.4.12, régua, leitura em voz alta, barra persistente e VLibras sob demanda. Legendas das notas de narração ligadas por padrão; VLibras pode ser desligado na geração.
- **Barra da apresentação:** o botão **Notas** ocupa o lugar de Leitura na barra; o Modo leitura (L) passou para o menu **Mais opções**. Um único botão **Acessibilidade** (A) abre o painel com fonte de leitura, tamanho do texto, contraste, espaçamento, régua, animações, barra fixa, legendas, leitura em voz alta e VLibras.
- **Auditoria ampliada:** grupos 16–21 cobrem geração, relatórios, API, configurações, axe-core, viewports de 320 a 1920 px, forced-colors, movimento reduzido e arquivos gerados.

## 1.84 - 05/11/2026
- **Pacotes sem mudar permissões no GitHub**: a organização bloqueia a opção *Read and write permissions* em *Settings › Actions*. Não é preciso alterá-la: o fluxo **Aplicar pacote** pede no próprio YAML as permissões de que precisa. O guia `tools/pacote/LEIA-ME.md` foi corrigido.
- **Conferência de versão**: novo `tools/pacote/conferir-versao.ps1`. Antes de cada pacote, confere no GitHub se `changelog.js`, `index.html` e `CHANGELOG.md` estão na mesma versão, se o fluxo **Aplicar pacote** tem as permissões e se não há pacote pendente.
- Primeira versão entregue pelo fluxo **Aplicar pacote**, sem script de atualização direta.

## 1.83.1 - 05/11/2026
- **Atualização pelo celular.** As próximas versões chegam como pacote (`conteudista-pacote-<versão>.zip`). Basta enviar o ZIP ao repositório pelo navegador (Add file › Upload files) ou pelo Termux (`cdt`). O novo fluxo **Aplicar pacote** do GitHub confere a versão e cada arquivo, roda todos os testes e, se tudo passar, grava e publica. Se algo falhar, nada muda e uma issue explica o motivo. Instruções em `tools/pacote/LEIA-ME.md`.
- A verificação sem navegador ficou num único script, `tools/verificar.sh`, usado pela publicação e pelos pacotes.
- `.gitattributes`: o repositório guarda quebras de linha LF, e os avisos "LF will be replaced by CRLF" deixam de aparecer.

## 1.83 - 05/11/2026
- **Prompt padrão 1.1** (seção 11.3 da apostila de exemplo): a IA passa a receber regras de acessibilidade e linguagem simples. Frases de até 20 palavras, voz ativa, siglas explicadas na primeira vez, títulos em ordem, todo slide com título, legendas que dizem o que a imagem mostra, imagens decorativas marcadas, links que dizem aonde levam, tabelas com cabeçalho e notas de narração curtas. A verificação final do prompt confere esses pontos.
- **Apostila de exemplo:** novas seções **5.6 Acessibilidade do texto** (painel, marcas, janelas, atalhos) e **10.6 Escrever conteúdo acessível** (antes e depois, imagens, apresentações e narração). O Checklist A ganhou "conferir a acessibilidade". O próprio exemplo não tem itens para corrigir.
- **Apresentação de exemplo:** 5 slides novos sobre acessibilidade do texto, antes de "Gerar arquivos" (agora são 39 slides).
- **Tutorial:** novo passo **3. Confira a acessibilidade**, que mostra o botão Acessibilidade da barra do editor.
- **Ajuda:** tabela de atalhos da acessibilidade, imagens decorativas e a seção "Escrever conteúdo acessível".
- Correção: a explicação aberta em **Por quê?**, no painel Acessibilidade, fechava sozinha quando a conferência rodava de novo (por exemplo, logo depois de ignorar uma sugestão).
- Correção na biblioteca (0.2.1): a apostila de exemplo era tratada como apresentação pela linha de comando, porque traz exemplos da sintaxe dos slides em blocos de código. Unidades (KB, MB, GB) e extensões (MD, TXT) não são mais cobradas como siglas.

## 1.82 - 05/11/2026
- **Janelas de apoio.** As correções **Descrever**, **Simplificar** e **Explicar** abrem uma janela:
  - **Descrever imagem:** mostra a imagem, a descrição curta (até 150 caracteres, com contagem) e a detalhada, opcional, que entra como texto abaixo da imagem. Também dá para marcar a imagem como decorativa.
  - **Simplificar trecho:** mostra **Antes** e **Depois**, lado a lado, com a contagem de palavras e frases.
  - **Explicar sigla:** pede o nome completo e mostra como o texto fica.
- **Pedir ajuda a uma IA** (Descrever e Simplificar): copie o pedido padronizado (versão 1.0) e a imagem, cole na IA autorizada, traga a resposta de volta e confira antes de aplicar. A resposta é separada sozinha em descrição curta e detalhada, com avisos quando passa de 150 caracteres ou tem pontos a confirmar. O Conteudista não envia nada sozinho.
- **Imagens decorativas nos arquivos gerados:** a imagem marcada como decorativa sai sem descrição e sem aviso; no PPTX, fica marcada como decorativa.
- Os botões das janelas e do painel de acessibilidade não ficam mais verdes sozinhos ao clicar (a confirmação vem do próprio aviso).
- Opção nova em `web/config/opcoes.yaml`: `acessibilidade_texto.ajuda_ia` (desligado: as janelas não mostram a aba de IA).

## 1.81.1 - 05/11/2026
- **Correção:** o balão das marcas de acessibilidade fechava sozinho logo depois de abrir quando a página ou o editor rolavam (ao clicar numa marca ou com Alt+Shift+N). Agora ele só fecha com Esc, ao digitar, ao clicar fora ou ao corrigir; com o trecho fora da vista, o balão fica preso ao topo do campo.
- Testes do navegador (grupo 13) passam a esperar o balão abrir, em vez de um tempo fixo.
## 1.81 - 05/11/2026
- **Marcas no texto.** O editor sublinha os trechos para corrigir com uma linha ondulada vermelha, como um corretor ortográfico. As sugestões podem ser sublinhadas com uma linha pontilhada (desligado por padrão). A cor nunca vem sozinha: o tipo de linha também muda.
- **Clique numa marca** para ver a mensagem e as correções num balão, com **Por quê?**, **Ignorar** (nas sugestões) e **Ver no painel**. Pelo teclado: Alt+Shift+N vai ao próximo item e mostra o balão; o novo **Alt+Shift+I** leva o foco às correções do item no cursor; Esc volta ao texto.
- As marcas somem enquanto você digita e voltam 1 segundo depois. Não entram no texto, no link nem nos arquivos gerados.
- **Resumo no rodapé do editor** (computador): "Acessibilidade: N para corrigir", que abre o painel.
- Interruptores **Marcar no texto** e **Marcar também as sugestões** no rodapé do painel. Padrões em `web/config/opcoes.yaml`: `acessibilidade_texto.marcas_no_texto` (ligado) e `marcas_sugestoes` (desligado).

## 1.80 - 05/11/2026
- **Acessibilidade do texto.** Novo botão **Acessibilidade** na barra do editor (atalho Alt+Shift+C). Ele abre um painel com dois níveis: **Para corrigir** (o que impede alguém de ler: imagem sem descrição, título que pula nível, link "clique aqui", slide sem título, tabela sem cabeçalho) e **Sugestões** de linguagem simples (frase longa, sigla sem explicação, texto em maiúsculas). As mensagens estão em linguagem simples, com **Por quê?** em cada item.
- **Correção em um clique** quando é possível (Ajustar nível, É decorativa, Usar a primeira linha, Explicar a sigla, Converter maiúsculas). Toda correção pode ser desfeita com Ctrl+Z. Quando depende de você, **Ir para** seleciona o trecho e uma dica diz o que escrever. Sugestões podem ser ignoradas naquele trecho.
- O número vermelho no botão mostra os itens para corrigir. Um aviso perto de **Gerar arquivos** lembra desses itens, mas nunca impede a geração. Alt+Shift+N vai ao próximo item a partir do cursor.
- A conferência roda em segundo plano, 1 segundo depois que você para de digitar, e não envia o texto para fora do navegador. No celular, o painel abre como folha inferior.
- Opções novas em `web/config/opcoes.yaml`, seção `acessibilidade_texto`: mostrar sugestões, palavras por frase (padrão 25) e o aviso perto de Gerar arquivos.

## 1.79 - 05/11/2026
- **Editor no celular mais compacto.** A barra ocupa no máximo duas linhas: Desfazer, Refazer, Negrito e Itálico continuam à mão, e o restante fica em três menus: **H** (títulos, código e listas), **+** (Inserir) e **⋯** (Mais). A segunda linha traz os modos Editar, Dividido e Prévia. Os menus seguem o padrão gov.br, funcionam com setas e Esc, e cada item mostra ícone e nome.
- **Mais espaço para o texto no celular:** a contagem ocupa uma linha (toque para ver os detalhes) e **Imagens do texto** fica recolhida; abre como folha inferior em **+ › Imagens do texto**, e o botão Voltar do celular fecha.
- **Importar › Link** virou a primeira aba e já abre selecionada. Colar ficou só para textos. As mensagens de erro do link dizem o que aconteceu e o que fazer (link expirado, senha ou internet).
- **Zoom na apostila e na apresentação.** Na apresentação: pinça com dois dedos, toque duplo, Ctrl + roda do mouse ou teclas + e −; com o slide ampliado, as setas movem a visão e 0 ou o botão **100% ↺** voltam ao normal. Ao trocar de slide, o zoom volta a 100%. Imagens e fluxos têm o botão **Ampliar** (lupa), que abre a imagem em tela cheia com zoom próprio. A apostila mantém a pinça e o Ctrl + roda do navegador.
- Opções novas em `web/config/opcoes.yaml`: `celular.barra_compacta`, `celular.imagens_recolhidas` e o valor `link` (padrão) em `importar.aba_inicial`. O valor antigo `automatica` continua aceito.
- Correção: o aviso discreto do rodapé (ex.: "Tutorial concluído") não bloqueia mais toques na parte de baixo da tela quando está invisível.

## 1.78 - 05/11/2026
- **Opções padrão em um arquivo YAML.** As opções de ligar e desligar da página começam como define `web/config/opcoes.yaml`: salvar automático, lembrar links, guardar cada geração e o limite do Histórico, narração dos slides e avanço automático, formato do áudio, recursos de áudio ao abrir, modo inicial do editor, Notas dos slides na Locução, opções do link (autocontido ou PrivateBin, validade, apagar após leitura, imagens como anexo), aba inicial de Importar, layout e alto contraste. Basta trocar `ligado` por `desligado` (ou a opção indicada), salvar e publicar.
- A escolha que a pessoa já fez no navegador continua valendo. O novo botão **Restaurar padrão**, no rodapé, volta tudo para o arquivo, sem apagar textos, rascunhos ou versões.
- Arquivo com erro não quebra a página: valem os padrões do código e o aviso aparece no console. Antes de publicar, o GitHub confere o arquivo e indica a linha do problema. A lista completa está em `docs/OPCOES.md`.
- **Fontes de leitura sem arquivo repetido.** A Atkinson Hyperlegible Next é uma fonte variável: o mesmo arquivo tem o normal e o negrito. Antes, ele era embutido duas vezes em cada HTML e EPUB; agora vai uma vez, declarado para os pesos 400 a 700, e o negrito continua aparecendo. Se um dia os arquivos de peso forem iguais e a fonte não for variável, a geração avisa.
- **Borda do contador de slides mais visível** na apresentação HTML (contraste de 3,54:1, acima do mínimo de 3:1 da WCAG 1.4.11).

## 1.77 - 04/11/2026
- Ícones no menu Mais opções da apresentação HTML. Avanço automático, Notas (Mostrar/Ocultar) e Imprimir / PDF… ganham ícone à esquerda do texto; no celular, Acessibilidade também. Os ícones seguem o padrão da barra (SVG de 24 px, preenchidos, na cor do texto e ocultos para leitores de tela) e o Acessibilidade reaproveita o mesmo ícone da barra. O nome acessível continua sendo o texto do botão e, ao mostrar ou ocultar as notas, só o rótulo muda (o ícone permanece). Os ícones da barra B+ não mudam.

## 1.76 - 03/11/2026
- **A pausa é respeitada ao mudar de slide.** Se você apertar **Pausar** (ou `Espaço`) e depois navegar, o slide novo não começa a narrar sozinho: o botão continua em **Reproduzir**, e a narração do slide em que você estiver só começa quando você apertar **Reproduzir**. Ligar o som de novo (`S`) também retoma a narração do slide atual. Sem pausa, a navegação continua narrando o slide novo, como antes.
- **Próximo no último slide não reinicia mais a narração.** Antes, cada toque em Próximo (ou `→`, `End`, gesto de deslizar) no último slide recarregava o slide e reiniciava o áudio. Agora nada acontece quando o destino é o slide em que você já está.
- **Corrigido o slide que ficava mudo.** Ao navegar muito rápido, a interrupção de um áudio que acabava de começar era tratada como falha, e a narração daquele slide deixava de tocar até recarregar a página. Interrupções por troca de slide ou pausa não marcam mais falha.
- **Botão Pausar/Reproduzir coerente com o som.** Ao sair de um slide narrado para outro sem narração (ou pausado), o botão passa a mostrar **Reproduzir**, em vez de continuar em **Pausar** sem som.
- **Reproduzir no último slide:** se a narração do último slide ainda não tinha tocado (por exemplo, depois de pausar e ir ao fim), ela toca em vez de a apresentação voltar ao slide 1; a volta ao início só ocorre depois que a narração termina.
- README, ajuda, apostila e apresentação de exemplo atualizados (no README, o atalho do botão de narração passa a `S`).
- **Botões da barra com 44 × 44 px no celular.** Na apresentação HTML, em telas até 700 px ou de toque, os botões da barra tinham 40 px de largura; agora têm 44 px (WCAG 2.2, critério 2.5.5). A barra continua cabendo em telas de 320 px, com margem dos dois lados e sem rolagem horizontal.
## 1.75 - 03/11/2026
- **Pausar também pausa a narração.** Na apresentação HTML, o botão **Pausar** (e a tecla Espaço) agora para o áudio da narração no ponto exato, além do avanço automático. **Reproduzir** continua o áudio do mesmo ponto e, quando ele termina, passa ao próximo slide. Antes, a pausa parava só a troca de slides e o áudio continuava tocando.
- O botão mostra **Pausar** sempre que a narração está tocando, inclusive quando você navega pelos slides sem o avanço automático; pausado no último slide, Reproduzir retoma o áudio em vez de voltar ao início.
- **Tela cheia no Modo leitura.** O botão quadrado de tela cheia (e sair da tela cheia) agora fica no canto superior direito também no Modo leitura, no mesmo lugar dos slides, e continua no atalho `F`. Saiu o item "Tela cheia" do menu Mais opções, que só existia no Modo leitura.
## 1.74 - 03/11/2026
- **Locução › Notas dos slides.** A aba Locução ganha o modo **Notas dos slides**, integrado ao texto da aba Apresentação. **Importar notas** cria um rascunho com um campo por slide; você edita, ouve cada slide (**▶ Ouvir**) e escolhe onde gravar: **Nota do apresentador**, **Só narração** (`<!-- narracao: … -->`) ou **Sem narração**. **Aplicar à apresentação** devolve ao Markdown só os slides alterados e guarda antes uma versão "Antes de aplicar as notas da Locução" (Ctrl+Z no editor também desfaz). O modo anterior continua como **Texto livre**.
- **Conflitos e mudanças de estrutura:** se a nota mudar na aba Apresentação enquanto você edita, o slide mostra **Conflito** (Manter a minha / Usar a da apresentação) e Aplicar fica bloqueado até resolver; slides não editados acompanham a apresentação sozinhos. Se slides forem incluídos, excluídos ou movidos, a aba pede para atualizar a lista e mantém as edições nos slides de mesmo título. O rascunho fica guardado neste navegador.
- **Versões e Compartilhar link nas notas:** a barra das notas tem **Versões**, que abre a mesma janela de comparação no novo documento **Notas dos slides** (com a opção "Rascunho da Locução", para conferir o que vai mudar antes de aplicar), e **Compartilhar link**, a mesma janela do editor; com alterações não aplicadas, pergunta antes se deve aplicá-las. `Alt+Shift+V` na aba Locução abre as versões das notas.
- Ajuda, tutorial (novo passo 8), apostila e apresentação de exemplo atualizados; corrigidas as referências antigas aos atalhos da narração (agora `S` para o som e `Espaço` para Reproduzir).
## 1.73 - 03/11/2026
- **O avanço automático da apresentação HTML espera a leitura terminar.** Causa: desde a 1.67, o botão **Reproduzir** (e a tecla Espaço) trocava de slide a cada 5 segundos fixos, sem considerar a narração, e corria em paralelo ao avanço da própria narração. Narrações com mais de 5 s eram cortadas no meio.
- Agora existe um único avanço automático. Em slides com narração e som ligado, o próximo slide só vem **0,7 s depois que o áudio termina**. Em slides sem narração (ou com o som desligado), o tempo é calculado pelo texto visível do slide (cerca de 160 palavras por minuto, mais 3 s por imagem, tabela, código ou fluxo; de 5 s a 2 min).
- Ligar ou desligar o som no meio de um slide recalcula a espera; pausar interrompe o avanço sem cortar o áudio; se o áudio falhar ao tocar, vale o tempo de leitura. **Avanço automático** (menu Mais opções) e **Reproduzir** passam a ser o mesmo controle. Apresentações geradas com avanço automático começam a avançar ao escolher "Iniciar com narração".
## 1.72 - 03/11/2026
- **A apresentação não abre mais em Modo leitura automaticamente.** Antes, telas de até 900 px abriam em Modo leitura. Agora ela sempre abre em slides; o Modo leitura só é usado quando a pessoa escolhe (botão **Leitura** ou tecla `L`), e a escolha fica salva.
- **Celular em Modo slides corrigido.** Causa: o palco de 1280 px alargava a página, e o navegador do celular ampliava a janela (360 → 886 px de largura), deixando tudo minúsculo e fora do centro. O palco agora é fixo e não alarga a página. Em retrato (até 700 px) o slide usa um palco de 480 px de largura que preenche a tela, com texto de cerca de 15 px na tela (antes, cerca de 6 px). Em paisagem e em telas maiores, nada muda.
- **Gesto horizontal mais confiável no celular:** arrastar para os lados troca de slide e não aciona o "voltar" do navegador, inclusive quando o gesto começa sobre a barra. Tabelas e blocos de código continuam rolando para os lados.
- **Apostila HTML com Verdana em 16 px** (antes, 18 px), título 28/22/18 px e tabelas 15 px; Atkinson e OpenDyslexic mantêm os tamanhos de antes. Novo **Tamanho do texto** (A− · 100% · A+, de 90% a 150%) no cabeçalho, com a mesma preferência da apresentação, salva neste navegador. A impressão ignora o ajuste. Em telas de até 700 px, o cabeçalho deixa de ficar fixo no topo, para não ocupar um terço da tela.
- Os botões **A−** e **A+** passam a ter nome acessível que inclui o texto visível. No Modo leitura da apresentação, os tamanhos de Atkinson e OpenDyslexic voltam a ser exatamente os de antes (na 1.71 variavam até 6%). Gerador v4.4.
## 1.71 - 03/11/2026
- **Barra do Modo leitura redesenhada.** A barra antiga (que rolava junto com o texto e mostrava só Acessibilidade e Mais opções) foi substituída pela **mesma pílula branca dos slides**, fixa na base da tela e sempre visível: anterior, próximo, contador, botão **Slides**, Acessibilidade e Mais opções. Play e som saem do Modo leitura, onde não funcionam. No celular, Acessibilidade passa para Mais opções.
- **Ir e voltar entre os modos com o mesmo gesto.** O Modo slides ganha o botão **Leitura** no mesmo lugar do botão **Slides** do Modo leitura (atalho `L`). Ao trocar, a tela abre no slide em que você estava.
- **Navegação no Modo leitura.** Anterior e próximo levam ao início do slide vizinho; o contador acompanha a rolagem; clicar nele (ou `G`) abre o seletor de slide.
- **Verdana menor no Modo leitura:** o texto passa de 18 px para **16 px** (títulos 28/22 px; notas e tabelas 15 px). Atkinson e OpenDyslexic ficam como estavam.
- **Tamanho do texto ajustável** (A− · 100% · A+, de 90% a 150%) no painel Acessibilidade, só no Modo leitura; a escolha fica salva neste navegador. Gerador v4.3.
## 1.70 - 03/11/2026
- **Confirmação de ação mais rápida.** O botão fica verde **no instante do clique** (antes havia um atraso de 80 ms), permanece verde por **1 s** e esmaece em 0,2 s, num total de **1,2 s** (antes, 2,6 s). Com a preferência do sistema por menos movimento, não há esmaecimento: o verde sai ao fim de 1,2 s. Leitores de tela continuam recebendo a mensagem pela região oculta, independentemente do tempo visual.
- **Tick alinhado.** O "✓" (caractere, que variava com a fonte e ficava mais perto da borda) foi substituído por um ícone SVG simétrico, posicionado **equidistante da borda do botão e do início do texto**, a partir da medida real do botão. Em botões estreitos o ícone encolhe (mínimo de 10 px) para manter folga dos dois lados; em botões largos com texto centralizado, o tick acompanha o texto (folga máxima de 12 px). A largura do botão não muda.
## 1.69 - 03/11/2026
- **Barra B+ redesenhada (pílula branca).** Fundo branco com borda e sombra: a barra se destaca tanto sobre o slide quanto sobre a área escura. Ícones em SVG no estilo Material (sem emoji), em azul gov.br.
- **A barra agora some por completo** após 2,5 s sem interação (antes ficava sempre visível) e reaparece ao mover o mouse, tocar ou usar o teclado. Permanece aberta com o mouse sobre ela, com foco de teclado nela ou com um menu aberto. Recolhida, não intercepta cliques nem toques.
- **Legenda em cada botão**, com nome e atalho (ex.: "Próximo slide · →"): aparece no hover e no foco por teclado, pode ser sobrevoada e fecha com Esc (WCAG 1.4.13).
- **Seletor de slide:** clique no contador ("5 / 34") ou tecle **G** para digitar o número ou escolher o slide numa lista com os títulos.
- **Som da narração sempre visível** na barra (alto-falante com ondas / cortado); antes ficava no menu.
- **Tela cheia flutuante** no canto superior direito, em botão quadrado; some junto com a barra. Fica oculta onde o navegador não oferece tela cheia (ex.: Safari do iPhone). No Modo leitura, fica no menu Mais opções.
- No celular, **Acessibilidade** passa a ficar no menu Mais opções (antes ficava inacessível em telas estreitas). Corrigido o deslocamento da barra no Modo leitura. Gerador v4.2.
## 1.68 - 03/11/2026
- **Janela "Imprimir apresentação".** *Imprimir / PDF…* (menu Mais opções da barra B+, ou Ctrl+P) abre uma janela com escolha explícita do formato: **Slides** (um slide por página, preservando composição, cores e proporção 16:9) ou **Documento** (conteúdo linear em A4).
- **A impressão não altera mais o modo de visualização.** É possível imprimir nos dois formatos tanto no Modo slides quanto no Modo leitura; o modo, o slide atual, as notas e a preferência salva permanecem como estavam. Antes, toda impressão saía no formato de leitura.
- **Notas opcionais em ambos os formatos:** em Slides, cada nota vira uma página logo após o slide; em Documento, a nota acompanha o conteúdo. Sem notas na apresentação, a opção fica oculta e a janela informa isso.
- Janela acessível: foco inicial no título, foco preso na janela, Esc ou Cancelar fecham e devolvem o foco, opções descritas em texto, alvos de 44 px, alto contraste do sistema (forced-colors) e layout de folha inferior no celular.
- **Correção da verificação automática (CI):** os nomes acessíveis da barra B+ não incluem mais o atalho entre parênteses (ex.: "Slide anterior (Seta para a esquerda)"); os atalhos passam a ser anunciados por `aria-keyshortcuts`. O teste de acessibilidade agora também verifica a barra B+ e a janela de impressão.
- Impressão pelo menu do navegador, sem a janela, segue o formato da visualização atual sem mudá-la. Gerador v4.1.
## 1.67 - 03/11/2026
- **Barra B+ nas apresentações HTML.** Controles principais mais limpos, recolhimento por inatividade e menu de opções secundárias, com densidade reduzida no celular e em orientação horizontal.
- **Interação unificada por Pointer Events**, com estado centralizado da barra e adaptação independente por largura e método de entrada. Mouse, teclado, toque e caneta compartilham as mesmas ações; dispositivos híbridos alternam o comportamento conforme a entrada atual.
- **Toque e gesto horizontal:** o primeiro toque revela a barra sem executar outra ação; deslizar horizontalmente troca de slide, sem capturar movimentos verticais nem gestos iniciados nos controles.
- **Atalhos B+:** setas para navegar, Espaço para reproduzir/pausar, A para acessibilidade, S para som da narração, N para notas, F para tela cheia, M para Mais opções, ? para ajuda e Esc para fechar a camada atual.
- Alvos de toque de pelo menos 44 px, foco visível, nomes acessíveis, suporte a `prefers-reduced-motion` e proteção dos atalhos em campos editáveis. Gerador v4.0.
## 1.66 - 29/10/2026
- **O item Compartilhar link sai do menu Salvar ▾**, porque o botão **Compartilhar link** já fica ao lado de **Salvar ▾**. O menu agora reúne só as formas de guardar neste computador: **Guardar no navegador**, **Baixar tudo (.zip)**, **Salvar na pasta** e **Baixar .md**. O botão da barra de ações, o ícone do editor e o atalho Alt+Shift+L continuam como antes.
- Tutorial, Ajuda, README e o conteúdo de exemplo (apostila, apresentação e figura do menu) seguem o novo menu.
- **Acessibilidade para dislexia na apostila e na apresentação.** Os arquivos HTML gerados ganham o seletor **Leitura**, separado do **Tema**: **Padrão (Verdana)**, **Atkinson Hyperlegible Next** e **OpenDyslexic**. As duas últimas vão embutidas no arquivo (sem internet). O texto da apostila passa a 18 px, entrelinha 1,7, à esquerda e sem hifenização, com foco visível, tabelas e código roláveis pelo teclado, gabarito acessível e uma **Tabela do fluxo** para cada Mermaid.
- **Modo leitura na apresentação HTML** (`L`): todos os slides em sequência, em fundo claro, com as notas visíveis. Telas pequenas já abrem assim; **Modo slides** volta aos slides e a escolha fica salva. Os slides ganham descrição para leitor de tela, contador anunciado e auto-ajuste sem cortar conteúdo; o modo leitura não inicia a narração.
- **Impressão A4** da apostila e da apresentação pelo botão **Imprimir / PDF**, em fundo branco, com a fonte escolhida e as notas dos slides. O PDF **não é PDF/UA**.
- **EPUB em duas versões:** `Apostila_<nome>.epub` (Atkinson Hyperlegible Next) e `Apostila_<nome>_OpenDyslexic.epub`, com sumário, fontes embutidas, fluxos em tabela, checklists ☐/☒ e metadados de acessibilidade. Agora são 8 arquivos + ZIP.
- **DOCX** em Verdana 12 pt, entrelinha 1,5 e 6 pt após parágrafos, com texto alternativo nas imagens e idioma português (Brasil).
- **PPTX** mantém a fonte do layout e recebe texto alternativo, notas e textos em português (Brasil), cabeçalho de tabela, entrelinha 1,2 e corpo de no mínimo 16 pt.
- **Tutorial com 9 passos**, incluindo **Leia como preferir** (Tema, Leitura, Modo leitura e PDF) e **Guarde em um link** (os três pontos de acesso de Compartilhar link). A Ajuda cita os botões da barra do editor, os dois EPUB e novos problemas comuns (fonte de leitura ausente, imagem sem descrição, fonte no leitor de EPUB).
- **Em Arquivos gerados e no Histórico, o segundo EPUB aparece como .EPUB OpenDyslexic**, para não confundir com o .EPUB da apostila.
- **Imagens do exemplo refeitas a partir da tela atual** (tela principal, Importar › Salvos, menu Salvar ▾ e Arquivos gerados com os dois EPUB), na apostila e na apresentação. Textos e notas de narração do exemplo citam o ícone Compartilhar link e o botão Versões na barra do editor, a Tabela do fluxo, o EPUB, a Leitura e o modo leitura.
- README, Ajuda, exemplo, testes (`tools/testar_acessibilidade.py`) e o workflow atualizados; gerador v3.9. O menu **Salvar ▾** continua sem **Compartilhar link**.
## 1.65 - 29/10/2026
- **Importar link em Versões.** A janela **Versões do texto** tem o novo botão **Importar link**: cole o link do Conteudista (direto ou PrivateBin) e escolha **Adicionar como versão**. O texto entra como versão **via link**, **sem alterar os editores**, é selecionado como Versão A e já é comparado com o texto atual. Para comparar dois links, importe os dois e escolha A e B.
- **Link com senha:** a senha é pedida antes de adicionar. Um conteúdo que já está nas versões não é duplicado.
- As versões abertas ou importadas por link ficam no grupo **Via link** e mostram "via link" no nome. **Esc** fecha primeiro o painel Importar link e, no segundo toque, a janela.
- Corrigido: no celular, o fundo branco da janela Versões do texto era cortado quando o conteúdo passava da altura da tela.
## 1.64 - 29/10/2026
- **O botão Compartilhar link ganha três pontos de acesso**: na **barra de ações, logo depois de Importar**; na **barra de ferramentas de cada editor** (só o ícone, antes de Versões); e **ao lado de Salvar ▾**, perto de Gerar arquivos. Todos abrem a mesma janela **Link do conteúdo**.
- No celular o rótulo vira **Link** (o nome acessível continua "Compartilhar link") e **Salvar ▾** e **Link** dividem a mesma linha, sob **Gerar arquivos**.
## 1.63 - 27/10/2026
- **O menu Salvar ▾ sai da barra de ações e passa a ficar ao lado de Gerar arquivos.** Ele agora tem **Guardar no navegador** (versão salva), **Baixar tudo (.zip)** e **Compartilhar link**, além de **Salvar na pasta** e **Baixar .md** em um segundo grupo. A barra de ações fica com **Importar**, **Carregar exemplo**, **Limpar tela** e a chave **Salvar automático**.
- **Um único caminho para guardar.** A linha **Texto-fonte** (botão **Criar link**) deixou de aparecer em **Arquivos gerados**; o link é criado em **Salvar ▾ › Compartilhar link** (ou Alt+Shift+L). Os atalhos continuam os mesmos.
- **Status do salvamento automático sempre visível.** Sob a barra de ações aparece "✓ Salvo automaticamente às HH:MM · neste navegador" (ou o aviso de que o salvamento está desligado). Leitores de tela ouvem só o primeiro salvamento da sessão e as mudanças da chave, nunca a cada alteração.
- No celular, **Gerar arquivos** e **Salvar ▾** ocupam toda a largura e o menu abre sob o botão.
- Tutorial, Ajuda (nova seção **O botão Salvar ▾**), README, mensagens da tela, apostila e apresentação de exemplo (com as figuras e as notas de narração) seguem o novo caminho. O parâmetro de cache dos scripts passa a 1.63.

## 1.62 - 27/10/2026
- **Fluxos mais legíveis na apresentação de exemplo.** Os três fluxos mais longos (Início rápido, Percurso de aprendizado e Produzir os textos com IA) tinham rótulos longos e, ao caberem na largura do slide, mostravam o texto com cerca de 12 px. Os rótulos e as etapas foram encurtados e o texto passa a cerca de 17,5 px, mais perto dos outros dois fluxos do exemplo (cerca de 22 px).
- No **Início rápido** a decisão "Primeira geração?" foi mantida e o passo "Conferir o nome" ficou apenas na lista do slide seguinte. No **Percurso de aprendizado** e em **Produzir os textos com IA** as etapas ficaram com nomes curtos, sem quebra de linha, o que também deixa mais limpas as tabelas De, Condição e Para do PPTX.
- Muda somente a apresentação de exemplo. A apostila de exemplo e o gerador permanecem como estavam. O parâmetro de cache dos scripts da página passa a 1.62.

## 1.61 - 23/10/2026
- **Corrigido: os fluxos Mermaid não apareciam na apresentação em HTML.** Esse HTML mostra um slide por vez, e o Mermaid não consegue desenhar dentro de um elemento oculto; por isso os fluxos de todos os slides, exceto o primeiro a ser exibido, saíam vazios. Agora, ao **Gerar arquivos**, cada fluxo da apresentação é desenhado na própria página e embutido no HTML como imagem, sem depender da rede nem de qual slide está visível. O `.md` continua com o código do fluxo e o PPTX, com a tabela De, Condição e Para.
- Se o componente Mermaid não estiver acessível ao gerar, ou se um fluxo tiver erro de sintaxe, a página avisa e esse fluxo continua sendo desenhado no navegador de quem abrir a apresentação, agora com todos os slides mensuráveis, o que corrige também esse caminho.
- Cada imagem de fluxo traz como texto alternativo as etapas, na ordem. O gerador passa à versão 3.8, com o parâmetro opcional `fluxos`.
- A nota da seção 10.2 da apostila de exemplo e o README passam a dizer que só a apostila em HTML depende do endereço do CDN.

## 1.60 - 23/10/2026
- **Ajuda e Tutorial passam a apresentar o conteúdo de exemplo e o prompt padrão para IA.** Duas seções novas na Ajuda, **Conteúdo de exemplo** e **Produzir os textos com uma IA**, explicam o que o botão **Carregar exemplo** traz (apostila de 16 seções, apresentação de 34 slides com notas para narração e o prompt padrão) e como usar o prompt, com as duas formas de entrega: dois blocos de texto ou um ZIP. Os passos 1 e 3 do Tutorial citam o exemplo e o prompt, e a tabela de problemas comuns ganhou duas linhas sobre o texto devolvido pela IA e a leitura da narração.
- O parâmetro de cache dos scripts da página passa a 1.60, para que a Ajuda nova chegue a quem já abriu o site.
- O README descreve o exemplo como guia de uso, com a manutenção do conteúdo e as mudanças do gerador 3.7.

## 1.59 - 23/10/2026
- **A apresentação de exemplo agora é uma aula sobre o próprio Conteudista.** O botão **Carregar exemplo** traz 34 slides, um assunto por slide: privacidade e funcionamento, início rápido, percurso de aprendizado, tela principal, editor e atalhos, imagens, o que cabe no Markdown, fluxos Mermaid, checklists e exercícios, vídeos, importação, formas de guardar, link do conteúdo, versões, geração, layouts, Arquivos gerados, Histórico, narração, locução e produção com IA.
- **Cada slide tem notas para narração**, com 63 a 81 palavras, em tom técnico e formal, escritas para serem ouvidas: sem símbolos, algarismos, parênteses nem endereços. Ao marcar **Narração dos slides**, o exemplo rende cerca de 15 minutos de áudio, e a aba **Locução** importa as notas como texto.
- A apresentação traz 5 fluxos Mermaid (início rápido, percurso de aprendizado, processo de trabalho, onde guardar e uso com IA), 3 figuras da interface em formato próprio para slide e um vídeo em link. Com a Parte anterior, o exemplo completo tem apostila de 16 seções, apresentação de 34 slides e o prompt padrão para IA.

## 1.58 - 23/10/2026
- **A apostila de exemplo fica completa, com 16 seções.** Às seções 1 a 8 da versão anterior somam-se: **9. Locução e narração** (notas, controle do que é falado e aba Locução), **10. O que cabe no Markdown** (tabela de elementos por formato, fluxos Mermaid, imagens, vídeos e o que evitar), **11. Produzir os textos com uma IA**, **12. Fluxo de trabalho de exemplo**, **13. Checklists**, **14. Exercícios**, **15. Gabarito** e **16. Referências**.
- **Prompt padrão para IA**, na seção 11.3: um bloco único para copiar e colar, em 8 seções. Só a seção 1 (14 parâmetros: tema, público, objetivo, número de seções e de slides, tamanho das notas, formato de entrega) e a seção 2 (material de referência) são editadas; as demais fixam as regras de conteúdo e de formato. A IA entrega a apostila e a apresentação em dois blocos de texto ou em um ZIP com as imagens, e as duas formas se importam sem ajustes.
- O exemplo passa a ter 5 fluxos Mermaid (início rápido, percurso de aprendizado, onde guardar, uso com IA e um processo de trabalho), 5 imagens, links para vídeos e referências, 5 exercícios com gabarito e 2 checklists.

## 1.57 - 23/10/2026
- **O conteúdo de exemplo começa a virar um guia de uso do próprio Conteudista.** A apostila do botão **Carregar exemplo** ganha as seções 1 a 8: como usar o material, **Início rápido**, como a aplicação funciona, percurso de aprendizado, edição, importação, formas de guardar o trabalho e geração dos arquivos. Traz 3 fluxos Mermaid (início rápido, percurso de aprendizado e onde guardar), 4 figuras da interface, tabelas, caixas e a lista de termos. As seções 9 a 16 e a apresentação chegam nas próximas versões.
- Corrigido o parâmetro de cache dos scripts da página, que não havia sido atualizado na versão anterior.

## 1.56 - 23/10/2026
- **Gerador v3.7**: comentários HTML (`<!-- -->`) dentro de blocos de código e de código em linha agora são preservados na apostila e na prévia do editor, o que permite mostrar a sintaxe das notas e da narração em exemplos. Fora de código, continuam sendo removidos.
- Exemplos de imagem escritos dentro de código (`![legenda](arquivo.png)`) deixam de contar como imagens pendentes e de ser buscados na internet, e o contador de imagens do editor ignora esses exemplos.
- No DOCX, cada lista numerada passa a reiniciar em 1; antes, a numeração continuava a da lista anterior.

## 1.55 - 23/10/2026
- **Exibir no Histórico agora traz os arquivos junto.** Ao escolher **Exibir apostila** ou **Exibir apresentação**, o pacote escolhido aparece na seção Arquivos gerados, num bloco **Em exibição** logo acima da pré-visualização, com o nome, a data, o tamanho e o layout, os arquivos (.MD, .HTML, .DOCX ou .PPTX) e o **.ZIP**. Assim dá para baixar exatamente a versão que está sendo vista.
- Dentro do bloco, **Exibir apostila** e **Exibir apresentação** alternam a pré-visualização, e o botão do arquivo exibido fica marcado com ✓. O bloco acompanha a exibição: some ao recolher a seção, ao limpar a tela, ao gerar novos arquivos ou ao excluir o pacote exibido.
- Corrigido o foco depois de Exibir, que agora vai para o bloco, para leitores de tela anunciarem o pacote em exibição.

## 1.54 - 23/10/2026
- **Importar › Salvos reorganizado.** Cada grupo (Versões salvas e Links) tem o título com a contagem, uma linha de explicação e, logo abaixo, o texto **Excluir versões salvas** ou **Excluir links**, que apaga só aquele grupo. **Excluir tudo** continua no rodapé da janela. Toda exclusão, inclusive a de um item, pede confirmação.
- **Todos os itens seguem o mesmo desenho**: ícone, nome, detalhes e uma única linha de ações alinhada ao texto, com **Abrir** como ação principal. O QR Code agora abre sob demanda em **QR code**. O tipo do link mostra a validade e os detalhes sem parênteses, e **Apagar link** passou a se chamar **Apagar no servidor**, para não se confundir com **Excluir**.
- **Removido o bloco "Mais opções › Apagar dados".** As versões automáticas do texto continuam gerenciáveis em **Versões › Limpar histórico**.
- Corrigida a barra de abas das janelas, que encolhia em telas baixas e cortava os rótulos com uma rolagem própria. Excluir um link recém-criado, que ainda não tinha identificador no armazenamento, agora funciona.

## 1.53 - 23/10/2026
- **Arquivos gerados** agora também pode ser **recolhida e mostrada**, como as demais seções: o controle **recolher/mostrar** fica à direita do título. A seção continua começando aberta, abre sozinha quando os arquivos são gerados e quando um arquivo é exibido pelo Histórico.
- O botão **Histórico** fica no cabeçalho, ao lado do título, e continua acessível com a seção recolhida; clicar nele (ou usar Enter) abre a janela sem alternar a seção.
- A Ajuda explica o novo comportamento.

## 1.52 - 23/10/2026
- **Busca no Histórico e em Importar › Salvos**: o campo **Buscar**, no padrão de campo de busca do Design System do Governo, filtra a lista enquanto você digita, sem diferenciar acentos nem maiúsculas. Pesquisa nome, data e hora, tamanho, layout, rodapé, narração e tipo de arquivo; nos links, também o tipo, a validade e a senha. Com várias palavras, só aparecem os itens que têm todas; aspas buscam uma frase exata; Esc limpa a busca.
- Cada geração passa a guardar também o rodapé e a narração, e cada link guarda o layout, o rodapé e o tamanho, para a busca encontrar esses dados. Pacotes e links anteriores continuam na lista e são encontrados pelos dados que já tinham.
- Tutorial e Ajuda ganharam a seção **Buscar no Histórico e em Salvos**. Corrigido o foco inicial das janelas, que agora vai ao primeiro campo disponível.

## 1.51 - 23/10/2026
- **Termos padronizados em toda a aplicação**: **Conteúdo** (o material que você produz) no lugar de "curso" e **Apostila** no lugar de "Treinamento". A seção passa a se chamar **Gerar conteúdo**, o campo **Nome do conteúdo**, a aba **Conteúdo** e a janela **Link do conteúdo**. Os arquivos baixados passam a ser **Apostila_…** e **Conteudo_….zip**; os nomes antigos continuam reconhecidos ao importar e no Histórico.
- **Tutorial e Ajuda reescritos** com o mesmo vocabulário, com a nova tabela **Termos usados**, os passos em torno de "gerar, guardar e recuperar um conteúdo" e a explicação de **arquivo** (conteúdo pronto) e **link** (texto-fonte).
- O gerador, o conteúdo de exemplo e o README também seguem os novos termos.

## 1.50 - 23/10/2026
- **Layout (tema)** com nomes curtos, sem texto entre parênteses: Padrão gov.br, ANAC 20 anos — claro, ANAC 20 anos — escuro e Clássico. A explicação de onde cada tema se aplica ficou na dica do campo e na Ajuda.
- Corrigido um erro de script que aparecia no console a cada mudança nas listas de arquivos e rascunhos (contagens do Histórico).

## 1.49 - 23/10/2026
- **Link do curso**: o link criptografado passa a ser a forma recomendada de guardar o texto-fonte (texto, imagens, nome e rodapé) e continuar em outro computador. O botão **Compartilhar** saiu da barra e deu lugar a **Salvar › Link** (primeiro item do menu) e ao botão **Criar link**, na nova linha **Texto-fonte** de Arquivos gerados. A janela passa a se chamar **Link do curso** e o atalho Alt+Shift+L abre essa janela.
- A janela sugere **Link direto** ou **PrivateBin** conforme o tamanho do curso, traz a **validade** do PrivateBin (padrão: **1 ano**), um aviso fixo sobre a perda do link e, depois de criar, mostra o endereço, o QR Code e onde guardá-lo. **Lembrar este link** passa a vir marcado.
- **Importar**: a lista de links mostra o tipo e a validade ("expira em" ou "não expira") e a aba Colar › Link ganhou uma orientação nova.
- Como funciona, Tutorial e Ajuda reescritos em torno de "arquivo ou link": os arquivos são o curso pronto; o link é o texto-fonte.

## 1.48 - 23/10/2026
- **Arquivos gerados** agora traz um mínimo de metadados em cada pacote: **nome do curso**, **data e hora**, **tamanho** e **layout (tema)**, em uma linha discreta abaixo do nome. Vale para a seção e para o Histórico de arquivos.
- Pacotes guardados antes desta versão aparecem sem o layout (ele não era registrado). A linha técnica de resumo da geração deixou de ser exibida na lista.

## 1.47 - 22/10/2026
- **Arquivos gerados** deixou de ser uma subseção recolhível de "Gerar curso" e virou uma **seção própria**, logo depois dela, sempre visível. O botão **Histórico** fica no cabeçalho da seção. A página segue a ordem do trabalho: Como funciona → Gerar curso → Arquivos gerados.

## 1.46 - 22/10/2026
- **Rodapé (opcional)** sempre visível, entre **Nome do curso** e **Layout** (no celular, abaixo de Nome do curso). O bloco recolhido "Mais opções" deixou de existir.
- O rótulo "Layout dos arquivos gerados" passou a ser **Layout (tema)**.

## 1.45 - 22/10/2026
- **Importar → Colar** com subabas **Treinamento**, **Apresentação** e **Link**: cada texto tem a sua caixa Markdown, com ✓ quando preenchida. **Importar** envia o que estiver preenchido (um ou os dois textos) e o texto atual vai para Versões antes de ser substituído.
- Colar um link numa das caixas de texto move o endereço para a subaba Link. Os links (colados ou salvos) agora são abertos direto pela página, sem depender dos campos antigos de "Abrir um link".

## 1.44 - 22/10/2026
- **Rascunhos e Versões unificados**: salvar agora cria uma **versão salva** (menu Salvar → Versão, Alt+Shift+S), guardada junto das demais versões e nunca apagada automaticamente. "Rascunho" deixou de existir como conceito; os atalhos S e B viraram um só (S).
- **Migração automática**: os rascunhos com nome viram versões salvas (mesma data e conteúdo), uma única vez e sem duplicar. As cópias antigas ficam guardadas, somente leitura, até a próxima versão. O salvamento automático continua recuperando o último trabalho ao reabrir a página.
- **Importar → Salvos** lista as versões salvas e os links. Abrir uma versão guarda antes o texto atual em Versões ("Antes de abrir..."), então dá para voltar atrás. Excluir (uma linha ou tudo) usa a confirmação acessível.
- Tutorial, Ajuda e README atualizados; na janela Versões do texto, as marcadas passam a se chamar "Versões salvas" e o botão "Marcar versão" virou "Salvar versão".

## 1.43 - 22/10/2026
- **Importar** (antes "Abrir"): uma janela com três abas por origem — **Salvos** (rascunhos e links), **Computador** (clique ou arraste .md, .txt, .zip e imagens; destino detectado e editável) e **Colar** (texto ou link, com reconhecimento automático). A versão atual do texto vai para Versões antes de ser substituída.
- **Salvar e compartilhar** simplificado: a seção saiu da página. A barra de ações tem **Importar, Salvar (menu: Rascunho, Pasta, .MD, .ZIP), Compartilhar, Carregar exemplo e Limpar tela**, todos com o mesmo tamanho, e a chave **Salvar automático**. Compartilhar abre uma janela com destino, senha e tamanho.
- **Arquivos gerados** voltaram para junto de "Gerar arquivos": o botão **Histórico** ao lado do título abre o Histórico de arquivos. Regra de nomes: Versões = texto; Histórico = arquivos gerados.
- **Excluir tudo** (Salvos e Histórico) e **Apagar dados** com confirmação acessível (alertdialog, foco em Cancelar, Esc cancela, sem tempo limite, resultado anunciado a leitores de tela).

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
- Plano de migração da locução registrado no histórico Git da versão.

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
