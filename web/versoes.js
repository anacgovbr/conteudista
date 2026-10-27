/* =====================================================================================
   Conteudista - Versoes: rascunhos e versoes marcadas viram uma coisa so (etapa 2, opcao R1)

   MODELO
   - "Rascunho" deixa de existir como conceito. Salvar = criar uma VERSAO MARCADA (origem "marco" no
     repositorio "versoes"), que nunca e apagada automaticamente.
   - O repositorio antigo "rascunhos" so continua sendo usado para o registro "Autossalvo", de forma
     invisivel, que recupera o ultimo trabalho ao reabrir a pagina. Os rascunhos com nome ficam
     intactos nele (somente leitura) ate a proxima versao.

   O QUE ESTE ARQUIVO FAZ
   1. Migra uma unica vez os rascunhos com nome para versoes marcadas (mesma data, mesmo conteudo;
      sem duplicar se rodar de novo). So marca a migracao como concluida se tudo deu certo.
   2. Substitui "Salvar rascunho" (#dsave) por "Salvar versao" (nome automatico: conteudo + data e hora).
   3. Redefine listarRascunhos(): a lista de #drafts (aba Salvos do Importar) passa a mostrar as
      VERSOES SALVAS, com Abrir e Excluir. So e desenhada com a janela aberta (leitura sob demanda,
      porque as versoes guardam o texto completo).
   4. Abrir uma versao guarda antes o texto atual em Versoes ("Antes de abrir a versao ...").
   5. Excluir tudo (Salvos) e Excluir de uma linha usam a confirmacao acessivel da janela Importar.
   API: window.SalvarVersao.salvar(nome) | window.Versoes = { salvar, excluirSalvas, atualizar, migrar }
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const drafts = $('drafts');
  if (!drafts || typeof dbAll !== 'function' || typeof dbPut !== 'function' || typeof dbDel !== 'function' || !window.Hist || !Hist.registrar) return;

  const FLAG = 'conteudista.migr.versoes';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch (e) { /* sem log */ } };
  const anunciar = m => { try { if (window.UXFeedback && UXFeedback.anunciar) UXFeedback.anunciar(m); } catch (e) { /* sem anuncio */ } };
  const nomeDe = rot => String(rot || '').replace(/^\u2605\s*/, '');
  // Mesma funcao de hash do historico.js (para a deteccao de duplicatas e a comparacao)
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };

  /* ---------------------------- Leitura e desenho da lista ---------------------------- */
  let sujo = true, seq = 0;
  const aberta = () => { const b = $('jnImpBack'); return !!b && !b.hidden; };

  async function marcadas() {
    const l = await dbAll('versoes');
    return l.filter(v => v && v.origem === 'marco').sort((a, b) => b.data - a.data);
  }
  async function desenhar() {
    const meu = ++seq; sujo = false;
    let l;
    try { l = await marcadas(); }
    catch (e) { if (meu === seq) drafts.textContent = 'Armazenamento local indispon\u00edvel neste navegador.'; return; }
    if (meu !== seq) return;
    if (!l.length) { drafts.innerHTML = '<p class="sv-vazio">Nenhuma vers\u00e3o salva. Use <b>Salvar \u25be \u203a Guardar no navegador</b> para guardar uma.</p>'; return; }
    const ico = '<svg viewBox="0 0 24 24" focusable="false"><rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/><path d="M5.5 9h3M5.5 13h3M15.5 9h3M15.5 13h3"/></svg>';
    drafts.innerHTML = '<ul class="sv-lista">' + l.map(v => {
      const n = esc(nomeDe(v.rotulo)), tam = v.tam || ((v.g || '').length + (v.s || '').length);
      const bm = window.BuscaMeta, busca = [nomeDe(v.rotulo), v.p, v.r, bm ? bm.data(v.data) : '', bm ? bm.tam(tam) : fmtTam(tam), bm ? bm.tema(bm.temaDeMd(v.s)) : '', 'vers\u00e3o salva versao'].filter(Boolean).join(' ');
      return '<li class="sv-item" data-busca="' + esc(busca) + '"><span class="sv-ico" aria-hidden="true">' + ico + '</span>' +
        '<div class="sv-corpo"><p class="sv-tit">' + n + '</p><p class="sv-meta">' + new Date(v.data).toLocaleString('pt-BR') + ' \u00b7 ' + fmtTam(tam) + (v.p ? ' \u00b7 ' + esc(v.p) : '') + '</p></div>' +
        '<div class="sv-acoes"><button type="button" class="mini" data-a="ab" data-id="' + v.id + '" data-n="' + n + '" aria-label="Abrir ' + n + '">Abrir</button>' +
        '<button type="button" class="mini sv-ter sv-dan" data-a="ex" data-id="' + v.id + '" data-n="' + n + '" aria-label="Excluir ' + n + '">Excluir</button></div></li>';
    }).join('') + '</ul>';
  }

  // O codigo antigo chama listarRascunhos() a cada autossalvamento: aqui isso so marca a lista como
  // desatualizada; o desenho acontece quando a janela esta aberta (ou ao abrir).
  window.listarRascunhos = function () { sujo = true; return aberta() ? desenhar() : Promise.resolve(); };
  const back = $('jnImpBack');
  if (back) new MutationObserver(() => { if (!back.hidden && sujo) desenhar(); }).observe(back, { attributes: true, attributeFilter: ['hidden'] });

  /* ---------------------------- Salvar versao ---------------------------- */
  async function salvar(nome) {
    let d = null;
    try { d = pacote(); } catch (e) { d = null; }
    if (!d || (!(d.g || '').trim() && !(d.s || '').trim())) { anunciar('Nada para salvar.'); logApp('Nada para salvar.', 'wa'); return null; }
    const n = String(nome || '').trim() || ((d.p || 'Conteudo') + ' ' + new Date().toLocaleString('pt-BR'));
    const v = await Hist.registrar('marco', '\u2605 ' + n, d);
    if (v) { sujo = true; logApp('Vers\u00e3o salva: ' + n + '.', 'ok'); anunciar('Vers\u00e3o salva.'); if (aberta()) desenhar(); }
    return v;
  }
  const ds = $('dsave');
  if (ds) ds.onclick = () => { const e = $('dname'), n = e ? e.value : ''; if (e) e.value = ''; return salvar(n); };

  /* ---------------------------- Abrir e excluir ---------------------------- */
  async function abrirVersao(id) {
    let v = null;
    try { v = await tx('versoes', 'readonly', s => s.get(id)); } catch (e) { v = null; }
    if (!v) { logApp('Vers\u00e3o n\u00e3o encontrada.', 'err'); sujo = true; desenhar(); return; }
    const n = nomeDe(v.rotulo);
    await Hist.registrar('antes', 'Antes de abrir a vers\u00e3o ' + n);
    aplicar(v);
    logApp('Vers\u00e3o aberta: ' + n + '. O texto anterior ficou em Vers\u00f5es.', 'ok');
    Hist.registrar('restaurado', 'Aberta: ' + n);
    anunciar('Vers\u00e3o aberta: ' + n + '.');
    const ed = $(($('ps') && !$('ps').hidden) ? 'ps' : 'pg');
    if (ed && ed.scrollIntoView) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function excluirUma(id, nome, gatilho) {
    const exec = async () => { await dbDel('versoes', id); Hist.atualizar(); sujo = true; await desenhar(); };
    if (window.Importar && typeof Importar.pedir === 'function') {
      Importar.pedir({ gatilho, titulo: 'Excluir a vers\u00e3o "' + nome + '"?', descricao: 'Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.', rotulo: 'Excluir', resultado: 'Vers\u00e3o exclu\u00edda.', aoConfirmar: exec });
    } else if (confirm('Excluir a vers\u00e3o "' + nome + '"?')) exec();
  }
  drafts.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('button[data-a]') : null; if (!b || !b.dataset.id) return;
    const id = +b.dataset.id;
    if (b.dataset.a === 'ab') abrirVersao(id);
    else if (b.dataset.a === 'ex') excluirUma(id, b.dataset.n || '', b);
  });

  // Excluir tudo (Salvos): apaga as versoes salvas e as copias antigas dos rascunhos com nome.
  // As versoes automaticas e o ultimo estado do salvamento automatico nao sao tocados.
  async function excluirSalvas() {
    const l = await marcadas();
    for (const v of l) await dbDel('versoes', v.id);
    try {
      const rs = await dbAll('rascunhos');
      for (const r of rs) if (r && r.nome !== 'Autossalvo') await dbDel('rascunhos', r.nome);
    } catch (e) { /* repositorio antigo indisponivel */ }
    Hist.atualizar(); sujo = true; await desenhar();
    return l.length;
  }

  /* ---------------------------- Migracao unica: rascunhos -> versoes marcadas ---------------------------- */
  async function migrar() {
    try { if (localStorage.getItem(FLAG)) return 0; } catch (e) { return 0; }
    let n = 0;
    try {
      const rs = (await dbAll('rascunhos')).filter(r => r && r.nome && r.nome !== 'Autossalvo').sort((a, b) => (a.data || 0) - (b.data || 0));
      const vs = await dbAll('versoes');
      const ja = new Set(vs.filter(v => v && v.origem === 'marco').map(v => v.h + '|' + v.rotulo));
      for (const r of rs) {
        const g = r.g || '', s = r.s || '';
        if (!g.trim() && !s.trim()) continue;
        const h = hash(g + '\u0001' + s), rot = '\u2605 ' + r.nome;
        if (ja.has(h + '|' + rot)) continue;
        await dbPut('versoes', { data: r.data || Date.now(), origem: 'marco', rotulo: rot, sess: 'migracao', h, g, s, p: r.p || '', r: r.r || '', b: r.b || '', tam: g.length + s.length });
        ja.add(h + '|' + rot); n++;
      }
      localStorage.setItem(FLAG, '1');            // so depois de migrar tudo; se algo falhar, tenta de novo na proxima abertura
    } catch (e) {
      logApp('N\u00e3o foi poss\u00edvel migrar os rascunhos para Vers\u00f5es agora (' + ((e && e.message) || e) + '). Eles continuam guardados; a migra\u00e7\u00e3o ser\u00e1 tentada de novo.', 'wa');
      return n;
    }
    if (n) logApp('Rascunhos antigos migrados para Vers\u00f5es salvas: ' + n + '.', 'ok');
    Hist.atualizar(); sujo = true; if (aberta()) desenhar();
    return n;
  }

  window.SalvarVersao = {
    salvar: async nome => {
      const v = await salvar(nome);
      if (v) { try { if (window.UXFeedback && $('btnSalvar')) UXFeedback.confirmar($('btnSalvar'), 'Vers\u00e3o salva.'); } catch (e) { /* sem feedback */ } }
      return v;
    }
  };
  window.Versoes = { salvar, excluirSalvas, migrar, atualizar: () => { sujo = true; if (aberta()) desenhar(); } };

  migrar();
})();
