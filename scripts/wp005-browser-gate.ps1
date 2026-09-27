$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Push-Location -LiteralPath $repository
try {
  node scripts/wp005-disposable-db-check.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Disposable database destination check failed.' }

  $env:PLAYWRIGHT_PORT = '3128'
  npx.cmd playwright test 'action-assurance-release-gate.spec.ts' 'wp004-action-lifecycle.spec.ts' --project=chromium --reporter=line --trace=retain-on-failure --output='../../outputs/WP-005_GATE_C/chromium'
  if ($LASTEXITCODE -ne 0) { throw 'WP-005 Chromium browser gate failed.' }

  npx.cmd playwright test 'action-assurance-release-gate.spec.ts' 'action-assurance-mobile.spec.ts' 'wp004-action-lifecycle.spec.ts' --project=mobile --reporter=line --trace=retain-on-failure --output='../../outputs/WP-005_GATE_C/mobile'
  if ($LASTEXITCODE -ne 0) { throw 'WP-005 mobile browser gate failed.' }

  $screenshots = Get-ChildItem -LiteralPath '../../outputs/WP-005_GATE_C' -Recurse -File -Filter 'wp005-*.png'
  $expected = @('wp005-ready-desktop.png', 'wp005-closed-desktop.png', 'wp005-needs-attention-mobile.png', 'wp005-ready-mobile.png')
  foreach ($name in $expected) {
    if (-not ($screenshots | Where-Object { $_.Name -eq $name -and $_.Length -gt 0 })) { throw "Missing or empty WP-005 screenshot: $name" }
  }
  $screenshots | Select-Object FullName, Length
  Write-Output 'WP-005_BROWSER_GATE PASS 9/9; four screenshots present.'
}
finally {
  Pop-Location
}
