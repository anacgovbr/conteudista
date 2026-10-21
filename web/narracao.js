/* =====================================================================================
   Conteudista — Narração dos slides (notas do apresentador → áudio no HTML e no PPTX)
   - Painel "Narração dos slides" na aba Curso, visível SOMENTE com a aba "Apresentação" selecionada
     (desligado por padrão)
   - Recursos de áudio sob demanda: só são carregados quando a caixa é marcada pelo usuário (ou ao gerar)
   - Ao ligar: mostra um resumo da voz; as opções (idioma, voz, velocidade, formato, avanço) ficam em
     "Opções avançadas de voz", sempre recolhidas ao abrir a página
   - Botão "Histórico de áudio": janela sobreposta (como o Histórico do texto) com busca, Ouvir, Baixar,
     Usar esta voz e Excluir — os mesmos áudios da aba Locução (IndexedDB KokoroTTS_DB)
   - Ao gerar os arquivos: lê as notas de cada slide (gerador.notas_para_narracao), gera o áudio com a voz
     escolhida (reaproveita o histórico), converte (MP3 padrão, OGG ou WAV) e entrega ao gerador
   - <!-- narracao: texto --> substitui a nota no áudio; <!-- narracao: nao --> deixa o slide sem som
   API: Narracao.preparar(py) → JSON para gerador.gerar(..., narracao) ou '' (sem narração)
        Narracao.abrirHistorico() / Narracao.fecharHistorico()
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = () => window.Locucao;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch { /* */ } };
  const fmtTam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const fmtDur = s => { s = Math.round(s); const m = Math.floor(s / 60); return m ? m + ' min ' + String(s % 60).padStart(2, '0') + ' s' : s + ' s'; };
  const go = $('go'); if (!go || !L()) return;
  const PREF = { on: 'narr.on', voz: 'narr.voz', vel: 'narr.vel', fmt: 'narr.fmt', auto: 'narr.auto' };
  const pref = (k, d) => { const v = localStorage.getItem(PREF[k]); return v === null ? d : v; };
  const ICO = '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 3"/></svg>';

  /* ---------------------------- Estilos ---------------------------- */
  const st = document.createElement('style');
  st.textContent = `#narrBox{margin:10px 0 12px}#narrBox[hidden]{display:none!important}
#narrBox .lin{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-top:8px}#narrBox .lin>div{flex:1;min-width:160px}
#narrBox label.tit{font-weight:600;color:var(--pri,#0c326f)}#narrBox input[type=range]{width:100%}#narrBox .note{margin:6px 0 0}
#narrBox .nres{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:8px;font-size:14px}
#narrBox .nres b{color:var(--pri,#0c326f)}#narrBox .nres button{margin:0}
#narrBox details.nav{margin-top:8px;border:1px solid var(--line,#ccc);border-radius:6px;padding:6px 10px;background:#fff}
#narrBox details.nav>summary{cursor:pointer;font-weight:600;color:var(--acc,#1351b4);font-size:14px}
#narrBox details.nav[open]>summary{margin-bottom:4px}
#narrBox .tts-loading-container{display:none;width:100%;height:8px;border-radius:9999px;background:rgba(51,65,85,.15);overflow:hidden;margin-top:8px}#narrBox .tts-progress-bar{height:100%;width:0;background:#1351b4;transition:width .3s}
.ah-back{position:fixed;inset:0;z-index:1800;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px 14px;overflow:auto}
.ah-back[hidden]{display:none}
.ah-win{background:#fff;color:var(--ink,#333);border-radius:8px;width:min(900px,100%);box-shadow:0 10px 40px rgba(0,0,0,.35);padding:0 20px 18px}
.ah-top{display:flex;align-items:center;gap:10px;padding:14px 0 10px;border-bottom:1px solid var(--line,#ccc);margin-bottom:10px;position:sticky;top:0;background:#fff;z-index:2}
.ah-top h2{flex:1;margin:0;font-size:19px}.ah-top button{margin:0}
.ah-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px}.ah-ctl input[type=search]{flex:1;min-width:180px}.ah-ctl select{width:auto}.ah-ctl button{margin:0}
.ah-win audio{width:100%;margin:4px 0 8px}.ah-info{font-size:13px;color:var(--mu,#636363);margin:0 0 8px}
.ah-lista{display:flex;flex-direction:column;gap:8px}
.ah-it{border:1px solid var(--line,#ccc);border-radius:8px;padding:8px 10px;background:#f8f8f8}.ah-it.on{outline:2px solid #168821}
.ah-it p{margin:0 0 4px;font-size:13.5px;line-height:1.4;max-height:4.2em;overflow:hidden}.ah-it small{display:block;color:var(--mu,#636363);font-size:12px}
.ah-it .b{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ah-it .b button{margin:0;min-height:32px!important;line-height:32px!important;padding:0 12px!important;font-size:13px!important}
.ah-vazio{color:var(--mu,#636363);font-size:14px;padding:12px}
@media(max-width:700px){.ah-back{padding:0;align-items:stretch}.ah-win{border-radius:0;width:100%;min-height:100%;padding:0 14px 18px}.ah-top h2{font-size:16px}}`;
  document.head.appendChild(st);

  /* ---------------------------- Painel ---------------------------- */
  const box = document.createElement('div'); box.id = 'narrBox'; box.className = 'panel';
  box.innerHTML = '<label class="inl tit"><input type="checkbox" id="narrOn"> Narração dos slides — gerar áudio a partir das notas do apresentador</label>' +
    '<div id="narrOp" hidden>' +
      '<div class="nres"><span id="narrResumo"></span><span id="narrSt" class="note" style="margin:0"></span><button type="button" class="sec mini" id="narrHist" title="Áudios já gerados neste navegador (Locução e narração)">' + ICO + ' Histórico de áudio</button></div>' +
      '<details class="nav" id="narrAv"><summary>Opções avançadas de voz</summary>' +
        '<div class="lin"><div><label for="narrIdioma">Idioma</label><select id="narrIdioma"></select></div><div><label for="narrVoz">Voz</label><select id="narrVoz"></select></div>' +
        '<div><label for="narrVel">Velocidade: <span id="narrVelV">1,00</span>×</label><input type="range" id="narrVel" min="0.5" max="2" step="0.05" value="1"></div>' +
        '<div><label for="narrFmt">Formato do áudio</label><select id="narrFmt"><option value="mp3">MP3 (padrão)</option><option value="ogg">OGG (menor)</option><option value="wav">WAV (sem compressão)</option></select></div></div>' +
        '<label class="inl"><input type="checkbox" id="narrAuto"> Avançar os slides sozinho ao fim da narração</label>' +
      '</details>' +
      '<p class="note" id="narrInfo"></p>' +
      '<div class="tts-loading-container" id="narrBarC"><div class="tts-progress-bar" id="narrBar"></div></div>' +
    '</div>';
  const alvo = go.closest('p') || go;
  alvo.parentNode.insertBefore(box, alvo);

  /* Visível apenas com a aba "Apresentação (apresentacao.md)" selecionada */
  const ps = $('ps');
  const sincronizarAba = () => { box.hidden = !ps || ps.hidden; };
  sincronizarAba();
  if (ps) new MutationObserver(sincronizarAba).observe(ps, { attributes: true, attributeFilter: ['hidden'] });

  $('narrOn').checked = pref('on', '0') === '1';
  $('narrAuto').checked = pref('auto', '0') === '1';
  $('narrVel').value = pref('vel', '1'); $('narrFmt').value = pref('fmt', 'mp3');
  $('narrAv').open = false;   // sempre recolhidas ao abrir a página
  L().preencherVozes($('narrIdioma'), $('narrVoz'), pref('voz', L().VOZ_PADRAO));
  document.addEventListener('locucao:vozes', () => { const v = $('narrVoz').value; L().preencherVozes($('narrIdioma'), $('narrVoz'), v); resumo(); });
  L().ligarSelects($('narrIdioma'), $('narrVoz'), () => { localStorage.setItem(PREF.voz, $('narrVoz').value); resumo(); info(); });
  const velTxt = () => { $('narrVelV').textContent = (+$('narrVel').value).toFixed(2).replace('.', ','); };
  function resumo() {
    const v = $('narrVoz').value, fmt = $('narrFmt').selectedOptions[0];
    $('narrResumo').innerHTML = 'Voz: <b>' + esc(L().nomeVoz(v)) + '</b> · ' + (+$('narrVel').value || 1).toFixed(2).replace('.', ',') + '× · ' + esc(fmt ? fmt.value.toUpperCase() : 'MP3') + ($('narrAuto').checked ? ' · avanço automático' : '');
  }
  velTxt(); resumo();
  const mostrar = () => { $('narrOp').hidden = !$('narrOn').checked; info(); };
  /* Recursos de áudio: carregados somente quando o usuário marca a caixa */
  function estadoVoz() {
    const st_ = $('narrSt'); if (!st_) return;
    if (!L().recursosCarregados || !L().recursosCarregados()) { st_.textContent = ''; return; }
    st_.textContent = L().vozPronta && L().vozPronta($('narrVoz').value) ? '· ✓ voz pronta' : '· preparando a voz…';
  }
  document.addEventListener('locucao:estado', estadoVoz);
  function carregarRecursosNarr() {
    if (!L().carregarRecursos) return;
    estadoVoz();
    L().carregarRecursos({ voz: $('narrVoz').value, vel: +$('narrVel').value || 1 }).then(ok => {
      $('narrSt').textContent = ok ? '· ✓ voz pronta' : '· a voz será preparada ao gerar os arquivos';
    });
  }
  $('narrOn').onchange = () => { localStorage.setItem(PREF.on, $('narrOn').checked ? '1' : '0'); mostrar(); if ($('narrOn').checked) carregarRecursosNarr(); };
  $('narrAuto').onchange = () => { localStorage.setItem(PREF.auto, $('narrAuto').checked ? '1' : '0'); resumo(); };
  $('narrVel').oninput = () => { velTxt(); localStorage.setItem(PREF.vel, $('narrVel').value); resumo(); info(); };
  $('narrFmt').onchange = () => { localStorage.setItem(PREF.fmt, $('narrFmt').value); resumo(); info(); };

  function notasAprox(md) {
    return L().slidesDe(md || '').map(p => {
      let n = ''; let m = p.match(/<!--\s*notas:\s*([\s\S]*?)-->/); if (m) n = m[1].trim();
      m = p.match(/<!--\s*narra[cç][aã]o:\s*([\s\S]*?)-->/i); if (m) { const v = m[1].trim(); n = /^(n[aã]o|no|off|0|-)$/i.test(v) ? '' : v; }
      return p.replace(/<!--[\s\S]*?-->/g, '').trim() ? n : null;
    }).filter(x => x !== null);
  }
  let tInfo = null;
  function info() {
    clearTimeout(tInfo);
    tInfo = setTimeout(() => {
      if (!$('narrOn').checked) return;
      const ns = notasAprox(($('s') && $('s').value) || ''), com = ns.filter(Boolean), pal = com.join(' ').split(/\s+/).filter(Boolean).length;
      const seg = pal / (2.6 * (+$('narrVel').value || 1)), kbps = { mp3: 64, ogg: 32, wav: 384 }[$('narrFmt').value];
      $('narrInfo').textContent = !ns.length ? 'A apresentação está vazia.' : !com.length ? 'Nenhum slide tem notas do apresentador (<!-- notas: … -->).' :
        com.length + ' de ' + ns.length + ' slide(s) com notas · ≈ ' + fmtDur(seg) + ' de narração · aumenta os arquivos em ≈ ' + fmtTam(seg * kbps * 125) + '.';
    }, 300);
  }
  ['input', 'change'].forEach(ev => { const s = $('s'); if (s) s.addEventListener(ev, info); });
  setInterval(() => { const s = $('s'); if (s && s.value.length !== info.k) { info.k = s.value.length; info(); } }, 1500);
  mostrar();

  /* ---------------------------- Histórico de áudio (janela sobreposta) ---------------------------- */
  const back = document.createElement('div'); back.className = 'ah-back'; back.id = 'ahBack'; back.hidden = true;
  back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', 'Histórico de áudio');
  back.innerHTML = '<div class="ah-win"><div class="ah-top"><h2>' + ICO + ' Histórico de áudio</h2><button type="button" class="sec mini" id="ahFechar" title="Fechar (Esc)">Fechar ✕</button></div>' +
    '<div class="ah-ctl"><input type="search" id="ahBusca" placeholder="Buscar por texto ou voz…" aria-label="Buscar no histórico de áudio">' +
    '<label for="ahFmt" class="inl">Baixar em</label><select id="ahFmt"><option value="mp3">MP3</option><option value="ogg">OGG</option><option value="wav">WAV</option></select></div>' +
    '<audio id="ahAudio" controls preload="none"></audio><p class="ah-info" id="ahInfo"></p>' +
    '<div class="ah-lista" id="ahLista"></div>' +
    '<p style="margin-top:12px"><button type="button" class="dan mini" id="ahLimpar">Limpar histórico de áudio</button></p></div>';
  document.body.appendChild(back);
  let ahUrl = null, ahAtual = null, ahFoco = null;
  async function tx(modo, fn) {
    const db = await L().openHistoryDB();
    return new Promise((ok, err) => { const t = db.transaction('audio_history', modo), r = fn(t.objectStore('audio_history')); t.oncomplete = () => ok(r && r.result); t.onerror = () => err(t.error); t.onabort = () => err(t.error); });
  }
  async function listar() {
    let l = [];
    try { l = await tx('readonly', s => s.getAll()); } catch { $('ahLista').innerHTML = '<div class="ah-vazio">Histórico indisponível neste navegador.</div>'; return; }
    l.sort((a, b) => b.id - a.id);
    const q = ($('ahBusca').value || '').toLowerCase().trim(), nome = v => { try { return L().nomeVoz(v); } catch { return v; } };
    const vis = q ? l.filter(x => (x.text || '').toLowerCase().includes(q) || nome(x.voice).toLowerCase().includes(q)) : l;
    const dur = l.reduce((a, x) => a + (x.duracao || 0), 0);
    $('ahInfo').textContent = l.length ? l.length + ' áudio(s) · ' + fmtDur(dur) + ' no total · guardados somente neste navegador. Gerar de novo o mesmo texto com a mesma voz e velocidade usa o áudio guardado.' : '';
    if (!vis.length) { $('ahLista').innerHTML = '<div class="ah-vazio">' + (l.length ? 'Nada encontrado.' : 'Nenhum áudio gerado ainda. Os áudios da Locução e da narração dos slides aparecem aqui.') + '</div>'; return; }
    $('ahLista').innerHTML = vis.map(x => '<div class="ah-it' + (x.id === ahAtual ? ' on' : '') + '" data-id="' + x.id + '"><p title="' + esc((x.text || '').slice(0, 600)) + '">' + esc((x.text || '').slice(0, 260)) + ((x.text || '').length > 260 ? '…' : '') + '</p>' +
      '<small>' + esc(nome(x.voice)) + ' · ' + String(x.speed).replace('.', ',') + '× · ' + fmtDur(x.duracao || 0) + ' · ' + new Date(x.createdAt).toLocaleString('pt-BR') + '</small>' +
      '<div class="b"><button type="button" data-a="ouvir">▶ Ouvir</button><button type="button" class="file-link download" data-a="baixar">.ÁUDIO</button>' +
      '<button type="button" class="sec" data-a="usar" title="Usar esta voz e velocidade na narração dos slides">Usar esta voz</button><button type="button" class="dan" data-a="excluir">Excluir</button></div></div>').join('');
  }
  function abrirHistorico() {
    ahFoco = document.activeElement;
    $('ahFmt').value = $('narrFmt').value;
    back.hidden = false; back.scrollTop = 0; document.body.style.overflow = 'hidden';
    listar(); setTimeout(() => $('ahBusca').focus(), 30);
  }
  function fecharHistorico() {
    if (back.hidden) return;
    const a = $('ahAudio'); a.pause();
    back.hidden = true; document.body.style.overflow = '';
    if (ahFoco && ahFoco.focus) ahFoco.focus();
  }
  $('narrHist').onclick = abrirHistorico;
  $('ahFechar').onclick = fecharHistorico;
  back.addEventListener('click', e => { if (e.target === back) fecharHistorico(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !back.hidden) { e.preventDefault(); e.stopPropagation(); fecharHistorico(); } }, true);
  let tBusca = null; $('ahBusca').oninput = () => { clearTimeout(tBusca); tBusca = setTimeout(listar, 150); };
  $('ahLista').addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const id = +b.closest('.ah-it').dataset.id;
    const it = await tx('readonly', s => s.get(id)); if (!it) { listar(); return; }
    const nomeArq = 'narracao_' + String(L().nomeVoz(it.voice).split(' · ')[0]).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_') + '_' + (String(it.text || '').slice(0, 30).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'audio');
    if (b.dataset.a === 'ouvir') {
      if (ahUrl) URL.revokeObjectURL(ahUrl); ahUrl = URL.createObjectURL(it.audioBlob); ahAtual = id;
      const a = $('ahAudio'); a.src = ahUrl; a.play().catch(() => {}); listar();
    } else if (b.dataset.a === 'baixar') {
      if (L().baixarBlob) L().baixarBlob(it.audioBlob, nomeArq, $('ahFmt').value);
      else { const u = URL.createObjectURL(it.audioBlob), a = document.createElement('a'); a.href = u; a.download = nomeArq + '.wav'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
    } else if (b.dataset.a === 'usar') {
      L().preencherVozes($('narrIdioma'), $('narrVoz'), it.voice); localStorage.setItem(PREF.voz, $('narrVoz').value);
      $('narrVel').value = it.speed || 1; velTxt(); localStorage.setItem(PREF.vel, $('narrVel').value);
      resumo(); info(); logApp('Narração: voz ' + L().nomeVoz($('narrVoz').value).split(' · ')[0] + ' a ' + String($('narrVel').value).replace('.', ',') + '× selecionada a partir do histórico.', 'ok');
      fecharHistorico();
    } else if (b.dataset.a === 'excluir') {
      if (!confirm('Excluir este áudio do histórico?')) return;
      await tx('readwrite', s => s.delete(id));
      if (ahAtual === id) { const a = $('ahAudio'); a.pause(); a.removeAttribute('src'); a.load(); ahAtual = null; }
      listar();
    }
  });
  $('ahLimpar').onclick = async () => { if (!confirm('Apagar TODOS os áudios do histórico deste navegador?')) return; await tx('readwrite', s => s.clear()); const a = $('ahAudio'); a.pause(); a.removeAttribute('src'); a.load(); ahAtual = null; listar(); };

  /* ---------------------------- Geração ---------------------------- */
  function barra(p) { const c = $('narrBarC'); if (p === null) { c.style.display = 'none'; return; } c.style.display = 'block'; $('narrBar').style.width = p + '%'; }
  async function codificar(blob, fmt, ordem) {
    ordem = ordem || (fmt === 'mp3' ? ['mp3', 'ogg', 'wav'] : fmt === 'ogg' ? ['ogg', 'mp3', 'wav'] : ['wav']);
    for (const f of ordem) {
      try { const r = await L().converter(blob, f); return r.ext ? r : { blob: r.blob, ext: f }; }
      catch (e) { if (f === fmt) logApp('Narração: não foi possível usar ' + f.toUpperCase() + ' neste navegador; usando outro formato.', 'wa'); }
    }
    return { blob, ext: 'wav' };
  }

  /** Gera a narração e grava os arquivos no sistema de arquivos do Pyodide. Devolve JSON ou ''. */
  async function preparar(py) {
    if (!$('narrOn').checked) return '';
    const notas = JSON.parse(py.runPython("import sys, json\nif '/app' not in sys.path: sys.path.insert(0, '/app')\nimport gerador\njson.dumps(gerador.notas_para_narracao(SM))"));
    const alvos = notas.map((n, i) => [i, L().limparMd(n || '')]).filter(x => x[1]);
    if (!alvos.length) { logApp('Narração: nenhum slide tem notas do apresentador; arquivos gerados sem áudio.', 'wa'); return ''; }
    const voz = $('narrVoz').value || L().VOZ_PADRAO, vel = +$('narrVel').value || 1, fmt = $('narrFmt').value, pausa = 300;
    if (L().carregarRecursos) L().carregarRecursos({ semVoz: true });
    py.runPython("import shutil, os\nshutil.rmtree('/narr', ignore_errors=True)\nos.makedirs('/narr', exist_ok=True)");
    const man = { html: {}, pptx: {}, duracoes: {}, avancar: $('narrAuto').checked };
    let total = 0, aviso = '';
    barra(0);
    logApp('Narração: gerando o áudio de ' + alvos.length + ' slide(s) com a voz ' + L().nomeVoz(voz).split(' · ')[0] + '…');
    try {
      for (let k = 0; k < alvos.length; k++) {
        const [i, texto] = alvos[k];
        logApp('Narração: slide ' + (i + 1) + ' (' + (k + 1) + ' de ' + alvos.length + ')…');
        const r = await L().sintetizar(texto, voz, vel, pausa, { onAviso: t => { if (t !== aviso) { aviso = t; logApp('Narração: ' + t, 'wa'); } } });
        if (!r) continue;
        const h = await codificar(r.blob, fmt);
        const p = h.ext === 'mp3' || h.ext === 'wav' ? h : await codificar(r.blob, 'mp3', ['mp3', 'wav']);  // PowerPoint: MP3 (ou WAV)
        const grava = async (o, pre) => { const cam = '/narr/' + pre + i + '.' + o.ext; py.FS.writeFile(cam, new Uint8Array(await o.blob.arrayBuffer())); total += o.blob.size; return cam; };
        man.html[i] = await grava(h, 'h');
        man.pptx[i] = p === h ? man.html[i] : await grava(p, 'p');
        man.duracoes[i] = r.duracao;
        barra(Math.round((k + 1) / alvos.length * 100));
      }
    } finally { setTimeout(() => barra(null), 1000); }
    const dur = Object.values(man.duracoes).reduce((a, b) => a + b, 0);
    logApp('Narração pronta: ' + Object.keys(man.html).length + ' slide(s), ' + fmtDur(dur) + ', ' + fmtTam(total) + ' de áudio.', 'ok');
    return JSON.stringify(man);
  }
  window.Narracao = { preparar, notasAprox, abrirHistorico, fecharHistorico };
})();
