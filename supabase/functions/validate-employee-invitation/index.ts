import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (!token || typeof token !== "string" || token.length < 10) {
      return new Response(JSON.stringify({ error: "Ungültiger Token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch employee by invitation token using service role (bypasses RLS)
    const { data: employee, error: empError } = await supabaseAdmin
      .from("employee_profiles")
      .select("id, full_name, email, invitation_sent_at, provider:profiles!employee_profiles_provider_id_fkey(full_name)")
      .eq("invitation_token", token)
      .is("invitation_accepted_at", null)
      .single();

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: "Einladung ungültig oder bereits verwendet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry (7 days)
    if (employee.invitation_sent_at) {
      const sentAt = new Date(employee.invitation_sent_at);
      const expiresAt = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() > expiresAt) {
        return new Response(JSON.stringify({ error: "Diese Einladung ist abgelaufen" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      id: employee.id,
      full_name: employee.full_name,
      email: employee.email,
      provider_name: (employee.provider as { full_name: string })?.full_name || "Unbekannt",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[validate-employee-invitation] Error:", e.message);
    return new Response(JSON.stringify({ error: "Ein Fehler ist aufgetreten" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
