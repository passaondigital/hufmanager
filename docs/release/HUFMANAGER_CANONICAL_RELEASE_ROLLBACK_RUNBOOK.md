# HufManager Slim – Release- und Rollback-Runbook

Status: lokale, nicht automatisch ausführende Grundlage vom 30.08.2026.
Alle Production-Schritte benötigen einen eigenen Task und eine neue ausdrückliche
Operator-Freigabe. Dieses Runbook führt selbst nichts aus.

## Harte Grenzen

- kein `supabase db push`, keine Migration und kein Schema-Write;
- kein Edge-Function-Deploy;
- kein Merge nach `main`, Push oder Force-Push ohne gesonderte Freigabe;
- kein direktes Überschreiben von `/var/www/hufmanager/app`;
- keine Änderung an HufiApp, HufiOS, HufiBoss oder HUFI-Jarvis.

## Source-Gate

Vor einem späteren PR müssen alle folgenden Nachweise vorliegen:

1. Branch basiert auf `dd7d7faaddc6d10dc6b15d08449986ecaf93d56f` und die
   61er-Historie ist unverändert.
2. Die beiden Schutz-Tags zeigen weiterhin auf `dd7d7faa` und `ac60af7b`.
3. `git diff dd7d7faa..HEAD` entspricht der Provenienz-Allowlist.
4. `npm run verify:hufmanager:canonical` ist grün und `dist/BUILD_INFO` nennt
   exakt den zu reviewenden Commit.
5. `dist/SHA256SUMS` stimmt bytegenau mit dem Review-Artefakt überein.
6. Production bleibt NO-GO, solange die dokumentierten Produkt-P0s, Mobile-/
   Cross-Tenant-E2E oder die vollständige Lint-Nullbaseline fehlen.

Ein späterer PR richtet sich gegen den geschützten `main`. Die 61er-Historie
wird ausschließlich vorwärts integriert; ein Rebase/Squash dieser Historie ist
unzulässig.

## Migrations- und Edge-Gate

- Production führt die Tour-Baseline unter `20260817071323`; die frühere
  Repository-ID `20260815130000` darf niemals erneut angewendet werden.
- `supabase/postconditions/hufmanager_slim_production_baseline.sql` enthält nur
  lesende Abfragen. Eine spätere Production-Prüfung erfolgt ausschließlich in
  einer read-only Transaktion/Rolle und muss für jede Zeile `passed=true` liefern.
- `consume_inventory_stock(jsonb)` bleibt quarantänisiert und darf weder durch
  CI noch durch einen HufManager-Slim-Release erzeugt werden.
- Backend und Frontend werden getrennt freigegeben. Aktuelle Edge-Rollbackanker:
  `get-route` Version 50 und `get-client-tour-status` Version 1, jeweils mit
  `verify_jwt=true`.

## Späterer unveränderlicher Frontend-Release

Nach eigener Deploymentfreigabe wird ausschließlich das bereits geprüfte
Artefakt verwendet. Zielbild:

```text
/var/www/hufmanager/releases/<UTC>-<commit>/
  BUILD_INFO
  SHA256SUMS
  index.html
  assets/...
/var/www/hufmanager/current  -> releases/<neuer-release>
/var/www/hufmanager/previous -> releases/<vorheriger-release>
```

Das neue Release-Verzeichnis wird vollständig befüllt, gegen `SHA256SUMS`
geprüft und erst danach unveränderlich finalisiert. Der Wechsel von `current`
erfolgt atomar. Anschließend sind HTTP-, Asset-, Branding-, Auth- und
HufManager-Flavor-Smokes verpflichtend. Datenbank und Edge Functions bleiben
dabei unverändert.

## Rollback

### Source

Neue Konsolidierungscommits werden einzeln mit normalen Revert-Commits
rückgängig gemacht. `main` wird nicht zurückgesetzt und die 61er-Historie nicht
umgeschrieben. Branches, Tags und alte Worktrees bleiben bis nach einem
erfolgreichen Rollbacktest erhalten.

### Frontend

Der `current`-Symlink wird atomar auf den zuvor per Hash bestätigten
`previous`-Release zurückgeschaltet. Danach laufen dieselben HTTP-/Asset-/Auth-
Smokes. Kein überschreibendes `rsync` in einen Live-Webroot.

### Datenbank und Edge

Die additive Tour-Baseline bleibt bei einem Frontend-Rollback bestehen; es gibt
keine destruktive Down-Migration. Edge-Rollback ist nur ein bewusst freigegebenes
erneutes Deployment der dokumentierten Vorversion. Für die quarantänisierte
Lager-RPC besteht kein Production-Rollbackbedarf.
