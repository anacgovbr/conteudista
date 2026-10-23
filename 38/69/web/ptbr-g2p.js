/* =====================================================================================
   Conteudista — Fonemizador interno pt-BR (regras ortográficas → IPA no padrão espeak-ng pt-br)
   Usado pela Locução quando o espeak-ng do navegador não oferece português.
   - Números por extenso, siglas soletradas, tonicidade (acentos e regras de paroxítona/oxítona)
   - Dígrafos (ch, lh, nh, rr, ss, qu, gu, sc, xc), nasalização (am, em, ão, õe…), l final → w,
     t/d + i → tʃ/dʒ, vogais átonas finais (e → ɪ, o → ʊ, a → ɐ), s intervocálico → z
   Exporta: phonemizePTBR(texto) → string IPA com marcas de tonicidade (ˈ)
   ===================================================================================== */
const UNID = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
function ate999(n) {
  if (n < 20) return UNID[n];
  if (n < 100) return DEZ[Math.floor(n / 10)] + (n % 10 ? ' e ' + UNID[n % 10] : '');
  if (n === 100) return 'cem';
  return CEN[Math.floor(n / 100)] + (n % 100 ? ' e ' + ate999(n % 100) : '');
}
function porExtenso(n) {
  if (n === 0) return 'zero';
  const partes = [], grupos = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];
  let i = 0;
  while (n > 0 && i < grupos.length) {
    const g = n % 1000;
    if (g) partes.unshift(i === 1 && g === 1 ? 'mil' : ate999(g) + (i ? ' ' + (g === 1 ? grupos[i][0] : grupos[i][1]) : ''));
    n = Math.floor(n / 1000); i++;
  }
  return partes.join(' e ').replace(/ e (?=\S+ e )/g, ' ');
}
const LETRAS = { a: 'á', b: 'bê', c: 'cê', d: 'dê', e: 'é', f: 'efe', g: 'gê', h: 'agá', i: 'í', j: 'jota', k: 'cá', l: 'ele', m: 'eme', n: 'ene', o: 'ó', p: 'pê', q: 'quê', r: 'erre', s: 'esse', t: 'tê', u: 'ú', v: 'vê', w: 'dáblio', x: 'xis', y: 'ípsilon', z: 'zê' };
const ABREV = { 'sr.': 'senhor', 'sra.': 'senhora', 'dr.': 'doutor', 'dra.': 'doutora', 'art.': 'artigo', 'n.º': 'número', 'nº': 'número', 'etc.': 'etcétera', 'ex.': 'exemplo', 'p.ex.': 'por exemplo', 'pág.': 'página', 'inc.': 'inciso', 'arts.': 'artigos', '§': 'parágrafo', '%': 'por cento' };
const SIGLAS_PALAVRA = new Set(['anac', 'sei', 'mpr', 'cdpp', 'gtpl', 'sar', 'lai', 'lgpd', 'pdf', 'rbac', 'gft', 'esproc', 'astec']);
const SOLETRAR = new Set(['sar', 'mpr', 'gtpl', 'cdpp', 'pdf', 'rbac', 'gft', 'lgpd']);

/* ---------------------------- Normalização do texto ---------------------------- */
function normalizar(t) {
  t = ' ' + t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2013|\u2014/g, ', ') + ' ';
  for (const [k, v] of Object.entries(ABREV)) t = t.split(k).join(' ' + v + ' ');
  t = t.replace(/(\d+)º/g, '$1 ').replace(/(\d+)ª/g, '$1 ');
  t = t.replace(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?/g, (m, a, b) => {
    const n = parseInt(a.replace(/\./g, ''), 10); if (!isFinite(n) || n > 999999999999) return a.split('').map(d => UNID[+d]).join(' ');
    return ' ' + porExtenso(n) + (b ? ' vírgula ' + b.split('').map(d => UNID[+d]).join(' ') : '') + ' ';
  });
  t = t.replace(/\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,6})\b/g, (m) => {
    const l = m.toLowerCase();
    if (SOLETRAR.has(l) || (!SIGLAS_PALAVRA.has(l) && !/[aeiouáéíóúâêôãõ]/.test(l))) return ' ' + [...l].map(c => LETRAS[c] || c).join(' ') + ' ';
    return m;
  });
  return t.replace(/[“”"«»()\[\]{}*_#`>|]/g, ' ').replace(/\s*\/\s*/g, ' barra ').replace(/&/g, ' e ').replace(/\s+/g, ' ').trim();
}

/* ---------------------------- Uma palavra ---------------------------- */
const V = 'aeiouáéíóúâêôãõàü';
const isV = c => !!c && V.includes(c);
const ATONAS = new Set(['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'e', 'que', 'se', 'me', 'te', 'lhe', 'lhes', 'por', 'com', 'para', 'pra', 'ao', 'aos', 'à', 'às', 'num', 'numa', 'mas', 'nem', 'ou', 'sem', 'pelo', 'pela', 'pelos', 'pelas', 'um', 'uns']);
const FIXAS = { e: 'i', o: 'ʊ', os: 'ʊs', do: 'dʊ', dos: 'dʊs', no: 'nʊ', nos: 'nʊs', ao: 'aw', de: 'dʒɪ', que: 'kɪ', se: 'sɪ', me: 'mɪ', te: 'tʃɪ', para: 'pɐɾɐ', pra: 'pɾɐ', com: 'kõ', sem: 'sẽj', por: 'puɾ', um: 'ũ', uns: 'ũs', em: 'ẽj', mas: 'mas', aos: 'aws', 'à': 'a', 'às': 'as' };

function silabaTonica(w) {
  const acento = w.search(/[áéíóúâêô]/);
  if (acento >= 0) return acento;
  const til = w.search(/[ãõ]/);
  if (til >= 0) return til;
  const nucleos = []; let i = 0;
  while (i < w.length) {
    if (isV(w[i]) && !(w[i] === 'u' && (w[i - 1] === 'q' || w[i - 1] === 'g') && isV(w[i + 1]))) {
      let j = i + 1;
      while (j < w.length && isV(w[j]) && 'iu'.includes(w[j]) && w[j] !== w[j - 1] && !(j + 1 < w.length && 'nm'.includes(w[j + 1]) && !isV(w[j + 2] || '#'))) j++;
      nucleos.push([i, j]); i = j;
    } else i++;
  }
  if (!nucleos.length) return -1;
  if (nucleos.length === 1) return nucleos[0][0];
  const oxitona = /([iu]s?|[iu]ns?|[iu]m|o[mn]s?|[bcdfgjklpqrtvxz]|ps)$/.test(w) && !/(em|ens|am)$/.test(w);
  const k = oxitona ? nucleos.length - 1 : nucleos.length - 2;
  return nucleos[k][0];
}

function palavra(w) {
  if (FIXAS[w] !== undefined) return FIXAS[w];
  if (!/[a-zà-ü]/.test(w)) return '';
  const ton = silabaTonica(w), out = [], N = w.length;
  const push = (p, v, t) => out.push({ p, v: !!v, t: !!t });
  const fimOuCons = j => j >= N || (!isV(w[j]) && w[j] !== 'h');
  let i = 0;
  while (i < N) {
    const c = w[i], n1 = w[i + 1], n2 = w[i + 2], prev = w[i - 1];
    if (isV(c)) {
      const tonica = i === ton;
      if (c === 'ã' && n1 === 'o') { push('ɐ̃', 1, tonica); push('w'); i += 2; continue; }
      if (c === 'ã' && n1 === 'e') { push('ɐ̃', 1, tonica); push('j'); i += 2; continue; }
      if (c === 'õ' && n1 === 'e') { push('õ', 1, tonica); push('j'); i += 2; continue; }
      if (c === 'a' && n1 === 'm' && i + 2 === N) { push('ɐ̃', 1, tonica); push('w'); i += 2; continue; }
      if ('eé'.includes(c) && (n1 === 'm' && i + 2 === N || n1 === 'n' && n2 === 's' && i + 3 === N)) { push('ẽ', 1, tonica); push('j'); i += 2; if (w[i] === 's') { push('s'); i++; } continue; }
      if ((n1 === 'm' || n1 === 'n') && n2 !== 'h' && fimOuCons(i + 2)) {
        const nas = { a: 'ɐ̃', â: 'ɐ̃', á: 'ɐ̃', e: 'ẽ', ê: 'ẽ', é: 'ẽ', i: 'ĩ', í: 'ĩ', o: 'õ', ô: 'õ', ó: 'õ', u: 'ũ', ú: 'ũ' }[c] || c;
        push(nas, 1, tonica); i += 2; continue;
      }
      if ('iu'.includes(c) && isV(prev) && !tonica && !(prev === 'u' && ('qg'.includes(w[i - 2])))) {
        if (!(n1 === 'n' && n2 === 'h')) { push(c === 'i' ? 'j' : 'w'); i++; continue; }
      }
      if (c === 'u' && ('qg'.includes(prev)) && 'eéêiíy'.includes(n1 || '#')) { i++; continue; }
      if (c === 'ü') { push('w'); i++; continue; }
      let p;
      const final = i === N - 1 || (i === N - 2 && n1 === 's');
      switch (c) {
        case 'á': case 'à': p = 'a'; break;
        case 'â': p = 'ɐ'; break;
        case 'ã': p = 'ɐ̃'; break;
        case 'é': p = 'ɛ'; break;
        case 'ê': p = 'e'; break;
        case 'í': p = 'i'; break;
        case 'ó': p = 'ɔ'; break;
        case 'ô': p = 'o'; break;
        case 'õ': p = 'õ'; break;
        case 'ú': p = 'u'; break;
        case 'a': p = !tonica && final ? 'ɐ' : 'a'; break;
        case 'e': p = !tonica && final ? 'ɪ' : 'e'; break;
        case 'o': p = !tonica && final ? 'ʊ' : 'o'; break;
        default: p = c;
      }
      if (c === 'o' && n1 === 'u') { push('o', 1, tonica); push('w'); i += 2; continue; }
      push(p, 1, tonica); i++; continue;
    }
    if (c === 'h') { i++; continue; }
    if (c === 'c' && n1 === 'h') { push('ʃ'); i += 2; continue; }
    if (c === 'l' && n1 === 'h') { push('ʎ'); i += 2; continue; }
    if (c === 'n' && n1 === 'h') { push('ɲ'); i += 2; continue; }
    if (c === 'r' && n1 === 'r') { push('x'); i += 2; continue; }
    if (c === 's' && n1 === 's') { push('s'); i += 2; continue; }
    if (c === 's' && n1 === 'c' && 'eéêií'.includes(n2 || '#')) { push('s'); i += 2; continue; }
    if (c === 'x' && n1 === 'c' && 'eéêií'.includes(n2 || '#')) { push('s'); i += 2; continue; }
    if (c === 'q' && n1 === 'u') { push('k'); if ('aoáó'.includes(n2 || '#')) push('w'); i += 2; continue; }
    if (c === 'g' && n1 === 'u' && 'aoáó'.includes(n2 || '#')) { push('g'); push('w'); i += 2; continue; }
    switch (c) {
      case 'c': push('eéêiíy'.includes(n1 || '#') ? 's' : 'k'); break;
      case 'ç': push('s'); break;
      case 'g': push('eéêiíy'.includes(n1 || '#') ? 'ʒ' : 'g'); break;
      case 'j': push('ʒ'); break;
      case 'r': push(i === 0 || 'nls'.includes(prev) ? 'x' : 'ɾ'); break;
      case 's':
        if (i > 0 && isV(prev) && isV(n1)) push('z');
        else if (i > 0 && i < N - 1 && 'bdgvmnlr'.includes(n1)) push('z');
        else push('s');
        break;
      case 'z': push(i === N - 1 ? 's' : 'z'); break;
      case 'x':
        if (i === 0) push('ʃ');
        else if ((prev === 'e' || prev === 'é') && i === 1 && isV(n1)) push('z');
        else if (i === N - 1) { push('k'); push('s'); }
        else if (!isV(n1)) push('s');
        else push('ʃ');
        break;
      case 'l': push(fimOuCons(i + 1) && i > 0 ? 'w' : 'l'); break;
      case 'm': case 'n': push(c); break;
      case 'w': push('w'); break;
      case 'y': push('i', 1, i === ton); break;
      case 'k': push('k'); break;
      default: if (/[a-z]/.test(c)) push(c);
    }
    i++;
  }
  for (let k = 0; k < out.length - 1; k++) {
    if ((out[k].p === 't' || out[k].p === 'd') && /^[iɪĩ]/.test(out[k + 1].p)) out[k].p = out[k].p === 't' ? 'tʃ' : 'dʒ';
  }
  if (!ATONAS.has(w)) {
    const iv = out.findIndex(x => x.v && x.t);
    if (iv >= 0) {
      let a = iv;
      const cons = x => x && !x.v && !'jw'.includes(x.p);
      if (out[a - 1] && 'w'.includes(out[a - 1].p) && cons(out[a - 2]) && /^[kg]$/.test(out[a - 2].p)) a -= 2;
      else if (cons(out[a - 1])) {
        a--;
        if (cons(out[a - 1]) && /^[lɾ]$/.test(out[a].p) && /^[pbtdkgfv]$/.test(out[a - 1].p)) a--;
      }
      out.splice(a, 0, { p: 'ˈ' });
    }
  }
  return out.map(x => x.p).join('');
}

/* ---------------------------- Texto completo ---------------------------- */
export function phonemizePTBR(texto) {
  const t = normalizar(String(texto || '')).toLowerCase();
  const toks = t.match(/[a-zà-ü]+(?:-[a-zà-ü]+)*|[.,!?;:…]/g) || [];
  const out = [];
  for (const k of toks) {
    if (/^[.,!?;:…]$/.test(k)) { if (out.length) out[out.length - 1] += k === '…' ? '.' : k; continue; }
    const ws = k.split('-').map(palavra).filter(Boolean);
    if (ws.length) out.push(ws.join(' '));
  }
  return out.join(' ');
}
export default phonemizePTBR;
