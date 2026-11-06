#!/usr/bin/env bash
# =====================================================================================
# cdt - envia um pacote do Conteudista para o GitHub e acompanha a aplicação (Termux, Linux, macOS)
#
# Instalar no Termux (uma vez):
#   pkg install gh && termux-setup-storage && gh auth login
#   gh api repos/anacgovbr/conteudista/contents/tools/pacote/cdt.sh -H "Accept: application/vnd.github.raw" > $PREFIX/bin/cdt && chmod +x $PREFIX/bin/cdt
#
# Usar:
#   cdt                      envia o conteudista-pacote-*.zip mais recente de Downloads
#   cdt arquivo.zip          envia esse arquivo
#   cdt -n                   só mostra qual arquivo seria enviado
# Variáveis: CDT_REPO (padrão anacgovbr/conteudista), CDT_PASTA (padrão: pasta Downloads).
# Saída: 0 aplicado e publicação iniciada · 1 falhou (o link da issue aparece) · 2 erro de uso.
# =====================================================================================
set -euo pipefail
REPO="${CDT_REPO:-anacgovbr/conteudista}"
WF="aplicar-pacote.yml"
falha() { echo "cdt: $*" >&2; exit 2; }
command -v gh >/dev/null || falha "instale o GitHub CLI: pkg install gh (Termux) e faça gh auth login"
command -v base64 >/dev/null || falha "base64 não encontrado"

pasta="${CDT_PASTA:-}"
if [ -z "$pasta" ]; then
  for p in "$HOME/storage/downloads" "/sdcard/Download" "$HOME/Downloads" "$HOME/Transferências"; do [ -d "$p" ] && { pasta="$p"; break; }; done
fi
so_mostrar=0; arq=""
for a in "$@"; do case "$a" in -n) so_mostrar=1 ;; -h|--help) sed -n '2,17p' "$0"; exit 0 ;; *) arq="$a" ;; esac; done
if [ -z "$arq" ]; then
  [ -n "$pasta" ] || falha "não achei a pasta Downloads; rode termux-setup-storage ou informe o arquivo"
  arq=$(ls -t "$pasta"/conteudista-pacote-*.zip 2>/dev/null | head -1 || true)
  [ -n "$arq" ] || falha "nenhum conteudista-pacote-*.zip em $pasta"
fi
[ -f "$arq" ] || falha "arquivo não encontrado: $arq"
nome=$(basename "$arq")
case "$nome" in *.zip) ;; *) falha "o pacote precisa ser um .zip" ;; esac
echo "Pacote: $arq ($(du -k "$arq" | cut -f1) KB) -> $REPO"
[ "$so_mostrar" = 1 ] && exit 0

tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
{ printf '{"message":"pacote: %s","content":"' "$nome"; base64 < "$arq" | tr -d '\n'; printf '"}'; } > "$tmp"
sha=$(gh api --method PUT "repos/$REPO/contents/pacotes/$nome" --input "$tmp" --jq .commit.sha) || falha "não foi possível enviar (já existe um pacote com esse nome em pacotes/?)"
echo "Enviado (commit ${sha:0:7}). Aguardando o fluxo Aplicar pacote..."

id=""
for _ in $(seq 1 30); do
  id=$(gh run list -R "$REPO" --workflow "$WF" --commit "$sha" --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)
  [ -n "$id" ] && break; sleep 4
done
[ -n "$id" ] || falha "o fluxo não começou; confira em https://github.com/$REPO/actions"
echo "Execução: https://github.com/$REPO/actions/runs/$id"
if gh run watch -R "$REPO" "$id" --exit-status --interval 15 >/dev/null; then
  echo "✅ Pacote aplicado. A página será publicada em alguns minutos."
  exit 0
fi
echo "❌ O pacote não foi aplicado. O código não mudou."
gh issue list -R "$REPO" --label pacote --state open --limit 1 --json url,title --jq '.[] | "Issue: \(.url)\n\(.title)"' || true
exit 1
