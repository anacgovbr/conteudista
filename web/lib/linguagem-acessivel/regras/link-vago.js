import { fecharParenteses } from '../nucleo/analisador.js';

// Textos que não dizem o destino (comparados sem acento, sem pontuação e em minúsculas)
const VAGOS = new Set(['aqui', 'clique', 'clique aqui', 'clicar aqui', 'clique neste link', 'clique no link', 'acesse', 'acesse aqui',
  'saiba mais', 'leia mais', 'veja mais', 'ver mais', 'mais', 'mais informacoes', 'veja', 'ver', 'link', 'este link', 'neste link',
  'esse link', 'o link', 'aqui neste link', 'click here', 'here', 'read more', 'more', 'link aqui', 'baixe aqui', 'baixar aqui', 'pagina']);
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[*_`~]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export default {
  id: 'link-vago', codigo: 'k1', area: 'acessibilidade', grupo: 'links', nivel: 'corrigir', escopo: 'bloco',
  referencia: { wcag: ['2.4.4'], emag: ['3.5'] },
  exemplos: [
    { ruim: 'Os prazos estão no regulamento. [Clique aqui](https://www.gov.br/anac).', bom: 'Os prazos estão no [regulamento da ANAC](https://www.gov.br/anac).' },
    { ruim: '[](https://www.gov.br/anac)', bom: '[Portal da ANAC](https://www.gov.br/anac)' },
    { ruim: 'Veja [https://www.gov.br/anac/pt-br](https://www.gov.br/anac/pt-br).', bom: 'Veja o [portal da ANAC](https://www.gov.br/anac/pt-br).', nivel: 'sugestao' },
    { ruim: null, bom: 'Fonte: [gov.br/ds](https://www.gov.br/ds/).' },
  ],
  verificar(c) {
    const s = c.bloco.mascara, re = /\[([^\]\n]*)\]\(/g;
    for (let m; (m = re.exec(s));) {
      if (m.index > 0 && s[m.index - 1] === '!') continue;           // imagem
      const fim = fecharParenteses(s, m.index + m[0].length - 1);
      if (fim < 0) continue;
      const txt = m[1], n = norm(txt);
      let variante = null, nivel;
      if (!n) variante = 'vazio';
      else if (VAGOS.has(n)) variante = 'vago';
      else if (/^(https?:\/\/|www\.)\S+$/i.test(txt.trim())) { variante = 'endereco'; nivel = 'sugestao'; }
      if (!variante) continue;
      const tI = m.index + 1, tF = tI + txt.length;
      c.relatar(m.index, fim + 1, {
        variante, nivel, dados: { texto: txt.trim() },
        correcoes: [{ id: 'editar', acao: 'editar-texto-do-link', alvo: { inicio: tI, fim: tF }, segura: false }],
      });
    }
  },
};
