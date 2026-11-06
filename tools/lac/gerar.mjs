#!/usr/bin/env node
/* Gera, a partir de tools/lac/comandos.json: docs/lac.md, tools/lac/lac.1, completadores e openapi.json.
   node tools/lac/gerar.mjs        grava os arquivos (o teste confere se estão em dia) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { manual, completarBash, completarZsh, markdown } from './ajuda.mjs';
import { documentoOpenApi } from './openapi.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(AQUI, '..', '..');
export const gerados = () => [
  [path.join(RAIZ, 'docs', 'lac.md'), markdown()],
  [path.join(AQUI, 'lac.1'), manual()],
  [path.join(AQUI, 'completar', 'lac.bash'), completarBash()],
  [path.join(AQUI, 'completar', 'lac.zsh'), completarZsh()],
  [path.join(AQUI, 'openapi.json'), JSON.stringify(documentoOpenApi(), null, 2) + '\n'],
];
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [a, c] of gerados()) { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, c); console.log('gerado: ' + path.relative(RAIZ, a)); }
}
