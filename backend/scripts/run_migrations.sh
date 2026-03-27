#!/usr/bin/env sh
set -e

echo "Running database migrations..."
if [ -f node_modules/.bin/sequelize-cli ]; then
  ./node_modules/.bin/sequelize-cli db:migrate --env production || true
else
  echo "sequelize-cli not found; skipping migrations (ensure it's installed in production image or run migrations as a release task)."
fi

echo "Migrations step complete."
