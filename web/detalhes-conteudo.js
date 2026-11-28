/* Conteudista: detalhes do conteúdo dentro de Gerar arquivos. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const go = $('go');
  const dxGerar = $('dxGerar');
  const dxFmt = $('dxFmt');
  const narrBox = $('narrBox');
  const vlibrasLabel = document.querySelector('label[for=vlibrasGerar]');
  const row = document.querySelector('.row');
  const log = $('log');
  const acaoGerar = document.querySelector('.acao-gerar');
  const fmtLista = document.querySelector('.fmt-lista');
  const btnMais = document.createElement('button');
  btnMais.type = 'button';
  btnMais.id = 'btnMaisFormatos';
  btnMais.setAttribute('aria-controls', 'fmtLista');
  btnMais.setAttribute('aria-expanded', 'false');

  let confirmado = false;
  try { confirmado = localStorage.getItem('conteudista.detalhesConfirmados') === '1'; } catch (e) { /* sem armazenamento */ }

  const CSS = `
#dxGerar .dg-grade{display:grid;grid-template-columns:1fr;gap:32px;margin-top:16px}
@media(min-width:1000px){#dxGerar .dg-grade{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
#dxGerar .dg-col{display:flex;flex-direction:column;gap:16px;min-width:0}
#dxGerar details.sx#dxDetalhes{border:1px solid var(--line,#ccc);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-width:0}
#dxGerar details.sx#dxDetalhes > summary{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;list-style:none;border-radius:6px}
#dxGerar details.sx#dxDetalhes > summary::-webkit-details-marker{display:none}
#dxGerar details.sx#dxDetalhes > summary::before{content:'▸';color:var(--acc,#1351b4);font-size:15px;transition:transform .15s}
#dxGerar details.sx#dxDetalhes[open] > summary::before{transform:rotate(90deg)}
#dxGerar details.sx#dxDetalhes > summary h3{margin:0;font-size:15px;flex:1}
#dxGerar #dgResumo{font-size:13px;color:var(--mu,#636363);white-space:normal;overflow-wrap:anywhere}
#dxGerar #dgResumo.dg-resumo{flex:none}
#dxGerar details.sx#dxDetalhes > summary .sxh,#dxGerar details.sx#dxDetalhes > summary .sxr{font-size:13px;color:var(--acc,#1351b4);font-weight:600}
#dxGerar details.sx#dxDetalhes[open] > summary .sxh,#dxGerar details.sx#dxDetalhes:not([open]) > summary .sxr{display:none}
#dxGerar #dgDica{margin:10px 14px 0;font-size:13px;color:var(--mu,#636363)}
#dxGerar .dg-opcoes{display:flex;flex-direction:column;gap:10px;border:1px solid var(--line,#ccc);border-radius:12px;padding:12px 14px;min-width:0}
#dxGerar .dg-opcoes h3{margin:0 0 8px;font-size:15px}
#dxGerar .dg-opcoes label.inl{display:flex;flex-direction:row-reverse;justify-content:space-between;align-items:center;gap:10px;min-height:44px;margin:0;padding:0;font-weight:400;color:var(--ink,#333)}
#dxGerar .dg-opcoes input[type=checkbox]{appearance:none;width:44px;height:26px;border:2px solid #636363;border-radius:13px;background:#fff;position:relative;cursor:pointer;margin:0}
#dxGerar .dg-opcoes input[type=checkbox]::before{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s}
#dxGerar .dg-opcoes input[type=checkbox]:checked{border-color:var(--acc,#1351b4);background:var(--acc,#1351b4)}
#dxGerar .dg-opcoes input[type=checkbox]:checked::before{transform:translateX(18px)}
#dxGerar .dg-opcoes input[type=checkbox]:focus-visible{outline:3px solid #ffdf00;outline-offset:2px}
#dxGerar .dg-opcoes input[type=checkbox][role=switch]{}
#dxGerar .dg-opcoes #narrBox.panel{border:0!important;background:transparent!important;padding:0;margin:0}
@media(forced-colors:active){
  #dxGerar .dg-opcoes input[type=checkbox]{forced-color-adjust:none;border:2px solid ButtonText;background:Canvas;color:ButtonText}
  #dxGerar .dg-opcoes input[type=checkbox]:checked{background:Highlight;border-color:Highlight}
  #dxGerar .dg-opcoes input[type=checkbox]:checked::before{background:HighlightText}
}
html.contraste #dxGerar .dg-opcoes input[type=checkbox]:checked{border-color:#ffdf00!important;background:#ffdf00!important}
#dxGerar .fmt-lista{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0}
#dxGerar .fmt-lista label.inl{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 14px;border:1px solid var(--line,#888);border-radius:22px;background:#fff;color:var(--acc,#1351b4);font-weight:600;cursor:pointer;margin:0;position:relative}
#dxGerar .fmt-lista label.inl input{position:absolute;inset:0;opacity:0;margin:0;width:100%;height:100%;cursor:pointer}
#dxGerar .fmt-lista label.inl::before{content:'✓ ';opacity:0}
#dxGerar .fmt-lista label.inl:has(input:checked){background:var(--acc,#1351b4);color:#fff;border-color:var(--acc,#1351b4)}
#dxGerar .fmt-lista label.inl:has(input:checked)::before{opacity:1}
#dxGerar .fmt-lista label.inl:has(input:focus-visible){outline:3px solid #ffdf00;outline-offset:2px}
#dxGerar .fmt-lista .dg-extra.dg-oculto{display:none}
#dxGerar #btnMaisFormatos{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 14px;border:1px solid var(--line,#888);border-radius:22px;background:#fff;color:var(--acc,#1351b4);font-weight:600;cursor:pointer;margin:0}
#dxGerar #btnMaisFormatos:hidden,#dxGerar #btnMaisFormatos[hidden]{display:none}
#dxGerar #go{width:100%;height:52px;min-height:52px;border-radius:26px;background:var(--acc,#1351b4);color:#fff;border:0;font-weight:600;font-size:16px;cursor:pointer;position:relative;overflow:hidden}
#dxGerar #go::before{content:'';position:absolute;inset:0;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'/%3E%3C/svg%3E") center/24px 24px no-repeat;mask:url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'/%3E%3C/svg%3E") center/24px 24px no-repeat}
@media(forced-colors:active){#dxGerar #go{forced-color-adjust:none;background:ButtonFace;color:ButtonText;border:1px solid ButtonText}}
`;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  function resumo() {
    const pref = $('pref') && $('pref').value.trim();
    const tema = $('tema') && $('tema').options[$('tema').selectedIndex] && $('tema').options[$('tema').selectedIndex].text;
    const lic = $('licenca') && $('licenca').value;
    const licNome = $('licenca') && $('licenca').options[$('licenca').selectedIndex] && $('licenca').options[$('licenca').selectedIndex].text;
    const partes = [];
    if (pref) partes.push(pref);
    if (tema) partes.push(tema);
    if (lic && licNome && licNome !== 'Sem licenciamento') partes.push(licNome);
    const el = $('dgResumo');
    if (el) el.textContent = partes.join(' · ');
  }

  function montar() {
    if (!dxGerar || !dxFmt || !go) return;
    if ($('dxDetalhes')) return;

    const grade = document.createElement('div');
    grade.className = 'dg-grade';

    // Coluna esquerda
    const colEsq = document.createElement('div');
    colEsq.className = 'dg-col';

    const dxDetalhes = document.createElement('details');
    dxDetalhes.className = 'sx';
    dxDetalhes.id = 'dxDetalhes';
    const summary = document.createElement('summary');
    const h3 = document.createElement('h3');
    h3.id = 'tDetalhes';
    h3.textContent = 'Detalhes do conteúdo';
    const resumoEl = document.createElement('span');
    resumoEl.id = 'dgResumo';
    resumoEl.className = 'dg-resumo';
    const sxh = document.createElement('span');
    sxh.className = 'sxh';
    sxh.textContent = 'mostrar';
    const sxr = document.createElement('span');
    sxr.className = 'sxr';
    sxr.textContent = 'recolher';
    summary.append(h3, resumoEl, sxh, sxr);
    dxDetalhes.appendChild(summary);

    const dica = document.createElement('p');
    dica.id = 'dgDica';
    dica.hidden = true;
    dica.textContent = 'Confira os detalhes do conteúdo e clique em Gerar arquivos de novo.';
    dxDetalhes.appendChild(dica);

    if (row) {
      const prefCel = row.querySelector('div > label[for=pref]').parentElement;
      const rodCel = row.querySelector('div > label[for=rod]').parentElement;
      if (prefCel) prefCel.classList.add('dg-largo');
      if (rodCel) rodCel.classList.add('dg-largo');
      dxDetalhes.appendChild(row);
    }

    const dgOpcoes = document.createElement('div');
    dgOpcoes.className = 'dg-opcoes';
    dgOpcoes.setAttribute('role', 'group');
    dgOpcoes.setAttribute('aria-labelledby', 'tOpcoesGerar');
    const hOpcoes = document.createElement('h3');
    hOpcoes.id = 'tOpcoesGerar';
    hOpcoes.textContent = 'Opções';
    dgOpcoes.appendChild(hOpcoes);
    if (vlibrasLabel) {
      const cb = vlibrasLabel.querySelector('input#vlibrasGerar');
      if (cb) cb.setAttribute('role', 'switch');
      dgOpcoes.appendChild(vlibrasLabel);
    }
    if (narrBox) {
      const cb = narrBox.querySelector('input#narrOn');
      if (cb) cb.setAttribute('role', 'switch');
      dgOpcoes.appendChild(narrBox);
    }
    colEsq.append(dxDetalhes, dgOpcoes);

    // Coluna direita
    const colDir = document.createElement('div');
    colDir.className = 'dg-col';

    const fmtListaWrap = dxFmt.querySelector('.fmt-lista');
    if (fmtListaWrap) {
      const visiveis = ['fmtHtml', 'fmtMd', 'fmtDocx', 'fmtPptx', 'fmtEpub', 'fmtPdf'];
      fmtListaWrap.querySelectorAll('label.inl').forEach(label => {
        const cb = label.querySelector('input');
        if (!cb) return;
        if (!visiveis.includes(cb.id)) label.classList.add('dg-extra');
      });
      btnMais.textContent = '+ ' + fmtListaWrap.querySelectorAll('.dg-extra').length + ' formatos';
      fmtListaWrap.appendChild(btnMais);
    }
    colDir.appendChild(dxFmt);

    const aviso = $('laAviso');
    const moverAviso = () => {
      if (!aviso || !acaoGerar) return;
      if (aviso.nextElementSibling !== acaoGerar) acaoGerar.before(aviso);
    };
    if (aviso) new MutationObserver(moverAviso).observe(colDir, { childList: true, subtree: true });

    if (acaoGerar) colDir.appendChild(acaoGerar);
    if (log) colDir.appendChild(log);

    grade.append(colEsq, colDir);
    const summaryRef = dxGerar.querySelector('summary');
    if (summaryRef) summaryRef.after(grade);
    else dxGerar.appendChild(grade);

    dxFmt.setAttribute('open', '');
    dxDetalhes.addEventListener('toggle', () => {
      if (!dxDetalhes.open) {
        fmtListaWrap.querySelectorAll('.dg-extra:not(:has(input:checked))').forEach(el => el.classList.add('dg-oculto'));
      }
    });
    btnMais.addEventListener('click', () => {
      const extras = fmtListaWrap ? fmtListaWrap.querySelectorAll('.dg-extra') : [];
      const ocultos = [...extras].filter(el => el.classList.contains('dg-oculto'));
      extras.forEach(el => el.classList.remove('dg-oculto'));
      const aberto = ocultos.length === 0;
      btnMais.setAttribute('aria-expanded', String(!aberto));
      btnMais.textContent = aberto ? 'Menos formatos' : '+ ' + extras.length + ' formatos';
      if (!aberto) extras.forEach(el => el.classList.add('dg-oculto'));
    });
    if (fmtListaWrap) {
      const nExtra = fmtListaWrap.querySelectorAll('.dg-extra').length;
      if (nExtra === 0) btnMais.hidden = true;
    }

    resumo();
    ['input', 'change'].forEach(ev => {
      document.addEventListener(ev, e => {
        if (e.target && (e.target.id === 'pref' || e.target.id === 'rod' || e.target.id === 'tema' || e.target.id === 'licenca')) resumo();
      }, true);
    });
    setInterval(resumo, 1500);
  }

  function abrir() {
    const dxGerarEl = $('dxGerar');
    const dxDetalhesEl = $('dxDetalhes');
    if (dxGerarEl) dxGerarEl.open = true;
    if (dxDetalhesEl) dxDetalhesEl.open = true;
    const dica = $('dgDica');
    if (dica) dica.hidden = false;
    const pref = $('pref');
    if (pref) { pref.scrollIntoView({ behavior: 'auto', block: 'center' }); pref.focus({ preventScroll: true }); }
    if (typeof UXFeedback !== 'undefined' && UXFeedback.anunciar) UXFeedback.anunciar('Detalhes do conteúdo abertos. Confira nome, rodapé, layout e licença antes de gerar.');
  }

  function fechar() {
    const dxDetalhesEl = $('dxDetalhes');
    if (dxDetalhesEl) dxDetalhesEl.open = false;
  }

  function interceptar(e) {
    if (!go || !go.contains(e.target)) return;
    if (go.disabled || go.getAttribute('aria-disabled') === 'true') return;
    const temConteudo = ($('g') && $('g').value.trim()) || ($('s') && $('s').value.trim()) || $('editorArea').dataset.criarZero === '1';
    if (!temConteudo) return;
    if (confirmado) return;
    if ($('dxDetalhes') && $('dxDetalhes').open) { confirmado = true; return; }
    e.preventDefault();
    e.stopImmediatePropagation();
    abrir();
    confirmado = true;
  }

  window.addEventListener('click', interceptar, true);

  document.addEventListener('click', e => {
    if (!go || !go.contains(e.target)) return;
    const dica = $('dgDica');
    if (dica && !dica.hidden) dica.hidden = true;
  }, true);

  ['input', 'change'].forEach(ev => {
    document.addEventListener(ev, e => {
      if (!e.isTrusted) return;
      if (e.target && (e.target.id === 'pref' || e.target.id === 'rod' || e.target.id === 'tema' || e.target.id === 'licenca')) {
        confirmado = true;
        try { localStorage.setItem('conteudista.detalhesConfirmados', '1'); } catch (err) { /* sem armazenamento */ }
      }
    }, true);
  });

  try {
    if (!confirmado) localStorage.setItem('conteudista.detalhesConfirmados', '0');
  } catch (e) { /* sem armazenamento */ }

  window.DetalhesConteudo = {
    confirmados: () => confirmado,
    confirmar: () => { confirmado = true; try { localStorage.setItem('conteudista.detalhesConfirmados', '1'); } catch (e) { /* sem armazenamento */ } },
    abrir,
    fechar
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', montar);
  else montar();
})();
