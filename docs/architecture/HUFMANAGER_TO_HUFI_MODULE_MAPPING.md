# HufManager → Hufi Modul-Zuordnung

Stand: 2026-08-06. Read-only.

## Wichtiger Hinweis zur Modul-Hypothese

Der Auftrag für diesen Bericht gibt eine 10-Modul-Arbeitshypothese vor
(Heute · Termine · Kunden & Pferde · Dienstleistungen · Aufträge &
Dokumentation · Rechnungen & Finanzen · Produkte & Shop · Betrieb &
Ressourcen · Digitales Business · Team & Kommunikation). **HufiApp hat
bereits ein eigenes, tiefergehendes Zielarchitektur-Dokument**, das diese
exakte Hypothese gegen die reale `appMap.ts`-Datenlage (247 Einträge) und
die tatsächliche Navigation geprüft hat:
`docs/architecture/HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`,
Abschnitt 9 „Kritische Prüfung der 10-Modul-Hypothese und Empfehlung".

Dessen Kernergebnis (Zitat, gekürzt): Von den zehn Hypothese-Modulen sind
**„Produkte & Shop"** und **„Digitales Business"** für die beiden
tragenden Rollen (Provider, Partner) **„zu dünn mit echten, täglich
genutzten Funktionen unterlegt, um eine eigene permanente Kern-Kachel zu
rechtfertigen"**. Das Dokument empfiehlt stattdessen **6 universelle
Kernmodule** (Heute, Termine, Kunden & Pferde, Anfragen & Nachrichten,
Rechnungen & Finanzen, Dokumentation) plus **2–4 adaptive Module**
(Betrieb & Ressourcen, Dienstleistungen & Preise, optional Digitales
Business, optional Team & Personal).

**Dieses Dokument hier folgt der bereits geprüften HufiApp-eigenen
Empfehlung**, nicht blind der Auftrags-Arbeitshypothese — wie im Auftrag
selbst vorgesehen („zitiere und nutze dessen tatsächliche Empfehlung als
Referenz"). Wo eine HufManager-Funktion in der Auftragshypothese anders
gelandet wäre als in der HufiApp-eigenen Empfehlung, ist das unten explizit
vermerkt (Spalte „Abweichung von Auftragshypothese").

---

## Zuordnungstabelle

Legende Zielebenen: **HS** = Hufi-Startseite (Gespräch/Assistent),
**KM** = Workspace-Kernmodul, **AM** = Adaptives Workspace-Modul,
**UB** = Unterbereich eines Moduls, **HM** = Hamburger-Menü/Einstellungen,
**AD** = Administration, **HB** = Hufi Brain/Fachwissen,
**AR** = Archiv/nicht übernehmen.

| HufManager-Funktion | Zielebene | Konkretes Modul (nach HufiApp-eigener Empfehlung) | Begründung | Abweichung von Auftragshypothese |
|---|---|---|---|---|
| Kundenverwaltung (`Kunden.tsx`) | KM | Kunden & Pferde | appMap `live`, Kern-Tagesgeschäft jeder Rolle | keine |
| Preisgruppen/Rabattstaffeln | UB | Unterbereich von Kunden & Pferde ODER Dienstleistungen & Preise (Datenmodell verknüpft beides — Preisgruppe hängt am Kunden, Preis an der Leistung) | verwaiste eigene Seite war Teil des Problems; als Unterbereich statt eigener Kachel sinkt die Pflegeschwelle | Auftragshypothese hätte es unter „Rechnungen & Finanzen" erwartet — Datenmodell spricht für Kundenprofil-Unterbereich |
| Pferdeakte (alle Tabs) | KM | Kunden & Pferde (Pferdedetail) | Kernstück, appMap `live`, fachliche Tiefe siehe Dok. 1 Abschnitt 2.3 | keine |
| **LTZ-Hufanalyse-Assistent** | UB → langfristig **HB** | Unterbereich „Hufanalyse" unter Aufträge/Dokumentation bzw. Pferdedetail; die zugrunde liegende **Entscheidungslogik** (`generateRecommendations()`, Enum-Vokabular) gehört zusätzlich als wiederverwendbare Regel ins **Hufi Brain** | Die strukturierten Enums + automatische Empfehlung sind exakt das, was der Auftrag unter „Hufi Brain: wiederverwendbare Regeln, Klassifikationen, Fachterminologie, Entscheidungsunterstützung" meint — die Eingabemaske bleibt ein UI-Unterbereich, die Fachlogik dahinter sollte als eigenständiger, von der UI entkoppelter Baustein behandelt werden, damit sie später auch textlich/sprachlich vom Assistenten genutzt werden kann |
| Foto-Vorher/Nachher-Vergleich | UB | Unterbereich Hufanalyse/Pferdedetail | ergänzt LTZ-Analyse | keine |
| KI-Hufbild-Analyse (`analyze-hoof-image`) | HB (Backend) + UB (Aufrufer fehlt) | Sollte als Hufi-Brain-Fähigkeit angebunden werden, aufrufbar sowohl aus dem Hufanalyse-Unterbereich als auch potenziell direkt aus der Hufi-Startseite („Foto von diesem Huf zeigen, was siehst du?") | Zeigt exemplarisch, warum die strikte Trennung UI-Kachel vs. Hufi Brain wichtig ist — dieselbe Fähigkeit sollte aus mehreren Ebenen erreichbar sein | — |
| Termine/Kalender | KM | Termine | appMap `live`, Kernmodul in HufiApp-eigener Empfehlung identisch zur Auftragshypothese | keine |
| Tourenplanung/Routing/Fahrtenbuch | AM (bzw. UB von Termine) | Betrieb & Ressourcen (adaptiv, nur mobile Berufe) ODER Unterbereich von Termine | Fahrende/mobile Berufe brauchen es täglich, stationäre nie — klassischer Fall für adaptive Sichtbarkeit statt Kernmodul für alle | Auftragshypothese nennt „Touren & Mobilität" explizit als adaptives Modul — deckt sich |
| Automatische Folgetermin-Vorschläge | HS + HB | Proaktiver Hinweis auf der Hufi-Startseite („Fälliger Folgetermin für Pferd X"), Regel („individuelles Intervall statt fix 8 Wochen") gehört ins Hufi Brain | Genau das im Auftrag beschriebene Muster „proaktive Hinweise, Vorschläge" der Hufi-Startseite | — |
| Rechnungserstellung/-versand | KM | Rechnungen & Finanzen | appMap `live`, geschäftskritisch | keine |
| Mahnwesen (ohne Cron) | UB + AD | Unterbereich von Rechnungen & Finanzen (Anzeige/Auslösen), Cron-Registrierung selbst ist Administration/Systemkonfiguration | Nutzer sieht/nutzt es im Finanzen-Modul, der technische Auslöser ist ein Backend-/Admin-Thema | keine |
| Buchhaltung EÜR/USt/Export | UB | Unterbereich von Rechnungen & Finanzen | appMap-Einordnung „teilweise", passt zur HufiApp-eigenen Route-Zuordnung (`/buchhaltung` unter Rechnungen & Finanzen, Abschnitt 10 der Architektur-Analyse) | keine |
| Fahrtkosten (`TravelCostEditor`) | UB | Unterbereich von Rechnungen & Finanzen | direkt aus Auftrags-Beispielliste übernommen | keine |
| CopeCart-Abo/Guthaben-Verwaltung | HM | Hamburger-Menü → Abo/Guthaben | reine Kontoverwaltung, kein Tagesgeschäft — bereits heute so einsortiert (`HufiMenu.tsx`) | keine |
| Trial-Ablauf-Automatik | AD | Administration/Systemkonfiguration | reines Billing-/Cron-Thema, keine Nutzerinteraktion | keine |
| Tresor/Vault (Dokumentenspeicher) | UB | Unterbereich von Kunden & Pferde (Pferdedetail) bzw. Dokumentation | appMap `live`, eigenständig monetarisiert — sollte als Add-on-Kachel innerhalb des Pferdeprofils sichtbar bleiben, nicht eigene Top-Level-Kachel | keine |
| Art. 15/17 DSGVO Export/Löschung | HM | Hamburger-Menü → Datenschutz/Konto löschen | exakt die im Auftrag genannte Kategorie „Datenschutz, Sicherheit" | keine |
| Verarbeitungsverzeichnis Art. 30 | AD | Administration | internes Compliance-Werkzeug, kein Nutzer-Feature | keine |
| AutoFlow (Lead→Termin→Rechnung→Follow-up) | AM | Adaptives Modul „Digitales Business" (optional, laut HufiApp-eigener Empfehlung niedrige Priorität) ODER als Automations-Engine im Hintergrund ohne eigene Kachel, nur als Einstellungsschalter je Modul | Backend ist berufsübergreifend brauchbar (jede Dienstleistungsbranche hat Lead→Termin→Rechnung), aber kein täglich aufgesuchter Ort — passt zu „adaptiv, optional" statt Kernmodul | Auftragshypothese würde es implizit unter „Rechnungen & Finanzen" oder „Digitales Business" erwarten — Empfehlung: eher als modulübergreifende Automationsregel (Hufi Brain-nah) denken als als Seite |
| Kommunikationsmodus-Einstellung | UB | Unterbereich Anfragen & Nachrichten (sobald verkabelt) | aktuell wirkungslos — erst verkabeln, dann einsortieren | keine |
| Proaktive Briefings | HS | Hufi-Startseite (morgendliche Zusammenfassung, Kernstück von „Heute") | genau das im Auftrag beschriebene „Status, proaktive Hinweise" | keine |
| Chat/Anfragen | KM | Anfragen & Nachrichten (zusammengelegt, siehe Architektur-Analyse Abschnitt 9.3 — folgt einem bereits in `AppSidebar.tsx` etablierten Muster) | HufiApp-eigene Empfehlung bündelt bewusst Leads/Inbox + Chat | Auftragshypothese trennt „Aufträge & Dokumentation" von „Team & Kommunikation" — die geprüfte Empfehlung weicht hier ab und bündelt stattdessen Anfragen+Chat, Dokumentation separat |
| Mitarbeiterverwaltung/Team | AM | Betrieb & Ressourcen (adaptiv, nur Betriebe mit Mitarbeitern) | appMap `live`, aber nicht jede Rolle hat Mitarbeiter | Auftragshypothese nennt „Team & Kommunikation" als eigenes Kernmodul — geprüfte Empfehlung stuft „Team" als adaptiv ein, weil nicht jeder Solo-Betrieb es braucht |
| Botschafter-Rolle (14 Dateien) | AR (vorerst) / AD (Reaktivierung als Programm) | Archiv bis Produktentscheidung, danach eigenes berufsübergreifendes Empfehlungsprogramm (nicht HufManager-spezifisch) | fertig gebaut, aber Reaktivierung ist eine Geschäftsentscheidung, keine technische — siehe Dok. 4 | — |
| Stallbetreiber-Rolle | AM (Kandidat für frühe Wiederbelebung) | Eigenes Berufsprofil analog Provider/Partner, mit eigenen adaptiven Modulen (Lager, Kalender, Angebote) | passt strategisch am besten zu „Hufi ist die Welt dahinter" — Stallbetreiber ist eine der Zielgruppen jenseits des reinen Hufbearbeiters | — |
| Portal-Whitelabel (6 Fremdzielgruppen) | AR (vorerst) | Archiv bis validierter Marktbedarf | hoher Aufwand (appMap: 5/5 Migrationsaufwand), Demo-Daten, keine belegte Nachfrage im vorliegenden Bestand | — |
| Preisliste/Leistungsverwaltung (`services`) | AM | Dienstleistungen & Preise (adaptiv laut HufiApp-eigener Empfehlung, nicht Kernmodul) | appMap-Route heute verwaist, Backend aktiv genutzt (29 Zeilen) | Auftragshypothese führt „Dienstleistungen" als eigenes Kernmodul — geprüfte Empfehlung stuft es niedriger (adaptiv), weil Konfigurations-lastig statt täglich aufgesucht |
| Fuhrpark/Kraftstoffpreise | AM | Betrieb & Ressourcen | appMap `live`, nur mobile Berufe | keine |
| Website-Editor/Landingpage | AR (aktuell) / AM (falls reaktiviert) | Digitales Business (optional laut HufiApp-eigener Empfehlung, niedrige Priorität) | verwaist, hoher Aufwand für unklaren Nutzen laut Gap-Analyse | keine |
| Marketplace (Pferde-/Leistungsbörse) | AM | Kandidat für künftiges adaptives Modul, sobald Kernprodukt stabil | teils live, teils hinter Flag | — |
| BHS-Balance-System | Klärungsbedarf (HS-Hinweis oder eigenständig) | Nicht eindeutig einer Ebene zuordenbar ohne Pascal-Rückfrage zur strategischen Absicht (eigenes Produkt vs. Hufi-Feature) | live erreichbar (`/bhs-balance`), aber konzeptionell ein Sonderfall | als **G** markiert, siehe Dok. 2 |
| Hufrente (Provisionsmodell) | Klärungsbedarf (AR vorerst) | War ein bezahltes/beworbenes Konzept — vor Archivierung Rückfrage an Pascal, nicht stillschweigend fallenlassen | appMap: verwaist, aber vollständiger Code inkl. Bezahlmodell | — |
| Admin-Rollen/Rechte/Audit-Logs | AD | Administration | exakt die Auftrags-Kategorie | keine |
| Mandantentrennung/Sicherheitsfixes | AD (Systemkonfiguration) | kein Nutzer-Feature, gehört in Betriebs-/Sicherheitsverantwortung | — | keine |

---

## Zusammenfassung nach Zielebene

- **Hufi-Startseite (HS):** proaktive Folgetermin-Hinweise, morgendliche
  Briefings, Klick-Einstieg in Hufanalyse per Foto/Sprache.
- **Workspace-Kernmodule (KM):** Kunden & Pferde, Termine, Rechnungen &
  Finanzen, Anfragen & Nachrichten, Dokumentation — deckungsgleich mit der
  bereits geprüften HufiApp-eigenen Empfehlung, **nicht** mit der
  ungeprüften Auftrags-10er-Liste.
- **Adaptive Module (AM):** Betrieb & Ressourcen, Dienstleistungen &
  Preise, optional Digitales Business, optional Team & Personal, plus
  langfristig Stallbetreiber-spezifische Module.
- **Unterbereiche (UB):** Hufanalyse, Fahrtkosten, Buchhaltung/USt,
  Tresor, Preisgruppen, Mahnwesen-Anzeige, Fotovergleich.
- **Hamburger-Menü (HM):** Abo/Guthaben, Datenschutz-Export/Löschung —
  bereits heute korrekt so umgesetzt laut Architektur-Analyse Abschnitt 11.
- **Administration (AD):** Rollen/Rechte, Verarbeitungsverzeichnis,
  Trial-/Cron-Konfiguration, Mandantentrennung/Sicherheit.
- **Hufi Brain (HB):** LTZ-Hufanalyse-Regelwerk und
  Empfehlungsgenerierung, KI-Hufbild-Analyse, individuelle
  Bearbeitungsintervall-Logik — die wiederverwendbarste, am wenigsten
  UI-gebundene Fachlogik im gesamten HufManager-Bestand.
- **Archiv/nicht übernehmen (AR), vorerst:** Portal-Whitelabel (hoher
  Aufwand, keine belegte Nachfrage), Website-Editor, Botschafter-Dashboard
  bis zur Produktentscheidung. **Ausdrücklich nicht** ohne Rückfrage:
  Hufrente (war ein bezahltes Konzept) und BHS-Balance (unklare
  strategische Absicht) — beide brauchen eine Pascal-Entscheidung, bevor
  sie als „Archiv" gelten.

## Wiederholter Verweis

Die vollständige, tiefere Rollen-für-Rollen-Navigationsanalyse
(inkl. aller 202 Routen, aller Duplikate über die 5 Rollen hinweg, aller
kaputten Sidebar-Links) steht bereits in
`docs/architecture/HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`
und wird hier nicht dupliziert. Die Berufs-/Betriebsmodell-Steuerung
(welches Modul welcher Beruf sieht) steht in
`docs/architecture/HUFI_PROFESSION_CAPABILITY_MODULE_MATRIX.md`.
