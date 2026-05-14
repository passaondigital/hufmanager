// User-isolierter localStorage: alle Keys bekommen ein userId-Suffix damit
// sich Daten verschiedener Nutzer auf demselben Gerät nicht vermischen.
// Migration: beim ersten Lesen wird der alte globale Key (ohne Suffix) übernommen
// und der User-Key gesetzt – der globale bleibt absichtlich stehen, damit
// andere noch nicht geupdatete Code-Pfade nicht brechen.

export const USER_STORAGE_KEYS = {
  KI_CONSENT:         "hufi_ki_consent",
  VOICE_GREETING:     "hufi_voice_greeting_enabled",
  HEY_HUFI:          "hufi_hey_hufi_enabled",
  VOICE_MANUAL:       "hufi_voice_manual_confirm",
  VOICE_ID:           "hufi_elevenlabs_voice_id",
  VOICE_NAME:         "hufi_elevenlabs_voice_name",
  VOICE_MODEL:        "hufi_elevenlabs_model",
  FIRST_RUN:          "hufi_firstrun_consent_v1",
  USER_LAT:           "hufi_user_lat",
  USER_LON:           "hufi_user_lon",
} as const;

function ukey(userId: string, key: string): string {
  return `${key}__u${userId.slice(-8)}`;
}

export function ulget(userId: string, key: string): string | null {
  if (!userId) return localStorage.getItem(key);
  const k = ukey(userId, key);
  const v = localStorage.getItem(k);
  if (v !== null) return v;
  // Migration: alter globaler Key → user-spezifisch kopieren
  const legacy = localStorage.getItem(key);
  if (legacy !== null) localStorage.setItem(k, legacy);
  return legacy;
}

export function ulset(userId: string, key: string, value: string): void {
  if (!userId) { localStorage.setItem(key, value); return; }
  localStorage.setItem(ukey(userId, key), value);
}

export function ulremove(userId: string, key: string): void {
  if (!userId) { localStorage.removeItem(key); return; }
  localStorage.removeItem(ukey(userId, key));
}

// Beim Logout: user-spezifische Keys (nicht globale) clearen
export function clearUserStorage(userId: string): void {
  if (!userId) return;
  const suffix = `__u${userId.slice(-8)}`;
  const toDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.endsWith(suffix)) toDelete.push(k);
  }
  toDelete.forEach((k) => localStorage.removeItem(k));
}
