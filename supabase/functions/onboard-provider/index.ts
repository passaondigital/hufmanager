import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 9.90, yearly: 118.80 },
  pro: { monthly: 29, yearly: 348 },
  duo: { monthly: 49, yearly: 588 },
  team: { monthly: 79, yearly: 948 },
};

const PLAN_LIMITS: Record<string, { pferde: string; nutzer: string }> = {
  starter: { pferde: "1–10", nutzer: "1" },
  pro: { pferde: "11–75", nutzer: "1" },
  duo: { pferde: "76–150", nutzer: "2" },
  team: { pferde: "151+", nutzer: "Unbegrenzt" },
};

const PLAN_FEATURES: Record<string, Record<string, string>> = {
  starter: { FEATURE_COCKPIT: "✅", FEATURE_NAV: "✅", FEATURE_SPRIT: "✅", FEATURE_FAHRTENBUCH: "✅", FEATURE_RECHNUNGEN: "✅", FEATURE_PFERDEAKTE: "✅", FEATURE_KI: "❌", FEATURE_TEAM: "❌", FEATURE_CONNECT: "❌" },
  pro: { FEATURE_COCKPIT: "✅", FEATURE_NAV: "✅", FEATURE_SPRIT: "✅", FEATURE_FAHRTENBUCH: "✅", FEATURE_RECHNUNGEN: "✅", FEATURE_PFERDEAKTE: "✅", FEATURE_KI: "✅", FEATURE_TEAM: "❌", FEATURE_CONNECT: "✅" },
  duo: { FEATURE_COCKPIT: "✅", FEATURE_NAV: "✅", FEATURE_SPRIT: "✅", FEATURE_FAHRTENBUCH: "✅", FEATURE_RECHNUNGEN: "✅", FEATURE_PFERDEAKTE: "✅", FEATURE_KI: "✅", FEATURE_TEAM: "✅", FEATURE_CONNECT: "✅" },
  team: { FEATURE_COCKPIT: "✅", FEATURE_NAV: "✅", FEATURE_SPRIT: "✅", FEATURE_FAHRTENBUCH: "✅", FEATURE_RECHNUNGEN: "✅", FEATURE_PFERDEAKTE: "✅", FEATURE_KI: "✅", FEATURE_TEAM: "✅", FEATURE_CONNECT: "✅" },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check - must be admin or service_role
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !authHeader.includes(supabaseServiceKey)) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleCheck } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleCheck) {
        return new Response(JSON.stringify({ error: "Admin required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check automation setting
    const { data: autoSetting } = await supabase
      .from("admin_settings").select("value").eq("key", "auto_contract_on_registration").maybeSingle();
    if (autoSetting && autoSetting.value === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "auto_contract disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider_id, plan, payment_method } = await req.json();
    if (!provider_id || !plan) {
      return new Response(JSON.stringify({ error: "provider_id and plan required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch provider profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, readable_id, address, phone")
      .eq("id", provider_id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Provider not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prices = PLAN_PRICES[plan] || PLAN_PRICES.pro;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.pro;
    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.pro;
    const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 1);
    const todayStr = today.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    // Build template variables
    const variables: Record<string, string> = {
      ANBIETER_ADRESSE: "Adresse folgt nach PostIdent",
      PLAN_NAME: planName,
      PLAN_PREIS_MONAT: prices.monthly.toFixed(2).replace(".", ",") + " €",
      PLAN_PREIS_JAHR: prices.yearly.toFixed(2).replace(".", ",") + " €",
      PROVIDER_PID: profile.readable_id || "",
      NUTZER_FIRMA: profile.full_name || "",
      NUTZER_NAME: profile.full_name || "",
      NUTZER_ADRESSE: profile.address || "",
      NUTZER_EMAIL: profile.email || "",
      NUTZER_TELEFON: profile.phone || "",
      PREIS_JAHR_1: (prices.monthly * 10).toFixed(2).replace(".", ",") + " €",
      VERTRAG_START: todayStr,
      VERTRAG_ENDE: endStr,
      ZAHLUNGSART: payment_method === "bank_transfer" ? "Überweisung" : "CopeCart",
      ZAHLUNG_DATUM: "",
      PLAN_PFERDE_LIMIT: limits.pferde,
      PLAN_NUTZER_LIMIT: limits.nutzer,
      ...features,
      VERTRAG_NR: "",
      DATUM: today.toLocaleDateString("de-DE"),
    };

    // Load template
    const { data: template } = await supabase
      .from("contract_templates")
      .select("id, content_html")
      .eq("is_active", true)
      .eq("type", "nutzungsvertrag")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let contentHtml = template?.content_html || null;
    if (contentHtml) {
      // Merge variables
      for (const [key, val] of Object.entries(variables)) {
        contentHtml = contentHtml.split(`{{${key}}}`).join(val);
      }
    }

    // 1. Create contract
    const { data: contract, error: contractError } = await supabase
      .from("admin_contracts")
      .insert({
        provider_id: provider_id,
        provider_pid: profile.readable_id || "",
        plan: plan,
        plan_price_monthly: prices.monthly,
        plan_price_yearly: prices.yearly,
        period_start: todayStr,
        period_end: endStr,
        auto_renew: true,
        payment_method: payment_method || "copecart",
        status: "sent",
        template_id: template?.id || null,
        content_html: contentHtml,
        variables_used: variables,
      })
      .select()
      .single();

    if (contractError) {
      console.error("[onboard-provider] Contract creation error:", contractError);
      throw contractError;
    }

    // Update contract number in variables
    if (contract?.contract_number) {
      variables.VERTRAG_NR = contract.contract_number;
      // Re-merge with correct contract number
      if (contentHtml) {
        contentHtml = contentHtml.split("{{VERTRAG_NR}}").join(contract.contract_number);
        await supabase.from("admin_contracts")
          .update({ content_html: contentHtml, variables_used: variables })
          .eq("id", contract.id);
      }
    }

    // 2. Timeline event
    await supabase.from("provider_timeline_events").insert({
      provider_id,
      event_type: "contract_created",
      title: "Vertrag auto-generiert",
      description: `Nutzungsvertrag ${planName} erstellt (${contract.contract_number})`,
      icon: "📄",
      is_auto: true,
      metadata: { contract_id: contract.id, plan },
    });

    // 3. Push notification to provider
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: provider_id,
          title: "Dein Vertrag ist bereit 📄",
          body: "Bitte unterzeichne deinen HufManager-Nutzungsvertrag.",
          url: "/management?tab=b2b-management",
        },
      });
    } catch (e) {
      console.error("[onboard-provider] Push failed:", e);
    }

    // 4. Timeline for push
    await supabase.from("provider_timeline_events").insert({
      provider_id,
      event_type: "notification_sent",
      title: "Push + E-Mail gesendet",
      description: "Vertrag zur Unterzeichnung versendet",
      icon: "🔔",
      is_auto: true,
    });

    // 5. Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && profile.email) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "HufManager <support@hufmanager.de>",
          to: [profile.email],
          cc: ["teamhufmanager@gmail.com"],
          subject: "Dein HufManager-Nutzungsvertrag",
          html: `
            <!DOCTYPE html>
            <html><body style="font-family:Arial,sans-serif;margin:0;padding:20px;">
              <div style="max-width:600px;margin:0 auto;">
                <div style="text-align:center;padding:24px 0;border-bottom:2px solid #e5e7eb;">
                  <h1 style="margin:0;font-size:24px;">HufManager</h1>
                </div>
                <div style="padding:24px 0;">
                  <p>Hallo ${profile.full_name || ""},</p>
                  <p>dein Nutzungsvertrag für das <strong>${planName}</strong>-Paket wurde erstellt.</p>
                  <p>Bitte unterzeichne ihn digital in deinem HufManager-Profil.</p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="https://hufmanager.lovable.app/management?tab=b2b-management"
                       style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
                      Jetzt unterzeichnen
                    </a>
                  </div>
                  <p style="font-size:14px;color:#6b7280;">Vertragsnummer: ${contract.contract_number}</p>
                </div>
                <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
                  <p style="font-size:12px;color:#9ca3af;">HufManager · support@hufmanager.de · hufmanager.de</p>
                </div>
              </div>
            </body></html>
          `,
        });
      } catch (e) {
        console.error("[onboard-provider] Email send failed:", e);
      }
    }

    // 6. Create draft invoice (if not copecart)
    const isCopecart = (payment_method || "copecart") === "copecart";
    if (!isCopecart) {
      const { data: invoice } = await supabase
        .from("admin_invoices")
        .insert({
          provider_id,
          provider_pid: profile.readable_id || "",
          provider_name: profile.full_name || "",
          provider_email: profile.email || "",
          plan,
          period_start: todayStr,
          period_end: endStr,
          subtotal: prices.monthly * 10,
          total: prices.monthly * 10,
          status: "sent",
          payment_method: "bank_transfer",
          kleinunternehmer: true,
        })
        .select()
        .single();

      if (invoice) {
        // Create invoice item
        await supabase.from("admin_invoice_items").insert({
          invoice_id: invoice.id,
          description: `HufManager ${planName} – 12 Monate (Vertrauensbonus)`,
          quantity: 1,
          unit: "Jahr",
          unit_price: prices.monthly * 10,
          total: prices.monthly * 10,
        });

        // Timeline
        await supabase.from("provider_timeline_events").insert({
          provider_id,
          event_type: "invoice_created",
          title: `Rechnung ${invoice.invoice_number} erstellt`,
          description: `${(prices.monthly * 10).toFixed(2)} € – ${planName}`,
          icon: "🧾",
          is_auto: true,
          metadata: { invoice_id: invoice.id },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      contract_id: contract.id,
      contract_number: contract.contract_number,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[onboard-provider] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
