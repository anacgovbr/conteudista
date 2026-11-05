#!/usr/bin/env node
/* =====================================================================================
   Verificação das opções padrão (web/config/opcoes.yaml)
     node tools/opcoes/verificar_opcoes.js            confere tudo (usado no GitHub antes de publicar)
     node tools/opcoes/verificar_opcoes.js --gerar    regenera opcoes.exemplo.yaml, opcoes.schema.json e docs/OPCOES.md
   Confere: (1) opcoes.yaml sem erro, (2) arquivos gerados em dia com o registro,
            (3) toda caixa de ligar/desligar da página registrada (ou listada como exceção).
   Saída: 0 tudo certo · 1 há problemas.
   ===================================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const O = require(path.join(RAIZ, 'web', 'opcoes.js'));
const CFG = path.join(RAIZ, 'web', 'config');
const gerar = process.argv.includes('--gerar');
let falhas = 0;
const ok = (c, m) => { if (c) console.log('  ok   ' + m); else { falhas++; console.log('  FALHA ' + m); } };

/* ---------------------------- Arquivos derivados do registro ---------------------------- */
function grupos() {
  const g = new Map();
  O.REGISTRO.forEach(r => { const p = r.caminho.split('.'); const k = p.slice(0, -1).join('.'); if (!g.has(k)) g.set(k, []); g.get(k).push(r); });
  return g;
}
const TITULOS = { editor: 'Editor', 'editor.imagens': 'Editor · imagens', aplicativo: 'Aplicativo', salvar: 'Salvar e Histórico', link: 'Link criptografado', importar: 'Importar', celular: 'Celular', acessibilidade_texto: 'Acessibilidade do texto', narracao: 'Narração (aba Gerar)', locucao: 'Locução' };
const aceitos = r => r.tipo === 'chave' ? 'ligado | desligado' : r.tipo === 'numero' ? r.min + ' a ' + r.max : Object.keys(r.valores).join(' | ');
function yamlExemplo() {
  const o = ['# yaml-language-server: $schema=opcoes.schema.json',
    '# =====================================================================',
    '# Conteudista · opções padrão',
    '# Define como cada opção COMEÇA para quem abre o Conteudista.',
    '# Se a pessoa já mudou a opção no navegador, vale a escolha dela.',
    '# "Restaurar padrão" (rodapé da página) volta tudo para este arquivo.',
    '#',
    '# Como mudar: troque o valor depois dos dois-pontos, salve e publique.',
    '#   ligado / desligado  (também aceita sim / não)',
    '# Use 2 espaços para recuar. Não use tabulação.',
    '# Linha que começa com # é comentário.',
    '# =====================================================================', '', 'versao: 1'];
  for (const [g, rs] of grupos()) {
    const nivel = g.split('.');
    o.push('');
    nivel.forEach((n, i) => { if (i === nivel.length - 1) o.push('  '.repeat(i) + n + ':' + (i === 0 ? '  # ' + (TITULOS[g] || g) : '')); });
    rs.forEach(r => {
      const pre = '  '.repeat(nivel.length), nome = r.caminho.split('.').pop();
      o.push(pre + '# ' + r.rotulo + (r.descricao ? '. ' + r.descricao : '') + ' [' + aceitos(r) + ']');
      o.push(pre + nome + ': ' + r.padrao);
    });
  }
  return o.join('\n') + '\n';
}
function schema() {
  const props = {};
  for (const r of O.REGISTRO) {
    const p = r.caminho.split('.'); let alvo = props;
    p.slice(0, -1).forEach(k => { alvo[k] = alvo[k] || { type: 'object', additionalProperties: false, properties: {} }; alvo = alvo[k].properties; });
    const nome = p[p.length - 1];
    const d = { description: r.rotulo + (r.descricao ? '. ' + r.descricao : ''), default: r.padrao };
    if (r.tipo === 'chave') d.enum = ['ligado', 'desligado', 'sim', 'não', 'nao', true, false];
    else if (r.tipo === 'numero') Object.assign(d, { type: 'integer', minimum: r.min, maximum: r.max });
    else d.enum = Object.keys(r.valores);
    alvo[nome] = d;
  }
  return JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'opcoes.schema.json', title: 'Conteudista · opções padrão',
    type: 'object', additionalProperties: false, properties: Object.assign({ versao: { const: O.VERSAO_FORMATO, description: 'Versão do formato deste arquivo' } }, props) }, null, 2) + '\n';
}
function docs() {
  const o = ['# Opções padrão do Conteudista', '',
    'Arquivo: `web/config/opcoes.yaml`. Ele define como cada opção **começa**. Se a pessoa já mudou a opção no navegador, vale a escolha dela. O botão **Restaurar padrão**, no rodapé, volta tudo para o que está no arquivo.', '',
    '**Para mudar:** edite o valor depois dos dois-pontos, salve e publique. A verificação do GitHub recusa a publicação se houver erro e diz a linha.', '',
    '> Este documento é gerado por `node tools/opcoes/verificar_opcoes.js --gerar`. Não edite à mão.', ''];
  for (const [g, rs] of grupos()) {
    o.push('## ' + (TITULOS[g] || g), '', '| Opção | O que faz | Valores | Padrão | Lembrada no navegador |', '|---|---|---|---|---|');
    rs.forEach(r => o.push('| `' + r.caminho.split('.').pop() + '` | ' + r.rotulo + (r.descricao ? '. ' + r.descricao : '') + ' | ' + aceitos(r).replace(/\|/g, '·') + ' | `' + r.padrao + '` | ' + (r.chave ? 'sim' : 'não (vale ao abrir)') + ' |'));
    o.push('');
  }
  return o.join('\n');
}
const DERIVADOS = [[path.join(CFG, 'opcoes.exemplo.yaml'), yamlExemplo], [path.join(CFG, 'opcoes.schema.json'), schema], [path.join(RAIZ, 'docs', 'OPCOES.md'), docs]];

if (gerar) {
  for (const [f, fn] of DERIVADOS) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, fn()); console.log('gerado: ' + path.relative(RAIZ, f)); }
  const real = path.join(CFG, 'opcoes.yaml');
  if (!fs.existsSync(real)) { fs.writeFileSync(real, yamlExemplo()); console.log('criado: web/config/opcoes.yaml'); }
  process.exit(0);
}

/* ---------------------------- 1. opcoes.yaml ---------------------------- */
console.log('1. web/config/opcoes.yaml');
const real = path.join(CFG, 'opcoes.yaml');
ok(fs.existsSync(real), 'arquivo existe');
if (fs.existsSync(real)) {
  const r = O.interpretar(fs.readFileSync(real, 'utf8'));
  r.avisos.forEach(a => console.log('        linha ' + a.linha + ': ' + a.msg));
  ok(r.avisos.length === 0, 'sem erros (' + Object.keys(r.valores).length + ' opções definidas)');
}
console.log('2. Arquivos gerados do registro');
for (const [f, fn] of DERIVADOS) ok(fs.existsSync(f) && fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') === fn(), path.relative(RAIZ, f) + ' em dia (se falhar: node tools/opcoes/verificar_opcoes.js --gerar)');
const ex = O.interpretar(yamlExemplo()); ok(ex.avisos.length === 0 && Object.keys(ex.valores).length === O.REGISTRO.length, 'opcoes.exemplo.yaml lido sem erro e com todas as opções');

/* ---------------------------- 3. Cobertura ---------------------------- */
console.log('3. Toda caixa de ligar/desligar da página está registrada');
const registrados = new Set(O.REGISTRO.flatMap(r => r.controles));
const fontes = fs.readdirSync(path.join(RAIZ, 'web')).filter(f => /\.(js|html)$/.test(f) && f !== 'opcoes.js').map(f => path.join(RAIZ, 'web', f));
const achados = [];
for (const f of fontes) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/<input\b([^>]*?)type=["']checkbox["']([^>]*)>/g)) {
    const at = m[1] + ' ' + m[2];
    const id = (at.match(/\bid=["']([^"']+)["']/) || [])[1];
    const data = (at.match(/\b(data-[a-z-]+)/) || [])[1];
    const cls = /class=["']?task/.test(s.slice(Math.max(0, m.index - 40), m.index)) ? 'task' : null;
    achados.push({ arq: path.basename(f), nome: id || data || cls || '(sem nome)' });
  }
}
achados.forEach(a => ok(registrados.has(a.nome) || Object.prototype.hasOwnProperty.call(O.EXCECOES, a.nome), a.arq + ': ' + a.nome + (O.EXCECOES[a.nome] ? ' (exceção: ' + O.EXCECOES[a.nome] + ')' : '')));
const ids = new Set(fontes.flatMap(f => [...fs.readFileSync(f, 'utf8').matchAll(/\bid=["']([A-Za-z0-9_-]+)["']/g)].map(m => m[1])));
O.REGISTRO.forEach(r => r.controles.filter(c => !c.startsWith('data-')).forEach(c => ok(ids.has(c), r.caminho + ': controle #' + c + ' existe na página')));
O.REGISTRO.filter(r => r.chave).forEach(r => ok(fontes.some(f => fs.readFileSync(f, 'utf8').includes(r.chave) || fs.readFileSync(f, 'utf8').includes("'" + r.chave.split('.').pop() + "'")), r.caminho + ': chave ' + r.chave + ' usada pelo código'));

console.log(falhas ? '\nHÁ ' + falhas + ' PROBLEMA(S).' : '\nTUDO CERTO.');
process.exit(falhas ? 1 : 0);
