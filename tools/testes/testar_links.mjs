// Links criptografados, ZIP do anexo e diff do histórico: roda as funções reais de web/index.html e web/historico.js no Node.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);
const html = await readFile(new URL('web/index.html', raiz), 'utf8');
const hist = await readFile(new URL('web/historico.js', raiz), 'utf8');
const trecho = (texto, ini, fim) => { const i = texto.indexOf(ini), f = texto.indexOf(fim, i); assert.ok(i >= 0 && f > i, 'trecho não encontrado: ' + ini); return texto.slice(i, f); };

const pastes = new Map();
const fetch = async (url, op = {}) => {
  if (op.method === 'POST') { const id = 'p' + pastes.size; pastes.set(id, JSON.parse(op.body)); return { status: 200, json: async () => ({ status: 0, id, deletetoken: 'del' }) }; }
  const j = pastes.get(new URL(url).searchParams.get('pasteid'));
  return { status: 200, json: async () => (j ? Object.assign({ status: 0 }, j) : { status: 1, message: 'não existe' }) };
};
const fonte = 'const enc = new TextEncoder(), dec = new TextDecoder(), window = {}, $ = () => ({}), log = () => {}, document = { getElementById: () => null, querySelector: () => null };\n'
  + 'const location = { origin: "https://exemplo", pathname: "/" }, PB_LIMITE = 10 * 1024 * 1024;\n'
  + 'const deTexto = t => ({ g: t, s: "" }), restaurarImagens = d => d;\n'
  + trecho(html, 'const b64 =', '/* =========================== Conteúdo')
  + trecho(html, 'async function aesKeyFromPw', '/* =========================== Compartilhar')
  + trecho(hist, 'function myers(', '/* ----')
  + '\nreturn { b58enc, b58dec, zipCriar, zipLer, criarAutocontido, abrirAutocontido, criarPrivateBin, abrirPrivateBin, myers };';
const F = new Function('fetch', fonte)(fetch);
let n = 0;
const ok = async (nome, fn) => { await fn(); n++; console.log('  ok   ' + nome); };
const falha = async (fn, rx) => { await assert.rejects(fn, e => rx.test(e.message)); };

await ok('base58 ida e volta, inclusive com zeros no início', () => {
  for (let t = 0; t < 3000; t++) {
    const k = crypto.getRandomValues(new Uint8Array(32)); if (t % 2) k[0] = 0; if (t % 6 === 1) k[1] = 0;
    assert.deepEqual(F.b58dec(F.b58enc(k), 32), k);
  }
});
const pacote = { p: 'Curso', g: '# Apostila\n\nÁ é ç 😀', s: '# Slide', licenca: 'cc-by-4.0' };
await ok('link autocontido sem senha abre igual', async () => {
  const url = await F.criarAutocontido(pacote, '');
  assert.deepEqual(await F.abrirAutocontido(url.split('#cx=')[1], ''), pacote);
});
await ok('link autocontido com senha abre igual; senha errada ou ausente falha', async () => {
  const frag = (await F.criarAutocontido(pacote, 's3nha')).split('#cx=')[1];
  assert.deepEqual(await F.abrirAutocontido(frag, 's3nha'), pacote);
  await falha(() => F.abrirAutocontido(frag, 'outra'), /senha incorreta/);
  await falha(() => F.abrirAutocontido(frag, ''), /exige senha/);
});
await ok('PrivateBin ida e volta (com e sem senha; pasteid em qualquer posição)', async () => {
  const op = { inst: 'https://pb.exemplo/', expire: '1week', burn: false };
  const r = await F.criarPrivateBin({ paste: 'Texto do paste' }, op);
  assert.equal((await F.abrirPrivateBin(r.url, '')).g, 'Texto do paste');
  const [, id, chave] = r.url.match(/\?(\w+)#(.+)$/);
  assert.equal((await F.abrirPrivateBin('https://pb.exemplo/?lang=pt&pasteid=' + id + '#' + chave, '')).g, 'Texto do paste');
  const r2 = await F.criarPrivateBin({ paste: 'Secreto' }, Object.assign({ pw: 'x' }, op));
  assert.equal((await F.abrirPrivateBin(r2.url, 'x')).g, 'Secreto');
  await falha(() => F.abrirPrivateBin(r2.url, ''), /protegido por senha/);
});
await ok('ZIP: lê o válido, recusa diretório corrompido e bomba de descompactação', async () => {
  const z = await F.zipCriar([{ nome: 'imagens/a.txt', dados: new TextEncoder().encode('a'.repeat(5000)) }]);
  assert.equal((await F.zipLer(z)).get('imagens/a.txt').length, 5000);
  const ruim = z.slice(); new DataView(ruim.buffer).setUint32(ruim.length - 6, 0x7fffffff, true);
  await falha(() => F.zipLer(ruim), /^Anexo ZIP inválido\.$/);
  const bomba = await F.zipCriar([{ nome: 'b', dados: new Uint8Array(70 * 1024 * 1024) }]);
  assert.ok(bomba.length < 200 * 1024);
  await falha(() => F.zipLer(bomba), /grande demais/);
});
await ok('diff: exato no pequeno; textos grandes e diferentes viram troca em bloco sem estourar a memória', () => {
  assert.deepEqual(F.myers(['a', 'b', 'c'], ['a', 'x', 'c']), [['=', 0, 0], ['-', 1, -1], ['+', -1, 1], ['=', 2, 2]]);
  const g = (q, p) => Array.from({ length: q }, (_, k) => p + k);
  const antes = process.memoryUsage().rss, r = F.myers(g(6000, 'x'), g(6000, 'y'));
  assert.equal(r.length, 12000);
  assert.ok(process.memoryUsage().rss - antes < 200 * 1024 * 1024);
  const c = g(3000, 'z'), d = c.slice(); d[1500] = 'mudou';
  assert.equal(F.myers(c, d).filter(o => o[0] !== '=').length, 2);
});
console.log('\n' + n + ' verificações aprovadas, 0 falha(s).');
