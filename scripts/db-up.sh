#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH." >&2
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -q '^housebook-postgres$'; then
  docker start housebook-postgres >/dev/null
  echo "Postgres container started: housebook-postgres"
  exit 0
fi

docker run --name housebook-postgres \
  -e POSTGRES_DB=housebook \
  -e POSTGRES_USER=housebook \
  -e POSTGRES_PASSWORD=housebook \
  -p 5432:5432 \
  -v housebook_pgdata:/var/lib/postgresql/data \
  -d postgres:16 >/dev/null

echo "Postgres container created: housebook-postgres"
