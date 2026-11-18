/* =====================================================================================
   Conteudista — Ajuda contextual de licenciamento (Creative Commons e CC0)
   - Botão ⓘ ao lado de "Licenciamento" abre uma janela no padrão gov.br
   - Reutiliza os estilos .md-back/.md-win/.md-hd/.md-bd de ajuda.js
   - Explica as licenças, mostra tabela comparativa e links oficiais
     (resumo "deed" e texto jurídico completo)
   - Destaque da licença selecionada, atualizado em tempo real
   - Teclado: Tab, Enter/Espaço (botão), Esc fecha e o foco volta ao ⓘ
   ===================================================================================== */
(function () {
  'use strict';

  var LICENCAS = [
    { valor: 'cc-by-4.0',        sigla: 'CC BY 4.0',        uso: true,  mod: true,  comp: false },
    { valor: 'cc-by-sa-4.0',     sigla: 'CC BY-SA 4.0',     uso: true,  mod: true,  comp: true  },
    { valor: 'cc-by-nd-4.0',     sigla: 'CC BY-ND 4.0',     uso: true,  mod: false, comp: false },
    { valor: 'cc-by-nc-4.0',     sigla: 'CC BY-NC 4.0',     uso: false, mod: true,  comp: false },
    { valor: 'cc-by-nc-sa-4.0',  sigla: 'CC BY-NC-SA 4.0',  uso: false, mod: true,  comp: true  },
    { valor: 'cc-by-nc-nd-4.0',  sigla: 'CC BY-NC-ND 4.0',  uso: false, mod: false, comp: false },
    { valor: 'cc0-1.0',          sigla: 'CC0 1.0',          uso: true,  mod: true,  comp: false }
  ];

  function urlResumo(l) {
    if (l.valor === 'cc0-1.0') return 'https://creativecommons.org/publicdomain/zero/1.0/deed.pt-br';
    return 'https://creativecommons.org/licenses/' + l.valor.replace(/^cc-/, '').replace(/-4\.0$/, '') + '/4.0/deed.pt-br';
  }

  function urlJuridico(l) {
    if (l.valor === 'cc0-1.0') return 'https://creativecommons.org/publicdomain/zero/1.0/legalcode';
    return 'https://creativecommons.org/licenses/' + l.valor.replace(/^cc-/, '').replace(/-4\.0$/, '') + '/4.0/legalcode.pt';
  }

  function licencaAtual() {
    var sel = document.getElementById('licenca');
    if (!sel || !sel.value) return null;
    for (var i = 0; i < LICENCAS.length; i++) {
      if (LICENCAS[i].valor === sel.value) return LICENCAS[i];
    }
    return null;
  }

  function link(url, texto, rotulo) {
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
      esc(rotulo || texto) + ' (abre em nova aba)">' + esc(texto) + '</a>';
  }

  function htmlDestaque(l) {
    if (!l) return '';
    var isCC0 = l.valor === 'cc0-1.0';
    var permite = isCC0
      ? ['Qualquer uso, inclusive comercial', 'Modificações e obras derivadas', 'Redistribuição sem atribuição obrigatória']
      : [l.uso ? 'Uso comercial' : null, l.mod ? 'Modificações e obras derivadas' : null, 'Compartilhamento'].filter(Boolean);
    var exige = isCC0 ? [] : [
      'Atribuição ao autor original',
      l.comp ? 'Compartilhar adaptações sob a mesma licença' : null,
      !l.uso ? 'Somente uso não comercial' : null,
      !l.mod ? 'Sem compartilhar adaptações (SemDerivações)' : null
    ].filter(Boolean);
    return '<div class="la-destaque">' +
      '<b>Licença selecionada: ' + esc(l.sigla) + '</b>' +
      (isCC0 ? '<br><small>Dedicação ao domínio público — uso livre, sem atribuição obrigatória.</small>' : '') +
      (permite.length ? '<br><span class="la-ok" aria-hidden="true">✓</span> <b>Permite:</b> ' + permite.join(' · ') : '') +
      (exige.length ? '<br><span class="la-wa" aria-hidden="true">⚑</span> <b>Exige:</b> ' + exige.join(' · ') : '') +
      '<br>' + link(urlResumo(l), 'Ver resumo oficial', 'Resumo da licença ' + l.sigla) +
      ' · ' + link(urlJuridico(l), 'Texto jurídico completo', 'Texto jurídico da licença ' + l.sigla) +
      '</div>';
  }

  function htmlTabela() {
    function sim() { return '<span class="la-ok" aria-hidden="true">✓</span><span class="la-sr">sim</span>'; }
    function nao() { return '<span class="la-err" aria-hidden="true">✗</span><span class="la-sr">não</span>'; }
    var linhas = LICENCAS.map(function (l) {
      return '<tr>' +
        '<th scope="row">' + esc(l.sigla) + '</th>' +
        '<td style="text-align:center">' + (l.uso ? sim() : nao()) + '</td>' +
        '<td style="text-align:center">' + (l.mod ? sim() : nao()) + '</td>' +
        '<td style="text-align:center">' + (l.comp ? sim() : nao()) + '</td>' +
        '<td>' + link(urlResumo(l), 'Resumo', 'Resumo da licença ' + l.sigla) + '</td>' +
        '<td>' + link(urlJuridico(l), 'Jurídico', 'Texto jurídico da licença ' + l.sigla) + '</td>' +
        '</tr>';
    }).join('');
    return '<table>' +
      '<caption class="la-sr">Comparação das licenças Creative Commons e CC0</caption>' +
      '<thead><tr><th scope="col">Licença</th><th scope="col">Uso comercial</th><th scope="col">Modificações</th>' +
      '<th scope="col">Compartilhamento obrigatório</th><th scope="col">Resumo</th><th scope="col">Texto jurídico</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody></table>' +
      '<p class="la-nota">Todas as licenças Creative Commons exigem atribuição ao autor, exceto a CC0. ' +
      'Os links abrem em nova aba, no site oficial da Creative Commons.</p>';
  }

  function htmlConteudo() {
    var atual = licencaAtual();
    return (atual ? htmlDestaque(atual) : '') +
      '<h4>O que são as licenças Creative Commons?</h4>' +
      '<p>As licenças Creative Commons permitem que o autor defina, de forma padronizada e juridicamente reconhecida, ' +
      'como outras pessoas podem usar, compartilhar e adaptar a obra. São seis combinações, formadas por quatro condições: ' +
      '<b>Atribuição (BY)</b>, <b>CompartilhaIgual (SA)</b>, <b>SemDerivações (ND)</b> e <b>NãoComercial (NC)</b>.</p>' +
      '<p>O <b>CC0</b> (Creative Commons Zero) é diferente das demais: em vez de licenciar, o autor <b>dedica a obra ao ' +
      'domínio público</b>, renunciando aos direitos autorais na maior extensão permitida pela legislação aplicável. ' +
      'Por isso, o uso é livre e a atribuição não é obrigatória.</p>' +
      '<div class="dica">Utilize apenas materiais sobre os quais você tenha direitos ou autorização. ' +
      'Marcas e materiais de terceiros não são abrangidos automaticamente pela licença escolhida.</div>' +
      '<h4>Comparação rápida</h4>' +
      htmlTabela();
  }

  var st = document.createElement('style');
  st.textContent =
    '.la-destaque{background:#dbe8fb;border-left:4px solid #1351b4;padding:8px 12px;border-radius:0 6px 6px 0;' +
    'margin:0 0 12px;font-size:13.5px;line-height:1.6}' +
    '.la-destaque b{color:#0c326f}.la-destaque small{color:#555}' +
    '.la-ok{color:#168821;font-weight:700}.la-err{color:#b00020;font-weight:700}.la-wa{color:#8a5c00}' +
    '.la-nota{font-size:13px;color:#636363;margin-top:6px}' +
    '.la-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
    'html.contraste .la-destaque{background:#000;color:#fff;border-left-color:#ff0}html.contraste .la-destaque b{color:#ff0}';
  document.head.appendChild(st);

  var origemFoco = null;
  var janelaAberta = null;

  function fecharJanela() {
    if (!janelaAberta) return;
    var back = janelaAberta;
    janelaAberta = null;
    var sel = document.getElementById('licenca');
    if (sel && back._aoMudar) sel.removeEventListener('change', back._aoMudar);
    back.remove();
    if (origemFoco && origemFoco.isConnected) origemFoco.focus();
    origemFoco = null;
  }

  function abrirJanela() {
    if (janelaAberta) fecharJanela();
    origemFoco = document.activeElement;

    var back = document.createElement('div');
    back.className = 'md-back';
    back.id = 'laBack';
    back.innerHTML =
      '<div class="md-win" role="dialog" aria-modal="true" aria-labelledby="laT">' +
        '<div class="md-hd">' +
          '<h3 id="laT">Licenciamento do conteúdo</h3>' +
          '<button type="button" class="sec" id="laX" title="Fechar (Esc)">Fechar ✕</button>' +
        '</div>' +
        '<div class="md-bd" id="laBd">' + htmlConteudo() + '</div>' +
      '</div>';
    document.body.appendChild(back);
    janelaAberta = back;

    var janela = back.querySelector('[role="dialog"]');
    var fechar = back.querySelector('#laX');

    function aoTeclar(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        fecharJanela();
        return;
      }
      if (e.key !== 'Tab') return;
      var focaveis = janela.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focaveis.length) return;
      var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault(); primeiro.focus();
      }
    }

    back.addEventListener('click', function (e) { if (e.target === back) fecharJanela(); });
    fechar.addEventListener('click', fecharJanela);
    document.addEventListener('keydown', aoTeclar, true);
    back._aoTeclar = aoTeclar;

    var sel = document.getElementById('licenca');
    if (sel) {
      back._aoMudar = function () {
        var bd = document.getElementById('laBd');
        if (bd) bd.innerHTML = htmlConteudo();
      };
      sel.addEventListener('change', back._aoMudar);
    }

    fechar.focus();
  }

  // Remove o listener de teclado quando a janela sai do DOM por outro caminho
  var observador = new MutationObserver(function () {
    if (janelaAberta && !document.body.contains(janelaAberta)) {
      var back = janelaAberta;
      janelaAberta = null;
      if (back._aoTeclar) document.removeEventListener('keydown', back._aoTeclar, true);
      var sel = document.getElementById('licenca');
      if (sel && back._aoMudar) sel.removeEventListener('change', back._aoMudar);
    }
  });

  function vincular() {
    var btn = document.getElementById('btnAjudaLicenca');
    if (btn) btn.addEventListener('click', abrirJanela);
    if (document.body) observador.observe(document.body, { childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vincular);
  } else {
    vincular();
  }

  window.LicencasAjuda = { abrir: abrirJanela, fechar: fecharJanela };
})();
