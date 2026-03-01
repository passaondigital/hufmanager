/**
 * Data Access Layer: Appointment Service
 * Centralized, typed queries for appointments.
 * Replaces SELECT * with explicit columns everywhere.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Typed return shapes ──────────────────────────────────────────────
export interface AppointmentListItem {
  id: string;
  date: string;
  time: string | null;
  duration: number | null;
  service_type: string | null;
  location: string | null;
  status: string | null;
  is_confirmed_by_client: boolean | null;
  notes: string | null;
  price: number | null;
  applied_price: number | null;
  price_group_applied: string | null;
  horse_id: string;
  client_id: string | null;
  provider_id: string | null;
  group_id: string | null;
  service_id: string | null;
  horses: { id: string; name: string; breed: string | null } | null;
  contacts: { id: string; full_name: string; street: string | null; zip_code: string | null; city: string | null } | null;
}

export interface AppointmentDetail extends AppointmentListItem {
  completion_notes: string | null;
  signature_url: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  gait_analysis_done: boolean | null;
  gait_analysis_ok: boolean | null;
  is_emergency: boolean | null;
  recurring_group_id: string | null;
  tour_order: number | null;
  created_at: string;
  updated_at: string;
}

// ── Explicit select strings ──────────────────────────────────────────

const APPOINTMENT_LIST_SELECT = `
  id, date, time, duration, service_type, location, status,
  is_confirmed_by_client, notes, price, applied_price, price_group_applied,
  horse_id, client_id, provider_id, group_id, service_id,
  horses (id, name, breed),
  contacts:client_id (id, full_name, street, zip_code, city)
` as const;

const APPOINTMENT_DETAIL_SELECT = `
  id, date, time, duration, service_type, location, status,
  is_confirmed_by_client, notes, price, applied_price, price_group_applied,
  horse_id, client_id, provider_id, group_id, service_id,
  completion_notes, signature_url, signed_at, signed_by_name,
  gait_analysis_done, gait_analysis_ok, is_emergency,
  recurring_group_id, tour_order, created_at, updated_at,
  horses (id, name, breed),
  contacts:client_id (id, full_name, street, zip_code, city)
` as const;

// ── Service functions ────────────────────────────────────────────────

export async function fetchAppointmentsByDateRange(
  providerId: string,
  startDate: string,
  endDate: string
): Promise<AppointmentListItem[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_LIST_SELECT)
    .eq("provider_id", providerId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as AppointmentListItem[];
}

export async function fetchAppointmentById(
  appointmentId: string
): Promise<AppointmentDetail | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_DETAIL_SELECT)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as AppointmentDetail | null;
}

export async function fetchClientAppointments(
  clientId: string,
  limit = 20
): Promise<AppointmentListItem[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_LIST_SELECT)
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as AppointmentListItem[];
}

export async function fetchHorseAppointments(
  horseId: string,
  providerId?: string,
  limit = 50
): Promise<AppointmentListItem[]> {
  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_LIST_SELECT)
    .eq("horse_id", horseId)
    .order("date", { ascending: false })
    .limit(limit);

  if (providerId) {
    query = query.eq("provider_id", providerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as AppointmentListItem[];
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", appointmentId);

  if (error) throw error;
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime?: string
): Promise<void> {
  const update: Record<string, string> = { 
    date: newDate, 
    updated_at: new Date().toISOString() 
  };
  if (newTime) update.time = newTime;

  const { error } = await supabase
    .from("appointments")
    .update(update)
    .eq("id", appointmentId);

  if (error) throw error;
}
