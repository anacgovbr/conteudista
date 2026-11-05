/* Posições no texto.
   Contrato (ver esquema/diagnostico.schema.json):
   - inicio/fim: índices do texto em unidades UTF-16 (o mesmo que String.prototype.slice no JavaScript);
     fim é exclusivo.
   - linha/coluna: começam em 1. A coluna conta pontos de código Unicode (um emoji = 1 coluna),
     para que sistemas em outras linguagens não errem por causa de acentos ou emojis. */

/** Cria um localizador de linha e coluna para um texto. */
export function criarLocalizador(texto) {
  const inicios = [0];
  for (let i = texto.indexOf('\n'); i >= 0; i = texto.indexOf('\n', i + 1)) inicios.push(i + 1);
  function linhaDe(pos) {
    let a = 0, b = inicios.length - 1;
    while (a < b) { const m = (a + b + 1) >> 1; if (inicios[m] <= pos) a = m; else b = m - 1; }
    return a;
  }
  function colunaDe(l, pos) {
    let c = 1;
    for (let i = inicios[l]; i < pos; i++) {
      const u = texto.charCodeAt(i);
      if (u >= 0xd800 && u <= 0xdbff && i + 1 < pos) { const v = texto.charCodeAt(i + 1); if (v >= 0xdc00 && v <= 0xdfff) i++; }
      c++;
    }
    return c;
  }
  return {
    inicios,
    /** {linha, coluna} de um índice UTF-16. */
    local(pos) { pos = Math.max(0, Math.min(texto.length, pos)); const l = linhaDe(pos); return { linha: l + 1, coluna: colunaDe(l, pos) }; },
    inicioDaLinha(n) { return inicios[Math.max(0, Math.min(inicios.length - 1, n - 1))]; },
    linhas: () => inicios.length,
  };
}
