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
    // Auth guard: only allow service_role or anon key (cron jobs)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    if (token !== supabaseServiceKey && token !== anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[autoflow-auto-invoice] Starting...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { appointment_id, trigger_type } = body;
    // trigger_type: "on_completion" or "after_signature"

    if (!appointment_id) {
      return new Response(
        JSON.stringify({ error: "appointment_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id, provider_id, horse_id, date, service_type, price, 
        signed_at, signed_by_name, completed_at, status,
        horses!inner (name, owner_id)
      `)
      .eq("id", appointment_id)
      .single();

    if (appointmentError || !appointment) {
      console.error("[autoflow-auto-invoice] Appointment not found:", appointmentError);
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if provider has auto-invoice enabled
    const { data: settings } = await supabase
      .from("autoflow_settings")
      .select("auto_invoice_enabled, auto_invoice_trigger, autoflow_mode")
      .eq("provider_id", appointment.provider_id)
      .maybeSingle();

    if (!settings?.auto_invoice_enabled) {
      console.log("[autoflow-auto-invoice] Auto-invoice disabled");
      await logAction(supabase, appointment.provider_id, "auto_invoice", "appointment", appointment_id, "skipped", {
        reason: "Auto-invoice disabled",
      });
      return new Response(
        JSON.stringify({ message: "Auto-invoice disabled", created: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check trigger matches
    if (trigger_type && trigger_type !== settings.auto_invoice_trigger) {
      console.log(`[autoflow-auto-invoice] Trigger mismatch: ${trigger_type} vs ${settings.auto_invoice_trigger}`);
      return new Response(
        JSON.stringify({ message: "Trigger mismatch", created: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invoice already exists for this appointment
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("appointment_id", appointment_id)
      .maybeSingle();

    if (existingInvoice) {
      console.log("[autoflow-auto-invoice] Invoice already exists");
      return new Response(
        JSON.stringify({ message: "Invoice already exists", created: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get owner profile for invoice
    const horse = appointment.horses as any;
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", horse.owner_id)
      .single();

    // Get contact record if exists
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, full_name, email, street, zip_code, city")
      .eq("provider_id", appointment.provider_id)
      .eq("profile_id", horse.owner_id)
      .maybeSingle();

    // Generate invoice number
    const { data: invoiceNumber } = await supabase
      .rpc("generate_invoice_number", { p_provider_id: appointment.provider_id });

    // Create invoice
    const invoiceData = {
      provider_id: appointment.provider_id,
      client_id: contact?.id || null,
      appointment_id: appointment.id,
      invoice_number: invoiceNumber || `RE-AUTO-${Date.now()}`,
      status: "draft",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      subtotal: appointment.price || 0,
      tax_amount: Math.round((appointment.price || 0) * 0.19 * 100) / 100,
      total: Math.round((appointment.price || 0) * 1.19 * 100) / 100,
      items: [{
        description: appointment.service_type || "Hufbearbeitung",
        horse_name: horse.name,
        quantity: 1,
        unit_price: appointment.price || 0,
        total: appointment.price || 0,
      }],
      notes: `Automatisch erstellt via AutoFlow – Termin am ${new Date(appointment.date).toLocaleDateString("de-DE")}`,
      client_name: contact?.full_name || ownerProfile?.full_name || "Unbekannt",
      client_email: contact?.email || ownerProfile?.email || null,
      client_address: contact ? `${contact.street || ""}\n${contact.zip_code || ""} ${contact.city || ""}`.trim() : null,
    };

    const { data: newInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select("id, invoice_number")
      .single();

    if (invoiceError) {
      console.error("[autoflow-auto-invoice] Invoice creation failed:", invoiceError);
      await logAction(supabase, appointment.provider_id, "auto_invoice", "appointment", appointment_id, "failed", {
        error: invoiceError.message,
      });
      throw invoiceError;
    }

    // Notify provider
    await supabase.from("notifications").insert({
      user_id: appointment.provider_id,
      title: "📄 Auto-Rechnung erstellt",
      message: `Rechnung ${newInvoice.invoice_number} für ${horse.name} wurde automatisch erstellt.`,
      type: "autoflow",
      link: "/rechnungen",
    });

    // Notify client about available invoice
    if (horse.owner_id) {
      await supabase.from("notifications").insert({
        user_id: horse.owner_id,
        title: "Neue Rechnung verfügbar",
        message: `Eine Rechnung für ${horse.name} ist verfügbar.`,
        type: "invoice",
        link: "/client-home",
      });
    }

    await logAction(supabase, appointment.provider_id, "auto_invoice", "appointment", appointment_id, "success", {
      invoice_id: newInvoice.id,
      invoice_number: newInvoice.invoice_number,
      total: invoiceData.total,
    });

    console.log(`[autoflow-auto-invoice] Invoice ${newInvoice.invoice_number} created`);

    return new Response(
      JSON.stringify({ message: "Invoice created", invoice_id: newInvoice.id, invoice_number: newInvoice.invoice_number }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[autoflow-auto-invoice] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Auto-invoice failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logAction(
  supabase: any,
  providerId: string,
  actionType: string,
  entityType: string,
  entityId: string,
  status: string,
  details: Record<string, any>
) {
  try {
    await supabase.from("autoflow_log").insert({
      provider_id: providerId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      status,
      details,
    });
  } catch (e) {
    console.error("[autoflow-log] Failed to log:", e);
  }
}
