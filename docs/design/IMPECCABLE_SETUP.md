# Impeccable — Design-Skill einrichten

Impeccable ist eine Design-Skill für KI-Coding-Agenten (Claude Code, Codex, Cursor).
Sie bringt 24 Commands (`/impeccable audit`, `/impeccable polish`, `/impeccable critique` …)
und einen deterministischen Detektor mit ~59 Regeln gegen typische „KI-Optik".

Quelle: https://github.com/pbakaus/impeccable · Docs: https://impeccable.style · Apache-2.0

## Warum nicht im Repo eingecheckt

Die Installation landet in `.claude/`, und `.claude/` ist in diesem Repo bewusst
gitignored (siehe `.gitignore`, „enthalten lokale Tokens, nie committen").
Dazu kommt: Impeccable lädt eine plattformspezifische Binary (~20 MB, z. B.
`linux-x64`). Beides gehört nicht in git. Die Installation ist deshalb
**pro Maschine** einmal auszuführen.

## Installation (pro Maschine, im Repo-Root)

```bash
cd /pfad/zu/hufmanager
npx impeccable install --providers=claude --project --yes
```

Das schreibt:

- `.claude/skills/impeccable/` — Skill, Referenzen, Detektor-Binary
- `.claude/agents/impeccable-*.md` — 4 Sub-Agents
- `.claude/settings.local.json` — Hooks: Detektor-Check nach `Edit`/`Write` auf
  UI-Dateien, tiefer Durchlauf bei `Stop`

Danach **Claude-Code-Session neu starten** — Skills werden beim Sessionstart
geladen, vorher ist `/impeccable` nicht als Slash-Command verfügbar.

Erster Lauf im Chat:

```
/impeccable init
```

`init` schreibt `PRODUCT.md` (dauerhafter Produktkontext). Ein bestehendes
visuelles System wird getrennt in `DESIGN.md` festgehalten.

## Wichtig für HufManager

`docs/design/HUFI_DESIGN_SYSTEM.md` bleibt verbindlich. Impeccable ist ein
Prüfwerkzeug, keine Design-Autorität: Wo ein Impeccable-Befund gegen eine
Vorgabe des Hufi-Designsystems steht, gilt das Designsystem. Neue Farben,
Typografie oder Komponenten nur mit dokumentierter Begründung — daran ändert
Impeccable nichts.

## Detektor ohne Agent nutzen

Der Detektor läuft ohne LLM und ohne API-Key, auch in CI:

```bash
./.claude/skills/impeccable/scripts/impeccable detect src
./.claude/skills/impeccable/scripts/impeccable detect src --no-advisory
./.claude/skills/impeccable/scripts/impeccable ignores     # Regeln ausnehmen
```

Exit-Code `2` bedeutet: Befunde vorhanden.

## Stand

- Installiert und verifiziert am 2026-10-15 mit `impeccable@4.5.2`
  (Engine v0.1.14, linux-x64) in einer Cloud-Session — diese Session ist
  flüchtig, auf TOWER/XXL muss separat installiert werden.
- Smoke-Test `detect src`: 28 Befunde, davon 9 nur Hinweise (advisory).
  Häufigste Regeln: `side-tab` (11×), `bounce-easing` (9×),
  `ai-color-palette` (3×). Noch **nicht** abgearbeitet.
