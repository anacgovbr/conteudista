/* =====================================================================================
   Conteudista — Worker de Locução com Piper (padrão para português do Brasil)
   - Motor: Piper (VITS) em ONNX/WebAssembly via @mintplex-labs/piper-tts-web (fallback @jtsage/piper-tts-web)
   - Voz padrão: pt_BR-faber-medium; demais idiomas/vozes: catálogo da própria biblioteca (voices())
   - Fonemização: espeak-ng em WebAssembly embutido na biblioteca (mesma ferramenta do treino da voz)
   - Velocidade: 1º) nativa — o worker ajusta inference.length_scale (= 1/velocidade) da configuração da voz
                    quando a biblioteca a lê; 2º) se a biblioteca não permitir, estica/comprime o áudio
                    com WSOLA (mantém o tom da voz)
   - Hospedagem local opcional (modelos/manifest.json): ver locucao-local.js
   Mensagens recebidas: {tipo:'init', voz, velocidade} | {tipo:'gerar', id, trechos[], voice, speed} | {tipo:'cancelar', id}
                        | {tipo:'vozes'} | {tipo:'remover'}
   Mensagens enviadas:  progresso | fase | aviso | pronto | trecho | fim | vozes | removido | erro
   ===================================================================================== */
import { ativarEspelhos, importarPrimeiro, ehErroModulo } from './locucao-local.js';

const BASE = new URL('./', self.location.href).href;
const PIPER_CDN = [
  'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.4/+esm',
  'https://cdn.jsdelivr.net/npm/@jtsage/piper-tts-web@1.2.0/+esm',
  'https://esm.sh/@mintplex-labs/piper-tts-web@1.0.4'
];
const VOZ_PADRAO = 'pt_BR-faber-medium';
let lib = null, libLocal = false, semLocal = false, vozAtual = null, cancelado = null, espelhos = null;
let velocidade = 1, nativo = false;   // nativo = a biblioteca leu a configuração com o length_scale ajustado
const post = (m, t) => self.postMessage(m, t || []);

/* ---------------------------- Ajuste nativo da velocidade (length_scale) ---------------------------- */
function ajustarConfig(texto) {
  if (typeof texto !== 'string' || texto.length > 5e6 || texto.indexOf('"phoneme_id_map"') < 0 || texto.indexOf('"inference"') < 0) return texto;
  try {
    const j = JSON.parse(texto), ls = (j.inference && +j.inference.length_scale) || 1;
    j.inference = Object.assign({}, j.inference, { length_scale: ls / velocidade });
    nativo = true;
    return JSON.stringify(j);
  } catch { return texto; }
}
const blobText = Blob.prototype.text, respText = Response.prototype.text, respJson = Response.prototype.json;
Blob.prototype.text = async function () { return ajustarConfig(await blobText.call(this)); };
Response.prototype.text = async function () { return ajustarConfig(await respText.call(this)); };
Response.prototype.json = async function () {
  const t = await respText.call(this.clone ? this : this);
  return JSON.parse(ajustarConfig(t));
};

/* ---------------------------- WSOLA (alternativa quando o ajuste nativo não é possível) ---------------------------- */
function wsola(x, sr, taxa) {
  if (!(taxa > 0) || Math.abs(taxa - 1) < 0.01 || x.length < sr * 0.1) return x;
  const N = (Math.round(sr * 0.032) >> 1) << 1, Hs = N >> 1, tol = Math.round(sr * 0.012);
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  const lenOut = Math.ceil(x.length / taxa) + N, y = new Float32Array(lenOut), w = new Float32Array(lenOut);
  let posOut = 0, prev = -1;
  while (posOut + N < lenOut) {
    const ideal = Math.round(posOut * taxa);
    if (ideal + N >= x.length) break;
    let melhor = 0;
    if (prev >= 0) {
      const ref = prev + Hs; let mc = -Infinity;
      if (ref + Hs < x.length) for (let d = -tol; d <= tol; d += 2) {
        const s = ideal + d; if (s < 0 || s + Hs >= x.length) continue;
        let c = 0; for (let k = 0; k < Hs; k += 2) c += x[s + k] * x[ref + k];
        if (c > mc) { mc = c; melhor = d; }
      }
    }
    const s = Math.min(Math.max(0, ideal + melhor), x.length - N);
    for (let k = 0; k < N; k++) { y[posOut + k] += x[s + k] * win[k]; w[posOut + k] += win[k]; }
    prev = s; posOut += Hs;
  }
  const fim = Math.min(lenOut, posOut + Hs), out = new Float32Array(fim);
  for (let i = 0; i < fim; i++) out[i] = w[i] > 1e-3 ? y[i] / w[i] : 0;
  return out;
}

/* ---------------------------- Biblioteca e áudio ---------------------------- */
async function carregarLib() {
  if (lib) return lib;
  espelhos = await ativarEspelhos(BASE);
  try {
    const { mod, url } = await importarPrimeiro(BASE, [espelhos.vendor.piper], PIPER_CDN, semLocal);
    libLocal = url.startsWith(BASE);
    lib = mod.predict ? mod : (mod.default && mod.default.predict ? mod.default : null);
    if (!lib) throw new Error('biblioteca sem predict()');
    return lib;
  } catch (e) { throw new Error('Não foi possível carregar o Piper (' + ((e && e.message) || e) + '). Verifique o acesso a cdn.jsdelivr.net ou hospede a biblioteca no site.'); }
}
function wavParaPcm(buf) {
  const v = new DataView(buf);
  if (v.getUint32(0, false) !== 0x52494646 || v.getUint32(8, false) !== 0x57415645) throw new Error('Áudio do Piper em formato inesperado.');
  let p = 12, fmt = null, dados = null;
  while (p + 8 <= v.byteLength) {
    const id = v.getUint32(p, false), tam = v.getUint32(p + 4, true), ini = p + 8;
    if (id === 0x666d7420) fmt = { formato: v.getUint16(ini, true), canais: v.getUint16(ini + 2, true), sr: v.getUint32(ini + 4, true), bits: v.getUint16(ini + 14, true) };
    else if (id === 0x64617461) { dados = { ini, tam: Math.min(tam, v.byteLength - ini) }; break; }
    p = ini + tam + (tam & 1);
  }
  if (!fmt || !dados) throw new Error('Áudio do Piper sem cabeçalho WAV válido.');
  const bytes = fmt.bits / 8, n = Math.floor(dados.tam / (bytes * fmt.canais)), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < fmt.canais; c++) {
      const o = dados.ini + (i * fmt.canais + c) * bytes;
      s += fmt.formato === 3 ? v.getFloat32(o, true) : fmt.bits === 16 ? v.getInt16(o, true) / 32768 : fmt.bits === 8 ? (v.getUint8(o) - 128) / 128 : v.getInt32(o, true) / 2147483648;
    }
    out[i] = s / fmt.canais;
  }
  return { pcm: out, sr: fmt.sr };
}
function rms(pcm) { let s = 0; for (let i = 0; i < pcm.length; i++) s += pcm[i] * pcm[i]; return Math.sqrt(s / Math.max(1, pcm.length)); }
async function falar(texto, voz) {
  const r = await lib.predict({ text: texto, voiceId: voz });
  const buf = r instanceof Blob ? await r.arrayBuffer() : r instanceof ArrayBuffer ? r : r && r.buffer ? r.buffer : null;
  if (!buf) throw new Error('O Piper não devolveu áudio.');
  const a = wavParaPcm(buf);
  if (!nativo && Math.abs(velocidade - 1) > 0.01) a.pcm = wsola(a.pcm, a.sr, velocidade);
  return a;
}

/* ---------------------------- Catálogo de vozes ---------------------------- */
async function listarVozes() {
  await carregarLib();
  let l = null;
  try { l = typeof lib.voices === 'function' ? await lib.voices() : null; } catch { l = null; }
  if (!l) return [];
  const arr = Array.isArray(l) ? l : Object.entries(l).map(([k, v]) => Object.assign({ key: k }, v));
  return arr.map(v => {
    const key = v.key || v.id || v.name;
    const lang = (v.language && (v.language.code || v.language)) || String(key).split('-')[0];
    return { id: key, lang: String(lang).replace('-', '_'), nome: v.name || String(key).split('-')[1] || key, qualidade: v.quality || String(key).split('-')[2] || '', falantes: v.num_speakers || 1 };
  }).filter(v => v.id && /^[a-z]{2,3}_[A-Z]{2}-/.test(v.id));
}

/* ---------------------------- Inicialização ---------------------------- */
async function init(op) {
  try { return await init_(op); }
  catch (e) {
    // biblioteca hospedada no site com dependência não resolvida → usa a do CDN (os modelos continuam locais)
    if (libLocal && !semLocal && ehErroModulo(e)) {
      semLocal = true; lib = null; libLocal = false;
      post({ tipo: 'aviso', msg: 'Biblioteca local do Piper incompleta (' + ((e && e.message) || e) + '); usando a versão do CDN.' });
      return init_(op);
    }
    throw e;
  }
}
async function init_({ voz, velocidade: vel }) {
  voz = voz || VOZ_PADRAO; velocidade = +vel > 0 ? +vel : 1; nativo = false;
  post({ tipo: 'fase', fase: 'carregando', device: 'wasm' });
  await carregarLib();
  let ja = false;
  try { ja = typeof lib.stored === 'function' && (await lib.stored()).includes(voz); } catch { /* sem OPFS */ }
  if (!ja && typeof lib.download === 'function') {
    const arquivos = new Map();
    await lib.download(voz, p => {
      if (!p || !p.total) return;
      arquivos.set(p.url || '?', [p.loaded || 0, p.total]);
      let l = 0, t = 0; arquivos.forEach(([a, b]) => { l += a; t += b; });
      post({ tipo: 'progresso', loaded: l, total: t, file: p.url });
    });
  }
  post({ tipo: 'fase', fase: 'compilando', device: 'wasm' });
  const teste = await falar('Teste.', voz);
  if (!teste.pcm.length || rms(teste.pcm) < 1e-4) throw new Error('O áudio de teste do Piper saiu vazio.');
  vozAtual = voz;
  post({ tipo: 'pronto', dtype: 'medium', device: 'wasm', motor: 'piper', voz, sr: teste.sr, velocidade, nativo, local: espelhos.ativo, biblioteca: libLocal ? 'local' : 'cdn' });
}

/* ---------------------------- Mensagens ---------------------------- */
self.onmessage = async e => {
  const m = e.data || {};
  try {
    if (m.tipo === 'init') { await init(m); return; }
    if (m.tipo === 'cancelar') { cancelado = m.id; return; }
    if (m.tipo === 'vozes') { post({ tipo: 'vozes', vozes: await listarVozes() }); return; }
    if (m.tipo === 'remover') {
      await carregarLib();
      if (typeof lib.flush === 'function') await lib.flush();
      else if (typeof lib.remove === 'function') await lib.remove(m.voz || VOZ_PADRAO);
      post({ tipo: 'removido' }); return;
    }
    if (m.tipo === 'gerar') {
      const voz = String(m.voice || '').replace(/^piper:/, '') || VOZ_PADRAO;
      const vel = +m.speed > 0 ? +m.speed : 1;
      if (!lib || vozAtual !== voz) await init({ voz, velocidade: vel });
      else if (!nativo) velocidade = vel;   // modo WSOLA: muda a cada geração, sem reiniciar
      const n = m.trechos.length;
      for (let i = 0; i < n; i++) {
        if (cancelado === m.id) { post({ tipo: 'fim', id: m.id, cancelado: true }); return; }
        const r = await falar(m.trechos[i], voz);
        post({ tipo: 'trecho', id: m.id, i, n, pcm: r.pcm, sr: r.sr, ps: '', rms: rms(r.pcm) }, [r.pcm.buffer]);
      }
      post({ tipo: 'fim', id: m.id, nativo, velocidade });
    }
  } catch (err) {
    post({ tipo: 'erro', id: m.id, etapa: m.tipo, msg: (err && err.message) || String(err) });
  }
};
