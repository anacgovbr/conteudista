# Linguagem Acessível · regras

Versão da biblioteca: 0.1.0.

> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.

| Código | Regra | Grupo | Nível | Referência |
|---|---|---|---|---|
| `i1` | [Imagem sem descrição](regras/i1-imagem-sem-descricao.md) | Imagens | Para corrigir | WCAG 1.1.1 · eMAG 3.6 |
| `e1` | [Título que pula nível](regras/e1-titulo-pula-nivel.md) | Estrutura | Para corrigir | WCAG 1.3.1, 2.4.6 · eMAG 1.3 |
| `k1` | [Link que não diz aonde leva](regras/k1-link-vago.md) | Links | Para corrigir | WCAG 2.4.4 · eMAG 3.5 |

## Marcadores no texto

| Marcador | Efeito |
|---|---|
| `<!-- linguagem-acessivel: ignorar i1 k1 -->` | Ignora essas regras no bloco seguinte (aceita código ou nome). |
| `<!-- linguagem-acessivel: ignorar-documento i1 -->` | Ignora em todo o texto. |
| `<!-- linguagem-acessivel: decorativa -->` | A imagem logo a seguir é decorativa: não precisa de descrição. |

Os marcadores são comentários HTML: não aparecem na apostila, na apresentação nem nos demais arquivos gerados.
