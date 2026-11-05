/* Analisador: Markdown -> blocos com posição.
   Não interpreta todo o Markdown; separa o que as regras precisam, sempre com as posições do texto original:
   - "máscara": cópia do texto do mesmo tamanho em que código, comentários HTML e o cabeçalho (front matter)
     viram espaços (as quebras de linha ficam). As regras procuram na máscara e relatam posições do texto real.
   - blocos: título, parágrafo (inclui listas, tabelas e citações), código, separador e comentário.
   - slides (apresentação) e comentários (notas da narração).
   Suporta: títulos ATX (# a ######), cercas de código ``` e ~~~, código em linha, comentários HTML,
   cabeçalho --- ... --- da apresentação e separadores --- entre slides (mesmas regras do gerador). */
import { criarLocalizador } from './posicao.js';
import { lerMarcadores } from './marcadores.js';

const RE_CERCA = /^ {0,3}(`{3,}|~{3,})/;
const RE_TITULO = /^ {0,3}(#{1,6})(?=[ \t\r]|$)/;
const RE_SEP = /^ {0,3}---[ \t\r]*$/;
const RE_HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t\r]*$/;

/** Detecta se o texto é uma apresentação (mesmos sinais usados ao importar). */
export function detectarTipo(texto) {
  if (/^---\s*\n[\s\S]*?\n---/.test(texto) || /<!--\s*(class|notas):/.test(texto) || (texto.match(/\n---\s*\n/g) || []).length >= 2) return 'apresentacao';
  return 'apostila';
}

/** Analisa o texto. tipo: 'apostila' | 'apresentacao' | 'narracao' | 'auto'. */
export function analisarEstrutura(texto, tipo = 'auto') {
  texto = String(texto == null ? '' : texto);
  if (tipo === 'auto' || !tipo) tipo = detectarTipo(texto);
  const faixas = [];                                           // trechos mascarados [inicio, fim)
  const loc = criarLocalizador(texto);
  const L = loc.inicios, nL = L.length;
  const fimLinha = (k) => (k + 1 < nL ? L[k + 1] - 1 : texto.length);
  const linha = (k) => texto.slice(L[k], fimLinha(k));
  const montar = (lista) => {                                  // texto com as faixas trocadas por espaços (quebras de linha ficam)
    if (!lista.length) return texto;
    const o = []; let p = 0;
    for (const [a, b] of lista.slice().sort((x, y) => x[0] - y[0])) {
      if (b <= p) continue; const ia = Math.max(a, p);
      o.push(texto.slice(p, ia), texto.slice(ia, b).replace(/[^\n]/g, ' ')); p = b;
    }
    o.push(texto.slice(p)); return o.join('');
  };

  /* 1. cabeçalho (front matter) da apresentação */
  let k0 = 0, cabecalho = null;
  if (tipo === 'apresentacao' && /^---[ \t\r]*$/.test(linha(0))) {
    for (let k = 1; k < nL && k < 200; k++) if (/^---[ \t\r]*$/.test(linha(k))) { cabecalho = { inicio: 0, fim: fimLinha(k) }; faixas.push([0, fimLinha(k)]); k0 = k + 1; break; }
  }

  /* 2. cercas de código */
  const codigos = [];
  for (let k = k0; k < nL; k++) {
    const c = RE_CERCA.exec(linha(k)); if (!c) continue;
    const ch = c[1][0], n = c[1].length; let f = nL - 1;
    for (let j = k + 1; j < nL; j++) { const d = RE_CERCA.exec(linha(j)); if (d && d[1][0] === ch && d[1].length >= n && /^\s*$/.test(linha(j).slice(d[0].length))) { f = j; break; } }
    codigos.push({ k, f, inicio: L[k], fim: fimLinha(f), lingua: linha(k).slice(c[0].length).trim().split(/\s+/)[0] || '' });
    faixas.push([L[k], fimLinha(f)]); k = f;
  }
  const emCodigo = new Uint8Array(nL); codigos.forEach(c => { for (let k = c.k; k <= c.f; k++) emCodigo[k] = 1; });
  const dentroDeFaixa = (() => { const fx = faixas.slice().sort((x, y) => x[0] - y[0]); return (i) => { let a = 0, b = fx.length - 1; while (a <= b) { const m2 = (a + b) >> 1; if (fx[m2][1] <= i) a = m2 + 1; else if (fx[m2][0] > i) b = m2 - 1; else return fx[m2][1]; } return 0; }; })();

  /* 3. comentários HTML fora do código */
  const comentarios = [];
  for (let i = texto.indexOf('<!--'); i >= 0; i = texto.indexOf('<!--', i)) {
    const pula = dentroDeFaixa(i); if (pula) { i = pula; continue; }
    let f = texto.indexOf('-->', i + 4); f = f < 0 ? texto.length : f + 3;
    const corpo = texto.slice(i + 4, Math.max(i + 4, f - 3)), t = /^\s*([a-zçãõáéíóú-]+)\s*:/i.exec(corpo);
    comentarios.push({ inicio: i, fim: f, tipo: t ? t[1].toLowerCase() : '', conteudo: t ? corpo.slice(t[0].length).trim() : corpo.trim(),
      conteudoInicio: i + 4 + (t ? t[0].length : 0) });
    i = f;                                                     // o que está dentro de um comentário não abre outro
  }
  comentarios.forEach(c => faixas.push([c.inicio, c.fim]));
  const ms = montar(faixas);

  /* 4. blocos, títulos e slides */
  const blocos = [], titulos = [], slides = [{ inicio: cabecalho ? cabecalho.fim : 0, fim: texto.length }];
  let atual = null;
  const fechar = () => { if (atual) { atual.fim = fimLinha(atual.kf); blocos.push(atual); atual = null; } };
  const novo = (tipoB, k, extra) => Object.assign({ tipo: tipoB, inicio: L[k], kf: k, linha: k + 1, slide: slides.length - 1 }, extra || {});
  for (let k = k0; k < nL; k++) {
    if (emCodigo[k]) {
      const c = codigos.find(x => x.k === k);
      if (c) { fechar(); blocos.push(Object.assign(novo('codigo', k, { lingua: c.lingua }), { kf: c.f, fim: c.fim })); k = c.f; }
      continue;
    }
    const lm = ms.slice(L[k], fimLinha(k)), lr = linha(k);
    if (!lm.trim()) {                                          // linha vazia ou só comentário
      if (lr.trim()) { if (!atual) atual = novo('comentario', k); else atual.kf = k; }
      else fechar();
      continue;
    }
    if (atual && atual.tipo === 'comentario') fechar();
    if (tipo === 'apresentacao' && RE_SEP.test(lm)) {
      fechar(); slides[slides.length - 1].fim = L[k] > 0 ? L[k] - 1 : 0;
      blocos.push(Object.assign(novo('separador', k), { fim: fimLinha(k) }));
      slides.push({ inicio: fimLinha(k) + (k + 1 < nL ? 1 : 0), fim: texto.length }); continue;
    }
    const t = RE_TITULO.exec(lm);
    if (t) {
      fechar();
      const b = Object.assign(novo('titulo', k, { nivel: t[1].length, marcaInicio: L[k] + t.index + t[0].indexOf('#'), marcaFim: L[k] + t[0].length }), { fim: fimLinha(k) });
      b.slide = slides.length - 1;
      b.texto = lm.slice(t[0].length).replace(/[ \t]+#+[ \t\r]*$/, '').trim();
      blocos.push(b); titulos.push(b); continue;
    }
    if (RE_HR.test(lm)) { fechar(); blocos.push(Object.assign(novo('separador', k), { fim: fimLinha(k) })); continue; }
    if (!atual) atual = novo('paragrafo', k, { sub: /^\s*\|/.test(lm) ? 'tabela' : /^\s*>/.test(lm) ? 'citacao' : /^\s*([-*+]|\d+[.)])\s/.test(lm) ? 'lista' : 'texto' });
    else atual.kf = k;
  }
  fechar();
  blocos.forEach(b => { delete b.kf; });

  /* 5. código em linha dentro dos parágrafos (``...``) */
  for (const b of blocos) {
    if (b.tipo !== 'paragrafo') continue;
    const s = ms.slice(b.inicio, b.fim);
    if (s.indexOf('`') < 0) continue;
    const re = /(`+)([\s\S]*?[^`])\1(?!`)/g;
    for (let x; (x = re.exec(s));) faixas.push([b.inicio + x.index, b.inicio + x.index + x[0].length]);
  }
  const mascara = montar(faixas);
  blocos.forEach(b => { b.mascara = mascara.slice(b.inicio, b.fim); });
  titulos.forEach(b => { b.texto = mascara.slice(b.marcaFim, b.fim).replace(/[ \t]+#+[ \t\r]*$/, '').trim(); });

  /* 6. marcadores: ignorar (bloco seguinte ou documento) e decorativa (imagem seguinte) */
  const marcadores = lerMarcadores(texto).filter(x => comentarios.some(c => c.inicio === x.inicio));
  const ignorarDoc = new Set(), decorativas = new Set();
  for (const x of marcadores) {
    if (x.tipo === 'ignorar-documento') x.regras.forEach(r => ignorarDoc.add(r));
    else if (x.tipo === 'ignorar') {
      const alvo = blocos.find(b => b.tipo !== 'comentario' && b.fim > x.fim && (b.inicio >= x.fim || mascara.slice(x.fim, b.fim).trim()));
      if (alvo) { alvo.ignorar = alvo.ignorar || []; x.regras.forEach(r => alvo.ignorar.push(r)); }
    } else if (x.tipo === 'decorativa') {
      const r = /^\s*!\[/.exec(texto.slice(x.fim, x.fim + 400));
      if (r) decorativas.add(x.fim + r[0].length - 2);
    }
  }
  return { texto, tipo, mascara, local: loc.local, blocos, titulos, slides, comentarios, codigos, cabecalho, marcadores, ignorarDoc, decorativas };
}

/** Procura o ")" que fecha o destino de um link ou imagem, a partir do "(" (aceita parênteses equilibrados). */
export function fecharParenteses(s, abre) {
  let n = 0;
  for (let i = abre; i < s.length; i++) {
    const c = s[i];
    if (c === '\n') return -1;
    if (c === '(') n++;
    else if (c === ')') { n--; if (!n) return i; }
  }
  return -1;
}
