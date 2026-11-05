/* Frases e palavras em português.
   É a parte mais delicada da biblioteca: abreviações ("art.", "nº", "Sr."), números ("1.500,00", "3.2"),
   reticências, siglas com ponto ("S.A."), endereços e itens de lista não podem quebrar frases por engano.
   A sintaxe Markdown (links, imagens, ênfase) não conta como palavra. */

// Abreviações comuns (sem o ponto final), em minúsculas.
const ABREV = new Set(('art arts inc incs al alín n nº nos nºs no p pp pág págs fl fls cap caps vol vols ed eds séc sec ' +
  'sr sra srs sras srta dr dra drs dras prof profa profs exmo exma ilmo ilma av r rod km cia ltda me eireli adm ' +
  'etc ex obs aprox cf op cit ibid id tel fax ramal ref refs fig figs tab tabs item itens par pars ' +
  'jan fev mar abr mai jun jul ago set out nov dez seg ter qua qui sex sáb dom min máx mín hab res ' +
  'dec decr port lei inst instr ofic of memo proc doc docs pg vs eng arq téc tec reg anac rbac rbha').split(' '));

const LETRA = /[\p{L}\p{N}]/u;

/** Palavras visíveis de um trecho Markdown (ignora endereços de links e imagens, ênfase e marcadores de lista). */
export function palavras(t) {
  const s = limparMarkdown(t);
  return s.match(/[\p{L}\p{N}]+(?:[-'’.,][\p{L}\p{N}]+)*/gu) || [];
}
export const contarPalavras = t => palavras(t).length;

/** Troca a sintaxe Markdown por espaços do mesmo tamanho (as posições continuam valendo). */
export function limparMarkdown(t) {
  const sp = s => ' '.repeat(s.length);
  return String(t)
    .replace(/!\[([^\]\n]*)\]\([^)\n]*\)/g, sp)                       // imagem: não é texto da frase
    .replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, (x, a) => ' ' + a + ' '.repeat(x.length - a.length - 1))   // link: fica o texto
    .replace(/<https?:[^>\s]+>|https?:\/\/[^\s)]+/g, x => 'endereço'.padEnd(x.length, ' ').slice(0, x.length))
    .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/gm, sp)
    .replace(/^[ \t]*>[ \t]?(?:\[![a-z]+\][ \t]*)?/gim, sp)
    .replace(/^[ \t]*#{1,6}[ \t]/gm, sp)
    .replace(/(\*\*|__|\*|_|~~)(?=\S)/g, sp).replace(/(?<=\S)(\*\*|__|\*|_|~~)/g, sp)
    .replace(/\|/g, ' ');
}

/** Divide um trecho em frases: [{inicio, fim, texto, palavras}] (posições relativas a "base").
    Cada linha de lista ou de tabela é tratada à parte; dentro do parágrafo comum, as quebras de linha não encerram a frase. */
export function dividirFrases(t, base = 0) {
  t = String(t);
  const vis = limparMarkdown(t), r = [];
  // trechos: linhas de lista/tabela separadas; demais linhas juntas
  const trechos = []; let ini = 0;
  const linhas = t.split('\n'); let pos = 0, acum = null;
  for (const l of linhas) {
    const a = pos, f = pos + l.length; pos = f + 1;
    const separado = /^\s*([-*+]|\d+[.)])\s|^\s*\||^\s*#{1,6}\s/.test(l);
    if (separado || !l.trim()) { if (acum) { trechos.push(acum); acum = null; } if (l.trim()) trechos.push([a, f]); }
    else if (acum) acum[1] = f; else acum = [a, f];
  }
  if (acum) trechos.push(acum);
  void ini;
  for (const [a, f] of trechos) {
    let i0 = a;
    for (let i = a; i < f; i++) {
      const c = vis[i];
      if (c !== '.' && c !== '!' && c !== '?' && c !== '…' && c !== ';' && c !== ':') continue;
      if ((c === ';' || c === ':') ) continue;                          // ; e : não encerram a frase
      let j = i; while (j + 1 < f && /[.!?…]/.test(vis[j + 1])) j++;     // "?!" "..."
      let k = j + 1; while (k < f && /["'”’»)\]*_]/.test(vis[k])) k++;    // aspas e parênteses de fechamento
      if (k < f && !/\s/.test(vis[k])) { i = j; continue; }               // "3.5", "S.A.", "gov.br"
      if (c === '.' && j === i && fimFalso(vis, i, a, f)) { i = j; continue; }
      corta(i0, k); i0 = k; i = k - 1;
    }
    corta(i0, f);
  }
  function corta(x, y) {
    while (x < y && /\s/.test(t[x])) x++;
    while (y > x && /\s/.test(t[y - 1])) y--;
    if (y <= x) return;
    const tx = t.slice(x, y), n = contarPalavras(tx);
    if (n) r.push({ inicio: base + x, fim: base + y, texto: tx, palavras: n });
  }
  return r;
}

// O ponto em vis[i] não encerra a frase? (abreviação, inicial de nome, número, próxima palavra em minúscula)
function fimFalso(vis, i, a, f) {
  let s = i; while (s > a && LETRA.test(vis[s - 1])) s--;
  const w = vis.slice(s, i), wl = w.toLowerCase();
  if (!w) return false;
  if (ABREV.has(wl)) return true;
  if (/^\p{Lu}$/u.test(w)) return true;                                   // inicial: "J. Silva"
  if (/^\d+$/.test(w) && /^\s*\d/.test(vis.slice(i + 1, i + 4))) return true;
  let k = i + 1; while (k < f && /\s/.test(vis[k])) k++;
  if (k < f && /\p{Ll}/u.test(vis[k])) return true;                       // continua em minúscula: não terminou
  return false;
}
