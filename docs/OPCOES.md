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
