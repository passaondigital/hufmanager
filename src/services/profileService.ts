/**
 * Data Access Layer: Profile & Access Service
 * Centralized, typed queries for profiles, contacts, and access grants.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────

export interface ProfileSummary {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  readable_id: string | null;
}

export interface ProfileDetail extends ProfileSummary {
  city: string | null;
  zip_code: string | null;
  stable_street: string | null;
  stable_city: string | null;
  stable_zip: string | null;
  created_at: string;
  created_by_provider_id: string | null;
  deleted_at: string | null;
}

export interface ContactSummary {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  category: string;
  readable_id: string | null;
  zip_code: string | null;
  city: string | null;
  provider_id: string;
  profile_id: string | null;
  deleted_at: string | null;
}

export interface AccessGrantInfo {
  id: string;
  provider_id: string;
  client_id: string;
  is_active: boolean | null;
  status: string;
  can_view_basic: boolean | null;
  can_view_medical: boolean | null;
  can_create_appointments: boolean | null;
}

// ── Select strings ───────────────────────────────────────────────────

const PROFILE_SUMMARY_SELECT = "id, full_name, email, phone, avatar_url, readable_id";
const PROFILE_DETAIL_SELECT = `${PROFILE_SUMMARY_SELECT}, city, zip_code, stable_street, stable_city, stable_zip, created_at, created_by_provider_id, deleted_at`;

const CONTACT_SUMMARY_SELECT = "id, full_name, email, phone, category, readable_id, zip_code, city, provider_id, profile_id, deleted_at";

const ACCESS_GRANT_SELECT = "id, provider_id, client_id, is_active, status, can_view_basic, can_view_medical, can_create_appointments";

// ── Functions ────────────────────────────────────────────────────────

export async function fetchProfileById(userId: string): Promise<ProfileDetail | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_DETAIL_SELECT)
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileDetail | null;
}

export async function fetchProfileSummary(userId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SUMMARY_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileSummary | null;
}

export async function fetchContactsByProvider(
  providerId: string,
  category?: "client" | "partner" | "supplier" | "lead",
  limit = 100
): Promise<ContactSummary[]> {
  let query = supabase
    .from("contacts")
    .select(CONTACT_SUMMARY_SELECT)
    .eq("provider_id", providerId)
    .is("deleted_at", null)
    .order("full_name")
    .limit(limit);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ContactSummary[];
}

export async function fetchActiveAccessGrants(
  providerId: string
): Promise<AccessGrantInfo[]> {
  const { data, error } = await supabase
    .from("access_grants")
    .select(ACCESS_GRANT_SELECT)
    .eq("provider_id", providerId)
    .eq("is_active", true);

  if (error) throw error;
  return (data || []) as AccessGrantInfo[];
}

export async function fetchClientAccessGrant(
  clientId: string,
  providerId: string
): Promise<AccessGrantInfo | null> {
  const { data, error } = await supabase
    .from("access_grants")
    .select(ACCESS_GRANT_SELECT)
    .eq("client_id", clientId)
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data as AccessGrantInfo | null;
}
