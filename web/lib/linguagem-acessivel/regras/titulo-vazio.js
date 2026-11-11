export default {
  id: 'titulo-vazio', codigo: 'e4', area: 'acessibilidade', grupo: 'estrutura', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['2.4.6', '1.3.1'], emag: ['1.3'] },
  exemplos: [
    { ruim: '# Processo\n\n##\n\nTexto.', bom: '# Processo\n\n## Prazos\n\nTexto.' },
  ],
  verificar(c) {
    const b = c.bloco; if (b.tipo !== 'titulo' || b.texto) return;
    const fim = b.mascara.replace(/\s+$/, '').length; if (!fim) return;
    c.relatar(0, fim, { correcoes: [{ id: 'escrever', acao: 'escrever-titulo', alvo: { inicio: fim, fim }, segura: false }] });
  },
};
