#!/usr/bin/env bash
# Rolls current back to previous only inside an explicit /tmp test root.
set -euo pipefail

die() { echo "ABBRUCH: $*" >&2; exit 1; }

TEST_ROOT=""
APPLY=false
while (($#)); do
  case "$1" in
    --test-root) TEST_ROOT="${2:-}"; shift 2 ;;
    --apply) APPLY=true; shift ;;
    --help|-h) echo "Usage: $0 --test-root /tmp/... --apply"; exit 0 ;;
    *) die "unbekanntes Argument: $1" ;;
  esac
done

[[ -n "$TEST_ROOT" ]] || die "--test-root ist erforderlich"
[[ "$APPLY" == true ]] || die "--apply ist erforderlich; kein impliziter Symlink-Wechsel"
TEST_ROOT="$(realpath -m "$TEST_ROOT")"
[[ "$TEST_ROOT" == /tmp/* ]] || die "Rollback ist ausschließlich unter /tmp erlaubt"

CURRENT="$TEST_ROOT/current"
PREVIOUS="$TEST_ROOT/previous"
[[ -L "$CURRENT" && -L "$PREVIOUS" ]] || die "current und previous müssen Symlinks sein"
PREVIOUS_TARGET="$(realpath -m "$PREVIOUS")"
[[ "$PREVIOUS_TARGET" == "$TEST_ROOT/releases/"* ]] || die "previous zeigt nicht auf ein isoliertes Release"

ln -sfn "releases/$(basename "$PREVIOUS_TARGET")" "$CURRENT"
echo "Rollback completed inside isolated test root: $CURRENT -> $(readlink "$CURRENT")"
