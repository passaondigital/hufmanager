#!/usr/bin/env bash
# Creates an immutable release directory. It never changes webroots or symlinks.
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
    --target-root) TARGET_ROOT="${2:-}"; shift 2 ;;
    --release-name) RELEASE_NAME="${2:-}"; shift 2 ;;
    --apply) APPLY=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) die "unbekanntes Argument: $1" ;;
  esac
done

[[ -n "$TARGET_ROOT" ]] || die "--target-root ist erforderlich"
[[ "$RELEASE_NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || die "ungültiger Release-Name"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TARGET_ROOT="$(realpath -m "$TARGET_ROOT")"
PRODUCTION_SOURCE="/root/hufmanager_v25/production"
LEGACY_WEBROOT="/var/www/hufiapps/v25"

[[ "$TARGET_ROOT" != "$PRODUCTION_SOURCE" && "$TARGET_ROOT" != "$PRODUCTION_SOURCE"/* ]] || die "Produktionsquelle ist als Ziel verboten"
[[ "$TARGET_ROOT" != "$LEGACY_WEBROOT" && "$TARGET_ROOT" != "$LEGACY_WEBROOT"/* ]] || die "aktiver Legacy-Webroot ist als Ziel verboten"
[[ "$TARGET_ROOT" != "$REPO_ROOT" && "$TARGET_ROOT" != "$REPO_ROOT"/* ]] || die "Repository darf kein Release-Ziel sein"

# Existing current symlinks are treated as active webroots and are never valid
# release targets. This deliberately refuses a target beneath any such path.
while IFS= read -r current_link; do
  current_dir="$(dirname "$current_link")"
  resolved_current="$(realpath -m "$current_link")"
  if [[ "$TARGET_ROOT" == "$current_dir" || "$TARGET_ROOT" == "$current_dir"/* || "$TARGET_ROOT" == "$resolved_current" || "$TARGET_ROOT" == "$resolved_current"/* ]]; then
    die "aktiver current-Webroot ist als Ziel verboten: $current_link"
  fi
done < <(find /var/www -type l -name current -print 2>/dev/null || true)

# Also reject roots declared in readable Nginx configuration. If the
# configuration cannot be read, the symlink and explicit legacy guards above
# still make the script fail closed for known production paths.
if [[ -r /etc/nginx/nginx.conf ]]; then
  while IFS= read -r nginx_root; do
    nginx_root="$(realpath -m "$nginx_root")"
    if [[ "$TARGET_ROOT" == "$nginx_root" || "$TARGET_ROOT" == "$nginx_root"/* ]]; then
      die "in Nginx konfigurierter Webroot ist als Ziel verboten: $nginx_root"
    fi
  done < <(rg --no-filename --glob '*.conf' '^\s*root\s+/' /etc/nginx 2>/dev/null | sed -E 's/^\s*root\s+([^; ]+).*/\1/' || true)
fi

RELEASES_DIR="$TARGET_ROOT/releases"
SHARED_DIR="$TARGET_ROOT/shared"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_NAME"
METADATA_FILE="$RELEASE_DIR/BUILD_INFO"

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

mkdir -p "$RELEASES_DIR" "$SHARED_DIR"
[[ ! -e "$RELEASE_DIR" && ! -L "$RELEASE_DIR" ]] || die "Release existiert bereits und wird nie überschrieben: $RELEASE_DIR"

(
  cd "$REPO_ROOT"
  VITE_APP_FLAVOR=hufiapp npm run build
)

# Do not place recognised private-key or service-role material into a release.
if rg -l -i 'service_role|supabase_service_role|BEGIN (RSA |EC )?PRIVATE KEY' "$REPO_ROOT/dist" >/dev/null 2>&1; then
  die "Secret-Muster im Build-Artefakt erkannt"
fi

mkdir "$RELEASE_DIR"
cp -a "$REPO_ROOT/dist/." "$RELEASE_DIR/"
cat > "$METADATA_FILE" <<EOF
version=$VERSION
commit=$COMMIT
build_time_utc=$BUILD_TIME_UTC
flavor=$FLAVOR
target_domain=$TARGET_DOMAIN
EOF

echo "Release created: $RELEASE_DIR"
