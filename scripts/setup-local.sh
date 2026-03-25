#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/5] Installing npm dependencies"
npm install

echo "[2/5] Preparing API environment"
if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
  echo "Created apps/api/.env from template"
fi

echo "[3/5] Checking PostgreSQL availability"
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "PostgreSQL is not reachable on localhost:5432"
  echo "Start PostgreSQL service and rerun this script."
  exit 1
fi

echo "[4/5] Generating Prisma client and migrating DB"
npm run prisma:generate -w apps/api
npm run prisma:migrate -w apps/api

echo "[5/5] Seeding demo data"
npm run prisma:seed -w apps/api

echo "Local setup complete."
