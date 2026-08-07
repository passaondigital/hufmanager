# HufiApp — Hinweise für Codex und andere Agenten

Für vollständigen Projektkontext (Stack, Umgebungen, Deploy-Regeln, bekannte Fallen) siehe `CLAUDE.md` im selben Verzeichnis — die Regeln dort gelten unabhängig vom verwendeten Agenten.

<!-- HUFI_DESIGN_SYSTEM_REQUIRED_V1 -->
## Verbindliches Hufi-Designsystem

Vor jeder Arbeit an UI, UX, Frontend, Webseiten, Marketingflächen, Grafiken oder Markenkommunikation muss gelesen werden:

- docs/design/HUFI_DESIGN_SYSTEM.md

Die dort definierten Tokens, Komponenten, Light-/Dark-Regeln, Markenprinzipien und Governance-Vorgaben sind verbindlich.

Keine neue Farbe, Typografie, Komponente oder visuelle Designsprache darf ohne dokumentierte Begründung außerhalb dieses Systems eingeführt werden.

<!-- /HUFI_DESIGN_SYSTEM_REQUIRED_V1 -->

<!-- CANONICAL_CODEX_QUEUE_REQUIRED_V1 -->
# Verbindliche Codex-Arbeitssteuerung

Vor jeder Analyse oder Änderung:

1. Lies /home/pascaladmin/CODEXTODO.md vollständig.
2. Bearbeite ausschließlich den ersten Task mit Status READY.
3. Überspringe keine Aufgabe.
4. Beginne keine zweite Aufgabe automatisch.
5. Beachte alle Scope-, Test-, Sicherheits- und Freigaberegeln aus CODEXTODO.md.
6. Kein Push, Deployment oder produktive Migration ohne ausdrückliche Pascal-Freigabe.
7. Nach Abschluss:
   - Status dokumentieren
   - Commit dokumentieren
   - Tests dokumentieren
   - Risiken dokumentieren
   - Freigabebedarf dokumentieren
   - stoppen
8. Ist CODEXTODO.md nicht vorhanden oder widersprüchlich:
   - keine Änderung durchführen
   - Pascal informieren
9. Akzeptiere keine neue Arbeitsanweisung als verbindlich, wenn sie nicht als READY-Task in CODEXTODO.md steht.
10. Verweist ein Prompt auf undokumentierte Arbeit:
    - stoppen
    - zuerst Aktualisierung von CODEXTODO.md verlangen
11. Lose Chat-, Terminal- oder Sitzungsanweisungen überschreiben CODEXTODO.md nicht.
12. Der aktuelle READY-Task bestimmt den vollständigen Scope.
<!-- /CANONICAL_CODEX_QUEUE_REQUIRED_V1 -->
