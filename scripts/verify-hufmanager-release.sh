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

SUPA_URL="${VITE_SUPABASE_URL:-}"
SUPA_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-}"
if [[ (-z "$SUPA_URL" || -z "$SUPA_KEY") && -f "$ENV_FILE" ]]; then
  SUPA_URL=$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
  SUPA_KEY=$(grep -E '^VITE_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
fi

if [[ -z "$SUPA_URL" || -z "$SUPA_KEY" ]]; then
  echo "❌ ABBRUCH: VITE_SUPABASE_URL oder VITE_SUPABASE_PUBLISHABLE_KEY fehlt." >&2
  exit 1
fi

SUPA_HOST=$(echo "$SUPA_URL" | sed -E 's#^https?://##; s#/.*##')
SUPA_KEY_FINGERPRINT="${SUPA_KEY:0:24}"
export VITE_APP_FLAVOR=hufmanager
export VITE_SUPABASE_URL="$SUPA_URL"
export VITE_SUPABASE_PUBLISHABLE_KEY="$SUPA_KEY"
export HUFMANAGER_BUILD_COMMIT="$(git rev-parse HEAD)"
export HUFMANAGER_BUILD_BRANCH="${GITHUB_HEAD_REF:-$(git branch --show-current)}"

echo "▶ Git-Diff prüfen"
git diff --check

echo "▶ HufManager-Startup-/Login-Regeln prüfen"
if grep -qF 'Dein proaktiver Mitarbeiter' src/components/auth/AuthLoadingScreen.tsx; then
  echo "❌ ABBRUCH: HufiApp-Claim ist wieder im HufManager-Startup gelandet." >&2
  exit 1
fi
if grep -qF 'Produktzugang wird geprüft' src/components/auth/ProductChoiceGate.tsx; then
  echo "❌ ABBRUCH: Separater Produktzugang-Ladescreen ist wieder aktiv." >&2
  exit 1
fi
if ! grep -qF 'FLAVOR_CONFIG.appName' src/components/auth/AuthLoadingScreen.tsx; then
  echo "❌ ABBRUCH: Startup-Screen ist nicht flavor-/HufManager-gebrandet." >&2
  exit 1
fi
if ! grep -qF "ACTIVE_FLAVOR === 'hufmanager' ? sessionStorage : localStorage" src/integrations/supabase/client.ts; then
  echo "❌ ABBRUCH: HufManager-Session ist nicht auf Browser-Sitzung begrenzt." >&2
  exit 1
fi
if ! grep -qF 'removeSupabaseAuthTokens(sessionStorage)' src/integrations/supabase/client.ts \
  || ! grep -qF 'removeSupabaseAuthTokens(localStorage)' src/integrations/supabase/client.ts; then
  echo "❌ ABBRUCH: Frischer HufManager-Einstieg bereinigt alte Supabase-Sessions nicht vollständig." >&2
  exit 1
fi
if ! grep -qF "entryPath === '/auth'" src/integrations/supabase/client.ts \
  || ! grep -qF "entryPath === '/login'" src/integrations/supabase/client.ts; then
  echo "❌ ABBRUCH: /auth bzw. /login erzwingen keinen frischen HufManager-Login." >&2
  exit 1
fi
if ! grep -qF '<AuthLoadingScreen />' src/pages/Welcome.tsx; then
  echo "❌ ABBRUCH: Welcome-Redirect verwendet wieder einen separaten Loader." >&2
  exit 1
fi

echo "▶ HufManager-Management von HufiApp-Funktionen trennen"
if ! grep -qF 'const isHufiApp = ACTIVE_FLAVOR === "hufiapp";' src/pages/ManagementHub.tsx; then
  echo "❌ ABBRUCH: Management trennt HufManager und HufiApp nicht mehr sauber." >&2
  exit 1
fi
if ! grep -qF '<HufiPermissionsSettings' src/pages/ManagementHub.tsx \
  || ! grep -qF '{isHufiApp && (' src/pages/ManagementHub.tsx; then
  echo "❌ ABBRUCH: Hufi-Voice-/KI-Einstellungen sind nicht mehr flavor-geschützt." >&2
  exit 1
fi
if grep -qF 'Hufi läuft als Homescreen-App' src/pages/ManagementHub.tsx \
  || grep -qF 'Hufi zum Homescreen hinzufügen' src/pages/ManagementHub.tsx; then
  echo "❌ ABBRUCH: HufiApp-Installationscopy ist wieder im gemeinsamen Management gelandet." >&2
  exit 1
fi
if ! grep -qF 'HufManager als App installieren' src/pages/ManagementHub.tsx \
  || ! grep -qF 'Jetzt installieren' src/pages/ManagementHub.tsx; then
  echo "❌ ABBRUCH: HufManager-Installationsbereich oder CTA fehlt." >&2
  exit 1
fi

echo "▶ Abhängigkeiten reproduzierbar installieren"
if [[ "${HUFMANAGER_SKIP_NPM_CI:-false}" == "true" ]]; then
  echo "  npm ci wurde in diesem Checkout separat erfolgreich ausgeführt"
else
  npm ci
fi

echo "▶ TypeScript, vollständige Tests und statische Gates"
npm run typecheck
npm test
npm run check:layers
npm run lint:hufmanager
npm run check:migrations:hufmanager
npm run scan:secrets:hufmanager

echo "▶ Kanonischen HufManager-Flavor mit Provenienz bauen"
npm run build:hufmanager:canonical

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

node scripts/hufmanager-build-provenance.mjs verify dist
npm run scan:secrets:hufmanager

BUILD_HASH=$(sha256sum dist/index.html | awk '{print $1}')

echo "✅ HUFMANAGER_VERIFY=PASS"
echo "✅ Build-Index-Hash: $BUILD_HASH"
echo "ℹ️  Es wurde NICHT deployed. HufiApp wurde NICHT angefasst."
