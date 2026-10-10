# HufManagerOS v1.0 – Aktueller Dokumentationsstand

**Stand 10.10.2026, 23:03 Uhr (Europe/Berlin).** Verbindlicher Produktname: **HufManagerOS v1.0** (Produktbezeichnung, **kein** bestätigtes technisches Release- oder Verkaufs-GO). Ein Produkt mit Standard 19,95 €, Premium 49,90 € und Team Premium 199 € als Zieltarife. Pferdebesitzer-Zugang im vorgesehenen Bereich kostenlos.

**[Aktueller öffentlicher Projektstand, Prüfungen, Backup/Restore und Versionshistorie](docs/status/HUFMANAGEROS_CURRENT_STATUS.md)** · [Produktstrategie](docs/product/HUFMANAGER_OS_PRODUCT_CANON_2026-10-08.md).

Die bestehende Web-App wird betrieben; die historische Datenbanksicherung vom 08.10. wurde am 10.10. isoliert erfolgreich wiederhergestellt. Die neue tägliche Backup-Automatik ist installiert, der erste Nachtlauf zum Dokumentationsstichtag noch nicht bestätigt. Vollständige Demo-Rollen-, Storage-/Berechtigungs- und Kauf-E2E-Abnahmen bleiben offen; **SALE_READY=NO, RECOVERY_READY=NO**. Produktziele sind keine belegten Live-Features.

**Entwicklung:** vor technischen Änderungen `AGENTS.md`, `CLAUDE.md` und die operative Queue `CODEXTODO.md` prüfen. Kein Code-/PROD-Deploy, keine DB-Änderung oder Offenlegung interner Betriebsdaten durch diese Dokumentationsaktualisierung.

---

---

## Archivierter ursprünglicher Lovable-README-Text

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/995a4929-a180-4f41-b71d-4328f15ba3bc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/995a4929-a180-4f41-b71d-4328f15ba3bc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/995a4929-a180-4f41-b71d-4328f15ba3bc) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
