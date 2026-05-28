import { supabase } from "@/integrations/supabase/client";

export type OnboardingType = "new_user" | "hufmanager_migration" | "returning";

export interface HufManagerStats {
  clientCount: number;
  horseCount: number;
  appointmentCount: number;
  invoiceCount: number;
  fullName: string | null;
}

export async function detectOnboardingType(userId: string): Promise<OnboardingType> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.onboarding_completed === true) return "returning";

  const [appts, horses, clients] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", userId),
    supabase
      .from("horses")
      .select("id", { count: "exact", head: true })
      .or(`owner_id.eq.${userId},provider_id.eq.${userId}`),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", userId),
  ]);

  const hasData =
    (appts.count ?? 0) > 0 ||
    (horses.count ?? 0) > 0 ||
    (clients.count ?? 0) > 0;

  return hasData ? "hufmanager_migration" : "new_user";
}

export async function loadHufManagerStats(userId: string): Promise<HufManagerStats> {
  const today = new Date().toISOString().split("T")[0];

  const [profileRes, clientsRes, horsesRes, apptsRes, invoicesRes] = await Promise.allSettled([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("provider_id", userId),
    supabase.from("horses").select("id", { count: "exact", head: true }).or(`owner_id.eq.${userId},provider_id.eq.${userId}`),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("provider_id", userId).gte("date", today),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("provider_id", userId),
  ]);

  return {
    fullName: profileRes.status === "fulfilled" ? (profileRes.value.data as { full_name: string } | null)?.full_name ?? null : null,
    clientCount: clientsRes.status === "fulfilled" ? (clientsRes.value.count ?? 0) : 0,
    horseCount: horsesRes.status === "fulfilled" ? (horsesRes.value.count ?? 0) : 0,
    appointmentCount: apptsRes.status === "fulfilled" ? (apptsRes.value.count ?? 0) : 0,
    invoiceCount: invoicesRes.status === "fulfilled" ? (invoicesRes.value.count ?? 0) : 0,
  };
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);
}
