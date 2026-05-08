# Hufi — Project Map

> Eine visuelle Karte. Wer in Pascals Kosmos einsteigt, soll ohne langes
> Lesen wissen, **was wozu gehört**. Diese Datei ist absichtlich knapp und
> für Tablet-/Handy-Lesen geeignet.

## Topologie

```
Pascal Schmid                                  (Person, Owner)
  │
  ├── Barhufserviceschmid                      (operative Praxis)
  │     └── BHS-Produkte: GO · BALANCE · INTENSIV
  │
  ├── Hufi-Familie                             (eigenes Software-Cluster)
  │     ├── HufiApp / HufManager     live   hufiapp.de + hufmanager.de-Aliase
  │     ├── HufCamPro                live   hufcampro.de  (separate Foto-PWA)
  │     ├── HufiAI                   live   hufiai.de     (Inhalt: muss ergänzt werden)
  │     ├── HufiVoice                live   hufivoice.assaon.com  (Voice)
  │     └── MiniHufManager           ?      minihufmanager.assaon.com
  │                                          (Nginx konfiguriert, antwortet derzeit nicht)
  │
  ├── PASSAON / Assaon                         (Plattform unter assaon.com;
  │                                             Beziehung zu Hufi muss ergänzt werden)
  │
  └── SmartHoof                                muss ergänzt werden

  Kunden-Projekte (Pascal hostet / baut für andere):
    └── Horseimpulsranch (Nicole Schmid)       horseimpulsranch.de + admin/karten

──────────────────────────────────────────────────────────────
VPS (Hostinger · Ubuntu 24.04) trägt alles oben:
  Nginx · PM2 · Docker · Ollama (lokale LLMs)
  Supabase (Auth / DB / Edge) · Anthropic via Edge-Function-Proxy
──────────────────────────────────────────────────────────────
```

## Dimensionen

### Was ist Core?

- **Pascal Schmid** — Person, alleinige Owner-Ebene.
- **Barhufserviceschmid** — operative Praxis, Quelle der Anforderungen.
- **HufiApp / HufManager-Codebase** (`/hufiapp` →
  `/root/hufmanager_v25/production`) — die Software, die alles
  zusammenhält. *Eine* Codebase, zwei Markennamen.
- **VPS** — physisches Fundament.

### Was ist Experiment?

- **HufManager-Legacy-Pfad** — wird parallel gehalten, bis Datenstand
  und Vertrauen die Migration zulassen (vgl. `ROADMAP.md` *Nicht jetzt*).
  Kein eigenständiges Produkt mehr, sondern Übergangsstand.
- **MiniHufManager** (`minihufmanager.assaon.com`) — Nginx-Site
  konfiguriert, antwortet aktuell nicht. Status / Zweck *muss ergänzt
  werden*.
- **HufiAI** (`hufiai.de`) — Domain live mit eigenem Build-Output, aber
  Inhalt / Zweck *muss ergänzt werden*. Nicht zu verwechseln mit der
  Cloud-KI-Anbindung über die Supabase Edge Function.
- **SmartHoof** — *muss ergänzt werden* (siehe `PASCAL_CONTEXT.md`).
- **PASSAON** — *muss ergänzt werden* (siehe `PASCAL_CONTEXT.md`).
- **Lokale LLM-Tags** (`hufiai-fast`, `hufiai-core`) — Custom-Modelfile-
  Aliase auf `llama3.1`, noch nicht produktiv im App-Code eingebunden.

### Was ist produktiv?

- `https://hufiapp.de` — Live-Auslieferung der HufiApp.
- `hufmanager.de` / `www.hufmanager.de` / `app.hufmanager.de` — Live-
  Aliase für Legacy-Nutzer.
- `https://hufcampro.de` — separate Foto-PWA (HufCamPro), eigener Build,
  eigenes Deploy.
- `https://hufivoice.assaon.com` — HufiVoice, live (Inhalt: Voice-bezogen,
  Detail *muss ergänzt werden*).
- Lead-/Anfragen-Flow zwischen Provider- und Stall-Sicht in der HufiApp.
- Anthropic-Anbindung über `anthropic-proxy` Edge Function.
- Whisper STT (Port 5000) und HufCam Backend (Port 5002).
- Kunden-Site `horseimpulsranch.de` plus `admin.` und `karten.`-Subdomains
  (Nicole Schmid).

### Was ist später?

- BHS Command Center · BHS-Lead-Qualifizierung · BHS BALANCE Abo-
  Verwaltung · BHS INTENSIV Bewerbungsflow.
- Voice-First Schnell-Terminabschluss.
- `src/features/`-Domain-Struktur.
- `src/lib/hufi-memory.ts` als zentraler Memory-Layer.
- 2030-Big-Picture (vertraulich, nicht in Repo-Doku).

## Bereiche im Detail

> Pro Bereich: Zweck · Status · Priorität · Risiko · nächster Schritt.
> Status-Werte: **produktiv** / **aktiv** / **experimentell** /
> **unklar**. Priorität: **P0** / **P1** / **P2** / **Parken** /
> **extern** (= außerhalb der Repo-Recovery, z. B. Geschäfts-Fundament).
> Unsichere Aussagen sind mit `[?]` markiert.
>
> Die Status-Werte sind Snapshots und müssen vor Eingriffen live
> verifiziert werden (`curl`, `pm2`, `ollama`, `git status`).
> Alles mit Status `produktiv` läuft unter echten Domains oder
> echten Nutzern. Keine Eingriffe ohne Pascal-Freigabe.

### Barhufserviceschmid

- **Zweck:** Operative Hufpflege-Praxis von Pascal. Cashflow,
  Praxislabor; operatives Geschäft, das andere Marken finanziert
  und mit echten Anforderungen speist.
- **Status:** produktiv (live unter `barhufserviceschmid.de`).
- **Priorität:** extern — Geschäfts-Fundament außerhalb der
  Repo-Recovery.
- **Risiko:** Stall- vs. Code-Zeit-Konflikt; ohne Praxis kein
  Geschäftsmodell.
- **Nächster Schritt:** unverändert weiterlaufen lassen, keine
  Ablenkung durch HufiApp-Recovery.

### Hufi / HufiApp / HufManager

- **Zweck:** *Eine* Codebase, zwei Markennamen. HufiApp ist die
  aktuelle Produktebene; HufManager ist Ursprung und Legacy-Name.
- **Status:** produktiv (live unter `hufiapp.de`, Aliase
  `hufmanager.de`, `www.hufmanager.de`, `app.hufmanager.de`).
- **Priorität:** P0 — Recovery & Stabilität für zahlende Nutzer.
- **Risiko:** PWA-/Mobile-Regressionen; Auth-Verhalten auf
  Legacy-Hosts noch nicht systematisch verifiziert.
- **Nächster Schritt:** PWA-/Mobile-Nav-Verifikation, Auth-Test auf
  `app.hufmanager.de`, Push-Entscheidung für die heutigen
  Recovery-Commits.

### HufCamPro

- **Zweck:** Separate, neutrale Foto-PWA für Pferdehufe.
- **Status:** produktiv (live unter `hufcampro.de`, eigener Build
  unter `/var/www/hufcampro`, PM2-Service `hufcampro-rembg` für
  Hintergrund-Removal).
- **Priorität:** Parken (läuft stabil unabhängig).
- **Risiko:** Disk-Anteil unter `/var/www/`.
- **Nächster Schritt:** keine Aktion nötig, beobachten.

### HufiVoice

- **Zweck:** Voice-bezogene Anwendung [?]; Inhalt im Detail nicht
  verifiziert.
- **Status:** produktiv im Sinne von "antwortet" (HTTP 200 unter
  `hufivoice.assaon.com`), aber Zweck unklar.
- **Priorität:** Parken bis Pascal Inhalt klärt.
- **Risiko:** Live-Site ohne klare Owner-Doku.
- **Nächster Schritt:** Pascal bitte 1–2 Sätze Zweck nachreichen,
  dann hier präzisieren.

### HufiAI

- **Zweck:** [?] *muss ergänzt werden*. Domain `hufiai.de` ist live
  mit eigenem Build. Nicht zu verwechseln mit der Cloud-KI-Anbindung
  über die Supabase Edge Function.
- **Status:** produktiv im Sinne von "antwortet" (HTTP 200), aber
  Zweck unklar.
- **Priorität:** Parken bis geklärt.
- **Risiko:** Markennamen-Verwechslung mit der internen KI-Schicht
  führt zu Doku-Drift.
- **Nächster Schritt:** Pascal definiert Zweck; ggf. umbenennen oder
  klar gegen "Hufi-KI im Code" abgrenzen.

### SmartHoof

- **Zweck:** Innovations-/Produktmarke [?].
- **Status:** unklar. Kein Repo, keine Nginx-Site, keine
  PM2-/Docker-Spur gefunden.
- **Priorität:** Parken bis Pascal definiert.
- **Risiko:** Geistiges Eigentum / Marke ohne sichtbares Artefakt;
  Aufmerksamkeit kann verloren gehen.
- **Nächster Schritt:** Pascal: aktuelle Phase? Eigenständiges
  Produkt, Modul oder Sub-Brand?

### PASSAON / Assaon

- **Zweck:** No-Code-Werkstatt-Plattform [?] unter `assaon.com`. Hat
  zahlreiche Subdomains (`app.`, `ai3d.`, `cad.`, `aider.`,
  `voice.`, etc.). Beziehung zu Hufi unklar — Memory deutet
  übergeordnet an, Karte zeigt vorerst parallel.
- **Status:** aktiv (Live-Sites, eigene PM2-Apps `assaon-app`,
  `assaon-receiver`).
- **Priorität:** P1 — Beziehung zu Hufi klären, damit
  Architektur-Entscheidungen sauber laufen.
- **Risiko:** Doppelte Wahrheit, wenn Hufi und Assaon konkurrierende
  Plattform-Ansprüche entwickeln.
- **Nächster Schritt:** Pascal definiert: parallel, übergeordnet oder
  Werkstatt-Modul. Danach `PROJECT_MAP.md` und `PASCAL_CONTEXT.md`
  präzisieren.

### VPS / AI Services

- **Zweck:** Physisches Fundament aller Projekte. Hostinger,
  Ubuntu 24.04, Nginx, PM2, Docker, Ollama, Supabase, Anthropic-
  Proxy.
- **Status:** produktiv, alle relevanten Services online.
- **Priorität:** P0 — Stabilität als Grundvoraussetzung.
- **Risiko:** Disk-Auslastung 71 % (136 GB von 193 GB); bei > 80 %
  Aufräumarbeiten nötig.
- **Nächster Schritt:** Disk-Headroom beobachten, alte Build-Outputs
  unter `/var/www/hufiapps/` rotieren, Ollama-Modelle ausmisten.
  Details: `VPS_INFRASTRUCTURE.md`.

### Experimente / spätere Projekte

- **MiniHufManager** (`minihufmanager.assaon.com`) — Nginx-Site
  konfiguriert, antwortet aktuell nicht (HTTP 000). Status unklar
  [?]. **Priorität:** Parken — entweder reaktivieren oder
  Nginx-Site abräumen.
- **`_archiv_hufmanager_20260425/`** — Archiv-Snapshot des alten
  HufManager-Codes vom April 2026. **Priorität:** Parken; bei
  Disk-Druck Kandidat zum Verschieben/Löschen.
- **`hufmanager-bridge/`** — Verzeichnis unter `/var/www/`, Zweck
  unbekannt [?]. **Priorität:** Parken bis geklärt.
- **Lokale LLM-Tags `hufiai-fast` / `hufiai-core`** —
  Custom-Modelfile-Aliase auf `llama3.1`, noch nicht produktiv im
  App-Code eingebunden. **Priorität:** P2 — erst integrieren,
  wenn ein konkreter Use-Case dafür steht.

### Offene Verifikationen

- **MyHorseDocs** — taucht in keiner aktuell verfügbaren Quelle auf
  (kein Repo-Verweis, keine Nginx-Site, kein Build-Output, kein
  Memory-Eintrag). Pascal bitte klären: existiert das, ist es geplant,
  oder kann es als Begriff entfallen?
- **Assaon ↔ Hufi** — Memory deutet an, dass Assaon eine
  No-Code-Werkstatt-Plattform ist und Hufi *darin lebt*. In dieser Karte
  ist Assaon vorerst als paralleler Knoten dargestellt. Die Beziehung
  *muss bestätigt werden*.
- **`_archiv_hufmanager_20260425/`** und **`hufmanager-bridge/`** —
  zusätzliche Verzeichnisse unter `/var/www/`, Zweck unbekannt.

## Tools rund um das Projekt

> Pascal arbeitet bewusst mit mehreren Werkzeugen parallel. Diese Liste
> ist **nicht** eine Empfehlung — sie ist eine Bestandsaufnahme, damit
> Agenten verstehen, in welchem Konzert sie spielen.

| Tool | Rolle in Pascals Workflow |
|---|---|
| **Claude Code** (CLI) | Direkte Repo-Arbeit, Recovery, Code-Edits |
| **Claude.ai** | Längere Strategie-/Schreib-Sessions |
| **ChatGPT** | Zweite Meinung, Schreib-Hilfe, Übersetzung |
| **Gemini CLI** | Parallel-Agent, hat zuletzt Asset-Unfall verursacht |
| **Perplexity** | Recherche, externe Fakten |
| **Terminal / SSH auf VPS** | Live-Eingriffe, PM2/Docker/Ollama |
| **Markdown-Dateien (`docs/`)** | Persistentes Projektgedächtnis |
| **Memory-Systeme** (Claude Code) | Personalisiertes Langzeitgedächtnis |

## Wenn du diese Datei zum ersten Mal liest

Lese-Reihenfolge für Erstkontakt und Recovery-Sessions steht in
`docs/HUFIBRAIN.md` (zwei Pfade: A — Erstkontakt, B —
Recovery-Quick-Start). Doppelte Listen werden bewusst vermieden,
damit nichts driftet.

## Wie diese Datei lebt

Wenn eine Marke / ein Tool / ein Service hinzukommt oder verschwindet:
diese Karte aktualisieren. Vorrang hat Lesbarkeit auf Mobile-Display vor
Vollständigkeit.
