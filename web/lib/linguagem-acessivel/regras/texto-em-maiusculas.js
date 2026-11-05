import { visivel } from '../nucleo/frases.js';

// Sequências de 3 ou mais palavras todas em maiúsculas (de 2 letras ou mais), com pelo menos 12 letras no total.
// Palavras de uma letra ("O", "E", "A") entram no meio da sequência. Só ponto final, !, ? ou parágrafo novo interrompem.
export function trechosEmMaiusculas(vis) {
  const toks = [...vis.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ i: m.index, f: m.index + m[0].length, w: m[0] }));
  const caps = w => /\p{Lu}/u.test(w) && !/\p{Ll}/u.test(w);
  const forte = w => caps(w) && [...w.replace(/\p{N}/gu, '')].length >= 2;
  const r = []; let run = [];
  const fecha = () => {
    while (run.length && !forte(run[run.length - 1].w)) run.pop();
    const fortes = run.filter(t => forte(t.w));
    if (fortes.length >= 3 && fortes.reduce((s, t) => s + t.w.length, 0) >= 12) r.push(run);
    run = [];
  };
  for (const t of toks) {
    if (!caps(t.w) || (!run.length && !forte(t.w))) { fecha(); continue; }
    if (run.length && /\n\s*\n|[.!?](\s|$)/.test(vis.slice(run[run.length - 1].f, t.i))) fecha();
    if (!run.length && !forte(t.w)) continue;
    run.push(t);
  }
  fecha();
  return r;
}
export default {
  id: 'texto-em-maiusculas', codigo: 'f3', area: 'linguagem', grupo: 'frases', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['1.4.8'] },
  exemplos: [
    { ruim: 'ATENÇÃO: O PRAZO TERMINA NA SEXTA-FEIRA.', bom: '**Atenção:** o prazo termina na sexta-feira.' },
    { ruim: null, bom: 'A ANAC e o DECEA publicam as regras.' },
  ],
  verificar(c) {
    const b = c.bloco; if (b.tipo !== 'paragrafo') return;
    if (!/\p{Lu}{2}[^\p{Ll}\n]{0,8}\p{Lu}{2}/u.test(b.mascara)) return;           // atalho: sem duas palavras em maiúsculas seguidas
    const vis = visivel(b), sig = c.siglas;
    for (const run of trechosEmMaiusculas(vis)) {
      if (run.every(t => sig.conhecida(t.w) || sig.nome(t.w) || t.w.length < 2)) continue;
      const a = run[0].i, f = run[run.length - 1].f, orig = c.texto.slice(b.inicio + a, b.inicio + f);
      // maiúscula inicial só se o trecho começa a frase
      let primeira = !/[\p{L}\p{N},;]\s*$/u.test(vis.slice(0, a));
      const novo = orig.replace(/[\p{L}\p{N}]+/gu, w => {
        if (sig.conhecida(w) || sig.nome(w)) { primeira = false; return w; }
        const l = w.toLocaleLowerCase('pt-BR');
        if (primeira) { primeira = false; return l.charAt(0).toLocaleUpperCase('pt-BR') + l.slice(1); }
        return l;
      });
      c.relatar(a, f, { correcoes: [{ id: 'converter', segura: false, edicoes: [{ inicio: a, fim: f, texto: novo }] }] });
    }
  },
};
