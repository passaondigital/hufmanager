# Robustheits-Analyse: Start-/Ladefehler (19.07.2026)

Auftrag: nur Analyse, keine Fixes. Rahmen: drei Verteidigungslinien —
(1) den heutigen Fehlertyp unmöglich machen, (2) andere Fehler vor dem
Deploy fangen, (3) wenn doch etwas durchrutscht, nie einen weißen
Screen zeigen.

**Kurzfazit:** Linie 1 ist nach dem heutigen Fix teilweise gehärtet,
hat aber eine konkrete Lücke (Key statt URL) UND einen unbewachten
zweiten Deploy-Pfad (GitHub Actions), der das neue Gate komplett
umgeht. Linie 2 existiert praktisch nicht (kein automatischer
Smoke-Test, kein Rollback in `deploy.sh`, obwohl 17 alte manuelle
Backup-Ordner zeigen, dass genau das früher gebraucht wurde). Linie 3
ist an einer Stelle stark (ErrorBoundary, Auth-Safety-Timeout), hat
aber die entscheidende Lücke: Fehler VOR dem React-Mount (genau der
heutige Fall) werden von NICHTS aufgefangen — kein statisches
HTML-Fallback, kein globaler `window.onerror`-Hook.

---

## LINIE 1 — VERHINDERN

**Zustand: lückenhaft.**

### 🔴 1. Env-Gate prüft nur die URL, nicht den Key
`deploy.sh` sucht nur nach dem Supabase-**Host** im Bundle
(`grep -rq "$SUPA_HOST" dist/assets/*.js`). Fehlte NUR
`VITE_SUPABASE_PUBLISHABLE_KEY` (URL aber vorhanden), wirft
`createClient()` (`SupabaseClient.js`) exakt denselben Fehlertyp:
`throw new Error('supabaseKey is required.')` — genauso fatal wie der
heutige Ausfall, aber das Gate würde es NICHT erkennen, weil die URL
ja im Bundle steht. Verifiziert im `node_modules`-Quellcode.
**Fix-Vorschlag:** Gate um einen zweiten Check erweitern: den Wert von
`VITE_SUPABASE_PUBLISHABLE_KEY` aus `.env` lesen (z. B. die ersten
20–30 Zeichen des JWT) und ebenfalls im Bundle suchen. Am saubersten:
statt einzelner Greps ALLE als kritisch markierten `VITE_`-Variablen
aus `.env` in einer Schleife durchgehen und für jede prüfen, dass ihr
Wert im Bundle vorkommt.
**Aufwand:** klein (~15 Minuten, reine Bash-Erweiterung).

### 🔴 2. GitHub-Actions-Workflow ist ein zweiter, komplett ungegateter Build-Pfad
`.github/workflows/deploy.yml` läuft bei jedem Push auf `main` (Remote
`origin` zeigt auf ein echtes GitHub-Repo, `main` existiert dort) und
baut mit `npm run build --if-present` — **ohne jegliche `VITE_`-Secrets
im Workflow gesetzt**. Das Ergebnis wäre garantiert ein Bundle ohne
Supabase-URL/-Key, exakt der heutige Fehler, nur diesmal ganz ohne das
neue Gate (das nur in `deploy.sh` existiert). Aktuell deployt dieser
Workflow nicht direkt auf den Server (nur `upload-artifact` +
optionale DB-Migration) — er ist also noch keine akute Live-Gefahr,
aber eine tickende Falle: Er heißt "CI & Deploy", suggeriert
Automatisierung, und `DEPLOYMENT_GUIDE.md` (Zeile ~81) empfiehlt sogar
wörtlich `git push` mit dem Kommentar "Deine CI/CD sollte automatisch
deployen wenn du pushst" — das ist für DIESES Setup schlicht falsch
und könnte jemanden (auch dich selbst in einer künftigen Session) dazu
verleiten, den kaputten Artifact von Hand auf den Server zu kopieren,
oder in Zukunft einen Deploy-Step ohne Gate an diesen Workflow
anzuhängen.
**Fix-Vorschlag:** Entweder (a) den Workflow-Namen entschärfen und
einen Kommentar ergänzen "baut NUR, deployt NICHT — Produktions-Deploy
läuft ausschließlich über `./deploy.sh` auf dem Server", oder (b) den
Workflow gleich so erweitern, dass er `VITE_`-Secrets aus GitHub
Actions Secrets zieht und intern das gleiche Gate wie `deploy.sh`
fährt (mehr Aufwand, aber dann echte doppelte Absicherung). Minimum:
`DEPLOYMENT_GUIDE.md` korrigieren, die veraltete Aussage ist aktiv
irreführend.
**Aufwand:** klein (Doku-Fix) bis mittel (Workflow-Gate nachbauen).

### 🟡 3. `npm run build` prüft NIE TypeScript-Typen — auch neue, echte Fehler nicht
`package.json` → `"build": "vite build"`. Vite/esbuild transpiliert nur
und typprüft nicht. Ein `npx tsc --noEmit --project tsconfig.app.json`
zeigt aktuell 10 Fehler (nicht die von Pascal erinnerten ~162 — evtl.
seit einer früheren Aufräum-Session reduziert, nicht neu geprüft in
dieser Analyse). Entscheidend: ob 10 oder 162, KEINER davon blockiert
je einen Build oder Deploy. Ein neuer, echter Typfehler (z. B. Zugriff
auf ein nicht existierendes Property zur Laufzeit) geht in der Menge
unter und würde exakt so durchrutschen wie heute die fehlende Env.
**Fix-Vorschlag:** `deploy.sh` NICHT hart an 0 Fehler binden (die
bestehenden 10 sind vermutlich harmlos/bekannt), sondern eine
Fehler-Anzahl-Obergrenze setzen (z. B. "bricht ab, wenn tsc mehr als
15 Fehler meldet") ODER — sauberer — die aktuellen 10 Fehlerstellen
einmal fixen/dokumentieren und dann `tsc --noEmit` als hartes 0-Fehler-
Gate in `deploy.sh` aufnehmen. Reine Ratschen-Strategie: Anzahl darf
nie steigen, auch wenn sie nicht sofort auf 0 sinkt.
**Aufwand:** mittel (Baseline sauber ziehen + Gate einbauen: ~1–2 Std.,
je nachdem ob die 10 Fehler zuerst gefixt werden sollen).

### 🟢 4. `deploy/`-Ordner und `DEPLOYMENT_GUIDE.md`-Kommandos sind kein Umgehungspfad für den Frontend-Build
Der `deploy/`-Ordner (`lovable.md`, `worker-secrets.md`,
`lovable.service.yml`) betrifft ausschließlich den separaten
Collage-Worker (Docker/lovable.dev), nicht die hufiapp.de-Frontend-
Bereitstellung — kein direkter Zusammenhang zum heutigen Fehlertyp.
`hufi-deploy.sh` (Repo-Root, außerhalb `production/`) ist ein
generisches Nginx/Certbot-Setup-Skript für `*.assaon.com`-Subdomains,
baut nichts, betrifft `/var/www/hufiapps/v25` nicht.

### 🟡 5. Nichts hindert an einem klassischen Hand-Deploy außerhalb von `deploy.sh`
`deploy.sh` ist die einzige EMPFOHLENE Route, aber technisch kann
jeder mit Root-Zugriff weiterhin `npm run build && rsync -a dist/
/var/www/hufiapps/v25/` direkt im Haupt-Working-Directory ausführen
(dort liegt die `.env` ja ohnehin, das würde also sogar "zufällig"
funktionieren) — es gibt keine serverseitige Sperre, die nur
`deploy.sh` als Schreibweg zulässt. Das ist in einem Solo-Founder-
Setup ohne CI/CD nur bedingt vermeidbar, aber ein `.deploy-lock`-
Hinweis oder ein `README`-Warnhinweis direkt im `dist`-Zielordner
wäre eine günstige Erinnerung.
**Fix-Vorschlag (niedrige Priorität):** Kommentar-Datei
`/var/www/hufiapps/v25/.DEPLOYED_VIA` mit Zeitstempel + Commit-Hash,
die `deploy.sh` bei jedem Lauf schreibt — macht sichtbar (auch für dich
in künftigen Sessions), ob der letzte Stand über das Skript kam.
**Aufwand:** trivial (~10 Minuten).

---

## LINIE 2 — FRÜH FANGEN (Smoke-Test + Rollback)

**Zustand: fehlt fast komplett.**

### 🔴 6. Kein automatischer Smoke-Test in `deploy.sh` — der heutige Playwright-Check war einmalig
`deploy.sh` (Stand nach dem heutigen Fix) endet mit `rsync` und einer
Erfolgsmeldung. Es gibt KEINEN Schritt danach, der `https://hufiapp.de`
wirklich lädt und prüft, ob `#root` gefüllt ist / keine
Konsolenfehler auftreten. Der Playwright-Check von heute lief manuell,
außerhalb des Skripts, mit einem Node-Skript in einem temporären
NPX-Cache-Verzeichnis (kein fester, wiederverwendbarer Bestandteil des
Repos). Genau der Fehlertyp, der HTTP 200 zeigt aber weiß bleibt, wäre
mit einem simplen HTTP-Check (wie es aktuell einzig `hufi-status.sh`
prüft — nur `ls index.html`, keine echte Ladung) NICHT aufgefallen.
**Fix-Vorschlag:** Playwright (bereits über npx verfügbar, kein neues
Abhängigkeits-Problem) als festen Schritt NACH dem rsync in
`deploy.sh` verankern: Seite laden, prüfen `document.getElementById(
'root').innerHTML.length > 0`, keine `pageerror`-Events, kein
`console.error`. Bei Fehlschlag: automatisch Alarm (bei Bedarf auch
automatisches Rollback, siehe nächster Punkt).
**Aufwand:** mittel (~1–2 Std., inkl. Skript stabil im Repo verankern
statt Ad-hoc-npx-Verzeichnis).

### 🔴 7. Kein automatisches Rollback bei fehlgeschlagenem Deploy — obwohl 17 alte manuelle Backups zeigen, dass genau das früher gebraucht wurde
`/var/www/hufiapps/` enthält 17 händisch angelegte
`v25.backup-*`-Ordner aus früheren Sessions (z. B.
`v25.backup-before-plan-tier-deploy-20260504-0421`,
`v25.bad-hufiai-restore-20260512-1658`) — ein klares Muster: manuelle
Vorsicht war schon vorher nötig, wurde aber nie systematisiert.
`deploy.sh` (heutiger Stand) macht VOR dem `rsync --delete` KEIN
Backup des aktuell laufenden `dist/`-Standes. Schlägt der neue Smoke-
Test (Punkt 6) fehl, gibt es aktuell keinen Ein-Klick-Weg zurück zum
letzten funktionierenden Stand — man müsste manuell einen der alten
Backup-Ordner suchen und selbst zurückkopieren.
**Fix-Vorschlag:** In `deploy.sh` VOR dem `rsync --delete` automatisch
`/var/www/hufiapps/v25` nach `/var/www/hufiapps/v25.prev` sichern
(einfacher `rsync -a --delete` in einen festen "letzter guter Stand"-
Ordner, nicht immer neue Zeitstempel-Ordner, die sonst unbegrenzt
wachsen). Schlägt der Smoke-Test danach fehl: automatisch
`rsync -a --delete v25.prev/ v25/` zurückspielen + klare
Fehlermeldung statt stillem "✅ Deployment abgeschlossen".
**Aufwand:** mittel (~1 Std., inkl. Aufräumen der 17 verwaisten
Alt-Backups als Nebenprodukt).

### 🟡 8. `rsync --delete` löscht während des Transfers, nicht atomar
Rsync 3.2.7 nutzt standardmäßig `--delete-during` — alte Dateien
werden verzeichnisweise gelöscht, während neue noch geschrieben
werden. Bricht der `rsync`-Lauf mitten drin ab (Diskvoll, Netzwerk,
Strg-C), kann kurzzeitig ein inkonsistenter Mischzustand aus altem und
neuem Bundle live sein. Bei der aktuellen Deploy-Größe (Sekunden) ein
kleines, aber reales Zeitfenster.
**Fix-Vorschlag:** Auf ein "Blue-Green"-Muster umstellen — in einen
neuen Ordner (`v25.new`) rsyncen, dann per `mv`/Symlink-Swap atomar
auf `v25` umstellen. Deutlich mehr Umbau (nginx-`root` müsste auf
einen stabilen Symlink zeigen), daher niedrigere Priorität als 6/7.
**Aufwand:** mittel-groß (~2–3 Std., inkl. Nginx-Anpassung + Test).

---

## LINIE 3 — SANFT AUFFANGEN (was sieht der Nutzer im Fehlerfall?)

**Zustand: eine Lücke ist entscheidend, der Rest ist überraschend gut.**

### 🔴 9. Fehler VOR dem React-Mount werden von NICHTS aufgefangen — das war exakt der heutige Fehler
`src/integrations/supabase/client.ts` ruft `createClient(...)` auf
**Modul-Ebene** auf (Zeile 11), nicht lazy/in einer Funktion. Da dieses
Modul früh in der Import-Kette von `main.tsx` → `App.tsx` hängt, wirft
`createClient()` seinen Fehler, WÄHREND der Browser noch die
`<script type="module" src="/src/main.tsx">`-Kette aus `index.html`
aushandelt — also BEVOR `createRoot(rootElement).render(<App/>)`
überhaupt läuft. Die React-`ErrorBoundary` in `App.tsx` (Zeile 450,
`src/components/ErrorBoundary.tsx`) ist inhaltlich vorbildlich
(Deutsch, freundlich, "Erneut versuchen"/"Seite neu laden"-Buttons,
kein technischer Rohtext für Endnutzer) — sie kann aber PER DESIGN nur
Fehler fangen, die WÄHREND des React-Renderns/Lifecycles auftreten,
niemals einen synchronen Wurf während des Modul-Imports. Das ist die
Kernursache, warum heute weiß statt freundlich war, und sie besteht
UNVERÄNDERT fort — der heutige Fix hat nur den AUSLÖSER beseitigt
(fehlende Env), nicht die fehlende Auffang-Ebene für DIESE Fehlerklasse.
**Fix-Vorschlag (zwei Ebenen, beide sinnvoll):**
a) **Statisches HTML-Fallback in `index.html`:** Ein einfaches,
   inline gestyltes `<div>` im `<body>`, das VOR dem `#root`-Div steht
   ODER per CSS über `#root` liegt, mit Text wie "Hufi lädt gerade
   nicht richtig — bitte Seite neu laden" + Reload-Button, per reinem
   HTML/CSS (kein JS nötig). React entfernt es beim erfolgreichen
   Mount automatisch (`createRoot` ersetzt den Inhalt von `#root`,
   der Fallback läge außerhalb). So sieht der Nutzer bei JEDEM
   Total-Ausfall vor React (Netzwerkfehler beim Laden von main.tsx,
   Syntaxfehler im Bundle, Modul-Init-Crash wie heute) etwas
   Freundliches statt Weiß — unabhängig davon, ob JavaScript überhaupt
   ausgeführt wird.
b) **Globaler `window.addEventListener('error', ...)`-Hook** ganz am
   Anfang von `index.html` (inline `<script>`, vor dem
   `main.tsx`-Import), der bei einem uncaught error, der NICHT von
   React kommt, den obigen statischen Fallback sichtbar macht (z. B.
   `display: none` per Klasse entfernen). Ergänzt (a) um eine aktive
   Reaktion statt nur passiver Anzeige.
**Aufwand:** klein bis mittel (~1–2 Std. für beide zusammen, reines
HTML/CSS/Vanilla-JS, keine Build-Änderung nötig).

### 🟢 10. React-Render-Crashes (nach erfolgreichem Mount) sind bereits gut abgefangen
`ErrorBoundary` ist vorbildlich: Deutsch, freundlich, mit
Reset-/Reload-Buttons, versteckt technische Details hinter einem
`import.meta.env.DEV`-Schalter (Endnutzer sehen in Produktion keine
Stacktraces). Umschließt die App auf Top-Level (Zeile 450) — ein
Absturz in einer Unterseite zeigt diese Karte statt weiß. Bereits mit
Kommentar für künftige Sentry-Anbindung vorbereitet (aktuell nur
`console.error`, siehe Punkt 12).

### 🟢 11. Langsames/erreichbares-aber-zögerliches Supabase ist bereits abgesichert
`useAuth.tsx` hat einen 10-Sekunden-`safetyTimeout`, der den globalen
`loading`-State zwangsweise auf `false` setzt, falls Supabase antwortet
aber trödelt — verhindert einen unendlichen `AuthLoadingScreen`
(die Ladeanimation selbst ist übrigens schon eine gebrandete, ruhige
Komponente, kein technischer Spinner). React-Query hat zusätzlich
`retry`-Logik mit Exponential-Backoff (max. 3 Versuche, `retryDelay`
bis 30 s) UND respektiert `navigator.onLine` (kein sinnloses Retry im
Flugmodus). Insgesamt eine der robusteren Stellen der App.

### 🟡 12. Sentry ist im Frontend faktisch NICHT aktiv — Fehler-Beobachtbarkeit fehlt
`index.html` (Zeile 49–51) hat ein `<script crossorigin="anonymous"
defer></script>`-Tag OHNE `src`-Attribut — das Sentry-SDK wird also
nie geladen, `window.Sentry` bleibt `undefined`, das nachfolgende
`window.Sentry && Sentry.init(...)` läuft nie sichtbar durch (stiller
No-Op, kein Fehler, aber auch kein Monitoring). Der auskommentierte
Hook in `ErrorBoundary.tsx` (`// if (typeof window !== 'undefined' &&
(window as any).Sentry) { ... }`) bestätigt: die Anbindung war
angedacht, ist aber nie fertig verkabelt worden. Praktische Folge für
heute: Der Ausfall wurde durch Pascals eigene Beobachtung entdeckt,
nicht durch ein Monitoring-System — bei einem selteneren/subtileren
Fehler (z. B. nur bei bestimmten Browsern oder Uhrzeiten) hätte
niemand automatisch Bescheid bekommen.
**Fix-Vorschlag:** Entweder Sentry richtig verkabeln (echtes
`src="https://browser.sentry-cdn.com/.../bundle.min.js"` + DSN
ergänzen, `ErrorBoundary`-Hook aktivieren, zusätzlich einen
`window.onerror`/`unhandledrejection`-Hook für Fehler außerhalb von
React) oder — falls Sentry aktuell keine Priorität hat — den toten
Code entfernen, damit kein falsches Sicherheitsgefühl ("wir haben ja
Monitoring") entsteht.
**Aufwand:** mittel (~2–3 Std. für eine echte Sentry-Anbindung inkl.
Testing; ~10 Min., um stattdessen nur den toten Code zu entfernen).

---

## ZUSAMMENFASSUNG PRO LINIE

| Linie | Zustand |
|---|---|
| 1 — Verhindern | **Lückenhaft.** Heutiges Gate ist ein guter Anfang, prüft aber nur die URL (nicht den Key) und wird von einem zweiten, ungegateten Build-Pfad (GitHub Actions) umgangen. |
| 2 — Früh fangen | **Fehlt fast komplett.** Kein automatischer Smoke-Test, kein Rollback-Mechanismus, obwohl die Historie (17 manuelle Backup-Ordner) zeigt, dass genau das schon oft gebraucht wurde. |
| 3 — Sanft auffangen | **Eine kritische Lücke, sonst überraschend robust.** Die React-ErrorBoundary und der Auth-Timeout sind vorbildlich — aber sie greifen erst NACH dem React-Mount. Genau die Fehlerklasse von heute (Crash während des Modul-Imports, vor dem Mount) hat aktuell KEIN Auffangnetz.

## EMPFEHLUNG: DIE 4 HÄRTUNGEN MIT DEM BESTEN VERHÄLTNIS VERTRAUENS-SCHUTZ/AUFWAND

1. **🔴 #9 — Statisches HTML-Fallback in `index.html`** (klein/mittel,
   ~1–2 Std.): schließt die eine Lücke, die heute tatsächlich zum
   weißen Screen führte, und zwar dauerhaft — unabhängig davon, WAS
   künftig vor dem React-Mount schiefgeht (Env, Syntaxfehler,
   Netzwerkfehler beim Bundle-Laden). Größter Hebel für "nie wieder
   weißer Screen" pro investierter Stunde.
2. **🔴 #1 — Env-Gate um den Publishable-Key erweitern** (klein,
   ~15 Min.): schließt die konkrete Lücke im heute gebauten Schutz
   selbst, minimaler Aufwand.
3. **🔴 #7 — Automatisches Backup + Rollback in `deploy.sh`** (mittel,
   ~1 Std.): verwandelt "hoffentlich fällt's schnell auf" in "fällt
   automatisch zurück" — reduziert die Zeit eines künftigen Ausfalls
   von Stunden auf Sekunden, egal welcher Fehlertyp durchrutscht.
4. **🔴 #6 — Smoke-Test fest in `deploy.sh` verankern** (mittel,
   ~1–2 Std.): der heutige Playwright-Check war Handarbeit — als
   fester Skript-Schritt wird er zur Automatik und liefert außerdem
   den Trigger für Punkt 3 (Rollback nur sinnvoll, wenn etwas den
   Fehlschlag erkennt).

Die 🟡-Punkte (2, 3, 5, 8, 12) sind sinnvoll, aber mit spürbar
kleinerem Vertrauens-Hebel pro Aufwand — gute Kandidaten für "wenn Zeit
ist", nicht für die nächste Session zwingend.

**Nichts wurde verändert.** Diese Datei ist reine Analyse.
