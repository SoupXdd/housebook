#!/bin/bash

cd "$(dirname "$0")/../infra" || exit 1

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose is not installed. Install the Docker Compose plugin or docker-compose first."
  exit 1
fi

if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update the .env file with your production values."
fi

set -a
. ./.env
set +a

echo "Building images..."
"${COMPOSE_CMD[@]}" -f docker-compose.prod.yml build

echo "Waiting for database to be ready..."
"${COMPOSE_CMD[@]}" -f docker-compose.prod.yml up -d postgres
sleep 5

echo "Applying schema and seeding demo data..."
"${COMPOSE_CMD[@]}" -f docker-compose.prod.yml run --rm backend sh -lc "npx prisma db push --config prisma.config.ts && npm run prisma:seed"

echo "Starting backend and frontend..."
"${COMPOSE_CMD[@]}" -f docker-compose.prod.yml up -d backend frontend

echo "Production environment is ready!"
echo "Frontend: http://localhost:${FRONTEND_PORT:-80}"
echo "Backend: http://localhost:${BACKEND_PORT:-3000}"
echo "API Docs: http://localhost:${FRONTEND_PORT:-80}/api-docs"
