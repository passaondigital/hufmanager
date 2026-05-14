// ─────────────────────────────────────────────────────────────────────────────
// Hufi Stimmen-Konfiguration
//
// Neue Stimme hinzufügen:
//   1. Auf https://elevenlabs.io/voice-library eine Stimme aussuchen
//   2. Voice-ID kopieren (in der URL oder auf der Voice-Seite)
//   3. Neuen Eintrag unten in HUFI_VOICES hinzufügen
//
// Modelle:
//   eleven_multilingual_v2  → beste Qualität, Deutsch sehr gut (empfohlen)
//   eleven_flash_v2_5       → schneller, günstiger, leicht schlechtere Qualität
//   eleven_turbo_v2_5       → Ultra-Low-Latency, für Live-Gespräche
// ─────────────────────────────────────────────────────────────────────────────

export interface HufiVoice {
  id: string;
  name: string;
  description: string;
  gender: "männlich" | "weiblich" | "neutral";
  style: string;
  previewText: string;
  previewUrl?: string;
  recommended?: boolean;
  isCustom?: boolean;
}

export const HUFI_VOICE_BROWSER: HufiVoice = {
  id: "browser",
  name: "Browser-Stimme",
  description: "Kostenlos, immer verfügbar. Klingt synthetisch, aber zuverlässig.",
  gender: "neutral",
  style: "Standard",
  previewText: "Guten Morgen! Ich bin Hufi, dein Assistent.",
};

// ─── ElevenLabs Stimmen ───────────────────────────────────────────────────────
// Voice-IDs direkt von https://elevenlabs.io/voice-library eintragen.
// Die "recommended"-Stimme wird im Selector zuerst angezeigt.
export const HUFI_VOICES: HufiVoice[] = [
  // ── Eigene Hufi-Stimmen (von ElevenLabs erstellt) ─────────────────────────
  {
    id: "1VD2QCeh67YqFnF8DXdR",
    name: "Hufi Weiblich Basis+",
    description: "Eigene Hufi-Stimme, weiblich, erweiterte Version.",
    gender: "weiblich",
    style: "Hufi",
    previewText: "Guten Morgen! Ich bin Hufi, dein Assistent für alles rund ums Pferd.",
    recommended: true,
    isCustom: true,
  },
  {
    id: "PbWcy4kYbh61Dn96ilSR",
    name: "Hufi Männlich Basis+",
    description: "Eigene Hufi-Stimme, männlich, erweiterte Version.",
    gender: "männlich",
    style: "Hufi",
    previewText: "Guten Morgen! Ich bin Hufi, dein Assistent für alles rund ums Pferd.",
    isCustom: true,
  },
  {
    id: "LASNcPBkwqNMJ0w8CTBT",
    name: "Hufi Männlich Basis",
    description: "Eigene Hufi-Stimme, männlich, Basisversion.",
    gender: "männlich",
    style: "Hufi",
    previewText: "Drei Termine heute. Der erste um acht Uhr dreißig. Alles vorbereitet.",
    isCustom: true,
  },
  {
    id: "3JVEodkPUEe8JPLcll4M",
    name: "Hufi Weiblich Basis",
    description: "Eigene Hufi-Stimme, weiblich, Basisversion.",
    gender: "weiblich",
    style: "Hufi",
    previewText: "Befund gespeichert. Soll ich einen Termin in sechs Wochen anlegen?",
    isCustom: true,
  },
  // ── ElevenLabs Bibliothek-Stimmen ─────────────────────────────────────────
  {
    id: "DEZHhPbmb8LVZmWufkCh",
    name: "Bibliothek 1",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Guten Morgen! Dein nächster Termin ist um 9 Uhr. Soll ich die Route öffnen?",
  },
  {
    id: "E13qNLHLLuVPKQvesCoy",
    name: "Bibliothek 2",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Ich habe den Befund gespeichert. Soll ich einen Termin in sechs Wochen anlegen?",
  },
  {
    id: "buUrS4YSeOZtlCKnzwkC",
    name: "Bibliothek 3",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Erledigt! Rechnung erstellt. Noch etwas?",
  },
  {
    id: "mmAbrxFQ9xjByXyBpqrK",
    name: "Bibliothek 4",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Drei Termine heute. Der erste um acht Uhr dreißig.",
  },
  {
    id: "XJ6WvkWn5AiImouUWf8S",
    name: "Bibliothek 5",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Ich empfehle in diesem Fall einen Tierarzt hinzuzuziehen.",
  },
  {
    id: "nGISSznGHAgSTKaMXEPO",
    name: "Bibliothek 6",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Guten Morgen! Ich bin Hufi, dein Assistent.",
  },
  {
    id: "CVcPLXStXPeDxhrSflDZ",
    name: "Bibliothek 7",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Befund gespeichert. Soll ich einen Folgetermin anlegen?",
  },
  {
    id: "3kaQumuvT4NtcZsw8RVS",
    name: "Bibliothek 8",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Dein Lagerbestand ist niedrig. Soll ich eine Bestellung vorschlagen?",
  },
  {
    id: "3t6439mGAsHvQFPpoPdf",
    name: "Bibliothek 9",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Route optimiert: Müller — Schmidt — Koch. 47 Kilometer.",
  },
  {
    id: "HRIShmNY56JGHVU1vXIt",
    name: "Bibliothek 10",
    description: "ElevenLabs Bibliotheksstimme.",
    gender: "neutral",
    style: "Standard",
    previewText: "Ich bin Hufi. Was kann ich heute für dich tun?",
  },
];

// Piper: lokale Open-Source TTS Stimme (Überbrücke bis ElevenLabs konfiguriert)
export const HUFI_VOICE_PIPER: HufiVoice = {
  id: "piper",
  name: "Hufi Stimme (lokal)",
  description: "Natürliche deutsche Stimme, direkt auf dem Server. Kein Internet nötig, schnell, kostenlos.",
  gender: "männlich",
  style: "Natürlich",
  previewText: "Guten Morgen! Ich bin Hufi, dein Assistent für alles rund ums Pferd.",
  recommended: true,
};

export const STORAGE_KEY_VOICE_ID = "hufi_elevenlabs_voice_id";
export const STORAGE_KEY_VOICE_NAME = "hufi_elevenlabs_voice_name";
export const STORAGE_KEY_MODEL = "hufi_elevenlabs_model";

export const DEFAULT_MODEL = "eleven_multilingual_v2";

import { ulget, ulset, ulremove } from "@/lib/user-storage";

export function getSelectedVoiceId(userId = ""): string | null {
  const id = ulget(userId, STORAGE_KEY_VOICE_ID);
  if (!id) return null;
  if (id === "browser" || id === "piper") return id;
  if (HUFI_VOICES.some((v) => v.id === id)) return id;
  ulremove(userId, STORAGE_KEY_VOICE_ID);
  ulremove(userId, STORAGE_KEY_VOICE_NAME);
  return null;
}

export function getSelectedVoiceName(userId = ""): string {
  return ulget(userId, STORAGE_KEY_VOICE_NAME) ?? "Browser-Stimme";
}

export function setSelectedVoice(voice: HufiVoice, userId = "") {
  if (voice.id === "browser") {
    ulremove(userId, STORAGE_KEY_VOICE_ID);
    ulremove(userId, STORAGE_KEY_VOICE_NAME);
  } else {
    ulset(userId, STORAGE_KEY_VOICE_ID, voice.id);
    ulset(userId, STORAGE_KEY_VOICE_NAME, voice.name);
  }
}

export function getSelectedModel(userId = ""): string {
  return ulget(userId, STORAGE_KEY_MODEL) ?? DEFAULT_MODEL;
}

export function setSelectedModel(model: string, userId = "") {
  ulset(userId, STORAGE_KEY_MODEL, model);
}

export function getAllVoices(): HufiVoice[] {
  return [HUFI_VOICE_PIPER, ...HUFI_VOICES, HUFI_VOICE_BROWSER];
}
