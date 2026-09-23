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

<!-- HUFI_ACCOUNT_PROJECT_STANDARD_V1 -->
## HUFI Account Project Standard

These project-wide rules supplement, but do not replace, stricter project-specific instructions above.

Before substantial work:

1. Recover the current project truth before mutation.
2. Prefer local `00_START_HERE.md`, `PROJECT_MANIFEST.md`, `STATUS.md`, `DEPLOYMENT.md` and verified runtime facts for project-specific state.
3. Apply: **DISCOVER → VERIFY → REUSE → IMPLEMENT → TEST → VERIFY LIVE → DOCUMENT**.
4. Use only these status terms when describing capability state: `IDEA / PLANNED / FOUNDATION / BUILT / TESTED / STAGING / PRODUCTION / PARTIAL / BLOCKED / UNKNOWN`.
5. `NOT TESTED` is never `PASS`; `BUILT` is not `PRODUCTION`.
6. Before creating a framework, service, model, database or parallel implementation, inspect what can be reused.
7. Models/agents may assist with language, extraction, planning and implementation, but deterministic authority remains with code/policy for identity, permissions, money, billing state and destructive actions.
8. Never expose raw secrets in Git, prompts, normal documentation, memory or work evidence.
9. Before production, require appropriate rollback, tests, security checks, staging/smoke verification and post-deploy production smoke.
10. After substantial work, update durable project status so a future agent can continue without the old chat.

Public account foundation:
- `passaondigital/hufi-architecture-board/docs/00_UNIVERSAL_PROJECT_STANDARD.md`
- `passaondigital/hufi-architecture-board/docs/01_PROJECT_BOOTSTRAP.md`
- `passaondigital/hufi-architecture-board/docs/02_AGENT_RELEASE_STANDARD.md`

Authorized internal HUFI agents may additionally use the private reusable skill library:
- `passaondigital/hufi-factory/skills/`
- `passaondigital/hufi-factory/templates/PROJECT_STARTER/`

If a central source cannot be accessed, the embedded rules in this file still apply.

<!-- /HUFI_ACCOUNT_PROJECT_STANDARD_V1 -->
