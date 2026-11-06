/* =====================================================================================
   Conteudista — Acessibilidade do texto: janelas de apoio a quem escreve (1.82)
   - Descrever imagem: miniatura, descrição curta (até 150 caracteres) e detalhada (opcional, vira
     texto logo abaixo da imagem), dicas e "É decorativa".
   - Simplificar trecho: Antes / Depois, com contagem de palavras e frases.
   - Explicar sigla: nome completo e prévia de como fica ("Nome completo (SIGLA)").
   - Descrever e Simplificar têm a aba "Pedir ajuda a uma IA": copiar o pedido padronizado (versão
     1.0, da biblioteca), copiar ou baixar a imagem, colar a resposta e conferir antes de aplicar.
     A IA fica fora do Conteudista: nada é enviado sem a pessoa copiar e colar.
   - Padrão gov.br: janela modal (Modal) com abas (Tab), botões primário e secundário, mensagens
     (Message); foco preso na janela, Esc fecha e o foco volta para onde estava. No celular, tela cheia.
   - Abertas pelas correções do painel e do balão (acessibilidade.js) ou por
     JanelasAcessibilidade.abrir(acao, { k, d, c }).
   - Opção: acessibilidade_texto.ajuda_ia (desligado: sem a aba de IA).
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = () => window.AcessibilidadeTexto;
  const IA = () => window.Opcoes ? Opcoes.ligado('acessibilidade_texto.ajuda_ia') : true;
  const LIMITE_CURTA = 150;
  const anunciar = m => { try { if (window.UXFeedback && UXFeedback.anunciar) UXFeedback.anunciar(m); } catch (e) { /* */ } };
  const confirmar = (b, m) => { try { if (window.UXFeedback && UXFeedback.confirmar) UXFeedback.confirmar(b, m); else anunciar(m); } catch (e) { anunciar(m); } };
  let LIB = null;
  const lib = () => (LIB = LIB || import('./lib/linguagem-acessivel/index.js'));

  const css = document.createElement('style'); css.id = 'lj-css';
  css.textContent = `
.lj-fundo{position:fixed;inset:0;z-index:1700;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.lj-jan{display:flex;flex-direction:column;width:min(880px,100%);max-height:calc(100vh - 32px);background:#fff;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:15px/1.5 "Segoe UI",Roboto,Arial,sans-serif;color:#333333}
.lj-cab{display:flex;align-items:flex-start;gap:12px;padding:18px 24px 6px}
.lj-cab h2{flex:1;margin:0;font-size:20px;color:#0c326f;outline:none}
.lj-cab h2:focus-visible{outline:3px dashed #c2850c;outline-offset:3px}
.lj-sub{margin:0;padding:0 24px 10px;color:#636363;font-size:13px}
.lj-corpo{flex:1;overflow:auto;padding:4px 24px 12px}
.lj-rod{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:12px 24px;border-top:1px solid #cccccc}
.lj-rod button{margin:0!important}
.lj-abas{display:flex;gap:0;border-bottom:1px solid #cccccc;margin:4px 0 14px}
.lj-abas [role=tab]{all:unset;cursor:pointer;padding:10px 16px;min-height:24px;font-weight:600;color:#636363;border-bottom:4px solid transparent;margin-bottom:-1px}
.lj-abas [role=tab][aria-selected=true]{color:#1351b4;border-bottom-color:#1351b4}
.lj-abas [role=tab]:hover{color:#1351b4;background:#edf5ff}
.lj-abas [role=tab]:focus-visible{outline:3px dashed #c2850c;outline-offset:-3px}
.lj-grade{display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start}
.lj-mini{display:flex;flex-direction:column;gap:6px}
.lj-mini .lj-img{display:flex;align-items:center;justify-content:center;min-height:150px;max-height:220px;padding:6px;background:#f8f8f8;border:1px solid #cccccc;border-radius:4px;overflow:hidden}
.lj-mini img{max-width:100%;max-height:206px;object-fit:contain}
.lj-mini small{color:#636363;font-size:12.5px;word-break:break-all}
.lj-campo{margin:0 0 14px}
.lj-campo label,.lj-rot{display:flex;justify-content:space-between;gap:8px;font-weight:600;margin:0 0 4px}
.lj-campo label small,.lj-rot small{font-weight:400;color:#636363}
.lj-campo textarea,.lj-campo input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #888888;border-radius:4px;font:inherit;color:#333333;background:#fff}
.lj-campo textarea{height:auto!important;min-height:66px;max-height:40vh;resize:vertical;font:15px/1.5 "Segoe UI",Roboto,Arial,sans-serif!important}
.lj-msg>svg{flex:0 0 22px;width:22px;height:22px}
.lj-campo textarea:focus,.lj-campo input:focus{outline:3px dashed #c2850c;outline-offset:1px;border-color:#1351b4}
.lj-campo [aria-invalid=true]{border-color:#b00020;border-width:2px}
.lj-cont{font-size:12.5px;color:#636363}.lj-cont.mais{color:#b00020;font-weight:700}
.lj-erro{margin:4px 0 0;color:#b00020;font-size:13.5px;font-weight:600}
.lj-dicas{margin:0 0 14px;padding:10px 14px;background:#edf5ff;border-radius:4px;color:#0c326f}
.lj-dicas b{display:block;margin-bottom:4px}.lj-dicas ul{margin:0;padding-left:20px}.lj-dicas li{margin:2px 0}
.lj-msg{display:flex;gap:10px;margin:0 0 14px;padding:10px 14px;border-radius:4px;border-left:6px solid}
.lj-msg.aten{background:#fff5c2;border-color:#c2850c;color:#5c4400}
.lj-msg.info{background:#edf5ff;border-color:#1351b4;color:#0c326f}
.lj-msg.ok{background:#e6f4ea;border-color:#168821;color:#0f5e17}
.lj-msg p{margin:0}
.lj-passo{display:flex;gap:12px;margin:0 0 14px}
.lj-num{flex:0 0 28px;height:28px;border-radius:50%;background:#1351b4;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center}
.lj-passo > div{flex:1;min-width:0}
.lj-passo h3{margin:3px 0 6px;font-size:15px}
.lj-botoes{display:flex;flex-wrap:wrap;gap:6px}.lj-botoes button,.lj-botoes a{margin:0!important}
.lj-pedido{margin:8px 0 0;max-height:220px;overflow:auto;padding:10px;background:#f8f8f8;border:1px solid #cccccc;border-radius:4px;font:12.5px/1.45 Consolas,"Cascadia Mono",monospace;white-space:pre-wrap}
.lj-pedido[hidden]{display:none}
.lj-comp{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.lj-antes{min-height:140px;max-height:300px;overflow:auto;padding:8px 10px;background:#f8f8f8;border:1px solid #cccccc;border-radius:4px;white-space:pre-wrap}
.lj-comp textarea{min-height:140px!important}
.lj-ok{color:#168821;font-weight:700}
.lj-previa{padding:10px 14px;background:#f8f8f8;border:1px solid #cccccc;border-radius:4px}
.lj-previa mark{background:#dbe8fb;color:#0c326f;padding:0 2px}
.lj-a11y{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:700px){
.lj-fundo{padding:0;align-items:stretch}
.lj-jan{max-height:none;height:100%;border-radius:0}
.lj-cab,.lj-sub,.lj-corpo,.lj-rod{padding-left:16px;padding-right:16px}
.lj-grade,.lj-comp{grid-template-columns:1fr}
.lj-mini .lj-img{min-height:100px;max-height:160px}
.lj-rod button,.lj-botoes button,.lj-botoes a{--btn-h:44px}
}
html.contraste .lj-jan{background:#000;color:#fff}html.contraste .lj-cab h2{color:#fff}
html.contraste .lj-campo textarea,html.contraste .lj-campo input,html.contraste .lj-antes,html.contraste .lj-pedido,html.contraste .lj-previa{background:#000;color:#fff;border-color:#fff}
@media print{.lj-fundo{display:none!important}}
`;
  document.head.appendChild(css);

  /* ---------------------------- Janela (Modal do gov.br) ---------------------------- */
  let atual = null;
  function janela({ titulo, sub, corpo, primario, aoAplicar }) {
    fechar(false);
    const volta = document.activeElement;
    const fundo = document.createElement('div'); fundo.className = 'lj-fundo';
    fundo.innerHTML = '<div class="lj-jan" role="dialog" aria-modal="true" aria-labelledby="ljT" aria-describedby="ljS">' +
      '<div class="lj-cab"><h2 id="ljT" tabindex="-1">' + esc(titulo) + '</h2><button type="button" class="sec mini" data-x title="Fechar sem aplicar (Esc)">Fechar <span aria-hidden="true">\u2715</span></button></div>' +
      '<p class="lj-sub" id="ljS">' + esc(sub) + '</p><div class="lj-corpo">' + corpo + '</div>' +
      '<div class="lj-rod"><button type="button" class="sec" data-x>Cancelar</button><button type="button" data-ok>' + esc(primario) + '</button></div>' +
      '<p class="lj-a11y" role="status" aria-live="polite" id="ljVivo"></p></div>';
    document.body.append(fundo); document.body.style.overflow = 'hidden';
    const jan = fundo.querySelector('.lj-jan');
    atual = { fundo, jan, volta };
    fundo.addEventListener('mousedown', e => { if (e.target === fundo) fechar(true); });
    fundo.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-x')) fechar(true); else if (b.hasAttribute('data-ok')) aoAplicar(b); });
    jan.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(true); return; }
      if (e.key === 'Tab') {
        const f = [...jan.querySelectorAll('button,textarea,input,a[href],[tabindex="0"],h2')].filter(x => !x.disabled && x.offsetParent !== null && x.tabIndex >= -1 && !(x.getAttribute('role') === 'tab' && x.getAttribute('aria-selected') !== 'true'));
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    jan.querySelector('h2').focus();
    return jan;
  }
  function fechar(devolver) {
    if (!atual) return;
    const { fundo, volta } = atual; atual = null;
    fundo.remove(); document.body.style.overflow = '';
    if (devolver && volta && volta.isConnected) volta.focus({ preventScroll: true });
  }
  const vivo = m => { const v = $('ljVivo'); if (v) { v.textContent = ''; setTimeout(() => { v.textContent = m; }, 30); } };

  function abas(jan) {
    const lista = jan.querySelector('.lj-abas'); if (!lista) return;
    const tabs = [...lista.querySelectorAll('[role=tab]')];
    const ativar = (t, foco) => {
      tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; jan.querySelector('#' + x.getAttribute('aria-controls')).hidden = !on; });
      if (foco) t.focus();
      jan.dispatchEvent(new CustomEvent('lj:aba', { detail: t.dataset.aba }));
    };
    lista.addEventListener('click', e => { const t = e.target.closest('[role=tab]'); if (t) ativar(t, false); });
    lista.addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement); if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
      if (n >= 0) { e.preventDefault(); ativar(tabs[n], true); }
    });
  }
  const abasHtml = (pfx, rotEu) => IA() ? '<div class="lj-abas" role="tablist" aria-label="Como fazer">' +
    '<button type="button" role="tab" id="' + pfx + 'Ta" data-aba="eu" aria-selected="true" aria-controls="' + pfx + 'Pa">' + rotEu + '</button>' +
    '<button type="button" role="tab" id="' + pfx + 'Tb" data-aba="ia" aria-selected="false" tabindex="-1" aria-controls="' + pfx + 'Pb">Pedir ajuda a uma IA</button></div>' : '';
  const AVISO_IA = '<div class="lj-msg aten" role="note"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 1.5 21h21L12 2.5z" fill="#c2850c"/><path d="M12 9v5.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.3" fill="#fff"/></svg>' +
    '<p><b>Use só a IA autorizada pela instituição.</b> Não envie imagens ou textos com dados pessoais ou informação restrita. A IA pode errar: você responde pelo texto final.</p></div>';

  /* ---------------------------- Utilitários de texto ---------------------------- */
  const nomeConteudo = () => { const p = $('pref'); return (p && p.value.trim().replace(/_/g, ' ')) || ''; };
  const limparAlt = s => String(s).replace(/\s+/g, ' ').replace(/\[/g, '(').replace(/\]/g, ')').trim();
  function contexto(v, a, f) {
    const antes = v.slice(Math.max(0, a - 700), a).split(/\n\s*\n/).filter(x => x.trim()).slice(-1)[0] || '';
    const depois = v.slice(f, f + 700).split(/\n\s*\n/).filter(x => x.trim())[0] || '';
    const limpa = t => t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<!--[\s\S]*?-->/g, ' ').replace(/[#>*_`|]/g, ' ').replace(/\s+/g, ' ').trim();
    return (limpa(antes) + ' ' + limpa(depois)).trim().slice(0, 600);
  }
  async function copiarTexto(texto, b, msg) {
    try { await navigator.clipboard.writeText(texto); confirmar(b, msg); return true; }
    catch (e) {
      const t = document.createElement('textarea'); t.value = texto; t.setAttribute('readonly', ''); Object.assign(t.style, { position: 'fixed', left: '-9999px' });
      (atual ? atual.jan : document.body).append(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
      t.remove(); b.focus();
      if (ok) confirmar(b, msg); else vivo('Não foi possível copiar. Use Ver pedido e copie com Ctrl+C.');
      return ok;
    }
  }
  function dadosParaBlob(u) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(u); if (!m) return null;
    const bin = m[2] ? atob(m[3].replace(/\s+/g, '')) : decodeURIComponent(m[3]);
    const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: m[1] });
  }
  function emPng(blob) {
    if (blob.type === 'image/png') return Promise.resolve(blob);
    return new Promise((ok, falha) => {
      const im = new Image(), u = URL.createObjectURL(blob);
      im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth || 800; c.height = im.naturalHeight || 600; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(b => (b ? ok(b) : falha(new Error('png'))), 'image/png'); };
      im.onerror = () => { URL.revokeObjectURL(u); falha(new Error('imagem')); };
      im.src = u;
    });
  }
  const resumoFrases = (L, t) => {
    const fs = L.dividirFrases(t), maior = Math.max(0, ...fs.map(f => f.palavras)), n = L.contarPalavras(t);
    return { palavras: n, frases: fs.length, maior, texto: n + (n === 1 ? ' palavra' : ' palavras') + ' · ' + fs.length + (fs.length === 1 ? ' frase' : ' frases') + (fs.length > 1 ? ', a maior com ' + maior : '') };
  };
  async function aplicarEdicoes(k, eds, msg) {
    const st = A().estado(k);
    const ok = st.ed && st.ed.aplicarEdicoes ? st.ed.aplicarEdicoes(eds) : false;
    if (!ok) { vivo('Não foi possível aplicar: o texto mudou. Feche a janela e confira de novo.'); return false; }
    fechar(false);
    st.ta.focus({ preventScroll: true });
    await A().analisarAgora(k);
    A().dica(msg);
    return true;
  }

  /* ---------------------------- Descrever imagem ---------------------------- */
  async function descrever({ k, d, c }) {
    const L = await lib(), st = A().estado(k), v = st.ta.value;
    const alvo = c && c.alvo ? c.alvo : { inicio: d.inicio + 2, fim: d.inicio + 2 };
    const img = v.slice(d.inicio, d.fim), m = /\]\(([^)\s]+)/.exec(img), destino = m ? m[1] : '';
    let src = null, nome = destino;
    const mi = /^img:(\d+)$/.exec(destino);
    if (mi && st.ed && st.ed.imagem) { src = st.ed.imagem(+mi[1]); nome = 'imagem ' + mi[1] + ' do texto'; }
    else if (/^data:image\//.test(destino)) { src = destino; nome = 'imagem no texto'; }
    else if (/^https?:\/\//i.test(destino)) src = destino;
    const altAtual = v.slice(alvo.inicio, alvo.fim).trim();
    const fimLinha = (() => { const i = v.indexOf('\n', d.fim); return i < 0 ? v.length : i; })();
    const ctx = contexto(v, d.inicio, d.fim);
    const pedido = L.montarPedido('descrever', { nome: nomeConteudo(), contexto: ctx, legenda: altAtual });
    const podeCopiarImg = !!(src && /^data:image\//.test(src) && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write);
    const corpo =
      '<div class="lj-grade"><div class="lj-mini"><div class="lj-img">' + (src ? '<img src="' + esc(src) + '" alt="">' : '<span>Imagem não incorporada ao texto</span>') + '</div>' +
      '<small>Linha ' + d.linha + ' · ' + esc(nome.length > 60 ? nome.slice(0, 57) + '\u2026' : nome) + '</small></div><div>' +
      abasHtml('ljd', 'Escrever eu mesmo') +
      '<div id="ljdPa" role="' + (IA() ? 'tabpanel' : 'region') + '" aria-labelledby="ljdTa"><p style="margin:0 0 12px">Diga o que a imagem mostra e por que ela está aqui. Quem usa leitor de tela vai ouvir esta descrição.</p></div>' +
      (IA() ? '<div id="ljdPb" role="tabpanel" aria-labelledby="ljdTb" hidden>' + AVISO_IA +
        '<div class="lj-passo"><span class="lj-num" aria-hidden="true">1</span><div><h3>Copie o pedido e a imagem e cole na IA</h3><div class="lj-botoes">' +
        '<button type="button" class="mini" data-c="pedido">Copiar pedido</button>' +
        (podeCopiarImg ? '<button type="button" class="sec mini" data-c="img">Copiar imagem</button>' : '') +
        (src && /^data:/.test(src) ? '<a class="btn sec mini" data-c="baixar" href="' + esc(src) + '" download="imagem-para-descrever">Baixar imagem</a>' : '') +
        '<button type="button" class="sec mini" data-c="ver" aria-expanded="false" aria-controls="ljdPed">Ver pedido</button></div>' +
        '<pre class="lj-pedido" id="ljdPed" tabindex="0" hidden>' + esc(pedido) + '</pre><p style="margin:6px 0 0;font-size:13px;color:#636363">O pedido já leva o nome do conteúdo, o texto perto da imagem e as regras de linguagem simples.</p></div></div>' +
        '<div class="lj-passo"><span class="lj-num" aria-hidden="true">2</span><div class="lj-campo" style="flex:1"><label for="ljdResp">Cole aqui a resposta da IA</label>' +
        '<textarea id="ljdResp" rows="4" placeholder="DESCRIÇÃO CURTA: …&#10;DESCRIÇÃO DETALHADA: …"></textarea></div></div>' +
        '<div id="ljdLida" role="status"></div><h3 style="margin:0 0 8px;font-size:15px"><span class="lj-num" aria-hidden="true" style="display:inline-flex;width:28px;margin-right:10px">3</span>Confira antes de aplicar</h3></div>' : '') +
      '<div class="lj-campo"><label for="ljdCurta">Descrição curta <small id="ljdCont" class="lj-cont">0 de ' + LIMITE_CURTA + ' caracteres</small></label>' +
      '<textarea id="ljdCurta" rows="2" aria-describedby="ljdCont ljdErro" spellcheck="true" lang="pt-BR">' + esc(altAtual) + '</textarea><p class="lj-erro" id="ljdErro" hidden></p></div>' +
      '<div class="lj-campo"><label for="ljdDet">Descrição detalhada (opcional) <small>Para gráficos, esquemas e fluxos</small></label>' +
      '<textarea id="ljdDet" rows="3" aria-describedby="ljdDetAj" spellcheck="true" lang="pt-BR"></textarea><small id="ljdDetAj" class="lj-cont">Entra como texto logo abaixo da imagem, para todos lerem.</small></div>' +
      '<div class="lj-dicas"><b>Dicas</b><ul><li>Comece pelo que importa. Não escreva "imagem de".</li><li>Se a imagem tem texto, escreva o texto.</li><li>Use frases curtas e palavras do dia a dia.</li></ul></div>' +
      '<div class="lj-botoes"><button type="button" class="sec mini" data-c="decorativa">É decorativa (não precisa de descrição)</button></div></div></div>';
    const jan = janela({ titulo: 'Descrever imagem', sub: 'Linha ' + d.linha + ' · ' + (d.nivel === 'corrigir' ? 'para corrigir' : 'sugestão') + ' · ' + d.mensagem, corpo, primario: 'Aplicar ao texto', aoAplicar: aplicar });
    abas(jan);
    const curta = jan.querySelector('#ljdCurta'), det = jan.querySelector('#ljdDet'), cont = jan.querySelector('#ljdCont'), erro = jan.querySelector('#ljdErro');
    let decorIA = false;
    const contar = () => {
      const n = [...curta.value.trim()].length; cont.textContent = n + ' de ' + LIMITE_CURTA + ' caracteres' + (n > LIMITE_CURTA ? ': encurte' : '');
      cont.classList.toggle('mais', n > LIMITE_CURTA);
      if (n) { erro.hidden = true; curta.removeAttribute('aria-invalid'); }
    };
    curta.addEventListener('input', () => { decorIA = false; contar(); }); contar();
    jan.addEventListener('lj:aba', e => { if (e.detail === 'eu') curta.focus(); });
    const resp = jan.querySelector('#ljdResp');
    if (resp) resp.addEventListener('input', () => {
      const r = L.lerRespostaDescricao(resp.value), box = jan.querySelector('#ljdLida');
      if (!resp.value.trim()) { box.innerHTML = ''; return; }
      if (r.decorativa) {
        decorIA = true; curta.value = ''; det.value = ''; contar();
        box.innerHTML = '<div class="lj-msg info"><p>A IA indicou que a imagem é <b>decorativa</b>. Ao aplicar, ela fica marcada como decorativa (sem descrição). Se não concordar, escreva a descrição abaixo.</p></div>';
        vivo('A IA indicou que a imagem é decorativa.'); return;
      }
      decorIA = false; curta.value = r.curta; det.value = r.detalhada; contar();
      box.innerHTML = r.avisos.length ? '<div class="lj-msg aten"><p>' + r.avisos.map(esc).join('<br>') + '</p></div>' : '<div class="lj-msg ok"><p>Resposta lida. Confira a descrição abaixo antes de aplicar.</p></div>';
      vivo(r.avisos.length ? 'Resposta lida, com ' + r.avisos.length + ' aviso(s). Confira.' : 'Resposta lida. Confira a descrição antes de aplicar.');
    });
    jan.addEventListener('click', async e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const cmd = b.dataset.c;
      if (cmd === 'pedido') copiarTexto(pedido, b, 'Pedido copiado. Cole na IA autorizada.');
      else if (cmd === 'ver') { const p = jan.querySelector('#ljdPed'); p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); b.textContent = p.hidden ? 'Ver pedido' : 'Esconder pedido'; }
      else if (cmd === 'img') {
        try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': emPng(dadosParaBlob(src)) })]); confirmar(b, 'Imagem copiada. Cole na IA junto com o pedido.'); }
        catch (x) { vivo('Este navegador não deixou copiar a imagem. Use Baixar imagem.'); const a = jan.querySelector('[data-c=baixar]'); if (a) a.focus(); }
      } else if (cmd === 'decorativa') { aplicarDecorativa(); }
    });
    function aplicarDecorativa() {
      return aplicarEdicoes(k, [{ inicio: d.inicio, fim: d.inicio, texto: '<!-- linguagem-acessivel: decorativa -->' }], 'Imagem marcada como decorativa.');
    }
    function aplicar() {
      if (decorIA && !curta.value.trim()) return aplicarDecorativa();
      const t = limparAlt(curta.value);
      if (!t) { erro.textContent = 'Escreva a descrição curta ou marque a imagem como decorativa.'; erro.hidden = false; curta.setAttribute('aria-invalid', 'true'); curta.focus(); return; }
      if ([...t].length > LIMITE_CURTA) { erro.textContent = 'A descrição curta passa de ' + LIMITE_CURTA + ' caracteres. Encurte e use a descrição detalhada para o resto.'; erro.hidden = false; curta.setAttribute('aria-invalid', 'true'); curta.focus(); return; }
      const eds = [{ inicio: alvo.inicio, fim: alvo.fim, texto: t }];
      const dt = det.value.trim().replace(/\r\n/g, '\n');
      if (dt) eds.push({ inicio: fimLinha, fim: fimLinha, texto: '\n\n' + dt });
      return aplicarEdicoes(k, eds, 'Descrição aplicada' + (dt ? ', com a descrição detalhada abaixo da imagem.' : '.'));
    }
  }

  /* ---------------------------- Simplificar trecho ---------------------------- */
  async function simplificar({ k, d, c }) {
    const L = await lib(), st = A().estado(k), v = st.ta.value;
    const alvo = c && c.alvo ? c.alvo : { inicio: d.inicio, fim: d.fim };
    const antes = v.slice(alvo.inicio, alvo.fim), rAntes = resumoFrases(L, antes);
    const pedido = L.montarPedido('simplificar', { nome: nomeConteudo(), trecho: antes });
    const corpo = abasHtml('ljs', 'Escrever eu mesmo') +
      '<div id="ljsPa" role="' + (IA() ? 'tabpanel' : 'region') + '" aria-labelledby="ljsTa"><p style="margin:0 0 12px">Reescreva o trecho em frases curtas, com uma ideia em cada. Edite em <b>Depois</b>.</p></div>' +
      (IA() ? '<div id="ljsPb" role="tabpanel" aria-labelledby="ljsTb" hidden>' + AVISO_IA +
        '<div class="lj-passo"><span class="lj-num" aria-hidden="true">1</span><div><h3>Copie o pedido e cole na IA</h3><div class="lj-botoes">' +
        '<button type="button" class="mini" data-c="pedido">Copiar pedido</button><button type="button" class="sec mini" data-c="ver" aria-expanded="false" aria-controls="ljsPed">Ver pedido</button></div>' +
        '<pre class="lj-pedido" id="ljsPed" tabindex="0" hidden>' + esc(pedido) + '</pre></div></div>' +
        '<div class="lj-passo"><span class="lj-num" aria-hidden="true">2</span><div class="lj-campo" style="flex:1"><label for="ljsResp">Cole aqui a resposta da IA</label><textarea id="ljsResp" rows="3"></textarea></div></div>' +
        '<div id="ljsLida" role="status"></div></div>' : '') +
      '<div class="lj-comp"><div><p class="lj-rot" id="ljsAntesR">Antes</p><div class="lj-antes" tabindex="0" role="region" aria-labelledby="ljsAntesR">' + esc(antes) + '</div>' +
      '<p class="lj-cont" style="margin:4px 0 0">' + esc(rAntes.texto) + '</p></div>' +
      '<div class="lj-campo" style="margin:0"><label for="ljsDepois">Depois <small>Você pode editar</small></label><textarea id="ljsDepois" spellcheck="true" lang="pt-BR" aria-describedby="ljsCont ljsErro">' + esc(antes) + '</textarea>' +
      '<p class="lj-cont" id="ljsCont" style="margin:4px 0 0"></p><p class="lj-erro" id="ljsErro" hidden></p></div></div>' +
      '<div class="lj-dicas" style="margin-top:14px"><b>Confira se o sentido continua o mesmo</b><ul><li>Prazos, números, obrigações e termos técnicos não podem mudar.</li><li>Uma ideia por frase. Diga quem faz o quê, na ordem em que acontece.</li><li>Explique a sigla na primeira vez em que ela aparece.</li></ul></div>';
    const jan = janela({ titulo: 'Simplificar trecho', sub: 'Linha ' + d.linha + ' · ' + d.mensagem, corpo, primario: 'Trocar no texto', aoAplicar: aplicar });
    abas(jan);
    const dep = jan.querySelector('#ljsDepois'), cont = jan.querySelector('#ljsCont'), erro = jan.querySelector('#ljsErro');
    const lim = Number((document.querySelector('#laL-' + k) || {}).value) || 25;
    const contar = () => {
      const r = resumoFrases(L, dep.value);
      cont.innerHTML = esc(r.texto) + (r.palavras && r.maior <= lim ? ' <span class="lj-ok">· todas com até ' + lim + ' palavras</span>' : '');
      if (dep.value.trim()) { erro.hidden = true; dep.removeAttribute('aria-invalid'); }
    };
    dep.addEventListener('input', contar); contar();
    jan.addEventListener('lj:aba', e => { if (e.detail === 'eu') dep.focus(); });
    const resp = jan.querySelector('#ljsResp');
    if (resp) resp.addEventListener('input', () => {
      const r = L.lerRespostaSimplificar(resp.value), box = jan.querySelector('#ljsLida');
      if (!resp.value.trim()) { box.innerHTML = ''; return; }
      dep.value = r.texto; contar();
      box.innerHTML = r.avisos.length ? '<div class="lj-msg aten"><p>' + r.avisos.map(esc).join('<br>') + '</p></div>' : '<div class="lj-msg ok"><p>Resposta colocada em <b>Depois</b>. Confira antes de trocar.</p></div>';
      vivo(r.avisos.length ? 'Resposta colocada em Depois, com ' + r.avisos.length + ' aviso(s).' : 'Resposta colocada em Depois. Confira antes de trocar.');
    });
    jan.addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      if (b.dataset.c === 'pedido') copiarTexto(pedido, b, 'Pedido copiado. Cole na IA autorizada.');
      else if (b.dataset.c === 'ver') { const p = jan.querySelector('#ljsPed'); p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); b.textContent = p.hidden ? 'Ver pedido' : 'Esconder pedido'; }
    });
    function aplicar() {
      const t = dep.value.replace(/\r\n/g, '\n').trim();
      if (!t) { erro.textContent = 'Escreva o novo texto em Depois.'; erro.hidden = false; dep.setAttribute('aria-invalid', 'true'); dep.focus(); return; }
      if (/\[A CONFIRMAR:/i.test(t)) { erro.textContent = 'Resolva os pontos marcados [A CONFIRMAR] antes de trocar.'; erro.hidden = false; dep.setAttribute('aria-invalid', 'true'); dep.focus(); return; }
      if (t === antes.trim()) { erro.textContent = 'O texto em Depois está igual ao original.'; erro.hidden = false; dep.focus(); return; }
      return aplicarEdicoes(k, [{ inicio: alvo.inicio, fim: alvo.fim, texto: t }], 'Trecho trocado. Ctrl+Z desfaz.');
    }
  }

  /* ---------------------------- Explicar sigla ---------------------------- */
  async function explicar({ k, d, c }) {
    const st = A().estado(k), v = st.ta.value;
    const alvo = c && c.alvo ? c.alvo : { inicio: d.inicio, fim: d.fim };
    const sigla = v.slice(alvo.inicio, alvo.fim);
    const ini = Math.max(v.lastIndexOf('\n', alvo.inicio - 1) + 1, alvo.inicio - 90), fim = (() => { const i = v.indexOf('\n', alvo.fim); return Math.min(i < 0 ? v.length : i, alvo.fim + 90); })();
    const antes = v.slice(ini, alvo.inicio), depois = v.slice(alvo.fim, fim);
    const corpo = '<div class="lj-campo"><label for="ljxNome">Nome completo de ' + esc(sigla) + '</label>' +
      '<input id="ljxNome" type="text" autocomplete="off" spellcheck="true" lang="pt-BR" aria-describedby="ljxAj ljxErro"><small id="ljxAj" class="lj-cont">Ex.: Regulamento Brasileiro da Aviação Civil</small><p class="lj-erro" id="ljxErro" hidden></p></div>' +
      '<p class="lj-rot">Fica assim</p><div class="lj-previa" id="ljxPrev" aria-live="polite"></div>' +
      '<div class="lj-dicas" style="margin-top:14px"><b>Por que explicar</b><ul><li>Na primeira vez, escreva o nome completo e a sigla entre parênteses.</li><li>Depois, use só a sigla.</li><li>Para a sigla entrar no glossário de todos, peça a inclusão em <code>dados/siglas.js</code>.</li></ul></div>';
    const jan = janela({ titulo: 'Explicar a sigla ' + sigla, sub: 'Linha ' + d.linha + ' · primeira vez em que a sigla aparece', corpo, primario: 'Aplicar ao texto', aoAplicar: aplicar });
    const nome = jan.querySelector('#ljxNome'), prev = jan.querySelector('#ljxPrev'), erro = jan.querySelector('#ljxErro');
    const ver = () => { const n = nome.value.trim(); prev.innerHTML = '\u2026' + esc(antes) + (n ? '<mark>' + esc(n) + ' (' + esc(sigla) + ')</mark>' : '<mark>' + esc(sigla) + '</mark>') + esc(depois) + '\u2026'; if (n) { erro.hidden = true; nome.removeAttribute('aria-invalid'); } };
    nome.addEventListener('input', ver); nome.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); aplicar(); } }); ver();
    nome.focus();
    function aplicar() {
      const n = nome.value.trim().replace(/\s+/g, ' ');
      if (!n) { erro.textContent = 'Escreva o nome completo da sigla.'; erro.hidden = false; nome.setAttribute('aria-invalid', 'true'); nome.focus(); return; }
      return aplicarEdicoes(k, [{ inicio: alvo.inicio, fim: alvo.inicio, texto: n + ' (' }, { inicio: alvo.fim, fim: alvo.fim, texto: ')' }], 'Sigla explicada.');
    }
  }

  const ACOES = { 'descrever-imagem': descrever, 'simplificar-trecho': simplificar, 'explicar-sigla': explicar };
  window.JanelasAcessibilidade = {
    trata: acao => !!ACOES[acao],
    abrir: (acao, x) => (ACOES[acao] ? ACOES[acao](x) : Promise.resolve(false)),
    fechar: () => fechar(true),
    aberta: () => !!atual,
  };
})();
