# Linguagem Acessível · regras

Versão da biblioteca: 0.4.0.

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

| Código | Regra | Grupo | Nível | Referência |
|---|---|---|---|---|
| `i1` | [Imagem sem descrição](regras/i1-imagem-sem-descricao.md) | Imagens | Para corrigir | WCAG 1.1.1 · eMAG 3.6 |
| `i2` | [Descrição que não descreve](regras/i2-descricao-vaga.md) | Imagens | Para corrigir | WCAG 1.1.1 · eMAG 3.6 |
| `e1` | [Título que pula nível](regras/e1-titulo-pula-nivel.md) | Estrutura | Para corrigir | WCAG 1.3.1, 2.4.6 · eMAG 1.3 |
| `e2` | [Slide sem título](regras/e2-slide-sem-titulo.md) | Estrutura | Para corrigir | WCAG 2.4.6, 1.3.1 · eMAG 1.3 |
| `e3` | [Tabela sem cabeçalho](regras/e3-tabela-sem-cabecalho.md) | Estrutura | Para corrigir | WCAG 1.3.1 · eMAG 3.10 |
| `k1` | [Link que não diz aonde leva](regras/k1-link-vago.md) | Links | Para corrigir | WCAG 2.4.4 · eMAG 3.5 |
| `f1` | [Frase longa](regras/f1-frase-longa.md) | Frases | Sugestão | WCAG 3.1.5 · Lei 15.263/2025 |
| `f2` | [Parágrafo longo](regras/f2-paragrafo-longo.md) | Frases | Sugestão | Lei 15.263/2025 |
| `f3` | [Texto em maiúsculas](regras/f3-texto-em-maiusculas.md) | Frases | Sugestão | WCAG 1.4.8 |
| `s1` | [Sigla sem explicação](regras/s1-sigla-sem-explicacao.md) | Siglas | Sugestão | WCAG 3.1.4 · Lei 15.263/2025 |
| `n1` | [Frase longa na narração](regras/n1-narracao-frase-longa.md) | Narração | Sugestão | WCAG 1.2.2 · Lei 15.263/2025 |
| `i3` | [Descrição longa](regras/i3-descricao-longa.md) | Imagens | Sugestão | WCAG 1.1.1 · eMAG 3.6 |
| `i4` | [Descrição que começa com "imagem de"](regras/i4-descricao-redundante.md) | Imagens | Sugestão | WCAG 1.1.1 |
| `e4` | [Título vazio](regras/e4-titulo-vazio.md) | Estrutura | Sugestão | WCAG 2.4.6, 1.3.1 · eMAG 1.3 |
| `e5` | [Mais de um título principal](regras/e5-titulo-principal.md) | Estrutura | Sugestão | WCAG 1.3.1, 2.4.6 · eMAG 1.3 |
| `k2` | [Links iguais para lugares diferentes](regras/k2-links-ambiguos.md) | Links | Sugestão | WCAG 2.4.4, 2.4.9 · eMAG 3.5 |
| `k3` | [Link para arquivo sem o formato](regras/k3-link-arquivo-sem-formato.md) | Links | Sugestão | WCAG 2.4.4 · eMAG 3.5 |

## Marcadores no texto

| Marcador | Efeito |
|---|---|
| `<!-- linguagem-acessivel: ignorar i1 k1 -->` | Ignora essas regras no bloco seguinte (aceita código ou nome). |
| `<!-- linguagem-acessivel: ignorar-documento i1 -->` | Ignora em todo o texto. |
| `<!-- linguagem-acessivel: decorativa -->` | A imagem logo a seguir é decorativa: não precisa de descrição. |

Os marcadores são comentários HTML: não aparecem na apostila, na apresentação nem nos demais arquivos gerados.

## Glossário de siglas

O arquivo `web/lib/linguagem-acessivel/dados/siglas.js` traz o nome completo das siglas da área (usado em **Explicar**) e as siglas que dispensam explicação (formatos de arquivo e documentos comuns). Para incluir uma sigla, acrescente uma linha `SIGLA: 'Nome completo',` em ordem alfabética.
