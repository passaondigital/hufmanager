/**
 * Friendly error messages that explain what happened + how to fix it.
 * Maps technical errors to human-readable German messages.
 */

interface FriendlyError {
  title: string;
  description: string;
  action?: { label: string; url: string };
}

const ERROR_MAP: Record<string, FriendlyError> = {
  // Auth errors
  'User already registered': {
    title: 'Diese E-Mail wird bereits verwendet',
    description: 'Hast du dich vielleicht schon registriert?',
    action: { label: 'Passwort vergessen', url: '/reset-password' },
  },
  'Invalid login credentials': {
    title: 'E-Mail oder Passwort falsch',
    description: 'Prüfe deine Zugangsdaten oder setze dein Passwort zurück.',
    action: { label: 'Passwort zurücksetzen', url: '/reset-password' },
  },
  'Email not confirmed': {
    title: 'E-Mail noch nicht bestätigt',
    description: 'Schau in deinem Posteingang nach der Bestätigungs-Mail. Auch im Spam-Ordner.',
  },
  'Password should be at least 6 characters': {
    title: 'Passwort zu kurz',
    description: 'Dein Passwort muss mindestens 6 Zeichen haben.',
  },

  // Validation errors
  'invalid_iban': {
    title: 'IBAN ungültig',
    description: 'Die IBAN muss mit DE, AT oder CH beginnen und 18-22 Zeichen lang sein.',
  },
  'invalid_vat_id': {
    title: 'UID-Nummer ungültig',
    description: 'Format: ATU12345678 (Österreich) oder DE123456789 (Deutschland).',
  },
  'invalid_email': {
    title: 'E-Mail-Adresse ungültig',
    description: 'Bitte gib eine gültige E-Mail ein, z.B. name@beispiel.de',
  },
  'invalid_phone': {
    title: 'Telefonnummer ungültig',
    description: 'Bitte gib eine gültige Nummer ein, z.B. 0171 1234567',
  },

  // Plan limits
  'Pferde-Limit erreicht': {
    title: 'Pferde-Limit erreicht',
    description: 'Du hast das Maximum deines Plans erreicht. Upgrade für mehr Pferde.',
    action: { label: 'Plan upgraden', url: '/abo-matrix' },
  },

  // Network
  'Failed to fetch': {
    title: 'Keine Verbindung',
    description: 'Prüfe deine Internetverbindung und versuche es erneut.',
  },
  'NetworkError': {
    title: 'Netzwerkfehler',
    description: 'Die Verbindung zum Server ist fehlgeschlagen. Bist du online?',
  },

  // Generic
  '400': {
    title: 'Ungültige Anfrage',
    description: 'Bitte prüfe deine Eingaben und versuche es erneut.',
  },
  '403': {
    title: 'Zugriff verweigert',
    description: 'Du hast keine Berechtigung für diese Aktion.',
  },
  '404': {
    title: 'Nicht gefunden',
    description: 'Das gesuchte Element existiert nicht mehr oder wurde verschoben.',
  },
  '500': {
    title: 'Server-Fehler',
    description: 'Da ist etwas schiefgelaufen. Versuche es in ein paar Sekunden erneut.',
  },
};

/**
 * Convert a technical error into a user-friendly German message.
 */
export function getFriendlyError(error: unknown): FriendlyError {
  const message = error instanceof Error ? error.message : String(error ?? '');

  // Direct match
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) {
      return friendly;
    }
  }

  // HTTP status code match
  const statusMatch = message.match(/\b(400|401|403|404|409|429|500|502|503)\b/);
  if (statusMatch) {
    return ERROR_MAP[statusMatch[1]] ?? {
      title: `Fehler ${statusMatch[1]}`,
      description: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.',
    };
  }

  return {
    title: 'Etwas ist schiefgelaufen',
    description: message || 'Bitte versuche es erneut oder kontaktiere den Support.',
  };
}
