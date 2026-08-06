# Hufi — UX-Leitlinien

Stand: 2026-08-06. Ergänzt `docs/design/HUFI_DESIGN_SYSTEM.md` (visuelle
Tokens/Komponenten) um verhaltensbezogene UX-Prinzipien aus Pascals
Master-Prompt. Bei Widerspruch zwischen beiden Dokumenten in
Detailfragen zu Komponenten gilt das Designsystem als Quelle für
Umsetzung, dieses Dokument für Verhaltens-/Interaktionsprinzipien.

## Grundsatz

Jede Entscheidung muss diese Frage beantworten können:

> Kann das für den Benutzer einfacher, intelligenter und hochwertiger werden?

Falls ja: verbessern. Falls die Antwort unklar ist: nicht raten, sondern
mit Pascal klären (siehe `CLAUDE.md`: "Bei mehr als 3 geänderten Dateien:
erst Plan zeigen, dann bauen").

## Verbindliche Prinzipien

1. **Selbsterklärend.** Keine Funktion, die eine Bedienungsanleitung
   braucht. Wenn ein Screen einen Hilfetext braucht, um verständlich zu
   sein, ist der Screen das eigentliche Problem.
2. **Maximal zwei Klicks** für alltägliche Handlungen (Termin ansehen,
   Kunde finden, Pferdeakte öffnen). Ausnahmen (Bestätigungsdialoge bei
   kritischen Aktionen, siehe Designsystem Abschnitt G) sind bewusste
   Sicherheits-Reibung, keine UX-Schwäche.
3. **Unnötige Entscheidungen vermeiden.** Jede zusätzliche Wahlmöglichkeit
   ist eine potenzielle Denkpause. Beispiel: die heutige Rollenwahl beim
   Login (siehe `docs/AUTHENTICATION.md`) ist eine Entscheidung, die der
   Nutzer nicht treffen sollte, wenn Hufi sie automatisch ableiten kann.
4. **Automatisch statt manuell, wo vertretbar.** Aber: automatisch ≠
   ungefragt bei folgenreichen Aktionen — siehe Hufis Bestätigungsregeln
   in `pascal-brain/HUFI_ECOSYSTEM_IDENTITY.md` Abschnitt 17 ("je größer
   die Auswirkung, desto deutlicher Vorschau und Bestätigung").
5. **Fehler verhindern statt nur melden.** Validierung, Vorschau und
   Bestätigung vor irreversiblen Aktionen — nicht erst eine Fehlermeldung
   danach.
6. **Logisch nachvollziehbar.** Ein Nutzer, der eine Aktion einmal
   verstanden hat, muss sie beim nächsten Mal ohne Nachdenken wiederholen
   können. Inkonsistente Muster zwischen Rollen/Workspaces (siehe
   `docs/architecture/HUFI_WORKSPACE_INFORMATION_ARCHITECTURE_ANALYSIS.md`
   Abschnitt 6 zu Duplikaten mit unterschiedlichem Verhalten) widersprechen
   diesem Prinzip und sind aktive technische Schuld, kein Stilmittel.
7. **Kein "Wo muss ich jetzt klicken?"** Wenn eine sinnvolle nächste
   Handlung existiert, zeigt Hufi sie proaktiv an (siehe
   `pascal-brain/HUFI_ECOSYSTEM_IDENTITY.md` Abschnitt 16), statt dass der
   Nutzer sie suchen muss.

## Designniveau-Referenz

Orientierung an Apple, Google, Notion, Linear, Stripe — **Eigenschaften
übernehmen, nicht kopieren**: ruhig, hochwertig, klar, modern,
professionell, schnell, intelligent, vertrauenswürdig. Konkrete Umsetzung
(Farben, Typografie, Abstände, Komponenten) steht in
`docs/design/HUFI_DESIGN_SYSTEM.md` — dieses Dokument wiederholt die
Tokens nicht.

## Bewertungsraster für neue Features

Vor jeder neuen Funktion prüfen:
- Braucht sie mehr als zwei Klicks im Regelfall? Wenn ja: warum, und ist
  das gerechtfertigt (Sicherheit/Bestätigung) oder vermeidbare Komplexität?
- Verlangt sie vom Nutzer eine Entscheidung, die Hufi auch automatisch
  ableiten könnte?
- Ist sie in Light und Dark Mode gleichwertig nutzbar (siehe Designsystem
  Abschnitt C)?
- Ist sie auf Mobile genauso klar wie auf Desktop?
- Würde sie bei einem Nutzer mit mehreren Rollen (Mehrfachrolle, siehe
  `docs/AUTHENTICATION.md`) zu Verwirrung führen?

## Governance

Dieses Dokument wird nicht bei jeder kleinen UI-Änderung aktualisiert,
sondern wenn sich ein grundsätzliches UX-Prinzip ändert. Einzelfall-
Entscheidungen gehören in Commit-Nachrichten oder Feature-spezifische
Dokumentation, nicht hierher.
