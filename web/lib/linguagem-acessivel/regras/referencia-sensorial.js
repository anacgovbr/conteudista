import { visivel } from '../nucleo/frases.js';
const COR = '(?:verde|vermelh[oa]|azul|amarel[oa]|laranja|rox[oa]|cinza|pret[oa]|branc[oa]|rosa)';
const RE = new RegExp('(?<![\\p{L}])(?:' + [
  '(?:bot[ãa]o|[íi]cone|campo|link|seta|texto|[áa]rea|c[íi]rculo|quadrado|tri[âa]ngulo|faixa|barra)\\s+' + COR,
  '(?:em|na cor)\\s+' + COR,
  '[àa]\\s+(?:direita|esquerda)',
  '(?:no|do|ao)\\s+canto\\s+(?:superior|inferior)(?:\\s+(?:direito|esquerdo))?',
  'ao\\s+lado\\s+(?:direito|esquerdo)',
  'veja\\s+(?:abaixo|acima|ao\\s+lado)',
].join('|') + ')(?![\\p{L}])', 'giu');
export default {
  id: 'referencia-sensorial', codigo: 'c1', area: 'acessibilidade', grupo: 'sentido', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['1.3.3', '1.4.1'] },
  exemplos: [
    { ruim: 'Clique no botão verde para enviar o pedido.', bom: 'Clique no botão Enviar para mandar o pedido.' },
    { ruim: 'O menu fica à direita da tela.', bom: 'O menu fica na barra de opções, chamada Mais opções.' },
    { ruim: null, bom: 'A tabela abaixo mostra os prazos.' },
  ],
  verificar(c) {
    const b = c.bloco; if (b.tipo !== 'paragrafo') return;
    const vis = visivel(b);
    RE.lastIndex = 0;
    for (let m; (m = RE.exec(vis));) {
      c.relatar(m.index, m.index + m[0].length, { variante: 'texto', dados: { texto: m[0] },
        correcoes: [{ id: 'reescrever', acao: 'reescrever-sensorial', alvo: { inicio: m.index, fim: m.index + m[0].length }, segura: false }] });
    }
  },
};
