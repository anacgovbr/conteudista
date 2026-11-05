/* Pedidos padronizados para uma IA (versão 1.0) e leitura das respostas.
   A IA fica FORA da biblioteca: quem usa copia o pedido, cola na IA autorizada e traz a resposta de volta.
   Os pedidos seguem as regras de linguagem simples e as boas práticas de descrição de imagens. */
export const VERSAO_PEDIDOS = '1.0';

const DESCREVER = `PEDIDO DO CONTEUDISTA: DESCREVER IMAGEM (versão ${VERSAO_PEDIDOS})

Descreva a imagem anexada para uma pessoa que não pode vê-la.

Contexto: a imagem está em um material de treinamento chamado
"{nome}". Texto perto da imagem: "{contexto}".
Legenda atual: "{legenda}".

Regras:
1. Diga o que a imagem mostra e por que ela importa para o texto.
   Não comece com "imagem de", "foto de" ou "figura".
2. Use português do Brasil e linguagem simples: frases curtas,
   voz ativa e palavras do dia a dia.
3. Se a imagem tiver texto, escreva esse texto.
4. Não invente nada. Se não der para ler alguma parte, escreva [ilegível].
5. Só fale de cor, posição ou estilo se isso mudar o sentido.
6. Descrição curta: até 150 caracteres, em uma ou duas frases.
7. Descrição detalhada: só para gráfico, esquema, fluxo ou tabela em
   imagem. Siga a ordem de leitura, em frases curtas ou lista numerada.
   Se não for preciso, escreva NÃO SE APLICA.
8. Se a imagem for só enfeite, responda apenas: DECORATIVA.

Responda somente neste formato, sem comentários:
DESCRIÇÃO CURTA: ...
DESCRIÇÃO DETALHADA: ...`;

const SIMPLIFICAR = `PEDIDO DO CONTEUDISTA: SIMPLIFICAR TRECHO (versão ${VERSAO_PEDIDOS})

Reescreva o trecho abaixo em linguagem simples. Ele faz parte de um
material de treinamento chamado "{nome}".

Regras:
1. Mantenha o sentido. Não mude prazos, números, valores, obrigações,
   nomes de normas nem termos técnicos exigidos.
2. Uma ideia por frase, com até 20 palavras. Diga quem faz o quê,
   na ordem em que acontece.
3. Use a voz ativa e verbos no lugar de substantivos
   (por exemplo, "analisar" em vez de "proceder à análise").
4. Prefira palavras do dia a dia. Se um termo técnico for necessário,
   mantenha o termo e explique em poucas palavras.
5. Na primeira vez que uma sigla aparecer, escreva:
   nome completo (SIGLA).
6. Mantenha a formatação Markdown (negrito, links, listas).
   Não crie títulos.
7. Não acrescente informação. Se algo estiver ambíguo, mantenha o
   trecho e marque [A CONFIRMAR: motivo].

Responda somente com o texto reescrito, sem comentários.

TRECHO:
"""
{trecho}
"""`;

export const PEDIDOS = Object.freeze({
  descrever: { id: 'descrever', nome: 'Descrever imagem', campos: ['nome', 'contexto', 'legenda'], modelo: DESCREVER },
  simplificar: { id: 'simplificar', nome: 'Simplificar trecho', campos: ['nome', 'trecho'], modelo: SIMPLIFICAR },
});
const ALIAS = { 'descrever-imagem': 'descrever', d: 'descrever', 'simplificar-trecho': 'simplificar', s: 'simplificar' };

/** Monta o pedido preenchido. tipo: 'descrever' | 'simplificar'. Campos vazios ficam como "(sem ...)". */
export function montarPedido(tipo, dados = {}) {
  const p = PEDIDOS[ALIAS[tipo] || tipo];
  if (!p) { const e = new Error('Pedido desconhecido: "' + tipo + '". Use descrever ou simplificar.'); e.codigo = 'pedido-desconhecido'; throw e; }
  const limpa = v => String(v == null ? '' : v).replace(/\r\n/g, '\n').trim();
  const val = {
    nome: limpa(dados.nome) || 'sem nome',
    contexto: limpa(dados.contexto).replace(/\s+/g, ' ').slice(0, 600) || 'sem texto próximo',
    legenda: limpa(dados.legenda) || 'sem legenda',
    trecho: limpa(dados.trecho),
  };
  if (p.id === 'simplificar' && !val.trecho) { const e = new Error('Informe o trecho a simplificar.'); e.codigo = 'trecho-vazio'; throw e; }
  return p.modelo.replace(/\{(\w+)\}/g, (m, k) => (k in val ? val[k] : m));
}

const semAcento = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/** Lê a resposta da IA ao pedido "descrever": { decorativa, curta, detalhada, avisos[] } */
export function lerRespostaDescricao(texto) {
  const t = String(texto || '').replace(/\r\n/g, '\n').replace(/^```[a-z]*\n?|```\s*$/gim, '').trim();
  const avisos = [];
  if (/^\**\s*decorativa\s*\.?\**$/i.test(semAcento(t))) return { decorativa: true, curta: '', detalhada: '', avisos };
  const n = semAcento(t);
  const ic = n.search(/descricao curta\s*:/i), id = n.search(/descricao detalhada\s*:/i);
  let curta, detalhada = '';
  const corpo = (i) => t.slice(t.indexOf(':', i) + 1);
  if (ic >= 0) {
    curta = (id > ic ? t.slice(t.indexOf(':', ic) + 1, id) : corpo(ic)).trim();
    if (id >= 0) detalhada = (id > ic ? corpo(id) : t.slice(t.indexOf(':', id) + 1, ic)).trim();
  } else { curta = t.split(/\n\s*\n/)[0].trim(); avisos.push('A resposta não veio no formato pedido. Confira a descrição.'); }
  curta = curta.replace(/^\*+|\*+$/g, '').replace(/\s+/g, ' ').trim();
  detalhada = detalhada.replace(/^\*+|\*+$/g, '').trim();
  if (/^nao se aplica\.?$/i.test(semAcento(detalhada))) detalhada = '';
  if ([...curta].length > 150) avisos.push('A descrição curta passa de 150 caracteres (' + [...curta].length + '). Encurte.');
  if (/^(imagem|foto|figura)\s+(de|do|da)\b/i.test(curta)) avisos.push('Evite começar com "imagem de" ou "foto de".');
  if (/\[ilegivel\]/i.test(semAcento(curta + detalhada))) avisos.push('A IA não conseguiu ler uma parte da imagem. Complete a descrição.');
  if (!curta) avisos.push('A descrição curta está vazia.');
  return { decorativa: false, curta, detalhada, avisos };
}
/** Lê a resposta da IA ao pedido "simplificar": { texto, avisos[] } */
export function lerRespostaSimplificar(texto) {
  let t = String(texto || '').replace(/\r\n/g, '\n').replace(/^```[a-z]*\n?|```\s*$/gim, '').trim();
  t = t.replace(/^"""\s*|\s*"""$/g, '').replace(/^TRECHO:\s*/i, '').trim();
  const avisos = [];
  const conf = [...t.matchAll(/\[A CONFIRMAR:([^\]]*)\]/gi)].map(m => m[1].trim());
  if (conf.length) avisos.push('A IA marcou ' + conf.length + ' ponto(s) para confirmar: ' + conf.join('; '));
  if (/^#{1,6}\s/m.test(t)) avisos.push('A resposta criou títulos. Confira antes de usar.');
  if (!t) avisos.push('A resposta está vazia.');
  return { texto: t, avisos };
}
