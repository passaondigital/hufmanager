# Quarantänisierte Migrationen

Diese Dateien sind reine Audit-Artefakte und gehören **nicht** zur aktiven
Supabase-Migrationssequenz unter `supabase/migrations/`.

## `20260817114000_add_consume_inventory_stock_rpc.sql`

- Herkunft: Commit `67a1baea` der unveränderten 61er-Production-Historie.
- Status am 30.08.2026: nicht in Production registriert, Funktion
  `public.consume_inventory_stock(jsonb)` nicht in Production vorhanden und
  kein Aufruf im kanonischen HufManager-Slim-Frontend.
- Grund der Quarantäne: Lager ist nicht Teil der freigegebenen Slim-Produktlinie.
- Reaktivierung: nur in einem eigenen freigegebenen Lager-Task mit neuem
  Migrationszeitstempel, Schema-/RLS-/Berechtigungsreview und isolierten Tests.

Die Datei darf nicht nach `supabase/migrations/` kopiert oder durch ein
Release-/CI-Skript ausgeführt werden. Sie bleibt hier ausschließlich zur
Provenienz und späteren fachlichen Neubewertung erhalten.
