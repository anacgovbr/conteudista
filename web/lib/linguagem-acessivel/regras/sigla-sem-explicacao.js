import { visivel } from '../nucleo/frases.js';
import { trechosEmMaiusculas } from './texto-em-maiusculas.js';

// Palavras comuns que às vezes são escritas em maiúsculas para dar ênfase (não são siglas).
const PALAVRAS = new Set(('nao sim nunca sempre todos todas todo toda nada fim novo nova ate mais menos deve pode atencao importante aviso ' +
  'obs nota dica prazo hoje agora aqui ou e o a os as de da do um uma para com sem por que se ok nem ja ver veja').split(' '));
const ROMANO = /^(?=[IVXLCDM]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const semAcento = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Candidatas a sigla num trecho já limpo: [{i, f, sigla}] */
const RE_CAND = /(?<![\p{L}\p{N}])\p{Lu}{2,6}\d{0,3}s?(?![\p{L}\p{N}])/gu;
export function candidatas(vis, siglas) {
  const r = [];
  if (!/\p{Lu}{2}/u.test(vis)) return r;                             // atalho: nenhuma sequência de maiúsculas
  let caixa = null;
  for (const m of vis.matchAll(RE_CAND)) {
    const w = m[0];
    if (!caixa) { caixa = new Set(); for (const run of trechosEmMaiusculas(vis)) run.forEach(t => caixa.add(t.i)); }
    if (caixa.has(m.index)) continue;
    if (w !== semAcento(w)) continue;                                   // siglas quase nunca têm acento
    const sigla = /^[A-Z]+\d*s$/.test(w) && w.length > 2 ? w.slice(0, -1) : w;
    if (ROMANO.test(sigla) || PALAVRAS.has(sigla.toLowerCase()) || siglas.conhecida(sigla)) continue;
    r.push({ i: m.index, f: m.index + w.length, sigla });
  }
  return r;
}
// A ocorrência já vem explicada? "Nome completo (SIGLA)", "SIGLA (Nome completo)" ou "SIGLA – Nome completo"
function explicada(vis, i, f) {
  const depois = vis.slice(f, f + 80), antes = vis.slice(Math.max(0, i - 2), i);
  if (/^\s*\(\s*\p{L}[\p{L}\p{N} ,'’-]*\p{Ll}/u.test(depois)) return true;
  if (/\(\s*$/.test(antes) && /\p{L}\p{L}/u.test(vis.slice(Math.max(0, i - 40), i))) return true;
  if (/^\s*[–—-]\s+\p{Lu}\p{Ll}/u.test(depois)) return true;
  return false;
}

export default {
  id: 'sigla-sem-explicacao', codigo: 's1', area: 'linguagem', grupo: 'siglas', nivel: 'sugestao', escopo: 'documento',
  referencia: { wcag: ['3.1.4'], lei: ['Lei 15.263/2025'] },
  exemplos: [
    { ruim: 'O pedido segue o RBAC 145.', bom: 'O pedido segue o Regulamento Brasileiro da Aviação Civil (RBAC) 145. Depois, o RBAC define os prazos.' },
    { ruim: 'O XYZW publica as regras. A Comissão Técnica (XYZW) revisa.', bom: 'A Comissão Técnica (XYZW) publica as regras. O XYZW revisa.' },
    { ruim: null, bom: 'Baixe o PDF e o arquivo ZIP. Leia o capítulo IV.' },
    { ruim: null, bom: 'NÃO envie o pedido antes do prazo.' },
  ],
  verificar(c) {
    const vistos = new Map();                                         // sigla -> {i, f, explicada, bloco}
    for (const b of c.doc.blocos) {
      if (b.tipo !== 'paragrafo' || b.ignorar && (b.ignorar.includes('s1') || b.ignorar.includes('sigla-sem-explicacao'))) {
        if (b.tipo === 'paragrafo') { const vis = visivel(b); candidatas(vis, c.siglas).forEach(x => { if (!vistos.has(x.sigla)) vistos.set(x.sigla, { ignorada: true }); }); }
        continue;
      }
      const vis = visivel(b);
      for (const x of candidatas(vis, c.siglas)) {
        const exp = explicada(vis, x.i, x.f), v = vistos.get(x.sigla);
        if (!v) vistos.set(x.sigla, { inicio: b.inicio + x.i, fim: b.inicio + x.f, explicada: exp, depois: null });
        else if (!v.ignorada && !v.explicada && !v.depois && exp) v.depois = b.inicio + x.i;
      }
    }
    for (const [sigla, v] of vistos) {
      if (v.ignorada || v.explicada) continue;
      const nome = c.siglas.nome(sigla), correcoes = [];
      if (nome) correcoes.push({ id: 'explicar', segura: false, edicoes: [{ inicio: v.inicio, fim: v.inicio, texto: nome + ' (' }, { inicio: v.fim, fim: v.fim, texto: ')' }] });
      else correcoes.push({ id: 'explicar', acao: 'explicar-sigla', alvo: { inicio: v.inicio, fim: v.fim }, segura: false });
      c.relatar(v.inicio, v.fim, { variante: v.depois != null ? 'depois' : 'nunca', dados: { sigla, linha: v.depois != null ? c.doc.local(v.depois).linha : '' }, correcoes });
    }
  },
};
