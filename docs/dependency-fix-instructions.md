## How to collect and share npm install logs for dependency fixes

If `npm install` fails on your machine or in CI with errors like "No matching version found" or peer dependency conflicts, please follow these steps so I can produce a precise patch:

1. Run the log collector script from the repo root (PowerShell):

```powershell
.\scripts\collect-install-log.ps1
```

2. This will create log files under `./logs/` like `npm-install-backend-20251222-140102.log`.

3. Open the backend log (or frontend/mobile) and copy the *first* error block (search for "ERR!" or "No matching version" or "npm ERR!"). Paste that block here in the chat.

4. I will analyze the failure and propose one of the following:
   - A small `package.json` change to pin/replace the problematic dependency
   - A patch to remove or replace the dependency with a lighter alternative
   - A suggestion to upgrade/downgrade Node/NPM if the package resolution is the issue

5. Once I send the patch, you can apply it locally via `git apply` or I can add it directly to this repo if you grant permission.

Notes:
- Avoid pasting secrets from the logs. If logs contain private tokens, remove them before sharing.
- If `npm install` succeeds on one machine but fails on CI, prefer committing the created `package-lock.json` from the machine where install succeeded.
