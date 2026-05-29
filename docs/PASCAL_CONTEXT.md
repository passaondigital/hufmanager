# Pascal Context

> Status: internes Arbeitsdokument, nicht für Marketing.
> Quelle: Gesprächsexporte und Projektkontext, Stand Mai 2026.
> Unsichere Aussagen sind mit **[?]** markiert.
>
> ⚠️ **Hinweis:** Der ursprünglich vorgesehene "System Context Export"
> wurde nicht angeliefert (Platzhalter im Prompt blieb leer). Diese
> Datei stützt sich daher nur auf abgesicherte Inhalte aus
> `VISION.md`, `PROJECT_MAP.md`, früheren Pascal-Prompts in dieser
> Session und dem Memory. Wenn Pascal den Export nachreicht, wird die
> Datei dichter — bis dahin nichts erfinden.

## Zweck dieser Datei

- Gemeinsame Grundlage für jede Person und jeden Agenten, der mit
  Pascal oder an Pascals Projekten arbeitet.
- Verhindert widersprüchliche Annahmen über Rolle, Werte, Prioritäten.
- Hält Agenten davon ab, persönliche oder strategisch sensible
  Inhalte ungefragt in Repo-Doku zu schreiben.
- Wird nur **mit Pascal zusammen** ergänzt.

## Rolle

- **Pascal Schmid** — Hufpfleger, Coach [?] und Pferdeunternehmer im
  DACH-Raum.
- Aktiv im Stall (Barhufpflege) seit ca. 20 Jahren.
- Kontakt für das Projekt: `barhufserviceschmid@gmail.com`.
- Trägt mehrere Rollen gleichzeitig:
  - **Operativer Praktiker** — arbeitet weiter am Pferd, kennt die
    Stallrealität aus erster Hand.
  - **Gründer** — baut Barhufserviceschmid als modernes, faires
    Hufpflege-Unternehmen auf.
  - **Systembauer** — entwickelt parallel ein digitales Ökosystem für
    die Pferdebranche (Hufi-Familie, SmartHoof [?], PASSAON [?]).
  - **Produkt-Owner** — entscheidet Priorität, Scope und Tonalität
    der HufiApp und der angrenzenden Marken.
  - **Branchenübersetzer** — vermittelt zwischen Stall und
    Technologie.
- Will *nicht* als klassischer Influencer auftreten, sondern als
  Pferdeunternehmer, Systembauer, Branchenentwickler und
  Praxis-Technologe wahrgenommen werden.
- Mission, mit eigenen Worten: **Handwerk, Haltung und Hightech
  verbinden.** [?] (wörtlich aus früherem Prompt — Pascal bitte
  bestätigen, ob das die fixierte Außenformulierung ist)

## Arbeitsweise

- **Visuell** — denkt in Karten, Strukturen, Bildern; Listen und
  Topologien helfen mehr als lange Textblöcke.
- **Geräteübergreifend** — Handy, Tablet, Chromebook, PC werden
  abwechselnd genutzt. Doku muss auf allen lesbar sein.
- **Mehrere Tools parallel** — ChatGPT, Claude.ai, Claude Code,
  Gemini CLI, Perplexity, Terminal, VPS, Markdown-Dateien,
  Memory-Systeme.
- **Schnelle Ideen** — produktiver Ideenfluss; Kontextverlust und
  Feature-Strudel sind die größeren Gefahren als zu wenig Vision.
- **Druck und Geschwindigkeit** — arbeitet oft im Stall- oder
  Kundenbetrieb parallel zur Software-Arbeit.
- **Braucht ein klares externes Gehirn** — genau das, was Hufi
  langfristig leisten soll, ist auch sein eigener Bedarf: ein
  zentrales, geräteübergreifendes Kontextsystem, das nichts vergisst.

## Denkweise

- **Unternehmerisch** — Cashflow und Tragfähigkeit gehen vor
  Visionsexplosion.
- **Systemisch** — denkt in Beziehungen, Topologien, Prozessen, nicht
  in Einzel-Features.
- **Menschlich** — sucht Substanz, klare Worte, ehrliche Nutzen-
  Argumentation; keine Inszenierung.
- **Strategie vor Taktik** — solange Stabilität trägt. Wenn Stabilität
  wackelt, kommt Umsetzung vor Strategie.

## Risiken (aus Pascals Sicht, nicht Architektur)

- **Kontextverlust** über viele parallele Tools, Geräte und
  Konversationen.
- **Feature-Strudel** — zu viele Ideen, zu wenig konsequente Umsetzung.
- **Vermarktungsfalle** — Hufi als angstmachende Super-KI darzustellen,
  obwohl Pascal das ausdrücklich nicht will.
- **Doppel-Codebase-Falle** — eine zweite HufManager-Codebase parallel
  zu HufiApp; bewusst nicht-Ziel.
- **Stall- vs. Code-Zeit-Konflikt** — operative Praxis und
  Software-Arbeit konkurrieren um dieselben Stunden.
- **Verschuldung an der Vision** — Geld oder Energie in das
  Big-Picture stecken, bevor das Cashflow-Fundament trägt. Bewusstes
  Nicht-Ziel.

## Projekt-Ökosystem

> Detaillierte Topologie: `PROJECT_MAP.md`. Hier nur die kurze,
> konsistente Einordnung aus Pascals Sicht.

- **Pascal Schmid** — Person, Owner aller Marken.
- **Barhufserviceschmid** — operative Praxis. Cashflow, Praxislabor;
  operatives Geschäft, das andere Marken finanziert und mit echten
  Anforderungen speist.
- **Hufi / HufiApp / HufManager** — *eine* Codebase, zwei Markennamen.
  HufiApp ist die aktuelle Produktebene unter `hufiapp.de`. HufManager
  ist Ursprung und Legacy-Name; `hufmanager.de`-Subdomains werden als
  Aliase weiterbedient. Kein zweites HufManager-Repo.
- **HufCamPro** — separate Foto-PWA, live unter `hufcampro.de`.
  Eigener Build, eigenes Deploy.
- **HufiVoice** — live unter `hufivoice.assaon.com`. Inhalt im Detail
  [?] *muss verifiziert werden*.
- **HufiAI** — Domain `hufiai.de` ist live mit eigenem Build. Inhalt
  und Zweck [?] *müssen verifiziert werden*. Nicht zu verwechseln mit
  der Cloud-KI-Anbindung über die Supabase Edge Function.
- **SmartHoof** — Innovations- und Produktmarke [?]. Phase und
  Beziehung zu Hufi *müssen ergänzt werden*.
- **PASSAON / Assaon** — Plattform-Layer unter `assaon.com`. Beziehung
  zu Hufi (parallel? übergeordnet? Werkstatt-Modul?) *muss ergänzt
  werden*.
- **MyHorseDocs** — taucht in keiner aktuell verfügbaren Quelle auf
  (Repo, VPS, Memory). Existenz / Status [?] *muss geklärt werden*.

## Entscheidungsprinzipien

In dieser Reihenfolge:

1. **Stabilität vor Feature-Flut.**
2. **Pferdewohl vor Plattform-Eitelkeit.**
3. **Cashflow vor Visions-Explosion** — Barhufserviceschmid trägt das
   Geschäft, nicht Spekulation auf Hufi-Zukunft.
4. **DSGVO / EU AI Act / Legal Safety vor Autonomie** [?] — keine
   smarten Shortcuts, die in eine rechtliche Grauzone führen.
5. **Mensch entscheidet, KI unterstützt** — sensible Aktionen werden
   bestätigt, nicht autonom ausgeführt.
6. **Erst nutzbar, dann intelligent, dann proaktiv.**
7. **Keine Angstkommunikation gegenüber der Branche.** Hufi wird nicht
   als Super-KI vermarktet, sondern als Ruhe, Klarheit, Sicherheit,
   Zeitgewinn, Struktur, Entlastung.
8. **Recovery vor Vision** — wenn ein nutzerkritischer Bug offen ist,
   ist keine Architekturdiskussion zulässig.
9. **Kein `git push`, kein Schema-Change, keine Secret-Ausgabe** ohne
   explizite Freigabe.

## Aktuelle operative Priorität

In genau dieser Reihenfolge:

1. **Bestehende zahlende HufManager- und Hufi-Nutzer stabilisieren.**
2. **Hufi für diese Nutzer im Alltag nutzbar machen** — Lead-/
   Anfragen-Flow, Mobile/PWA, Routing über die Legacy-Domains.
3. **Vertrauen zurückholen** — sichtbare Verbesserungen, klare
   Kommunikation, keine kaputten Releases.
4. **Keine neuen Großfeatures bauen**, solange P0/P1 aus
   `ROADMAP.md` nicht abgearbeitet sind.

## Was Pascal von AI-Agenten braucht

- **Direkt** — keine Höflichkeits-Absätze, keine
  Selbstverwaltung ("Ich werde jetzt …").
- **Strukturiert** — Listen, Tabellen, klare Überschriften.
- **Priorisiert** — sag, was P0 ist, bevor Optionen aufmachen.
- **Mobile-tauglich** — kurze Listen schlagen Textwände.
- **Unsicherheiten klar markieren** — `[?]`, "muss verifiziert werden",
  "Memory sagt X, Code sagt Y".
- **Vor Dateiänderungen Scope nennen** — "ich ändere Datei A an Stelle
  B", nicht stillschweigend losschreiben.
- **Kleine, klar benannte Commits** — ein Thema pro Commit.
- **Build vor Commit, wenn Code geändert wurde.**
- **Recovery-Mindset** — Bug-Fixes immer vor Refactor / Vision.
- **Aktuelle Lage zuerst sichten** (`git status`, `git log`), bevor
  Annahmen aus Memory übernommen werden.

## Was Agenten NICHT tun sollen

- **Kein `git push` ohne explizite Freigabe.**
- **Kein Deploy ohne Freigabe.**
- **Keine Supabase-Schema-Migrations** während Recovery-Phasen.
- **Keine Secrets ausgeben** — keine API-Keys, keine `.env`-Inhalte,
  keine Tailscale-IPs, keine Service-Role-Keys, keine SSH-Keys.
- **Kein Commit** von `supabase/.temp/cli-latest` (generierter
  CLI-Versionsmarker).
- **Keine erfundenen Brand-Beziehungen oder Marken-Inhalte** —
  unsichere Punkte sind als `[?]` zu markieren, nicht als Fakt zu
  schreiben.
- **Keine privaten oder finanziellen Details** in Repo-Doku
  (Umsatzzahlen, Kundennamen, Privatadressen, etc.).
- **Keine ungebetene Architektur-Diskussion**, wenn ein P0-Punkt offen
  ist.
- **Keine Massen-Replace-Aktionen** ohne expliziten Auftrag und
  vorherige Klassifikation.
- **Keine eigenmächtigen Routing-/`App.tsx`-Änderungen** außerhalb
  eines klar formulierten Fix-Auftrags.
- **Keine Marketing-Sprache** ("revolutionär", "smart", "next-gen",
  "Game-Changer").
- **Keine Höflichkeits-Floskeln** und keine narrativen
  Selbstkommentare über die eigene Arbeit.

## Offene Ergänzungen durch Pascal

Diese Punkte werden ausschließlich von Pascal beantwortet, nicht von
Agenten geraten:

- [ ] **SmartHoof** — Aktuelle Phase? Beziehung zu Hufi und
      Barhufserviceschmid? Eigene Marke, Modul oder Sub-Brand?
- [ ] **PASSAON / Assaon / Hufi** — Wie genau hängen die drei
      zusammen? Ist Assaon übergeordnet, parallel oder ein eigener
      Werkstatt-Layer?
- [ ] **MyHorseDocs** — Existiert das? Geplant? Oder soll der Begriff
      ganz aus den Doku-Dateien verschwinden?
- [ ] **HufiAI-Inhalt** — Was läuft tatsächlich unter `hufiai.de`?
- [ ] **HufiVoice-Inhalt** — Was genau steht hinter
      `hufivoice.assaon.com`?
- [ ] **Aktive vs. geparkte vs. archivierte Projekte** — welche
      Marken / Subprojekte sind heute wirklich aktiv?
- [ ] **Was darf in Repo-Doku stehen?** — Welche Sätze, Zahlen,
      Beziehungen sind öffentlich okay, welche nur intern?
- [ ] **Was gehört nicht ins Repo?** — Konkrete No-Gos für Agenten.
- [ ] **Mission-Formulierung** — ist "Handwerk, Haltung und Hightech
      verbinden" die fixierte Außenformulierung?
- [ ] **Persönliche Arbeitsrhythmen** — Wann ist Stall, wann ist Code?
- [ ] **Mitwirkende** — Mitarbeitende, Familie, Partner mit Rolle?
- [ ] **Beta-Tester** — wichtigste Kunden / Stallbetreiber für Hufi?

## Wie diese Datei lebt

- Wird nur **mit Pascal zusammen** ergänzt.
- Ein Agent darf Vorschläge machen ("ich vermute X, weil Y"), aber
  niemals als Fakt eintragen.
- Sobald ein Punkt aus *Offene Ergänzungen* geklärt ist, wandert er
  in den passenden Abschnitt oben und wird in der Liste abgehakt.
- Wenn diese Datei wesentlich anwächst, wird sie geteilt — z. B. in
  `PASCAL_CONTEXT.md` (öffentliche Orientierung) plus `AGENTS.md`
  (operative Agenten-Regeln) plus internes Memory (vertrauliche
  Strategie).
