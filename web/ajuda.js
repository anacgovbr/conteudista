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
.tr-pop button{margin:0!important;padding:6px 12px!important;font-size:13px!important}
.md-back{position:fixed;inset:0;z-index:1900;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.md-win{background:#fff;color:#333333;border-radius:12px;max-width:820px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.35);font:14.5px/1.55 "Segoe UI",Roboto,Arial,sans-serif}
.md-hd{display:flex;align-items:center;padding:12px 18px;border-bottom:1px solid #cccccc}.md-hd h3{margin:0;flex:1;color:#0c326f;font-size:17px}
.md-hd button{margin:0!important;padding:4px 10px!important}
.md-bd{overflow:auto;padding:14px 20px}
.md-bd h4{color:#0c326f;margin:16px 0 6px;font-size:15px}.md-bd h4:first-child{margin-top:0}
.md-bd table{border-collapse:collapse;width:100%;font-size:13.5px}.md-bd th,.md-bd td{border:1px solid #cccccc;padding:6px 8px;text-align:left;vertical-align:top}.md-bd th{background:#dbe8fb;color:#0c326f}
.md-bd kbd{display:inline-block;background:#f8f8f8;border:1px solid #cccccc;border-bottom-width:2px;border-radius:5px;padding:0 6px;font:12.5px Consolas,monospace;white-space:nowrap}
.md-bd ol,.md-bd ul{padding-left:22px;margin:4px 0}.md-bd li{margin:3px 0}
.md-bd .dica{background:#e3f5e1;border-left:4px solid #168821;padding:8px 12px;border-radius:0 6px 6px 0;margin:8px 0}
.md-bd input[type=search]{width:100%;padding:8px;border:1px solid #cccccc;border-radius:6px;margin-bottom:10px;font:inherit}
.md-bd mark{background:#ffe08a;color:inherit;padding:0 1px;border-radius:2px}
.md-bd .hs[hidden]{display:none}.md-bd .hz{color:#636363;font-style:italic;margin:8px 0}
.md-tools{display:flex;gap:8px;align-items:center;margin-bottom:10px}.md-tools input{flex:1;margin:0!important}.md-tools button{margin:0!important;padding:7px 12px!important;white-space:nowrap}
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
  function clicar(id, msg) { const b = $(id); if (!b) return; b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.click(); if (msg) toast(msg); }

  /* ---------------------------- Tutorial guiado ---------------------------- */
  const PASSOS = [
    { alvo: null, t: 'Bem-vindo ao Conteudista', d: 'Em 6 passos rápidos você verá como <b>escrever</b>, <b>gerar</b>, <b>salvar</b> e <b>recuperar</b> um curso. Tudo acontece no seu navegador; nada é enviado sem você pedir.' },
    { alvo: 'abas', antes: () => abrirAba('g'), t: '1. Escreva ou cole o conteúdo', d: 'Use as abas <b>Guia</b> e <b>Apresentação</b>. Cole o texto gerado pelo agente de IA, arraste um arquivo <code>.md</code> ou escreva no editor. A prévia aparece ao lado.' },
    { alvo: () => document.querySelector('#pg .mde-tb'), t: '2. Formate com a barra de ferramentas', d: 'Títulos, listas, checklists, links, <b>imagens</b> (viram base64 automaticamente), tabelas e fluxos. Dica: <kbd>Ctrl+B</kbd> negrito, <kbd>Ctrl+K</kbd> link.' },
    { alvo: 'go', t: '3. Gere os arquivos', d: 'Clique em <b>Gerar arquivos</b>. Você recebe guia (HTML, DOCX, MD), apresentação (HTML, PPTX, MD) e um ZIP com tudo. Para testar agora, use <b>Carregar exemplo</b> ao lado.' },
    { alvo: 'pLocal', t: '4. Seu trabalho é salvo sozinho', d: 'O <b>salvamento automático</b> já vem ligado: ao voltar à página, o último conteúdo é recuperado. Você também pode criar rascunhos com nome, salvar em uma pasta ou baixar os <code>.md</code>.' },
    { alvo: 'pLink', t: '5. Compartilhe com segurança (opcional)', d: 'Gere um <b>link criptografado</b> (autocontido ou PrivateBin), com senha se quiser. O tamanho aparece antes do envio.' },
    { alvo: 'pOpen', t: '6. Recupere de um link', d: 'Cole aqui um link recebido (e a senha, se houver) e clique em <b>Abrir link</b>: o conteúdo volta para os editores.' },
    { alvo: () => document.querySelector('header .hb'), t: 'Pronto!', d: 'Reveja o tutorial (<kbd>' + MOD + ' + T</kbd>), a <b>Ajuda</b> (<kbd>F1</kbd>, com busca) e os <b>Atalhos</b> (<kbd>' + MOD + ' + K</kbd>) por estes botões a qualquer momento. O botão <b>↺</b> recomeça o tutorial.' }
  ];
  let passo = -1, hole = null, pop = null;
  function alvoEl(p) { const a = typeof p.alvo === 'function' ? p.alvo() : p.alvo ? $(p.alvo) : null; return a && a.getClientRects().length ? a : null; }
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
<p>O Conteudista transforma dois arquivos Markdown — <b>guia</b> e <b>apresentação</b> — em um curso completo: <b>guia</b> (HTML, DOCX, MD) e <b>apresentação</b> (HTML, PPTX, MD). A conversão roda <b>no seu navegador</b>; o site não guarda nenhum curso.</p>
<h4>Gerar um curso em 3 passos</h4>
<ol>
<li>Na aba <b>Guia</b>, cole ou arraste o <code>guia.md</code>; na aba <b>Apresentação</b>, o <code>apresentacao.md</code>.</li>
<li>Preencha o <b>prefixo</b> (nome dos arquivos) e o <b>rodapé</b> e escolha o <b>Layout dos arquivos gerados</b>: <b>Padrão gov.br</b> (padrão: cores, fonte e destaques do Design System do Governo Federal) ou <b>Clássico</b> (layout original).</li>
<li>Clique em <b>Gerar arquivos</b> e baixe cada arquivo ou o <b>ZIP</b>.</li>
</ol>
<div class="dica">Na primeira geração o navegador carrega o motor Python (20 a 60 s). Depois é imediato.</div>
<h4>Editor</h4>
<ul>
<li>Modos <b>Editar</b>, <b>Dividido</b> (editor + prévia) e <b>Prévia</b>; tela cheia pelo último botão da barra.</li>
<li><b>Desfazer/refazer</b>: <kbd>Ctrl+Z</kbd> e <kbd>Ctrl+Y</kbd> (ou <kbd>Ctrl+Shift+Z</kbd>), ou os dois primeiros botões da barra. Funciona também para ações dos botões, arquivos arrastados e rascunhos abertos (até 300 passos por editor).</li>
<li>Outros atalhos do editor: <kbd>Ctrl+B</kbd> negrito, <kbd>Ctrl+I</kbd> itálico, <kbd>Ctrl+E</kbd> código, <kbd>Ctrl+K</kbd> link, <kbd>Ctrl+Shift+1/2/3</kbd> títulos, <kbd>Ctrl+Shift+7/8/9</kbd> listas, <kbd>Alt+↑/↓</kbd> mover linha. Lista completa no botão <b>Atalhos</b>.</li>
<li><b>Imagens</b>: arraste para o editor (entram onde o cursor estiver), cole com <kbd>Ctrl+V</kbd> (print de tela ou imagem copiada) ou use o botão de imagem. Ficam em base64 dentro do texto e aparecem no editor como <code>(img:N)</code>.</li>
<li><b>Imagens do texto</b> (painel abaixo do editor): miniaturas na ordem em que aparecem no texto, com dimensões, peso, descrição editável e botões <b>Inserir</b>, <b>Localizar</b> e <b>Remover</b>.</li>
<li><b>Ordenar imagens</b>: arraste os cartões ou use <b>◀ ▶</b>; as imagens trocam de posição no texto (cada uma leva sua legenda). O menu <b>Ordenar…</b> inverte a ordem ou ordena por legenda, peso ou largura.</li>
<li><b>Editar imagem</b> (botão <b>Editar</b> no cartão): <b>Cortar</b> (arraste na imagem, ajuste pelas alças, proporções 1:1, 4:3, 16:9 etc. ou valores em px), <b>Girar</b> (90°, 180°, espelhar, ajuste fino de −45° a +45°) e <b>Tamanho e formato</b> (largura, 25/50/75%, limites, JPEG/PNG/WebP, qualidade). A prévia mostra o resultado e o novo peso antes de aplicar.</li>
<li><b>Editar várias</b>: marque a caixa no canto dos cartões (ou <b>Selecionar todas</b>) e clique em <b>Editar selecionadas</b> para girar, espelhar, cortar centralizado numa proporção, limitar a largura e converter o formato de uma vez. <b>Reduzir todas…</b> só diminui as grandes. Tudo pode ser desfeito com <kbd>Ctrl+Z</kbd>.</li>
<li>Se o texto já cita uma imagem pelo nome (ex.: <code>![Figura](fluxo.png)</code>), arraste o arquivo <code>fluxo.png</code>: ele é associado à referência e convertido para base64.</li>
<li>Na apresentação, cada slide é separado por uma linha <code>---</code>. Use os botões <b>Slide</b>, <b>Capa</b>, <b>Destaque</b> e <b>Notas</b>.</li>
</ul>
<h4>Salvar e recuperar</h4>
<table><tr><th>Como</th><th>Onde fica</th><th>Como recuperar</th></tr>
<tr><td><b>Salvamento automático</b> (ligado por padrão)</td><td>Neste navegador, neste computador</td><td>Abra a página de novo: o último trabalho volta sozinho</td></tr>
<tr><td><b>Salvar rascunho</b> (com nome)</td><td>Neste navegador</td><td>Lista de rascunhos → <b>Abrir</b></td></tr>
<tr><td><b>Salvar em pasta…</b> / <b>Baixar .md</b></td><td>No seu disco</td><td>Arraste os <code>.md</code> de volta para as abas</td></tr>
<tr><td><b>Link criptografado</b></td><td>No próprio link ou no PrivateBin (cifrado)</td><td>Painel <b>Abrir um link</b> → cole o link (e a senha)</td></tr>
<tr><td><b>Histórico de versões</b></td><td>Neste navegador</td><td>Botão <b>Histórico</b> na barra do editor → escolha a versão → <b>Restaurar</b></td></tr></table>
<div class="dica">Limpar os dados do navegador apaga os rascunhos locais. Para guardar por mais tempo, use <b>Salvar em pasta</b> ou <b>Baixar .md</b>.</div>
<h4>Histórico e comparação (antes e depois)</h4>
<ul>
<li>O histórico guarda versões <b>somente neste navegador</b>: edições da sessão (a cada 3 min de edição), <b>arquivos carregados</b>, conteúdos <b>abertos de links</b>, rascunhos, exemplo, versões <b>marcadas</b> (★) e os momentos de gerar ou compartilhar. Antes de carregar ou restaurar algo, o conteúdo atual também é guardado.</li>
<li>Abra pelo botão <b>Histórico</b> na barra do editor (ao lado da tela cheia) ou <kbd>Alt+Shift+V</kbd>. A janela de comparação aparece sobre a página; feche com <b>Fechar</b> ou <kbd>Esc</kbd>.</li>
<li>Escolha a <b>Versão A</b> (antes) e a <b>Versão B</b> (depois) — de qualquer sessão, arquivo ou link, ou “Atual” — e clique em <b>Comparar</b>. Use ⇄ para inverter.</li>
<li>Leitura do resultado: linhas <span style="background:#fde0db">removidas</span> e <span style="background:#e8f5ec">incluídas</span>, com as palavras alteradas destacadas; imagens aparecem como miniaturas e as que mudaram são listadas em “Antes” e “Depois”.</li>
<li>Opções: Guia, Apresentação ou ambos; lado a lado ou unificado; só alterações (com contexto) ou texto completo. Trechos iguais recolhidos abrem com um clique.</li>
<li><b>Restaurar A/B</b> coloca a versão nos editores; <b>Baixar A e B</b> salva os .md; <b>★ Marcar versão atual</b> cria um ponto nomeado (não é apagado automaticamente). O limite é de 120 versões.</li>
</ul>
<h4>Compartilhar</h4>
<ul>
<li><b>Link autocontido</b>: o conteúdo vai cifrado dentro do link; não usa servidor. Links muito longos podem ser cortados por e-mail/Teams.</li>
<li><b>PrivateBin</b>: o conteúdo é cifrado no navegador e enviado ao serviço; escolha a expiração, leitura única e senha. As imagens podem ir como <b>anexo ZIP</b>.</li>
<li>O <b>tamanho</b> aparece antes do envio. O privatebin.net aceita cerca de 10 MB.</li>
<li>Com senha, envie a senha por <b>outro canal</b>.</li>
</ul>
<h4>Problemas comuns</h4>
<table><tr><th>Sintoma</th><th>O que fazer</th></tr>
<tr><td>“Falha ao carregar … cdn.jsdelivr.net”</td><td>A rede bloqueou o motor Python. Tente outra rede ou peça liberação do endereço.</td></tr>
<tr><td>“CORS ou rede bloqueada” no PrivateBin</td><td>Use o <b>link autocontido</b> ou outra instância do PrivateBin.</td></tr>
<tr><td>Imagens “pendentes”</td><td>Arraste os arquivos de imagem citados no texto (com o mesmo nome) para a área da aba ou para o editor.</td></tr>
<tr><td>Imagem não aparece</td><td>Confira o painel <b>Imagens do texto</b>; use <b>Localizar</b>. Arquivos muito grandes deixam o curso pesado — use <b>Redimensionar</b> ou <b>Reduzir todas…</b> (até ~1 MB por imagem).</td></tr>
<tr><td>Sumário vazio no DOCX</td><td>No Word, clique com o botão direito no sumário → <b>Atualizar campo</b>.</td></tr>
<tr><td>Fluxos Mermaid no DOCX/PPTX</td><td>Aparecem como tabela “De | Condição | Para” (desenho só no HTML).</td></tr></table>
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
    { g: 'Arquivos', k: 'P', d: 'Salvar em pasta…', f: () => clicar('fsave') },
    { g: 'Salvar e recuperar', k: 'S', d: 'Salvar rascunho', f: () => clicar('dsave') },
    { g: 'Salvar e recuperar', k: 'A', d: 'Ligar/desligar salvamento automático', f: () => { const c = $('auto'); c.checked = !c.checked; c.dispatchEvent(new Event('change')); toast('Salvamento automático ' + (c.checked ? 'ligado' : 'desligado')); } },
    { g: 'Salvar e recuperar', k: 'L', d: 'Criar link criptografado', f: () => clicar('share') },
    { g: 'Salvar e recuperar', k: 'O', d: 'Ir para “Abrir um link”', f: () => { const i = $('olink'); i.scrollIntoView({ block: 'center', behavior: 'smooth' }); i.focus(); } },
    { g: 'Navegação', k: '1', d: 'Aba Guia (foca o editor)', f: () => focarEditor('g') },
    { g: 'Navegação', k: '2', d: 'Aba Apresentação (foca o editor)', f: () => focarEditor('s') },
    { g: 'Navegação', k: 'M', d: 'Alternar modo do editor (Editar → Dividido → Prévia)', f: () => { const vis = document.querySelector('#pg:not([hidden]) .mde, #ps:not([hidden]) .mde'); if (!vis) return; const ordem = ['e', 's', 'p'], i = (ordem.indexOf(vis.dataset.m) + 1) % 3; const b = vis.querySelector('.mde-tb [data-m="' + ordem[i] + '"]'); if (b) b.click(); toast(['Somente editor', 'Editor + prévia', 'Somente prévia'][i]); } },
    { g: 'Navegação', k: 'V', d: 'Histórico e comparação (antes e depois)', f: () => window.Hist && Hist.abrir() },
    { g: 'Salvar e recuperar', k: 'B', d: 'Marcar a versão atual no histórico', f: () => clicar('hMarca') },
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
