// Duas ou mais linhas seguidas que começam com "•", "▪", "–" etc.: parecem lista, mas não são.
const RE = /^([ \t]*)([•●▪◦·–—])[ \t]+/;
export default {
  id: 'lista-falsa', codigo: 'e7', area: 'acessibilidade', grupo: 'estrutura', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['1.3.1'] },
  exemplos: [
    { ruim: 'Documentos:\n\n• Primeiro documento\n• Segundo documento', bom: 'Documentos:\n\n- Primeiro documento\n- Segundo documento' },
  ],
  verificar(c) {
    const b = c.bloco; if (b.tipo !== 'paragrafo' || b.sub === 'tabela' || b.sub === 'lista') return;
    const ls = b.mascara.split('\n'); let p = 0, run = [];
    const fecha = () => {
      if (run.length >= 2) {
        const ult = run[run.length - 1];
        c.relatar(run[0].ini, ult.ini + ult.txt.replace(/\r$/, '').length, {
          correcoes: [{ id: 'converter', segura: false, edicoes: run.map(x => ({ inicio: x.ini + x.m[1].length, fim: x.ini + x.m[0].length, texto: '- ' })) }] });
      }
      run = [];
    };
    for (const l of ls) { const m = RE.exec(l); if (m) run.push({ ini: p, txt: l, m }); else fecha(); p += l.length + 1; }
    fecha();
  },
};
