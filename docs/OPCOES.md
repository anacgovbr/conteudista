# Opções padrão do Conteudista

Arquivo: `web/config/opcoes.yaml`. Ele define como cada opção **começa**. Se a pessoa já mudou a opção no navegador, vale a escolha dela. O botão **Restaurar padrão**, no rodapé, volta tudo para o que está no arquivo.

**Para mudar:** edite o valor depois dos dois-pontos, salve e publique. A verificação do GitHub recusa a publicação se houver erro e diz a linha.

> Este documento é gerado por `node tools/opcoes/verificar_opcoes.js --gerar`. Não edite à mão.

## Editor

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `modo_inicial` | Modo do editor ao abrir. editar: só o texto · dividido: texto e prévia · previa: só a prévia. | editar · dividido · previa | `dividido` | sim |

## Editor · imagens

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `recomprimir_grandes` | Reduzir imagens: recomprimir também as acima de 300 KB | ligado · desligado | `ligado` | não (vale ao abrir) |

## Aplicativo

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `layout` | Layout (tema) dos arquivos gerados | govbr · anac20_claro · anac20_escuro · classico | `govbr` | sim |
| `alto_contraste` | Alto contraste no aplicativo | ligado · desligado | `desligado` | sim |

## Temas

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `contraste_minimo` | Contraste mínimo dos pares essenciais do tema | aa · aaa | `aa` | sim |
| `corrigir_contraste` | Corrigir automaticamente as cores com contraste insuficiente ao salvar | ligado · desligado | `ligado` | sim |
| `variantes_automaticas` | Gerar as variantes escura e de alto contraste a partir do tema base | ligado · desligado | `ligado` | sim |
| `limite_imagem_kb` | Tamanho máximo de cada imagem de fundo do tema | 512 a 4096 | `2048` | sim |
| `limite_total_kb` | Tamanho máximo somado das imagens de um tema | 1024 a 12288 | `6144` | sim |
| `guardar_versoes` | Guardar uma versão sempre que salvar o tema | ligado · desligado | `ligado` | sim |
| `limite_versoes` | Quantas versões de cada tema guardar | 1 a 100 | `20` | sim |

## acessibilidade_arquivos

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `vlibras` | Incluir VLibras nos arquivos HTML gerados (carrega somente quando solicitado) | ligado · desligado | `ligado` | sim |

## Salvar e Histórico

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `automaticamente` | Salvar automaticamente neste navegador | ligado · desligado | `ligado` | sim |
| `lembrar_links` | Lembrar os links criados neste navegador | ligado · desligado | `ligado` | sim |
| `guardar_cada_geracao` | Guardar automaticamente cada geração no Histórico | ligado · desligado | `ligado` | sim |
| `limite_de_geracoes` | Quantas gerações o Histórico guarda | 1 a 100 | `10` | sim |

## Link criptografado

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `onde_guardar` | Onde guardar o link criptografado | autocontido · privatebin | `autocontido` | não (vale ao abrir) |
| `expira_em` | PrivateBin: prazo de validade do link | 1_hora · 1_dia · 1_semana · 1_mes · 1_ano · nunca | `1_semana` | não (vale ao abrir) |
| `apagar_apos_primeira_leitura` | PrivateBin: apagar após a primeira leitura | ligado · desligado | `desligado` | não (vale ao abrir) |
| `imagens_como_anexo` | PrivateBin: enviar as imagens como anexo (ZIP) | ligado · desligado | `ligado` | não (vale ao abrir) |

## Importar

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `aba_inicial` | Aba que abre em Importar. link: sempre a aba Link (padrão). ultima: a última usada; na primeira vez, Salvos (se houver) ou Computador. | link · ultima · salvos · computador · colar | `link` | não (vale ao abrir) |

## Celular

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `barra_compacta` | Celular: barra do editor em até duas linhas, com os botões agrupados em menus | ligado · desligado | `ligado` | não (vale ao abrir) |
| `imagens_recolhidas` | Celular: esconder "Imagens do texto" abaixo do editor (abre por Inserir › Imagens do texto) | ligado · desligado | `ligado` | não (vale ao abrir) |

## Acessibilidade do texto

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `mostrar_sugestoes` | Acessibilidade do texto: mostrar também as sugestões de linguagem simples (desligado: só o que é para corrigir) | ligado · desligado | `ligado` | sim |
| `limite_frase_longa` | Acessibilidade do texto: palavras por frase antes da sugestão "frase longa" | 10 a 60 | `25` | sim |
| `aviso_ao_gerar` | Acessibilidade do texto: aviso perto de "Gerar arquivos" quando há itens para corrigir (nunca bloqueia) | ligado · desligado | `ligado` | sim |
| `confirmar_ao_gerar` | Acessibilidade do texto: confirmar antes de gerar quando há itens para corrigir | ligado · desligado | `ligado` | sim |
| `incluir_relatorio_no_zip` | Acessibilidade do texto: incluir o relatório HTML no ZIP gerado | ligado · desligado | `desligado` | sim |
| `ajuda_ia` | Acessibilidade do texto: aba "Pedir ajuda a uma IA" nas janelas Descrever imagem e Simplificar trecho (desligado: só escrever) | ligado · desligado | `ligado` | sim |
| `marcas_no_texto` | Acessibilidade do texto: sublinhar no editor os trechos para corrigir | ligado · desligado | `ligado` | sim |
| `marcas_sugestoes` | Acessibilidade do texto: sublinhar também as sugestões (linha pontilhada) | ligado · desligado | `desligado` | sim |

## acessibilidade_texto.regras

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `i1` | Acessibilidade do texto: nível da regra i1 | corrigir · sugestao · desligado | `corrigir` | sim |
| `i2` | Acessibilidade do texto: nível da regra i2 | corrigir · sugestao · desligado | `corrigir` | sim |
| `e1` | Acessibilidade do texto: nível da regra e1 | corrigir · sugestao · desligado | `corrigir` | sim |
| `e2` | Acessibilidade do texto: nível da regra e2 | corrigir · sugestao · desligado | `corrigir` | sim |
| `e3` | Acessibilidade do texto: nível da regra e3 | corrigir · sugestao · desligado | `corrigir` | sim |
| `k1` | Acessibilidade do texto: nível da regra k1 | corrigir · sugestao · desligado | `corrigir` | sim |
| `f1` | Acessibilidade do texto: nível da regra f1 | sugestao · desligado | `sugestao` | sim |
| `f2` | Acessibilidade do texto: nível da regra f2 | sugestao · desligado | `sugestao` | sim |
| `f3` | Acessibilidade do texto: nível da regra f3 | sugestao · desligado | `sugestao` | sim |
| `s1` | Acessibilidade do texto: nível da regra s1 | sugestao · desligado | `sugestao` | sim |
| `n1` | Acessibilidade do texto: nível da regra n1 | sugestao · desligado | `sugestao` | sim |

## Narração (aba Gerar)

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `narrar_slides` | Narração dos slides (gerar áudio das notas) | ligado · desligado | `desligado` | sim |
| `avancar_sozinho` | Avançar os slides sozinho ao fim da narração | ligado · desligado | `desligado` | sim |
| `formato_audio` | Formato do áudio da narração | mp3 · ogg · wav | `mp3` | sim |

## Locução

| Opção | O que faz | Valores | Padrão | Lembrada no navegador |
|---|---|---|---|---|
| `carregar_audio_ao_abrir` | Locução: carregar os recursos de áudio ao abrir a página | ligado · desligado | `desligado` | sim |
| `formato_audio` | Locução: formato do arquivo | mp3 · ogg · wav | `mp3` | sim |
| `notas_dos_slides` | Locução: começar em "Notas dos slides" (desligado: texto livre) | ligado · desligado | `ligado` | sim |
