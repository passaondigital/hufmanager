# Stale Vercel References

Stand: 2026-09-01

## Verbindliche Betriebsrealität

HufManager verwendet Vercel **nicht** als Produktionshosting oder Deployment-Plattform.

Realer Zielpfad:

```text
GitHub
  -> kontrollierter Build/Release
  -> Hostinger VPS
  -> Nginx
  -> HufManager
```

Vercel-Commit-Statuses oder historische Vercel-Verweise dürfen daher nicht für `HUFMANAGER_MAIN`, `HUFMANAGER_PRODUCTION`, Deployment-Readiness oder Production-Health verwendet werden.

## Inventar

| Datei | Kontext | Öffentlich sichtbar | Rechtlich relevant | Technisch relevant | Korrektur nötig |
|---|---|---:|---:|---:|---:|
| `DEPLOYMENT_GUIDE.md` | Dokumentiert ausdrücklich, dass Vercel/Netlify kein Deployweg ist | nein/Repo-Doku | nein | ja | nein |
| `HUFI_ROADMAP.md` | Historischer Hinweis, dass frühere Vercel/Netlify-CI/CD-Aussage falsch war | nein/Repo-Doku | nein | ja | nein |
| `docs/datenschutz-faktenbasis.md` | Korrigierte Faktenbasis: Hostinger VPS; ALL-INKL und Vercel nicht genutzt | nein/Repo-Doku | ja | ja | nein |
| `src/pages/Docs.tsx` | Nutzer-/In-App-Dokumentation nennt Vercel als CDN/Frontend-Hosting und enthält weitere Cloud-Aussagen, die mit der realen VPS-Infrastruktur kollidieren | ja, sofern Docs-Seite erreichbar | ja | ja | **ja** |
| `src/pages/website/Datenschutz.tsx` | Kommentar dokumentiert bereits korrekt Hostinger VPS + Supabase und dass Vercel nicht genutzt wird | Quellkommentar, nicht sichtbarer Inhalt | ja | ja | nein für diesen Treffer; Seite separat juristisch prüfen |
| `src/components/settings/AVVSigningCard.tsx` | AVV-/Subunternehmertext nennt Vercel als Frontend-Hosting/Subunternehmer | ja, falls Komponente aktiv gerendert wird | **ja** | ja | **ja, aber nur nach juristischer/fachlicher Prüfung** |
| `src/components/settings/RoleAVVSigningCard.tsx` | AVV-/Subunternehmertext nennt Vercel als Frontend-Hosting/Subunternehmer | ja, falls Komponente aktiv gerendert wird | **ja** | ja | **ja, aber nur nach juristischer/fachlicher Prüfung** |

## Bewertung

### Technische Referenzen, die korrekt bleiben können

- `DEPLOYMENT_GUIDE.md`
- `HUFI_ROADMAP.md`
- `docs/datenschutz-faktenbasis.md`
- der technische Kommentar in `src/pages/website/Datenschutz.tsx`

Diese Vercel-Erwähnungen erklären gerade, dass Vercel **nicht** genutzt wird oder dokumentieren die historische Korrektur.

### Stale / widersprüchliche Referenzen

`src/pages/Docs.tsx` ist technisch widersprüchlich zur verifizierten Betriebsrealität. Besonders kritisch sind Aussagen wie Frontend-Hosting über CDN/Vercel bzw. Aussagen, nach denen keine eigenen virtuellen Server betrieben würden, obwohl HufManager real über den Hostinger VPS/Nginx-Pfad betrieben wird.

### Rechtlich sensible Referenzen

Die beiden AVV-Komponenten dürfen nicht automatisiert inhaltlich umgeschrieben werden. Vor einer Korrektur muss geklärt werden:

1. ob die Komponenten aktuell tatsächlich gerendert/verwendet werden,
2. welcher aktuelle AVV-/Subunternehmertext verbindlich sein soll,
3. welche Anbieter tatsächlich personenbezogene Daten als Auftragsverarbeiter/Subunternehmer erhalten,
4. ob eine juristische Endfassung/eRecht24-Fassung existiert.

## Nächste sichere Schritte

1. `src/pages/Docs.tsx` technisch gegen die aktuelle Infrastruktur-Faktenbasis prüfen und eine nicht-juristische Korrektur als separaten PR vorbereiten.
2. Render-/Nutzungsstatus von `AVVSigningCard.tsx` und `RoleAVVSigningCard.tsx` read-only feststellen.
3. Rechtliche Texte erst nach bestätigter Faktenbasis ändern.
4. Alte Vercel-Commit-Statuses bzw. GitHub-App-Integration getrennt auf Repository-/Account-Ebene prüfen; nicht als Produktionssignal auswerten.
