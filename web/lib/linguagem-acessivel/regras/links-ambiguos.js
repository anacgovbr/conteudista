import { fecharParenteses } from '../nucleo/analisador.js';
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[*_`~]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const VAGOS = new Set(['aqui', 'clique aqui', 'saiba mais', 'leia mais', 'veja', 'link', 'mais', 'acesse', 'acesse aqui']);   // já cobertos por k1
const destino = d => d.trim().split(/\s+/)[0].replace(/^<|>$/g, '').replace(/\/+(?=$|[?#])/, '').toLowerCase();
export default {
  id: 'links-ambiguos', codigo: 'k2', area: 'acessibilidade', grupo: 'links', nivel: 'sugestao', escopo: 'documento',
  referencia: { wcag: ['2.4.4', '2.4.9'], emag: ['3.5'] },
  exemplos: [
    { ruim: 'Leia o [manual](https://a.gov.br/1) e depois o [manual](https://a.gov.br/2).', bom: 'Leia o [manual de voo](https://a.gov.br/1) e depois o [manual de manutenção](https://a.gov.br/2).' },
    { ruim: null, bom: 'Veja o [manual](https://a.gov.br/1). Depois, volte ao [manual](https://a.gov.br/1/).' },
  ],
  verificar(c) {
    const vistos = new Map();
    for (const b of c.doc.blocos) {
      if (b.tipo !== 'paragrafo') continue;
      const s = b.mascara, re = /\[([^\]\n]*)\]\(/g;
      for (let m; (m = re.exec(s));) {
        if (m.index > 0 && s[m.index - 1] === '!') continue;
        const ab = m.index + m[0].length - 1, fim = fecharParenteses(s, ab);
        if (fim < 0) continue;
        const n = norm(m[1]); if (!n || VAGOS.has(n)) continue;
        const d = destino(s.slice(ab + 1, fim)); if (!d) continue;
        const v = vistos.get(n);
        if (!v) { vistos.set(n, d); continue; }
        if (v === d) continue;
        const tI = b.inicio + m.index + 1;
        c.relatar(b.inicio + m.index, b.inicio + fim + 1, { variante: 'mesmo', dados: { texto: m[1].trim() },
          correcoes: [{ id: 'editar', acao: 'editar-texto-do-link', alvo: { inicio: tI, fim: tI + m[1].length }, segura: false }] });
      }
    }
  },
};
