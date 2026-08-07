# HufiApp Repository & Deployment Truth

**Stand:** 07.08.2026
**Auftrag:** Pascal-Entscheidung 16 — read-only Repository-Abgleich
**Methode:** Git-Metadaten (Commits/Tags/Diffs, keine Refs verändert), Dateisystem-Prüfung, Nginx-Konfiguration. Kein Merge, kein Pull, kein Checkout, kein Build, kein Deployment.

---

## Executive Summary

Es existieren real **zwei unabhängig gepflegte, vom selben Ursprung abgezweigte Checkouts** desselben GitHub-Repositories (`passaondigital/hufmanager`), die seit ihrem gemeinsamen Vorfahren `e52ac03b` (03.08.2026) **bidirektional divergiert** sind — nicht nur „hufiapp-dev ist weiter", sondern echte Divergenz in beide Richtungen. `hufiapp-dev` hat 37 eigene Commits (u. a. alle in dieser Auditserie geprüften Sicherheits-/Compliance-Fixes, Offline-Draft-System, Swipe-Workspace-Prototyp, Design-System-Primitives), die Produktionsquelle hat 1 eigenen Commit sowie **eigenständige, in `hufiapp-dev` nicht vorhandene Weiterentwicklung an Hufi-Agent/Voice** (u. a. `hufi-agent/capability-registry.ts`, umfangreiche Änderungen an `useHufiTTS.ts`, `hufi-agent/index.ts`). Erfreulich: **keine Datei existiert exklusiv nur in der Produktionsquelle** (0 Treffer bei `git diff --name-status` mit Status „nur hinzugefügt in B") — jede dort vorhandene Datei existiert auch in `hufiapp-dev`, teils mit abweichendem Inhalt (22 Dateien). Die Produktionsquelle ist damit kein Fork mit eigenständigem Unterbaum, sondern ein **geteilter, aber seit vier Tagen nicht mehr zurückgeführter Entwicklungsast**.

---

## Heutige kanonische Entscheidung (Pascal, Entscheidung 16)

**Kanonisch:** `/home/pascaladmin/hufiapp-dev`
**Eingefrorene Legacy-Deployment-Quelle (bis Abgleich abgeschlossen):** `/root/hufmanager_v25/production`

---

## Repository-Identitäten

| | A: `/home/pascaladmin/hufiapp-dev` | B: `/root/hufmanager_v25/production` |
|---|---|---|
| Git-Repo vorhanden | Ja | Ja |
| Repo-Wurzel | `/home/pascaladmin/hufiapp-dev` | `/root/hufmanager_v25/production` |
| Remote | `git@github.com:passaondigital/hufmanager.git` | identisch |
| Branch | `feature/hufi-assistant-experience-preview` | `feature/multi-beruf-verkabelung` |
| HEAD | `b5bebdedc925df08b932e79b823f2121f7b45bd2` | `660937a600d05e7f2a70e1e4fb9e6b3cb60b0316` |
| Commit-Datum HEAD | 06.08.2026 20:12 UTC | 04.08.2026 12:31 CEST — regulärer PR-Merge (`#17`) |
| `git status --short` | 3 modifiziert, 5 untracked (Doku dieser Auditserie, siehe unten) | **sauber, keine lokalen Änderungen** |
| Tags | `checkpoint/hufi-e2e-before-function-deploy` | identischer Tag-Name vorhanden (gemeinsamer Ursprung) |
| Node-Version (Laufzeit) | v22.22.2 | v22.22.2 (identisch) |
| Lockdatei | `bun.lock`, `bun.lockb`, `package-lock.json` | identisch vorhanden |
| Vite-Flavor-Logik | `APP_FLAVOR = process.env.VITE_APP_FLAVOR === "hufiapp" ? ... : "hufmanager"` | **byte-identisch** |
| `.env`-Variablennamen | `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_VAPID_PUBLIC_KEY`, `VITE_HUFI_SWIPE_WORKSPACE` (Werte nicht gelesen) | **`.env` nicht lesbar** (`-rw------- root`), auch Variablennamen nicht — sudo verlangt ein Passwort, das in dieser Sitzung nicht interaktiv eingegeben werden kann; nicht umgangen |
| Deploy-Skript | `deploy.sh`, Ziel `/var/www/hufiapps/v25/` | **byte-identisch** (`diff` ohne Ausgabe), gleiches Ziel |
| Build-Verzeichnis | `dist/` vorhanden — **eigenes Testartefakt dieser Auditserie** (`npm run build` während des Epic-Mode-Audits, Zeitstempel 06.08. 22:42, gitignored) | `dist/` vorhanden, Zeitstempel 31.07. 20:14 — älter als der letzte reale Deploy (04.08.), vermutlich Rest eines früheren manuellen Testbuilds |
| Supabase-Projekt-ID | `vnschgjxkzzwzefqlrji` | identisch |
| Migrationen | 421 SQL-Dateien | 420 SQL-Dateien |
| Edge Functions | 77 Verzeichnisse | 76 Verzeichnisse |
| Nginx-/PM2-Referenzen im Repo | `docs/VPS_INFRASTRUCTURE.md`, `scripts/hufi-status.sh`, `HUFI_TODO.md` erwähnen beides | nicht einzeln erneut geprüft, identische Dateien vorhanden |

---

## Git-Historie und Divergenz

- **Gemeinsamer Ursprung:** `e52ac03b` — „hotfix(cockpit): HufiWave im Idle-Zustand sichtbar + zentral statt inline (#15)", 03.08.2026 21:51 CEST.
- **Nur in `hufiapp-dev` (37 Commits):** u. a. alle fünf in dieser Auditserie geprüften Sicherheits-/Compliance-Fixes (`a30dc4ea` CORS/Biometrie, `68276881` TD-05-Audit, `b3785f15`/`13075211` Rechnungsversand-Autorisierung, `870a2c1c` CopeCart-Härtung), der komplette Offline-Draft-Unterbau (`src/lib/offline/audioDraftFormat.ts`, `audioDraftStore.ts`, `connectionState.ts`, `textDrafts.ts`, `HufiOfflineAudioDrafts.tsx`), der Swipe-Workspace-Prototyp, das isolierte Hufi-Design-System (`src/design-system/hufi/`), mehrere Architektur-Analysedokumente (u. a. die Zehner-Kachel-Hypothese-Analyse).
- **Nur in Produktion (1 Commit):** `256603ac fix(partner): restore default export on production branch` — ein Produktions-Hotfix, der **nie nach `hufiapp-dev` zurückgeführt wurde**.
- **Datei-Ebene (`git diff --name-status` zwischen beiden HEADs):** 46 Dateien existieren nur in `hufiapp-dev` (Status „D" aus Sicht des Diffs), **0 Dateien existieren exklusiv nur in Produktion**, 22 Dateien existieren in beiden, aber mit unterschiedlichem Inhalt.
- **Wichtige eigenständige Produktionsentwicklung** (sichtbar an den 22 abweichenden Dateien, nicht an eigenen Commits, da diese Arbeit vor dem gemeinsamen Vorfahren `e52ac03b` begann und seither in Produktion isoliert weiterlief, während `hufiapp-dev` andere Teile derselben Dateien änderte): `supabase/functions/hufi-agent/index.ts` (141 Zeilen Unterschied), `src/hooks/useHufiTTS.ts` (245 Zeilen Unterschied), `src/lib/hufi-voice-config.ts`, `src/components/voice/HufiVoiceSelector.tsx` — Hufi-Agent-/Voice-Funktionalität wurde in Produktion nach dem Abzweigpunkt eigenständig weiterentwickelt, ohne dass `hufiapp-dev` diese Weiterentwicklung erhielt.
- **`git diff --stat` Produktions-Seite gegen Merge-Base:** 30 Dateien, +3377/−107 Zeilen, inkl. `supabase/functions/hufi-agent/capability-registry.ts` (neu, 197 Zeilen) — existiert **nicht** in `hufiapp-dev`s aktuellem Dateibaum unter diesem Pfad trotz 0-„A"-Befund im direkten Tip-Diff; das bedeutet, die Datei wurde in Produktion neu angelegt **und** in `hufiapp-dev` unabhängig ebenfalls angelegt oder umbenannt — **ungeklärter Einzelfall, nicht weiter aufgelöst in dieser read-only Prüfung, gesondert zu verifizieren vor jeder Rückführung.**

---

## Produktive Deploymentquelle (belegt, nicht aus Verzeichnisnamen abgeleitet)

- **Nginx-`root` für `hufiapp.de`:** `/var/www/hufiapps/v25` (direkt aus `/etc/nginx/sites-available/hufiapp.de` gelesen), `try_files $uri $uri/ /index.html`.
- **Kein `current`-Symlink, kein atomarer Release-Mechanismus:** `/var/www/hufiapps/v25` ist ein **normales Verzeichnis** (root-eigen), `deploy.sh` überschreibt per `rsync -a --delete` direkt hinein; Backups liegen als eigene, nicht verlinkte `v25-backup-<Zeitstempel>`-Verzeichnisse daneben (5 vorhanden, älteste 31.07., neueste 04.08. 10:40).
- **Kein PM2-/systemd-Prozess für das Frontend** — korrekt, da statisch über Nginx ausgeliefert.
- **Kein Build-/Versionsmarker im Live-Artefakt** — `deploy.sh` gibt den Commit-Hash nur auf der Konsole aus, persistiert ihn nicht.
- **Deckungsgleicher Beleg für die tatsächliche Quelle:** `deploy.sh` in `/root/hufmanager_v25/production` ist byte-identisch mit dem in `hufiapp-dev`, zielt auf denselben Pfad; die Datei-Zeitstempel in `/root/hufmanager_v25/production` (u. a. `vite.config.ts`, `package.json`, `docs/`: 04.08. 10:39) fallen exakt mit dem Live-Zeitstempel von `/var/www/hufiapps/v25/index.html` (04.08. 10:40:24) zusammen. **`/root/hufmanager_v25/production` ist die tatsächlich genutzte Deploymentquelle für den letzten realen Deploy.**
- **Produktionsänderungen, die nie in Git aufgenommen wurden:** keine gefunden — `git status --short` in Produktion ist sauber.

---

## Sicherheits- und Datenrisiken

| Risiko | Einordnung |
|---|---|
| Fünf bereits geprüfte Sicherheitsfixes fehlen in der tatsächlichen Deploymentquelle | **hoch** — CORS/Correlation-ID, TD-05-Kontext, Rechnungsversand-Autorisierung, CopeCart-Härtung sind in Produktion nicht vorhanden |
| Produktions-Hotfix `256603ac` fehlt in `hufiapp-dev` | mittel — bei einer künftigen Umschaltung auf `hufiapp-dev` als Deployquelle würde dieser reale Fix ohne gezielte Übernahme verloren gehen |
| Eigenständige Hufi-Agent/Voice-Weiterentwicklung nur in Produktion | mittel–hoch, funktional — bei blinder Umschaltung auf `hufiapp-dev` würde produktiv genutzte Agent-/Voice-Logik zurückgesetzt |
| `capability-registry.ts`-Diskrepanz ungeklärt | **ungeklärter Einzelfall** — vor jeder Rückführung gezielt prüfen, nicht annehmen |
| `.env` beider Seiten nicht vollständig vergleichbar | niedrig (Secrets korrekt geschützt), aber **Variablennamen der Produktionsseite unbekannt** — vor jeder Umschaltung mit Pascal (Zugriff auf den Server mit Passwort) abzugleichen |

Kein Hinweis in dieser Prüfung auf Abweichungen an Auth/RLS-Client-Logik über die bereits bekannten fünf Fixes hinaus, an Mandantentrennung, oder an Nginx-/Service-Worker-Konfiguration selbst (Nginx-Regeln der beiden `hufiapp.de`/`app.hufmanager.de`-Vhosts wurden in einer früheren Sitzung dieser Auditserie bereits vollständig gelesen und sind Server-Konfiguration, nicht Teil des Repositorys).

---

## Übernahmematrix

| Unterschied | Klassifikation | Begründung |
|---|---|---|
| 5 Sicherheits-/Compliance-Fixes (nur in hufiapp-dev) | **1 — muss übernommen werden** | bereits fachlich geprüft, Tests grün, reines Nachziehen in Produktion nötig |
| Offline-Draft-Unterbau (nur in hufiapp-dev) | 1 — sollte übernommen werden | ergänzt bestehende Offline-Infrastruktur, kein Konflikt erkennbar |
| Swipe-Workspace-Prototyp (nur in hufiapp-dev) | 6 — ungeklärt | Pascal-Entscheidung MARKET-108/106 zuerst nötig, siehe Master Audit |
| Design-System-Primitives (nur in hufiapp-dev) | 1 — kann übernommen werden | isoliert, keine bestehende Fläche verändert laut eigener Doku |
| Produktions-Hotfix `256603ac` (nur in Produktion) | **1 — muss nach hufiapp-dev übernommen werden** | realer Fix, sonst Regression bei Umschaltung |
| Hufi-Agent/Voice-Weiterentwicklung (nur in Produktion) | **1 — muss nach hufiapp-dev übernommen werden**, sorgfältig | funktional aktiv genutzt, umfangreich (141+245+Nebenzeilen) |
| `capability-registry.ts`-Diskrepanz | 6 — ungeklärt | vor jeder Aktion gezielt einzeln prüfen |
| `dist/`-Verzeichnisse in beiden Repos | 4 — generiertes Build-Artefakt | niemals übernehmen, gitignored, kein Bestandteil dieser Bewertung |
| `.env`-Inhalte | 5 — Secret/Laufzeitdaten | niemals übernehmen oder ausgeben |
| CLAUDE.md-Abweichungen (21 Zeilen) | 2 — server-/betriebsspezifisch, teils veraltet | Produktionsversion nennt ältere „Bekannte Fallen"; nach Umschaltung hufiapp-devs aktuelle Version maßgeblich |
| `docs/ROADMAP.md` (30 Zeilen nur in Produktion entfernt) | 6 — ungeklärt | redaktionelle Differenz, nicht sicherheitsrelevant, nicht einzeln nachverfolgt |

---

## Ziel-Deploymentmodell (Plan, nicht implementiert)

1. `hufiapp-dev` bleibt einzige kanonische Quellcodebasis.
2. Vor jeder erneuten produktiven Nutzung: gezielte, einzeln geprüfte Rückführung der zwei „muss übernommen werden"-Produktionsänderungen (`256603ac`, Hufi-Agent/Voice-Weiterentwicklung) nach `hufiapp-dev` — als eigene, kleine, separat testbare Commits, nicht als blinder Merge.
3. Builds entstehen reproduzierbar aus `hufiapp-dev` mit explizit gesetztem `VITE_APP_FLAVOR=hufiapp` (BUILD-001) und einer im Build sichtbaren Kennzeichnung (Flavor, Commit, Buildzeit, Zieldomain — bereits als Akzeptanzkriterium in BUILD-001 vorgesehen).
4. Releases wandern künftig in ein unveränderliches, zeitgestempeltes Verzeichnis (Muster bereits vorhanden: `v25-backup-<Zeitstempel>`), das eigentliche Serviceverzeichnis wird ein `current`-Symlink darauf — Nginx-`root` zeigt auf den Symlink, nie direkt auf ein Arbeitsrepository.
5. Rollback = Symlink auf vorheriges Release-Verzeichnis zurücksetzen, kein Dateiüberschreiben mehr nötig.
6. Jedes Release erhält eine sichtbare `BUILD_INFO`-Datei (Commit-Hash, Flavor, Buildzeit) im ausgelieferten Verzeichnis.
7. `/root/hufmanager_v25/production` wird nach vollständigem, geprüftem Abgleich stillgelegt oder zu einem reinen, nicht mehr bearbeiteten Archiv erklärt — Entscheidung liegt bei Pascal, nicht vorweggenommen.

## Sichere Umschaltreihenfolge (Vorschlag, nicht ausgeführt)

1. `256603ac` gezielt nach `hufiapp-dev` cherry-picken, lokal testen.
2. Hufi-Agent/Voice-Differenz einzeln, Datei für Datei, mit Pascal durchgehen (kein blinder Merge wegen Umfang).
3. `capability-registry.ts`-Diskrepanz auflösen.
4. Ersten reproduzierbaren Build aus `hufiapp-dev` mit `VITE_APP_FLAVOR=hufiapp` lokal erzeugen, gegen die Akzeptanzkriterien aus BUILD-001 prüfen.
5. Symlink-Release-Struktur unter `/var/www/hufiapps/` einführen (additiv, altes `v25`-Verzeichnis bleibt als Fallback erhalten).
6. Ersten Deploy aus `hufiapp-dev` in ein neues, isoliertes Release-Verzeichnis fahren — **nicht** direkt auf `v25` — und separat verifizieren, bevor der Symlink umgehängt wird.
7. Erst danach `/root/hufmanager_v25/production` als Deployquelle endgültig außer Betrieb nehmen.

## Rollbackplan

Bis Schritt 5 oben umgesetzt ist: bestehender Mechanismus (`./deploy.sh --rollback`, letztes `v25-backup-*`-Verzeichnis) bleibt unverändert nutzbar. Nach Einführung der Symlink-Struktur: Rollback = Symlink-Zeiger auf vorheriges Release-Verzeichnis zurücksetzen, keine Dateikopie nötig.

## Offene Pascal-Entscheidungen

1. Wer übernimmt die Cherry-Pick-/Rückführungsarbeit (`256603ac`, Hufi-Agent/Voice) — Codex, mit welcher Priorität relativ zu MARKET-101–109?
2. Wird `/root/hufmanager_v25/production` stillgelegt, archiviert oder vorerst als Notfall-Fallback belassen?
3. Zugriff auf `.env` der Produktionsquelle — soll Pascal die Variablennamen (nicht Werte) manuell bereitstellen, um Abschnitt „Übernahmematrix" vollständig abzuschließen?
4. Wird die Symlink-/Release-Struktur (Zielarchitektur Punkt 4) als eigener Codex-Task freigegeben, oder wartet das bis nach den bestehenden zehn Market-Ready-Paketen?

## Eindeutige Deploy-Freigabebedingungen

Kein Deployment jeglicher Art (auch kein isolierter Edge-Function-Deploy) erfolgt, bevor:

- dieses Dokument von Pascal gelesen und bestätigt wurde,
- die zwei „muss übernommen werden"-Punkte der Übernahmematrix in `hufiapp-dev` nachgezogen sind,
- ein reproduzierbarer, korrekt geflaggter Build aus `hufiapp-dev` lokal verifiziert wurde,
- Pascal die konkrete Zieladresse des nächsten Deploys (weiterhin `/var/www/hufiapps/v25` oder neue Release-Struktur) ausdrücklich bestätigt hat.
