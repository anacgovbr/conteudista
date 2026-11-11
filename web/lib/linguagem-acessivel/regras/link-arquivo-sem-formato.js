import { fecharParenteses } from '../nucleo/analisador.js';
const EXT = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp|csv|zip|rar|epub|mp3|mp4|wav)(?=$|[?#])/i;
const NOMES = { doc: ['doc', 'word'], xls: ['xls', 'excel', 'planilha'], ppt: ['ppt', 'powerpoint'] };
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export default {
  id: 'link-arquivo-sem-formato', codigo: 'k3', area: 'acessibilidade', grupo: 'links', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['2.4.4'], emag: ['3.5'] },
  exemplos: [
    { ruim: 'Baixe o [relatório anual](https://a.gov.br/relatorio.pdf).', bom: 'Baixe o [relatório anual (PDF)](https://a.gov.br/relatorio.pdf).' },
    { ruim: null, bom: 'Use a [planilha de prazos](https://a.gov.br/prazos.xlsx).' },
  ],
  verificar(c) {
    const s = c.bloco.mascara, re = /\[([^\]\n]*)\]\(/g;
    for (let m; (m = re.exec(s));) {
      if (m.index > 0 && s[m.index - 1] === '!') continue;
      const ab = m.index + m[0].length - 1, fim = fecharParenteses(s, ab);
      if (fim < 0 || !m[1].trim()) continue;
      const dest = s.slice(ab + 1, fim).trim().split(/\s+/)[0].replace(/^<|>$/g, '');
      const e = EXT.exec(dest.split(/[?#]/)[0]); if (!e) continue;
      const ext = e[1].toLowerCase(), base = ext.replace(/x$/, ''), txt = norm(m[1]);
      if ((NOMES[base] || [base]).some(w => txt.includes(w))) continue;
      const tF = m.index + 1 + m[1].replace(/\s+$/, '').length, rot = ext.toUpperCase();
      c.relatar(m.index, fim + 1, { variante: 'formato', dados: { formato: rot },
        correcoes: [{ id: 'formato', segura: true, edicoes: [{ inicio: tF, fim: tF, texto: ' (' + rot + ')' }] }] });
    }
  },
};
