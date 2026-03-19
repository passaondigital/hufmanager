import { lazy, type ComponentType } from "react";

export interface WidgetDefinition {
  type: string;
  label: string;
  icon: string;
  defaultWidth: 1 | 2;
  defaultHeight: 1 | 2;
  roles: ("provider" | "partner" | "employee" | "client")[];
  category: string;
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  { type: "kalender_woche", label: "Wochenkalender", icon: "📅", defaultWidth: 2, defaultHeight: 2, roles: ["provider", "partner"], category: "Kalender" },
  { type: "kalender_tag", label: "Tagesansicht", icon: "📅", defaultWidth: 2, defaultHeight: 1, roles: ["provider", "partner", "employee"], category: "Kalender" },
  { type: "naechste_termine", label: "Nächste Termine", icon: "📅", defaultWidth: 1, defaultHeight: 1, roles: ["provider", "partner", "employee"], category: "Kalender" },
  { type: "kunden_uebersicht", label: "Kunden", icon: "👥", defaultWidth: 1, defaultHeight: 1, roles: ["provider"], category: "Kunden" },
  { type: "pferde_uebersicht", label: "Pferde", icon: "🐴", defaultWidth: 2, defaultHeight: 1, roles: ["provider", "partner"], category: "Kunden" },
  { type: "umsatz_woche", label: "Umsatz Woche", icon: "💶", defaultWidth: 2, defaultHeight: 1, roles: ["provider"], category: "Finanzen" },
  { type: "umsatz_monat", label: "Umsatz Monat", icon: "💶", defaultWidth: 2, defaultHeight: 1, roles: ["provider"], category: "Finanzen" },
  { type: "offene_rechnungen", label: "Offene Rechnungen", icon: "📄", defaultWidth: 1, defaultHeight: 1, roles: ["provider"], category: "Finanzen" },
  { type: "anfragen_inbox", label: "Anfragen", icon: "📨", defaultWidth: 1, defaultHeight: 1, roles: ["provider"], category: "Anfragen" },
  { type: "huf_status", label: "Hufstatus", icon: "🐴", defaultWidth: 1, defaultHeight: 1, roles: ["provider"], category: "Pferde" },
  { type: "impfungen_faellig", label: "Impfungen", icon: "💉", defaultWidth: 1, defaultHeight: 1, roles: ["provider"], category: "Pferde" },
  { type: "bewertungen", label: "Bewertungen", icon: "⭐", defaultWidth: 1, defaultHeight: 1, roles: ["provider", "partner"], category: "Feedback" },
  { type: "auftragsstatus", label: "Aufträge", icon: "📋", defaultWidth: 1, defaultHeight: 1, roles: ["provider", "partner"], category: "Aufträge" },
  { type: "wetter", label: "Wetter", icon: "🌤️", defaultWidth: 1, defaultHeight: 1, roles: ["provider", "partner", "employee"], category: "Sonstiges" },
  { type: "notizen", label: "Notizen", icon: "📝", defaultWidth: 1, defaultHeight: 1, roles: ["provider", "partner", "employee"], category: "Sonstiges" },
  { type: "zitat_des_tages", label: "Zitat des Tages", icon: "💬", defaultWidth: 1, defaultHeight: 1, roles: ["provider", "partner", "employee"], category: "Sonstiges" },
  { type: "statistik_kunden", label: "Kunden-Statistik", icon: "📊", defaultWidth: 2, defaultHeight: 1, roles: ["provider"], category: "Analyse" },
  { type: "statistik_pferde", label: "Pferde-Statistik", icon: "📊", defaultWidth: 1, defaultHeight: 1, roles: ["provider"], category: "Analyse" },
  { type: "geburtstage", label: "Geburtstage", icon: "🎂", defaultWidth: 1, defaultHeight: 1, roles: ["provider", "partner"], category: "Sonstiges" },
  { type: "arbeitszeit", label: "Arbeitszeit", icon: "⏱️", defaultWidth: 1, defaultHeight: 1, roles: ["provider", "employee"], category: "Tracking" },
  // Client-specific widgets
  { type: "client_naechster_termin", label: "Nächster Termin", icon: "📅", defaultWidth: 2, defaultHeight: 1, roles: ["client"], category: "Termine" },
  { type: "client_pferde", label: "Meine Pferde", icon: "🐴", defaultWidth: 2, defaultHeight: 1, roles: ["client"], category: "Pferde" },
  { type: "client_gesundheits_feed", label: "Gesundheits-Feed", icon: "💚", defaultWidth: 2, defaultHeight: 2, roles: ["client"], category: "Gesundheit" },
  { type: "client_aktions_center", label: "Aktions-Center", icon: "🔔", defaultWidth: 1, defaultHeight: 1, roles: ["client"], category: "Aufgaben" },
  { type: "client_experten", label: "Meine Experten", icon: "👤", defaultWidth: 1, defaultHeight: 1, roles: ["client"], category: "Team" },
  { type: "client_auftraege", label: "Aufträge", icon: "📋", defaultWidth: 1, defaultHeight: 1, roles: ["client"], category: "Aufträge" },
];

export function getWidgetsForRole(role: "provider" | "partner" | "employee" | "client"): WidgetDefinition[] {
  return WIDGET_DEFINITIONS.filter((w) => w.roles.includes(role));
}

export function getWidgetDef(type: string): WidgetDefinition | undefined {
  return WIDGET_DEFINITIONS.find((w) => w.type === type);
}

export interface DashboardWidgetData {
  id: string;
  user_id: string;
  widget_type: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_active: boolean;
  settings: Record<string, unknown>;
}

export const DEFAULT_PROVIDER_WIDGETS: Omit<DashboardWidgetData, "id" | "user_id">[] = [
  { widget_type: "kalender_woche", position_x: 0, position_y: 0, width: 2, height: 2, is_active: true, settings: {} },
  { widget_type: "naechste_termine", position_x: 0, position_y: 2, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "anfragen_inbox", position_x: 1, position_y: 2, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "umsatz_woche", position_x: 0, position_y: 3, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "offene_rechnungen", position_x: 1, position_y: 3, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "kunden_uebersicht", position_x: 0, position_y: 4, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "huf_status", position_x: 1, position_y: 4, width: 1, height: 1, is_active: true, settings: {} },
];

export const DEFAULT_PARTNER_WIDGETS: Omit<DashboardWidgetData, "id" | "user_id">[] = [
  { widget_type: "kalender_woche", position_x: 0, position_y: 0, width: 2, height: 2, is_active: true, settings: {} },
  { widget_type: "naechste_termine", position_x: 0, position_y: 2, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "auftragsstatus", position_x: 1, position_y: 2, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "pferde_uebersicht", position_x: 0, position_y: 3, width: 2, height: 1, is_active: true, settings: {} },
];

export const DEFAULT_EMPLOYEE_WIDGETS: Omit<DashboardWidgetData, "id" | "user_id">[] = [
  { widget_type: "kalender_tag", position_x: 0, position_y: 0, width: 2, height: 1, is_active: true, settings: {} },
  { widget_type: "naechste_termine", position_x: 0, position_y: 1, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "arbeitszeit", position_x: 1, position_y: 1, width: 1, height: 1, is_active: true, settings: {} },
];

export const DEFAULT_CLIENT_WIDGETS: Omit<DashboardWidgetData, "id" | "user_id">[] = [
  { widget_type: "client_naechster_termin", position_x: 0, position_y: 0, width: 2, height: 1, is_active: true, settings: {} },
  { widget_type: "client_pferde", position_x: 0, position_y: 1, width: 2, height: 1, is_active: true, settings: {} },
  { widget_type: "client_aktions_center", position_x: 0, position_y: 2, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "client_experten", position_x: 1, position_y: 2, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "client_gesundheits_feed", position_x: 0, position_y: 3, width: 2, height: 2, is_active: true, settings: {} },
  { widget_type: "client_auftraege", position_x: 0, position_y: 5, width: 1, height: 1, is_active: true, settings: {} },
  { widget_type: "wetter", position_x: 1, position_y: 5, width: 1, height: 1, is_active: true, settings: {} },
];
