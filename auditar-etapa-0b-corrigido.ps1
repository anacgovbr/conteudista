param(
  [switch]$Headed,
  [switch]$Reinstalar,
  [int]$Porta = 4173
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Etapa($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Falhar($texto) { throw $texto }

$Raiz = (git rev-parse --show-toplevel 2>$null).Trim()
if (-not $Raiz) { Falhar "Execute este script dentro do repositorio Conteudista." }
Set-Location $Raiz

$Commit = (git rev-parse HEAD).Trim()
$CommitEsperado = "04259ceef51725d2d0a3640c477461b4f365d67b"
$Web = Join-Path $Raiz "web"
$Audit = Join-Path $Raiz ".auditoria-etapa-0b"
$Resultado = Join-Path $Raiz "ETAPA-0B-RESULTADO.md"
$Json = Join-Path $Raiz "ETAPA-0B-RESULTADO.json"
$ServidorLog = Join-Path $Audit "servidor.log"

if (-not (Test-Path $Web)) { Falhar "Pasta web/ nao encontrada em $Raiz" }

Etapa "Conferindo ambiente"
$Node = (& node --version).Trim()
$Npm = (& npm --version).Trim()
Write-Host "Repositorio: $Raiz"
Write-Host "Commit:      $Commit"
Write-Host "Node.js:     $Node"
Write-Host "npm:         $Npm"
if ($Commit -ne $CommitEsperado) {
  Write-Warning "O commit atual difere do commit da Etapa 0 estatica: $CommitEsperado"
}

Etapa "Preparando auditoria isolada"
New-Item -ItemType Directory -Force -Path $Audit | Out-Null
$PackageJson = @'
{
  "name": "conteudista-etapa-0b",
  "private": true,
  "type": "commonjs"
}
'@
Set-Content -LiteralPath (Join-Path $Audit "package.json") -Value $PackageJson -Encoding UTF8

if ($Reinstalar -and (Test-Path (Join-Path $Audit "node_modules"))) {
  Remove-Item -Recurse -Force (Join-Path $Audit "node_modules")
}

if (-not (Test-Path (Join-Path $Audit "node_modules\playwright")) -or
    -not (Test-Path (Join-Path $Audit "node_modules\@axe-core\playwright"))) {
  Push-Location $Audit
  try {
    npm install --no-fund --no-audit --save-exact playwright @axe-core/playwright
    if ($LASTEXITCODE -ne 0) { Falhar "Falha ao instalar Playwright/axe-core." }
  } finally { Pop-Location }
}

Etapa "Instalando Chromium do Playwright"
Push-Location $Audit
try {
  npx playwright install chromium
  if ($LASTEXITCODE -ne 0) { Falhar "Falha ao instalar o Chromium do Playwright." }
} finally { Pop-Location }

$ServerJs = @'
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.yaml':'text/yaml; charset=utf-8','.yml':'text/yaml; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.wasm':'application/wasm'};
const server = http.createServer((req,res)=>{
  let u;
  try { u = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  if (u === '/') u = '/index.html';
  const file = path.resolve(root, '.' + u);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file,(err,st)=>{
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.setHeader('Content-Type', mime[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control','no-store');
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(port,'127.0.0.1',()=>console.log(`READY http://127.0.0.1:${port}`));
'@
Set-Content -LiteralPath (Join-Path $Audit "servidor.cjs") -Value $ServerJs -Encoding UTF8

$RunnerJs = @'
const fs = require('fs');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/,''));
const esc = s => String(s ?? '').replace(/\|/g,'/').replace(/\r?\n/g,' ').trim();
const short = (s,n=220) => esc(s).slice(0,n);
const results = { meta: cfg, runs: [], manual: [] };

async function snapshot(page, label, profile) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  const custom = await page.evaluate(() => {
    const q=(s,r=document)=>[...r.querySelectorAll(s)];
    const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity!==0&&r.width>0&&r.height>0};
    const label=e=>{if(!e)return'';let v=e.getAttribute('aria-label')||e.getAttribute('title')||'';const x=e.getAttribute('aria-labelledby');if(!v&&x)v=x.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ');if(!v&&e.labels?.length)v=[...e.labels].map(x=>x.textContent).join(' ');if(!v)v=e.innerText||e.textContent||'';return v.replace(/\s+/g,' ').trim().slice(0,120)};
    const interactive=q('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=menuitem],[role=tab],[role=switch],[tabindex]:not([tabindex="-1"])').filter(vis);
    const targets=interactive.map(e=>{const r=e.getBoundingClientRect();return{el:(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')),name:label(e),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}});
    const dialogs=q('dialog[open],[role=dialog],[role=alertdialog]').filter(vis).map(e=>({name:label(e),modal:e.matches(':modal')||e.getAttribute('aria-modal')==='true',focusInside:e.contains(document.activeElement)}));
    const imgs=q('img').filter(vis).map(e=>({src:(e.currentSrc||e.src||'').slice(0,100),hasAlt:e.hasAttribute('alt'),alt:e.getAttribute('alt')}));
    const pw=q('input[type=password]').filter(vis).map(e=>({id:e.id,autocomplete:e.autocomplete||'',describedby:e.getAttribute('aria-describedby')||''}));
    return {
      title:document.title,lang:document.documentElement.lang,
      horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
      landmarks:{main:q('main,[role=main]').length,nav:q('nav,[role=navigation]').length,h1:q('h1,[role=heading][aria-level="1"]').length},
      live:q('[aria-live],[role=status],[role=alert],[role=progressbar],progress').length,
      mark:q('mark').filter(vis).length, dialogs, imgs, pw,
      targetBelow24:targets.filter(x=>Math.min(x.w,x.h)<24),
      targetBelow44:targets.filter(x=>Math.min(x.w,x.h)>=24&&Math.min(x.w,x.h)<44),
      focus:{tag:document.activeElement?.tagName||'',id:document.activeElement?.id||'',name:label(document.activeElement)},
      reduced:matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  });
  results.runs.push({ label, profile, url:page.url(), axe:{ violations:axe.violations, passes:axe.passes.length, incomplete:axe.incomplete }, custom });
}

async function clickIf(page, selector) {
  const loc=page.locator(selector).first();
  if (await loc.count() && await loc.isVisible().catch(()=>false)) { await loc.click(); await page.waitForTimeout(350); return true; }
  return false;
}

async function runProfile(browser, profile) {
  const context = await browser.newContext({
    viewport:profile.viewport,
    deviceScaleFactor: profile.mobile ? 2 : 1,
    isMobile:!!profile.mobile,
    hasTouch:!!profile.mobile,
    reducedMotion:profile.reduced?'reduce':'no-preference',
    locale:'pt-BR'
  });
  const page=await context.newPage();
  page.on('pageerror',e=>results.runs.push({label:`erro JS - ${profile.name}`,profile:profile.name,error:String(e)}));
  await page.goto(cfg.url,{waitUntil:'domcontentloaded'});
  await snapshot(page,'Tela inicial',profile.name);

  if(await clickIf(page,'#btnTour')) await snapshot(page,'Tutorial aberto',profile.name);
  await page.keyboard.press('Escape').catch(()=>{});

  if(await clickIf(page,'#btnHelp')) {
    const search=page.locator('#hlpF');
    if(await search.count()){await search.fill('imagem');await page.waitForTimeout(350);}
    await snapshot(page,'Ajuda com busca',profile.name);
  }
  await page.keyboard.press('Escape').catch(()=>{});

  if(await clickIf(page,'#btnSalvar')) await snapshot(page,'Menu Salvar aberto',profile.name);
  await page.keyboard.press('Escape').catch(()=>{});

  if(await clickIf(page,'#btnImportar')) await snapshot(page,'Importar aberto',profile.name);
  await page.keyboard.press('Escape').catch(()=>{});

  const shareSelectors=['#btnCompartilharAcao','#btnCompartilhar','[aria-label="Compartilhar link"]'];
  for(const s of shareSelectors){if(await clickIf(page,s)){await snapshot(page,'Compartilhar link aberto',profile.name);break;}}
  await page.keyboard.press('Escape').catch(()=>{});

  const version=page.locator('button[title*="Versões"],button[aria-label*="Versões"],.hbtn').first();
  if(await version.count()&&await version.isVisible().catch(()=>false)){await version.click();await page.waitForTimeout(350);await snapshot(page,'Versões aberto',profile.name);}
  await page.keyboard.press('Escape').catch(()=>{});

  const a11y=page.locator('.la-btn').first();
  if(await a11y.count()&&await a11y.isVisible().catch(()=>false)){await a11y.click();await page.waitForTimeout(500);await snapshot(page,'Painel Acessibilidade aberto',profile.name);}

  await context.close();
}

function matrix() {
  const ids=Array.from({length:30},(_,i)=>`A-${String(i+1).padStart(2,'0')}`);
  const m=Object.fromEntries(ids.map(x=>[x,{status:'MANUAL',evidence:[]}])) ;
  const all=results.runs.filter(r=>r.custom);
  const violations=results.runs.flatMap(r=>(r.axe?.violations||[]).map(v=>({...v,run:r.label,profile:r.profile})));
  const rule=(id)=>violations.filter(v=>v.id===id);
  const fail=(id,msg)=>{m[id].status='FAIL';m[id].evidence.push(msg)};
  const pass=(id,msg)=>{if(m[id].status!=='FAIL')m[id].status='PASS';m[id].evidence.push(msg)};
  if(rule('document-title').length)fail('A-15','axe: document-title');else pass('A-15','Título presente nas rodadas.');
  if(rule('html-has-lang').length||rule('html-lang-valid').length)fail('A-16','axe: idioma ausente/inválido');else pass('A-16','lang válido nas rodadas.');
  if(rule('landmark-one-main').length||rule('page-has-heading-one').length||rule('bypass').length)fail('A-14','axe: estrutura/atalho de bloco');else pass('A-14','main, h1 e bypass sem falha axe.');
  if(rule('label-content-name-mismatch').length)fail('A-12','axe: label-content-name-mismatch');else pass('A-12','Sem falha axe Label in Name.');
  if(rule('button-name').length||rule('link-name').length||rule('aria-command-name').length||rule('label').length)fail('A-05','axe: controle sem nome/rótulo');else pass('A-05','Sem controles sem nome detectados pelo axe.');
  if(rule('color-contrast').length)fail('A-20',`axe: ${rule('color-contrast').length} ocorrência(s)`);else pass('A-20','Sem falha automatizável de contraste axe.');
  if(all.some(r=>r.custom.horizontalOverflow>1))fail('A-21','Rolagem horizontal detectada em ao menos uma rodada.');else pass('A-21','Sem overflow horizontal nos viewports testados.');
  const b24=all.reduce((n,r)=>n+r.custom.targetBelow24.length,0); if(b24)fail('A-17',`${b24} ocorrência(s) de alvo abaixo de 24px entre as rodadas.`);else pass('A-17','Nenhum alvo abaixo de 24px.');
  if(all.some(r=>r.custom.imgs.some(i=>!i.hasAlt)))fail('A-23','Imagem visível sem atributo alt.');else pass('A-23','Imagens visíveis têm atributo alt.');
  if(all.some(r=>r.custom.dialogs.some(d=>!d.modal||!d.focusInside)))fail('A-01','Janela aberta sem modalidade ou com foco fora.');
  if(all.some(r=>r.custom.pw.some(p=>!p.autocomplete||p.autocomplete==='off')))fail('A-22','Senha visível sem autocomplete adequado.');
  if(all.some(r=>r.custom.live>0))pass('A-09','Regiões de status/progresso presentes; cobertura completa permanece manual.');
  return m;
}

(async()=>{
  const browser=await chromium.launch({headless:!cfg.headed});
  try {
    const profiles=[
      {name:'desktop-1440',viewport:{width:1440,height:900}},
      {name:'mobile-384',viewport:{width:384,height:693},mobile:true},
      {name:'mobile-320',viewport:{width:320,height:700},mobile:true},
      {name:'mobile-384-reduce',viewport:{width:384,height:693},mobile:true,reduced:true}
    ];
    for(const p of profiles) await runProfile(browser,p);
  } finally { await browser.close(); }
  results.matrix=matrix();
  fs.writeFileSync(cfg.json,JSON.stringify(results,null,2));

  const out=[];
  out.push('# ETAPA 0B — Auditoria dinâmica do Conteudista','');
  out.push(`- Commit: \`${cfg.commit}\``);
  out.push(`- Commit esperado da Etapa 0: \`${cfg.expected}\``);
  out.push(`- Data: ${new Date().toISOString()}`);
  out.push(`- Node.js: ${cfg.node}`);
  out.push(`- npm: ${cfg.npm}`);
  out.push(`- URL local: ${cfg.url}`,'');
  out.push('## Matriz A-01 a A-30','');
  out.push('| ID | Resultado | Evidência |','|---|---|---|');
  for(const [id,v] of Object.entries(results.matrix))out.push(`| ${id} | ${v.status} | ${v.evidence.map(short).join('<br>')||'Requer validação manual especificada na Etapa 0.'} |`);
  out.push('','## Violações axe-core','');
  const vv=results.runs.flatMap(r=>(r.axe?.violations||[]).map(v=>({r,v})));
  if(!vv.length)out.push('Nenhuma violação automática nas rodadas executadas. Isso não equivale a conformidade WCAG.');
  for(const {r,v} of vv){out.push(`### ${v.id} — ${v.impact||'impacto não informado'}`,`- Rodada: ${r.label} / ${r.profile}`,`- WCAG/tags: ${(v.tags||[]).join(', ')}`,`- Ajuda: ${v.help}`,`- Nós: ${v.nodes.length}`);for(const n of v.nodes.slice(0,10))out.push(`  - \`${short(n.target.join(' '),180)}\`: ${short(n.failureSummary,300)}`);out.push('');}
  out.push('## Medições por rodada','');
  out.push('| Rodada | Perfil | axe | Incompletos | <24px | 24–43px | Overflow | Diálogos | Live |','|---|---|---:|---:|---:|---:|---:|---:|---:|');
  for(const r of results.runs.filter(x=>x.custom))out.push(`| ${r.label} | ${r.profile} | ${r.axe.violations.length} | ${r.axe.incomplete.length} | ${r.custom.targetBelow24.length} | ${r.custom.targetBelow44.length} | ${r.custom.horizontalOverflow}px | ${r.custom.dialogs.length} | ${r.custom.live} |`);
  out.push('','## Testes humanos e de tecnologia assistiva ainda obrigatórios','');
  out.push('- [ ] A-01: ciclo de Tab/Shift+Tab, Escape, retorno do foco e fundo inerte em cada janela.','- [ ] A-03: casos 13.5 e 13.7, Alt+Shift+N/I e equivalência com TalkBack/NVDA.','- [ ] A-06/A-13: conflitos dos atalhos com TalkBack, controle por voz e layout de teclado.','- [ ] A-07: avanço automático desligado por padrão, pausa, intervalo >=10x e anúncio dos slides.','- [ ] A-08: navegação sem gesto de arrastar.','- [ ] A-10: diff compreensível sem percepção de cor.','- [ ] A-18: inspeção visual com movimento reduzido.','- [ ] A-19: foco não encoberto por barras fixas.','- [ ] A-21: zoom 200%/400% e espaçamento de texto.','- [ ] A-22: colar senha, gerenciador, mostrar senha e erros associados.','- [ ] A-25: player e anúncio de progresso/download.','- [ ] A-28: tooltip por foco, Escape, hover persistente.','- [ ] A-29: retrato e paisagem sem perda de função.','');
  out.push('## Limitação','', 'Resultados automáticos PASS significam apenas que a falha não foi reproduzida nas rodadas executadas. Não representam certificação WCAG 2.2 AA.');
  fs.writeFileSync(cfg.output,out.join('\n'));
})().catch(e=>{console.error(e);process.exit(1)});
'@
Set-Content -LiteralPath (Join-Path $Audit "auditar.cjs") -Value $RunnerJs -Encoding UTF8

Etapa "Iniciando servidor local"
$Servidor = Start-Process -FilePath "node" `
  -ArgumentList @((Join-Path $Audit "servidor.cjs"), $Web, $Porta) `
  -WorkingDirectory $Raiz -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $ServidorLog -RedirectStandardError (Join-Path $Audit "servidor-erro.log")

try {
  $Url = "http://127.0.0.1:$Porta/"
  $Pronto = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $Pronto = $true; break }
    } catch {}
  }
  if (-not $Pronto) { Falhar "Servidor local nao iniciou. Consulte $ServidorLog" }

  $ConfigArquivo = Join-Path $Audit "config.json"
  $Config = @{
    url = $Url
    commit = $Commit
    expected = $CommitEsperado
    node = $Node
    npm = $Npm
    headed = [bool]$Headed
    output = $Resultado
    json = $Json
  } | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($ConfigArquivo, $Config, [System.Text.UTF8Encoding]::new($false))

  Etapa "Executando Playwright + axe-core"
  Push-Location $Audit
  try {
    node (Join-Path $Audit "auditar.cjs") $ConfigArquivo
    if ($LASTEXITCODE -ne 0) { Falhar "A auditoria terminou com erro." }
  } finally { Pop-Location }
}
finally {
  if ($Servidor -and -not $Servidor.HasExited) { Stop-Process -Id $Servidor.Id -Force -ErrorAction SilentlyContinue }
}

Etapa "Concluido"
Write-Host "Relatorio: $Resultado" -ForegroundColor Green
Write-Host "Dados:     $Json"
Write-Host "`nEnvie ETAPA-0B-RESULTADO.md para o Copilot."
