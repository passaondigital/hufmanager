# Drive-Sync-Paket — Final-Release-Sprint 28.09.2026

Der Drive-Connector kann in dieser Umgebung Dateien **anlegen und lesen**, aber den **Inhalt bestehender Docs nicht bearbeiten**.
Neu in Drive angelegt (Ordner der HufManager-Slim-Docs): „HufManager Final Release Report – 2026-09-28“ (= `HUFMANAGER_FINAL_RELEASE_REPORT_2026-09-28.md`).
Folgende bestehende Dokumente bitte 1:1 ergänzen (Quelle der Wahrheit bleibt GitHub):

## HM-CodeDoku (1LiKmZsCrArrxa9KS2hfyeCbA9zIxRWjXvJ9PeQrEAy4) — neuer Abschnitt „Stand 28.09.2026 spät“
- PROD: Frontend `ceacdcb4`, admin-create-user v136, Migration-Head `20260929120000`.
- Neue Spalte `profiles.account_class` (real|demo|qa|test_fixture, Default real, nur Admin/service_role, kein Zugangskriterium).
  Business-KPIs, Umsatz und Grandfather-Auswertung zählen nur `real`. Mission Control: Filter + Kontoart bei Anlage.
- Supabase-Client HufManager: tab-eigener Auth-Schlüssel `sb-<ref>-tab-<id>-auth-token` (Web-Lock/Broadcast pro Tab).
- Termin-Status offen = `planned` (DB-Trigger lehnt `scheduled` ab). Rechnung `customer_type` ∈ privat|gewerbe|kleinunternehmer.
- `tailwind.config.js` ist die aktive Tailwind-Konfiguration; neutrale Tokens folgen jetzt den Theme-Variablen.
- HufManager fragt `get_product_membership_context` nicht mehr ab (Splitter auf PROD nie angewendet).

## HufManager Master Auth (1a8-8Nh8UttY1CAVfy_VpoBOz35-LGdaV5cY1tQDD88o)
- Status 28.09. spät: Login/Logout/Reload/Multi-Tab PASS; Tab-Lock-Fix live.
- OFFEN (Owner, Dashboard): Confirm Email ist AUS (`mailer_autoconfirm=true`); Site URL auf `https://app.hufmanager.de`;
  Template „Confirm signup“ auf `{{ .ConfirmationURL }}` mit Redirect `app.hufmanager.de` prüfen; danach Signup→Confirm→Login-E2E.
- Einladung admin-create-user: Support-Adresse jetzt `support@hufmanager.de`. Zustellung `info@` weiter Spam → DMARC (`p=none`) / Absender prüfen.

## Pricing/Trial/Billing (CODEX – HufManager Slim Pricing, Trial & Billing Go-Live, 132Xb4j6Z_pMNZWXB0O6-1Efx1EumcmcaIgfx9ThzAAk)
- Trial-Banner ab Tag 1 (Resttage, Enddatum, „Jetzt HufManager freischalten – 19,95 €/Monat“) → Abo-Seite → PricingModal (Widerrufs-Zustimmung) → CopeCart `3a97bd25`.
- Abo-Seite zeigt nur noch den Slim-Zustand aus product_entitlements (kein „Starter/Upgrade“).
- Manual Access: Lifetime / Barzahlung / Beta über kanonischen Writer, Enddatum = letzter gültiger Tag (Europe/Berlin).
- OFFEN: echter Kauf-E2E (Owner).

## Audit/Release (00_START_HIER, 14_RELEASE_GOVERNANCE_PREP)
- Gates und offene Punkte siehe Release-Report §3–§4. P0 = 0. SALE_READY = NO bis P1 1–2 erledigt.
- Echte Grandfather-Provider = 19 (nicht 28). „Lifetime ohne Beleg“ = offizielles Demo-Konto.
