/* =====================================================================================
   Conteudista — análise de acessibilidade em segundo plano (Web Worker, módulo ES)
   Recebe { id, chave, texto, tipo, config } e devolve { id, chave, resultado } ou { id, chave, erro }.
   Uma sessão (cache por bloco) para cada editor: só os blocos alterados são reanalisados.
   ===================================================================================== */
import { criarSessao, regras, VERSAO } from './lib/linguagem-acessivel/index.js';

const sessoes = new Map();
self.postMessage({ pronto: true, versao: VERSAO, regras: regras().map(({ exemplos, ...r }) => r) });
self.onmessage = (e) => {
  const { id, chave, texto, tipo, config } = e.data || {};
  try {
    const k = chave + '|' + JSON.stringify(config || {});
    let s = sessoes.get(k); if (!s) { s = criarSessao({ tipo, config }); sessoes.set(k, s); }
    self.postMessage({ id, chave, resultado: s.analisar(String(texto || ''), { tipo }) });
  } catch (err) {
    self.postMessage({ id, chave, erro: String((err && err.message) || err) });
  }
};
