#!/bin/bash
# HufManager (app.hufmanager.de) — einziger erlaubter Deploy-Weg.
# Aufruf ausschliesslich ueber:  ./deploy.sh hufmanager [...]
#
# Ablauf:
#   sauberer git-worktree auf dem eingefrorenen RC
#   -> npm ci -> Build (VITE_APP_FLAVOR=hufmanager)
#   -> HARTE GATES (Supabase-URL + Key im Bundle, KEINE Staging-URL, Secret-Scan)
#   -> Release-Verzeichnis releases/<commit> atomar finalisieren
#   -> pruefen
#   -> current-Symlink atomar umschalten
#   -> Smoke-Test -> bei Fehlschlag automatischer Symlink-Rollback
#
# Rollback jederzeit:  ./deploy.sh hufmanager --rollback   (Symlink zurueck)
#
# Struktur unter $RELEASE_ROOT:
#   releases/<commit>/   unveraenderliche Build-Artefakte
#   current -> releases/<commit>      kanonischer Zeiger, wird atomar umgelegt
#   previous -> releases/<commit>     Ziel des Rollbacks
#   app -> current                    Pfad, den nginx ausliefert (root bleibt gleich)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Ueberschreibbar, damit der Ablauf gegen ein /tmp-Testroot vollstaendig
# durchgespielt werden kann, ohne Produktion anzufassen.
RELEASE_ROOT="${HUFMANAGER_RELEASE_ROOT:-/srv/hufi/business/hufmanager}"
ENV_FILE="${HUFMANAGER_ENV_FILE:-$REPO_DIR/.env.hufmanager}"
SMOKE_URL="${HUFMANAGER_SMOKE_URL:-https://app.hufmanager.de/}"
KEEP_RELEASES="${HUFMANAGER_KEEP_RELEASES:-5}"

RELEASES_DIR="$RELEASE_ROOT/releases"
CURRENT_LINK="$RELEASE_ROOT/current"
PREVIOUS_LINK="$RELEASE_ROOT/previous"
SERVE_LINK="$RELEASE_ROOT/app"     # nginx root — zeigt auf current

WT_DIR=""
STAGING_DIR=""

die() { echo "❌ ABBRUCH: $*" >&2; exit 1; }
info() { echo "$*"; }

cleanup() {
  local status=$?
  if [[ -n "$WT_DIR" ]]; then
    git -C "$REPO_DIR" worktree remove "$WT_DIR" --force >/dev/null 2>&1 || true
    rm -rf "$WT_DIR"
  fi
  if [[ -n "$STAGING_DIR" && -d "$STAGING_DIR" ]]; then
    rm -rf "$STAGING_DIR"
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh hufmanager [--ref <commit|branch>] [--dry-run]
  ./deploy.sh hufmanager --rollback
  ./deploy.sh hufmanager --list

  --ref       Zu deployender Stand (Default: HEAD des Repos)
  --dry-run   Baut und prueft vollstaendig, schaltet den Symlink NICHT um
  --rollback  Schaltet current auf previous zurueck (kein Build)
  --list      Zeigt vorhandene Releases und die aktuellen Symlinks

Env-Overrides (fuer Tests):
  HUFMANAGER_RELEASE_ROOT   Default /srv/hufi/business/hufmanager
  HUFMANAGER_ENV_FILE       Default <repo>/.env.hufmanager
  HUFMANAGER_SMOKE_URL      Default https://app.hufmanager.de/
  HUFMANAGER_KEEP_RELEASES  Default 5
EOF
}

# ── Symlink atomar setzen ────────────────────────────────────────────────────
# ln -sfn auf einen bestehenden Symlink ist nicht atomar. Neuen Link daneben
# anlegen und per rename() (mv -T) daruebermappen ist es.
set_link_atomic() {
  local link="$1" target="$2" tmp
  tmp="$(dirname "$link")/.$(basename "$link").tmp.$$"
  rm -rf "$tmp"
  ln -s "$target" "$tmp"
  mv -T "$tmp" "$link"
}

link_target() {
  local link="$1"
  [[ -L "$link" ]] || return 1
  readlink "$link"
}

resolve_release_dir() {
  local link="$1" t
  t="$(link_target "$link")" || return 1
  [[ "$t" = /* ]] && echo "$t" || echo "$RELEASE_ROOT/$t"
}

show_state() {
  info "Release-Root: $RELEASE_ROOT"
  if [[ -d "$RELEASES_DIR" ]]; then
    info "Releases:"
    find "$RELEASES_DIR" -maxdepth 1 -mindepth 1 -type d -printf '  %f\n' | sort
  else
    info "Releases: (noch keine)"
  fi
  for l in "$CURRENT_LINK" "$PREVIOUS_LINK" "$SERVE_LINK"; do
    if [[ -L "$l" ]]; then
      info "  $(basename "$l") -> $(readlink "$l")"
    elif [[ -d "$l" ]]; then
      info "  $(basename "$l") -> (echtes Verzeichnis, noch nicht umgestellt)"
    else
      info "  $(basename "$l") -> (nicht vorhanden)"
    fi
  done
}

prune_releases() {
  local keep="$KEEP_RELEASES" keep_dirs=() all=()
  # '.staging-*' eines parallel laufenden Deploys darf nie erfasst werden.
  mapfile -t all < <(find "$RELEASES_DIR" -maxdepth 1 -mindepth 1 -type d ! -name '.*' -printf '%T@ %p\n' | sort -n | awk '{print $2}')
  local cur prev
  cur="$(resolve_release_dir "$CURRENT_LINK" 2>/dev/null || true)"
  prev="$(resolve_release_dir "$PREVIOUS_LINK" 2>/dev/null || true)"
  local count=${#all[@]}
  (( count > keep )) || return 0
  local remove=$(( count - keep )) i=0
  for d in "${all[@]}"; do
    (( i < remove )) || break
    # Niemals das aktive oder das Rollback-Ziel entfernen.
    if [[ "$d" == "$cur" || "$d" == "$prev" ]]; then continue; fi
    # Den gesicherten Alt-Webroot nie automatisch loeschen.
    if [[ "$(basename "$d")" == legacy-app-* ]]; then continue; fi
    info "  🗑 Raeume altes Release auf: $(basename "$d")"
    rm -rf "$d"
    i=$((i+1))
  done
}

# ── Rollback ─────────────────────────────────────────────────────────────────
do_rollback() {
  local prev cur
  prev="$(resolve_release_dir "$PREVIOUS_LINK" 2>/dev/null || true)"
  [[ -n "$prev" ]] || die "Kein previous-Symlink vorhanden — kein Rollback moeglich."
  [[ -d "$prev" ]] || die "previous zeigt auf ein fehlendes Verzeichnis: $prev"
  [[ -f "$prev/index.html" ]] || die "previous enthaelt keine index.html: $prev"
  cur="$(resolve_release_dir "$CURRENT_LINK" 2>/dev/null || true)"

  info "▶ Rollback: current -> $(basename "$prev")"
  set_link_atomic "$CURRENT_LINK" "releases/$(basename "$prev")"
  if [[ -n "$cur" && -d "$cur" ]]; then
    set_link_atomic "$PREVIOUS_LINK" "releases/$(basename "$cur")"
  fi
  info "✅ Rollback abgeschlossen. current -> $(readlink "$CURRENT_LINK")"
  show_state
}

# ── Argumente ────────────────────────────────────────────────────────────────
REF="HEAD"
DRY_RUN=false
while (($#)); do
  case "$1" in
    --ref) [[ $# -ge 2 && -n "${2:-}" ]] || die "--ref benoetigt einen Wert"; REF="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --rollback) do_rollback; exit 0 ;;
    --list) show_state; exit 0 ;;
    --help|-h) usage; exit 0 ;;
    *) die "unbekanntes Argument: $1" ;;
  esac
done

# ── 1. Vorbedingungen ────────────────────────────────────────────────────────
info "▶ Pruefe Env-Datei"
[[ -f "$ENV_FILE" ]] || die "$ENV_FILE fehlt.
   Sie muss die PRODUKTIONS-Werte enthalten und wird NICHT committet:
     VITE_APP_FLAVOR=hufmanager
     VITE_SUPABASE_URL=https://<prod-ref>.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=<prod publishable key>"

SUPA_URL=$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
[[ -n "$SUPA_URL" ]] || die "VITE_SUPABASE_URL in $ENV_FILE nicht gesetzt."
SUPA_HOST=$(echo "$SUPA_URL" | sed -E 's#^https?://##; s#/.*##')

SUPA_KEY=$(grep -E '^VITE_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
[[ -n "$SUPA_KEY" ]] || die "VITE_SUPABASE_PUBLISHABLE_KEY in $ENV_FILE nicht gesetzt."
SUPA_KEY_FINGERPRINT="${SUPA_KEY:0:40}"

# Harte Umgebungstrennung: eine Staging-Adresse darf niemals nach Production.
case "$SUPA_HOST" in
  *huficloud*|*hufmanager-staging*|localhost|127.0.0.1|*:54321)
    die "VITE_SUPABASE_URL zeigt auf eine Staging-/Lokal-Adresse ($SUPA_HOST).
   Ein HufManager-Production-Deploy mit dieser URL wird nicht durchgefuehrt." ;;
esac
info "  ✓ Env ok — Supabase-Host: $SUPA_HOST, Key-Fingerprint: ${SUPA_KEY_FINGERPRINT:0:12}…"

COMMIT="$(git -C "$REPO_DIR" rev-parse "$REF")"
COMMIT_SHORT="$(git -C "$REPO_DIR" rev-parse --short=12 "$REF")"
info "▶ Zu deployender Stand: $COMMIT_SHORT ($(git -C "$REPO_DIR" log -1 --format=%s "$REF"))"

RELEASE_NAME="$COMMIT_SHORT"
[[ -e "$RELEASES_DIR/$RELEASE_NAME" ]] && RELEASE_NAME="$COMMIT_SHORT-$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_NAME"

# ── 2. Build aus sauberem Worktree ───────────────────────────────────────────
WT_DIR="/tmp/hufmanager-deploy-worktree-$$"
info "▶ Lege sauberen Worktree an: $WT_DIR"
rm -rf "$WT_DIR"
git -C "$REPO_DIR" worktree add --detach "$WT_DIR" "$COMMIT" >/dev/null

info "▶ Kopiere Env in den Worktree (wird NICHT committet)"
cp "$ENV_FILE" "$WT_DIR/.env"

info "▶ npm ci"
( cd "$WT_DIR" && npm ci )

info "▶ Build (VITE_APP_FLAVOR=hufmanager)"
( cd "$WT_DIR" && VITE_APP_FLAVOR=hufmanager npm run build )

# ── 3. Harte Gates am Bundle ─────────────────────────────────────────────────
info "▶ GATE: Supabase-URL im Bundle?"
grep -rq "$SUPA_HOST" "$WT_DIR/dist/assets/"*.js 2>/dev/null \
  || die "Supabase-Host '$SUPA_HOST' NICHT im Bundle. Build lief ohne VITE_SUPABASE_URL — weisser Screen. Es wurde NICHTS deployed."
info "  ✓ Supabase-URL gefunden"

info "▶ GATE: Supabase-Key im Bundle?"
grep -rqF "$SUPA_KEY_FINGERPRINT" "$WT_DIR/dist/assets/"*.js 2>/dev/null \
  || die "Supabase-Key NICHT im Bundle. createClient() wuerde mit 'supabaseKey is required.' crashen. Es wurde NICHTS deployed."
info "  ✓ Supabase-Key gefunden"

info "▶ GATE: Keine Staging-Adresse im Bundle?"
if grep -rqE 'hufmanager-staging|huficloud' "$WT_DIR/dist" 2>/dev/null; then
  die "Staging-Adresse im Production-Bundle gefunden. Es wurde NICHTS deployed."
fi
info "  ✓ Keine Staging-Adresse"

info "▶ GATE: Secret-Scan"
if grep -rqE 'service_role|SUPABASE_SERVICE_ROLE|BEGIN (RSA |EC )?PRIVATE KEY' "$WT_DIR/dist/assets/"*.js 2>/dev/null; then
  die "Verdaechtiges Secret-Muster im Bundle. Es wurde NICHTS deployed."
fi
info "  ✓ Kein Secret-Muster"

[[ -f "$WT_DIR/dist/index.html" ]] || die "dist/index.html fehlt — Build unvollstaendig."
ASSET_COUNT="$(find "$WT_DIR/dist/assets" -type f 2>/dev/null | wc -l)"
(( ASSET_COUNT > 0 )) || die "dist/assets ist leer — Build unvollstaendig."
info "  ✓ index.html + $ASSET_COUNT Asset-Dateien im Build"

# Der Dry-Run endet hier: bis zu diesem Punkt wurde ausschliesslich im
# temporaeren Worktree gearbeitet. Unter $RELEASE_ROOT wurde nichts angelegt,
# verschoben oder umgeschaltet.
if [[ "$DRY_RUN" == true ]]; then
  info "▶ DRY-RUN: alle Gates bestanden."
  info "  Es wurde NICHTS unter $RELEASE_ROOT angelegt oder veraendert."
  info "  Ein echter Lauf wuerde anlegen: $RELEASE_DIR"
  info "  und danach current -> releases/$RELEASE_NAME schalten."
  show_state
  exit 0
fi

# ── 4. Release-Verzeichnis atomar finalisieren ───────────────────────────────
mkdir -p "$RELEASES_DIR"
[[ ! -e "$RELEASE_DIR" ]] || die "Release existiert bereits und wird nie ueberschrieben: $RELEASE_DIR"

STAGING_DIR="$(mktemp -d "$RELEASES_DIR/.staging-XXXXXX")"
cp -a "$WT_DIR/dist/." "$STAGING_DIR/"
cat > "$STAGING_DIR/RELEASE_INFO" <<EOF
commit=$COMMIT
commit_short=$COMMIT_SHORT
ref=$REF
build_time_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
flavor=hufmanager
supabase_host=$SUPA_HOST
deployed_by=$(id -un)
EOF

mv -T "$STAGING_DIR" "$RELEASE_DIR"
STAGING_DIR=""
info "▶ Release finalisiert: $RELEASE_DIR"

# ── 5. Release verifizieren, bevor umgeschaltet wird ─────────────────────────
info "▶ Pruefe finalisiertes Release-Verzeichnis"
[[ -f "$RELEASE_DIR/index.html" ]] || die "index.html fehlt im Release."
[[ -d "$RELEASE_DIR/assets" ]] || die "assets/ fehlt im Release."
RELEASE_ASSET_COUNT="$(find "$RELEASE_DIR/assets" -type f | wc -l)"
(( RELEASE_ASSET_COUNT == ASSET_COUNT )) \
  || die "Release enthaelt $RELEASE_ASSET_COUNT statt $ASSET_COUNT Asset-Dateien — unvollstaendig kopiert."
info "  ✓ index.html + $RELEASE_ASSET_COUNT Asset-Dateien"

# ── 6. Einmalige Umstellung: echtes app/-Verzeichnis -> Symlink-Struktur ──────
if [[ -d "$SERVE_LINK" && ! -L "$SERVE_LINK" ]]; then
  LEGACY="$RELEASES_DIR/legacy-app-$(date -u +%Y%m%dT%H%M%SZ)"
  info "▶ Einmalige Umstellung: bisheriger Webroot wird zum Rollback-Ziel"
  info "  $SERVE_LINK  ->  $LEGACY"
  mv -T "$SERVE_LINK" "$LEGACY"
  set_link_atomic "$PREVIOUS_LINK" "releases/$(basename "$LEGACY")"
fi

# ── 7. current atomar umschalten, app auf current zeigen lassen ──────────────
OLD_CURRENT="$(resolve_release_dir "$CURRENT_LINK" 2>/dev/null || true)"
if [[ -n "$OLD_CURRENT" && -d "$OLD_CURRENT" ]]; then
  set_link_atomic "$PREVIOUS_LINK" "releases/$(basename "$OLD_CURRENT")"
fi

info "▶ Schalte current atomar um -> releases/$RELEASE_NAME"
set_link_atomic "$CURRENT_LINK" "releases/$RELEASE_NAME"

if [[ ! -L "$SERVE_LINK" ]]; then
  info "▶ Lege Auslieferungs-Symlink an: app -> current"
  set_link_atomic "$SERVE_LINK" "current"
elif [[ "$(readlink "$SERVE_LINK")" != "current" ]]; then
  set_link_atomic "$SERVE_LINK" "current"
fi

# ── 8. Smoke-Test, bei Fehlschlag automatischer Symlink-Rollback ─────────────
info "▶ Smoke-Test gegen $SMOKE_URL"
if ! node "$REPO_DIR/smoke-test.mjs" "$SMOKE_URL"; then
  echo "❌ SMOKE-TEST FEHLGESCHLAGEN — schalte current automatisch zurueck." >&2
  PREV="$(resolve_release_dir "$PREVIOUS_LINK" 2>/dev/null || true)"
  if [[ -n "$PREV" && -d "$PREV" ]]; then
    set_link_atomic "$CURRENT_LINK" "releases/$(basename "$PREV")"
    echo "✅ Rollback abgeschlossen. current -> $(readlink "$CURRENT_LINK")" >&2
  else
    echo "❌ Kein previous-Symlink — kein automatischer Rollback moeglich!" >&2
  fi
  die "Deployment wurde zurueckgerollt, es ist NICHT live."
fi
info "  ✓ Smoke-Test bestanden"

prune_releases

info "✅ HufManager-Deployment abgeschlossen."
info "   Commit:  $COMMIT_SHORT"
info "   Release: releases/$RELEASE_NAME"
show_state
info ""
info "   Rollback jederzeit:  ./deploy.sh hufmanager --rollback"
