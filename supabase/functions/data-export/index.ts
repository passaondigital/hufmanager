import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Ungültiger Token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const exportData: Record<string, unknown> = {
      _meta: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        format: "Art. 15 DSGVO Datenexport",
        version: "1.0",
      },
    };

    // 1. Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, readable_id, stable_name, stable_street, stable_zip, stable_city, avatar_url, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();
    exportData.profile = profile;

    // 2. Horses
    const { data: horses } = await supabase
      .from("horses")
      .select("id, name, readable_id, breed, birth_year, birth_date, color, gender, weight_kg, height_cm, hoof_type, hoof_protection, health_status, medical_history, special_notes, recall_interval_weeks, photo_url, created_at, updated_at")
      .eq("owner_id", userId)
      .is("deleted_at", null);
    exportData.horses = horses;

    // 3. Appointments
    const horseIds = (horses || []).map((h: any) => h.id);
    if (horseIds.length > 0) {
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, date, time, status, service_type, price, location, notes, completion_notes, created_at")
        .in("horse_id", horseIds)
        .order("date", { ascending: false })
        .limit(500);
      exportData.appointments = appointments;
    } else {
      exportData.appointments = [];
    }

    // 4. Access Grants (connections)
    const { data: grants } = await supabase
      .from("access_grants")
      .select("id, provider_id, status, is_active, can_view_basic, can_view_medical, can_create_appointments, granted_at")
      .or(`client_id.eq.${userId},provider_id.eq.${userId}`);
    exportData.access_grants = grants;

    // 5. Conversations & Messages
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, subject, created_at, last_message_at")
      .or(`client_id.eq.${userId},provider_id.eq.${userId}`);
    exportData.conversations = conversations;

    if (conversations && conversations.length > 0) {
      const convIds = conversations.map((c: any) => c.id);
      const { data: messages } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: true })
        .limit(1000);
      exportData.messages = messages;
    }

    // 6. AI Chat Messages
    const { data: aiMessages } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(500);
    exportData.ai_chat_messages = aiMessages;

    // 7. Notifications
    const { data: notifications } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    exportData.notifications = notifications;

    // 8. Client Consents
    const { data: consents } = await supabase
      .from("client_consents")
      .select("id, consent_type, version, created_at")
      .eq("client_id", userId);
    exportData.consents = consents;

    // 9. Business Settings (if provider)
    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (businessSettings) {
      exportData.business_settings = businessSettings;
    }

    // 10. Contacts (if provider)
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, full_name, email, phone, category, street, zip_code, city, readable_id, created_at")
      .eq("provider_id", userId)
      .is("deleted_at", null)
      .limit(1000);
    if (contacts && contacts.length > 0) {
      exportData.contacts = contacts;
    }

    // 11. Invoices (if provider)
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, client_name, total_amount, status, invoice_date, due_date, created_at")
      .eq("provider_id", userId)
      .limit(500);
    if (invoices && invoices.length > 0) {
      exportData.invoices = invoices;
    }

    // 12. Services (if provider)
    const { data: services } = await supabase
      .from("services")
      .select("id, name, description, base_price, duration, is_active, created_at")
      .eq("provider_id", userId);
    if (services && services.length > 0) {
      exportData.services = services;
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="hufmanager-datenexport-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("data-export error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
