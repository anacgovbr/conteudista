import suporte
from suporte import RAIZ, _servidor

TOUR = "try { localStorage.setItem('conteudista.tour', '1'); } catch (e) {}"

# Fotografia do armazenamento REAL (use só em abas no modo normal): bancos, registros e localStorage.
FOTO_JS = """async () => {
  const nomes = (indexedDB.databases ? await indexedDB.databases() : []).map(b => b.name).sort();
  const bancos = {};
  for (const nome of nomes) {
    bancos[nome] = await new Promise(ok => {
      const r = indexedDB.open(nome);
      r.onerror = () => ok('erro');
      r.onsuccess = () => {
        const db = r.result, lojas = [...db.objectStoreNames], saida = { versao: db.version };
        if (!lojas.length) { db.close(); ok(saida); return; }
        const t = db.transaction(lojas, 'readonly');
        lojas.forEach(n => { const q = t.objectStore(n).getAll(); q.onsuccess = () => { saida[n] = q.result.length + ':' + JSON.stringify(q.result).length; }; });
        t.oncomplete = () => { db.close(); ok(saida); };
        t.onerror = t.onabort = () => { db.close(); ok('erro'); };
      };
    });
  }
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  return { bancos, ls };
}"""

ESTADO_JS = """() => ({
  anonimo: Armazenamento.anonimo, suporta: Armazenamento.suportaAnonimo, persistente: Armazenamento.persistente,
  atributo: document.documentElement.hasAttribute('data-anonimo'),
  fabrica: Object.prototype.toString.call(indexedDB), erro: Armazenamento.erroAnonimo || null })"""

GRAVAR_REAL_JS = """async () => {
  await dbPut('rascunhos', { nome: 'Real-28', g: 'texto real 28', s: '', data: Date.now() });
  await dbPut('tema_imagens', { id: 'img-real-28', dados: 'data:image/png;base64,AAAA' });
  await dbPut('temas_versoes', { tema_id: 'zz-28', data: 1, rotulo: 'versao real 28' });
  localStorage.setItem('conteudista.locucao.notas', JSON.stringify({ real: 28 }));
  localStorage.setItem('conteudista.tema', 'govbr');
  return true;
}"""

LER_JS = """async () => {
  const nomes = async st => (await dbAll(st)).map(x => x.nome || x.id || x.rotulo || '?');
  return {
    rascunhos: await nomes('rascunhos'), versoes: (await dbAll('versoes')).length, links: (await dbAll('links')).length,
    imagens: await nomes('tema_imagens'), temasVersoes: (await dbAll('temas_versoes')).map(x => x.tema_id),
    autossalvo: ((await dbAll('rascunhos')).find(x => x.nome === 'Autossalvo') || {}).g || null,
    notas: localStorage.getItem('conteudista.locucao.notas'), tema: localStorage.getItem('conteudista.tema'),
    teste: localStorage.getItem('conteudista.teste.anonimo'), sessao: sessionStorage.getItem('teste28')
  };
}"""

ESCREVER_TEMP_JS = """async () => {
  document.getElementById('auto').checked = true;
  document.getElementById('g').value = 'texto-anonimo-28';
  agendarAuto();
  await new Promise(ok => setTimeout(ok, 2600));
  await dbPut('versoes', { data: Date.now(), rotulo: 'versao temp 28', origem: 'marco', h: 'x', g: 'a', s: '' });
  await dbPut('rascunhos', { nome: 'Temp-28', g: 'texto-anonimo-28', s: '', data: Date.now() });
  localStorage.setItem('conteudista.teste.anonimo', '1');
  sessionStorage.setItem('teste28', '1');
  const pac = await new Promise((ok, err) => {
    const r = indexedDB.open('conteudista_arquivos', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('pacotes')) r.result.createObjectStore('pacotes', { keyPath: 'id', autoIncrement: true }); };
    r.onsuccess = () => { const d = r.result, t = d.transaction('pacotes', 'readwrite'), q = t.objectStore('pacotes').add({ nome: 'Apostila_temp_28.html', blob: new Blob(['x']) });
      t.oncomplete = () => { d.close(); ok(q.result); }; t.onerror = () => err(t.error); };
    r.onerror = () => err(r.error);
  });
  const db = await new Promise((ok, err) => {
    const r = indexedDB.open('KokoroTTS_DB', 1);
    r.onupgradeneeded = e => { const d = e.target.result; const s = d.createObjectStore('audio_history', { keyPath: 'id', autoIncrement: true }); s.createIndex('lookup_idx', ['text', 'voice', 'speed'], { unique: false }); };
    r.onsuccess = () => ok(r.result); r.onerror = () => err(r.error);
  });
  await new Promise((ok, err) => { const t = db.transaction('audio_history', 'readwrite'); t.objectStore('audio_history').add({ text: 'oi', voice: 'v', speed: 1, audioBlob: new Blob(['abc']) }); t.oncomplete = ok; t.onerror = () => err(t.error); });
  const achou = await new Promise(ok => { const t = db.transaction('audio_history', 'readonly'), q = t.objectStore('audio_history').index('lookup_idx').getAll(['oi', 'v', 1]);
    t.oncomplete = () => ok(q.result.length + ':' + (q.result[0] && q.result[0].audioBlob instanceof Blob)); });
  db.close();
  return { pac, achou, autost: document.getElementById('autost').textContent };
}"""


def _abrir(ctx, url, erros, rotulo):
    pg = ctx.new_page()
    pg.add_init_script(TOUR)
    pg.on('pageerror', lambda e: erros.append(rotulo + ': ' + str(e)))
    pg.goto(url)
    pg.wait_for_function("() => !!window.Armazenamento && typeof dbPut === 'function' && typeof dbAll === 'function' && typeof agendarAuto === 'function'", timeout=40000)
    pg.wait_for_timeout(600)
    return pg


def _aguardar_recarga(pg, acao):
    with pg.expect_navigation(wait_until='load', timeout=40000):
        pg.evaluate(acao)
    pg.wait_for_function("() => !!window.Armazenamento && typeof dbPut === 'function' && typeof dbAll === 'function'", timeout=40000)
    pg.wait_for_timeout(600)


def _entrar(pg):
    _aguardar_recarga(pg, "() => { setTimeout(() => Armazenamento.entrarAnonimo(), 0); }")


def grupo28(amb, ctx, G):
    """Grupo 28: modo temporário sem gravação local (Armazenamento, IndexedDB em memória, cópia dos temas)."""
    srv, url = _servidor(RAIZ / 'web')
    br = getattr(ctx, 'browser', None)
    novo = br.new_context() if br else ctx          # perfil limpo: o que outros grupos gravaram não interfere
    erros = []
    try:
        a = _abrir(novo, url, erros, 'A')
        e = a.evaluate(ESTADO_JS)
        G.chk('28.1', 'Modo normal: Armazenamento existe, com suporte ao temporário, e o IndexedDB é o do navegador',
              e['anonimo'] is False and e['suporta'] is True and e['persistente'] is True and not e['atributo'] and e['fabrica'] == '[object IDBFactory]', e)

        a.evaluate(GRAVAR_REAL_JS)
        a.wait_for_timeout(1200)
        foto0 = a.evaluate(FOTO_JS)
        a.reload()
        a.wait_for_function("() => typeof dbAll === 'function'", timeout=40000)
        lido = a.evaluate(LER_JS)
        G.chk('28.2', 'Modo normal continua persistindo: o que foi gravado sobrevive à recarga',
              'Real-28' in lido['rascunhos'] and 'img-real-28' in lido['imagens'] and 'zz-28' in lido['temasVersoes'] and lido['notas'] == '{"real":28}', lido)

        b = _abrir(novo, url, erros, 'B')
        _entrar(b)
        e = b.evaluate(ESTADO_JS)
        persist = b.evaluate("async () => navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false")
        G.chk('28.3', 'Entrar no modo temporário: ligado, html marcado, IndexedDB substituído e persist() devolve false',
              e['anonimo'] is True and e['atributo'] and e['persistente'] is False and e['fabrica'] != '[object IDBFactory]' and e['erro'] is None and persist is False,
              {'estado': e, 'persist': persist})

        lb = b.evaluate(LER_JS)
        G.chk('28.4', 'Temas são copiados (só leitura); rascunhos, versões, links e notas anteriores NÃO aparecem',
              'img-real-28' in lb['imagens'] and 'zz-28' in lb['temasVersoes'] and lb['rascunhos'] == [] and lb['versoes'] == 0 and lb['links'] == 0
              and lb['notas'] is None and lb['tema'] == 'govbr', lb)

        r = b.evaluate(ESCREVER_TEMP_JS)
        lb2 = b.evaluate(LER_JS)
        G.chk('28.5', 'Salvamento automático e demais gravações funcionam, mas só na memória da sessão temporária',
              'Salvo automaticamente' in r['autost'] and lb2['autossalvo'] == 'texto-anonimo-28' and 'Temp-28' in lb2['rascunhos'] and lb2['versoes'] == 1
              and lb2['teste'] == '1' and lb2['sessao'] == '1' and r['achou'] == '1:true' and r['pac'] == 1, {'r': r, 'lb2': lb2})

        la = a.evaluate(LER_JS)
        foto1 = a.evaluate(FOTO_JS)
        G.chk('28.6', 'Nada chegou ao navegador: bancos, registros e localStorage reais ficaram idênticos',
              foto1 == foto0 and la['autossalvo'] != 'texto-anonimo-28' and 'Temp-28' not in la['rascunhos'] and la['teste'] is None and la['sessao'] is None,
              {'antes': foto0, 'depois': foto1})

        c = _abrir(novo, url, erros, 'C')
        _entrar(c)
        lc = c.evaluate(LER_JS)
        c.evaluate("async () => { await dbPut('rascunhos', { nome: 'Temp-C-28', g: 'so da aba C', s: '', data: Date.now() }); }")
        lb3 = b.evaluate(LER_JS)
        G.chk('28.7', 'Duas abas temporárias são isoladas entre si',
              lc['autossalvo'] is None and 'Temp-28' not in lc['rascunhos'] and lc['teste'] is None and 'Temp-C-28' not in lb3['rascunhos'], {'c': lc, 'b': lb3})

        _aguardar_recarga(b, "() => location.reload()")
        e = b.evaluate(ESTADO_JS)
        lb4 = b.evaluate(LER_JS)
        G.chk('28.8', 'Recarregar volta ao modo normal e descarta o que era temporário',
              e['anonimo'] is False and e['fabrica'] == '[object IDBFactory]' and 'Real-28' in lb4['rascunhos'] and 'Temp-28' not in lb4['rascunhos']
              and lb4['autossalvo'] != 'texto-anonimo-28' and lb4['teste'] is None and lb4['versoes'] == 0, {'estado': e, 'lido': lb4})

        _aguardar_recarga(c, "() => { setTimeout(() => Armazenamento.sairAnonimo(), 0); }")
        e = c.evaluate(ESTADO_JS)
        lc2 = c.evaluate(LER_JS)
        G.chk('28.9', 'Sair do modo temporário recarrega no modo normal sem levar nada da sessão',
              e['anonimo'] is False and 'Temp-C-28' not in lc2['rascunhos'], {'estado': e, 'lido': lc2})

        foto2 = a.evaluate(FOTO_JS)
        G.chk('28.10', 'Ao final, o armazenamento real continua idêntico ao do início',
              foto2 == foto0, {'antes': foto0, 'depois': foto2})

        # sem rede para o CDN, as páginas podem registrar erros alheios ao tema; só os de armazenamento importam
        relevantes = [x for x in erros if any(t in x for t in ('Armazenamento', 'IDB', 'indexedDB', 'IndexedDB', 'Storage', 'DOMException', 'Transaction'))]
        G.chk('28.11', 'Nenhum erro de JavaScript de armazenamento nas abas', not relevantes, relevantes or erros[:5])
    finally:
        try:
            if novo is not ctx:
                novo.close()
        except Exception:
            pass
        try:
            srv.shutdown()
        except Exception:
            pass
