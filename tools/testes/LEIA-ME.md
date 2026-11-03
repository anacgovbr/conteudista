# Testes automatizados do Conteudista

Este é o roteiro de validação em código. Ele abre as apresentações geradas no **Google Chrome**
(via Playwright), executa os mesmos passos do roteiro manual e produz um relatório. O relatório
registra a versão exata do Chrome usada.

**Navegador principal: Google Chrome** (o instalado no computador ou, no GitHub, o Chrome estável).
Só ele pode reprovar a publicação. Edge, Firefox e WebKit (Safari) são complementares e informativos.

## Quando roda sozinho

| Gatilho | O que acontece |
|---|---|
| **Push na `main`** (publicação) | Roda no **Google Chrome** antes de publicar. Se falhar, a página **não** é publicada. |
| **Pull request** | Roda no Chrome (bloqueia) e, em paralelo, em Edge, Firefox e WebKit (informativos). |
| **Toda segunda-feira, 6h (Brasília)** | Roda nos quatro navegadores. Pega regressões causadas por atualização do Chrome. |
| **Manual** | *Actions › Testes de navegador › Run workflow*. |

O resultado aparece no **resumo da execução** (tabela por caso) e o relatório completo, com
capturas de tela dos erros, fica como artefato `relatorio-testes-<navegador>`.

## Rodar no seu computador

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1
# ver o teste acontecendo na tela:
powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1 -ComJanela
# outro navegador (Edge instalado):
powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1 -Navegador msedge
# só alguns grupos:
powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1 -Grupos 1,2
```

O script usa o Chrome já instalado (não baixa navegador) e mostra a versão dele. O relatório sai em `tools/testes/relatorio/relatorio.md` (e `.json`). Código de saída 0 = tudo certo.

## O que é verificado

| Grupo | Conteúdo | Casos |
|---|---|---|
| 1 | Pausa respeitada ao mudar de slide, Reproduzir, S, avanço automático | 1.0–1.13 |
| 2 | Próximo/→/End/PageDown repetidos no último slide; pausa e retomada; fim e reinício | 2.1–2.7 |
| 3 | Navegação em rajada (nenhum slide pode ficar mudo) | 3.1–3.3 |
| 4 | Modo leitura, tela cheia no canto superior direito, menu, sair do Modo leitura | 4.1–4.7 |
| 5 | Versão (CHANGELOG × `changelog.js` × `?v=` do `index.html`), documentação, sintaxe dos `.js`, gate no CI | 5.1–5.7 |
| 6 | Geração (DOCX, EPUB, PPTX, HTML), teste de acessibilidade (inclusive com saída em cp1252, como no Windows), layout em 3 janelas | 6.1–6.3 |
| 7 | Celular emulado no Chrome (Pixel 7): toque em Pausar, deslizar, último slide, botões de 44×44 px e barra dentro da tela | 7.1–7.7 |

Os áudios usados são tons sintéticos curtos (slides 1, 2, 3 e o último; o slide 4 fica sem narração de
propósito). O teste **não** avalia a qualidade da voz.

Status possíveis: `OK`, `FALHA`/`ERRO` (reprovam), `INSTAVEL` (falhou e passou na repetição do grupo),
`AVISO` (não reprova), `PULADO` e `MANUAL`.

## O que continua manual

`M.1` iPhone/Safari real · `M.2` Android real · `M.3` PPTX no PowerPoint · `M.4` janela de impressão ·
`M.5` voz real (Kokoro/Piper). Aparecem no fim de todo relatório como lembrete.

## Como acrescentar um teste

1. Abra `testar_apresentacao.py` e escolha o grupo (funções `grupo1` … `grupo7`).
2. Use `G.chk('id', 'descrição', condição, detalhe)`. Os auxiliares `esperar`, `permanece`, `tecla`,
   `estado` e `resumo` evitam esperas fixas (que deixam o teste instável).
3. Para a próxima versão, acrescente os casos novos e, se um comportamento mudar de propósito,
   atualize o caso correspondente no mesmo commit da mudança.
