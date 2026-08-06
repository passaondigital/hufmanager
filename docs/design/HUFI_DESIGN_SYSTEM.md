# Hufi Designsystem — Operative Produktfassung

**Status:** Verbindlich für HufiApp-Entwicklung (Claude/Codex), Snapshot der strategischen Leitlinie
**Version:** 1.0.0
**Stand:** 2026-08-06
**Verantwortlich:** Pascal (Product Owner), gepflegt durch Claude/Codex im Rahmen der jeweiligen Arbeitseinheit
**Strategische Quelle:** `/home/pascaladmin/pascal-brain/HUFI_DESIGN_SYSTEM.md` (ökosystemweite Markenleitlinie, nicht versioniert im Repo)
**Dieses Dokument:** versionierter Produkt-Snapshot für HufiApp-Code, tiefer und technischer als die strategische Fassung

## 0. Verhältnis der beiden Design-Dokumente

| | Strategische Fassung | Operative Fassung (dieses Dokument) |
|---|---|---|
| Ort | `pascal-brain/HUFI_DESIGN_SYSTEM.md` | `hufiapp-dev/docs/design/HUFI_DESIGN_SYSTEM.md` |
| Reichweite | gesamtes Hufi-Ökosystem (App, heyhufi.com, Browser, Business, Studio, Cloud, Marketing, Präsentationen) | HufiApp-Code konkret: Tokens, Komponenten, Zustände |
| Änderungsprozess | Pascal entscheidet, seltene strategische Änderungen | ändert sich mit jedem Design-Arbeitspaket im Repo, muss mit der strategischen Fassung konsistent bleiben |
| Bei Widerspruch | strategische Fassung gewinnt bei Markenfragen | operative Fassung gewinnt bei technischer Implementierungsfrage (Token-Name, CSS-Wert) |

Synchronisation: Wer die strategische Fassung ändert (Markenprinzip, Farbrolle, Tonalität), muss prüfen, ob dieses Dokument nachziehen muss, und umgekehrt. Kein automatischer Sync, keine symbolischen Links — beide Dateien werden bewusst getrennt gepflegt, weil sie in getrennten, nicht gemeinsam versionierten Verzeichnissen liegen (`pascal-brain` ist kein Git-Repo dieses Projekts).

---

## A. Markenfundament

Hufi ist die Dachmarke, der persönliche Assistent und die durchgängige Identität des Ökosystems. HufiApp ist der produktseitige Türöffner und erste reale Kundenzugang — hier lernen Menschen Hufi kennen. `heyhufi.com` ist die öffentliche, internationale Eingangstür zur gesamten Hufi-Welt. Details zur Marken-, Unternehmens- und Plattformarchitektur stehen in `pascal-brain/HUFI_ECOSYSTEM_BRAND_ARCHITECTURE.md` und werden hier nicht dupliziert.

**Markenversprechen:** Weniger Chaos. Mehr Zeit am Pferd. Hufi gibt dem Pferd eine Stimme, dem Menschen Klarheit und dem Business Struktur.

**Produktpersönlichkeit** (aus `pascal-brain/HUFI_ECOSYSTEM_IDENTITY.md`, Abschnitt 13–14, verbindlich für UI-Ton und visuelle Wirkung): persönlich, kontextbewusst, ruhig, geerdet, hilfreich, professionell, vertrauenswürdig, konkret, handlungsorientiert, proaktiv aber nicht aufdringlich. Hufi ist weder kalte Datenbank noch Supportbot, weder übermotivierter Verkäufer noch kindliche Comicfigur, weder allwissender Guru noch kontrollierender Chef.

**Verhältnis Mensch, Pferd, Business, Technologie:** Das Pferd steht im Mittelpunkt, der Mensch wird unterstützt, der Betrieb bleibt handlungsfähig. Technik tritt hinter dem Nutzen zurück — sichtbare Technik ohne erkennbaren Nutzen widerspricht der Marke (vgl. Abschnitt L).

**Abgrenzung von generischer KI-Ästhetik:** Hufi zeigt sich nicht als "noch ein Chat-Fenster". Die visuelle Sprache ist warm, geerdet und handwerklich-professionell (Stallarbeit, echte Pferdeprofis), nicht futuristisch-steril und nicht verspielt.

---

## B. Designprinzipien

Hufi soll wirken: hochwertig, modern, klar, ruhig, menschlich, intelligent, vertrauenswürdig, professionell, zugänglich.

Hufi soll **nicht** wirken: verspielt-kindlich, steril, erdrückend, wie ein generisches SaaS-Template, wie eine austauschbare KI-App.

**Verbindliches Verbot** (Governance, siehe Abschnitt N):
- keine braun-beige Standard-KI-Optik
- kein unnötiger Glasmorphismus
- keine zufälligen Farbverläufe
- keine dekorativen Effekte ohne Funktion
- keine inkonsistenten Schatten (nur `--hufi-shadow-soft` / `--hufi-shadow-float`, siehe Abschnitt C)
- keine frei erfundenen Einzelstile pro Seite
- kein „KI-Slop"

---

## C. Light Mode und Dark Mode — Tokens

### C.1 Bestehende Quelle der Wahrheit

Es existieren **zwei parallele, noch nicht konvergierte Token-Quellen** im Code. Das ist ein dokumentierter, ungelöster Widerspruch (siehe C.3), keine Erfindung:

1. **`src/styles/hufi/tokens.css`** — isolierte, scoped Hufi-Primitives (seit 2026-08-05, Commit `b7e1d804`). Wirkt nur innerhalb von Komponenten, die `.root`-Klasse aus diesem Modul tragen (aktuell: `HufiDesignSystemPreview`, `HufiSwipeWorkspacePreview`). Verändert keine globalen App-Styles.
2. **`src/index.css`** — produktive, globale shadcn/Tailwind-HSL-Variablen (`--primary`, `--background`, `--accent` usw.), die die gesamte bestehende Produktions-App einfärben.

Dieses Dokument definiert die **semantischen Rollen** unten anhand der Hufi-Primitives-Werte (`tokens.css`), weil sie näher an der in Abschnitt A/B beschriebenen Markenrichtung liegen und für neue Oberflächen verbindlich sind. Bestehende produktive Screens, die noch auf `index.css`-Variablen laufen, werden **nicht** rückwirkend umgestellt, ohne dass ein eigenes Migrationspaket das explizit prüft (Light/Dark, Kontrast, mobile Regression).

### C.2 Semantische Tokens (verbindlich für neue Hufi-Oberflächen)

| Semantische Rolle | CSS-Variable | Light | Dark | Quelle |
|---|---|---|---|---|
| Canvas | `--hufi-canvas` | `#f6f5f1` | `#14130f` | tokens.css |
| Surface | `--hufi-surface` | `#ffffff` | `#1e1c17` | tokens.css |
| Elevated Surface | `--hufi-surface-raised` | `#fffcf8` | `#27241d` | tokens.css |
| Muted Surface | *(fehlt, siehe C.3)* | — | — | GAP |
| Primary Text | `--hufi-ink` | `#202420` | `#f4f0e9` | tokens.css |
| Secondary Text | `--hufi-muted` | `#69716a` | `#b7b8ad` | tokens.css |
| Disabled Text | *(fehlt, siehe C.3)* | — | — | GAP |
| Border / Divider | `--hufi-line` | `rgba(32,36,32,.10)` | `rgba(244,240,233,.13)` | tokens.css |
| Primary Action / Accent | `--hufi-accent` | `#e97824` | `#e97824` (unverändert) | tokens.css |
| Primary Action (Hover/Strong) | `--hufi-accent-strong` | `#c95613` | `#c95613` (unverändert) | tokens.css |
| Secondary Action | Komposition: `--hufi-surface-raised` + `--hufi-line`-Border | — | — | primitives.module.css (`.secondary`) |
| Success | `--hufi-positive` | `#28764a` | `#77ca94` | tokens.css |
| Warning | `--hufi-warning` | `#9b5f00` | `#f4b65a` | tokens.css |
| Danger | `--hufi-danger` | `#b44035` | `#f29b91` | tokens.css |
| Information | *(fehlt, siehe C.3)* | — | — | GAP |
| Offline | *(fehlt, siehe C.3)* | — | — | GAP |
| Provider unavailable | *(fehlt, siehe C.3)* | — | — | GAP |
| Focus Ring | Komposition: `color-mix(in srgb, var(--hufi-accent) 45%, transparent)` | — | — | primitives.module.css |
| Shadow (ruhend) | `--hufi-shadow-soft` | `0 2px 8px rgba(39,32,20,.05), 0 18px 40px rgba(39,32,20,.07)` | unverändert | tokens.css |
| Shadow (erhöht/Sheet) | `--hufi-shadow-float` | `0 12px 30px rgba(39,32,20,.16)` | unverändert | tokens.css |
| Overlay/Scrim | Komposition: `color-mix(in srgb, var(--hufi-ink) 10%, transparent)` | — | — | primitives.module.css (`.sheetBackdrop`) |
| Selected/Hover/Pressed | *(nicht als eigene Tokens, sondern als Zustandslogik pro Komponente, siehe Abschnitt F)* | — | — | — |

### C.3 Dokumentierte Lücken (nicht raten, hier offen benennen)

- **Muted Surface, Disabled Text, Information, Offline, Provider-unavailable** existieren als CSS-Variable noch nicht. Sie dürfen **nicht** durch neu erfundene freie Hex-Werte geschlossen werden. Empfehlung für die nächste Design-Einheit: aus der bestehenden Palette ableiten (z. B. Information über eine gedämpfte Variante von `--hufi-ink`/`--hufi-muted` statt eines neuen Blautons, da kein Blau in der Markenpalette vorkommt; Offline/Provider-unavailable über `--hufi-muted` + Badge-Icon statt eigener Farbe, um keine sechste Statusfarbe einzuführen). Diese Empfehlung ist **nicht umgesetzt** — offene Entscheidung für Pascal (siehe Abschlussbericht).
- **Accent im Dark Mode** ist aktuell identisch mit Light Mode (`#e97824` in beiden). Das ist eine bewusste Ausnahme (Markenfarbe soll wiedererkennbar bleiben), aber noch nicht gegen WCAG-Kontrast auf `--hufi-canvas` (dark: `#14130f`) geprüft. Offene Prüfung.
- **Zweite, konkurrierende Tokenquelle** `src/index.css`: Produktions-Primary ist `hsl(38 92% 50%)` (light) bzw. `hsl(36 92% 50%)` ≈ `#F5970A` (dark) — ein anderer Orangeton als `--hufi-accent` (`#e97824`). Beide sind "Hufi-Orange", aber nicht derselbe Wert. Bis zu einer bewussten Konvergenz-Entscheidung gilt: **neue isolierte Hufi-Oberflächen nutzen `tokens.css`**, bestehende produktive Screens bleiben auf `index.css`, bis ein eigenes Migrationspaket das übernimmt. Keine stille Vermischung beider Systeme in derselben Komponente.

### C.4 Regel

Hufi-Orange (`--hufi-accent`) bleibt gezielter Markenakzent für Primäraktionen, aktive Zustände und Marken-Momente (Hufi-Startseite, Voice-Button). Er darf nicht jede Fläche dominieren — Karten, Listen und Formulare bleiben überwiegend `--hufi-surface`/`--hufi-canvas` mit `--hufi-ink`-Text. Light und Dark Mode sind gleichwertig gestaltet: Dark Mode ist keine reine Invertierung, sondern nutzt eigene Surface-Abstufungen (`#1e1c17` / `#27241d`) statt eines einzigen invertierten Schwarztons.

---

## D. Typografie

**Markenschrift:** Outfit (aktuell in `tokens.css` als `font-family: Outfit, system-ui, sans-serif` gesetzt). Keine Fontdateien werden im Repo eingecheckt oder verteilt — Ladeweg (Google Fonts/Self-Hosting) ist in diesem Dokument nicht festgelegt und muss vor breiterer Nutzung geklärt werden (offene Frage, siehe Abschlussbericht).

**Fallback-Kette:** `Outfit, system-ui, sans-serif` — bewusst mit System-UI-Fallback, damit Text auch ohne geladene Webfont lesbar und markennah bleibt.

Aus dem bestehenden Code ableitbare Referenzgrößen (`primitives.module.css`, `HufiDesignSystemPreview`):

| Rolle | Größe/Zeilenhöhe | Gewicht | Quelle |
|---|---|---|---|
| Headline (Hufi-Startseite) | 25px / 1.1, letter-spacing -.03em | 700 (implizit über `<h1>`-Kontext) | `.headline` |
| Eyebrow/Label | 12px, letter-spacing .09em, UPPERCASE | 800 | `.eyebrow` |
| Button-Text | 15px / 1 | 600 | `.button` |
| Tile-Titel | 15px | 700 | `.tileTitle` |
| Tile-Beschreibung/Caption | 13px | 400 (implizit) | `.tileDescription` |
| Badge/Label klein | 12px / 1 | 700 | `.badge` |

**Lücke:** Eine vollständige Skala Display/H1–H6/Body/Small/Label/Caption/Zahlen/Tabellen ist im Code noch nicht durchgängig als Tokens definiert — nur die oben genannten, aus konkreten Komponenten abgeleiteten Werte existieren real. Bevor eine App-weite Typografie-Migration stattfindet, muss diese Skala als eigenes, geprüftes Arbeitspaket ergänzt werden (mobile Skalierung, Zeilenhöhen, maximale Textbreiten für Fließtext in Pferdeakten/Dokumentation).

**Prinzip:** wichtigstes Ergebnis zuerst (entspricht Hufis Kommunikationsstil, Abschnitt L), klare Hierarchie zwischen Titel/Wert und Beschreibung/Meta (wie in `HufiTile`: Titel fett, Beschreibung gedämpft in `--hufi-muted`), keine mehr als zwei Gewichtsstufen pro Fläche.

---

## E. Layoutsystem

**Spacing-Tokens** (`tokens.css`, verbindlich): `--hufi-space-1` 4px, `-2` 8px, `-3` 12px, `-4` 16px, `-5` 24px, `-6` 32px.

**Radien:** `--hufi-radius-sm` 12px (Buttons, Icon-Buttons in Kombination mit `50%` für rund), `--hufi-radius-md` 18px (Buttons, Kacheln), `--hufi-radius-lg` 26px (Panels, Sheets, Preview-Rahmen).

**Touch-Ziele:** mindestens 48px (Buttons, Icon-Buttons, Kacheln sind bereits mit `min-height:48px` bzw. `48×48px` umgesetzt — entspricht der Vorgabe von 44–48px im Briefing, oberes Ende gewählt).

**Kachelraster:** `HufiSwipeWorkspacePreview` nutzt ein Zwei-Kachel-Raster (`grid-template-columns: repeat(2, minmax(0,1fr))`, Gap 12px, Klasse `.tiles`). Das ist die reale, verbindliche Referenz für "Zwei-Kachel-Layout" aus der Aufgabenstellung.

**Preview-/Mobile-Container:** `.preview` begrenzt auf `max-width:420px`, zentriert, mit `--hufi-canvas`-Hintergrund und 30px Radius — als Bühne für die isolierte Story-Komponente, nicht als App-weiter Container-Standard.

**Lücke:** Ein vollständiges Breakpoint-System (Grid, Containerbreiten für Desktop, Safe-Areas jenseits der bereits vorhandenen `env(safe-area-inset-*)`-Nutzung in `HufiMenu.tsx`/`MobileShellParts.tsx`, einspaltige Rückfallebene für Desktop-Breiten) ist im isolierten Hufi-System noch nicht definiert. Bestehende produktive Desktop-Layouts (`AppSidebar.tsx`, `AppTopBar.tsx`) haben ein eigenes, nicht token-basiertes Raster — Konvergenz offen.

---

## F. Komponentensystem

### F.1 Bereits real implementierte Primitives (`src/design-system/hufi/primitives.tsx`)

Für jede Komponente: Zweck, Varianten/Zustände, Light/Dark (automatisch über CSS-Variablen, kein Extra-Code nötig), Responsive, A11y, erlaubte/unerlaubte Verwendung.

**`HufiSurface` / `HufiPanel`**
- Zweck: Grundfläche für Inhalte; `HufiPanel` = `HufiSurface` mit Innenabstand `--hufi-space-5`.
- Varianten: `raised` (Standard, mit Schatten) vs. `raised={false}` (flach, ohne Schatten).
- A11y: reines Container-Element, kein eigenes Rollenverhalten — Rolle/Label muss vom Inhalt kommen.
- Erlaubt: als Basis für Karten, Panels, Sheets. Nicht erlaubt: eigene Border/Radius/Schatten per Inline-Style statt Token.

**`HufiButton`**
- Varianten: `primary` (Akzentfarbe, für die eine Hauptaktion pro Screen), `secondary` (neutrale Fläche + Rand, für gleichwertige Alternativaktionen), `quiet` (transparent, für Low-Emphasis-Aktionen wie „Abbrechen").
- Zustände: Hover (`primary` wird `--hufi-accent-strong`), Active (scale .98), Focus-visible (Outline-Ring in Akzentfarbe), Disabled ist **nicht** im Code definiert — Lücke, vor produktivem Einsatz ergänzen.
- Touch-Ziel: 48px Mindesthöhe.
- Erlaubt: genau eine `primary`-Aktion pro sichtbarem Bereich. Nicht erlaubt: mehrere `primary`-Buttons nebeneinander (konkurrierende Hauptaktionen widersprechen Hufis ruhiger, klarer Kommunikationslogik, Abschnitt L).

**`HufiIconButton`**
- Zweck: runde 48×48px Aktionsfläche für Icon-only-Aktionen.
- A11y: **muss** `aria-label` erhalten (im Primitive nicht erzwungen — Verantwortung liegt bei der aufrufenden Stelle; bestehendes Beispiel `HufiMenu.tsx` setzt `aria-label="Menü"` korrekt).

**`HufiStatusBadge`**
- Varianten (`tone`): `success`, `warning`, `danger`, `neutral`. **Kein `information`-Tone vorhanden** (siehe Lücke C.3) — bis zur Klärung `neutral` verwenden, nicht improvisieren.
- Visuelles Muster: farbiger Punkt (`::before`) + Text, Hintergrund als 13%-Mix der Statusfarbe — dieses Muster ist verbindlich für alle künftigen Status-Anzeigen (Reifegrad, Sync-Status, Angebotstatus etc.), damit nicht pro Screen neue Badge-Stile entstehen.

**`HufiTile`**
- Zweck: Workspace-Kachel (Icon, Titel, optionale Beschreibung), Basis-Baustein für die zwei-Kachel-Workspace-Übersicht.
- Zustand Hover: `translateY(-2px)` + Schattenwechsel von flach zu `--hufi-shadow-soft`.
- Erlaubt: als Eingang zu einem Arbeitsbereich (z. B. Termine, Kunden). Nicht erlaubt: als reiner Info-Anzeiger ohne Navigationsziel — Kacheln sind laut Aufgabenstellung Arbeitsbereiche, keine Widgets.

**`HufiSheet`**
- Zweck: Bottom-/Overlay-Sheet mit Griff-Indikator (`.sheetHandle`), Backdrop mit 10%-Ink-Scrim.
- Bereits produktiv genutztes Referenzmuster für Sheets ist tatsächlich `@radix-ui/react-dialog`-basiert (`components/ui/sheet.tsx`, genutzt in `HufiMenu.tsx`) — dort mit echtem Fokus-Trap, Escape/Außenklick-Schließen, Body-Scroll-Lock. `HufiSheet` aus den Primitives ist visuell, **nicht** funktional äquivalent (kein eigener Fokus-Trap). Bis dieser Unterschied aufgelöst ist: für produktive Sheets weiterhin `components/ui/sheet.tsx` (Radix) verwenden und optisch an `--hufi-*`-Tokens annähern, nicht `HufiSheet` blind ersetzen.

### F.2 Noch nicht als Hufi-Primitive existierende, aber in der App vorhandene Komponententypen

Diese existieren produktiv (in `src/components/ui/`, Standard-shadcn-Basis) und wurden **nicht** neu erfunden, sondern werden hier als Bestand referenziert, damit keine Duplikate entstehen: Select, Textarea, Checkbox, Switch, Tabs, Chips/Badge (produktive Variante ≠ `HufiStatusBadge`, siehe Konvergenzhinweis unten), Karten, Listen, Tabellen, Modals, Toasts, Tooltips. Diese sind noch **nicht** auf `--hufi-*`-Tokens migriert und liegen weiterhin auf `index.css`-Variablen — siehe C.3 zur Zwei-Quellen-Situation.

### F.3 In der Aufgabenstellung geforderte, aber im Code nicht auffindbare Komponenten (dokumentierte Lücke, nicht erfunden)

Nicht nachgewiesen im Code (weder als `Hufi*`-Primitive noch als etabliertes produktives Muster): Segmented Controls, Kalender-Komponente als Designsystem-Baustein (Kalender-Feature existiert als Seite, nicht als Token-Primitive), Bottom Navigation als eigenes Token-System (real vorhanden: `MobileBottomNav.tsx`, aber ungeprüft gegen `--hufi-*`), Hufi Composer und Voice Button als eigenständige dokumentierte States (real vorhanden in `src/components/assistant`/`src/components/voice`, aber nicht Teil des isolierten Designsystems), Empty States, Offline States, Skeletons, Bestätigungs-/Berechtigungsdialoge als eigene Hufi-Varianten. Diese müssen in künftigen Design-Einheiten **aus dem echten, bestehenden Code** abgeleitet werden, nicht neu ausgedacht — erster Ansatzpunkt für Offline-/Fehlerzustände ist Abschnitt G/H dieses Dokuments in Verbindung mit der tatsächlichen Implementierung in `src/lib/offline/` und `src/hooks/offline/`.

---

## G. Hufi-spezifische Oberflächen

Grundlage: `pascal-brain/HUFI_ECOSYSTEM_IDENTITY.md` Abschnitt 19 (Voice-First-Zustände) und der reale Code in `src/components/assistant/`, `src/components/workspace/HufiSwipeWorkspace.tsx`, `src/lib/offline/`.

**Interaktionszustände (verbindlich, aus der Identity-Definition):** Ambient (ruhig verfügbar) → Wake → Listening → Transcribing → Understanding → Questioning → Preparing → Confirming → Executing → Success / Error / Interrupted. Orb/Wave-Animation ist Signal, keine Dekoration — jeder Zustand hat eine eigene, unterscheidbare Bewegungsqualität (Ambient dezent, Wake warmer Impuls, Listening offen, Understanding konzentriert, Questioning wartend, Preparing kontrolliert aktiv, Confirming fokussiert, Executing Fortschritt, Success warmer Abschluss, Error ruhig und klar — **nicht** alarmierend/rot-blinkend, entspricht Hufis "ruhig und geerdet"-Prinzip).

**Denkzustand:** Anzeige „Hufi denkt nach" — **nicht** „Hufi hat verstanden" (nicht belegte Erfolgsbehauptung, bereits als Fix in `docs/HUFI-CODEX-HANDOFF.md` dokumentiert und umgesetzt).

**Übergang Hufi → Workspace:** über Wisch vom linken Rand (24px Startzone, siehe `docs/hufi-workspace.md`) oder sichtbaren, tastaturbedienbaren Button. Das Hamburger-Menü bleibt bewusst getrennt von diesem Übergang (siehe F.1/HufiMenu und Abschnitt 2 der Aufgabenstellung — Workspace-Kacheln sind kein Hamburger-Menü-Ersatz).

**Fehlerzustand / Offline-Zustand / Provider-nicht-verfügbar:** siehe eigenständiges Kapitel Abschnitt 3 der Gesamtaufgabe (`docs/hufi-offline-current-state.md` als bestehende Analyse, plus die in dieser Arbeitseinheit ergänzten Fehlerzustände, siehe Abschlussbericht). Grundregel für die visuelle Gestaltung: Fehlerzustände nutzen `--hufi-warning`/`--hufi-danger` sparsam und **nie** als vollflächigen roten Screen — Hufi bleibt auch im Fehlerfall ruhig (`„Die Nachricht konnte nicht versendet werden. Ich habe nichts weiter verändert."`).

**Bestätigung kritischer Aktionen:** je größer die Auswirkung, desto deutlicher Vorschau und Bestätigung (Identity Abschnitt 17). Visuell: kritische Bestätigungen nutzen `HufiSheet`/Dialog mit expliziter Wirkungs-/Betroffenen-/Rückgängig-Anzeige, nicht ein einfaches Ja/Nein ohne Kontext.

---

## H. Motion und Interaktion

**Timing-Token:** `160ms` mit Easing `cubic-bezier(.2,.8,.2,1)` (`--hufi-ease`) — verbindlich für alle Hover-/Active-/Focus-Übergänge (Button, Icon-Button, Tile). Keine abweichenden Dauerwerte pro Komponente ohne Begründung.

**Prinzipien:** Bewegung ist Feedback, nicht Dekoration. Aktive Zustände nutzen dezente Skalierung (`scale(.98)` bei Press) oder Positionsverschiebung (`translateY(-2px)` bei Tile-Hover) — keine Rotation, kein Bounce, kein Konfetti.

**Reduzierte Bewegung:** `prefers-reduced-motion` ist im aktuellen isolierten Hufi-System **nicht** explizit abgefragt (Lücke, vor breiterer Nutzung zu ergänzen — betrifft besonders die Voice-/Orb-Animation aus Abschnitt G, die bei vielen Nutzern dauerhaft sichtbar ist).

**Keine unnötigen Daueranimationen:** Ambient-Zustand des Voice-Orbs ist laut Identity-Definition "dezent", nicht dauerhaft auffällig-pulsierend — das ist eine inhaltliche Vorgabe aus der Identität, die visuell noch nicht im Code verifiziert wurde (Prüfpunkt für die nächste Voice-UI-Einheit, sobald der Anthropic-Billing-Block aufgehoben ist).

---

## I. Icons, Bilder und Illustrationen

**Icon-Sprache:** aktuell `lucide-react` (siehe `HufiMenu.tsx`: `Menu, User, Settings, Mic, CreditCard, HelpCircle, Scale, FileText, Shield, LogOut`), durchgängig als Linien-Icons mit einheitlicher Strichstärke (Lucide-Standard). Größen im bestehenden Code: 20px (Menü-Trigger), 16px (`h-4 w-4`, Menüpunkte). Kein eigenes Hufi-Icon-Set nachgewiesen — Lücke, sofern eine markenspezifische Ikonografie über Lucide hinaus gewünscht ist.

**Statusfarben für Icons:** folgen denselben semantischen Tokens wie Badges (Abschnitt C/F) — kein eigenes Icon-Farbsystem.

**Foto-/Bildsprache, Pferdebildsprache, Menschenbild, Illustrationen:** **nicht im Code nachgewiesen.** Es gibt kein Asset-Verzeichnis mit kuratierter Bildsprache, das als Referenz dienen könnte (`src/assets/lp` enthält Landingpage-Assets, deren Kuratierungsrichtlinie nicht dokumentiert ist). Dieser Unterabschnitt bleibt eine offene strategische Aufgabe für die strategische Fassung in `pascal-brain`, nicht für den Code — Empfehlung: keine generischen Stock-KI-Bilder als Standard, echte Pferde-/Stallfotografie bevorzugen, sobald ein Bildbestand kuratiert wird.

---

## J. Webseiten und Landingpages

**Bestehende Komponenten:** `src/components/landing/`, `src/components/landing-editor/`, `src/pages/website/` (inkl. `WebsiteImpressum`, `WebsiteDatenschutz`, `WebsiteAGB`, `WebsiteWiderruf`, `WebsiteHome`), Routen `/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/website`. Es existiert außerdem `/hufi-lab` (`HufiPremiumLab`, Route in `App.tsx`) als bereits vorhandene Premium-Referenzfläche — laut Memory-Eintrag `feedback_hufi_lab_premium_quality` ist die Leitlinie dort: reale Produktionskomponenten/-muster übernehmen statt neue Optik erfinden. Das gilt sinngemäß auch für `heyhufi.com` (separates, in dieser Arbeitseinheit nicht zugängliches Projekt) — sobald daran gearbeitet wird, ist `/hufi-lab` und dieses Dokument die verbindliche Referenz, keine neue Stilrichtung.

**Rechtstexte/Footer/Kontakt:** bereits als eigene Routen vorhanden (siehe oben), Inhalt/Layout nicht im Rahmen dieser Design-System-Einheit geprüft.

**Lücke:** Hero-Bereiche, Call-to-Actions, Feature-Bereiche, Preise, Kundenstimmen als dokumentierte Designsystem-Patterns sind nicht als eigenständige, tokenisierte Bausteine nachgewiesen — vor einer heyhufi.com-Umsetzung eigenes Arbeitspaket nötig, das den `/hufi-lab`-Bestand auswertet.

---

## K. Social Media und Marketing

**Nicht im Code nachgewiesen.** Es gibt keine Repo-Assets, Vorlagen oder Formatdefinitionen für Instagram/TikTok/YouTube/LinkedIn/Anzeigen im `hufiapp-dev`-Repository. Dies ist naturgemäß außerhalb eines App-Repos und gehört in die strategische Fassung (`pascal-brain`) bzw. ein separates Marketing-Werkzeug (aktuell laut Memory `hufi_business_stack` keine aktiven Marketing-Tools). Formatgrößen, Logo-Safe-Area, Wasserzeichen etc. sind als **offene Aufgabe für die strategische Fassung** vermerkt, nicht für dieses Produktdokument.

---

## L. Content und Sprache

Grundlage: `pascal-brain/HUFI_ECOSYSTEM_IDENTITY.md` Abschnitt 14 (Kommunikationsstil), verbindlich für alle UI-Texte, Fehlermeldungen, Bestätigungen und Hilfetexte.

**Tonalität:** natürlich, verständlich, kurz genug für Stallarbeit, ohne unnötigen Fachjargon. Wichtigstes Ergebnis zuerst, dann ein klarer nächster Schritt. Namen sparsam verwenden, keine Monologe, keine leeren Floskeln, kein Dauerlob.

- **Gut:** „Bei Ginger fehlt die Stalladresse für morgen. Soll ich eine Nachricht an die Besitzerin vorbereiten?"
- **Schlecht:** „Es wurde eine Inkonsistenz im relationalen Datenmodell des Terminobjekts festgestellt."

**Ehrlichkeit als Sprachregel:** „Das weiß ich noch nicht.", „Dafür fehlen mir Angaben.", „Ich habe nur einen Entwurf vorbereitet.", „Die Nachricht wurde noch nicht versendet.", „Die Prüfung ist fehlgeschlagen." — keine falschen Erfolgsbehauptungen, keine technischen Ausreden gegenüber Nutzern (kein „Server-Timeout Code 503" in der Nutzeroberfläche, siehe Abschnitt 3 der Gesamtaufgabe zu Provider-Fehlerzuständen).

**Schreibweisen (verbindlich):** „Hufi" (Assistent/Dachmarke), „Hufi App" oder „HufiApp" — im Code aktuell als ein Wort `HufiApp` gebräuchlich (Dateiname/Kommentare), in Fließtext gegenüber Nutzern bevorzugt als zwei Wörter „Hufi App", sofern die strategische Fassung nichts anderes festlegt. „heyhufi.com" durchgängig klein geschrieben, keine Großschreibung am Satzanfang erzwingen, wenn es als Marke/URL auftritt.

**Du-Ansprache:** durchgängig in den bestehenden Referenztexten der Identity-Definition (`„Guten Morgen, Pascal."`, `„Was kann ich heute für dich und dein Pferd tun?"`) — verbindlich für alle Produkttexte.

**Keine infantil wirkenden Texte, kein „Jarvis für Pferde"** in der Außenkommunikation (explizites Verbot aus der Identity-Definition, Abschnitt 21).

---

## M. Accessibility und Inklusion

**Bereits umgesetzt:**
- Fokus sichtbar über `outline: 3px solid color-mix(in srgb, var(--hufi-accent) 45%, transparent)` mit `outline-offset:2px` (Button, Icon-Button, Tile).
- Touch-Ziele ≥ 48px durchgängig in den Primitives.
- Safe-Area-Behandlung für Notch/Punch-Hole und Home-Indicator in `HufiMenu.tsx`/`MobileShellParts.tsx` über `env(safe-area-inset-*)`.
- Sheet-Fokus-Rückgabe und Escape/Außenklick-Schließen über die reale Radix-`Sheet`-Komponente (nicht die visuelle `HufiSheet`-Primitive, siehe F.1).

**Dokumentierte Lücken:**
- Kontrastprüfung der `--hufi-accent`-Farbe gegen `--hufi-canvas` in beiden Modi ist nicht formal durchgeführt (siehe C.3).
- `prefers-reduced-motion` wird im isolierten Hufi-System nicht abgefragt (siehe H).
- Screenreader-Kontext für `HufiTile`/`HufiStatusBadge` (z. B. `aria-label` für den reinen Farbpunkt vor dem Badge-Text) ist nicht geprüft — der Punkt vor dem Badge-Text transportiert Status zusätzlich zur Farbe über Text, das ist bereits richtig gelöst (keine reine Farbcodierung), aber nicht formal mit Screenreader getestet.
- Skalierbare Texte (Nutzer-Schriftgrößen-Einstellungen des Betriebssystems) sind wegen fester `px`-Werte in `primitives.module.css` nicht geprüft — potenzieller Konflikt mit „skalierbare Texte", vor breiterer Nutzung zu klären (`rem`/`clamp()`-Umstellung als Kandidat, hier nicht umgesetzt).

---

## N. Design-Governance

1. **Design-Tokens sind die einzige Quelle für Farben und Abstände.** Neue isolierte Hufi-Oberflächen verwenden ausschließlich `--hufi-*`-Variablen aus `tokens.css`. Keine neuen freien Hex-Werte in Komponenten (Ausnahme: dokumentierte Lücken aus C.3, bis sie als Token nachgezogen sind — auch dann keine Erfindung neuer Werte ohne Rückbindung an die bestehende Palette).
2. **Keine lokalen Schatten ohne Token** — nur `--hufi-shadow-soft` / `--hufi-shadow-float`.
3. **Keine neue Komponente ohne dokumentierten Zweck** — jede neue `Hufi*`-Primitive wird in Abschnitt F dieses Dokuments mit Zweck, Varianten, Zuständen, A11y und erlaubter/unerlaubter Verwendung ergänzt, bevor sie produktiv verwendet wird.
4. **Keine Produktseite ohne Light-/Dark-Prüfung** — beide Modi sind gleichwertig (Abschnitt C.4), nicht nur Light mit automatischer Invertierung.
5. **Keine visuelle Änderung ohne mobile Prüfung** — Referenzbreite 420px (siehe `.preview`-Container) plus reale schmale Geräte (~360px, siehe bekanntes Restrisiko in `docs/hufi-workspace.md` zur Swipe-Randzone).
6. **Keine Abweichung ohne dokumentierte Ausnahme** — Abweichungen (wie die zwei parallelen Token-Quellen in C.3) werden hier dokumentiert, nicht stillschweigend toleriert.
7. **Migrationsreihenfolge (Empfehlung, nicht beschlossen):** (1) verbleibende Lücken in C.3/D/H schließen, (2) einzelne produktive Screens gezielt auf `--hufi-*`-Tokens migrieren, beginnend mit dem Workspace (bereits begonnen laut `docs/hufi-workspace.md`), (3) globale `index.css`-Variablen erst anfassen, wenn Konvergenz-Entscheidung zwischen beiden Orangetönen getroffen ist.
8. **Review-Checkliste** für jede Design-Änderung: Token statt Hex? Beide Modi geprüft? Mobile geprüft? Bestehende Primitive wiederverwendet statt neu erfunden? Tonalität (Abschnitt L) eingehalten? Diese Fragen werden auch in Abschnitt 5 der Gesamtaufgabe ("Qualitätsgates") technisch erzwungen (Hex-Grep, Build, Light/Dark/Mobile-Check).
9. **Versionierung:** Änderungen an diesem Dokument erhöhen die Versionsnummer im Kopf (SemVer: Patch = Ergänzung/Klarstellung, Minor = neue Komponente/Token, Major = Bruch mit bestehender Struktur) und tragen ein aktuelles Datum.
10. **Deprecation:** Wird ein Token oder eine Primitive ersetzt, bleibt der alte Name als "deprecated" mit Verweis auf den Nachfolger in diesem Dokument stehen, bis alle Verwendungsstellen migriert sind — kein ersatzloses stilles Löschen, solange Code darauf verweist.

---

## Änderungsprotokoll

- **1.0.0 (2026-08-06):** Erste vollständige operative Fassung, rekonstruiert aus dem bestehenden Kurzdokument (vormals `docs/hufi-design-system.md`), den realen Primitives (`src/design-system/hufi/`), den realen Tokens (`src/styles/hufi/`), der strategischen Marken- und Identitätsleitlinie (`pascal-brain/HUFI_ECOSYSTEM_BRAND_ARCHITECTURE.md`, `HUFI_ECOSYSTEM_IDENTITY.md`) und dem produktiven `index.css`-Bestand. Bestehende Inhalte aus dem Kurzdokument wurden übernommen, nicht ersetzt. Alle Lücken sind explizit als Lücke markiert, keine erfundenen Werte.
