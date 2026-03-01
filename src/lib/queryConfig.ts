/**
 * Centralized React Query configuration
 * All query keys and cache times in one place.
 */

// ─── Cache Time Presets ─────────────────────────────────────────────
export const CACHE_TIMES = {
  /** Real-time data: chat, notifications */
  realtime: {
    staleTime: 0,
    gcTime: 30_000,
  },
  /** Dashboard aggregations */
  dashboard: {
    staleTime: 60_000,       // 1 min
    gcTime: 300_000,         // 5 min
  },
  /** Lists: clients, horses, appointments */
  lists: {
    staleTime: 300_000,      // 5 min
    gcTime: 600_000,         // 10 min
  },
  /** Detail pages: horse detail, invoice detail */
  detail: {
    staleTime: 120_000,      // 2 min
    gcTime: 300_000,         // 5 min
  },
  /** Rarely changing: services, settings, business_settings */
  static: {
    staleTime: 900_000,      // 15 min
    gcTime: 1_800_000,       // 30 min
  },
  /** Immutable per session: user profile, roles */
  session: {
    staleTime: Infinity,
    gcTime: 1_800_000,       // 30 min
  },
} as const;

// ─── Query Key Factories ────────────────────────────────────────────
export const QUERY_KEYS = {
  // Provider
  appointments: (providerId: string) => ["appointments", providerId] as const,
  clients: (providerId: string) => ["clients", providerId] as const,
  horses: (providerId: string) => ["horses", providerId] as const,
  services: (providerId: string) => ["services", providerId] as const,
  invoices: (providerId: string) => ["invoices", providerId] as const,
  team: (providerId: string) => ["team", providerId] as const,
  contacts: (providerId: string) => ["contacts", providerId] as const,
  tours: (providerId: string, date: string) => ["tours", providerId, date] as const,

  // Detail
  horse: (horseId: string) => ["horse", horseId] as const,
  invoice: (invoiceId: string) => ["invoice", invoiceId] as const,
  client: (clientId: string) => ["client", clientId] as const,
  appointment: (appointmentId: string) => ["appointment", appointmentId] as const,

  // Settings / static
  businessSettings: (userId: string) => ["business-settings", userId] as const,
  kiSettings: (userId: string) => ["ki-settings", userId] as const,
  subscription: (userId: string) => ["subscription", userId] as const,
  profile: (userId: string) => ["profile", userId] as const,

  // Real-time
  notifications: (userId: string) => ["notifications", userId] as const,
  unreadCount: (userId: string) => ["unread-count", userId] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,

  // Dashboard
  dashboardStats: (providerId: string) => ["dashboard-stats", providerId] as const,

  // Employee
  employees: (providerId: string) => ["employees", providerId] as const,
  employeeProfile: (userId: string) => ["employee-profile", userId] as const,

  // Partner
  partnerGrants: (partnerId: string) => ["partner-grants", partnerId] as const,

  // Admin
  healthChecks: () => ["health-checks"] as const,
  systemAlerts: () => ["system-alerts"] as const,
  performanceMetrics: () => ["performance-metrics"] as const,
} as const;

// ─── Column Selection Presets ───────────────────────────────────────
export const COLUMNS = {
  profileList: "id, full_name, email, phone, avatar_url, readable_id, created_at, city, zip_code, street",
  profileMinimal: "id, full_name, avatar_url, email",
  horseList: "id, name, breed, photo_url, owner_id, readable_id, hoof_type, hoof_protection, color, birth_year, gender",
  horseDetail: "id, name, breed, photo_url, owner_id, readable_id, hoof_type, hoof_protection, color, birth_year, gender, weight_kg, height_cm, medical_history, health_status, special_notes, shoeing_interval_weeks, last_pitstop",
  appointmentList: "id, date, time, status, service_type, price, notes, horse_id, client_id, provider_id, location, duration, group_id, is_emergency",
  invoiceList: "id, invoice_number, status, total_amount, created_at, due_date, client_name, client_email",
  serviceList: "id, name, description, base_price, duration, is_active, booking_action",
} as const;
