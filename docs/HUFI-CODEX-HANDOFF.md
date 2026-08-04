# HUFI Codex Handoff

Stand: 2026-08-04 (Terra, P0-Prüfeinheit)

## P0-Status

- Der Partner-Layout-Absturz aus `docs/qa/hufi-agent-e2e-test-report.md` ist bereits durch Commit `256603ac` behoben: `PartnerAppLayout` hat einen Default-Export, passend zum `React.lazy`-Import.
- Der Hufi-Agent-Modellfehler ist im aktuellen Branch behoben: `supabase/functions/hufi-agent/index.ts` verwendet `claude-sonnet-5`. Laut `HUFI-E2E-NEXT-STEPS.md` ist Function-Version 29 aktiv.
- `npm run build` bestand am 2026-08-04. Es gibt nur bestehende, nicht blockierende Tailwind-/Browserslist-Warnungen.

## Noch erforderlicher Nachweis

Eine normale, authentifizierte Hufi-Anfrage in der geschützten Preview stellen und UI-Ergebnis mit den `hufi-agent`-Logs abgleichen. Dieser Nachweis lässt sich hier nicht automatisieren, weil weder ein zulässiger Login noch das Basic-Auth-Passwort für `preview.hufiapp.de` verfügbar ist. Es ist kein Terra-vs.-Sol-Blocker, sondern fehlende Zugriffsautorisierung.

## Nächste Einheit

Nach Bereitstellung eines erlaubten Preview-Logins genau diesen authentifizierten Hufi-E2E-Test durchführen; erst bei einem reproduzierbaren Fehler einen neuen P0-Fix beginnen.
