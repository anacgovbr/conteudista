# Regras de acessibilidade e linguagem simples

Este documento reúne as regras que o Conteudista **confere automaticamente** e as orientações que dependem de **revisão humana**. Vale para **slides, notas de narração e apostila**. O inventário das regras foi extraído do código real do validador: `web/lib/linguagem-acessivel/` (registro em `regras/index.js`, limites em `config/padrao.js`).

Documento principal: [Instruções para gerar o material](PROMPT_GERACAO_IA.md), em
https://raw.githubusercontent.com/anacgovbr/conteudista/main/docs/PROMPT_GERACAO_IA.md

> Se você, IA, não conseguir abrir um destes endereços, peça que a pessoa cole o conteúdo do documento. Não diga que o leu sem acesso.

## 1. Três tipos de verificação

| Tipo | O que significa | Exemplo |
|---|---|---|
| **Automática** | O validador confere uma condição objetiva do texto. | Imagem sem texto alternativo (i1). |
| **Parcial** | O validador usa uma heurística (lista de palavras, divisão de frases). Pode errar para mais ou para menos. | “Clique aqui” (k1), frase longa (f1). |
| **Revisão humana** | Nenhum validador confere. | Se a descrição da imagem faz sentido. |

Ser aprovado no validador **não prova** que o conteúdo é acessível. A conferência automática é um apoio.

## 2. Dois níveis de aviso

| Nível | Significado | O que fazer |
|---|---|---|
| **Para corrigir** | Pode impedir que alguém use o conteúdo. | Corrija antes de gerar. Ao gerar, o Conteudista pergunta se você quer revisar. |
| **Sugestão** | Linguagem mais simples ou melhor estrutura. | Avalie caso a caso. Não bloqueia a geração. |

Os grupos de código são: `i` imagens, `e` estrutura, `k` links, `f` frases, `s` siglas, `n` narração, `c` sentido e `m` mídia.

## 3. Limites configuráveis

Valores padrão (`config/padrao.js`):

| Limite | Padrão | Regra |
|---|---|---|
| Palavras por frase | 25 | f1 |
| Palavras por frase nas notas de narração | 25 | n1 |
| Palavras por parágrafo | 100 | f2 |
| Caracteres da descrição de imagem | 150 | i3 |

## 4. Inventário das 23 regras

### Para corrigir

| Código | Regra | Nível | Verificação | Condição de disparo | Onde vale | Código-fonte |
|---|---|---|---|---|---|---|
| i1 | `imagem-sem-descricao` | Para corrigir | Automática | Imagem `![](…)` sem texto alternativo (e sem marca de decorativa). | Apostila e apresentação (texto visível) | `regras/imagem-sem-descricao.js` |
| i2 | `descricao-vaga` | Para corrigir | Parcial | Texto alternativo igual a uma palavra genérica (imagem, foto, figura, gráfico, logo…). | Apostila e apresentação (texto visível) | `regras/descricao-vaga.js` |
| e1 | `titulo-pula-nivel` | Para corrigir | Automática | Título que pula nível (por exemplo, `#` seguido de `###`). Em slides, cada slide recomeça. | Apostila e apresentação (texto visível) | `regras/titulo-pula-nivel.js` |
| e2 | `slide-sem-titulo` | Para corrigir | Automática | Slide com conteúdo e nenhum título. | Só apresentação | `regras/slide-sem-titulo.js` |
| e3 | `tabela-sem-cabecalho` | Para corrigir | Automática | Tabela com a primeira linha (cabeçalho) vazia. | Apostila e apresentação (texto visível) | `regras/tabela-sem-cabecalho.js` |
| k1 | `link-vago` | Para corrigir | Parcial | Texto de link vazio, vago (“clique aqui”, “saiba mais”…) ou igual ao endereço (este último é sugestão). | Apostila e apresentação (texto visível) | `regras/link-vago.js` |

### Sugestões

| Código | Regra | Nível | Verificação | Condição de disparo | Onde vale | Código-fonte |
|---|---|---|---|---|---|---|
| f1 | `frase-longa` | Sugestão | Parcial | Frase com mais palavras que o limite (25). Tabelas não entram. | Apostila e apresentação (texto visível) | `regras/frase-longa.js` |
| f2 | `paragrafo-longo` | Sugestão | Automática | Parágrafo de texto ou citação com mais palavras que o limite (100). | Apostila e apresentação (texto visível) | `regras/paragrafo-longo.js` |
| f3 | `texto-em-maiusculas` | Sugestão | Parcial | Três ou mais palavras seguidas em maiúsculas (mínimo de 12 letras). | Apostila e apresentação (texto visível) | `regras/texto-em-maiusculas.js` |
| s1 | `sigla-sem-explicacao` | Sugestão | Parcial | Sigla (2 a 6 maiúsculas) sem explicação na primeira ocorrência e fora da lista de siglas conhecidas. | Apostila e apresentação (texto visível) | `regras/sigla-sem-explicacao.js` |
| n1 | `narracao-frase-longa` | Sugestão | Parcial | Frase com mais palavras que o limite (25) dentro de `<!-- notas: -->` ou `<!-- narracao: -->`. | Notas de narração (apostila e apresentação) | `regras/narracao-frase-longa.js` |
| i3 | `descricao-longa` | Sugestão | Automática | Texto alternativo com mais de 150 caracteres. | Apostila e apresentação (texto visível) | `regras/descricao-longa.js` |
| i4 | `descricao-redundante` | Sugestão | Parcial | Texto alternativo que começa com “imagem de”, “foto de”, “figura de”, “gráfico de” etc. | Apostila e apresentação (texto visível) | `regras/descricao-redundante.js` |
| e4 | `titulo-vazio` | Sugestão | Automática | Título sem texto. | Apostila e apresentação (texto visível) | `regras/titulo-vazio.js` |
| e5 | `titulo-principal` | Sugestão | Automática | Mais de um título `#` na apostila. | Só apostila | `regras/titulo-principal.js` |
| k2 | `links-ambiguos` | Sugestão | Parcial | Dois links com o mesmo texto e destinos diferentes. | Apostila e apresentação (texto visível) | `regras/links-ambiguos.js` |
| k3 | `link-arquivo-sem-formato` | Sugestão | Automática | Link para arquivo (pdf, docx, xlsx, pptx, zip, mp3…) sem citar o formato no texto. | Apostila e apresentação (texto visível) | `regras/link-arquivo-sem-formato.js` |
| i5 | `fluxo-sem-texto` | Sugestão | Parcial | Bloco `mermaid` sem texto explicativo no mesmo documento. | Apostila e apresentação (texto visível) | `regras/fluxo-sem-texto.js` |
| e6 | `titulo-falso` | Sugestão | Parcial | Linha curta toda em negrito, sozinha e seguida de texto (parece título). | Apostila e apresentação (texto visível) | `regras/titulo-falso.js` |
| e7 | `lista-falsa` | Sugestão | Automática | Duas ou mais linhas seguidas começando com `•`, `–` ou `-` fora da sintaxe de lista. | Apostila e apresentação (texto visível) | `regras/lista-falsa.js` |
| e8 | `tabela-sem-legenda` | Sugestão | Automática | Tabela sem a linha `Tabela: nome` antes. | Apostila e apresentação (texto visível) | `regras/tabela-sem-legenda.js` |
| c1 | `referencia-sensorial` | Sugestão | Parcial | Instrução por cor ou posição (“botão verde”, “à direita”, “no canto superior”). | Apostila e apresentação (texto visível) | `regras/referencia-sensorial.js` |
| m1 | `midia-sem-alternativa` | Sugestão | Parcial | Link de vídeo ou áudio sem citar legenda, transcrição, audiodescrição ou Libras no texto do link. | Apostila e apresentação (texto visível) | `regras/midia-sem-alternativa.js` |

## 5. Matriz: regra, código-fonte e teste

Cada regra mora em um arquivo `web/lib/linguagem-acessivel/regras/<regra>.js` (coluna “Código-fonte” acima). Todas são exercitadas pelo mesmo teste: `node tools/linguagem-acessivel/testar.mjs`, na seção **1. Exemplos de cada regra**, que confirma que cada exemplo **inválido acusa** a regra e cada exemplo **válido não acusa**. O teste de contrato do registro (23 regras, códigos e níveis) fica em `tools/testes/testar_modulos.py` (`test_r9_r10_regras_e_limites_da_referencia_de_acessibilidade`).

### Critérios registrados em cada regra

Campo `referencia` do código. São os critérios que o projeto associou à regra, não uma declaração de conformidade.

| Código | WCAG 2.2 | eMAG | Lei |
|---|---|---|---|
| i1 | 1.1.1 | 3.6 | — |
| i2 | 1.1.1 | 3.6 | — |
| e1 | 1.3.1, 2.4.6 | 1.3 | — |
| e2 | 2.4.6, 1.3.1 | 1.3 | — |
| e3 | 1.3.1 | 3.10 | — |
| k1 | 2.4.4 | 3.5 | — |
| f1 | 3.1.5 | — | Lei 15.263/2025 |
| f2 | — | — | Lei 15.263/2025 |
| f3 | 1.4.8 | — | — |
| s1 | 3.1.4 | — | Lei 15.263/2025 |
| n1 | 1.2.2 | — | Lei 15.263/2025 |
| i3 | 1.1.1 | 3.6 | — |
| i4 | 1.1.1 | — | — |
| e4 | 2.4.6, 1.3.1 | 1.3 | — |
| e5 | 1.3.1, 2.4.6 | 1.3 | — |
| k2 | 2.4.4, 2.4.9 | 3.5 | — |
| k3 | 2.4.4 | 3.5 | — |
| i5 | 1.1.1, 1.3.1 | — | — |
| e6 | 1.3.1 | 1.3 | — |
| e7 | 1.3.1 | — | — |
| e8 | 1.3.1, 2.4.6 | 3.10 | — |
| c1 | 1.3.3, 1.4.1 | — | — |
| m1 | 1.2.1, 1.2.2 | — | — |

## 6. Exemplo inválido e válido de cada regra

Copiados do campo `exemplos` do código (`↵` marca uma quebra de linha; as crases foram trocadas por aspas simples). Os exemplos longos aparecem cortados com “…”.

- **i1 `imagem-sem-descricao`**
  - Inválido: `![](fluxo-aprovacao.png)`
  - Válido: `![Fluxo de aprovação: o pedido passa pela área técnica e segue para a coordenação](fluxo-aprovacao.png)`
- **i2 `descricao-vaga`**
  - Inválido: `![Imagem](fluxo.png)`
  - Válido: `![Fluxo de aprovação em três etapas](fluxo.png)`
- **e1 `titulo-pula-nivel`**
  - Inválido: `# Processo ↵  ↵ ### Prazos`
  - Válido: `# Processo ↵  ↵ ## Prazos`
- **e2 `slide-sem-titulo`**
  - Inválido: `--- ↵ title: Curso ↵ --- ↵  ↵ # Abertura ↵  ↵ Texto. ↵  ↵ --- ↵  ↵ Só texto, sem título. ↵ `
  - Válido: `--- ↵ title: Curso ↵ --- ↵  ↵ # Abertura ↵  ↵ Texto. ↵  ↵ --- ↵  ↵ # Prazos ↵  ↵ Texto do slide. ↵ `
- **e3 `tabela-sem-cabecalho`**
  - Inválido: `|  |  | ↵ |---|---| ↵ | Prazo | 10 dias |`
  - Válido: `| Etapa | Prazo | ↵ |---|---| ↵ | Análise | 10 dias |`
- **k1 `link-vago`**
  - Inválido: `Os prazos estão no regulamento. [Clique aqui](https://www.gov.br/anac).`
  - Válido: `Os prazos estão no [regulamento da ANAC](https://www.gov.br/anac).`
- **f1 `frase-longa`**
  - Inválido: `A solicitação deverá ser instruída pelo interessado com a documentação comprobatória prevista no reg…`
  - Válido: `Envie o pedido com os documentos exigidos pelo regulamento. A área técnica analisa o pedido no prazo previsto.`
- **f2 `paragrafo-longo`**
  - Inválido: `O processo começa com o pedido. A área técnica confere os documentos, verifica os prazos e registra …`
  - Válido: `O processo começa com o pedido. ↵  ↵ A área técnica confere os documentos. ↵  ↵ Depois, registra o andamento no sistema.`
- **f3 `texto-em-maiusculas`**
  - Inválido: `ATENÇÃO: O PRAZO TERMINA NA SEXTA-FEIRA.`
  - Válido: `**Atenção:** o prazo termina na sexta-feira.`
- **s1 `sigla-sem-explicacao`**
  - Inválido: `O pedido segue o RBAC 145.`
  - Válido: `O pedido segue o Regulamento Brasileiro da Aviação Civil (RBAC) 145. Depois, o RBAC define os prazos.`
- **n1 `narracao-frase-longa`**
  - Inválido: `# Prazos ↵  ↵ <!-- notas: Nesta etapa, depois de receber o pedido com todos os documentos exigidos p…`
  - Válido: `# Prazos ↵  ↵ <!-- notas: Nesta etapa, a área técnica analisa o pedido. Depois, a coordenação decide. -->`
- **i3 `descricao-longa`**
  - Inválido: `![Fluxo de aprovação do pedido de certificação: o requerente envia os documentos, a área técnica con…`
  - Válido: `![Fluxo de aprovação do pedido de certificação em quatro etapas](fluxo.png)`
- **i4 `descricao-redundante`**
  - Inválido: `![Imagem de um fluxo de aprovação em três etapas](fluxo.png)`
  - Válido: `![Fluxo de aprovação em três etapas](fluxo.png)`
- **e4 `titulo-vazio`**
  - Inválido: `# Processo ↵  ↵ ## ↵  ↵ Texto.`
  - Válido: `# Processo ↵  ↵ ## Prazos ↵  ↵ Texto.`
- **e5 `titulo-principal`**
  - Inválido: `# Parte 1 ↵  ↵ Texto. ↵  ↵ # Parte 2 ↵  ↵ Texto.`
  - Válido: `# Curso ↵  ↵ ## Parte 1 ↵  ↵ Texto. ↵  ↵ ## Parte 2 ↵  ↵ Texto.`
- **k2 `links-ambiguos`**
  - Inválido: `Leia o [manual](https://a.gov.br/1) e depois o [manual](https://a.gov.br/2).`
  - Válido: `Leia o [manual de voo](https://a.gov.br/1) e depois o [manual de manutenção](https://a.gov.br/2).`
- **k3 `link-arquivo-sem-formato`**
  - Inválido: `Baixe o [relatório anual](https://a.gov.br/relatorio.pdf).`
  - Válido: `Baixe o [relatório anual (PDF)](https://a.gov.br/relatorio.pdf).`
- **i5 `fluxo-sem-texto`**
  - Inválido: `# Fluxo ↵  ↵ '''mermaid ↵ flowchart LR ↵   A[Pedido] --> B[Análise] ↵ '''`
  - Válido: `# Fluxo ↵  ↵ '''mermaid ↵ flowchart LR ↵   A[Pedido] --> B[Análise] ↵ ''' ↵  ↵ O pedido chega e, em seguida, a área técnica faz a análise.`
- **e6 `titulo-falso`**
  - Inválido: `# Curso ↵  ↵ **Prazos de análise** ↵  ↵ O pedido é analisado em dez dias.`
  - Válido: `# Curso ↵  ↵ ## Prazos de análise ↵  ↵ O pedido é analisado em dez dias.`
- **e7 `lista-falsa`**
  - Inválido: `Documentos: ↵  ↵ • Primeiro documento ↵ • Segundo documento`
  - Válido: `Documentos: ↵  ↵ - Primeiro documento ↵ - Segundo documento`
- **e8 `tabela-sem-legenda`**
  - Inválido: `| Etapa | Prazo | ↵ |---|---| ↵ | Análise | 10 dias |`
  - Válido: `Tabela: Prazos de cada etapa ↵  ↵ | Etapa | Prazo | ↵ |---|---| ↵ | Análise | 10 dias |`
- **c1 `referencia-sensorial`**
  - Inválido: `Clique no botão verde para enviar o pedido.`
  - Válido: `Clique no botão Enviar para mandar o pedido.`
- **m1 `midia-sem-alternativa`**
  - Inválido: `Assista ao [vídeo de apresentação](https://www.youtube.com/watch?v=abc).`
  - Válido: `Assista ao [vídeo de apresentação, com legendas](https://www.youtube.com/watch?v=abc).`

## 7. Narração: o que o validador confere

O validador lê o texto das notas (`<!-- notas: … -->`) e da narração (`<!-- narracao: … -->`) **somente pela regra n1**, que cobra frases de até 25 palavras. Foi verificado com um teste automatizado: numa nota com frase longa, sigla sem explicação e texto em maiúsculas, apenas a frase longa é apontada.

Isso quer dizer que as demais regras de linguagem (f1, f2, f3, s1) **não leem as notas**. Elas valem só para o texto visível dos slides e da apostila. Por isso, ao escrever notas, aplique você mesmo as orientações da seção 8.

A aba **Narração** do Conteudista usa o tipo de texto `narracao` e aplica a mesma regra n1.

## 8. Diretrizes de escrita (slides, notas e apostila)

Estas diretrizes são **recomendações do projeto**. Só as que aparecem no inventário são conferidas pelo validador; as demais dependem de revisão humana.

1. **Clareza e concisão:** uma ideia por frase, de preferência com até 20 palavras. Nenhuma passa de 25 (f1 e n1).
2. **Voz ativa e ordem direta:** quem faz o quê. Prefira verbos a substantivos: “analisar”, e não “proceder à análise”.
3. **Palavras do dia a dia.** Termo técnico necessário: mantenha e explique.
4. **Parágrafos de até 100 palavras** (f2).
5. **Siglas:** na primeira vez, “Nome completo (SIGLA)”; depois, só a sigla (s1). Na narração, escreva como se fala.
6. **Títulos em ordem** (e1), um `#` por apostila (e5) e título em todo slide (e2). Não use negrito no lugar de título (e6).
7. **Links** com texto que diz o destino (k1, k2). Informe o formato de arquivos (k3) e a alternativa de vídeos e áudios (m1).
8. **Listas** com a sintaxe de lista (e7). **Tabelas** com cabeçalho (e3) e legenda `Tabela: nome` (e8).
9. **Imagens:** texto alternativo que diz o que a imagem mostra, sem começar com “imagem de” (i1, i2, i4), com até 150 caracteres (i3). Imagem só de enfeite: `<!-- linguagem-acessivel: decorativa -->` na linha anterior.
10. **Gráficos e fluxos:** além do texto alternativo, explique em texto o que o gráfico ou o fluxo mostra (i5). Descreva também a informação visual na narração do slide.
11. **Sem depender só de cor ou posição** (c1). Use o rótulo das caixas (**Informação:**, **Dica:**, **Atenção:**), que já vem em texto.
12. **Sem maiúsculas em trechos longos** (f3). Para destacar, use negrito.
13. **Notas de narração:** frases curtas, sem símbolos, sem Markdown, sem endereços e sem parênteses.

## 9. O que só uma pessoa confere

- Se as descrições de imagem fazem sentido e dizem o essencial.
- A ordem de leitura e a lógica da sequência dos slides.
- O contraste e o tamanho das fontes no tema escolhido.
- A navegação pelo teclado e a leitura com leitor de tela.
- Se a narração soa natural e corresponde ao slide.
- Se o conteúdo é correto e atual.

## 10. Limites dos testes automáticos

- O validador trabalha sobre o texto Markdown. Ele não vê o arquivo final (HTML, DOCX, PPTX) nem o resultado visual.
- Parte das regras usa listas de palavras e divisão de frases; podem errar em casos incomuns.
- Os testes automáticos **não** afirmam conformidade integral com WCAG, eMAG ou lei alguma.
- Antes de publicar, revise o material com pessoas e, quando possível, com tecnologias assistivas.

## 11. Verificação antes de entregar

- [ ] Nenhuma frase passa de 25 palavras, nos slides e nas notas.
- [ ] As siglas estão explicadas na primeira vez.
- [ ] Os títulos estão em ordem e todo slide tem título.
- [ ] Toda imagem tem descrição; todo link diz o destino; toda tabela tem cabeçalho.
- [ ] As notas estão em texto corrido, sem símbolos e sem endereços.
- [ ] No Conteudista, o botão **Acessibilidade** não mostra itens “para corrigir”.