# Hufi — Plattformarchitektur (Begriffs-Brücke)

Stand: 2026-08-06. **Dieses Dokument dupliziert nicht** `docs/HUFI_CORE_TARGET_ARCHITECTURE.md`
(1426 Zeilen, Stand 2026-05-11) — es ist weiterhin die primäre Quelle für
die technische Zielarchitektur (Memory-Layer, Runtime, Wake-Engine,
Voice/Action/Recommendation-Layer). Dieses Dokument übersetzt zwischen der
dortigen Terminologie und den neuen Begriffen aus Pascals Master-Prompt
vom 2026-08-06 ("Workspaces"), damit beide Dokumente nicht auseinanderlaufen.

Für die ökosystemweite Markenebene (Hufi/Hufi App/heyhufi.com/Hufi Browser
etc.) siehe `pascal-brain/HUFI_ECOSYSTEM_BRAND_ARCHITECTURE.md` — auch das
wird hier nicht wiederholt.

## Begriffs-Mapping

| Master-Prompt (neu) | HUFI_CORE_TARGET_ARCHITECTURE.md (bestehend) | Verhältnis |
|---|---|---|
| Workspace (🐴 Pferde, 🔨 Hufbearbeitung, 🩺 Therapie, …) | Cockpit-Layer / Kachel (siehe auch `docs/architecture/HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`) | Gleiches Konzept, neuer Name. Die Workspace-Analyse in `docs/architecture/` verwendet bereits "Workspace" und ist mit diesem Dokument konsistent. |
| Hufi (Assistent) | HufAI Core / Intelligenz-Schicht | Deckungsgleich — `HUFI_CORE_TARGET_ARCHITECTURE.md` Abschnitt "intelligence/" beschreibt denselben Layer technischer (AI-Router, Credit-System, Model-Selection). |
| Netzwerk / Verbindungen | "multi-actor auf derselben Wahrheit" (Abschnitt 1) | Deckungsgleich, dort bereits mit konkretem Datenmodellproblem benannt (vier Access-Tabellen), siehe `docs/NETWORK_ARCHITECTURE.md`. |
| Pferd als eigenständiges Objekt | "horse-centric statt provider-centric" (Abschnitt 1) | Deckungsgleich, dort bereits als Zielbild dokumentiert, im Schema teilweise vorhanden (siehe `docs/DATABASE.md`). |
| Proaktive Hinweise ("Termin in 40 Minuten") | HufAI Phase E, Track A "Proaktives HufAI" | Deckungsgleich, Phase E laut `docs/ROADMAP.md` bereits live (regelbasiert), Freitext-Ausbau blockiert extern. |

## Ebenen der Plattform (heutiger, verifizierter Stand)

```
Hufi (Assistent, Konversation/Voice)         -- src/components/assistant/
        │
        ▼
Workspace (manuelle Bedienoberfläche)        -- src/components/workspace/ (Preview)
        │
        ▼
Rollen-Shells (heute noch hart verdrahtet)   -- AppLayout / ClientAppLayout /
                                                 PartnerAppLayout / EmployeeAppLayout
        │
        ▼
Fachfunktionen (appMap.ts, 247 Einträge)     -- Termine, Kunden, Pferde, Rechnungen, ...
        │
        ▼
Supabase (Auth, DB, Storage, Edge Functions) -- eine gemeinsame Produktionsinstanz
                                                 (vnschgjxkzzwzefqlrji), siehe
                                                 docs/architecture/HUFMANAGER_FORENSIC_FEATURE_INVENTORY.md
```

Der Master-Prompt zielt darauf ab, die "Rollen-Shells"-Ebene durch
"Workspaces + Mehrfachrollen" zu ersetzen bzw. zu überlagern. Das ist eine
Frontend-/Routing-Ebene über einer bereits mehrfachrollenfähigen Datenbank
(siehe `docs/AUTHENTICATION.md`) — keine neue Plattformebene.

## Wachstumsrichtungen (aus Master-Prompt, unverändert als Zielbild übernommen)

Hufi Web, native iOS/Android-Apps, Desktop, KI-Assistent, Wetter, Kameras,
Business, Stallmanagement, Gesundheitsmanagement, Kommunikation,
Marktplatz. Deckt sich mit den bereits dokumentierten "4 Strategischen
Tracks" in `docs/ROADMAP.md` (A Proaktives HufAI, B Multimodale
Pferdeintelligenz, C Runtime/Device Layer, D HufAI Memory) — Track C
entspricht direkt "Hufi Web/Desktop/native Apps".

## Governance

- Neue Architekturaussagen gehören in `HUFI_CORE_TARGET_ARCHITECTURE.md`
  (technische Tiefe) oder die Workspace-/Profession-Dokumente unter
  `docs/architecture/` (Navigation/Beruf) — nicht in eine dritte,
  konkurrierende Fassung.
- Dieses Dokument wird aktualisiert, wenn sich die Begriffe in einem der
  beiden Quelldokumente ändern, damit die Brücke nicht veraltet.
