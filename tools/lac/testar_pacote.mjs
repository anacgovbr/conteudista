#!/usr/bin/env node
/* Testa o pacote da release do lac: node tools/lac/testar_pacote.mjs
   Monta o pacote, extrai fora do repositório e usa o lac e a API só com o que veio dentro dele. Saída: 0 tudo certo · 1 há falhas. */
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { empacotar, VERSAO } from './empacotar.mjs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lac-pacote-'));
let n = 0, f = 0;
const t = async (nome, fn) => { n++; try { await fn(); console.log('  ok   ' + nome); } catch (e) { f++; console.log('  FALHA ' + nome + '\n        ' + String(e && e.message || e).split('\n').join('\n        ')); } };
const igual = (a, b, m) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((m ? m + ': ' : '') + 'esperado ' + y + ', veio ' + x); };
const verdade = (c, m) => { if (!c) throw new Error(m || 'condição falsa'); };
const porta = () => new Promise((ok, erro) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); s.on('error', erro); });
const dormir = ms => new Promise(r => setTimeout(r, ms));

try {
  console.log('Pacote do lac ' + VERSAO);
  const r = empacotar({ saida: path.join(TMP, 'saida') });
  const base = path.join(TMP, 'extraido');
  fs.mkdirSync(base);
  const x = spawnSync('tar', ['-xzf', r.arquivo, '-C', base], { encoding: 'utf8' });
  const raiz = path.join(base, r.nome), LAC = path.join(raiz, 'tools', 'lac', 'lac.mjs');
  const lac = (args, entrada) => { const p = spawnSync(process.execPath, [LAC, ...args], { input: entrada || '', encoding: 'utf8', cwd: base, env: Object.assign({}, process.env, { NO_COLOR: '1' }) }); return { cod: p.status, out: p.stdout, err: p.stderr }; };
  const listar = d => fs.readdirSync(d, { recursive: true }).map(a => String(a).replace(/\\/g, '/'));

  await t('o pacote extrai e SHA256SUMS confere', () => {
    igual(x.status, 0, x.stderr);
    const linha = fs.readFileSync(r.sums, 'utf8').trim().split(/\s+/);
    igual(linha, [crypto.createHash('sha256').update(fs.readFileSync(r.arquivo)).digest('hex'), r.nome + '.tar.gz']);
  });
  await t('traz o lac, a biblioteca, a documentação e o manual', () => {
    const l = listar(raiz);
    for (const a of ['LEIA-ME.md', 'docs/lac.md', 'tools/lac/instalar.sh', 'tools/lac/lac.mjs', 'tools/lac/lac.1', 'tools/lac/openapi.json', 'tools/lac/CHANGELOG.md', 'web/opcoes.js', 'web/lib/linguagem-acessivel/index.js', 'tools/lac/completar/lac.bash']) verdade(l.includes(a), 'falta ' + a);
  });
  await t('não leva testes nem ferramentas de desenvolvimento', () => {
    const l = listar(raiz);
    verdade(!l.some(a => /testar_|gerar\.mjs|empacotar\.mjs|node_modules|\.sarif$/.test(a)), l.filter(a => /testar_|gerar\.mjs|empacotar\.mjs|node_modules/.test(a)).join(', '));
  });
  await t('lac -v funciona isolado e informa a versão da release', () => {
    const v = lac(['-v']);
    igual(v.cod, 0, v.err); verdade(v.out.startsWith('lac ' + VERSAO + ' · API v1 · biblioteca '), v.out);
  });
  await t('lac conferir isolado: 1 com itens para corrigir, 0 sem eles', () => {
    igual(lac(['c', '-n', 'c'], '# A\n\n### B\n\nVeja [aqui](x).\n').cod, 1);
    igual(lac(['c', '-n', 'c'], '# A\n\n## B\n\nVeja o [portal da agência](https://www.gov.br/anac).\n').cod, 0);
  });
  await t('lac ajustar, regras e completar funcionam isolados', () => {
    igual(lac(['a'], '# A\n\nTexto.\n').cod, 0);
    verdade(lac(['r']).out.includes('i1'), 'regras');
    verdade(/complete -F _lac lac/.test(lac(['completar', 'bash']).out), 'completar');
  });
  await t('lac servir isolado: /v1/saude e /v1/openapi.json', async () => {
    const p = await porta();
    const filho = spawn(process.execPath, [LAC, 'servir', '-p', String(p)], { cwd: base, stdio: 'ignore' });
    try {
      let saude = null;
      for (let i = 0; i < 50 && !saude; i++) {
        try { const resposta = await fetch('http://127.0.0.1:' + p + '/v1/saude'); if (resposta.ok) saude = await resposta.json(); } catch { await dormir(100); }
      }
      verdade(saude, 'servidor não respondeu');
      igual([saude.estado, saude.api, saude.versao], ['ok', 'v1', VERSAO]);
      const api = await (await fetch('http://127.0.0.1:' + p + '/v1/openapi.json')).json();
      igual([api.openapi, api.info.version.split('.')[0]], ['3.1.0', VERSAO.split('.')[0]]);
      const c = await fetch('http://127.0.0.1:' + p + '/v1/conferir', { method: 'POST', headers: { 'Content-Type': 'text/markdown' }, body: '# A\n\n### B\n' });
      igual(c.status, 200);
    } finally { await new Promise(ok => { filho.once('exit', ok); filho.kill(); }); }
  });
  if (process.platform === 'linux') {
    const mock = path.join(TMP, 'mock');
    fs.mkdirSync(mock);
    fs.writeFileSync(path.join(mock, 'curl'), `#!/usr/bin/env bash
set -eu
saida=""
url=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) saida="$2"; shift ;;
    https://*) url="$1" ;;
  esac
  shift
done
if [ "\${LAC_TEST_FAIL:-}" = download ]; then echo "curl: falha simulada" >&2; exit 22; fi
if [ "\${LAC_TEST_FAIL:-}" = checksum ] && [[ "$url" == */SHA256SUMS ]]; then
  printf '%064d  lac-${VERSAO}.tar.gz\\n' 0 > "$saida"
else
  cp "$LAC_TEST_FIXTURE/\${url##*/}" "$saida"
fi
`, { mode: 0o755 });
    const instalar = (home, extras = {}) => spawnSync('bash', [path.join(raiz, 'tools', 'lac', 'instalar.sh')], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home, PATH: mock + ':' + process.env.PATH, LAC_VERSION: VERSAO, LAC_TEST_FIXTURE: path.dirname(r.arquivo), ...extras },
    });
    const home = path.join(TMP, 'usuario com espacos');
    await t('instalador Linux cria os dois comandos sem sudo; repeticao preserva a pasta', () => {
      let p = instalar(home);
      igual(p.status, 0, p.stderr);
      verdade(p.stdout.includes('export PATH='), 'precisa orientar sobre o PATH');
      for (const nome of ['lac', 'linguagem-acessivel']) {
        const comando = path.join(home, '.local', 'bin', nome);
        verdade(fs.lstatSync(comando).isSymbolicLink(), nome);
        const v = spawnSync(comando, ['-v'], { encoding: 'utf8' });
        igual(v.status, 0, v.stderr);
        verdade(v.stdout.startsWith('lac ' + VERSAO + ' '), v.stdout);
      }
      const marcador = path.join(home, '.local', 'share', 'lac', 'lac-' + VERSAO, '.instalado-pelo-lac');
      const antes = fs.statSync(marcador).mtimeMs;
      p = instalar(home);
      igual(p.status, 0, p.stderr);
      igual(fs.statSync(marcador).mtimeMs, antes);
      verdade(!fs.existsSync(path.join(home, '.bashrc')), 'nao deve modificar o shell');
    });
    await t('falha de download ou checksum nao instala comandos', () => {
      for (const falha of ['download', 'checksum']) {
        const h = path.join(TMP, falha);
        const p = instalar(h, { LAC_TEST_FAIL: falha });
        verdade(p.status !== 0, 'precisa falhar: ' + falha);
        verdade(p.stderr.includes('lac:') || p.stderr.includes('curl:'), p.stderr);
        verdade(!fs.existsSync(path.join(h, '.local')), 'nao deve instalar apos ' + falha);
      }
    });
    await t('conflito com arquivo ou link de terceiros nao sobrescreve comandos', () => {
      for (const tipo of ['arquivo', 'link']) {
        const h = path.join(TMP, 'conflito-' + tipo);
        const bin = path.join(h, '.local', 'bin');
        fs.mkdirSync(bin, { recursive: true });
        const arquivo = path.join(bin, 'lac');
        if (tipo === 'arquivo') fs.writeFileSync(arquivo, 'terceiro');
        else fs.symlinkSync('/nao-existe/comando-de-terceiros', arquivo);
        const p = instalar(h);
        verdade(p.status !== 0 && p.stderr.includes('lac:'), p.stderr);
        igual(tipo === 'arquivo' ? fs.readFileSync(arquivo, 'utf8') : fs.readlinkSync(arquivo),
          tipo === 'arquivo' ? 'terceiro' : '/nao-existe/comando-de-terceiros');
      }
    });
    await t('versao invalida e Node.js antigo sao erros explicitos antes da instalacao', () => {
      let p = instalar(path.join(TMP, 'versao-invalida'), { LAC_VERSION: '../invalida' });
      verdade(p.status !== 0 && p.stderr.includes('LAC_VERSION'), p.stderr);
      const antigo = path.join(TMP, 'node-antigo');
      fs.mkdirSync(antigo);
      fs.writeFileSync(path.join(antigo, 'node'), '#!/usr/bin/env bash\nexit 1\n', { mode: 0o755 });
      p = instalar(path.join(TMP, 'node-invalido'), { PATH: antigo + ':' + mock + ':' + process.env.PATH });
      verdade(p.status !== 0 && p.stderr.includes('Node.js 18'), p.stderr);
    });
  } else {
    console.log('  aviso: testes do instalador Linux executam somente no Linux (CI/WSL).');
  }
} catch (e) {
  f++; n++; console.log('  FALHA montagem do pacote\n        ' + (e && e.stack || e));
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log('\n' + (n - f) + ' de ' + n + ' testes aprovados.');
process.exitCode = f ? 1 : 0;
