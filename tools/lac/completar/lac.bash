# Autocompletar do lac (bash). Ative com: source <(lac completar bash)
_lac() {
  local cur prev; cur="${COMP_WORDS[COMP_CWORD]}"; prev="${COMP_WORDS[COMP_CWORD-1]}"
  case "$prev" in
    -g|--grupo) COMPREPLY=($(compgen -W "a l i e k f s n c m acessibilidade linguagem imagens estrutura links frases siglas narracao sentido midia" -- "$cur")); return;;
    -n|--nivel) COMPREPLY=($(compgen -W "c s" -- "$cur")); return;;
    -f|--formato) COMPREPLY=($(compgen -W "texto json jsonl sarif resumo relatorio" -- "$cur")); return;;
    -t|--tipo) COMPREPLY=($(compgen -W "auto apostila apresentacao" -- "$cur")); return;;
    --agrupar) COMPREPLY=($(compgen -W "grupo regra nenhum" -- "$cur")); return;;
    p|pedido) COMPREPLY=($(compgen -W "descrever simplificar" -- "$cur")); return;;
    completar) COMPREPLY=($(compgen -W "bash zsh" -- "$cur")); return;;
  esac
  if [ "$COMP_CWORD" -eq 1 ]; then COMPREPLY=($(compgen -W "conferir c ajustar a regras r explicar e pedido p servir s ajuda h completar" -- "$cur")); return; fi
  if [[ "$cur" == -* ]]; then COMPREPLY=($(compgen -W "--grupo -g --regra -r --nivel -n --formato -f --tipo -t --limite -l --config --porta -p --agrupar --diferenca -d --saida -o --quieto -q --nome --legenda --ajuda -h --versao -v" -- "$cur")); return; fi
  COMPREPLY=($(compgen -f -- "$cur"))
}
complete -F _lac lac linguagem-acessivel
