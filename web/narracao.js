/* =====================================================================================
   Conteudista — Narração dos slides (notas do apresentador → áudio no HTML e no PPTX)
   - Painel "Narração dos slides" na aba Curso, visível SOMENTE com a aba "Apresentação" selecionada
     (desligado por padrão)
   - Ao gerar os arquivos: lê as notas de cada slide (gerador.notas_para_narracao), gera o áudio com a voz
     escolhida (reaproveita o histórico da Locução), converte (MP3 padrão, OGG ou WAV) e entrega ao gerador
   - HTML: áudio embutido por slide; PPTX: áudio embutido com início automático (MP3, ou WAV se escolhido)
   - <!-- narracao: texto --> substitui a nota no áudio; <!-- narracao: nao --> deixa o slide sem som
   API: Narracao.preparar(py) → JSON para gerador.gerar(..., narracao) ou '' (sem narração)
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = () => window.Locucao;
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch { /* */ } };
  const fmtTam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const fmtDur = s => { s = Math.round(s); const m = Math.floor(s / 60); return m ? m + ' min ' + String(s % 60).padStart(2, '0') + ' s' : s + ' s'; };
  const go = $('go'); if (!go || !L()) return;
  const PREF = { on: 'narr.on', voz: 'narr.voz', vel: 'narr.vel', fmt: 'narr.fmt', auto: 'narr.auto' };
  const pref = (k, d) => { const v = localStorage.getItem(PREF[k]); return v === null ? d : v; };

  const st = document.createElement('style');
  st.textContent = `#narrBox{margin:10px 0 12px}#narrBox[hidden]{display:none!important}#narrBox .lin{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-top:8px}#narrBox .lin>div{flex:1;min-width:160px}
#narrBox label.tit{font-weight:600;color:var(--pri,#0c326f)}#narrBox input[type=range]{width:100%}#narrBox .note{margin:6px 0 0}
#narrBox .tts-loading-container{display:none;width:100%;height:8px;border-radius:9999px;background:rgba(51,65,85,.15);overflow:hidden;margin-top:8px}#narrBox .tts-progress-bar{height:100%;width:0;background:#1351b4;transition:width .3s}`;
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'narrBox'; box.className = 'panel';
  box.innerHTML = '<label class="inl tit"><input type="checkbox" id="narrOn"> Narração dos slides — gerar áudio a partir das notas do apresentador</label>' +
    '<div id="narrOp" hidden>' +
      '<div class="lin"><div><label for="narrIdioma">Idioma</label><select id="narrIdioma"></select></div><div><label for="narrVoz">Voz</label><select id="narrVoz"></select></div>' +
      '<div><label for="narrVel">Velocidade: <span id="narrVelV">1,00</span>×</label><input type="range" id="narrVel" min="0.5" max="2" step="0.05" value="1"></div>' +
      '<div><label for="narrFmt">Formato do áudio</label><select id="narrFmt"><option value="mp3">MP3 (padrão)</option><option value="ogg">OGG (menor)</option><option value="wav">WAV (sem compressão)</option></select></div></div>' +
      '<label class="inl"><input type="checkbox" id="narrAuto"> Avançar os slides sozinho ao fim da narração</label>' +
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
  L().preencherVozes($('narrIdioma'), $('narrVoz'), pref('voz', L().VOZ_PADRAO));
  document.addEventListener('locucao:vozes', () => { const v = $('narrVoz').value; L().preencherVozes($('narrIdioma'), $('narrVoz'), v); });
  L().ligarSelects($('narrIdioma'), $('narrVoz'), () => { localStorage.setItem(PREF.voz, $('narrVoz').value); info(); });
  const velTxt = () => { $('narrVelV').textContent = (+$('narrVel').value).toFixed(2).replace('.', ','); };
  velTxt();
  const mostrar = () => { $('narrOp').hidden = !$('narrOn').checked; info(); };
  $('narrOn').onchange = () => { localStorage.setItem(PREF.on, $('narrOn').checked ? '1' : '0'); mostrar(); };
  $('narrAuto').onchange = () => localStorage.setItem(PREF.auto, $('narrAuto').checked ? '1' : '0');
  $('narrVel').oninput = () => { velTxt(); localStorage.setItem(PREF.vel, $('narrVel').value); info(); };
  $('narrFmt').onchange = () => { localStorage.setItem(PREF.fmt, $('narrFmt').value); info(); };

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
  window.Narracao = { preparar, notasAprox };
})();
