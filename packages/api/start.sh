#!/bin/bash

echo "Waiting for PostgreSQL..."
while ! pg_isready -h db -p 5432 -U postgres; do
  sleep 1
done
echo "PostgreSQL is ready!"

echo "Running migrations..."
if [ -f "/app/alembic.ini" ]; then
  alembic upgrade head || echo "Migration failed but continuing..."
fi

echo "Starting API server..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 "$@" 