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
    r.push({ tipo: m[1].toLowerCase(), regras: m[2].trim().split(/[\s,]+/).filter(Boolean).map(s => s.toLowerCase()), inicio: m.index, fim: m.index + m[0].length });
  }
  return r;
}
export const textoMarcador = (tipo, regras) => '<!-- ' + PREFIXO + ': ' + tipo + (regras && regras.length ? ' ' + regras.join(' ') : '') + ' -->';
