// ============================================
// TypeScript Types für Horse & Profile
// Basierend auf dem erweiterten Datenmodell
// ============================================

// Enums für Dropdowns
export type ClientType = 'private' | 'commercial';
export type LifecycleStatus = 'new' | 'active' | 'archive';
export type PaymentRating = 'A' | 'B' | 'C' | 'D';
export type HoldingType = 'box' | 'open_stable' | 'mixed' | 'pasture';
export type UsageType = 'leisure' | 'sport' | 'western' | 'dressage' | 'jumping' | 'breeding' | 'therapy' | 'school' | 'retirement';

// Profile / Client (#KID)
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  readable_id: string | null;
  created_at: string | null;
  deleted_at: string | null;
  created_by_provider_id: string | null;
  has_logged_in: boolean;
  organization_id: string | null;
  org_role: string | null;
  emergency_contacts: EmergencyContact[] | null;
  
  // Stammdaten
  first_name: string | null;
  last_name: string | null;
  street: string | null;
  house_number: string | null;
  zip_code: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  phone_landline: string | null;
  phone_mobile: string | null;
  
  // GPS
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  
  // Business-Logik
  client_type: ClientType | null;
  lifecycle_status: LifecycleStatus | null;
  payment_rating: PaymentRating | null;
  order_authorization: boolean;
  reliability_score: number | null; // 1-5
  working_conditions: string | null;
  
  // Rechtliches
  digital_signature_url: string | null;
  permissions_granted: string[] | null;
}

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

// Horse / Equine (#EQID)
export interface Horse {
  id: string;
  name: string;
  nickname: string | null;
  official_name: string | null;
  breed: string | null;
  birth_year: number | null;
  birth_date: string | null;
  gender: string | null;
  color: string | null;
  height: string | null;
  height_cm: number | null;
  chip_number: string | null;
  discipline: string | null;
  usage: string | null;
  housing: string | null;
  feeding_notes: string | null;
  health_status: string | null;
  medical_history: string | null;
  health_issues_general: string | null;
  hoof_type: string | null;
  hoof_protection: string | null;
  hoof_measurements: HoofMeasurements | null;
  hoof_details: HoofDetails | null;
  shoeing_status: boolean;
  shoeing_interval: number | null;
  special_notes: string | null;
  contacts: HorseContacts | null;
  photo_url: string | null;
  owner_id: string;
  last_anamnesis_date: string | null;
  anamnesis_interval_months: number;
  readable_id?: string | null;
  equine_type?: string | null;
  
  // GPS
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  stable_address_gps?: StableAddressGPS | null;
  
  // Haltung
  holding_type?: HoldingType | null;
  usage_type?: UsageType | null;
  
  // Logik
  is_new_horse?: boolean;
  last_appointment_date?: string | null;
  next_appointment_due?: string | null;
  documents_urls?: string[] | null;
}

export interface StableAddressGPS {
  lat?: number;
  lng?: number;
  address?: string;
}

export interface HoofMeasurements {
  vl?: string; // Vorne Links
  vr?: string; // Vorne Rechts
  hl?: string; // Hinten Links
  hr?: string; // Hinten Rechts
}

export interface HoofDetails {
  vl?: HoofDetailEntry;
  vr?: HoofDetailEntry;
  hl?: HoofDetailEntry;
  hr?: HoofDetailEntry;
}

export interface HoofDetailEntry {
  size?: number;
  condition?: 'good' | 'moderate' | 'poor' | 'cracked';
  stance?: 'straight' | 'toed-in' | 'toed-out' | 'club';
  issues?: string[];
}

export interface HorseContacts {
  vet?: string;
  vet_phone?: string;
  vet_partner_profile_id?: string;
  trainer?: string;
  trainer_phone?: string;
  trainer_partner_profile_id?: string;
  stable?: string;
  stable_phone?: string;
  stable_partner_profile_id?: string;
  caretaker?: string;
  caretaker_phone?: string;
  caretaker_partner_profile_id?: string;
  [key: string]: string | undefined;
}

export interface Appointment {
  id: string;
  horse_id: string;
  date: string;
  time: string | null;
  service_type: string | null;
  status: string | null;
  notes: string | null;
  location: string | null;
  duration: number | null;
  price: number | null;
  provider_id: string | null;
  completed_at: string | null;
  is_confirmed_by_client: boolean | null;
  edid?: string | null;
}

export interface HoofPhoto {
  id: string;
  photo_url: string;
  hoof_position: string | null;
  taken_at: string | null;
}

export interface HorseDocument {
  id: string;
  horse_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// Dropdown-Optionen (Labels für UI)
// ============================================

export const CLIENT_TYPE_OPTIONS = [
  { value: 'private', label: 'Privat' },
  { value: 'commercial', label: 'Gewerbe' },
] as const;

export const LIFECYCLE_STATUS_OPTIONS = [
  { value: 'new', label: 'Neukunde', color: 'bg-blue-500' },
  { value: 'active', label: 'Bestandskunde', color: 'bg-green-500' },
  { value: 'archive', label: 'Archiv', color: 'bg-gray-500' },
] as const;

export const PAYMENT_RATING_OPTIONS = [
  { value: 'A', label: 'A - Sehr gut', color: 'bg-green-500', textColor: 'text-green-600' },
  { value: 'B', label: 'B - Gut', color: 'bg-lime-500', textColor: 'text-lime-600' },
  { value: 'C', label: 'C - Mittelmäßig', color: 'bg-amber-500', textColor: 'text-amber-600' },
  { value: 'D', label: 'D - Problematisch', color: 'bg-red-500', textColor: 'text-red-600' },
] as const;

export const RELIABILITY_SCORE_OPTIONS = [
  { value: 1, label: '⭐ Unzuverlässig' },
  { value: 2, label: '⭐⭐ Mäßig' },
  { value: 3, label: '⭐⭐⭐ OK' },
  { value: 4, label: '⭐⭐⭐⭐ Gut' },
  { value: 5, label: '⭐⭐⭐⭐⭐ Sehr zuverlässig' },
] as const;

export const HOLDING_TYPE_OPTIONS = [
  { value: 'box', label: 'Box', icon: '🏠' },
  { value: 'open_stable', label: 'Offenstall', icon: '🌿' },
  { value: 'mixed', label: 'Gemischt', icon: '🔄' },
  { value: 'pasture', label: 'Weide', icon: '🌾' },
] as const;

export const USAGE_TYPE_OPTIONS = [
  { value: 'leisure', label: 'Freizeit' },
  { value: 'sport', label: 'Sport' },
  { value: 'western', label: 'Western' },
  { value: 'dressage', label: 'Dressur' },
  { value: 'jumping', label: 'Springen' },
  { value: 'breeding', label: 'Zucht' },
  { value: 'therapy', label: 'Therapie' },
  { value: 'school', label: 'Schulpferd' },
  { value: 'retirement', label: 'Rentner' },
] as const;

export const HEALTH_STATUS_OPTIONS = [
  { value: 'healthy', label: 'Gesund', color: 'text-green-500' },
  { value: 'acute', label: 'Akut', color: 'text-red-500' },
  { value: 'chronic', label: 'Chronisch', color: 'text-amber-500' },
  { value: 'rehab', label: 'Reha', color: 'text-blue-500' },
] as const;

export const HOOF_PROTECTION_OPTIONS = [
  { value: 'barefoot', label: 'Barhuf', icon: '🦶' },
  { value: 'shoes', label: 'Eisen', icon: '🔧' },
  { value: 'duplo', label: 'Duplo', icon: '🧲' },
  { value: 'glue', label: 'Klebebeschlag', icon: '🩹' },
  { value: 'boots', label: 'Hufschuhe', icon: '👟' },
  { value: 'mixed', label: 'Gemischt', icon: '🔄' },
] as const;

export const USAGE_OPTIONS = [
  'Freizeit',
  'Sport',
  'Beisteller',
  'Zucht',
  'Therapiepferd',
  'Schulpferd',
  'Rentner',
] as const;

export const HOUSING_OPTIONS = [
  'Box',
  'Offenstall',
  'Paddockbox',
  'Weide',
  'Laufstall',
  'Aktivstall',
] as const;

export const PERMISSION_OPTIONS = [
  { value: 'Video', label: 'Videoaufnahmen' },
  { value: 'Foto', label: 'Fotoaufnahmen' },
  { value: 'Marketing', label: 'Marketing/Social Media' },
  { value: 'Schulung', label: 'Schulungsmaterial' },
] as const;
