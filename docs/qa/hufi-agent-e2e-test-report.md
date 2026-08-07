# Hufi-App — Agentenbasierte E2E-QA-Bericht

> Ausführlich, aber reine Testdokumentation — keine Fixes in dieser Runde.
> Zugehörige Testmatrix: `docs/qa/hufi-agent-e2e-test-matrix.md`

## 1. Testdatum
2026-08-02

## 2. Getestete Umgebung
- Ziel laut Auftrag: `https://preview.hufiapp.de` — nicht direkt erreichbar, da HTTP-Basic-Auth-geschützt und das Passwort dem Agenten bewusst nicht zugänglich ist (`docs`-Memory: „never read/print its contents or hash").
- Stattdessen getestet: lokaler Vite-Preview-Build (`http://127.0.0.1:4175`), der über das Skript `update-hufi-preview` (`npm run build` + `rsync`) exakt denselben `dist/`-Stand liefert, der zuletzt auf preview.hufiapp.de synchronisiert wurde, gegen dieselbe (einzige existierende) Hufi-Datenbank.
- Zusätzlich kurzzeitig ein lokaler `vite dev`-Server (Port 4176) gestartet, um einen Fehler mit vollem Stacktrace zu diagnostizieren (Konsolen-Logging ist im Produktions-/Preview-Build durch `esbuild drop:["console"]` bewusst entfernt). Dev-Server wurde nach der Diagnose beendet, keine Datei geändert.
- Browser-Automatisierung: Claude-in-Chrome-Erweiterung war in dieser Umgebung nicht verbunden (zweimal geprüft). Ersatzweise **echte** Browser-Automatisierung über systemweit installiertes Playwright (`/usr/lib/node_modules/playwright`, Chromium) — kein Erfinden von Ergebnissen, sondern tatsächlich ausgeführte Login-/Klick-/Screenshot-Sessions.

## 3. Verwendete Demo-Rollen
- Hufbearbeiter (Provider): `hufbearbeiter.hufmanager@gmail.com`
- Partner (Therapeut/Tierärztin): `partner.hufmanager@gmail.com`
- Pferdebesitzerin (Client): `pferdebesitzer.hufmanager@gmail.com`
- Kein neuer Auth-Account angelegt. Kein Mitarbeiter-Demo-Account (wie vorgegeben) — Mitarbeiter-Perspektive rein per Code-/RLS-Review.

## 4. Getestete Daten
2 Demo-Kunden, 4 mit `[DEMO]` gekennzeichnete Demo-Pferde, bestehende Demo-Verknüpfung Hufbearbeiter↔Partner — alle aus der vorherigen Session-Runde, in dieser Runde nur gelesen/verwendet, nicht verändert (siehe Abschnitt 9 in der Matrix: Datenkonsistenz vollständig verifiziert).

## 5. Testmatrix
Siehe `docs/qa/hufi-agent-e2e-test-matrix.md` für die vollständige, tabellarische Übersicht.

## 6. Bestandene Flows
- Login für alle drei getesteten Rollen.
- Kundenliste (Hufbearbeiter-Sicht): beide Demo-Kunden korrekt mit Fach-ID, Pferdeanzahl, EQIDs je Pferd.
- Alle 4 Demo-Pferde einzeln über `/pferd/:id` öffenbar, korrekte Anzeige (Name, Rasse, Geschlecht, Besitzer, EQID, kein UUID-Leak).
- Echte Pferdesuche im `/hufi-observation-lab`: exact, ambiguous (alle 4 Demo-Pferde korrekt als mehrdeutig erkannt, mit Besitzername zur Unterscheidung), not_found, EQID-Suche, Groß-/Kleinschreibung — alle korrekt.
- „Abbrechen" im Proposal-Flow führt sauber zurück zum Eingabeformular.
- Tab-Reihenfolge im Beobachtungsformular logisch, deutliche Fokus-Ringe auf allen interaktiven Elementen.
- Partner-Route-Guard verhindert strukturell den Zugriff auf `/kunden` (Redirect), RLS verhindert laut Code-Review eine Sichtbarkeit fremder Daten.
- Pferdebesitzer-Perspektive (Fork B, echter Login): eigene Pferde sichtbar, Zugriffs-/Freigabeseite mit granularen Rechten und DSGVO-Hinweis — positiv bewertet.
- Datenkonsistenz der Demo-Daten vollständig bestanden (Fork A).

## 7. Blockierte Flows
- **Partner-Startseite (`/partner-home`) und alle 19 nachgelagerten Partner-Routen**: kompletter Absturz auf eine generische Fehlerseite unmittelbar nach Login. Siehe P0-1.
- **Mitarbeiter-Zugriff auf Pferdedaten**: strukturell leer (RLS-Lücke), nicht per UI blockiert im Sinne einer Fehlermeldung, sondern durch stillschweigend leere Datensätze — funktional aber ebenso „blockiert". Siehe P1-1.

## 8. P0-Funde (kritisch)

| ID | Bereich | Beschreibung |
|---|---|---|
| P0-1 | Partner-Frontend | `src/components/partner/PartnerAppLayout.tsx` exportiert die Komponente nur als **named export** (`export function PartnerAppLayout()`), nicht als `export default`. `src/App.tsx:211` lädt sie aber per `lazy(() => import("@/components/partner/PartnerAppLayout"))` — React erwartet dabei zwingend einen `default`-Export. Ergebnis: `module.default` ist `undefined`, React versucht eine Warnung dazu auszugeben, und genau dabei tritt ein zweiter, unabhängiger Fehler auf (`TypeError: Cannot convert object to primitive value` beim Formatieren der React-Warnung) — die Kombination reißt die gesamte `ErrorBoundary` mit sich. **Betroffen: alle 19 unter dieser Layout-Route verschachtelten Partner-Routen** (`/partner-home`, `/partner-pferde`, `/partner-kunden`, `/partner-calendar`, … — vollständige Liste in `src/App.tsx:675-699`). Jeder reale Partner-/Therapeuten-Account ist davon betroffen, nicht nur der Demo-Account. Reproduziert mit Stacktrace gegen einen temporären Dev-Server (im Preview-/Produktions-Build durch `esbuild drop:["console"]` unsichtbar — das eigentliche Symptom im Preview-Build ist nur die generische „Etwas ist schiefgelaufen"-Seite ohne jeden Hinweis). Screenshot: `docs/qa/screenshots/partner-home-crash.png`. |

## 9. P1-Funde (hoch)

| ID | Bereich | Beschreibung |
|---|---|---|
| P1-1 | Mitarbeiter/RLS | Keine der aktuellen `horses`-RLS-Policies (SELECT/INSERT/UPDATE/DELETE) bezieht `employee_profiles` ein — nur `owner_id`, `access_grants` (Provider) oder `is_admin()`. Gleichzeitig existiert vollständiger Mitarbeiter-Frontend-Code (`src/pages/employee/EmployeeHorseDetail.tsx` u. a.), der Pferdedaten client-seitig (also RLS-gebunden) lädt. Ein eingeloggter Mitarbeiter bekäme beim Öffnen eines Arbeitgeber-Pferdes strukturell keine Daten zurück. Bestätigt live gegen `pg_policies` (Fork B, Agent 4). |
| P1-2 | RLS `horses`-INSERT (aus vorheriger Session-Untersuchung, hier weiterhin gültig und relevant für Produktreife) | Fehlende Rückfalloption über `profiles.created_by_provider_id` in der aktiven `horses`-INSERT-Policy — betraf zum Zeitpunkt der Prüfung ca. 17 % der providererstellten Kunden (5 von 29), bei denen `access_grants` aus ungeklärter Ursache inaktiv wurde. |
| P1-3 | Sicherheit, `search_horse_by_readable_id()` (aus vorheriger Session-Untersuchung) | Keine Autorisierungsprüfung gegen den tatsächlichen Pferdezugriff des Aufrufers — jeder eingeloggte Nutzer kann Name/Foto/Rasse/`owner_id` eines beliebigen Pferds per erratener EQID abfragen. Für den in dieser Runde gebauten/getesteten Observation-Flow bewusst umgangen (eigene RLS-gebundene Query statt dieser RPC), bleibt aber ein produktweites Risiko. |

## 10. P2-Funde (mittel)

| ID | Bereich | Beschreibung |
|---|---|---|
| P2-1 | UI/Accessibility, `src/components/ui/alert.tsx:12` | Die `destructive`-Variante der `Alert`-Komponente setzt `text-destructive`, aber **keine Hintergrundfarbe**. Auf dunklem Seitenhintergrund (bestätigt sowohl mit `colorScheme:"light"` als auch `"dark"` erzwungen — das Verhalten ist unabhängig vom Farbschema) wird der Text nahezu unlesbar. Betrifft direkt die vom Auftrag geforderte durchgängige Sichtbarkeit von „Entwicklung — keine Speicherung" und potenziell **jede** andere Stelle der App, die `<Alert variant="destructive">` verwendet. Screenshots: `docs/qa/screenshots/observation-lab-desktop-contrast-bug.png`, `.../observation-lab-mobile-contrast-bug.png`. |
| P2-2 | Mobile UI, `ObservationProposalLab.tsx` | Button-Beschriftung „Vorschlag erzeugen (echte Pferdesuche)" wird bei 390 px Breite abgeschnitten statt umzubrechen. |
| P2-3 | Demo-Datenmodell | Der in der vorherigen Runde angelegte Partner↔Hufbearbeiter-`access_grants`-Eintrag bildet den Partner als generischen „Klienten" ab, nicht den echten, horse-basierten Freigabepfad (`horse_partner_access` + `has_horse_partner_access()`). Für diesen Account existieren 0 Zeilen in `horse_partner_access`. Das aktuelle Demo-Setup testet damit nicht den in der Praxis relevanten „Tierarzt bekommt gezielt Zugriff auf ein fremdes Pferd"-Fall. |
| P2-4 | Fehlermeldungs-Hygiene | `src/components/customers/AddHorseModal.tsx:138` und `src/pages/Kunden.tsx:170` zeigen `error.message`/`err.message` ungefiltert im Toast an. Bei einer Trigger-Exception (z. B. dem bekannten `"Demo accounts cannot be connected to real accounts"`-Fall) landet der rohe Postgres-Fehlertext beim Nutzer. |
| P2-5 | Onboarding, Pferdebesitzer-Sicht | Ein Tour-/Onboarding-Modal erscheint auf `/client-horses` bei jedem Login erneut und blockiert Klicks auf Pferdekarten, bis es geschlossen wird. |
| P2-6 | Sicherheit, `is_provider_for_horse()` (aus Vorsession, hier erneut bestätigt) | `_provider_id` ist nicht an `auth.uid()` gebunden — ein Autorisierungs-Orakel (Boolean, kein direkter Datenleak), aber architektonisch unsauber. |

## 11. P3-Funde (niedrig)
- **P3-1**: Im Full-Page-Mobile-Screenshot der Kundenliste wirkt eine Kundenkarte („mimi stall") von der fixierten unteren Navigationsleiste/dem Mikrofon-Button überlagert. Sehr wahrscheinlich ein Artefakt der Vollseiten-Screenshot-Technik bei `position:fixed`-Elementen, nicht abschließend als echter Anzeigefehler verifiziert — sollte bei einer echten Scroll-Interaktion manuell nachgeprüft werden.
- **P3-2**: Die Bezeichnung „Fachpartner-Zugriffe" auf der Kunden-Freigabeseite und der in dieser QA angelegte Partner-als-Klient-Datensatz können begrifflich verwechselt werden (siehe P2-3) — reine Doku-/Terminologie-Klarstellung für künftige Testrunden.

## 12. Sicherheitsbefunde
Siehe P1-3, P2-3, P2-4, P2-6 oben. Zusätzlich bestätigt (nichts Neues, aber verifiziert): keine Mandantenüberschreitung zwischen den beiden Demo-Kunden gefunden, keine interne UUID in den geprüften UI-Texten oder Fehlermeldungen sichtbar.

## 13. Berechtigungsbefunde
- Hufbearbeiter: volle erwartete Sicht auf eigene Kunden/Pferde.
- Partner: Route-Guard funktioniert (kein Zugriff auf Provider-Bereiche), aber die eigene Zielseite ist wegen P0-1 nicht nutzbar — Berechtigungslogik selbst konnte wegen des Absturzes nicht inhaltlich (nur strukturell per RLS-Review) geprüft werden.
- Pferdebesitzerin: Zugriffsübersicht vorbildlich umgesetzt (granulare Rechte, Widerruf-Möglichkeit, DSGVO-Hinweis).
- Mitarbeiter: RLS-Lücke, siehe P1-1.

## 14. Mobile-Befunde
390×844 getestet (Kundenliste, Observation-Lab, Pferdedetail). Kein horizontales Scrollen gefunden. Zwei konkrete Funde: P2-1 (Kontrast) und P2-2 (Button-Textabschnitt). P3-1 als unbestätigter Verdacht.

## 15. Accessibility
Fokus-Reihenfolge im Beobachtungsformular logisch und mit klar sichtbaren Fokus-Ringen (weiß/blau, guter Kontrast) — positiver Befund. Kein echtes Screenreader-Testing durchgeführt (nur programmatische Fokus-/Style-Prüfung), daher keine Aussage zu ARIA-Namen im eigentlichen Sinn möglich.

## 16. Identitäts-/EQID-Befunde
Alle getesteten Horse-Resolution-Zustände (exact, ambiguous, not_found, EQID-Suche, Groß-/Kleinschreibung) funktionieren wie in der Vorsession implementiert und dokumentiert. `eqid` vs. `readable_id`: UI zeigt ausschließlich das aktive `readable_id`/EQID-Format, keine Anzeige der toten `eqid`-Spalte oder einer internen UUID gefunden — konsistent mit der früheren Analyse in `docs/hufi-id-system-analysis.md`.

## 17. Observation-Flow
Text-Eingabe → echte Pferdesuche → Proposal-Vorschau → Abbrechen: vollständig funktionsfähig getestet. „Bestätigen (simuliert)" wurde **bewusst nicht geklickt** (Auftrag: keine Observation speichern) — die Abwesenheit einer Schreiboperation ist zusätzlich durch den Code selbst abgesichert (`simulate-execution.ts` importiert kein Supabase-Modul, siehe Vorsession-Audit).

## 18. Hufi Assistant
Nicht Teil dieser Testrunde — nur der isolierte `/hufi-observation-lab`-Bereich wurde geprüft, nicht der produktive Chat-/Voice-Assistent (`hufi-agent`). Als „nicht getestet" zu behandeln, nicht als „funktioniert".

## 19. Produktreife
Aus Sicht eines zahlenden Pferdeprofis (Bewertung durch Fork B, Agent 10): Kunden-/Pferdeverwaltung mit klarer Rollentrennung und eine vorbildlich umgesetzte Zugriffs-/Freigabeseite wirken bereits professionell. Das Mitarbeiter-Feature (P1-1) und Teile des ID-Systems wirken dagegen wie unfertiger Prototyp. Ein Preis von 29,95 €/Monat konnte im Code nicht verifiziert werden (nicht in `PricingV2.tsx` gefunden) — hierzu keine belastbare Aussage möglich.

## 20. Top-10-Prioritäten
1. P0-1 — Partner-App-Absturz beheben (fehlender `default export`).
2. P1-1 — Mitarbeiter-RLS auf `horses` schließen oder Mitarbeiter-Feature vorerst ausblenden.
3. P1-2 — `horses`-INSERT-Policy um `created_by_provider_id`-Rückfalloption ergänzen.
4. P1-3 — `search_horse_by_readable_id()` um Autorisierungsprüfung ergänzen.
5. P2-1 — `Alert variant="destructive"` Hintergrundfarbe ergänzen (app-weiter Kontrastfehler).
6. P2-4 — Rohe `error.message` in Kunde-/Pferd-anlegen-Toasts durch nutzerfreundliche Meldungen ersetzen.
7. P2-2 — Mobile Button-Beschriftung im Observation-Lab umbruchfähig machen.
8. P2-6 — `is_provider_for_horse()` an `auth.uid()` binden.
9. P2-5 — Onboarding-Modal nicht bei jedem Login erneut erzwingen.
10. eqid/readable_id-Aufräumung (aus Vorsession, weiterhin offen) — eine Quelle der Wahrheit für Pferde-IDs.

## 21. Empfohlene Reparaturreihenfolge
P0-1 zuerst (kompletter Rollenausfall, technisch trivial zu beheben — eine Export-Zeile). Danach P1-1 und P1-3 (Datenzugriffs-/Sicherheitslücken). Danach P1-2 (bereits in einer separaten Untersuchung dieser Session konkret vorbereitet). P2-Funde parallel/danach, da keiner davon einen Kernflow vollständig blockiert.

## 22. Nicht testbare Bereiche
- `preview.hufiapp.de` selbst (Basic-Auth) — nur der identische lokale Build getestet.
- Mitarbeiter-Rolle per echtem Login (kein Demo-Account angelegt, wie vorgegeben).
- Hufi Assistant / Chat-Voice-Flow (`hufi-agent`).
- Screenreader-Verhalten im eigentlichen Sinn.
- `archived`-Zustand der Pferdesuche (kein archiviertes Demo-Pferd vorhanden).
- Preis-/Abo-Seite inhaltlich.

## 23. Offene Fragen
- Ist P0-1 ein ganz frischer Regressionsfehler oder besteht er schon länger unbemerkt (da Konsole im Produktions-Build stumm geschaltet ist)? Ohne Fehler-Tracking (Sentry o. ä., im Code als „Future" vermerkt) nicht rückwirkend feststellbar.
- Soll das Partner-Demo-Setup um einen echten `horse_partner_access`-Eintrag ergänzt werden, um den tatsächlichen Freigabepfad zu testen (P2-3)?
- Ist ein Mitarbeiter-Feature für den Early-Access-Start überhaupt im Scope, oder kann P1-1 bis dahin zurückgestellt werden?

## 24. Go-/No-Go-Einschätzung für Early Access
**No-Go, solange P0-1 nicht behoben ist** — jeder eingeladene Partner/Therapeut trifft sofort auf eine tote App. Nach Behebung von P0-1 und P1-1/P1-3 (Kernzugriffs-/Sicherheitslücken) erscheint ein eingeschränkter Early-Access-Start für Solo-Provider (ohne Mitarbeiter, ohne Partner-Einladung) plausibel — die Kernflows Kunde/Pferd/Beobachtung sind in dieser Runde durchgehend sauber getestet worden.
