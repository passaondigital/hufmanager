export interface Horse {
  id: string;
  name: string;
  nickname: string | null;
  breed: string | null;
  birth_year: number | null;
  gender: string | null;
  color: string | null;
  height: string | null;
  discipline: string | null;
  usage: string | null;
  housing: string | null;
  feeding_notes: string | null;
  health_status: string | null;
  medical_history: string | null;
  hoof_type: string | null;
  hoof_protection: string | null;
  hoof_measurements: HoofMeasurements | null;
  shoeing_interval: number | null;
  special_notes: string | null;
  contacts: HorseContacts | null;
  photo_url: string | null;
  owner_id: string;
}

export interface HoofMeasurements {
  vl?: string; // Vorne Links
  vr?: string; // Vorne Rechts
  hl?: string; // Hinten Links
  hr?: string; // Hinten Rechts
}

export interface HorseContacts {
  vet?: string;
  vet_phone?: string;
  trainer?: string;
  trainer_phone?: string;
  stable?: string;
  stable_phone?: string;
  caretaker?: string;
  caretaker_phone?: string;
}

export interface Appointment {
  id: string;
  date: string;
  time: string | null;
  service_type: string | null;
  status: string | null;
  notes: string | null;
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
