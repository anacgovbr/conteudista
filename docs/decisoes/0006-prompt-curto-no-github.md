# 0006 — Prompt curto com as instruções no GitHub

**Estado:** implementado, sem commit (a SPEC pede instrução explícita do responsável).
**Base:** branch `main`, HEAD `6a10adb` (1.131), mais as mudanças locais das versões 1.132 e 1.133.

## 1. Diagnóstico (Gate G0)

Cada capacidade documentada tem evidência no código ou em teste.

### 1.1 Prompt atual

| Item | Evidência |
|---|---|
| Prompt extenso anterior | `web/exemplo/treinamento.md`, seção 11.3, bloco `text` de ~175 linhas (“PROMPT PADRÃO DO CONTEUDISTA”, versão 1.1), com 8 seções, 14 parâmetros e as regras de formato. |
| Prompt exibido na interface | `web/index.html`, `<pre id="promptIA">` na tela **Criar conteúdo** (v1.129). |
| Mecanismo de cópia | `web/index.html`, `$('btnCopiarPrompt').onclick`: `navigator.clipboard.writeText($('promptIA').textContent)` e rótulo “Prompt copiado” por 1,8 s. Se a cópia falha, seleciona o texto. |

### 1.2 Slides: separadores e divisão (`tools/conteudo/markdown.py`, `split_slides`)

| Fato | Evidência |
|---|---|
| Separador: `re.split(r'\n---\s*\n', md)` | `split_slides`; teste `test_ca07_...` |
| Aceita espaços no fim e CRLF; não exige linha em branco | Casos testados |
| `----`, `***`, `___` não dividem | Casos testados |
| `---` dentro de bloco de código **divide** | Verificado; documentado como limitação |
| `#` não divide | Teste `test_ca07_...` |
| Trecho vazio é ignorado | `if p or ly` em `split_slides` |
| Cabeçalho `---`/`title:`; só `title:` é lido | `split_slides` |
| Diretivas: `class`, `layout` (25 modelos, `LAYOUTS`), `notas`, `narracao` | `split_slides`, `notas_para_narracao` |
| `class` aceita qualquer palavra; só `title` e `highlight` têm tratamento | `pptx.py`, `temas.py` |
| Layout desconhecido é ignorado | `ly = ... if in LAYOUTS else ''` |

### 1.3 Notas de narração

| Fato | Evidência |
|---|---|
| Notas ficam **no slide**: `<!-- notas: … -->` | `split_slides` |
| `<!-- narracao: texto -->` substitui a nota; `nao`, `não`, `no`, `off`, `0`, `-` silenciam | `notas_para_narracao` |
| Slide só entra se tiver conteúdo além dos comentários | `notas_para_narracao` |
| Ordem do áudio = ordem dos slides | Mesma função; teste `test_ca06_...` |
| Não existe arquivo de narração separado | Fluxo `Narracao.preparar(py)` em `web/narracao.js` lê as notas de `SM` |

### 1.4 Markdown aceito

Blocos de `blocks()` (`h`, `p`, `list`, `table`, `quote`, `code`, `img`), inline de `runs()`, legenda `Tabela:` (`html_saida.py`, `_tabela_html`), seção Gabarito (`html_saida.py`, `treinamento_html`), `url_ok()` para esquemas de link. O exemplo da apostila exercita todos (`test_ca08_...`).

### 1.5 Validadores

23 regras em `web/lib/linguagem-acessivel/regras/`, registro em `regras/index.js`, limites em `config/padrao.js`. Matriz regra → código → teste está em `docs/REGRAS_ACESSIBILIDADE_LINGUAGEM_SIMPLES.md`, seções 4 a 6. Teste de cada regra: `node tools/linguagem-acessivel/testar.mjs`, seção 1 (o exemplo inválido acusa; o válido não).

**Narração e validadores:** só a regra **n1** lê `notas`/`narracao` (frase com mais de 25 palavras). As regras f1, f2, f3 e s1 não leem comentários. Confirmado em `test_ca09_narracao_so_a_regra_n1_le_as_notas`.

### 1.6 Testes e convenções

`python tools/testes/testar_modulos.py` (módulos), `python tools/testes/testar_apresentacao.py --completo` (navegador), `node tools/linguagem-acessivel/testar.mjs`, `node tools/opcoes/verificar_opcoes.js`, `node tools/lac/lac.mjs`. Cada versão atualiza `CHANGELOG.md`, `web/changelog.js` e os `?v=` de `web/index.html`.

## 2. Divergências registradas

| Onde | Divergência |
|---|---|
| Prompt anterior × código | Dizia “listas em no máximo dois níveis”; o parser aceita até quatro. Documentado o que o código faz. |
| Prompt anterior × código | Prometia que a regra de siglas e as demais valiam para as notas; só n1 lê as notas. |
| `README.md` × exemplo | Dizia “39 slides”; o exemplo oficial gera 40. Não alterado (fora do escopo). |
| `web/exemplo/*.md` × v1.129 | Ainda falam “Nome do conteúdo” e “sublinhado”; desde a 1.129 o campo é “Nome dos arquivos” e usa hífen. Não alterado (fora do escopo). |

## 3. O que foi feito

- **Prompt curto** em `web/index.html` e em `web/exemplo/treinamento.md` (seção 11.3), idênticos, com a URL `raw.githubusercontent.com` do documento principal, o fallback e a dica “Se a IA utilizada permitir, anexe documentos…” **fora** do texto copiável.
- **`docs/PROMPT_GERACAO_IA.md`** e **`docs/REGRAS_ACESSIBILIDADE_LINGUAGEM_SIMPLES.md`**.
- **Exemplos:** `docs/exemplos/apresentacao-exemplo.md` e `docs/exemplos/apostila-exemplo.md`.
- **Testes:** `testar_modulos.py` (CA-01 a CA-10), grupo 26 do navegador (26.28 e 26.29), grupo 15 (15.3) e o auxiliar `tools/testes/referencias_lac.mjs`.
- Baseline do exemplo oficial atualizada (`tools/linguagem-acessivel/resultados/`), porque o texto da seção 11 mudou.

## 4. Limites

- As URLs `raw.githubusercontent.com` só resolvem **depois** que os arquivos estiverem em `main`. Antes disso, os testes conferem os caminhos locais.
- Os testes automáticos não provam conformidade com WCAG, eMAG ou lei alguma.
- Se a IA não abrir links, o prompt manda pedir o conteúdo dos documentos; o texto dos documentos continua sendo colado por quem usa.
- Nenhum parser, validador, formato de arquivo ou fluxo de importação foi alterado.
