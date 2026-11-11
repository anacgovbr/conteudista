/* Textos para quem escreve. Ficam separados do código para que a equipe de linguagem simples possa revisá-los.
   Regras de escrita destes textos: frases curtas, verbo no imperativo, sem jargão técnico; a referência
   técnica (WCAG, eMAG, lei) fica só em "porque". Use {nome} para inserir dados. */
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
    'descricao-vaga': {
      titulo: 'Descrição que não descreve',
      mensagem: 'Esta descrição não diz o que a imagem mostra',
      variantes: {
        generica: 'A descrição "{texto}" não diz o que a imagem mostra. Escreva o que ela mostra e por que está aqui',
        arquivo: 'A descrição é o nome do arquivo. Escreva o que a imagem mostra',
        curta: 'A descrição "{texto}" é curta demais. Escreva o que a imagem mostra',
      },
      porque: 'Palavras como "imagem" ou o nome do arquivo não ajudam quem não vê a imagem. (WCAG 1.1.1, eMAG 3.6)',
      correcoes: { descrever: 'Descrever' },
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
    'slide-sem-titulo': {
      titulo: 'Slide sem título',
      mensagem: 'Dê um título a este slide',
      variantes: { numero: 'Dê um título ao slide {slide}' },
      porque: 'O título identifica o slide no sumário, no seletor de slides e para quem usa leitor de tela. (WCAG 2.4.6, eMAG 1.3)',
      correcoes: { escrever: 'Escrever título' },
    },
    'tabela-sem-cabecalho': {
      titulo: 'Tabela sem cabeçalho',
      mensagem: 'Diga o que cada coluna mostra',
      variantes: {
        vazio: 'A primeira linha da tabela está vazia. Diga o que cada coluna mostra',
        parcial: 'Dê nome a todas as colunas desta tabela',
      },
      porque: 'O leitor de tela lê o nome da coluna junto com cada valor. Sem cabeçalho, os números e textos perdem o sentido. (WCAG 1.3.1, eMAG 3.10)',
      correcoes: { 'primeira-linha': 'Usar a primeira linha', editar: 'Dar nome às colunas' },
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
    'frase-longa': {
      titulo: 'Frase longa',
      mensagem: 'Frase longa. Tente dividir',
      variantes: { palavras: 'Frase longa ({palavras} palavras). Tente dividir em duas ou mais' },
      porque: 'Frases curtas, com uma ideia cada, são mais fáceis de ler e de entender. (Lei 15.263/2025, art. 5º; WCAG 3.1.5)',
      correcoes: { simplificar: 'Simplificar' },
    },
    'paragrafo-longo': {
      titulo: 'Parágrafo longo',
      mensagem: 'Parágrafo longo. Tente dividir',
      variantes: { palavras: 'Parágrafo longo ({palavras} palavras). Tente dividir em dois ou mais' },
      porque: 'Parágrafos curtos ajudam a pessoa a encontrar a informação e a não se perder na leitura. (Lei 15.263/2025)',
      correcoes: { simplificar: 'Simplificar' },
    },
    'texto-em-maiusculas': {
      titulo: 'Texto em maiúsculas',
      mensagem: 'Texto todo em maiúsculas é mais difícil de ler',
      porque: 'Palavras em maiúsculas perdem o formato que ajuda a reconhecê-las, e alguns leitores de tela soletram as letras. Para destacar, use negrito. (WCAG 1.4.8)',
      correcoes: { converter: 'Converter' },
    },
    'sigla-sem-explicacao': {
      titulo: 'Sigla sem explicação',
      mensagem: 'Explique a sigla na primeira vez',
      variantes: {
        nunca: 'Explique a sigla {sigla} na primeira vez em que ela aparece',
        depois: 'A sigla {sigla} só é explicada mais adiante (linha {linha}). Explique na primeira vez',
      },
      porque: 'Na primeira vez, escreva o nome completo e a sigla entre parênteses. Assim, quem não conhece a sigla entende o texto. (Lei 15.263/2025, art. 5º; WCAG 3.1.4)',
      correcoes: { explicar: 'Explicar' },
    },
    'narracao-frase-longa': {
      titulo: 'Frase longa na narração',
      mensagem: 'Frase longa na narração',
      variantes: { palavras: 'Frase longa na narração ({palavras} palavras). A legenda fica difícil de ler' },
      porque: 'Na narração, a pessoa ouve uma vez só e lê a legenda enquanto o áudio toca. Frases curtas são mais fáceis de acompanhar. (WCAG 1.2.2; Lei 15.263/2025)',
      correcoes: { simplificar: 'Simplificar' },
    },
    'descricao-longa': {
      titulo: 'Descrição longa',
      mensagem: 'Descrição longa. Deixe até 150 caracteres',
      variantes: { caracteres: 'A descrição tem {caracteres} caracteres. Deixe até 150 e passe o resto para a descrição detalhada' },
      porque: 'O leitor de tela lê a descrição inteira de uma vez. Uma descrição curta diz o essencial; os detalhes ficam no texto, logo abaixo da imagem. (WCAG 1.1.1, eMAG 3.6)',
      correcoes: { descrever: 'Descrever' },
    },
    'descricao-redundante': {
      titulo: 'Descrição que começa com "imagem de"',
      mensagem: 'Não comece a descrição com "imagem de" ou "foto de"',
      porque: 'O leitor de tela já avisa que é uma imagem. Começar com "imagem de" repete a informação e atrasa o que importa. (WCAG 1.1.1)',
      correcoes: { remover: 'Remover o início' },
    },
    'titulo-vazio': {
      titulo: 'Título vazio',
      mensagem: 'Este título está vazio. Escreva o título ou apague a linha',
      porque: 'Um título vazio aparece no sumário e na navegação por leitor de tela sem dizer nada. (WCAG 2.4.6, eMAG 1.3)',
      correcoes: { escrever: 'Escrever título' },
    },
    'titulo-principal': {
      titulo: 'Mais de um título principal',
      mensagem: 'A apostila deve ter um só título de nível 1',
      variantes: { varios: 'A apostila tem {total} títulos de nível 1. Use o nível 2 para as seções' },
      porque: 'O título de nível 1 é o nome do material. Com mais de um, o sumário e a navegação por leitor de tela ficam confusos. (WCAG 1.3.1, eMAG 1.3)',
      correcoes: { ajustar: 'Usar nível 2' },
    },
    'links-ambiguos': {
      titulo: 'Links iguais para lugares diferentes',
      mensagem: 'Este link tem o mesmo texto de outro, mas leva a outro lugar',
      variantes: { mesmo: 'O texto "{texto}" já leva a outro endereço. Use textos diferentes para destinos diferentes' },
      porque: 'Na lista de links do leitor de tela, dois links com o mesmo texto parecem iguais. A pessoa não sabe qual escolher. (WCAG 2.4.4, eMAG 3.5)',
      correcoes: { editar: 'Editar o texto do link' },
    },
    'link-arquivo-sem-formato': {
      titulo: 'Link para arquivo sem o formato',
      mensagem: 'Diga o formato do arquivo no texto do link',
      variantes: { formato: 'Este link abre um arquivo {formato}. Diga isso no texto do link' },
      porque: 'Antes de clicar, a pessoa precisa saber que vai baixar um arquivo e qual programa vai abri-lo. (WCAG 2.4.4, eMAG 3.5)',
      correcoes: { formato: 'Acrescentar o formato' },
    },
  },
};
