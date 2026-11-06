# Testes automatizados do Conteudista

Este é o roteiro de validação em código. Ele abre as apresentações geradas no **Google Chrome**
(via Playwright), executa os mesmos passos do roteiro manual e produz um relatório. O relatório
registra a versão exata do Chrome usada.

**Navegador principal: Google Chrome** (o instalado no computador ou, no GitHub, o Chrome estável).
Só ele pode reprovar a publicação. Edge, Firefox e WebKit (Safari) são complementares e informativos.

## Quando roda sozinho

| Gatilho | O que acontece |
|---|---|
| **Push na `main`** (publicação) | Mudanças em código rodam no **Google Chrome** antes de publicar. Se falhar, a página **não** é publicada. Alterações apenas de documentação não iniciam a publicação. |
| **Pull request** | Classifica arquivos e executa os grupos relacionados; Chrome só é instalado quando necessário. Caminhos desconhecidos e mudanças transversais usam a suíte completa. |
| **Pacote de atualização** | Mantém a suíte completa antes de gravar; a publicação valida novamente o SHA final. O reaproveitamento entre esses SHAs não faz parte desta entrega. |
| **Manual** | *Testes seletivos* permite solicitar a suíte completa; *Publicar página* exige todos os gates, independentemente dos booleanos antigos de compatibilidade. |
| **Agendado** | A suíte completa roda em `main` três vezes por semana, com artefatos retidos por 14 dias. |

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

## Organização por funcionalidade

Veja a [SPEC adaptada e os comandos de seleção](../../docs/TESTES-SELETIVOS.md).
`grupos.yaml` é a fonte única de caminhos, aliases e requisitos; o arquivo usa sintaxe JSON,
um subconjunto de YAML, para o classificador não precisar de dependências externas.

```powershell
python tools/testes/classificar_mudancas.py --base HEAD~1 --head HEAD
python tools/testes/executar_seletivos.py --grupo editor
python tools/testes/executar_seletivos.py --grupo gerador_docx
python tools/testes/testar_apresentacao.py --grupos editor,marcas
python tools/testes/executar_seletivos.py --listar-grupos
```

O comando continua em `testar_apresentacao.py`; os casos e identificadores permanecem os mesmos.
Os módulos de `grupos/` reúnem apresentação, geração, editor, acessibilidade do texto e
acessibilidade dos arquivos. `suporte.py` concentra os utilitários compartilhados e `casos/`
guarda os exemplos sintéticos, sem substituir o curso demonstrativo da aplicação.

Para alterações no pacote Python e seu carregamento, os checks baratos são:

```powershell
python tools/testes/testar_modulos.py
node tools/testes/testar_motor_python.mjs
```

Esses checks também fazem parte de `tools/verificar.sh`. Ao adicionar um módulo ou recurso
ao motor, atualize `tools/conteudo/arquivos.json`; o teste confere se o manifesto está completo.
Os recursos são publicados junto com o motor e continuam embutidos nos HTML exportados.

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
| 8 | Opções YAML, padrões, escolha da pessoa e restaurar | 8.1–8.6 |
| 9 | Editor no celular, menus e importação | 9.1–9.14 |
| 10 | Zoom nos arquivos gerados | 10.1–10.12 |
| 11 | Biblioteca no navegador e Web Worker | 11.1–11.3 |
| 12 | Painel Acessibilidade do texto | 12.1–12.18 |
| 13 | Marcas no texto e balão | 13.1–13.18 |
| 14 | Janelas de apoio e imagens decorativas | 14.1–14.17 |
| 15 | Exemplo, tutorial, ajuda e prompt acessíveis | 15.1–15.9 |
| 16 | Confirmação ao gerar, sugestões sem bloqueio, ações, foco, sessão e atalho | 16.1–16.9 |
| 17 | Relatório JSON contra schema, exportações e axe-core WCAG 2.2 | 17.1–17.6 |
| 18 | Configuração, rebaixamento de regras, importação/exportação JSON e glossário do conteúdo | 18.1–18.7 |
| 19 | API local: rotas, formatos, ETag, RFC 9457, limites, CORS e taxa | 19.1 |
| 20 | Apresentação em 320, 390, 768, 1024, 1366 e 1920 px; forced-colors, movimento reduzido, sem violações axe novas e orçamento 200 KiB/400 ms | 20.1–20.4 |
| 21 | Painel dos arquivos, alt decorativo entre formatos, legendas, axe-core e VLibras sob demanda | 21.1–21.10 |

Os áudios usados são tons sintéticos curtos (slides 1, 2, 3 e o último; o slide 4 fica sem narração de
propósito). O teste **não** avalia a qualidade da voz.

Status possíveis: `OK`, `FALHA`/`ERRO` (reprovam), `INSTAVEL` (falhou e passou na repetição do grupo),
`AVISO` (não reprova), `PULADO` e `MANUAL`.

## O que continua manual

`M.1` iPhone/Safari real · `M.2` Android real · `M.3` PPTX no PowerPoint · `M.4` janela de impressão ·
`M.5` voz real (Kokoro/Piper). Aparecem no fim de todo relatório como lembrete.

## Como acrescentar um teste

1. Abra o módulo da funcionalidade em `grupos/` e escolha o grupo (funções `grupo1` … `grupo21`). O registro e a execução ficam em `testar_apresentacao.py`.
2. Use `G.chk('id', 'descrição', condição, detalhe)`. Os auxiliares `esperar`, `permanece`, `tecla`,
   `estado` e `resumo` evitam esperas fixas (que deixam o teste instável).
3. Para a próxima versão, acrescente os casos novos e, se um comportamento mudar de propósito,
   atualize o caso correspondente no mesmo commit da mudança.
