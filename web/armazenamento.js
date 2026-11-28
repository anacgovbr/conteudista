/* =====================================================================================
   Conteudista: módulo Armazenamento (SPEC 1.135, seção 6.1).
   Carregado antes de todos os outros scripts. Toda leitura e gravação local passa por aqui:
   localStorage, sessionStorage e indexedDB são substituídos por camadas deste módulo.
   - Modo normal: repassa tudo ao armazenamento do navegador (mesmo comportamento de antes).
   - Modo anônimo: nada é gravado no navegador. Gravações ficam só na memória da aba;
     preferências existentes continuam sendo lidas; conteúdo anterior não aparece.
     Todo banco IndexedDB vira banco temporário da sessão, apagado ao sair. Ao entrar,
     os stores de temas (SEMENTES) são copiados para o temporário: os temas do usuário
     continuam disponíveis, mas rascunhos, versões, links e arquivos gerados não.
   - Sem armazenamento disponível (navegador bloqueado): usa memória, sem erros.
   O modo anônimo começa e termina com recarga da página (entrarAnonimo / sairAnonimo),
   para que nenhuma conexão aberta antes continue gravando nos bancos normais.
   ===================================================================================== */
(function (G) {
  'use strict';
  if (!G || G.Armazenamento) return;

  var FLAG = 'conteudista.anonimo.iniciar';
  var PREFIXO_DB = 'conteudista-anonimo.';
  // Stores copiados para o banco temporário ao entrar no modo anônimo (temas do usuário).
  var SEMENTES = {'conteudista': ['tema_imagens', 'temas', 'temas_versoes']};
  var LIMITE_COPIA_MS = 5000;
  // Chaves de conteúdo: no modo anônimo começam vazias (não mostram o que foi salvo antes).
  var OCULTAS_NO_ANONIMO = ['conteudista.locucao.notas', 'conteudista.keep'];

  function descritor(nome) {
    for (var o = G; o; o = Object.getPrototypeOf(o)) {
      var d = Object.getOwnPropertyDescriptor(o, nome);
      if (d) return d;
    }
    return null;
  }
  function original(nome) {
    var d = descritor(nome);
    if (!d) return null;
    try { return (d.get ? d.get.call(G) : d.value) || null; } catch (e) { return null; }
  }
  function utilizavel(s) { try { s.getItem('__conteudista__'); return true; } catch (e) { return false; } }

  var realLocal = original('localStorage'), realSessao = original('sessionStorage'), realIDB = original('indexedDB');
  if (realLocal && !utilizavel(realLocal)) realLocal = null;
  if (realSessao && !utilizavel(realSessao)) realSessao = null;

  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  var sessao = novoId();
  var anonimo = false;
  try {
    var marca = realSessao && realSessao.getItem(FLAG);
    if (marca) { anonimo = true; if (/^[a-z0-9]{6,32}$/.test(marca)) sessao = marca; realSessao.removeItem(FLAG); }
  } catch (e) { /* */ }

  function camada(base, ocultasIniciais) {
    var mem = new Map(), ocultas = new Set(ocultasIniciais || []), tudoOculto = false;
    function usaMem() { return anonimo || !base; }
    function chaves() {
      var c = [];
      if (base && !(usaMem() && tudoOculto)) {
        try {
          for (var i = 0; i < base.length; i++) {
            var k = base.key(i);
            if (k !== null && !(usaMem() && ocultas.has(k))) c.push(k);
          }
        } catch (e) { /* */ }
      }
      if (usaMem()) mem.forEach(function (v, k) { if (c.indexOf(k) < 0) c.push(k); });
      return c;
    }
    var api = {
      getItem: function (k) {
        k = String(k);
        if (usaMem()) {
          if (mem.has(k)) return mem.get(k);
          if (!base || tudoOculto || ocultas.has(k)) return null;
        }
        try { return base.getItem(k); } catch (e) { return null; }
      },
      setItem: function (k, v) {
        k = String(k); v = String(v);
        if (usaMem()) { mem.set(k, v); ocultas.delete(k); return; }
        base.setItem(k, v);
      },
      removeItem: function (k) {
        k = String(k);
        if (usaMem()) { mem.delete(k); ocultas.add(k); return; }
        base.removeItem(k);
      },
      clear: function () {
        if (usaMem()) { mem.clear(); ocultas.clear(); tudoOculto = true; return; }
        base.clear();
      },
      key: function (i) { var c = chaves(); i = Number(i); return i >= 0 && i < c.length ? c[i] : null; }
    };
    var proxy = new Proxy(api, {
      get: function (t, p) {
        if (p === 'length') return chaves().length;
        if (typeof p === 'symbol' || Object.prototype.hasOwnProperty.call(t, p)) return t[p];
        var v = api.getItem(p); return v === null ? undefined : v;
      },
      set: function (t, p, v) { if (typeof p !== 'symbol') api.setItem(p, v); return true; },
      deleteProperty: function (t, p) { if (typeof p !== 'symbol') api.removeItem(p); return true; },
      has: function (t, p) { return Object.prototype.hasOwnProperty.call(t, p) || (typeof p !== 'symbol' && api.getItem(p) !== null); },
      ownKeys: function () { return chaves(); },
      getOwnPropertyDescriptor: function (t, p) {
        if (typeof p === 'symbol' || Object.prototype.hasOwnProperty.call(t, p)) return undefined;
        var v = api.getItem(p);
        return v === null ? undefined : { value: v, writable: true, enumerable: true, configurable: true };
      }
    });
    return { api: api, proxy: proxy };
  }

  var L = camada(realLocal, anonimo ? OCULTAS_NO_ANONIMO : []);
  var S = camada(realSessao, []);

  function anonimoDB() { return anonimo; }
  function nomeTemp(id, n) { return PREFIXO_DB + id + '.' + n; }
  function nomeBanco(n) { return anonimoDB(n) ? nomeTemp(sessao, n) : String(n); }
  function pedido(r) { return new Promise(function (ok, erro) { r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); }; }); }

  // Copia esquema completo e os stores-semente de um banco real para o banco temporário id.
  function abrirExistente(nome) {
    return new Promise(function (ok) {
      var r;
      try { r = realIDB.open(nome); } catch (e) { ok(null); return; }
      r.onupgradeneeded = function () { try { r.transaction.abort(); } catch (e) { /* */ } };  // não existia: não cria
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ok(null); };
      r.onblocked = function () { ok(null); };
    });
  }
  function copiarBanco(nome, id) {
    return abrirExistente(nome).then(function (db) {
      if (!db) return 0;
      var lojas = Array.prototype.slice.call(db.objectStoreNames || []);
      if (!lojas.length) { db.close(); return 0; }
      var tx = db.transaction(lojas, 'readonly'), esquema = [];
      lojas.forEach(function (s) {
        var st = tx.objectStore(s);
        esquema.push({
          nome: s, keyPath: st.keyPath, autoIncrement: st.autoIncrement,
          indices: Array.prototype.slice.call(st.indexNames || []).map(function (i) {
            var x = st.index(i); return { nome: i, keyPath: x.keyPath, unique: x.unique, multiEntry: x.multiEntry };
          })
        });
      });
      var sementes = (SEMENTES[nome] || []).filter(function (s) { return lojas.indexOf(s) >= 0; });
      return Promise.all(sementes.map(function (s) {
        return Promise.all([pedido(tx.objectStore(s).getAll()), pedido(tx.objectStore(s).getAllKeys())])
          .then(function (r) { return { nome: s, valores: r[0], chaves: r[1] }; });
      })).then(function (dados) {
        var versao = db.version; db.close();
        return gravarTemp(nomeTemp(id, nome), versao, esquema, dados);
      }, function () { db.close(); return 0; });
    });
  }
  function gravarTemp(nome, versao, esquema, dados) {
    return new Promise(function (ok) {
      var r = realIDB.open(nome, versao);
      r.onupgradeneeded = function () {
        var db = r.result;
        esquema.forEach(function (e) {
          if (db.objectStoreNames.contains && db.objectStoreNames.contains(e.nome)) return;
          var op = { autoIncrement: !!e.autoIncrement };
          if (e.keyPath !== null && e.keyPath !== undefined) op.keyPath = e.keyPath;
          var st = db.createObjectStore(e.nome, op);
          e.indices.forEach(function (i) { st.createIndex(i.nome, i.keyPath, { unique: !!i.unique, multiEntry: !!i.multiEntry }); });
        });
      };
      r.onsuccess = function () {
        var db = r.result, n = 0;
        var comDados = dados.filter(function (d) { return d.valores && d.valores.length; });
        if (!comDados.length) { db.close(); ok(0); return; }
        var tx = db.transaction(comDados.map(function (d) { return d.nome; }), 'readwrite');
        comDados.forEach(function (d) {
          var st = tx.objectStore(d.nome);
          d.valores.forEach(function (v, i) { if (st.keyPath === null || st.keyPath === undefined) st.put(v, d.chaves[i]); else st.put(v); n++; });
        });
        tx.oncomplete = function () { db.close(); ok(n); };
        tx.onerror = tx.onabort = function () { db.close(); ok(0); };
      };
      r.onerror = function () { ok(0); };
    });
  }
  function copiarSementes(id) {
    if (!realIDB) return Promise.resolve(0);
    var total = 0;
    return Object.keys(SEMENTES).reduce(function (p, nome) {
      return p.then(function () { return copiarBanco(nome, id).then(function (n) { total += n || 0; }, function () { /* */ }); });
    }, Promise.resolve()).then(function () { return total; });
  }
  function listar() {
    return realIDB && typeof realIDB.databases === 'function' ? Promise.resolve(realIDB.databases()).catch(function () { return []; }) : Promise.resolve([]);
  }
  function apagarTemporarios(soDestaSessao) {
    if (!realIDB) return Promise.resolve(0);
    return listar().then(function (l) {
      var n = 0;
      (l || []).forEach(function (b) {
        var nome = b && b.name;
        if (!nome || nome.indexOf(PREFIXO_DB) !== 0) return;
        var desta = nome.indexOf(PREFIXO_DB + sessao + '.') === 0;
        if (soDestaSessao ? desta : !(anonimo && desta)) { try { realIDB.deleteDatabase(nome); n++; } catch (e) { /* */ } }
      });
      return n;
    });
  }
  var idb = realIDB ? {
    open: function (n, v) { return v === undefined ? realIDB.open(nomeBanco(n)) : realIDB.open(nomeBanco(n), v); },
    deleteDatabase: function (n) { return realIDB.deleteDatabase(nomeBanco(n)); },
    cmp: function (a, b) { return realIDB.cmp(a, b); },
    databases: function () {
      var pref = PREFIXO_DB + sessao + '.';
      return listar().then(function (l) {
        return (l || []).filter(function (b) {
          var n = b && b.name || '';
          if (n.indexOf(PREFIXO_DB) === 0) return anonimo && n.indexOf(pref) === 0;
          return !anonimo;
        }).map(function (b) {
          return b.name.indexOf(pref) === 0 ? { name: b.name.slice(pref.length), version: b.version } : b;
        });
      });
    }
  } : null;

  function instalar(nome, valor) {
    try {
      Object.defineProperty(G, nome, { configurable: true, enumerable: true, get: function () { return valor; } });
      return G[nome] === valor;
    } catch (e) { return false; }
  }
  var instalado = instalar('localStorage', L.proxy) && instalar('sessionStorage', S.proxy);
  if (idb) instalado = instalar('indexedDB', idb) && instalado;
  if (!instalado) anonimo = false;

  function recarregar() { try { A._recarregar ? A._recarregar() : G.location.reload(); } catch (e) { /* */ } }

  var A = {
    get anonimo() { return anonimo; },
    get suportaAnonimo() { return instalado && !!realSessao; },
    get persistente() { return !!realLocal && !anonimo; },
    sementes: JSON.parse(JSON.stringify(SEMENTES)),
    local: L.proxy,
    sessao: S.proxy,
    nomeBanco: nomeBanco,
    ler: function (k, padrao) { var v = L.api.getItem(k); return v === null ? (padrao === undefined ? null : padrao) : v; },
    gravar: function (k, v) { try { L.api.setItem(k, v); return true; } catch (e) { return false; } },
    remover: function (k) { try { L.api.removeItem(k); return true; } catch (e) { return false; } },
    lerJSON: function (k, padrao) { try { var v = L.api.getItem(k); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
    gravarJSON: function (k, v) { try { return A.gravar(k, JSON.stringify(v)); } catch (e) { return false; } },
    // Copia os temas para o banco temporário, marca a aba e recarrega. Devolve Promise<boolean>.
    entrarAnonimo: function () {
      if (anonimo || !A.suportaAnonimo) return Promise.resolve(false);
      var id = novoId(), limite = new Promise(function (ok) { setTimeout(ok, LIMITE_COPIA_MS); });
      return Promise.race([copiarSementes(id).catch(function () { return 0; }), limite]).then(function () {
        try { realSessao.setItem(FLAG, id); } catch (e) { return false; }
        recarregar(); return true;
      });
    },
    sairAnonimo: function () {
      if (!anonimo) return Promise.resolve(false);
      return apagarTemporarios(true).then(function () { recarregar(); return true; });
    },
    _limpezaInicial: null
  };
  G.Armazenamento = A;

  try { if (anonimo && G.document && G.document.documentElement) G.document.documentElement.setAttribute('data-anonimo', ''); } catch (e) { /* */ }
  A._limpezaInicial = apagarTemporarios(false).catch(function () { return 0; });
  if (anonimo && typeof G.addEventListener === 'function') {
    G.addEventListener('pagehide', function () { apagarTemporarios(true); });
  }
})(typeof window !== 'undefined' ? window : this);
