/* =====================================================================================
   Conteudista — Aba "Locução" (texto em fala, Kokoro-82M, 100% no navegador)
   - Abas da aplicação: "Curso" (tudo o que já existia) e "Locução"
   - Motor em Web Worker (locucao-worker.js): WebGPU → fallback WASM, dtype q8 (~86 MB)
   - Fragmentação de texto (chunking), costura PCM via Web Audio API, WAV limpo
   - Histórico/cache persistente: IndexedDB "KokoroTTS_DB" / "audio_history" (índice text+voice+speed)
   - Importa texto do curso (notas do apresentador, slides ou guia) sem Markdown
   Integra-se sem alterar os outros arquivos: só precisa de <script src="locucao.js"></script>.
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch { /* sem log */ } };
  const fmtTam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const fmtDur = s => { s = Math.round(s); const m = Math.floor(s / 60); return m ? m + ' min ' + String(s % 60).padStart(2, '0') + ' s' : s + ' s'; };
  const VOZES = [
    ['Português do Brasil', [['pf_dora', 'Dora — feminina'], ['pm_alex', 'Alex — masculina'], ['pm_santa', 'Santa — masculina (alternativa)']]],
    ['Inglês (para textos em inglês)', [['af_heart', 'Heart — feminina (EUA)'], ['am_michael', 'Michael — masculina (EUA)'], ['bf_emma', 'Emma — feminina (Reino Unido)'], ['bm_george', 'George — masculina (Reino Unido)']]]
  ];
  const nomeVoz = v => { for (const [, l] of VOZES) for (const [id, n] of l) if (id === v) return n.split(' — ')[0] + ' (' + id + ')'; return v; };
  const PREF = { fon: 'loc.fon', preload: 'loc.preload', dtype: 'loc.dtype', device: 'loc.device', voz: 'loc.voz', vel: 'loc.vel', pausa: 'loc.pausa' };

  /* ---------------------------- Estilos (Opção B: CSS nativo) ---------------------------- */
  const css = `
.tts-loading-container{width:100%;background-color:rgba(51,65,85,.15);border-radius:9999px;height:10px;overflow:hidden;margin-bottom:16px;display:none}
.tts-progress-bar{background:linear-gradient(90deg,#1351b4 0%,#168821 100%);height:100%;width:0%;transition:width .3s ease-out}
.tts-status-text{font-size:12px;color:#636363;display:block;margin-bottom:8px}
#abasApp{display:flex;gap:4px;max-width:1500px;margin:14px auto 0;padding:0 20px}
#abasApp button{margin:0;border-radius:8px 8px 0 0;padding:9px 18px;font-weight:600;background:#fff;color:#1351b4;border:1px solid #cccccc;border-bottom:0;cursor:pointer}
#abasApp button.on{background:#0c326f;color:#fff;border-color:#0c326f}
#abasApp .ch{display:inline-block;width:8px;height:8px;border-radius:50%;background:#cccccc;margin-left:8px;vertical-align:1px}
#abasApp .ch.ok{background:#168821}#abasApp .ch.ld{background:#ffcd07;animation:locPisca 1s infinite}
@keyframes locPisca{50%{opacity:.3}}
#secLoc .loc-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:20px}
#secLoc .loc-box{border:1px solid #cccccc;border-radius:10px;padding:14px 16px;background:#f8f8f8;margin-bottom:14px}
#secLoc .loc-box h3{margin:0 0 8px;color:#0c326f;font-size:15px}
#secLoc .lin{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}#secLoc .lin>div{flex:1;min-width:150px}
#secLoc label{font-weight:600;font-size:13px;color:#0c326f;display:block;margin-bottom:4px}
#secLoc label.inl{display:inline-flex;gap:6px;align-items:center;font-weight:400;color:#333333}
#secLoc select,#secLoc input[type=search]{width:100%;padding:7px;border:1px solid #cccccc;border-radius:6px;font:inherit;background:#fff}
#secLoc textarea{width:100%;min-height:220px;padding:10px;border:1px solid #cccccc;border-radius:8px;font:14px/1.55 "Segoe UI",Roboto,Arial,sans-serif;resize:vertical}
#secLoc input[type=range]{width:100%}
#secLoc .cont{font-size:12.5px;color:#636363;margin:4px 0 0}
#secLoc audio{width:100%;margin:8px 0}
#secLoc .acoes button,#secLoc .acoes a{margin:4px 6px 4px 0}
#secLoc .aviso{font-size:13px;padding:8px 10px;border-radius:0 6px 6px 0;margin:8px 0;background:#e3f5e1;border-left:4px solid #168821}
#secLoc .aviso.wa{background:#fff5c2;border-left-color:#8a5c00}#secLoc .aviso.er{background:#fde0db;border-left-color:#e52207}
#secLoc .loc-hist{border:1px solid #cccccc;border-radius:10px;padding:12px;background:#fff;max-height:880px;display:flex;flex-direction:column}
#secLoc .loc-hist h3{margin:0 0 8px;color:#0c326f;font-size:15px}
#secLoc .hl{overflow:auto;flex:1;margin-top:8px;display:flex;flex-direction:column;gap:8px}
#secLoc .hc{border:1px solid #cccccc;border-radius:8px;padding:8px 10px;background:#f8f8f8}
#secLoc .hc.on{outline:2px solid #168821}
#secLoc .hc p{margin:0 0 4px;font-size:13px;line-height:1.4;max-height:3.9em;overflow:hidden}
#secLoc .hc small{display:block;color:#636363;font-size:11.5px}
#secLoc .hc .b{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
#secLoc .hc .b button{margin:0;padding:3px 8px;font-size:12px;font-weight:600}
#secLoc .vazio{color:#636363;font-size:13px;padding:10px}
@media(max-width:1000px){#secLoc .loc-grid{grid-template-columns:1fr}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------------------------- Estrutura: abas + seção ---------------------------- */
  const main = document.querySelector('main');
  const abas = document.createElement('nav'); abas.id = 'abasApp'; abas.setAttribute('aria-label', 'Áreas da aplicação');
  abas.innerHTML = '<button type="button" data-aba="curso" class="on" title="Guia, apresentação e arquivos">Curso</button>' +
    '<button type="button" data-aba="locucao" title="Texto em fala (Alt+Shift+3)">Locução <span class="ch" id="locChip" title="Motor de voz desligado"></span></button>';
  main.parentNode.insertBefore(abas, main);

  const vozOpts = VOZES.map(([g, l]) => '<optgroup label="' + g + '">' + l.map(([id, n]) => '<option value="' + id + '">' + n + '</option>').join('') + '</optgroup>').join('');
  const sec = document.createElement('section'); sec.className = 'card'; sec.id = 'secLoc'; sec.hidden = true;
  sec.innerHTML = '<h2>Locução — texto em fala no navegador</h2>' +
    '<p class="note">A voz é gerada <b>no seu computador</b> pelo modelo aberto <b>Kokoro-82M</b> (WebGPU ou WebAssembly). O texto não é enviado a nenhum servidor; só o modelo (~86 MB, uma vez) e o arquivo da voz são baixados. Os áudios ficam no <b>histórico local</b> deste navegador para não serem gerados de novo.</p>' +
    '<div class="loc-grid"><div>' +
    '<div class="loc-box"><h3>1. Motor de voz</h3>' +
      '<div id="tts-loading-container" class="tts-loading-container"><div id="tts-progress-bar" class="tts-progress-bar"></div></div>' +
      '<span id="tts-status-text" class="tts-status-text">Motor de voz desligado.</span>' +
      '<div class="lin"><div><label for="locDtype">Precisão do modelo</label><select id="locDtype"><option value="q8">q8 — 8 bits (~86 MB, recomendado)</option><option value="fp32">fp32 — completo (~326 MB; use se o áudio sair mudo ou com ruído)</option></select></div>' +
      '<div><label for="locDevice">Processamento</label><select id="locDevice"><option value="auto">Automático (WebGPU → WASM)</option><option value="wasm">Somente WASM (CPU)</option><option value="webgpu">Somente WebGPU (placa de vídeo)</option></select></div>' +
      '<div><label for="locFon">Pronúncia em português (fonemizador)</label><select id="locFon"><option value="auto">Automático (espeak-ng → interno)</option><option value="interno">Interno pt-BR (regras, sem download)</option><option value="espeak">espeak-ng completo (WebAssembly)</option></select></div></div>' +
      '<p class="cont" id="locFonInfo">O Kokoro precisa do texto convertido em fonemas. O modo Automático tenta o espeak-ng e, se o navegador não o oferecer em português, usa o fonemizador interno.</p>' +
      '<p class="acoes"><button type="button" id="locAtivar">Ativar motor de voz</button><button type="button" class="sec" id="locRemModelo" title="Apaga do navegador os arquivos do modelo e das vozes">Remover modelo baixado</button></p>' +
      '<label class="inl"><input type="checkbox" id="locPreload"> Ativar o motor automaticamente ao abrir a página</label>' +
    '</div>' +
    '<div class="loc-box"><h3>2. Texto</h3>' +
      '<div class="lin"><div><label for="locFonte">Trazer texto do curso</label><select id="locFonte"><option value="notas">Notas do apresentador (todos os slides)</option><option value="slides">Texto dos slides</option><option value="guia">Guia de treinamento</option></select></div>' +
      '<div style="flex:0"><button type="button" class="sec" id="locImportar">Importar</button></div></div>' +
      '<label for="locTexto" style="margin-top:10px">Texto a ser narrado</label>' +
      '<textarea id="locTexto" spellcheck="true" lang="pt-BR" placeholder="Digite, cole ou importe o texto. Frases bem pontuadas soam mais naturais."></textarea>' +
      '<p class="cont" id="locCont">0 caracteres</p>' +
      '<div class="lin" style="margin-top:8px"><div><label for="locVoz">Voz</label><select id="locVoz">' + vozOpts + '</select></div>' +
      '<div><label for="locVel">Velocidade: <span id="locVelV">1,00</span>×</label><input type="range" id="locVel" min="0.5" max="2" step="0.05" value="1"></div>' +
      '<div><label for="locPausa">Pausa entre frases</label><select id="locPausa"><option value="0">Sem pausa extra</option><option value="150">Curta (0,15 s)</option><option value="300" selected>Média (0,3 s)</option><option value="600">Longa (0,6 s)</option></select></div></div>' +
      '<p class="acoes"><button type="button" id="locGerar" title="Alt+Shift+N">Gerar locução</button><button type="button" class="sec" id="locCancelar" disabled>Cancelar</button><button type="button" class="sec" id="locLimpar">Limpar texto</button></p>' +
      '<div id="locGenCont" class="tts-loading-container"><div id="locGenBar" class="tts-progress-bar"></div></div><span id="locGenSt" class="tts-status-text"></span>' +
    '</div>' +
    '<div class="loc-box"><h3>3. Ouvir e baixar</h3>' +
      '<div id="locAviso"></div><audio id="locAudio" controls preload="none"></audio>' +
      '<p class="acoes"><a class="btn sec" id="locBaixar" href="#" download="locucao.wav" aria-disabled="true">Baixar .wav</a></p>' +
      '<p class="cont" id="locInfo">Nenhum áudio ainda.</p>' +
    '</div></div>' +
    '<aside class="loc-hist" aria-label="Histórico de locuções"><h3>Histórico local <span id="locHistN"></span></h3>' +
      '<input type="search" id="locBusca" placeholder="Buscar no histórico…" aria-label="Buscar no histórico">' +
      '<div class="hl" id="locHist"><div class="vazio">Carregando…</div></div>' +
      '<p class="cont" id="locUso"></p><p class="acoes"><button type="button" class="dan mini" id="locLimparHist">Limpar histórico de áudio</button></p>' +
    '</aside></div>';
  main.appendChild(sec);

  function mostrarAba(nome) {
    abas.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.aba === nome));
    [...main.children].forEach(el => { if (el.tagName === 'SECTION') el.hidden = nome === 'locucao' ? el !== sec : el === sec; });
    if (nome === 'locucao') { carregarHistorico(); if (!tts.pronto && !tts.carregando && $('locPreload').checked) initTTS().catch(() => {}); }
  }
  abas.addEventListener('click', e => { const b = e.target.closest('button[data-aba]'); if (b) mostrarAba(b.dataset.aba); });
  // Voltar para "Curso" quando outras partes da aplicação precisarem (abas Guia/Apresentação, tutorial)
  document.addEventListener('click', e => { if (e.target.closest('#tg,#ts,#btnTour') && !sec.hidden) mostrarAba('curso'); }, true);

  /* ---------------------------- Preferências ---------------------------- */
  const pref = (k, d) => { const v = localStorage.getItem(PREF[k]); return v === null ? d : v; };
  $('locPreload').checked = pref('preload', '1') === '1';
  $('locFon').value = pref('fon', 'auto'); $('locDtype').value = pref('dtype', 'q8'); $('locDevice').value = pref('device', 'auto');
  $('locVoz').value = pref('voz', 'pf_dora'); $('locVel').value = pref('vel', '1'); $('locPausa').value = pref('pausa', '300');
  const velTxt = () => { $('locVelV').textContent = (+$('locVel').value).toFixed(2).replace('.', ','); };
  velTxt();
  $('locPreload').onchange = () => localStorage.setItem(PREF.preload, $('locPreload').checked ? '1' : '0');
  $('locVoz').onchange = () => localStorage.setItem(PREF.voz, $('locVoz').value);
  $('locVel').oninput = () => { velTxt(); localStorage.setItem(PREF.vel, $('locVel').value); };
  $('locPausa').onchange = () => localStorage.setItem(PREF.pausa, $('locPausa').value);
  const reinicio = () => { localStorage.setItem(PREF.dtype, $('locDtype').value); localStorage.setItem(PREF.device, $('locDevice').value); if (tts.pronto || tts.carregando) { encerrarMotor(); status('Configuração alterada. Clique em “Ativar motor de voz”.'); } };
  $('locDtype').onchange = reinicio; $('locDevice').onchange = reinicio;
  $('locFon').onchange = () => { localStorage.setItem(PREF.fon, $('locFon').value); if (tts.worker) tts.worker.postMessage({ tipo: 'fon', fon: $('locFon').value }); $('locFonInfo').textContent = 'Fonemizador alterado. Os próximos áudios usarão a nova opção.'; };

  /* ---------------------------- 4.1 Inicialização (worker) ---------------------------- */
  let currentAudioUrl = null, geracao = null, idGer = 0, itemAtual = null;
  const tts = { worker: null, pronto: false, carregando: null, info: null, ouvintes: new Set() };
  function status(t) { $('tts-status-text').innerText = t; }
  function chip(estado) { const c = $('locChip'); c.className = 'ch' + (estado === 'ok' ? ' ok' : estado === 'ld' ? ' ld' : ''); c.title = estado === 'ok' ? 'Motor de voz ativo' : estado === 'ld' ? 'Carregando motor de voz' : 'Motor de voz desligado'; }
  function ocupado(sim) {
    ['locAtivar', 'locGerar', 'locDtype', 'locDevice', 'locImportar', 'locRemModelo'].forEach(id => { $(id).disabled = sim; });
    $('locCancelar').disabled = !sim || !geracao;
    $('locAtivar').textContent = tts.pronto ? '✓ Motor ativo' : 'Ativar motor de voz'; if (tts.pronto) $('locAtivar').disabled = true;
  }
  function encerrarMotor() { if (tts.worker) tts.worker.terminate(); tts.worker = null; tts.pronto = false; tts.carregando = null; chip(''); $('locAtivar').textContent = 'Ativar motor de voz'; $('locAtivar').disabled = false; }
  const scriptSrc = document.currentScript ? document.currentScript.src : location.href;
  function initTTS() {
    if (tts.pronto) return Promise.resolve(true);
    if (tts.carregando) return tts.carregando;
    const container = $('tts-loading-container'), progressBar = $('tts-progress-bar');
    container.style.display = 'block'; progressBar.style.width = '0%';
    status('Iniciando download do modelo de voz (~' + ($('locDtype').value === 'fp32' ? '326' : '86') + ' MB na primeira vez)…');
    chip('ld'); ocupado(true);
    tts.carregando = new Promise((ok, falha) => {
      try { tts.worker = new Worker(new URL('locucao-worker.js', scriptSrc), { type: 'module' }); }
      catch (e) { falha(e); return; }
      tts.worker.onmessage = e => tts.ouvintes.forEach(f => f(e.data));
      tts.worker.onerror = e => { e.preventDefault && e.preventDefault(); tts.ouvintes.forEach(f => f({ tipo: 'erro', etapa: 'init', msg: (e && e.message) || 'Falha ao iniciar o worker.' })); };
      const ouvir = m => {
        if (m.tipo === 'progresso') {
          const percent = Math.round((m.loaded / m.total) * 100);
          progressBar.style.width = percent + '%';
          status('Baixando componentes da IA: ' + percent + '% (' + fmtTam(m.loaded) + ' de ' + fmtTam(m.total) + ')');
        } else if (m.tipo === 'fase') {
          if (m.fase === 'carregando') status('Preparando o modelo (' + String(m.device).toUpperCase() + ', ' + $('locDtype').value + ')…');
          else if (m.fase === 'ready' || m.fase === 'compilando') status('Compilando modelo na GPU/CPU local…');
        } else if (m.tipo === 'aviso' && !m.fon) { status(m.msg); }
        else if (m.tipo === 'pronto') {
          tts.ouvintes.delete(ouvir); tts.pronto = true; tts.info = m; container.style.display = 'none';
          status('✓ Motor de voz ativado localmente! (' + String(m.device).toUpperCase() + ', ' + m.dtype + ')');
          chip('ok'); ocupado(false); logApp('Locução: motor de voz ativo (' + m.device + ', ' + m.dtype + ').', 'ok'); ok(true);
        } else if (m.tipo === 'erro' && (m.etapa === 'init' || m.etapa === 'worker')) {
          tts.ouvintes.delete(ouvir); container.style.display = 'none';
          status('Erro ao alocar modelo de IA: ' + m.msg);
          console.error('Erro crítico na inicialização do Kokoro-JS:', m.msg);
          encerrarMotor(); ocupado(false); falha(new Error(m.msg));
        }
      };
      tts.ouvintes.add(ouvir);
      if (!tts.fonOuv) tts.fonOuv = tts.ouvintes.add(m => { if (m.tipo === 'aviso' && m.fon) { $('locFonInfo').textContent = m.msg + (m.fon === 'interno' ? ' (regras ortográficas; revise siglas e nomes próprios no texto se a pronúncia sair estranha)' : ''); logApp('Locução: ' + m.msg, 'ok'); } });
      tts.worker.postMessage({ tipo: 'init', dtype: $('locDtype').value, device: $('locDevice').value, fon: $('locFon').value });
    });
    return tts.carregando;
  }
  $('locAtivar').onclick = () => initTTS().catch(() => {});
  $('locRemModelo').onclick = async () => {
    if (!confirm('Remover do navegador os arquivos baixados do modelo de voz e das vozes?\nEles serão baixados de novo na próxima ativação. O histórico de áudios não é apagado.')) return;
    encerrarMotor();
    let n = 0; try { for (const k of await caches.keys()) if (/transformers|kokoro|onnx/i.test(k)) { await caches.delete(k); n++; } } catch { /* sem Cache API */ }
    status('Modelo removido deste navegador (' + n + ' cache(s)).'); usoArmazenamento();
  };

  /* ---------------------------- 4.2 Fragmentação (chunking) ---------------------------- */
  function splitTextIntoChunks(text, maxLength = 300) {
    const sentences = text.match(/[^.!?;\n]+[.!?;\n]*|\n/g) || [text];
    const pedacos = [];
    for (const s of sentences) {  // frase maior que o limite: quebra em vírgulas/espaços
      if (s.length <= maxLength) { pedacos.push(s); continue; }
      let resto = s;
      while (resto.length > maxLength) {
        let corte = Math.max(resto.lastIndexOf(',', maxLength), resto.lastIndexOf(' ', maxLength));
        if (corte < maxLength * 0.4) corte = maxLength;
        pedacos.push(resto.slice(0, corte + 1)); resto = resto.slice(corte + 1);
      }
      pedacos.push(resto);
    }
    const chunks = []; let currentChunk = '';
    for (const sentence of pedacos) {
      if ((currentChunk + sentence).length > maxLength) { if (currentChunk.trim()) chunks.push(currentChunk.trim()); currentChunk = sentence; }
      else currentChunk += sentence;
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks.filter(c => /[\p{L}\p{N}]/u.test(c));
  }

  /* ---------------------------- 4.3 Costura PCM via Web Audio API ---------------------------- */
  function mergePcmWithWebAudio(partes, sr, pausaMs) {
    const fade = Math.round(sr * 0.006), pausa = Math.round(sr * pausaMs / 1000);
    const total = partes.reduce((a, p, i) => a + p.length + (i < partes.length - 1 ? pausa : 0), 0);
    let buffer;
    try { buffer = new AudioBuffer({ numberOfChannels: 1, length: Math.max(1, total), sampleRate: sr }); }
    catch { const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext; buffer = new Ctx(1, Math.max(1, total), sr).createBuffer(1, Math.max(1, total), sr); }
    const out = buffer.getChannelData(0); let off = 0;
    partes.forEach((p, i) => {
      out.set(p, off);
      const n = Math.min(fade, Math.floor(p.length / 2));
      for (let k = 0; k < n; k++) { const g = k / n; out[off + k] *= g; out[off + p.length - 1 - k] *= g; }  // sem estalos nas emendas
      off += p.length + (i < partes.length - 1 ? pausa : 0);
    });
    return buffer;
  }
  // Mantida conforme a especificação (usada para áudios em Blob, se necessário)
  async function mergeAudioBlobsWithWebAudio(blobs) {
    const Ctx = window.AudioContext || window.webkitAudioContext, audioCtx = new Ctx();
    const audioBuffers = await Promise.all(blobs.map(async b => audioCtx.decodeAudioData(await b.arrayBuffer())));
    if (!audioBuffers.length) { await audioCtx.close(); return null; }
    const ch = audioBuffers[0].numberOfChannels, sr = audioBuffers[0].sampleRate, len = audioBuffers.reduce((a, b) => a + b.length, 0);
    const finalBuffer = audioCtx.createBuffer(ch, len, sr);
    for (let c = 0; c < ch; c++) { let o = 0; for (const b of audioBuffers) { finalBuffer.getChannelData(c).set(b.getChannelData(c), o); o += b.length; } }
    await audioCtx.close();
    return audioBufferToWavBlob(finalBuffer);
  }

  /* ---------------------------- 4.4 Cabeçalho RIFF/WAV ---------------------------- */
  function audioBufferToWavBlob(buffer) {
    const numOfChan = buffer.numberOfChannels, length = buffer.length * numOfChan * 2 + 44, bufferArr = new ArrayBuffer(length), view = new DataView(bufferArr), channels = [], sampleRate = buffer.sampleRate;
    let i, sample, offset = 0, pos = 0;
    const setUint16 = d => { view.setUint16(pos, d, true); pos += 2; };
    const setUint32 = d => { view.setUint32(pos, d, true); pos += 4; };
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(sampleRate); setUint32(sampleRate * 2 * numOfChan); setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);
    for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
    while (pos < length) {
      for (i = 0; i < numOfChan; i++) { sample = Math.max(-1, Math.min(1, channels[i][offset] || 0)); sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF; view.setInt16(pos, sample, true); pos += 2; }
      offset++;
    }
    return new Blob([bufferArr], { type: 'audio/wav' });
  }

  /* ---------------------------- 6. Histórico persistente (IndexedDB) ---------------------------- */
  let dbP = null;
  function openHistoryDB() {
    if (dbP) return dbP;
    dbP = new Promise((resolve, reject) => {
      const request = indexedDB.open('KokoroTTS_DB', 1);
      request.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('audio_history')) {
          const store = db.createObjectStore('audio_history', { keyPath: 'id', autoIncrement: true });
          store.createIndex('lookup_idx', ['text', 'voice', 'speed'], { unique: false });
        }
      };
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); dbP = null; }; resolve(db); };
      request.onerror = () => { dbP = null; reject(request.error); };
    });
    return dbP;
  }
  async function tx(modo, fn) {
    const db = await openHistoryDB();
    return new Promise((ok, err) => { const t = db.transaction('audio_history', modo), r = fn(t.objectStore('audio_history')); t.oncomplete = () => ok(r && r.result); t.onerror = () => err(t.error); t.onabort = () => err(t.error); });
  }
  async function findCachedAudio(text, voice, speed, pausa) {
    try {
      const l = await tx('readonly', s => s.index('lookup_idx').getAll([text, voice, speed]));
      const it = (l || []).filter(x => x.pausa === undefined || x.pausa === pausa).sort((a, b) => b.id - a.id)[0];
      return it || null;
    } catch { return null; }
  }
  async function saveAudioToHistory(text, voice, speed, blob, extra) {
    return tx('readwrite', s => s.add(Object.assign({ text, voice, speed, audioBlob: blob, createdAt: new Date().toISOString() }, extra || {})));
  }
  const removerDoHistorico = id => tx('readwrite', s => s.delete(id));

  /* ---------------------------- 4.5 Geração principal ---------------------------- */
  function definirAudio(blob, nome, info, origem) {
    if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = URL.createObjectURL(blob);
    const a = $('locAudio'); a.src = currentAudioUrl;
    const d = $('locBaixar'); d.href = currentAudioUrl; d.download = nome; d.removeAttribute('aria-disabled');
    $('locInfo').textContent = info;
    $('locAviso').innerHTML = origem ? '<div class="aviso">' + esc(origem) + '</div>' : '';
    return currentAudioUrl;
  }
  const nomeArquivo = (voice, texto) => 'locucao_' + voice + '_' + (texto.trim().slice(0, 30).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'audio') + '.wav';
  const infoAudio = it => fmtDur(it.duracao || 0) + ' · ' + fmtTam(it.audioBlob.size) + ' · ' + nomeVoz(it.voice) + ' · ' + String(it.speed).replace('.', ',') + '× · ' + new Date(it.createdAt).toLocaleString('pt-BR');

  async function generateSpeechAdvanced(textInput, selectedVoice = 'pf_dora', speedRate = 1.0, pausaMs = 300) {
    if (!textInput.trim()) return null;
    // 6.2.1 Checagem de cache
    const cache = await findCachedAudio(textInput, selectedVoice, speedRate, pausaMs);
    if (cache && cache.audioBlob) {
      itemAtual = cache.id;
      const url = definirAudio(cache.audioBlob, nomeArquivo(selectedVoice, textInput), infoAudio(cache), 'Carregado do histórico local (nenhum processamento necessário).');
      carregarHistorico(); return url;
    }
    if (!tts.pronto) await initTTS();
    const textChunks = splitTextIntoChunks(textInput, /^p[fm]_/.test(selectedVoice) ? 250 : 300);
    if (!textChunks.length) return null;
    const id = ++idGer, partes = []; let sr = 24000, baixo = 0;
    const genC = $('locGenCont'), genB = $('locGenBar'), genS = $('locGenSt'), t0 = performance.now();
    genC.style.display = 'block'; genB.style.width = '0%'; genS.textContent = 'Gerando trecho 1 de ' + textChunks.length + '…';
    geracao = { id }; ocupado(true);
    try {
      await new Promise((ok, falha) => {
        const ouvir = m => {
          if (m.id !== id) return;
          if (m.tipo === 'trecho') {
            partes.push(m.pcm); sr = m.sr; if (m.rms < 1e-3) baixo++;
            const pct = Math.round(((m.i + 1) / m.n) * 100), seg = (performance.now() - t0) / 1000;
            genB.style.width = pct + '%';
            genS.textContent = 'Trecho ' + (m.i + 1) + ' de ' + m.n + ' gerado · ' + Math.round(seg) + ' s' + (m.i + 1 < m.n ? ' · restante ≈ ' + fmtDur(seg / (m.i + 1) * (m.n - m.i - 1)) : '');
          } else if (m.tipo === 'fim') { tts.ouvintes.delete(ouvir); m.cancelado ? falha(new Error('Geração cancelada.')) : ok(); }
          else if (m.tipo === 'erro') { tts.ouvintes.delete(ouvir); falha(new Error(m.msg)); }
        };
        tts.ouvintes.add(ouvir);
        tts.worker.postMessage({ tipo: 'gerar', id, trechos: textChunks, voice: selectedVoice, speed: speedRate });
      });
      // Une os buffers sem cliques e cria a URL final
      const buffer = mergePcmWithWebAudio(partes, sr, pausaMs), finalBlob = audioBufferToWavBlob(buffer), duracao = buffer.length / sr;
      // 6.2.2 Salvamento automático
      let novoId = null;
      try { novoId = await saveAudioToHistory(textInput, selectedVoice, speedRate, finalBlob, { pausa: pausaMs, duracao, dtype: tts.info && tts.info.dtype, device: tts.info && tts.info.device, trechos: textChunks.length }); }
      catch (e) { logApp('Locução: não foi possível salvar no histórico (' + e.message + ').', 'wa'); }
      itemAtual = novoId;
      const seg = (performance.now() - t0) / 1000;
      const url = definirAudio(finalBlob, nomeArquivo(selectedVoice, textInput), infoAudio({ duracao, audioBlob: finalBlob, voice: selectedVoice, speed: speedRate, createdAt: new Date().toISOString() }),
        'Gerado agora em ' + fmtDur(seg) + ' (' + textChunks.length + ' trecho(s)) e salvo no histórico local.');
      if (baixo > textChunks.length / 2) $('locAviso').innerHTML += '<div class="aviso wa">O áudio saiu muito baixo ou mudo. Experimente a precisão <b>fp32</b> no painel “Motor de voz”.</div>';
      genS.textContent = '✓ Concluído: ' + fmtDur(duracao) + ' de áudio.';
      logApp('Locução gerada: ' + fmtDur(duracao) + ', ' + fmtTam(finalBlob.size) + '.', 'ok');
      carregarHistorico();
      return url;
    } catch (error) {
      if (!/cancelad/i.test(error.message)) console.error('Falha no pipeline avançado de síntese:', error);
      genS.textContent = (/cancelad/i.test(error.message) ? '' : 'Erro: ') + error.message;
      if (!/cancelad/i.test(error.message)) $('locAviso').innerHTML = '<div class="aviso er">' + esc(error.message) + '</div>';
      throw error;
    } finally { geracao = null; ocupado(false); setTimeout(() => { genC.style.display = 'none'; }, 1200); }
  }

  $('locGerar').onclick = async () => {
    const t = $('locTexto').value;
    if (!t.trim()) { $('locAviso').innerHTML = '<div class="aviso wa">Digite ou importe um texto primeiro.</div>'; $('locTexto').focus(); return; }
    try { await generateSpeechAdvanced(t, $('locVoz').value, +$('locVel').value, +$('locPausa').value); const a = $('locAudio'); a.play().catch(() => {}); } catch { /* exibido na tela */ }
  };
  $('locCancelar').onclick = () => { if (geracao && tts.worker) { tts.worker.postMessage({ tipo: 'cancelar', id: geracao.id }); $('locGenSt').textContent = 'Cancelando após o trecho atual…'; } };
  $('locLimpar').onclick = () => { $('locTexto').value = ''; contar(); $('locTexto').focus(); };

  /* ---------------------------- Contador / estimativa ---------------------------- */
  function contar() {
    const t = $('locTexto').value, n = t.length, ch = n ? splitTextIntoChunks(t, /^p[fm]_/.test($('locVoz').value) ? 250 : 300).length : 0;
    const pal = (t.match(/[\p{L}\p{N}]+/gu) || []).length, seg = pal / (2.6 * (+$('locVel').value || 1));
    $('locCont').textContent = n.toLocaleString('pt-BR') + ' caracteres · ' + pal.toLocaleString('pt-BR') + ' palavras · ' + ch + ' trecho(s) · ≈ ' + fmtDur(seg) + ' de áudio';
  }
  ['input'].forEach(ev => $('locTexto').addEventListener(ev, contar)); $('locVel').addEventListener('input', contar); $('locVoz').addEventListener('change', contar);

  /* ---------------------------- Importar texto do curso ---------------------------- */
  function limparMd(md) {
    let t = md.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '').replace(/<!--[\s\S]*?-->/g, '');
    t = t.split('\n').map(l => {
      if (/^\s*\|?\s*:?-{3,}/.test(l)) return '';
      if (/^\s*\|/.test(l)) return l.replace(/^\s*\||\|\s*$/g, '').split(/(?<!\\)\|/).map(c => c.trim()).filter(Boolean).join(', ') + '.';
      return l.replace(/^\s*>\s?(\[!\w+\]\s*)?/, '').replace(/^\s*#{1,6}\s+(.*)$/, '$1.').replace(/^\s*([-*]|\d+\.)\s+(\[[ x]\]\s+)?/, '');
    }).join('\n');
    t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\W)\*(\S.*?\S|\S)\*(?=\W|$)/g, '$1$2').replace(/`([^`]+)`/g, '$1');
    t = t.replace(/[ \t]+/g, ' ').split('\n').map(l => l.trim()).map(l => l && !/[.!?:;,…]$/.test(l) ? l + '.' : l).join('\n').replace(/\.\.(?!\.)/g, '.');
    return t.replace(/\n{3,}/g, '\n\n').trim();
  }
  function slidesDe(md) { return md.replace(/^---\n[\s\S]*?\n---\n/, '').split(/\n---\s*\n/).map(p => p.trim()).filter(Boolean); }
  function textoDoCurso(fonte) {
    const g = ($('g') && $('g').value) || '', s = ($('s') && $('s').value) || '';
    if (fonte === 'guia') return limparMd(g);
    if (fonte === 'slides') return slidesDe(s).map(limparMd).filter(Boolean).join('\n\n');
    return slidesDe(s).map(p => { const m = p.match(/<!--\s*notas:\s*([\s\S]*?)-->/); return m ? limparMd(m[1]) : ''; }).filter(Boolean).join('\n\n');
  }
  $('locImportar').onclick = () => {
    const f = $('locFonte').value, t = textoDoCurso(f);
    if (!t) { $('locAviso').innerHTML = '<div class="aviso wa">Nada para importar: ' + (f === 'notas' ? 'a apresentação não tem <code>&lt;!-- notas: … --&gt;</code>' : f === 'slides' ? 'a apresentação está vazia' : 'o guia está vazio') + ' na aba Curso.</div>'; return; }
    if ($('locTexto').value.trim() && !confirm('Substituir o texto atual pelo conteúdo importado?')) return;
    $('locTexto').value = t; contar(); $('locAviso').innerHTML = '<div class="aviso">Texto importado (' + t.length.toLocaleString('pt-BR') + ' caracteres, sem marcações Markdown). Revise antes de gerar.</div>';
  };

  /* ---------------------------- 6.3/6.4 Lista do histórico ---------------------------- */
  let urlTemp = null, tLista = null;
  async function loadHistoryList() {
    let l = [];
    try { l = await tx('readonly', s => s.getAll()); } catch (e) { $('locHist').innerHTML = '<div class="vazio">Histórico indisponível neste navegador (' + esc(e.message) + ').</div>'; return; }
    l.sort((a, b) => b.id - a.id);
    const q = ($('locBusca').value || '').toLowerCase().trim(), vis = q ? l.filter(x => (x.text || '').toLowerCase().includes(q) || (x.voice || '').includes(q)) : l;
    const tot = l.reduce((a, x) => a + (x.audioBlob ? x.audioBlob.size : 0), 0);
    $('locHistN').textContent = '(' + l.length + (l.length ? ' · ' + fmtTam(tot) : '') + ')';
    if (!vis.length) { $('locHist').innerHTML = '<div class="vazio">' + (l.length ? 'Nada encontrado.' : 'Nenhum áudio gerado ainda. Os áudios gerados aparecem aqui e podem ser ouvidos e baixados sem novo processamento.') + '</div>'; return; }
    $('locHist').innerHTML = vis.map(x => '<div class="hc' + (x.id === itemAtual ? ' on' : '') + '" data-id="' + x.id + '"><p title="' + esc(x.text.slice(0, 600)) + '">' + esc(x.text.slice(0, 220)) + (x.text.length > 220 ? '…' : '') + '</p>' +
      '<small>' + esc(nomeVoz(x.voice)) + ' · ' + String(x.speed).replace('.', ',') + '× · ' + fmtDur(x.duracao || 0) + ' · ' + fmtTam(x.audioBlob ? x.audioBlob.size : 0) + '</small><small>' + new Date(x.createdAt).toLocaleString('pt-BR') + (x.device ? ' · ' + String(x.device).toUpperCase() + ' ' + (x.dtype || '') : '') + '</small>' +
      '<div class="b"><button type="button" data-a="ouvir">▶ Ouvir</button><button type="button" class="sec" data-a="baixar">Baixar</button><button type="button" class="sec" data-a="texto" title="Copiar o texto e as configurações para o editor">Usar texto</button><button type="button" class="dan" data-a="excluir">Excluir</button></div></div>').join('');
  }
  function carregarHistorico() { clearTimeout(tLista); tLista = setTimeout(() => { loadHistoryList(); usoArmazenamento(); }, 60); }
  $('locBusca').oninput = carregarHistorico;
  $('locHist').addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const id = +b.closest('.hc').dataset.id;
    const it = await tx('readonly', s => s.get(id)); if (!it) { carregarHistorico(); return; }
    if (b.dataset.a === 'ouvir') { itemAtual = id; definirAudio(it.audioBlob, nomeArquivo(it.voice, it.text), infoAudio(it), 'Carregado do histórico local.'); $('locAudio').play().catch(() => {}); carregarHistorico(); }
    else if (b.dataset.a === 'baixar') {
      if (urlTemp) URL.revokeObjectURL(urlTemp); urlTemp = URL.createObjectURL(it.audioBlob);
      const a = document.createElement('a'); a.href = urlTemp; a.download = nomeArquivo(it.voice, it.text); document.body.appendChild(a); a.click(); a.remove();
    } else if (b.dataset.a === 'texto') {
      $('locTexto').value = it.text; $('locVoz').value = it.voice; $('locVel').value = it.speed; velTxt(); if (it.pausa !== undefined) $('locPausa').value = String(it.pausa); contar(); $('locTexto').focus();
    } else if (b.dataset.a === 'excluir') {
      if (!confirm('Excluir este áudio do histórico local?')) return;
      await removerDoHistorico(id);
      if (itemAtual === id) { if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null; $('locAudio').removeAttribute('src'); $('locAudio').load(); $('locBaixar').setAttribute('aria-disabled', 'true'); $('locBaixar').href = '#'; $('locInfo').textContent = 'Nenhum áudio.'; $('locAviso').innerHTML = ''; itemAtual = null; }
      carregarHistorico();
    }
  });
  $('locBaixar').addEventListener('click', e => { if ($('locBaixar').getAttribute('aria-disabled') === 'true') e.preventDefault(); });
  $('locLimparHist').onclick = async () => { if (!confirm('Apagar TODOS os áudios do histórico local?')) return; await tx('readwrite', s => s.clear()); carregarHistorico(); };
  async function usoArmazenamento() {
    try { if (!navigator.storage || !navigator.storage.estimate) return; const e = await navigator.storage.estimate(); $('locUso').textContent = 'Armazenamento deste site no navegador: ' + fmtTam(e.usage || 0) + ' de ' + fmtTam(e.quota || 0) + ' disponíveis (inclui o modelo de voz).'; } catch { /* sem estimativa */ }
  }

  /* ---------------------------- Integração: atalhos, ajuda, limpeza ---------------------------- */
  addEventListener('keydown', e => {
    if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
    if (e.code === 'Digit3') { e.preventDefault(); mostrarAba('locucao'); $('locTexto').focus(); }
    else if (e.code === 'Digit1' || e.code === 'Digit2') { if (!sec.hidden) mostrarAba('curso'); }
    else if (e.code === 'KeyN' && !sec.hidden) { e.preventDefault(); if (!$('locGerar').disabled) $('locGerar').click(); }
  }, true);
  const AJUDA = '<h4>Locução (texto em fala)</h4><ul>' +
    '<li>Aba <b>Locução</b> (<kbd>Alt+Shift+3</kbd>): gera áudio <b>no seu navegador</b> com o modelo Kokoro-82M. O texto não sai do computador; só o modelo (~86 MB, uma vez) e a voz são baixados e ficam guardados.</li>' +
    '<li><b>1. Motor de voz</b>: “Ativar motor de voz” mostra o progresso do download. Usa a placa de vídeo (WebGPU) quando possível e, se não der, a CPU (WASM). Pode ativar sozinho ao abrir a página.</li>' +
    '<li><b>2. Texto</b>: digite, cole ou <b>importe</b> do curso (notas do apresentador, texto dos slides ou guia, sem marcações). Escolha a voz (<b>Dora</b> feminina ou <b>Alex</b> masculina, pt-BR), a velocidade e a pausa entre frases. <kbd>Alt+Shift+N</kbd> gera.</li>' +
    '<li>Textos longos são divididos em trechos e emendados sem estalos. É possível cancelar.</li>' +
    '<li><b>3. Ouvir e baixar</b>: player e botão <b>Baixar .wav</b>.</li>' +
    '<li><b>Histórico local</b>: cada áudio fica guardado neste navegador. Gerar de novo o mesmo texto com a mesma voz, velocidade e pausa usa o histórico (“Carregado do histórico local”), sem processar. Cada item tem Ouvir, Baixar, Usar texto e Excluir.</li>' +
    '<li><b>Pronúncia em português</b>: o modelo recebe o texto convertido em fonemas. O modo Automático usa o espeak-ng (WebAssembly) quando disponível e, se o navegador não oferecer português, o <b>fonemizador interno pt-BR</b> (regras, sem download). Siglas são soletradas ou lidas como palavra; números saem por extenso. Se uma palavra soar estranha, escreva-a como se fala.</li>' +
    '<li>Áudio mudo ou com ruído? Troque a precisão para <b>fp32</b> (download maior). Lento? Use “Somente WASM” ou textos menores. “Remover modelo baixado” libera espaço.</li></ul>';
  const KB = '<div class="kbG"><h4>Locução</h4><table class="kbT"><tr><td style="width:46%"><kbd>Alt + Shift + 3</kbd></td><td>Abrir a aba Locução</td></tr><tr><td><kbd>Alt + Shift + N</kbd></td><td>Gerar locução (na aba Locução)</td></tr><tr><td><kbd>Alt + Shift + 1 / 2</kbd></td><td>Voltar à aba Curso (Guia / Apresentação)</td></tr></table></div>';
  new MutationObserver(() => {
    const c = document.getElementById('hlpC');
    if (c && !c.querySelector('[data-loc]')) { const d = document.createElement('div'); d.className = 'hs'; d.dataset.loc = '1'; d.innerHTML = AJUDA; c.appendChild(d); }
    const k = document.getElementById('kbF');
    if (k && !document.querySelector('[data-lockb]')) { const bd = k.closest('.md-bd'); if (bd) { const d = document.createElement('div'); d.dataset.lockb = '1'; d.innerHTML = KB; bd.appendChild(d.firstChild); bd.lastChild.dataset.lockb = '1'; } }
    if (document.querySelector('.tr-pop') && !sec.hidden) mostrarAba('curso');
  }).observe(document.body, { childList: true, subtree: true });
  const logEl = $('log');
  if (logEl) new MutationObserver(() => {
    if (/Dados locais apagados/.test(logEl.lastChild && logEl.lastChild.textContent || '')) {
      tx('readwrite', s => s.clear()).then(carregarHistorico).catch(() => {});
    }
  }).observe(logEl, { childList: true });

  /* ---------------------------- Montagem ---------------------------- */
  contar(); carregarHistorico();
  if ($('locPreload').checked && !location.hash.startsWith('#cx=')) {
    const go = () => initTTS().catch(() => {});
    if (document.readyState === 'complete') setTimeout(go, 800); else addEventListener('load', () => setTimeout(go, 800));
  }
  window.Locucao = { initTTS, generateSpeechAdvanced, splitTextIntoChunks, mergeAudioBlobsWithWebAudio, audioBufferToWavBlob, openHistoryDB, findCachedAudio, saveAudioToHistory, loadHistoryList, mostrarAba, limparMd };
})();
