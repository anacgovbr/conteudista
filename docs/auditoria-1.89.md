# Auditoria da entrega 1.89

## Resumo

Etapas 9–14 implementadas sobre a base 1.84. Validação local concluída antes do envio ao GitHub.

- **Chrome:** 156.0.8078.80; grupos 1–21; 193 verificações OK, 0 falhas, 0 instáveis. Duração medida: **153 s (2 min 33 s)**.
- **Verificação sem navegador:** `bash tools/verificar.sh` passou, incluindo os geradores gov.br/Clássico/narração, acessibilidade DOCX/EPUB/PPTX/HTML, biblioteca, CLI, API, opções, pacotes e sintaxe.
- **Biblioteca:** 131/131 testes.
- **CLI `lac`:** 39/39 testes.
- **API v1:** 17/17 verificações de integração.
- **Opções:** 27/27 testes; registro e YAML passaram.
- **Python local:** 3.14.4 (o runner GitHub usa 3.12). **Chrome local:** 156.0.8078.80.
- **Pacote:** `conteudista-pacote-1.89.zip`, 36 arquivos alterados + 12 novos, conferido contra `main` 1.84.
- **Workflows:** commit separado `5ff553d`; sem agenda semanal, publicação apenas por mudanças de código, e sem repetir os gates após o pacote já passar.

O tempo acima é o medido pelo roteiro completo do Chrome. O tempo total de implementação não foi cronometrado pelo ambiente.

## O que foi validado

- Confirmação ao gerar, ações Conferir/Gerar/Cancelar, retorno de foco, sessão e atalho Alt+Shift+G.
- HTML, JSON, Markdown, schema do relatório, metadados, linhas e marcadores; HTML passou no axe-core WCAG 2.2 A/AA.
- Opções avançadas, rebaixamento de regras, importação/exportação JSON e glossário do conteúdo.
- API HTTP local, paridade com a biblioteca, OpenAPI 3.1, ETag, RFC 9457, corpo máximo, taxa de requisições e CORS.
- Viewports 320, 390, 768, 1024, 1366 e 1920 px, forced-colors, movimento reduzido e orçamento de 200 KiB/400 ms.
- Painel gerado, legendas padrão, VLibras sob demanda, skip link e semântica decorativa consistente em HTML, EPUB, DOCX e PPTX.

## Correções aplicadas durante a validação

- Foco do botão Gerar preservado ao cancelar; guard mantém o botão habilitado durante a confirmação.
- Exportação de relatório validada localmente contra os schemas compartilhados; erros do relatório opcional não bloqueiam a geração.
- Níveis por código de regra normalizados pela biblioteca; sugestões não podem ser promovidas.
- Glossário do conteúdo recebe prioridade sem mudar posições do diagnóstico.
- Imagens decorativas classificadas por ocorrência, evitando que uma repetição da mesma URL herde a marca indevidamente.
- Cache-busters, exemplos, schema, OpenAPI, ajuda e roteiro atualizados para 1.89.
- Git Bash no Windows: o verificador converte caminho temporário para `file://` antes do `import()` do Node.

## Axe e testes manuais

O roteiro não introduz violações axe novas. Permanecem duas ocorrências anteriores de `nested-interactive` em summaries com controles aninhados: a lista de imagens do editor e o summary do Histórico de arquivos. A verificação de 1.89 registra esses alvos como baseline explícito. HTML do relatório e apresentação gerada passam sem violações.

Continuam manuais: Safari/iPhone, Android real, reprodução do PPTX no PowerPoint, impressão/PDF e qualidade/pausa da voz real Kokoro/Piper. Esses itens aparecem como M.1–M.5 no relatório de navegador.
