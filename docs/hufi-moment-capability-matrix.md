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
| Vergangene Vereinbarungen ("was hatten wir besprochen") | `create_note`/`get_client_overview` (falls Notizen dort enthalten) | — | Ja, wenn Notiz vorhanden und zuordenbar | garantierte Vollständigkeit | Verifikation, ob get_client_overview Notizen liefert | — |
| Suche im Verlauf ("wo war das") | `search_entity` + Kontext | Teilweise | Ja für Entitäten (Kunde/Pferd) | freitextliche Gesprächssuche über alle Sessions | Konversations-/Memory-Suche | — |
| Planung/Priorisierung ("wo fange ich an") | `get_appointments` + `get_invoice_history` | — | Ja (Kombination bestehender Reads, per Prompt-Anweisung) | dedizierte Prioritäts-Engine | — | — |
| Risikofragen ("was wenn Kunde nicht zahlt") | keine Tool-Anbindung nötig | Ja als allgemeine Einordnung | — | keine rechtliche/steuerliche Beratung (bewusst, siehe Kernregeln) | — | — |

**Wichtig:** Die Systemprompt-Erweiterung dieser Änderung liegt nur im
Quellcode der Edge Function. Ohne `supabase functions deploy` (hier
ausdrücklich nicht ausgeführt) verhält sich der produktive Agent
unverändert wie vor dieser Änderung.
