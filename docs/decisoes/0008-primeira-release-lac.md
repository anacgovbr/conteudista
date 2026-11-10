# 0008 · Primeira release do `lac` e da API v1

- **Estado:** aceita
- **Data:** 10/11/2026
- **Escopo:** versionamento, empacotamento e publicação da linha de comando `lac` e da API local `/v1`.

## Decisão

O `lac` e a API local têm **uma versão própria, 1.0.0**, separada da versão do aplicativo (`CHANGELOG.md`, 1.9x) e da biblioteca Linguagem Acessível (0.3.0). A fonte única é `programa.versao` em `tools/lac/comandos.json`; `package.json`, o OpenAPI e o CHANGELOG da release precisam coincidir, e o teste confere.

A API segue versionamento semântico: o caminho `/v1` só recebe mudanças compatíveis (novas rotas, campos e opções). Mudança incompatível exige nova versão principal e `/v2`. `GET /v1/saude` informa `api`, `versao`, `biblioteca` e `pedidos`; `lac -v` mostra as mesmas versões.

A release é publicada no GitHub quando se cria a tag `lac-vX.Y.Z` em um commit do `main` cuja versão coincida com a de `comandos.json`. O fluxo `.github/workflows/lac-release.yml` roda os testes da biblioteca, do `lac`, da API e do pacote; só então cria a release com `lac-X.Y.Z.tar.gz` e `SHA256SUMS`, e as notas vêm de `tools/lac/CHANGELOG.md`.

O pacote (`node tools/lac/empacotar.mjs`) repete o desenho do repositório, porque o `lac` importa a biblioteca e `web/opcoes.js` por caminho relativo. Leva só o necessário para executar, sem testes nem ferramentas de geração. Exige Node.js 18 ou mais novo e nenhuma dependência.

## Consequências

- O teste do pacote (`tools/lac/testar_pacote.mjs`) extrai o arquivo fora do repositório e usa o `lac` e a API só com o que veio dentro dele, o que garante que nenhum arquivo necessário ficou de fora.
- `package.json` continua `private`: não há publicação no npm até a TI decidir o registro e a identidade de publicação. O mesmo vale para hospedagem compartilhada e autenticação institucional, que seguem fora desta release (decisão 0007).
- Não há assinatura nem atestado de procedência dos arquivos; a verificação é pelo `SHA256SUMS` da própria release.
- A página do aplicativo não muda com esta release: o `lac` não é carregado no navegador.
