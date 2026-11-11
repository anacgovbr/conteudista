import { contarPalavras } from '../nucleo/frases.js';
// Linha curta toda em negrito, sozinha, seguida de texto: parece título, mas não entra no sumário nem na navegação.
export default {
  id: 'titulo-falso', codigo: 'e6', area: 'acessibilidade', grupo: 'estrutura', nivel: 'sugestao', escopo: 'documento',
  referencia: { wcag: ['1.3.1'], emag: ['1.3'] },
  exemplos: [
    { ruim: '# Curso\n\n**Prazos de análise**\n\nO pedido é analisado em dez dias.', bom: '# Curso\n\n## Prazos de análise\n\nO pedido é analisado em dez dias.' },
    { ruim: null, bom: '**Atenção:** o prazo termina na sexta-feira.\n\nEnvie antes.' },
  ],
  verificar(c) {
    const bl = c.doc.blocos.filter(b => b.tipo !== 'comentario');
    bl.forEach((b, k) => {
      if (b.tipo !== 'paragrafo' || b.sub !== 'texto') return;
      const t = b.mascara.replace(/\s+$/, '');
      if (t.includes('\n')) return;
      const m = /^(\s*)(\*\*|__)([^*_\n]+?)\2$/.exec(t);
      if (!m) return;
      const dentro = m[3].trim();
      if (!dentro || /[.:!?;,]$/.test(dentro) || contarPalavras(dentro) > 8) return;
      const prox = bl[k + 1];
      if (!prox || prox.tipo !== 'paragrafo') return;
      const ant = c.doc.titulos.filter(x => x.marcaInicio < b.inicio).pop(), nivel = ant ? Math.min(ant.nivel + 1, 6) : 2;
      const a = b.inicio + m[1].length, f = b.inicio + t.length;
      c.relatar(a, f, { variante: 'texto', dados: { texto: dentro },
        correcoes: [{ id: 'converter', segura: false, edicoes: [{ inicio: a, fim: f, texto: '#'.repeat(nivel) + ' ' + dentro }] }] });
    });
  },
};
