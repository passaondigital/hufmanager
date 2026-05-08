# HUFIBRAIN

> Zentrale Einstiegsdatei für jedes AI-Tool und jeden Menschen, das/der
> mit Pascals Hufi-Ökosystem arbeitet. Wer hier startet, hat in unter
> 15 Minuten genug Kontext, um nichts kaputtzumachen und gezielt zu
> handeln.
>
> **Nicht verwechseln:** *HUFIBRAIN* ist die Doku-/Kontextschicht im
> Repo. *HufiAI* (`hufiai.de`) ist eine eigene Marke / Live-Domain.
> Die beiden haben nichts miteinander zu tun.

## Was ist HUFIBRAIN?

HUFIBRAIN ist **kein Code-Modul**, sondern die organisierte Doku-
und Kontextschicht des Hufi-Projekts. Sie verbindet das, was sonst
über ChatGPT, Claude, Claude Code, Gemini CLI, Perplexity, Terminal,
Memory-Systeme und Markdown-Dateien verstreut wäre.

Ziel:

- **Eine** Quelle, in der Pascal und Agenten gemeinsam Wahrheit
  verwalten.
- **Klare Reihenfolge**, in der ein Tool oder Mensch sich einliest.
- **Klare Regeln**, was ein Agent darf und was nicht.
- **Kein Marketing**, kein Branding-Overhead — nur Orientierung.

## Reihenfolge zum Lesen

Es gibt zwei Pfade. Wähle nach Aufgabe.

### Pfad A — Erstkontakt (vollständiges Onboarding)

Wenn ein Agent oder Mensch noch nie mit Hufi gearbeitet hat, in
genau dieser Reihenfolge:

1. **`docs/VISION.md`** — Was Hufi sein will.
2. **`docs/CURRENT_STATE.md`** — Wo Hufi heute steht: Branch,
   Live-Domain, letzte Fixes, offene Punkte, Risiken, was nicht
   angefasst werden darf.
3. **`docs/PROJECT_MAP.md`** — Wie die Marken zusammenhängen,
   Pro-Bereich-Status / Priorität / Risiko / nächster Schritt.
4. **`docs/PASCAL_CONTEXT.md`** — Wer Pascal ist, wie er denkt, was
   er von Agenten erwartet, was Agenten nicht tun sollen.
5. **`docs/ROADMAP.md`** — Priorisierte Realität: P0 / P1 / P2 /
   Nicht jetzt.
6. **`docs/VPS_INFRASTRUCTURE.md`** — Wo es physisch läuft. Read-
   only Überblick, keine Secrets.
7. **`docs/RECOVERY_LOG.md`** — Chronik bisheriger Sanierungen,
   damit bekannte Fehler nicht zweimal passieren.

### Pfad B — Recovery-Quick-Start (laufende Session)

Wenn ein Agent in einer aktiven Recovery-/Stabilitäts-Session
einsteigt und schnell handlungsfähig sein muss:

1. **`docs/CURRENT_STATE.md`** — sofort: was brennt, was darf nicht
   angefasst werden, nächster sinnvoller Schritt.
2. **`docs/PASCAL_CONTEXT.md`** — Sektion *Was Agenten NICHT tun
   sollen* zuerst, dann *Was Pascal von Agenten braucht*.
3. **`docs/ROADMAP.md`** — Sektion *P0 — Offene Aktionen*.

Vertiefung (VISION, PROJECT_MAP, VPS, RECOVERY_LOG) erst, wenn die
unmittelbare Aufgabe das verlangt.

### Was danach kommt

Erst nach dem passenden Pfad dürfen Agenten in den Code oder in
die `docs/`-Audits aus früheren Sprints schauen.

## Arbeitsregeln für AI-Agenten

Zweistufig: **absolute Regeln** sind nie verhandelbar — Verstöße
können Daten, Auth oder Vertrauen vernichten. **Default-Regeln**
sind Standardverhalten und können in einer konkreten Session von
Pascal explizit aufgeweicht werden ("ausnahmsweise größerer Commit
OK", "diese Session keine Build-Validierung").

### Absolut (nie verhandelbar)

- **Nie Secrets ausgeben** — keine API-Keys, keine `.env`-Inhalte,
  keine Tailscale-IPs, keine Service-Role-Keys, keine SSH-Keys.
- **Nie ungefragt pushen** und nie ungefragt deployen.
- **Keine Supabase-Schema-Migrations** während Recovery.
- **`supabase/.temp/cli-latest` nicht committen** — generierter
  CLI-Versionsmarker.
- **Keine eigenmächtigen Routing-/`App.tsx`-Änderungen** außerhalb
  eines klar formulierten Fix-Auftrags.
- **Keine erfundenen Fakten** — Unsicheres mit `[?]` markieren,
  nicht als Wahrheit eintragen.

### Default (Standard, Pascal kann lockern)

- **Erst lesen, dann handeln** — der passende Pfad oben ist nicht
  optional.
- **Aktuelle Lage live prüfen** vor dem Vertrauen auf Memory:
  `git status`, `git log`, ggf. `pm2 list`, `ollama list`.
- **Keine großen Refactors während Recovery** — nur was klar im
  Auftrag steht.
- **Vor Dateiänderungen Scope nennen** — "ich ändere Datei A an
  Stelle B", keine stillen Edits.
- **Kleine, thematisch klare Commits** mit Conventional-Commit-
  Header (`fix(...)`, `docs(...)`, `chore(...)`).
- **Build vor Commit, wenn Code geändert wurde** — `npm run build`
  muss durchlaufen.
- **Mobile-tauglich antworten** — kurze Listen, klare Tabellen,
  keine 200-Wörter-Absätze.
- **Keine Marketing-Sprache** — keine "revolutionär / next-gen /
  smart / Game-Changer"-Vokabeln.

Vollständige negative Regeln stehen in
`docs/PASCAL_CONTEXT.md` (Sektion *Was Agenten NICHT tun sollen*).
Diese Datei hier ist die Kurzfassung für den Einstieg.

## Aktuelle Priorität

```
Stabilität  ▸  Vision  ▸  Feature-Ausbau
   ▲                                ▲
   |                                |
  jetzt                       erst danach
```

In Worten:

1. **Stabilität** für zahlende HufManager-/Hufi-Nutzer kommt zuerst.
   Recovery-Fixes, sauberes Routing, PWA-/Mobile-Verifikation,
   keine kaputten Releases.
2. **Vision-Arbeit** (Doku, Brand-Klarheit, Kontextsystem-Design)
   kommt erst danach.
3. **Feature-Ausbau** (BHS-Command-Center, Lead-Qualifizierung,
   Voice-First, `src/features/`-Struktur) ist P2 und wartet.

Wer einen P2-Punkt vor einem P0-Punkt bewegt, baut am Fundament
vorbei.

## Wenn etwas nicht stimmt

- Diese Datei oder eine der sieben Dateien aus der Lese-Reihenfolge
  *aktualisieren*, nicht ignorieren.
- Beobachtungen aus Live-Daten (`git`, `pm2`, `ollama`, Browser-
  Verifikation) schlagen Aussagen aus dem Memory.
- Fundsachen, die nicht direkt erledigt werden, in `RECOVERY_LOG.md`
  oder als P1/P2 in `ROADMAP.md` aufnehmen — nicht im Kopf
  behalten.

## Wie diese Datei lebt

`HUFIBRAIN.md` ist selbst lebendes Dokument. Wenn die Lese-Reihen-
folge in der Praxis nicht passt, eine Regel sich als zu eng oder zu
locker erweist, oder eine neue Doku-Datei dazukommt: hier
anpassen, nicht im Kopf merken. Änderungen an dieser Datei sind
keine Architektur-Diskussion und nicht von Recovery-Sperren
betroffen.
