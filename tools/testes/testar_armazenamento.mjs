// Testa web/armazenamento.js fora do navegador (SPEC 1.135, seção 6.1).
// Cobre: modo normal sem interferência, modo temporário (localStorage, sessionStorage e IndexedDB
// em memória, cópia só-leitura dos temas, nada gravado no banco real) e o IndexedDB em memória.
// O comportamento no Chrome real é conferido pelo grupo 28 da suíte de navegador.
// Uso: node tools/testes/testar_armazenamento.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const codigo = readFileSync(path.join(raiz, 'web', 'armazenamento.js'), 'utf8');
const SEMENTES = { conteudista: ['temas', 'tema_imagens', 'temas_versoes'] };
let falhas = 0, total = 0;
const ok = (c, m, d) => { total++; if (c) console.log('  ok   ' + m); else { falhas++; console.log('  FALHA ' + m + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } };
const espera = (ms = 20) => new Promise(r => setTimeout(r, ms));

function armazem(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    get length() { return m.size; }, key: i => [...m.keys()][i] ?? null,
    getItem: k => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); }, removeItem: k => { m.delete(String(k)); },
    clear: () => m.clear()
  };
}
function carregar({ local = armazem(), sessao = armazem(), idb, localQuebrado = false, naoConfiguravel = [], navegador = null, href = 'https://exemplo.test/' } = {}) {
  const attrs = {}, historico = [], ctx = {
    console, setTimeout, clearTimeout, structuredClone, DOMException, Blob, URL, recargas: 0, navigator: navegador,
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
    location: { href, search: new URL(href).search, reload() { ctx.recargas++; } },
    history: { state: null, replaceState(_s, _t, valor) { historico.push(valor); ctx.location.href = new URL(valor, ctx.location.href).href; ctx.location.search = new URL(ctx.location.href).search; } }
  };
  const def = (nome, get) => Object.defineProperty(ctx, nome, { configurable: !naoConfiguravel.includes(nome), get });
  def('localStorage', () => { if (localQuebrado) throw new Error('SecurityError'); return local; });
  def('sessionStorage', () => sessao);
  if (idb) def('indexedDB', () => idb);
  vm.createContext(ctx);
  vm.runInContext('this.window = this;', ctx);
  vm.runInContext(codigo.replace('__SEMENTES__', JSON.stringify(SEMENTES)), ctx, { filename: 'armazenamento.js' });
  return { ctx, run: s => vm.runInContext(s, ctx), A: ctx.Armazenamento, local, sessao, attrs, historico };
}

/* ---- auxiliares de IndexedDB (mesmo estilo do aplicativo) ---- */
const abrirBanco = (f, nome, versao, upgrade) => new Promise((res, rej) => {
  const r = f.open(nome, versao);
  r.onupgradeneeded = e => { if (upgrade) upgrade(r.result, e); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = (db, lojas, modo, fn) => new Promise((res, rej) => {
  const t = db.transaction(lojas, modo); let r;
  try { r = fn(t.objectStore(Array.isArray(lojas) ? lojas[0] : lojas)); } catch (e) { rej(e); return; }
  t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
});
const erroDe = async p => { try { await p; return null; } catch (e) { return e && e.name; } };
function esquemaApp(d) {
  const n = [...d.objectStoreNames];
  if (!n.includes('rascunhos')) d.createObjectStore('rascunhos', { keyPath: 'nome' });
  if (!n.includes('links')) d.createObjectStore('links', { keyPath: 'id', autoIncrement: true });
  if (!n.includes('versoes')) d.createObjectStore('versoes', { keyPath: 'id', autoIncrement: true });
  if (!n.includes('temas')) d.createObjectStore('temas', { keyPath: 'id' });
  if (!n.includes('temas_versoes')) d.createObjectStore('temas_versoes', { keyPath: 'id', autoIncrement: true });
  if (!n.includes('tema_imagens')) d.createObjectStore('tema_imagens', { keyPath: 'id' });
}
const fotografia = f => JSON.stringify(Object.entries(f._bancos).map(([n, b]) => [n, b.versao, [...b.lojas].map(([ln, L]) => [ln, L.seq, JSON.stringify([...L.dados.entries()])])]));

const base = carregar();
const novaMemoria = () => base.A._criarMemoriaIDB();

console.log('1. Modo normal: nada é substituído');
{
  const real = novaMemoria(), local = armazem({ 'conteudista.tema': 'govbr' }), sessao = armazem();
  const t = carregar({ local, sessao, idb: real });
  ok(t.A && t.A.anonimo === false && t.A.suportaAnonimo === true && t.A.persistente === true, 'começa no modo normal, com suporte ao temporário');
  ok(t.run('localStorage') === local && t.run('sessionStorage') === sessao && t.run('indexedDB') === real, 'localStorage, sessionStorage e indexedDB continuam os do navegador');
  ok(!('data-anonimo' in t.attrs), 'sem data-anonimo');
  ok(t.A.ler('conteudista.tema') === 'govbr' && t.A.gravar('a', 1) && local.getItem('a') === '1', 'Armazenamento.ler/gravar passam ao navegador');
  ok(t.A.gravarJSON('j', { v: 1 }) && t.A.lerJSON('j').v === 1 && t.A.remover('a') && local.getItem('a') === null, 'JSON e remover');
  ok(await t.A.entrarAnonimo() === true && sessao.getItem('conteudista.anonimo.iniciar') === '1' && t.ctx.recargas === 1, 'entrarAnonimo marca a aba e recarrega');
  ok(await t.A.sairAnonimo() === false, 'sairAnonimo no modo normal não faz nada');
  const sem = carregar({ naoConfiguravel: ['indexedDB'], idb: real });
  ok(sem.A.suportaAnonimo === false && await sem.A.entrarAnonimo() === false && sem.ctx.recargas === 0, 'indexedDB não substituível: sem suporte e sem recarga');
}

console.log('2. Modo temporário: Storage');
{
  const real = novaMemoria();
  const local = armazem({ 'conteudista.tema': 'escuro', 'conteudista.locucao.notas': '{"x":1}', 'narr.on': '1' });
  const sessao = armazem({ 'conteudista.anonimo.iniciar': '1' });
  const t = carregar({ local, sessao, idb: real, navegador: { storage: { persist: () => Promise.resolve(true) } } });
  ok(t.A.anonimo === true && sessao.getItem('conteudista.anonimo.iniciar') === null, 'entra no temporário e consome a marca (recarregar volta ao normal)');
  ok('data-anonimo' in t.attrs && t.A.persistente === false && t.A.erroAnonimo === null, 'html recebe data-anonimo; persistente=false');
  ok(t.run('localStorage') !== local && t.run('indexedDB') !== real, 'localStorage e indexedDB foram substituídos');
  ok(await t.run('navigator.storage.persist()') === false, 'navigator.storage.persist() devolve false');
  t.run("localStorage.setItem('novo', 'v')");
  ok(local.getItem('novo') === null && t.run("localStorage.getItem('novo')") === 'v', 'gravação fica só na memória');
  ok(t.run("localStorage.getItem('conteudista.tema')") === 'escuro', 'preferências existentes continuam valendo');
  ok(t.run("localStorage.getItem('conteudista.locucao.notas')") === null, 'texto salvo antes (notas de locução) não aparece');
  t.run("localStorage.setItem('narr.on', '0')");
  ok(local.getItem('narr.on') === '1' && t.run("localStorage.getItem('narr.on')") === '0', 'alterar preferência não muda o navegador');
  t.run("localStorage.removeItem('conteudista.tema')");
  ok(local.getItem('conteudista.tema') === 'escuro' && t.run("localStorage.getItem('conteudista.tema')") === null, 'remover não apaga do navegador');
  t.run("sessionStorage.setItem('s', '1')");
  ok(sessao.getItem('s') === null && t.run("sessionStorage.getItem('s')") === '1', 'sessionStorage só na memória');
  const ks = t.run('Object.keys(localStorage)');
  ok(ks.includes('novo') && !ks.includes('conteudista.locucao.notas') && !ks.includes('conteudista.tema'), 'chaves visíveis coerentes');
  t.run('localStorage.clear()');
  ok(t.run('localStorage.length') === 0 && local.length === 3, 'clear limpa só a memória');
  ok(await t.A.sairAnonimo() === true && t.ctx.recargas === 1 && await t.A.entrarAnonimo() === false, 'sairAnonimo recarrega; entrarAnonimo não repete no temporário');
}

console.log('3. Modo temporário: IndexedDB em memória e cópia dos temas');
{
  const real = novaMemoria();
  const db0 = await abrirBanco(real, 'conteudista', 3, esquemaApp);
  await tx(db0, 'rascunhos', 'readwrite', s => s.put({ nome: 'Real', g: 'segredo', s: '', data: 1 }));
  await tx(db0, 'versoes', 'readwrite', s => s.put({ rotulo: 'v real', g: 'x' }));
  await tx(db0, 'links', 'readwrite', s => s.put({ url: 'https://exemplo.org/#k' }));
  await tx(db0, 'temas', 'readwrite', s => s.put({ id: 't1', nome: 'Meu tema' }));
  await tx(db0, 'tema_imagens', 'readwrite', s => s.put({ id: 'img1', dados: 'data:image/png;base64,AAAA' }));
  await tx(db0, 'temas_versoes', 'readwrite', s => s.put({ tema_id: 't1', data: 5 }));
  db0.close();
  const outro = await abrirBanco(real, 'conteudista_arquivos', 1, d => d.createObjectStore('pacotes', { keyPath: 'id', autoIncrement: true }));
  await tx(outro, 'pacotes', 'readwrite', s => s.add({ nome: 'Apostila_real.html' }));
  outro.close();
  const antes = fotografia(real), chamadas = [];
  const espiao = { open: (n, v) => { chamadas.push(['open', n, v]); return real.open(n, v); }, deleteDatabase: n => { chamadas.push(['delete', n]); return real.deleteDatabase(n); }, cmp: (a, b) => real.cmp(a, b), databases: () => real.databases() };
  const t = carregar({ sessao: armazem({ 'conteudista.anonimo.iniciar': '1' }), idb: espiao });
  const mem = t.run('indexedDB');
  const db = await abrirBanco(mem, 'conteudista', 3, esquemaApp);
  ok(chamadas.every(c => c[0] === 'open' && c[1] === 'conteudista' && c[2] === undefined), 'o banco real só foi aberto para leitura, sem versão', chamadas);
  ok((await tx(db, 'temas', 'readonly', s => s.getAll())).length === 1 && (await tx(db, 'tema_imagens', 'readonly', s => s.getAll()))[0].id === 'img1', 'temas e imagens de tema copiados');
  ok((await tx(db, 'temas_versoes', 'readonly', s => s.getAll())).length === 1, 'versões de tema copiadas');
  ok((await tx(db, 'rascunhos', 'readonly', s => s.getAll())).length === 0 && (await tx(db, 'versoes', 'readonly', s => s.getAll())).length === 0 && (await tx(db, 'links', 'readonly', s => s.getAll())).length === 0, 'rascunhos, versões e links NÃO aparecem');
  const novoId = await tx(db, 'temas_versoes', 'readwrite', s => s.put({ tema_id: 't1', data: 6 }));
  ok(novoId === 2, 'autoIncrement dos temas continua depois do maior id copiado', novoId);
  await tx(db, 'rascunhos', 'readwrite', s => s.put({ nome: 'Autossalvo', g: 'texto temporário', s: '', data: 2 }));
  await tx(db, 'temas', 'readwrite', s => s.put({ id: 't2', nome: 'Criado no temporário' }));
  await tx(db, 'temas', 'readwrite', s => s['delete']('t1'));
  ok((await tx(db, 'rascunhos', 'readonly', s => s.getAll())).length === 1, 'o que se grava no temporário fica visível no temporário');
  const outroT = await abrirBanco(mem, 'conteudista_arquivos', 1, d => d.createObjectStore('pacotes', { keyPath: 'id', autoIncrement: true }));
  ok((await tx(outroT, 'pacotes', 'readonly', s => s.getAll())).length === 0, 'pacotes gerados anteriores NÃO aparecem');
  await tx(outroT, 'pacotes', 'readwrite', s => s.add({ nome: 'Apostila_temp.html' }));
  const kk = await abrirBanco(mem, 'KokoroTTS_DB', 1, d => { const s = d.createObjectStore('audio_history', { keyPath: 'id', autoIncrement: true }); s.createIndex('lookup_idx', ['text', 'voice', 'speed'], { unique: false }); });
  await tx(kk, 'audio_history', 'readwrite', s => s.add({ text: 'oi', voice: 'v', speed: 1, audioBlob: new Blob(['abc']) }));
  const ach = await tx(kk, 'audio_history', 'readonly', s => s.index('lookup_idx').getAll(['oi', 'v', 1]));
  ok(ach.length === 1 && ach[0].audioBlob instanceof Blob, 'histórico de áudio com índice composto e Blob funciona em memória');
  ok(fotografia(real) === antes, 'o banco real ficou exatamente como estava');
  ok(!chamadas.some(c => c[0] === 'delete') && chamadas.length === 1, 'nenhuma chamada de escrita ou exclusão no banco real', chamadas);
  const dbs = await mem.databases();
  ok(dbs.map(b => b.name).sort().join() === 'KokoroTTS_DB,conteudista,conteudista_arquivos', 'databases() lista só os bancos da sessão temporária', dbs);
  ok(Object.keys(real._bancos).sort().join() === 'conteudista,conteudista_arquivos', 'nenhum banco novo apareceu no real');
}

console.log('4. Sem banco real, banco real lento, falha ao instalar');
{
  const vazio = novaMemoria(), ch = [];
  const esp = { open: (n, v) => { ch.push(n); return vazio.open(n, v); }, deleteDatabase: n => vazio.deleteDatabase(n), cmp: vazio.cmp, databases: vazio.databases };
  const t = carregar({ sessao: armazem({ 'conteudista.anonimo.iniciar': '1' }), idb: esp });
  const db = await abrirBanco(t.run('indexedDB'), 'conteudista', 3, esquemaApp);
  ok((await tx(db, 'temas', 'readonly', s => s.getAll())).length === 0, 'sem banco real: abre vazio');
  await espera(30);
  ok(!(await vazio.databases()).some(b => b.name === 'conteudista'), 'a leitura não criou o banco real (upgrade cancelado)');
  const lento = { open: () => ({}), databases: async () => [] };    // nunca responde
  const t2 = carregar({ sessao: armazem({ 'conteudista.anonimo.iniciar': '1' }), idb: lento });
  const antes = Date.now();
  const db2 = await Promise.race([abrirBanco(t2.run('indexedDB'), 'conteudista', 3, esquemaApp), espera(7000).then(() => null)]);
  ok(!!db2 && Date.now() - antes < 6500, 'banco real que não responde não trava o aplicativo (limite de 5 s)');
  const falha = carregar({ sessao: armazem({ 'conteudista.anonimo.iniciar': '1' }), idb: novaMemoria(), naoConfiguravel: ['sessionStorage'] });
  ok(falha.A.anonimo === false && !!falha.A.erroAnonimo && !('data-anonimo' in falha.attrs), 'não conseguiu isolar: modo temporário não liga e explica o motivo');
  ok(falha.run('localStorage') === falha.local, 'em caso de falha, o localStorage original é mantido');
  const quebrado = carregar({ localQuebrado: true });
  quebrado.run("Armazenamento.gravar('k', 'v')");
  ok(quebrado.A.ler('k') === 'v' && quebrado.A.persistente === false, 'localStorage bloqueado no modo normal: usa memória sem erro');
  const porUrl = carregar({ sessao: armazem(), idb: novaMemoria(), href: 'https://exemplo.test/?x=1&anonimo#cx=abc' });
  ok(porUrl.A.anonimo === true && porUrl.historico[0] === '/?x=1#cx=abc', 'a URL ativa o modo uma vez e preserva query e fragmento');
  const parcial = carregar({ sessao: armazem({ 'conteudista.anonimo.iniciar': '1' }), idb: novaMemoria(), naoConfiguravel: ['sessionStorage'] });
  ok(parcial.run('indexedDB') !== undefined && parcial.run('localStorage') === parcial.local, 'falha parcial restaura os wrappers próprios e mantém armazenamento original');
}

console.log('5. IndexedDB em memória: comportamento');
{
  const f = novaMemoria();
  let antes = [];
  const db = await abrirBanco(f, 'b', 2, (d, e) => { antes.push(e.oldVersion); esquemaApp(d); d.createObjectStore('fora', {}); });
  ok(antes[0] === 0 && db.version === 2 && [...db.objectStoreNames].join() === 'fora,links,rascunhos,tema_imagens,temas,temas_versoes,versoes', 'cria esquema (oldVersion 0) com stores em ordem alfabética');
  ok(db.objectStoreNames.contains('temas') && !db.objectStoreNames.contains('x'), 'objectStoreNames.contains');
  let sobe = [];
  const db2 = await abrirBanco(f, 'b', 3, (d, e) => { sobe.push([e.oldVersion, e.newVersion]); });
  ok(JSON.stringify(sobe) === '[[2,3]]' && db2.version === 3, 'upgrade de versão informa oldVersion e newVersion');
  ok(await erroDe(abrirBanco(f, 'b', 1)) === 'VersionError', 'versão menor falha com VersionError');
  const db3 = await abrirBanco(f, 'b');
  ok(db3.version === 3, 'abrir sem versão usa a existente');
  await tx(db3, 'rascunhos', 'readwrite', s => s.put({ nome: 'B', g: '' }));
  await tx(db3, 'rascunhos', 'readwrite', s => s.put({ nome: 'A', g: '' }));
  ok((await tx(db3, 'rascunhos', 'readonly', s => s.getAll())).map(x => x.nome).join() === 'A,B', 'getAll em ordem de chave');
  ok(await tx(db3, 'rascunhos', 'readonly', s => s.get('A')).then(x => x.nome) === 'A' && (await tx(db3, 'rascunhos', 'readonly', s => s.get('Z'))) === undefined, 'get existente e inexistente');
  ok((await tx(db3, 'rascunhos', 'readonly', s => s.getAllKeys())).join() === 'A,B' && await tx(db3, 'rascunhos', 'readonly', s => s.count()) === 2, 'getAllKeys e count');
  const obj = { nome: 'C', g: 'abc', aninhado: { v: 1 } };
  await tx(db3, 'rascunhos', 'readwrite', s => s.put(obj));
  obj.aninhado.v = 99;
  const lido = await tx(db3, 'rascunhos', 'readonly', s => s.get('C'));
  lido.aninhado.v = 7;
  ok((await tx(db3, 'rascunhos', 'readonly', s => s.get('C'))).aninhado.v === 1, 'valores são copiados ao gravar e ao ler');
  const alvo = { url: 'u' };
  const k1 = await tx(db3, 'links', 'readwrite', s => s.add(alvo));
  const k2 = await tx(db3, 'links', 'readwrite', s => s.add({ url: 'v' }));
  ok(k1 === 1 && k2 === 2 && alvo.id === undefined && (await tx(db3, 'links', 'readonly', s => s.get(1))).id === 1, 'autoIncrement com keyPath grava o id na cópia, não no objeto original');
  await tx(db3, 'links', 'readwrite', s => s.put({ id: 10, url: 'w' }));
  ok(await tx(db3, 'links', 'readwrite', s => s.add({ url: 'x' })) === 11, 'chave explícita maior avança o gerador');
  ok(await erroDe(tx(db3, 'rascunhos', 'readwrite', s => s.add({ nome: 'A' }))) === 'ConstraintError', 'add duplicado falha com ConstraintError');
  const antesDesfaz = (await tx(db3, 'rascunhos', 'readonly', s => s.getAll())).length;
  const e1 = await erroDe(new Promise((res, rej) => {
    const t = db3.transaction('rascunhos', 'readwrite'), s = t.objectStore('rascunhos');
    s.put({ nome: 'Desfeito', g: '' }); s.add({ nome: 'A' });
    t.oncomplete = res; t.onabort = () => rej(t.error);
  }));
  ok(e1 === 'ConstraintError' && (await tx(db3, 'rascunhos', 'readonly', s => s.getAll())).length === antesDesfaz, 'erro dentro da transação desfaz tudo (rollback)');
  await tx(db3, 'rascunhos', 'readwrite', s => s['delete']('C'));
  ok((await tx(db3, 'rascunhos', 'readonly', s => s.get('C'))) === undefined, 'delete');
  await tx(db3, 'rascunhos', 'readwrite', s => s.clear());
  ok(await tx(db3, 'rascunhos', 'readonly', s => s.count()) === 0, 'clear');
  const fora = await abrirBanco(f, 'k', 1, d => { d.createObjectStore('s'); });
  await tx(fora, 's', 'readwrite', s => s.put('valor', 'chave'));
  ok(await tx(fora, 's', 'readonly', s => s.get('chave')) === 'valor' && await erroDe(tx(fora, 's', 'readwrite', s => s.put('x'))) === 'DataError', 'store sem keyPath exige chave');
  ok(await erroDe(tx(db3, 'rascunhos', 'readwrite', s => s.put({ nome: 'x' }, 'k'))) === 'DataError', 'chave informada com keyPath é DataError');
  const ix = await abrirBanco(f, 'ix', 1, d => {
    const s = d.createObjectStore('a', { keyPath: 'id', autoIncrement: true });
    s.createIndex('comp', ['t', 'v', 'n'], { unique: false }); s.createIndex('u', 'email', { unique: true });
  });
  await tx(ix, 'a', 'readwrite', s => s.add({ t: 'oi', v: 'x', n: 1, email: 'a@a' }));
  await tx(ix, 'a', 'readwrite', s => s.add({ t: 'oi', v: 'x', n: 1, email: 'b@a' }));
  await tx(ix, 'a', 'readwrite', s => s.add({ t: 'oi', v: 'x', n: 2 }));
  ok((await tx(ix, 'a', 'readonly', s => s.index('comp').getAll(['oi', 'x', 1]))).length === 2 && (await tx(ix, 'a', 'readonly', s => s.index('comp').getAll(['oi', 'x', 3]))).length === 0, 'índice composto');
  ok((await tx(ix, 'a', 'readonly', s => s.index('u').getAll())).length === 2, 'registros sem a chave do índice ficam fora dele');
  ok(await erroDe(tx(ix, 'a', 'readwrite', s => s.add({ t: 'z', email: 'a@a' }))) === 'ConstraintError', 'índice único recusa duplicado');
  ok((await tx(ix, 'a', 'readonly', s => s.index('u').get('b@a'))).id === 2 && await tx(ix, 'a', 'readonly', s => s.index('comp').count(['oi', 'x', 1])) === 2, 'index.get e count');
  ok(await erroDe(Promise.resolve().then(() => ix.transaction('a', 'readonly').objectStore('a').put({ t: 1 }))) === 'ReadOnlyError', 'escrita em transação somente leitura lança ReadOnlyError');
  ok(await erroDe(Promise.resolve().then(() => ix.transaction('naoexiste'))) === 'NotFoundError', 'store inexistente lança NotFoundError');
  const velho = await new Promise(res => { const t = ix.transaction('a', 'readonly'); t.oncomplete = () => res(t); t.objectStore('a').getAll(); });
  ok(await erroDe(Promise.resolve().then(() => velho.objectStore('a').getAll())) === 'TransactionInactiveError', 'transação concluída lança TransactionInactiveError');
  ok(await erroDe(Promise.resolve().then(() => ix.transaction('a').objectStore('a').openCursor())) === 'NotSupportedError', 'cursor não suportado avisa em vez de falhar em silêncio');
  const ordem = [];
  await new Promise(res => {
    const t = ix.transaction('a', 'readwrite'), s = t.objectStore('a');
    s.add({ t: 'enc1' }).onsuccess = () => { ordem.push('1'); s.add({ t: 'enc2' }).onsuccess = () => ordem.push('2'); };
    t.oncomplete = () => { ordem.push('fim'); res(); };
  });
  ok(ordem.join() === '1,2,fim', 'requisições feitas dentro de handlers entram na mesma transação');
  let abortou = null, relatado = null;
  const captura = e => { relatado = e; };
  process.once('uncaughtException', captura);                       // o erro do handler é relatado, como no navegador
  const up = f.open('ruim', 1); up.onupgradeneeded = () => { throw new Error('falha de migração'); }; up.onerror = () => { abortou = up.error && up.error.name; };
  await espera(50);
  process.removeListener('uncaughtException', captura);
  ok(!!relatado && /falha de migração/.test(relatado.message), 'a exceção do handler continua sendo relatada (não é engolida)');
  ok(abortou === 'AbortError' && !(await f.databases()).some(b => b.name === 'ruim'), 'erro no upgrade cancela e não deixa banco pela metade');
  let vc = 0;
  const velhoConn = await abrirBanco(f, 'vc', 1, d => d.createObjectStore('x', {}));
  velhoConn.onversionchange = () => { vc++; velhoConn.close(); };
  await abrirBanco(f, 'vc', 2, () => {});
  ok(vc === 1, 'conexões abertas recebem versionchange antes do upgrade');
  const apaga = await new Promise(res => { const r = f.deleteDatabase('vc'); r.onsuccess = () => res(true); });
  ok(apaga && !(await f.databases()).some(b => b.name === 'vc') && f.cmp(1, 2) === -1 && f.cmp('a', 1) === 1 && f.cmp([1, 2], [1, 3]) === -1, 'deleteDatabase, databases() e cmp');
}

console.log(falhas ? `RESULTADO: ${falhas} falha(s) em ${total}` : `RESULTADO: OK (${total} verificações)`);
process.exit(falhas ? 1 : 0);
