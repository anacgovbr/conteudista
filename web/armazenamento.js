/* =====================================================================================
   Conteudista: módulo Armazenamento (SPEC 1.135, seção 6.1).
   Carregado antes de todos os outros scripts.

   Modo normal: não substitui nada. localStorage, sessionStorage e indexedDB do navegador
   continuam sendo usados diretamente pelo aplicativo.

   Modo temporário (anônimo): começa com Armazenamento.entrarAnonimo(), que marca a aba e
   recarrega a página. Na recarga:
   - localStorage e sessionStorage viram camadas só em memória (preferências existentes são
     lidas; nada é gravado no navegador; o texto das notas de locução salvas não aparece);
   - indexedDB vira um banco 100% em memória (nenhum banco é criado no disco);
   - os stores de temas do banco "conteudista" são lidos do banco real, SOMENTE LEITURA, e
     copiados para a memória; rascunhos, versões, links, pacotes gerados e áudios nunca são
     lidos nem gravados;
   - navigator.storage.persist() passa a devolver false.
   Recarregar ou sair (Armazenamento.sairAnonimo) volta ao modo normal e descarta tudo.
   Se o isolamento não puder ser instalado, o modo não liga: Armazenamento.anonimo fica false
   e Armazenamento.erroAnonimo explica o motivo.
   Fora do alcance (workers): o cache de vozes (Cache API) do worker de narração, que guarda
   modelos de áudio e nenhum conteúdo da pessoa.
   ===================================================================================== */
(function (G) {
  'use strict';
  if (!G || G.Armazenamento) return;

  var FLAG = 'conteudista.anonimo.iniciar';
  var SEMENTES = {'conteudista': ['tema_imagens', 'temas', 'temas_versoes']};                       // banco -> stores copiados (só temas)
  var OCULTAS_NO_ANONIMO = ['conteudista.locucao.notas'];
  var LIMITE_SEMENTE_MS = 5000;

  /* ------------------------------ acesso ao armazenamento real ------------------------------ */
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
  function substituivel(nome) {
    var d = Object.getOwnPropertyDescriptor(G, nome);
    return d ? !!d.configurable : Object.isExtensible(G);
  }
  function instalar(nome, valor) {
    try {
      Object.defineProperty(G, nome, { configurable: true, enumerable: true, get: function () { return valor; } });
      return G[nome] === valor;
    } catch (e) { return false; }
  }

  var realLocal = original('localStorage'), realSessao = original('sessionStorage'), realIDB = original('indexedDB');
  if (realLocal && !utilizavel(realLocal)) realLocal = null;
  if (realSessao && !utilizavel(realSessao)) realSessao = null;

  var anonimo = false, erroAnonimo = null;
  try {
    if (realSessao && realSessao.getItem(FLAG) === '1') { anonimo = true; realSessao.removeItem(FLAG); }  // vale só para esta carga
  } catch (e) { /* */ }

  /* ------------------------------ camada Storage (memória no anônimo) ------------------------------ */
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

  /* ------------------------------ IndexedDB em memória ------------------------------ */
  function criarMemoriaIDB(opcoes) {
    var bancos = Object.create(null);
    var esperar = (opcoes && opcoes.esperar) || function () { return Promise.resolve(null); };
    var semear = (opcoes && opcoes.semear) || function () { /* sem sementes */ };

    function agendar(f) { if (G.setTimeout) G.setTimeout(f, 0); else Promise.resolve().then(f); }
    function erro(nome, msg) {
      try { return new G.DOMException(msg, nome); } catch (e) { var x = new Error(msg); x.name = nome; return x; }
    }
    function nao(nome) { return function () { throw erro('NotSupportedError', nome + ' não é suportado na sessão temporária.'); }; }
    function tag(x) { return Object.prototype.toString.call(x); }
    function clonar(v) {
      if (G.structuredClone) return G.structuredClone(v);
      return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
    }

    /* chaves */
    function ehChave(k) {
      if (typeof k === 'number') return k === k;
      if (typeof k === 'string') return true;
      if (tag(k) === '[object Date]') return k.getTime() === k.getTime();
      if (Array.isArray(k)) return k.every(ehChave);
      return false;
    }
    function ordem(k) { return typeof k === 'number' ? 1 : tag(k) === '[object Date]' ? 2 : typeof k === 'string' ? 3 : 5; }
    function cmp(a, b) {
      var oa = ordem(a), ob = ordem(b);
      if (oa !== ob) return oa < ob ? -1 : 1;
      if (oa === 5) {
        var n = Math.min(a.length, b.length);
        for (var i = 0; i < n; i++) { var c = cmp(a[i], b[i]); if (c) return c; }
        return a.length === b.length ? 0 : (a.length < b.length ? -1 : 1);
      }
      var x = oa === 2 ? a.getTime() : a, y = oa === 2 ? b.getTime() : b;
      return x < y ? -1 : x > y ? 1 : 0;
    }
    function rep(k) {
      if (typeof k === 'number') return ['n', String(k)];
      if (typeof k === 'string') return ['s', k];
      if (tag(k) === '[object Date]') return ['d', k.getTime()];
      return ['a', k.map(rep)];
    }
    function idChave(k) { return JSON.stringify(rep(k)); }
    function porCaminho(v, caminho) {
      if (Array.isArray(caminho)) {
        var r = [];
        for (var i = 0; i < caminho.length; i++) { var x = porCaminho(v, caminho[i]); if (x === undefined) return undefined; r.push(x); }
        return r;
      }
      if (caminho === '') return v;
      var partes = String(caminho).split('.'), cur = v;
      for (var j = 0; j < partes.length; j++) {
        if (cur === null || typeof cur !== 'object') return undefined;
        cur = cur[partes[j]];
        if (cur === undefined) return undefined;
      }
      return cur;
    }
    function definirCaminho(v, caminho, valor) {
      var partes = String(caminho).split('.'), cur = v;
      for (var i = 0; i < partes.length - 1; i++) {
        if (cur[partes[i]] === null || typeof cur[partes[i]] !== 'object') cur[partes[i]] = {};
        cur = cur[partes[i]];
      }
      cur[partes[partes.length - 1]] = valor;
    }

    /* eventos */
    function Evento(tipo, alvo, extra) {
      this.type = tipo; this.target = alvo; this.currentTarget = alvo; this.defaultPrevented = false; this.excecao = null;
      if (extra) for (var k in extra) this[k] = extra[k];
    }
    Evento.prototype.preventDefault = function () { this.defaultPrevented = true; };
    Evento.prototype.stopPropagation = function () { /* sem propagação própria */ };
    function emitir(o, tipo, extra) {
      var ev = new Evento(tipo, o, extra);
      function chamar(f) {
        try { f.call(o, ev); } catch (e) { ev.excecao = e; agendar(function () { throw e; }); }
      }
      var h = o['on' + tipo];
      if (typeof h === 'function') chamar(h);
      ((o._ouvintes && o._ouvintes[tipo]) || []).slice().forEach(chamar);
      return ev;
    }
    function comOuvintes(proto) {
      proto.addEventListener = function (t, f) { this._ouvintes = this._ouvintes || {}; (this._ouvintes[t] = this._ouvintes[t] || []).push(f); };
      proto.removeEventListener = function (t, f) {
        var l = this._ouvintes && this._ouvintes[t]; if (!l) return;
        var i = l.indexOf(f); if (i >= 0) l.splice(i, 1);
      };
    }

    /* requisição */
    function Req(fonte, tx) {
      this.result = undefined; this.error = null; this.source = fonte || null; this.transaction = tx || null; this.readyState = 'pending';
      this.onsuccess = null; this.onerror = null; this.onupgradeneeded = null; this.onblocked = null;
    }
    comOuvintes(Req.prototype);
    function falharReq(req, err) { req.readyState = 'done'; req.error = err; req.result = undefined; return emitir(req, 'error'); }

    /* transação */
    function Tx(conn, nomes, modo) {
      this.db = conn; this.mode = modo; this.error = null; this.oncomplete = null; this.onerror = null; this.onabort = null;
      this._nomes = nomes; this._pend = 0; this._fim = false; this._abortada = false; this._manual = false;
      this._snap = null; this._lojas = {}; this._aoFim = null;
      var self = this; agendar(function () { verificarFim(self); });
    }
    comOuvintes(Tx.prototype);
    Tx.prototype.objectStore = function (nome) {
      nome = String(nome);
      var d = this.db._d;
      if (!d.lojas.has(nome) || (this._nomes && this._nomes.indexOf(nome) < 0)) throw erro('NotFoundError', 'Object store inexistente: ' + nome);
      if (!this._lojas[nome]) this._lojas[nome] = new Loja(this, d.lojas.get(nome));
      return this._lojas[nome];
    };
    Tx.prototype.abort = function () {
      if (this._fim) throw erro('InvalidStateError', 'A transação já terminou.');
      abortar(this, null);
    };
    function verificarFim(tx) {
      if (tx._fim || tx._manual || tx._pend > 0) return;
      agendar(function () {
        if (tx._fim || tx._manual || tx._pend > 0) return;
        tx._fim = true;
        emitir(tx, 'complete');
        if (tx._aoFim) tx._aoFim(false);
      });
    }
    function abortar(tx, err) {
      if (tx._fim) return;
      tx._fim = true; tx._abortada = true; tx.error = err || null;
      Object.keys(tx._snap || {}).forEach(function (n) {
        var s = tx._snap[n]; s.L.dados = s.dados; s.L.seq = s.seq;
      });
      emitir(tx, 'abort');
      if (tx._aoFim) tx._aoFim(true);
    }
    function marcar(tx, L) {
      tx._snap = tx._snap || {};
      if (!tx._snap[L.nome]) tx._snap[L.nome] = { L: L, dados: new Map(L.dados), seq: L.seq };
    }
    function operar(tx, fonte, executar) {
      if (tx._fim) throw erro('TransactionInactiveError', 'A transação não está ativa.');
      var req = new Req(fonte, tx), resultado, falha = null;
      tx._pend++;
      try { resultado = executar(); } catch (e) { falha = e; }
      agendar(function () {
        tx._pend--;
        if (tx._abortada) { falharReq(req, erro('AbortError', 'A transação foi cancelada.')); return; }
        if (falha) {
          var ev = falharReq(req, falha);
          if (!ev.defaultPrevented) {
            tx.error = falha;
            var evTx = emitir(tx, 'error');
            if (!evTx.defaultPrevented) { abortar(tx, falha); return; }
          }
        } else {
          req.result = resultado; req.readyState = 'done'; req.error = null;
          emitir(req, 'success');
        }
        verificarFim(tx);
      });
      return req;
    }

    /* object store */
    function validarChaveConsulta(k) {
      if (k === undefined || k === null || !ehChave(k)) throw erro('DataError', 'Chave inválida.');
    }
    function consultaOpcional(q) {
      if (q === undefined || q === null) return null;
      validarChaveConsulta(q);
      return q;
    }
    function lista(L) {
      return Array.from(L.dados.values()).sort(function (a, b) { return cmp(a.k, b.k); });
    }
    function Loja(tx, L) { this._tx = tx; this._L = L; }
    Object.defineProperties(Loja.prototype, {
      name: { get: function () { return this._L.nome; } },
      keyPath: { get: function () { return this._L.keyPath; } },
      autoIncrement: { get: function () { return this._L.auto; } },
      transaction: { get: function () { return this._tx; } },
      indexNames: { get: function () { return nomesOrdenados(Array.from(this._L.indices.keys())); } }
    });
    function nomesOrdenados(a) {
      a = a.slice().sort();
      a.contains = function (n) { return a.indexOf(n) >= 0; };
      a.item = function (i) { return i >= 0 && i < a.length ? a[i] : null; };
      return a;
    }
    function indiceDe(ix, v) {
      var k = porCaminho(v, ix.keyPath);
      return k !== undefined && ehChave(k) ? k : undefined;
    }
    function conferirUnicos(L, copia, idc) {
      L.indices.forEach(function (ix) {
        if (!ix.unique) return;
        var k = indiceDe(ix, copia);
        if (k === undefined) return;
        L.dados.forEach(function (e, ide) {
          if (ide !== idc && cmp(indiceDe(ix, e.v), k) === 0) throw erro('ConstraintError', 'Valor duplicado no índice ' + ix.nome + '.');
        });
      });
    }
    function escrever(loja, valor, chave, soNovo) {
      var tx = loja._tx, L = loja._L;
      if (tx._fim) throw erro('TransactionInactiveError', 'A transação não está ativa.');
      if (tx.mode === 'readonly') throw erro('ReadOnlyError', 'A transação é somente leitura.');
      if (L.keyPath !== null) {
        if (chave !== undefined) throw erro('DataError', 'Não informe a chave quando o store usa keyPath.');
        var kp = porCaminho(valor, L.keyPath);
        if (kp === undefined) { if (!L.auto) throw erro('DataError', 'O valor não tem a chave ' + L.keyPath + '.'); }
        else if (!ehChave(kp)) throw erro('DataError', 'Chave inválida.');
        chave = kp;
      } else {
        if (chave === undefined && !L.auto) throw erro('DataError', 'Informe a chave.');
        if (chave !== undefined && !ehChave(chave)) throw erro('DataError', 'Chave inválida.');
      }
      var copia = clonar(valor);
      return operar(tx, loja, function () {
        marcar(tx, L);
        var k = chave;
        if (k === undefined) {
          k = L.seq++;
          if (L.keyPath !== null) definirCaminho(copia, L.keyPath, k);
        } else if (L.auto && typeof k === 'number' && k >= L.seq) L.seq = Math.floor(k) + 1;
        var idc = idChave(k);
        if (soNovo && L.dados.has(idc)) throw erro('ConstraintError', 'Já existe um registro com esta chave.');
        conferirUnicos(L, copia, idc);
        L.dados.set(idc, { k: k, v: copia });
        return clonar(k);
      });
    }
    function filtrar(L, q, count) {
      var l = lista(L);
      if (q !== null) l = l.filter(function (e) { return cmp(e.k, q) === 0; });
      if (count !== undefined && count !== null && count > 0) l = l.slice(0, count);
      return l;
    }
    Loja.prototype.put = function (v, k) { return escrever(this, v, k, false); };
    Loja.prototype.add = function (v, k) { return escrever(this, v, k, true); };
    Loja.prototype.get = function (k) {
      validarChaveConsulta(k);
      var L = this._L;
      return operar(this._tx, this, function () { var e = L.dados.get(idChave(k)); return e ? clonar(e.v) : undefined; });
    };
    Loja.prototype.getAll = function (q, count) {
      q = consultaOpcional(q); var L = this._L;
      return operar(this._tx, this, function () { return filtrar(L, q, count).map(function (e) { return clonar(e.v); }); });
    };
    Loja.prototype.getAllKeys = function (q, count) {
      q = consultaOpcional(q); var L = this._L;
      return operar(this._tx, this, function () { return filtrar(L, q, count).map(function (e) { return clonar(e.k); }); });
    };
    Loja.prototype.count = function (q) {
      q = consultaOpcional(q); var L = this._L;
      return operar(this._tx, this, function () { return filtrar(L, q).length; });
    };
    Loja.prototype['delete'] = function (k) {
      validarChaveConsulta(k);
      var tx = this._tx, L = this._L;
      if (tx._fim) throw erro('TransactionInactiveError', 'A transação não está ativa.');
      if (tx.mode === 'readonly') throw erro('ReadOnlyError', 'A transação é somente leitura.');
      return operar(tx, this, function () { marcar(tx, L); L.dados['delete'](idChave(k)); return undefined; });
    };
    Loja.prototype.clear = function () {
      var tx = this._tx, L = this._L;
      if (tx._fim) throw erro('TransactionInactiveError', 'A transação não está ativa.');
      if (tx.mode === 'readonly') throw erro('ReadOnlyError', 'A transação é somente leitura.');
      return operar(tx, this, function () { marcar(tx, L); L.dados.clear(); return undefined; });
    };
    Loja.prototype.createIndex = function (nome, keyPath, op) {
      var tx = this._tx, L = this._L;
      if (tx.mode !== 'versionchange') throw erro('InvalidStateError', 'Índices só podem ser criados ao atualizar o banco.');
      nome = String(nome);
      if (L.indices.has(nome)) throw erro('ConstraintError', 'O índice já existe.');
      if (op && op.multiEntry) nao('multiEntry')();
      var ix = { nome: nome, keyPath: keyPath, unique: !!(op && op.unique), multiEntry: false };
      L.indices.set(nome, ix);
      return new Indice(this, ix);
    };
    Loja.prototype.deleteIndex = function (nome) {
      if (this._tx.mode !== 'versionchange') throw erro('InvalidStateError', 'Índices só podem ser removidos ao atualizar o banco.');
      if (!this._L.indices['delete'](String(nome))) throw erro('NotFoundError', 'Índice inexistente.');
    };
    Loja.prototype.index = function (nome) {
      var ix = this._L.indices.get(String(nome));
      if (!ix) throw erro('NotFoundError', 'Índice inexistente: ' + nome);
      return new Indice(this, ix);
    };
    Loja.prototype.openCursor = nao('openCursor');
    Loja.prototype.openKeyCursor = nao('openKeyCursor');
    Loja.prototype.getKey = nao('getKey');

    function Indice(loja, ix) { this._loja = loja; this._ix = ix; }
    Object.defineProperties(Indice.prototype, {
      name: { get: function () { return this._ix.nome; } },
      keyPath: { get: function () { return this._ix.keyPath; } },
      unique: { get: function () { return this._ix.unique; } },
      multiEntry: { get: function () { return false; } },
      objectStore: { get: function () { return this._loja; } }
    });
    function entradasIndice(L, ix, q, count) {
      var l = [];
      L.dados.forEach(function (e) {
        var k = indiceDe(ix, e.v);
        if (k !== undefined && (q === null || cmp(k, q) === 0)) l.push({ ik: k, e: e });
      });
      l.sort(function (a, b) { return cmp(a.ik, b.ik) || cmp(a.e.k, b.e.k); });
      if (count !== undefined && count !== null && count > 0) l = l.slice(0, count);
      return l;
    }
    Indice.prototype.get = function (k) {
      validarChaveConsulta(k); var L = this._loja._L, ix = this._ix;
      return operar(this._loja._tx, this, function () { var l = entradasIndice(L, ix, k, 1); return l.length ? clonar(l[0].e.v) : undefined; });
    };
    Indice.prototype.getAll = function (q, count) {
      q = consultaOpcional(q); var L = this._loja._L, ix = this._ix;
      return operar(this._loja._tx, this, function () { return entradasIndice(L, ix, q, count).map(function (x) { return clonar(x.e.v); }); });
    };
    Indice.prototype.getAllKeys = function (q, count) {
      q = consultaOpcional(q); var L = this._loja._L, ix = this._ix;
      return operar(this._loja._tx, this, function () { return entradasIndice(L, ix, q, count).map(function (x) { return clonar(x.e.k); }); });
    };
    Indice.prototype.count = function (q) {
      q = consultaOpcional(q); var L = this._loja._L, ix = this._ix;
      return operar(this._loja._tx, this, function () { return entradasIndice(L, ix, q).length; });
    };
    Indice.prototype.openCursor = nao('openCursor');
    Indice.prototype.openKeyCursor = nao('openKeyCursor');
    Indice.prototype.getKey = nao('getKey');

    /* conexão */
    function Conexao(d) { this._d = d; this._fechada = false; this._upgrade = null; this.onversionchange = null; this.onclose = null; this.onabort = null; this.onerror = null; }
    comOuvintes(Conexao.prototype);
    Object.defineProperties(Conexao.prototype, {
      name: { get: function () { return this._d.nome; } },
      version: { get: function () { return this._d.versao; } },
      objectStoreNames: { get: function () { return nomesOrdenados(Array.from(this._d.lojas.keys())); } }
    });
    Conexao.prototype.createObjectStore = function (nome, op) {
      var u = this._upgrade;
      if (!u || u._fim) throw erro('InvalidStateError', 'Stores só podem ser criados ao atualizar o banco.');
      nome = String(nome);
      if (this._d.lojas.has(nome)) throw erro('ConstraintError', 'O object store já existe: ' + nome);
      var kp = op && op.keyPath !== undefined ? op.keyPath : null, auto = !!(op && op.autoIncrement);
      if (kp !== null && typeof kp !== 'string' && !Array.isArray(kp)) throw new TypeError('keyPath inválido.');
      if (auto && (kp === '' || Array.isArray(kp))) throw erro('InvalidAccessError', 'autoIncrement não combina com este keyPath.');
      var L = { nome: nome, keyPath: kp, auto: auto, seq: 1, dados: new Map(), indices: new Map() };
      this._d.lojas.set(nome, L);
      return new Loja(u, L);
    };
    Conexao.prototype.deleteObjectStore = function (nome) {
      var u = this._upgrade;
      if (!u || u._fim) throw erro('InvalidStateError', 'Stores só podem ser removidos ao atualizar o banco.');
      if (!this._d.lojas['delete'](String(nome))) throw erro('NotFoundError', 'Object store inexistente.');
    };
    Conexao.prototype.transaction = function (nomes, modo) {
      if (this._fechada) throw erro('InvalidStateError', 'A conexão está fechada.');
      var lista = Array.isArray(nomes) ? nomes.map(String) : (nomes && typeof nomes === 'object' && typeof nomes.length === 'number' && typeof nomes !== 'string' ? Array.prototype.map.call(nomes, String) : [String(nomes)]);
      if (!lista.length) throw erro('InvalidAccessError', 'Informe ao menos um object store.');
      var d = this._d;
      lista.forEach(function (n) { if (!d.lojas.has(n)) throw erro('NotFoundError', 'Object store inexistente: ' + n); });
      modo = modo === undefined ? 'readonly' : String(modo);
      if (modo !== 'readonly' && modo !== 'readwrite') throw new TypeError('Modo de transação inválido.');
      return new Tx(this, lista, modo);
    };
    Conexao.prototype.close = function () {
      this._fechada = true;
      var c = this._d.conexoes, i = c.indexOf(this);
      if (i >= 0) c.splice(i, 1);
    };

    /* abertura, atualização e sementes */
    function avisarVersao(d, antes, depois) {
      d.conexoes.slice().forEach(function (c) {
        if (c._fechada) return;
        emitir(c, 'versionchange', { oldVersion: antes, newVersion: depois });
        c._fechada = true;
      });
      d.conexoes = [];
    }
    function iniciarAbertura(req, nome, versao, sem) {
      var d = bancos[nome], antes = d ? d.versao : 0, novo = !d;
      var alvo = versao === undefined ? (antes || 1) : versao;
      if (d && alvo < antes) { falharReq(req, erro('VersionError', 'A versão pedida é menor que a existente.')); return; }
      if (novo) d = { nome: nome, versao: 0, lojas: new Map(), conexoes: [] };
      if (alvo > antes) avisarVersao(d, antes, alvo);
      var conn = new Conexao(d);
      d.conexoes.push(conn);
      req.result = conn;
      if (alvo <= antes) { req.readyState = 'done'; req.error = null; emitir(req, 'success'); return; }
      var lojasAntes = new Map(d.lojas);
      if (novo) bancos[nome] = d;
      d.versao = alvo;
      var utx = new Tx(conn, null, 'versionchange');
      utx._manual = true; conn._upgrade = utx; req.transaction = utx;
      utx._aoFim = function (abortado) {
        conn._upgrade = null; req.transaction = null;
        if (abortado) {
          d.versao = antes; d.lojas = lojasAntes;
          if (novo) delete bancos[nome];
          conn._fechada = true; d.conexoes = d.conexoes.filter(function (c) { return c !== conn; });
          falharReq(req, erro('AbortError', 'A atualização do banco foi cancelada.'));
          return;
        }
        if (novo && sem) { try { semear(d, sem, { porCaminho: porCaminho, ehChave: ehChave, idChave: idChave, clonar: clonar }); } catch (e) { /* sem sementes */ } }
        req.readyState = 'done'; req.error = null; req.result = conn;
        emitir(req, 'success');
      };
      var ev = emitir(req, 'upgradeneeded', { oldVersion: antes, newVersion: alvo });
      if (ev.excecao) { abortar(utx, erro('AbortError', 'A atualização do banco falhou.')); return; }
      utx._manual = false;
      verificarFim(utx);
    }

    var fabrica = {
      open: function (nome, versao) {
        var req = new Req(null, null);
        nome = String(nome);
        if (versao !== undefined) {
          var v = Number(versao);
          if (!(v >= 1) || v !== Math.floor(v)) throw new TypeError('Versão inválida.');
          versao = v;
        }
        agendar(function () {
          var p; try { p = Promise.resolve(esperar(nome)); } catch (e) { p = Promise.resolve(null); }
          p.then(function (sem) { iniciarAbertura(req, nome, versao, sem); }, function () { iniciarAbertura(req, nome, versao, null); });
        });
        return req;
      },
      deleteDatabase: function (nome) {
        var req = new Req(null, null);
        nome = String(nome);
        agendar(function () {
          var d = bancos[nome], antes = d ? d.versao : 0;
          if (d) { avisarVersao(d, antes, null); delete bancos[nome]; }
          req.readyState = 'done'; req.result = undefined;
          emitir(req, 'success', { oldVersion: antes, newVersion: null });
        });
        return req;
      },
      cmp: function (a, b) {
        if (!ehChave(a) || !ehChave(b)) throw erro('DataError', 'Chave inválida.');
        return cmp(a, b);
      },
      databases: function () {
        return Promise.resolve(Object.keys(bancos).map(function (n) { return { name: n, version: bancos[n].versao }; }));
      },
      _bancos: bancos
    };
    return fabrica;
  }

  /* copia valores dos stores-semente para o banco em memória (chamado depois de criar o esquema) */
  function semearBanco(d, sem, u) {
    Object.keys(sem || {}).forEach(function (nomeLoja) {
      var L = d.lojas.get(nomeLoja), s = sem[nomeLoja];
      if (!L || !s || !s.valores) return;
      s.valores.forEach(function (v, i) {
        var k = L.keyPath !== null ? u.porCaminho(v, L.keyPath) : (s.chaves || [])[i];
        if (k === undefined || !u.ehChave(k)) return;
        L.dados.set(u.idChave(k), { k: k, v: u.clonar(v) });
        if (L.auto && typeof k === 'number' && k >= L.seq) L.seq = Math.floor(k) + 1;
      });
    });
  }

  /* leitura (somente leitura) dos stores de temas do banco real */
  function lerBanco(nome, desejadas) {
    return new Promise(function (ok) {
      var r;
      try { r = realIDB.open(nome); } catch (e) { ok(null); return; }
      r.onupgradeneeded = function () { try { r.transaction.abort(); } catch (e) { /* o banco não existia: não cria */ } };
      r.onblocked = function () { ok(null); };
      r.onerror = function () { ok(null); };
      r.onsuccess = function () {
        var db = r.result, existentes = [], i, tx, saida = {};
        try { for (i = 0; i < db.objectStoreNames.length; i++) existentes.push(db.objectStoreNames[i]); } catch (e) { /* */ }
        var lojas = desejadas.filter(function (n) { return existentes.indexOf(n) >= 0; });
        if (!lojas.length) { try { db.close(); } catch (e) { /* */ } ok(null); return; }
        try { tx = db.transaction(lojas, 'readonly'); } catch (e) { try { db.close(); } catch (x) { /* */ } ok(null); return; }
        lojas.forEach(function (n) {
          var st = tx.objectStore(n), a = st.getAll(), c = st.getAllKeys();
          saida[n] = { valores: [], chaves: [] };
          a.onsuccess = function () { saida[n].valores = a.result || []; };
          c.onsuccess = function () { saida[n].chaves = c.result || []; };
        });
        tx.oncomplete = function () { try { db.close(); } catch (e) { /* */ } ok(saida); };
        tx.onerror = tx.onabort = function () { try { db.close(); } catch (e) { /* */ } ok(null); };
      };
    });
  }
  function lerSementes() {
    var resultado = {};
    if (!realIDB) return Promise.resolve(resultado);
    var timer = null;
    var leitura = Object.keys(SEMENTES).reduce(function (p, nome) {
      return p.then(function () {
        return lerBanco(nome, SEMENTES[nome]).then(function (r) { if (r) resultado[nome] = r; }, function () { /* sem semente */ });
      });
    }, Promise.resolve()).then(function () { if (timer && G.clearTimeout) G.clearTimeout(timer); return resultado; });
    var limite = new Promise(function (ok) { timer = G.setTimeout ? G.setTimeout(function () { ok(resultado); }, LIMITE_SEMENTE_MS) : null; });
    return Promise.race([leitura, limite]);
  }

  /* ------------------------------ ligação ------------------------------ */
  var L = camada(realLocal, anonimo ? OCULTAS_NO_ANONIMO : []);
  var S = camada(realSessao, []);
  var suportaAnonimo = !!realSessao && substituivel('localStorage') && substituivel('sessionStorage') && substituivel('indexedDB');
  var pronto = Promise.resolve(true);

  if (anonimo) {
    var originais = { indexedDB: descritor('indexedDB'), localStorage: descritor('localStorage'), sessionStorage: descritor('sessionStorage') };
    var semente = lerSementes();
    pronto = semente.then(function () { return true; });
    var memoria = criarMemoriaIDB({
      esperar: function (nome) { return SEMENTES[nome] ? semente.then(function (s) { return s[nome] || null; }) : Promise.resolve(null); },
      semear: semearBanco
    });
    var instalados = [];
    var ok1 = instalar('indexedDB', memoria);  instalados.push('indexedDB');
    var ok2 = ok1 && instalar('localStorage', L.proxy);  instalados.push('localStorage');
    var ok3 = ok2 && instalar('sessionStorage', S.proxy); instalados.push('sessionStorage');
    if (!(ok1 && ok2 && ok3)) {
      instalados.forEach(function (n) { try { if (originais[n]) Object.defineProperty(G, n, originais[n]); } catch (e) { /* */ } });
      anonimo = false; pronto = Promise.resolve(false);
      erroAnonimo = 'Não foi possível isolar o armazenamento deste navegador.';
    } else {
      try {
        var nav = G.navigator;
        if (nav && nav.storage) {
          nav.storage.persist = function () { return Promise.resolve(false); };
          nav.storage.persisted = function () { return Promise.resolve(false); };
        }
      } catch (e) { /* */ }
      try { if (G.document && G.document.documentElement) G.document.documentElement.setAttribute('data-anonimo', ''); } catch (e) { /* */ }
    }
  }

  function recarregar() { try { G.location.reload(); } catch (e) { /* */ } }

  G.Armazenamento = {
    get anonimo() { return anonimo; },
    get suportaAnonimo() { return suportaAnonimo; },
    get persistente() { return !!realLocal && !anonimo; },
    get erroAnonimo() { return erroAnonimo; },
    get pronto() { return pronto; },
    local: L.proxy,
    sessao: S.proxy,
    ler: function (k, padrao) { var v = L.api.getItem(k); return v === null ? (padrao === undefined ? null : padrao) : v; },
    gravar: function (k, v) { try { L.api.setItem(k, v); return true; } catch (e) { return false; } },
    remover: function (k) { try { L.api.removeItem(k); return true; } catch (e) { return false; } },
    lerJSON: function (k, padrao) { try { var v = L.api.getItem(k); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
    gravarJSON: function (k, v) { try { return G.Armazenamento.gravar(k, JSON.stringify(v)); } catch (e) { return false; } },
    // Marca a aba e recarrega. Devolve Promise<boolean> (false se não houver suporte).
    entrarAnonimo: function () {
      if (anonimo || !suportaAnonimo) return Promise.resolve(false);
      try { realSessao.setItem(FLAG, '1'); } catch (e) { return Promise.resolve(false); }
      recarregar();
      return Promise.resolve(true);
    },
    // Recarrega a página no modo normal; tudo o que estava só na memória é descartado.
    sairAnonimo: function () {
      if (!anonimo) return Promise.resolve(false);
      recarregar();
      return Promise.resolve(true);
    },
    _criarMemoriaIDB: criarMemoriaIDB
  };
})(typeof window !== 'undefined' ? window : this);
