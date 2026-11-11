import { contarPalavras } from '../nucleo/frases.js';
export default {
  id: 'fluxo-sem-texto', codigo: 'i5', area: 'acessibilidade', grupo: 'imagens', nivel: 'sugestao', escopo: 'documento',
  referencia: { wcag: ['1.1.1', '1.3.1'] },
  exemplos: [
    { ruim: '# Fluxo\n\n```mermaid\nflowchart LR\n  A[Pedido] --> B[Análise]\n```', bom: '# Fluxo\n\n```mermaid\nflowchart LR\n  A[Pedido] --> B[Análise]\n```\n\nO pedido chega e, em seguida, a área técnica faz a análise.' },
  ],
  verificar(c) {
    const bl = c.doc.blocos.filter(b => b.tipo !== 'comentario' && b.tipo !== 'separador');
    bl.forEach((b, k) => {
      if (b.tipo !== 'codigo' || String(b.lingua || '').toLowerCase() !== 'mermaid') return;
      const viz = [bl[k - 1], bl[k + 1]].filter(x => x && x.tipo === 'paragrafo' && x.slide === b.slide);
      if (viz.some(x => contarPalavras(x.mascara) >= 8)) return;
      const fl = c.doc.texto.indexOf('\n', b.inicio), fimL = fl < 0 || fl > b.fim ? b.fim : fl;
      c.relatar(b.inicio, fimL, { correcoes: [{ id: 'descrever', acao: 'descrever-fluxo', alvo: { inicio: b.fim, fim: b.fim }, segura: false }] });
    });
  },
};
