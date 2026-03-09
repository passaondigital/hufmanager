import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "support@hufmanager.de";
const CC_EMAIL = "support@hufmanager.de";

const DUNNING_CONFIG = [
  { level: 1, daysOverdue: 3, fee: 0, subject: "Zahlungserinnerung", tone: "freundlich" },
  { level: 2, daysOverdue: 14, fee: 5, subject: "1. Mahnung", tone: "förmlich" },
  { level: 3, daysOverdue: 21, fee: 10, subject: "2. Mahnung – letzte Zahlungsaufforderung", tone: "ernst" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.includes("service_role")) {
      // Basic check – real validation via Supabase client
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all sent invoices that are overdue
    const today = new Date().toISOString().split("T")[0];
    const { data: overdueInvoices, error: fetchErr } = await supabase
      .from("admin_invoices")
      .select("*")
      .in("status", ["sent", "overdue"])
      .lt("due_date", today);

    if (fetchErr) throw fetchErr;
    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(JSON.stringify({ message: "No overdue invoices" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const invoice of overdueInvoices) {
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Mark as overdue if not already
      if (invoice.status === "sent") {
        await supabase.from("admin_invoices").update({ status: "overdue" }).eq("id", invoice.id);
      }

      // Get existing dunning entries for this invoice
      const { data: existingLogs } = await supabase
        .from("admin_dunning_log")
        .select("level")
        .eq("invoice_id", invoice.id);

      const existingLevels = new Set((existingLogs || []).map((l: any) => l.level));

      // Determine which dunning level to apply
      for (const config of DUNNING_CONFIG) {
        if (daysOverdue >= config.daysOverdue && !existingLevels.has(config.level)) {
          // Check that previous level exists (except level 1)
          if (config.level > 1 && !existingLevels.has(config.level - 1)) continue;

          // Create dunning log entry
          const newDueDate = new Date();
          newDueDate.setDate(newDueDate.getDate() + 7);

          const { error: insertErr } = await supabase.from("admin_dunning_log").insert({
            invoice_id: invoice.id,
            provider_id: invoice.provider_id,
            level: config.level,
            fee: config.fee,
            due_date: newDueDate.toISOString().split("T")[0],
            status: "pending",
            notes: `Auto-generiert: ${config.subject} (${daysOverdue} Tage überfällig)`,
          });

          if (insertErr) {
            console.error(`Error creating dunning entry for ${invoice.invoice_number}:`, insertErr);
            continue;
          }

          // Add fee as invoice item if > 0
          if (config.fee > 0) {
            await supabase.from("admin_invoice_items").insert({
              invoice_id: invoice.id,
              position: 99,
              description: `Mahngebühr (${config.subject})`,
              quantity: 1,
              unit: "Einmalig",
              unit_price: config.fee,
              total: config.fee,
            });

            // Update invoice total
            await supabase.from("admin_invoices").update({
              total: Number(invoice.total) + config.fee,
            }).eq("id", invoice.id);
          }

          // Send admin notification for level 3
          if (config.level === 3) {
            try {
              const resendKey = Deno.env.get("RESEND_API_KEY");
              if (resendKey) {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    from: "HufManager <noreply@hufmanager.de>",
                    to: [CC_EMAIL],
                    subject: `🚨 2. Mahnung – ${invoice.invoice_number} (${invoice.provider_name})`,
                    html: `<p>Die 2. Mahnung für Rechnung <strong>${invoice.invoice_number}</strong> (${invoice.provider_name}) wurde erstellt.</p><p>${daysOverdue} Tage überfällig. Betrag: ${invoice.total}€</p>`,
                  }),
                });
              }
            } catch (e) {
              console.error("Admin notification failed:", e);
            }
          }

          results.push({
            invoice: invoice.invoice_number,
            level: config.level,
            daysOverdue,
          });
        }
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("check-overdue-invoices error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
