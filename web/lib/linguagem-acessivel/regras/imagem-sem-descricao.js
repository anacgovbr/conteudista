import { fecharParenteses } from '../nucleo/analisador.js';
import { textoMarcador } from '../nucleo/marcadores.js';

export default {
  id: 'imagem-sem-descricao', codigo: 'i1', area: 'acessibilidade', grupo: 'imagens', nivel: 'corrigir', escopo: 'bloco',
  referencia: { wcag: ['1.1.1'], emag: ['3.6'] },
  exemplos: [
    { ruim: '![](fluxo-aprovacao.png)', bom: '![Fluxo de aprovação: o pedido passa pela área técnica e segue para a coordenação](fluxo-aprovacao.png)' },
    { ruim: 'Veja o símbolo ![ ](alerta.png) na tela.', bom: 'Veja o símbolo ![Alerta](alerta.png) na tela.' },
    { ruim: null, bom: '<!-- linguagem-acessivel: decorativa -->![](divisor.png)' },
    { ruim: null, bom: 'Escreva `![](figura.png)` para inserir uma imagem.' },
  ],
  verificar(c) {
    const s = c.bloco.mascara, re = /!\[([^\]\n]*)\]\(/g;
    for (let m; (m = re.exec(s));) {
      const fim = fecharParenteses(s, m.index + m[0].length - 1);
      if (fim < 0) continue;
      if (m[1].trim()) continue;
      const abs = c.bloco.inicio + m.index;
      if (c.decorativa(abs)) continue;
      const altI = m.index + 2, altF = altI + m[1].length;
      c.relatar(m.index, fim + 1, {
        correcoes: [
          { id: 'descrever', acao: 'descrever-imagem', alvo: { inicio: altI, fim: altF }, segura: false },
          { id: 'decorativa', segura: false, edicoes: [{ inicio: m.index, fim: m.index, texto: textoMarcador('decorativa') }] },
        ],
      });
    }
  },
};
