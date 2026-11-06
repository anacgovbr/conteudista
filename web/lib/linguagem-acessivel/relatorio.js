import { regras, VERSAO } from './index.js';
import { VERSAO_PEDIDOS } from './pedidos.js';
import { lerMarcadores } from './nucleo/marcadores.js';

export const AVISO_RELATORIO = 'Este relatório registra verificações automáticas. Não substitui uma avaliação completa de acessibilidade (WCAG/eMAG).';

const escapar = valor => String(valor == null ? '' : valor).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataPadrao = () => new Date().toISOString();

function marcadores(texto) {
  return lerMarcadores(texto).map(m => ({ tipo: m.tipo, regras: m.regras, inicio: m.inicio, fim: m.fim,
    linha: String(texto).slice(0, m.inicio).split(/\r\n|\n|\r/).length }));
}

export function criarRelatorio({ resultados, nome = '', config = {}, data = dataPadrao() }) {
  const entradas = (resultados || []).map(x => ({
    arquivo: x.arquivo || '',
    nome: x.nome || nome || '',
    tipo: x.resultado.tipo,
    resumo: x.resultado.resumo,
    diagnosticos: x.resultado.diagnosticos,
    marcadores: marcadores(x.conteudo || ''),
  }));
  const regrasAtivas = config.regras || {};
  const tipos = new Set(entradas.map(x => x.tipo));
  return {
    versoes: { conteudista: config.versaoConteudista || '', biblioteca: VERSAO, pedidos: VERSAO_PEDIDOS },
    geradoEm: data,
    nome,
    limites: {
      fraseLonga: config.limiteFraseLonga == null ? 25 : config.limiteFraseLonga,
      fraseNarracao: config.limiteFraseNarracao == null ? 25 : config.limiteFraseNarracao,
      paragrafo: config.limiteParagrafo == null ? 100 : config.limiteParagrafo,
    },
    regrasVerificadas: regras().filter(r => regrasAtivas[r.id] !== false && regrasAtivas[r.codigo] !== false &&
      regrasAtivas[r.id] !== 'desligado' && regrasAtivas[r.codigo] !== 'desligado' && (r.tipos || ['apostila', 'apresentacao']).some(t => tipos.has(t))).map(r => r.codigo),
    arquivos: entradas,
    aviso: AVISO_RELATORIO,
  };
}

export function relatorioMarkdown(relatorio) {
  const linhas = [
    '# Relatório de acessibilidade',
    '',
    '> ' + relatorio.aviso,
    '',
    '- Conteúdo: ' + (relatorio.nome || 'Sem nome'),
    '- Gerado em: ' + relatorio.geradoEm,
    '- Versões: Conteudista ' + (relatorio.versoes.conteudista || 'não informada') + ', biblioteca ' + relatorio.versoes.biblioteca + ', pedidos ' + relatorio.versoes.pedidos,
    '- Limites: frase ' + relatorio.limites.fraseLonga + ' palavras; narração ' + relatorio.limites.fraseNarracao + '; parágrafo ' + relatorio.limites.paragrafo,
    '- Regras verificadas: ' + relatorio.regrasVerificadas.join(', '),
    '',
  ];
  for (const arquivo of relatorio.arquivos) {
    linhas.push('## ' + (arquivo.nome || arquivo.arquivo || 'Conteúdo'), '',
      'Tipo: ' + arquivo.tipo + ' · ' + arquivo.resumo.corrigir + ' para corrigir · ' + arquivo.resumo.sugestoes + ' sugestões', '');
    const ignorados = arquivo.marcadores.filter(m => m.tipo.startsWith('ignorar'));
    const decorativas = arquivo.marcadores.filter(m => m.tipo === 'decorativa');
    linhas.push('Marcadores para ignorar: ' + (ignorados.length ? ignorados.map(m => (m.regras.join(', ') || 'documento') + ' (linha ' + m.linha + ')').join('; ') : 'nenhum'),
      'Imagens decorativas: ' + (decorativas.length ? decorativas.map(m => 'linha ' + m.linha).join(', ') : 'nenhuma'), '');
    if (!arquivo.diagnosticos.length) { linhas.push('Nenhum item encontrado.', ''); continue; }
    for (const d of arquivo.diagnosticos) {
      linhas.push('- **' + d.codigo + ' · ' + d.nivel + '** · linha ' + d.linha + (d.slide ? ', slide ' + d.slide : '') + ': ' + d.mensagem,
        '  Trecho: ' + d.trecho.replace(/\s+/g, ' '), '');
    }
  }
  return linhas.join('\n').trimEnd() + '\n';
}

export function relatorioHtml(relatorio) {
  const linhas = [];
  for (const arquivo of relatorio.arquivos) {
    linhas.push('<section><h2>' + escapar(arquivo.nome || arquivo.arquivo || 'Conteúdo') + '</h2>',
      '<p>Tipo: ' + escapar(arquivo.tipo) + ' · ' + arquivo.resumo.corrigir + ' para corrigir · ' + arquivo.resumo.sugestoes + ' sugestões</p>');
    const ignorados = arquivo.marcadores.filter(m => m.tipo.startsWith('ignorar'));
    const decorativas = arquivo.marcadores.filter(m => m.tipo === 'decorativa');
    linhas.push('<p>Marcadores para ignorar: ' + escapar(ignorados.length ? ignorados.map(m => (m.regras.join(', ') || 'documento') + ' (linha ' + m.linha + ')').join('; ') : 'nenhum') +
      ' · Imagens decorativas: ' + escapar(decorativas.length ? decorativas.map(m => 'linha ' + m.linha).join(', ') : 'nenhuma') + '</p>');
    if (!arquivo.diagnosticos.length) linhas.push('<p>Nenhum item encontrado.</p>');
    else {
      linhas.push('<table><caption>Itens encontrados</caption><thead><tr><th scope="col">Nível</th><th scope="col">Regra</th><th scope="col">Local</th><th scope="col">Trecho</th><th scope="col">Mensagem</th></tr></thead><tbody>');
      for (const d of arquivo.diagnosticos) {
        linhas.push('<tr><td>' + escapar(d.nivel) + '</td><td>' + escapar(d.codigo) + '</td><td>Linha ' + d.linha + (d.slide ? ' · slide ' + d.slide : '') + '</td><td>' + escapar(d.trecho) + '</td><td>' + escapar(d.mensagem) + '</td></tr>');
      }
      linhas.push('</tbody></table>');
    }
    linhas.push('</section>');
  }
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório de acessibilidade</title><style>' +
    'body{margin:0;color:#333;background:#f8f8f8;font:16px/1.5 "Segoe UI",sans-serif}main{max-width:1100px;margin:auto;padding:24px}h1,h2{color:#0c326f}section{margin-block:24px;padding-top:16px;border-top:1px solid #ccc}.aviso{padding:12px;border-left:5px solid #8a5c00;background:#fff5c2}table{width:100%;border-collapse:collapse;background:#fff}caption{text-align:left;font-weight:700;padding:8px}th,td{border:1px solid #aaa;padding:8px;text-align:left;vertical-align:top}th{background:#dbe8fb;color:#0c326f}a{color:#1351b4}.pular{position:absolute;left:-10000px}.pular:focus{left:8px;top:8px;background:#fff;padding:8px}' +
    '</style></head><body><a class="pular" href="#conteudo">Ir para o conteúdo</a><main id="conteudo"><h1>Relatório de acessibilidade</h1><p class="aviso">' + escapar(relatorio.aviso) + '</p><dl><dt>Conteúdo</dt><dd>' + escapar(relatorio.nome || 'Sem nome') + '</dd><dt>Gerado em</dt><dd>' + escapar(relatorio.geradoEm) + '</dd><dt>Versões</dt><dd>Conteudista ' + escapar(relatorio.versoes.conteudista || 'não informada') + ' · biblioteca ' + escapar(relatorio.versoes.biblioteca) + ' · pedidos ' + escapar(relatorio.versoes.pedidos) + '</dd><dt>Limites</dt><dd>Frase: ' + relatorio.limites.fraseLonga + ' palavras · narração: ' + relatorio.limites.fraseNarracao + ' · parágrafo: ' + relatorio.limites.paragrafo + '</dd><dt>Regras verificadas</dt><dd>' + escapar(relatorio.regrasVerificadas.join(', ')) + '</dd></dl>' + linhas.join('') + '</main></body></html>';
}