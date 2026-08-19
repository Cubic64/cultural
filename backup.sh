#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL first}"
mkdir -p backups
TS=$(date -u +"%Y-%m-%d_%H-%M-%S")
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges > "backups/cultura_${TS}.dump"
echo "Backup created: backups/cultura_${TS}.dump"
