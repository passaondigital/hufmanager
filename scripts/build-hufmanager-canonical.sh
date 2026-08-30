#!/usr/bin/env bash
# Build + provenance only. No deployment, database command, or Edge operation.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_COMMIT="dd7d7faaddc6d10dc6b15d08449986ecaf93d56f"
cd "$REPO_DIR"

if ! git merge-base --is-ancestor "$BASE_COMMIT" HEAD; then
  echo "HUFMANAGER_BUILD=FAIL canonical base is not an ancestor" >&2
  exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "HUFMANAGER_BUILD=FAIL tracked worktree changes present" >&2
  exit 1
fi
if [[ "${VITE_APP_FLAVOR:-hufmanager}" != "hufmanager" ]]; then
  echo "HUFMANAGER_BUILD=FAIL VITE_APP_FLAVOR must be hufmanager" >&2
  exit 1
fi
if [[ -z "${VITE_SUPABASE_URL:-}" || -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  echo "HUFMANAGER_BUILD=FAIL VITE_SUPABASE_URL/PUBLISHABLE_KEY missing" >&2
  exit 1
fi

export VITE_APP_FLAVOR=hufmanager
export HUFMANAGER_BUILD_COMMIT="$(git rev-parse HEAD)"
export HUFMANAGER_BUILD_BRANCH="${GITHUB_HEAD_REF:-$(git branch --show-current)}"
npm run build
node scripts/hufmanager-build-provenance.mjs generate dist
echo "HUFMANAGER_BUILD=PASS"
