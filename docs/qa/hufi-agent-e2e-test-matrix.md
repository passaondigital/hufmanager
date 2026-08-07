# Hufi-App — E2E-Testmatrix (agentenbasierte QA)

> Stand: 2026-08-02. Zugehöriger Bericht: `docs/qa/hufi-agent-e2e-test-report.md`.
> Legende Status: ✅ bestanden · ❌ blockiert/fehlgeschlagen · ⚠️ bestanden mit Einschränkung · ➖ nicht testbar in dieser Runde.

## 1. Umgebung & Accounts

| Prüfung | Status | Kommentar |
|---|---|---|
| Zielumgebung identifiziert | ✅ | Nur eine Hufi-Datenbank existiert (`vnschgjxkzzwzefqlrji`), von preview.hufiapp.de und hufiapp.de gemeinsam genutzt |
| `preview.hufiapp.de` direkt angesteuert | ➖ | Basic-Auth-geschützt, Passwort dem Agenten nicht zugänglich (bewusst) — stattdessen identischer lokaler Preview-Build (`127.0.0.1:4175`, per `update-hufi-preview` synchronisiert) getestet |
| Login Hufbearbeiter (`hufbearbeiter.hufmanager@gmail.com`) | ✅ | Redirect zu `/home`, keine Konsolenfehler |
| Login Partner (`partner.hufmanager@gmail.com`) | ⚠️ | Login selbst erfolgreich, Zielseite `/partner-home` stürzt ab (siehe P0-1) |
| Login Pferdebesitzer (`pferdebesitzer.hufmanager@gmail.com`) | ✅ | Redirect zu `/client-home`, getestet durch Fork B |

## 2. Datenkonsistenz (Agent 9)

| Prüfung | Status | Kommentar |
|---|---|---|
| Genau 2 Demo-Kunden | ✅ | Demo-Kundin (KID-DEMO01), Demo-Tierärztin (PRID-DEMO01) |
| Je genau 2 `[DEMO]`-Pferde pro Kunde | ✅ | Demo-Kundin hat zusätzlich 1 reguläres Altpferd „Sunny" — kein Fehler |
| EQIDs eindeutig | ✅ | Keine Kollision in der gesamten `horses`-Tabelle |
| `access_grants` Hufbearbeiter↔beide Demo-Accounts aktiv | ✅ | je 1 Zeile, `is_active=true`, `status='active'` |
| Keine Waisen/Duplikate aus vorherigen Testläufen dieser Session | ✅ | Verifiziert, Cleanup vollständig |
| `special_notes` bei allen 4 Demo-Pferden gesetzt | ✅ | „TESTDATENSATZ - NICHT ECHT..." |

## 3. Hufbearbeiter-Perspektive (Agent 1 / 5)

| Prüfung | Status | Kommentar |
|---|---|---|
| Login + Startseite | ✅ | |
| Kundenliste zeigt beide Demo-Kunden | ✅ | Mit Fach-ID, Telefon, Pferdeanzahl |
| Namen/Rollen/Fach-IDs korrekt angezeigt | ✅ | `#KID-DEMO01`, `#PRID-DEMO01`, `#EQID-...` je Pferd |
| Demo-Kunde öffnen | ✅ (Liste), ➖ (Detailseite nicht einzeln geöffnet — Karten sind primär Listen-Widgets) | |
| Alle 4 Demo-Pferde einzeln öffnen | ✅ | `/pferd/:id`, Name/Rasse/Geschlecht/Besitzer/EQID korrekt, keine UUID sichtbar |
| `/hufi-observation-lab` lädt | ✅ | „Entwicklung — keine Speicherung" textlich vorhanden |
| Banner „Entwicklung — keine Speicherung" klar erkennbar | ❌ | Kontrastfehler, siehe P2-1 — Text technisch vorhanden, aber kaum lesbar |
| Pferdesuche: exact | ✅ | „Nordlicht" → eindeutig |
| Pferdesuche: ambiguous | ✅ | „DEMO" → alle 4 Demo-Pferde, mit Besitzer zur Unterscheidung |
| Pferdesuche: not_found | ✅ | Erfundener String → „Nicht gefunden", keine Daten geleakt |
| Pferdesuche: EQID | ✅ | `EQID-494305` → Nordlicht |
| Pferdesuche: Groß-/Kleinschreibung | ✅ | „nordlicht" (klein) → exact |
| Proposal bearbeiten | ➖ | UI-Element vorhanden, nicht einzeln durchgeklickt (Zeitbudget) |
| Proposal abbrechen | ✅ | Zurück zu „Beobachtung eingeben" |
| Simulierte Bestätigung geklickt | ➖ (bewusst nicht ausgelöst) | Auftrag verlangt „keine Observation speichern" — Button nicht geklickt, Code-Review aus vorheriger Session bestätigt bereits keine Schreiboperation |
| Nichts gespeichert | ✅ | Kein Insert ausgelöst (weder durch bewusstes Auslassen des Bestätigen-Klicks noch durch Code-Review der `simulate-execution.ts`) |
| Kalender/Rechnungen (nur Sichtung) | ➖ | Nicht inhaltlich getestet, nur Navigationspunkte gesehen |

## 4. Partner-Perspektive (Agent 2)

| Prüfung | Status | Kommentar |
|---|---|---|
| Login | ✅ | |
| Route-Guard (`/kunden` nicht erreichbar) | ✅ | Redirect zurück zu `/partner-home` — Zugriffskontrolle strukturell korrekt |
| `/partner-home` rendert | ❌ | **P0-1**: Absturz, ErrorBoundary „Etwas ist schiefgelaufen" |
| Sichtbare Kunden/Pferde aus Partnersicht | ➖ | Nicht testbar wegen P0-1 |
| Fach-ID PRID sichtbar | ✅ | (in der Hufbearbeiter-Kundenliste bestätigt, nicht in der Partner-eigenen UI, da diese abstürzt) |
| Zugriff auf freigegebene Pferde | ➖ | Nicht testbar wegen P0-1 |
| Keine Sichtbarkeit unfreigegebener Daten | ✅ | Per RLS-Review (Fork A) bestätigt, kein UI-Test möglich |
| Interne UUID sichtbar | ✅ (= nicht sichtbar) | Kein UUID-Leak in den erreichbaren Texten/Code gefunden |

## 5. Pferdebesitzer-Perspektive (Agent 3)

| Prüfung | Status | Kommentar |
|---|---|---|
| Login | ✅ | Redirect `/client-home` |
| `/client-horses` zeigt eigene Pferde | ✅ | Inkl. Hufschutz-Info („barefoot"/„glue") |
| Zugriffs-/Freigabeseite verständlich | ✅ | Sehr positiv bewertet — granulare Rechte, DSGVO-Hinweis |
| Onboarding blockiert Interaktion | ⚠️ | P2-5: Modal erscheint bei jedem Login erneut |
| ID-Verständlichkeit (EQID/Name) | ✅ | Für Laien unproblematisch, da EQID auf Kundenseite kaum exponiert |

## 6. Mitarbeiter-Perspektive (Agent 4)

| Prüfung | Status | Kommentar |
|---|---|---|
| Demo-Mitarbeiter-Login | ➖ (bewusst) | Kein Account angelegt, wie vorgegeben |
| RLS-Review `horses` × `employee_profiles` | ❌ | **P1-1**: keine Policy verbindet beide — Mitarbeiter-UI existiert, Datenzugriff strukturell leer |
| `employee_profiles`-eigene Policies | ✅ | Sauber (Provider verwaltet eigene MA, MA sieht eigenes Profil, Team-Lead-Sicht) |

## 7. Identität / EQID / Disambiguierung (Agent 6)

| Fall | Status | Kommentar |
|---|---|---|
| exact | ✅ | |
| contextual | ➖ | Feature vorhanden („Erweitert: Kontext-Pferd testen"), nicht durchgeklickt |
| ambiguous | ✅ | |
| not_found | ✅ | |
| archived | ➖ | Kein archiviertes Demo-Pferd angelegt, daher nicht auslösbar |
| unauthorized ohne Datenoffenlegung | ✅ (Code-Review) | `resolveContextHorse(null)` liefert leere Kandidatenliste, aus vorheriger Session-Analyse verifiziert |
| Umlaute/Sonderzeichen | ➖ | Keine Demo-Pferde mit Umlauten im Namen angelegt — nur die Normalisierungsfunktion selbst wurde bereits in `__examples__` unit-artig geprüft |
| Groß-/Kleinschreibung | ✅ | |
| Führende Leerzeichen | ➖ | Nicht separat getestet (Normalisierungsfunktion aus Vorsession bekannt korrekt) |
| eqid vs. readable_id konsistent behandelt | ✅ | UI zeigt ausschließlich `readable_id`/EQID-Format, nie die tote `eqid`-Spalte |

## 8. Mobile & Accessibility (Agent 7)

| Prüfung | Status | Kommentar |
|---|---|---|
| 390×844 | ✅ (mit Funden) | Kundenliste responsiv, aber P2-2 (Button-Textabschnitt) und P2-1 (Kontrast) |
| 360×800 | ➖ | Nicht separat getestet, 390×844 als Referenz verwendet |
| Desktop 1280×900 | ✅ | |
| Light Mode | ✅ | Kontrastfehler besteht unabhängig vom Farbschema |
| Dark Mode | ✅ | Identisches Verhalten wie Light Mode |
| Horizontales Scrollen | ✅ (= keins gefunden) | |
| Tab-Reihenfolge | ✅ | Logisch: Textarea → Suchfeld → Erweitert → Submit |
| Sichtbare Fokuszustände | ✅ | Deutlicher weiß/blauer Fokusring auf allen Formularelementen |
| Kontrast (destructive Alert) | ❌ | **P2-1**, app-weit relevant |
| Screenreader-Namen | ➖ | Kein echtes Screenreader-Testing durchgeführt, nur programmatische Fokusprüfung |

## 9. Datenschutz & Sicherheit (Agent 8)

| Prüfung | Status | Kommentar |
|---|---|---|
| Mandantentrennung Demo-Kundin ↔ Demo-Tierärztin | ✅ | Kein RLS-Pfad zur gegenseitigen Sichtbarkeit gefunden |
| `is_provider_for_horse()` auth.uid()-Bindung | ❌ | P2-6 (bereits aus Vorsession bekannt, hier erneut bestätigt) |
| `search_horse_by_readable_id()` Autorisierung | ❌ | P1-3 (aus Vorsession bekannt, hier referenziert) |
| Interne UUID in UI/Fehlermeldungen | ✅ (= nicht gefunden) | |
| Fehlermeldungs-Hygiene (`error.message` im Toast) | ❌ | P2-4 |
| Partner-Freigabepfad (`horse_partner_access`) durch Demo-Setup abgedeckt | ⚠️ | P2-3 — Demo bildet nur den generischen Client-Pfad ab, nicht den echten Pferde-Freigabe-Pfad |

## 10. Hufi Assistant

| Prüfung | Status | Kommentar |
|---|---|---|
| Produktiver Chat-/Voice-Assistent (`hufi-agent`) | ➖ | Außerhalb des Zeitbudgets dieser Runde nicht live getestet — nur der isolierte `/hufi-observation-lab`-Bereich wurde geprüft |
