# HufiAssistantExperience — Zielarchitektur & Mapping Demo → echte Daten

Ziel: `/home` bekommt die visuelle Sprache von `HufiPremiumLab` (Orb/Wave/
Ambient/Phasen-Choreographie), aber angetrieben von echten Daten und
echten Aktionen statt der Szenario-Mocks. Neue Komponente:
`src/components/assistant/HufiAssistantExperience.tsx`.

## 1. Phasenmodell: Lab (10 Phasen) vs. Live (5 Zustände)

| Lab `HufiPhase` | Surface Mode | Live-Äquivalent (MobileShell) | Vorhanden? |
|---|---|---|---|
| `dormant` | ambient | `orbState === "idle"` | ja |
| `wake` | conversation | kein Äquivalent — es gibt kein Wake-Word-"Ja?"-Zwischenstadium, `recording` startet direkt | **fehlt** |
| `listening` | immersive | `orbState === "recording"` | ja |
| `understanding` | immersive | `orbState === "transcribing"` (grob) | teilweise |
| `questioning` | conversation | `msg.searchSuggestions` + `search_yes/search_no`-Actions (Pferd-Disambiguierung) | ja, aber nur für Pferdesuche, nicht generisch für jede Rückfrage |
| `confirming` | conversation | `task_approve:`/`task_reject:`-Actions, `createAgentTask` (Status `suggested`) | ja |
| `executing` | conversation | `approveAndExecuteTask` (Status `executing`) | ja |
| `success` | conversation | `result.success` Toast + Chat-Text-Update | ja, aber kein eigener visueller Success-State |
| `error` | conversation | `result.success === false` Toast | ja, aber kein "Offline"-spezifischer Zustand |
| `return` | ambient | Rückkehr zu `orbState === "idle"` nach Antwort | ja (implizit) |

**Lücke:** Der Live-Flow kennt kein separates `wake`-Zwischenstadium und
keinen generischen `questioning`-Zustand für beliebige Rückfragen (nur
für Pferdesuche verdrahtet) — das müsste im echten Flow entweder ergänzt
oder in `understanding`/`confirming` eingefaltet werden, statt es zu
erfinden.

## 2. Daten: Mock-Konstante → echte Quelle

| Mock (`HufiAssistantState.tsx` / Player) | Echte Quelle (MobileShell.tsx) |
|---|---|
| `MOCK_USER_FIRST_NAME` | `hufiCtx?.user.name` (bereits in `HufiAssistantCockpit` verdrahtet) |
| `MOCK_AMBIENT_HINT` | `insight`-Logik aus `HufiAssistantCockpit.tsx` (nächster Termin > offene Rechnungen > Anfragen > ruhiger Tag) |
| `MOCK_APPOINTMENT` | `nextAppt`/`horse`/`apptClient`/`dateLabel`/`nextApptMinutesAway` |
| `MOCK_INVOICE` | `unpaidInvoices` (aktuell nur Anzahl, kein Einzel-Objekt — für `HufiInvoicePreview` fehlt ggf. eine echte Einzelrechnungs-Abfrage) |
| `MOCK_OBSERVATION` | `src/features/hufi-observation/proposal-flow` (`build-proposal.ts`, real erst nach Beobachtungs-Flow-Integration) |
| `MOCK_HORSE_OPTIONS` | `msg.searchSuggestions` (echte Pferdesuche, bereits real) |
| `MOCK_INTENTS` | `detectIntent()` / `askHufiAgent`-`actionPlan` (real) |
| `useHufiScenarioPlayer` (steuert Phase+Content) | müsste durch echte State-Ableitung aus `orbState`, `askHufiAgent`-Response, `agent_tasks`-Status ersetzt werden — das ist der Kern der Integrationsarbeit, kein 1:1-Austausch |

## 3. Bereits real vorhandene Bausteine (wiederverwendbar, keine Mocks)

- `askHufiAgent` (`src/lib/hufi-agent-client.ts`) — Chat/Action-Anfrage
- `createAgentTask` / `approveAndExecuteTask` / `rejectTask` (`hufi-agent-tasks.ts`) — echter Bestätigungsflow
- `HufiSearchCard`, `HufiTaskCard` — echte Vorschau-Karten (Pendant zu `HufiHorseCard`/`HufiObservationPreview` im Lab, andere Optik)
- `HufiOrb` (`src/components/voice/`) — bereits reale, state-getriebene Mic-Visualisierung (andere Optik als Lab-`HufiOrb`)
- `HufiAmbientSurface.tsx` — aktuell nur `return null` (bewusster Platzhalter laut eigenem Kommentar, keine Funktion zu ersetzen)

## 4. Für saubere Integration nötig

1. Neue `HufiAssistantExperience.tsx`, die die Lab-Visuals (`HufiWave`,
   Lab-`HufiOrb`, Phasen-Layout aus `HufiPremiumLab`) übernimmt, aber
   `phase`/`content` aus echtem State ableitet statt aus `useHufiScenarioPlayer`.
2. Eine echte State-Ableitungsfunktion (`orbState` + `askHufiAgent`-Response
   + `agent_tasks`-Status → `HufiPhase`/`content`), als Ersatz für den
   Szenario-Player — das ist die eigentliche Arbeit, nicht die Optik.
3. Content-Kind-Renderer (Observation/Appointment/Invoice/Horse) auf
   echte Daten umstellen; wo es noch keine Einzelobjekt-Abfrage gibt
   (z. B. Einzelrechnung), fehlt noch eine echte Datenquelle.
4. `questioning`/`wake` entweder auf vorhandene Mechanismen abbilden
   (Pferdesuche-Disambiguierung) oder für den ersten Wurf weglassen,
   statt sie zu simulieren.
5. Einbindung in `/home` zunächst nur hinter einer separaten Preview-Route,
   nicht anstelle von `HufiAssistantCockpit` im Hauptbranch.

## 5. Umfang

**Groß.** ~1615 Zeilen bestehender Lab-Code als visuelle Basis, plus die
eigentliche State-/Datenanbindung (Punkt 4.1–4.4) als neue Arbeit — kein
kleiner Umverdrahtungs-Task.
