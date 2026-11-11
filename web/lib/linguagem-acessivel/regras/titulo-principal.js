export default {
  id: 'titulo-principal', codigo: 'e5', area: 'acessibilidade', grupo: 'estrutura', nivel: 'sugestao', escopo: 'documento',
  referencia: { wcag: ['1.3.1', '2.4.6'], emag: ['1.3'] },
  tipos: ['apostila'],
  exemplos: [
    { ruim: '# Parte 1\n\nTexto.\n\n# Parte 2\n\nTexto.', bom: '# Curso\n\n## Parte 1\n\nTexto.\n\n## Parte 2\n\nTexto.', tipo: 'apostila' },
  ],
  verificar(c) {
    if (c.doc.tipo !== 'apostila') return;
    const h1 = c.doc.titulos.filter(t => t.nivel === 1);
    if (h1.length < 2) return;
    for (const t of h1.slice(1)) {
      c.relatar(t.marcaInicio, t.marcaFim, { variante: 'varios', dados: { total: h1.length },
        correcoes: [{ id: 'ajustar', segura: false, edicoes: [{ inicio: t.marcaInicio, fim: t.marcaInicio + 1, texto: '##' }] }] });
    }
  },
};
