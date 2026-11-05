#compdef lac linguagem-acessivel
# Autocompletar do lac (zsh). Ative com: source <(lac completar zsh)
_lac() {
  local -a cmds; cmds=('conferir:Mostra o que corrigir e as sugestões' 'c:Mostra o que corrigir e as sugestões' 'ajustar:Aplica as correções seguras e devolve o texto' 'a:Aplica as correções seguras e devolve o texto' 'regras:Lista as regras' 'r:Lista as regras' 'explicar:Explica uma regra' 'e:Explica uma regra' 'pedido:Monta o pedido para IA' 'p:Monta o pedido para IA' 'servir:Abre a API neste computador' 's:Abre a API neste computador' 'ajuda:Ajuda de um comando' 'h:Ajuda de um comando' 'completar:Autocompletar para bash ou zsh')
  _arguments -s \
    '(-g --grupo){-g,--grupo}[O que conferir: área, grupo ou regra]:lista:' \
    '(-r --regra){-r,--regra}[Regra: código ou nome]:lista:' \
    '(-n --nivel){-n,--nivel}[Só um nível]:c|s:' \
    '(-f --formato){-f,--formato}[Formato da saída]:formato:' \
    '(-t --tipo){-t,--tipo}[Tipo do texto]:tipo:' \
    '(-l --limite){-l,--limite}[Palavras por frase]:número:' \
    '--agrupar[Agrupamento do json]:modo:' \
    '(-d --diferenca){-d,--diferenca}[Com ajustar, mostra só o que mudou]' \
    '(-o --saida){-o,--saida}[Grava a saída num arquivo]:arquivo:_files' \
    '(-q --quieto){-q,--quieto}[Não escreve nada; só o código de saída]' \
    '--nome[Nome do conteúdo (pedido)]:texto:' \
    '--legenda[Legenda atual da imagem (pedido descrever)]:texto:' \
    '(-h --ajuda){-h,--ajuda}[Ajuda]' \
    '(-v --versao){-v,--versao}[Versão]' \
    '1:comando:->cmd' '*:arquivo:_files'
  [[ $state == cmd ]] && _describe 'comando' cmds
}
compdef _lac lac linguagem-acessivel 2>/dev/null || _lac "$@"
