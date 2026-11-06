# SPEC adaptada: seleção dos testes existentes

## Escopo desta entrega

Selecionar os testes existentes do Conteudista, sem criar casos funcionais novos,
sem reescrever a aplicação e sem refatorar novamente o gerador. Os 21 grupos de
navegador e as cinco verificações manuais permanecem disponíveis. Testes novos
tratam somente a infraestrutura de classificação e execução.

Removidos da proposta original: refatoração do gerador monolítico (já concluída),
decoradores por caso, smoke tests novos de Locução, testes reais de modelos,
pacote de atualização contendo workflows, abertura automática de issues e promessa
de economia antes de medir. Workflows devem ser enviados por revisão/commit normal;
o mecanismo de pacotes continua recusando alterações em `.github/workflows`.

## Inventário atual

| Área | Verificações existentes | Dependências |
|---|---|---|
| Versão e documentação | grupo 5, checagem isolada extraída das mesmas regras | Python e Node |
| Editor e opções | grupos 8 e 9 | Playwright e Chrome |
| Apresentação e narração | grupos 1–4, 7 e 10 | gerador, Chrome e áudios sintéticos |
| Biblioteca e acessibilidade | scripts da biblioteca/CLI e grupos 11–18 | Node; Chrome na integração |
| Formatos | grupo 6 e funções de `testar_acessibilidade.py` | python-docx, python-pptx, lxml e Pillow |
| Compatibilidade das saídas | grupos 20 e 21 | gerador e Chrome |
| Pacotes | `tools/pacote/testar_pacote.py` | Python e Git |
| Locução | sintaxe e fonemas pt-BR presentes no gate geral | Node; voz real continua manual |

Os aliases `editor`, `atalhos` e `versoes` selecionam o grupo 9 já existente,
com foco em editor/importação. Isso não significa que foi criada cobertura dedicada
de todos os fluxos de histórico e versões. `locucao` é um grupo estático; não é um
alias de navegador e não comprova a qualidade das vozes.

## Política e fonte única

`tools/testes/grupos.yaml` contém caminhos, aliases, IDs numéricos e requisitos.
Sua sintaxe é JSON válido, subconjunto de YAML, lido pela biblioteca padrão Python.
Não duplicar essas associações nos workflows. A ordem das regras importa: exceções
de versão, biblioteca e exemplo precedem documentação genérica.

- Documentação isolada: mínimos e verificações documentais já existentes; sem Chrome.
- Versão: coerência e cache-busters, sem navegador fora da publicação.
- Módulo de formato: parser comum e validadores do formato selecionado, usando o curso existente.
- Parser, inicialização, dependências, infraestrutura ou três domínios funcionais: suíte completa.
- Caminho desconhecido, base ausente, binário inesperado ou configuração inválida: fallback completo.
- Renomeações: considerar caminho antigo e novo. Exclusões: considerar o caminho excluído.
- PR: comparar com merge-base; push: comparar `before` e SHA atual.
- Publicação: todos os gates no mesmo SHA, com checkout imutável e conferência de `main` antes do deploy.

Os padrões `*` não atravessam diretórios; `**` atravessa. Alterar somente `?v=`
no HTML seleciona versão. Mudanças de conteúdo do exemplo que incluam imagens,
Mermaid, notas ou outras marcações selecionam os formatos relacionados; na ausência
de diff confiável, a seleção é ampla.

## Execução e publicação

O workflow **Testes seletivos** atende PRs, pushes, execução manual e agendamento.
Instala dependências do gerador e Chrome somente nos jobs que precisam deles.
Grupos com o mesmo ID de navegador são unidos em uma execução, não repetidos por alias.
O resumo registra motivos, grupos e durações; falhas de jobs não viram aprovação.

Em pushes publicáveis de `main`, o classificador delega a bateria completa ao workflow
**Publicar página**. Este mantém verificação/montagem e navegador em paralelo,
exige sucesso de ambos e não aceita os antigos booleanos como dispensa de testes.
O workflow seletivo executa os mínimos e não repete a bateria completa desse SHA.
Mudanças somente em testes/documentação que não alteram o site não publicam a página.

Pacotes mantêm testes completos antes de gravar e novamente no SHA final da publicação.
O SHA que iniciou o workflow de aplicação contém o ZIP; não é o mesmo SHA produzido
depois da aplicação. Reutilizar essa aprovação exigiria proveniência independente,
isolamento de credenciais e prova da árvore testada: isso fica fora deste escopo.

Agendamento: segunda, quarta e sexta às 03:15 UTC, com suíte completa e retenção de
artefatos por 14 dias. Nenhum resultado em cache é usado como aprovação. Os caches
de pip incluem os arquivos de requisitos, inclusive os requisitos estáticos.

## Comandos locais

```powershell
# Instalar dependências para a validação completa:
pip install -r tools/requirements.txt -r tools/testes/requirements.txt

# Ver a seleção de commits sem executar:
python tools/testes/classificar_mudancas.py --base HEAD~1 --head HEAD

# Selecionar testes para esses commits:
python tools/testes/executar_seletivos.py --base HEAD~1 --head HEAD

# Selecionar explicitamente durante edição ainda não commitada:
python tools/testes/executar_seletivos.py --grupos minimos,versao,editor
python tools/testes/executar_seletivos.py --grupo gerador_docx

# Compatibilidade do roteiro de navegador:
python tools/testes/testar_apresentacao.py --grupos 1,2
python tools/testes/testar_apresentacao.py --grupo editor
python tools/testes/testar_apresentacao.py --listar-grupos

# Tudo, mantendo relatórios JSON/Markdown e verificações manuais:
python tools/testes/executar_seletivos.py --completo
```

`tools/verificar.sh` sem argumentos mantém a bateria completa sem navegador.
Com argumentos, encaminha a seleção ao executor. Não passar `--completo` ao próprio
script Bash: use o executor Python para solicitar também o navegador.

## Adicionar caminhos ou grupos

1. Identificar quais testes existentes cobrem a funcionalidade.
2. Registrar o grupo e seus requisitos em `grupos.yaml`, sem inventar IDs.
3. Acrescentar regra antes das regras genéricas e fixture em `fixtures/mudancas/casos.json`.
4. Rodar `testar_classificador.py`, `testar_seletivos.py` e os grupos correspondentes.
5. Para caminhos críticos ou dependência incerta, marcar `completo: true`.

O executor rejeita grupo desconhecido. Classificação inválida emite fallback e retorna
código diferente de zero; o workflow encaminha à suíte completa, não à publicação sem testes.
PyYAML é usado somente para validar workflows; o classificador não depende dele.
Se `actionlint` estiver instalado, o validador também o executa.

## Medição e limites

Cada execução gera `seletivos.json` e `seletivos.md`; os relatórios anteriores de
navegador são preservados. A seleção e os motivos aparecem no Step Summary.
Não há percentagem fixa de economia nem aprovação inferida de tempos históricos.

O histórico local anterior da suíte inteira registrou 193 casos em cerca de 196 s.
A seleção de editor registrou 14 casos em cerca de 10 s, sem preparar o gerador.
São escopos diferentes: isso demonstra menor trabalho executado, não ganho de velocidade
da mesma suíte. Tempos reais do Actions e as primeiras 20 execuções só poderão ser
comparados depois de enviar esta alteração; não foram simulados como resultados reais.