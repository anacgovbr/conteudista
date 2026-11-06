import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = new URL('../../', import.meta.url);
const fonte = await readFile(new URL('web/motor-python.js', raiz), 'utf8');
const manifesto = JSON.parse(await readFile(new URL('tools/conteudo/arquivos.json', raiz), 'utf8'));

function ambiente({ falharTema = false, invalido = false } = {}) {
  let inicializacoes = 0;
  let falhou = false;
  const arquivos = new Map();
  const motor = {
    globals: { set() {} },
    FS: { mkdirTree() {}, writeFile(nome, conteudo) { arquivos.set(nome, conteudo); } },
    async loadPackage() {},
    async runPythonAsync(codigo) {
      if (codigo.includes('import gerador')) {
        assert.ok(arquivos.has('/app/gerador.py'));
        for (const nome of manifesto) assert.ok(arquivos.has('/app/' + nome), nome);
      }
    },
    runPython() { return '3.12'; }
  };
  const contexto = vm.createContext({
    py: null, Uint8Array, PYODIDE_URL: '/pyodide/', log() {},
    location: { href: 'https://exemplo.test/' },
    $() { return { textContent: '' }; },
    document: { createElement() { return {}; }, head: { appendChild(script) { queueMicrotask(script.onload); } } },
    async loadPyodide() { inicializacoes++; return motor; },
    async fetch(nome) {
      if (nome === 'conteudo/arquivos.json') return { ok: true, json: async () => invalido ? ['conteudo/../segredo.py'] : manifesto };
      if (nome === 'wheels/wheels.json' || nome === 'fontes/manifesto.json') return { ok: false };
      if (nome.startsWith('temas/')) {
        if (falharTema && !falhou) { falhou = true; return { ok: false }; }
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
      }
      const caminho = nome === 'gerador.py' ? 'tools/gerador.py' : 'tools/' + nome;
      const dados = await readFile(fileURLToPath(new URL(caminho, raiz)));
      return { ok: true, text: async () => dados.toString('utf8'), arrayBuffer: async () => dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength) };
    }
  });
  vm.runInContext(fonte, contexto);
  return { contexto, arquivos, inicializacoes: () => inicializacoes };
}

const simultaneo = ambiente();
await Promise.all([simultaneo.contexto.prepararPython(), simultaneo.contexto.prepararPython()]);
assert.equal(simultaneo.inicializacoes(), 1);
assert.ok(simultaneo.contexto.py);
await simultaneo.contexto.prepararPython();
assert.equal(simultaneo.inicializacoes(), 1);

const falha = ambiente({ falharTema: true });
await assert.rejects(falha.contexto.prepararPython(), /Fundo do tema/);
assert.equal(falha.contexto.py, null);
await falha.contexto.prepararPython();
assert.equal(falha.inicializacoes(), 2);
assert.ok(falha.contexto.py);

const invalido = ambiente({ invalido: true });
await assert.rejects(invalido.contexto.prepararPython(), /Manifesto.*inválido/);
assert.equal(invalido.inicializacoes(), 0);
console.log('OK: manifesto, arquivos, inicializacao unica, recuperacao de falha e caminhos invalidos.');