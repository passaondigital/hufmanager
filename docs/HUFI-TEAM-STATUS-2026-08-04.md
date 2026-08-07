# HUFI Team-Status — 2026-08-04

Production blieb unverändert. `docs/qa/` blieb untracked und unverändert.

## Spur A — P0 Agent und Voice

- Branch/Worktree: `feature/hufi-p0-agent-voice` / `/home/pascaladmin/hufiapp-worktrees/hufi-p0-agent-voice`
- Verantwortungsbereich: `hufi-agent`, Client-Fehlerpfad und bestehende Voice-Kette.
- Commits: `d270a13f`, `1dd4e09f`, Review-Fix `d97f5501` (im Lead-Branch als `653b5b37`).
- Ergebnis: `voiceMode` ist bis zur Fast-Modellauswahl belegt. Anthropic-/Ollama-Fehler, leere Antworten, Modellfallback und Timeouts sind technisch unterscheidbar.
- Tests: Review, `git diff --check`, Function-ESLint; Deno ist lokal nicht installiert.
- Risiko: Modellzugang und tatsächlicher Providerfehler sind ohne Connector-Deploy nicht validiert.
- Nächster Schritt: Nur `hufi-agent` deployen, dann genau eine eingetippte Preview-Frage und korrelierte Logs prüfen.

## Spur B — Offline-Grundlage

- Branch/Worktree: `feature/hufi-offline-foundation` / `/home/pascaladmin/hufiapp-worktrees/hufi-offline-foundation`
- Commit: `e719c124` (im Lead-Branch als `70e36a94`).
- Ergebnis: Audit, SSR-sicherer Transportzustand, nutzerisolierte Textentwürfe und IndexedDB-Audioentwurfs-Speicher ohne Upload/Synchronisation.
- Tests: 2 fokussierte Vitest-Tests, ESLint neuer Dateien, Build, `git diff --check`.
- Integration: Erst mit sichtbarer Restore/Delete-UX und Aufbewahrungsentscheidung in gemeinsame UI integrieren.
- Risiko: Agent, STT und TTS benötigen online; keine komplexe Synchronisationsengine vorhanden.

## Spur C — Premium-Designsystem

- Branch/Worktree: `feature/hufi-premium-design-system` / `/home/pascaladmin/hufiapp-worktrees/hufi-premium-design-system`
- Commit: `6f332b6c` (im Lead-Branch als `b7e1d804`).
- Ergebnis: Scoped Tokens und sieben Primitives sowie isolierte mobile Preview-Komponente.
- Tests: ESLint der neuen TSX-Dateien, Build, `git diff --check`.
- Integration: Nur gezielt über eine Dev-/Preview-Fläche einhängen; keine globale Migration erfolgt.

## Spur D — Swipe Workspace

- Branch/Worktree: `feature/hufi-swipe-workspace` / `/home/pascaladmin/hufiapp-worktrees/hufi-swipe-workspace`
- Commit: `d31afddf` (im Lead-Branch als `35e07c45`).
- Ergebnis: Feature-Flag-geschützter Workspace, sichere Edge-Swipe-Logik, Touch-/Tastaturalternative und ausschließlich vorhandene Routen.
- Tests: 2 fokussierte Vitest-Tests, ESLint, Build, `git diff --check`.
- Integration: Erst per Lead in `MobileShell` hinter `VITE_HUFI_SWIPE_WORKSPACE=true`; keine Navigation wurde produktiv ersetzt.
