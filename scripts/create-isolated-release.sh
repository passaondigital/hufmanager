#!/usr/bin/env bash
# Creates an atomically finalized release directory. It never changes webroots or symlinks.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/create-isolated-release.sh --target-root PATH [--release-name NAME] [--apply]

Without --apply this command is a dry run and changes nothing. --target-root
must be explicit. A release is created only at PATH/releases/NAME; existing
release directories are always rejected.
EOF
}

die() { echo "ABBRUCH: $*" >&2; exit 1; }

TARGET_ROOT=""
RELEASE_NAME="release-$(date -u +%Y%m%dT%H%M%SZ)"
APPLY=false

while (($#)); do
  case "$1" in
    --target-root)
      [[ $# -ge 2 && -n "${2:-}" && "${2:-}" != --* ]] || die "--target-root benötigt einen Pfad"
      TARGET_ROOT="$2"; shift 2 ;;
    --release-name)
      [[ $# -ge 2 && -n "${2:-}" && "${2:-}" != --* ]] || die "--release-name benötigt einen Namen"
      RELEASE_NAME="$2"; shift 2 ;;
    --apply) APPLY=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) die "unbekanntes Argument: $1" ;;
  esac
done

[[ -n "$TARGET_ROOT" ]] || die "--target-root ist erforderlich"
[[ "$RELEASE_NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || die "ungültiger Release-Name"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TARGET_ROOT="$(realpath -m "$TARGET_ROOT")"

if [[ "$TARGET_ROOT" != "/var/www/hufiapp" && ! "$TARGET_ROOT" =~ ^/tmp/repo-001-[A-Za-z0-9._-]+$ ]]; then
  die "--target-root ist ausschließlich /var/www/hufiapp oder /tmp/repo-001-* erlaubt"
fi

RELEASES_DIR="$TARGET_ROOT/releases"
SHARED_DIR="$TARGET_ROOT/shared"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_NAME"

[[ ! -e "$RELEASE_DIR" && ! -L "$RELEASE_DIR" ]] || die "Release existiert bereits und wird nie überschrieben: $RELEASE_DIR"

VERSION="$(node -e "console.log(require(process.argv[1] + '/package.json').version)" "$REPO_ROOT")"
COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
BUILD_TIME_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FLAVOR="hufiapp"
TARGET_DOMAIN="https://hufiapp.de"

echo "Release target: $RELEASE_DIR"
echo "Shared target:  $SHARED_DIR"
echo "Mode:           $([[ "$APPLY" == true ]] && echo apply || echo dry-run)"
echo "Metadata:       version=$VERSION commit=$COMMIT build_time_utc=$BUILD_TIME_UTC flavor=$FLAVOR target_domain=$TARGET_DOMAIN"

if [[ "$APPLY" != true ]]; then
  echo "DRY-RUN: no directories, build artefacts, symlinks, or webroots were changed."
  exit 0
fi

git -C "$REPO_ROOT" diff --quiet HEAD -- || die "Arbeitsbaum enthält nicht-committete Änderungen"
[[ -z "$(git -C "$REPO_ROOT" status --short)" ]] || die "Arbeitsbaum enthält nicht-committete oder unversionierte Änderungen"

(
  cd "$REPO_ROOT"
  VITE_APP_FLAVOR=hufiapp npm run build
)

# Do not place recognised private-key or service-role material into a release.
if rg -l -i 'service_role|supabase_service_role|BEGIN (RSA |EC )?PRIVATE KEY' "$REPO_ROOT/dist" >/dev/null 2>&1; then
  die "Secret-Muster im Build-Artefakt erkannt"
fi

mkdir -p "$RELEASES_DIR" "$SHARED_DIR"
[[ ! -e "$RELEASE_DIR" && ! -L "$RELEASE_DIR" ]] || die "Release existiert bereits und wird nie überschrieben: $RELEASE_DIR"
STAGING_DIR="$(mktemp -d "$RELEASES_DIR/.staging-${RELEASE_NAME}.XXXXXX")"
cleanup() {
  local status=$?
  if [[ -n "${STAGING_DIR:-}" && -d "$STAGING_DIR" ]]; then
    rm -rf "$STAGING_DIR"
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

cp -a "$REPO_ROOT/dist/." "$STAGING_DIR/"
cat > "$STAGING_DIR/BUILD_INFO" <<EOF
version=$VERSION
commit=$COMMIT
build_time_utc=$BUILD_TIME_UTC
flavor=$FLAVOR
target_domain=$TARGET_DOMAIN
EOF

if [[ "${REPO001_TEST_ABORT_BEFORE_FINALIZE:-}" == "1" ]]; then
  die "simulierter Abbruch vor atomarem Finalisieren"
fi

[[ ! -e "$RELEASE_DIR" && ! -L "$RELEASE_DIR" ]] || die "Release existiert bereits und wird nie überschrieben: $RELEASE_DIR"
mv "$STAGING_DIR" "$RELEASE_DIR"
STAGING_DIR=""

echo "Release created: $RELEASE_DIR"
