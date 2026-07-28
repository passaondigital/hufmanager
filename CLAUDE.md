# HufiApp — Projektkontext

## Stack
React + TypeScript + Vite, Supabase (DB, Auth, Storage, Edge Functions),
Tailwind. Deployment auf VPS via Nginx.

## Umgebungen — IMMER prüfen, bevor du eine DB anfasst
- PROD: `vnschgjxkzzwzefqlrji` (EU/Frankfurt) — echte Kundendaten
- Ein eigenes Staging-Projekt existiert in dieser Organisation aktuell
  NICHT. `GET /v1/projects` listet nur PROD und `xeikdhzwzuqrqztwqlgz`
  (Assaon, INACTIVE). Wer "Staging" sagt, muss erst klären, was gemeint ist.
- FALLE: Der Supabase-MCP zeigt nicht zuverlässig auf PROD. Wer PROD meint,
  nutzt die Management API oder die Supabase-CLI mit explizitem Projekt.
- Schreib in deine Antwort, gegen welches Projekt du gearbeitet hast.

## Lesend auf PROD arbeiten
Management API mit `read_only: true` — Postgres lehnt Schreibvorgänge dann
selbst ab, das ist stärker als jede Selbstdisziplin:
```
POST https://api.supabase.com/v1/projects/vnschgjxkzzwzefqlrji/database/query
Body: {"query": "...", "read_only": true}
Auth: Bearer <Token aus ~/.supabase/access-token>
```

## Deploy — nicht verhandelbar
- Frontend: ausschließlich `./deploy.sh`
- Edge Functions: separat über die Supabase-CLI
- Niemals direkt auf dem Server Dateien editieren, nie von Hand rsyncen
- HTTP 200 ist KEIN gültiger Erfolgs-Check nach einem Deploy

## Bekannte Fallen
- `appointments.status` ist freier Text ohne CHECK-Constraint. "Offen" kann
  `scheduled`, `planned` ODER `confirmed` heißen — jede Abfrage auf status
  muss alle drei behandeln.
- `hufai-proactive.ts` und `hufi-briefing.ts` sind Duplikate mit gleichem
  Typnamen. Vor Änderungen prüfen, welche der beiden aktiv ist.
- Offene Punkte stehen in `HUFI_TODO.md` — zuerst dort lesen.

## Arbeitsweise mit mir
- Ich bin Solo-Gründer, wenig Zeit, arbeite meist vom Handy oder Chromebook
  über SSH. Ich bin Handwerker, kein Programmierer — erklär Technik in
  normalem Deutsch, wenn sie eine Entscheidung von mir braucht.
- Antworte knapp. Keine Zusammenfassung dessen, was ich im Terminal ohnehin
  gesehen habe.
- Bei mehr als 3 geänderten Dateien: erst Plan zeigen, dann bauen.
- Sicherheit und Kundendaten haben Vorrang vor Feature-Tempo.
- Wenn du unsicher bist, ob etwas PROD betrifft: fragen, nicht raten.
