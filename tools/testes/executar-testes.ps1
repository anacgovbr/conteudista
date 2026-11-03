<#
  Executa o roteiro automatizado de testes do Conteudista no GOOGLE CHROME instalado no seu computador.
  Uso (de qualquer pasta):
      powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1
      powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1 -Grupos 1,2
      powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1 -Navegador msedge
      powershell -ExecutionPolicy Bypass -File .\tools\testes\executar-testes.ps1 -ComJanela
  Na primeira vez cria um ambiente Python isolado em %LOCALAPPDATA%\conteudista-testes (nao altera o repositorio).
  Nao baixa navegador nenhum: usa o Chrome (ou o Edge, com -Navegador msedge) ja instalado.
#>
param(
  [string]$Grupos = "1,2,3,4,5,6,7",
  [ValidateSet("chrome", "msedge", "chromium", "firefox", "webkit")][string]$Navegador = "chrome",
  [switch]$ComJanela
)
$ErrorActionPreference = "Stop"
$raiz = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$venv = Join-Path $env:LOCALAPPDATA "conteudista-testes\venv"
$py = Join-Path $venv "Scripts\python.exe"

Write-Host "==> 1/4 Verificando o navegador ($Navegador)"
if ($Navegador -eq "chrome") {
  $achou = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $achou) { throw "Google Chrome nao encontrado. Instale em https://www.google.com/chrome e tente de novo." }
  Write-Host "    Chrome: $((Get-Item $achou).VersionInfo.ProductVersion)"
}

Write-Host "==> 2/4 Preparando o ambiente Python"
if (-not (Test-Path $py)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $venv) | Out-Null
  & python -m venv $venv
  if ($LASTEXITCODE -ne 0) { throw "Python 3 nao encontrado. Instale o Python 3.10+ e tente de novo." }
}
Write-Host "==> 3/4 Instalando dependencias"
& $py -m pip install --quiet --upgrade pip
& $py -m pip install --quiet -r (Join-Path $raiz "tools\requirements.txt") -r (Join-Path $raiz "tools\testes\requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar as dependencias." }
if ($Navegador -in @("chromium", "firefox", "webkit")) { & $py -m playwright install $Navegador }

Write-Host "==> 4/4 Executando os testes"
$saida = Join-Path $raiz "tools\testes\relatorio"
$argsTeste = @((Join-Path $raiz "tools\testes\testar_apresentacao.py"), "--grupos", $Grupos, "--navegador", $Navegador, "--saida", $saida)
if ($ComJanela) { $argsTeste += "--com-cabeca" }
& $py @argsTeste
$codigo = $LASTEXITCODE
Write-Host ""
if ($codigo -eq 0) { Write-Host "TUDO CERTO. Relatorio: $saida\relatorio.md" }
else { Write-Host "HA FALHAS. Veja: $saida\relatorio.md (e as capturas de tela na mesma pasta)" }
exit $codigo
