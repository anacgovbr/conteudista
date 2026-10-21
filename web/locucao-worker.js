/* =====================================================================================
   Conteudista — Worker de Locução: Kokoro-82M v1.0 (multilíngue), 100% no navegador
   - Modelo: onnx-community/Kokoro-82M-v1.0-ONNX (versão multilíngue atual), dtype "fp32" (padrão) ou "q8"
     · fp32 é o padrão: idiomas além do inglês funcionam corretamente nele (q8 pode degradar/mudar a pronúncia)
   - Dispositivo: WebAssembly (WASM) no modo Automático — opção mais compatível. WebGPU só é usado quando escolhido explicitamente
   - Idiomas (lang_code do Kokoro, conforme VOICES.md):
       a = inglês americano · b = inglês britânico  → G2P do próprio kokoro-js (tts.generate)
       e = espanhol (es) · f = francês (fr-fr) · h = hindi (hi) · i = italiano (it) · p = português do Brasil (pt-br)
         → espeak-ng em WebAssembly, com o mesmo pós-processamento do misaki (EspeakG2P):
           ties ^ (e^ɪ→A, a^ʊ→W, d^ʒ→ʤ, t^ʃ→ʧ …), remoção de "^", acentos ˈˌ preservados, pontuação preservada
       j = japonês e z = mandarim exigem o misaki[ja]/[zh] (Python) — não disponíveis no navegador
   - Hospedagem local opcional (modelos/manifest.json): ver locucao-local.js
   Mensagens recebidas: {tipo:'init', dtype, device, fon} | {tipo:'gerar', id, trechos[], voice, speed} | {tipo:'cancelar', id} | {tipo:'fon', fon}
   Mensagens enviadas:  progresso | fase | aviso | pronto | trecho (pcm transferível) | fim | erro
   ===================================================================================== */
import { ativarEspelhos, importarPrimeiro, ehErroModulo } from './locucao-local.js';

const BASE = new URL('./', self.location.href).href;
const KOKORO_CDN = ['https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js', 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm'];
const ESPEAK_CDN = ['https://cdn.jsdelivr.net/npm/espeak-ng@1.0.2/dist/espeak-ng.js', 'https://cdn.jsdelivr.net/npm/espeak-ng@1.0.2/+esm'];
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOZES_URL = 'https://huggingface.co/' + MODEL_ID + '/resolve/main/voices/';
const STYLE_DIM = 256, SR = 24000, MAX_TOKENS = 500;
// lang_code do Kokoro → idioma do espeak-ng (mesmo mapeamento do KPipeline)
const ESPEAK_LANG = { e: 'es', f: 'fr-fr', h: 'hi', i: 'it', p: 'pt-br' };
// Pós-processamento do misaki (EspeakG2P.E2M)
const E2M = [['a^ɪ', 'I'], ['a^ʊ', 'W'], ['d^z', 'ʣ'], ['d^ʒ', 'ʤ'], ['e^ɪ', 'A'], ['o^ʊ', 'O'], ['ə^ʊ', 'Q'], ['s^s', 'S'], ['t^s', 'ʦ'], ['t^ʃ', 'ʧ'], ['ɔ^ɪ', 'Y']];

let tts = null, cfg = null, TensorCls = null, vocab = null, cancelado = null, espelhos = null;
const vozes = new Map();
const post = (m, t) => self.postMessage(m, t || []);

function avaliar(pcm) {
  let soma = 0, nan = 0;
  for (let i = 0; i < pcm.length; i++) { const v = pcm[i]; if (!Number.isFinite(v)) { nan++; continue; } soma += v * v; }
  return { nan, rms: Math.sqrt(soma / Math.max(1, pcm.length)) };
}

/* ---------------------------- Inicialização ---------------------------- */
let kokoroSemLocal = false, espeakSemLocal = false;
async function init(op) {
  try { return await init_(op); }
  catch (e) {
    if (!kokoroSemLocal && espelhos && espelhos.vendor.kokoro && ehErroModulo(e)) {
      kokoroSemLocal = true;
      post({ tipo: 'aviso', msg: 'Biblioteca local do Kokoro incompleta (' + ((e && e.message) || e) + '); usando a versão do CDN.' });
      return init_(op);
    }
    throw e;
  }
}
async function init_({ dtype = 'fp32', device = 'auto' }) {
  espelhos = await ativarEspelhos(BASE);
  const { mod, url } = await importarPrimeiro(BASE, [espelhos.vendor.kokoro], KOKORO_CDN, kokoroSemLocal);
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
  // Não tente WebGPU no modo Automático. Alguns navegadores expõem navigator.gpu, mas não entregam um adaptador;
  // depois dessa falha, versões do onnxruntime podem manter o backend WebGPU rejeitado em cache e contaminar
  // a tentativa seguinte em WASM. O modo Automático usa WASM diretamente; WebGPU continua disponível por opção explícita.
  const ordem = device === 'auto' ? ['wasm'] : [device];
  let ultimoErro = null;
  for (const dev of ordem) {
    try {
      post({ tipo: 'fase', fase: 'carregando', device: dev });
      tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype, device: dev, progress_callback });
      post({ tipo: 'fase', fase: 'compilando', device: dev });
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
  TensorCls = tts.tokenizer('a', { truncation: true }).input_ids.constructor;
  try {
    const v = typeof tts.tokenizer.get_vocab === 'function' ? tts.tokenizer.get_vocab() : (tts.tokenizer.model && (tts.tokenizer.model.tokens_to_ids || tts.tokenizer.model.vocab));
    vocab = v instanceof Map ? new Set(v.keys()) : v ? new Set(Array.isArray(v) ? v : Object.keys(v)) : null;
    if (vocab && vocab.size < 20) vocab = null;
  } catch { vocab = null; }
  post({ tipo: 'pronto', dtype: cfg.dtype, device: cfg.device, motor: 'kokoro', local: espelhos.ativo, biblioteca: /^http/.test(url) && !url.startsWith(BASE) ? 'cdn' : 'local' });
}

/* ---------------------------- espeak-ng (WebAssembly) ---------------------------- */
let espeakMod = null, fonModo = 'auto', fonUsado = null, g2p = null;
const espeakOk = new Map();
const comTempo = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
async function espeakRodar(texto, lang) {
  try { return await espeakRodar_(texto, lang); }
  catch (e) {
    if (!espeakSemLocal && espeakMod && espeakMod.local && (ehErroModulo(e) || /wasm|fetch|abort/i.test(String(e && e.message)))) {
      espeakSemLocal = true; espeakMod = null;
      post({ tipo: 'aviso', msg: 'Biblioteca local do espeak-ng falhou (' + ((e && e.message) || e) + '); usando a versão do CDN.' });
      return espeakRodar_(texto, lang);
    }
    throw e;
  }
}
async function espeakRodar_(texto, lang) {
  if (!espeakMod) {
    const ses = espelhos || await ativarEspelhos(BASE);
    const { mod, url } = await comTempo(importarPrimeiro(BASE, [ses.vendor.espeak], ESPEAK_CDN, espeakSemLocal), 30000, 'tempo esgotado ao carregar o espeak-ng');
    const fn = mod.default || mod.ESpeakNg || mod.ESpeakNG || mod;
    if (typeof fn !== 'function') throw new Error('espeak-ng indisponível');
    espeakMod = { fn, base: url.slice(0, url.lastIndexOf('/') + 1), local: url.startsWith(BASE) };
  }
  const limpo = texto.replace(/["\n\r]+/g, ' ').trim();
  if (!limpo) return '';
  const inst = await comTempo(espeakMod.fn({
    arguments: ['--phonout', 'saida', '-q', '--ipa=1', '--tie=^', '-v', lang, limpo],
    locateFile: f => espeakMod.base + f, print: () => {}, printErr: () => {}
  }), 60000, 'espeak-ng demorou demais');
  return String(inst.FS.readFile('saida', { encoding: 'utf8' }) || '').replace(/\s+/g, ' ').trim();
}
/** Equivalente ao misaki EspeakG2P: pontuação preservada, ties convertidos (E2M), "^" removido. */
async function espeakG2P(texto, lang) {
  if (!espeakOk.has(lang)) {  // valida a voz do espeak uma vez por idioma
    const prova = await espeakRodar(lang === 'pt-br' ? 'pão' : 'casa', lang);
    if (!prova || /[a-z]{6,}/.test(prova.replace(/[ˈˌ^]/g, ''))) throw new Error('voz "' + lang + '" ausente no espeak-ng');
    espeakOk.set(lang, true);
  }
  const t = texto.replace(/«/g, '\u201C').replace(/»/g, '\u201D').replace(/\(/g, '«').replace(/\)/g, '»');
  const partes = t.split(/([.,!?;:¡¿—…«»\u201C\u201D"]+)/);
  let ps = '';
  for (const p of partes) {
    if (!p) continue;
    if (/^[¡¿«\u201C]+$/.test(p)) { ps = ps.replace(/\s*$/, ' ') + p; continue; }        // abertura: cola na palavra seguinte
    if (/^[.,!?;:¡¿—…«»\u201C\u201D"]+$/.test(p)) { ps = ps.replace(/\s+$/, '') + p + ' '; continue; }
    if (!p.trim()) { if (!/[\s¡¿«\u201C]$/.test(ps)) ps += ' '; continue; }
    ps += (await espeakRodar(p, lang)) + ' ';
  }
  ps = ps.replace(/\([a-z-]+\)/g, '');                // language_switch='remove-flags'
  for (const [a, b] of E2M) ps = ps.split(a).join(b);
  return ps.replace(/\^/g, '').replace(/\s+/g, ' ').trim();
}
async function interno(texto) {  // fallback somente para português (regras ortográficas)
  if (!g2p) { const m = await import(new URL('ptbr-g2p.js', BASE).href); g2p = m.phonemizePTBR || m.default; }
  return g2p(texto);
}
async function fonemizar(texto, lc) {
  const lang = ESPEAK_LANG[lc];
  const ordem = fonModo === 'interno' && lc === 'p' ? ['interno'] : fonModo === 'espeak' || lc !== 'p' ? ['espeak'] : ['espeak', 'interno'];
  let ps = '', erros = [];
  for (const f of ordem) {
    try {
      ps = f === 'espeak' ? await espeakG2P(texto, lang) : await interno(texto);
      if (fonUsado !== f + lc) { fonUsado = f + lc; post({ tipo: 'aviso', fon: f, msg: 'Fonemização (' + lang + '): ' + (f === 'espeak' ? 'espeak-ng, como no Kokoro original' : 'fonemizador interno pt-BR (alternativa)') + '.' }); }
      break;
    } catch (e) { erros.push(f + ': ' + ((e && e.message) || e)); }
  }
  if (!ps) throw new Error('Não foi possível converter o texto em fonemas (' + lang + '): ' + erros.join('; ') + '. Verifique o acesso a cdn.jsdelivr.net ou hospede o espeak-ng no site.');
  if (vocab) ps = [...ps].filter(c => vocab.has(c)).join('');
  return ps;
}

/* ---------------------------- Síntese ---------------------------- */
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
async function gerarEspeak(texto, voice, speed) {
  const lc = voice[0];
  const ps = await fonemizar(texto, lc);
  if (!ps) return [];
  const { input_ids } = tts.tokenizer(ps, { truncation: true });
  const nTok = input_ids.dims[input_ids.dims.length - 1];
  if (nTok >= MAX_TOKENS) {
    const meio = Math.floor(texto.length / 2), corte = Math.max(texto.lastIndexOf(',', meio), texto.lastIndexOf(' ', meio));
    if (corte > 10) return [...await gerarEspeak(texto.slice(0, corte + 1), voice, speed), ...await gerarEspeak(texto.slice(corte + 1), voice, speed)];
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
      const lc = String(m.voice || '')[0];
      if (lc === 'j' || lc === 'z') throw new Error('Japonês e mandarim do Kokoro exigem o misaki (Python) e não estão disponíveis no navegador.');
      const ingles = lc === 'a' || lc === 'b', n = m.trechos.length;
      for (let i = 0; i < n; i++) {
        if (cancelado === m.id) { post({ tipo: 'fim', id: m.id, cancelado: true }); return; }
        const partes = ingles ? await gerarEN(m.trechos[i], m.voice, m.speed) : await gerarEspeak(m.trechos[i], m.voice, m.speed);
        for (const p of partes) {
          const a = avaliar(p.pcm);
          if (a.nan) throw new Error('O modelo retornou áudio inválido (NaN) com ' + cfg.dtype + '. Use a precisão fp32 e ative o motor novamente.');
          post({ tipo: 'trecho', id: m.id, i, n, pcm: p.pcm, sr: p.sr, ps: p.ps, rms: a.rms }, [p.pcm.buffer]);
        }
      }
      post({ tipo: 'fim', id: m.id });
    }
  } catch (err) {
    post({ tipo: 'erro', id: m.id, etapa: m.tipo, msg: (err && err.message) || String(err) });
  }
};
