import { fecharParenteses } from '../nucleo/analisador.js';

const GENERICAS = /^(imagem|imagens|figura|fig|foto|fotografia|img|image|picture|grafico|print|printscreen|print de tela|captura|captura de tela|screenshot|ilustracao|icone|logo|logotipo|desenho|diagrama|tabela|quadro|esquema|banner|anexo|alt|descricao|sem descricao|foto da tela|tela)( \d+([.-]\d+)*)?$/;
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}.-]+/gu, ' ').trim();

export default {
  id: 'descricao-vaga', codigo: 'i2', area: 'acessibilidade', grupo: 'imagens', nivel: 'corrigir', escopo: 'bloco',
  referencia: { wcag: ['1.1.1'], emag: ['3.6'] },
  exemplos: [
    { ruim: '![Imagem](fluxo.png)', bom: '![Fluxo de aprovação em três etapas](fluxo.png)' },
    { ruim: '![Figura 2](tela.png)', bom: '![Figura 2 — Janela Importar, aba Link](tela.png)' },
    { ruim: '![fluxo-aprovacao.png](fluxo-aprovacao.png)', bom: '![Fluxo de aprovação](fluxo-aprovacao.png)' },
    { ruim: '![x](a.png)', bom: '![Alerta](alerta.png)' },
  ],
  verificar(c) {
    const s = c.bloco.mascara, re = /!\[([^\]\n]*)\]\(/g;
    for (let m; (m = re.exec(s));) {
      const fim = fecharParenteses(s, m.index + m[0].length - 1);
      if (fim < 0) continue;
      const alt = m[1].trim(); if (!alt) continue;                      // vazio: regra i1
      const n = norm(alt), dest = s.slice(m.index + m[0].length, fim).trim().split(/\s+/)[0] || '';
      const base = norm(decodeURIComponent((dest.split(/[?#]/)[0].split('/').pop() || '').replace(/%(?![0-9a-f]{2})/gi, '')));
      let variante = null;
      const semExt = base.replace(/\.[a-z0-9]+$/, '');
      if (/\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i.test(alt) || (base && n === base) || (semExt && n === semExt && /[-_\d]/.test(alt))) variante = 'arquivo';
      else if (GENERICAS.test(n)) variante = 'generica';
      else if ([...alt].length < 3) variante = 'curta';
      if (!variante) continue;
      const altI = m.index + 2, altF = altI + m[1].length;
      c.relatar(m.index, fim + 1, { variante, dados: { texto: alt },
        correcoes: [{ id: 'descrever', acao: 'descrever-imagem', alvo: { inicio: altI, fim: altF }, segura: false }] });
    }
  },
};
