# Datenschutz — Technische Faktenbasis & Neuaufbau-Vorlage

> **Stand:** 14.06.2026, aktualisiert 17.06.2026
> **Zweck:** geprüfte technische Faktengrundlage für die **Neufassung** der Datenschutzerklärung.
> **KEINE Rechtsberatung** — Rechtsgrundlagen/AVV-Status sind Vorschläge/Hinweise zur Prüfung.
> **Quelle:** Code-Scan von `supabase/functions/` + `src/`, Supabase-Region via CLI verifiziert.

> ⚠️ **LIZENZ-HINWEIS (neu, 17.06.2026):** Der bisherige Text in `src/pages/website/Datenschutz.tsx`
> ist ein **eRecht24-Generat**, dessen **Mitgliedschaft ausgelaufen** ist. Die Weiterverwendung der
> Vorlage ist nicht mehr lizenzgedeckt. → Datenschutztext **neu aufsetzen** über einen frei
> lizenzierten Generator, z. B. **https://datenschutz-generator.de** (Dr. Schwenke, freie Lizenz).
> Diese Datei dient als vollständige Eingabe-/Faktenvorlage dafür (siehe Abschnitt **F**).

---

## A. Datenstandort der Hauptdatenbank — ✅ im Text korrigiert

- **Supabase-Projekt `vnschgjxkzzwzefqlrji` (Hufi/HufManager) liegt in `Central EU (Frankfurt)`** — verifiziert (AWS eu-central-1).
- Datenverarbeitung/Speicherung erfolgt in der **EU (Frankfurt)**; Supabase Inc. ist als **US-Unternehmen** der Auftragsverarbeiter → AVV + SCC erforderlich. Beide Fakten gehören in den Text.
- **Status:** im aktuellen Entwurf bereits korrigiert (EU-Standort + US-Anbieter + SCC).

## A2. Hosting-Realität — ✅ korrigiert (war falsch)

- **Tatsächliche Infrastruktur: Hostinger VPS** (Hostinger International Ltd., Larnaca/Zypern; Server in der EU; Nginx-Reverse-Proxy, Build-Output unter `/var/www/hufiapps/v25/`, live `hufiapp.de`).
- **ALL-INKL und Vercel werden NICHT genutzt** — standen fälschlich im alten Text und wurden entfernt.
- Auf dem VPS laufen zusätzlich die self-hosted Verarbeitungsdienste (Whisper/Piper/Ollama, siehe C).

## A3. Verantwortliche Stelle / Anschrift — ✅ aktualisiert

- **Neu:** Pascal Schmid (Barhufserviceschmid), **Hauptstraße 19, 54426 Talling**, Tel. 015209007017, kontakt@hufiapp.de
- **Alt (entfernt):** „c/o Postflex #10643, Emsdettener Str. 10, 48268 Greven" — Postflex gekündigt, Adresse existiert nicht mehr.
- Geändert an **18 Stellen / 13 Dateien** (Impressum, Datenschutz, AGB, Widerruf, Footer, Vertrauen, Docs, Management, AVV-PDFs, Rechnungs-Aussteller-Defaults, `onboard-provider`-Edge-Function).

## B. Drittempfänger — Vollständige Liste

Legende „im DS-Text": ✅ genannt · ❌ FEHLT · ⚠️ unklar/teilweise · 🆕 = im aktuellen Entwurf (Abschnitt 8) nun ergänzt

| # | Dienst | Anbieter (Sitz) | Welche Daten gehen raus | Zweck | Code-Beleg | Rechtsgrundlage (Vorschlag) | AVV/Transfer | im DS-Text |
|---|--------|-----------------|-------------------------|-------|------------|------------------------------|--------------|------------|
| 1 | **Supabase** | Supabase Inc. (US); Hosting EU/Frankfurt | Alle App-Daten: Profile, Kunden, Pferde, Termine, Rechnungen, Auth, Storage | Backend/DB/Auth | überall (`SUPABASE_URL`) | Art. 6(1)(b) | AVV + SCC; Daten in EU | ✅ (Standort korrigiert) |
| 2 | **Anthropic (Claude)** | Anthropic PBC (US) | Nutzer-Nachrichten + Kontext: Kunden-/Pferdenamen, Termine, Rechnungs-/Memory-Daten, abgeleitetes Wetter | KI-Assistent | `anthropic-proxy/index.ts:51`, `hufi-agent/index.ts:686` | Art. 6(1)(b/f) | API Zero-Retention prüfen; SCC | ✅ |
| 3 | **ElevenLabs** | ElevenLabs Inc. (US) | **Nur noch Antworttext (TTS)** — kann Kunden-/Pferdenamen enthalten. **Audio/STT entfällt** (jetzt self-hosted Whisper) | Sprachausgabe | `hufi-tts/index.ts:87` (TTS) | Art. 6(1)(b/f) | AVV prüfen; SCC | 🆕 ✅ |
| 4 | **wttr.in** | Open-Source-Dienst (I. Chubin), Drittland unklar | **Nur noch grobe Region (Stadtebene, ~11 km)** — exakte GPS werden NICHT mehr gesendet | Wetterkontext fürs Briefing | `hufi-agent/index.ts:~226` (coarseLat/Lon) | Art. 6(1)(f) | Kein AVV (Community-Dienst) → durch Datenminimierung entschärft | 🆕 ✅ |
| 5 | **OpenRouteService** | HeiGIT gGmbH, **Heidelberg/DE** | Kunden-Adressen + Koordinaten | Routenoptimierung | `get-route/index.ts:61/92` | Art. 6(1)(b/f) | AVV prüfen (EU-Anbieter) | 🆕 ✅ |
| 6 | **OpenStreetMap / Nominatim** | OSM Foundation (UK/EU) | Kunden-Adressen | Geocoding (Adresse→Koordinaten) | `geocode-missing-appointments`, `src/lib/geocode.ts` | Art. 6(1)(f) | Nutzungsbedingungen (kein klass. AVV) | 🆕 ✅ |
| 7 | **Tankerkönig** | creativecommons.tankerkoenig.de (DE) | **Standort (lat/lng)** zur Umkreissuche | Live-Spritpreise (aktiv: Fuhrpark-Seite, DayCockpit) | `fuel-prices/index.ts:21`, `Fuhrpark.tsx:450` | Art. 6(1)(f) | EU-Dienst | 🆕 ✅ |
| 8 | **Resend** | Resend Inc. (US) | E-Mail-Empfängeradressen + Inhalte (z.B. Rechnungen) | E-Mail-Versand | `send-email/index.ts:123`, `send-invoice-email/index.ts:210` | Art. 6(1)(b) | AVV + SCC prüfen; **Absenderdomain noch unverifiziert** (`onboarding@resend.dev`) | 🆕 ✅ |
| 9 | **Web-Push (VAPID)** | Push-Dienste: Google FCM (Chrome/Android), Mozilla, Apple | Push-Endpoint + verschlüsselte Payload (Titel/Text) | Push-Benachrichtigungen | `send-push-notification/index.ts:287` | Art. 6(1)(a) Einwilligung | Transfer abhängig vom Browser-Hersteller | ⚠️ noch präzisieren |
| 10 | **CopeCart** | CopeCart GmbH (DE) | Zahlungs-/Käuferdaten (eingehend) | Zahlungsabwicklung/Abo | `copecart-webhook` | Art. 6(1)(b) | EU-Anbieter | ✅ |

> **Entfernt aus der Liste:** „All-Inkl" (Hosting) — nicht genutzt, durch **Hostinger** ersetzt (siehe A2).

## C. Eigene Infrastruktur (KEINE Drittempfänger — datenschutzfreundlich)

- **Whisper STT** (`localhost:5000`, eigener VPS) — **alle** Sprach-Transkriptionen laufen jetzt self-hosted. `hufi-ai-voice-finding` nutzt **kein** ElevenLabs-STT mehr (Code entfernt); der Client (`HufiAIVoiceRecorder.tsx`) transkribiert über `/api/local-ai/transcribe`. → **Audio verlässt die eigene Infrastruktur nicht.**
- **Piper TTS** (`localhost:5003`, eigener VPS) — Sprach-Antworten bleiben lokal (ElevenLabs nur als Fallback/Premium-TTS).
- **Ollama** (`OLLAMA_PROXY_URL`, eigener VPS) — lokaler KI-Fallback.
- → Self-Hosting ist ein DSGVO-Pluspunkt (Datenminimierung) und im Text positiv erwähnt.

## D. Handlungspunkte — Status

1. ✅ **6 fehlende Empfänger ergänzt** (Abschnitt 8 im Entwurf): ElevenLabs, wttr.in, ORS, Nominatim, Tankerkönig, Resend.
2. ✅ **Supabase-Standort korrigiert** (EU/Frankfurt + US-Anbieter/SCC).
3. ✅ **wttr.in entschärft** — Option (b) umgesetzt: nur grobe Region (Stadtebene) statt exakter GPS.
4. ✅ **ElevenLabs-Audio (STT) eliminiert** — jetzt self-hosted Whisper, keine Audio-Drittübermittlung.
5. ⏳ **Resend-Absenderdomain verifizieren** (`onboarding@resend.dev` → eigene Domain). *Offen, extern.*
6. ✅ **Memory-Viewer erreichbar** — Route `/hufi/memory` in `App.tsx` + Button in `KiSettingsCard.tsx`.
7. ⏳ **Web-Push** im Text präzisieren (Push-Kontext, beteiligte Browser-Dienste). *Offen.*
8. 🆕 ⏳ **Datenschutztext neu aufsetzen** (eRecht24-Lizenz ausgelaufen) — über freien Generator, Vorlage = Abschnitt F. *Offen, priorisiert.*
9. 🆕 ⏳ **eRecht24-Affiliate-Block** (DS Abschnitt 7 + Links in `Management.tsx:829/837`): nur behalten, falls Affiliate-Teilnahme fortbesteht — sonst Block + Links entfernen. *Geschäftsentscheidung.*

## E. AVV-Beschaffung (Checkliste fürs Generator-/Anwalts-Briefing)

DPAs/AVV einholen bzw. verlinken für: **Supabase, Anthropic, ElevenLabs, OpenRouteService, Resend, Hostinger.**
Für **wttr.in & Nominatim** gibt es keine kommerziellen AVV → Nutzung über berechtigtes Interesse + Datenminimierung rechtfertigen (wttr.in bereits auf grobe Region reduziert).

---

## F. Neuaufbau-Vorlage (Eingaben für freien Generator)

> Diese Abschnitte 1:1 als Faktenbasis in `datenschutz-generator.de` (o. ä.) übernehmen.
> Reihenfolge orientiert sich an gängiger Generator-Gliederung.

### F1. Verantwortliche Stelle
- Pascal Schmid (Barhufserviceschmid)
- Hauptstraße 19, 54426 Talling, Deutschland
- Telefon: 015209007017 · E-Mail: kontakt@hufiapp.de
- Kein Datenschutzbeauftragter erforderlich (Kleinunternehmer, < Schwellenwerte) — prüfen.
- Aufsichtsbehörde: Landesbeauftragte(r) für Datenschutz **Rheinland-Pfalz** (Sitz Talling) — im Generator hinterlegen.

### F2. Hosting / Infrastruktur
- **Hostinger International Ltd.** (Larnaca, Zypern) — VPS, Server in der EU; Server-Logs (IP, Browser, Zeit). Art. 6(1)(f); AVV.
- **Supabase Inc.** (US-Anbieter; Datenspeicherung EU/Frankfurt, AWS eu-central-1) — Backend/DB/Auth/Storage. Art. 6(1)(b); AVV + SCC.

### F3. Verarbeitungstätigkeiten (App nach Login)
| Zweck | Daten | Rechtsgrundlage |
|---|---|---|
| Kunden-/Pferdeverwaltung, Termine, Pferdeakte | Stamm-/Kontaktdaten, Tierdaten, Adressen | Art. 6(1)(b) |
| Rechnungsstellung / Buchhaltung | Rechnungs-, Zahlungs-, Steuerdaten | Art. 6(1)(b/c) |
| KI-Assistent „Hufi" inkl. Memory | Eingaben, Kontext (Kunden-/Pferdenamen, Termine), gespeicherte Memory-Inhalte | Art. 6(1)(b/f) |
| Sprachsteuerung (STT/TTS) | Audio (self-hosted Whisper), Antworttext (Piper lokal / ElevenLabs TTS) | Art. 6(1)(b/f) |
| Routen- & Reisekostenplanung | Adressen, Koordinaten, grober Standort | Art. 6(1)(b/f) |
| Push-Benachrichtigungen | Push-Endpoint, Benachrichtigungsinhalt | Art. 6(1)(a) |

### F4. Drittdienste / Auftragsverarbeiter
→ Siehe Tabelle Abschnitt B (Anthropic, ElevenLabs, ORS, Nominatim/OSM, Tankerkönig, Resend, Web-Push, CopeCart) mit Daten/Zweck/Sitz/Rechtsgrundlage/SCC.

### F5. Self-Hosting (positiv hervorheben)
Whisper (STT), Piper (TTS), Ollama (KI-Fallback) laufen auf eigenen EU-Servern → **Sprachaufnahmen werden nicht an Dritte übermittelt** (Datenminimierung). wttr.in erhält nur grobe Region statt GPS.

### F6. Betroffenenrechte
Auskunft (Art. 15), Berichtigung (16), Löschung (17), Einschränkung (18), Datenübertragbarkeit (20), Widerspruch (21), Beschwerde bei Aufsichtsbehörde.
**Hufi-Memory:** Nutzer können in der App unter **Einstellungen → KI** bzw. `/hufi/memory` die vom KI-Assistenten gespeicherten Inhalte einsehen und löschen (Art. 15/17).

### F7. Website (öffentlich, vor Login)
- Server-Logs (Hostinger), Cookies/Local Storage (essenziell), ggf. Google Fonts.
- KI-Assistent auf der Website (Anthropic/Claude) — Art. 6(1)(f).
- Kontaktaufnahme (E-Mail/Telefon/Formular) — Art. 6(1)(b/f).

### F8. Zahlungen & Marketing
- **CopeCart GmbH** (DE) — Zahlungs-/Abo-Abwicklung. Art. 6(1)(b).
- **eRecht24-Affiliate** (Digistore24-Wiedererkennung) — **nur aufnehmen, wenn Teilnahme fortbesteht** (Links in `Management.tsx`). Sonst weglassen.
