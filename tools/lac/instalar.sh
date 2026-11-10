#!/usr/bin/env bash
# Chamado no final para nao executar uma transferencia incompleta recebida por pipe.
instalar_lac() (
  set -euo pipefail
  erro() { printf 'lac: %s\n' "$*" >&2; exit 1; }
  trap 'printf "lac: instalacao interrompida (linha %s).\n" "$LINENO" >&2' ERR
  [[ "$(uname -s)" == Linux ]] || erro "Este instalador atende Linux. Veja docs/lac.md para outros sistemas."
  [[ -n "${HOME:-}" && "$HOME" == /* ]] || erro "HOME precisa ser um caminho absoluto."
  for comando in curl node tar sha256sum mktemp readlink awk; do
    command -v "$comando" >/dev/null || erro "Falta $comando. Instale pelo gerenciador de pacotes da sua distribuicao e tente novamente."
  done
  node -e 'if (Number(process.versions.node.split(".")[0]) < 18) process.exit(1)' ||
    erro "Precisa do Node.js 18 ou mais novo. Atualize o Node.js e tente novamente."

  local versao="${LAC_VERSION:-1.0.0}"
  [[ "$versao" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || erro "LAC_VERSION deve ter o formato X.Y.Z."
  local raiz="$HOME/.local/share/lac" bin="$HOME/.local/bin"
  local destino="$raiz/lac-$versao" temporario base arquivo hash atual nome
  for nome in lac linguagem-acessivel; do
    if [[ -e "$bin/$nome" || -L "$bin/$nome" ]]; then
      [[ -L "$bin/$nome" ]] || erro "$bin/$nome ja existe e nao pertence ao instalador."
      atual="$(readlink "$bin/$nome")"
      [[ "$atual" == "$raiz"/lac-*/tools/lac/lac.mjs && -f "${atual%/tools/lac/lac.mjs}/.instalado-pelo-lac" ]] ||
        erro "$bin/$nome aponta para outra instalacao. Nenhum comando foi substituido."
    fi
  done
  if [[ -e "$destino" || -L "$destino" ]]; then
    [[ ! -L "$destino" && -f "$destino/.instalado-pelo-lac" ]] ||
      erro "$destino ja existe e nao pertence ao instalador."
    [[ "$(node "$destino/tools/lac/lac.mjs" -v)" == "lac $versao "* ]] ||
      erro "A instalacao existente esta incompleta. Nenhum arquivo foi substituido."
  else
    temporario="$(mktemp -d)"
    trap 'rm -rf -- "$temporario"' EXIT
    base="https://github.com/anacgovbr/conteudista/releases/download/lac-v$versao"
    arquivo="lac-$versao.tar.gz"
    printf 'Baixando lac %s e conferindo SHA-256...\n' "$versao"
    curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --retry 2 \
      "$base/$arquivo" -o "$temporario/$arquivo"
    curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --retry 2 \
      "$base/SHA256SUMS" -o "$temporario/SHA256SUMS"
    hash="$(awk -v arquivo="$arquivo" '$2 == arquivo {print $1}' "$temporario/SHA256SUMS")"
    [[ "$hash" =~ ^[0-9a-fA-F]{64}$ ]] || erro "SHA256SUMS nao contem uma assinatura SHA-256 unica para $arquivo."
    printf '%s  %s\n' "$hash" "$arquivo" > "$temporario/conferir.sha256"
    (cd "$temporario" && sha256sum --check conferir.sha256) ||
      erro "O SHA-256 nao confere. Nenhum arquivo foi instalado."
    tar -xzf "$temporario/$arquivo" -C "$temporario" --no-same-owner
    [[ "$(node "$temporario/lac-$versao/tools/lac/lac.mjs" -v)" == "lac $versao "* ]] ||
      erro "O pacote nao corresponde a versao solicitada."
    chmod +x "$temporario/lac-$versao/tools/lac/lac.mjs"
    printf '%s\n' "$versao" > "$temporario/lac-$versao/.instalado-pelo-lac"
    mkdir -p "$raiz"
    # Nao substituir uma pasta criada por outra instalacao enquanto o download ocorria.
    [[ ! -e "$destino" && ! -L "$destino" ]] || erro "$destino foi criado durante a instalacao. Tente novamente."
    mv -T "$temporario/lac-$versao" "$destino"
  fi
  mkdir -p "$bin"
  for nome in lac linguagem-acessivel; do
    ln -sfn "$destino/tools/lac/lac.mjs" "$bin/$nome"
  done
  "$bin/lac" -v
  printf 'Instalado sem sudo. A API so inicia ao executar: lac servir\n'
  case ":$PATH:" in
    *":$bin:"*) printf 'Para conferir um texto: lac c apostila.md\n' ;;
    *) printf 'Para usar neste terminal, execute:\n  export PATH="$HOME/.local/bin:$PATH"\nPara outros terminais, adicione essa linha ao arquivo de configuracao do seu shell.\n' ;;
  esac
)

instalar_lac "$@"
