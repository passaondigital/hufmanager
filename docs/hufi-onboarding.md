# Hufi Onboarding — Vollständige Dokumentation

> Stand: 2026-05-14

## Vision

Kein Formular. Kein starrer Registrierungsflow. Hufi führt ein echtes Gespräch.
Der Nutzer antwortet wie in einer natürlichen Unterhaltung.
Am Ende kennt Hufi den Namen, die Rolle, die Pferde und die Ziele.

## Komponente

**Pfad:** `src/components/onboarding/HufiOnboardingChat.tsx`  
**Props:** `{ userId: string, onComplete: () => void }`  
**Trigger:** `profile.onboarding_completed === false`

## Der vollständige Dialog

### Schritt 0 — Begrüßung

**Hufi:**
> "Hallo! Ich bin Hufi – dein persönlicher Assistent für alles rund ums Pferd.
> Damit ich dich gut unterstützen kann, stelle ich dir kurz ein paar Fragen.
> Das dauert nur 2–3 Minuten. Wie heißt du?"

**Eingabe:** Freitext (Vorname)  
**Speichern:** `profiles.full_name`, `onboarding_data.name`  
**Nächster Schritt:** 1

---

### Schritt 1 — Kontext

**Hufi:**
> "Schön dich kennenzulernen, [Name]!
> Bist du eher privat in der Pferdewelt unterwegs – oder beruflich?"

**Eingabe:** Buttons `["Privat 🐴", "Beruflich 💼", "Beides"]`  
**Speichern:** `onboarding_data.context`  
**Nächster Schritt:** 2a (beruflich) oder 2b (privat) oder 2a+2b (beides)

---

### Schritt 2a — Beruf (wenn beruflich)

**Hufi:**
> "Was machst du genau?"

**Eingabe:** Buttons + "Anderes" Freitext:
- Hufpfleger / Barhufpfleger
- Hufschmied
- Tierarzt / Tierärztin
- Reitlehrer / Trainerin
- Stallbetreiber / Pensionsstall
- Physiotherapeut / Osteopath

**Hufi (Folge-Frage):**
> "Wie viele Kunden oder Pferde betreust du ungefähr?"

**Eingabe:** Buttons `["Weniger als 10", "10–30", "31–100", "Mehr als 100"]`

**Hufi (Folge-Frage):**
> "Arbeitest du alleine oder hast du ein Team?"

**Eingabe:** Buttons `["Solo 💪", "Mit Team 👥"]`  
**Speichern:** `onboarding_data.profession`, `onboarding_data.client_count`, `onboarding_data.team`

---

### Schritt 2b — Privatperson (wenn privat)

**Hufi:**
> "Wie viele Pferde hast du?"

**Eingabe:** Buttons `["1", "2–3", "4 oder mehr", "Noch keins 😄"]`  
**Speichern:** `onboarding_data.horse_count`, `profiles.role = "client"`

---

### Schritt 3 — Pferde

**Hufi (wenn beruflich):**
> "Hast du selbst auch Pferde?"

**Eingabe:** Buttons `["Ja", "Nein"]`

**Hufi (wenn ja oder wenn privat):**
> "Wie heißen deine Pferde? Nenn mir einfach die Namen – einen pro Zeile oder mit Komma getrennt."

**Eingabe:** Textarea (mehrere Namen)  
**Für jeden Namen:** INSERT horses + horse_completeness (score: 10)  
**Speichern:** `onboarding_data.horse_names`

---

### Schritt 4 — Ziele & Stil

**Hufi:**
> "Was soll ich vor allem für dich erledigen?"

**Eingabe:** Checkboxen (Mehrfachauswahl):
- 📅 Termine & Routen verwalten
- 👥 Kunden verwalten
- 🐴 Pferdeakten pflegen
- 🧾 Rechnungen & Angebote
- 💬 WhatsApp & Email schreiben
- 🔔 Proaktiv informieren
- ❓ Pferdewissen nachschlagen

**Hufi:**
> "Und wie soll ich dich ansprechen?"

**Eingabe:** Buttons `["Per Du ist super 👍", "Lieber per Sie"]`  
**Speichern:** `onboarding_data.goals`, `onboarding_data.formal`

---

### Schritt 5 — Abschluss

**Hufi:**
> "[Guten Morgen/Tag/Abend] [Name]! Ich kenne dich jetzt schon viel besser.
> [Wenn Pferde: Ich habe [N] Pferdeakte(n) für dich angelegt.]
> Ich lerne jeden Tag mehr über dich, deine Pferde und dein Business.
> Je mehr wir miteinander arbeiten, desto besser werde ich.
> Womit möchten wir anfangen?"

**Eingabe:** Quick-Action-Buttons (generiert aus `onboarding_data.goals`)  
**Aktion:** `profiles.onboarding_completed = true`, `profiles.onboarding_step = 5`  
**Navigation:** zur Rollen-Home (/kalender, /dashboard, etc.)

---

## Design-Richtlinien

- Chat-Bubble-Stil: Hufi links (weiß), User rechts (orange)
- Progress: Punkt-Indikator "Schritt X von 5"
- TTS: Hufi spricht jeden Schritt wenn Voice aktiviert
- Ganzseitig (nicht modal, nicht inline)
- Goldenes Pferd-Icon oben, Hufi-Orange als Akzent
- Jeder Schritt: sofortige Supabase-Speicherung
