<#
  conferir-versao.ps1 - Conteudista
  Confere no GitHub (origin/main) se a versao esta coerente antes de gerar ou enviar o proximo pacote.
  Nao altera nada na sua pasta local.

  Uso:
    powershell -ExecutionPolicy Bypass -File .\conferir-versao.ps1                  # usa a versao do changelog.js
    powershell -ExecutionPolicy Bypass -File .\conferir-versao.ps1 -Versao 1.84     # exige esta versao
    powershell -ExecutionPolicy Bypass -File .\conferir-versao.ps1 -Local           # confere a pasta local

  Codigo de saida: 0 = liberado | 1 = ha divergencias | 2 = erro de execucao
#>
param(
  [string]$Versao = '',
  [string]$Repo   = (Join-Path $env:USERPROFILE 'Documents\GitHub\conteudista'),
  [string]$Branch = 'main',
  [switch]$Local
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

# git sem que mensagens no stderr virem erro fatal (Windows PowerShell 5.1)
function Git-Run {
  $antes = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try {
    $saida = & git @args 2>$null
    return [pscustomobject]@{ Ok = ($LASTEXITCODE -eq 0); Texto = ($saida -join "`n") }
  } finally { $ErrorActionPreference = $antes }
}

if (-not (Test-Path (Join-Path $Repo '.git'))) {
  Write-Host "ERRO: repositorio nao encontrado em $Repo (use -Repo <caminho>)." -ForegroundColor Red; exit 2
}
Set-Location $Repo

if ($Local) { $origem = "pasta local ($Repo)" }
else {
  Write-Host "Atualizando referencia do GitHub (git fetch)..."
  if (-not (Git-Run fetch origin $Branch --quiet).Ok) { Write-Host "ERRO: falha no git fetch." -ForegroundColor Red; exit 2 }
  $origem = "GitHub (origin/$Branch, commit $((Git-Run rev-parse --short "origin/$Branch").Texto.Trim()))"
}

$script:origemLocal = @()
function Ler-Local([string]$c) { $p = Join-Path $Repo $c; if (Test-Path $p) { [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8) } else { $null } }
function Ler([string]$c, [switch]$PermitirLocal) {
  if ($Local) { return Ler-Local $c }
  $r = Git-Run -c core.quotepath=off show "origin/${Branch}:$c"
  if ($r.Ok) { return $r.Texto }
  if ($PermitirLocal) { $t = Ler-Local $c; if ($t) { $script:origemLocal += $c; return $t } }
  return $null
}

$res = New-Object System.Collections.Generic.List[object]
function Registrar($n, $arq, $item, $esp, $enc, [bool]$ok, [switch]$Aviso) {
  $st = if ($ok) { 'OK' } elseif ($Aviso) { 'AVISO' } else { 'FALHA' }
  $res.Add([pscustomobject]@{ '#'=$n; Arquivo=$arq; Item=$item; Esperado=$esp; Encontrado=$enc; Status=$st })
}
function V([string]$s) { $p = ($s + '.0.0.0').Split('.')[0..2]; [version]($p -join '.') }

# 1. web/changelog.js (fonte da versao)
$cj = Ler 'web/changelog.js'
$v1 = if ($cj -and $cj -match "VERSAO\s*=\s*['""]([\d.]+)['""]") { $Matches[1] } else { '(nao encontrado)' }
if (-not $Versao) { $Versao = $v1 }
Registrar 1 'web/changelog.js' 'const VERSAO' $Versao $v1 ($v1 -eq $Versao)

# 2. web/index.html
$ix = Ler 'web/index.html'
$v2 = if ($ix -and $ix -match 'changelog\.js\?v=([\d.]+)') { $Matches[1] } else { '(nao encontrado)' }
Registrar 2 'web/index.html' 'changelog.js?v=' $Versao $v2 ($v2 -eq $Versao)
if ($ix -and $Versao -match '^[\d.]+$') {
  $maior = [regex]::Matches($ix, '\?v=([\d.]+)') | ForEach-Object { V $_.Groups[1].Value } | Sort-Object -Descending | Select-Object -First 1
  Registrar 2 'web/index.html' 'nenhum ?v= acima da versao' "<= $Versao" "maior: $maior" ($maior -le (V $Versao))
}

# 3. CHANGELOG.md
$cl = Ler 'CHANGELOG.md'
$v3 = if ($cl -and $cl -match '(?m)^##\s+([\d.]+)') { $Matches[1] } else { '(nao encontrado)' }
Registrar 3 'CHANGELOG.md' 'entrada no topo' $Versao $v3 ($v3 -eq $Versao)

# 4. Relatorio de testes (pode existir so na pasta local)
$rl = Ler 'tools/testes/relatorio/relatorio.md' -PermitirLocal
$v4 = if ($rl -and $rl -match 'Conteudista\s+([\d.]+)') { $Matches[1] } else { '(nao encontrado)' }
Registrar 4 'tools/testes/relatorio/relatorio.md' 'versao testada' $Versao $v4 ($v4 -eq $Versao) -Aviso
$fal = if ($rl -and $rl -match '(\d+)\s+falha') { [int]$Matches[1] } else { -1 }
$okc = if ($rl -and $rl -match '(\d+)\s+ok') { $Matches[1] } else { '?' }
Registrar 4 'tools/testes/relatorio/relatorio.md' 'falhas nos testes' '0' $(if ($fal -ge 0) { "$fal (ok: $okc)" } else { '(nao encontrado)' }) ($fal -eq 0) -Aviso

# 5. Fluxo Aplicar pacote (o que aplica os pacotes enviados pelo celular)
$wf = Ler '.github/workflows/aplicar-pacote.yml'
$temPerm = $wf -and $wf -match 'contents:\s*write' -and $wf -match 'actions:\s*write'
Registrar 5 '.github/workflows/aplicar-pacote.yml' 'permissoes no YAML' 'contents e actions: write' $(if (-not $wf) { '(arquivo ausente)' } elseif ($temPerm) { 'declaradas' } else { 'faltando' }) $temPerm

# 6. Nenhum pacote pendente no GitHub (raiz ou pacotes/)
if (-not $Local) {
  $zips = (Git-Run ls-tree --name-only "origin/$Branch" -- . pacotes/).Texto -split "`n" | Where-Object { $_ -match '\.zip$' -and $_ -notmatch '(^|/)conteudista-web' }
  Registrar 6 'raiz e pacotes/' 'pacote .zip pendente' 'nenhum' $(if ($zips) { $zips -join ', ' } else { 'nenhum' }) (-not $zips) -Aviso
}

Write-Host ""
Write-Host "Conteudista - conferencia da versao $Versao" -ForegroundColor Cyan
Write-Host "Origem: $origem"
if ($script:origemLocal) { Write-Host ("Lido da pasta local (nao esta no GitHub): " + ($script:origemLocal -join ', ')) -ForegroundColor Yellow }
$res | Format-Table -AutoSize -Wrap | Out-String -Width 220 | Write-Host

$falhas = @($res | Where-Object Status -eq 'FALHA').Count
$avisos = @($res | Where-Object Status -eq 'AVISO').Count
if ($falhas -eq 0) {
  Write-Host "LIBERADO: o repositorio esta na versao $Versao." -ForegroundColor Green
  if ($avisos) { Write-Host "($avisos aviso(s): revise, mas nao bloqueiam.)" -ForegroundColor Yellow }
  exit 0
}
Write-Host "BLOQUEADO: $falhas divergencia(s). Corrija antes de gerar ou enviar o proximo pacote." -ForegroundColor Red
exit 1
