#!/usr/bin/env node
/* =====================================================================================
   Testes da biblioteca Linguagem Acessível (web/lib/linguagem-acessivel). Sem dependências.
     node tools/linguagem-acessivel/testar.mjs                      roda tudo
     node tools/linguagem-acessivel/testar.mjs --atualizar          regrava todos os resultados conhecidos (revise o diff!)
     node tools/linguagem-acessivel/testar.mjs --atualizar-exemplo  regrava só os do conteúdo de exemplo
   Grupos: exemplos de cada regra · frases · posições · marcadores · contrato (JSON Schema) · regras de linguagem ·
           pedidos para IA · resultados conhecidos · propriedades (texto aleatório) · cache · desempenho · pureza.
   Saída: 0 tudo certo · 1 há falhas.
   ===================================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import * as LA from '../../web/lib/linguagem-acessivel/index.js';
import { REGRAS } from '../../web/lib/linguagem-acessivel/regras/index.js';
import MSG from '../../web/lib/linguagem-acessivel/mensagens/pt-BR.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const LIB = path.join(RAIZ, 'web', 'lib', 'linguagem-acessivel');
const ATUALIZAR = process.argv.includes('--atualizar');
const ATUALIZAR_EX = ATUALIZAR || process.argv.includes('--atualizar-exemplo');
let n = 0, f = 0;
const t = (nome, fn) => { n++; try { fn(); console.log('  ok   ' + nome); } catch (e) { f++; console.log('  FALHA ' + nome + '\n        ' + String(e && e.message || e).split('\n').join('\n        ')); } };
const igual = (a, b, m) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((m ? m + ': ' : '') + 'esperado ' + y + ', veio ' + x); };
const verdade = (c, m) => { if (!c) throw new Error(m || 'condição falsa'); };
const cods = (r, c) => r.diagnosticos.filter(d => !c || d.codigo === c);

/* ------------------------------------------------ validador mínimo de JSON Schema (o que os esquemas usam) */
const ESQ = {};
for (const a of ['diagnostico', 'resultado']) ESQ[a + '.schema.json'] = JSON.parse(fs.readFileSync(path.join(LIB, 'esquema', a + '.schema.json'), 'utf8'));
function validar(v, s, cam = '$') {
  if (s.$ref) return validar(v, ESQ[s.$ref], cam);
  const erros = [];
  const tipo = Array.isArray(v) ? 'array' : v === null ? 'null' : Number.isInteger(v) ? 'integer' : typeof v;
  if (s.enum && !s.enum.includes(v)) erros.push(cam + ': fora de ' + JSON.stringify(s.enum));
  if (s.type) { const ok = s.type === tipo || (s.type === 'number' && tipo === 'integer'); if (!ok) return [cam + ': esperado ' + s.type + ', veio ' + tipo]; }
  if (s.minimum !== undefined && v < s.minimum) erros.push(cam + ': menor que ' + s.minimum);
  if (s.minLength !== undefined && String(v).length < s.minLength) erros.push(cam + ': vazio');
  if (s.pattern && !new RegExp(s.pattern).test(v)) erros.push(cam + ': não segue ' + s.pattern);
  if (tipo === 'object' && s.properties) {
    (s.required || []).forEach(k => { if (!(k in v)) erros.push(cam + '.' + k + ': obrigatório'); });
    Object.keys(v).forEach(k => { if (s.properties[k]) erros.push(...validar(v[k], s.properties[k], cam + '.' + k)); else if (s.additionalProperties === false) erros.push(cam + '.' + k + ': não previsto'); });
  }
  if (tipo === 'array') { if (s.minItems && v.length < s.minItems) erros.push(cam + ': poucos itens'); if (s.items) v.forEach((x, i) => erros.push(...validar(x, s.items, cam + '[' + i + ']'))); }
  return erros;
}
export const conforme = r => { const e = validar(r, ESQ['resultado.schema.json']); if (e.length) throw new Error('fora do contrato:\n' + e.slice(0, 5).join('\n')); };

/* ------------------------------------------------ 1. exemplos de cada regra */
console.log('1. Exemplos de cada regra (o ruim acusa, o bom não)');
for (const r of REGRAS) {
  r.exemplos.forEach((ex, i) => {
    if (ex.ruim) t(r.codigo + ' ' + r.id + ': exemplo ruim ' + (i + 1) + ' acusa', () => {
      const res = LA.analisar(ex.ruim, { regras: [r.codigo], tipo: ex.tipo }), d = cods(res, r.codigo);
      verdade(d.length >= 1, 'não acusou: ' + JSON.stringify(ex.ruim));
      igual(d[0].nivel, ex.nivel || r.nivel, 'nível');
      conforme(res);
    });
    t(r.codigo + ' ' + r.id + ': exemplo bom ' + (i + 1) + ' não acusa', () => igual(cods(LA.analisar(ex.bom, { tipo: ex.tipo }), r.codigo).length, 0, JSON.stringify(ex.bom)));
  });
  t(r.codigo + ': textos em mensagens/pt-BR.js (título, mensagem, porquê)', () => { const m = MSG.regras[r.id]; verdade(m && m.titulo && m.mensagem && m.porque); });
}
t('códigos e ids únicos; código = letra do grupo + número', () => {
  igual(new Set(REGRAS.map(r => r.codigo)).size, REGRAS.length); igual(new Set(REGRAS.map(r => r.id)).size, REGRAS.length);
  const letra = { imagens: 'i', estrutura: 'e', links: 'k', frases: 'f', siglas: 's', narracao: 'n' };
  REGRAS.forEach(r => verdade(r.codigo[0] === letra[r.grupo], r.codigo));
});
t('regra nova de linguagem entra como sugestão (f, s, n)', () => REGRAS.filter(r => r.area === 'linguagem').forEach(r => igual(r.nivel, 'sugestao', r.codigo)));
t('e1: em apresentação, cada slide recomeça os níveis', () => igual(cods(LA.analisar('---\ntitle: x\n---\n\n# A\n\n## B\n\n---\n\n# C\n\n## D\n', { tipo: 'apresentacao' }), 'e1').length, 0));
t('e1: corrigir um título leva em conta o nível corrigido nos seguintes', () => igual(cods(LA.analisar('# A\n\n#### B\n\n### C\n'), 'e1').map(d => d.linha), [3]));
t('k1: link em código e imagem não são links', () => igual(cods(LA.analisar('Use `[aqui](x)`.\n\n```\n[aqui](x)\n```\n\n![aqui](x.png)'), 'k1').length, 0));
t('i1: imagem recolhida do editor ![](img:3) também é conferida', () => igual(cods(LA.analisar('![](img:3)'), 'i1').length, 1));
t('e2: só vale em apresentação; slide vazio e capa sem conteúdo não acusam', () => {
  igual(cods(LA.analisar('Só texto.', { tipo: 'apostila' }), 'e2').length, 0);
  igual(cods(LA.analisar('---\ntitle: x\n---\n\n# A\n\n---\n\n<!-- notas: só nota -->\n\n---\n\n# B\n', { tipo: 'apresentacao' }), 'e2').length, 0);
  const r = LA.analisar('---\ntitle: x\n---\n\n# A\n\n---\n\nTexto solto.\n\n---\n\n# C\n', { tipo: 'apresentacao' });
  igual(cods(r, 'e2').map(d => [d.linha, d.slide]), [[9, 2]]);
});
t('e3: "Usar a primeira linha" move a primeira linha de dados para o cabeçalho', () => {
  const tx = 'Antes.\n\n|  |  |\n|---|---|\n| Etapa | Prazo |\n| Análise | 10 |\n\nDepois.';
  const d = cods(LA.analisar(tx), 'e3')[0], novo = LA.aplicar(tx, d.correcoes.find(c => c.id === 'primeira-linha'));
  igual(novo, 'Antes.\n\n| Etapa | Prazo |\n|---|---|\n| Análise | 10 |\n\nDepois.'); igual(cods(LA.analisar(novo), 'e3').length, 0);
});
t('e3: tabela no fim do texto também é corrigida', () => {
  const tx = '|  |  |\n|---|---|\n| A | B |', d = cods(LA.analisar(tx), 'e3')[0];
  igual(LA.aplicar(tx, d.correcoes[0]), '| A | B |\n|---|---|');
});

/* ------------------------------------------------ 2. frases */
console.log('2. Frases e palavras');
const fr = s => LA.dividirFrases(s).map(x => x.texto);
t('abreviações não encerram a frase (art., nº, Sr., S.A.)', () => igual(fr('Veja o art. 5º da Lei nº 8.112. O Sr. Silva e a ANAC S.A. respondem.').length, 2));
t('números com ponto e vírgula', () => igual(fr('Custa R$ 1.500,00 e vence em 3.2 dias. Fim.').length, 2));
t('reticências, ! e ?', () => igual(fr('Será? Sim! Talvez... Depois.').length, 4));
t('endereço com ponto não quebra (gov.br)', () => igual(fr('Acesse gov.br/anac e www.anac.gov.br hoje.').length, 1));
t('itens de lista e linhas de tabela ficam separados', () => igual(fr('- um\n- dois\n\n| a | b |').length, 3));
t('quebra de linha simples não encerra a frase', () => igual(fr('O pedido segue\npara a coordenação.').length, 1));
t('palavras ignoram endereço do link, imagem e ênfase', () => igual(LA.contarPalavras('Veja **o** [portal da ANAC](https://www.gov.br/anac) ![logo](a.png).'), 5));

/* ------------------------------------------------ 3. posições */
console.log('3. Posições (contrato)');
t('linha e coluna começam em 1; coluna conta pontos de código (emoji = 1)', () => {
  const d = cods(LA.analisar('😀 é ![](a.png)'), 'i1')[0]; igual([d.linha, d.coluna, d.inicio], [1, 5, 5]);
});
t('fim exclusivo: texto.slice(inicio, fim) é o trecho marcado', () => {
  const tx = 'Texto.\n\nVer [aqui](https://x).'; const d = cods(LA.analisar(tx), 'k1')[0];
  igual(tx.slice(d.inicio, d.fim), '[aqui](https://x)');
});
t('finais de linha do Windows (CRLF) dão o mesmo resultado', () => {
  const lf = fs.readFileSync(path.join(AQUI, 'casos', 'problemas.md'), 'utf8').replace(/\r\n/g, '\n'), crlf = lf.replace(/\n/g, '\r\n');
  igual(LA.analisar(crlf).diagnosticos.map(d => [d.codigo, d.linha, d.coluna]), LA.analisar(lf).diagnosticos.map(d => [d.codigo, d.linha, d.coluna]));
});

/* ------------------------------------------------ 4. marcadores */
console.log('4. Marcadores no texto');
t('ignorar no bloco seguinte (por código ou nome)', () => {
  igual(LA.analisar('<!-- linguagem-acessivel: ignorar k1 -->\n[aqui](x)\n\n[aqui](y)').resumo.total, 1);
  igual(LA.analisar('<!-- linguagem-acessivel: ignorar link-vago -->\n\n[aqui](x)').resumo.total, 0);
});
t('ignorar-documento', () => igual(LA.analisar('<!-- linguagem-acessivel: ignorar-documento i1 -->\n![](a.png)\n\n![](b.png)').resumo.total, 0));
t('"É decorativa" grava o marcador e a imagem deixa de ser acusada', () => {
  const tx = 'Antes.\n\n![](a.png)\n', d = cods(LA.analisar(tx), 'i1')[0], novo = LA.aplicar(tx, d.correcoes.find(c => c.id === 'decorativa'));
  igual(cods(LA.analisar(novo), 'i1').length, 0);
});
t('marcador dentro de código não vale', () => igual(LA.analisar('```\n<!-- linguagem-acessivel: ignorar-documento i1 -->\n```\n\n![](a.png)').resumo.total, 1));
t('ignorar s1 no bloco também vale para a sigla nos blocos seguintes', () => igual(cods(LA.analisar('<!-- linguagem-acessivel: ignorar s1 -->\nO QWER aprova.\n\nO QWER publica.'), 's1').length, 0));

/* ------------------------------------------------ 5. contrato e API */
console.log('5. Contrato e API');
t('selecionar: área, grupo, código e nome', () => {
  igual(LA.selecionar('a').length, REGRAS.filter(r => r.area === 'acessibilidade').length);
  igual(LA.selecionar('k'), ['link-vago']); igual(LA.selecionar(['i1', 'titulo-pula-nivel']), ['imagem-sem-descricao', 'titulo-pula-nivel']);
  igual(LA.selecionar('l').length, 5);
});
t('selecionar: valor desconhecido gera erro que lista as opções', () => { try { LA.selecionar('x9'); throw 0; } catch (e) { igual(e.codigo, 'selecao-desconhecida'); } });
t('nível c / s filtra; nível desconhecido gera erro', () => {
  const tx = '[aqui](x) [https://a.b](https://a.b)'; igual(LA.analisar(tx, { nivel: 'c' }).resumo.total, 1); igual(LA.analisar(tx, { nivel: 's' }).resumo.total, 1);
  try { LA.analisar(tx, { nivel: 'z' }); throw 0; } catch (e) { igual(e.codigo, 'nivel-desconhecido'); }
});
t('config: regra desligada, nível trocado e limite inválido', () => {
  igual(LA.analisar('[aqui](x)', { config: { regras: { 'link-vago': false } } }).resumo.total, 0);
  igual(LA.analisar('[aqui](x)', { config: { regras: { 'link-vago': 'sugestao' } } }).diagnosticos[0].nivel, 'sugestao');
  try { LA.analisar('x', { config: { limiteFraseLonga: 'muito' } }); throw 0; } catch (e) { igual(e.codigo, 'config-invalida'); }
});
t('aplicar recusa edições sobrepostas e correções manuais', () => {
  try { LA.aplicar('abc', [{ inicio: 0, fim: 2, texto: 'x' }, { inicio: 1, fim: 3, texto: 'y' }]); throw 0; } catch (e) { igual(e.codigo, 'edicao-sobreposta'); }
  try { LA.aplicar('abc', { acao: 'descrever-imagem' }); throw 0; } catch (e) { igual(e.codigo, 'correcao-manual'); }
});
t('agrupar soma por grupo', () => { const g = LA.agrupar(LA.analisar('# A\n\n### B\n\n![](a.png) [aqui](x)')); igual([g.grupos.estrutura.corrigir, g.grupos.imagens.corrigir, g.grupos.links.corrigir], [1, 1, 1]); });
t('regras() expõe metadados sem funções', () => verdade(LA.regras().every(r => r.id && r.codigo && r.titulo && !r.verificar)));

/* ------------------------------------------------ 6. regras de linguagem */
console.log('6. Regras de linguagem simples');
t('f1: limite configurável (frase de 12 palavras acusa com limite 10)', () => {
  const tx = 'A área técnica analisa o pedido e envia a resposta no prazo.';
  igual(cods(LA.analisar(tx), 'f1').length, 0); igual(cods(LA.analisar(tx, { config: { limiteFraseLonga: 10 } }), 'f1').length, 1);
});
t('f1: lista conta cada item como uma frase', () => igual(cods(LA.analisar('- ' + 'palavra '.repeat(20) + '\n- ' + 'palavra '.repeat(20)), 'f1').length, 0));
t('s1: explicada antes, entre parênteses ou com travessão', () => {
  igual(cods(LA.analisar('A Agência Nacional de Aviação Civil (ANAC) regula. A ANAC fiscaliza.'), 's1').length, 0);
  igual(cods(LA.analisar('O QWER (Quadro de Registro) é usado. O QWER muda.'), 's1').length, 0);
  igual(cods(LA.analisar('O QWER – Quadro de Registro – é usado.'), 's1').length, 0);
});
t('s1: plural, numeral romano, palavra em maiúsculas e sigla conhecida não acusam', () => igual(cods(LA.analisar('Os RBACs (Regulamentos) mudam. Leia o capítulo XIV. NÃO envie. Baixe o PDF.'), 's1').length, 0));
t('s1: "Explicar" usa o glossário', () => {
  const tx = 'Siga o RBAC 145.', d = cods(LA.analisar(tx), 's1')[0];
  igual(LA.aplicar(tx, d.correcoes[0]), 'Siga o Regulamento Brasileiro da Aviação Civil (RBAC) 145.');
});
t('s1: glossário extra do conteúdo e siglas conhecidas por config', () => {
  const tx = 'O QWER aprova.';
  igual(LA.aplicar(tx, cods(LA.analisar(tx, { config: { siglas: { QWER: 'Quadro de Registro' } } }), 's1')[0].correcoes[0]), 'O Quadro de Registro (QWER) aprova.');
  igual(cods(LA.analisar(tx, { config: { siglasConhecidas: ['qwer'] } }), 's1').length, 0);
});
t('s1: sigla só no título não é cobrada; no texto, sim', () => { igual(cods(LA.analisar('# Regras do QWER\n\nTexto.'), 's1').length, 0); igual(cods(LA.analisar('# Regras do QWER\n\nO QWER aprova.'), 's1').length, 1); });
t('f3: "Converter" mantém siglas e só põe maiúscula no início da frase', () => {
  const tx = 'Leia: O PRAZO DA ANAC TERMINA HOJE.', d = cods(LA.analisar(tx), 'f3')[0];
  igual(LA.aplicar(tx, d.correcoes[0]), 'Leia: O prazo da ANAC termina hoje.');
});
t('f3: três siglas seguidas não são "texto em maiúsculas"', () => igual(cods(LA.analisar('Veja ANAC DECEA RBAC agora.'), 'f3').length, 0));
t('n1: confere notas e narração; posições dentro do comentário', () => {
  const longa = 'A área técnica ' + 'confere os documentos '.repeat(8) + 'hoje.';
  const tx = '# A\n\n<!-- notas: ' + longa + ' -->\n\n<!-- narração: Curta. -->';
  const d = cods(LA.analisar(tx, { tipo: 'apresentacao' }), 'n1');
  igual(d.length, 1); igual(tx.slice(d[0].inicio, d[0].fim), longa);
});
t('n1: comentário comum não é narração', () => igual(cods(LA.analisar('<!-- ' + 'palavra '.repeat(40) + '. -->'), 'n1').length, 0));
t('f2: parágrafo longo só em texto corrido', () => {
  igual(cods(LA.analisar('Curto. '.repeat(30) + 'Fim de um parágrafo com mais de cem palavras ' + 'sim '.repeat(80) + '.'), 'f2').length, 1);
  igual(cods(LA.analisar('- ' + 'item '.repeat(120)), 'f2').length, 0);
});
t('i2: descrição boa com "Figura 1 — ..." não acusa', () => igual(cods(LA.analisar('![Figura 1 — Tela principal](a.png)'), 'i2').length, 0));

/* ------------------------------------------------ 7. pedidos para IA */
console.log('7. Pedidos para IA');
t('montarPedido preenche nome, legenda, contexto e trecho', () => {
  const d = LA.montarPedido('descrever', { nome: 'Curso X', legenda: 'Fluxo', contexto: 'O pedido\nsegue.' });
  verdade(d.includes('"Curso X"') && d.includes('"Fluxo"') && d.includes('"O pedido segue."') && d.includes('DESCRIÇÃO CURTA:'));
  const s = LA.montarPedido('simplificar', { trecho: 'Texto a simplificar.' });
  verdade(s.includes('"sem nome"') && s.includes('"""\nTexto a simplificar.\n"""'));
});
t('pedido desconhecido e trecho vazio geram erro', () => {
  try { LA.montarPedido('traduzir'); throw 0; } catch (e) { igual(e.codigo, 'pedido-desconhecido'); }
  try { LA.montarPedido('simplificar', {}); throw 0; } catch (e) { igual(e.codigo, 'trecho-vazio'); }
});
t('lerRespostaDescricao: formato pedido, DECORATIVA, NÃO SE APLICA e avisos', () => {
  igual(LA.lerRespostaDescricao('DESCRIÇÃO CURTA: Fluxo de aprovação em três etapas.\nDESCRIÇÃO DETALHADA: 1. Pedido. 2. Análise.'), { decorativa: false, curta: 'Fluxo de aprovação em três etapas.', detalhada: '1. Pedido. 2. Análise.', avisos: [] });
  igual(LA.lerRespostaDescricao('**DECORATIVA**').decorativa, true);
  igual(LA.lerRespostaDescricao('Descricao curta: Logo.\nDescricao detalhada: Não se aplica.').detalhada, '');
  igual(LA.lerRespostaDescricao('DESCRIÇÃO CURTA: Imagem de ' + 'x'.repeat(160)).avisos.length, 2);
  igual(LA.lerRespostaDescricao('Uma resposta solta.').avisos.length, 1);
});
t('lerRespostaSimplificar: tira cercas e aspas; avisa [A CONFIRMAR] e títulos', () => {
  const r = LA.lerRespostaSimplificar('```\n"""\nEnvie o pedido. [A CONFIRMAR: prazo]\n"""\n```');
  igual(r.texto, 'Envie o pedido. [A CONFIRMAR: prazo]'); igual(r.avisos.length, 1);
  igual(LA.lerRespostaSimplificar('## Título\nTexto').avisos.length, 1);
});

/* ------------------------------------------------ 8. resultados conhecidos */
console.log('8. Resultados conhecidos');
for (const [nome, tipo] of [['treinamento', 'apostila'], ['apresentacao', 'apresentacao']]) {
  const arqEx = path.join(RAIZ, 'web', 'exemplo', nome + '.md');
  const tx = fs.readFileSync(arqEx, 'utf8');
  const r = LA.analisar(tx, { tipo });
  const resumo = { versao: LA.VERSAO, resumo: r.resumo, itens: r.diagnosticos.map(d => [d.codigo, d.nivel, d.linha, d.coluna, d.mensagem]) };
  const arq = path.join(AQUI, 'resultados', nome + '.json');
  if (ATUALIZAR_EX || !fs.existsSync(arq)) fs.writeFileSync(arq, JSON.stringify(resumo, null, 1) + '\n');
  t(nome + '.md: resultado igual ao conhecido (se mudou de propósito: --atualizar-exemplo)', () => igual(resumo, JSON.parse(fs.readFileSync(arq, 'utf8'))));
  t(nome + '.md: nenhum item "para corrigir" no conteúdo de exemplo', () => igual(r.resumo.corrigir, 0, JSON.stringify(r.diagnosticos.filter(d => d.nivel === 'corrigir').map(d => d.codigo + ' linha ' + d.linha + ': ' + d.mensagem))));
  t(nome + '.md: resultado dentro do contrato', () => conforme(r));
}
t('casos/problemas.md: resultado igual ao conhecido (todas as regras, marcadores e código)', () => {
  const tx = fs.readFileSync(path.join(AQUI, 'casos', 'problemas.md'), 'utf8'), r = LA.analisar(tx, { tipo: 'apostila' });
  const resumo = { resumo: r.resumo, itens: r.diagnosticos.map(d => [d.codigo, d.nivel, d.linha, d.coluna, d.mensagem, d.correcoes.map(c => c.id + (c.segura ? '*' : ''))]) };
  const arq = path.join(AQUI, 'resultados', 'problemas.json');
  if (ATUALIZAR || !fs.existsSync(arq)) fs.writeFileSync(arq, JSON.stringify(resumo, null, 1) + '\n');
  igual(resumo, JSON.parse(fs.readFileSync(arq, 'utf8'))); conforme(r);
  const vistos = new Set(r.diagnosticos.map(d => d.codigo)); igual(REGRAS.filter(x => !vistos.has(x.codigo) && !x.tipos).map(x => x.codigo), [], 'regras sem caso');
});

/* ------------------------------------------------ 9. propriedades com texto aleatório */
console.log('9. Propriedades (500 textos aleatórios)');
let semente = 42; const rnd = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
const PEDACOS = ['# ', '## ', '#### ', '###### ', '\n', '\n\n', '---\n', '```\n', '~~~', '`', '<!--', '-->', '<!-- notas: x -->', '<!-- linguagem-acessivel: ignorar k1 -->',
  '<!-- linguagem-acessivel: decorativa -->', '![', '](', ')', '[', ']', 'aqui', 'clique aqui', '![](a.png)', '[aqui](x)', '[https://a.b](https://a.b)', 'Texto comum. ', 'Sr. ',
  '😀', 'ção', '\r\n', '| a | b |\n', '|  |  |\n|---|---|\n| a | b |\n', '- item\n', '> [!tip] ', '(', 'https://gov.br ', ' ', '\t', 'ANAC ', 'O QWER (Quadro) ', 'TEXTO TODO EM CAIXA ALTA ',
  'palavra '.repeat(30) + '. ', '<!-- notas: ' + 'fala '.repeat(30) + '. -->', '![Imagem](i.png)', '![x.png](x.png)'];
const aleatorio = () => { let s = ''; const k = 1 + Math.floor(rnd() * 60); for (let i = 0; i < k; i++) s += PEDACOS[Math.floor(rnd() * PEDACOS.length)]; return s; };
t('nunca dá erro, posições dentro do texto, linha e coluna coerentes, dentro do contrato', () => {
  for (let i = 0; i < 500; i++) {
    const tx = aleatorio(); let r;
    try { r = LA.analisar(tx); } catch (e) { throw new Error('erro com ' + JSON.stringify(tx) + ': ' + e.message); }
    conforme(r);
    for (const d of r.diagnosticos) {
      verdade(d.inicio >= 0 && d.fim <= tx.length && d.inicio <= d.fim, 'posição fora: ' + JSON.stringify(tx));
      const antes = tx.slice(0, d.inicio).split('\n'); igual(d.linha, antes.length, 'linha em ' + JSON.stringify(tx));
      igual(d.coluna, [...antes[antes.length - 1]].length + 1, 'coluna em ' + JSON.stringify(tx));
      d.correcoes.forEach(c => (c.edicoes || []).forEach(e => verdade(e.inicio >= 0 && e.fim <= tx.length && e.inicio <= e.fim, 'edição fora')));
    }
  }
});
t('toda correção com edições aplica sem erro e a mesma regra não volta a acusar no mesmo lugar', () => {
  for (let i = 0; i < 300; i++) {
    const tx = aleatorio(), r = LA.analisar(tx);
    for (const d of r.diagnosticos) for (const c of d.correcoes.filter(x => x.edicoes)) {
      const novo = LA.aplicar(tx, c), r2 = LA.analisar(novo);
      verdade(cods(r2, d.codigo).length <= cods(r, d.codigo).length, d.codigo + '/' + c.id + ' aumentou em ' + JSON.stringify(tx));
      if (c.segura) verdade(cods(r2, d.codigo).length < cods(r, d.codigo).length, d.codigo + ' (segura) não diminuiu em ' + JSON.stringify(tx));
    }
  }
});
t('aplicarSeguras é idempotente', () => { for (let i = 0; i < 200; i++) { const a = LA.aplicarSeguras(aleatorio()).texto; igual(LA.aplicarSeguras(a).texto, a); } });
t('mesmo texto, mesmo resultado (determinístico)', () => { for (let i = 0; i < 50; i++) { const tx = aleatorio(); igual(LA.analisar(tx), LA.analisar(tx)); } });

/* ------------------------------------------------ 10. cache (sessão) */
console.log('10. Sessão com cache');
const base = fs.readFileSync(path.join(RAIZ, 'web', 'exemplo', 'treinamento.md'), 'utf8');
t('sessão dá o mesmo resultado que analisar, a cada edição', () => {
  const s = LA.criarSessao(); let tx = base;
  for (let i = 0; i < 30; i++) {
    const p = Math.floor(rnd() * tx.length); tx = tx.slice(0, p) + PEDACOS[Math.floor(rnd() * PEDACOS.length)] + tx.slice(p);
    igual(s.analisar(tx), LA.analisar(tx), 'edição ' + i);
  }
});
t('editar um parágrafo reaproveita os demais blocos', () => {
  const s = LA.criarSessao(); s.analisar(base); const k = base.indexOf('\n\n', base.length >> 1);
  s.analisar(base.slice(0, k) + ' agora' + base.slice(k));
  const e = s.estatistica(); verdade(e.reaproveitados >= e.blocos - 2, JSON.stringify(e));
});

/* ------------------------------------------------ 11. desempenho */
console.log('11. Desempenho');
const semImg = base.replace(/\(data:image\/[^)]+\)/g, '(img.png)');
let grande = ''; while (grande.length < 200000) grande += semImg + '\n\n';
grande = grande.slice(0, 200000);
const medir = (fn, k = 7) => { fn(); const ts = []; for (let i = 0; i < k; i++) { const a = performance.now(); fn(); ts.push(performance.now() - a); } ts.sort((a, b) => a - b); return ts[k >> 1]; };
const LIM_TOTAL = 400, LIM_INCR = 200;    // ms (mediana); limites folgados para máquinas lentas do GitHub
const tTotal = medir(() => LA.analisar(grande));
t('texto de 200 KB analisado em até ' + LIM_TOTAL + ' ms (mediana: ' + tTotal.toFixed(0) + ' ms)', () => verdade(tTotal <= LIM_TOTAL));
const ses = LA.criarSessao(); ses.analisar(grande); let k = 0;
const tIncr = medir(() => { k++; ses.analisar(grande.slice(0, 100000) + 'x'.repeat(k) + grande.slice(100000)); });
t('reanálise após uma edição em até ' + LIM_INCR + ' ms (mediana: ' + tIncr.toFixed(0) + ' ms)', () => verdade(tIncr <= LIM_INCR));
const tReal = medir(() => LA.analisar(base), 3);
t('apostila de exemplo com imagens em base64 (' + Math.round(base.length / 1024) + ' KB) em até ' + LIM_TOTAL + ' ms (' + tReal.toFixed(0) + ' ms)', () => verdade(tReal <= LIM_TOTAL));

/* ------------------------------------------------ 12. pureza do núcleo e documentação */
console.log('12. Núcleo sem tela, sem dependências; documentação em dia');
const arquivos = []; (function andar(d) { for (const x of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, x.name); if (x.isDirectory()) andar(p); else if (x.name.endsWith('.js')) arquivos.push(p); } })(LIB);
t('núcleo não usa document, window, localStorage nem fetch', () => {
  const ruins = arquivos.filter(a => /\b(document|window|localStorage|fetch|XMLHttpRequest)\b/.test(fs.readFileSync(a, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
  igual(ruins.map(a => path.relative(LIB, a)), []);
});
t('imports só relativos (sem dependências externas)', () => {
  const ext = arquivos.flatMap(a => [...fs.readFileSync(a, 'utf8').matchAll(/^\s*(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/gm)].map(m => m[1]).filter(s => !s.startsWith('./') && !s.startsWith('../')));
  igual(ext, []);
});
t('VERSAO do index.js = version do package.json = topo do CHANGELOG', () => {
  const pk = JSON.parse(fs.readFileSync(path.join(LIB, 'package.json'), 'utf8')).version, cl = (fs.readFileSync(path.join(LIB, 'CHANGELOG.md'), 'utf8').match(/^##\s+([\d.]+)/m) || [])[1];
  igual([LA.VERSAO, cl], [pk, pk]);
});
const { gerarDocs } = await import('./gerar_docs.mjs');
t('documentação das regras em dia (se falhar: node tools/linguagem-acessivel/gerar_docs.mjs)', () => {
  for (const [arq, conteudo] of gerarDocs()) igual(fs.existsSync(arq) && fs.readFileSync(arq, 'utf8').replace(/\r\n/g, '\n'), conteudo, path.relative(RAIZ, arq));
});

console.log('\n' + (n - f) + ' de ' + n + ' testes aprovados.');
process.exit(f ? 1 : 0);
