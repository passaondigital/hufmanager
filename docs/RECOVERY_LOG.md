# Hufi — Recovery Log

> Chronologisches Sanierungsprotokoll. Jeder Eintrag dokumentiert, was
> kaputt war, was verändert wurde, und was bewusst nicht angefasst wurde.
> Kein Buzzfeed, keine Marketing-Sprache — nüchterne Fakten für künftige
> Agents und Pascal selbst.

---

## 2026-05-08 — Recovery nach abgebrochenem Gemini-CLI-Lauf

### Ausgangslage

- Gemini CLI ist am Vortag während/um einen P0-Fix herum abgebrochen.
- Unklar, welche Dateien tatsächlich verändert wurden.
- Nutzer stehen produktiv auf `hufiapp.de` unter Druck.
- Branch: `sprint2/anthropic-and-domains-20260425`.

### Diagnose

`git status` zeigte fünf modifizierte Dateien plus eine untracked-Datei:

- `src/pages/Anfragen.tsx` — sauberer Code-Diff (Leads-Status-Mapping).
- `src/pages/stallbetreiber/StallAnfragen.tsx` — sauberer Code-Diff
  (Helper `isAccepted` / `isPending`).
- `public/apple-touch-icon.png` — von 18 KB auf **11.8 MB** angewachsen,
  10000 × 10000 RGBA-PNG.
- `public/og-image.png` — von 290 KB auf **11.8 MB**, identisches Bild.
- `public/favicon.ico` (untracked) — ebenfalls 11.8 MB, identischer Hash,
  technisch ein PNG, fälschlich als `.ico` benannt.
- `supabase/.temp/cli-latest` — generierter CLI-Versionsmarker, irrelevant.

### Asset-Schaden

- Drei Asset-Dateien mit identischem MD5 (`4c367bf4f3b5786f479e3a653364164b`),
  je 11.8 MB, je 10000 × 10000 PNG.
- Ursache: Gemini hat während des Asset-Schritts ein Riesenbild über alle
  drei Slots geschrieben. Auch die `favicon.ico` ist in Wahrheit eine PNG.
- **Aktion:**
  ```
  git checkout -- public/apple-touch-icon.png public/og-image.png
  rm -f public/favicon.ico
  ```
- Ergebnis: Originalgrößen wiederhergestellt (18 KB / 291 KB), kaputte
  `favicon.ico` entfernt, kein Asset-Müll im Verlauf.

### Leads-Status-Fix

- **Commit:** `3522de61 fix(leads): align status values between provider and stall views`
- Beide Views behandeln deutsche und englische Status-Werte symmetrisch:
  - `neu` / `new`
  - `kontaktiert` / `pending`
  - `gewonnen` / `accepted`
- `Anfragen.tsx`: `statusConfig`, `getNextStepHint`, Filter erweitert.
- `StallAnfragen.tsx`: zentrale Helper `isAccepted` / `isPending`,
  hartkodierte Vergleiche im JSX entfernt.
- Rein additiv, keine Schema-Änderung, keine Datenmigration.

### Routing-Fix (Legacy-Domains)

- **Commit:** `b8eb6249 fix(routing): treat hufmanager.de hosts as legacy main-domain aliases`
- `src/pages/Index.tsx`: `isMainDomain` erkennt jetzt zusätzlich
  `hufmanager.de` und `www.hufmanager.de`. Alte HufManager-Bookmarks landen
  damit auf der Marketing-Landing-Page statt auf dem Auth-Screen.
- `src/hooks/usePortalDetection.ts`: Header-Kommentar dokumentiert, dass die
  `startsWith()`-Subdomain-Checks bewusst Domain-agnostisch sind — kein
  Code-Fix nötig.
- `src/App.tsx` unangetastet.

### Vision-Doku

- **Commit:** `2d7344be docs(vision): add initial Hufi product vision and principles`
- Neue Datei `docs/VISION.md` (83 Zeilen) — Zweck, Ursprung, Nutzergruppen,
  Produktprinzipien, Hufi Core, Hufi AI als Zielrichtung, kurzfristiger
  Fokus, Nicht-Ziele, Erfolgskriterien.
- Bewusst ohne vertrauliche 2030-Strategie und ohne Marketingsprache.

### Validierung

- `npm run build` zweimal erfolgreich (28.39 s und 24.34 s).
- PWA-Manifest unverändert (613 precache-Einträge, ~14118 KiB).
- Hauptbundle-Wachstum nach Routing-Fix: +0.04 kB.

### Bewusst nicht gemacht

- **Kein `git push`** — drei Commits liegen lokal auf dem Branch.
- **Keine Supabase-Migration**, kein Schema-Eingriff.
- **Kein größerer Routing-Refactor** — verbleibende `hufmanager.de`-Hardcodes
  bleiben für Sprint 3.
- **Kein Anfassen** von `supabase/.temp/cli-latest`.
- **Keine Änderung** an PWA-/Mobile-Nav-Code (separate Verifikation P1).
- **Kein** `npm run lint` als Gate — bekannte Altfehler im Repo, würde
  Recovery blockieren.

### Offene Punkte nach dieser Session

- Doku-Struktur (CURRENT_STATE, ROADMAP, VPS_INFRASTRUCTURE, RECOVERY_LOG,
  PASCAL_CONTEXT-Skelett, PROJECT_MAP) wird in dieser Session erstellt und
  zur Review gezeigt — noch nicht committed.
- PWA-/Mobile-Verifikation steht aus.
- Verbleibende `hufmanager.de`-Hardcodes nicht inventarisiert.
- Architektur-Memory enthält veraltete Routen-Aussagen, sollte
  aktualisiert oder ersetzt werden.

---

## Wie diese Datei lebt

- **Pro Recovery-Session ein neuer Datums-Block oben.**
- Erledigte Punkte aus `ROADMAP.md` wandern hierher, kommentiert.
- Wenn ein Eintrag länger als zwei Bildschirme wird: in eine eigene
  `docs/recovery/<datum>-<thema>.md` auslagern und hier nur Verweis lassen.
