> **Produktbeschluss 09.10.2026 — HufManagerOS v1.0:** Dies ist ab sofort der verbindliche Produkt- und Dokumentationsname (Schreibweise exakt). EIN Kundenprodukt statt eigenständiger HufiApp. Standard 19,95 €/Monat (manuell), Premium 49,90 €/Monat (+ Hufi Voice/KI; weiterhin manuell nutzbar), Team Premium 199 €/Monat (Zieltarif; Seats/Kontingente offen). Pferdebesitzer kostenlos; Fachpartner-Preismodell offen. Frühere Begriffe „HufManager Slim“, „HufManager OS“ oder „HufiApp“ in Bestandsdateien gelten als historische/technische Bezeichnungen. **v1.0 = beschlossene Produkt-/Dokumentationsversion, nicht verifizierter technischer Release oder SALE_READY.** Keine automatischen Umbenennungen von URLs, Git-Repositories, Umgebungsvariablen, Datenbanken, Komponenten, Webroots oder Versionstags. HufiOS/HufiBoss bleiben eigenständige interne Systeme. Sicherheits-, Freigabe- und Release-Gates bleiben verbindlich. Quelle: [kanonische Produktstrategie](docs/product/HUFMANAGER_OS_PRODUCT_CANON_2026-10-08.md).

> **Aktueller Produktbeschluss (08.10.2026):** [HufManager OS – kanonische Produktstrategie](docs/product/HUFMANAGER_OS_PRODUCT_CANON_2026-10-08.md). Das historische „HufiApp“ in älteren Kopfzeilen/Abschnitten ist kein Auftrag, zwei Endkundenprodukte weiterzuentwickeln. Produktziel: eine DACH-Plattform mit drei Hufprofi-Tarifen (19,95/49,90/199 €), kostenlosem Besitzerzugang und noch offenem Fachpartner-Modell. Hufi Voice ist Premium-Schicht. Bitte zwischen Produktziel und Runtime-Evidenz unterscheiden; die untenstehenden Regeln zu Supabase PROD, CODEXTODO, Deploy und Sicherheit gelten weiterhin und werden NICHT gelockert. Keine separate Webroot-Migration ohne Freigabe.

# HufiApp — Projektkontext

## Stack
React + TypeScript + Vite, Supabase (DB, Auth, Storage, Edge Functions),
Tailwind. Deployment auf VPS via Nginx.

## Umgebungen — IMMER prüfen, bevor du eine DB anfasst
- PROD: `vnschgjxkzzwzefqlrji` (EU/Frankfurt) — echte Kundendaten
- Ein eigenes Staging-Projekt existiert in dieser Organisation aktuell
  NICHT. `GET /v1/projects` listet nur PROD und `xeikdhzwzuqrqztwqlgz`
  (Assaon, INACTIVE). Wer "Staging" sagt, muss erst klären, was gemeint ist.
- FALLE: Der Supabase-MCP zeigt nicht zuverlässig auf PROD. Wer PROD meint,
  nutzt die Management API oder die Supabase-CLI mit explizitem Projekt.
- Schreib in deine Antwort, gegen welches Projekt du gearbeitet hast.

## Lesend auf PROD arbeiten
Management API mit `read_only: true` — Postgres lehnt Schreibvorgänge dann
selbst ab, das ist stärker als jede Selbstdisziplin:
```
POST https://api.supabase.com/v1/projects/vnschgjxkzzwzefqlrji/database/query
Body: {"query": "...", "read_only": true}
Auth: Bearer <Token aus ~/.supabase/access-token>
```

## Deploy — nicht verhandelbar
- Frontend: ausschließlich `./deploy.sh`
- Edge Functions: separat über die Supabase-CLI
- Niemals direkt auf dem Server Dateien editieren, nie von Hand rsyncen
- HTTP 200 ist KEIN gültiger Erfolgs-Check nach einem Deploy
- Vor jedem Deploy Richtung PROD (echte Kundendaten): security-review laufen
  lassen, bevor deployt wird — vom Nutzer am 2026-08-02 als Standard bestätigt.

## Bekannte Fallen
- `appointments.status` ist freier Text ohne CHECK-Constraint. "Offen" kann
  `scheduled`, `planned` ODER `confirmed` heißen — jede Abfrage auf status
  muss alle drei behandeln.
- `hufai-proactive.ts` und `hufi-briefing.ts` haben gleichen Typnamen,
  sind aber laut Audit vom 2026-08-06 **beide aktiv und live genutzt**
  (`hufai-proactive.ts` in `MobileShell.tsx`/`HufiWeatherWidget.tsx`,
  `hufi-briefing.ts` in `ProactiveBriefing.tsx`) — keine tote Kopie, echte
  Konsolidierungslücke. Vor Änderungen beide Importstellen prüfen, nicht
  nur eine der beiden Dateien.
- Offene Punkte stehen in `HUFI_TODO.md` — zuerst dort lesen.

<!-- HUFI_DESIGN_SYSTEM_REQUIRED_V1 -->
## Verbindliches Hufi-Designsystem

Vor jeder Arbeit an UI, UX, Frontend, Webseiten, Marketingflächen, Grafiken oder Markenkommunikation muss gelesen werden:

- docs/design/HUFI_DESIGN_SYSTEM.md

Die dort definierten Tokens, Komponenten, Light-/Dark-Regeln, Markenprinzipien und Governance-Vorgaben sind verbindlich.

Keine neue Farbe, Typografie, Komponente oder visuelle Designsprache darf ohne dokumentierte Begründung außerhalb dieses Systems eingeführt werden.

<!-- /HUFI_DESIGN_SYSTEM_REQUIRED_V1 -->

## Arbeitsweise mit mir
- Ich bin Solo-Gründer, wenig Zeit, arbeite meist vom Handy oder Chromebook
  über SSH. Ich bin Handwerker, kein Programmierer — erklär Technik in
  normalem Deutsch, wenn sie eine Entscheidung von mir braucht.
- Antworte knapp. Keine Zusammenfassung dessen, was ich im Terminal ohnehin
  gesehen habe.
- Bei mehr als 3 geänderten Dateien: erst Plan zeigen, dann bauen.
- Sicherheit und Kundendaten haben Vorrang vor Feature-Tempo.
- Wenn du unsicher bist, ob etwas PROD betrifft: fragen, nicht raten.

<!-- HUFI_ACCOUNT_CLAUDE_BOOTSTRAP_V1 -->
## HUFI Account Project Standard

Before substantial work in this repository, read and follow `AGENTS.md`. Existing project-specific rules in this file remain authoritative for this repository and are supplemented by the account-wide HUFI standard.

Core workflow:

**DISCOVER → VERIFY → REUSE → IMPLEMENT → TEST → VERIFY LIVE → DOCUMENT**

Do not guess production state. Use `UNKNOWN` when evidence is missing. `BUILT` is not `PRODUCTION`, and `NOT TESTED` is not `PASS`.

Public account foundation:
- `passaondigital/hufi-architecture-board/docs/00_UNIVERSAL_PROJECT_STANDARD.md`
- `passaondigital/hufi-architecture-board/docs/01_PROJECT_BOOTSTRAP.md`
- `passaondigital/hufi-architecture-board/docs/02_AGENT_RELEASE_STANDARD.md`

Authorized internal work may also use the private reusable skills in `passaondigital/hufi-factory/skills/`.

<!-- /HUFI_ACCOUNT_CLAUDE_BOOTSTRAP_V1 -->
