/**
 * Offline-First Configuration
 * Central configuration for all offline-related settings
 */

// Query keys that should have infinite stale time (static data)
export const STATIC_QUERY_KEYS = [
  "horses",
  "contacts", 
  "customers",
  "provider-horses",
  "client-horses",
  "services",
  "profiles",
  "business-settings",
  "horse-health-logs",
  "horse-vaccinations",
  "horse-diary-entries",
  "horse-documents",
  "pferdeakte-horse",
  "pferdeakte-status",
] as const;

// Query keys for dynamic data (shorter stale time)
export const DYNAMIC_QUERY_KEYS = [
  "appointments",
  "notifications",
  "messages",
  "invoices",
] as const;

// Tables that support offline mutations
export const OFFLINE_MUTATION_TABLES = [
  "appointments",
  "horses",
  "contacts",
  "hoof_photos",
  "horse_documents",
  "invoices",
  "leads",
  "messages",
  "hoof_analyses",
  "vehicle_mileage_logs",
  "horse_health_logs",
  "horse_vaccinations",
  "horse_diary_entries",
  "partner_treatment_notes",
  "horse_status_reports",
] as const;

export type OfflineMutationTable = typeof OFFLINE_MUTATION_TABLES[number];

// Max retry count for failed sync actions
export const MAX_SYNC_RETRIES = 5;

// Sync check interval in milliseconds (2 minutes)
export const SYNC_CHECK_INTERVAL = 2 * 60 * 1000;

// Max age for persisted queries (7 days)
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

// IndexedDB keys
export const IDB_KEYS = {
  QUERY_CACHE: "hufmanager-query-cache",
  SYNC_QUEUE: "hufmanager-sync-queue",
  OFFLINE_IMAGES: "hufmanager-offline-images",
  LAST_SYNC: "hufmanager-last-sync",
} as const;
