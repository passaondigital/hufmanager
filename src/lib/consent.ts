import { supabase } from "@/integrations/supabase/client";

export async function logConsent(consentType: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("consent_log").insert({
    user_id: user.id,
    consent_type: consentType,
    accepted_at: new Date().toISOString(),
    ip_address: null, // IP is captured server-side via RLS/headers if needed
  });
}
