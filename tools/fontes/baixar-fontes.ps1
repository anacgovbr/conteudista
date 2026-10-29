<#
  Conteudista — baixa as fontes de leitura (WOFF2) e as licenças OFL das fontes oficiais e grava o manifesto.json.
  Uso (PowerShell, na raiz do repositório ou nesta pasta):
    powershell -ExecutionPolicy Bypass -File .\tools\fontes\baixar-fontes.ps1
  Fontes:
    Atkinson Hyperlegible Next — Google Fonts (Braille Institute), subconjunto "latin" (inclui todos os acentos do português).
    OpenDyslexic — repositório oficial antijingoist/opendyslexic (pasta compiled), com espelhos de reserva.
  Confere a assinatura WOFF2 de cada arquivo, calcula o SHA-256 e registra a origem no manifesto.
  Arquivo que não puder ser baixado fica de fora do manifesto: o Conteudista usa Verdana no lugar.
#>
param([switch]$Silencioso)
$ErrorActionPreference = 'Continue'
$pasta = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }
try { [System.Net.WebRequest]::DefaultWebProxy.Credentials = [System.Net.CredentialCache]::DefaultNetworkCredentials } catch { }
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
function Diga([string]$t, [string]$cor = 'Gray') { if (-not $Silencioso) { Write-Host $t -ForegroundColor $cor } }

function Baixar([string]$url) {
    try {
        $r = Invoke-WebRequest -Uri $url -UserAgent $UA -UseBasicParsing -TimeoutSec 60
        if ($r.StatusCode -ne 200) { return $null }
        if ($r.Content -is [byte[]]) { return $r.Content }
        return [System.Text.Encoding]::UTF8.GetBytes([string]$r.Content)
    } catch { return $null }
}
function EhWoff2([byte[]]$b) { return ($b -and $b.Length -gt 1000 -and $b[0] -eq 0x77 -and $b[1] -eq 0x4F -and $b[2] -eq 0x46 -and $b[3] -eq 0x32) }
function Sha256([byte[]]$b) {
    $s = [System.Security.Cryptography.SHA256]::Create()
    return ([System.BitConverter]::ToString($s.ComputeHash($b))).Replace('-', '').ToLower()
}
function Gravar([string]$nome, [byte[]]$b) { [System.IO.File]::WriteAllBytes((Join-Path $pasta $nome), $b) }

$faces = @(
    @{ peso = 400; estilo = 'normal'; suf = '' },
    @{ peso = 400; estilo = 'italic'; suf = '-italic' },
    @{ peso = 700; estilo = 'normal'; suf = '' },
    @{ peso = 700; estilo = 'italic'; suf = '-italic' }
)
$familias = @()

# ---------------- Atkinson Hyperlegible Next (Google Fonts) ----------------
Diga 'Atkinson Hyperlegible Next: consultando o Google Fonts...' 'Cyan'
$atk = @()
$cssBytes = Baixar 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,700;1,400;1,700&display=swap'
$urlsGoogle = @{}
if ($cssBytes) {
    $css = [System.Text.Encoding]::UTF8.GetString($cssBytes)
    foreach ($m in [regex]::Matches($css, '/\*\s*latin\s*\*/\s*@font-face\s*\{([^}]*)\}')) {
        $bloco = $m.Groups[1].Value
        $est = [regex]::Match($bloco, 'font-style:\s*(\w+)').Groups[1].Value
        $pes = [regex]::Match($bloco, 'font-weight:\s*(\d+)').Groups[1].Value
        $u = [regex]::Match($bloco, 'url\(([^)]+\.woff2)\)').Groups[1].Value
        if ($u) { $urlsGoogle["$pes-$est"] = $u }
    }
}
foreach ($f in $faces) {
    $arq = 'atkinson-hyperlegible-next-{0}{1}.woff2' -f $f.peso, $f.suf
    $cands = @()
    if ($urlsGoogle.ContainsKey(('{0}-{1}' -f $f.peso, $f.estilo))) { $cands += $urlsGoogle[('{0}-{1}' -f $f.peso, $f.estilo)] }
    $cands += ('https://cdn.jsdelivr.net/fontsource/fonts/atkinson-hyperlegible-next@latest/latin-{0}-{1}.woff2' -f $f.peso, $f.estilo)
    $ok = $false
    foreach ($u in $cands) {
        $b = Baixar $u
        if (EhWoff2 $b) {
            Gravar $arq $b
            $atk += [ordered]@{ peso = $f.peso; estilo = $f.estilo; arquivo = $arq; sha256 = (Sha256 $b); origem = $u; subconjunto = 'latin' }
            Diga ('  ok: {0} ({1} KB)' -f $arq, [int]($b.Length / 1024)) 'Green'; $ok = $true; break
        }
    }
    if (-not $ok) { Diga ('  NAO baixado: {0}' -f $arq) 'Yellow' }
}
$familias += [ordered]@{ id = 'atkinson'; nome = 'Atkinson Hyperlegible Next'; licenca = 'OFL-1.1'; arquivos = $atk }
foreach ($u in @('https://raw.githubusercontent.com/google/fonts/main/ofl/atkinsonhyperlegiblenext/OFL.txt',
                 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/atkinsonhyperlegiblenext/OFL.txt')) {
    $b = Baixar $u
    if ($b -and [System.Text.Encoding]::UTF8.GetString($b) -match 'SIL OPEN FONT LICENSE') { Gravar 'OFL-Atkinson-Hyperlegible-Next.txt' $b; Diga '  ok: licença OFL oficial (Atkinson)' 'Green'; break }
}

# ---------------- OpenDyslexic (repositório oficial) ----------------
Diga 'OpenDyslexic: baixando do repositório oficial...' 'Cyan'
$od = @()
$nomesOD = @{ '400-normal' = 'Regular'; '400-italic' = 'Italic'; '700-normal' = 'Bold'; '700-italic' = 'Bold-Italic' }
foreach ($f in $faces) {
    $arq = 'opendyslexic-{0}{1}.woff2' -f $f.peso, $f.suf
    $n = $nomesOD[('{0}-{1}' -f $f.peso, $f.estilo)]
    $cands = @(
        ('https://raw.githubusercontent.com/antijingoist/opendyslexic/master/compiled/OpenDyslexic-{0}.woff2' -f $n),
        ('https://raw.githubusercontent.com/antijingoist/opendyslexic/main/compiled/OpenDyslexic-{0}.woff2' -f $n),
        ('https://cdn.jsdelivr.net/gh/antijingoist/opendyslexic@master/compiled/OpenDyslexic-{0}.woff2' -f $n),
        ('https://cdn.jsdelivr.net/fontsource/fonts/opendyslexic@latest/latin-{0}-{1}.woff2' -f $f.peso, $f.estilo)
    )
    $ok = $false
    foreach ($u in $cands) {
        $b = Baixar $u
        if (EhWoff2 $b) {
            Gravar $arq $b
            $od += [ordered]@{ peso = $f.peso; estilo = $f.estilo; arquivo = $arq; sha256 = (Sha256 $b); origem = $u; subconjunto = $(if ($u -match 'fontsource') { 'latin' } else { 'completo' }) }
            Diga ('  ok: {0} ({1} KB)' -f $arq, [int]($b.Length / 1024)) 'Green'; $ok = $true; break
        }
    }
    if (-not $ok) { Diga ('  NAO baixado: {0}' -f $arq) 'Yellow' }
}
$familias += [ordered]@{ id = 'opendyslexic'; nome = 'OpenDyslexic'; licenca = 'OFL-1.1'; arquivos = $od }
foreach ($u in @('https://raw.githubusercontent.com/antijingoist/opendyslexic/master/OFL.txt',
                 'https://raw.githubusercontent.com/antijingoist/opendyslexic/master/LICENSE.txt',
                 'https://cdn.jsdelivr.net/gh/antijingoist/opendyslexic@master/OFL.txt')) {
    $b = Baixar $u
    if ($b -and [System.Text.Encoding]::UTF8.GetString($b) -match 'SIL OPEN FONT LICENSE') { Gravar 'OFL-OpenDyslexic.txt' $b; Diga '  ok: licença OFL oficial (OpenDyslexic)' 'Green'; break }
}

# ---------------- Manifesto ----------------
$man = [ordered]@{ versao = 1; atualizado = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); familias = $familias;
                   licencas = @('OFL-Atkinson-Hyperlegible-Next.txt', 'OFL-OpenDyslexic.txt') }
$json = $man | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText((Join-Path $pasta 'manifesto.json'), $json, (New-Object System.Text.UTF8Encoding $false))
$total = $atk.Count + $od.Count
Diga ('Manifesto gravado: {0} de 8 arquivos de fonte.' -f $total) $(if ($total -eq 8) { 'Green' } else { 'Yellow' })
if ($total -lt 8) { Diga 'As faces que faltaram usam Verdana (ou a face regular). Rode este script de novo quando a rede permitir.' 'Yellow' }
exit 0
