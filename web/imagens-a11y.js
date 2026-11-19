/* Auditoria de acessibilidade das imagens e dos fluxos do texto.
   Não altera nada: lê o Markdown, amostra as imagens num canvas e devolve o que
   precisa de revisão humana. Roda no relatório de acessibilidade. */
// shortcut: sem OCR e sem IA; "texto embutido" é só um indício por componentes de altura parecida. Trocar `textoProvavel` por OCR local se usuários reportarem 2+ falsos positivos/negativos.
(function (global) {
  'use strict';

  const LADO = 96;          // amostragem: no máximo 96×96 pixels
  const MAX_IMAGENS = 30;   // acima disso o relatório para e avisa
  const TEMPO = 6000;       // ms por imagem
  const LIMITE_TOTAL = 20000; // ms para o relatório inteiro; o resto vira "não analisadas"

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function linhaDe(texto, indice) { return String(texto).slice(0, indice).split(/\r\n|\n|\r/).length; }

  function imagensDe(md) {
    const re = /!\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/g, saida = [];
    let m;
    while ((m = re.exec(md))) saida.push({ alt: m[1].trim(), url: m[2], linha: linhaDe(md, m.index) });
    return saida;
  }

  function fluxosDe(md) {
    const re = /```mermaid[^\n]*\n([\s\S]*?)```/g, saida = [];
    let m;
    while ((m = re.exec(md))) saida.push({ codigo: m[1], linha: linhaDe(md, m.index) });
    return saida;
  }

  /* ---------------------------- cor ---------------------------- */
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }

  function familia(hex) {
    const h = String(hex).replace('#', '');
    const [matiz, s, l] = hsl(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
    if (s < 0.30 || l < 0.12 || l > 0.90) return '';
    if (matiz >= 330 || matiz <= 20) return 'vermelho';
    if (matiz >= 75 && matiz <= 165) return 'verde';
    return '';
  }

  function canal(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function luminancia(hex) {
    const h = String(hex).replace('#', '');
    return 0.2126 * canal(parseInt(h.slice(0, 2), 16)) + 0.7152 * canal(parseInt(h.slice(2, 4), 16)) + 0.0722 * canal(parseInt(h.slice(4, 6), 16));
  }
  function contraste(a, b) {
    const x = luminancia(a), y = luminancia(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* ---------------------------- imagem ---------------------------- */
  function carregar(url) {
    return new Promise((ok, falha) => {
      const img = new Image();
      const t = setTimeout(() => falha(new Error('tempo esgotado')), TEMPO);
      img.onload = () => { clearTimeout(t); ok(img); };
      img.onerror = () => { clearTimeout(t); falha(new Error('não foi possível ler')); };
      img.src = url;
    });
  }

  function amostra(img) {
    const larg = img.naturalWidth || img.width, alt = img.naturalHeight || img.height;
    const e = Math.min(1, LADO / Math.max(larg, alt));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(larg * e)); c.height = Math.max(1, Math.round(alt * e));
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, c.width, c.height);
    return { dados: x.getImageData(0, 0, c.width, c.height), w: c.width, h: c.height, largura: larg, altura: alt };
  }

  function coresRelevantes(dados, total) {
    let vermelho = 0, verde = 0;
    const px = dados.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 40) continue;
      const f = familia('#' + [px[i], px[i + 1], px[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''));
      if (f === 'vermelho') vermelho++;
      else if (f === 'verde') verde++;
    }
    const pct = v => Math.round(v * 1000 / total) / 10;
    return { vermelho: pct(vermelho), verde: pct(verde), ambos: vermelho >= total * 0.02 && verde >= total * 0.02 && vermelho >= 20 && verde >= 20 };
  }

  function contrasteDominante(dados, total) {
    const px = dados.data, bins = new Map();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 40) continue;
      const chave = (px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | (px[i + 2] >> 4);
      bins.set(chave, (bins.get(chave) || 0) + 1);
    }
    const top = [...bins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    if (top.length < 2) return null;
    if ((top[0][1] + top[1][1]) / total < 0.6) return null;   // muitas cores: fotografia, não dá para estimar
    const cor = k => '#' + [(k >> 8) & 15, (k >> 4) & 15, k & 15].map(v => ((v << 4) | 8).toString(16).padStart(2, '0')).join('');
    return { razao: Math.round(contraste(cor(top[0][0]), cor(top[1][0])) * 100) / 100 };
  }

  function textoProvavel(dados, w, h) {
    const px = dados.data, n = w * h, lum = new Float32Array(n);
    const amostras = [];
    for (let i = 0, p = 0; i < px.length; i += 4, p++) {
      if (px[i + 3] < 40) { lum[p] = -1; continue; }
      lum[p] = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      amostras.push(lum[p]);
    }
    if (!amostras.length) return false;
    amostras.sort((a, b) => a - b);
    const fundo = amostras[Math.floor(amostras.length / 2)];
    const visto = new Uint8Array(n), alturas = new Map();
    let candidatos = 0;
    for (let p = 0; p < n; p++) {
      if (visto[p] || lum[p] < 0 || Math.abs(lum[p] - fundo) < 90) continue;
      let pilha = [p], area = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
      visto[p] = 1;
      while (pilha.length) {
        const q = pilha.pop(), x = q % w, y = (q - x) / w;
        area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && !visto[q - 1] && lum[q - 1] >= 0 && Math.abs(lum[q - 1] - fundo) >= 90) { visto[q - 1] = 1; pilha.push(q - 1); }
        if (x < w - 1 && !visto[q + 1] && lum[q + 1] >= 0 && Math.abs(lum[q + 1] - fundo) >= 90) { visto[q + 1] = 1; pilha.push(q + 1); }
        if (y > 0 && !visto[q - w] && lum[q - w] >= 0 && Math.abs(lum[q - w] - fundo) >= 90) { visto[q - w] = 1; pilha.push(q - w); }
        if (y < h - 1 && !visto[q + w] && lum[q + w] >= 0 && Math.abs(lum[q + w] - fundo) >= 90) { visto[q + w] = 1; pilha.push(q + w); }
      }
      const larg = x1 - x0 + 1, alt = y1 - y0 + 1;
      if (area >= 4 && alt >= 2 && alt <= 14 && larg <= alt * 6) {
        candidatos++;
        alturas.set(alt, (alturas.get(alt) || 0) + 1);
      }
    }
    // texto tem muitas letras com a mesma altura: 6 ou mais componentes do mesmo tamanho
    const repetido = Math.max(0, ...alturas.values());
    return candidatos >= 8 && repetido >= 6;
  }

  async function analisarImagem(item) {
    const base = { alt: item.alt, linha: item.linha, url: item.url };
    if (!/^data:image\//i.test(item.url)) {
      return Object.assign(base, { erro: 'imagem externa ou arquivo local: não é possível conferir as cores no navegador' });
    }
    let img;
    try { img = await carregar(item.url); }
    catch (e) { return Object.assign(base, { erro: 'não foi possível abrir a imagem' }); }
    try {
      const a = amostra(img), total = a.w * a.h;
      const cores = coresRelevantes(a.dados, total);
      return Object.assign(base, {
        largura: a.largura, altura: a.altura,
        vermelho: cores.vermelho, verde: cores.verde, redVerde: cores.ambos,
        contraste: contrasteDominante(a.dados, total),
        texto: textoProvavel(a.dados, a.w, a.h)
      });
    } catch (e) {
      return Object.assign(base, { erro: 'imagem protegida ou de outro site: não é possível ler os pixels' });
    }
  }

  function analisarFluxo(item) {
    const fills = [...String(item.codigo).matchAll(/\bfill\s*:\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)/g)]
      .map(m => m[1].length === 4 ? '#' + m[1].slice(1).split('').map(c => c + c).join('') : m[1]);
    const fam = new Set(fills.map(familia));
    return { linha: item.linha, cores: fills.length, redVerde: fam.has('vermelho') && fam.has('verde') };
  }

  async function analisar(texto, total = LIMITE_TOTAL) {
    const md = String(texto || '');
    const imagens = [], lista = imagensDe(md), limite = Date.now() + total;
    let parou = 0;
    for (const item of lista.slice(0, MAX_IMAGENS)) {
      if (Date.now() > limite) { parou++; continue; }
      imagens.push(await analisarImagem(item));
    }
    const mermaid = fluxosDe(md).map(analisarFluxo);
    return { imagens, mermaid, restantes: Math.max(0, lista.length - MAX_IMAGENS) + parou };
  }

  /* ---------------------------- relatório ---------------------------- */
  function descricaoProblema(img) {
    if (!img.alt) return 'sem descrição (texto alternativo vazio)';
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(img.alt) || img.alt.length < 4) return 'descrição parece um nome de arquivo';
    return '';
  }

  function markdown(imagens, mermaid, restantes) {
    const linhas = [];
    if (imagens && imagens.length) {
      linhas.push('', '## Imagens', '');
      imagens.forEach((img, k) => {
        linhas.push('### Imagem ' + (k + 1) + ' (linha ' + img.linha + ')', '');
        const alt = descricaoProblema(img);
        linhas.push('- Descrição: ' + (alt ? '**' + alt + '**' : 'ok'));
        if (img.erro) { linhas.push('- Não verificada: ' + img.erro); linhas.push(''); return; }
        linhas.push('- Tamanho: ' + img.largura + '×' + img.altura + ' px');
        if (img.redVerde) linhas.push('- **Vermelho e verde em ' + img.vermelho + '% e ' + img.verde + '% da área.** Use também texto, ícone ou padrão, ou troque uma das cores.');
        else linhas.push('- Vermelho e verde: não são as cores principais');
        if (img.contraste) {
          const r = img.contraste.razao;
          linhas.push('- Contraste entre as duas cores dominantes: ' + r.toFixed(2) + ':1' + (r < 3 ? ' — **abaixo de 3:1**' : ''));
        } else linhas.push('- Contraste: não estimável (imagem com muitas cores)');
        if (img.texto) linhas.push('- **Muitos elementos pequenos e de alto contraste: pode haver texto embutido.** Prefira texto no conteúdo, uma tabela ou um fluxo Mermaid.');
        linhas.push('');
      });
      if (restantes) linhas.push('Mais ' + restantes + ' imagem(ns) não analisada(s) neste relatório.', '');
    }
    if (mermaid && mermaid.length) {
      linhas.push('', '## Fluxos Mermaid', '');
      mermaid.forEach(f => {
        linhas.push('- Linha ' + f.linha + ': ' + (f.redVerde
          ? '**usa vermelho e verde.** O gerador aproxima essas cores das cores de erro e apoio do tema no HTML, mas convém revisar o desenho.'
          : 'sem par vermelho × verde nas cores declaradas'));
      });
      linhas.push('');
    }
    return linhas.join('\n');
  }

  function html(imagens, mermaid, restantes) {
    const partes = [];
    if (imagens && imagens.length) {
      partes.push('<section><h2>Imagens</h2>');
      imagens.forEach((img, k) => {
        const alt = descricaoProblema(img);
        partes.push('<h3>Imagem ' + (k + 1) + ' (linha ' + img.linha + ')</h3><ul>');
        partes.push('<li>Descrição: ' + (alt ? '<strong>' + esc(alt) + '</strong>' : 'ok') + '</li>');
        if (img.erro) partes.push('<li>Não verificada: ' + esc(img.erro) + '</li>');
        else {
          partes.push('<li>Tamanho: ' + img.largura + '×' + img.altura + ' px</li>');
          if (img.redVerde) partes.push('<li><strong>Vermelho e verde em ' + img.vermelho + '% e ' + img.verde + '% da área.</strong> Use também texto, ícone ou padrão.</li>');
          if (img.contraste) partes.push('<li>Contraste entre as duas cores dominantes: ' + img.contraste.razao.toFixed(2) + ':1' + (img.contraste.razao < 3 ? ' — <strong>abaixo de 3:1</strong>' : '') + '</li>');
          if (img.texto) partes.push('<li><strong>Pode haver texto embutido.</strong> Prefira texto no conteúdo, uma tabela ou um fluxo Mermaid.</li>');
        }
        partes.push('</ul>');
      });
      if (restantes) partes.push('<p>Mais ' + restantes + ' imagem(ns) não analisada(s).</p>');
      partes.push('</section>');
    }
    if (mermaid && mermaid.length) {
      partes.push('<section><h2>Fluxos Mermaid</h2><ul>');
      mermaid.forEach(f => partes.push('<li>Linha ' + f.linha + ': ' + (f.redVerde ? '<strong>usa vermelho e verde.</strong> O gerador aproxima as cores de erro e apoio do tema no HTML; convém revisar o desenho.' : 'sem par vermelho × verde') + '</li>'));
      partes.push('</ul></section>');
    }
    return partes.join('');
  }

  global.ImagensA11y = { analisar, markdown, html, imagensDe, fluxosDe };
})(window);
