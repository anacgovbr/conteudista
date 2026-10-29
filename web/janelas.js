/* =====================================================================================
   Conteudista - Janelas: Importar, Historico de arquivos e Compartilhar (etapa 1)

   - Barra de acoes: Importar | Carregar exemplo | Limpar tela | chave "Salvar automatico", com o status do ultimo salvamento.
   - Salvar \u25be (menu): fica ao lado de "Gerar arquivos" e reune Guardar no navegador, Baixar tudo (.zip), Compartilhar link,
     Salvar na pasta e Baixar .md. E o unico caminho para guardar o conteudo.
   - Compartilhar link (1.64): a MESMA janela abre por tres botoes: na barra de acoes (depois de Importar), na barra de
     ferramentas de cada editor (so icone) e ao lado de Salvar \u25be. No celular o rotulo vira "Link" (nome acessivel completo).
   - Importar: janela com abas Salvos, Computador e Colar (uma aba por origem).
   - Historico de arquivos: janela aberta pelo botao ao lado do titulo "Arquivos gerados".
   - Compartilhar link: janela com destino, senha, lembrar links e tamanho (aberta pelo menu Salvar).
   - Os blocos que ja existem (rascunhos, links, pacotes guardados, campos do link) sao MOVIDOS para
     as janelas; os ids e os manipuladores continuam os mesmos.
   - Excluir tudo, Excluir versoes salvas, Excluir links e a exclusao de cada item usam confirmacao acessivel: role="alertdialog" com titulo e descricao,
     foco inicial em Cancelar, Esc cancela, sem limite de tempo, foco devolvido e resultado anunciado
     por regiao aria-live.
   - Teclado: Esc fecha; setas, Home e End trocam de aba; Tab nao sai da janela; menu Salvar com setas,
     Home, End, Esc e Tab.
   API: window.Importar, window.HistoricoArquivos, window.Compartilhar e window.AbrirJanela (alias).
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const ex = $('ex');
  if (!ex || !ex.parentNode) return;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const ICON = {
    arq: '<path d="M4 4h10l6 6v10H4z"/><path d="M14 4v6h6"/>',
    sav: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    pc: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
    cl: '<rect x="6" y="4" width="12" height="17" rx="1"/><path d="M9 4h6v3H9z"/>',
    rasc: '<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/><path d="M5.5 9h3M5.5 13h3M15.5 9h3M15.5 13h3"/>',
    lnk: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    shr: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    up: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    hist: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 3"/>'
  };
  const svg = k => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON[k] + '</svg>';
  const uri = k => 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1351b4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[k] + '</svg>') + '")';
  const contar = el => el ? new Set([...el.querySelectorAll('td, li[data-busca]')].map(x => x.tagName === 'TD' ? x.parentElement : x)).size : 0;
  const aguardar = (fn, ms) => new Promise(ok => { const t0 = Date.now(); (function p() { if (fn() || Date.now() - t0 > (ms || 3000)) return ok(); setTimeout(p, 100); })(); });
  const semConfirmar = fn => { const o = window.confirm; window.confirm = () => true; try { fn(); } finally { window.confirm = o; } };
  const feedback = (el, m) => { try { if (window.UXFeedback && UXFeedback.confirmar && el) UXFeedback.confirmar(el, m); } catch (e) { /* sem feedback */ } };
  const anunciarGlobal = m => { try { if (window.UXFeedback && UXFeedback.anunciar) UXFeedback.anunciar(m); } catch (e) { /* sem anuncio */ } };
  const logApp = (m, c) => { try { if (typeof log === 'function') log(m, c); } catch (e) { /* sem log */ } };

  /* ---------------------------- Estilos ---------------------------- */
  const css = `
.jn-back{position:fixed;inset:0;z-index:1800;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:24px 14px;overflow:auto}
.jn-back[hidden]{display:none}
.jn-win{--jn-line:#cccccc;--jn-mut:#636363;--jn-pri:#0c326f;--jn-acc:#1351b4;background:#fff;color:#333333;border-radius:8px;width:min(900px,100%);max-height:calc(100vh - 48px);display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.35)}
.jn-win.jn-peq{width:min(560px,100%)}
.jn-top{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--jn-line)}
.jn-top h2{flex:1;margin:0;font-size:19px;color:var(--jn-pri)}
.jn-win button{margin:0}
.jn-tabs{display:flex;padding:0 12px;border-bottom:1px solid var(--jn-line);overflow-x:auto;overflow-y:hidden}
.jn-win>.jn-top,.jn-win>.jn-tabs,.jn-win>.jn-msg,.jn-win>.jn-foot{flex:0 0 auto}
.jn-back .jn-tab{display:inline-flex;align-items:center;gap:7px;height:46px!important;min-height:46px!important;max-height:none!important;padding:0 16px!important;margin:0!important;background:transparent!important;background-image:none!important;color:var(--jn-mut)!important;border:0!important;border-bottom:3px solid transparent!important;border-radius:0!important;box-shadow:none!important;font-size:15px!important;font-weight:500!important;line-height:1!important;white-space:nowrap}
.jn-back .jn-tab:hover{background:rgba(19,81,180,.08)!important}
.jn-back .jn-tab:focus-visible{outline-offset:-4px!important}
.jn-back .jn-tab[aria-selected="true"]{color:var(--jn-acc)!important;border-bottom-color:var(--jn-acc)!important;font-weight:600!important}
.jn-tab svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.jn-ct{background:#dbe8fb;color:#0c326f;border-radius:10px;padding:0 7px;font-size:12px;font-weight:700;line-height:18px}
.jn-ct:empty{display:none}
.jn-msg{margin:10px 18px 0;padding:8px 12px;border-left:6px solid #e52207;background:#fde0db;border-radius:0 6px 6px 0;font-size:13.5px}
.jn-msg.info{border-left-color:#155bcb;background:#edf5ff}
.jn-msg[hidden]{display:none}
.jn-panes{flex:1 1 auto;min-height:0;overflow:auto}
.jn-pane{padding:12px 18px 14px}
.jn-pane[hidden]{display:none}
.jn-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:10px 18px;border-top:1px solid var(--jn-line)}
.jn-foot[hidden]{display:none}
.jn-bt{display:flex;align-items:center;flex-wrap:wrap;gap:8px;flex:1 1 auto}
.jn-bt[hidden]{display:none}
.jn-peq .jn-bt{justify-content:flex-end}
.jn-bt .jn-tam{margin:0 auto 0 0;font-size:13px}
.jn-conf{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:10px 14px;background:#fde0db;border-left:6px solid #e52207;border-radius:0 6px 6px 0}
.jn-conf[hidden]{display:none}
.jn-conf-tx{flex:1 1 280px;min-width:0}
.jn-conf-tx strong{display:block;color:#333333;font-size:15px}
.jn-conf-tx p{margin:3px 0 0;font-size:13.5px;color:#333333}
.jn-conf-bt{display:flex;gap:8px;flex:0 0 auto}
.jn-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.jn-sub{margin:12px 0 2px;font-size:14px;color:var(--jn-mut)}
.jn-g:first-child .jn-sub{margin-top:0}
.jn-hint{display:block;margin:4px 0 0;font-size:12.5px;color:var(--jn-mut);font-weight:400}
.jn-lb{display:block;margin:10px 0 4px;font-weight:600;font-size:13px}
.jn-pane textarea{width:100%;min-height:130px;padding:8px 10px;border:1px solid #888888;border-radius:4px;font:13px/1.45 Consolas,"Cascadia Mono",monospace;resize:vertical}
.jn-pane select,.jn-pane input[type=password],.jn-pane input[type=text],.jn-pane input[type=url]{width:100%;max-width:420px}
.jn-acoes{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.jn-dz{display:flex;align-items:center;justify-content:center;gap:8px;min-height:96px;border:2px dashed var(--jn-acc);border-radius:6px;color:var(--jn-acc);font-weight:600;cursor:pointer;background:#edf5ff;text-align:center;padding:10px}
.jn-dz.sobre{border-color:#168821;background:#e3f5e1;color:#0f5e17}
.jn-dz svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.jn-lista{margin:8px 0 0}
.jn-it{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--jn-line);min-height:46px}
.jn-it:first-child{border-top:0}
.jn-ico{display:inline-flex;color:var(--jn-acc)}
.jn-ico svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.jn-it-m{flex:1;min-width:0}
.jn-it-m b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jn-it-m small{color:var(--jn-mut)}
.jn-it select{width:150px;max-width:150px}
.jn-it-d{color:var(--jn-mut);font-size:13px;min-width:150px}
.jn-pane table{display:block;width:100%;margin:0;border:0;font-size:13.5px}
.jn-pane tbody{display:block}
.jn-pane tr{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0;padding:9px 2px;border:0;border-top:1px solid var(--jn-line);background:transparent}
.jn-pane tr:first-child,.jn-pane tr:has(> th) + tr{border-top:0}
.jn-pane tr:has(> th){display:none}
.jn-pane tr::before{content:"";flex:0 0 22px;width:22px;height:22px;background-repeat:no-repeat;background-position:center;background-size:contain}
.jn-arq tr::before{background-image:${uri('arq')}}
.jn-back .jn-pane td{display:block;width:auto;max-width:none;margin:0;border:0!important;padding:0!important;font-size:13px;vertical-align:baseline}
.jn-back .jn-pane td::before{content:none!important}
.jn-pane td button,.jn-pane td .btn{margin:2px 4px 2px 0}
.jn-arq td:nth-child(1){order:1;flex:1 1 180px;min-width:0}

.jn-arq td:nth-child(3){order:2}
.jn-back .jn-arq td:nth-child(2){order:3;flex:1 1 100%;padding-left:34px!important}
/* Salvos: grupos e itens (padrao List/Item e Button terciario do Design System gov.br) */
.sv-grupo{margin:0 0 26px}
.sv-grupo:last-child{margin-bottom:6px}
.sv-cab{display:flex;align-items:center;gap:8px}
.jn-win .sv-cab h3{display:flex;align-items:center;gap:8px;margin:0;font-size:17px;font-weight:700;color:#333333}
.sv-desc{margin:2px 0 0;font-size:13.5px;color:var(--jn-mut)}
.jn-back .sv-ter{display:inline-flex!important;align-items:center;justify-content:center;height:32px!important;min-height:32px!important;max-height:32px!important;margin:0!important;padding:0 2px!important;border:0!important;border-radius:4px!important;background:transparent!important;background-image:none!important;box-shadow:none!important;color:#1351b4!important;font-size:14.4px!important;font-weight:600!important;line-height:1!important;text-decoration:none!important;white-space:nowrap}
.jn-back .sv-ter:hover:not(:disabled){text-decoration:underline!important}
.jn-back .sv-ter[aria-expanded="true"]{background:#dbe8fb!important;box-shadow:0 0 0 4px #dbe8fb!important}
.jn-back .sv-ter.sv-dan{color:#e52207!important}
.jn-back .sv-ter.sv-dan:hover:not(:disabled){text-decoration:underline!important}
.jn-back .sv-grupo>.sv-ter{margin-left:-2px!important}
.sv-lista{list-style:none;margin:8px 0 0;padding:0;border-top:1px solid var(--jn-line)}
.sv-item{display:grid;grid-template-columns:28px minmax(0,1fr);grid-template-areas:"ico corpo" ". acoes" ". qr";column-gap:12px;row-gap:8px;align-items:start;margin:0;padding:14px 0;border-bottom:1px solid var(--jn-line)}
.sv-ico{grid-area:ico;display:inline-flex;padding-top:1px;color:#1351b4}
.sv-ico svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.sv-corpo{grid-area:corpo;min-width:0}
.sv-corpo p{margin:0}
.sv-tit{font-size:15px;font-weight:600;line-height:1.35;color:#333333;overflow-wrap:anywhere}
.sv-meta{margin-top:2px!important;font-size:13px;line-height:1.45;color:var(--jn-mut);overflow-wrap:anywhere}
.sv-meta a{color:#1351b4}
.sv-meta code{padding:0 5px;border-radius:3px;background:#dbe8fb;color:#0c326f;font-size:12px}
.sv-acoes{grid-area:acoes;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}
.jn-back .sv-acoes .mini{margin:0!important}
.sv-qr{grid-area:qr;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:12px;border:1px solid var(--jn-line);border-radius:8px;background:#f8f8f8}
.sv-qr[hidden]{display:none}
.sv-qrbox{display:grid;place-items:center;width:114px;height:114px;padding:3px;border:1px solid #dddddd;border-radius:4px;background:#ffffff}
.sv-qrbox svg,.sv-qrbox img,.sv-qrbox canvas{display:block;width:104px!important;height:104px!important}
.sv-qrbox .qr-off{font-size:11px;text-align:center;color:#636363}
.sv-qrtx{max-width:260px;margin:0;font-size:13px;color:var(--jn-mut)}
.sv-vazio{margin:10px 0 0;font-size:14px;color:var(--jn-mut)}
html.contraste .sv-tit,html.contraste .jn-win .sv-cab h3{color:#fff!important}
html.contraste .sv-meta,html.contraste .sv-desc,html.contraste .sv-vazio,html.contraste .sv-qrtx{color:#fff!important}
html.contraste .jn-back .sv-ter,html.contraste .sv-meta a,html.contraste .sv-ico{color:#ff0!important}
html.contraste .sv-qr{background:#000;border-color:#fff}
.jn-win #gerBox{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
.jn-win #gerBox>h3{display:none}
.jn-win #gerLimpar{display:none}
.jn-win #gerBox .gtop{margin:0 0 4px}
.jn-win #gerBox .uso{margin:8px 0 0}
.jn-win #pbopts{margin-top:8px}
.jn-win .jn-pane>label:first-child{margin-top:0}
.ger-tit{display:flex;align-items:center;gap:10px}
.ger-tb.mde-tb{display:inline-flex!important;padding:0!important;background:transparent!important;border:0!important;flex:0 0 auto}
.jn-barra{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.jn-barra button{margin:0}
.jn-barra button svg,.jn-dd>button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-3px;margin-left:6px}
.jn-ic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-3px;margin:0 6px 0 0;flex:none}
.jn-barra button svg.jn-ic,.jn-par button svg.jn-ic{margin:0 6px 0 0}
.jn-rc{display:none}
.acao-gerar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 12px}
.acao-gerar .jn-dd{vertical-align:top}
body .acao-gerar #go{margin:0}
.jn-par{display:inline-flex;align-items:center;gap:8px 12px;flex-wrap:wrap;justify-content:center}
body .acao-gerar .jn-dd>#btnSalvar,body .acao-gerar .jn-par>#btnCompartilharAcao{--btn-h:48px;margin:0;padding:0 28px;font-size:18px}
body .acao-gerar .jn-par>#btnCompartilharAcao .jn-ic{width:18px;height:18px}
.mde-tb button.hbtn.jn-cmpbtn{min-width:30px;justify-content:center}
.mde-tb button.hbtn.jn-cmpbtn svg{margin:0}
.acao-gerar .jn-mn{min-width:320px;max-width:calc(100vw - 32px)}
.jn-mn .jn-sepm{height:1px;margin:4px 6px;background:#cccccc}
.jn-autost{margin:-4px 0 10px;font-size:13px;line-height:1.4;color:#636363}
.jn-autost.ok{color:#168821}
html.contraste .jn-autost,html.contraste .jn-autost.ok{color:#fff!important}
html.contraste .jn-mn .jn-sepm{background:#fff}
.jn-sp{flex:1 1 12px}
.jn-dd{position:relative;display:inline-block}
.jn-mn{position:absolute;top:calc(100% + 4px);left:0;z-index:60;min-width:240px;background:#fff;border:1px solid #cccccc;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:4px}
.jn-mn[hidden]{display:none}
.jn-mn .jn-mi{display:flex!important;align-items:center;gap:10px;width:100%;height:auto!important;min-height:44px!important;max-height:none!important;margin:0!important;padding:6px 10px!important;background:transparent!important;background-image:none!important;color:#333333!important;border:0!important;border-radius:6px!important;text-align:left!important;white-space:normal!important;overflow:visible!important;line-height:1.3!important;font-weight:400!important;font-size:14px!important}
.jn-mn .jn-mi:hover,.jn-mn .jn-mi:focus{background:#edf5ff!important}
.jn-mn .jn-mi svg{width:18px;height:18px;margin:0;vertical-align:0;fill:none;stroke:#1351b4;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.jn-mi b{display:block;font-weight:600}
.jn-mi small{display:block;color:#636363;font-size:12.5px}
.jn-sw{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;position:relative;margin:0;font-weight:600;color:#333333}
.jn-sw input{position:absolute;opacity:0;width:38px;height:22px;margin:0;left:0;cursor:pointer}
.jn-tr{width:38px;height:22px;border-radius:11px;background:#636363;position:relative;flex:none;transition:background .15s}
.jn-tr::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
.jn-sw input:checked+.jn-tr{background:#1351b4}
.jn-sw input:checked+.jn-tr::after{left:19px}
.jn-sw input:focus-visible+.jn-tr{outline:4px dashed #c2850c;outline-offset:3px}
#secShare{display:none!important}
.jn-win [hidden]{display:none!important}
.jn-busca{margin:0 0 14px}
.jn-busca .jn-lb{margin:0 0 4px}
.jn-bi-c{position:relative;display:flex;align-items:center}
.jn-win .jn-bi-c input[type=search]{width:100%;max-width:none;min-height:40px;padding:0 44px 0 12px;border:1px solid #888888;border-radius:4px;background:#fff;color:#333333;font:inherit;-webkit-appearance:none;appearance:none}
.jn-bi-c input[type=search]::-webkit-search-decoration,.jn-bi-c input[type=search]::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.jn-bi-c input[type=search]:hover{border-color:#1351b4}
.jn-bi-c input[type=search]:disabled{background:#ededed;color:#888888;border-color:#cccccc;cursor:not-allowed}
.jn-bi-ic{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;color:#1351b4;pointer-events:none}
.jn-back .jn-bi-b{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:32px!important;height:32px!important;min-height:32px!important;max-height:32px!important;margin:0!important;padding:0!important;display:inline-flex;align-items:center;justify-content:center;border:0!important;border-radius:50%!important;background:transparent!important;background-image:none!important;color:#1351b4!important;box-shadow:none!important;overflow:visible!important;line-height:1!important;cursor:pointer}
.jn-back .jn-bi-b:hover{background:rgba(19,81,180,.16)!important}
.jn-bi-c svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.jn-busca .jn-hint{margin:4px 0 0}
.jn-bs{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:4px 0 0;min-height:0;font-size:13px;color:#636363}
.jn-bs .jn-bs-t{color:#333333}
.jn-back .jn-bs .jn-bs-l{margin:0}
html.contraste .jn-bi-ic,html.contraste .jn-back .jn-bi-b{color:#ff0!important}
html.contraste .jn-bs,html.contraste .jn-bs .jn-bs-t{color:#fff!important}
.jn-mi i.jn-rec{font-style:normal;font-size:11px;font-weight:600;background:#dbe8fb;color:#0c326f;border-radius:10px;padding:0 7px;margin-left:4px;white-space:nowrap}
.jn-lc{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;border:1px solid var(--jn-line);border-radius:8px;padding:10px;margin:4px 0 8px}
.jn-qrc{width:104px;height:104px;flex:0 0 104px;background:#fff;display:grid;place-items:center;border:1px solid #dddddd;border-radius:4px;padding:3px}
.jn-qrc img,.jn-qrc canvas,.jn-qrc svg{display:block;width:96px!important;height:96px!important}
.jn-qrc .qr-off{font-size:11px;text-align:center;color:#636363}
.jn-lct{flex:1 1 160px;min-width:0}
.jn-lct b{display:block}
.jn-lct small{display:block;color:var(--jn-mut);overflow-wrap:anywhere}
.jn-lca{display:flex;gap:6px;flex-wrap:wrap}
html.contraste .jn-mi i.jn-rec{background:#000!important;color:#ff0!important;border:1px solid #ff0}
@media (prefers-reduced-motion:reduce){.jn-tr,.jn-tr::after{transition:none}}
@media(max-width:700px){
  .acao-gerar .jn-par{display:flex;flex-wrap:nowrap;width:100%;position:relative}
  .acao-gerar .jn-par .jn-dd{position:static;flex:1 1 calc(50% - 6px);min-width:0}
  body .acao-gerar .jn-par .jn-dd>#btnSalvar,body .acao-gerar .jn-par>#btnCompartilharAcao{width:100%;padding:0 12px}
  body .acao-gerar .jn-par>#btnCompartilharAcao{flex:1 1 calc(50% - 6px);min-width:0}
  .jn-rl{display:none}.jn-rc{display:inline}
  .acao-gerar .jn-mn{left:0;right:0;min-width:0;width:100%}
  .jn-back{padding:0;align-items:stretch}
  .jn-win,.jn-win.jn-peq{width:100%;max-height:none;min-height:100%;border-radius:0}
  .jn-top h2{font-size:16px}
  .jn-conf-bt{flex:1 1 100%}
  .jn-it{flex-wrap:wrap}
  .jn-sp{flex:1 1 100%}
}
html.contraste .jn-win{background:#000!important;color:#fff!important;border:2px solid #fff}
html.contraste .jn-back :is(h2,h3,label,a){color:#ff0!important}
html.contraste .jn-back :is(.jn-conf,.jn-msg){background:#000!important;border-color:#ff0!important;color:#fff!important}
html.contraste .jn-back :is(.jn-conf-tx strong,.jn-conf-tx p){color:#fff!important}
html.contraste .jn-back .jn-tab[aria-selected="true"]{color:#ff0!important;border-bottom-color:#ff0!important}
html.contraste .jn-mn{background:#000!important;border-color:#fff!important}
html.contraste .jn-mn .jn-mi,html.contraste .jn-sw{color:#fff!important}
`;
  const st = document.createElement('style');
  st.id = 'jn-css'; st.textContent = css; document.head.appendChild(st);

  /* ---------------------------- Fabrica de janelas ---------------------------- */
  function criarJanela(cfg) {
    const id = cfg.id, abas = cfg.abas || null;
    const back = document.createElement('div');
    back.className = 'jn-back'; back.id = id + 'Back'; back.hidden = true;
    back.innerHTML =
      '<div class="jn-win' + (cfg.pequena ? ' jn-peq' : '') + '" id="' + id + 'Win" role="dialog" aria-modal="true" aria-labelledby="' + id + 'Tit">' +
      '<div class="jn-top"><h2 id="' + id + 'Tit"></h2><button type="button" class="sec mini" data-jn="fechar" title="Fechar (Esc)">Fechar \u2715</button></div>' +
      (abas ? '<div class="jn-tabs" role="tablist" aria-label="' + (cfg.rotuloAbas || '') + '">' +
        abas.map(a => '<button type="button" role="tab" class="jn-tab" data-jk="' + a[0] + '" id="' + id + 'Tab-' + a[0] + '" aria-controls="' + id + 'Pane-' + a[0] + '" aria-selected="false" tabindex="-1">' + svg(a[2]) + '<span>' + a[1] + '</span><span class="jn-ct" aria-hidden="true"></span></button>').join('') + '</div>' : '') +
      '<div class="jn-msg" role="alert" hidden></div>' +
      '<div class="jn-panes">' +
      (abas ? abas.map(a => '<div class="jn-pane" role="tabpanel" id="' + id + 'Pane-' + a[0] + '" aria-labelledby="' + id + 'Tab-' + a[0] + '" hidden></div>').join('') : '<div class="jn-pane" id="' + id + 'Pane-0"></div>') +
      '</div>' +
      '<div class="jn-foot" hidden><div class="jn-bt"></div>' +
      '<div class="jn-conf" role="alertdialog" aria-labelledby="' + id + 'CT" aria-describedby="' + id + 'CD" hidden>' +
      '<div class="jn-conf-tx"><strong id="' + id + 'CT"></strong><p id="' + id + 'CD"></p></div>' +
      '<div class="jn-conf-bt"><button type="button" class="sec mini" data-jn="cancelar">Cancelar</button><button type="button" class="dan mini" data-jn="confirmar">Confirmar</button></div>' +
      '</div></div>' +
      '<div class="jn-sr" role="status" aria-live="polite"></div></div>';
    document.body.appendChild(back);

    const win = back.firstChild, q = s => win.querySelector(s);
    const tit = q('.jn-top h2'), msgEl = q('.jn-msg'), foot = q('.jn-foot'), bt = q('.jn-bt'), conf = q('.jn-conf'), live = q('.jn-sr');
    const J = { id, back, win, bt, ativa: null, foco: null, gatilho: null, pedido: null };

    J.pane = k => $(id + 'Pane-' + (abas ? k : '0'));
    J.titulo = t => { tit.textContent = t; };
    J.anunciar = t => { live.textContent = ''; setTimeout(() => { live.textContent = t || ''; }, 50); };
    J.msg = (t, info) => {
      if (!t) { msgEl.hidden = true; msgEl.textContent = ''; return; }
      msgEl.classList.toggle('info', !!info); msgEl.hidden = false; msgEl.textContent = '';
      setTimeout(() => { msgEl.textContent = t; }, 30);
    };
    J.rodape = () => {
      const r = !!(cfg.rodape && cfg.rodape(J.ativa));
      bt.hidden = !r || !conf.hidden;
      foot.hidden = conf.hidden && !r;
    };
    J.pedir = o => {
      J.pedido = o; J.gatilho = o.gatilho || document.activeElement;
      $(id + 'CT').textContent = o.titulo; $(id + 'CD').textContent = o.descricao;
      q('[data-jn="confirmar"]').textContent = o.rotulo || 'Confirmar';
      conf.hidden = false; J.rodape();
      q('[data-jn="cancelar"]').focus();          // foco na acao segura; o leitor de tela le titulo e descricao
    };
    J.cancelar = devolver => {
      if (conf.hidden) return;
      conf.hidden = true; J.rodape();
      if (devolver && J.gatilho && J.gatilho.isConnected && !J.gatilho.disabled) J.gatilho.focus();
    };
    J.confirmar = async () => {
      const o = J.pedido; if (!o) return;
      conf.hidden = true; J.rodape();
      try { await o.aoConfirmar(); J.anunciar(o.resultado || 'Conclu\u00eddo.'); }
      catch (err) { J.msg('N\u00e3o foi poss\u00edvel concluir: ' + ((err && err.message) || err), false); }
      if (cfg.depoisConfirmar) cfg.depoisConfirmar();
      const g = J.gatilho;
      const alvo = g && g.isConnected && !g.disabled && g.getClientRects().length ? g : (abas ? $(id + 'Tab-' + J.ativa) : q('[data-jn="fechar"]'));
      if (alvo) alvo.focus();
    };
    J.ativar = (k, comFoco) => {
      J.cancelar(false); J.msg('');
      if (abas) {
        J.ativa = k;
        abas.forEach(a => {
          const on = a[0] === k, t = $(id + 'Tab-' + a[0]);
          t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; J.pane(a[0]).hidden = !on;
        });
        if (comFoco) $(id + 'Tab-' + k).focus();
      } else J.ativa = '0';
      J.rodape();
      if (cfg.aoAtivar) cfg.aoAtivar(k);
    };
    J.abrir = k => {
      J.foco = document.activeElement;
      if (cfg.aoAbrir) cfg.aoAbrir(k);
      let alvo = '0';
      if (abas) {
        alvo = cfg.resolver ? cfg.resolver(k) : (k || J.ativa || abas[0][0]);
        if (!abas.some(a => a[0] === alvo)) alvo = abas[0][0];
      }
      J.ativar(alvo, false);
      back.hidden = false; back.scrollTop = 0; document.body.style.overflow = 'hidden';
      if (cfg.depoisAbrir) cfg.depoisAbrir(J.ativa);
      setTimeout(() => {
        const f = abas ? $(id + 'Tab-' + J.ativa) : [...win.querySelectorAll('.jn-pane select,.jn-pane input,.jn-pane button')].find(el => !el.disabled && !el.hidden && el.getClientRects().length);
        if (f) f.focus();
      }, 30);
    };
    J.fechar = semFoco => {
      if (back.hidden) return;
      J.cancelar(false); J.msg('');
      back.hidden = true; document.body.style.overflow = '';
      if (!semFoco && J.foco && J.foco.isConnected && J.foco.focus) J.foco.focus();
      if (cfg.aoFechar) cfg.aoFechar();
    };

    back.addEventListener('click', e => {
      if (e.target === back) { J.fechar(); return; }
      const t = e.target.closest ? e.target.closest('[data-jn],[data-jk]') : null;
      if (t) {
        if (t.dataset.jk) J.ativar(t.dataset.jk, false);
        else if (t.dataset.jn === 'fechar') J.fechar();
        else if (t.dataset.jn === 'cancelar') J.cancelar(true);
        else if (t.dataset.jn === 'confirmar') J.confirmar();
        return;
      }
      if (cfg.aoClique) cfg.aoClique(e);
    });
    back.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!conf.hidden) J.cancelar(true); else J.fechar(); return; }
      const tabEl = abas && e.target.closest ? e.target.closest('.jn-tab') : null;
      if (tabEl && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) >= 0) {
        e.preventDefault();
        const ks = abas.map(a => a[0]); let i = ks.indexOf(tabEl.dataset.jk);
        if (e.key === 'ArrowRight') i = (i + 1) % ks.length; else if (e.key === 'ArrowLeft') i = (i + ks.length - 1) % ks.length; else if (e.key === 'Home') i = 0; else i = ks.length - 1;
        J.ativar(ks[i], true); return;
      }
      if (e.key === 'Tab') {
        const f = [...win.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === a || !win.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
      if (cfg.aoTecla) cfg.aoTecla(e);
    });
    return J;
  }

  /* Observa o log (escondido atras da janela) para mostrar erros e fechar a janela quando der certo */
  function observarLog(o) {
    const lg = $('log'); if (!lg) return;
    const antes = lg.textContent.length;
    const mo = new MutationObserver(() => {
      const novo = lg.textContent.slice(antes);
      if (o.ok && o.ok.test(novo)) { mo.disconnect(); if (o.aoOk) o.aoOk(); }
      else if (o.erro && o.erro.test(novo)) { mo.disconnect(); if (o.aoErro) o.aoErro(novo.trim().split('\n').pop()); }
    });
    mo.observe(lg, { childList: true, subtree: true, characterData: true });
    setTimeout(() => mo.disconnect(), 120000);
  }

  /* ============================== Janela IMPORTAR ============================== */
  const CH_ABA = 'conteudista.importar.aba';
  const importar = criarJanela({
    id: 'jnImp', rotuloAbas: 'Origem',
    abas: [['sav', 'Salvos', 'sav'], ['pc', 'Computador', 'pc'], ['cl', 'Colar', 'cl']],
    rodape: k => k === 'sav',
    resolver: k => {
      if (k) return k;
      const n = contar($('drafts')) + contar($('links'));
      let ult = ''; try { ult = localStorage.getItem(CH_ABA) || ''; } catch (e) { /* sem armazenamento */ }
      if (ult && (ult !== 'sav' || n)) return ult;
      return n ? 'sav' : 'pc';
    },
    aoAtivar: k => { try { localStorage.setItem(CH_ABA, k); } catch (e) { /* sem armazenamento */ } },
    aoAbrir: () => {
      try { if (typeof listarRascunhos === 'function') Promise.resolve(listarRascunhos()).catch(() => {}); } catch (e) { /* sem lista */ }
      try { if (typeof listarLinks === 'function') Promise.resolve(listarLinks()).catch(() => {}); } catch (e) { /* sem lista */ }
    },
    depoisConfirmar: () => atualizar(),
    aoClique: e => {
      const t = e.target.closest ? e.target.closest('button,a') : null; if (!t) return;
      if (t.id === 'jnExcluir') pedirExcluirSalvos();
      else if (t.id === 'jnExcVer') pedirExcluirVersoes(t);
      else if (t.id === 'jnExcLnk') pedirExcluirLinks(t);
      else if (t.classList.contains('jn-abrir')) abrirDoLink(t);
      else if (t.classList.contains('jn-qr')) { const p = $(t.getAttribute('aria-controls')); if (p) { p.hidden = !p.hidden; t.setAttribute('aria-expanded', p.hidden ? 'false' : 'true'); } }
      else if (t.matches('[data-a="ab"]')) importar.fechar(true);   // Abrir um rascunho leva ao editor
      else if (t.id === 'jnColar') colarDaArea();
      else if (t.id === 'jnColOk') colarImportar();
      else if (t.id === 'jnArqOk') importarArquivos();
    }
  });
  importar.titulo('Importar');

  /* --- aba Salvos --- */
  const pSav = importar.pane('sav');
  const gR = document.createElement('section'); gR.className = 'jn-g jn-rasc sv-grupo'; gR.setAttribute('aria-labelledby', 'svTitV');
  gR.innerHTML = '<div class="sv-cab"><h3 id="svTitV">Vers\u00f5es salvas <span class="jn-ct"></span></h3></div><p class="sv-desc">C\u00f3pias do texto guardadas neste navegador.</p><button type="button" class="sv-ter sv-dan" id="jnExcVer" hidden>Excluir vers\u00f5es salvas</button>';
  const gL = document.createElement('section'); gL.className = 'jn-g jn-lnk sv-grupo'; gL.setAttribute('aria-labelledby', 'svTitL');
  gL.innerHTML = '<div class="sv-cab"><h3 id="svTitL">Links <span class="jn-ct"></span></h3></div><p class="sv-desc">Sem o link (e a senha, se houver) o conte\u00fado n\u00e3o pode ser recuperado.</p><button type="button" class="sv-ter sv-dan" id="jnExcLnk" hidden>Excluir links</button>';
  pSav.append(gR, gL);
  const nVer = gR.querySelector('.jn-ct'), nLnk = gL.querySelector('.jn-ct'), excVer = gR.querySelector('#jnExcVer'), excLnk = gL.querySelector('#jnExcLnk');

  /* --- aba Computador --- */
  const pPc = importar.pane('pc');
  pPc.innerHTML =
    '<div class="jn-dz" id="jnDz" role="button" tabindex="0" aria-label="Selecionar arquivos do computador">' + svg('up') + '<span>Clique ou arraste os arquivos aqui</span></div>' +
    '<input type="file" id="jnArq" multiple hidden accept=".md,.markdown,.txt,.zip,image/*">' +
    '<p class="jn-hint">Aceita .md, .txt, .zip e imagens.</p>' +
    '<div class="jn-lista" id="jnLista"></div>' +
    '<div class="jn-acoes"><button type="button" id="jnArqOk" disabled>Importar</button></div>';

  /* --- aba Colar --- */
  const pCl = importar.pane('cl');
  pCl.innerHTML =
    '<label class="jn-lb" for="jnTexto">Texto ou link</label>' +
    '<textarea id="jnTexto" spellcheck="false" placeholder="Cole aqui um texto Markdown ou um link"></textarea>' +
    '<p class="jn-hint" id="jnColDica" aria-live="polite">Cole um texto Markdown ou um link.</p>' +
    '<div id="jnLinkCampos" hidden><label class="jn-lb" for="jnSenha">Senha (se houver)</label><input type="password" id="jnSenha" autocomplete="off"></div>' +
    '<div id="jnTxtCampos"><label class="jn-lb" for="jnDest">Destino</label><select id="jnDest"><option value="g">Apostila</option><option value="s">Apresenta\u00e7\u00e3o</option></select></div>' +
    '<div class="jn-acoes"><button type="button" class="sec" id="jnColar">Colar agora</button><button type="button" id="jnColOk" disabled>Importar</button></div>';

  /* Computador: lista de arquivos antes de importar */
  const itens = [];
  const porNome = n => /apresenta/i.test(n) ? 's' : /apostila|treinamento|guia/i.test(n) ? 'g' : '';
  const detectarConteudo = t => (/^---\s*\n[\s\S]*?\n---/.test(t) || /<!--\s*(class|notas):/.test(t) || (t.match(/\n---\s*\n/g) || []).length >= 2) ? 's' : 'g';
  const mimeImg = n => ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml' })[(String(n).split('.').pop() || '').toLowerCase()] || 'image/png';
  const ehImagem = f => (window.MDEditor && MDEditor.ehImagem) ? MDEditor.ehImagem(f) : /^image\//.test(f.type || '');
  const comoMd = f => /\.(md|markdown)$/i.test(f.name) ? f : new File([f], f.name.replace(/\.[^.]*$/, '') + '.md', { type: 'text/markdown' });

  function renderLista(foco) {
    const el = $('jnLista');
    el.innerHTML = itens.map((x, i) =>
      '<div class="jn-it"><span class="jn-ico">' + svg(x.dest === 'i' ? 'up' : 'arq') + '</span>' +
      '<div class="jn-it-m"><b>' + esc(x.nome) + '</b><small>' + fmtTam(x.tam) + (x.origem ? ' \u00b7 ' + esc(x.origem) : '') + '</small></div>' +
      (x.dest === 'i' ? '<span class="jn-it-d">Imagem</span>' :
        '<select data-i="' + i + '" aria-label="Destino de ' + esc(x.nome) + '">' +
        '<option value="g"' + (x.dest === 'g' ? ' selected' : '') + '>Apostila</option>' +
        '<option value="s"' + (x.dest === 's' ? ' selected' : '') + '>Apresenta\u00e7\u00e3o</option>' +
        '<option value="x"' + (x.dest === 'x' ? ' selected' : '') + '>Ignorar</option></select>') +
      '<button type="button" class="sec mini" data-rm="' + i + '" aria-label="Remover ' + esc(x.nome) + '">Remover</button></div>').join('');
    $('jnArqOk').disabled = !itens.some(x => x.dest !== 'x');
    if (foco === 'dz') $('jnDz').focus();
    else if (foco != null) { const s = el.querySelector('select[data-i="' + foco + '"]'); if (s) s.focus(); }
  }
  async function incluir(f, origem) {
    const img = ehImagem(f);
    if (!(img || /\.(md|markdown|txt)$/i.test(f.name) || /^text\//.test(f.type || ''))) {
      importar.msg('Formato n\u00e3o aceito: ' + f.name + '. Use .md, .txt, .zip ou imagens.', false); return;
    }
    let dest = img ? 'i' : porNome(f.name);
    if (!dest) dest = detectarConteudo(await f.text());
    itens.push({ f, nome: f.name, tam: f.size, dest, origem });
  }
  async function adicionarArquivos(lista) {
    importar.msg('');
    const antes = itens.length;
    for (const f of lista) {
      const nome = f.name || 'arquivo';
      if (/\.zip$/i.test(nome)) {
        try {
          if (typeof zipLer !== 'function') throw new Error('leitor de ZIP indispon\u00edvel');
          const mapa = await zipLer(new Uint8Array(await f.arrayBuffer()));
          let n = 0;
          for (const par of mapa) {
            const en = par[0], dados = par[1]; if (!dados) continue;
            const base = en.split('/').pop();
            if (/\.(md|markdown|txt)$/i.test(base)) { await incluir(new File([dados], base, { type: 'text/markdown' }), nome); n++; }
            else if (/^imagens\//i.test(en) && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(base)) { await incluir(new File([dados], base, { type: mimeImg(base) }), nome); n++; }
          }
          if (!n) importar.msg('O ZIP n\u00e3o tem arquivos .md do Conteudista.', true);
        } catch (err) { importar.msg('N\u00e3o foi poss\u00edvel ler o ZIP: ' + ((err && err.message) || err), false); }
      } else await incluir(f, '');
    }
    renderLista();
    const n = itens.length - antes;
    if (n > 0) importar.anunciar(n + (n === 1 ? ' arquivo adicionado.' : ' arquivos adicionados.'));
  }
  async function importarArquivos() {
    const it = itens.filter(x => x.dest !== 'x');
    const g = it.filter(x => x.dest === 'g'), s = it.filter(x => x.dest === 's'), im = it.filter(x => x.dest === 'i').map(x => x.f);
    if (g.length > 1 || s.length > 1) { importar.msg('Escolha um arquivo para cada destino: Apostila e Apresenta\u00e7\u00e3o.', false); return; }
    if (!g.length && !s.length && !im.length) { importar.msg('Nada para importar.', true); return; }
    if (typeof receberArquivos !== 'function') { importar.msg('Importa\u00e7\u00e3o indispon\u00edvel nesta p\u00e1gina.', false); return; }
    const botao = $('jnArqOk'); botao.disabled = true;
    const abaAtual = ($('ps') && !$('ps').hidden) ? 's' : 'g';
    try {
      if (g.length) await receberArquivos([comoMd(g[0].f)].concat(im), 'g');
      if (s.length) await receberArquivos([comoMd(s[0].f)].concat(g.length ? [] : im), 's');
      if (!g.length && !s.length) await receberArquivos(im, abaAtual);
      const alvo = g.length ? 'g' : s.length ? 's' : abaAtual;
      if (typeof aba === 'function') aba(alvo);
      itens.length = 0; renderLista();
      importar.fechar(true);
      const ed = $(alvo === 'g' ? 'pg' : 'ps'); if (ed && ed.scrollIntoView) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { importar.msg('Erro ao importar: ' + ((err && err.message) || err), false); botao.disabled = !itens.some(x => x.dest !== 'x'); }
  }
  (function ligarComputador() {
    const dz = $('jnDz'), inp = $('jnArq'), lista = $('jnLista');
    dz.addEventListener('click', () => inp.click());
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    inp.addEventListener('change', async () => { const l = [...inp.files]; inp.value = ''; await adicionarArquivos(l); });
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('sobre'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('sobre')));
    dz.addEventListener('drop', async e => { e.preventDefault(); e.stopPropagation(); await adicionarArquivos([...((e.dataTransfer && e.dataTransfer.files) || [])]); });
    lista.addEventListener('change', e => { const s = e.target.closest('select[data-i]'); if (!s) return; const i = +s.dataset.i; itens[i].dest = s.value; renderLista(i); });
    lista.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; itens.splice(+b.dataset.rm, 1); renderLista('dz'); importar.anunciar('Arquivo removido.'); });
  })();

  /* Colar: texto ou link */
  const ehLink = v => /^https?:\/\/\S+$/i.test(String(v).trim());
  function atualizarColar() {
    const v = $('jnTexto').value.trim(), link = ehLink(v);
    $('jnLinkCampos').hidden = !link; $('jnTxtCampos').hidden = link || !v;
    $('jnColOk').disabled = !v;
    $('jnColDica').textContent = !v ? 'Cole um texto Markdown ou um link.' : link ? 'Link detectado. Informe a senha, se houver.' :
      'Texto detectado: ' + v.split('\n').length + ' linha(s). Escolha o destino.';
    if (v && !link) $('jnDest').value = detectarConteudo(v);
  }
  $('jnTexto').addEventListener('input', atualizarColar);
  atualizarColar();
  function colarDaArea() {
    if (!navigator.clipboard || !navigator.clipboard.readText) { importar.msg('Seu navegador n\u00e3o permite ler a \u00e1rea de transfer\u00eancia. Use Ctrl+V no campo.', true); return; }
    navigator.clipboard.readText().then(t => {
      $('jnTexto').value = t || ''; atualizarColar(); $('jnTexto').focus();
      if (!t) importar.msg('A \u00e1rea de transfer\u00eancia est\u00e1 vazia.', true);
    }).catch(() => importar.msg('N\u00e3o foi poss\u00edvel ler a \u00e1rea de transfer\u00eancia. Use Ctrl+V no campo.', true));
  }
  async function colarImportar() {
    const v = $('jnTexto').value.trim(); if (!v) return;
    importar.msg('');
    if (ehLink(v)) {
      const o = $('olink'), p = $('opw'), b = $('open');
      if (!o || !b) { importar.msg('Abertura de links indispon\u00edvel nesta p\u00e1gina.', false); return; }
      o.value = v; if (p) p.value = $('jnSenha').value;
      observarLog({
        ok: /Conte\u00fado carregado do link/, erro: /Erro:/,
        aoOk: () => { $('jnTexto').value = ''; $('jnSenha').value = ''; atualizarColar(); importar.fechar(true); },
        aoErro: t => importar.msg(t, false)
      });
      b.click();
      return;
    }
    const t = $('jnDest').value, alvo = $(t);
    if (!alvo) return;
    if (window.Hist && Hist.registrar) await Hist.registrar('antes', 'Antes de colar texto');
    alvo.value = v; alvo.dispatchEvent(new Event('input', { bubbles: true }));
    if (window.Hist && Hist.registrar) Hist.registrar('arquivo', 'Texto colado (' + (t === 'g' ? 'apostila' : 'apresenta\u00e7\u00e3o') + ')');
    if (typeof aba === 'function') aba(t);
    $('jnTexto').value = ''; atualizarColar();
    importar.fechar(true);
    const ed = $(t === 'g' ? 'pg' : 'ps'); if (ed && ed.scrollIntoView) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* Salvos: abrir um link salvo, excluir por grupo e excluir tudo */
  function abrirDoLink(b) {
    const url = b.dataset.url || '';
    if (window.ColarImportar) window.ColarImportar.linkSalvo(url, !!b.dataset.senha);
    else importar.msg('Abertura de links indispon\u00edvel nesta p\u00e1gina.', false);
  }
  const bExc = document.createElement('button');
  bExc.type = 'button'; bExc.className = 'dan mini'; bExc.id = 'jnExcluir'; bExc.textContent = 'Excluir tudo';
  importar.bt.appendChild(bExc);
  async function limparVersoes() {
    if (typeof dbClear !== 'function') throw new Error('armazenamento indispon\u00edvel');
    if (window.Versoes && Versoes.excluirSalvas) await Versoes.excluirSalvas(); else await dbClear('rascunhos');
    if (typeof listarRascunhos === 'function') await listarRascunhos();
    await aguardar(() => !contar($('drafts')));
  }
  async function limparLinks() {
    if (typeof dbClear !== 'function') throw new Error('armazenamento indispon\u00edvel');
    try { if (typeof sessaoLinks !== 'undefined') sessaoLinks.length = 0; } catch (e) { /* sem lista da sessao */ }
    await dbClear('links');
    if (typeof listarLinks === 'function') await listarLinks();
    await aguardar(() => !contar($('links')));
  }
  function pedirExcluirVersoes(g) {
    const n = contar($('drafts')); if (!n) return;
    importar.pedir({ gatilho: g, titulo: 'Excluir ' + n + (n === 1 ? ' vers\u00e3o salva?' : ' vers\u00f5es salvas?'), descricao: 'As vers\u00f5es autom\u00e1ticas do texto e o \u00faltimo estado do salvamento autom\u00e1tico n\u00e3o s\u00e3o afetados. Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.', rotulo: 'Excluir', resultado: n === 1 ? 'Vers\u00e3o salva exclu\u00edda.' : 'Vers\u00f5es salvas exclu\u00eddas.', aoConfirmar: limparVersoes });
  }
  function pedirExcluirLinks(g) {
    const n = contar($('links')); if (!n) return;
    importar.pedir({ gatilho: g, titulo: 'Excluir ' + n + (n === 1 ? ' link?' : ' links?'), descricao: 'Os links deixam de aparecer nesta lista. Se n\u00e3o foram guardados em outro lugar, n\u00e3o ser\u00e1 poss\u00edvel recuper\u00e1-los. Links j\u00e1 criados no PrivateBin continuam acess\u00edveis at\u00e9 expirar. Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.', rotulo: 'Excluir', resultado: n === 1 ? 'Link exclu\u00eddo.' : 'Links exclu\u00eddos.', aoConfirmar: limparLinks });
  }
  async function limparSalvos() {
    if (typeof dbClear !== 'function') throw new Error('armazenamento indispon\u00edvel');
    if (window.Versoes && Versoes.excluirSalvas) await Versoes.excluirSalvas(); else await dbClear('rascunhos');
    try { if (typeof sessaoLinks !== 'undefined') sessaoLinks.length = 0; } catch (e) { /* sem lista da sessao */ }
    await dbClear('links');
    if (typeof listarRascunhos === 'function') await listarRascunhos();
    if (typeof listarLinks === 'function') await listarLinks();
    await aguardar(() => !contar($('drafts')) && !contar($('links')));
  }
  function pedirExcluirSalvos() {
    const nv = contar($('drafts')), nl = contar($('links'));
    if (!nv && !nl) return;
    const partes = [];
    if (nv) partes.push(nv + (nv === 1 ? ' vers\u00e3o salva' : ' vers\u00f5es salvas'));
    if (nl) partes.push(nl + (nl === 1 ? ' link' : ' links'));
    let d = 'Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.';
    if (nv) d = 'As vers\u00f5es autom\u00e1ticas e o \u00faltimo estado do salvamento autom\u00e1tico n\u00e3o s\u00e3o afetados. ' + d;
    if (nl) d += ' Links j\u00e1 criados no PrivateBin continuam acess\u00edveis at\u00e9 expirar.';
    importar.pedir({ gatilho: bExc, titulo: 'Excluir ' + partes.join(' e ') + '?', descricao: d, rotulo: 'Excluir', resultado: 'Vers\u00f5es salvas e links exclu\u00eddos.', aoConfirmar: limparSalvos });
  }

  /* ============================== Janela HISTORICO DE ARQUIVOS ============================== */
  const hist = criarJanela({
    id: 'jnHist', rodape: () => true,
    aoAbrir: () => { try { if (window.Gerados && Gerados.listar) Promise.resolve(Gerados.listar()).catch(() => {}); } catch (e) { /* sem lista */ } },
    depoisConfirmar: () => atualizar(),
    aoClique: e => {
      const t = e.target.closest ? e.target.closest('button,a') : null; if (!t) return;
      if (t.id === 'jnHExcluir') pedirExcluirHist();
      else if (t.matches('[data-ver]')) hist.fechar(true);     // Exibir leva a pre-visualizacao na pagina
    }
  });
  hist.titulo('Hist\u00f3rico de arquivos');
  const pHist = hist.pane('0'); pHist.classList.add('jn-arq');
  const bHExc = document.createElement('button');
  bHExc.type = 'button'; bHExc.className = 'dan mini'; bHExc.id = 'jnHExcluir'; bHExc.textContent = 'Excluir tudo';
  hist.bt.appendChild(bHExc);
  function pedirExcluirHist() {
    const n = contar($('gerLista')); if (!n) return;
    hist.pedir({
      gatilho: bHExc, titulo: 'Excluir ' + n + (n === 1 ? ' pacote' : ' pacotes') + ' de arquivos?',
      descricao: 'Todos os arquivos gerados guardados neste navegador ser\u00e3o apagados. Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.',
      rotulo: 'Excluir', resultado: 'Todos os pacotes de arquivos foram exclu\u00eddos.',
      aoConfirmar: async () => {
        const b = $('gerLimpar'); if (!b) throw new Error('lista de arquivos indispon\u00edvel');
        semConfirmar(() => b.click());
        await aguardar(() => !contar($('gerLista')));
      }
    });
  }

  /* ============================== Janela COMPARTILHAR ============================== */
  const cmp = criarJanela({
    id: 'jnCmp', pequena: true, rodape: () => true,
    aoAbrir: () => { prepararJanelaLink(); try { if (typeof estimarTamanho === 'function') Promise.resolve(estimarTamanho()).catch(() => {}); } catch (e) { /* sem estimativa */ } }
  });
  cmp.titulo('Link do conte\u00fado');
  (function montarCompartilhar() {
    const pl = $('pLink'), corpo = cmp.pane('0'); if (!pl) return;
    while (pl.firstChild) corpo.appendChild(pl.firstChild);
    corpo.querySelectorAll(':scope > h3, :scope > p.note:not(#pwnote):not(#tam)').forEach(x => x.remove());
    corpo.querySelectorAll('#pbopts .sub p.note').forEach(x => x.remove());
    const anexo = $('anexo'); if (anexo && anexo.parentElement) anexo.parentElement.title = 'As imagens v\u00e3o em um anexo ZIP cifrado; ao abrir, voltam para base64.';
    const tam = $('tam'); if (tam) { tam.classList.add('jn-tam'); cmp.bt.appendChild(tam); }
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'sec'; cancel.dataset.jn = 'fechar'; cancel.textContent = 'Cancelar';
    cmp.bt.appendChild(cancel);
    const sh = $('share');
    if (sh) { const p = sh.parentElement; cmp.bt.appendChild(sh); if (p && p !== corpo && !p.children.length) p.remove(); }
    const mo = $('mode');
    if (mo) {
      [...mo.options].forEach(o => { if (o.value === 'self') o.textContent = 'Link direto'; else if (o.value === 'pb') o.textContent = 'PrivateBin'; });
      const aux = document.createElement('small'); aux.className = 'jn-hint'; aux.id = 'jnModoAux'; mo.after(aux);
      const f = () => { aux.textContent = mo.value === 'pb' ? 'Guardado cifrado no PrivateBin.' : 'Sem servidor: o conte\u00fado vai no pr\u00f3prio link.'; };
      mo.addEventListener('change', f); f();
    }
  })();

  /* ============================== Mover os blocos existentes ============================== */
  (function mover() {
    const gb = $('gerBox'), dr = $('drafts'), lk = $('links');
    if (gb) pHist.appendChild(gb);
    if (dr) gR.appendChild(dr);
    if (lk) gL.appendChild(lk);
    // Restos de scripts anteriores (janelas e botoes antigos)
    ['gerBack', 'abBack'].forEach(i => { const e = $(i); if (e) e.remove(); });
    ['gerHistBtn', 'btnAbrir'].forEach(i => { const e = $(i); if (e) (e.closest('.ger-tb') || e).remove(); });
    document.querySelectorAll('.ger-ph').forEach(x => x.remove());
    const sc = $('secShare'); if (sc) sc.hidden = true;
  })();

  /* ============================== Barra de acoes ============================== */
  const barra = ex.parentNode; barra.classList.add('jn-barra');
  const mk = (id, cls, html) => { const b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = cls; b.innerHTML = html; b.setAttribute('data-c', '1'); return b; };
  const bImp = mk('btnImportar', 'sec', 'Importar'); bImp.setAttribute('aria-haspopup', 'dialog'); bImp.title = 'Importar: salvos, arquivos do computador, texto ou link (Alt+Shift+O)';
  const dd = document.createElement('span'); dd.className = 'jn-dd';
  const bSalvar = mk('btnSalvar', 'sec', 'Salvar' + svg('chev'));
  bSalvar.title = 'Salvar: guardar no navegador, baixar tudo, compartilhar link (Alt+Shift+S guarda uma vers\u00e3o)';
  bSalvar.setAttribute('aria-haspopup', 'menu'); bSalvar.setAttribute('aria-expanded', 'false'); bSalvar.setAttribute('aria-controls', 'jnMenuSalvar');
  const menu = document.createElement('div'); menu.className = 'jn-mn'; menu.id = 'jnMenuSalvar'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Salvar'); menu.hidden = true;
  const ITENS = [
    ['rasc', 'Guardar no navegador', 'Vers\u00e3o s\u00f3 neste navegador', 'dsave', 'Vers\u00e3o salva.'],
    ['arq', 'Baixar tudo (.zip)', 'Textos e arquivos gerados, em um ZIP', 'zdl', '.ZIP baixado.'],
    ['shr', 'Compartilhar link', 'Texto-fonte, em qualquer computador', 'jnLink', '', 1],
    '-',
    ['pc', 'Salvar na pasta', 'No computador (Edge e Chrome)', 'fsave', 'Salvo na pasta.'],
    ['arq', 'Baixar .md', 'Textos em Markdown', 'mdl', '.MD baixado.']
  ];
  menu.innerHTML = ITENS.map(x => x === '-' ? '<div class="jn-sepm" role="separator"></div>' : '<button type="button" role="menuitem" class="jn-mi" tabindex="-1" data-c="1" data-alvo="' + x[3] + '" data-msg="' + x[4] + '">' + svg(x[0]) + '<span><b>' + x[1] + (x[5] ? ' <i class="jn-rec">recomendado</i>' : '') + '</b><small>' + x[2] + '</small></span></button>').join('');
  dd.append(bSalvar, menu);
  /* Compartilhar link: tres botoes que abrem a MESMA janela. No celular o rotulo vira "Link"; o nome acessivel continua completo. */
  const NOME_CMP = 'Compartilhar link', DICA_CMP = 'Compartilhar link: criar um link com o texto-fonte (Alt+Shift+L)';
  const icoCmp = svg('shr').replace('<svg ', '<svg class="jn-ic" ');
  function mkCmp(id) {
    const b = mk(id, 'sec', icoCmp + '<span class="jn-rl">' + NOME_CMP + '</span><span class="jn-rc">Link</span>');
    b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-label', NOME_CMP); b.title = DICA_CMP;
    return b;
  }
  const bCmp = mkCmp('btnCompartilhar');            // B: barra de acoes, depois de Importar
  const bCmpAcao = mkCmp('btnCompartilharAcao');    // D: ao lado de Salvar
  barra.insertBefore(bImp, ex);
  barra.insertBefore(bCmp, ex);
  { // Salvar fica ao lado de "Gerar arquivos"; Compartilhar link fica ao lado de Salvar
    const go = $('go'), par = document.createElement('span'); par.className = 'jn-par';
    par.append(dd, bCmpAcao);
    if (go && go.parentNode) go.insertAdjacentElement('afterend', par); else barra.insertBefore(par, ex);
  }
  [['pg', 'g'], ['ps', 's']].forEach(a => {   // C: barra de ferramentas de cada editor (so icone), antes de Versoes
    const tb = document.querySelector('#' + a[0] + ' .mde-tb');
    if (!tb || tb.querySelector('.jn-cmpbtn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hbtn jn-cmpbtn'; b.setAttribute('data-c', '1'); b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('aria-label', NOME_CMP); b.title = DICA_CMP; b.innerHTML = svg('shr');
    const ver = tb.querySelector('button.hbtn'), btns = [...tb.querySelectorAll('button')];
    tb.insertBefore(b, ver || btns[btns.length - 1] || null);
    b.addEventListener('click', () => cmp.abrir());
  });
  try { if (window.UXDicas && UXDicas.preparar) UXDicas.preparar(); } catch (e) { /* sem dicas */ }

  function abrirMenu() { menu.hidden = false; bSalvar.setAttribute('aria-expanded', 'true'); const p = menu.querySelector('.jn-mi'); if (p) p.focus(); }
  function fecharMenu(foco) { if (menu.hidden) return; menu.hidden = true; bSalvar.setAttribute('aria-expanded', 'false'); if (foco) bSalvar.focus(); }
  function executarSalvar(alvo, msg) {
    if (alvo === 'jnLink') { fecharMenu(true); cmp.abrir(); return; }
    fecharMenu(true);
    const vazio = !(($('g') && $('g').value.trim()) || ($('s') && $('s').value.trim()));
    if (vazio) { anunciarGlobal('Nada para salvar.'); logApp('Nada para salvar.', 'wa'); return; }
    const b = $(alvo); if (!b) return;
    if (alvo === 'dsave' && $('dname')) $('dname').value = '';     // usa o nome automatico (conteudo + data e hora)
    b.click();
    feedback(bSalvar, msg);
  }
  bSalvar.addEventListener('click', () => { if (menu.hidden) abrirMenu(); else fecharMenu(true); });
  bSalvar.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (menu.hidden) abrirMenu(); }
    else if (e.key === 'Escape' && !menu.hidden) { e.preventDefault(); fecharMenu(true); }
  });
  menu.addEventListener('keydown', e => {
    const its = [...menu.querySelectorAll('.jn-mi')], i = its.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); its[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); its[its.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharMenu(true); }
    else if (e.key === 'Tab') fecharMenu(false);
  });
  menu.addEventListener('click', e => { const b = e.target.closest('.jn-mi'); if (b) executarSalvar(b.dataset.alvo, b.dataset.msg); });
  document.addEventListener('click', e => { if (!menu.hidden && !dd.contains(e.target)) fecharMenu(false); });

  bImp.addEventListener('click', () => importar.abrir());
  bCmp.addEventListener('click', () => cmp.abrir());
  bCmpAcao.addEventListener('click', () => cmp.abrir());

  /* Chave "Salvar automatico" (ligada ao checkbox original #auto) */
  (function chave() {
    const auto = $('auto'); if (!auto) return;
    const sp = document.createElement('span'); sp.className = 'jn-sp';
    const lab = document.createElement('label'); lab.className = 'jn-sw';
    lab.innerHTML = '<input type="checkbox" role="switch" id="jnAuto"><span class="jn-tr" aria-hidden="true"></span><span>Salvar autom\u00e1tico</span>';
    const sw = lab.querySelector('input'); sw.checked = auto.checked;
    sw.addEventListener('change', () => { auto.checked = sw.checked; auto.dispatchEvent(new Event('change', { bubbles: true })); });
    auto.addEventListener('change', () => { sw.checked = auto.checked; });
    barra.append(sp, lab);
  })();

  /* Status do salvamento automatico: espelha o texto de #autost (painel oculto) em uma linha sempre visivel.
     Leitores de tela ouvem so o primeiro salvamento da sessao e as mudancas da chave, nunca a cada tecla. */
  (function statusSalvamento() {
    const auto = $('auto'), src = $('autost'); if (!auto || !src) return;
    const p = document.createElement('p'); p.id = 'jnAutoSt'; p.className = 'jn-autost';
    barra.insertAdjacentElement('afterend', p);
    let falou = false, anterior = '';
    function atualizar() {
      const t = (src.textContent || '').trim(), m = /^Salvo automaticamente \u00e0s (\d{1,2}):(\d{2})/.exec(t);
      let txt, ok = false, fala = '';
      if (m) { txt = '\u2713 Salvo automaticamente \u00e0s ' + m[1].padStart(2, '0') + ':' + m[2] + ' \u00b7 neste navegador'; ok = true; if (!falou) { falou = true; fala = 'Salvo automaticamente neste navegador.'; } }
      else if (!auto.checked || /^Desativado/.test(t)) { txt = 'Salvamento autom\u00e1tico desligado. Use Salvar \u25be para guardar o conte\u00fado.'; fala = anterior === 'off' ? '' : 'Salvamento autom\u00e1tico desligado.'; anterior = 'off'; }
      else { txt = 'Salvamento autom\u00e1tico ligado: o texto \u00e9 guardado neste navegador a cada altera\u00e7\u00e3o.'; if (anterior === 'off') fala = 'Salvamento autom\u00e1tico ligado.'; anterior = 'on'; }
      if (m) anterior = 'on';
      p.textContent = txt; p.classList.toggle('ok', ok);
      if (fala) anunciarGlobal(fala);
    }
    new MutationObserver(atualizar).observe(src, { childList: true, characterData: true, subtree: true });
    auto.addEventListener('change', () => setTimeout(atualizar, 0));
    atualizar();
  })();

  /* Botao "Historico" ao lado do titulo de "Arquivos gerados" */
  (function botaoHistorico() {
    const dx = $('dxRes'), sum = dx && dx.querySelector(':scope > summary'), tit = sum && sum.querySelector('h3');
    if (!sum || !tit) return;
    let grp = tit.parentElement && tit.parentElement.classList.contains('ger-tit') ? tit.parentElement : null;
    if (!grp) { grp = document.createElement('div'); grp.className = 'summary-title ger-tit'; sum.insertBefore(grp, tit); grp.appendChild(tit); }
    grp.querySelectorAll('.ger-tb').forEach(x => x.remove());
    const tb = document.createElement('span'); tb.className = 'mde-tb ger-tb';
    const b = document.createElement('button'); b.type = 'button'; b.id = 'jnHistBtn'; b.className = 'hbtn';
    b.title = 'Hist\u00f3rico de arquivos gerados'; b.setAttribute('aria-label', 'Hist\u00f3rico de arquivos gerados'); b.setAttribute('aria-haspopup', 'dialog');
    b.innerHTML = svg('hist') + '<span class="ht"> Hist\u00f3rico</span>';
    tb.appendChild(b); grp.appendChild(tb);
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); hist.abrir(); });
  })();

  /* Criar link: ao concluir, fecha o modal e mostra o link em Salvos; erros aparecem no modal */
  (function observarCriacao() {
    const sh = $('share'); if (!sh) return;
    let antes = -1;
    sh.addEventListener('click', () => {
      observarLog({ ok: /Link criptografado criado/, erro: /Erro:|Nada para compartilhar/, aoErro: t => cmp.msg(t, false) });
    }, true);
    new MutationObserver(() => {
      if (sh.disabled) antes = contar($('links'));
      else if (antes >= 0) {
        const a0 = antes; antes = -1;
        setTimeout(() => {
          if (contar($('links')) > a0) {
            mostrarLinkCriado();
            const l = $('links'); if (l && l.scrollIntoView) l.scrollIntoView({ block: 'nearest' });
          }
        }, 500);
      }
    }).observe(sh, { attributes: true, attributeFilter: ['disabled'] });
  })();

  /* ============================== Contadores e observadores ============================== */
  /* ============================== BUSCA no Historico e em Salvos (1.51) ==============================
   Campo de busca no padrao do Design System gov.br (input com icone, rotulo acima, ajuda e estado):
   - filtra a lista enquanto se digita (sem diferenciar maiusculas, minusculas e acentos);
   - cada linha traz em data-busca todos os metadados (nome, data, tamanho, layout, rodape, narracao, tipos de arquivo,
     tipo e validade do link); varias palavras exigem todas; aspas buscam uma frase exata;
   - Esc limpa a busca (com o campo vazio, fecha a janela); o resultado e anunciado por regiao aria-live. */
  const semAcento = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const termosDeBusca = q => {
    const t = [];
    String(q || '').replace(/"([^"]*)"|(\S+)/g, (m, a, b) => { const v = semAcento(a != null ? a : b).replace(/^[,;]+|[,;]+$/g, '').trim(); if (v) t.push(v); return m; });
    return t;
  };
  const SVG_LUPA = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
  const SVG_XIS = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function criarBusca(o) {
    const id = o.id, w = document.createElement('div');
    w.className = 'jn-busca'; w.setAttribute('role', 'search');
    w.innerHTML =
      '<label class="jn-lb" for="' + id + '">' + o.rotulo + '</label>' +
      '<div class="jn-bi-c"><input type="search" id="' + id + '" autocomplete="off" spellcheck="false" placeholder="' + o.placeholder + '" aria-describedby="' + id + 'H ' + id + 'S">' +
      '<span class="jn-bi-ic" aria-hidden="true">' + SVG_LUPA + '</span>' +
      '<button type="button" class="jn-bi-b" aria-label="Limpar busca" title="Limpar busca" hidden>' + SVG_XIS + '</button></div>' +
      '<p class="jn-hint" id="' + id + 'H">' + o.ajuda + '</p>' +
      '<p class="jn-bs"><span class="jn-bs-t" id="' + id + 'S" role="status" aria-live="polite"></span><button type="button" class="mini sec jn-bs-l" hidden>Limpar busca</button></p>';
    const inp = w.querySelector('input'), bx = w.querySelector('.jn-bi-b'), ic = w.querySelector('.jn-bi-ic'), st = w.querySelector('.jn-bs-t'), bl = w.querySelector('.jn-bs-l');
    let tD = null;
    function aplicar(msg) {
      const ts = termosDeBusca(inp.value), linhas = [...o.linhas()];
      let vis = 0;
      linhas.forEach(tr => {
        const h = semAcento(tr.dataset.busca != null ? tr.dataset.busca : tr.textContent), ok = ts.every(t => h.indexOf(t) >= 0);
        tr.hidden = !ok; if (ok) vis++;
      });
      (o.grupos ? o.grupos() : []).forEach(g => { const rs = [...g.querySelectorAll('[data-busca]')]; g.hidden = !!ts.length && rs.length > 0 && rs.every(r => r.hidden); });
      inp.disabled = !linhas.length && !inp.value;
      bx.hidden = !inp.value; ic.hidden = !!inp.value;
      bl.hidden = !(ts.length && linhas.length && !vis);
      st.textContent = msg || (!ts.length ? '' : vis ? 'Mostrando ' + vis + ' de ' + linhas.length + (linhas.length === 1 ? ' item.' : ' itens.') : 'Nenhum resultado para \u201c' + inp.value.trim() + '\u201d.');
    }
    function limpar(silencioso) { inp.value = ''; aplicar(silencioso ? '' : 'Busca limpa.'); }
    inp.addEventListener('input', () => { bx.hidden = !inp.value; ic.hidden = !!inp.value; clearTimeout(tD); tD = setTimeout(() => aplicar(), 120); });
    inp.addEventListener('keydown', e => { if (e.key === 'Escape' && inp.value) { e.preventDefault(); e.stopPropagation(); limpar(); } });
    bx.addEventListener('click', () => { limpar(); inp.focus(); });
    bl.addEventListener('click', () => { limpar(); inp.focus(); });
    return { el: w, input: inp, limpar, reaplicar: () => aplicar(inp.value ? undefined : ''), valor: () => inp.value };
  }
  const buscaSav = criarBusca({
    id: 'jnBuscaSav', rotulo: 'Buscar nos salvos', placeholder: 'Nome, data, layout, tipo de link\u2026',
    ajuda: 'Busque por nome, data, tamanho, layout, tipo de link ou validade. Use aspas para uma frase exata.',
    linhas: () => document.querySelectorAll('#drafts [data-busca], #links [data-busca]'), grupos: () => [gR, gL]
  });
  pSav.prepend(buscaSav.el);
  const buscaHist = criarBusca({
    id: 'jnBuscaHist', rotulo: 'Buscar no hist\u00f3rico', placeholder: 'Nome, data, layout, tipo de arquivo\u2026',
    ajuda: 'Busque por nome, data, tamanho, layout, rodap\u00e9, narra\u00e7\u00e3o ou tipo de arquivo, como docx ou pptx. Use aspas para uma frase exata.',
    linhas: () => document.querySelectorAll('#gerLista tr[data-busca]')
  });
  pHist.prepend(buscaHist.el);
  { // a busca volta vazia sempre que a janela e aberta
    const abrirImp = importar.abrir, abrirHist = hist.abrir;
    importar.abrir = k => { buscaSav.limpar(true); abrirImp(k); };
    hist.abrir = k => { buscaHist.limpar(true); abrirHist(k); };
  }
  window.BuscaJanelas = { salvos: buscaSav, historico: buscaHist };

  /* Janela LINK DO CONTEUDO (1.49) */
  const LIM_LINK_DIRETO = 30000;
  let linkRec = 'self', linkTam = 0;
  (function montarLinkDoCurso() {
    try {
      const corpo = cmp.pane('0'), mo = $('mode');
      if (!corpo || !mo) return;
      const form = document.createElement('div'); form.id = 'jnCmpForm';
      while (corpo.firstChild) form.appendChild(corpo.firstChild);
      const sub = document.createElement('p'); sub.className = 'jn-hint'; sub.id = 'jnSub'; sub.style.margin = '0 0 4px';
      sub.textContent = 'Guarde ou envie o conte\u00fado inteiro em um endere\u00e7o: texto, imagens, nome e rodap\u00e9.';
      form.insertBefore(sub, form.firstChild);
      const aviso = document.createElement('p'); aviso.className = 'box warn'; aviso.id = 'jnAvisoLink'; aviso.style.margin = '12px 0 0';
      aviso.textContent = 'Sem o link (e a senha, se houver) n\u00e3o \u00e9 poss\u00edvel recuperar o conte\u00fado. O Conteudista n\u00e3o guarda c\u00f3pia. N\u00e3o inclua dados pessoais sem autoriza\u00e7\u00e3o da chefia.';
      form.appendChild(aviso);
      const res = document.createElement('div'); res.id = 'jnCmpRes'; res.hidden = true;
      corpo.append(form, res);
      const exp = $('exp'); if (exp) exp.value = '1year';
      const le = document.querySelector('label[for="exp"]'); if (le) le.textContent = 'Validade';
      const kl = $('keep') && $('keep').parentElement;
      if (kl) [...kl.childNodes].forEach(n => { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = ' Lembrar este link neste navegador'; });
      mo.addEventListener('change', rotularModoLink);
      rotularModoLink();
    } catch (err) { console.warn('Link do conteudo:', err); }
  })();
  function rotularModoLink() {
    const mo = $('mode'), aux = $('jnModoAux'); if (!mo) return;
    [...mo.options].forEach(o => { o.textContent = (o.value === 'pb' ? 'PrivateBin' : 'Link direto') + (o.value === linkRec ? ' \u00b7 recomendado' : ''); });
    if (!aux) return;
    if (mo.value === 'pb') aux.textContent = 'Para conte\u00fados grandes ou com muitas imagens. Fica cifrado em um servidor e tem validade.';
    else aux.textContent = (linkTam ? 'Seu conte\u00fado: \u2248 ' + fmtTam(linkTam) + ' cifrados. ' : '') + 'Cabe no pr\u00f3prio endere\u00e7o, n\u00e3o usa servidor e n\u00e3o expira.' + (linkRec === 'pb' ? ' Aten\u00e7\u00e3o: com este tamanho o link pode ser cortado por e-mail ou Teams; prefira o PrivateBin.' : '');
  }
  function prepararJanelaLink() {
    estadoLink(false);
    (async () => {
      let n = 0;
      try { if (typeof pacote === 'function' && typeof deflate === 'function' && typeof enc !== 'undefined') n = Math.ceil((await deflate(enc.encode(JSON.stringify(pacote())))).length * 4 / 3) + location.href.length + 60; } catch (e) { n = 0; }
      linkTam = n; linkRec = n > LIM_LINK_DIRETO ? 'pb' : 'self';
      const mo = $('mode');
      if (mo && mo.value !== linkRec) { mo.value = linkRec; mo.dispatchEvent(new Event('change', { bubbles: true })); }
      rotularModoLink();
      try { if (typeof estimarTamanho === 'function') await estimarTamanho(); } catch (e) { /* sem estimativa */ }
    })();
  }
  function estadoLink(criado, it) {
    const f = $('jnCmpForm'), r = $('jnCmpRes'); if (!f || !r) return;
    f.hidden = !!criado; r.hidden = !criado;
    const tam = $('tam'), sh = $('share'), fe = cmp.bt.querySelector('[data-jn="fechar"]');
    if (tam) tam.hidden = !!criado;
    if (sh) sh.hidden = !!criado;
    if (fe) fe.textContent = criado ? 'Fechar' : 'Cancelar';
    if (!criado || !it) { r.innerHTML = ''; return; }
    const cur = typeof linkCurto === 'function' ? linkCurto(it.url) : { id: '', host: '' };
    const direto = /^(Autocontido|Link direto)/.test(it.tipo || '');
    const titulo = direto ? 'Link direto \u00b7 n\u00e3o expira' : String(it.tipo || 'PrivateBin') + (it.expira ? ' \u00b7 expira em ' + new Date(it.expira).toLocaleDateString('pt-BR') : '');
    r.innerHTML = '<div class="jn-lc"><div class="jn-qrc" id="jnCmpQr" role="img" aria-label="QR Code do link"></div>' +
      '<div class="jn-lct"><b>' + esc(titulo) + '</b><small>' + esc((cur.id || '') + ' ' + (cur.host || '')) + '</small></div>' +
      '<div class="jn-lca"><button type="button" class="mini" id="jnCmpCopiar">Copiar</button><a class="btn mini sec" id="jnCmpAbrir" target="_blank" rel="noopener">Abrir</a></div></div>' +
      '<p class="box priv" style="margin:8px 0 0">Guarde este link onde preferir: um e-mail para voc\u00ea mesmo, o Teams ou os favoritos. Para voltar ao conte\u00fado, use <b>Importar \u203a Colar \u203a Link</b>.</p>';
    $('jnCmpAbrir').href = it.url;
    $('jnCmpCopiar').onclick = function () {
      const b = this, ok = () => feedback(b, 'Link copiado.');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(it.url).then(ok, () => window.prompt('Copie o link:', it.url));
      else window.prompt('Copie o link:', it.url);
    };
    const box = $('jnCmpQr');
    if (typeof carregarQR === 'function') {
      carregarQR().then(Q => {
        try {
          if (it.url.length > 2800) throw new Error('longo');
          new Q(box, { text: it.url, width: 96, height: 96, correctLevel: Q.CorrectLevel.L, useSVG: true });
        } catch (e) { box.innerHTML = '<span class="qr-off">' + (it.url.length > 2800 ? 'Link longo demais para QR Code.' : 'QR indispon\u00edvel') + '</span>'; }
      }).catch(() => { box.innerHTML = '<span class="qr-off">QR indispon\u00edvel</span>'; });
    } else box.innerHTML = '<span class="qr-off">QR indispon\u00edvel</span>';
    cmp.anunciar('Link criado e copiado. Guarde-o onde preferir.');
    setTimeout(() => { const c = $('jnCmpCopiar'); if (c) c.focus(); }, 30);
  }
  function mostrarLinkCriado() {
    const it = (typeof sessaoLinks !== 'undefined' && sessaoLinks && sessaoLinks[0]) || null;
    if (!it || !it.url) { cmp.fechar(true); importar.abrir('sav'); return; }
    estadoLink(true, it);
  }
  function atualizar() {
    const nv = contar($('drafts')), nl = contar($('links')), n = nv + nl;
    nVer.textContent = nv ? String(nv) : ''; nLnk.textContent = nl ? String(nl) : '';
    excVer.hidden = !nv; excLnk.hidden = !nl;
    const tab = $('jnImpTab-sav');
    if (tab) { tab.querySelector('.jn-ct').textContent = n ? String(n) : ''; tab.setAttribute('aria-label', 'Salvos, ' + (n ? n + (n === 1 ? ' item' : ' itens') : 'vazio')); }
    bExc.disabled = !n;
    bHExc.disabled = !contar($('gerLista'));
    buscaSav.reaplicar(); buscaHist.reaplicar();
  }
  let tC = null;
  const agendar = () => { clearTimeout(tC); tC = setTimeout(atualizar, 60); };
  ['drafts', 'links', 'gerLista'].forEach(i => { const el = $(i); if (el) new MutationObserver(agendar).observe(el, { childList: true, subtree: true }); });
  atualizar();

  window.Importar = { abrir: k => importar.abrir(k), fechar: s => importar.fechar(s), ativar: (k, f) => importar.ativar(k, f), pedir: o => importar.pedir(o), msg: (t, i) => importar.msg(t, i) };
  window.HistoricoArquivos = { abrir: () => hist.abrir(), fechar: () => hist.fechar() };
  window.Compartilhar = { abrir: () => cmp.abrir(), fechar: () => cmp.fechar() };
  window.AbrirJanela = { abrir: k => importar.abrir(k), fechar: () => importar.fechar() };
})();

/* Secao "Arquivos gerados": o botao Historico do cabecalho abre a janela "Historico de arquivos" */
(function () {
  'use strict';
  const b = document.getElementById('btnHistorico');
  if (!b) return;
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.HistoricoArquivos) window.HistoricoArquivos.abrir(); });
})();
