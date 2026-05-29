# Hufi Onboarding Flow — Architektur & Umsetzungsplan

> Stand: 2026-05-11  
> Ziel: Vom ersten Satz auf hufiapp.de bis zum personalisierten Dashboard — Hufi kennt dich.

---

## 1. Vision in einem Satz

Ein Besucher auf hufiapp.de wird von Hufi begrüßt, durch die Registrierung geführt, nach Rolle und Anrede gefragt — und landet danach in einem Dashboard, das ihn mit Namen, Anrede und Tageszeit begrüßt. Hufi merkt sich alles, und lernt mit jeder Interaktion weiter.

---

## 2. Der vollständige Flow (Zielzustand)

```
hufiapp.de (Landing)
  │
  ▼
[HufiVoiceSection] ← bereits gebaut ✓
  "Hallo. Ich bin Hufi. Ich helfe Menschen dabei, Pferde besser zu verstehen."
  [Hufi anhören] ──► [Kostenlos starten]
  │
  ▼
/auth → MultiStepSignup (7 Schritte, Hufi spricht jeden Schritt an)
  │
  ├── Schritt 1: "Wie darf ich dich nennen?" → Vorname
  ├── Schritt 2: "Wie soll ich dich ansprechen?" → Anrede (Herr / Frau / Divers / Keine)
  ├── Schritt 3: "Was machst du?" → Rolle (Hufpfleger/Tierarzt/... ODER Pferdebesitzer)
  ├── Schritt 4: Beruf (nur Provider) ODER Pferdebesitzer-Typ
  ├── Schritt 5: Land (DE/AT/CH)
  ├── Schritt 6: E-Mail + Passwort
  ├── Schritt 7: "Darf Hufi mit dir sprechen?" → voice_enabled (on/off)
  │
  ▼
Post-Registration — Personalisierter Willkommensmoment
  Hufi spricht: "Hallo [Vorname], schön dass du dabei bist."
  (Provider: "Lass uns deinen ersten Termin einrichten.")
  (Client: "Wie heißt dein Pferd?")
  │
  ▼
/home oder /client-home
  DashboardHero: "Guten Morgen, [Anrede] [Nachname]" (oder Vorname wenn Divers/keine)
  ProactiveBriefing: Hufi spricht wenn voice_enabled = true
```

---

## 3. Ausgangslage — Was heute existiert

| Komponente | Datei | Status |
|---|---|---|
| Landing Voice | `src/components/landing/HufiVoiceSection.tsx` | ✅ gebaut |
| Multi-Step Signup | `src/components/auth/MultiStepSignup.tsx` | ✅ vorhanden (6 Schritte) |
| Onboarding-Check | `src/hooks/useOnboarding.tsx` | ✅ vorhanden |
| Dashboard-Begrüßung | `src/components/dashboard-zones/DashboardHero.tsx` | ✅ nutzt `name` |
| Proaktives Briefing | `src/components/voice/ProactiveBriefing.tsx` | ✅ vorhanden, Phase E |
| Hey Hufi | `src/components/voice/HeyHufi.tsx` | ✅ vorhanden |
| Anrede im Profil | `profiles.salutation` | ❌ Spalte fehlt |
| Voice-Präferenz | `profiles.voice_enabled` | ❌ Spalte fehlt |
| Hufi-Gedächtnis | `hufi_context` / `profiles.hufi_persona` | ❌ noch nicht vorhanden |

---

## 4. Was in MultiStepSignup bereits gesammelt wird

```typescript
// src/components/auth/MultiStepSignup.tsx — onComplete callback:
{
  fullName: string,       // ✅
  role: "provider" | "client",  // ✅
  email: string,          // ✅
  password: string,       // ✅
  country: DachCountry,   // ✅
  businessName?: string,  // ✅ (provider)
  clientType?: ClientType, // ✅ (client)
  professionType?: string, // ✅ (provider)
  // FEHLT:
  salutation?: string,    // ❌
  voiceEnabled?: boolean, // ❌
}
```

---

## 5. Umsetzungsplan — 3 Phasen

---

### Phase A — Frontend-only, ohne Migration (≈ 1–2 Tage)

**Kein DB-Schema-Change nötig. Sofort umsetzbar.**

#### A1 — Hufi spricht in MultiStepSignup

Jeder Schritt bekommt einen Hufi-Satz. Der `useHufiTTS`-Hook ist bereits in der App vorhanden.

```typescript
// In MultiStepSignup.tsx — neues Mapping:
const HUFI_STEP_VOICE: Record<string, string> = {
  name:        "Wie darf ich dich nennen?",
  role:        "Was machst du? Ich passe mich deiner Rolle an.",
  profession:  "Welche Art von Arbeit machst du mit Pferden?",
  "client-type": "Bist du privat unterwegs oder verwaltest du mehrere Pferde?",
  country:     "In welchem Land arbeitest du?",
  credentials: "Deine Daten bleiben auf deutschen Servern.",
  business:    "Fast geschafft — wie heißt dein Betrieb?",
  voice:       "Darf ich mit dir sprechen?",
};
```

Aufruf: `useEffect(() => { if (voice_enabled) speak(HUFI_STEP_VOICE[step]); }, [step]);`

**Datei:** `src/components/auth/MultiStepSignup.tsx`

#### A2 — Anrede-Schritt (Step 1.5, localStorage-basiert)

Anrede zwischen Name-Schritt und Rollen-Schritt einschieben. Da `profiles.salutation` noch fehlt, wird sie temporär in `raw_user_meta_data` beim Signup übergeben (`supabase.auth.signUp({ options: { data: { salutation } } })`). Supabase speichert das in `auth.users.raw_user_meta_data` — ohne Migration.

```typescript
// In Auth.tsx — handleSignup liest salutation aus MultiStepSignup
await supabase.auth.signUp({
  email, password,
  options: {
    data: {
      full_name: fullName,
      role,
      salutation,         // → raw_user_meta_data
      voice_enabled: true,
    }
  }
});
```

Die DB-Trigger liest `raw_user_meta_data` bereits (siehe Migration `20251205184311`). Dort `salutation` hinzufügen wenn Phase B kommt.

#### A3 — Personalisierter Willkommensmoment

Nach Registrierung: statt direkt zu `/home` weiterleiten → kurzer Overlay in `Welcome.tsx`:

```typescript
// src/pages/Welcome.tsx — aktuell: sofort redirect
// Neu: 3-Sekunden Hufi-Begrüßung, dann redirect

const firstName = profile?.full_name?.split(" ")[0] || "du";
speak(`Hallo ${firstName}, schön dass du dabei bist.`);
// role-spezifisch:
// provider: "Lass uns deinen ersten Termin anlegen."
// client:   "Wie heißt dein Pferd?"
```

**Dateien:** `src/pages/Welcome.tsx`, `src/components/auth/MultiStepSignup.tsx`

#### A4 — DashboardHero spricht (wenn voice_enabled)

```typescript
// src/components/dashboard-zones/DashboardHero.tsx
// Aktuell: zeigt Begrüßungstext
// Neu: spricht die Begrüßung einmal beim ersten Aufruf des Tages
// (bereits teilweise in MobileShell.tsx Phase E vorhanden)
```

---

### Phase B — Mit DB-Migration (≈ 1 Tag + Review)

**Benötigt: 1 neue Migration, kein RLS-Change nötig.**

#### B1 — profiles erweitern

```sql
-- Migration: add_hufi_persona_to_profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS salutation        text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS voice_enabled     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_locale  text    DEFAULT 'de-DE',
  ADD COLUMN IF NOT EXISTS hufi_first_login  boolean DEFAULT true;

-- handle_new_user trigger erweitern:
salutation    := NEW.raw_user_meta_data ->> 'salutation';
voice_enabled := (NEW.raw_user_meta_data ->> 'voice_enabled')::boolean;
```

#### B2 — DashboardHero nutzt Anrede

```typescript
// src/components/dashboard-zones/DashboardHero.tsx
// profiles.select("full_name, salutation, voice_enabled")
// salutation = 'herr' → "Guten Morgen, Herr Schmid"
// salutation = 'frau' → "Guten Morgen, Frau Schmid"  
// salutation = 'divers' | null → "Guten Morgen, Pascal"
```

#### B3 — ProactiveBriefing respektiert voice_enabled

```typescript
// src/components/voice/ProactiveBriefing.tsx
// Aktuell: spricht immer wenn DSGVO-Consent vorhanden
// Neu: ZUSÄTZLICH prüfen ob profiles.voice_enabled === true
```

---

### Phase C — Hufi lernt (≈ 3–5 Tage + Design)

**Das ist das Herz der Vision: Hufi merkt sich, was du gesagt hast.**

#### C1 — hufi_context Tabelle

```sql
CREATE TABLE public.hufi_context (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users NOT NULL,
  key          text NOT NULL,         -- 'first_horse_name', 'preferred_greeting', ...
  value        text,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);
```

Beispiel-Einträge nach Onboarding:
```
{ key: 'first_horse_name',    value: 'Luna' }
{ key: 'onboarding_role',     value: 'hoof_care' }
{ key: 'salutation',          value: 'herr' }
{ key: 'voice_preference',    value: 'enabled' }
{ key: 'appointment_count',   value: '12' }  // wächst mit
```

#### C2 — HufAI Kontext-Injektion

```typescript
// src/components/voice/HeyHufi.tsx
// Vor jedem Claude-API-Call: hufi_context laden und als System-Prompt injizieren

const systemContext = `
  Du sprichst mit ${salutation} ${lastName || firstName}.
  Rolle: ${role} (${professionType}).
  Erstes Pferd: ${context.first_horse_name || 'unbekannt'}.
  Stimme: ${voiceEnabled ? 'an' : 'aus'}.
  Bisherige Termine: ${context.appointment_count}.
  Letzte Interaktion: ${context.last_interaction}.
`;
```

#### C3 — Lernpunkte definieren (was Hufi merkt)

| Ereignis | Was gespeichert wird |
|---|---|
| Onboarding abgeschlossen | salutation, role, first_horse_name |
| Erster Termin erstellt | appointment_style (Einzeltermin / Tour) |
| Befund gesprochen | preferred_befund_length |
| Hey Hufi genutzt | last_voice_query, voice_query_count |
| Proaktives Briefing geschlossen ohne Reaktion | briefing_dismissed_count |
| Rechnungsversand | invoice_method (Email / PDF) |

---

## 6. Dateien die geändert werden (Gesamtübersicht)

### Phase A (kein Schema-Change)
```
src/components/auth/MultiStepSignup.tsx     — Anrede-Schritt + Hufi-Voice
src/pages/Auth.tsx                          — salutation in signUp-Metadata
src/pages/Welcome.tsx                       — Hufi-Willkommensmoment statt sofort-Redirect
src/components/dashboard-zones/DashboardHero.tsx — Voice-Begrüßung
```

### Phase B (1 Migration)
```
supabase/migrations/[neue].sql              — salutation, voice_enabled, preferred_locale
src/integrations/supabase/types.ts          — nach `supabase gen types`
src/components/auth/MultiStepSignup.tsx     — voice_enabled-Schritt
src/components/voice/ProactiveBriefing.tsx  — voice_enabled-Prüfung
```

### Phase C (1 neue Tabelle)
```
supabase/migrations/[neue].sql              — hufi_context Tabelle + RLS
src/hooks/useHufiContext.ts                 — neu: CRUD für hufi_context
src/components/voice/HeyHufi.tsx            — Kontext-Injektion in System-Prompt
src/components/auth/MultiStepSignup.tsx     — Onboarding-Daten in hufi_context schreiben
```

---

## 7. Priorisierung

| Phase | Aufwand | Wert | DB-Change | Empfehlung |
|---|---|---|---|---|
| A1 Hufi spricht in Registration | 2h | ★★★★ | Nein | **Sofort** |
| A2 Anrede-Schritt (localStorage) | 2h | ★★★★ | Nein (meta) | **Sofort** |
| A3 Willkommens-Moment | 1h | ★★★★★ | Nein | **Sofort** |
| A4 DashboardHero spricht | 1h | ★★★ | Nein | Sofort |
| B1 Migration salutation+voice | 1h | ★★★★ | Ja | **Nächste Session** |
| B2 Anrede in Begrüßung | 1h | ★★★ | Ja | Nächste Session |
| B3 voice_enabled in ProactiveBriefing | 30min | ★★★★ | Ja | Nächste Session |
| C1 hufi_context Tabelle | 3h | ★★★★★ | Ja | Phase 2 |
| C2 Kontext-Injektion HeyHufi | 4h | ★★★★★ | Ja | Phase 2 |

---

## 8. Was dieser Plan NICHT ist

- Keine Fake-KI: Hufi lernt nur was explizit gespeichert wird, keine Halluzination
- Kein Autoplay: Alle Sprach-Ausgaben nur nach User-Interaktion oder opt-in
- Keine Daten ohne DSGVO-Basis: `hufi_context` ist personenbezogen → RLS + DSGVO-Hinweis beim Onboarding
- Kein Umbau des bestehenden Auth-Flows: MultiStepSignup bleibt die Basis, nur Schritte erweitert

---

## 9. Nächste konkrete Aktion

**Session starten mit:**
```
Implement Phase A of HUFI_ONBOARDING_FLOW_PLAN.md:
- Add salutation step to MultiStepSignup
- Add Hufi voice to each registration step
- Add personalized Hufi welcome moment in Welcome.tsx
No migrations. No deploy yet. Build must stay green.
```

---

## 3. Implementierter Onboarding-Chat Flow (HufiOnboardingChat.tsx)

> Komponente: src/components/onboarding/HufiOnboardingChat.tsx
> Route: wird über App.tsx als Overlay geladen wenn profile.onboarding_completed === false

### Trigger
```typescript
// In App.tsx / ProtectedRoute:
if (user && profile && !profile.onboarding_completed) {
  return <HufiOnboardingChat userId={user.id} onComplete={() => refetchProfile()} />;
}
```

### Datenbankschema

```sql
-- In profiles Tabelle:
onboarding_step INT DEFAULT 0          -- aktueller Schritt (0–5)
onboarding_completed BOOLEAN DEFAULT false
onboarding_data JSONB DEFAULT '{}'     -- gesammelte Daten

-- onboarding_data Struktur:
{
  name: string,           -- Vorname
  context: "privat"|"beruflich"|"beides",
  profession?: string,    -- nur wenn beruflich
  client_count?: string,  -- Anzahl Kunden
  team?: "solo"|"team",
  horse_count?: string,   -- Anzahl eigene Pferde
  horse_names?: string[], -- Namen der Pferde
  goals?: string[],       -- Was soll Hufi tun
  formal?: boolean        -- Anredeform
}
```

### Dialog-Schritte

| Step | Trigger | Hufi-Frage | Eingabe-Typ | Gespeichert in |
|------|---------|-----------|-------------|----------------|
| 0 | Mount | "Hallo! Ich bin Hufi... Wie heißt du?" | Freitext | profiles.full_name, onboarding_data.name |
| 1 | Nach Name | "Bist du eher privat oder beruflich unterwegs?" | Buttons | onboarding_data.context |
| 2a | Beruflich | "Was machst du genau?" + "Wie viele Kunden?" | Buttons + Text | onboarding_data.profession, client_count |
| 2b | Privat | "Wie viele Pferde hast du?" | Buttons | onboarding_data.horse_count |
| 3 | Immer | "Wie heißen deine Pferde?" | Freitext (mehrere) | horses Tabelle + horse_completeness |
| 4 | Nach Pferden | "Was soll Hufi für dich erledigen?" | Checkboxen | onboarding_data.goals |
| 5 | Abschluss | Personalisierter Abschluss | Quick-Actions | profiles.onboarding_completed = true |

### Speicher-Strategie
- Jeder Step: sofortiger Supabase-UPDATE auf profiles
- Pferdenamen: INSERT in horses Tabelle + horse_completeness anlegen (score: 10)
- Kein "Alles am Ende speichern" — bei Abbruch kann fortgesetzt werden
- localStorage-Key (userId-basiert): hufi_onboarding_step_${userId.slice(-8)}
