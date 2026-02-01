Collage Worker
================

Kurzanleitung

Diesen Worker kannst du lokal oder im CI verwenden, um `collage_jobs` zu verarbeiten und Collagen zu erzeugen.

Voraussetzungen
- Node 18+
- Supabase URL + Service-Role Key (als Umgebungsvariablen)

Lokales Ausführen:

1. Abhängigkeiten installieren

   cd scripts
   npm ci

2. Einmal ausführen

   SUPABASE_URL=.. SUPABASE_SERVICE_ROLE_KEY=.. npm run run-once

Docker

- Build:
  docker build -t hufmanager-collage-worker -f scripts/Dockerfile scripts/
- Run:
  docker run -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... hufmanager-collage-worker

GitHub Actions

Eine Beispiel-Workflow-Datei ist unter `.github/workflows/collage-worker.yml` enthalten. Setze die Secrets `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` in den Repo-Secrets.

Hinweise
- Nutze den Service-Role Key **nur** auf dem Server (nicht im Browser).
- Sharp benötigt auf manchen Plattformen zusätzliche Systembibliotheken (libvips).