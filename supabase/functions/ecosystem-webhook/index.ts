import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { source_app, event, ecosystem_user_id, partner_email, grant_id } = body;

    // Validate required fields
    if (!source_app || !event || !grant_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: source_app, event, grant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle partner_accepted / partner_rejected events
    if (event === "partner_accepted" || event === "partner_rejected") {
      const newStatus = event === "partner_accepted" ? "active" : "rejected";
      const isActive = event === "partner_accepted";

      // Update the access_grant
      const { data: grant, error: updateError } = await supabase
        .from("access_grants")
        .update({
          status: newStatus,
          is_active: isActive,
          ...(event === "partner_accepted"
            ? { granted_at: new Date().toISOString() }
            : { revoked_at: new Date().toISOString() }),
        })
        .eq("id", grant_id)
        .select("provider_id, client_id, partner_name, partner_email")
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine who to notify (the person who sent the invitation)
      const notifyUserId = ecosystem_user_id || grant?.provider_id;
      const partnerName = grant?.partner_name || partner_email || "Ein Partner";

      if (notifyUserId) {
        const title = event === "partner_accepted"
          ? "Partner-Einladung angenommen"
          : "Partner-Einladung abgelehnt";

        const message = event === "partner_accepted"
          ? `${partnerName} hat deine Einladung angenommen und kann jetzt auf die freigegebenen Daten zugreifen.`
          : `${partnerName} hat deine Einladung abgelehnt.`;

        await supabase.from("notifications").insert({
          user_id: notifyUserId,
          title,
          message,
          type: "ecosystem",
          link: "/netzwerk",
        });
      }

      return new Response(
        JSON.stringify({ success: true, status: newStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown event: ${event}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
