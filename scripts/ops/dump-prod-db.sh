#!/usr/bin/env bash
# Vollstaendiger Production-DB-Dump HufManager (vnschgjxkzzwzefqlrji) ueber den Session Pooler.
#
# Vertrag:
#   - rein lesend (pg_dump), keine Writes
#   - Passwort nur ueber /dev/tty, nur im Speicher, danach unset
#   - Ausgabe: custom-format (-Fc) + Verifikation (pg_restore --list, Groesse, sha256)
#   - Storage-Dateien (S3-Objekte) sind NICHT enthalten, nur storage.objects-Metadaten
set -euo pipefail

PGHOST_="aws-1-eu-central-1.pooler.supabase.com"
PGPORT_="5432"
PGUSER_="postgres.vnschgjxkzzwzefqlrji"
PGDATABASE_="postgres"

LABEL="${1:-manual}"
TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${HOME}/hufmanager-backups/${TS}-${LABEL}/db"
mkdir -p "$OUT_DIR"
chmod 700 "$(dirname "$OUT_DIR")"
DUMP="$OUT_DIR/hufmanager-prod-full-${TS}.dump"
LOG="$OUT_DIR/pg_dump.log"

echo "Ziel   : ${PGUSER_}@${PGHOST_}:${PGPORT_}/${PGDATABASE_} (sslmode=require, read-only)"
echo "Ausgabe: $DUMP"

if [ ! -r /dev/tty ]; then echo "ABORT: kein TTY."; exit 1; fi
printf 'Passwort fuer %s: ' "$PGUSER_" > /dev/tty
IFS= read -rs PGPASSWORD < /dev/tty
printf '\n' > /dev/tty
export PGPASSWORD
[ -n "$PGPASSWORD" ] || { unset PGPASSWORD; echo "ABORT: leeres Passwort."; exit 1; }
export PGSSLMODE=require

set +e
pg_dump --host="$PGHOST_" --port="$PGPORT_" --username="$PGUSER_" --dbname="$PGDATABASE_" \
  --no-password --format=custom --compress=6 --file="$DUMP" --verbose 2> "$LOG"
rc=$?
# Zeilenzahlen zum Abgleich, gleiche Verbindung, rein lesend
psql --host="$PGHOST_" --port="$PGPORT_" --username="$PGUSER_" --dbname="$PGDATABASE_" \
  --no-password -At -c "select 'profiles',count(*) from public.profiles union all
    select 'horses',count(*) from public.horses union all
    select 'appointments',count(*) from public.appointments union all
    select 'invoices',count(*) from public.invoices union all
    select 'access_grants',count(*) from public.access_grants union all
    select 'auth.users',count(*) from auth.users union all
    select 'ledger_max',max(version)::bigint from supabase_migrations.schema_migrations" \
  > "$OUT_DIR/rowcounts-at-dump.txt" 2>>"$LOG"
set -e
unset PGPASSWORD

echo "PG_DUMP_EXIT=$rc"
if [ "$rc" -ne 0 ]; then echo "FEHLER – letzte Logzeilen:"; tail -20 "$LOG"; exit "$rc"; fi

TOC_ENTRIES=$(pg_restore --list "$DUMP" | grep -vc '^;')
TABLE_DATA=$(pg_restore --list "$DUMP" | grep -c 'TABLE DATA')
SIZE=$(stat -c %s "$DUMP")
SHA=$(sha256sum "$DUMP" | cut -d' ' -f1)
{
  echo "file=$DUMP"; echo "size_bytes=$SIZE"; echo "sha256=$SHA"
  echo "toc_entries=$TOC_ENTRIES"; echo "table_data_entries=$TABLE_DATA"
  echo "created=$TS"; echo "pg_dump=$(pg_dump --version)"
} | tee "$OUT_DIR/DUMP_VERIFY.txt"
( cd "$OUT_DIR" && sha256sum "$(basename "$DUMP")" > SHA256SUMS )
echo "--- rowcounts-at-dump.txt"; cat "$OUT_DIR/rowcounts-at-dump.txt"
echo "DUMP_OK=YES"
