import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THRESHOLDS = [10, 25, 50, 100];
const PASCAL_EMAIL = "support@hufiapp.de";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    
    // Only allow service_role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Count waitlist entries
    const { count, error } = await supabase
      .from("domain_waitlist")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    const totalCount = count ?? 0;

    // Find the highest threshold that was just crossed
    const crossedThreshold = THRESHOLDS.filter((t) => totalCount >= t).pop();

    if (!crossedThreshold) {
      return new Response(
        JSON.stringify({ message: "Below threshold", count: totalCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we already notified for this threshold (use admin_notes as log)
    const noteKey = `domain-waitlist-${crossedThreshold}`;
    const { data: existingNote } = await supabase
      .from("admin_notes")
      .select("id")
      .eq("title", noteKey)
      .maybeSingle();

    if (existingNote) {
      return new Response(
        JSON.stringify({ message: "Already notified", threshold: crossedThreshold, count: totalCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the notification
    await supabase.from("admin_notes").insert({
      title: noteKey,
      content: `${totalCount} Provider warten auf Domains. Schwellenwert ${crossedThreshold} erreicht.`,
      type: "info",
      priority: "high",
      status: "open",
    });

    // Find Pascal's admin user to send notification
    const { data: pascalProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", PASCAL_EMAIL)
      .maybeSingle();

    if (pascalProfile?.id) {
      await supabase.from("notifications").insert({
        user_id: pascalProfile.id,
        title: "Domain-Warteliste wächst! 🌐",
        message: `${totalCount} Provider warten auf eigene Domains — jetzt wäre ein guter Zeitpunkt den Registrar-Vertrag zu starten.`,
        type: "info",
        link: "/admin/god-mode?view=domains",
      });
    }

    return new Response(
      JSON.stringify({ message: "Threshold notification sent", threshold: crossedThreshold, count: totalCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-domain-waitlist error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
