# REPO-001 — Additive Release-Infrastruktur

## Grenze

Diese Infrastruktur erzeugt Release-Verzeichnisse, die durch die Skripte nie
überschrieben werden. Ein Release wird zuerst vollständig in einem Staging-
Verzeichnis erstellt und erst mit einem atomaren `mv` unter seinem finalen
Namen sichtbar. Dies ist keine Behauptung einer Dateisystem-Immutable-Policy:
Administratoren könnten Dateien weiterhin manuell ändern. Die Infrastruktur
schaltet keinen Nginx-Webroot um, lädt Nginx nicht neu und deployed nichts.
Die Produktionsquelle `/root/hufmanager_v25/production` bleibt unverändert.

## Ablauf

`scripts/create-isolated-release.sh` verlangt immer `--target-root`. Ohne
`--apply` ist es ein echter Dry-Run. Erlaubt sind ausschließlich
`/var/www/hufiapp` und isolierte `/tmp/repo-001-*`-Testpfade. Mit `--apply`
prüft es zuerst einen vollständig sauberen Git-Arbeitsbaum, erstellt dann
`<target-root>/releases/<release-name>` sowie `<target-root>/shared`, baut mit
`VITE_APP_FLAVOR=hufiapp` und schreibt dort `BUILD_INFO`.

`BUILD_INFO` enthält nur:

- Paketversion
- vollständigen Git-Commit
- UTC-Build-Zeit
- Flavor `hufiapp`
- Ziel-Domain `https://hufiapp.de`

Es enthält keine Umgebungsvariablen oder Secret-Werte. Vor dem Kopieren wird
das Artefakt auf Service-Role- und Private-Key-Muster geprüft.

Die Zielpfad-Allowlist schließt die eingefrorene Produktionsquelle, Legacy-
Webroots und alle anderen Verzeichnisse aus. Releases werden nie
überschrieben; bei Fehlern vor dem finalen `mv` entfernt ein `trap` das
Staging-Verzeichnis. `current`/`previous` werden ausschließlich durch die
Testskripte unter einem expliziten `/tmp/...`-Pfad erzeugt; der Rollback setzt
dort `current` auf `previous` zurück.

## Verifikation und Rollback

1. Syntax: `bash -n scripts/{create-isolated-release,verify-isolated-release-links,rollback-isolated-release}.sh`
2. Dry-Run mit explizitem temporären Zielpfad ausführen.
3. Isoliertes Release unter einem temporären Zielpfad erzeugen und
   `BUILD_INFO` prüfen.
4. Symlink-Test ausführen; anschließend den Rollback-Test ausführen.
5. Für einen isolierten Testpfad genügt das Entfernen des Testverzeichnisses.
   Eine spätere Produktionsumschaltung benötigt eine separate Pascal-Freigabe.

## Read-only Produktionsabweichungen

| Abweichung | Quelle / Nachweis | Status und Risiko | Spätere Pascal-Entscheidung |
|---|---|---|---|
| Partner-Hotfix | Produktionscommit `256603ac`, `src/components/partner/PartnerAppLayout.tsx` | Fehlt im kanonischen Repository; bei späterer Umschaltung mögliche Partner-Regression | Separat prüfen und gezielt übernehmen oder verwerfen |
| Hufi-Agent-/Voice-Differenz | Read-only Vergleich: `supabase/functions/hufi-agent/index.ts`, `src/hooks/useHufiTTS.ts`, `src/lib/hufi-voice-config.ts`, `src/components/voice/HufiVoiceSelector.tsx`; `capability-registry.ts` ungeklärt | Funktionales Rücksetzrisiko; keine sichere automatische Übernahme | Dateiweise mit Pascal prüfen; keine Übernahme in REPO-001 |

Keiner dieser Punkte wird durch REPO-001 kopiert, gemergt oder geändert.
