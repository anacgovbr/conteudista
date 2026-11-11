import { fecharParenteses } from '../nucleo/analisador.js';
const MIDIA = /(?:youtube\.com|youtu\.be|vimeo\.com|\.(?:mp4|webm|mov|m4v|mp3|wav|ogg|m4a)(?=$|[?#]))/i;
const ALTERNATIVA = /legend|transcri|audiodescri|libras/i;
export default {
  id: 'midia-sem-alternativa', codigo: 'm1', area: 'acessibilidade', grupo: 'midia', nivel: 'sugestao', escopo: 'bloco',
  referencia: { wcag: ['1.2.1', '1.2.2'] },
  exemplos: [
    { ruim: 'Assista ao [vídeo de apresentação](https://www.youtube.com/watch?v=abc).', bom: 'Assista ao [vídeo de apresentação, com legendas](https://www.youtube.com/watch?v=abc).' },
    { ruim: null, bom: 'Ouça o [áudio da aula](aula.mp3). A transcrição está no fim da apostila.' },
  ],
  verificar(c) {
    const b = c.bloco, s = b.mascara;
    if (b.tipo !== 'paragrafo' || ALTERNATIVA.test(s)) return;
    const re = /\[([^\]\n]*)\]\(/g;
    for (let m; (m = re.exec(s));) {
      if (m.index > 0 && s[m.index - 1] === '!') continue;
      const ab = m.index + m[0].length - 1, fim = fecharParenteses(s, ab);
      if (fim < 0) continue;
      const dest = s.slice(ab + 1, fim).trim().split(/\s+/)[0].replace(/^<|>$/g, '');
      if (!MIDIA.test(dest.split('#')[0])) continue;
      c.relatar(m.index, fim + 1, { correcoes: [{ id: 'indicar', acao: 'indicar-alternativa', alvo: { inicio: fim + 1, fim: fim + 1 }, segura: false }] });
    }
  },
};
