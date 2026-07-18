import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// DSGVO Art. 17 — Selbst-Löschung des eigenen Accounts. Löscht explizit
// (statt sich auf FK-Cascades zu verlassen, die für einige Tabellen wie
// appointments.provider_id nur ON DELETE SET NULL sind oder — wie bei
// hufi_memory/contacts — gar keine FK-Constraint haben) alle bekannten
// personenbezogenen Datensätze dieses Users, bevor der auth.users-Eintrag
// selbst gelöscht wird.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log(`[delete-my-account] Löschung angefordert von ${user.email} (${userId})`);

    const errors: string[] = [];
    const track = async (label: string, fn: () => Promise<{ error: unknown }>) => {
      try {
        const { error } = await fn();
        if (error) {
          console.error(`[delete-my-account] ${label} fehlgeschlagen:`, error);
          errors.push(label);
        }
      } catch (e) {
        console.error(`[delete-my-account] ${label} Exception:`, e);
        errors.push(label);
      }
    };

    // 1. Rechnungspositionen (über invoices dieses Providers)
    const { data: myInvoices } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("provider_id", userId);
    const invoiceIds = (myInvoices ?? []).map((i: { id: string }) => i.id);
    if (invoiceIds.length > 0) {
      await track("invoice_items", () =>
        supabaseAdmin.from("invoice_items").delete().in("invoice_id", invoiceIds));
    }
    await track("invoices", () =>
      supabaseAdmin.from("invoices").delete().eq("provider_id", userId));

    // 2. Termine, Kontakte, Pferde
    await track("appointments", () =>
      supabaseAdmin.from("appointments").delete().eq("provider_id", userId));
    await track("contacts", () =>
      supabaseAdmin.from("contacts").delete().eq("provider_id", userId));
    await track("horses", () =>
      supabaseAdmin.from("horses").delete().eq("owner_id", userId));

    // 3. Hufi-Gedächtnis & Aktivitätslog
    await track("hufi_memory", () =>
      supabaseAdmin.from("hufi_memory").delete().eq("user_id", userId));
    await track("hufi_context_log", () =>
      supabaseAdmin.from("hufi_context_log").delete().eq("user_id", userId));

    // 4. Benachrichtigungen & Rollen (haben zwar ON DELETE CASCADE über
    // auth.users, werden hier zur Sicherheit trotzdem explizit geleert)
    await track("notifications", () =>
      supabaseAdmin.from("notifications").delete().eq("user_id", userId));
    await track("user_roles", () =>
      supabaseAdmin.from("user_roles").delete().eq("user_id", userId));

    // 5. Voice-Guthaben-Historie, falls vorhanden
    await track("hufi_credit_transactions", () =>
      supabaseAdmin.from("hufi_credit_transactions").delete().eq("user_id", userId));
    await track("hufi_credits", () =>
      supabaseAdmin.from("hufi_credits").delete().eq("user_id", userId));

    // 6. Profil explizit löschen (statt nur auf Cascade zu vertrauen)
    await track("profiles", () =>
      supabaseAdmin.from("profiles").delete().eq("id", userId));

    // 7. Auth-User löschen — beendet alle Sessions serverseitig
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("[delete-my-account] auth.deleteUser fehlgeschlagen:", deleteAuthError);
      return new Response(
        JSON.stringify({ error: deleteAuthError.message, partialErrors: errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[delete-my-account] Account ${userId} vollständig gelöscht. Teilfehler: ${errors.join(", ") || "keine"}`);

    return new Response(
      JSON.stringify({ success: true, partialErrors: errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[delete-my-account] Unerwarteter Fehler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
