#!/usr/bin/env node
/* Gera docs/linguagem-acessivel/ a partir das regras e das mensagens (uma página por regra + índice).
   node tools/linguagem-acessivel/gerar_docs.mjs        grava os arquivos
   O teste confere se estão em dia; não edite à mão. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGRAS } from '../../web/lib/linguagem-acessivel/regras/index.js';
import MSG from '../../web/lib/linguagem-acessivel/mensagens/pt-BR.js';
import { VERSAO } from '../../web/lib/linguagem-acessivel/index.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = path.join(RAIZ, 'docs', 'linguagem-acessivel');
const nomeArq = r => r.codigo + '-' + r.id + '.md';
const ref = r => [r.referencia.wcag && 'WCAG ' + r.referencia.wcag.join(', '), r.referencia.emag && 'eMAG ' + r.referencia.emag.join(', '), r.referencia.lei && r.referencia.lei.join(', ')].filter(Boolean).join(' · ');
const AVISO = '> Página gerada por `node tools/linguagem-acessivel/gerar_docs.mjs`. Não edite à mão: mude a regra ou `mensagens/pt-BR.js`.\n';

export function gerarDocs() {
  const out = [];
  const idx = ['# Linguagem Acessível · regras', '', 'Versão da biblioteca: ' + VERSAO + '.', '', AVISO,
    '| Código | Regra | Grupo | Nível | Referência |', '|---|---|---|---|---|'];
  for (const r of REGRAS) {
    const m = MSG.regras[r.id];
    idx.push('| `' + r.codigo + '` | [' + m.titulo + '](regras/' + nomeArq(r) + ') | ' + (MSG.grupos[r.grupo] || r.grupo) + ' | ' + MSG.niveis[r.nivel] + ' | ' + ref(r) + ' |');
    const p = ['# ' + m.titulo + ' (`' + r.codigo + '`)', '', AVISO,
      '- **Nome:** `' + r.id + '`', '- **Área e grupo:** ' + MSG.areas[r.area] + ' › ' + (MSG.grupos[r.grupo] || r.grupo), '- **Nível:** ' + MSG.niveis[r.nivel], '- **Referência:** ' + ref(r)];
    if (r.tipos) p.push('- **Vale para:** ' + r.tipos.map(t => t === 'apresentacao' ? 'apresentação' : t).join(', '));
    p.push('', '## O que aparece para quem escreve', '', '> ' + m.mensagem, '');
    if (m.variantes) { p.push('Variações:', ''); Object.entries(m.variantes).forEach(([k, v]) => p.push('- `' + k + '`: ' + v)); p.push(''); }
    p.push('## Por que importa', '', m.porque, '');
    if (m.correcoes) { p.push('## Correções', ''); Object.entries(m.correcoes).forEach(([k, v]) => p.push('- **' + v + '** (`' + k + '`)')); p.push(''); }
    p.push('## Exemplos', '');
    r.exemplos.forEach(ex => {
      if (ex.ruim) p.push('Acusa' + (ex.nivel ? ' (como ' + MSG.niveis[ex.nivel].toLowerCase() + ')' : '') + ':', '', '```markdown', ex.ruim, '```', '');
      p.push(ex.ruim ? 'Melhor assim:' : 'Não acusa:', '', '```markdown', ex.bom, '```', '');
    });
    p.push('## Para não acusar', '', 'Se o caso for uma exceção, ignore a regra no bloco seguinte:', '', '```markdown', '<!-- linguagem-acessivel: ignorar ' + r.codigo + ' -->', '```', '');
    out.push([path.join(DOCS, 'regras', nomeArq(r)), p.join('\n')]);
  }
  idx.push('', '## Marcadores no texto', '', '| Marcador | Efeito |', '|---|---|',
    '| `<!-- linguagem-acessivel: ignorar i1 k1 -->` | Ignora essas regras no bloco seguinte (aceita código ou nome). |',
    '| `<!-- linguagem-acessivel: ignorar-documento i1 -->` | Ignora em todo o texto. |',
    '| `<!-- linguagem-acessivel: decorativa -->` | A imagem logo a seguir é decorativa: não precisa de descrição. |', '',
    'Os marcadores são comentários HTML: não aparecem na apostila, na apresentação nem nos demais arquivos gerados.', '',
    '## Glossário de siglas', '', 'O arquivo `web/lib/linguagem-acessivel/dados/siglas.js` traz o nome completo das siglas da área (usado em **Explicar**) e as siglas que dispensam explicação (formatos de arquivo e documentos comuns). Para incluir uma sigla, acrescente uma linha `SIGLA: \'Nome completo\',` em ordem alfabética.', '');
  out.push([path.join(DOCS, 'README.md'), idx.join('\n')]);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [a, c] of gerarDocs()) { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, c); console.log('gerado: ' + path.relative(RAIZ, a)); }
}
