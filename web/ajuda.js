/* =====================================================================================
   Conteudista — Tutorial guiado, Ajuda e Atalhos de teclado
   - Tutorial: abre na primeira visita (ou pelo botão); destaca cada área da própria tela
   - Ajuda: janela com instruções resumidas
   - Atalhos: Alt+Shift+<letra> (não colidem com o editor nem com os navegadores comuns)
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const MOD = isMac ? '⌥ Option + ⇧ Shift' : 'Alt + Shift';

  /* ---------------------------- Estilos ---------------------------- */
  const css = `
.tr-dim{position:fixed;inset:0;z-index:2000;pointer-events:none}
.tr-hole{position:fixed;z-index:2001;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.62);outline:3px solid #168821;transition:all .25s ease;pointer-events:none}
.tr-pop{position:fixed;z-index:2002;width:min(380px,92vw);background:#fff;color:#333333;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.3);padding:16px 18px;font:14.5px/1.5 "Segoe UI",Roboto,Arial,sans-serif}
.tr-pop h4{margin:0 0 6px;color:#0c326f;font-size:16px}.tr-pop p{margin:0 0 10px}
.tr-pop .tr-ft{display:flex;align-items:center;gap:6px}.tr-pop .tr-ft span{flex:1;color:#636363;font-size:12.5px}
.tr-pop kbd{background:#f8f8f8;border:1px solid #cccccc;border-bottom-width:2px;border-radius:4px;padding:0 5px;font:12px Consolas,monospace;white-space:nowrap}.tr-pop code{background:#dbe8fb;padding:0 4px;border-radius:4px}
.tr-pop button{margin:0!important}
.md-back{position:fixed;inset:0;z-index:1900;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.md-win{background:#fff;color:#333333;border-radius:12px;max-width:820px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.35);font:14.5px/1.55 "Segoe UI",Roboto,Arial,sans-serif}
.md-hd{display:flex;align-items:center;padding:12px 18px;border-bottom:1px solid #cccccc}.md-hd h3{margin:0;flex:1;color:#0c326f;font-size:17px}
.md-hd button{margin:0!important}
.md-bd{overflow:auto;padding:14px 20px}
.md-bd h4{color:#0c326f;margin:16px 0 6px;font-size:15px}.md-bd h4:first-child{margin-top:0}
.md-bd table{border-collapse:collapse;width:100%;font-size:13.5px}.md-bd th,.md-bd td{border:1px solid #cccccc;padding:6px 8px;text-align:left;vertical-align:top}.md-bd th{background:#dbe8fb;color:#0c326f}
.md-bd kbd{display:inline-block;background:#f8f8f8;border:1px solid #cccccc;border-bottom-width:2px;border-radius:5px;padding:0 6px;font:12.5px Consolas,monospace;white-space:nowrap}
.md-bd ol,.md-bd ul{padding-left:22px;margin:4px 0}.md-bd li{margin:3px 0}
.md-bd .dica{background:#e3f5e1;border-left:4px solid #168821;padding:8px 12px;border-radius:0 6px 6px 0;margin:8px 0}
.md-bd input[type=search]{width:100%;padding:8px;border:1px solid #cccccc;border-radius:6px;margin-bottom:10px;font:inherit}
.md-bd mark{background:#ffe08a;color:inherit;padding:0 1px;border-radius:2px}
.md-bd .hs[hidden]{display:none}.md-bd .hz{color:#636363;font-style:italic;margin:8px 0}
.md-tools{display:flex;gap:8px;align-items:center;margin-bottom:10px}.md-tools input{flex:1;margin:0!important}.md-tools button{margin:0!important}
.kb-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2100;background:#0c326f;color:#fff;padding:8px 14px;border-radius:8px;font:13.5px "Segoe UI",Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transition:opacity .2s}
.kb-toast.on{opacity:1}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------------------------- Utilidades ---------------------------- */
  let toastT;
  function toast(m) { let t = document.querySelector('.kb-toast'); if (!t) { t = document.createElement('div'); t.className = 'kb-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800); }
  function janela(titulo, html, aoAbrir) {
    fechar();
    const back = document.createElement('div'); back.className = 'md-back'; back.id = 'mdBack';
    back.innerHTML = '<div class="md-win" role="dialog" aria-modal="true" aria-label="' + titulo + '"><div class="md-hd"><h3>' + titulo + '</h3><button type="button" class="sec" id="mdX" title="Fechar (Esc)">Fechar ✕</button></div><div class="md-bd">' + html + '</div></div>';
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) fechar(); });
    $('mdX').onclick = fechar; $('mdX').focus();
    if (aoAbrir) aoAbrir(back);
  }
  function fechar() { const b = $('mdBack'); if (b) b.remove(); }
  function abrirAba(t) { const b = $(t === 's' ? 'ts' : 'tg'); if (b) b.click(); }
  function focarEditor(t) { abrirAba(t); setTimeout(() => { const ta = document.querySelector('#' + (t === 's' ? 'ps' : 'pg') + ' .mde-ta'); if (ta) { ta.focus(); ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 60); }
  const abrir = el => { if (window.abrirSecao) window.abrirSecao(el); };
  function clicar(id, msg) { const b = $(id); if (!b) return; abrir(b); b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.click(); if (msg) toast(msg); }

  /* ---------------------------- Tutorial guiado ---------------------------- */
  const PASSOS = [
    { alvo: null, t: 'Bem-vindo ao Conteudista', d: 'Em poucos passos você verá como <b>escrever</b>, <b>gerar</b>, <b>guardar</b> e <b>recuperar</b> um conteúdo. A conversão acontece no seu navegador; nada é enviado sem você pedir.' },
    { alvo: 'abas', antes: () => abrirAba('g'), t: '1. Escreva ou cole o texto', d: 'Use as abas <b>Apostila</b> e <b>Apresentação</b>. Cole o texto gerado por uma IA (use o prompt padrão do exemplo), arraste um arquivo <code>.md</code> ou escreva no editor. A prévia aparece ao lado.' },
    { alvo: () => document.querySelector('#pg .mde-tb'), t: '2. Formate com a barra de ferramentas', d: 'Títulos, listas, checklists, links, <b>imagens</b> (viram base64 automaticamente), tabelas e fluxos. Dica: <kbd>Ctrl+B</kbd> negrito, <kbd>Ctrl+K</kbd> link. O botão <b>Versões</b> guarda, compara e restaura o texto.' },
    { alvo: 'go', t: '3. Gere os arquivos', d: 'Clique em <b>Gerar arquivos</b>. Você recebe a apostila (HTML, DOCX, MD), a apresentação (HTML, PPTX, MD) e um ZIP, em <b>Arquivos gerados</b>, com o nome, a data, o tamanho e o layout de cada geração. Os anteriores ficam no <b>Histórico</b>, com busca. Para testar agora, use <b>Carregar exemplo</b>, que traz um guia completo de uso da aplicação, com apostila, apresentação e prompt padrão para IA. Os arquivos são o conteúdo <b>pronto, para entregar</b>.' },
    { alvo: 'btnSalvar', t: '4. Guarde o conteúdo', d: 'O botão <b>Salvar ▾</b>, ao lado de <b>Gerar arquivos</b>, reúne as formas de guardar: <b>Guardar no navegador</b>, <b>Baixar tudo (.zip)</b> e <b>Compartilhar link</b>. O botão <b>Compartilhar link</b> também fica ao lado de <b>Salvar ▾</b>, ao lado de <b>Importar</b> e na barra do editor, e todos abrem a mesma janela. Com o link, o conteúdo inteiro (texto, imagens, nome e rodapé) vira um endereço: cole-o onde preferir, como um e-mail para você mesmo, o Teams ou os favoritos, e abra quando quiser <b>continuar editando</b>, em qualquer computador. O salvamento automático (chave no alto, com o horário do último salvamento) só recupera o último trabalho neste navegador.' },
    { alvo: 'btnImportar', t: '5. Recupere um conteúdo', d: 'Em <b>Importar</b>, abra suas <b>versões salvas</b> e links, envie arquivos do computador (<code>.md</code>, <code>.zip</code>, imagens) ou cole um <b>link do conteúdo</b>. Use o campo <b>Buscar</b> para achar um item pelo nome, data, layout ou tipo de arquivo. O texto atual vai para <b>Versões</b> antes de ser substituído.' },
    { alvo: () => document.querySelector('header .hb'), t: 'Pronto!', d: 'Reveja o tutorial (<kbd>' + MOD + ' + T</kbd>), a <b>Ajuda</b> (<kbd>F1</kbd>, com busca) e os <b>Atalhos</b> (<kbd>' + MOD + ' + K</kbd>) por estes botões a qualquer momento. O botão <b>↺</b> recomeça o tutorial.' }
  ];
  let passo = -1, hole = null, pop = null;
  function alvoEl(p) { const a = typeof p.alvo === 'function' ? p.alvo() : p.alvo ? $(p.alvo) : null; if (a) abrir(a); return a && a.getClientRects().length ? a : null; }
  function posicionar() {
    if (passo < 0) return;
    const el = alvoEl(PASSOS[passo]), vw = innerWidth, vh = innerHeight;
    if (el) {
      const r = el.getBoundingClientRect(), m = 6;
      Object.assign(hole.style, { display: 'block', left: (r.left - m) + 'px', top: (r.top - m) + 'px', width: (r.width + 2 * m) + 'px', height: (r.height + 2 * m) + 'px' });
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      let top = r.bottom + 14; if (top + ph > vh - 10) top = r.top - ph - 14; if (top < 10) top = Math.min(vh - ph - 10, Math.max(10, r.top + 10));
      let left = Math.min(vw - pw - 12, Math.max(12, r.left)); Object.assign(pop.style, { top: top + 'px', left: left + 'px' });
    } else {
      Object.assign(hole.style, { display: 'block', left: (vw / 2) + 'px', top: (vh / 2) + 'px', width: '0px', height: '0px' });
      Object.assign(pop.style, { top: Math.max(20, (vh - pop.offsetHeight) / 2) + 'px', left: Math.max(12, (vw - pop.offsetWidth) / 2) + 'px' });
    }
  }
  function mostrar(i) {
    passo = i; const p = PASSOS[i]; if (p.antes) p.antes();
    pop.innerHTML = '<h4>' + p.t + '</h4><p>' + p.d + '</p><div class="tr-ft"><span>' + (i + 1) + ' de ' + PASSOS.length + '</span>' +
      (i > 0 ? '<button type="button" class="sec" data-a="r" title="Recomeçar do primeiro passo">↺</button><button type="button" class="sec" data-a="v">Voltar</button>' : '<button type="button" class="sec" data-a="x">Pular</button>') +
      '<button type="button" data-a="p">' + (i === PASSOS.length - 1 ? 'Concluir' : 'Próximo') + '</button></div>';
    pop.querySelector('[data-a="p"]').onclick = () => i === PASSOS.length - 1 ? fim() : mostrar(i + 1);
    const v = pop.querySelector('[data-a="v"]'); if (v) v.onclick = () => mostrar(i - 1);
    const x = pop.querySelector('[data-a="x"]'); if (x) x.onclick = fim;
    const rr = pop.querySelector('[data-a="r"]'); if (rr) rr.onclick = () => mostrar(0);
    const el = alvoEl(p);
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' }); }
    setTimeout(posicionar, 80); pop.querySelector('[data-a="p"]').focus();
  }
  function reiniciar() { localStorage.removeItem('conteudista.tour'); iniciar(); toast('Tutorial reiniciado'); }
  function iniciar() {
    fechar(); fim(true);
    hole = document.createElement('div'); hole.className = 'tr-hole';
    pop = document.createElement('div'); pop.className = 'tr-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-live', 'polite');
    document.body.append(hole, pop);
    addEventListener('resize', posicionar); addEventListener('scroll', posicionar, true);
    mostrar(0);
  }
  function fim(silencioso) {
    if (hole) hole.remove(); if (pop) pop.remove(); hole = pop = null;
    removeEventListener('resize', posicionar); removeEventListener('scroll', posicionar, true);
    if (passo >= 0 && !silencioso) { localStorage.setItem('conteudista.tour', '1'); toast('Tutorial concluído. Reabra pelo botão ▶ Tutorial.'); }
    passo = -1;
  }

  /* ---------------------------- Ajuda ---------------------------- */
  const AJUDA = `
<h4>O que é</h4>
<p>O Conteudista transforma dois textos em Markdown — a <b>apostila</b> e a <b>apresentação</b> — em um <b>conteúdo</b> completo: apostila (HTML, DOCX, MD) e apresentação (HTML, PPTX, MD), com locução opcional. A conversão roda <b>no seu navegador</b>; o site não guarda nenhum conteúdo.</p>
<h4>Termos usados</h4>
<table><tr><th>Termo</th><th>O que é</th></tr>
<tr><td><b>Conteúdo</b></td><td>O material que você produz: apostila e apresentação, com um <b>nome</b>, um <b>layout</b> e um <b>rodapé</b>.</td></tr>
<tr><td><b>Apostila</b></td><td>O documento de estudo, em HTML, DOCX e MD.</td></tr>
<tr><td><b>Apresentação</b></td><td>Os slides, em HTML, PPTX e MD, com narração opcional.</td></tr>
<tr><td><b>Locução</b></td><td>Áudio gerado a partir de um texto (aba <b>Locução</b>).</td></tr>
<tr><td><b>Arquivos</b></td><td>O conteúdo <b>pronto</b>, para entregar (.DOCX, .PPTX, .HTML, .ZIP).</td></tr>
<tr><td><b>Texto-fonte</b></td><td>Os textos em Markdown e as imagens, para continuar editando.</td></tr>
<tr><td><b>Link</b></td><td>O texto-fonte em um endereço, para guardar ou enviar.</td></tr>
<tr><td><b>Versão</b></td><td>Uma cópia do texto-fonte guardada neste navegador.</td></tr>
<tr><td><b>Histórico</b></td><td>A lista dos arquivos já gerados, neste navegador.</td></tr></table>
<h4>Gerar um conteúdo em 3 passos</h4>
<ol>
<li>Na aba <b>Apostila</b>, cole ou arraste o texto da apostila (<code>.md</code>); na aba <b>Apresentação</b>, o dos slides.</li>
<li>Informe o <b>Nome do conteúdo</b> (usado nos nomes dos arquivos, como <code>Apostila_Nome.docx</code>) e escolha o <b>Layout (tema)</b>: <b>Padrão gov.br</b>, <b>ANAC 20 anos</b> (claro ou escuro) ou <b>Clássico</b>. Os temas ANAC 20 anos mudam só a apresentação; a apostila segue o padrão gov.br. O <b>rodapé</b> (opcional) fica entre o nome e o layout e aparece nos slides e no DOCX.</li>
<li>Clique em <b>Gerar arquivos</b> e baixe cada arquivo ou o <b>ZIP</b>. Os pacotes anteriores ficam no botão <b>Histórico</b>, no cabeçalho da seção <b>Arquivos gerados</b>, onde é possível <b>buscar</b>. Ao usar <b>Exibir</b> no Histórico, o pacote escolhido aparece na seção com os seus arquivos e o ZIP <b>acima da exibição</b>, para você baixar a versão que está vendo. A seção <b>Arquivos gerados</b> abre sozinha ao gerar e pode ser recolhida, como as demais, pelo controle <b>recolher</b> à direita do título; o botão <b>Histórico</b> continua à mão com ela recolhida. Se só um dos dois textos estiver preenchido, são gerados apenas os arquivos dele.</li>
</ol>
<div class="dica">Na primeira geração o navegador carrega o motor Python (20 a 60 s). Depois é imediato.</div>
<h4>Conteúdo de exemplo</h4>
<p>O botão <b>Carregar exemplo</b> traz um <b>guia de uso do próprio Conteudista</b>, que serve de aula e de modelo para o seu conteúdo:</p>
<ul>
<li>uma <b>apostila</b> de 16 seções, do <b>Início rápido</b> ao prompt para IA, com 5 fluxos Mermaid, figuras, vídeos, checklists, exercícios com gabarito e referências;</li>
<li>uma <b>apresentação</b> de 34 slides, um assunto por slide, com <b>notas para narração</b> (cerca de 15 minutos de áudio);</li>
<li>o <b>prompt padrão para IA</b>, na seção 11.3 da apostila.</li>
</ul>
<p>Para criar o seu conteúdo, substitua os textos e mantenha a estrutura. Para gerar a aula narrada, marque <b>Narração dos slides</b> na aba <b>Apresentação</b> antes de <b>Gerar arquivos</b>. Para ouvir apenas as notas, importe-as na aba <b>Locução</b>.</p>
<h4>Produzir os textos com uma IA</h4>
<ul>
<li>Na seção <b>11.3</b> da apostila de exemplo está o <b>prompt padrão</b>: um bloco único, para copiar e colar em uma IA autorizada pela instituição.</li>
<li>Edite somente a seção 1 do prompt, com 14 parâmetros (tema, público, objetivo de aprendizagem, número de seções e de slides, tamanho das notas, formato de entrega e outros), e a seção 2, com o material de referência. As demais seções fixam as regras de conteúdo e de formato.</li>
<li>Escolha a entrega: <b>A</b>, dois blocos de texto, que você cola em <b>Importar › Colar</b>, nas subabas <b>Apostila</b> e <b>Apresentação</b>; ou <b>B</b>, um arquivo <b>ZIP</b> com os dois textos e a pasta <code>imagens/</code>, que você importa em <b>Importar › Computador</b>.</li>
<li>Revise tudo antes de gerar os arquivos, em especial os trechos marcados com <code>[A confirmar]</code>. Não envie dados pessoais nem informações restritas.</li>
</ul>
<h4>Editor</h4>
<ul>
<li>Modos <b>Editar</b>, <b>Dividido</b> (editor + prévia) e <b>Prévia</b>; tela cheia pelo último botão da barra.</li>
<li><b>Desfazer/refazer</b>: <kbd>Ctrl+Z</kbd> e <kbd>Ctrl+Y</kbd> (ou <kbd>Ctrl+Shift+Z</kbd>), ou os dois primeiros botões da barra. Funciona também para ações dos botões, arquivos arrastados e rascunhos abertos (até 300 passos por editor).</li>
<li>Outros atalhos do editor: <kbd>Ctrl+B</kbd> negrito, <kbd>Ctrl+I</kbd> itálico, <kbd>Ctrl+E</kbd> código, <kbd>Ctrl+K</kbd> link, <kbd>Ctrl+Shift+1/2/3</kbd> títulos, <kbd>Ctrl+Shift+7/8/9</kbd> listas, <kbd>Alt+↑/↓</kbd> mover linha. Lista completa no botão <b>Atalhos</b>.</li>
<li><b>Imagens</b>: arraste para o editor (entram onde o cursor estiver), cole com <kbd>Ctrl+V</kbd> (print de tela ou imagem copiada) ou use o botão de imagem. Ficam em base64 dentro do texto e aparecem no editor como <code>(img:N)</code>.</li>
<li><b>Imagens do texto</b> (painel abaixo do editor): miniaturas na ordem em que aparecem no texto, com dimensões, peso, descrição editável e botões <b>Inserir</b>, <b>Localizar</b> e <b>Remover</b>.</li>
<li><b>Ordenar imagens</b>: arraste os cartões ou use <b>◀ ▶</b>; as imagens trocam de posição no texto (cada uma leva sua legenda). O menu <b>Ordenar…</b> inverte a ordem ou ordena por legenda, peso ou largura.</li>
<li><b>Editar imagem</b> (botão <b>Editar</b> no cartão): <b>Cortar</b> (arraste na imagem, ajuste pelas alças, proporções 1:1, 4:3, 16:9 etc. ou valores em px), <b>Girar</b> (90°, 180°, espelhar, ajuste fino de −45° a +45°) e <b>Tamanho</b> (largura, 25/50/75%, limites, JPEG/PNG/WebP, qualidade). A prévia mostra o resultado e o novo peso antes de aplicar.</li>
<li><b>Editar várias</b>: marque a caixa no canto dos cartões (ou <b>Selecionar todas</b>) e clique em <b>Editar selecionadas</b> para girar, espelhar, cortar centralizado numa proporção, limitar a largura e converter o formato de uma vez. <b>Reduzir todas…</b> só diminui as grandes. Tudo pode ser desfeito com <kbd>Ctrl+Z</kbd>.</li>
<li>Se o texto já cita uma imagem pelo nome (ex.: <code>![Figura](fluxo.png)</code>), arraste o arquivo <code>fluxo.png</code>: ele é associado à referência e convertido para base64.</li>
<li>Na apresentação, cada slide é separado por uma linha <code>---</code>. Use os botões <b>Slide</b>, <b>Capa</b>, <b>Destaque</b> e <b>Notas</b>.</li>
</ul>
<h4>Narração dos slides</h4>
<ul>
<li>Na aba <b>Apresentação</b>, marque <b>Narração dos slides</b> (acima de <b>Gerar arquivos</b>) para transformar as <b>notas do apresentador</b> (<code>&lt;!-- notas: … --&gt;</code>) em áudio dentro da apresentação. O painel só aparece com a aba Apresentação selecionada; a escolha continua valendo ao gerar os arquivos.</li>
<li>Escolha idioma, voz (padrão: <b>Faber</b>), velocidade e formato do áudio: <b>MP3</b> (padrão), <b>OGG</b> (menor) ou <b>WAV</b> (sem compressão). No PowerPoint o áudio vai em MP3 (ou WAV, se escolhido).</li>
<li><b>HTML</b>: a apresentação abre com “Iniciar com narração”; o botão <b>Narração</b> (<kbd>M</kbd>) liga/desliga o som e <b>Avanço automático</b> (<kbd>A</kbd>) passa ao próximo slide quando o áudio termina.</li>
<li><b>PPTX</b>: o áudio de cada slide começa sozinho na apresentação de slides. Com “Avançar os slides sozinho”, dá para usar <b>Arquivo → Exportar → Criar um vídeo</b> no PowerPoint.</li>
<li>Para falar um texto diferente da nota, use <code>&lt;!-- narracao: texto --&gt;</code>; para um slide sem som, <code>&lt;!-- narracao: nao --&gt;</code>.</li>
</ul>
<h4>Guardar o conteúdo: arquivo ou link?</h4>
<p>O Conteudista não guarda nenhum conteúdo no site. Você decide onde ele fica, e há dois tipos de saída:</p>
<ul>
<li><b>Arquivos</b> (.DOCX, .PPTX, .HTML, .ZIP): são o conteúdo <b>pronto</b>, para entregar e abrir no Word, no PowerPoint ou no navegador.</li>
<li><b>Link</b>: é o seu <b>texto-fonte</b> (apostila, apresentação, imagens, nome e rodapé) em um endereço. Serve para continuar editando depois, em qualquer computador.</li>
</ul>
<table><tr><th>Quero…</th><th>Use</th></tr>
<tr><td>Entregar o conteúdo pronto</td><td><b>.DOCX</b>, <b>.PPTX</b> ou <b>.HTML</b></td></tr>
<tr><td>Continuar editando em outro computador</td><td><b>Link</b> (botão <b>Compartilhar link</b>)</td></tr>
<tr><td>Enviar o texto-fonte a um colega</td><td><b>Link</b></td></tr>
<tr><td>Guardar uma cópia em uma pasta</td><td><b>.ZIP</b> ou <b>Pasta</b> (<b>Salvar ▾</b>)</td></tr>
<tr><td>Voltar a uma versão anterior, neste navegador</td><td><b>Versão</b> (<b>Salvar ▾ › Guardar no navegador</b>)</td></tr></table>
<h4>Onde fica e como recuperar</h4>
<table><tr><th>Como</th><th>Onde fica</th><th>Como recuperar</th></tr>
<tr><td><b>Link</b></td><td>No próprio endereço ou no PrivateBin (cifrado)</td><td>Abra o link, ou <b>Importar › Colar › Link</b></td></tr>
<tr><td><b>Salvamento automático</b> (ligado por padrão; o horário do último salvamento aparece sob a barra de ações)</td><td>Neste navegador, neste computador</td><td>Abra a página de novo: o último trabalho volta sozinho</td></tr>
<tr><td><b>Versão</b> (<b>Salvar ▾ › Guardar no navegador</b>)</td><td>Neste navegador</td><td><b>Importar › Salvos</b></td></tr>
<tr><td><b>Pasta</b>, <b>.MD</b> e <b>.ZIP</b></td><td>No seu disco</td><td>Arraste os <code>.md</code> de volta para as abas ou use <b>Importar › Computador</b></td></tr></table>
<div class="dica">Limpar os dados do navegador apaga as versões salvas e os links lembrados. Para guardar por mais tempo, use <b>Link</b> ou <b>.ZIP</b>.</div><h4>O botão Salvar ▾</h4>
<p>O botão <b>Salvar ▾</b> fica ao lado de <b>Gerar arquivos</b> e é o único caminho para guardar o conteúdo. Não há botão Salvar no editor: o texto é guardado sozinho pelo salvamento automático.</p>
<table><tr><th>Item do menu</th><th>O que faz</th></tr>
<tr><td><b>Guardar no navegador</b></td><td>Cria uma <b>versão salva</b>, só neste navegador (<kbd>Alt+Shift+S</kbd>). Reabra em <b>Importar › Salvos</b>.</td></tr>
<tr><td><b>Baixar tudo (.zip)</b></td><td>Baixa os dois textos em Markdown e os arquivos gerados em um único ZIP.</td></tr>
<tr><td><b>Compartilhar link</b></td><td>Abre a janela <b>Link do conteúdo</b> (<kbd>Alt+Shift+L</kbd>).</td></tr>
<tr><td><b>Salvar na pasta</b></td><td>Grava os arquivos em uma pasta do computador (Edge e Chrome) (<kbd>Alt+Shift+P</kbd>).</td></tr>
<tr><td><b>Baixar .md</b></td><td>Baixa só os textos em Markdown (<kbd>Alt+Shift+D</kbd>).</td></tr></table>
<h4>Buscar no Histórico e em Salvos</h4>
<ul>
<li>Nas janelas <b>Histórico</b> (em <b>Arquivos gerados</b>) e <b>Importar › Salvos</b>, o campo <b>Buscar</b> filtra a lista enquanto você digita, sem diferenciar maiúsculas, minúsculas e acentos.</li>
<li>A busca olha o <b>nome do conteúdo</b>, a <b>data e a hora</b>, o <b>tamanho</b>, o <b>layout</b>, o <b>rodapé</b>, a <b>narração</b> e o <b>tipo de arquivo</b> (apostila, apresentação, docx, pptx, html, md, zip). Nos links, também o tipo (direto ou PrivateBin), a validade e a senha.</li>
<li>Com mais de uma palavra, aparecem só os itens que têm <b>todas</b>. Exemplo: <code>docx ANAC escuro</code>. Use aspas para uma frase exata: <code>"ANAC 20 anos"</code>.</li>
<li><kbd>Esc</kbd> limpa a busca; com o campo vazio, fecha a janela.</li>
</ul>
<h4>Versões do texto (comparar antes e depois)</h4>
<ul>
<li>As versões do texto ficam <b>somente neste navegador</b>: edições da sessão (a cada 3 min de edição), <b>arquivos carregados</b>, conteúdos <b>abertos de links</b>, rascunhos, exemplo, versões <b>marcadas</b> (★) e os momentos de gerar ou compartilhar. Antes de carregar ou restaurar algo, o conteúdo atual também é guardado.</li>
<li>Abra pelo botão <b>Versões</b> na barra do editor (ao lado da tela cheia) ou <kbd>Alt+Shift+V</kbd>. A janela de comparação aparece sobre a página; feche com <b>Fechar</b> ou <kbd>Esc</kbd>.</li>
<li>Escolha a <b>Versão A</b> (antes) e a <b>Versão B</b> (depois) — de qualquer sessão, arquivo ou link, ou “Atual” — e clique em <b>Comparar</b>. Use ⇄ para inverter.</li>
<li>Leitura do resultado: linhas <span style="background:#fde0db">removidas</span> e <span style="background:#e8f5ec">incluídas</span>, com as palavras alteradas destacadas; imagens aparecem como miniaturas e as que mudaram são listadas em “Antes” e “Depois”.</li>
<li>Opções: Apostila, Apresentação ou ambos; lado a lado ou unificado; só alterações (com contexto) ou texto completo. Trechos iguais recolhidos abrem com um clique.</li>
<li><b>Restaurar A/B</b> coloca a versão nos editores; <b>.MD A/B</b> salva os .md; <b>★ Salvar versão</b> cria um ponto nomeado (não é apagado automaticamente). O limite é de 120 versões.</li>
</ul>
<h4>Criar um link</h4>
<ol>
<li>Clique em <b>Compartilhar link</b>: ao lado de <b>Salvar ▾</b>, ao lado de <b>Importar</b> ou no ícone da barra do editor. Também vale <b>Salvar ▾ › Compartilhar link</b>. Todos abrem a mesma janela.</li>
<li>Confira a opção sugerida para o tamanho do seu conteúdo. Você pode trocá-la.</li>
<li>Se quiser, defina uma <b>senha</b> e envie-a por outro canal.</li>
<li>Clique em <b>Criar link</b>. Ele é copiado automaticamente e aparece na janela, com o QR Code.</li>
<li>Guarde o link onde preferir. Com <b>Lembrar este link neste navegador</b> marcado, ele também fica em <b>Importar › Salvos</b>.</li>
</ol>
<table><tr><th></th><th>Link direto</th><th>PrivateBin</th></tr>
<tr><td>Onde fica o conteúdo</td><td>No próprio endereço</td><td>Cifrado em um servidor</td></tr>
<tr><td>Validade</td><td>Não expira</td><td>Até a data escolhida (padrão: 1 ano)</td></tr>
<tr><td>Indicado para</td><td>Conteúdos pequenos ou médios</td><td>Conteúdos grandes ou com muitas imagens</td></tr>
<tr><td>Limite</td><td>Pode ser cortado por e-mail ou Teams</td><td>Cerca de 10 MB</td></tr></table>
<ul>
<li>No PrivateBin, as imagens podem ir como <b>anexo ZIP</b>; ao abrir aqui, voltam para base64.</li>
<li>O <b>tamanho</b> aparece antes do envio. O privatebin.net aceita cerca de 10 MB.</li>
</ul>
<h4>Voltar a um conteúdo</h4>
<ul>
<li><b>Importar › Colar › Link</b>: cole o endereço (e a senha, se houver) e clique em <b>Importar</b>. O texto atual vai para <b>Versões</b> antes de ser substituído.</li>
<li>Ou abra o link direto no navegador: o conteúdo carrega sozinho.</li>
<li>Os links criados neste navegador ficam em <b>Importar › Salvos</b>, com o tipo e a validade.</li>
<li>Para limpar, use <b>Excluir versões salvas</b> ou <b>Excluir links</b>, logo abaixo do título de cada grupo, ou <b>Excluir tudo</b>, no rodapé da janela. Cada item também tem o seu <b>Excluir</b>. Toda exclusão pede confirmação e não pode ser desfeita.</li>
</ul>
<h4>Cuidados com o link</h4>
<ul>
<li><b>Quem tiver o link acessa o conteúdo.</b> Trate-o como trataria o arquivo.</li>
<li><b>Não há como recuperar</b> um link perdido nem a sua senha. O Conteudista não guarda cópia.</li>
<li><b>Não inclua dados pessoais</b> ou informações restritas sem autorização da chefia.</li>
<li>O link direto aponta para o endereço atual desta página; se o site mudar de endereço, links antigos podem deixar de abrir.</li>
</ul><h4>Problemas comuns</h4>
<table><tr><th>Sintoma</th><th>O que fazer</th></tr>
<tr><td>“Falha ao carregar … cdn.jsdelivr.net”</td><td>A rede bloqueou o motor Python. Tente outra rede ou peça liberação do endereço.</td></tr>
<tr><td>“CORS ou rede bloqueada” no PrivateBin</td><td>Use o <b>link autocontido</b> ou outra instância do PrivateBin.</td></tr>
<tr><td>Imagens “pendentes”</td><td>Arraste os arquivos de imagem citados no texto (com o mesmo nome) para a área da aba ou para o editor.</td></tr>
<tr><td>Imagem não aparece</td><td>Confira o painel <b>Imagens do texto</b>; use <b>Localizar</b>. Arquivos muito grandes deixam o conteúdo pesado — use <b>Redimensionar</b> ou <b>Reduzir todas…</b> (até ~1 MB por imagem).</td></tr>
<tr><td>Sumário vazio no DOCX</td><td>No Word, clique com o botão direito no sumário → <b>Atualizar campo</b>.</td></tr>
<tr><td>A IA devolveu um texto fora do padrão</td><td>Cole de novo a seção 5 (apostila) ou a seção 6 (apresentação) do prompt padrão e peça a correção.</td></tr>
<tr><td>A narração lê símbolos ou endereços</td><td>Reescreva a nota em texto corrido, sem símbolos nem endereços, e gere de novo. Para falar um texto diferente da nota, use <code>&lt;!-- narracao: texto --&gt;</code>.</td></tr>
<tr><td>Fluxos Mermaid no DOCX/PPTX</td><td>Aparecem como tabela “De | Condição | Para” (desenho só no HTML).</td></tr>
<tr><td>O link chegou cortado por e-mail ou Teams</td><td>Use o <b>PrivateBin</b>, que gera um endereço curto.</td></tr>
<tr><td>“Este link exige senha”</td><td>Informe a senha, enviada por quem criou o link.</td></tr>
<tr><td>O link do PrivateBin deixou de abrir</td><td>Ele expirou. Abra o conteúdo por outra versão e crie um novo link.</td></tr>
<tr><td>Perdi o link</td><td>Veja em <b>Importar › Salvos</b>. Só aparece se a opção de lembrar estava marcada neste navegador.</td></tr></table>
<h4>Tutorial</h4>
<p>O tutorial abre sozinho na primeira visita. Para vê-lo de novo, use o botão <b>▶ Tutorial</b>, o botão <b>↺ Reiniciar tutorial</b> desta janela ou <kbd>Alt+Shift+R</kbd>. Dentro do tutorial, <b>↺</b> volta ao primeiro passo.</p>
<h4>Novidades</h4>
<p>O botão <b>★ Novidades</b> no topo (ou <kbd>Alt+Shift+U</kbd>) mostra o que mudou em cada versão. Um ponto verde indica versão ainda não vista.</p>
<h4>Privacidade</h4>
<p>Não inclua dados pessoais ou informações restritas em links compartilhados sem autorização. O conteúdo só sai do seu computador quando você cria um link.</p>`;
  function secoes(html) {  // agrupa a ajuda em seções pesquisáveis
    return html.split(/(?=<h4>)/).filter(x => x.trim()).map(x => '<div class="hs">' + x + '</div>').join('');
  }
  function marcar(el, q) {
    el.querySelectorAll('mark').forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
    el.normalize(); if (!q) return 0;
    const norm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), nq = norm(q); let n = 0;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nos = []; while (w.nextNode()) nos.push(w.currentNode);
    nos.forEach(t => {
      const tx = t.textContent, nt = norm(tx); let i = nt.indexOf(nq); if (i < 0) return;
      const fr = document.createDocumentFragment(); let p = 0;
      while (i >= 0) { fr.append(tx.slice(p, i)); const m = document.createElement('mark'); m.textContent = tx.slice(i, i + q.length); fr.append(m); n++; p = i + q.length; i = nt.indexOf(nq, p); }
      fr.append(tx.slice(p)); t.replaceWith(fr);
    });
    return n;
  }
  function ajuda(termo) {
    const ferr = '<div class="md-tools"><input type="search" id="hlpF" placeholder="Buscar na ajuda (ex.: imagem, senha, PrivateBin, DOCX)…" aria-label="Buscar na ajuda">' +
      '<button type="button" class="sec" id="hlpTour" title="Recomeçar o tutorial do primeiro passo">↺ Reiniciar tutorial</button>' +
      '<button type="button" class="sec" id="hlpKeys">⌨ Atalhos</button></div><p class="hz" id="hlpN" hidden></p>';
    janela('Ajuda do Conteudista', ferr + '<div id="hlpC">' + secoes(AJUDA) + '</div>', back => {
      const f = back.querySelector('#hlpF'), c = back.querySelector('#hlpC'), info = back.querySelector('#hlpN');
      back.querySelector('#hlpTour').onclick = reiniciar; back.querySelector('#hlpKeys').onclick = () => atalhos();
      let t;
      const filtrar = () => {
        const q = f.value.trim(); let tot = 0, vis = 0;
        c.querySelectorAll('.hs').forEach(sec => { const n = marcar(sec, q.length > 1 ? q : ''); sec.hidden = q.length > 1 && !n; tot += n; vis += !sec.hidden; });
        info.hidden = q.length < 2;
        info.textContent = tot ? tot + ' ocorrência(s) em ' + vis + ' seção(ões).' : 'Nada encontrado para “' + q + '”. Tente outra palavra.';
        const m = c.querySelector('mark'); if (m) m.scrollIntoView({ block: 'nearest' });
      };
      f.oninput = () => { clearTimeout(t); t = setTimeout(filtrar, 150); };
      f.onkeydown = e => { if (e.key === 'Enter') { const ms = [...c.querySelectorAll('mark')]; if (!ms.length) return; ajuda.i = ((ajuda.i || 0) + 1) % ms.length; ms[ajuda.i].scrollIntoView({ block: 'center' }); } };
      if (termo) { f.value = termo; filtrar(); }
      f.focus();
    });
  }

  /* ---------------------------- Atalhos ---------------------------- */
  // Alt+Shift+<tecla>: não usado pelo editor (Ctrl+B/I/K, Tab, Enter) nem pelos navegadores comuns.
  const ATALHOS = [
    { g: 'Arquivos', k: 'G', d: 'Gerar arquivos', f: () => clicar('go', 'Gerando arquivos…') },
    { g: 'Arquivos', k: 'E', d: 'Carregar exemplo', f: () => clicar('ex') },
    { g: 'Arquivos', k: 'D', d: 'Baixar os .md', f: () => clicar('mdl', 'Baixando .md…') },
    { g: 'Arquivos', k: 'P', d: 'Salvar na pasta', f: () => clicar('fsave') },
    { g: 'Salvar e recuperar', k: 'S', d: 'Guardar no navegador (versão)', f: () => { if (window.SalvarVersao) SalvarVersao.salvar(); } },
    { g: 'Salvar e recuperar', k: 'A', d: 'Ligar/desligar salvamento automático', f: () => { const c = $('auto'); c.checked = !c.checked; c.dispatchEvent(new Event('change')); toast('Salvamento automático ' + (c.checked ? 'ligado' : 'desligado')); } },
    { g: 'Salvar e recuperar', k: 'L', d: 'Compartilhar link (guardar ou enviar)', f: () => { if (window.Compartilhar) Compartilhar.abrir(); } },
    { g: 'Salvar e recuperar', k: 'O', d: 'Importar', f: () => { if (window.Importar) Importar.abrir(); } },
    { g: 'Navegação', k: '1', d: 'Aba Apostila (foca o editor)', f: () => focarEditor('g') },
    { g: 'Navegação', k: '2', d: 'Aba Apresentação (foca o editor)', f: () => focarEditor('s') },
    { g: 'Navegação', k: 'M', d: 'Alternar modo do editor (Editar → Dividido → Prévia)', f: () => { const vis = document.querySelector('#pg:not([hidden]) .mde, #ps:not([hidden]) .mde'); if (!vis) return; const ordem = ['e', 's', 'p'], i = (ordem.indexOf(vis.dataset.m) + 1) % 3; const b = vis.querySelector('.mde-tb [data-m="' + ordem[i] + '"]'); if (b) b.click(); toast(['Somente editor', 'Editor + prévia', 'Somente prévia'][i]); } },
    { g: 'Navegação', k: 'V', d: 'Versões do texto (comparar antes e depois)', f: () => window.Hist && Hist.abrir() },
    
    { g: 'Navegação', k: 'F', d: 'Tela cheia do editor', f: () => { const vis = document.querySelector('#pg:not([hidden]) .mde, #ps:not([hidden]) .mde'); const b = vis && [...vis.querySelectorAll('.mde-tb button')].pop(); if (b) b.click(); } },
    { g: 'Ajuda', k: 'T', d: 'Tutorial', f: iniciar },
    { g: 'Ajuda', k: 'R', d: 'Reiniciar o tutorial (do primeiro passo)', f: reiniciar },
    { g: 'Ajuda', k: 'H', d: 'Ajuda (também F1)', f: () => ajuda() },
    { g: 'Ajuda', k: 'K', d: 'Esta lista de atalhos', f: () => atalhos() },
    { g: 'Ajuda', k: 'U', d: 'Novidades (changelog)', f: () => window.Conteudista && Conteudista.novidades && Conteudista.novidades() }
  ];
  const EDITOR = ((window.MDEditor && MDEditor.ATALHOS) || []).map(a => isMac ? [a[0].replace(/Ctrl/g, '⌘ Cmd').replace(/Alt/g, '⌥ Option'), a[1]] : a);
  function atalhos() {
    const grupos = [...new Set(ATALHOS.map(a => a.g))];
    let h = '<input type="search" id="kbF" placeholder="Filtrar atalhos…" aria-label="Filtrar atalhos">';
    h += '<p>Atalhos da aplicação usam <kbd>' + MOD + '</kbd> + tecla, para não interferir no editor nem no navegador.</p>';
    grupos.forEach(g => { h += '<div class="kbG"><h4>' + g + '</h4><table class="kbT">' + ATALHOS.filter(a => a.g === g).map(a => '<tr><td style="width:46%"><kbd>' + MOD + ' + ' + a.k + '</kbd></td><td>' + a.d + '</td></tr>').join('') + '</table></div>'; });
    h += '<div class="kbG"><h4>Editor de Markdown (com o cursor no editor)</h4><table class="kbT">' + EDITOR.map(a => '<tr><td style="width:46%"><kbd>' + a[0] + '</kbd></td><td>' + a[1] + '</td></tr>').join('') + '</table></div><div class="kbG"><h4>Geral</h4><table class="kbT"><tr><td style="width:46%"><kbd>F1</kbd></td><td>Ajuda (com busca)</td></tr><tr><td><kbd>Esc</kbd></td><td>Fechar janela / encerrar tutorial</td></tr><tr><td><kbd>← / →</kbd></td><td>Navegar no tutorial</td></tr></table></div>';
    janela('Atalhos de teclado', h, back => {
      const f = back.querySelector('#kbF'); f.focus();
      f.oninput = () => { const q = f.value.toLowerCase().trim(); back.querySelectorAll('.kbG').forEach(gr => { let n = 0; gr.querySelectorAll('tr').forEach(tr => { const v = !q || tr.textContent.toLowerCase().includes(q); tr.hidden = !v; n += v; }); gr.hidden = !n; }); };
    });
  }

  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (passo >= 0) { fim(); e.preventDefault(); return; } if ($('mdBack')) { fechar(); e.preventDefault(); return; } }
    if (passo >= 0 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.target.closest('textarea,input')) { e.preventDefault(); const n = passo + (e.key === 'ArrowRight' ? 1 : -1); if (n >= 0 && n < PASSOS.length) mostrar(n); return; }
    if (e.key === 'F1' && !e.ctrlKey && !e.altKey) { e.preventDefault(); ajuda(); return; }
    if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
    const k = (e.code.startsWith('Key') ? e.code.slice(3) : e.code.startsWith('Digit') ? e.code.slice(5) : '').toUpperCase();
    const a = ATALHOS.find(x => x.k === k); if (!a) return;
    e.preventDefault(); e.stopPropagation(); fechar(); a.f();
  }, true);

  /* ---------------------------- Botões e primeira visita ---------------------------- */
  $('btnTour').onclick = iniciar; $('btnHelp').onclick = () => ajuda(); $('btnKeys').onclick = atalhos;
  if (!localStorage.getItem('conteudista.tour') && !location.hash.startsWith('#cx=')) setTimeout(iniciar, 700);
  window.Conteudista = Object.assign(window.Conteudista || {}, { tutorial: iniciar, reiniciar, ajuda, atalhos });
})();
