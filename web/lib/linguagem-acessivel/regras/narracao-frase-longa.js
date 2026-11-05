import { dividirFrases } from '../nucleo/frases.js';

export default {
  id: 'narracao-frase-longa', codigo: 'n1', area: 'linguagem', grupo: 'narracao', nivel: 'sugestao', escopo: 'documento',
  referencia: { wcag: ['1.2.2'], lei: ['Lei 15.263/2025'] },
  exemplos: [
    { ruim: '# Prazos\n\n<!-- notas: Nesta etapa, depois de receber o pedido com todos os documentos exigidos pelo regulamento, a área técnica faz a análise completa e, em seguida, encaminha o processo à coordenação para a decisão final. -->',
      bom: '# Prazos\n\n<!-- notas: Nesta etapa, a área técnica analisa o pedido. Depois, a coordenação decide. -->' },
  ],
  verificar(c) {
    const lim = c.config.limiteFraseNarracao;
    for (const k of c.doc.comentarios) {
      const t = k.tipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (t !== 'notas' && t !== 'narracao') continue;
      const a = k.conteudoInicio, b = Math.max(a, k.fim - 3);
      for (const f of dividirFrases(c.doc.texto.slice(a, b), a)) {
        if (f.palavras <= lim) continue;
        c.relatar(f.inicio, f.fim, { variante: 'palavras', dados: { palavras: f.palavras },
          correcoes: [{ id: 'simplificar', acao: 'simplificar-trecho', alvo: { inicio: f.inicio, fim: f.fim }, segura: false }] });
      }
    }
  },
};
