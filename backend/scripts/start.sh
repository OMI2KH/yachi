#!/usr/bin/env sh
set -e

echo "Starting Yachi backend container..."

# Run migrations (best-effort)
./scripts/run_migrations.sh || echo "Migrations failed or skipped"

echo "Starting application"
exec npm start
