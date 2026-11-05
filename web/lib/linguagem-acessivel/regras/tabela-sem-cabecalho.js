const SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const celulas = l => l.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map(x => x.trim());

export default {
  id: 'tabela-sem-cabecalho', codigo: 'e3', area: 'acessibilidade', grupo: 'estrutura', nivel: 'corrigir', escopo: 'bloco',
  referencia: { wcag: ['1.3.1'], emag: ['3.10'] },
  exemplos: [
    { ruim: '|  |  |\n|---|---|\n| Prazo | 10 dias |', bom: '| Etapa | Prazo |\n|---|---|\n| Análise | 10 dias |' },
    { ruim: '| Etapa |  |\n|---|---|\n| Análise | 10 dias |', bom: '| Etapa | Prazo |\n|---|---|\n| Análise | 10 dias |', nivel: 'sugestao' },
  ],
  verificar(c) {
    const b = c.bloco; if (b.sub !== 'tabela') return;
    const s = b.mascara, ls = s.split('\n'), pos = []; let p = 0;
    ls.forEach(l => { pos.push(p); p += l.length + 1; });
    for (let i = 0; i + 1 < ls.length; i++) {
      if (!/^\s*\|/.test(ls[i]) || !SEP.test(ls[i + 1]) || !ls[i + 1].includes('-')) continue;
      if (i > 0 && /^\s*\|/.test(ls[i - 1])) continue;                 // só a primeira linha de cada tabela
      const cab = celulas(ls[i]), cheias = cab.filter(Boolean).length;
      if (cheias === cab.length) continue;
      const a = pos[i], f = pos[i] + ls[i].replace(/\r$/, '').length;
      if (!cheias) {
        const temDados = i + 2 < ls.length && /^\s*\|/.test(ls[i + 2]);
        const correcoes = [];
        if (temDados) {                                                // move a 1ª linha de dados para o cabeçalho
          const d = pos[i + 2];
          correcoes.push({ id: 'primeira-linha', segura: false, edicoes: [
            { inicio: a, fim: f, texto: ls[i + 2].replace(/\r$/, '') },
            { inicio: d - 1, fim: d + ls[i + 2].length, texto: '' }] });
        }
        correcoes.push({ id: 'editar', acao: 'editar-cabecalho', alvo: { inicio: a, fim: f }, segura: false });
        c.relatar(a, f, { variante: 'vazio', correcoes });
      } else {
        c.relatar(a, f, { variante: 'parcial', nivel: 'sugestao', correcoes: [{ id: 'editar', acao: 'editar-cabecalho', alvo: { inicio: a, fim: f }, segura: false }] });
      }
    }
  },
};
