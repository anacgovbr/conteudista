import { dividirFrases } from '../nucleo/frases.js';

export default {
  id: 'frase-longa', codigo: 'f1', area: 'linguagem', grupo: 'frases', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['3.1.5'], lei: ['Lei 15.263/2025'] },
  exemplos: [
    { ruim: 'A solicitação deverá ser instruída pelo interessado com a documentação comprobatória prevista no regulamento, sendo encaminhada à área técnica competente, que procederá à análise no prazo regulamentar.',
      bom: 'Envie o pedido com os documentos exigidos pelo regulamento. A área técnica analisa o pedido no prazo previsto.' },
    { ruim: null, bom: '| Coluna | Texto longo de tabela não é frase corrida e não é conferido por esta regra, mesmo quando passa de vinte e cinco palavras na mesma célula da tabela |\n|---|---|' },
  ],
  verificar(c) {
    const b = c.bloco; if (b.tipo !== 'paragrafo' || b.sub === 'tabela') return;
    const lim = c.config.limiteFraseLonga;
    for (const f of dividirFrases(b.mascara)) {
      if (f.palavras <= lim) continue;
      c.relatar(f.inicio, f.fim, { variante: 'palavras', dados: { palavras: f.palavras },
        correcoes: [{ id: 'simplificar', acao: 'simplificar-trecho', alvo: { inicio: f.inicio, fim: f.fim }, segura: false }] });
    }
  },
};
