#!/usr/bin/env node
/* Monta o pacote da release do lac: lac-<versão>.tar.gz e SHA256SUMS.
   node tools/lac/empacotar.mjs [--saida pasta]     (padrão: dist/)
   O pacote repete o desenho do repositório (tools/lac, web/lib/linguagem-acessivel, web/opcoes.js), porque o lac importa
   esses arquivos por caminho relativo. Testes e ferramentas de geração ficam de fora. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(AQUI, '..', '..');
const comandos = JSON.parse(fs.readFileSync(path.join(AQUI, 'comandos.json'), 'utf8'));
export const VERSAO = comandos.programa.versao;

export const ARQUIVOS = [
  ...['lac.mjs', 'ajuda.mjs', 'formatos.mjs', 'servidor.mjs', 'openapi.mjs', 'comandos.json', 'openapi.json', 'lac.1', 'lac.cmd', 'package.json', 'CHANGELOG.md']
    .map(a => 'tools/lac/' + a),
  'tools/lac/completar',
  'web/opcoes.js',
  'web/lib/linguagem-acessivel',
  'docs/lac.md',
];

const LEIA_ME = v => `# lac ${v}

Linha de comando e API local da Linguagem Acessível. Confere acessibilidade e linguagem simples em textos Markdown.
Precisa do Node.js 18 ou mais novo. Não há nada para instalar.

    node tools/lac/lac.mjs c apostila.md      conferir
    node tools/lac/lac.mjs servir -p 8787     abrir a API em 127.0.0.1
    node tools/lac/lac.mjs -v                 versões

No Windows: tools\\lac\\lac.cmd. Para usar só "lac": npm link, dentro de tools/lac.
Documentação completa: docs/lac.md · manual: man ./tools/lac/lac.1 · novidades: tools/lac/CHANGELOG.md
`;

export function empacotar({ saida = path.join(RAIZ, 'dist') } = {}) {
  const nome = 'lac-' + VERSAO, destino = path.resolve(saida), pasta = path.join(destino, nome);
  fs.rmSync(pasta, { recursive: true, force: true });
  for (const rel of ARQUIVOS) {
    const origem = path.join(RAIZ, rel);
    if (!fs.existsSync(origem)) throw new Error('Arquivo do pacote não existe: ' + rel);
    fs.mkdirSync(path.dirname(path.join(pasta, rel)), { recursive: true });
    fs.cpSync(origem, path.join(pasta, rel), { recursive: true });
  }
  fs.writeFileSync(path.join(pasta, 'LEIA-ME.md'), LEIA_ME(VERSAO));
  const arquivo = path.join(destino, nome + '.tar.gz');
  fs.rmSync(arquivo, { force: true });
  // Caminhos relativos: o tar do Windows e o do Linux entendem; "C:" em caminho absoluto confunde o GNU tar.
  const r = spawnSync('tar', ['-czf', nome + '.tar.gz', nome], { cwd: destino, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('tar falhou: ' + (r.stderr || r.error || r.status));
  const soma = crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');
  const sums = path.join(destino, 'SHA256SUMS');
  fs.writeFileSync(sums, soma + '  ' + nome + '.tar.gz\n');
  return { nome, pasta, arquivo, sums, soma };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--saida');
  const r = empacotar(i > 0 ? { saida: process.argv[i + 1] } : {});
  console.log('pacote: ' + path.relative(process.cwd(), r.arquivo) + '\nsha256: ' + r.soma);
}
