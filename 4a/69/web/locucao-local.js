/* =====================================================================================
   Conteudista — Hospedagem local dos modelos de voz (usado pelos workers da Locução)
   Se o site publicar  modelos/manifest.json  (gerado pelo workflow a partir de web/modelos.json),
   as requisições aos arquivos espelhados são redirecionadas para o próprio site:
     - modelos (Hugging Face), vozes, configurações e
     - bibliotecas JavaScript/WASM empacotadas em vendor/ (quando o workflow conseguiu gerá-las).
   Sem manifest, nada muda: tudo continua vindo da internet (Hugging Face / jsDelivr).
   ===================================================================================== */
let estado = null;

export async function ativarEspelhos(base) {
  if (estado) return estado;
  estado = { ativo: false, arquivos: 0, vendor: {}, perfis: [] };
  let man = null;
  try {
    const r = await fetch(new URL('modelos/manifest.json', base).href, { cache: 'no-cache' });
    if (r.ok) man = await r.json();
  } catch { /* sem hospedagem local */ }
  if (!man || typeof man.arquivos !== 'object') return estado;
  const mapa = new Map(Object.entries(man.arquivos));          // URL de origem → caminho local
  const aliases = man.aliases || {};                              // origem canônica → [origens equivalentes]
  const normalizar = u => {
    u = String(u).split('#')[0].split('?')[0];
    try { u = decodeURI(u); } catch { /* mantém */ }
    for (const [canon, lista] of Object.entries(aliases)) for (const a of lista) if (u.startsWith(a)) return canon + u.slice(a.length);
    return u;
  };
  const original = self.fetch.bind(self);
  self.fetch = (input, init) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input && input.url;
      const local = url && mapa.get(normalizar(url));
      if (local) {
        const op = init ? { method: init.method, headers: init.headers, signal: init.signal } : undefined;
        return original(new URL(local, base).href, op);
      }
    } catch { /* segue para a rede */ }
    return original(input, init);
  };
  estado = { ativo: true, arquivos: mapa.size, vendor: man.vendor || {}, perfis: man.perfis || [], gerado: man.gerado || '' };
  return estado;
}

/** Erro típico de biblioteca local com dependência não resolvida (ex.: import('onnxruntime-web')). */
export const ehErroModulo = e => /resolve module specifier|bare specifier|Failed to fetch dynamically imported module|Cannot find module|Importing a module script failed/i.test(String((e && e.message) || e));

/** Importa o primeiro módulo disponível: cópia local (vendor) e depois as URLs de CDN. */
export async function importarPrimeiro(base, locais, cdns, semLocal) {
  let erro;
  for (const u of [...(semLocal ? [] : (locais || []).filter(Boolean).map(x => new URL(x, base).href)), ...cdns]) {
    try { return { mod: await import(u), url: u }; } catch (e) { erro = e; }
  }
  throw erro || new Error('Falha ao importar ' + cdns[0]);
}
