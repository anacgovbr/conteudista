/* Ajuda única do lac. Tudo sai de comandos.json: ajuda do terminal, manual (man), autocompletar e docs/lac.md.
   A API (etapa 11) servirá estes mesmos textos em /v1/ajuda. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSAO as VERSAO_BIBLIOTECA } from '../../web/lib/linguagem-acessivel/index.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const C = JSON.parse(fs.readFileSync(path.join(AQUI, 'comandos.json'), 'utf8'));
const P = C.programa;
/** Versão da release do lac e da API (a da biblioteca é outra e vem de web/lib/linguagem-acessivel). */
export const VERSAO_LAC = P.versao;
const VERSAO = VERSAO_LAC;
export const comandoPor = x => C.comandos.find(c => c.id === x || (c.atalho && c.atalho === x));
export const opcaoPor = x => C.opcoes.find(o => o.id === x || (o.curta && o.curta === x));
const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));
const flag = o => (o.curta ? '-' + o.curta + '  ' : '    ') + '--' + o.id + (o.valor ? ' <' + o.valor + '>' : '');

/** Ajuda geral (lac h). */
export function ajudaGeral() {
  const l = [P.atalho + ' · ' + P.titulo + ' ' + VERSAO, P.descricao, '', 'Uso:  ' + P.uso, '      ' + P.entrada, '', 'Comandos'];
  for (const c of C.comandos) {
    l.push(('  ' + pad(c.atalho || ' ', 3) + pad(c.id, 11) + pad(c.resumo + (c.disponivel === false ? ' (em breve)' : ''), 48) + (c.curto || '')).trimEnd());
  }
  const r = opcaoPor('regra'), n = opcaoPor('nivel');
  l.push('', 'O que conferir',
    '  -g  grupo   a acessibilidade  l linguagem',
    '              i imagens  e estrutura  k links',
    '              f frases   s siglas     n narração',
    '              c sentido  m mídia',
    '  -' + r.curta + '  regra   código ou nome          f1  frase-longa',
    '  -' + n.curta + '  nível   c corrigir  s sugestão', '',
    'Opções');
  for (const o of C.opcoes) if (!['grupo', 'regra', 'nivel'].includes(o.id)) l.push('  ' + pad(flag(o), 26) + o.descricao + (o.valores ? ' (' + o.valores + ')' : ''));
  l.push('', 'Saída: ' + C.saida.map(s => s.codigo + ' ' + s.descricao).join(' · '), '', 'Exemplos');
  C.exemplosGerais.forEach(e => l.push('  ' + e[0]));
  l.push('', 'Mais: lac h <comando> · regras: lac r · uma regra: lac e <código>');
  return l.join('\n') + '\n';
}
/** Ajuda curta: quando o lac é chamado sem nada. */
export function ajudaCurta() {
  return P.atalho + ' · ' + P.titulo + ' ' + VERSAO + '\nUso: ' + P.uso + '\n  ' + C.comandos.filter(c => c.atalho && c.disponivel !== false).map(c => c.atalho + ' ' + c.id).join(' · ') +
    '\nExemplo: cat apostila.md | lac c\nAjuda completa: lac h\n';
}
/** Ajuda de um comando (lac h c, lac c -h). */
export function ajudaComando(id) {
  const c = comandoPor(id); if (!c) return null;
  const l = [P.atalho + ' ' + c.id + (c.atalho ? ' (' + c.atalho + ')' : '') + ' · ' + c.resumo + (c.disponivel === false ? ' (em breve)' : ''), '', c.descricao, '',
    'Uso:  ' + P.atalho + ' ' + (c.atalho || c.id) + (c.opcoes.length ? ' [opções]' : '') + (c.argumentos ? ' ' + c.argumentos : '')];
  if (c.opcoes.length) {
    l.push('', 'Opções');
    for (const id of c.opcoes) { const o = opcaoPor(id); let v = o.valores; if (id === 'formato' && c.formatos.length) v = c.formatos.join(' '); l.push('  ' + pad(flag(o), 26) + o.descricao + (v ? ' (' + v + ')' : '')); }
  }
  if (c.exemplos.length) { l.push('', 'Exemplos'); c.exemplos.forEach(e => l.push(('  ' + pad(e[0], 46) + (e[1] || '')).trimEnd())); }
  if (c.api) l.push('', 'Na API: ' + c.api.metodo + ' ' + c.api.caminho);
  return l.join('\n') + '\n';
}
/** Manual (man lac), em roff. */
export function manual() {
  const e = s => String(s).replace(/\\/g, '\\e').replace(/^([.'])/gm, '\\&$1').replace(/-/g, '\\-');
  const l = ['.TH LAC 1 "" "lac ' + VERSAO + '" "Linguagem Acessível"', '.SH NOME', P.atalho + ', ' + P.nome + ' \\- ' + e(P.descricao), '.SH SINOPSE', '.B ' + P.atalho, e(' <comando> [opções] [arquivo...]'),
    '.SH DESCRIÇÃO', e(P.entrada), '.SH COMANDOS'];
  for (const c of C.comandos) l.push('.TP', '.B ' + e((c.atalho ? c.atalho + ', ' : '') + c.id + (c.argumentos ? ' ' + c.argumentos : '')), e(c.descricao));
  l.push('.SH OPÇÕES');
  for (const o of C.opcoes) l.push('.TP', '.B ' + e(flag(o).replace(/\s+/g, ' ').trim()), e(o.descricao + (o.valores ? ' (' + o.valores + ').' : '.')));
  l.push('.SH CÓDIGOS DE SAÍDA');
  C.saida.forEach(s => l.push('.TP', '.B ' + s.codigo, e(s.descricao)));
  l.push('.SH EXEMPLOS');
  C.comandos.forEach(c => c.exemplos.forEach(x => l.push('.TP', '.B ' + e(x[0]), e(x[1] || ''))));
  l.push('.SH AMBIENTE', '.TP', '.B NO_COLOR', 'Sem cores na saída.', '.SH VEJA TAMBÉM', 'docs/lac.md, docs/linguagem\\-acessivel/');
  return l.join('\n') + '\n';
}
/** Autocompletar do bash. */
export function completarBash() {
  const cmds = C.comandos.flatMap(c => [c.id, c.atalho].filter(Boolean)).join(' ');
  const ops = C.opcoes.flatMap(o => ['--' + o.id, o.curta ? '-' + o.curta : ''].filter(Boolean)).join(' ');
  return `# Autocompletar do lac (bash). Ative com: source <(lac completar bash)
_lac() {
  local cur prev; cur="\${COMP_WORDS[COMP_CWORD]}"; prev="\${COMP_WORDS[COMP_CWORD-1]}"
  case "$prev" in
    -g|--grupo) COMPREPLY=($(compgen -W "a l i e k f s n c m acessibilidade linguagem imagens estrutura links frases siglas narracao sentido midia" -- "$cur")); return;;
    -n|--nivel) COMPREPLY=($(compgen -W "c s" -- "$cur")); return;;
    -f|--formato) COMPREPLY=($(compgen -W "texto json jsonl sarif resumo relatorio" -- "$cur")); return;;
    -t|--tipo) COMPREPLY=($(compgen -W "auto apostila apresentacao" -- "$cur")); return;;
    --agrupar) COMPREPLY=($(compgen -W "grupo regra nenhum" -- "$cur")); return;;
    p|pedido) COMPREPLY=($(compgen -W "descrever simplificar" -- "$cur")); return;;
    completar) COMPREPLY=($(compgen -W "bash zsh" -- "$cur")); return;;
  esac
  if [ "$COMP_CWORD" -eq 1 ]; then COMPREPLY=($(compgen -W "${cmds}" -- "$cur")); return; fi
  if [[ "$cur" == -* ]]; then COMPREPLY=($(compgen -W "${ops}" -- "$cur")); return; fi
  COMPREPLY=($(compgen -f -- "$cur"))
}
complete -F _lac lac linguagem-acessivel
`;
}
/** Autocompletar do zsh. */
export function completarZsh() {
  const cmds = C.comandos.map(c => "'" + c.id + ':' + c.resumo.replace(/'/g, '') + "'" + (c.atalho ? " '" + c.atalho + ':' + c.resumo.replace(/'/g, '') + "'" : '')).join(' ');
  const ops = C.opcoes.map(o => "'" + (o.curta ? '(-' + o.curta + ' --' + o.id + ')' + '{-' + o.curta + ',--' + o.id + '}' : '--' + o.id) + '[' + o.descricao.replace(/[\[\]']/g, '') + ']' + (o.valor ? ':' + o.valor + ':' + (o.id === 'saida' ? '_files' : '') : '') + "'").join(' \\\n    ');
  return `#compdef lac linguagem-acessivel
# Autocompletar do lac (zsh). Ative com: source <(lac completar zsh)
_lac() {
  local -a cmds; cmds=(${cmds})
  _arguments -s \\
    ${ops} \\
    '1:comando:->cmd' '*:arquivo:_files'
  [[ $state == cmd ]] && _describe 'comando' cmds
}
compdef _lac lac linguagem-acessivel 2>/dev/null || _lac "$@"
`;
}
/** docs/lac.md */
export function markdown() {
  const l = ['# lac · linha de comando da Linguagem Acessível', '', '> Página gerada por `node tools/lac/gerar.mjs` a partir de `tools/lac/comandos.json`. Não edite à mão.', '',
    P.descricao + ' Funciona com pipes, como qualquer ferramenta Unix, e usa os mesmos comandos, opções e formatos da API.', '',
    '## Instalar', '', '### Linux: um comando', '',
    'Com Node.js 18+, Bash, curl, tar e sha256sum instalados, execute **sem sudo**:', '',
    '```bash', 'bash -o pipefail -c \'curl -fsSL https://raw.githubusercontent.com/anacgovbr/conteudista/main/tools/lac/instalar.sh | bash\'', '```', '',
    'O comando executa um script remoto do projeto. Para inspecionar antes, baixe a mesma URL com `curl -fsSL -o instalar-lac.sh URL`, leia o arquivo e execute `bash instalar-lac.sh`.',
    'O instalador baixa a release 1.0.0 e confere o SHA-256 antes de instalar em `~/.local/share/lac/lac-1.0.0`; cria `lac` e `linguagem-acessivel` em `~/.local/bin`. Repetir o comando reutiliza a instalação e não sobrescreve comandos de terceiros. O checksum detecta corrupção do pacote, mas não substitui uma assinatura independente de autenticidade.', '',
    'Se a pasta não estiver no PATH, o instalador orienta a executar `export PATH="$HOME/.local/bin:$PATH"` e a guardar essa linha na configuração do shell. Não instala Node.js, não muda arquivos do shell e não abre a API. Depois: `lac -v`, `lac c apostila.md` ou `lac servir`.',
    'Para escolher outra release publicada: prefixe o comando com `export LAC_VERSION=X.Y.Z;`. Para remover esta instalação, apague apenas os dois links criados em `~/.local/bin` e a pasta `~/.local/share/lac/lac-1.0.0`, depois de conferir que pertencem ao lac.', '',
    '### Pacote e outros sistemas', '',
    '- **Pacote da release:** baixe `lac-' + VERSAO_LAC + '.tar.gz` em *Releases* (tag `lac-v' + VERSAO_LAC + '`), confira com `SHA256SUMS` e extraia. Precisa só do Node.js 18 ou mais novo; não há dependências para instalar. Depois: `node lac-' + VERSAO_LAC + '/tools/lac/lac.mjs c apostila.md`.',
    '- **Windows:** `tools\\lac\\lac.cmd c apostila.md` (ou acrescente `tools\\lac` ao PATH e use `lac`).',
    '- **Linux e macOS:** `node tools/lac/lac.mjs c apostila.md`, ou `npm link` dentro de `tools/lac` para ter `lac` e `linguagem-acessivel` no PATH.',
    '- **Manual:** `man ./tools/lac/lac.1`. **Autocompletar:** `source <(lac completar bash)` ou `zsh`.',
    '- **Versões:** `lac -v` (ou `--version`) mostra a do `lac` e da API (' + VERSAO_LAC + '), da biblioteca (' + VERSAO_BIBLIOTECA + ') e dos pedidos para IA. A API v1 só muda de forma compatível; mudanças incompatíveis exigem `/v2`. Histórico em `tools/lac/CHANGELOG.md`.', '',
    '## Ajuda', '', '```text', ajudaGeral().trimEnd(), '```', '', '## Comandos', ''];
  for (const c of C.comandos) l.push('### ' + c.id + (c.atalho ? ' (`' + c.atalho + '`)' : ''), '', '```text', ajudaComando(c.id).trimEnd(), '```', '');
  l.push('## Formatos de saída', '', '| Formato | Uso | Na API |', '|---|---|---|',
    '| `texto` (padrão) | Leitura por pessoas. Escreve "corrigir" e "sugestão" por extenso; cores só no terminal e sem `NO_COLOR` | `text/plain` |',
    '| `jsonl` | Pipes: um item por linha, com `arquivo` e `grupo` | `application/x-ndjson` |',
    '| `json` | Resposta completa, agrupada por grupo (`--agrupar regra` ou `nenhum`) | `application/json` |',
    '| `sarif` | Achados no GitHub (SARIF 2.1.0; colunas em pontos de código) | `application/sarif+json` |',
    '| `relatorio` | Relatório HTML acessível, com metadados, itens, linhas e marcadores | `text/html` |',
    '| `resumo` | Só as contagens | `text/plain` |', '',
    '## API local', '', '`lac servir -p 8787` abre a API em `127.0.0.1`. Use `LAC_HOST` apenas quando precisar escolher explicitamente outro endereço de escuta. As origens CORS são negadas por padrão; configure `LAC_CORS_ORIGINS` com uma lista separada por vírgulas. A API não guarda nem registra o conteúdo enviado, limita o corpo a 1 MiB e responde com erros RFC 9457.',
    'A especificação OpenAPI 3.1 fica em `tools/lac/openapi.json` e é gerada por `node tools/lac/gerar.mjs`.', '',
    '## Códigos de saída', '', '| Código | Significado |', '|---|---|');
  C.saida.forEach(s => l.push('| ' + s.codigo + ' | ' + s.descricao + ' |'));
  l.push('', 'Encontrar problemas no texto não é erro do programa: na API, a resposta é 200.', '');
  return l.join('\n');
}
