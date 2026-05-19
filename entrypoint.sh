#!/bin/sh
echo "Running database migrations..."
if node dist/src/server/db/run-migrations.js; then
    echo "Migrations completed successfully."
else
    echo "⚠️ Migrations failed or skipped. Continuing to start server..."
fi
echo "Starting server..."
exec node dist/src/server/index.js
