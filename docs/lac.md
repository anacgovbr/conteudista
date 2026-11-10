# lac · linha de comando da Linguagem Acessível

> Página gerada por `node tools/lac/gerar.mjs` a partir de `tools/lac/comandos.json`. Não edite à mão.

Confere acessibilidade e linguagem simples em textos Markdown. Funciona com pipes, como qualquer ferramenta Unix, e usa os mesmos comandos, opções e formatos da API.

## Instalar

### Linux: um comando

Com Node.js 18+, Bash, curl, tar e sha256sum instalados, execute **sem sudo**:

```bash
bash -o pipefail -c 'curl -fsSL https://raw.githubusercontent.com/anacgovbr/conteudista/main/tools/lac/instalar.sh | bash'
```

O comando executa um script remoto do projeto. Para inspecionar antes, baixe a mesma URL com `curl -fsSL -o instalar-lac.sh URL`, leia o arquivo e execute `bash instalar-lac.sh`.
O instalador baixa a release 1.0.0 e confere o SHA-256 antes de instalar em `~/.local/share/lac/lac-1.0.0`; cria `lac` e `linguagem-acessivel` em `~/.local/bin`. Repetir o comando reutiliza a instalação e não sobrescreve comandos de terceiros. O checksum detecta corrupção do pacote, mas não substitui uma assinatura independente de autenticidade.

Se a pasta não estiver no PATH, o instalador orienta a executar `export PATH="$HOME/.local/bin:$PATH"` e a guardar essa linha na configuração do shell. Não instala Node.js, não muda arquivos do shell e não abre a API. Depois: `lac -v`, `lac c apostila.md` ou `lac servir`.
Para escolher outra release publicada: prefixe o comando com `export LAC_VERSION=X.Y.Z;`. Para remover esta instalação, apague apenas os dois links criados em `~/.local/bin` e a pasta `~/.local/share/lac/lac-1.0.0`, depois de conferir que pertencem ao lac.

### Pacote e outros sistemas

- **Pacote da release:** baixe `lac-1.0.0.tar.gz` em *Releases* (tag `lac-v1.0.0`), confira com `SHA256SUMS` e extraia. Precisa só do Node.js 18 ou mais novo; não há dependências para instalar. Depois: `node lac-1.0.0/tools/lac/lac.mjs c apostila.md`.
- **Windows:** `tools\lac\lac.cmd c apostila.md` (ou acrescente `tools\lac` ao PATH e use `lac`).
- **Linux e macOS:** `node tools/lac/lac.mjs c apostila.md`, ou `npm link` dentro de `tools/lac` para ter `lac` e `linguagem-acessivel` no PATH.
- **Manual:** `man ./tools/lac/lac.1`. **Autocompletar:** `source <(lac completar bash)` ou `zsh`.
- **Versões:** `lac -v` (ou `--version`) mostra a do `lac` e da API (1.0.0), da biblioteca (0.3.0) e dos pedidos para IA. A API v1 só muda de forma compatível; mudanças incompatíveis exigem `/v2`. Histórico em `tools/lac/CHANGELOG.md`.

## Ajuda

```text
lac · Linguagem Acessível 1.0.0
Confere acessibilidade e linguagem simples em textos Markdown.

Uso:  lac <comando> [opções] [arquivo...]
      Sem arquivo, lê da entrada (pipe). Use - para a entrada.

Comandos
  c  conferir   Mostra o que corrigir e as sugestões
  a  ajustar    Aplica as correções seguras e devolve o texto
  r  regras     Lista as regras
  e  explicar   Explica uma regra                               lac e f1
  p  pedido     Monta o pedido para IA                          lac p simplificar
  s  servir     Abre a API neste computador
  h  ajuda      Ajuda de um comando                             lac h c
     completar  Autocompletar para bash ou zsh

O que conferir
  -g  grupo   a acessibilidade  l linguagem
              i imagens  e estrutura  k links
              f frases   s siglas     n narração
  -r  regra   código ou nome          f1  frase-longa
  -n  nível   c corrigir  s sugestão

Opções
  -f  --formato <formato>   Formato da saída (texto json jsonl sarif resumo relatorio)
  -t  --tipo <tipo>         Tipo do texto (auto apostila apresentacao)
  -l  --limite <número>     Palavras por frase (10 a 60; padrão 25)
      --config <arquivo YAML> Lê opções e níveis de regra de um arquivo YAML (web/config/opcoes.yaml ou outro arquivo compatível)
  -p  --porta <número>      Porta HTTP do servidor lac (1 a 65535; padrão 8787)
      --agrupar <modo>      Agrupamento do json (grupo regra nenhum)
  -d  --diferenca           Com ajustar, mostra só o que mudou
  -o  --saida <arquivo>     Grava a saída num arquivo
  -q  --quieto              Não escreve nada; só o código de saída
      --nome <texto>        Nome do conteúdo (pedido)
      --legenda <texto>     Legenda atual da imagem (pedido descrever)
  -h  --ajuda               Ajuda
  -v  --versao              Versão

Saída: 0 nada a corrigir · 1 há itens para corrigir · 2 erro de uso · 3 erro interno

Exemplos
  cat apostila.md | lac c
  lac c -g f -f jsonl apostila.md
  lac a < rascunho.md > revisado.md

Mais: lac h <comando> · regras: lac r · uma regra: lac e <código>
```

## Comandos

### conferir (`c`)

```text
lac conferir (c) · Mostra o que corrigir e as sugestões

Confere um ou mais arquivos Markdown (ou a entrada) e lista o que corrigir e as sugestões, com linha e coluna. Sai com 1 se houver algo para corrigir; -f relatorio gera um relatório HTML.

Uso:  lac c [opções] [arquivo...]

Opções
  -g  --grupo <lista>       O que conferir: área, grupo ou regra (a acessibilidade · l linguagem · i imagens · e estrutura · k links · f frases · s siglas · n narração)
  -r  --regra <lista>       Regra: código ou nome (f1, frase-longa…)
  -n  --nivel <c|s>         Só um nível (c corrigir · s sugestão)
  -f  --formato <formato>   Formato da saída (texto json jsonl sarif resumo relatorio)
  -t  --tipo <tipo>         Tipo do texto (auto apostila apresentacao)
  -l  --limite <número>     Palavras por frase (10 a 60; padrão 25)
      --config <arquivo YAML> Lê opções e níveis de regra de um arquivo YAML (web/config/opcoes.yaml ou outro arquivo compatível)
      --nome <texto>        Nome do conteúdo (pedido)
      --agrupar <modo>      Agrupamento do json (grupo regra nenhum)
  -o  --saida <arquivo>     Grava a saída num arquivo
  -q  --quieto              Não escreve nada; só o código de saída

Exemplos
  cat apostila.md | lac c                       tudo, para ler
  lac c -g f -f jsonl apostila.md               só frases, um item por linha
  lac c -n c -q *.md                            nada para corrigir? (código de saída)
  lac c -f sarif *.md -o achados.sarif          para o GitHub

Na API: POST /v1/conferir[/{selecao}]
```

### ajustar (`a`)

```text
lac ajustar (a) · Aplica as correções seguras e devolve o texto

Aplica só as correções que não mudam o sentido (por exemplo, o nível de um título) e devolve o texto corrigido. Descrever imagens e simplificar frases sempre precisam de uma pessoa.

Uso:  lac a [opções] [arquivo]

Opções
  -g  --grupo <lista>       O que conferir: área, grupo ou regra (a acessibilidade · l linguagem · i imagens · e estrutura · k links · f frases · s siglas · n narração)
  -r  --regra <lista>       Regra: código ou nome (f1, frase-longa…)
  -t  --tipo <tipo>         Tipo do texto (auto apostila apresentacao)
      --config <arquivo YAML> Lê opções e níveis de regra de um arquivo YAML (web/config/opcoes.yaml ou outro arquivo compatível)
  -d  --diferenca           Com ajustar, mostra só o que mudou
  -o  --saida <arquivo>     Grava a saída num arquivo
  -q  --quieto              Não escreve nada; só o código de saída

Exemplos
  lac a < rascunho.md > revisado.md             aplica e grava em outro arquivo
  lac a -d apostila.md                          mostra só o que mudaria

Na API: POST /v1/ajustar
```

### regras (`r`)

```text
lac regras (r) · Lista as regras

Lista as regras com código, nome, grupo e nível.

Uso:  lac r [opções]

Opções
  -g  --grupo <lista>       O que conferir: área, grupo ou regra (a acessibilidade · l linguagem · i imagens · e estrutura · k links · f frases · s siglas · n narração)
  -f  --formato <formato>   Formato da saída (texto json)

Exemplos
  lac r                                         todas
  lac r -g l                                    só linguagem simples

Na API: GET /v1/regras
```

### explicar (`e`)

```text
lac explicar (e) · Explica uma regra

Mostra o que a regra confere, por que importa, as correções e exemplos.

Uso:  lac e [opções] <código ou nome>

Opções
  -f  --formato <formato>   Formato da saída (texto json)

Exemplos
  lac e f1                                      frase longa
  lac e link-vago                               pelo nome

Na API: GET /v1/regras/{codigo}
```

### pedido (`p`)

```text
lac pedido (p) · Monta o pedido para IA

Monta o pedido padronizado (linguagem simples e boas práticas de acessibilidade) para colar na IA autorizada. simplificar: o trecho vem da entrada. descrever: a entrada, se houver, é o texto perto da imagem.

Uso:  lac p [opções] <descrever|simplificar>

Opções
      --nome <texto>        Nome do conteúdo (pedido)
      --legenda <texto>     Legenda atual da imagem (pedido descrever)
  -o  --saida <arquivo>     Grava a saída num arquivo

Exemplos
  lac p simplificar --nome "Curso X" < trecho.txt pedido para simplificar
  lac p descrever --legenda "Fluxo" < contexto.txt pedido para descrever imagem

Na API: POST /v1/pedidos/{tipo}
```

### servir (`s`)

```text
lac servir (s) · Abre a API neste computador

Inicia a API HTTP local. Use LAC_CORS_ORIGINS para configurar origens CORS; por padrão, só aceita chamadas locais.

Uso:  lac s [opções] [-p porta]

Opções
  -p  --porta <número>      Porta HTTP do servidor lac (1 a 65535; padrão 8787)

Exemplos
  lac s -p 8080                                 inicia a API local na porta 8080
```

### ajuda (`h`)

```text
lac ajuda (h) · Ajuda de um comando

Mostra a ajuda geral ou a de um comando.

Uso:  lac h [comando]

Exemplos
  lac h c                                       ajuda do conferir

Na API: GET /v1/ajuda[/{comando}]
```

### completar

```text
lac completar · Autocompletar para bash ou zsh

Mostra o script de autocompletar. No bash: source <(lac completar bash).

Uso:  lac completar <bash|zsh>

Exemplos
  source <(lac completar bash)                  ativa no bash
```

## Formatos de saída

| Formato | Uso | Na API |
|---|---|---|
| `texto` (padrão) | Leitura por pessoas. Escreve "corrigir" e "sugestão" por extenso; cores só no terminal e sem `NO_COLOR` | `text/plain` |
| `jsonl` | Pipes: um item por linha, com `arquivo` e `grupo` | `application/x-ndjson` |
| `json` | Resposta completa, agrupada por grupo (`--agrupar regra` ou `nenhum`) | `application/json` |
| `sarif` | Achados no GitHub (SARIF 2.1.0; colunas em pontos de código) | `application/sarif+json` |
| `relatorio` | Relatório HTML acessível, com metadados, itens, linhas e marcadores | `text/html` |
| `resumo` | Só as contagens | `text/plain` |

## API local

`lac servir -p 8787` abre a API em `127.0.0.1`. Use `LAC_HOST` apenas quando precisar escolher explicitamente outro endereço de escuta. As origens CORS são negadas por padrão; configure `LAC_CORS_ORIGINS` com uma lista separada por vírgulas. A API não guarda nem registra o conteúdo enviado, limita o corpo a 1 MiB e responde com erros RFC 9457.
A especificação OpenAPI 3.1 fica em `tools/lac/openapi.json` e é gerada por `node tools/lac/gerar.mjs`.

## Códigos de saída

| Código | Significado |
|---|---|
| 0 | nada a corrigir |
| 1 | há itens para corrigir |
| 2 | erro de uso |
| 3 | erro interno |

Encontrar problemas no texto não é erro do programa: na API, a resposta é 200.
