/* =====================================================================================
   Conteudista — Tutorial guiado, Ajuda e Atalhos de teclado
   - Tutorial: abre na primeira visita (ou pelo botão); destaca cada área da própria tela
   - Ajuda: janela com instruções resumidas
   - Atalhos: Alt+Shift+<letra> (não colidem com o editor nem com os navegadores comuns)
   ===================================================================================== */
(function () {
  'use strict';
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
.kb-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2100;background:#0c326f;color:#fff;padding:8px 14px;border-radius:8px;font:13.5px "Segoe UI",Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transition:opacity .2s;pointer-events:none}
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
    { alvo: 'abasApp', antes: () => abrirAba('g'), t: '1. Escreva ou cole o texto', d: 'Use as abas <b>Apresentação</b> e <b>Apostila</b>. Cole o texto gerado por uma IA (use o prompt curto de Criar conteúdo), arraste um arquivo <code>.md</code> ou escreva no editor. A prévia aparece ao lado.' },
    { alvo: () => document.querySelector('#pg .mde-tb'), t: '2. Formate com a barra de ferramentas', d: 'Títulos, listas, checklists, links, <b>imagens</b> (viram base64 automaticamente), tabelas e fluxos. Dica: <kbd>Ctrl+B</kbd> negrito, <kbd>Ctrl+K</kbd> link. No fim da barra ficam o ícone <b>Compartilhar link</b> e o botão <b>Versões</b>, que guarda, compara, restaura e <b>importa um link</b> para comparar.' },
    { alvo: () => document.querySelector('#pg .la-btn'), antes: () => abrirAba('g'), t: '3. Confira a acessibilidade', d: 'O botão <b>Acessibilidade</b> encontra barreiras no texto. Corrija os itens <b>para corrigir</b> e revise as <b>sugestões</b>. Clique num trecho sublinhado para ver a correção (<kbd>' + MOD + ' + C</kbd> abre o painel). A conferência automática não substitui a revisão dos arquivos finais.' },
    { alvo: 'licenca', t: '4. Gere os arquivos', d: 'O licenciamento é opcional e começa em <b>Sem licenciamento</b>. Se tiver autorização, escolha uma licença Creative Commons; o aviso aparece no final da apostila e em um slide final da apresentação. Depois, clique em <b>Gerar arquivos</b> para criar os documentos e o ZIP.' },
    { alvo: 'secRes', t: '5. Leia como preferir', d: 'Após gerar, use <b>Exibir apostila</b> ou <b>Exibir apresentação</b>. No HTML, <b>Acessibilidade</b> ajusta a leitura, sem alterar o texto-fonte. Na apresentação, <b>Mais opções › Modo leitura</b> (<kbd>L</kbd>) mostra os slides em sequência, com as notas. Pressione <kbd>L</kbd> novamente para voltar aos slides. Para PDF, use <b>Imprimir / PDF</b>.' },
    { alvo: 'btnSalvar', t: '6. Guarde neste computador', d: 'O botão <b>Salvar ▾</b>, ao lado de <b>Gerar arquivos</b>, reúne <b>Guardar no navegador</b> (versão), <b>Baixar tudo (.zip)</b>, <b>Salvar na pasta</b> e <b>Baixar .md</b>. O <b>salvamento automático</b> recupera o último trabalho ao reabrir a página.' },
    { alvo: 'btnCompartilharAcao', t: '7. Guarde em um link', d: 'O botão <b>Compartilhar link</b> leva o texto-fonte, com as imagens, para um endereço que abre em qualquer computador. Ele também está ao lado de <b>Importar</b> e na barra do editor; os três abrem a mesma janela (<kbd>' + MOD + ' + L</kbd>).' },
    { alvo: 'btnImportar', t: '8. Recupere um conteúdo', d: 'Em <b>Importar</b>, abra suas <b>versões salvas</b> e links, envie arquivos do computador (<code>.md</code>, <code>.zip</code>, imagens) ou cole um <b>link do conteúdo</b>. Use o campo <b>Buscar</b> para achar um item pelo nome, data, layout ou tipo de arquivo. O texto atual vai para <b>Versões</b> antes de ser substituído.' },
    { alvo: 'abasApp', t: '9. Revise a narração slide a slide', d: 'Na aba <b>Narração › Notas dos slides</b>, <b>Importar notas</b> traz a nota de cada slide para um rascunho. Edite, ouça e clique em <b>Aplicar à apresentação</b>. Os botões <b>Versões</b> e <b>Compartilhar link</b> da própria aba comparam as notas e as levam para outro computador.' },
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
<p>O Conteudista transforma dois textos em Markdown — a <b>apostila</b> e a <b>apresentação</b> — em um <b>conteúdo</b> completo: apostila (HTML, DOCX, EPUB, MD) e apresentação (HTML, PPTX, MD), com narração opcional. A conversão roda <b>no seu navegador</b>; o site não guarda nenhum conteúdo.</p>
<h4>Termos usados</h4>
<table><tr><th>Termo</th><th>O que é</th></tr>
<tr><td><b>Conteúdo</b></td><td>O material que você produz: apostila e apresentação, com um <b>nome</b>, um <b>layout</b>, um <b>rodapé</b> e um <b>licenciamento opcional</b>.</td></tr>
<tr><td><b>Apostila</b></td><td>O documento de estudo, em HTML, DOCX, EPUB (duas versões) e MD.</td></tr>
<tr><td><b>Apresentação</b></td><td>Os slides, em HTML, PPTX e MD, com narração opcional.</td></tr>
<tr><td><b>Narração</b></td><td>Áudio gerado a partir de um texto (aba <b>Narração</b>).</td></tr>
<tr><td><b>Arquivos</b></td><td>O conteúdo <b>pronto</b>, para entregar (.DOCX, .PPTX, .HTML, .EPUB, .ZIP).</td></tr>
<tr><td><b>Texto-fonte</b></td><td>Os textos em Markdown e as imagens, para continuar editando.</td></tr>
<tr><td><b>Link</b></td><td>O texto-fonte em um endereço, para guardar ou enviar.</td></tr>
<tr><td><b>Versão</b></td><td>Uma cópia do texto-fonte guardada neste navegador.</td></tr>
<tr><td><b>Histórico</b></td><td>A lista dos arquivos já gerados, neste navegador.</td></tr></table>
<h4>Gerar um conteúdo em 3 passos</h4>
<ol>
<li>Na aba <b>Apostila</b>, cole ou arraste o texto da apostila (<code>.md</code>); na aba <b>Apresentação</b>, o dos slides.</li>
<li>Informe o <b>Nome dos arquivos</b> (preenchido pelo título do conteúdo, em minúsculas e com hífens, como <code>Apostila_meu-titulo.docx</code>), escolha o <b>Layout (tema)</b> e, se aplicável, o <b>Licenciamento</b>. Os temas ANAC 20 anos mudam só a apresentação; a apostila segue o padrão gov.br. O <b>rodapé</b> (opcional) aparece nos slides e no DOCX.</li>
<li>Para um visual próprio, escolha <b>Gerenciar temas</b> no Layout: crie um tema a partir de outro, troque cores e fontes e confira na prévia o <b>contraste WCAG</b> e o <b>daltonismo</b> (simulação da visão, aviso de cores que se confundem e relatório para baixar). Com uma imagem de fundo escolhida, <b>Baixar versões para revisão</b> gera a imagem simulada nos quatro tipos de daltonismo. Nos arquivos gerados, os destaques de dica, atenção e nota começam com <b>+</b>, <b>!</b> ou <b>i</b>, para não dependerem só da cor.</li>
<li>Clique em <b>Gerar arquivos</b> e baixe cada arquivo ou o <b>ZIP</b>. Os pacotes anteriores ficam no botão <b>Histórico</b>, no cabeçalho da seção <b>Arquivos gerados</b>, onde é possível <b>buscar</b>. Ao usar <b>Exibir</b> no Histórico, o pacote escolhido aparece na seção com os seus arquivos e o ZIP <b>acima da exibição</b>, para você baixar a versão que está vendo. A seção <b>Arquivos gerados</b> abre sozinha ao gerar e pode ser recolhida, como as demais, pelo controle <b>recolher</b> à direita do título; o botão <b>Histórico</b> continua à mão com ela recolhida. Se só um dos dois textos estiver preenchido, são gerados apenas os arquivos dele. A apostila tem dois EPUB: <b>.EPUB</b> (Atkinson Hyperlegible Next) e <b>.EPUB OpenDyslexic</b>.</li>
</ol>
<h4>Licenciamento</h4>
<p>O padrão é <b>Sem licenciamento</b>. Se tiver autorização para licenciar o material, escolha uma opção Creative Commons: <b>BY</b> exige atribuição, <b>SA</b> exige compartilhar adaptações nos mesmos termos, <b>NC</b> restringe uso comercial e <b>ND</b> não permite compartilhar adaptações. <b>CC0</b> dedica o conteúdo ao domínio público. O aviso aparece ao final da Apostila e em um slide próprio ao final da Apresentação, com link para os termos oficiais. Confira os créditos e os direitos de imagens, marcas e materiais de terceiros antes de escolher.</p>
<div class="dica">Na primeira geração o navegador carrega o motor Python (20 a 60 s). Depois é imediato.</div>
<h4>Conteúdo de exemplo</h4>
<p>O botão <b>Carregar exemplo</b> traz um <b>guia de uso do próprio Conteudista</b>, que serve de aula e de modelo para o seu conteúdo:</p>
<ul>
<li>uma <b>apostila</b> de 16 seções, do <b>Início rápido</b> ao prompt para IA, com 5 fluxos Mermaid, figuras, vídeos, checklists, exercícios com gabarito e referências;</li>
<li>uma <b>apresentação</b> de 39 slides, um assunto por slide, com <b>notas para narração</b> (cerca de 17 minutos de áudio);</li>
<li>o <b>prompt curto para IA</b>, que aponta para dois documentos no GitHub (referência de conteúdo e de acessibilidade), na seção 11.3 da apostila;</li>
<li>as seções <b>5.6 Acessibilidade do texto</b> e <b>10.6 Escrever conteúdo acessível</b>, e 5 slides sobre o assunto.</li>
  <li><b>Editor progressivo (SPEC)</b>: estado E0 - compositor simplificado aparecendo quando o editor está vazio, com campo de texto arredondado, placeholder "Escreva ou cole o conteúdo em Markdown...", botão + para importação, microfone para ditado nativo e seta "Continuar editando" que aparece ao digitar. Estados E1 (com conteúdo) e E2 (importado/restaurado) mostram a barra de edição completa. Estado E3 retorna ao E0 quando o conteúdo é apagado. A narração permanece vinculada às notas dos slides da Apresentação. O Enter insere nova linha no Markdown e não serve de envio.</ul>
<p>Para criar o seu conteúdo, substitua os textos e mantenha a estrutura. Para gerar a aula narrada, marque <b>Narração dos slides</b> na aba <b>Apresentação</b> antes de <b>Gerar arquivos</b>. Para ouvir apenas as notas, importe-as na aba <b>Narração</b>.</p>
<h4>Produzir os textos com uma IA</h4>
<ul>
<li>O <b>prompt curto</b> está em <b>Criar conteúdo</b> (botão <b>Copiar prompt</b>) e na seção <b>11.3</b> da apostila de exemplo. Cole-o em uma IA autorizada pela instituição.</li>
<li>Troque só os três campos entre colchetes (tema, público-alvo e objetivos de aprendizagem) e, se a IA permitir, anexe documentos ou cole textos e links de referência. A sintaxe, a divisão dos slides, as notas de narração e as regras de acessibilidade ficam em dois documentos no GitHub, que a IA lê pelo endereço do prompt. Se ela não conseguir abrir o endereço, cole o texto dos documentos.</li>
<li>Escolha a entrega: <b>A</b>, dois blocos de texto, que você cola em <b>Importar › Colar</b>, nas subabas <b>Apostila</b> e <b>Apresentação</b>; ou <b>B</b>, um arquivo <b>ZIP</b> com os dois textos e a pasta <code>imagens/</code>, que você importa em <b>Importar › Computador</b>.</li>
<li>Revise tudo antes de gerar os arquivos, em especial os trechos marcados com <code>[A confirmar]</code>. Não envie dados pessoais nem informações restritas.</li>
