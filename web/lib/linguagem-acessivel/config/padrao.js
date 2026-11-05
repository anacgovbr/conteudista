/* Configuração padrão. No Conteudista, os limites podem vir de web/config/opcoes.yaml (a partir da etapa 5). */
export default Object.freeze({
  limiteFraseLonga: 25,        // palavras por frase (decisão F); acima disso, sugestão f1
  limiteFraseNarracao: 25,     // palavras por frase nas notas de narração (n1)
  limiteParagrafo: 100,        // palavras por parágrafo (f2)
  sugestoes: true,             // false: só "para corrigir"
  regras: {},                  // { 'link-vago': false } desliga; { 'link-vago': 'sugestao' } muda o nível
  siglas: {},                  // glossário extra deste conteúdo: { SIGLA: 'Nome completo' }
  siglasConhecidas: [],        // siglas que dispensam explicação neste conteúdo
});
