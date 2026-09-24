# CopeCart-Secret-Rotation — Runbook (vorbereitet 24.09.2026, NICHT ausgeführt)

Ausführung nur durch Pascal (Supabase-Dashboard + CopeCart-Dashboard). Claude hat
keinen Zugriff auf Supabase-Secrets (kein CLI-Token) und kein CopeCart-Login.

## Warum konsistent
- `copecart-webhook` v165 prüft HMAC mit `COPECART_IPN_PASSWORD`.
- `hufi-data-core` v6 prüft HMAC mit `COPECART_DATACORE_SECRET`, **falls gesetzt**, sonst `COPECART_IPN_PASSWORD`.
- CopeCart signiert jede IPN mit **einem** Secret. Alle gesetzten Variablen müssen denselben Wert haben,
  sonst lehnt der jeweilige Endpoint echte Zahlungen mit 401 ab.

## Ablauf (ein Zeitfenster, ohne Pause dazwischen)
1. Supabase → Edge Functions → Secrets: nachsehen, ob `COPECART_DATACORE_SECRET` existiert (nur Name, Wert nicht nötig).
2. Neues Secret erzeugen (≥ 32 Zeichen, z. B. Passwortmanager).
3. CopeCart → Einstellungen → IPN/Webhook-Secret auf den neuen Wert setzen.
4. Supabase: `COPECART_IPN_PASSWORD` = neuer Wert.
5. Nur falls in Schritt 1 vorhanden: `COPECART_DATACORE_SECRET` = **derselbe** neue Wert.
6. In CopeCart eine Test-IPN auslösen (oder Testkauf).
7. Claude melden → Verifikation (read-only):
   - Supabase-Logs: `hufi-data-core` → 200, `copecart-webhook` → 200 (Body „OK“, keine Mutation, ack-only).
   - kein 401 „Signatur ungültig“ nach dem Wechsel.
   - `hufi_data_events` +1 (Testevent), `product_entitlements` unverändert (Test-IPN = `is_test`).

## Rollback
Alten Wert in CopeCart **und** in allen gesetzten Supabase-Variablen wiederherstellen.
