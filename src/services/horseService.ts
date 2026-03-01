/**
 * Data Access Layer: Horse Service
 * Centralized, typed queries for horses.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────

export interface HorseSummary {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  readable_id: string | null;
  owner_id: string | null;
  deleted_at: string | null;
}

export interface HorseDetail extends HorseSummary {
  birth_year: number | null;
  gender: string | null;
  color: string | null;
  height_cm: number | null;
  hoof_type: string | null;
  hoof_protection: string | null;
  health_status: string | null;
  medical_history: string | null;
  special_notes: string | null;
  shoeing_interval: number | null;
  location_name: string | null;
  created_at: string;
  updated_at: string;
}

// ── Select strings ───────────────────────────────────────────────────

const HORSE_SUMMARY_SELECT = "id, name, breed, photo_url, readable_id, owner_id, deleted_at";
const HORSE_DETAIL_SELECT = `${HORSE_SUMMARY_SELECT}, birth_year, gender, color, height_cm, hoof_type, hoof_protection, health_status, medical_history, special_notes, shoeing_interval, location_name, created_at, updated_at`;

// ── Functions ────────────────────────────────────────────────────────

export async function fetchHorseById(horseId: string): Promise<HorseDetail | null> {
  const { data, error } = await supabase
    .from("horses")
    .select(HORSE_DETAIL_SELECT)
    .eq("id", horseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as HorseDetail | null;
}

export async function fetchHorsesByOwner(
  ownerId: string,
  limit = 50
): Promise<HorseSummary[]> {
  const { data, error } = await supabase
    .from("horses")
    .select(HORSE_SUMMARY_SELECT)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("name")
    .limit(limit);

  if (error) throw error;
  return (data || []) as HorseSummary[];
}

export async function fetchProviderHorses(
  providerId: string,
  limit = 100
): Promise<HorseSummary[]> {
  // Horses accessible via access_grants
  const { data: grants, error: grantErr } = await supabase
    .from("access_grants")
    .select("client_id")
    .eq("provider_id", providerId)
    .eq("is_active", true);

  if (grantErr) throw grantErr;

  const clientIds = (grants || []).map((g) => g.client_id);
  if (clientIds.length === 0) return [];

  const { data, error } = await supabase
    .from("horses")
    .select(HORSE_SUMMARY_SELECT)
    .in("owner_id", clientIds)
    .is("deleted_at", null)
    .order("name")
    .limit(limit);

  if (error) throw error;
  return (data || []) as HorseSummary[];
}
