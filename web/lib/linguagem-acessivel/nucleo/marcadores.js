/* Marcadores no próprio texto, em comentário HTML (não aparecem nos arquivos gerados):
     <!-- linguagem-acessivel: ignorar f1 link-vago -->     ignora essas regras no bloco seguinte
     <!-- linguagem-acessivel: ignorar-documento f1 -->     ignora em todo o texto
     <!-- linguagem-acessivel: decorativa -->               a imagem da linha seguinte é decorativa */
export const PREFIXO = 'linguagem-acessivel';
const RE = /<!--\s*linguagem-acessivel\s*:\s*([a-z-]+)([^>]*?)-->/gi;

/** Lista os marcadores do texto: [{tipo, regras[], inicio, fim}] */
export function lerMarcadores(texto) {
  const r = [];
  if (texto.indexOf(PREFIXO) < 0) return r;
  RE.lastIndex = 0;
  for (let m; (m = RE.exec(texto));) {
    const tipo = m[1].toLowerCase(), corpo = m[2].trim();
    if (tipo === 'siglas') {
      const siglas = {};
      corpo.split(';').forEach(item => {
        const x = /^\s*([A-Z][A-Z0-9]{1,9})\s*=\s*(.+?)\s*$/.exec(item);
        if (x) siglas[x[1]] = x[2];
      });
      r.push({ tipo, regras: [], siglas, inicio: m.index, fim: m.index + m[0].length });
    } else r.push({ tipo, regras: corpo.split(/[\s,]+/).filter(Boolean).map(s => s.toLowerCase()), inicio: m.index, fim: m.index + m[0].length });
  }
  return r;
}
export const textoMarcador = (tipo, regras) => '<!-- ' + PREFIXO + ': ' + tipo + (regras && regras.length ? ' ' + regras.join(' ') : '') + ' -->';
