import { fecharParenteses } from '../nucleo/analisador.js';
// "Imagem de ...", "Foto da ...", "Figura que mostra ...": o leitor de tela já avisa que é uma imagem.
const PREFIXO = /^\s*(?:imagem|foto|fotografia|figura|ilustra[çc][ãa]o|gr[áa]fico|print|captura de tela|tela)\s+(?:que mostra|mostrando|com|de|do|da|dos|das)\s+/iu;
export default {
  id: 'descricao-redundante', codigo: 'i4', area: 'acessibilidade', grupo: 'imagens', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['1.1.1'] },
  exemplos: [
    { ruim: '![Imagem de um fluxo de aprovação em três etapas](fluxo.png)', bom: '![Fluxo de aprovação em três etapas](fluxo.png)' },
    { ruim: '![Foto da equipe técnica reunida na sala](equipe.jpg)', bom: '![Equipe técnica reunida na sala](equipe.jpg)' },
    { ruim: null, bom: '![Figura 1 — Tela principal do sistema](tela.png)' },
  ],
  verificar(c) {
    const s = c.bloco.mascara, re = /!\[([^\]\n]*)\]\(/g;
    for (let m; (m = re.exec(s));) {
      const fim = fecharParenteses(s, m.index + m[0].length - 1);
      if (fim < 0) continue;
      const alt = m[1], p = PREFIXO.exec(alt);
      if (!p || c.decorativa(c.bloco.inicio + m.index)) continue;
      const resto = alt.slice(p[0].length).trim();
      if (!resto) continue;
      const novo = resto.charAt(0).toLocaleUpperCase('pt-BR') + resto.slice(1);
      const altI = m.index + 2, altF = altI + alt.length;
      c.relatar(m.index, fim + 1, { dados: { inicio: p[0].trim() },
        correcoes: [{ id: 'remover', segura: true, edicoes: [{ inicio: altI, fim: altF, texto: novo }] }] });
    }
  },
};
