/**
 * Notification type configuration: icons, labels, and link-actions.
 * Used by NotificationBell and wherever notifications are displayed.
 */

export interface NotificationTypeConfig {
  icon: string;
  label: string;
  /** Default link if notification.link is null */
  defaultLink?: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
  // Existing types
  chat: { icon: "💬", label: "Chat-Nachricht" },
  appointment: { icon: "📅", label: "Termin aktualisiert" },
  appointment_created: { icon: "📅", label: "Neuer Termin" },
  horse_created: { icon: "🐴", label: "Neues Pferd" },
  horse_updated: { icon: "✏️", label: "Pferdeakte aktualisiert" },
  client_login: { icon: "👋", label: "Kunde eingeloggt" },
  info: { icon: "ℹ️", label: "Information" },

  // Pferdeakte & Zugriffsrechte
  horse_access_granted: { icon: "🔓", label: "Zugriff erhalten", defaultLink: "/partner-horses" },
  horse_access_revoked: { icon: "🔒", label: "Zugriff entzogen", defaultLink: "/partner-home" },
  horse_access_expiring: { icon: "⏰", label: "Zugriff läuft ab" },

  // Dokumente & Uploads
  document_uploaded: { icon: "📄", label: "Neues Dokument" },
  xray_uploaded: { icon: "🔬", label: "Röntgenbild hochgeladen" },
  vaccination_added: { icon: "💉", label: "Impfung eingetragen" },
  vaccination_due: { icon: "⚠️", label: "Impfung fällig" },
  deworming_added: { icon: "💊", label: "Entwurmung eingetragen" },
  deworming_due: { icon: "⚠️", label: "Entwurmung fällig" },

  // Auftragserteilung
  service_order: { icon: "📋", label: "Auftrag" },
  service_order_received: { icon: "📋", label: "Neuer Auftrag", defaultLink: "/anfragen" },
  service_order_accepted: { icon: "✅", label: "Auftrag angenommen" },
  service_order_declined: { icon: "❌", label: "Auftrag abgelehnt" },
  service_order_completed: { icon: "🎉", label: "Auftrag abgeschlossen" },
  service_order_cancelled: { icon: "🚫", label: "Auftrag storniert" },

  // Transfer
  horse_transfer_received: { icon: "🐴", label: "Pferdeübernahme", defaultLink: "/client-home" },
  horse_transfer_completed: { icon: "✅", label: "Transfer abgeschlossen" },
  horse_transfer_declined: { icon: "❌", label: "Transfer abgelehnt" },
  horse_transfer_expiring: { icon: "⏰", label: "Transfer läuft ab" },

  // Status-Meldungen
  horse_status_stolen: { icon: "🚨", label: "Diebstahl gemeldet", defaultLink: "/mission-control" },
  horse_status_deceased: { icon: "🕊️", label: "Pferd verstorben" },

  // Cross-provider notifications
  partner_treatment: { icon: "💜", label: "Neuer Befund" },
  partner_treatment_relevant: { icon: "🔔", label: "Befund relevant" },
  partner_recommendation: { icon: "💡", label: "Empfehlung erhalten" },
  owner_diary_shared: { icon: "📝", label: "Besitzer-Notiz" },
};

/**
 * Get notification icon for a given type.
 */
export function getNotificationIcon(type: string | null): string {
  if (!type) return "🔔";
  return NOTIFICATION_TYPE_CONFIG[type]?.icon || "🔔";
}

/**
 * Get default link for a notification type (fallback if notification.link is null).
 */
export function getNotificationDefaultLink(type: string | null): string | null {
  if (!type) return null;
  return NOTIFICATION_TYPE_CONFIG[type]?.defaultLink || null;
}
