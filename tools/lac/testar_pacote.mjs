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
    for (const a of ['LEIA-ME.md', 'docs/lac.md', 'tools/lac/lac.mjs', 'tools/lac/lac.1', 'tools/lac/openapi.json', 'tools/lac/CHANGELOG.md', 'web/opcoes.js', 'web/lib/linguagem-acessivel/index.js', 'tools/lac/completar/lac.bash']) verdade(l.includes(a), 'falta ' + a);
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
} catch (e) {
  f++; n++; console.log('  FALHA montagem do pacote\n        ' + (e && e.stack || e));
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log('\n' + (n - f) + ' de ' + n + ' testes aprovados.');
process.exitCode = f ? 1 : 0;
