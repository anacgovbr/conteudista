const SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const celulas = l => l.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map(x => x.trim());
// Tabela sem a linha "Tabela: ..." logo antes. O gerador transforma essa linha na legenda da tabela.
export default {
  id: 'tabela-sem-legenda', codigo: 'e8', area: 'acessibilidade', grupo: 'estrutura', nivel: 'sugestao', escopo: 'documento',
  referencia: { wcag: ['1.3.1', '2.4.6'], emag: ['3.10'] },
  exemplos: [
    { ruim: '| Etapa | Prazo |\n|---|---|\n| Análise | 10 dias |', bom: 'Tabela: Prazos de cada etapa\n\n| Etapa | Prazo |\n|---|---|\n| Análise | 10 dias |' },
  ],
  verificar(c) {
    const bl = c.doc.blocos.filter(b => b.tipo !== 'comentario');
    bl.forEach((b, k) => {
      if (b.tipo !== 'paragrafo' || b.sub !== 'tabela') return;
      const ls = b.mascara.split('\n');
      if (ls.length < 2 || !SEP.test(ls[1]) || !ls[1].includes('-')) return;
      if (celulas(ls[0]).some(x => !x)) return;                    // cabeçalho incompleto: regra e3
      const ant = bl[k - 1];
      if (ant && ant.tipo === 'paragrafo' && /^\s*tabela\s*:\s*\S/i.test(ant.mascara)) return;
      c.relatar(b.inicio, b.inicio + ls[0].replace(/\r$/, '').length, {
        correcoes: [{ id: 'legenda', acao: 'escrever-legenda', alvo: { inicio: b.inicio, fim: b.inicio }, segura: false }] });
    });
  },
};
