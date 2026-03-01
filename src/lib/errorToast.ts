import { toast } from "sonner";
import { getFriendlyError } from "./friendlyErrors";

/**
 * Show an actionable error toast with a solution.
 * Uses the friendlyErrors map to convert technical errors
 * into human-readable German messages with concrete actions.
 */
export function showErrorToast(error: unknown, options?: {
  /** Override the default action */
  action?: { label: string; onClick: () => void };
  /** Duration in ms (default 6000) */
  duration?: number;
}) {
  const friendly = getFriendlyError(error);

  toast.error(friendly.title, {
    description: friendly.description,
    duration: options?.duration ?? 6000,
    action: options?.action
      ? { label: options.action.label, onClick: options.action.onClick }
      : friendly.action
        ? {
            label: friendly.action.label,
            onClick: () => {
              window.location.href = friendly.action!.url;
            },
          }
        : undefined,
  });
}

/**
 * Show a network error toast with offline-aware messaging.
 */
export function showNetworkErrorToast() {
  if (!navigator.onLine) {
    toast.info("Keine Verbindung", {
      description: "Deine Änderung wurde lokal gespeichert und wird automatisch synchronisiert.",
      duration: 4000,
      action: {
        label: "OK, verstanden",
        onClick: () => {},
      },
    });
  } else {
    toast.error("Verbindungsfehler", {
      description: "Der Server antwortet nicht. Bitte versuche es gleich erneut.",
      duration: 5000,
      action: {
        label: "Nochmal versuchen",
        onClick: () => window.location.reload(),
      },
    });
  }
}

/**
 * Show session expired toast with login redirect.
 */
export function showSessionExpiredToast() {
  toast.error("Sitzung abgelaufen", {
    description: "Du wurdest automatisch abgemeldet. Deine Daten sind sicher gespeichert.",
    duration: 8000,
    action: {
      label: "Wieder anmelden",
      onClick: () => {
        window.location.href = "/auth";
      },
    },
  });
}

/**
 * Show upload error toast.
 */
export function showUploadErrorToast(retry?: () => void) {
  toast.error("Upload fehlgeschlagen", {
    description: "Das Foto konnte nicht hochgeladen werden. Versuche es mit einer kleineren Dateigröße.",
    duration: 6000,
    action: retry
      ? { label: "Nochmal versuchen", onClick: retry }
      : undefined,
  });
}
