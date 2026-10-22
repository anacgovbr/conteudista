/* =====================================================================================
   Conteudista - Metadados do curso (Nome do curso, Rodape em "Mais opcoes", sem Barra superior)

   - "Barra superior do treinamento (HTML)": sai da tela. O titulo (H1) do treinamento ja faz esse
     papel. O campo #bar continua no documento, escondido, para que rascunhos e links antigos abram;
     o valor nunca e usado ao gerar ou compartilhar.
   - "Prefixo dos arquivos" -> "Nome do curso" (Nome do curso), com texto auxiliar ao vivo e
     normalizacao ao sair do campo (sem acentos; espaco e simbolos viram "_"). O id (#pref) e o
     argumento --prefixo do gerador nao mudam.
   - "Rodape" -> "Rodape (opcional)", dentro do bloco recolhido "Mais opcoes". O titulo do bloco
     mostra o valor atual. O valor fica lembrado neste navegador e e reaplicado quando o campo fica
     vazio (ex.: Limpar tela, abrir um rascunho sem rodape).
   ===================================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const pref = $('pref'), rod = $('rod'), bar = $('bar'), row = pref && pref.closest ? pref.closest('.row') : null;
  if (!pref || !rod || !row) return;

  const CH = 'conteudista.rodape';
  const lembrado = () => { try { return localStorage.getItem(CH) || ''; } catch (e) { return ''; } };
  const lembrar = v => { try { if (v) localStorage.setItem(CH, v); else localStorage.removeItem(CH); } catch (e) { /* sem armazenamento */ } };
  const celula = el => (el && el.closest ? el.closest('.row > div') : null);
  const disparar = el => el.dispatchEvent(new Event('input', { bubbles: true }));

  const st = document.createElement('style');
  st.id = 'meta-css';
  st.textContent = `
.meta-aux{display:block;margin:4px 0 0;color:var(--mu,#636363);font-size:12.5px;font-weight:400;line-height:1.35}
#dxMais{margin:4px 0 12px}
#dxMais .mais-val{font-weight:400;color:var(--mu,#636363);font-size:14px}
#dxMais .mais-corpo.row{margin:0 0 4px}
#dxMais .mais-corpo>div{max-width:560px}
html.contraste #dxMais .mais-val,html.contraste .meta-aux{color:#fff!important}
`;
  document.head.appendChild(st);

  /* 1. Barra superior: some da tela; o campo fica escondido so para compatibilidade */
  if (bar) {
    const c = celula(bar);
    const guarda = document.createElement('div');
    guarda.id = 'metaGuarda'; guarda.hidden = true; guarda.setAttribute('aria-hidden', 'true');
    document.body.appendChild(guarda); guarda.appendChild(bar);
    if (c) c.remove();
    bar.value = '';
  }

  /* 2. Nome do curso */
  const cn = celula(pref), ln = cn ? cn.querySelector('label') : null;
  if (ln) ln.textContent = 'Nome do curso';
  const auxN = document.createElement('small');
  auxN.className = 'meta-aux'; auxN.id = 'prefAux';
  pref.after(auxN); pref.setAttribute('aria-describedby', 'prefAux');
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  const atualizarNome = () => { auxN.textContent = 'Usado nos nomes dos arquivos, ex.: Treinamento_' + (norm(pref.value) || 'Curso') + '.docx'; };
  pref.addEventListener('input', atualizarNome);
  pref.addEventListener('change', () => {
    const n = norm(pref.value);
    if (n !== pref.value) { pref.value = n; disparar(pref); }
    atualizarNome();
  });

  /* 3. Rodape em "Mais opcoes" (recolhido) */
  const cr = celula(rod), lr = cr ? cr.querySelector('label') : null;
  if (lr) lr.textContent = 'Rodap\u00e9 (opcional)';
  const auxR = document.createElement('small');
  auxR.className = 'meta-aux'; auxR.id = 'rodAux'; auxR.textContent = 'Aparece nos slides e no DOCX.';
  rod.after(auxR); rod.setAttribute('aria-describedby', 'rodAux');
  const det = document.createElement('details');
  det.className = 'sx'; det.id = 'dxMais'; det.open = false;
  det.innerHTML = '<summary><h3>Mais op\u00e7\u00f5es <small class="mais-val"></small></h3></summary><div class="mais-corpo row"></div>';
  row.insertAdjacentElement('afterend', det);
  if (cr) det.querySelector('.mais-corpo').appendChild(cr);
  const mv = det.querySelector('.mais-val');
  const resumo = () => {
    const v = rod.value.trim();
    mv.textContent = v ? '\u00b7 Rodap\u00e9: ' + (v.length > 40 ? v.slice(0, 40) + '\u2026' : v) : '';
  };
  rod.addEventListener('input', () => { lembrar(rod.value.trim()); resumo(); });

  function restaurarRodape() {
    const v = lembrado();
    if (!rod.value && v) { rod.value = v; disparar(rod); }
  }
  restaurarRodape();

  /* aplicar(): usado por Limpar tela, rascunhos, links e exemplo. Reaplica o rodape lembrado, esvazia a
     Barra superior (sem uso) e atualiza os textos auxiliares. */
  const original = window.aplicar;
  if (typeof original === 'function') {
    window.aplicar = function () {
      const r = original.apply(this, arguments);
      if (bar) bar.value = '';
      restaurarRodape(); atualizarNome(); resumo();
      return r;
    };
  }
  ['go', 'share'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => { if (bar) bar.value = ''; }, true); });

  atualizarNome(); resumo();
  setInterval(() => { atualizarNome(); resumo(); }, 1500);   // cobre valores trocados direto pela pagina (ex.: Carregar exemplo)
  window.Metadados = { resumo, norm };
})();