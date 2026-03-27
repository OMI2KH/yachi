<#
Runs verification steps across backend, frontend, and mobile: installs, lint, tests, migrations, and seeding.
Usage: Open PowerShell as an Administrator and run: .\scripts\run-verification.ps1
#>

param()

function Run-Step($label, [scriptblock]$action) {
    Write-Host "\n==> $label" -ForegroundColor Cyan
    try {
        & $action
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Step '$label' exited with code $LASTEXITCODE" -ForegroundColor Yellow
        } else {
            Write-Host "Step '$label' completed" -ForegroundColor Green
        }
    } catch {
        Write-Host "Step '$label' failed: $_" -ForegroundColor Red
    }
}

$root = (Resolve-Path "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)")\.. | Resolve-Path
Set-Location $root

Write-Host "Running verification from: $root" -ForegroundColor Green

# Backend
if (Test-Path "$root\backend\package.json") {
    Set-Location "$root\backend"

    if (-not (Test-Path .env) -and (Test-Path .env.example)) { Copy-Item .env.example .env }

    Run-Step "Backend: npm install (legacy-peer-deps)" { npm install --legacy-peer-deps }
    Run-Step "Backend: create package-lock only" { npm install --package-lock-only }
    Run-Step "Backend: lint" { npm run lint --if-present }
    Run-Step "Backend: tests" { $env:NODE_ENV='test'; npm test --silent }
    Run-Step "Backend: migrations" { npx sequelize db:migrate }
    Run-Step "Backend: seeders" { npx sequelize db:seed:all }
}

# Frontend
if (Test-Path "$root\frontend\package.json") {
    Set-Location "$root\frontend"
    Run-Step "Frontend: npm install (legacy-peer-deps)" { npm install --legacy-peer-deps }
    Run-Step "Frontend: create package-lock only" { npm install --package-lock-only }
    Run-Step "Frontend: lint" { npm run lint --if-present }
    Run-Step "Frontend: build" { npm run build --if-present }
}

# Mobile
if (Test-Path "$root\mobile\package.json") {
    Set-Location "$root\mobile"
    Run-Step "Mobile: npm install (legacy-peer-deps)" { npm install --legacy-peer-deps }
    Run-Step "Mobile: create package-lock only" { npm install --package-lock-only }
    Run-Step "Mobile: lint" { npm run lint --if-present }
    Run-Step "Mobile: start (dev)" { echo "Skipping long-running mobile start in verification" }
}

Write-Host "\nVerification steps completed. Review output above for any failures." -ForegroundColor Cyan
Write-Host "If any 'npm install' failed, run scripts\collect-install-log.ps1 and paste the log here for analysis." -ForegroundColor Yellow
