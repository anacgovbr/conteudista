# Atualizador v3 - Conteudista 1.34. Executa diretamente de Downloads.
param([string]$Repositorio='', [string]$Pacote='')
$ErrorActionPreference='Stop'
$Repo='anacgovbr/conteudista'
$Workflow='publicar-pagina.yml'
$Destino=if($Repositorio){$Repositorio}else{Join-Path $env:USERPROFILE 'Documents\GitHub\conteudista'}
$tmp=$null
function Passo($t){Write-Host "`n==> $t" -ForegroundColor Cyan}
function Ok($t){Write-Host "    [ok] $t" -ForegroundColor Green}
function Exec {
 param([string]$Exe,[string[]]$A)
 $ErrorActionPreference='Continue'
 $out=(& $Exe @A 2>&1 | ForEach-Object {"$_"}) -join "`n"
 $code=$LASTEXITCODE
 if($code -ne 0){throw "Falha ($code): $Exe $($A -join ' ')`n$out"}
 return [string]$out
}
# IDs sao strings escalares extraidas pela CLI, sem conversao de arrays JSON em Int64.
function Execucoes {
 $texto=Exec gh @('run','list','--repo',$Repo,'--workflow',$Workflow,'--branch','main','--event','workflow_dispatch','--limit','100','--json','databaseId,headSha','--jq','.[] | [.databaseId,.headSha] | @tsv')
 foreach($linha in ($texto -split '\r?\n')){
  $c=$linha.Trim() -split '\s+'
  if($c.Count -eq 2 -and $c[0] -match '^\d+$' -and $c[1] -match '^[a-fA-F0-9]{40}$'){
   [pscustomobject]@{Id=[string]$c[0];Sha=[string]$c[1]}
  }
 }
}
try {
 Passo '1/7 Verificando ferramentas e login'
 foreach($exe in @('git','gh')){if(!(Get-Command $exe -ErrorAction SilentlyContinue)){throw "$exe nao encontrado."}}
 & gh auth status --hostname github.com *> $null
 if($LASTEXITCODE -ne 0){
  & gh auth login --hostname github.com --git-protocol https --web --scopes 'repo,workflow'
  if($LASTEXITCODE -ne 0){throw 'Login nao concluido.'}
 }
 Exec gh @('auth','setup-git') | Out-Null
 Exec gh @('repo','view',$Repo) | Out-Null
 Ok 'Acesso confirmado'
 Passo '2/7 Localizando e validando o pacote'
 if(!$Pacote){
  $pastas=@($PSScriptRoot,(Join-Path $env:USERPROFILE 'Downloads')) | Select-Object -Unique
  $zips=foreach($p in $pastas){Get-ChildItem -LiteralPath $p -Filter 'conteudista-web*.zip' -File -ErrorAction SilentlyContinue}
  $zip=$zips | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if(!$zip){throw 'Baixe conteudista-web-1.34.zip para Downloads.'}
  $Pacote=$zip.FullName
 }
 $tmp=Join-Path $env:TEMP ('conteudista_'+[guid]::NewGuid().ToString('N'))
 Expand-Archive -LiteralPath $Pacote -DestinationPath $tmp -Force
 $origem=$null
 if(Test-Path (Join-Path $tmp 'web\index.html')){$origem=$tmp}else{
  $pasta=Get-ChildItem -LiteralPath $tmp -Directory | Where-Object {Test-Path (Join-Path $_.FullName 'web\index.html')} | Select-Object -First 1
  if($pasta){$origem=$pasta.FullName}
 }
 if(!$origem){throw 'Pacote invalido: web/index.html ausente.'}
 if(!(Test-Path (Join-Path $origem ".github\workflows\$Workflow"))){throw 'Workflow ausente no pacote.'}
 if(Get-ChildItem -LiteralPath $origem -Directory -Force -Recurse | Where-Object {$_.Name -eq '.git'}){throw 'Pacote contem .git; interrompido.'}
 Ok "Pacote: $Pacote"
 Passo '3/7 Sincronizando sem descartar trabalho local'
 if(!(Test-Path (Join-Path $Destino '.git'))){
  $alt=Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'GitHub\conteudista'
  if(!$Repositorio -and (Test-Path (Join-Path $alt '.git'))){$Destino=$alt}
  elseif(!(Test-Path $Destino)){
   New-Item -ItemType Directory -Force -Path (Split-Path $Destino) | Out-Null
   Exec gh @('repo','clone',$Repo,$Destino) | Out-Null
  }else{throw "Pasta existe mas nao e repositorio: $Destino. Nada foi apagado."}
 }
 $remote=(Exec git @('-C',$Destino,'remote','get-url','origin')).Trim()
 if($remote -notmatch '(?i)github\.com[:/]anacgovbr/conteudista(?:\.git)?/?$'){throw "Origin inesperado: $remote"}
 $branch=(Exec git @('-C',$Destino,'branch','--show-current')).Trim()
 if($branch -ne 'main'){throw "Branch atual: $branch. Selecione main antes de continuar."}
 $dirty=Exec git @('-C',$Destino,'status','--porcelain')
 if($dirty.Trim()){throw "Ha alteracoes locais. Salve-as em commit antes de executar. Nada foi sobrescrito.`n$dirty"}
 Exec git @('-C',$Destino,'fetch','origin') | Out-Null
 & git -C $Destino merge-base --is-ancestor origin/main HEAD
 $ancestor=$LASTEXITCODE
 if($ancestor -eq 1){Exec git @('-C',$Destino,'merge','--ff-only','origin/main') | Out-Null}
 elseif($ancestor -ne 0){throw 'Falha ao validar ancestralidade de main.'}
 # Sobrepoe somente arquivos do pacote. Nao remove arquivos extras nem .git.
 foreach($f in Get-ChildItem -LiteralPath $origem -File -Force -Recurse){
  $rel=$f.FullName.Substring($origem.Length).TrimStart([char[]]'\/')
  $alvo=Join-Path $Destino $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $alvo) | Out-Null
  Copy-Item -LiteralPath $f.FullName -Destination $alvo -Force
 }
 Ok "Arquivos atualizados em $Destino; commits preservados"
 Passo '4/7 Registrando e enviando a versao'
 Exec git @('-C',$Destino,'add','-A') | Out-Null
 & git -C $Destino diff --cached --quiet
 $diff=$LASTEXITCODE
 if($diff -eq 1){
  Exec git @('-C',$Destino,'commit','-m','Conteudista 1.34: carregamento de audio e publicacao robusta') | Out-Null
  Ok 'Commit criado'
 }elseif($diff -ne 0){throw 'Falha ao conferir alteracoes.'}else{Ok 'Nenhuma alteracao nova; publicacao sera solicitada mesmo assim'}
 Exec git @('-C',$Destino,'push','-u','origin','main') | Out-Null
 $sha=(Exec git @('-C',$Destino,'rev-parse','HEAD')).Trim()
 Ok "Versao enviada: $sha"
 Passo '5/7 Conferindo workflow'
 Exec gh @('workflow','view',$Workflow,'--repo',$Repo) | Out-Null
 Ok 'Workflow encontrado; configuracao e visibilidade do Pages preservadas'
 Passo '6/7 Disparando a publicacao'
 $anteriores=@{}
 foreach($r in @(Execucoes)){$anteriores[$r.Id]=$true}
 Exec gh @('workflow','run',$Workflow,'--repo',$Repo,'--ref','main') | Out-Null
 Ok 'Workflow solicitado'
 Passo '7/7 Acompanhando o workflow e abrindo a pagina'
 $runId=$null
 foreach($i in 1..36){
  Start-Sleep -Seconds 5
  foreach($r in @(Execucoes)){
   if(!$anteriores.ContainsKey($r.Id) -and $r.Sha -eq $sha){$runId=[string]$r.Id;break}
  }
  if($runId){break}
 }
 if(!$runId){throw "Execucao nao localizada em 180 segundos. Consulte https://github.com/$Repo/actions . Nao recrie commits."}
 Ok "Acompanhando execucao $runId"
 & gh run watch $runId --repo $Repo --exit-status
 if($LASTEXITCODE -ne 0){Start-Process "https://github.com/$Repo/actions/runs/$runId";throw 'Workflow nao concluiu com sucesso; detalhes abertos no navegador.'}
 $url='https://anacgovbr.github.io/conteudista/'
 Ok "Publicacao concluida: $url"
 Write-Host 'Atualize a pagina com Ctrl+F5.'
 Start-Process $url
}catch{
 Write-Host "`n[ERRO] $($_.Exception.Message)" -ForegroundColor Red
 Write-Host 'O script nao descarta commits nem reescreve o historico para resolver erros.'
 exit 1
}finally{
 if($tmp -and (Test-Path $tmp)){Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue}
}
