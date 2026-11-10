#!/usr/bin/env bash
# =====================================================================================
# Conteudista - verificação completa sem navegador (fonte única para os fluxos do GitHub)
# Usado por: publicar-pagina.yml e aplicar-pacote.yml. Também roda no computador (Git Bash, Linux, Termux).
#   bash tools/verificar.sh            tudo
# Etapas novas acrescentam testes AQUI, e não nos arquivos .github/workflows: assim os pacotes
# enviados pelo celular continuam podendo ser aplicados pelo GitHub Actions.
# Saída: 0 tudo certo · diferente de 0 na primeira falha.
# =====================================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -gt 0 ]; then
  PY="${PYTHON:-python3}"; command -v "$PY" >/dev/null || PY=python
  exec "$PY" tools/testes/executar_seletivos.py "$@"
fi
TMP="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/conteudista-verificar"
rm -rf "$TMP"; mkdir -p "$TMP"
PY="${PYTHON:-python3}"; command -v "$PY" >/dev/null || PY=python
etapa() { echo; echo "==> $*"; }

etapa "Seleção conservadora e versão"
"$PY" tools/testes/executar_seletivos.py --grupos minimos,versao
"$PY" tools/testes/testar_estaticos.py --modo workflows

etapa "Contratos dos módulos e carregamento do motor Python"
"$PY" -m compileall -q tools/conteudo tools/testes
"$PY" tools/testes/testar_modulos.py
node tools/testes/testar_motor_python.mjs

etapa "Gerador com o curso de exemplo (temas govbr e clássico, narração)"
"$PY" -m py_compile tools/gerador.py
"$PY" tools/gerador.py web/exemplo/treinamento.md web/exemplo/apresentacao.md --prefixo Exemplo --rodape "Teste" --saida "$TMP/govbr" --tema govbr
"$PY" tools/gerador.py web/exemplo/treinamento.md web/exemplo/apresentacao.md --prefixo Exemplo --rodape "Teste" --saida "$TMP/classico" --tema classico
mkdir -p "$TMP/aud" && "$PY" -c "import wave,struct,math,sys;w=wave.open(sys.argv[1],'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(8000*math.sin(i/10))) for i in range(22050)))" "$TMP/aud/1.wav"
"$PY" tools/gerador.py - web/exemplo/apresentacao.md --prefixo Narr --saida "$TMP/narr" --audios "$TMP/aud" --avancar

etapa "Fontes de leitura e acessibilidade das saídas (EPUB, DOCX, PPTX e HTML)"
if [ "${VERIFICAR_SEM_FONTES:-}" = "1" ]; then echo "(fontes não conferidas: VERIFICAR_SEM_FONTES=1)"; else "$PY" tools/fontes/verificar_fontes.py; fi
EXIGIR=$([ "${VERIFICAR_SEM_FONTES:-}" = "1" ] || "$PY" -c "import json;m=json.load(open('tools/fontes/manifesto.json',encoding='utf-8'));print('--exigir-fontes' if any(f.get('arquivos') for f in m['familias']) else '')")
"$PY" tools/testar_acessibilidade.py "$TMP/govbr" --prefixo Exemplo $EXIGIR
"$PY" tools/testar_acessibilidade.py "$TMP/classico" --prefixo Exemplo --fonte-pptx "Segoe UI" $EXIGIR

etapa "Biblioteca Linguagem Acessível e linha de comando lac"
node tools/linguagem-acessivel/testar.mjs
node tools/lac/testar_lac.mjs
node tools/lac/testar_api.mjs
node tools/lac/testar_pacote.mjs

etapa "Conteúdo de exemplo: nada para corrigir"
node tools/lac/lac.mjs c -n c web/exemplo/treinamento.md web/exemplo/apresentacao.md
node tools/lac/lac.mjs c -f sarif -o linguagem-acessivel.sarif web/exemplo/treinamento.md web/exemplo/apresentacao.md

etapa "Opções padrão (web/config/opcoes.yaml)"
node tools/opcoes/testar_opcoes.js
node tools/opcoes/verificar_opcoes.js

etapa "Pacotes de atualização (envio pelo celular)"
"$PY" tools/pacote/testar_pacote.py >/dev/null || "$PY" tools/pacote/testar_pacote.py
echo "pacotes: ok"

etapa "Sintaxe de todos os scripts da página"
for js in web/*.js; do
  case "$(basename "$js")" in
    *worker*|*local*|*g2p*) cp "$js" "$TMP/$(basename "$js" .js).mjs"; node --check "$TMP/$(basename "$js" .js).mjs" ;;   # módulos ES
    *) node --check "$js" ;;
  esac
done
for js in $(find web/lib -name '*.js'); do cp "$js" "$TMP/lib.mjs"; node --check "$TMP/lib.mjs"; done
"$PY" -c "import json;json.load(open('web/modelos.json',encoding='utf-8'))"
node -e "import(require('node:url').pathToFileURL(process.argv[1]).href).then(m=>{const r=m.phonemizePTBR('Olá, mundo. A gestão de processos.');console.log(r);if(!/ˈ/.test(r))process.exit(1)})" "$TMP/ptbr-g2p.mjs"
"$PY" -c "import re,sys;s=open('web/index.html',encoding='utf-8').read();open(sys.argv[1],'w',encoding='utf-8').write(re.findall(r'<script>(.*?)</script>',s,re.S)[-1])" "$TMP/app.js"
node --check "$TMP/app.js"
echo "sintaxe: ok"

echo; echo "VERIFICAÇÃO SEM NAVEGADOR: TUDO CERTO."
