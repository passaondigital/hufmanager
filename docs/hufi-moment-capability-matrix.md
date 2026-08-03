# Hufi-Moment — ehrliche Fähigkeitsmatrix

Interne Produktwahrheit, keine Nutzeroberfläche. Basis: die tatsächlich in
`supabase/functions/hufi-agent/index.ts` definierten Tools (Stand dieser
Änderung, noch **nicht deployt**):
`search_entity`, `get_appointments`, `get_horse_record`,
`get_client_overview`, `get_invoice_history`, `send_notification`,
`create_appointment`, `update_appointment`, `cancel_appointment`,
`create_invoice`, `create_note`, `create_horse`, `create_contact`,
`add_expense`.

| Moment/Frage | Echte Datenquelle | Heute vollständig möglich | Heute teilweise möglich | Noch nicht möglich | Benötigte Anbindung | Schreibend + Bestätigungspflicht |
|---|---|---|---|---|---|---|
| Buchhaltung ("ich sitze an der Buchhaltung") | `get_invoice_history`, `add_expense` | — | Ja (Rechnungsstatus, Ausgaben erfassen) | Übersicht "offene Belege"/Kassenbuch als Ganzes | dediziertes Buchhaltungs-Tool/-Query | Ja (add_expense) |
| Belege | — | — | — | Ja | Beleg-Erfassung/-Ablage existiert im Agent-Tooling nicht | — |
| Rechnung | `create_invoice`, `get_invoice_history` | Ja (Status abfragen, Entwurf erstellen) | — | — | — | Ja |
| Angebot | — | — | — | Ja | kein Angebots-Tool vorhanden | — |
| Termin (inkl. vergangene) | `get_appointments`, `create/update/cancel_appointment` | Ja | — | — | — | Ja (create/update/cancel) |
| Kundschaft | `search_entity`, `get_client_overview`, `create_contact` | Ja | — | — | — | Ja (create_contact) |
| Pferde | `search_entity`, `get_horse_record`, `create_horse` | Ja | — | — | — | Ja (create_horse) |
| Beobachtung | `create_note` | Teilweise (Schreiben ja) | Lesen/Abrufen vorheriger Notizen unklar (kein `get_notes`-Tool) | strukturierte Beobachtungshistorie | Lese-Tool für Notizen | Ja (create_note) |
| Vergangene Vereinbarungen ("was hatten wir besprochen") | `hufi_memory` über neues Tool `search_memory` (real, Supabase geprüft: Tabelle existiert, RLS aktiv, `create_note` schreibt bereits dorthin) | Ja, wenn als Notiz gespeichert | — | Vollständigkeit hängt davon ab, ob je eine Notiz erstellt wurde | — | Nein (reines Lese-Tool) |
| Suche im Verlauf ("wo war das") | `search_entity` (Entitäten) + `search_memory` (Notizen/Präferenzen) | Teilweise | Ja für Entitäten und gespeicherte Notizen | Volltextsuche über rohe Chat-Transkripte (nicht gespeichert) | Konversations-Logging müsste erst persistiert werden | — |
| Planung/Priorisierung ("wo fange ich an") | `get_appointments` + `get_invoice_history` | — | Ja (Kombination bestehender Reads, per Prompt-Anweisung) | dedizierte Prioritäts-Engine | — | — |
| Risikofragen ("was wenn Kunde nicht zahlt") | keine Tool-Anbindung nötig | Ja als allgemeine Einordnung | — | keine rechtliche/steuerliche Beratung (bewusst, siehe Kernregeln) | — | — |

## Real gegen Produktionsschema geprüft (read-only, `vnschgjxkzzwzefqlrji`)

- `hufi_memory` (83 Zeilen) — echt, RLS aktiv, bereits von `create_note`
  (Schreiben) und dem automatischen Kontext-Block (Top-4 aktuellste
  Einträge) genutzt. Neues Tool `search_memory` durchsucht jetzt darüber
  hinaus gezielt nach Stichwort.
- `offers`, `quotes`, `offer_materials` — Tabellen existieren, aber
  **0 Zeilen, kein Schreibpfad irgendwo im Produkt** (nicht in
  `hufi-agent`, keine UI-Stelle gefunden). Ein Lese-Tool dafür würde
  nichts finden können — kein Fix in diesem Umfang, da erst eine
  Angebots-Erfassung fehlt, nicht nur ein Agent-Werkzeug.
- `expenses` — real angebunden über `add_expense` (Schreiben), aktuell
  0 Zeilen (noch nicht genutzt).
- `hufi_observations` — existiert, aber ist ein Verhaltens-/Lernmuster-
  Tracker (`observation_type`, `pattern`, `occurrence_count`) für den
  bestehenden Lern-Loop, **nicht** die Huf-/Pferde-Beobachtung, die
  Nutzer mit "Beobachtung erfassen" meinen — die läuft über `create_note`.

## Wichtig

Die Systemprompt-Erweiterung und `search_memory` liegen nur im
Quellcode der Edge Function, bis zu einem tatsächlichen
`supabase functions deploy` für `hufi-agent` (Status siehe
Abschlussbericht dieser Session).
