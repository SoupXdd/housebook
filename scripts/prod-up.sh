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

echo "Applying schema..."
"${COMPOSE_CMD[@]}" -f docker-compose.prod.yml run --rm backend sh -lc "npx prisma db push --config prisma.config.ts"

if [ "${RUN_DEMO_SEED:-false}" = "true" ]; then
  echo "Seeding demo data..."
  "${COMPOSE_CMD[@]}" -f docker-compose.prod.yml run --rm backend sh -lc "npm run prisma:seed"
else
  echo "Skipping demo seed data. Set RUN_DEMO_SEED=true in infra/.env to enable it."
fi

echo "Starting backend..."
"${COMPOSE_CMD[@]}" -f docker-compose.prod.yml up -d backend

echo "Production environment is ready!"
echo "Backend: http://localhost:${BACKEND_PORT:-3000}"
if [ "${ENABLE_SWAGGER:-false}" = "true" ]; then
  echo "API Docs: http://localhost:${BACKEND_PORT:-3000}/api-docs"
else
  echo "API Docs are disabled. Set ENABLE_SWAGGER=true in infra/.env to enable them."
fi
