import { contarPalavras } from '../nucleo/frases.js';

const LONGO = 'O processo começa com o pedido. ' + 'A área técnica confere os documentos, verifica os prazos e registra o andamento no sistema. '.repeat(7);
export default {
  id: 'paragrafo-longo', codigo: 'f2', area: 'linguagem', grupo: 'frases', nivel: 'sugestao', escopo: 'bloco',
  referencia: { lei: ['Lei 15.263/2025'] },
  exemplos: [
    { ruim: LONGO.trim(), bom: 'O processo começa com o pedido.\n\nA área técnica confere os documentos.\n\nDepois, registra o andamento no sistema.' },
  ],
  verificar(c) {
    const b = c.bloco; if (b.tipo !== 'paragrafo' || (b.sub !== 'texto' && b.sub !== 'citacao')) return;
    const n = contarPalavras(b.mascara);
    if (n <= c.config.limiteParagrafo) return;
    const fim = b.mascara.replace(/\s+$/, '').length;
    c.relatar(0, fim, { variante: 'palavras', dados: { palavras: n },
      correcoes: [{ id: 'simplificar', acao: 'simplificar-trecho', alvo: { inicio: 0, fim }, segura: false }] });
  },
};
