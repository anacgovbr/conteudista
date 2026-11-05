/* Textos para quem escreve. Ficam separados do código para que a equipe de linguagem simples possa revisá-los.
   Regras de escrita destes textos: frases curtas, verbo no imperativo, sem jargão técnico; a referência
   técnica (WCAG, eMAG) fica só em "porque". Use {nome} para inserir dados. */
export default {
  niveis: { corrigir: 'Para corrigir', sugestao: 'Sugestão' },
  grupos: { imagens: 'Imagens', estrutura: 'Estrutura', links: 'Links', frases: 'Frases', siglas: 'Siglas', narracao: 'Narração' },
  areas: { acessibilidade: 'Acessibilidade', linguagem: 'Linguagem simples' },
  regras: {
    'imagem-sem-descricao': {
      titulo: 'Imagem sem descrição',
      mensagem: 'Descreva esta imagem para quem não pode vê-la',
      porque: 'Quem usa leitor de tela ouve a descrição no lugar da imagem. Sem ela, a pessoa perde a informação. (WCAG 1.1.1, eMAG 3.6)',
      correcoes: { descrever: 'Descrever', decorativa: 'É decorativa' },
    },
    'titulo-pula-nivel': {
      titulo: 'Título que pula nível',
      mensagem: 'Este título pulou um nível',
      variantes: {
        pulou: 'Este título pulou um nível. Depois de um título de nível {anterior}, use no máximo o nível {esperado}.',
        primeiro: 'O primeiro título deve ser de nível 1 ou 2. Este é de nível {nivel}.',
      },
      porque: 'Os níveis dos títulos formam o sumário e a navegação por leitor de tela. Pular um nível dá a impressão de que falta uma parte. (WCAG 1.3.1, eMAG 1.3)',
      correcoes: { ajustar: 'Ajustar nível' },
    },
    'link-vago': {
      titulo: 'Link que não diz aonde leva',
      mensagem: 'Diga aonde o link leva',
      variantes: {
        vago: 'Troque "{texto}" por um texto que diga aonde o link leva',
        vazio: 'Este link não tem texto. Escreva aonde ele leva',
        endereco: 'Troque o endereço por um texto que diga aonde o link leva',
      },
      porque: 'Quem usa leitor de tela costuma ouvir a lista de links fora do texto. "Clique aqui" ou um endereço longo não dizem o destino. (WCAG 2.4.4, eMAG 3.5)',
      correcoes: { editar: 'Editar o texto do link' },
    },
  },
};
