/* Configuração padrão. No Conteudista, os valores vêm de web/config/opcoes.yaml (seção linguagem_acessivel, a partir da etapa 4). */
export default Object.freeze({
  limiteFraseLonga: 25,      // palavras (decisão F); usado pelas regras de frase da etapa 4
  sugestoes: true,           // false: só "para corrigir"
  regras: {},                // { 'link-vago': false } desliga; { 'link-vago': 'sugestao' } muda o nível
});
