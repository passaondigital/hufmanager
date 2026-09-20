-- P1-1 correction (Codex Correction Pass 4 rereview): Autoflow-Idempotenz.
--
-- Befund: supabase/functions/autoflow-auto-invoice prüfte erst per SELECT, ob
-- für einen Termin schon eine Rechnung verlinkt ist, und legte danach Rechnung
-- + Verknüpfung an. Das ist ein Check-then-create-Race: zwei gleichzeitige
-- Events (Completion UND Signature, ein doppelt gefeuerter Trigger, ein
-- pg_net-Retry) lesen beide "noch keine Rechnung" und legen beide eine an.
-- Die einzige vorhandene Eindeutigkeit ist UNIQUE (invoice_id, appointment_id)
-- (20260127120042_...sql) — die verhindert nur, dass DERSELBE Termin zweimal
-- an DIESELBE Rechnung gehängt wird, nicht zwei Rechnungen für denselben
-- Termin.
--
-- Warum KEIN blankes UNIQUE (appointment_id):
-- Die Tabelle ist laut ihrer eigenen Migration als Batch-Verknüpfung gebaut
-- ("link multiple appointments to one invoice"). N Termine → 1 Rechnung bliebe
-- mit UNIQUE (appointment_id) zwar erlaubt, aber 1 Termin → N Rechnungen wäre
-- damit für immer verboten. Das trifft legitime manuelle Fälle:
--   - Storno + Neuausstellung für denselben Termin
--   - Teilrechnungen / nachträglich berechnetes Material zum selben Termin
-- Diese Fälle sind fachlich erlaubt und dürfen nicht durch eine
-- Idempotenz-Korrektur mitverboten werden.
--
-- Deshalb der dedizierte Autoflow-Key: die Eindeutigkeit gilt ausschließlich
-- für automatisch erzeugte Verknüpfungen. Vertrag:
--   "Ein appointment_id darf höchstens genau eine AUTOMATISCH erzeugte
--    Invoice-Zuordnung haben."
-- Manuelle Verknüpfungen (source IS NULL) bleiben unbeschränkt.
--
-- Datenlage geprüft (PROD vnschgjxkzzwzefqlrji, nur lesend, 2026-09-17):
-- invoice_appointments ist leer (0 Zeilen, 0 distinct appointment_id) — es gibt
-- heute überhaupt keinen produktiven Schreibpfad auf diese Tabelle
-- (repo-weite Suche: nur HorseMaterialHistory.tsx liest sie). Der Index kann
-- also nicht an Altdaten scheitern und verbietet auch keine existierende
-- Praxis.
--
-- Race-/Retry-Sicherheit entsteht NICHT durch den SELECT im Edge-Code, sondern
-- durch diesen Unique-Index: der zweite parallele Writer blockiert bis zum
-- Commit des ersten und läuft dann in eine unique_violation. Da die Rechnung
-- in derselben Transaktion (create_invoice_with_items_for_provider) angelegt
-- wird, rollt dieser Fehler die Rechnung mit zurück — es bleibt keine
-- Doppelrechnung und auch keine kopflose Verknüpfung übrig.
--
-- PREPARED ONLY: nicht angewendet (Correction Pass 5 — PRODUCTION_BACKEND_
-- CHANGED=NO). Keine bestehende Spalte, Policy oder Constraint wird geändert;
-- es kommt nur eine nullable Spalte und ein partieller Index dazu.

ALTER TABLE public.invoice_appointments
  ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.invoice_appointments.source IS
  'Herkunft der Verknüpfung. NULL = manuell/Legacy (unbeschränkt). ''autoflow'' = von autoflow-auto-invoice automatisch erzeugt; dafür gilt genau eine Verknüpfung pro Termin (idx_invoice_appointments_autoflow_unique).';

-- Der eigentliche Idempotenz-Schlüssel.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_appointments_autoflow_unique
  ON public.invoice_appointments (appointment_id)
  WHERE source = 'autoflow';

-- Der bestehende Index deckt nur invoice_id ab; die Duplikatsprüfung des Edge-
-- Codes und der Unique-Index lesen über appointment_id.
CREATE INDEX IF NOT EXISTS idx_invoice_appointments_appointment
  ON public.invoice_appointments (appointment_id);
