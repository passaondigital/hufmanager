import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CopecartAffiliateEvent {
  event_type: "affiliate_sale" | "affiliate_refund" | "affiliate_cancel";
  product_id?: string;
  affiliate_id?: string;
  customer_email?: string;
  customer_name?: string;
  amount_cents?: number;
  commission_cents?: number;
  order_id?: string;
  referral_code?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("COPECART_WEBHOOK_SECRET");

    // Verify webhook authenticity if secret is configured
    if (webhookSecret) {
      const authHeader = req.headers.get("x-copecart-signature") || req.headers.get("authorization");
      if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: CopecartAffiliateEvent = await req.json();
    console.log("Received affiliate event:", payload.event_type);

    if (!payload.event_type) {
      return new Response(JSON.stringify({ error: "Missing event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the provider by affiliate_id or referral_code
    const lookupField = payload.affiliate_id ? "copecart_affiliate_id" : "referred_email";
    const lookupValue = payload.affiliate_id || payload.customer_email;

    if (!lookupValue) {
      return new Response(JSON.stringify({ error: "No identifier provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.event_type === "affiliate_sale") {
      // Find or create referral record
      const commissionCents = payload.commission_cents || 0;
      const anonymName = payload.customer_name
        ? `Hufpfleger aus ${payload.customer_name.split(" ").pop() || "Deutschland"}`
        : "Anonymisiert";

      // Find the referring provider via affiliate slug or existing referral
      let providerId: string | null = null;

      if (payload.referral_code) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("affiliate_slug", payload.referral_code)
          .maybeSingle();
        providerId = profile?.id || null;
      }

      if (!providerId && payload.affiliate_id) {
        const { data: existingRef } = await supabase
          .from("hufrente_referrals")
          .select("provider_id")
          .eq("copecart_affiliate_id", payload.affiliate_id)
          .limit(1)
          .maybeSingle();
        providerId = existingRef?.provider_id || null;
      }

      if (!providerId) {
        console.error("Could not find provider for affiliate event");
        return new Response(JSON.stringify({ error: "Provider not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert referral
      const { error: refError } = await supabase
        .from("hufrente_referrals")
        .upsert(
          {
            provider_id: providerId,
            referred_email: payload.customer_email || null,
            referred_name_anonymous: anonymName,
            status: "active",
            monthly_commission: (commissionCents / 100),
            copecart_affiliate_id: payload.affiliate_id || null,
            copecart_referral_id: payload.order_id || null,
            activated_at: new Date().toISOString(),
          },
          { onConflict: "copecart_referral_id" }
        );

      if (refError) {
        console.error("Error upserting referral:", refError);
      }

      // Update aggregate stats
      await supabase.rpc("sync_affiliate_stats", { p_provider_id: providerId });

      // Send push notification
      await supabase.from("notifications").insert({
        user_id: providerId,
        type: "hufrente_commission",
        title: "🎉 Neue Hufrente-Provision",
        message: `Neue Provision: +${(commissionCents / 100).toFixed(2)}€`,
        link: "/hufrente",
      });

      console.log(`Affiliate sale processed for provider ${providerId}: +${commissionCents}c`);

    } else if (payload.event_type === "affiliate_cancel" || payload.event_type === "affiliate_refund") {
      // Mark referral as inactive
      if (payload.order_id) {
        await supabase
          .from("hufrente_referrals")
          .update({ status: "inactive", monthly_commission: 0 })
          .eq("copecart_referral_id", payload.order_id);

        // Find provider to update stats
        const { data: ref } = await supabase
          .from("hufrente_referrals")
          .select("provider_id")
          .eq("copecart_referral_id", payload.order_id)
          .maybeSingle();

        if (ref?.provider_id) {
          await supabase.rpc("sync_affiliate_stats", { p_provider_id: ref.provider_id });
        }
      }

      console.log(`Affiliate ${payload.event_type} processed for order ${payload.order_id}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
