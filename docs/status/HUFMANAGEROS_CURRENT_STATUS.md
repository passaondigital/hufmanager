# HufManagerOS v1.0 – Projekt- und Nachweisstand

**Stichtag:** Samstag, 10.10.2026, 23:03 Uhr (Europe/Berlin, MESZ)  
**Dokumentversion:** 1.0 · Dokumentationsabgleich · **keine Release-Freigabe**  
**Geltungsbereich:** öffentlich teilbare Projektübersicht. Detaillierte Sicherheits-, Personen- und Backup-Protokolle bleiben in den zugriffsgeschützten Betriebsunterlagen.

> **Leseanweisung:** Dies ist die aktuelle öffentliche Statusübersicht. Produktentscheidungen sind nicht mit produktiv getesteten Funktionen gleichzusetzen. Bei Widersprüchen gewinnt ein neuerer, nachweisbarer Runtime-, Datenbank- und Teststand. Die historische Datei [`docs/CURRENT_STATE.md`](../CURRENT_STATE.md) vom August 2026 ist keine aktuelle Freigabe. Vor Implementierungen gelten weiterhin `AGENTS.md`, `CLAUDE.md` und die operative Queue `CODEXTODO.md`.

## 1. Produkt und Entscheidungen

- **Ein Kundenprodukt:** exakt **HufManagerOS v1.0** (Name seit 09.10.2026). Frühere Namen `HufManager Slim` und `HufiApp` beschreiben historische Versionen oder technische Altkomponenten, **keine zwei getrennten künftigen Angebote**.
- **Standard:** Zieltarif **19,95 € / Monat**, manuell nutzbar.
- **Premium:** Zieltarif **49,90 € / Monat**, Standard plus optionaler Voice-/KI-Modus, manuelle Bedienung bleibt vollständig.
- **Team Premium:** Zieltarif **199,00 € / Monat**, Umfang, inklusive Sitze und Verbrauchsgrenzen noch offen.
- Pferdebesitzerzugang im vorgesehenen Funktionsumfang kostenlos; Fachpartner-Tarifmodell offen.
- Zielbild: ein durchgängiger Arbeitsprozess **Anfrage → Kunde → Pferd → Termin → Tour → Dokumentation/Material → Rechnung → Folgetermin**, mit autorisiertem Besitzer- und Fachpartnerzugriff. **Codevorhandensein beweist keine Live-Funktionsreife.**
- Positionierung: *Weniger Büroarbeit. Mehr Zeit am Pferd.* / *Vom ersten Kunden bis zum eigenen Team.*
- Neue UI-Richtung: Orange `#E97824`, Weiß, Schwarz, neutrale Abstufungen; einfache Navigation, mobile Benutzbarkeit und sichtbares Abmelden.

**Strategiequelle:** [Produktbeschluss vom 08.10.2026](../product/HUFMANAGER_OS_PRODUCT_CANON_2026-10-08.md), ergänzt durch Eigentümerentscheidung zur verbindlichen Produktbezeichnung vom 09.10.2026.

## 2. Laufzeit, Code und Supabase

| Bereich | Stand und Beweisart | Einordnung |
| --- | --- | --- |
| Web-Anwendung | HufManagerOS wird produktiv ausgeliefert; OVH ist führender Web-Host laut Operator- und Deploy-Berichten vom 09.–10.10. | **REPORTED PRODUCTION**, Live-Build-SHA vor jedem Release erneut abfragen |
| Datenbank | Ein autoritatives Supabase-PROD-Projekt; am 10.10. per Supabase-Projektabfrage `ACTIVE_HEALTHY`, Region `eu-central-1`, Postgres 17.6.1.054. | **PROJECT STATUS VERIFIED**, fachliche E2E-Tests separat |
| Migrationen | 466 registrierte Migrationen laut read-only Supabase-Ledger-Abfrage am 10.10. nach 23:03 Uhr. | **LEDGER VERIFIED**, nicht gleichbedeutend mit gesamter Zugriffssicherheit |
| Edge Functions | 81 Funktionen im Projekt gelistet, read-only abgefragt am 10.10. nach 23:03 Uhr. | **INVENTORY VERIFIED**, vollständige Code-/Konfigurationssicherung offen |
| Entwicklungs-/Testumgebung | Isolierte Entwicklungs- und Restore-Umgebung getrennt von PROD. | **SEPARATE** – kein Dual-Write und kein ungeprüftes PROD-Deployment |
| Öffentliches GitHub-Repo | Dieses Repository ist nicht automatisch identisch mit dem jeweils lokal entwickelten oder auf dem Webserver ausgelieferten Stand. | **BRANCH / DEPLOY PROVENANCE REQUIRED** |

**Wichtig:** Das Supabase-Migrationsledger enthält auch Sicherheitsmigrationen vom 08.–10.10.; ein eingetragener Migrationsname allein ist noch kein nachgewiesener erfolgreicher Berechtigungs-/RLS-Negativtest. Dieses öffentliche Statusdokument enthält ausdrücklich keine Exploit-Rezepte, geheimen Betriebsdaten oder personenbezogenen Testnachweise.

## 3. Sicherheit, Testabnahme und Verkauf

| Prüffeld | Bewertung zum Stichtag | Nächster Nachweis |
| --- | --- | --- |
| Sicherheitskorrekturen Registrierung und Demo-Zugänge | **REPORTED PASS** aus Betreiber-/Agentenprüfungen | Gesamte rollenübergreifende Regression |
| Sechs Demo-Rollen im echten Browser | **PARTIAL** – automatisierte Tests begonnen, agentenbedingt unterbrochen | Playwright/Browser/API/E2E für alle Rollen, mobil und Desktop |
| Mandantentrennung einschließlich Storage | **PARTIAL / RETEST REQUIRED** | Autorisierte negative Cross-Tenant-Tests über alle relevanten Datenbereiche |
| E-Mail-Bestätigung und Zustellung | **BLOCKED / NOT VERIFIED END-TO-END** | Signup → Mailbestätigung → Login + Zustellbarkeit |
| CopeCart, Berechtigung nach Kauf, Abo-Lifecycle | **NOT VERIFIED END-TO-END** | Reproduzierbarer Kauf-/Kündigungs-/Refund-/Entitlement-Test |
| Route, Material, Rechnungen und UI | Bausteine existieren; **vollständige neue Live-Abnahme offen** | Durchgehender Golden Flow, Mobile/Offline/Regression |
| **SALE_READY** | **NO** | Alle releasekritischen Gates mit aktuellem Nachweis schließen |

**Bedeutung:** Frühere September-Berichte mit grünen Tests bleiben historische Nachweise, sind jedoch keine pauschale Sicherheits- oder Verkaufsfreigabe nach Änderungen und neuen Erkenntnissen im Oktober.

## 4. Backup und Wiederherstellung

- **Historisches Datenbankbackup vom 08.10.2026:** Ein realer, isolierter Wiederherstellungstest auf einem getrennten Host wurde am 10.10. vom Betreiber mit `RESTORE_TEST=PASS`, `CLEANUP=PASS`, `SENDER_GPG_INTEGRITY=PASS`, `RESTORE_TEST_FINAL=PASS` und Exit-Code 0 protokolliert. **REPORTED VERIFIED DB RESTORE**, bezogen auf genau diesen historischen Sicherungsstand.
- **Automatische verschlüsselte Datenbanksicherung:** systemd-Timer auf dem Produktivhost am 10.10. installiert und bis zum geprüften Backup-Skriptstand `cadc6ac9` aktualisiert. Timer, Prüfsummen und Retry-Konfiguration wurden laut Betreiber-/Agentenbericht geprüft.
- **Erster geplanter automatischer Lauf:** 11.10.2026 um ca. 02:32 UTC / 04:32 MESZ. **Zum Stichtag noch ausstehend; daher kein behaupteter erfolgreicher Nachtlauf.**
- **Nicht durch den Datenbank-Restore abgedeckt:** Storage-Binärdateien (Bilder/PDFs), vollständige Konfiguration, sämtliche Edge-Function-Quellen und Secrets, unabhängige aktuelle externe Backup-Kopie, frischer Restore-Test.
- **RECOVERY_READY=NO** bis ein vollständiger, externer, aktueller und nachweislich restaurierbarer Notfallpfad vorliegt.

Die detaillierten Restore-, Zugriffs- und Schlüsselprotokolle werden absichtlich **nicht** in diesem öffentlichen Repository veröffentlicht.

## 5. Prioritäten

1. Tatsächliches Ergebnis des ersten automatischen Nachtbackups prüfen, anschließend externe verschlüsselte Kopie, Storage- und Konfigurationssicherung samt Restore-Test.
2. Automatisierte Browser-, Rollen-, Mandanten-, Storage- und Mobilabnahme ohne manuelle Tests durch den Product Owner; offene Prüfung als **UNKNOWN** kennzeichnen.
3. E-Mail-Bestätigung/Deliverability und sicheres Zuordnen von Anfragen abschließen.
4. Durchgehenden Kauf- und Abrechnungsprozess für Standard beweisen, bevor Angebote skaliert werden.
5. UX- und Kernprozess-Reibung gezielt beheben; wiederverwendbare vorhandene Module bevorzugen.

**Keine** ungefragten produktiven Änderungen, Migrationsläufe, Deployments, Zahlungen, E-Mails an echte Kunden, DNS-Umschaltungen oder offenen GitHub-Pushes mit internen Artefakten.

## 6. Versions- und Quellenregel

- 2025: frühe HufManager-Versionen und Branding (historische private Archive).
- Februar 2026: umfangreicher HufManager-Pro-Referenzstand (nicht als aktuelle PROD-Basis behandeln).
- August/September 2026: historische Slim-/HufiApp-Produkt-, CI-, QA- und Releaseentscheidungen. Ältere Claims bleiben im Git- und Drive-Verlauf nachvollziehbar.
- 08.10.2026: Beschluss eines einheitlichen Kundenprodukts.
- 09.10.2026: verbindlicher Produktname **HufManagerOS v1.0**.
- 10.10.2026, 23:03 MESZ: diese konsolidierte öffentliche Projektübersicht; historische DB-Wiederherstellung bestanden, automatische Backup-Läufe noch nicht ausgeführt, vollständige Produktabnahme weiter offen.

**Dokumentationsregel für Folgestände:** Immer **Datum, Uhrzeit und Zeitzone**, **was** sich geändert hat, **wo** (Komponente/Umgebung), **wie** geprüft wurde, **warum** relevant, **Ergebnis/Status**, **Quelle/Test/Commit**, **Risiken/noch offen** dokumentieren. Frühere Stände nicht stillschweigend löschen; neue verifizierte Fakten mit Zeitstempel fortschreiben.

Die ausführliche Master-Projektakte samt Quellregister liegt **zugriffsbeschränkt im Google Drive des Eigentümers**. Für Produktionsaktionen sind nur die tatsächlich verifizierten Live-Daten, aktuellen Repo-Regeln und expliziten Freigaben maßgeblich.

---

*Erstellt aus dem Abgleich der bestehenden Projekt-/Release-/Produktdokumentation und der mitgeteilten Operatorprotokolle bis 10.10.2026, 23:03 Europe/Berlin; zusätzliche Supabase-Metadaten-Leseprüfung nach diesem Stichtag ausdrücklich gekennzeichnet. Keine Änderungen an App-Code, PROD-DB oder Secrets.*
