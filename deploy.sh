#!/bin/bash
# HufiApp (hufiapp.de) — einziger erlaubter Deploy-Weg für /var/www/hufiapps/v25.
# NICHT per Hand-Kommandos deployen — siehe HUFI_ROADMAP.md ("Ausfall 19.07.2026").
#
# Ablauf: sauberer git-worktree → .env hineinkopieren (NICHT tracken!) →
# npm ci → build → HARTES GATE (Supabase-URL UND -Key im Bundle?) →
# Secret-Scan → Backup des aktuellen Live-Stands → rsync → Smoke-Test →
# (bei Smoke-Test-Fehlschlag: automatischer Rollback) → worktree aufräumen.
#
# Rollback auf den letzten Backup-Stand: ./deploy.sh --rollback
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$REPO_DIR/.env"
WT_DIR="/tmp/hufi-deploy-worktree-$$"
WEBROOT="/var/www/hufiapps"
DEST="$WEBROOT/v25/"
BACKUP_PREFIX="v25-backup-"
KEEP_BACKUPS=5

cleanup() {
  git -C "$REPO_DIR" worktree remove "$WT_DIR" --force >/dev/null 2>&1 || true
  rm -rf "$WT_DIR"
}
trap cleanup EXIT

prune_backups() {
  # Behalte nur die letzten $KEEP_BACKUPS automatischen Backups.
  local backups
  mapfile -t backups < <(find "$WEBROOT" -maxdepth 1 -type d -name "${BACKUP_PREFIX}*" | sort)
  local count=${#backups[@]}
  if (( count > KEEP_BACKUPS )); then
    local to_remove=$(( count - KEEP_BACKUPS ))
    for ((i = 0; i < to_remove; i++)); do
      echo "  🗑 Räume altes Backup auf: ${backups[$i]}"
      rm -rf "${backups[$i]}"
    done
  fi
}

latest_backup() {
  find "$WEBROOT" -maxdepth 1 -type d -name "${BACKUP_PREFIX}*" | sort | tail -1
}

do_rollback() {
  local target
  target="$(latest_backup)"
  if [[ -z "$target" ]]; then
    echo "❌ ABBRUCH: Kein Backup unter $WEBROOT/${BACKUP_PREFIX}* gefunden — kein Rollback möglich." >&2
    exit 1
  fi
  echo "▶ Rollback: $target → $DEST"
  rsync -a --delete "$target/" "$DEST"
  echo "✅ Rollback abgeschlossen. Wiederhergestellt aus: $(basename "$target")"
}

if [[ "${1:-}" == "--rollback" ]]; then
  do_rollback
  exit 0
fi

echo "▶ Prüfe .env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ ABBRUCH: $ENV_FILE fehlt. Ohne .env kann nicht gebaut werden." >&2
  exit 1
fi

SUPA_URL=$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
if [[ -z "$SUPA_URL" ]]; then
  echo "❌ ABBRUCH: VITE_SUPABASE_URL in .env nicht gesetzt." >&2
  exit 1
fi
SUPA_HOST=$(echo "$SUPA_URL" | sed -E 's#^https?://##; s#/.*##')

SUPA_KEY=$(grep -E '^VITE_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
if [[ -z "$SUPA_KEY" ]]; then
  echo "❌ ABBRUCH: VITE_SUPABASE_PUBLISHABLE_KEY in .env nicht gesetzt." >&2
  exit 1
fi
# createClient() wirft "supabaseKey is required." exakt so fatal wie eine
# fehlende URL — deshalb muss der Key genauso hart geprüft werden wie die URL.
SUPA_KEY_FINGERPRINT="${SUPA_KEY:0:40}"

echo "  ✓ .env vorhanden, Supabase-Host: $SUPA_HOST, Key-Fingerprint: ${SUPA_KEY_FINGERPRINT:0:12}…"

echo "▶ Lege sauberen Worktree an: $WT_DIR"
rm -rf "$WT_DIR"
git -C "$REPO_DIR" worktree add --detach "$WT_DIR" HEAD

echo "▶ Kopiere .env in den Worktree (wird NICHT committet)"
cp "$ENV_FILE" "$WT_DIR/.env"

echo "▶ npm ci"
( cd "$WT_DIR" && npm ci )

echo "▶ Build"
( cd "$WT_DIR" && npm run build )

echo "▶ PFLICHT-GATE: Sind alle kritischen VITE_-Variablen im Bundle?"
if ! grep -rq "$SUPA_HOST" "$WT_DIR/dist/assets/"*.js 2>/dev/null; then
  echo "❌ ABBRUCH: Supabase-Host '$SUPA_HOST' NICHT im gebauten Bundle gefunden." >&2
  echo "   Der Build lief ohne VITE_SUPABASE_URL — Deploy würde weißen Screen verursachen." >&2
  echo "   Es wurde NICHTS deployed." >&2
  exit 1
fi
echo "  ✓ Supabase-URL im Bundle gefunden"

if ! grep -rqF "$SUPA_KEY_FINGERPRINT" "$WT_DIR/dist/assets/"*.js 2>/dev/null; then
  echo "❌ ABBRUCH: Supabase-Key (Fingerprint) NICHT im gebauten Bundle gefunden." >&2
  echo "   Der Build lief ohne VITE_SUPABASE_PUBLISHABLE_KEY — createClient() würde mit" >&2
  echo "   'supabaseKey is required.' crashen, genauso fatal wie eine fehlende URL." >&2
  echo "   Es wurde NICHTS deployed." >&2
  exit 1
fi
echo "  ✓ Supabase-Key im Bundle gefunden"

echo "▶ Bundle-Secret-Scan (Service-Role-Key, private Keys dürfen NICHT im Client-Bundle sein)"
if grep -rqE 'service_role|SUPABASE_SERVICE_ROLE|BEGIN (RSA |EC )?PRIVATE KEY' "$WT_DIR/dist/assets/"*.js 2>/dev/null; then
  echo "❌ ABBRUCH: Verdächtiges Secret-Muster im Bundle gefunden." >&2
  exit 1
fi
echo "  ✓ Kein Secret-Muster gefunden"

BACKUP_DIR="$WEBROOT/${BACKUP_PREFIX}$(date +%Y%m%d-%H%M%S)"
if [[ -d "$DEST" ]] && [[ -n "$(ls -A "$DEST" 2>/dev/null)" ]]; then
  echo "▶ Sichere aktuellen Live-Stand nach $BACKUP_DIR"
  rsync -a "$DEST" "$BACKUP_DIR/"
  prune_backups
else
  echo "▶ Kein bestehender Live-Stand zum Sichern gefunden (Erst-Deploy?)"
fi

echo "▶ rsync nach $DEST"
rsync -a --delete "$WT_DIR/dist/" "$DEST"

echo "▶ Smoke-Test gegen https://hufiapp.de/"
if ! node "$REPO_DIR/smoke-test.mjs" "https://hufiapp.de/"; then
  echo "❌ SMOKE-TEST FEHLGESCHLAGEN — rolle automatisch zurück." >&2
  if [[ -n "$BACKUP_DIR" ]] && [[ -d "$BACKUP_DIR" ]]; then
    rsync -a --delete "$BACKUP_DIR/" "$DEST"
    echo "✅ Rollback abgeschlossen. Wiederhergestellt aus: $(basename "$BACKUP_DIR")" >&2
  else
    echo "❌ KEIN Backup vorhanden — kein automatischer Rollback möglich. Live-Stand ist der fehlgeschlagene Build!" >&2
  fi
  echo "❌ ABBRUCH: Deployment wurde zurückgerollt, es ist NICHT live." >&2
  exit 1
fi
echo "  ✓ Smoke-Test bestanden"

echo "✅ Deployment abgeschlossen. Commit: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
