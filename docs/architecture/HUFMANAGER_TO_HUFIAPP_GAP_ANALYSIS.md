# HufManager → HufiApp Gap-Analyse

Stand: 2026-08-06. Read-only. Basis: Dokument 1
(`HUFMANAGER_FORENSIC_FEATURE_INVENTORY.md`), `src/config/appMap.ts`
(247 Einträge, identisch in beiden Repos), `docs/architecture/
HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`.

## Lesehinweis — wie die Gap-Typen hier zu verstehen sind

Da HufManager und HufiApp laut Dokument 1 Abschnitt 0 **denselben Code**
teilen (0 Dateien fehlen, 21 sind neu, nur 11 inhaltlich verändert), ist
Gap-Typ **A („vollständig enthalten")** für praktisch jede Fachfunktion auf
reiner Code-Ebene zutreffend. Das würde die Tabelle aber wertlos machen.
Deshalb wird hier **nicht die reine Code-Existenz bewertet, sondern die
Erreichbarkeit/Kuratierung innerhalb der jeweiligen Nutzeroberfläche**:

- **A** = in HufiApp genauso erreichbar wie in HufManager (gleiche
  Navigation/Route, gleicher Funktionsumfang).
- **B** = erreichbar, aber mit Lücke (Feld/Workflow/Berechtigung/Export/
  mobile Nutzung fehlt oder ist bekannt fehlerhaft).
- **C** = Code/Route/Datenmodell vorhanden, aber nicht verlinkt/hinter
  Flag/verwaist — **gilt in HufManager UND HufiApp gleichermaßen**, da
  identischer Code; der Unterschied zu HufManager ist damit „kein
  Unterschied", was selbst der Befund ist.
- **D** = in keinem der beiden Systeme ein nutzbarer Einstiegspunkt
  gefunden.
- **E** = HufiApp hat eine erkennbar modernere/allgemeinere Lösung für
  denselben Zweck (z.B. neue Design-System-Primitives statt Ad-hoc-CSS).
- **F** = fachlich/technisch überholt, nicht mehr sinnvoll fortzuführen.
- **G** = Prüfung im vorliegenden Rahmen nicht abschließend möglich.

Werte 0–5 wie im Auftrag definiert. „Empfehlung" ist eine Einschätzung,
keine Entscheidung — die trifft Pascal (siehe Dokument 4).

---

## Kundenverwaltung

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| K1 | Kundenanlage/-verwaltung, Filter, Export | live, `Kunden.tsx` | identisch (gleiche Datei) | A | 5 | 1 | 1 | 5 | 5 | Beibehalten, als Workspace-Kernmodul führen |
| K2 | Preisgruppen (VIP/Großstall/Individuell) | Backend live, UI verwaist | identisch | C | 4 | 3 | 2 | 3 | 4 | Verwaltungs-UI bewusst wieder verlinken oder ins Kundenprofil integrieren statt eigener Seite |
| K3 | Betreuungsverhältnis start/pause/beenden (kein Hard-Delete) | laut Doku gebaut, Deploy-Status unklar | ungeprüft, gleicher Code-Stand vermutlich vorhanden | G | 5 | 2 | 2 | 4 | 5 | Vor Parken verifizieren, ob deployed; kritisch für Datenschutz bei Betreuungsende |
| K4 | Archivierte Kunden fallen aus Liste (Bug) | bekannter Bug (`Kunden.tsx:191-196`) | vermutlich identisch (gleicher Code) | B | 2 | 1 | 1 | 1 | 3 | Kleiner Fix, kein Architekturthema |
| K5 | Kommunikationshistorie | schmal (1 Component) | identisch | B | 3 | 1 | 3 | 2 | 4 | Bei Neuaufbau des Kundenmoduls mit ausbauen |

## Pferde und Pferdeakten

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Pferdeakte (Stammdaten/Gesundheit/Futter/Bewegung/Vet/Tresor/Timeline) | live, sehr breit | identisch | A | 5 | 4 | 1 | 5 | 5 | Kernstück, unbedingt erhalten |
| P2 | Mehrfach-Zugriff (Partner/Team) mit Medizin-Freigabe-Stufe | live | identisch | A | 4 | 4 | 1 | 4 | 5 | Modell ist bereits berufsübergreifend brauchbar (Partner = beliebiger Zweitbehandler) |
| P3 | Drei parallele Pferdeseiten-Implementierungen (`horse-detail`, `horse-profile`, `horse-page`) | alle drei vorhanden, Verhältnis unklar | identisch (gleicher Code) | G | 3 | 1 | 4 | 2 | 3 | Vor Weiterbau klären, welche Version aktiv ist — sonst droht Doppelpflege |
| P4 | Notfall-QR/Notfalltoken | live, security-gehärtet | identisch | A | 4 | 3 | 1 | 4 | 5 | Beibehalten, gut für berufsübergreifende Notfallübergabe |
| P5 | Statusberichte durch Dritte — Besitzer sieht nur eigene Einträge (vermuteter Bug) | unklar (U-4 im Audit offen) | identisch | G | 2 | 1 | 2 | 2 | 3 | Fachlich klären, ob gewollt |

## Hufspezifische Fachfunktionen

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| H1 | LTZ-Hufanalyse-Assistent (strukturiert, mehrstufig, pro Huf) | live | identisch | A | 5 | 5 | 1 | 5 | 4 (huf-spezifisch, aber Muster übertragbar) | **Höchste Priorität** — als Fachbereich Huf / Hufi Brain-Baustein explizit kuratieren, nicht nur mitschleppen |
| H2 | Automatische Empfehlungsgenerierung aus Analyse | live, `generateRecommendations()` | identisch | A | 5 | 5 | 1 | 5 | 5 (Muster „strukturierte Befunde → Regelwerk → Empfehlung" ist berufsübergreifend) | Als Hufi-Brain-Regelwerk verallgemeinern |
| H3 | Foto-Vorher/Nachher-Vergleich (zwei Implementierungen) | live, dupliziert | identisch | B | 4 | 3 | 2 | 3 | 4 | Auf eine Implementierung konsolidieren |
| H4 | KI-Hufbild-Analyse (`analyze-hoof-image`) | Backend vorhanden, kein UI-Aufrufer gefunden | identisch | C | 4 | 4 | 3 | 3 | 3 | Prüfen ob fertig/nutzbar; falls ja, sichtbar machen — hoher Hebel für Hufi als „Fach-KI" |
| H5 | Vier separate Huf-Datenmodelle (`hoof_entries`,`hoof_history`,`hoof_photos`,`hoof_analyses`) | unklar konsolidiert | identisch | G | 3 | 2 | 4 | 3 | 3 | Datenmodell-Review vor jedem Umbau nötig — Risiko für Doppelpflege/Dateninkonsistenz |
| H6 | Bearbeitungsintervall individuell vs. fest 8 Wochen (dokumentierter Bug) | teils gefixt laut Roadmap, Status danach nicht erneut verifiziert | identisch | G | 4 | 3 | 2 | 3 | 4 | Verifizieren; hoher Praxiswert (Kernversprechen „erinnert bevor du's vergisst") |

## Termine / mobile Abläufe

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| T1 | Kalender (Tag/Woche) | live, Nutzerfeedback „technisch" | identisch | B | 5 | 1 | 3 | 4 | 5 | Visuelles Redesign lohnt sich, Datenmodell behalten |
| T2 | Tourenplanung/Routing/Fahrtenbuch | live, funktional breit | identisch | A | 5 | 4 | 1 | 5 | 4 | Kernstärke für mobile Berufe, unbedingt erhalten |
| T3 | Terminstatus als freier Text ohne Constraint | bekannte Falle (beide CLAUDE.md) | identisch | B | 3 | 1 | 2 | 3 | 4 | DB-Constraint nachziehen — reduziert künftige Bugs in jeder neuen UI |
| T4 | Automatische Folgetermin-Vorschläge nach individuellem Intervall | teils gebaut | identisch | G | 5 | 4 | 2 | 4 | 5 | Kernversprechen des Produkts — Status vor jeder Neupriorisierung klären |
| T5 | Offline-Fähigkeit für Termine/Tour | nur Status-Anzeige, keine echte Offline-Datenhaltung | HufiApp hat neue Offline-Foundation, aber bisher nur für Assistent-Text-/Audio-Drafts, nicht für Termine | C/E gemischt | 4 | 2 | 4 | 3 | 5 | Die neue Offline-Foundation ist die richtige Basis — auf Termine/Tour ausweiten statt HufManager-Anzeige zu kopieren |
| T6 | Mahnwesen ohne Cron-Trigger | Code fertig, nie automatisch ausgelöst | identisch | C | 4 | 2 | 1 | 4 | 4 | Ein-Zeilen-Cron-Eintrag — hoher Hebel für wenig Aufwand |

## Dienstleistungen/Preise

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Leistungsverwaltung (`services`) | Backend aktiv, Verwaltungsseite verwaist | identisch | C | 4 | 2 | 2 | 4 | 5 | In neues Kernmodul „Dienstleistungen" einbinden statt separate Seite |
| D2 | Preisgruppen/Rabattstaffeln | siehe K2 | identisch | C | 4 | 3 | 2 | 3 | 4 | siehe K2 |
| D3 | Angebote vs. „Mein Angebot" — zwei Konzepte parallel | unklares Verhältnis | identisch | G | 3 | 2 | 2 | 2 | 3 | Vor Zusammenführung klären, was jeweils gemeint war |
| D4 | Kalkulator | verwaist | identisch | C | 2 | 2 | 2 | 2 | 3 | Niedrige Priorität, ggf. archivieren |

## Rechnungen/Zahlungen/Steuer

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| R1 | Rechnungserstellung + Positionen + Fahrtkosten + PDF | live | identisch | A | 5 | 3 | 1 | 5 | 5 | Kernmodul, unbedingt erhalten |
| R2 | Rechnungsversand E-Mail/WhatsApp — historisch defekt | Fix laut Doku gebaut, Deploy-Status offen | ungeprüft | G | 5 | 2 | 1 | 5 | 5 | **Vor jeder Weiterentwicklung zuerst verifizieren, ob Versand wirklich funktioniert** — geschäftskritisch |
| R3 | Mahnwesen (siehe T6) | Code fertig, kein Cron | identisch | C | 4 | 2 | 1 | 4 | 4 | siehe T6 |
| R4 | CopeCart-Integration (Abo/Guthaben) | live, mit historisch gravierenden IPN-Bugs, größtenteils gefixt | identisch | B | 5 | 1 | 2 | 5 | 3 (zahlungsanbieterspezifisch) | Vor Parken: Testkauf-Verifikation wiederholen |
| R5 | Buchhaltung EÜR/USt-Voranmeldung/Export | live-Komponenten, keine steuerliche Korrektheit geprüft | identisch | B | 4 | 3 | 3 | 4 | 4 | Fachlich mit Steuerberater absichern vor Weiterbau |
| R6 | Steuerberater-Zugang | bewusst deaktiviert (Fake entfernt) | identisch | D | 2 | 1 | 3 | 1 | 2 | Neu bauen falls gewünscht, nicht der alte Fake-Weg |
| R7 | Trial-Ablauf-Automatik | Migration vorhanden, nicht aktiv registriert | identisch | C | 4 | 1 | 1 | 3 | 3 | Prüfen/registrieren — direkter Umsatzhebel |

## Dokumente/Export/Archiv

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| E1 | PDF-Berichte (Huf/Pferd/Partner/Impfung) | live | identisch | A | 5 | 3 | 1 | 5 | 4 | Erhalten |
| E2 | Art. 15/17 DSGVO Export/Löschung | live, echt implementiert | identisch | A | 5 | 1 | 1 | 5 | 5 | Erhalten, rechtlich Pflicht |
| E3 | Tresor/Vault (monetarisiert) | live, eigenes Pricing | identisch | A | 4 | 3 | 2 | 4 | 4 | Erhalten, ggf. als Add-on ins neue Preismodell übernehmen |
| E4 | Verarbeitungsverzeichnis Art. 30 nur `localStorage` | bekannte Lücke | identisch | B | 3 | 1 | 2 | 4 | 3 | Vor Parken in Supabase migrieren — Compliance-Dokument darf nicht verloren gehen |

## Kommunikation/Automation

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| C1 | AutoFlow (Lead→Termin→Rechnung→Follow-up) | Backend komplett, UI-Einstieg entfernt | identisch | C | 4 | 3 | 3 | 3 | 4 | Prüfen ob reaktivierbar — hoher Automations-Hebel für Solo-Gründer-Zielgruppe |
| C2 | Kommunikationsmodus-Einstellung ohne Wirkung | bekannt, nicht verkabelt | identisch | B | 3 | 1 | 2 | 2 | 3 | Entweder verkabeln oder Label entschärfen (Erwartungsmanagement) |
| C3 | Proaktive Briefings, mit dokumentierter Code-Doppelung (`hufi-briefing.ts`/`hufai-proactive.ts`) | live, doppelt | identisch | B | 4 | 2 | 2 | 3 | 4 | Vor Weiterbau konsolidieren, sonst Bugs an nur einer der beiden Stellen gefixt |
| C4 | Anomalie-Erkennung | Backend vorhanden, kein UI-Konsument gefunden | identisch | C | 3 | 3 | 3 | 2 | 4 | Prüfen, ob als Hufi-Brain-Signal nutzbar |

## Benutzer/Rollen/Mandanten

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| U1 | 5-Rollen-System (provider/client/admin/employee/partner) | live | identisch | A | 5 | 2 | 1 | 5 | 5 | Fundament, erhalten |
| U2 | Botschafter-Dashboard-Rolle (14 Dateien) | fertig, geparkt (Flag) | identisch | C | 3 | 2 | 3 | 3 | 3 | Bewusste Produktentscheidung nötig: fertigbauen, archivieren oder in Hufi-weites Empfehlungsprogramm überführen |
| U3 | Stallbetreiber-Rolle (9+ Seiten) | fertig, geparkt (Flag) | identisch | C | 3 | 3 | 4 | 3 | 4 (Stallbetreiber ist eine der Zielgruppen für „Hufi = Welt dahinter") | Kandidat für frühe Wiederbelebung — passt zur B2B-Mehrfachrollen-Strategie |
| U4 | Portal-Whitelabel (6 Fremdzielgruppen) | fertig, geparkt (Flag), Demo-Daten | identisch | C | 2 | 4 | 5 | 2 | 3 | Niedrige Priorität — hoher Aufwand, unklare Nachfrage, vor Reaktivierung Marktbedarf prüfen |
| U5 | Mandantentrennung über SECURITY DEFINER-Funktionen | historisch mehrere kritische Lecks, 18./27.07. gefixt | identisch (gleicher Fix-Stand) | A (nach Fix) | 5 | 1 | — | 5 | 5 | Sicherheitsstatus vor Parken erneut verifizieren (siehe Dok. 4) |

## Business/Website/Shop

| # | Funktion | Status HufManager | Status HufiApp | Gap | Nutzerwert | Einzigartigkeit | Aufwand | Verlustrisiko | Wiederverwendbarkeit | Empfehlung |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Öffentliche Landingpage/Website | live | identisch | A | 4 | 1 | 2 | 3 | 2 | Wird ohnehin durch Hufi-Markenauftritt ersetzt/überarbeitet |
| B2 | Website-Editor (No-Code) | Code vorhanden, verwaist | identisch | D | 2 | 2 | 4 | 1 | 3 | Niedrige Priorität — großer Aufwand für unklaren Nutzen |
| B3 | Marketplace (Pferde-/Leistungsbörse) | teils live, Browse hinter Flag | identisch | C | 3 | 3 | 3 | 3 | 4 | Guter Kandidat für „adaptives Modul", sobald Kernprodukt stabil |
| B4 | BHS-Balance-System | live, eigenständiges Konzept | identisch | A | 3 | 3 | 3 | 3 | 3 | Strategische Klärung mit Pascal nötig (eigenes Produkt oder Hufi-Feature?) |
| B5 | Hufrente (Provisionsmodell) | verwaist, aber vollständig gebaut inkl. Bezahlmodell | identisch | D | 3 | 4 | 3 | 3 | 4 | Strategische Klärung — war ein bezahltes/beworbenes Konzept, nicht einfach verwerfen ohne Rückfrage |
| B6 | Academy/Kurse, Ecosystem | verwaist | identisch | D | 1 | 1 | 3 | 1 | 2 | Niedrige Priorität |

---

## Zusammenfassende Kategorie-Verteilung (grob, aus obigen Zeilen gezählt)

- **A (vollständig gleichwertig)**: 15 Zeilen
- **B (teilweise/Lücke)**: 10 Zeilen
- **C (technisch vorhanden, nicht erreichbar)**: 13 Zeilen — größte Gruppe,
  bestätigt den Kernbefund aus Dokument 1: das Problem ist fast nie
  fehlender Code, sondern fehlende/absichtlich entfernte Erreichbarkeit.
- **D (nicht gefunden/kein nutzbarer Einstieg)**: 5 Zeilen
- **E (HufiApp-Lösung moderner)**: 1 Zeile (Offline-Foundation)
- **F (nicht mehr sinnvoll)**: 0 Zeilen explizit — keine Funktion wurde als
  grundsätzlich obsolet eingestuft; auch ältere Konzepte (Hufrente, BHS)
  haben laut Code-Tiefe erkennbaren Aufwand hinter sich und sollten vor
  einer „obsolet"-Einstufung mit Pascal abgeglichen werden.
- **G (weitere Prüfung nötig)**: 8 Zeilen — konzentriert auf
  Rechnungsversand-Deploy-Status, Datenmodell-Konsolidierung (Huf-Tabellen,
  Pferdeseiten-Duplikate) und Automatisierungs-Verifikation.

**Wichtigster Einzelbefund für Priorisierung:** Zeile R2
(Rechnungsversand) und T4/H6 (individuelle Bearbeitungsintervalle/
Folgetermine) sind beide mit Nutzerwert 5 und Status G markiert — vor
jeder strategischen Weiterentwicklung sollte zuerst verifiziert werden,
ob diese zwei geschäftskritischen Funktionen im aktuellen Checkout
tatsächlich funktionieren, nicht nur „laut Doku gebaut" sind.
