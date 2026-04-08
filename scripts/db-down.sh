#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH." >&2
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -q '^housebook-postgres$'; then
  docker stop housebook-postgres >/dev/null
  echo "Postgres container stopped: housebook-postgres"
  exit 0
fi

echo "Postgres container is not running."
