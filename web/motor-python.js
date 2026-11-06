function loadScript(src) { return new Promise((ok, err) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => err(new Error('Falha ao carregar ' + src)); document.head.appendChild(s); }); }
let inicializacaoPython = null;
async function prepararPython() {
  if (py) return py;
  if (!inicializacaoPython) inicializacaoPython = inicializarPython().finally(() => { inicializacaoPython = null; });
  return inicializacaoPython;
}
async function inicializarPython() {
  const ger = await fetch('gerador.py', { cache: 'no-store' }); if (!ger.ok) throw new Error('gerador.py não encontrado no site.');
  const src = await ger.text();
  const manifesto = await fetch('conteudo/arquivos.json', { cache: 'no-store' });
  if (!manifesto.ok) throw new Error('Manifesto do motor Python não encontrado.');
  const arquivos = await manifesto.json();
  if (!Array.isArray(arquivos) || !arquivos.length || arquivos.some(nome => typeof nome !== 'string' || !/^conteudo\/[A-Za-z0-9_./-]+$/.test(nome) || nome.split('/').some(parte => parte === '..' || parte === '.'))) throw new Error('Manifesto do motor Python inválido.');
  const recursos = await Promise.all(arquivos.map(async nome => {
    const resposta = await fetch(nome, { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Arquivo do motor Python não encontrado: ' + nome);
    return [nome, new Uint8Array(await resposta.arrayBuffer())];
  }));
  log('Carregando motor Python (Pyodide)…');
  await loadScript(PYODIDE_URL + 'pyodide.js');
  const motor = await loadPyodide({ indexURL: PYODIDE_URL });
  log('Carregando bibliotecas (lxml, Pillow)…');
  await motor.loadPackage(['micropip', 'lxml', 'pillow']);
  log('Instalando python-docx e python-pptx…');
  let wheels = null;
  try { const r = await fetch('wheels/wheels.json', { cache: 'no-store' }); if (r.ok) wheels = (await r.json()).map(w => new URL('wheels/' + w, location.href).href); } catch {}
  motor.globals.set('WHEELS', wheels);
  await motor.runPythonAsync("import micropip\nw = WHEELS.to_py() if WHEELS is not None else None\nif w:\n    await micropip.install(w, deps=False)\nelse:\n    await micropip.install(['python-docx', 'python-pptx'])\n");
  motor.FS.mkdirTree('/app'); motor.FS.writeFile('/app/gerador.py', src);
  for (const [nome, dados] of recursos) {
    const caminho = '/app/' + nome;
    motor.FS.mkdirTree(caminho.slice(0, caminho.lastIndexOf('/')));
    motor.FS.writeFile(caminho, dados);
  }
  // Os fundos ANAC 20 anos são mantidos como arquivos separados para preservar a fidelidade dos modelos oficiais.
  for (const tema of ['anac20-claro', 'anac20-escuro']) {
    motor.FS.mkdirTree('/app/temas/' + tema);
    for (const arq of ['capa.png', 'conteudo-a.png', 'conteudo-b.png', 'encerramento.png']) {
      const r = await fetch('temas/' + tema + '/' + arq, { cache: 'no-store' });
      if (!r.ok) throw new Error('Fundo do tema ' + tema + ' não encontrado: ' + arq);
      motor.FS.writeFile('/app/temas/' + tema + '/' + arq, new Uint8Array(await r.arrayBuffer()));
    }
  }
  // Fontes de leitura (Atkinson Hyperlegible Next e OpenDyslexic): embutidas no HTML e no EPUB gerados. O manifesto lista os arquivos.
  log('Carregando fontes de leitura…');
  motor.FS.mkdirTree('/app/fontes');
  const rm = await fetch('fontes/manifesto.json', { cache: 'no-store' });
  if (rm.ok) {
    const man = await rm.json();
    const nomes = [].concat(...(man.familias || []).map(f => (f.arquivos || []).map(a => a.arquivo)), man.licencas || []);
    for (const nome of nomes) {
      const r = await fetch('fontes/' + nome, { cache: 'no-store' });
      if (!r.ok) throw new Error('Fonte de leitura não encontrada: ' + nome);
      motor.FS.writeFile('/app/fontes/' + nome, new Uint8Array(await r.arrayBuffer()));
    }
    motor.FS.writeFile('/app/fontes/manifesto.json', JSON.stringify(man));
    if (!nomes.some(n => /\.woff2$/.test(n))) log('Fontes de leitura ainda não instaladas no site: o conteúdo usa Verdana.', 'warn');
  } else log('Manifesto das fontes de leitura não encontrado: o conteúdo usa Verdana.', 'warn');
  await motor.runPythonAsync("import sys\nif '/app' not in sys.path: sys.path.insert(0, '/app')\nimport gerador\n");
  $('ver').textContent = 'Motor pronto · Python ' + motor.runPython('import sys; sys.version.split()[0]');
  log('Motor pronto.', 'ok');
  py = motor;
  return py;
}
