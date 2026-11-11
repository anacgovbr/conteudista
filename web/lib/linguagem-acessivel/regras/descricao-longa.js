import { fecharParenteses } from '../nucleo/analisador.js';
const LIMITE = 150;
const LONGA = 'Fluxo de aprovação do pedido de certificação: o requerente envia os documentos, a área técnica confere, a coordenação revisa o parecer e a diretoria publica a decisão final no sistema';
export default {
  id: 'descricao-longa', codigo: 'i3', area: 'acessibilidade', grupo: 'imagens', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['1.1.1'], emag: ['3.6'] },
  exemplos: [
    { ruim: '![' + LONGA + '](fluxo.png)', bom: '![Fluxo de aprovação do pedido de certificação em quatro etapas](fluxo.png)' },
  ],
  verificar(c) {
    const s = c.bloco.mascara, re = /!\[([^\]\n]*)\]\(/g;
    for (let m; (m = re.exec(s));) {
      const fim = fecharParenteses(s, m.index + m[0].length - 1);
      if (fim < 0) continue;
      const alt = m[1].trim(), n = [...alt].length;
      if (n <= LIMITE || c.decorativa(c.bloco.inicio + m.index)) continue;
      const altI = m.index + 2, altF = altI + m[1].length;
      c.relatar(m.index, fim + 1, { variante: 'caracteres', dados: { caracteres: n },
        correcoes: [{ id: 'descrever', acao: 'descrever-imagem', alvo: { inicio: altI, fim: altF }, segura: false }] });
    }
  },
};
