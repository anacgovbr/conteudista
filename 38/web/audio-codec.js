/* =====================================================================================
   Conteudista — Conversão de áudio no navegador (WAV → MP3 / OGG)
   - MP3: lamejs (cópia hospedada no site, se houver, ou jsDelivr), mono, 64 kbps
   - OGG: Opus via WebCodecs (AudioEncoder) + empacotamento Ogg próprio, mono, 32 kbps
   - WAV: PCM 16 bits (sem perdas)
   API: AudioCodec.codificar(audioBufferOuBlob, 'mp3'|'ogg'|'wav') → { blob, ext, mime, formato }
        AudioCodec.suporta('ogg'|'mp3'|'wav') → Promise<boolean>
   ===================================================================================== */
(function (global) {
  'use strict';
  const LAME_CDN = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
  const base = (document.currentScript && document.currentScript.src) || location.href;
  const pausa = () => new Promise(r => setTimeout(r, 0));

  async function paraBuffer(x) {
    if (x && typeof x.getChannelData === 'function') return x;
    const Ctx = global.AudioContext || global.webkitAudioContext, ctx = new Ctx();
    try { return await ctx.decodeAudioData(await x.arrayBuffer()); } finally { ctx.close && ctx.close(); }
  }
  function mono(buf) {
    if (buf.numberOfChannels === 1) return buf.getChannelData(0);
    const n = buf.length, out = new Float32Array(n);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / buf.numberOfChannels; }
    return out;
  }
  async function reamostrar(pcm, de, para) {
    if (de === para) return pcm;
    const n = Math.max(1, Math.round(pcm.length * para / de));
    const off = new (global.OfflineAudioContext || global.webkitOfflineAudioContext)(1, n, para);
    const b = off.createBuffer(1, pcm.length, de); b.getChannelData(0).set(pcm);
    const src = off.createBufferSource(); src.buffer = b; src.connect(off.destination); src.start();
    return (await off.startRendering()).getChannelData(0);
  }
  function wav(pcm, sr) {
    const n = pcm.length, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, pcm[i] || 0)); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true); }
    return new Blob([ab], { type: 'audio/wav' });
  }

  let lameP = null;
  function carregarScript(url) {
    return new Promise((ok, falha) => { const s = document.createElement('script'); s.src = url; s.onload = () => ok(); s.onerror = () => { s.remove(); falha(new Error('falha ao carregar ' + url)); }; document.head.appendChild(s); });
  }
  function lame() {
    if (global.lamejs) return Promise.resolve(global.lamejs);
    if (lameP) return lameP;
    lameP = (async () => {
      let local = null;
      try { const r = await fetch(new URL('modelos/manifest.json', base).href, { cache: 'no-cache' }); if (r.ok) { const m = await r.json(); local = m.vendor && m.vendor.lamejs; } } catch { /* sem hospedagem */ }
      for (const u of [local && new URL(local, base).href, LAME_CDN].filter(Boolean)) {
        try { await carregarScript(u); if (global.lamejs) return global.lamejs; } catch { /* próximo */ }
      }
      lameP = null; throw new Error('conversor MP3 indisponível');
    })();
    return lameP;
  }
  async function mp3(pcm, sr) {
    const L = await lame();
    const validas = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
    if (!validas.includes(sr)) { pcm = await reamostrar(pcm, sr, 24000); sr = 24000; }
    const enc = new L.Mp3Encoder(1, sr, sr >= 32000 ? 96 : 64), partes = [], BLOCO = 1152 * 20, i16 = new Int16Array(BLOCO);
    for (let i = 0; i < pcm.length; i += BLOCO) {
      const n = Math.min(BLOCO, pcm.length - i), b = n === BLOCO ? i16 : new Int16Array(n);
      for (let k = 0; k < n; k++) { const s = Math.max(-1, Math.min(1, pcm[i + k])); b[k] = s < 0 ? s * 0x8000 : s * 0x7FFF; }
      const o = enc.encodeBuffer(b); if (o.length) partes.push(new Uint8Array(o));
      if ((i / BLOCO) % 25 === 24) await pausa();
    }
    const f = enc.flush(); if (f.length) partes.push(new Uint8Array(f));
    return new Blob(partes, { type: 'audio/mpeg' });
  }

  const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let k = 0; k < 8; k++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; t[i] = r >>> 0; } return t; })();
  function crc(u8) { let c = 0; for (let i = 0; i < u8.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ u8[i]) & 255]) >>> 0; return c >>> 0; }
  function pagina(pacote, granule, serie, seq, flags) {
    const seg = []; let r = pacote.length; while (r >= 255) { seg.push(255); r -= 255; } seg.push(r);
    const h = new Uint8Array(27 + seg.length), v = new DataView(h.buffer);
    h.set([0x4f, 0x67, 0x67, 0x53], 0); h[4] = 0; h[5] = flags;
    v.setUint32(6, granule % 0x100000000, true); v.setUint32(10, Math.floor(granule / 0x100000000), true);
    v.setUint32(14, serie, true); v.setUint32(18, seq, true); v.setUint32(22, 0, true); h[26] = seg.length; h.set(seg, 27);
    const p = new Uint8Array(h.length + pacote.length); p.set(h); p.set(pacote, h.length);
    new DataView(p.buffer).setUint32(22, crc(p), true);
    return p;
  }
  async function suportaOgg() {
    if (!global.AudioEncoder || !AudioEncoder.isConfigSupported) return false;
    try { return !!(await AudioEncoder.isConfigSupported({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 32000 })).supported; } catch { return false; }
  }
  async function ogg(pcm, sr) {
    if (!(await suportaOgg())) throw new Error('OGG não suportado neste navegador');
    const p48 = await reamostrar(pcm, sr, 48000), pacotes = [];
    let erro = null;
    const enc = new AudioEncoder({ output: (ch) => { const d = new Uint8Array(ch.byteLength); ch.copyTo(d); pacotes.push({ d, dur: ch.duration }); }, error: e => { erro = e; } });
    enc.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 32000 });
    const QUADRO = 48000;
    for (let i = 0; i < p48.length; i += QUADRO) {
      const n = Math.min(QUADRO, p48.length - i), dados = p48.slice(i, i + n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 1, timestamp: Math.round(i * 1e6 / 48000), data: dados });
      enc.encode(ad); ad.close();
      if (i % (QUADRO * 10) === 0) await pausa();
    }
    await enc.flush(); enc.close();
    if (erro) throw erro;
    const PRE = 312, serie = (Math.random() * 0xffffffff) >>> 0, saida = [];
    const head = new Uint8Array(19), hv = new DataView(head.buffer);
    head.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 0); head[8] = 1; head[9] = 1; hv.setUint16(10, PRE, true); hv.setUint32(12, sr, true); hv.setUint16(16, 0, true); head[18] = 0;
    const vendor = new TextEncoder().encode('Conteudista'), tags = new Uint8Array(8 + 4 + vendor.length + 4), tv = new DataView(tags.buffer);
    tags.set(new TextEncoder().encode('OpusTags'), 0); tv.setUint32(8, vendor.length, true); tags.set(vendor, 12); tv.setUint32(12 + vendor.length, 0, true);
    let seq = 0, gran = PRE;
    saida.push(pagina(head, 0, serie, seq++, 2));
    saida.push(pagina(tags, 0, serie, seq++, 0));
    const total = PRE + p48.length;
    pacotes.forEach((pk, k) => {
      gran += Math.round((pk.dur || 20000) * 48000 / 1e6);
      const ultimo = k === pacotes.length - 1;
      saida.push(pagina(pk.d, ultimo ? Math.min(gran, total) : gran, serie, seq++, ultimo ? 4 : 0));
    });
    return new Blob(saida, { type: 'audio/ogg' });
  }

  const EXT = { mp3: ['mp3', 'audio/mpeg'], ogg: ['ogg', 'audio/ogg'], wav: ['wav', 'audio/wav'] };
  async function codificar(entrada, formato) {
    formato = EXT[formato] ? formato : 'mp3';
    if (formato === 'wav' && entrada instanceof Blob && /wav/.test(entrada.type)) return { blob: entrada, ext: 'wav', mime: 'audio/wav', formato };
    const buf = await paraBuffer(entrada), pcm = mono(buf), sr = buf.sampleRate;
    const blob = formato === 'mp3' ? await mp3(pcm, sr) : formato === 'ogg' ? await ogg(pcm, sr) : wav(pcm, sr);
    return { blob, ext: EXT[formato][0], mime: EXT[formato][1], formato, duracao: pcm.length / sr };
  }
  async function suporta(f) {
    if (f === 'wav') return true;
    if (f === 'ogg') return suportaOgg();
    if (f === 'mp3') { try { await lame(); return true; } catch { return false; } }
    return false;
  }
  global.AudioCodec = { codificar, suporta, paraBuffer, wav: (pcm, sr) => wav(pcm, sr) };
})(window);
