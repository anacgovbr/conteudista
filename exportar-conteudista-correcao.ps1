param(
  [string]$Saida = "",
  [switch]$IncluirJson,
  [switch]$AbrirPasta
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Etapa([string]$Texto) { Write-Host "`n==> $Texto" -ForegroundColor Cyan }
function Falhar([string]$Texto) { throw $Texto }
function EscreverUtf8([string]$Caminho, [string]$Conteudo) {
  [System.IO.File]::WriteAllText($Caminho, $Conteudo, [System.Text.UTF8Encoding]::new($false))
}
function Relativo([string]$Caminho, [string]$Raiz) {
  return [System.IO.Path]::GetRelativePath($Raiz, $Caminho).Replace('\','/')
}

$Raiz = (git rev-parse --show-toplevel 2>$null).Trim()
if (-not $Raiz) { Falhar "Execute este script dentro do repositorio Conteudista." }
Set-Location $Raiz

$Commit = (git rev-parse HEAD).Trim()
$Branch = (git branch --show-current).Trim()
$Data = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
if (-not $Saida) { $Saida = Join-Path (Split-Path $Raiz -Parent) "conteudista-correcao-$Data" }
$Saida = [System.IO.Path]::GetFullPath($Saida)
$Zip = "$Saida.zip"

$RelatorioMd = Join-Path $Raiz "ETAPA-0B-RESULTADO.md"
$RelatorioJson = Join-Path $Raiz "ETAPA-0B-RESULTADO.json"
if (-not (Test-Path $RelatorioMd)) {
  Falhar "ETAPA-0B-RESULTADO.md nao encontrado. Rode primeiro auditar-etapa-0b-corrigido.ps1."
}

Etapa "Preparando exportacao limpa"
if (Test-Path $Saida) { Remove-Item -Recurse -Force $Saida }
if (Test-Path $Zip) { Remove-Item -Force $Zip }
New-Item -ItemType Directory -Force -Path $Saida | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Saida "arquivos") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Saida "diff") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Saida "etapas") | Out-Null

Etapa "Lendo achados sem repetir ocorrencias por rodada"
$Relatorio = Get-Content -LiteralPath $RelatorioMd -Raw -Encoding UTF8

# Lista de correcoes confirmadas, consolidada por causa raiz, nao por viewport/rodada.
$Achados = @(
  [ordered]@{
    Etapa = "01"
    Id = "A-12"
    Prioridade = "P0"
    Titulo = "Corrigir Label in Name nos botoes H1, H2 e H3"
    Regra = "axe-core label-content-name-mismatch; WCAG 2.5.3"
    Arquivos = @("web/editor.js", "web/dicas.js")
    Evidencia = @(
      "Botoes visuais H1, H2 e H3 usam nomes acessiveis que nao incluem literalmente o texto visivel.",
      "O mesmo defeito apareceu em varias rodadas, mas deve ser tratado como uma unica causa raiz."
    )
    Aceite = @(
      "axe-core label-content-name-mismatch = 0",
      "O nome acessivel de cada botao contem H1, H2 ou H3, conforme o texto visivel.",
      "Atalhos permanecem disponiveis no title, aria-keyshortcuts ou complemento do nome."
    )
  },
  [ordered]@{
    Etapa = "02"
    Id = "A-05"
    Prioridade = "P0"
    Titulo = "Remover controles interativos de dentro de summary"
    Regra = "axe-core nested-interactive; WCAG 4.1.2"
    Arquivos = @("web/editor.js", "web/index.html", "web/gerados.js", "web/govbr.css")
    Evidencia = @(
      ".mde-gal > summary contem controles focaveis no desktop.",
      "#dxRes > summary contem controles focaveis em desktop e mobile.",
      "Cada seletor e uma causa raiz unica, independentemente da quantidade de rodadas."
    )
    Aceite = @(
      "axe-core nested-interactive = 0",
      "summary possui apenas o rotulo/acionador do details.",
      "Botoes, selects e links ficam em uma barra de acoes fora do summary.",
      "Abrir e fechar o details continua funcionando por teclado e toque."
    )
  },
  [ordered]@{
    Etapa = "03"
    Id = "A-17"
    Prioridade = "P0"
    Titulo = "Corrigir somente alvos interativos abaixo de 24 CSS px"
    Regra = "WCAG 2.2 SC 2.5.8 Target Size Minimum"
    Arquivos = @("web/govbr.css", "web/ds-botoes.css", "web/editor.js", "web/celular.js", "web/janelas.js")
    Evidencia = @(
      "Foram medidos alvos abaixo de 24 px em desktop e mobile.",
      "Alvos entre 24 e 43 px nao entram automaticamente nesta correcao; devem ser avaliados por espacamento e excecao."
    )
    Aceite = @(
      "desktop-1440: alvos <24 px = 0",
      "mobile-384: alvos <24 px = 0",
      "mobile-320: alvos <24 px = 0",
      "Nenhuma regressao de overflow horizontal."
    )
  },
  [ordered]@{
    Etapa = "04"
    Id = "A-02"
    Prioridade = "P1"
    Titulo = "Substituir abertura automatica do tutorial por convite nao modal"
    Regra = "Evitar mudanca inesperada de contexto e reduzir carga cognitiva"
    Arquivos = @("web/ajuda.js", "web/index.html", "web/govbr.css")
    Evidencia = @(
      "ajuda.js inicia o tutorial automaticamente na primeira visita apos temporizador.",
      "A correcao deve preservar o botao Tutorial e o atalho existente."
    )
    Aceite = @(
      "Primeira visita mostra convite nao modal com Comecar e Agora nao.",
      "O foco nao e movido automaticamente.",
      "Tutorial continua abrindo pelo botao e pelo atalho.",
      "A decisao Agora nao e persistida sem bloquear reabertura manual."
    )
  }
)

# Detecta os arquivos existentes e evita duplicacao no pacote.
$ArquivosUnicos = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($a in $Achados) {
  foreach ($f in $a.Arquivos) {
    $abs = Join-Path $Raiz $f
    if (Test-Path $abs) { [void]$ArquivosUnicos.Add($f) }
  }
}

Etapa "Copiando somente arquivos relacionados as correcoes"
foreach ($f in ($ArquivosUnicos | Sort-Object)) {
  $Origem = Join-Path $Raiz $f
  $Destino = Join-Path (Join-Path $Saida "arquivos") $f
  New-Item -ItemType Directory -Force -Path (Split-Path $Destino -Parent) | Out-Null
  Copy-Item -LiteralPath $Origem -Destination $Destino -Force
}

Etapa "Gerando DIFFs sem repeticoes"
$DiffAtual = git -c core.safecrlf=false diff --no-ext-diff --binary -- . 2>$null | Out-String
if ([string]::IsNullOrWhiteSpace($DiffAtual)) {
  $DiffAtual = "# Nenhuma alteracao local ainda.`n"
}
EscreverUtf8 (Join-Path $Saida "diff\00-alteracoes-locais.patch") $DiffAtual

$DiffStaged = git -c core.safecrlf=false diff --cached --no-ext-diff --binary -- . 2>$null | Out-String
if ([string]::IsNullOrWhiteSpace($DiffStaged)) {
  $DiffStaged = "# Nenhuma alteracao em staging.`n"
}
EscreverUtf8 (Join-Path $Saida "diff\00-alteracoes-staged.patch") $DiffStaged

# Gera um diff-base por arquivo, mostrando o estado auditado sem repetir o mesmo arquivo por etapa.
foreach ($f in ($ArquivosUnicos | Sort-Object)) {
  $Seguro = ($f -replace '[\\/:*?"<>|]', '_')
  $Conteudo = git show "$Commit`:$f" 2>$null | Out-String
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($Conteudo)) {
    EscreverUtf8 (Join-Path $Saida "diff\base-$Seguro.txt") $Conteudo
  }
}

Etapa "Gerando SPECS por etapa"
foreach ($a in $Achados) {
  $Linhas = [System.Collections.Generic.List[string]]::new()
  $Linhas.Add("# Etapa $($a.Etapa) - $($a.Titulo)")
  $Linhas.Add("")
  $Linhas.Add("- ID: $($a.Id)")
  $Linhas.Add("- Prioridade: $($a.Prioridade)")
  $Linhas.Add("- Regra: $($a.Regra)")
  $Linhas.Add("- Commit-base: ``$Commit``")
  $Linhas.Add("")
  $Linhas.Add("## Evidencia consolidada")
  $Linhas.Add("")
  foreach ($e in $a.Evidencia) { $Linhas.Add("- $e") }
  $Linhas.Add("")
  $Linhas.Add("## Arquivos candidatos")
  $Linhas.Add("")
  foreach ($f in $a.Arquivos) {
    $Existe = Test-Path (Join-Path $Raiz $f)
    $Linhas.Add("- [$(if($Existe){'x'}else{' '})] ``$f``")
  }
  $Linhas.Add("")
  $Linhas.Add("## Entregavel")
  $Linhas.Add("")
  $Linhas.Add("Implementar apenas esta causa raiz. Nao incluir correcoes das etapas seguintes no mesmo commit.")
  $Linhas.Add("")
  $Linhas.Add("## Criterios de aceite")
  $Linhas.Add("")
  foreach ($e in $a.Aceite) { $Linhas.Add("- [ ] $e") }
  $Linhas.Add("")
  $Linhas.Add("## Validacao")
  $Linhas.Add("")
  $Linhas.Add("1. Executar ``auditar-etapa-0b-corrigido.ps1``.")
  $Linhas.Add("2. Comparar ``ETAPA-0B-RESULTADO.md`` com o resultado anterior.")
  $Linhas.Add("3. Confirmar que nao surgiu nova violacao axe-core.")
  $Linhas.Add("4. Registrar o commit da etapa no ROADMAP.md deste pacote.")
  EscreverUtf8 (Join-Path $Saida ("etapas\ETAPA-{0}-{1}.md" -f $a.Etapa,$a.Id)) ($Linhas -join "`n")
}

Etapa "Gerando roadmap e manifesto"
$Road = [System.Collections.Generic.List[string]]::new()
$Road.Add("# Roadmap de correcoes - Etapa 0B")
$Road.Add("")
$Road.Add("- Repositorio: ``$Raiz``")
$Road.Add("- Branch: ``$Branch``")
$Road.Add("- Commit-base: ``$Commit``")
$Road.Add("- Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$Road.Add("")
$Road.Add("## Regra de execucao")
$Road.Add("")
$Road.Add("Implemente uma etapa por vez, gere um commit por etapa e rode novamente a auditoria antes de seguir.")
$Road.Add("")
$Road.Add("| Ordem | ID | Prioridade | Correcao | Estado | Commit |")
$Road.Add("|---:|---|---|---|---|---|")
foreach ($a in $Achados) {
  $Road.Add("| $($a.Etapa) | $($a.Id) | $($a.Prioridade) | $($a.Titulo) | PENDENTE |  |")
}
$Road.Add("")
$Road.Add("## Meta apos a Etapa 03")
$Road.Add("")
$Road.Add("- ``label-content-name-mismatch = 0``")
$Road.Add("- ``nested-interactive = 0``")
$Road.Add("- ``alvos <24px = 0`` em desktop-1440, mobile-384 e mobile-320")
$Road.Add("- ``overflow horizontal = 0`` nos mesmos perfis")
$Road.Add("")
$Road.Add("## Fora deste pacote")
$Road.Add("")
$Road.Add("A-01, A-03, A-06/A-13, A-07, A-08, A-10, A-18, A-19, A-22, A-25, A-28 e A-29 dependem de testes direcionados ou humanos. Eles nao foram misturados com as correcoes automaticas confirmadas.")
EscreverUtf8 (Join-Path $Saida "ROADMAP.md") ($Road -join "`n")

$Manifesto = [ordered]@{
  repositorio = $Raiz
  branch = $Branch
  commitBase = $Commit
  geradoEm = (Get-Date).ToString("o")
  relatorioOrigem = "ETAPA-0B-RESULTADO.md"
  etapas = $Achados
  arquivosUnicos = @($ArquivosUnicos | Sort-Object)
}
EscreverUtf8 (Join-Path $Saida "manifesto.json") ($Manifesto | ConvertTo-Json -Depth 8)
Copy-Item -LiteralPath $RelatorioMd -Destination (Join-Path $Saida "ETAPA-0B-RESULTADO.md") -Force
if ($IncluirJson -and (Test-Path $RelatorioJson)) {
  Copy-Item -LiteralPath $RelatorioJson -Destination (Join-Path $Saida "ETAPA-0B-RESULTADO.json") -Force
}

$LeiaMe = @"
# Exportacao Conteudista - correcoes da Etapa 0B

Este pacote contem apenas o necessario para implementar as correcoes confirmadas sem repetir a mesma falha por rodada ou viewport.

## Ordem

1. A-12 - Label in Name
2. A-05 - interativos aninhados em summary
3. A-17 - alvos abaixo de 24 CSS px
4. A-02 - tutorial automatico

## Estrutura

- ``ROADMAP.md``: controle etapa a etapa.
- ``etapas/``: uma SPEC curta por causa raiz.
- ``arquivos/``: copia dos arquivos candidatos, sem duplicacao.
- ``diff/00-alteracoes-locais.patch``: alteracoes locais ainda nao commitadas.
- ``diff/00-alteracoes-staged.patch``: alteracoes em staging.
- ``diff/base-*.txt``: estado dos arquivos no commit-base.
- ``ETAPA-0B-RESULTADO.md``: evidencia da auditoria.
- ``manifesto.json``: inventario estruturado.

## Uso recomendado

Implemente apenas a Etapa 01, rode a auditoria, gere um commit e atualize ``ROADMAP.md``. Depois repita para a etapa seguinte.
"@
EscreverUtf8 (Join-Path $Saida "LEIA-ME.md") $LeiaMe

Etapa "Compactando"
Compress-Archive -Path (Join-Path $Saida "*") -DestinationPath $Zip -CompressionLevel Optimal

Etapa "Concluido"
Write-Host "Pasta: $Saida" -ForegroundColor Green
Write-Host "ZIP:   $Zip" -ForegroundColor Green
Write-Host "Etapas: $($Achados.Count)"
Write-Host "Arquivos unicos: $($ArquivosUnicos.Count)"
if ($AbrirPasta) { Start-Process explorer.exe $Saida }
