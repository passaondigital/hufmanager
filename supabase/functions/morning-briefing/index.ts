import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting morning briefing job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Get all providers
    const { data: providers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "provider");

    if (!providers || providers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No providers found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;

    for (const provider of providers) {
      // Fetch today's appointments for this provider
      const { data: appointments } = await supabase
        .from("appointments")
        .select(`
          id, date, time, service_type, location, is_confirmed_by_client,
          horses!inner (name, owner_id)
        `)
        .eq("date", today)
        .eq("provider_id", provider.user_id)
        .eq("status", "scheduled")
        .order("time", { ascending: true });

      if (!appointments || appointments.length === 0) continue;

      const unconfirmedCount = appointments.filter(a => !a.is_confirmed_by_client).length;
      const firstTime = appointments[0]?.time?.substring(0, 5) || "--:--";

      // Get owner names for display
      const ownerIds = [...new Set(appointments.map((a: any) => a.horses.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const firstClient = profileMap.get((appointments[0] as any).horses.owner_id) || "Unbekannt";

      let body = `Heute: ${appointments.length} Termin(e). Erster: ${firstTime} Uhr bei ${firstClient}.`;
      if (unconfirmedCount > 0) {
        body += ` ⚠️ ${unconfirmedCount} unbestätigt!`;
      }

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: provider.user_id,
        title: "🌅 Morgen-Briefing",
        message: body,
        type: "briefing",
        link: "/work-mode?tab=tour",
      });

      // Send push notification via edge function
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: provider.user_id,
            title: "🌅 Morgen-Briefing",
            body,
            url: "/work-mode?tab=tour",
          }),
        });
        sentCount++;
      } catch (pushError) {
        console.error("Push failed for provider:", pushError);
      }
    }

    console.log(`Morning briefing complete. Sent: ${sentCount}`);

    return new Response(
      JSON.stringify({ message: "Morning briefing sent", sent: sentCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Morning briefing error:", error);
    return new Response(
      JSON.stringify({ error: "Morning briefing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
