<#
Runs `npm install` in backend, frontend, and mobile and saves logs to `logs/` for analysis.
Usage: .\scripts\collect-install-log.ps1
#>
param()

$root = (Resolve-Path "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)")\.. | Resolve-Path
Set-Location $root

if (-not (Test-Path "$root\logs")) { New-Item -ItemType Directory -Path "$root\logs" | Out-Null }

foreach ($pkg in @('backend','frontend','mobile')) {
    if (Test-Path "$root\$pkg\package.json") {
        Write-Host "Running npm install for $pkg..." -ForegroundColor Cyan
        Set-Location "$root\$pkg"
        $logFile = "$root\logs\npm-install-$pkg-$(Get-Date -Format yyyyMMdd-HHmmss).log"
        npm install --legacy-peer-deps *> $logFile 2>&1
        $exit = $LASTEXITCODE
        Write-Host "Finished $pkg install (exit $exit). Log: $logFile" -ForegroundColor Green
    }
}

Write-Host "Collect logs in $root\logs and paste them here for diagnosis." -ForegroundColor Yellow
