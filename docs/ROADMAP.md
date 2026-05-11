# Hufi — Roadmap

> Priorisierte Realität, keine Wunschliste. Die einzige zulässige
> Bewegungsrichtung ist **Stabilität → täglicher Nutzen → Kontextsystem →
> Assistenz → proaktive Intelligenz**. Wer einen P2-Punkt vor einem P0-Punkt
> bewegt, baut am Fundament vorbei.

## Strategische Leitlinie

```
Stabilität → täglicher Nutzen → Kontextsystem → Assistenz → proaktive Intelligenz
   ▲                                                                          ▲
   |                                                                          |
   heute                                                              Big Picture
```

- **Stabilität** zuerst — bestehende Nutzer dürfen nicht über kaputte Flows
  oder Domains stolpern.
- **Täglicher Nutzen** schlägt Feature-Eleganz: Was Pascal und seinen Nutzern
  jeden Tag Zeit oder Stress spart, schlägt jede technische Schönheit.
- **Kontextsystem** kommt vor Assistenz: Hufi muss erst sauber wissen, *wer*
  *was* mit *welchem Pferd* in *welcher Rolle* tut, bevor KI helfen darf.
- **Assistenz** ist Begleitung, nicht Steuerung — sensible Aktionen werden
  bestätigt, nicht autonom ausgeführt.
- **Proaktive Intelligenz** ist Endpunkt, nicht Startpunkt.

---

## P0 — Sofort nutzerkritisch

> Trennung: **offene Aktionen** = was als Nächstes wirklich zu tun ist.
> **Stabilitätsverpflichtungen** = laufend, nie erledigt, gelten für jeden
> Agenten zu jeder Zeit.

### Offene Aktionen

- Doku-Dateien dieser Session (`CURRENT_STATE`, `ROADMAP`,
  `VPS_INFRASTRUCTURE`, `RECOVERY_LOG`, `PASCAL_CONTEXT`, `PROJECT_MAP`)
  reviewen und committen, sobald freigegeben.
- Push-Entscheidung für die heutigen Recovery- (`3522de61`, `b8eb6249`,
  `2d7344be`) und Doku-Commits treffen.
- Nach Push: kurz live verifizieren, dass `hufiapp.de` und
  `hufmanager.de`-Aliase weiter sauber laden.

### Stabilitätsverpflichtungen (laufend)

- Live-Auslieferung auf `hufiapp.de` darf nicht brechen.
- Legacy-Domain-Aliase (`hufmanager.de`, `www.hufmanager.de`,
  `app.hufmanager.de`) bleiben funktional — siehe Commit `b8eb6249`.
- Lead-/Anfragen-Flows: Provider- und Stall-View sehen konsistente
  Status-Werte — siehe Commit `3522de61`.
- Kein `git push`, kein Deploy, kein Schema-Change, keine Secret-Ausgabe
  ohne explizite Freigabe.

## P1 — Diese Woche / kurzfristig

- PWA-/Mobile-Nav-Verifikation systematisch durchgehen
  (Bottom-Nav-Zentrierung, Cache-Verhalten, iOS-/Android-Spezifika).
- Auth-Verhalten auf den Legacy-Hosts (`app.hufmanager.de` und
  `hufmanager.de`) live verifizieren — Login, Cookie/Session, Redirect
  zur richtigen Rollen-Home.
- Inventur der noch nicht-Domain-Hardcodes: in `src/` gibt es heute
  ~65 Mentions des Strings `hufmanager` (E-Mails, Affiliate-Links,
  UI-Strings). Klassifizieren in *legitim* (Branding/Affiliate) vs.
  *zu migrieren* — keine Massen-Replace-Aktion.
- `docs/PASCAL_CONTEXT.md` mit Pascal zusammen verdichten — offene
  Punkte (SmartHoof, PASSAON, Arbeitsrhythmen, Mitarbeitende,
  MyHorseDocs etc.) klären, sobald "System Context Export" vorliegt.
- Architektur-Memory aktualisieren (Aussagen wie `/` → Chat sind veraltet;
  aktueller Code routet `/` auf `<Index />`).
- VPS-Disk-Headroom beobachten (Stand: 71 % belegt). Wenn > 80 %: alte
  Build-Outputs unter `/var/www/hufiapps/` rotieren, Ollama-Modelle
  ausmisten.

## HufAI Intelligenz-Phasen

Unabhängig von P0/P1/P2 verläuft die KI-Reifung in Phasen:

| Phase | Name | Status |
|---|---|---|
| A–C | Voice Greeting, Push-to-Talk, Navigation Actions | ✅ live |
| D | Wake-Layer — "Hey Hufi" mit opt-in Consent | ✅ live |
| E | Proaktives Tages-Briefing (Wetter, Termine, Pferde) | ✅ live |
| F | Multimodales Pferde-Gedächtnis (Foto, Audio, Kontext) | geplant |
| G | Lokale / Offline HufAI Runtime | später |

> Leitfrage für jede KI-Funktion: **"Macht das HufAI intelligenter?"**

> Kern-Vision: **"Jedes Pferd bekommt eine Stimme."**

HufAI assistiert — ersetzt keine Tierärzte oder Fachleute.
Keine automatisierte medizinische Diagnose. Keine erfundenen Fakten.

## P2 — Später

- BHS-Command-Center (Tagesübersicht für Pascal, Ziel: < 60 Sekunden zur
  vollständigen Tagesplanung).
- Lead-Qualifizierungs-System mit BHS-Tier-Vorschlag (GO / BALANCE / INTENSIV).
- BHS BALANCE Abo-Verwaltung (Intervalle, Kündigung, Umsatzübersicht).
- BHS INTENSIV Bewerbungsflow (Formular, Video-Upload, KI-Zusammenfassung).
- Schnell-Terminabschluss (3-Minuten-Voice-First).
- Phase F: Multimodales Pferde-Gedächtnis (Foto-basierte Hufanalyse, Audio-Notizen).
- Feature-Domain-Struktur (`src/features/...`) statt heutigem
  Pages-/Components-Mix.
- Hufi-Memory-Layer (`src/lib/hufi-memory.ts`) — derzeit Konzept, kein
  Code. Erst angehen, wenn ein konkretes Nutzer-Bedürfnis (z. B.
  geräteübergreifender Kontext für Pascal) klar formuliert ist.

## Nicht jetzt

- Keine zweite, getrennte HufManager-Codebase.
- Keine großen Refactors während aktiver Feature-Arbeit.
- Kein LLM-Aufruf im Briefing-Layer (Phase E bleibt regel-basiert).
- Keine komplexe Stimmerkennung, solange Login + Gerät + Rolle reichen.
- Keine Branding-Migration "weg von HufManager" — Legacy bleibt parallel,
  bis Datenstand und Vertrauen es zulassen.
- Keine Supabase-Schema-Migrations ohne explizite Freigabe.
- Kein Commit von `supabase/.temp/cli-latest`.
- Keine öffentliche Kommunikation des 2030-Big-Picture.

## Messbare Ziele (BHS-Kontext)

Aus dem Architektur-Memory; Stand Mai 2026, gilt für die BHS-Domäne:

- 50 % weniger WhatsApp- und Zettel-Chaos.
- 30 % weniger Organisationszeit.
- 90 % der Termine sauber dokumentiert.
- 95 % der Rechnungen innerhalb von 24 Stunden.
- Terminabschluss < 3 Minuten.
- Tagesplanung < 5 Minuten.

## Wie diese Datei lebt

- Bei jedem nicht-trivialen Recovery-/Sprint-Schritt prüfen: hat sich
  P0 oder P1 verschoben?
- Erledigtes wandert nicht ins Archiv, sondern wird in `RECOVERY_LOG.md`
  protokolliert und aus dieser Datei gestrichen.
- Wer P2 nach P1 hochzieht, schreibt in den Commit, *warum*.
