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

echo "Stopping production containers..."
"${COMPOSE_CMD[@]}" -f docker-compose.prod.yml down

echo "Production environment stopped."
