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
  // ── Hier deine ausgewählten Stimmen von ElevenLabs eintragen ──────────────
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    description: "Tief, klar, professionell. Gut für sachliche Anweisungen.",
    gender: "männlich",
    style: "Professionell",
    previewText: "Guten Morgen! Dein nächster Termin ist um 9 Uhr. Soll ich die Route öffnen?",
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    description: "Warm und freundlich. Angenehm für längere Gespräche.",
    gender: "männlich",
    style: "Warm",
    previewText: "Ich habe den Befund gespeichert. Soll ich einen Termin in sechs Wochen anlegen?",
    recommended: true,
  },
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    description: "Ruhig und klar. Gut verständlich auch bei schnellem Tempo.",
    gender: "weiblich",
    style: "Ruhig",
    previewText: "Drei Termine heute. Der erste um acht Uhr dreißig. Alles vorbereitet.",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    description: "Weich und einfühlsam. Ideal für Hinweise und Empfehlungen.",
    gender: "weiblich",
    style: "Einfühlsam",
    previewText: "Ich empfehle in diesem Fall einen Tierarzt hinzuzuziehen. Soll ich suchen?",
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    description: "Jung und energetisch. Kompakt und direkt.",
    gender: "männlich",
    style: "Energetisch",
    previewText: "Erledigt! Rechnung erstellt. Noch etwas?",
  },
  // ── Platzhalter für deine eigenen Stimmen ─────────────────────────────────
  // {
  //   id: "DEINE_VOICE_ID_HIER",
  //   name: "Meine Stimme",
  //   description: "Beschreibung",
  //   gender: "männlich",
  //   style: "Custom",
  //   previewText: "Hallo, ich bin Hufi.",
  //   isCustom: true,
  // },
];

export const STORAGE_KEY_VOICE_ID = "hufi_elevenlabs_voice_id";
export const STORAGE_KEY_VOICE_NAME = "hufi_elevenlabs_voice_name";
export const STORAGE_KEY_MODEL = "hufi_elevenlabs_model";

export const DEFAULT_MODEL = "eleven_multilingual_v2";

export function getSelectedVoiceId(): string | null {
  return localStorage.getItem(STORAGE_KEY_VOICE_ID);
}

export function getSelectedVoiceName(): string {
  return localStorage.getItem(STORAGE_KEY_VOICE_NAME) ?? "Browser-Stimme";
}

export function setSelectedVoice(voice: HufiVoice) {
  if (voice.id === "browser") {
    localStorage.removeItem(STORAGE_KEY_VOICE_ID);
    localStorage.removeItem(STORAGE_KEY_VOICE_NAME);
  } else {
    localStorage.setItem(STORAGE_KEY_VOICE_ID, voice.id);
    localStorage.setItem(STORAGE_KEY_VOICE_NAME, voice.name);
  }
}

export function getSelectedModel(): string {
  return localStorage.getItem(STORAGE_KEY_MODEL) ?? DEFAULT_MODEL;
}

export function setSelectedModel(model: string) {
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

export function getAllVoices(): HufiVoice[] {
  return [HUFI_VOICE_BROWSER, ...HUFI_VOICES];
}
