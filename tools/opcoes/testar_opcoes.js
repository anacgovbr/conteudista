#!/usr/bin/env node
/* Testes do leitor de opções (web/opcoes.js). Sem dependências: node tools/opcoes/testar_opcoes.js */
'use strict';
const path = require('path');
const O = require(path.join(__dirname, '..', '..', 'web', 'opcoes.js'));
let n = 0, f = 0;
const t = (nome, fn) => { n++; try { fn(); console.log('  ok   ' + nome); } catch (e) { f++; console.log('  FALHA ' + nome + '\n        ' + e.message); } };
const igual = (a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error('esperado ' + y + ', veio ' + x); };
const verdade = (c, m) => { if (!c) throw new Error(m || 'condição falsa'); };

const mem = {};
global.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const limpar = () => Object.keys(mem).forEach(k => delete mem[k]);

console.log('Leitor de YAML');
t('mapas aninhados, comentários e tipos', () => {
  const r = O.lerYaml('# topo\nversao: 1\neditor:   # grupo\n  modo_inicial: previa # fim\n  imagens:\n    recomprimir_grandes: desligado\nsalvar:\n  limite_de_geracoes: 25\n');
  igual(r.erros, []); igual(r.dados.editor.modo_inicial, 'previa'); igual(r.dados.editor.imagens.recomprimir_grandes, 'desligado'); igual(r.dados.salvar.limite_de_geracoes, 25);
});
t('# dentro de aspas não é comentário', () => igual(O.lerYaml('a: "x # y"').dados.a, 'x # y'));
t('tabulação gera erro com a linha', () => igual(O.lerYaml('a:\n\tb: 1').erros[0].linha, 2));
t('indentação errada gera erro', () => verdade(O.lerYaml('a:\n   b: 1').erros.length === 1));
t('lista não é aceita', () => verdade(O.lerYaml('a:\n  - x').erros.length === 1));
t('BOM e CRLF do Windows', () => { const r = O.lerYaml('\uFEFFversao: 1\r\nsalvar:\r\n  automaticamente: sim\r\n'); igual(r.erros, []); igual(r.dados.salvar.automaticamente, 'sim'); });

console.log('Validação');
t('ligado/desligado em várias formas', () => {
  const r = O.interpretar('salvar:\n  automaticamente: Não\n  lembrar_links: SIM\nlink:\n  imagens_como_anexo: off\n');
  igual(r.avisos, []); igual(r.valores, { 'salvar.automaticamente': 'desligado', 'salvar.lembrar_links': 'ligado', 'link.imagens_como_anexo': 'desligado' });
});
t('escolha aceita hífen e acento', () => igual(O.interpretar('aplicativo:\n  layout: ANAC20-claro\n').valores['aplicativo.layout'], 'anac20_claro'));
t('valor inválido é ignorado com aviso e linha', () => { const r = O.interpretar('\neditor:\n  modo_inicial: grande\n'); igual(r.valores, {}); igual(r.avisos[0].linha, 3); verdade(/editar, dividido, previa/.test(r.avisos[0].msg)); });
t('número fora do limite', () => verdade(O.interpretar('salvar:\n  limite_de_geracoes: 500\n').avisos.length === 1));
t('opção desconhecida é avisada', () => verdade(/não existe/.test(O.interpretar('editor:\n  cor: azul\n').avisos[0].msg)));
t('versão desconhecida é avisada', () => verdade(O.interpretar('versao: 2\n').avisos.length === 1));
t('arquivo vazio: nenhum valor, nenhum erro', () => { const r = O.interpretar(''); igual(r.valores, {}); igual(r.avisos, []); });

console.log('Prioridade: pessoa > YAML > código');
t('sem YAML vale o padrão do código', () => { limpar(); O._definir({}); igual(O.ler('mde.modo'), 's'); igual(O.ler('conteudista.auto'), '1'); });
t('YAML muda o padrão', () => { limpar(); O._definir({ 'editor.modo_inicial': 'previa', 'salvar.automaticamente': 'desligado' }); igual(O.ler('mde.modo'), 'p'); igual(O.ler('conteudista.auto'), '0'); });
t('escolha da pessoa prevalece sobre o YAML', () => { limpar(); O._definir({ 'editor.modo_inicial': 'previa' }); localStorage.setItem('mde.modo', 'e'); igual(O.ler('mde.modo'), 'e'); });
t('opção não lembrada usa o YAML ao abrir', () => { O._definir({ 'link.onde_guardar': 'privatebin', 'link.expira_em': '1_dia' }); igual(O.inicial('link.onde_guardar'), 'pb'); igual(O.inicial('link.expira_em'), '1day'); });
t('chave fora do registro devolve o padrão informado', () => { limpar(); igual(O.ler('outra.chave', 'x'), 'x'); });
t('mapeamento próprio (notas/livre)', () => { limpar(); O._definir({ 'locucao.notas_dos_slides': 'desligado' }); igual(O.ler('conteudista.locucao.modo'), 'livre'); });
t('Restaurar padrão apaga só as opções registradas', () => {
  limpar(); localStorage.setItem('mde.modo', 'e'); localStorage.setItem('conteudista.auto', '0'); localStorage.setItem('conteudista.locucao.notas', '{"itens":[]}');
  O.restaurar(); igual(localStorage.getItem('mde.modo'), null); igual(localStorage.getItem('conteudista.auto'), null); igual(localStorage.getItem('conteudista.locucao.notas'), '{"itens":[]}');
});

console.log('Registro');
t('caminhos e chaves sem repetição', () => {
  const c = O.REGISTRO.map(r => r.caminho), k = O.REGISTRO.filter(r => r.chave).map(r => r.chave);
  igual(new Set(c).size, c.length); igual(new Set(k).size, k.length);
});
t('todo padrão é válido para o próprio tipo', () => O.REGISTRO.forEach(r => verdade(O.normalizar(r, r.padrao).ok, r.caminho)));
t('padrões do registro = comportamento do código (1.79: Importar abre em Link)', () => {
  limpar(); O._definir({});
  igual([O.ler('mde.modo'), O.ler('conteudista.auto'), O.ler('conteudista.keep'), O.ler('conteudista.tema'), O.ler('conteudista.contraste'), O.ler('conteudista.gerados.ativo'), O.ler('conteudista.gerados.limite'), O.ler('narr.on'), O.ler('narr.auto'), O.ler('loc.preload'), O.ler('conteudista.locucao.modo')],
        ['s', '1', '1', 'govbr', '0', '1', '10', '0', '0', '0', 'notas']);
  igual([O.inicial('link.onde_guardar'), O.inicial('link.expira_em'), O.inicial('importar.aba_inicial'), O.ligado('celular.barra_compacta'), O.ligado('celular.imagens_recolhidas')], ['self', '1week', 'lk', true, true]);
});

t('importar: "ultima" volta ao comportamento anterior', () => { O._definir({ 'importar.aba_inicial': 'ultima' }); igual(O.inicial('importar.aba_inicial'), ''); });
t('nome antigo "automatica" (1.78) vira "ultima"', () => { const r = O.interpretar('importar:\n  aba_inicial: automatica\n'); igual(r.avisos, []); igual(r.valores['importar.aba_inicial'], 'ultima'); });
t('celular: opções podem ser desligadas', () => { O._definir({ 'celular.barra_compacta': 'desligado' }); igual(O.ligado('celular.barra_compacta'), false); igual(O.ligado('celular.imagens_recolhidas'), true); });

console.log('\n' + (n - f) + ' de ' + n + ' testes aprovados.');
process.exit(f ? 1 : 0);
