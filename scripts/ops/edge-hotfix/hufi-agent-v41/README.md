# hufi-agent v41 — BOLA-Hotfix auf Basis der Live-Fassung v40

**Basis:** exakt die auf PROD (`vnschgjxkzzwzefqlrji`) laufende Fassung v40
(`ezbr_sha256 311105af…`, Git-Blob = Commit `23a786df`). Gesichert unter
`~/hufmanager-backups/20260927-pre-hufi-agent-bola/functions/hufi-agent/` (SHA256SUMS).
Die Repo-Fassung `supabase/functions/hufi-agent/` ist eine spätere, nie deployte
Neufassung und wird hiermit NICHT deployt.

## Änderung (86 Diff-Zeilen, nur `index.ts`)
- `executeTool` bekommt den user-scoped Client (Anon-Key + Caller-JWT, RLS aktiv).
- `update_appointment` / `cancel_appointment`: UUID-Prüfung, `.eq("provider_id", providerId)`,
  RLS, Trefferprüfung per `.select("id")`. Kein Treffer → „Termin nicht gefunden oder kein Zugriff.",
  keine Mutation, keine Kundennachricht. Push nur nach echter Stornierung, nur an `client_id` der eigenen Zeile.
- `send_notification`: nur an Kunden mit aktivem, gültigem Grant zu diesem Betrieb.
- `get_horse_record`, `get_client_overview`, `search_entity`, `create_appointment`: unter RLS.
- Unverändert (bereits `provider_id`-gefiltert): `get_appointments`, `get_invoice_history`.
- `horse-knowledge.ts` unverändert.

## Tests
`test/run.sh <index.ts>` — Wegwerf-Postgres + PostgREST (nur 127.0.0.1) mit PROD-RLS, echter Code.
- Hotfix: 21/21 PASS
- Negativkontrolle Live-v40: 2/21 (fremde Termine änderbar/stornierbar inkl. Push, fremde Pferdeakte/Kundendaten lesbar)
- `deno check`: 8 Typfehler = identisch zur Live-Fassung (esm.sh-Generics), 0 neue

## Deploy (nur nach Owner-Freigabe)
Supabase-MCP `deploy_edge_function`, `name: hufi-agent`, `entrypoint_path: index.ts`,
`verify_jwt: false` (unverändert), Dateien `index.ts` + `horse-knowledge.ts` aus diesem Ordner.
Danach: Version = 41, `get_edge_function` → SHA256 von `index.ts` = Repo; Smoke mit QA-A/QA-B-JWT
(fremde Termin-UUID update/cancel → „kein Zugriff", eigener Termin → ok).

## Rollback
Dieselbe Deploy-Operation mit den Dateien aus dem Backup-Ordner (v40).
