/* =====================================================================================
   Conteudista — Worker de Locução (Kokoro-82M, 100% no navegador)
   Executa a inferência fora da thread principal para a página não travar.
   - Modelo: onnx-community/Kokoro-82M-v1.0-ONNX, dtype "q8" (padrão) ou "fp32"
   - Dispositivo: WebGPU com fallback automático para WebAssembly (WASM)
   - pt-BR: o kokoro-js 1.2.1 só aceita vozes inglesas em generate() e só fonemiza inglês.
     Para pf_dora / pm_alex / pm_santa este worker fonemiza em pt-BR (espeak-ng WASM → phonemizer.js →
     fonemizador interno por regras, ptbr-g2p.js), carrega o arquivo de voz do repositório ONNX e chama
     o modelo diretamente (mesmo cálculo de estilo do kokoro-js).
   Mensagens recebidas: {tipo:'init', dtype, device} | {tipo:'gerar', id, trechos[], voice, speed} | {tipo:'cancelar', id}
   Mensagens enviadas:  progresso | fase | aviso | pronto | trecho (pcm transferível) | fim | erro
   ===================================================================================== */
const KOKORO_URLS = [
  'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js',
  'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm'
];
const PHONEMIZER_URLS = [
  'https://cdn.jsdelivr.net/npm/phonemizer@1.2.1/+esm',
  'https://cdn.jsdelivr.net/npm/phonemizer@1.2.1/dist/phonemizer.js'
];
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOZES_URL = 'https://huggingface.co/' + MODEL_ID + '/resolve/main/voices/';
const STYLE_DIM = 256, SR = 24000, MAX_TOKENS = 500;

let tts = null, cfg = null, TensorCls = null, vocab = null, fon = null, langPT = null, cancelado = null;
const vozes = new Map();
const post = (m, t) => self.postMessage(m, t || []);

async function importar(urls) {
  let erro;
  for (const u of urls) { try { return await import(u); } catch (e) { erro = e; } }
  throw erro || new Error('Falha ao importar ' + urls[0]);
}

/* ---------------------------- Validação de áudio ---------------------------- */
function avaliar(pcm) {
  let soma = 0, nan = 0;
  for (let i = 0; i < pcm.length; i++) { const v = pcm[i]; if (!Number.isFinite(v)) { nan++; continue; } soma += v * v; }
  return { nan, rms: Math.sqrt(soma / Math.max(1, pcm.length)) };
}

/* ---------------------------- Inicialização ---------------------------- */
async function init({ dtype = 'q8', device = 'auto' }) {
  const mod = await importar(KOKORO_URLS);
  const KokoroTTS = mod.KokoroTTS || (mod.default && mod.default.KokoroTTS);
  if (!KokoroTTS) throw new Error('kokoro-js não exportou KokoroTTS.');
  const arquivos = new Map();
  const progress_callback = p => {
    if (p && p.status === 'progress' && p.total) {
      arquivos.set(p.file || p.name || '?', [p.loaded || 0, p.total]);
      let l = 0, t = 0; arquivos.forEach(([a, b]) => { l += a; t += b; });
      post({ tipo: 'progresso', loaded: l, total: t, file: p.file });
    } else if (p && (p.status === 'ready' || p.status === 'done')) post({ tipo: 'fase', fase: p.status, file: p.file });
  };
  const ordem = device === 'auto' ? (self.navigator && 'gpu' in self.navigator ? ['webgpu', 'wasm'] : ['wasm']) : [device];
  let ultimoErro = null;
  for (const dev of ordem) {
    try {
      post({ tipo: 'fase', fase: 'carregando', device: dev });
      tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype, device: dev, progress_callback });
      post({ tipo: 'fase', fase: 'compilando', device: dev });
      // teste rápido: WebGPU com q8 pode carregar e gerar áudio inválido → cai para WASM
      const teste = await tts.generate('Ok.', { voice: 'af_heart', speed: 1 });
      const a = avaliar(teste.audio);
      if (a.nan || a.rms < 1e-4) throw new Error('áudio de teste inválido em ' + dev + ' (' + dtype + ')');
      cfg = { dtype, device: dev };
      break;
    } catch (e) {
      ultimoErro = e; tts = null;
      if (ordem.length > 1 && dev !== ordem[ordem.length - 1]) post({ tipo: 'aviso', msg: 'Não foi possível usar ' + dev.toUpperCase() + ' (' + (e && e.message || e) + '). Tentando WASM…' });
    }
  }
  if (!tts) throw ultimoErro || new Error('Motor não inicializado.');
  const ids = tts.tokenizer('a', { truncation: true }).input_ids;
  TensorCls = ids.constructor;
  try {
    const v = typeof tts.tokenizer.get_vocab === 'function' ? tts.tokenizer.get_vocab() : (tts.tokenizer.model && (tts.tokenizer.model.tokens_to_ids || tts.tokenizer.model.vocab));
    vocab = v instanceof Map ? new Set(v.keys()) : v ? new Set(Array.isArray(v) ? v : Object.keys(v)) : null;
    if (vocab && vocab.size < 20) vocab = null;
  } catch { vocab = null; }
  post({ tipo: 'pronto', dtype: cfg.dtype, device: cfg.device, vozes: tts.voices ? Object.keys(tts.voices) : [] });
}

/* ---------------------------- Português (fonemização pt-BR) ----------------------------
   Ordem (modo "auto"): 1) espeak-ng completo em WebAssembly (pacote "espeak-ng", voz pt-br)
   2) phonemizer.js, se a versão carregada tiver português  3) fonemizador interno por regras (ptbr-g2p.js).
   O pacote "phonemizer" 1.2.1 traz apenas vozes em inglês — por isso não deve ser a única opção. */
const ESPEAK_URLS = [
  'https://cdn.jsdelivr.net/npm/espeak-ng@1.0.2/dist/espeak-ng.js',
  'https://cdn.jsdelivr.net/npm/espeak-ng@1.0.2/+esm'
];
let fonModo = 'auto', fonUsado = null, espeakMod = null, espeakOk = false, g2p = null;
const comTempo = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
async function espeakNG(texto) {
  if (!espeakOk) {  // valida uma vez: a voz pt-br precisa produzir vogal nasal em "pão"
    espeakOk = true;
    try { const t = await espeakRodar('pão'); if (!/\u0303|ɐ/.test(t)) throw new Error('voz pt-br ausente'); }
    catch (e) { espeakOk = false; throw e; }
  }
  return espeakRodar(texto);
}
async function espeakRodar(texto) {
  if (!espeakMod) {
    let ultimo;
    for (const u of ESPEAK_URLS) {
      try { const m = await comTempo(import(u), 30000, 'tempo esgotado'); espeakMod = { fn: m.default || m.ESpeakNg || m, base: u.slice(0, u.lastIndexOf('/') + 1) }; break; } catch (e) { ultimo = e; }
    }
    if (!espeakMod || typeof espeakMod.fn !== 'function') { espeakMod = null; throw ultimo || new Error('espeak-ng indisponível'); }
  }
  const limpo = texto.replace(/["\n\r]+/g, ' ').trim();
  const inst = await comTempo(espeakMod.fn({ arguments: ['--phonout', 'saida', '-q', '--ipa', '-v', 'pt-br', limpo], locateFile: f => espeakMod.base + f, print: () => {}, printErr: () => {} }), 60000, 'espeak-ng demorou demais');
  const r = String(inst.FS.readFile('saida', { encoding: 'utf8' }) || '').replace(/\s+/g, ' ').trim();
  if (!r) throw new Error('espeak-ng sem saída');
  return r;
}
async function phonemizerJS(texto) {
  if (!fon) fon = await importar(PHONEMIZER_URLS);
  const ph = fon.phonemize || (fon.default && fon.default.phonemize), lv = fon.list_voices || (fon.default && fon.default.list_voices);
  if (!ph) throw new Error('phonemizer indisponível');
  if (!langPT) {
    if (lv) { const v = await lv(); const tem = (v || []).some(x => (x.languages || []).some(l => /^pt/i.test(l.name)) || /^pt|\/pt/i.test(x.identifier || '')); if (!tem) throw new Error('phonemizer sem português'); }
    for (const l of ['pt-br', 'pt-BR', 'pt']) { try { const r = await ph('olá, mundo', l); if (r && String(r).trim()) { langPT = l; break; } } catch { /* próximo */ } }
    if (!langPT) throw new Error('phonemizer sem português');
  }
  const r = await ph(texto, langPT); return (Array.isArray(r) ? r.join(' ') : String(r || '')).trim();
}
async function interno(texto) {
  if (!g2p) { const m = await import(new URL('ptbr-g2p.js', self.location.href).href); g2p = m.phonemizePTBR || m.default; }
  return g2p(texto);
}
const NOMES_FON = { espeak: 'espeak-ng (WebAssembly)', phonemizer: 'phonemizer.js', interno: 'fonemizador interno pt-BR (regras)' };
async function fonemizar(texto) {
  const ordem = fonModo === 'auto' ? (fonUsado ? [fonUsado] : ['espeak', 'phonemizer', 'interno']) : [fonModo];
  let ps = '', erros = [];
  for (const f of ordem) {
    try {
      ps = f === 'espeak' ? await espeakNG(texto) : f === 'phonemizer' ? await phonemizerJS(texto) : await interno(texto);
      if (fonUsado !== f) { fonUsado = f; post({ tipo: 'aviso', msg: 'Fonemização pt-BR: ' + NOMES_FON[f] + '.', fon: f }); }
      break;
    } catch (e) { erros.push(NOMES_FON[f] + ': ' + (e && e.message || e)); if (fonModo === 'auto' && f === fonUsado) { fonUsado = null; return fonemizar(texto); } }
  }
  if (!ps) throw new Error('Não foi possível converter o texto em fonemas pt-BR (' + erros.join('; ') + '). Escolha "Interno pt-BR" no painel Motor de voz.');
  ps = ps.replace(/[\u0361^]/g, '').replace(/ʲ/g, 'j').replace(/\s+/g, ' ').trim();
  if (vocab) ps = [...ps].filter(c => vocab.has(c)).join('');
  return ps;
}
async function dadosVoz(v) {
  if (vozes.has(v)) return vozes.get(v);
  const url = VOZES_URL + v + '.bin';
  let buf = null;
  try {
    const c = await caches.open('kokoro-voices');
    let r = await c.match(url);
    if (!r) { r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); await c.put(url, r.clone()); }
    buf = await r.arrayBuffer();
  } catch {
    const r = await fetch(url); if (!r.ok) throw new Error('Arquivo da voz "' + v + '" indisponível (HTTP ' + r.status + ').');
    buf = await r.arrayBuffer();
  }
  const d = new Float32Array(buf);
  if (d.length < STYLE_DIM * 10) throw new Error('Arquivo da voz "' + v + '" inválido.');
  vozes.set(v, d); return d;
}
async function gerarPT(texto, voice, speed) {
  const ps = await fonemizar(texto);
  if (!ps) return [];
  const { input_ids } = tts.tokenizer(ps, { truncation: true });
  const nTok = input_ids.dims[input_ids.dims.length - 1];
  if (nTok >= MAX_TOKENS) {  // trecho longo demais: divide ao meio numa pausa/espaço
    const meio = Math.floor(texto.length / 2), corte = Math.max(texto.lastIndexOf(',', meio), texto.lastIndexOf(' ', meio));
    if (corte > 10) return [...await gerarPT(texto.slice(0, corte + 1), voice, speed), ...await gerarPT(texto.slice(corte + 1), voice, speed)];
  }
  const data = await dadosVoz(voice);
  const n = Math.min(Math.max(nTok - 2, 0), Math.floor(data.length / STYLE_DIM) - 1), off = n * STYLE_DIM;
  const style = new TensorCls('float32', data.slice(off, off + STYLE_DIM), [1, STYLE_DIM]);
  const sp = new TensorCls('float32', [speed], [1]);
  const { waveform } = await tts.model({ input_ids, style, speed: sp });
  return [{ pcm: new Float32Array(waveform.data), sr: SR, ps }];
}
async function gerarEN(texto, voice, speed) {
  const a = await tts.generate(texto, { voice, speed });
  return [{ pcm: new Float32Array(a.audio), sr: a.sampling_rate || SR, ps: '' }];
}

/* ---------------------------- Mensagens ---------------------------- */
self.onmessage = async e => {
  const m = e.data || {};
  try {
    if (m.tipo === 'init') { if (m.fon) fonModo = m.fon; await init(m); return; }
    if (m.tipo === 'fon') { fonModo = m.fon || 'auto'; fonUsado = null; return; }
    if (m.tipo === 'cancelar') { cancelado = m.id; return; }
    if (m.tipo === 'gerar') {
      if (!tts) throw new Error('O motor de voz não está inicializado.');
      const pt = /^p[fm]_/.test(m.voice), n = m.trechos.length;
      for (let i = 0; i < n; i++) {
        if (cancelado === m.id) { post({ tipo: 'fim', id: m.id, cancelado: true }); return; }
        const partes = pt ? await gerarPT(m.trechos[i], m.voice, m.speed) : await gerarEN(m.trechos[i], m.voice, m.speed);
        for (const p of partes) {
          const a = avaliar(p.pcm);
          if (a.nan) throw new Error('O modelo retornou áudio inválido (NaN) com ' + cfg.dtype + '. Troque a precisão para fp32 e ative o motor novamente.');
          post({ tipo: 'trecho', id: m.id, i, n, pcm: p.pcm, sr: p.sr, ps: p.ps, rms: a.rms }, [p.pcm.buffer]);
        }
      }
      post({ tipo: 'fim', id: m.id });
    }
  } catch (err) {
    post({ tipo: 'erro', id: m.id, etapa: m.tipo, msg: (err && err.message) || String(err) });
  }
};
