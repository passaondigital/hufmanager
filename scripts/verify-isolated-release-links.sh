#!/usr/bin/env bash
# Exercises current/previous links only under an explicit /tmp test root.
set -euo pipefail

die() { echo "ABBRUCH: $*" >&2; exit 1; }

TEST_ROOT=""
while (($#)); do
  case "$1" in
    --test-root) TEST_ROOT="${2:-}"; shift 2 ;;
    --help|-h) echo "Usage: $0 --test-root /tmp/..."; exit 0 ;;
    *) die "unbekanntes Argument: $1" ;;
  esac
done

[[ -n "$TEST_ROOT" ]] || die "--test-root ist erforderlich"
TEST_ROOT="$(realpath -m "$TEST_ROOT")"
[[ "$TEST_ROOT" == /tmp/* ]] || die "Symlink-Test ist ausschließlich unter /tmp erlaubt"

RELEASES="$TEST_ROOT/releases"
FIRST="$RELEASES/first"
SECOND="$RELEASES/second"
mkdir -p "$FIRST" "$SECOND"
printf 'first\n' > "$FIRST/marker"
printf 'second\n' > "$SECOND/marker"
ln -sfn "releases/first" "$TEST_ROOT/current"
ln -sfn "releases/first" "$TEST_ROOT/previous"
ln -sfn "releases/second" "$TEST_ROOT/current"
[[ "$(cat "$TEST_ROOT/current/marker")" == second ]] || die "current zeigt nicht auf second"
ln -sfn "releases/first" "$TEST_ROOT/previous"
echo "Symlink test prepared: current=$(readlink "$TEST_ROOT/current"), previous=$(readlink "$TEST_ROOT/previous")"
