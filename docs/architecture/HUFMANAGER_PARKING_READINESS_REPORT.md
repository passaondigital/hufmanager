# HufManager Parking Readiness Report

Stand: 2026-08-06. Read-only. Für Pascal (Solo-Gründer, kein Programmierer,
knappe Zeit) — bewusst konkret formuliert, technische Details sind belegt,
aber die Entscheidungen sind in normalem Deutsch beschrieben.

## Das Wichtigste zuerst, in einem Satz

**„HufManager parken" ist kein Umzug von einem System ins andere — es ist
dieselbe Datenbank, derselbe Code, dieselben 76 Server-Funktionen. Was du
tatsächlich entscheidest, ist: Wird die alte, formularlastige Bedienoberfläche
(Sidebar/Listen/Formulare) irgendwann abgeschaltet und komplett durch die
neue Hufi-Sprachassistenten-Oberfläche ersetzt — und wenn ja, welche der
heute schon gebauten, aber versteckten Funktionen (Botschafter-Programm,
Stallbetreiber-Rolle, Preisgruppen, Hufrente, Portal-Produkte) nimmst du
bewusst mit, statt sie einfach verschwinden zu lassen.**

Beleg für diesen Befund: `git remote -v` zeigt in beiden Verzeichnissen
denselben Ursprung (`passaondigital/hufmanager.git`), beide `CLAUDE.md`-
Dateien nennen dasselbe Supabase-Produktionsprojekt
(`vnschgjxkzzwzefqlrji`), und ein vollständiger Datei-Diff zeigt: 0 Dateien
fehlen in HufiApp, die in HufManager existieren (Details: Dokument 1,
Abschnitt 0).

---

## Parkampel — Gesamtbild

| Bereich | Ampel | Kurzbegründung |
|---|---|---|
| Datenmigration im klassischen Sinn | 🟢 GRÜN | Es gibt nichts zu migrieren — eine gemeinsame Datenbank wird von beiden Oberflächen genutzt. |
| Sicherheitsstatus der gemeinsamen Datenbank | 🟡 GELB | Kritische Lecks (Pferde-/Kundendaten ohne Login abrufbar) wurden laut Doku am 18./27.07. gefixt — vor dem Parken sollte das noch einmal frisch verifiziert werden, nicht nur der Doku vertraut werden. |
| Rechnungsversand (E-Mail/WhatsApp) | 🔴 ROT | Laut eigener Projektdokumentation war der Versand „seit jeher" defekt (Feldnamen-Bug). Ein Fix wurde beschrieben, aber der Live-Status ist in diesem read-only-Bericht nicht verifizierbar. **Vor jeder Weiterentwicklung zuerst testen: Kommt eine echte Test-Rechnung wirklich beim Testkunden an?** |
| Mahnwesen/automatische Erinnerungen | 🟡 GELB | Code vorhanden und abgesichert, aber es gibt laut Audit **keinen** automatischen Auslöser (Cron). Läuft nur, wenn jemand die Funktion von Hand anstößt. |
| Zahlungsanbindung (CopeCart) | 🟡 GELB | Historisch gravierende Fehler (falsche Signaturprüfung, falsche Event-Namen) wurden laut Doku gefixt und mit einer Testbestellung verifiziert (28.07.). Vor dem Parken: einen weiteren echten Testkauf durchführen, nicht nur der Doku vertrauen. |
| Domain/Marken-Situation | 🟡 GELB | `hufiapp.de` ist die lebendige Domain, `hufmanager.de` wird nur noch als Mail-Absenderdomain gebraucht (bei Resend verifiziert). Die Marke „HufManager" ist im UI bereits fast vollständig durch „Hufi" ersetzt. |
| Fertig gebaute, aber geparkte Rollen (Botschafter/Stallbetreiber/Portal) | 🟡 GELB | Technisch sauber hinter Feature-Flags versteckt, kein Datenverlustrisiko — aber du solltest bewusst entscheiden „fertigbauen / archivieren / auf Eis", nicht einfach vergessen. |
| Compliance-Dokumente (Verarbeitungsverzeichnis Art. 30) | 🟡 GELB | Existiert nur im Browser-Speicher einer einzelnen Person/eines einzelnen Geräts, kein Backup. Sollte vor jedem größeren Umbau in die Datenbank gezogen werden. |
| Sicherheits-Restrisiken, bewusst nicht gefixt | 🟡 GELB | 154 Server-Funktionen sind pauschal ohne Login aufrufbar (Supabase-Standardverhalten, meist harmlose Hilfsfunktionen, aber nicht einzeln durchgeprüft); ein Foto-Speicherordner (`hufcam-images`) ist öffentlich lesbar, aktuell leer. |
| appMap.ts als Navigations-Wahrheit | 🟢 GRÜN | Sehr gut gepflegt (247 Einträge, klare live/teilweise/attrappe-Kennzeichnung), wird bereits von zwei Analyse-Dokumenten genutzt — guter Ausgangspunkt für jede weitere Entscheidung. |

---

## Was vor dem Parken zwingend geklärt werden muss

### 1. Ist es überhaupt „Parken" oder „Umbenennen"?

HufManager läuft heute technisch schon unter der Marke „Hufi" auf
`hufiapp.de` (siehe Beleg oben). Es gibt kein zweites, separates
HufManager-Produkt mehr im Betrieb — nur zwei Entwicklungsstände
(Produktions-Branch und Preview-Branch) **derselben** App. „Parken" kann
also nicht bedeuten „ein laufendes zweites Produkt abschalten", sondern:
**„die alte formularlastige Bedienoberfläche zugunsten der neuen
Assistenten-Oberfläche zurückstufen, ohne die dahinterliegenden Daten und
Fachfunktionen zu verlieren."** Diese Umdeutung solltest du bewusst
bestätigen oder korrigieren, bevor irgendetwas geplant wird — der Rest
dieses Berichts geht von dieser Lesart aus.

### 2. Rechnungsversand wirklich testen

Höchste Priorität, weil geschäftskritisch. Schicke dir selbst (oder einem
Testkonto) über die App eine echte Test-Rechnung per E-Mail und eine per
WhatsApp und prüfe, ob sie ankommt. Nachweis für den bekannten Bug:
`ClientInvoices.tsx` rief laut `HUFI_TODO.md` die Rechnungs-Mailfunktion
mit falscher Feldbenennung auf.

### 3. Sicherheitsaudit erneut laufen lassen, nicht nur der Doku vertrauen

Die Berichte `AUDIT_REPORT.md` und `HUFI_TODO.md` sind sehr detailliert,
aber sie sind Momentaufnahmen vom 18./27./30.07. Vor jedem Schritt in
Richtung „alte Oberfläche abschalten, neue wird alleiniger Zugang" sollte
ein frischer, kurzer Nachweis stehen: „Sind die kritischen Lecks (F-1 bis
F-8 im Audit) wirklich noch geschlossen?" — das ist ein Lese-Check, kein
Risiko, aber Pflicht vor einer Grundsatzentscheidung.

### 4. Vier fertig gebaute Programme brauchen eine Ja/Nein/Später-Entscheidung

- **Botschafter-Dashboard** (Empfehlungs-/Affiliate-Programm, 14 Seiten,
  fertig, hinter Flag `botschafterDashboard`)
- **Stallbetreiber-Rolle** (9+ Seiten, fertig, hinter Flag
  `stallbetreiberRolle`) — passt strategisch am besten zu „Hufi ist die
  Welt dahinter", da Stallbetreiber eine eigene Zielgruppe jenseits des
  Hufbearbeiters sind
- **Portal-Whitelabel** (6 Fremdzielgruppen: Versicherung, Tierarzt,
  Hersteller, Ausbildung, Verband, Lieferant, ~35 Dateien, Demo-Daten,
  hinter Flag `portalWhiteLabel`)
- **Hufrente** (Vermittlungsprovisions-Modell, 49€/Monat laut Code,
  fertig gebaut, aber **komplett ohne aktiven Einstiegspunkt** — kein
  Feature-Flag, einfach nicht mehr verlinkt)

Für jedes: entweder „fertigbauen und launchen", „bewusst archivieren
(Code bleibt, aber offiziell kein Vorhaben mehr)" oder „später erneut
bewerten". Keines davon sollte stillschweigend verschwinden — bei
Hufrente insbesondere, weil es ein beworbenes/bezahltes Konzept mit
eigenem Preismodell war.

### 5. Preisgruppen (VIP/Großstall/Individuell) — Datenverlustrisiko bei stillem Wegfall

Kunden könnten in der Vergangenheit einer Preisgruppe zugeordnet worden
sein (`profiles.price_group`). Falls eine neue Kunden-Oberfläche dieses
Feld nicht mehr anzeigt/pflegt, laufen Kunden fachlich weiter mit dem
alten (Rabatt-)Preis, ohne dass das irgendwo sichtbar ist. Vor jedem
Umbau: prüfen, ob es aktive Preisgruppen-Zuordnungen gibt.

### 6. Verarbeitungsverzeichnis (Art. 30 DSGVO) in die Datenbank ziehen

Aktuell nur im Browser-Speicher (`localStorage`) einer Person gespeichert
(`src/pages/admin/Verarbeitungsverzeichnis.tsx`). Das ist ein Dokument,
das bei einer Datenschutzprüfung vorgelegt werden muss — ein
Cache-Löschen oder Gerätewechsel würde es unwiederbringlich löschen. Sollte
so oder so bald in eine Datenbanktabelle wandern, unabhängig vom Parken.

---

## Was übernommen werden sollte (in die neue Hufi-Oberfläche, aktiv kuratiert)

- LTZ-Hufanalyse-Assistent samt Empfehlungslogik (fachlich einzigartigste
  Funktion im gesamten System, siehe Dokument 1/3)
- Termine, Tourenplanung, automatische Folgetermin-Erinnerung
- Rechnungen, Fahrtkosten, Buchhaltungs-Export
- Pferdeakte komplett (Gesundheit, Medien, Vet-Doku, Tresor)
- Notfall-QR/Notfallzugriff
- Mitarbeiter-, Partner- und Kundenrollen mit ihrer heutigen
  Berechtigungsstufe (Grunddaten vs. Medizin-Freigabe)
- Rechtlich Pflichtiges: DSGVO-Export/-Löschung, Impressum, Datenschutz

## Was nur archiviert werden sollte (Code bleibt lesbar erhalten, kein aktiver Einstieg mehr)

- Portal-Whitelabel-Produkt (hoher Aufwand, keine belegte Nachfrage)
- Website-Editor/No-Code-Baukasten (verwaist, hoher Aufwand)
- Academy/Ecosystem/Glossar/AboMatrix (kleine, längst verwaiste
  Marketing-Utility-Seiten ohne belegten Nutzungsnachweis)
- Alte, tote Onboarding-Varianten (`OnboardingWizard.tsx`,
  `HufiNewUserOnboarding.tsx`) und nicht gerenderte FABs
  (`SpeedDialFAB`, `HelpCenterFAB` etc.)

## Was NICHT automatisch übernommen werden darf

- Preisüberschreitungen/Rabattlogik ohne erneute fachliche Prüfung
  (Preisgruppen-Logik ist alt, evtl. nicht mehr aktuell)
- Bereits als Fake/irreführend entfernte Inhalte dürfen nicht versehentlich
  über einen alten Branch/Stash wieder hereinkommen (Fake-Testimonials,
  Fake-Steuerberater-Link waren laut `WORKING_DIR_INVENTORY.md` mehrfach
  „schon entfernt" dokumentiert, liefen aber zeitweise trotzdem noch live)
- Provider-Portal-Credentials-Feld (`provider_portal_credentials`) — wurde
  laut Roadmap bewusst entfernt (manuelles CopeCart-URL-Feld), sollte nicht
  wieder auftauchen

---

## Welche Daten vor dem Parken exportiert werden sollten

Da keine zweite Datenbank existiert, ist „Export vor dem Parken" hier
gleichbedeutend mit „Sicherungskopie vor jedem größeren, irreversiblen
Umbauschritt" — nicht mit einem klassischen System-zu-System-Transfer:

1. Ein vollständiger Schema-Dump (`pg_dump --schema-only`) unmittelbar vor
   jeder größeren strukturellen Änderung (z.B. Konsolidierung der vier
   Huf-Datentabellen `hoof_entries`/`hoof_history`/`hoof_photos`/
   `hoof_analyses`, siehe Dokument 1 Abschnitt 2.3) — technischer Schritt,
   nicht in diesem read-only-Bericht ausgeführt.
2. Vor Archivierung des Portal-Whitelabel-Codes: keine Datenexport-Pflicht,
   da laut Audit die zugehörigen Tabellen (`ecosystem_apps` etc.) leer
   sind.
3. Vor jeder Rollenzusammenlegung (z.B. der vier parallelen Management-
   Hubs, siehe Architektur-Analyse Abschnitt 11): sicherstellen, dass
   keine rollenspezifische Tabelle beim Umbau vergessen wird — die
   Architektur-Analyse listet die betroffenen Routen bereits vollständig.

## Read-only-Archivlösung (Vorschlag, keine Umsetzung in diesem Bericht)

Da Code und Datenbank ohnehin gemeinsam genutzt werden, wäre eine sinnvolle
„Parken"-Form: **die alten, formularlastigen Seiten (Sidebar-Navigation
je Rolle) bleiben als technisch erreichbarer, aber nicht mehr beworbener
Fallback bestehen** (z.B. über eine `?legacy=1`-Route oder ein
Admin-only-Zugang), während die neue Hufi-Oberfläche zum einzigen
beworbenen Einstieg wird. Das entspricht dem bereits im Code etablierten
Muster der Feature-Flags (`featureFlags.ts`) — kein neues Konzept, nur
konsequent auf die alte Navigation angewendet.

---

## Rechtliche Prüfbedarfe (keine Rechtsberatung, nur Hinweise auf offene Fragen)

- Aufbewahrungspflichten für Rechnungen/Buchhaltungsdaten — unabhängig
  vom Parken ohnehin einzuhalten (die Daten bleiben ja in derselben DB).
- Einwilligungen (`consent_log`, `dsgvo_consent`) sollten nicht neu
  eingeholt werden müssen, solange dieselbe Datenbank/derselbe
  Verantwortliche weiterläuft — aber falls sich der Markenauftritt
  („HufManager" → „Hufi") kundenseitig wesentlich ändert, ist eine
  Rückfrage beim Datenschutzbeauftragten/Anwalt sinnvoll, ob eine erneute
  Information der Nutzer nötig ist. **Keine abschließende Rechtsauskunft
  hier.**
- Kleinunternehmerregelung/CopeCart-Reseller-USt-Ausweis — laut
  `AUDIT_REPORT.md` offene Rückfrage an den Steuerberater, unverändert
  offen.

---

## Mandantentrennung — muss erhalten bleiben

Die fünf Rollen (provider/client/admin/employee/partner) und die
differenzierte Partner-Freigabe (Grunddaten vs. Medizin) sind das
Herzstück der Mandantentrennung. Jede neue Oberfläche (Assistent,
Workspace) muss dieselben `auth.uid()`-gebundenen Regeln respektieren —
das ist bereits Bestandteil des geteilten Codes und sollte bei jedem
Umbau explizit gegengeprüft werden, nicht als „selbstverständlich"
angenommen (siehe die historischen SECURITY-DEFINER-Lecks in Dokument 1
Abschnitt 4 als Warnung, wie leicht das schiefgehen kann).

---

## Kurzfassung für eine schnelle Entscheidung

Wenn du nur drei Dinge aus diesem Bericht mitnimmst:

1. **Teste den Rechnungsversand echt, heute** — das ist die Funktion mit
   dem höchsten Geschäftsrisiko bei unklarem Status.
2. **Es gibt nichts zu „migrieren"** — eine Datenbank, ein Code. Die
   eigentliche Arbeit ist kuratieren (was zeigt die neue Oberfläche) und
   entscheiden (Botschafter/Stallbetreiber/Portal/Hufrente: ja, später,
   oder archivieren).
3. **appMap.ts ist bereits eine gute Landkarte** — 247 Einträge, sauber
   nach live/teilweise/attrappe sortiert. Jede weitere Entscheidung sollte
   sie als Ausgangspunkt nehmen statt neu zu recherchieren.
