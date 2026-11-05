export default {
  id: 'slide-sem-titulo', codigo: 'e2', area: 'acessibilidade', grupo: 'estrutura', nivel: 'corrigir', escopo: 'documento',
  referencia: { wcag: ['2.4.6', '1.3.1'], emag: ['1.3'] },
  tipos: ['apresentacao'],
  exemplos: [
    { ruim: '---\ntitle: Curso\n---\n\n# Abertura\n\nTexto.\n\n---\n\nSó texto, sem título.\n', bom: '---\ntitle: Curso\n---\n\n# Abertura\n\nTexto.\n\n---\n\n# Prazos\n\nTexto do slide.\n', tipo: 'apresentacao' },
    { ruim: null, bom: '---\ntitle: Curso\n---\n\n# Abertura\n\n---\n\n## Etapas\n\n- Uma\n', tipo: 'apresentacao' },
  ],
  verificar(c) {
    if (c.doc.tipo !== 'apresentacao') return;
    c.doc.slides.forEach((sl, k) => {
      const bl = c.doc.blocos.filter(b => b.slide === k && b.tipo !== 'separador' && b.tipo !== 'comentario');
      if (!bl.length) return;                                         // slide vazio: nada a cobrar
      if (bl.some(b => b.tipo === 'titulo')) return;
      const p = bl[0], fimLinha = c.doc.texto.indexOf('\n', p.inicio);
      c.relatar(p.inicio, fimLinha < 0 ? p.fim : Math.min(fimLinha, p.fim), {
        variante: 'numero', dados: { slide: k + 1 },
        correcoes: [{ id: 'escrever', acao: 'escrever-titulo', alvo: { inicio: p.inicio, fim: p.inicio }, segura: false }],
      });
    });
  },
};
