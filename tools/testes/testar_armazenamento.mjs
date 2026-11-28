// Testa web/armazenamento.js fora do navegador (SPEC 1.135, seção 6.1): modo normal, anônimo,
// cópia dos temas para o banco temporário, armazenamento bloqueado e limpeza.
// Uso: node tools/testes/testar_armazenamento.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const codigo = readFileSync(path.join(raiz, 'web', 'armazenamento.js'), 'utf8');
let falhas = 0, total = 0;
const ok = (c, m) => { total++; if (c) console.log('  ok   ' + m); else { falhas++; console.log('  FALHA ' + m); } };
const espera = (ms = 10) => new Promise(r => setTimeout(r, ms));

function armazem(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    get length() { return m.size; }, key: i => [...m.keys()][i] ?? null,
    getItem: k => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); }, removeItem: k => { m.delete(String(k)); },
    clear: () => m.clear()
  };
}

// IndexedDB mínimo em memória (open/upgrade/transaction/getAll/getAllKeys/put/databases/deleteDatabase).
function idbFalso() {
  const bancos = new Map(), abertos = [], apagados = [];
  const lista = a => Object.assign([...a], { contains: n => a.includes(n) });
  const assinc = f => setTimeout(f, 0);
  function req(fn) { const r = { result: undefined, error: null }; assinc(() => { try { r.result = fn(); r.onsuccess && r.onsuccess({ target: r }); } catch (e) { r.error = e; r.onerror && r.onerror({ target: r }); } }); return r; }
  function conexao(b) {
    return {
      get name() { return b.nome; }, get version() { return b.versao; },
      get objectStoreNames() { return lista([...b.lojas.keys()]); },
      createObjectStore(n, op = {}) {
        const L = { keyPath: op.keyPath ?? null, autoIncrement: !!op.autoIncrement, dados: new Map(), seq: 0, indices: new Map() };
        b.lojas.set(n, L);
        return { createIndex(i, kp, o = {}) { L.indices.set(i, { keyPath: kp, unique: !!o.unique, multiEntry: !!o.multiEntry }); } };
      },
      transaction(nomes) {
        const tx = {
          objectStore(n) {
            const L = b.lojas.get(n);
            return {
              keyPath: L.keyPath, autoIncrement: L.autoIncrement, indexNames: lista([...L.indices.keys()]),
              index: i => L.indices.get(i),
              getAll: () => req(() => [...L.dados.values()]),
              getAllKeys: () => req(() => [...L.dados.keys()]),
              put(v, k) { const ch = L.keyPath ? v[L.keyPath] : (k ?? ++L.seq); L.dados.set(ch, structuredClone(v)); return req(() => ch); }
            };
          }
        };
        setTimeout(() => tx.oncomplete && tx.oncomplete(), 5);
        void nomes; return tx;
      },
      close() {}
    };
  }
  return {
    bancos, abertos, apagados,
    open(nome, versao) {
      abertos.push(nome);
      const r = { result: null, error: null, transaction: null };
      assinc(() => {
        let b = bancos.get(nome), novo = false;
        if (!b) { b = { nome, versao: 0, lojas: new Map() }; novo = true; }
        const alvo = versao ?? (b.versao || 1);
        if (alvo > b.versao) {
          let abortado = false;
          r.transaction = { abort() { abortado = true; } };
          r.result = conexao(b);
          const antes = b.versao; b.versao = alvo;
          if (novo) bancos.set(nome, b);
          r.onupgradeneeded && r.onupgradeneeded({ target: r, oldVersion: antes });
          if (abortado) { if (novo) bancos.delete(nome); else b.versao = antes; r.error = new Error('AbortError'); r.onerror && r.onerror({ target: r }); return; }
        }
        r.result = conexao(b);
        r.onsuccess && r.onsuccess({ target: r });
      });
      return r;
    },
    deleteDatabase(n) { apagados.push(n); bancos.delete(n); return {}; },
    cmp: () => 0,
    databases: async () => [...bancos.values()].map(b => ({ name: b.nome, version: b.versao }))
  };
}
function popular(idb, nome, versao, lojas) {
  return new Promise(res => {
    const r = idb.open(nome, versao);
    r.onupgradeneeded = () => { for (const [n, op] of Object.entries(lojas)) { const st = r.result.createObjectStore(n, op.op); (op.indices || []).forEach(i => st.createIndex(i, i)); } };
    r.onsuccess = () => {
      const db = r.result, tx = db.transaction(Object.keys(lojas), 'readwrite');
      for (const [n, op] of Object.entries(lojas)) for (const [k, v] of op.dados || []) tx.objectStore(n).put(v, op.op.keyPath ? undefined : k);
      tx.oncomplete = () => res();
    };
  });
}
function ler(idb, nome, loja) {
  return new Promise(res => {
    const b = idb.bancos.get(nome);
    res(b && b.lojas.get(loja) ? [...b.lojas.get(loja).dados.values()] : null);
  });
}

function carregar({ local = armazem(), sessao = armazem(), idb = idbFalso(), localQuebrado = false, sementes = { conteudista: ['temas', 'tema_imagens', 'temas_versoes'] } } = {}) {
  const ev = {}, attrs = {};
  const ctx = {
    console, setTimeout, structuredClone, recargas: 0,
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
    location: { reload() { ctx.recargas++; } },
    addEventListener: (t, f) => { (ev[t] = ev[t] || []).push(f); }
  };
  Object.defineProperty(ctx, 'localStorage', { configurable: true, get() { if (localQuebrado) throw new Error('SecurityError'); return local; } });
  Object.defineProperty(ctx, 'sessionStorage', { configurable: true, get() { return sessao; } });
  Object.defineProperty(ctx, 'indexedDB', { configurable: true, get() { return idb; } });
  vm.createContext(ctx);
  vm.runInContext('this.window = this;', ctx);
  const fonte = codigo.includes('__SEMENTES__') ? codigo.replace('__SEMENTES__', JSON.stringify(sementes)) : codigo;
  vm.runInContext(fonte, ctx, { filename: 'armazenamento.js' });
  return { ctx, run: s => vm.runInContext(s, ctx), A: ctx.Armazenamento, local, sessao, idb, ev, attrs };
}

console.log('1. Modo normal');
{
  const t = carregar({ local: armazem({ 'conteudista.tema': 'govbr' }) });
  ok(t.A && t.A.suportaAnonimo === true && t.A.anonimo === false, 'instala e começa no modo normal');
  ok(t.run('localStorage') === t.A.local, 'localStorage passa pela camada do módulo');
  t.run("localStorage.setItem('a', 1)");
  ok(t.local.getItem('a') === '1', 'gravação chega ao armazenamento do navegador');
  ok(t.run("localStorage.getItem('conteudista.tema')") === 'govbr' && t.run('localStorage.length') === 2, 'leitura e length repassados');
  ok(t.run("localStorage['conteudista.tema']") === 'govbr' && t.run('localStorage.inexistente') === undefined, 'acesso por propriedade igual ao Storage');
  t.run("localStorage.removeItem('a')");
  ok(t.local.getItem('a') === null, 'removeItem repassado');
  t.run("indexedDB.open('conteudista', 3)");
  ok(t.idb.abertos.at(-1) === 'conteudista', 'IndexedDB usa o nome original');
  ok(t.A.ler('x', 'p') === 'p' && t.A.gravarJSON('j', { v: 1 }) && t.A.lerJSON('j').v === 1, 'ler/gravar/lerJSON/gravarJSON');
  ok(t.attrs['data-anonimo'] === undefined, 'sem data-anonimo no modo normal');
}

console.log('2. Entrar no anônimo copia só os temas');
let idSessao = '', idbCompart = null;
{
  const idb = idbFalso();
  await popular(idb, 'conteudista', 4, {
    temas: { op: { keyPath: 'id' }, indices: ['nome'], dados: [[1, { id: 't1', nome: 'Meu tema' }]] },
    tema_imagens: { op: {}, dados: [['logo', { b: 'png' }]] },
    temas_versoes: { op: { keyPath: 'id', autoIncrement: true }, dados: [] },
    rascunhos: { op: { keyPath: 'id' }, dados: [[1, { id: 'r1', texto: 'segredo' }]] },
    versoes: { op: { keyPath: 'id' }, dados: [[1, { id: 'v1' }]] },
    links: { op: { keyPath: 'id' }, dados: [[1, { id: 'l1' }]] }
  });
  const sessao = armazem();
  const t = carregar({ idb, sessao });
  await t.A._limpezaInicial;
  const r = await t.A.entrarAnonimo();
  idSessao = sessao.getItem('conteudista.anonimo.iniciar') || '';
  ok(r === true && /^[a-z0-9]{6,32}$/.test(idSessao) && t.ctx.recargas === 1, 'marca a aba com o id da sessão e recarrega');
  const temp = 'conteudista-anonimo.' + idSessao + '.conteudista';
  const b = idb.bancos.get(temp);
  ok(!!b && b.versao === 4, 'banco temporário criado com a mesma versão');
  ok(b && ['temas', 'tema_imagens', 'temas_versoes', 'rascunhos', 'versoes', 'links'].every(n => b.lojas.has(n)), 'esquema completo copiado (app não precisa de upgrade)');
  ok(b && b.lojas.get('temas').indices.has('nome'), 'índices copiados');
  ok((await ler(idb, temp, 'temas'))[0].nome === 'Meu tema' && (await ler(idb, temp, 'tema_imagens')).length === 1, 'temas e imagens de tema copiados');
  ok((await ler(idb, temp, 'rascunhos')).length === 0 && (await ler(idb, temp, 'versoes')).length === 0 && (await ler(idb, temp, 'links')).length === 0, 'rascunhos, versões e links NÃO copiados');
  ok((await ler(idb, 'conteudista', 'rascunhos')).length === 1, 'banco real intacto');
  idbCompart = idb;
}

console.log('3. Modo anônimo');
{
  const local = armazem({ 'conteudista.tema': 'escuro', 'conteudista.locucao.notas': '{"x":1}', 'narr.on': '1' });
  const sessao = armazem({ 'conteudista.anonimo.iniciar': idSessao });
  const t = carregar({ local, sessao, idb: idbCompart });
  ok(t.A.anonimo === true && sessao.getItem('conteudista.anonimo.iniciar') === null, 'entra no anônimo e consome a marca (recarregar volta ao normal)');
  ok('data-anonimo' in t.attrs && t.A.persistente === false, 'html recebe data-anonimo; persistente = false');
  t.run("localStorage.setItem('novo', 'v')");
  ok(local.getItem('novo') === null && t.run("localStorage.getItem('novo')") === 'v', 'gravação fica só na memória');
  ok(t.run("localStorage.getItem('conteudista.tema')") === 'escuro', 'preferências existentes continuam valendo');
  ok(t.run("localStorage.getItem('conteudista.locucao.notas')") === null, 'conteúdo salvo antes não aparece');
  t.run("localStorage.setItem('narr.on', '0')");
  ok(local.getItem('narr.on') === '1' && t.run("localStorage.getItem('narr.on')") === '0', 'alterar preferência não muda o navegador');
  t.run("localStorage.removeItem('conteudista.tema')");
  ok(local.getItem('conteudista.tema') === 'escuro' && t.run("localStorage.getItem('conteudista.tema')") === null, 'remover não apaga do navegador');
  t.run("sessionStorage.setItem('s', '1')");
  ok(sessao.getItem('s') === null && t.run("sessionStorage.getItem('s')") === '1', 'sessionStorage também só na memória');
  const ks = t.run('Object.keys(localStorage)');
  ok(ks.includes('novo') && !ks.includes('conteudista.locucao.notas') && !ks.includes('conteudista.tema'), 'chaves visíveis coerentes');
  t.run('localStorage.clear()');
  ok(t.run('localStorage.length') === 0 && local.length === 3, 'clear limpa só a memória');
  await t.A._limpezaInicial;
  const temp = 'conteudista-anonimo.' + idSessao + '.conteudista';
  ok(idbCompart.bancos.has(temp), 'limpeza inicial preserva o banco desta sessão');
  t.run("indexedDB.open('conteudista', 4)");
  ok(idbCompart.abertos.at(-1) === temp, 'banco conteudista abre o temporário com os temas');
  t.run("indexedDB.open('KokoroTTS_DB', 1)");
  ok(idbCompart.abertos.at(-1) === 'conteudista-anonimo.' + idSessao + '.KokoroTTS_DB', 'outros bancos também temporários');
  await espera();
  const dbs = await t.run('indexedDB.databases()');
  ok(dbs.some(b => b.name === 'conteudista') && dbs.every(b => !b.name.startsWith('conteudista-anonimo.')), 'databases() mostra nomes lógicos');
  ok(Array.isArray(t.ev.pagehide) && t.ev.pagehide.length === 1, 'limpeza registrada ao fechar a aba');
  ok(await t.A.entrarAnonimo() === false, 'entrarAnonimo não repete');
  const saiu = await t.A.sairAnonimo();
  ok(saiu === true && idbCompart.apagados.includes(temp) && t.ctx.recargas === 1, 'sairAnonimo apaga os bancos temporários e recarrega');
  ok(idbCompart.bancos.has('conteudista'), 'banco real continua');
}

console.log('4. Limpeza e falhas');
{
  const idb = idbFalso();
  await popular(idb, 'conteudista-anonimo.velha.conteudista', 1, { temas: { op: { keyPath: 'id' } } });
  await popular(idb, 'conteudista', 1, { temas: { op: { keyPath: 'id' } } });
  const t = carregar({ idb });
  await t.A._limpezaInicial; await espera();
  ok(idb.apagados.includes('conteudista-anonimo.velha.conteudista') && !idb.apagados.includes('conteudista'), 'bancos temporários órfãos são apagados ao abrir');
  const vazio = idbFalso(), t3 = carregar({ idb: vazio, sessao: armazem() });
  ok(await t3.A.entrarAnonimo() === true && !vazio.bancos.has('conteudista'), 'sem banco real: entra sem criar banco');
  let erro = null, t2 = null;
  try { t2 = carregar({ localQuebrado: true }); t2.run("localStorage.setItem('k', 'v')"); } catch (e) { erro = e; }
  ok(!erro && t2.run("localStorage.getItem('k')") === 'v' && t2.A.persistente === false, 'armazenamento bloqueado: usa memória sem erro');
  const antes = t.A;
  vm.runInContext(codigo.replace('__SEMENTES__', '{}'), t.ctx);
  ok(t.ctx.Armazenamento === antes, 'carregar duas vezes não reinstala');
}

console.log(falhas ? `RESULTADO: ${falhas} falha(s) em ${total}` : `RESULTADO: OK (${total} verificações)`);
process.exit(falhas ? 1 : 0);
