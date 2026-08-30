# HufManager Slim – kanonische Provenienz

Stand: 30.08.2026. Dieses Dokument beschreibt ausschließlich die lokale
Source-of-Truth-Konsolidierung. Es ist weder Deploymentfreigabe noch
Migrationsanweisung.

## Unveränderliche Herkunft

- Kanonische Basis: `dd7d7faaddc6d10dc6b15d08449986ecaf93d56f`
- Lokaler Schutzanker: `hufmanager-prod-2026-08-17-dd7d7faa`
- Security-Quelle: `ac60af7b542fadfe00dc6410ebd9e11cba7c2ff2`
- Security-Schutzanker: `hufmanager-pre-canonical-main-update-ac60af7b`
- Release-Branch: `release/hufmanager-slim-canonical-2026-08-30`
- Production-Tour-Migrations-ID: `20260817071323`
- Quarantänisierte, nicht produktive Lager-RPC-ID: `20260817114000`

Die 61 Commits zwischen `origin/main@147d80a5` und `dd7d7faa` bleiben linear,
unverändert und über den Basis-Commit vollständig erreichbar. Weder Rebase noch
Squash oder selektive Rekonstruktion gehören zu dieser Release-Linie.

## Erlaubte Forward-Deltas

Gegen `dd7d7faa` sind in diesem Konsolidierungstask ausschließlich erlaubt:

1. der per `cherry-pick -x` übernommene, inhaltlich unveränderte Security-Patch
   aus `ac60af7b`;
2. der byteidentische Rename der Tour-Migration auf `20260817071323`, die
   vollständige Quarantäne der Lager-RPC und die read-only Postcondition-Abfrage;
3. nicht deployende HufManager-Provenienz-, Verify-, CI- und Rollback-Artefakte;
4. die im Konsolidierungsplan ausdrücklich benannte Ablösung der beiden freien
   `z-[500]`-Werte durch den bestehenden `z-tour`-Layer-Token, damit das
   verpflichtende Layer-Gate wirksam und grün ist.

Jeder andere Produkt-, Datenbank-, Edge-, Landingpage- oder Infrastruktur-Diff
ist außerhalb dieses Tasks.

## Buildnachweis

`npm run verify:hufmanager:canonical` führt ohne Deployment aus:

- lockfile-fixiertes `npm ci`, TypeScript und die vollständige Vitest-Suite;
- Layer-Check und scoped ESLint gegen die dokumentierte `dd7d7faa`-Baseline;
- statische Migrations-/Quarantäneprüfung und Secret-Scan;
- isolierten HufManager-Flavor-Build;
- Erzeugung von `dist/BUILD_INFO` und `dist/SHA256SUMS`;
- erneute Hash-, Flavor-, Domain-, Supabase-Fingerprint- und Bundleprüfung.

`BUILD_INFO` bindet das Artefakt an Commit, Branch, Basis, Security-Quelle,
Flavor, Zieldomain, Lockfile, Tour-Migration, Supabase-Konfiguration sowie die
Quellhashes und Production-Rollbackanker der beiden Edge Functions.

Die ESLint-Baseline ist keine Qualitätsfreigabe: sie verhindert neue Funde im
61er-Scope, während bestehende Funde sichtbar bleiben. Für einen Production-
Rollout ist weiterhin eine Nullfehler-Baseline erforderlich.
