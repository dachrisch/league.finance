#!/bin/sh
set -e
echo "Running database migrations..."
node dist/src/server/db/run-migrations.js
echo "Migrations completed. Starting server..."
node dist/src/server/index.js
