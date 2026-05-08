# Hufi — VPS Infrastruktur

> Read-only Überblick für Menschen und Agenten (ChatGPT, Claude, Gemini),
> die wissen müssen, wo Hufi physisch läuft. Enthält bewusst **keine**
> Secrets, API-Keys, `.env`-Inhalte, Tailscale-IPs oder SSH-Schlüssel.
> Stand: 2026-05-08.

## Hosting

- **Provider:** Hostinger (KVM/QEMU virtualisiert)
- **OS:** Ubuntu 24.04.4 LTS
- **Kernel:** Linux 6.8.0-110-generic, x86_64
- **CPU:** AMD EPYC 9354P, 4 vCPUs @ 2.0 GHz
- **RAM:** 15 GiB total
- **Swap:** 8 GiB
- **Disk:** 193 GB root, ~71 % belegt — im Auge behalten

## Web-Edge

- **Reverse-Proxy:** Nginx auf Port 80 / 443
- **TLS:** Let's Encrypt (~26 Zertifikate)
- **Hufi-relevante Domains** (Auswahl):
  - `hufiapp.de` / `www.hufiapp.de` (live)
  - `hufmanager.de` / `www.hufmanager.de` / `app.hufmanager.de` (Legacy-Aliase)
  - `hufiai.de`, `hufcampro.de`, `hufivoice.assaon.com`,
    `minihufmanager.assaon.com`

## PM2-Services (alle online)

| Service | Port | Zweck |
|---|---|---|
| `hufi-whisper` | 5000 | Speech-to-Text (Python) |
| `hufi-hufcam` | 5002 | HufCam-Backend (Python3) |
| `hufcampro-rembg` | – | Background-Removal für hufcampro |
| `ps-uploader` | 8790 | Pascal-Schmid-Upload-Service |
| `assaon-app` | – | Assaon-Frontend |
| `assaon-receiver` | – | Webhook/Receiver |
| `deploy-sidecar` | – | Deploy-Helfer |
| `mr-equibot` | 7777 | Bot-Service |
| `bolt-studio` | – | Bolt.DIY Studio |
| `aider-gui` | 8501 | Aider-GUI |

PM2 läuft als systemd-Service (`pm2-root.service`).

## Docker-Container (laufend)

| Container | Port | Image / Zweck |
|---|---|---|
| `open-webui` | 3000 | `ghcr.io/open-webui/open-webui:main` — Ollama-Frontend |
| `triposr-ai` | 8085 | 3D-Generierung |
| `freecad-vyti-freecad-1` | 3010 | `lscr.io/linuxserver/freecad:latest` |
| `mein-logo-upload` | – | `node:18-slim` — Logo-Upload-Helper |

## Lokale KI / LLMs (Ollama auf Port 11434)

Acht Modelle installiert, ~32 GB Disk-Belegung, on-demand Loading
(beim Abruf war kein Modell aktiv geladen):

| Modell | Größe | Zweck |
|---|---|---|
| `hufiai-fast:latest` | 4.9 GB | Hufi-Custom-Tag (Layer-Stack `16db21669…`) |
| `hufiai-core:latest` | 4.9 GB | Hufi-Custom-Tag (gleicher Layer-Stack) |
| `llama3.1:latest` | 4.9 GB | Basis-Modell |
| `moondream:latest` | 1.7 GB | Vision / Bildanalyse |
| `qwen2.5-coder:14b` | 9.0 GB | Coding / Refactor |
| `qwen2.5-coder:3b` | 1.9 GB | Mittlerer Coder |
| `qwen2.5-coder:1.5b` | 986 MB | Leichter Coder |
| `deepseek-coder:6.7b` | 3.8 GB | Coding-Alternative |

Die drei Tags `hufiai-fast`, `hufiai-core` und `llama3.1` teilen sich
denselben Layer-Stack, sind also **deduplikate Tags auf einer Basis**, kein
dreifacher Speicherbedarf.

## KI-Anbindung Cloud

- **Anthropic** läuft über die Supabase Edge Function `anthropic-proxy`.
- API-Key: Supabase-Secret `ANTHROPIC_API_KEY`.
- **Nicht** im Frontend, **nicht** in `VITE_*`-Variablen.

## Python-Services

- **Whisper STT** — Port 5000 (PM2: `hufi-whisper`)
- **HufCam Backend** — Port 5002 (PM2: `hufi-hufcam`)

## Systemd-Dienste (relevant)

`nginx`, `ollama`, `docker`, `containerd`, `pm2-root`, `ssh`, `tailscaled`,
`unattended-upgrades`.

## Wichtige Pfade

| Pfad | Zweck |
|---|---|
| `/root/hufmanager_v25/production/` | HufiApp Source (kanonisch) |
| `/hufiapp` | Symlink → `hufmanager_v25/production` |
| `/var/www/hufiapps/v25/` | HufiApp Build-Output (live unter `hufiapp.de`) |
| `/root/hufcampro-rembg/` | HufCamPro Background-Removal |
| `/root/ps-uploader/` | Upload-Service |
| `/etc/nginx/sites-enabled/` | Nginx-Konfigurationen |
| `/etc/letsencrypt/live/` | TLS-Zertifikate |

## App-Stack (Hufi-Frontend)

- React 18 + Vite + TypeScript strict
- shadcn/ui + Tailwind + Radix UI
- TanStack Query v5, React Router v6
- Supabase (Auth, Postgres, Edge Functions, Storage, RLS)
- PWA + idb-keyval
- Leaflet (react-leaflet), Konva, Recharts
- react-hook-form + zod

## Bewusst weggelassen

- Konkrete Tailscale-IPs.
- Inhalte von `.env`-Dateien.
- Supabase Service-Role-Keys oder Anon-Keys.
- SSH-Schlüssel oder Passwörter.
- Backup-Schedule (muss ergänzt werden — nicht verifiziert).

## Wie diese Datei lebt

Bei jeder Änderung an PM2-Services, neuer/entfernter Domain, Ollama-Modellen
oder grundlegendem Stack: **diese Datei aktualisieren**, nicht nur Memory.
Live-Stand prüfen mit `pm2 list`, `ollama list`, `ls /etc/nginx/sites-enabled`.
