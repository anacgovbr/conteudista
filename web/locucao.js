/* =====================================================================================
   Conteudista — Aba "Locução" (texto em fala, Kokoro-82M, 100% no navegador)
   - Abas da aplicação: "Curso" (tudo o que já existia) e "Locução"
   - Motores em Web Worker:
     · Piper (locucao-piper-worker.js) — PADRÃO para português do Brasil (pt_BR-faber-medium, ~63 MB)
     · Kokoro-82M (locucao-worker.js) — mantido para inglês e para as vozes pt-BR experimentais
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
  const VOZ_PADRAO = 'piper:pt_BR-faber-medium';
  /* ---------------------------- Catálogo de idiomas e vozes ----------------------------
     Kokoro-82M v1.0: idiomas oficiais do VOICES.md (lang_code). Japonês (j) e mandarim (z) exigem o misaki em Python.
     Piper: catálogo da biblioteca (carregado sob demanda) — lista abaixo é o mínimo enquanto o catálogo não chega. */
  const KOKORO = [
    ['en-US', 'a', ['af_heart', 'af_bella', 'af_nicole', 'af_aoede', 'af_kore', 'af_sarah', 'af_nova', 'af_sky', 'af_alloy', 'af_jessica', 'af_river', 'am_fenrir', 'am_michael', 'am_puck', 'am_echo', 'am_eric', 'am_liam', 'am_onyx', 'am_santa', 'am_adam']],
    ['en-GB', 'b', ['bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily', 'bm_george', 'bm_fable', 'bm_lewis', 'bm_daniel']],
    ['es-ES', 'e', ['ef_dora', 'em_alex', 'em_santa']],
    ['fr-FR', 'f', ['ff_siwis']],
    ['hi-IN', 'h', ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi']],
    ['it-IT', 'i', ['if_sara', 'im_nicola']],
    ['pt-BR', 'p', ['pf_dora', 'pm_alex', 'pm_santa']]
  ];
  const KOKORO_RECOMENDADAS = new Set(['af_heart', 'af_bella', 'bf_emma', 'pf_dora']);
  const PIPER_MINIMO = ['pt_BR-faber-medium', 'pt_PT-tugão-medium', 'en_US-lessac-medium', 'en_US-amy-medium', 'en_GB-alan-medium', 'es_ES-davefx-medium', 'es_MX-ald-medium', 'fr_FR-siwis-medium', 'it_IT-paola-medium', 'de_DE-thorsten-medium']
    .map(id => ({ id, lang: id.split('-')[0], nome: id.split('-')[1], qualidade: id.split('-')[2] }));
  let piperCatalogo = (() => { try { const c = JSON.parse(localStorage.getItem('loc.piperVozes') || 'null'); return c && Array.isArray(c.vozes) && c.vozes.length ? c.vozes : null; } catch { return null; } })();
  const nomesIdioma = (() => { try { return new Intl.DisplayNames(['pt-BR'], { type: 'language' }); } catch { return null; } })();
  const nomeIdioma = code => { try { const n = nomesIdioma && nomesIdioma.of(code); return n ? n.charAt(0).toUpperCase() + n.slice(1) : code; } catch { return code; } };
  const piperVozes = () => { const l = piperCatalogo || PIPER_MINIMO; return l.some(v => v.id === 'pt_BR-faber-medium') ? l : [PIPER_MINIMO[0]].concat(l); };
  const idiomaDaVoz = v => {
    if (/^piper:/.test(v || '')) return String(v).slice(6).split('-')[0].replace('_', '-');
    const k = KOKORO.find(x => x[2].includes(v)); return k ? k[0] : 'en-US';
  };
  const nomeKokoro = id => { const n = id.split('_')[1] || id; return n.charAt(0).toUpperCase() + n.slice(1) + ' — ' + (id[1] === 'f' ? 'feminina' : 'masculina') + (KOKORO_RECOMENDADAS.has(id) ? ' ★' : ''); };
  const nomePiper = v => { const n = String(v.nome || '').replace(/_/g, ' '); return n.charAt(0).toUpperCase() + n.slice(1) + (v.qualidade ? ' (' + v.qualidade + ')' : '') + (v.falantes > 1 ? ' · ' + v.falantes + ' falantes' : ''); };
  const nomeVoz = v => {
    if (/^piper:/.test(v || '')) { const id = String(v).slice(6), x = piperVozes().find(y => y.id === id) || { nome: id.split('-')[1], qualidade: id.split('-')[2] }; return nomePiper(x) + ' — Piper, ' + nomeIdioma(idiomaDaVoz(v)); }
    return nomeKokoro(v).replace(' ★', '') + ' — Kokoro, ' + nomeIdioma(idiomaDaVoz(v));
  };
  const PREF = { migr: 'loc.migr117', migr118: 'loc.migr118', motor: 'loc.motor', fon: 'loc.fon', preload: 'loc.preload', dtype: 'loc.dtype', device: 'loc.device', voz: 'loc.voz', vel: 'loc.vel', pausa: 'loc.pausa' };

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


  const sec = document.createElement('section'); sec.className = 'card'; sec.id = 'secLoc'; sec.hidden = true;
  sec.innerHTML = '<h2>Locução — texto em fala no navegador</h2>' +
    '<p class="note">A voz é gerada <b>no seu computador</b>: <b>Piper</b> (padrão para português) ou <b>Kokoro-82M</b> (inglês e pt-BR experimental). O texto não é enviado a nenhum servidor; só o modelo da voz é baixado, uma vez. Os áudios ficam no <b>histórico local</b> deste navegador para não serem gerados de novo.</p>' +
    '<div class="loc-grid"><div>' +
    '<div class="loc-box"><h3>1. Motor de voz</h3>' +
      '<p class="cont" id="locMotorInfo" style="margin:0 0 8px"></p><p class="cont" id="locLocalInfo" style="margin:0 0 8px"></p>' +
      '<div id="tts-loading-container" class="tts-loading-container"><div id="tts-progress-bar" class="tts-progress-bar"></div></div>' +
      '<span id="tts-status-text" class="tts-status-text">Motor de voz desligado.</span>' +
      '<p class="cont" style="margin:6px 0 4px"><b>Opções do Kokoro</b> (vozes em inglês e pt-BR experimentais; não afetam o Piper)</p>' +
      '<div class="lin"><div><label for="locDtype">Precisão do modelo</label><select id="locDtype"><option value="fp32">fp32 — completo (~326 MB, recomendado; necessário para idiomas além do inglês)</option><option value="q8">q8 — 8 bits (~86 MB; só inglês)</option></select></div>' +
      '<div><label for="locDevice">Processamento</label><select id="locDevice"><option value="auto">Automático (WebGPU → WASM)</option><option value="wasm">Somente WASM (CPU)</option><option value="webgpu">Somente WebGPU (placa de vídeo)</option></select></div>' +
      '<div><label for="locFon">Fonemizador (idiomas além do inglês)</label><select id="locFon"><option value="auto">Automático (espeak-ng, como no Kokoro original; pt-BR com alternativa interna)</option><option value="espeak">Somente espeak-ng (WebAssembly)</option><option value="interno">Interno pt-BR (regras; só português)</option></select></div></div>' +
      '<p class="cont" id="locFonInfo">Para espanhol, francês, hindi, italiano e português o Kokoro recebe o texto convertido em fonemas pelo espeak-ng (mesmo processo do Kokoro original). Inglês usa o conversor do próprio Kokoro.</p>' +
      '<p class="acoes"><button type="button" id="locAtivar">Ativar motor de voz</button><button type="button" class="sec" id="locRemModelo" title="Apaga do navegador os arquivos do modelo e das vozes">Remover modelo baixado</button></p>' +
      '<label class="inl"><input type="checkbox" id="locPreload"> Ativar o motor automaticamente ao abrir a página</label>' +
    '</div>' +
    '<div class="loc-box"><h3>2. Texto</h3>' +
      '<div class="lin"><div><label for="locFonte">Trazer texto do curso</label><select id="locFonte"><option value="notas">Notas do apresentador (todos os slides)</option><option value="slides">Texto dos slides</option><option value="guia">Guia de treinamento</option></select></div>' +
      '<div style="flex:0"><button type="button" class="sec" id="locImportar">Importar</button></div></div>' +
      '<label for="locTexto" style="margin-top:10px">Texto a ser narrado</label>' +
      '<textarea id="locTexto" spellcheck="true" lang="pt-BR" placeholder="Digite, cole ou importe o texto. Frases bem pontuadas soam mais naturais."></textarea>' +
      '<p class="cont" id="locCont">0 caracteres</p>' +
      '<div class="lin" style="margin-top:8px"><div><label for="locMotor">Motor</label><select id="locMotor"><option value="piper">Piper (recomendado para português)</option><option value="kokoro">Kokoro-82M v1.0 (multilíngue)</option></select></div>' +
      '<div><label for="locIdioma">Idioma</label><select id="locIdioma"></select></div>' +
      '<div><label for="locVoz">Voz</label><select id="locVoz"></select></div></div>' +
      '<p class="cont" id="locIdiomaInfo" style="margin:4px 0 0"></p>' +
      '<div class="lin" style="margin-top:8px">' +
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
    if (nome === 'locucao') { carregarHistorico(); const mo = motorDe($('locVoz').value); if (!mo.pronto && !mo.carregando && !mo.falhou && $('locPreload').checked) ativarMotorDaVoz().catch(() => {}); }
  }
  abas.addEventListener('click', e => { const b = e.target.closest('button[data-aba]'); if (b) mostrarAba(b.dataset.aba); });
  // Voltar para "Curso" quando outras partes da aplicação precisarem (abas Guia/Apresentação, tutorial)
  document.addEventListener('click', e => { if (e.target.closest('#tg,#ts,#btnTour') && !sec.hidden) mostrarAba('curso'); }, true);

  /* ---------------------------- Seleção motor → idioma → voz ---------------------------- */
  function idiomasDoMotor(m) {
    if (m === 'kokoro') return KOKORO.map(k => k[0]);
    return [...new Set(piperVozes().map(v => v.lang.replace('_', '-')))].sort((a, b) => a === 'pt-BR' ? -1 : b === 'pt-BR' ? 1 : nomeIdioma(a).localeCompare(nomeIdioma(b), 'pt-BR'));
  }
  function montarIdiomas(preferido) {
    const m = $('locMotor').value, l = idiomasDoMotor(m);
    $('locIdioma').innerHTML = l.map(c => '<option value="' + c + '">' + esc(nomeIdioma(c)) + ' (' + c + ')</option>').join('');
    $('locIdioma').value = l.includes(preferido) ? preferido : l.includes('pt-BR') ? 'pt-BR' : l[0];
    montarVozes();
  }
  function montarVozes() {
    const m = $('locMotor').value, idi = $('locIdioma').value;
    let ops = [];
    if (m === 'kokoro') { const k = KOKORO.find(x => x[0] === idi); ops = k ? k[2].map(id => [id, nomeKokoro(id)]) : []; }
    else ops = piperVozes().filter(v => v.lang.replace('_', '-') === idi).sort((a, b) => (a.id === 'pt_BR-faber-medium' ? -1 : 0) || String(a.nome).localeCompare(String(b.nome))).map(v => ['piper:' + v.id, nomePiper(v)]);
    $('locVoz').innerHTML = ops.map(([v, n]) => '<option value="' + esc(v) + '">' + esc(n) + '</option>').join('');
    const nV = m === 'kokoro' ? KOKORO.reduce((a, k) => a + k[2].length, 0) : piperVozes().length;
    $('locIdiomaInfo').innerHTML = m === 'kokoro'
      ? 'Kokoro: ' + KOKORO.length + ' idiomas, ' + nV + ' vozes (★ = melhor avaliadas). Japonês e mandarim do Kokoro exigem o misaki em Python e não estão disponíveis no navegador.'
      : 'Piper: ' + idiomasDoMotor('piper').length + ' idioma(s), ' + nV + ' voz(es)' + (piperCatalogo ? '' : ' — carregando o catálogo completo…') + '. Cada voz é baixada uma vez quando usada.';
  }
  function escolherPadraoDoIdioma() {
    const idi = $('locIdioma').value, m = $('locMotor').value;
    const pref = m === 'kokoro' ? ({ 'pt-BR': 'pf_dora', 'en-US': 'af_heart', 'en-GB': 'bf_emma' })[idi] : (idi === 'pt-BR' ? 'piper:pt_BR-faber-medium' : null);
    montarVozes();
    if (pref && [...$('locVoz').options].some(o => o.value === pref)) $('locVoz').value = pref;
    localStorage.setItem(PREF.voz, $('locVoz').value); if (typeof atualizarMotorUI === 'function' && $('locAtivar')) atualizarMotorUI(); if (typeof contar === 'function') contar();
  }
  function selecionarVoz(v) {
    if (!v) v = VOZ_PADRAO;
    $('locMotor').value = /^piper:/.test(v) ? 'piper' : 'kokoro';
    if (/^piper:/.test(v) && !piperVozes().some(x => 'piper:' + x.id === v)) piperCatalogo = (piperCatalogo || PIPER_MINIMO.slice()).concat([{ id: v.slice(6), lang: v.slice(6).split('-')[0], nome: v.slice(6).split('-')[1], qualidade: v.slice(6).split('-')[2] }]);
    montarIdiomas(idiomaDaVoz(v));
    if ([...$('locVoz').options].some(o => o.value === v)) $('locVoz').value = v;
  }
  let catalogoCarregando = false;
  function carregarCatalogoPiper() {
    if (catalogoCarregando || (piperCatalogo && piperCatalogo.length > PIPER_MINIMO.length)) return;
    catalogoCarregando = true;
    let w; try { w = new Worker(new URL('locucao-piper-worker.js', scriptSrc), { type: 'module' }); } catch { catalogoCarregando = false; return; }
    const fim = () => { try { w.terminate(); } catch { /* */ } catalogoCarregando = false; };
    const t = setTimeout(fim, 60000);
    w.onmessage = e => {
      const m = e.data || {};
      if (m.tipo === 'vozes' && Array.isArray(m.vozes) && m.vozes.length) {
        piperCatalogo = m.vozes; localStorage.setItem('loc.piperVozes', JSON.stringify({ ts: Date.now(), vozes: m.vozes }));
        if ($('locMotor').value === 'piper') { const v = $('locVoz').value; montarIdiomas($('locIdioma').value); if ([...$('locVoz').options].some(o => o.value === v)) $('locVoz').value = v; }
        logApp('Locução: catálogo do Piper com ' + m.vozes.length + ' vozes.', 'ok');
      }
      if (m.tipo === 'vozes' || m.tipo === 'erro') { clearTimeout(t); fim(); if ($('locMotor').value === 'piper') montarVozesInfo(); }
    };
    w.onerror = () => { clearTimeout(t); fim(); };
    w.postMessage({ tipo: 'vozes' });
  }
  function montarVozesInfo() { const v = $('locVoz').value; montarVozes(); if ([...$('locVoz').options].some(o => o.value === v)) $('locVoz').value = v; }

  /* ---------------------------- Preferências ---------------------------- */
  const pref = (k, d) => { const v = localStorage.getItem(PREF[k]); return v === null ? d : v; };
  $('locPreload').checked = pref('preload', '1') === '1';
  $('locFon').value = pref('fon', 'auto'); if (!localStorage.getItem(PREF.migr118)) { localStorage.setItem(PREF.dtype, 'fp32'); localStorage.setItem(PREF.migr118, '1'); }  // 1.18: fp32 passa a ser o padrão do Kokoro
  $('locDtype').value = pref('dtype', 'fp32'); $('locDevice').value = pref('device', 'auto');
  // Migração 1.17: quem usava uma voz pt-BR do Kokoro passa para o Piper uma única vez (o Kokoro continua disponível)
  if (!localStorage.getItem(PREF.migr)) { const v = localStorage.getItem(PREF.voz); if (!v || /^p[fm]_/.test(v)) localStorage.setItem(PREF.voz, VOZ_PADRAO); localStorage.setItem(PREF.migr, '1'); }
  selecionarVoz(pref('voz', VOZ_PADRAO)); $('locVel').value = pref('vel', '1'); $('locPausa').value = pref('pausa', '300');
  const velTxt = () => { $('locVelV').textContent = (+$('locVel').value).toFixed(2).replace('.', ','); };
  velTxt();
  $('locPreload').onchange = () => localStorage.setItem(PREF.preload, $('locPreload').checked ? '1' : '0');
  $('locVoz').onchange = () => { localStorage.setItem(PREF.voz, $('locVoz').value); atualizarMotorUI(); };
  $('locMotor').onchange = () => { localStorage.setItem(PREF.motor, $('locMotor').value); montarIdiomas(idiomaDaVoz($('locVoz').value)); escolherPadraoDoIdioma(); if ($('locMotor').value === 'piper') carregarCatalogoPiper(); };
  $('locIdioma').onchange = () => escolherPadraoDoIdioma();
  $('locVel').oninput = () => { velTxt(); localStorage.setItem(PREF.vel, $('locVel').value); };
  $('locPausa').onchange = () => localStorage.setItem(PREF.pausa, $('locPausa').value);
  const reinicio = () => { localStorage.setItem(PREF.dtype, $('locDtype').value); localStorage.setItem(PREF.device, $('locDevice').value); if (tts.pronto || tts.carregando) { encerrarMotor(); status('Configuração alterada. Clique em “Ativar motor de voz”.'); } };
  $('locDtype').onchange = () => { reinicio(); atualizarMotorUI(); }; $('locDevice').onchange = reinicio;
  $('locFon').onchange = () => { localStorage.setItem(PREF.fon, $('locFon').value); if (tts.worker) tts.worker.postMessage({ tipo: 'fon', fon: $('locFon').value }); $('locFonInfo').textContent = 'Fonemizador alterado. Os próximos áudios usarão a nova opção.'; };

  /* ---------------------------- 4.1 Inicialização (worker) ---------------------------- */
  let currentAudioUrl = null, geracao = null, idGer = 0, itemAtual = null;
  const tts = { worker: null, pronto: false, carregando: null, info: null, ouvintes: new Set() };
  function status(t) { $('tts-status-text').innerText = t; }
  function chip(estado) { const c = $('locChip'); c.className = 'ch' + (estado === 'ok' ? ' ok' : estado === 'ld' ? ' ld' : ''); c.title = estado === 'ok' ? 'Motor de voz ativo' : estado === 'ld' ? 'Carregando motor de voz' : 'Motor de voz desligado'; }
  function ocupado(sim) {
    ['locAtivar', 'locGerar', 'locDtype', 'locDevice', 'locImportar', 'locRemModelo'].forEach(id => { $(id).disabled = sim; });
    $('locCancelar').disabled = !sim || !geracao;
    const mo = motorDe($('locVoz').value);
    $('locAtivar').textContent = mo.pronto ? '✓ Motor ativo (' + mo.nome + ')' : 'Ativar motor de voz (' + mo.nome + ')'; if (mo.pronto) $('locAtivar').disabled = true;
  }
  function encerrarMotor() { if (tts.worker) tts.worker.terminate(); tts.worker = null; tts.pronto = false; tts.carregando = null; atualizarMotorUI(); }
  /* ---------------------------- Piper (padrão pt-BR) ---------------------------- */
  const pip = { nome: 'Piper', worker: null, pronto: false, carregando: null, info: null, voz: null, ouvintes: new Set() };
  tts.nome = 'Kokoro';
  const ehPiper = v => /^piper:/.test(v || '');
  const motorDe = v => ehPiper(v) ? pip : tts;
  function atualizarMotorUI() {
    const v = $('locVoz').value, mo = motorDe(v), p = ehPiper(v);
    chip(mo.pronto ? 'ok' : mo.carregando ? 'ld' : '');
    $('locAtivar').textContent = mo.pronto ? '✓ Motor ativo (' + mo.nome + ')' : 'Ativar motor de voz (' + mo.nome + ')'; $('locAtivar').disabled = !!mo.pronto || !!mo.carregando;
    $('locMotorInfo').innerHTML = p
      ? 'Voz selecionada usa o <b>Piper</b> (padrão para português; cada voz ~20–120 MB na primeira vez; pronúncia pelo espeak-ng embutido). Velocidade ' + (pip.info && pip.info.nativo === false ? 'ajustada por processamento do áudio (WSOLA).' : 'ajustada no próprio modelo.')
      : 'Voz selecionada usa o <b>Kokoro-82M v1.0</b> (' + ($('locDtype').value === 'fp32' ? '~326 MB, fp32' : '~86 MB, q8') + '). Idioma: <b>' + esc(nomeIdioma(idiomaDaVoz(v))) + '</b> (lang_code “' + (KOKORO.find(k => k[2].includes(v)) || ['', '?'])[1] + '”).' + ($('locDtype').value !== 'fp32' && !/^[ab]/.test(v) ? ' <b>Atenção:</b> use fp32 para idiomas além do inglês.' : '');
    $('locVel').disabled = false; $('locVel').title = ''; velTxt();
    if (mo.pronto) status('✓ Motor de voz ativo (' + mo.nome + (mo.info ? ', ' + String(mo.info.device).toUpperCase() : '') + ').');
    else if (!mo.carregando) status('Motor ' + mo.nome + ' desligado.');
  }
  function encerrarPiper() { if (pip.worker) pip.worker.terminate(); pip.worker = null; pip.pronto = false; pip.carregando = null; atualizarMotorUI(); }
  function initPiper(vozSel, vel) {
    const voz = String(vozSel || ($('locMotor').value === 'piper' ? $('locVoz').value : VOZ_PADRAO)).replace(/^piper:/, '');
    vel = +vel > 0 ? +vel : (+$('locVel').value || 1);
    if (pip.pronto) return Promise.resolve(true);
    if (pip.carregando) return pip.carregando;
    const container = $('tts-loading-container'), progressBar = $('tts-progress-bar');
    container.style.display = 'block'; progressBar.style.width = '0%';
    status('Iniciando o Piper (voz ' + voz + '; o modelo é baixado só na primeira vez)…');
    chip('ld'); ocupado(true);
    pip.carregando = new Promise((ok, falha) => {
      try { pip.worker = new Worker(new URL('locucao-piper-worker.js', scriptSrc), { type: 'module' }); }
      catch (e) { pip.carregando = null; ocupado(false); falha(e); return; }
      pip.worker.onmessage = e => pip.ouvintes.forEach(f => f(e.data));
      pip.worker.onerror = e => { e.preventDefault && e.preventDefault(); pip.ouvintes.forEach(f => f({ tipo: 'erro', etapa: 'init', msg: (e && e.message) || 'Falha ao iniciar o worker do Piper.' })); };
      const ouvir = m => {
        if (m.tipo === 'progresso') { const pc = Math.round((m.loaded / m.total) * 100); progressBar.style.width = pc + '%'; status('Baixando a voz do Piper: ' + pc + '% (' + fmtTam(m.loaded) + ' de ' + fmtTam(m.total) + ')'); }
        else if (m.tipo === 'fase') status(m.fase === 'carregando' ? 'Carregando o Piper…' : 'Preparando a voz (primeira síntese de teste)…');
        else if (m.tipo === 'pronto') {
          pip.ouvintes.delete(ouvir); pip.pronto = true; pip.carregando = null; pip.falhou = false; pip.info = m; pip.velInit = m.velocidade || vel; container.style.display = 'none';
          ocupado(false); atualizarMotorUI(); logApp('Locução: Piper ativo (voz ' + m.voz + ', ' + m.sr + ' Hz, velocidade ' + (m.nativo ? 'nativa' : 'por WSOLA') + (m.local ? ', modelos deste site' : '') + (m.biblioteca ? ', biblioteca ' + (m.biblioteca === 'local' ? 'deste site' : 'do CDN') : '') + ').', 'ok'); ok(true);
        } else if (m.tipo === 'erro' && (m.etapa === 'init' || m.etapa === 'worker')) {
          pip.ouvintes.delete(ouvir); container.style.display = 'none';
          status('Erro ao carregar o Piper: ' + m.msg + ' — as vozes do Kokoro continuam disponíveis.');
          if (pip.worker) pip.worker.terminate(); pip.worker = null; pip.pronto = false; pip.carregando = null; pip.falhou = true; ocupado(false); atualizarMotorUI(); status('Erro ao carregar o Piper: ' + m.msg + ' — as vozes Kokoro continuam disponíveis; para tentar de novo, clique em “Ativar motor de voz (Piper)”.'); falha(new Error(m.msg));
        }
      };
      pip.ouvintes.add(ouvir);
      pip.worker.postMessage({ tipo: 'init', voz, velocidade: vel });
    });
    return pip.carregando;
  }
  const ativarMotorDaVoz = () => (ehPiper($('locVoz').value) ? initPiper() : initTTS());
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
          chip('ok'); ocupado(false); atualizarMotorUI(); logApp('Locução: Kokoro ativo (' + m.device + ', ' + m.dtype + ').', 'ok'); ok(true);
        } else if (m.tipo === 'erro' && (m.etapa === 'init' || m.etapa === 'worker')) {
          tts.ouvintes.delete(ouvir); container.style.display = 'none';
          status('Erro ao alocar modelo de IA: ' + m.msg);
          console.error('Erro crítico na inicialização do Kokoro-JS:', m.msg);
          encerrarMotor(); ocupado(false); status('Erro ao alocar modelo de IA (Kokoro): ' + m.msg); falha(new Error(m.msg));
        }
      };
      tts.ouvintes.add(ouvir);
      if (!tts.fonOuv) tts.fonOuv = tts.ouvintes.add(m => { if (m.tipo === 'aviso' && m.fon) { $('locFonInfo').textContent = m.msg + (m.fon === 'interno' ? ' (regras ortográficas; revise siglas e nomes próprios no texto se a pronúncia sair estranha)' : ''); logApp('Locução: ' + m.msg, 'ok'); } });
      tts.worker.postMessage({ tipo: 'init', dtype: $('locDtype').value, device: $('locDevice').value, fon: $('locFon').value });
    });
    return tts.carregando;
  }
  $('locAtivar').onclick = () => ativarMotorDaVoz().catch(() => {});
  $('locRemModelo').onclick = async () => {
    if (!confirm('Remover do navegador os arquivos baixados do modelo de voz e das vozes?\nEles serão baixados de novo na próxima ativação. O histórico de áudios não é apagado.')) return;
    encerrarMotor(); encerrarPiper();
    let n = 0; try { for (const k of await caches.keys()) if (/transformers|kokoro|onnx|piper/i.test(k)) { await caches.delete(k); n++; } } catch { /* sem Cache API */ }
    try {  // vozes do Piper ficam no armazenamento privado do site (OPFS)
      await new Promise(res => { const w = new Worker(new URL('locucao-piper-worker.js', scriptSrc), { type: 'module' }); const fim = () => { w.terminate(); res(); }; w.onmessage = e => { if (['removido', 'erro'].includes(e.data && e.data.tipo)) fim(); }; w.onerror = fim; w.postMessage({ tipo: 'remover' }); setTimeout(fim, 15000); });
      n++;
    } catch { /* sem OPFS */ }
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
  const nomeArquivo = (voice, texto) => 'locucao_' + String(voice).replace(/^piper:/, 'piper_').replace(/[^\w-]+/g, '_') + '_' + (texto.trim().slice(0, 30).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'audio') + '.wav';
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
    const eng = motorDe(selectedVoice);
    if (eng === pip && pip.pronto && pip.info && pip.info.nativo && Math.abs(speedRate - (pip.velInit || 1)) > 0.001) encerrarPiper();  // nova velocidade nativa: recarrega a sessão (modelo já está no navegador)
    if (!eng.pronto) {
      try { await (eng === pip ? initPiper(selectedVoice, speedRate) : initTTS()); }
      catch (e) { $('locAviso').innerHTML = '<div class="aviso er">Não foi possível ativar o motor ' + eng.nome + ': ' + esc(e.message) + (eng === pip ? ' Você pode usar as vozes Kokoro enquanto isso.' : '') + '</div>'; throw e; }
    }
    const textChunks = splitTextIntoChunks(textInput, /^[efhip][fm]_/.test(selectedVoice) ? 250 : 300);
    if (!textChunks.length) return null;
    const id = ++idGer, partes = []; let sr = 24000, baixo = 0;
    const genC = $('locGenCont'), genB = $('locGenBar'), genS = $('locGenSt'), t0 = performance.now();
    genC.style.display = 'block'; genB.style.width = '0%'; genS.textContent = 'Gerando trecho 1 de ' + textChunks.length + '…';
    geracao = { id, eng }; ocupado(true);
    try {
      await new Promise((ok, falha) => {
        const ouvir = m => {
          if (m.id !== id) return;
          if (m.tipo === 'trecho') {
            partes.push(m.pcm); sr = m.sr; if (m.rms < 1e-3) baixo++;
            const pct = Math.round(((m.i + 1) / m.n) * 100), seg = (performance.now() - t0) / 1000;
            genB.style.width = pct + '%';
            genS.textContent = 'Trecho ' + (m.i + 1) + ' de ' + m.n + ' gerado · ' + Math.round(seg) + ' s' + (m.i + 1 < m.n ? ' · restante ≈ ' + fmtDur(seg / (m.i + 1) * (m.n - m.i - 1)) : '');
          } else if (m.tipo === 'fim') { eng.ouvintes.delete(ouvir); m.cancelado ? falha(new Error('Geração cancelada.')) : ok(); }
          else if (m.tipo === 'erro') { eng.ouvintes.delete(ouvir); falha(new Error(m.msg)); }
        };
        eng.ouvintes.add(ouvir);
        eng.worker.postMessage({ tipo: 'gerar', id, trechos: textChunks, voice: selectedVoice, speed: speedRate });
      });
      // Une os buffers sem cliques e cria a URL final
      const buffer = mergePcmWithWebAudio(partes, sr, pausaMs), finalBlob = audioBufferToWavBlob(buffer), duracao = buffer.length / sr;
      // 6.2.2 Salvamento automático
      let novoId = null;
      try { novoId = await saveAudioToHistory(textInput, selectedVoice, speedRate, finalBlob, { pausa: pausaMs, duracao, dtype: eng.info && eng.info.dtype, device: eng.info && eng.info.device, motor: eng.nome, trechos: textChunks.length }); }
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
    try { await generateSpeechAdvanced(t, $('locVoz').value, +$('locVel').value || 1, +$('locPausa').value); const a = $('locAudio'); a.play().catch(() => {}); } catch { /* exibido na tela */ }
  };
  $('locCancelar').onclick = () => { if (geracao && geracao.eng && geracao.eng.worker) { geracao.eng.worker.postMessage({ tipo: 'cancelar', id: geracao.id }); $('locGenSt').textContent = 'Cancelando após o trecho atual…'; } };
  $('locLimpar').onclick = () => { $('locTexto').value = ''; contar(); $('locTexto').focus(); };

  /* ---------------------------- Contador / estimativa ---------------------------- */
  function contar() {
    const t = $('locTexto').value, n = t.length, ch = n ? splitTextIntoChunks(t, /^[efhip][fm]_/.test($('locVoz').value) ? 250 : 300).length : 0;
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
      $('locTexto').value = it.text; selecionarVoz(it.voice); localStorage.setItem(PREF.voz, it.voice); atualizarMotorUI(); $('locVel').value = it.speed; velTxt(); if (it.pausa !== undefined) $('locPausa').value = String(it.pausa); contar(); $('locTexto').focus();
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
    '<li>Aba <b>Locução</b> (<kbd>Alt+Shift+3</kbd>): gera áudio <b>no seu navegador</b>. O texto não sai do computador; só o modelo da voz é baixado e fica guardado.</li>' +
    '<li><b>Motor → Idioma → Voz</b>: <b>Piper</b> é o padrão para português (voz <b>Faber</b>) e oferece todos os idiomas do seu catálogo; <b>Kokoro-82M v1.0</b> oferece inglês (EUA e Reino Unido), espanhol, francês, hindi, italiano e português do Brasil (lang_code a, b, e, f, h, i, p), com precisão <b>fp32</b> recomendada. Japonês e mandarim do Kokoro não estão disponíveis no navegador.</li>' +
    '<li><b>Velocidade</b> funciona nos dois motores (no Piper, ajustada no modelo ou, se não for possível, por processamento do áudio sem alterar o tom).</li>' +
    '<li><b>Hospedagem local</b>: se o site publicar os modelos (pasta <code>modelos/</code>), eles são usados no lugar da internet — útil em redes que bloqueiam o Hugging Face.</li>' +
    '<li><b>1. Motor de voz</b>: “Ativar motor de voz” mostra o progresso do download. Usa a placa de vídeo (WebGPU) quando possível e, se não der, a CPU (WASM). Pode ativar sozinho ao abrir a página.</li>' +
    '<li><b>2. Texto</b>: digite, cole ou <b>importe</b> do curso (notas do apresentador, texto dos slides ou guia, sem marcações). Escolha a voz (padrão: <b>Faber</b>, Piper; ou as vozes Kokoro), a velocidade e a pausa entre frases. <kbd>Alt+Shift+N</kbd> gera.</li>' +
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
  contar(); carregarHistorico(); atualizarMotorUI();
  if ($('locMotor').value === 'piper') carregarCatalogoPiper();
  fetch(new URL('modelos/manifest.json', scriptSrc).href, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(m => {
    $('locLocalInfo').innerHTML = m && m.arquivos ? '✓ Modelos hospedados neste site: <b>' + esc((m.perfis || []).join(', ') || Object.keys(m.arquivos).length + ' arquivo(s)') + '</b>' + (m.vendor && Object.keys(m.vendor).length ? ' · bibliotecas locais: ' + esc(Object.keys(m.vendor).join(', ')) : '') + '. Os demais vêm da internet.' : 'Modelos baixados da internet (Hugging Face/jsDelivr). Para hospedá-los neste site, veja “Hospedagem local” no README.';
  }).catch(() => { $('locLocalInfo').textContent = ''; });
  if ($('locPreload').checked && !location.hash.startsWith('#cx=')) {
    const go = () => ativarMotorDaVoz().catch(() => {});
    if (document.readyState === 'complete') setTimeout(go, 800); else addEventListener('load', () => setTimeout(go, 800));
  }
  window.Locucao = { initTTS, initPiper, motorDe, selecionarVoz, idiomasDoMotor, KOKORO, generateSpeechAdvanced, splitTextIntoChunks, mergeAudioBlobsWithWebAudio, audioBufferToWavBlob, openHistoryDB, findCachedAudio, saveAudioToHistory, loadHistoryList, mostrarAba, limparMd };
})();
