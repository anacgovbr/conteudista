/* =====================================================================================
   Conteudista — Aba "Locução" (texto em fala, 100% no navegador)
   Interface simples: Idioma → Voz → Velocidade → Pausa. O motor de cada voz fica escondido:
     · Piper (locucao-piper-worker.js) — voz padrão Faber (português do Brasil) e catálogo do Piper
     · Kokoro-82M v1.0 (locucao-worker.js) — inglês, espanhol, francês, hindi, italiano e português
   Se a voz escolhida não puder ser preparada, usa automaticamente uma voz alternativa do mesmo idioma.
   - Histórico/cache: IndexedDB "KokoroTTS_DB" / "audio_history" (índice text+voice+speed)
   - Download em MP3 (padrão), OGG ou WAV (audio-codec.js)
   - API para a narração dos slides: Locucao.sintetizar(), Locucao.preencherVozes() …
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch { /* sem log */ } };
  const fmtTam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const fmtDur = s => { s = Math.round(s); const m = Math.floor(s / 60); return m ? m + ' min ' + String(s % 60).padStart(2, '0') + ' s' : s + ' s'; };
  const scriptSrc = document.currentScript ? document.currentScript.src : location.href;
  const VOZ_PADRAO = 'piper:pt_BR-faber-medium';

  /* ---------------------------- Catálogo (interno) ---------------------------- */
  const KOKORO = [
    ['en-US', 'a', ['af_heart', 'af_bella', 'af_nicole', 'af_aoede', 'af_kore', 'af_sarah', 'af_nova', 'af_sky', 'af_alloy', 'af_jessica', 'af_river', 'am_fenrir', 'am_michael', 'am_puck', 'am_echo', 'am_eric', 'am_liam', 'am_onyx', 'am_santa', 'am_adam']],
    ['en-GB', 'b', ['bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily', 'bm_george', 'bm_fable', 'bm_lewis', 'bm_daniel']],
    ['es-ES', 'e', ['ef_dora', 'em_alex', 'em_santa']],
    ['fr-FR', 'f', ['ff_siwis']],
    ['hi-IN', 'h', ['hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi']],
    ['it-IT', 'i', ['if_sara', 'im_nicola']],
    ['pt-BR', 'p', ['pf_dora', 'pm_alex', 'pm_santa']]
  ];
  const KOKORO_RECOMENDADAS = new Set(['af_heart', 'af_bella', 'bf_emma', 'pf_dora', 'ef_dora', 'ff_siwis', 'if_sara', 'hf_alpha']);
  const GENERO_PIPER = { faber: 'masculina', 'tugão': 'masculina', lessac: 'feminina', amy: 'feminina', alan: 'masculina', davefx: 'masculina', ald: 'masculina', siwis: 'feminina', paola: 'feminina', thorsten: 'masculina' };
  const PIPER_MINIMO = ['pt_BR-faber-medium', 'pt_PT-tugão-medium', 'en_US-lessac-medium', 'en_US-amy-medium', 'en_GB-alan-medium', 'es_ES-davefx-medium', 'es_MX-ald-medium', 'fr_FR-siwis-medium', 'it_IT-paola-medium', 'de_DE-thorsten-medium']
    .map(id => ({ id, lang: id.split('-')[0], nome: id.split('-')[1], qualidade: id.split('-')[2] }));
  let piperCatalogo = (() => { try { const c = JSON.parse(localStorage.getItem('loc.piperVozes') || 'null'); return c && Array.isArray(c.vozes) && c.vozes.length ? c.vozes : null; } catch { return null; } })();
  const nomesIdioma = (() => { try { return new Intl.DisplayNames(['pt-BR'], { type: 'language' }); } catch { return null; } })();
  const nomeIdioma = code => { try { const n = nomesIdioma && nomesIdioma.of(code); return n ? n.charAt(0).toUpperCase() + n.slice(1) : code; } catch { return code; } };
  const cap = s => { s = String(s || '').replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
  const piperVozes = () => { const l = piperCatalogo || PIPER_MINIMO; return l.some(v => v.id === 'pt_BR-faber-medium') ? l : [PIPER_MINIMO[0]].concat(l); };
  const ehPiper = v => /^piper:/.test(v || '');
  const QUAL = { high: 4, medium: 3, low: 2, x_low: 1 };
  let catCache = null;
  /** Lista unificada: [{ v, lang, nome, rec }] — sem nomes de motores. */
  function catalogo() {
    if (catCache) return catCache;
    const l = [];
    for (const [lang, , ids] of KOKORO) ids.forEach((id, o) => l.push({ v: id, lang, nome: cap(id.split('_')[1]) + ' — ' + (id[1] === 'f' ? 'feminina' : 'masculina'), rec: KOKORO_RECOMENDADAS.has(id), k: 1, o }));
    const melhor = new Map();
    for (const p of piperVozes()) {
      const lang = String(p.lang || p.id.split('-')[0]).replace('_', '-'), chave = lang + '|' + p.nome, atual = melhor.get(chave);
      if (atual && atual.id === 'pt_BR-faber-medium') continue;
      if (!atual || p.id === 'pt_BR-faber-medium' || (QUAL[p.qualidade] || 0) > (QUAL[atual.qualidade] || 0)) melhor.set(chave, Object.assign({ langN: lang }, p));
    }
    for (const p of melhor.values()) {
      const g = GENERO_PIPER[p.nome];
      l.push({ v: 'piper:' + p.id, lang: p.langN, nome: cap(p.nome) + (g ? ' — ' + g : ''), rec: p.id === 'pt_BR-faber-medium', k: 0 });
    }
    const porIdioma = new Map();
    l.forEach(x => { if (!porIdioma.has(x.lang)) porIdioma.set(x.lang, []); porIdioma.get(x.lang).push(x); });
    for (const lista of porIdioma.values()) {
      if (!lista.some(x => x.rec)) (lista.find(x => x.k) || lista[0]).rec = true;
      lista.sort((a, b) => (b.rec - a.rec) || (a.v === VOZ_PADRAO ? -1 : b.v === VOZ_PADRAO ? 1 : 0) || (b.k - a.k) || ((a.o || 0) - (b.o || 0)) || a.nome.localeCompare(b.nome, 'pt-BR'));
      const vistos = new Map();
      lista.forEach(x => { const base = x.nome.split(' — ')[0], n = (vistos.get(base) || 0) + 1; vistos.set(base, n); if (n > 1) x.nome = x.nome.replace(base, base + ' (' + n + ')'); });
    }
    catCache = { lista: l, porIdioma };
    return catCache;
  }
  function idiomas() {
    return [...catalogo().porIdioma.keys()].sort((a, b) => a === 'pt-BR' ? -1 : b === 'pt-BR' ? 1 : nomeIdioma(a).localeCompare(nomeIdioma(b), 'pt-BR'));
  }
  const vozesDoIdioma = lang => catalogo().porIdioma.get(lang) || [];
  function idiomaDaVoz(v) {
    const x = catalogo().lista.find(y => y.v === v); if (x) return x.lang;
    if (ehPiper(v)) return String(v).slice(6).split('-')[0].replace('_', '-');
    const k = KOKORO.find(z => z[2].includes(v)); return k ? k[0] : 'pt-BR';
  }
  function nomeVoz(v) {
    const x = catalogo().lista.find(y => y.v === v), n = x ? x.nome.split(' — ')[0] : cap(ehPiper(v) ? String(v).slice(6).split('-')[1] : String(v).split('_')[1] || v);
    return n + ' · ' + nomeIdioma(idiomaDaVoz(v));
  }
  function alternativaPara(v) {
    const outro = vozesDoIdioma(idiomaDaVoz(v)).filter(x => ehPiper(x.v) !== ehPiper(v));
    return (outro.find(x => x.rec) || outro[0] || {}).v || null;
  }
  function preencherVozes(selIdioma, selVoz, voz) {
    voz = voz || VOZ_PADRAO;
    const lang = idiomaDaVoz(voz), ls = idiomas();
    selIdioma.innerHTML = ls.map(c => '<option value="' + c + '">' + esc(nomeIdioma(c)) + '</option>').join('');
    selIdioma.value = ls.includes(lang) ? lang : 'pt-BR';
    preencherListaVozes(selIdioma.value, selVoz, voz);
  }
  function preencherListaVozes(lang, selVoz, voz) {
    const l = vozesDoIdioma(lang), rec = l.filter(x => x.rec), out = l.filter(x => !x.rec);
    const op = x => '<option value="' + esc(x.v) + '">' + esc(x.nome) + (x.v === VOZ_PADRAO ? ' (padrão)' : '') + '</option>';
    selVoz.innerHTML = (rec.length ? '<optgroup label="Recomendadas">' + rec.map(op).join('') + '</optgroup>' : '') + (out.length ? '<optgroup label="Outras vozes">' + out.map(op).join('') + '</optgroup>' : '');
    selVoz.value = voz && l.some(x => x.v === voz) ? voz : (rec[0] || l[0] || {}).v || '';
  }
  function ligarSelects(selIdioma, selVoz, aoMudar) {
    selIdioma.addEventListener('change', () => { preencherListaVozes(selIdioma.value, selVoz, null); aoMudar && aoMudar(); });
    selVoz.addEventListener('change', () => aoMudar && aoMudar());
  }
  const PREF = { migr: 'loc.migr117', migr118: 'loc.migr118', fon: 'loc.fon', preload: 'loc.preload', dtype: 'loc.dtype', device: 'loc.device', voz: 'loc.voz', vel: 'loc.vel', pausa: 'loc.pausa', fmt: 'loc.fmt' };

  /* ---------------------------- Estilos ---------------------------- */
  const css = `
.tts-loading-container{width:100%;background-color:rgba(51,65,85,.15);border-radius:9999px;height:10px;overflow:hidden;margin:6px 0 8px;display:none}
.tts-progress-bar{background:linear-gradient(90deg,#1351b4 0%,#168821 100%);height:100%;width:0%;transition:width .3s ease-out}
.tts-status-text{font-size:13px;color:#636363;display:block;margin-bottom:6px;min-height:1.2em}
#abasApp{display:flex;gap:4px;max-width:1500px;margin:14px auto 0;padding:0 20px}
#abasApp button{margin:0;border-radius:8px 8px 0 0;padding:9px 18px;font-weight:600;background:#fff;color:#1351b4;border:1px solid #cccccc;border-bottom:0;cursor:pointer}
#abasApp button.on{background:#0c326f;color:#fff;border-color:#0c326f}
#abasApp .ch{display:inline-block;width:8px;height:8px;border-radius:50%;background:#cccccc;margin-left:8px;vertical-align:1px}
#abasApp .ch.ok{background:#168821}#abasApp .ch.ld{background:#ffcd07;animation:locPisca 1s infinite}
@keyframes locPisca{50%{opacity:.3}}
#secLoc .loc-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:20px}
#secLoc .loc-box{border:1px solid #cccccc;border-radius:10px;padding:14px 16px;background:#f8f8f8;margin-bottom:14px}
#secLoc .loc-box h3{margin:0 0 8px;color:#0c326f;font-size:15px}
#secLoc details.loc-box>summary{cursor:pointer;font-weight:600;color:#0c326f}
#secLoc details.loc-box[open]>summary{margin-bottom:10px}
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
#secLoc .tec{font-size:12px;color:#636363;margin:4px 0}
@media(max-width:1000px){#secLoc .loc-grid{grid-template-columns:1fr}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------------------------- Estrutura: abas + seção ---------------------------- */
  const main = document.querySelector('main');
  const abas = document.createElement('nav'); abas.id = 'abasApp'; abas.setAttribute('aria-label', 'Áreas da aplicação');
  abas.innerHTML = '<button type="button" data-aba="curso" class="on" title="Guia, apresentação e arquivos">Curso</button>' +
    '<button type="button" data-aba="locucao" title="Texto em fala (Alt+Shift+3)">Locução <span class="ch" id="locChip" title="Voz não preparada"></span></button>';
  main.parentNode.insertBefore(abas, main);
  const sec = document.createElement('section'); sec.className = 'card'; sec.id = 'secLoc'; sec.hidden = true;
  sec.innerHTML = '<h2>Locução</h2>' +
    '<p class="note">Transforme texto em fala. O áudio é gerado <b>no seu computador</b>; o texto não é enviado a nenhum servidor.</p>' +
    '<div class="loc-grid"><div>' +
    '<div class="loc-box"><h3>1. Texto</h3>' +
      '<div class="lin"><div><label for="locFonte">Trazer texto do curso</label><select id="locFonte"><option value="notas">Notas do apresentador (todos os slides)</option><option value="slides">Texto dos slides</option><option value="guia">Guia de treinamento</option></select></div>' +
      '<div style="flex:0"><button type="button" class="sec" id="locImportar">Importar</button></div></div>' +
      '<label for="locTexto" style="margin-top:10px">Texto a ser narrado</label>' +
      '<textarea id="locTexto" spellcheck="true" lang="pt-BR" placeholder="Digite, cole ou importe o texto. Frases bem pontuadas soam mais naturais."></textarea>' +
      '<p class="cont" id="locCont">0 caracteres</p>' +
    '</div>' +
    '<div class="loc-box"><h3>2. Voz</h3>' +
      '<div class="lin"><div><label for="locIdioma">Idioma</label><select id="locIdioma"></select></div>' +
      '<div><label for="locVoz">Voz</label><select id="locVoz"></select></div></div>' +
      '<div class="lin" style="margin-top:8px">' +
      '<div><label for="locVel">Velocidade: <span id="locVelV">1,00</span>×</label><input type="range" id="locVel" min="0.5" max="2" step="0.05" value="1"></div>' +
      '<div><label for="locPausa">Pausa entre frases</label><select id="locPausa"><option value="0">Sem pausa extra</option><option value="150">Curta</option><option value="300" selected>Média</option><option value="600">Longa</option></select></div></div>' +
      '<p class="acoes"><button type="button" id="locGerar" title="Alt+Shift+N">Gerar locução</button><button type="button" class="sec" id="locCancelar" disabled>Cancelar</button><button type="button" class="sec" id="locLimpar">Limpar texto</button></p>' +
      '<div id="locBarC" class="tts-loading-container"><div id="locBar" class="tts-progress-bar"></div></div><span id="locSt" class="tts-status-text" role="status" aria-live="polite"></span>' +
    '</div>' +
    '<div class="loc-box"><h3>3. Ouvir e baixar</h3>' +
      '<div id="locAviso"></div><audio id="locAudio" controls preload="none"></audio>' +
      '<div class="lin"><div style="flex:0 1 220px"><label for="locFmt">Formato do arquivo</label><select id="locFmt"><option value="mp3">MP3 (padrão)</option><option value="ogg">OGG (menor)</option><option value="wav">WAV (sem compressão)</option></select></div>' +
      '<div style="flex:0"><button type="button" class="sec" id="locBaixar" disabled>Baixar</button></div></div>' +
      '<p class="cont" id="locInfo">Nenhum áudio ainda.</p>' +
    '</div>' +
    '<details class="loc-box" id="locAvancado"><summary>Opções avançadas</summary>' +
      '<p class="tec" id="locTec">Nenhuma voz preparada.</p><p class="tec" id="locLocalInfo"></p>' +
      '<div class="lin"><div><label for="locDtype">Qualidade das vozes Kokoro</label><select id="locDtype"><option value="fp32">Máxima (recomendada; necessária fora do inglês)</option><option value="q8">Reduzida (só inglês; download menor)</option></select></div>' +
      '<div><label for="locDevice">Processamento</label><select id="locDevice"><option value="auto">Automático</option><option value="wasm">Somente processador</option><option value="webgpu">Somente placa de vídeo</option></select></div>' +
      '<div><label for="locFon">Pronúncia (vozes Kokoro)</label><select id="locFon"><option value="auto">Automática</option><option value="espeak">Somente espeak-ng</option><option value="interno">Regras internas (português)</option></select></div></div>' +
      '<p class="tec" id="locFonInfo"></p>' +
      '<p class="acoes"><button type="button" class="sec" id="locAtivar">Preparar a voz agora</button><button type="button" class="sec" id="locRemModelo">Remover vozes baixadas</button></p>' +
      '<label class="inl"><input type="checkbox" id="locPreload"> Preparar a voz ao abrir a página</label>' +
    '</details>' +
    '</div>' +
    '<aside class="loc-hist" aria-label="Histórico de locuções"><h3>Histórico <span id="locHistN"></span></h3>' +
      '<input type="search" id="locBusca" placeholder="Buscar no histórico…" aria-label="Buscar no histórico">' +
      '<div class="hl" id="locHist"><div class="vazio">Carregando…</div></div>' +
      '<p class="cont" id="locUso"></p><p class="acoes"><button type="button" class="dan mini" id="locLimparHist">Limpar histórico</button></p>' +
    '</aside></div>';
  main.appendChild(sec);
  function mostrarAba(nome) {
    abas.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.aba === nome));
    [...main.children].forEach(el => { if (el.tagName === 'SECTION') el.hidden = nome === 'locucao' ? el !== sec : el === sec; });
    if (nome === 'locucao') { carregarHistorico(); const mo = motorDe($('locVoz').value); if (!mo.pronto && !mo.carregando && !mo.falhou && $('locPreload').checked) ativarMotorDaVoz().catch(() => {}); }
  }
  abas.addEventListener('click', e => { const b = e.target.closest('button[data-aba]'); if (b) mostrarAba(b.dataset.aba); });
  document.addEventListener('click', e => { if (e.target.closest('#tg,#ts,#btnTour') && !sec.hidden) mostrarAba('curso'); }, true);

  /* ---------------------------- Preferências ---------------------------- */
  const pref = (k, d) => { const v = localStorage.getItem(PREF[k]); return v === null ? d : v; };
  if (!localStorage.getItem(PREF.migr)) { const v = localStorage.getItem(PREF.voz); if (!v || /^p[fm]_/.test(v)) localStorage.setItem(PREF.voz, VOZ_PADRAO); localStorage.setItem(PREF.migr, '1'); }
  if (!localStorage.getItem(PREF.migr118)) { localStorage.setItem(PREF.dtype, 'fp32'); localStorage.setItem(PREF.migr118, '1'); }
  $('locPreload').checked = pref('preload', '1') === '1';
  $('locFon').value = pref('fon', 'auto'); $('locDtype').value = pref('dtype', 'fp32'); $('locDevice').value = pref('device', 'auto');
  $('locVel').value = pref('vel', '1'); $('locPausa').value = pref('pausa', '300'); $('locFmt').value = pref('fmt', 'mp3');
  preencherVozes($('locIdioma'), $('locVoz'), pref('voz', VOZ_PADRAO));
  const velTxt = () => { $('locVelV').textContent = (+$('locVel').value).toFixed(2).replace('.', ','); };
  velTxt();
  ligarSelects($('locIdioma'), $('locVoz'), () => { localStorage.setItem(PREF.voz, $('locVoz').value); atualizarMotorUI(); contar(); });
  $('locPreload').onchange = () => localStorage.setItem(PREF.preload, $('locPreload').checked ? '1' : '0');
  $('locVel').oninput = () => { velTxt(); localStorage.setItem(PREF.vel, $('locVel').value); };
  $('locPausa').onchange = () => localStorage.setItem(PREF.pausa, $('locPausa').value);
  $('locFmt').onchange = () => localStorage.setItem(PREF.fmt, $('locFmt').value);
  const reinicio = () => { localStorage.setItem(PREF.dtype, $('locDtype').value); localStorage.setItem(PREF.device, $('locDevice').value); if (tts.pronto || tts.carregando) encerrarMotor(); };
  $('locDtype').onchange = () => { reinicio(); atualizarMotorUI(); }; $('locDevice').onchange = reinicio;
  $('locFon').onchange = () => { localStorage.setItem(PREF.fon, $('locFon').value); if (tts.worker) tts.worker.postMessage({ tipo: 'fon', fon: $('locFon').value }); };

  /* ---------------------------- Estado e mensagens ---------------------------- */
  let currentAudioUrl = null, currentBlob = null, currentNome = 'locucao', geracao = null, idGer = 0, itemAtual = null;
  const tts = { nome: 'Kokoro', worker: null, pronto: false, carregando: null, info: null, ouvintes: new Set() };
  const pip = { nome: 'Piper', worker: null, pronto: false, carregando: null, info: null, ouvintes: new Set() };
  const motorDe = v => ehPiper(v) ? pip : tts;
  function status(t) { $('locSt').textContent = t || ''; }
  function tec(t) { $('locTec').textContent = t; }
  function progresso(pct) { const c = $('locBarC'); if (pct === null) { c.style.display = 'none'; return; } c.style.display = 'block'; $('locBar').style.width = Math.max(0, Math.min(100, pct)) + '%'; }
  function chip(estado) { const c = $('locChip'); c.className = 'ch' + (estado === 'ok' ? ' ok' : estado === 'ld' ? ' ld' : ''); c.title = estado === 'ok' ? 'Voz pronta' : estado === 'ld' ? 'Preparando a voz' : 'Voz não preparada'; }
  function ocupado(sim) {
    ['locGerar', 'locImportar', 'locRemModelo', 'locAtivar', 'locDtype', 'locDevice'].forEach(id => { $(id).disabled = sim; });
    $('locCancelar').disabled = !sim;
    if (!sim) atualizarMotorUI();
  }
  function atualizarMotorUI() {
    const mo = motorDe($('locVoz').value);
    chip(mo.pronto ? 'ok' : mo.carregando ? 'ld' : '');
    $('locAtivar').disabled = !!mo.pronto || !!mo.carregando;
    $('locAtivar').textContent = mo.pronto ? '✓ Voz pronta' : 'Preparar a voz agora';
    const p = pip.info, k = tts.info;
    tec('Motores: Piper ' + (pip.pronto ? 'ativo' + (p ? ' (' + p.voz + ', ' + p.sr + ' Hz, velocidade ' + (p.nativo ? 'no modelo' : 'por processamento do áudio') + (p.biblioteca ? ', biblioteca ' + (p.biblioteca === 'local' ? 'do site' : 'do CDN') : '') + ')' : '') : pip.falhou ? 'indisponível' : 'desligado') +
      ' · Kokoro ' + (tts.pronto ? 'ativo' + (k ? ' (' + String(k.device).toUpperCase() + ', ' + k.dtype + ')' : '') : tts.falhou ? 'indisponível' : 'desligado') + '. Voz atual: ' + $('locVoz').value + '.');
  }
  function encerrarMotor() { if (tts.worker) tts.worker.terminate(); tts.worker = null; tts.pronto = false; tts.carregando = null; atualizarMotorUI(); }
  function encerrarPiper() { if (pip.worker) pip.worker.terminate(); pip.worker = null; pip.pronto = false; pip.carregando = null; atualizarMotorUI(); }

  /* ---------------------------- Motores (internos) ---------------------------- */
  function initPiper(vozSel, vel) {
    const voz = String(ehPiper(vozSel) ? vozSel : VOZ_PADRAO).replace(/^piper:/, '');
    vel = +vel > 0 ? +vel : (+$('locVel').value || 1);
    if (pip.pronto) return Promise.resolve(true);
    if (pip.carregando) return pip.carregando;
    progresso(0); status('Preparando a voz…'); chip('ld');
    pip.carregando = new Promise((ok, falha) => {
      try { pip.worker = new Worker(new URL('locucao-piper-worker.js', scriptSrc), { type: 'module' }); }
      catch (e) { pip.carregando = null; falha(e); return; }
      pip.worker.onmessage = e => pip.ouvintes.forEach(f => f(e.data));
      pip.worker.onerror = e => { e.preventDefault && e.preventDefault(); pip.ouvintes.forEach(f => f({ tipo: 'erro', etapa: 'init', msg: (e && e.message) || 'Falha ao iniciar.' })); };
      const ouvir = m => {
        if (m.tipo === 'progresso') { const pc = Math.round((m.loaded / m.total) * 100); progresso(pc); status('Preparando a voz… ' + pc + '%'); }
        else if (m.tipo === 'aviso') logApp('Locução: ' + m.msg, 'wa');
        else if (m.tipo === 'pronto') {
          pip.ouvintes.delete(ouvir); pip.pronto = true; pip.carregando = null; pip.falhou = false; pip.info = m; pip.velInit = m.velocidade || vel;
          progresso(null); status('Voz pronta.'); atualizarMotorUI(); logApp('Locução: voz pronta (Piper, ' + m.voz + ').', 'ok'); ok(true);
        } else if (m.tipo === 'erro' && (m.etapa === 'init' || m.etapa === 'worker')) {
          pip.ouvintes.delete(ouvir); progresso(null);
          if (pip.worker) pip.worker.terminate(); pip.worker = null; pip.pronto = false; pip.carregando = null; pip.falhou = true;
          logApp('Locução: Piper indisponível — ' + m.msg, 'wa'); console.warn('Piper:', m.msg); atualizarMotorUI(); falha(new Error(m.msg));
        }
      };
      pip.ouvintes.add(ouvir);
      pip.worker.postMessage({ tipo: 'init', voz, velocidade: vel });
    });
    return pip.carregando;
  }
  function initTTS() {
    if (tts.pronto) return Promise.resolve(true);
    if (tts.carregando) return tts.carregando;
    progresso(0); status('Preparando a voz…'); chip('ld');
    tts.carregando = new Promise((ok, falha) => {
      try { tts.worker = new Worker(new URL('locucao-worker.js', scriptSrc), { type: 'module' }); }
      catch (e) { tts.carregando = null; falha(e); return; }
      tts.worker.onmessage = e => tts.ouvintes.forEach(f => f(e.data));
      tts.worker.onerror = e => { e.preventDefault && e.preventDefault(); tts.ouvintes.forEach(f => f({ tipo: 'erro', etapa: 'init', msg: (e && e.message) || 'Falha ao iniciar.' })); };
      const ouvir = m => {
        if (m.tipo === 'progresso') { const pc = Math.round((m.loaded / m.total) * 100); progresso(pc); status('Preparando a voz… ' + pc + '%'); }
        else if (m.tipo === 'aviso' && !m.fon) logApp('Locução: ' + m.msg, 'wa');
        else if (m.tipo === 'pronto') {
          tts.ouvintes.delete(ouvir); tts.pronto = true; tts.carregando = null; tts.falhou = false; tts.info = m;
          progresso(null); status('Voz pronta.'); atualizarMotorUI(); logApp('Locução: voz pronta (Kokoro, ' + m.device + ', ' + m.dtype + ').', 'ok'); ok(true);
        } else if (m.tipo === 'erro' && (m.etapa === 'init' || m.etapa === 'worker')) {
          tts.ouvintes.delete(ouvir); progresso(null);
          logApp('Locução: Kokoro indisponível — ' + m.msg, 'wa'); console.warn('Kokoro:', m.msg);
          encerrarMotor(); tts.falhou = true; atualizarMotorUI(); falha(new Error(m.msg));
        }
      };
      tts.ouvintes.add(ouvir);
      if (!tts.fonOuv) tts.fonOuv = tts.ouvintes.add(m => { if (m.tipo === 'aviso' && m.fon) $('locFonInfo').textContent = m.msg; });
      tts.worker.postMessage({ tipo: 'init', dtype: $('locDtype').value, device: $('locDevice').value, fon: $('locFon').value });
    });
    return tts.carregando;
  }
  const iniciarMotor = (v, vel) => ehPiper(v) ? initPiper(v, vel) : initTTS();
  const ativarMotorDaVoz = () => iniciarMotor($('locVoz').value, +$('locVel').value || 1);
  $('locAtivar').onclick = () => { motorDe($('locVoz').value).falhou = false; return ativarMotorDaVoz().catch(() => status('Não foi possível preparar esta voz agora. Verifique a conexão e tente novamente.')); };
  $('locRemModelo').onclick = async () => {
    if (!confirm('Remover do navegador as vozes baixadas?\nElas serão baixadas de novo no próximo uso. O histórico de áudios não é apagado.')) return;
    encerrarMotor(); encerrarPiper();
    try { for (const k of await caches.keys()) if (/transformers|kokoro|onnx|piper/i.test(k)) await caches.delete(k); } catch { /* sem Cache API */ }
    try {
      await new Promise(res => { const w = new Worker(new URL('locucao-piper-worker.js', scriptSrc), { type: 'module' }); const fim = () => { w.terminate(); res(); }; w.onmessage = e => { if (['removido', 'erro'].includes(e.data && e.data.tipo)) fim(); }; w.onerror = fim; w.postMessage({ tipo: 'remover' }); setTimeout(fim, 15000); });
    } catch { /* sem OPFS */ }
    status('Vozes removidas deste navegador.'); usoArmazenamento();
  };

  /* ---------------------------- Texto em trechos ---------------------------- */
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

  /* ---------------------------- Costura PCM via Web Audio API ---------------------------- */
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

  /* ---------------------------- Histórico persistente (IndexedDB) ---------------------------- */
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


  /* ---------------------------- Síntese (núcleo, sem interface) ---------------------------- */
  async function sintetizar(texto, voz, vel, pausaMs, op) {
    op = op || {}; vel = +vel > 0 ? +vel : 1; pausaMs = +pausaMs >= 0 ? +pausaMs : 300;
    if (!String(texto || '').trim()) return null;
    if (!op.semCache) { const c = await findCachedAudio(texto, voz, vel, pausaMs); if (c && c.audioBlob) return { blob: c.audioBlob, duracao: c.duracao || 0, voz, doHistorico: true, id: c.id }; }
    let eng = motorDe(voz);
    if (eng === pip && pip.pronto && pip.info && pip.info.nativo && Math.abs(vel - (pip.velInit || 1)) > 0.001) encerrarPiper();
    if (!eng.pronto) {
      try { if (eng.falhou && !op.semAlternativa && alternativaPara(voz)) throw new Error('indisponível nesta sessão'); await iniciarMotor(voz, vel); }
      catch (e) {
        const alt = op.semAlternativa ? null : alternativaPara(voz);
        if (!alt) throw new Error('Não foi possível preparar esta voz agora. Verifique a conexão e tente novamente.');
        op.onAviso && op.onAviso('Não foi possível usar esta voz agora. Usando a voz alternativa: ' + nomeVoz(alt).split(' · ')[0] + '.');
        return sintetizar(texto, alt, vel, pausaMs, Object.assign({}, op, { semAlternativa: true }));
      }
    }
    const textChunks = splitTextIntoChunks(texto, /^[efhip][fm]_/.test(voz) ? 250 : 300);
    if (!textChunks.length) return null;
    const id = ++idGer, partes = []; let sr = 24000;
    geracao = { id, eng };
    try {
      await new Promise((ok, falha) => {
        const ouvir = m => {
          if (m.id !== id) return;
          if (m.tipo === 'trecho') { partes.push(m.pcm); sr = m.sr; op.onProg && op.onProg(Math.round(((m.i + 1) / m.n) * 100), m.i + 1, m.n); }
          else if (m.tipo === 'fim') { eng.ouvintes.delete(ouvir); m.cancelado ? falha(new Error('Geração cancelada.')) : ok(); }
          else if (m.tipo === 'erro') { eng.ouvintes.delete(ouvir); falha(new Error(m.msg)); }
        };
        eng.ouvintes.add(ouvir);
        eng.worker.postMessage({ tipo: 'gerar', id, trechos: textChunks, voice: voz, speed: vel });
      });
    } finally { geracao = null; }
    const buffer = mergePcmWithWebAudio(partes, sr, pausaMs), blob = audioBufferToWavBlob(buffer), duracao = buffer.length / sr;
    let novoId = null;
    try { novoId = await saveAudioToHistory(texto, voz, vel, blob, { pausa: pausaMs, duracao, motor: eng.nome, trechos: textChunks.length }); }
    catch (e) { logApp('Locução: não foi possível salvar no histórico (' + e.message + ').', 'wa'); }
    return { blob, duracao, voz, doHistorico: false, id: novoId };
  }
  function cancelar() { if (geracao && geracao.eng && geracao.eng.worker) { geracao.eng.worker.postMessage({ tipo: 'cancelar', id: geracao.id }); return true; } return false; }

  /* ---------------------------- Geração pela tela ---------------------------- */
  function definirAudio(blob, nome, info, aviso, tipo) {
    if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = URL.createObjectURL(blob); currentBlob = blob; currentNome = nome;
    $('locAudio').src = currentAudioUrl; $('locBaixar').disabled = false;
    $('locInfo').textContent = info;
    $('locAviso').innerHTML = aviso ? '<div class="aviso' + (tipo ? ' ' + tipo : '') + '">' + esc(aviso) + '</div>' : '';
  }
  const semAcento = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');
  const nomeArquivo = (voice, texto) => 'locucao_' + semAcento(nomeVoz(voice).split(' · ')[0]) + '_' + (semAcento(texto.trim().slice(0, 30)) || 'audio');
  const infoAudio = it => fmtDur(it.duracao || 0) + ' · ' + nomeVoz(it.voice) + ' · ' + String(it.speed).replace('.', ',') + '× · ' + new Date(it.createdAt).toLocaleString('pt-BR');
  async function generateSpeechAdvanced(textInput, selectedVoice = VOZ_PADRAO, speedRate = 1.0, pausaMs = 300) {
    if (!textInput.trim()) return null;
    const t0 = performance.now(); let aviso = '';
    ocupado(true); status('Preparando…');
    try {
      const r = await sintetizar(textInput, selectedVoice, speedRate, pausaMs, {
        onProg: (pct, i, n) => { progresso(pct); status('Gerando…' + (n > 1 ? ' parte ' + i + ' de ' + n : '')); },
        onAviso: t => { aviso = t; status(t); }
      });
      if (!r) return null;
      itemAtual = r.id;
      definirAudio(r.blob, nomeArquivo(r.voz, textInput), infoAudio({ duracao: r.duracao, voice: r.voz, speed: speedRate, createdAt: new Date().toISOString() }),
        aviso || (r.doHistorico ? 'Carregado do histórico (nenhum processamento necessário).' : 'Pronto em ' + fmtDur((performance.now() - t0) / 1000) + '.'), aviso ? 'wa' : '');
      status('Pronto: ' + fmtDur(r.duracao) + ' de áudio.');
      logApp('Locução gerada: ' + fmtDur(r.duracao) + '.', 'ok');
      carregarHistorico();
      return currentAudioUrl;
    } catch (error) {
      const c = /cancelad/i.test(error.message);
      status(c ? 'Cancelado.' : 'Não foi possível gerar o áudio.');
      if (!c) { $('locAviso').innerHTML = '<div class="aviso er">' + esc(/preparar esta voz/.test(error.message) ? error.message : 'Não foi possível gerar o áudio. Tente de novo ou escolha outra voz.') + '</div>'; console.error('Locução:', error); logApp('Locução: ' + error.message, 'err'); }
      throw error;
    } finally { ocupado(false); setTimeout(() => progresso(null), 800); }
  }
  $('locGerar').onclick = async () => {
    const t = $('locTexto').value;
    if (!t.trim()) { $('locAviso').innerHTML = '<div class="aviso wa">Digite ou importe um texto primeiro.</div>'; $('locTexto').focus(); return; }
    try { await generateSpeechAdvanced(t, $('locVoz').value, +$('locVel').value || 1, +$('locPausa').value); $('locAudio').play().catch(() => {}); } catch { /* exibido na tela */ }
  };
  $('locCancelar').onclick = () => { if (cancelar()) status('Cancelando…'); };
  $('locLimpar').onclick = () => { $('locTexto').value = ''; contar(); $('locTexto').focus(); };

  /* ---------------------------- Download (MP3 / OGG / WAV) ---------------------------- */
  const convertidos = new WeakMap();
  async function converter(blob, fmt) {
    if (fmt === 'wav') return { blob, ext: 'wav', formato: 'wav' };
    let m = convertidos.get(blob); if (!m) { m = {}; convertidos.set(blob, m); }
    if (!m[fmt]) m[fmt] = await window.AudioCodec.codificar(blob, fmt);
    return m[fmt];
  }
  async function baixarBlob(blob, nome, fmt) {
    fmt = fmt || $('locFmt').value;
    let saida;
    if (fmt !== 'wav') status('Convertendo para ' + fmt.toUpperCase() + '…');
    try { saida = await converter(blob, fmt); status(''); }
    catch (e) { console.warn('Conversão:', e); status('Não foi possível converter para ' + fmt.toUpperCase() + ' agora; baixando em WAV.'); saida = { blob, ext: 'wav' }; }
    const u = URL.createObjectURL(saida.blob), a = document.createElement('a');
    a.href = u; a.download = nome + '.' + saida.ext; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  $('locBaixar').onclick = () => { if (currentBlob) baixarBlob(currentBlob, currentNome); };

  /* ---------------------------- Contador / estimativa ---------------------------- */
  function contar() {
    const t = $('locTexto').value, n = t.length, pal = (t.match(/[\p{L}\p{N}]+/gu) || []).length, seg = pal / (2.6 * (+$('locVel').value || 1));
    $('locCont').textContent = n.toLocaleString('pt-BR') + ' caracteres · ' + pal.toLocaleString('pt-BR') + ' palavras · ≈ ' + fmtDur(seg) + ' de áudio';
  }
  $('locTexto').addEventListener('input', contar); $('locVel').addEventListener('input', contar);

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
    if (!t) { $('locAviso').innerHTML = '<div class="aviso wa">Nada para importar: ' + (f === 'notas' ? 'a apresentação não tem notas do apresentador' : f === 'slides' ? 'a apresentação está vazia' : 'o guia está vazio') + ' na aba Curso.</div>'; return; }
    if ($('locTexto').value.trim() && !confirm('Substituir o texto atual pelo conteúdo importado?')) return;
    $('locTexto').value = t; contar(); $('locAviso').innerHTML = '<div class="aviso">Texto importado. Revise antes de gerar.</div>';
  };

  /* ---------------------------- Histórico ---------------------------- */
  let tLista = null;
  async function loadHistoryList() {
    let l = [];
    try { l = await tx('readonly', s => s.getAll()); } catch (e) { $('locHist').innerHTML = '<div class="vazio">Histórico indisponível neste navegador.</div>'; return; }
    l.sort((a, b) => b.id - a.id);
    const q = ($('locBusca').value || '').toLowerCase().trim(), vis = q ? l.filter(x => (x.text || '').toLowerCase().includes(q) || nomeVoz(x.voice).toLowerCase().includes(q)) : l;
    $('locHistN').textContent = '(' + l.length + ')';
    if (!vis.length) { $('locHist').innerHTML = '<div class="vazio">' + (l.length ? 'Nada encontrado.' : 'Nenhum áudio gerado ainda. Os áudios gerados aparecem aqui e podem ser ouvidos e baixados de novo sem processamento.') + '</div>'; return; }
    $('locHist').innerHTML = vis.map(x => '<div class="hc' + (x.id === itemAtual ? ' on' : '') + '" data-id="' + x.id + '"><p title="' + esc(x.text.slice(0, 600)) + '">' + esc(x.text.slice(0, 220)) + (x.text.length > 220 ? '…' : '') + '</p>' +
      '<small>' + esc(nomeVoz(x.voice)) + ' · ' + String(x.speed).replace('.', ',') + '× · ' + fmtDur(x.duracao || 0) + '</small><small>' + new Date(x.createdAt).toLocaleString('pt-BR') + '</small>' +
      '<div class="b"><button type="button" data-a="ouvir">▶ Ouvir</button><button type="button" class="sec" data-a="baixar">Baixar</button><button type="button" class="sec" data-a="texto" title="Copiar o texto e a voz para o editor">Usar texto</button><button type="button" class="dan" data-a="excluir">Excluir</button></div></div>').join('');
  }
  function carregarHistorico() { clearTimeout(tLista); tLista = setTimeout(() => { loadHistoryList(); usoArmazenamento(); }, 60); }
  $('locBusca').oninput = carregarHistorico;
  $('locHist').addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const id = +b.closest('.hc').dataset.id;
    const it = await tx('readonly', s => s.get(id)); if (!it) { carregarHistorico(); return; }
    if (b.dataset.a === 'ouvir') { itemAtual = id; definirAudio(it.audioBlob, nomeArquivo(it.voice, it.text), infoAudio(it), 'Carregado do histórico.'); $('locAudio').play().catch(() => {}); carregarHistorico(); }
    else if (b.dataset.a === 'baixar') baixarBlob(it.audioBlob, nomeArquivo(it.voice, it.text));
    else if (b.dataset.a === 'texto') {
      $('locTexto').value = it.text; preencherVozes($('locIdioma'), $('locVoz'), it.voice); localStorage.setItem(PREF.voz, $('locVoz').value); atualizarMotorUI();
      $('locVel').value = it.speed; velTxt(); if (it.pausa !== undefined) $('locPausa').value = String(it.pausa); contar(); $('locTexto').focus();
    } else if (b.dataset.a === 'excluir') {
      if (!confirm('Excluir este áudio do histórico?')) return;
      await removerDoHistorico(id);
      if (itemAtual === id) { if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null; currentBlob = null; $('locAudio').removeAttribute('src'); $('locAudio').load(); $('locBaixar').disabled = true; $('locInfo').textContent = 'Nenhum áudio.'; $('locAviso').innerHTML = ''; itemAtual = null; }
      carregarHistorico();
    }
  });
  $('locLimparHist').onclick = async () => { if (!confirm('Apagar TODOS os áudios do histórico?')) return; await tx('readwrite', s => s.clear()); carregarHistorico(); };
  async function usoArmazenamento() {
    try { if (!navigator.storage || !navigator.storage.estimate) return; const e = await navigator.storage.estimate(); $('locUso').textContent = 'Espaço usado neste navegador: ' + fmtTam(e.usage || 0) + '.'; } catch { /* sem estimativa */ }
  }

  /* ---------------------------- Catálogo do Piper (em segundo plano) ---------------------------- */
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
        piperCatalogo = m.vozes; catCache = null; localStorage.setItem('loc.piperVozes', JSON.stringify({ ts: Date.now(), vozes: m.vozes }));
        preencherVozes($('locIdioma'), $('locVoz'), $('locVoz').value);
        document.dispatchEvent(new CustomEvent('locucao:vozes'));
      }
      if (m.tipo === 'vozes' || m.tipo === 'erro') { clearTimeout(t); fim(); }
    };
    w.onerror = () => { clearTimeout(t); fim(); };
    w.postMessage({ tipo: 'vozes' });
  }

  /* ---------------------------- Integração: atalhos, ajuda, limpeza ---------------------------- */
  addEventListener('keydown', e => {
    if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
    if (e.code === 'Digit3') { e.preventDefault(); mostrarAba('locucao'); $('locTexto').focus(); }
    else if (e.code === 'Digit1' || e.code === 'Digit2') { if (!sec.hidden) mostrarAba('curso'); }
    else if (e.code === 'KeyN' && !sec.hidden) { e.preventDefault(); if (!$('locGerar').disabled) $('locGerar').click(); }
  }, true);
  const AJUDA = '<h4>Locução (texto em fala)</h4><ul>' +
    '<li>Aba <b>Locução</b> (<kbd>Alt+Shift+3</kbd>): transforma texto em fala <b>no seu navegador</b>. O texto não sai do computador.</li>' +
    '<li><b>1. Texto</b>: digite, cole ou <b>importe</b> do curso (notas do apresentador, texto dos slides ou guia).</li>' +
    '<li><b>2. Voz</b>: escolha o <b>idioma</b>, a <b>voz</b> (as <b>Recomendadas</b> aparecem primeiro), a <b>velocidade</b> e a <b>pausa entre frases</b>. Na primeira vez a voz é preparada (pode levar alguns minutos); depois é imediata. <kbd>Alt+Shift+N</kbd> gera.</li>' +
    '<li>Se uma voz não puder ser usada no momento, outra voz do mesmo idioma é usada automaticamente.</li>' +
    '<li><b>3. Ouvir e baixar</b>: escolha o formato do arquivo — <b>MP3</b> (padrão), <b>OGG</b> (menor) ou <b>WAV</b> (sem compressão).</li>' +
    '<li><b>Histórico</b>: cada áudio fica guardado neste navegador; gerar de novo o mesmo texto com as mesmas opções usa o histórico, sem processar.</li>' +
    '<li>Se uma palavra soar estranha, escreva-a como se fala (ex.: siglas por extenso).</li>' +
    '<li><b>Opções avançadas</b> (recolhidas): preparar a voz, remover vozes baixadas e ajustes técnicos — normalmente não é preciso mexer.</li></ul>';
  const KB = '<div class="kbG"><h4>Locução</h4><table class="kbT"><tr><td style="width:46%"><kbd>Alt + Shift + 3</kbd></td><td>Abrir a aba Locução</td></tr><tr><td><kbd>Alt + Shift + N</kbd></td><td>Gerar locução (na aba Locução)</td></tr><tr><td><kbd>Alt + Shift + 1 / 2</kbd></td><td>Voltar à aba Curso (Guia / Apresentação)</td></tr></table></div>';
  new MutationObserver(() => {
    const c = document.getElementById('hlpC');
    if (c && !c.querySelector('[data-loc]')) { const d = document.createElement('div'); d.className = 'hs'; d.dataset.loc = '1'; d.innerHTML = AJUDA; c.appendChild(d); }
    const k = document.getElementById('kbF');
    if (k && !document.querySelector('[data-lockb]')) { const bd = k.closest('.md-bd'); if (bd) { const d = document.createElement('div'); d.innerHTML = KB; bd.appendChild(d.firstChild); bd.lastChild.dataset.lockb = '1'; } }
    if (document.querySelector('.tr-pop') && !sec.hidden) mostrarAba('curso');
  }).observe(document.body, { childList: true, subtree: true });
  const logEl = $('log');
  if (logEl) new MutationObserver(() => {
    if (/Dados locais apagados/.test(logEl.lastChild && logEl.lastChild.textContent || '')) tx('readwrite', s => s.clear()).then(carregarHistorico).catch(() => {});
  }).observe(logEl, { childList: true });

  /* ---------------------------- Montagem ---------------------------- */
  contar(); carregarHistorico(); atualizarMotorUI(); carregarCatalogoPiper();
  fetch(new URL('modelos/manifest.json', scriptSrc).href, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(m => {
    $('locLocalInfo').textContent = m && m.arquivos ? 'Vozes hospedadas neste site: ' + ((m.perfis || []).join(', ') || Object.keys(m.arquivos).length + ' arquivo(s)') + (m.vendor && Object.keys(m.vendor).length ? ' · bibliotecas: ' + Object.keys(m.vendor).join(', ') : '') + '.' : 'Vozes baixadas da internet (Hugging Face/jsDelivr).';
  }).catch(() => {});
  if ($('locPreload').checked && !location.hash.startsWith('#cx=')) {
    const go = () => ativarMotorDaVoz().catch(() => status(''));
    if (document.readyState === 'complete') setTimeout(go, 800); else addEventListener('load', () => setTimeout(go, 800));
  }
  window.Locucao = {
    VOZ_PADRAO, KOKORO, idiomas, vozesDoIdioma, nomeVoz, nomeIdioma, idiomaDaVoz, alternativaPara, preencherVozes, ligarSelects,
    sintetizar, cancelar, converter, baixarBlob, limparMd, slidesDe, initTTS, initPiper, motorDe, mostrarAba,
    generateSpeechAdvanced, splitTextIntoChunks, mergeAudioBlobsWithWebAudio, audioBufferToWavBlob, openHistoryDB, findCachedAudio, saveAudioToHistory, loadHistoryList
  };
})();
