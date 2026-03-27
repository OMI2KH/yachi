Param()

Write-Host "Starting Webhook Retry Job (PowerShell)"
Set-Location -Path (Resolve-Path "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)")
Set-Location -Path "..\"

node -e "(async ()=>{ const { WebhookRetryJob } = require('./backend/services/webhookRetryJob'); const job = new WebhookRetryJob({ intervalMs: 60000 }); job.start(); process.on('SIGINT', ()=>{ job.stop(); process.exit(0); }); })()"
