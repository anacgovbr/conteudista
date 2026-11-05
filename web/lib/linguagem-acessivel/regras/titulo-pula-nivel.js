export default {
  id: 'titulo-pula-nivel', codigo: 'e1', area: 'acessibilidade', grupo: 'estrutura', nivel: 'corrigir', escopo: 'documento',
  referencia: { wcag: ['1.3.1', '2.4.6'], emag: ['1.3'] },
  exemplos: [
    { ruim: '# Processo\n\n### Prazos', bom: '# Processo\n\n## Prazos' },
    { ruim: '### Prazos', bom: '## Prazos' },
    { ruim: null, bom: '# Processo\n\n## Etapas\n\n### Análise\n\n## Prazos' },
  ],
  verificar(c) {
    let ant = 0, slide = -1;
    for (const t of c.doc.titulos) {
      if (c.doc.tipo === 'apresentacao' && t.slide !== slide) { slide = t.slide; ant = 0; }   // cada slide recomeça
      const n = t.nivel;
      const pulou = ant ? n > ant + 1 : n > 2;
      if (pulou) {
        const esperado = ant ? ant + 1 : 1;
        c.relatar(t.marcaInicio, t.marcaFim, {
          variante: ant ? 'pulou' : 'primeiro', dados: { anterior: ant, esperado, nivel: n },
          correcoes: [{ id: 'ajustar', segura: true, edicoes: [{ inicio: t.marcaInicio, fim: t.marcaInicio + n, texto: '#'.repeat(esperado) }] }],
        });
        ant = esperado;                                  // os títulos seguintes são comparados ao nível corrigido
      } else ant = n;
    }
  },
};
