# REPO-001 — Additive Release-Infrastruktur

## Grenze

Diese Infrastruktur erzeugt immutable Release-Verzeichnisse, aber sie schaltet
keinen Nginx-Webroot um, lädt Nginx nicht neu und deployed nichts. Die
Produktionsquelle `/root/hufmanager_v25/production` bleibt unverändert.

## Ablauf

`scripts/create-isolated-release.sh` verlangt immer `--target-root`. Ohne
`--apply` ist es ein echter Dry-Run. Mit `--apply` erstellt es ausschließlich
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

Die Skripte lehnen die eingefrorene Produktionsquelle, den Legacy-Webroot und
alle unter `/var/www` gefundenen `current`-Webroots ab. Releases werden nie
überschrieben. `current`/`previous` werden ausschließlich durch die
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
