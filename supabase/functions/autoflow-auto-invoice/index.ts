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
    // Auth guard: only allow service_role key (cron jobs use service_role)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    if (token !== supabaseServiceKey) {
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

    // P1-2 (Correction Pass 4): invoices hat keine appointment_id-Spalte
    // (nie hatte — siehe Migrationshistorie und live PROD information_schema,
    // geprüft 2026-09-17). Die Verknüpfung läuft über die bestehende
    // invoice_appointments-Tabelle, die die kanonische RPC weiter unten
    // atomar mitschreibt.
    //
    // P1-1 (Correction Pass 5): dieser SELECT ist nur noch ein günstiger
    // Schnellausstieg, NICHT die Garantie. Die eigentliche Idempotenz liegt
    // im partiellen Unique-Index idx_invoice_appointments_autoflow_unique
    // (source='autoflow'), der in derselben Transaktion wie die Rechnung
    // greift — ein Check-then-create-Race kann hier also keine zweite
    // Rechnung mehr erzeugen. Der Filter auf source spiegelt den Index
    // exakt: manuelle Verknüpfungen (source IS NULL) zählen nicht als
    // "schon automatisch abgerechnet".
    const { data: existingLink } = await supabase
      .from("invoice_appointments")
      .select("invoice_id")
      .eq("appointment_id", appointment_id)
      .eq("source", "autoflow")
      .maybeSingle();

    if (existingLink) {
      console.log("[autoflow-auto-invoice] Invoice already exists");
      return new Response(
        JSON.stringify({ message: "Invoice already exists", created: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const horse = appointment.horses as any;
    if (!horse?.owner_id) {
      console.error("[autoflow-auto-invoice] Horse has no owner_id, cannot determine invoice client");
      await logAction(supabase, appointment.provider_id, "auto_invoice", "appointment", appointment_id, "failed", {
        error: "Horse has no owner_id",
      });
      return new Response(
        JSON.stringify({ error: "Horse has no owner" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invoice number
    const { data: invoiceNumber } = await supabase
      .rpc("generate_invoice_number", { p_provider_id: appointment.provider_id });

    // P1-2: Kopf + Position werden jetzt atomar über dieselbe kanonische
    // RPC-Familie wie create_invoice_with_items geschrieben (siehe
    // supabase/migrations/20260917130000_add_create_invoice_with_items_for_
    // provider_v1.sql — service_role-only, kein direkter Zwei-Write-Pfad
    // mehr, kein Head-only-Invoice bei Item-Fehler mehr möglich). client_id
    // ist die profiles.id des Pferdebesitzers (invoices.client_id verweist
    // per FK auf profiles, nicht auf contacts — der bisherige Code setzte
    // hier fälschlich die contacts.id ein).
    const unitPrice = appointment.price || 0;
    const totalAmount = Math.round(unitPrice * 100) / 100;

    const { data: rpcResult, error: invoiceError } = await supabase.rpc(
      "create_invoice_with_items_for_provider",
      {
        p_provider_id: appointment.provider_id,
        p_appointment_id: appointment.id,
        p_invoice: {
          provider_id: appointment.provider_id,
          client_id: horse.owner_id,
          horse_id: appointment.horse_id,
          invoice_number: invoiceNumber || `RE-AUTO-${Date.now()}`,
          issue_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          total_amount: totalAmount,
          status: "draft",
          customer_type: "client",
          notes: `Automatisch erstellt via AutoFlow – Termin am ${new Date(appointment.date).toLocaleDateString("de-DE")}`,
        },
        p_items: [{
          inventory_item_id: null,
          title: appointment.service_type || "Hufbearbeitung",
          quantity: 1,
          unit_price: unitPrice,
          total_price: totalAmount,
        }],
      },
    );

    // P1-1: verlorenes Rennen (paralleles Completion-/Signature-Event, doppelt
    // gefeuerter Trigger, pg_net-Retry) ist kein Fehler, sondern genau das
    // gewünschte Ergebnis: es existiert bereits eine automatische Rechnung,
    // und diese Transaktion hat nichts hinterlassen. HINT kommt aus der RPC
    // (siehe 20260917130000_…sql) und ist der stabile Vertrag dafür.
    if (invoiceError && (invoiceError.hint === "autoflow_duplicate" || invoiceError.code === "23505")) {
      console.log("[autoflow-auto-invoice] Invoice already exists (idempotency key)");
      return new Response(
        JSON.stringify({ message: "Invoice already exists", created: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invoiceError) {
      console.error("[autoflow-auto-invoice] Invoice creation failed:", invoiceError);
      await logAction(supabase, appointment.provider_id, "auto_invoice", "appointment", appointment_id, "failed", {
        error: invoiceError.message,
      });
      throw invoiceError;
    }

    const newInvoice = rpcResult as { id: string; invoice_number: string | null };

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
      total: totalAmount,
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
