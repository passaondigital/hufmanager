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
    console.log("[autoflow-process-lead] Starting...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body (can be called with specific lead_id or process all new leads)
    const body = await req.json().catch(() => ({}));
    const specificLeadId = body.lead_id;

    // Fetch new leads
    let leadsQuery = supabase
      .from("leads")
      .select("*")
      .eq("status", "neu")
      .order("created_at", { ascending: true });

    if (specificLeadId) {
      leadsQuery = leadsQuery.eq("id", specificLeadId);
    } else {
      leadsQuery = leadsQuery.limit(20);
    }

    const { data: leads, error: leadsError } = await leadsQuery;
    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new leads to process", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[autoflow-process-lead] Processing ${leads.length} leads`);

    let processed = 0;
    let skipped = 0;

    for (const lead of leads) {
      try {
        // Check if provider has AutoFlow enabled
        const { data: settings } = await supabase
          .from("autoflow_settings")
          .select("*")
          .eq("provider_id", lead.provider_id)
          .maybeSingle();

        if (!settings?.auto_schedule_enabled) {
          console.log(`[autoflow-process-lead] AutoFlow disabled for provider ${lead.provider_id}`);
          skipped++;
          await logAction(supabase, lead.provider_id, "lead_to_appointment", "lead", lead.id, "skipped", {
            reason: "AutoFlow disabled",
          });
          continue;
        }

        const mode = settings.auto_schedule_mode; // auto, suggest, manual

        if (mode === "manual") {
          // Send booking link to customer - create notification for provider
          await supabase.from("notifications").insert({
            user_id: lead.provider_id,
            title: "Neue Anfrage – Booking-Link senden",
            message: `${lead.name || "Neuer Interessent"} wartet auf einen Buchungslink.`,
            type: "autoflow",
            link: "/anfragen",
          });

          await supabase.from("leads").update({ status: "kontaktiert" }).eq("id", lead.id);

          await logAction(supabase, lead.provider_id, "lead_to_appointment", "lead", lead.id, "success", {
            mode: "manual", action: "booking_link_notified",
          });
          processed++;
          continue;
        }

        // Find available slot
        const slotDays = settings.preferred_slot_days || 7;
        const today = new Date().toISOString().split("T")[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + slotDays);
        const endDateStr = endDate.toISOString().split("T")[0];

        // Get existing appointments to find gaps
        const { data: existingAppointments } = await supabase
          .from("appointments")
          .select("date, time")
          .eq("provider_id", lead.provider_id)
          .gte("date", today)
          .lte("date", endDateStr)
          .in("status", ["scheduled", "confirmed"])
          .order("date", { ascending: true })
          .order("time", { ascending: true });

        // Get provider's business hours
        const { data: bizHours } = await supabase
          .from("business_hours")
          .select("*")
          .eq("provider_id", lead.provider_id);

        // Simple slot finder: find first day with fewer than 6 appointments
        const appointmentsByDate = new Map<string, number>();
        existingAppointments?.forEach((a) => {
          const count = appointmentsByDate.get(a.date) || 0;
          appointmentsByDate.set(a.date, count + 1);
        });

        let suggestedDate: string | null = null;
        let suggestedTime = "09:00";

        for (let d = 0; d < slotDays; d++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + d + 1); // Start from tomorrow
          const dayOfWeek = checkDate.getDay(); // 0=Sun, 6=Sat
          if (dayOfWeek === 0) continue; // Skip Sunday

          const dateStr = checkDate.toISOString().split("T")[0];
          const count = appointmentsByDate.get(dateStr) || 0;

          if (count < 6) {
            suggestedDate = dateStr;
            // Find next available time slot
            const usedTimes = existingAppointments
              ?.filter((a) => a.date === dateStr)
              .map((a) => a.time) || [];
            
            const slots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
            for (const slot of slots) {
              if (!usedTimes.includes(slot)) {
                suggestedTime = slot;
                break;
              }
            }
            break;
          }
        }

        if (!suggestedDate) {
          await supabase.from("notifications").insert({
            user_id: lead.provider_id,
            title: "⚠️ Kein freier Slot gefunden",
            message: `Für ${lead.name || "einen neuen Lead"} konnte kein Termin in den nächsten ${slotDays} Tagen gefunden werden.`,
            type: "autoflow",
            link: "/anfragen",
          });

          await logAction(supabase, lead.provider_id, "lead_to_appointment", "lead", lead.id, "failed", {
            reason: "No available slot",
          });
          skipped++;
          continue;
        }

        if (mode === "suggest") {
          // Notify provider with suggestion
          const formattedDate = new Date(suggestedDate).toLocaleDateString("de-DE", {
            weekday: "short", day: "numeric", month: "long",
          });

          await supabase.from("notifications").insert({
            user_id: lead.provider_id,
            title: "📋 Termin-Vorschlag",
            message: `${lead.name || "Neuer Interessent"}: ${formattedDate} um ${suggestedTime} Uhr. Bestätigen oder anpassen in den Anfragen.`,
            type: "autoflow",
            link: "/anfragen",
          });

          await supabase.from("leads").update({ status: "kontaktiert" }).eq("id", lead.id);

          await logAction(supabase, lead.provider_id, "lead_to_appointment", "lead", lead.id, "success", {
            mode: "suggest", suggested_date: suggestedDate, suggested_time: suggestedTime,
          });
        } else if (mode === "auto") {
          // Auto-create appointment (needs a horse - create placeholder or use existing)
          // For auto mode, we create a notification and update lead status
          // Full auto-booking requires a horse record, so we notify the provider
          const formattedDate = new Date(suggestedDate).toLocaleDateString("de-DE", {
            weekday: "short", day: "numeric", month: "long",
          });

          await supabase.from("notifications").insert({
            user_id: lead.provider_id,
            title: "⚡ Auto-Termin erstellt",
            message: `${lead.name || "Neuer Kunde"}: Termin am ${formattedDate} um ${suggestedTime} Uhr vorgemerkt. Bitte Pferd zuordnen.`,
            type: "autoflow",
            link: "/anfragen",
          });

          await supabase.from("leads").update({ status: "kontaktiert" }).eq("id", lead.id);

          await logAction(supabase, lead.provider_id, "lead_to_appointment", "lead", lead.id, "success", {
            mode: "auto", date: suggestedDate, time: suggestedTime,
          });
        }

        processed++;
      } catch (leadError: any) {
        console.error(`[autoflow-process-lead] Error processing lead ${lead.id}:`, leadError.message);
        await logAction(supabase, lead.provider_id, "lead_to_appointment", "lead", lead.id, "failed", {
          error: leadError.message,
        });
      }
    }

    console.log(`[autoflow-process-lead] Done. Processed: ${processed}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({ message: "Leads processed", processed, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[autoflow-process-lead] Fatal error:", error.message);
    return new Response(
      JSON.stringify({ error: "Lead processing failed" }),
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
