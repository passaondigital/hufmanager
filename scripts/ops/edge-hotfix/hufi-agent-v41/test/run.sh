#!/usr/bin/env bash
# Startet Wegwerf-Postgres + PostgREST (nur localhost), spielt Replik + Fixtures ein
# und führt bola_test.ts gegen die angegebene index.ts aus. Keine Verbindung zu PROD.
# Aufruf: scripts/ops/edge-hotfix/hufi-agent-v41/test/run.sh <pfad/zu/index.ts>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
TARGET="$(realpath "$1")"
NET=hm-bola-net; DB=hm-bola-db; API=hm-bola-api
SECRET="throwaway-test-secret-$(date +%s)-0123456789abcdef"
cleanup() { docker rm -f "$API" "$DB" >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; }
cleanup; trap cleanup EXIT
docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" -e POSTGRES_PASSWORD=throwaway -v "$ROOT":/w:ro postgres:17 >/dev/null
for _ in $(seq 1 30); do docker exec "$DB" pg_isready -U postgres -q && break; sleep 1; done
sleep 1
docker exec "$DB" psql -U postgres -q -f /w/scripts/appointment-guard-replica-schema.sql
docker exec "$DB" psql -U postgres -q -f /w/scripts/ops/edge-hotfix/hufi-agent-v41/test/setup.sql
docker run -d --name "$API" --network "$NET" -p 127.0.0.1:3399:3000 \
  -e PGRST_DB_URI="postgres://authenticator:throwaway@$DB:5432/postgres" -e PGRST_DB_SCHEMAS=public \
  -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$SECRET" public.ecr.aws/supabase/postgrest:v16.1 >/dev/null
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:3399/ && break; sleep 1; done
[ -n "${KEEP:-}" ] && trap - EXIT
~/.deno/bin/deno run -A "$ROOT/scripts/ops/edge-hotfix/hufi-agent-v41/test/bola_test.ts" "$TARGET" http://127.0.0.1:3399 "$SECRET"
