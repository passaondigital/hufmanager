#!/usr/bin/env bash
# HufManager release verification — KEIN DEPLOYMENT.
# Läuft auf dem eigenen VPS/Checkout und prüft einen Release-Kandidaten,
# bevor Landing/App-Webroots angefasst werden.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${HUFMANAGER_ENV_FILE:-$REPO_DIR/.env}"

cd "$REPO_DIR"

echo "▶ HufManager Release-Check"
echo "  Commit: $(git rev-parse --short HEAD)"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ ABBRUCH: $ENV_FILE fehlt. Für einen release-nahen Build werden die echten VITE_-Werte benötigt." >&2
  exit 1
fi

SUPA_URL=$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
SUPA_KEY=$(grep -E '^VITE_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)

if [[ -z "$SUPA_URL" || -z "$SUPA_KEY" ]]; then
  echo "❌ ABBRUCH: VITE_SUPABASE_URL oder VITE_SUPABASE_PUBLISHABLE_KEY fehlt." >&2
  exit 1
fi

SUPA_HOST=$(echo "$SUPA_URL" | sed -E 's#^https?://##; s#/.*##')
SUPA_KEY_FINGERPRINT="${SUPA_KEY:0:40}"

echo "▶ Git-Diff prüfen"
git diff --check

echo "▶ Abhängigkeiten reproduzierbar installieren"
npm ci

echo "▶ Frontend bauen"
npm run build

echo "▶ Tour-Tests"
npx vitest run src/components/slim/slimTourUtils.test.ts

echo "▶ Produktionskonfiguration im Bundle prüfen"
if ! grep -rq "$SUPA_HOST" dist/assets/*.js 2>/dev/null; then
  echo "❌ ABBRUCH: Supabase-Host fehlt im Bundle. Dieser Build darf nicht deployed werden." >&2
  exit 1
fi

if ! grep -rqF "$SUPA_KEY_FINGERPRINT" dist/assets/*.js 2>/dev/null; then
  echo "❌ ABBRUCH: Supabase-Publishable-Key fehlt im Bundle. Dieser Build darf nicht deployed werden." >&2
  exit 1
fi

echo "▶ Client-Bundle auf verbotene Secret-Muster prüfen"
if grep -rqE 'SUPABASE_SERVICE_ROLE|BEGIN (RSA |EC )?PRIVATE KEY' dist/assets/*.js 2>/dev/null; then
  echo "❌ ABBRUCH: Verdächtiges Secret-Muster im Client-Bundle gefunden." >&2
  exit 1
fi

if [[ ! -s dist/index.html ]]; then
  echo "❌ ABBRUCH: dist/index.html fehlt oder ist leer." >&2
  exit 1
fi

BUILD_HASH=$(sha256sum dist/index.html | awk '{print $1}')

echo "✅ HUFMANAGER_VERIFY=PASS"
echo "✅ Build-Index-Hash: $BUILD_HASH"
echo "ℹ️  Es wurde NICHT deployed. HufiApp wurde NICHT angefasst."
