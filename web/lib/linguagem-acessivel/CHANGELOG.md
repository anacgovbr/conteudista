# Linguagem Acessível · versões

Segue versionamento semântico. Mudar o id ou o código de uma regra, ou o formato do diagnóstico, é mudança incompatível (versão maior). Regra nova entra como versão menor.

## 0.1.0 - 05/11/2026
- Núcleo da biblioteca: `analisar`, `aplicar`, `aplicarSeguras`, `criarSessao` (cache por bloco), `selecionar`, `agrupar` e `regras`.
- Analisador de Markdown com posições (títulos, parágrafos, listas, tabelas, código, comentários, cabeçalho e slides).
- Divisão de frases em português (abreviações, números, reticências, endereços e itens de lista).
- Primeiras regras: `i1` imagem-sem-descricao, `e1` titulo-pula-nivel e `k1` link-vago.
- Marcadores no texto: `ignorar`, `ignorar-documento` e `decorativa`.
- Contrato do diagnóstico em JSON Schema (`esquema/`), o mesmo da futura linha de comando (`lac`) e da API.
