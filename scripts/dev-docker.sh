#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting full stack using Docker Compose..."
docker compose up --build -d

echo "Services status:"
docker compose ps
