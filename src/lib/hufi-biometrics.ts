// ── HufiBiometrics — WebAuthn-based biometric authentication ─────────────────
// No external dependencies. Uses only standard Web Authentication API.
import { supabase } from "@/integrations/supabase/client";

const CRED_KEY_PREFIX = "hufi_biometric_cred_";

// ── Availability check ────────────────────────────────────────────────────────

export function isBiometricsAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.credentials !== "undefined" &&
    typeof PublicKeyCredential !== "undefined"
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function credKey(userId: string): string {
  return `${CRED_KEY_PREFIX}${userId}`;
}

type CredentialReference = { id: string; createdAt: string };
async function loadCredentialReference(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("user_profiles").select("webauthn_credentials").eq("id", userId).single();
  if (error) return null;
  const credential = Array.isArray(data?.webauthn_credentials) ? data.webauthn_credentials.find((item: CredentialReference) => typeof item?.id === "string") : null;
  if (!credential?.id) return null;
  localStorage.setItem(credKey(userId), credential.id);
  return credential.id;
}

async function synchronizeCredentialReference(userId: string, credentialId: string) {
  const { data, error } = await supabase.from("user_profiles").select("webauthn_credentials").eq("id", userId).single();
  if (error) throw error;
  const current = Array.isArray(data?.webauthn_credentials) ? data.webauthn_credentials as CredentialReference[] : [];
  if (!current.some(item => item.id === credentialId)) current.push({ id: credentialId, createdAt: new Date().toISOString() });
  const { error: updateError } = await supabase.from("user_profiles").update({ webauthn_credentials: current }).eq("id", userId);
  if (updateError) throw updateError;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerBiometric(opts: {
  userId: string;
  userName: string;
  userDisplayName: string;
}): Promise<{ success: boolean; credentialId: string | null; error?: string }> {
  if (!isBiometricsAvailable()) {
    return { success: false, credentialId: null, error: "WebAuthn nicht verfügbar" };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(opts.userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Hufi",
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: opts.userName,
          displayName: opts.userDisplayName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },  // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: "none",
      },
    });

    if (!credential || credential.type !== "public-key") {
      return { success: false, credentialId: null, error: "Registrierung fehlgeschlagen" };
    }

    const pkCredential = credential as PublicKeyCredential;
    const credentialId = bufferToBase64url(pkCredential.rawId);
    localStorage.setItem(credKey(opts.userId), credentialId);
    await synchronizeCredentialReference(opts.userId, credentialId);

    return { success: true, credentialId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    if (message.includes("NotAllowedError") || message.includes("not allowed")) {
      return { success: false, credentialId: null, error: "Zugriff verweigert oder abgebrochen" };
    }
    console.warn("[HufiBiometrics] registerBiometric error:", err);
    return { success: false, credentialId: null, error: message };
  }
}

// ── Verify ────────────────────────────────────────────────────────────────────

export async function verifyBiometric(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isBiometricsAvailable()) {
    return { success: false, error: "WebAuthn nicht verfügbar" };
  }

  const stored = localStorage.getItem(credKey(userId)) || await loadCredentialReference(userId);
  if (!stored) {
    return { success: false, error: "Kein lokaler oder synchronisierter Credential-Verweis vorhanden. Auf diesem Gerät ist eine neue Passkey-Registrierung erforderlich." };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credentialId = base64urlToBuffer(stored);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: "public-key",
            id: credentialId,
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (!assertion) {
      return { success: false, error: "Verifikation fehlgeschlagen" };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.warn("[HufiBiometrics] verifyBiometric error:", err);
    return { success: false, error: message };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hasBiometricRegistered(userId: string): boolean {
  return localStorage.getItem(credKey(userId)) !== null;
}

export function removeBiometricRegistration(userId: string): void {
  localStorage.removeItem(credKey(userId));
}
