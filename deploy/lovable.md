Deploy auf lovable.dev (Beispiel)

1) Image bauen und pushen

# lokal bauen
cd scripts
docker build -t ghcr.io/<org>/hufmanager-collage-worker:latest -f Dockerfile .

docker push ghcr.io/<org>/hufmanager-collage-worker:latest

2) Service erstellen bei lovable.dev
- Neues Service anlegen → Image: `ghcr.io/<org>/hufmanager-collage-worker:latest`
- Setze Umgebungsvariablen als Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Startmodus: entweder `Daemon` (long running) oder `Cron` (z.B. alle 15 min) je nach Angebot

3) Healthcheck & Logs
- Richte ein Health-Check (falls supported) auf ein eigenes Health-Endpoint bzw. überprüfe Logs
- Prüfe Logs nach Lauf-Start ob `Starting daemon worker` angezeigt wird

4) Optional: systemd / On-Premise
- Nutze die Datei `scripts/collage-worker.service` als Vorlage (setzt voraus, dass das Image in ghcr liegt und Docker installiert ist)
- Leg die Datei `/etc/hufmanager/collage.env` mit:
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...

5) Hinweise
- Secrets / Service-Role Key **nicht** in Git speichern
- Bei Problems mit `sharp` nutze ein volleres Base-Image (z. B. `node:18-bullseye`) oder installiere libvips
