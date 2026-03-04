import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_PASSWORD = "HufManagerDemo2030";

const DEMO_ACCOUNTS = [
  {
    email: "hufbearbeiter.hufmanager@gmail.com",
    fullName: "Demo Hufbearbeiter",
    role: "provider",
    readableIdPrefix: "PID-DEMO01",
  },
  {
    email: "pferdebesitzer.hufmanager@gmail.com",
    fullName: "Maria Müller",
    role: "client",
    readableIdPrefix: "KID-DEM001",
  },
  {
    email: "mitarbeiter.hufmanager@gmail.com",
    fullName: "Demo Mitarbeiter",
    role: "employee",
    readableIdPrefix: "EID-DEMO01",
  },
  {
    email: "partner.hufmanager@gmail.com",
    fullName: "Dr. Lisa Meier",
    role: "partner",
    readableIdPrefix: "PRID-DEM001",
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    const userIds: Record<string, string> = {};

    // === Phase 1: Create/update all user accounts ===
    for (const account of DEMO_ACCOUNTS) {
      console.log(`Processing demo account: ${account.email}`);

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === account.email.toLowerCase()
      );

      let userId: string;

      if (existing) {
        userId = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: DEMO_PASSWORD,
          email_confirm: true,
        });
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: account.fullName, role: account.role },
        });
        if (createErr) {
          results.push({ email: account.email, status: "error", error: createErr.message });
          continue;
        }
        userId = newUser.user!.id;
      }

      userIds[account.role] = userId;

      // Ensure profile
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email: account.email,
        full_name: account.fullName,
        readable_id: account.readableIdPrefix,
        plan_override: "lifetime_grant",
        subscription_plan: "pro",
      }, { onConflict: "id" });

      // Ensure role
      await supabaseAdmin.from("user_roles").upsert({
        user_id: userId,
        role: account.role,
      }, { onConflict: "user_id,role" });

      // Provider: business_settings
      if (account.role === "provider") {
        await supabaseAdmin.from("business_settings").upsert({
          id: userId,
          user_id: userId,
          business_name: "Demo Hufbearbeitung",
          owner_name: account.fullName,
        }, { onConflict: "user_id" });
      }

      results.push({ email: account.email, userId, status: "ok" });
    }

    const providerId = userIds["provider"];
    const clientId = userIds["client"];
    const employeeId = userIds["employee"];
    const partnerId = userIds["partner"];

    if (!providerId || !clientId) {
      return new Response(JSON.stringify({ success: true, results, warning: "Missing provider or client" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Phase 2: Employee profile ===
    if (employeeId) {
      await supabaseAdmin.from("employee_profiles").upsert({
        user_id: employeeId,
        provider_id: providerId,
        display_name: "Demo Mitarbeiter",
        role: "farrier",
        status: "active",
      }, { onConflict: "user_id" });
    }

    // === Phase 3: Access grants (provider→client, partner→client) ===
    await supabaseAdmin.from("access_grants").upsert({
      provider_id: providerId,
      client_id: clientId,
      is_active: true,
      status: "active",
      can_view_basic: true,
      can_view_medical: true,
      can_create_appointments: true,
    }, { onConflict: "provider_id,client_id" });

    if (partnerId) {
      // Partner access grant with partner_email
      await supabaseAdmin.from("access_grants").upsert({
        provider_id: providerId,
        client_id: clientId,
        partner_email: "partner.hufmanager@gmail.com",
        partner_name: "Dr. Lisa Meier",
        is_active: true,
        status: "active",
        can_view_basic: true,
        can_view_medical: true,
        can_create_appointments: false,
      }, { onConflict: "provider_id,client_id" });
    }

    // === Phase 4: Horse "Luna" ===
    const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Check if Luna already exists
    const { data: existingLuna } = await supabaseAdmin
      .from("horses")
      .select("id")
      .eq("owner_id", clientId)
      .eq("name", "Luna")
      .is("deleted_at", null)
      .maybeSingle();

    let lunaId: string;
    if (existingLuna) {
      lunaId = existingLuna.id;
      await supabaseAdmin.from("horses").update({
        breed: "Haflinger",
        color: "Fuchs",
        birth_year: 2018,
        readable_id: "EQID-DEM001",
        hoof_type: "barhuf",
        hoof_protection: "keine",
        health_status: "gesund",
        special_notes: "Empfindlich an der rechten Vorderhufe. Regelmäßige 6-Wochen-Intervalle empfohlen.",
        medical_history: "2024: Hufreheanfall rechts vorne, vollständig ausgeheilt. Regelmäßige Kontrolle empfohlen.",
        zip_code: "82467",
        stable_name: "Reiterhof Sonnenhügel",
      }).eq("id", lunaId);
    } else {
      const { data: newHorse, error: horseErr } = await supabaseAdmin.from("horses").insert({
        name: "Luna",
        owner_id: clientId,
        breed: "Haflinger",
        color: "Fuchs",
        birth_year: 2018,
        readable_id: "EQID-DEM001",
        hoof_type: "barhuf",
        hoof_protection: "keine",
        health_status: "gesund",
        special_notes: "Empfindlich an der rechten Vorderhufe. Regelmäßige 6-Wochen-Intervalle empfohlen.",
        medical_history: "2024: Hufreheanfall rechts vorne, vollständig ausgeheilt. Regelmäßige Kontrolle empfohlen.",
        zip_code: "82467",
        stable_name: "Reiterhof Sonnenhügel",
      }).select("id").single();

      if (horseErr) {
        console.error("Error creating Luna:", horseErr);
        return new Response(JSON.stringify({ success: true, results, warning: "Could not create horse Luna" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      lunaId = newHorse.id;
    }

    // === Phase 5: Partner access to Luna ===
    if (partnerId) {
      await supabaseAdmin.from("horse_partner_access").upsert({
        horse_id: lunaId,
        partner_profile_id: partnerId,
        partner_type: "physiotherapist",
        granted_by: clientId,
        status: "active",
        is_active: true,
        can_view_medical: true,
        can_add_notes: true,
      }, { onConflict: "horse_id,partner_profile_id" });
    }

    // === Phase 6: Appointments ===
    // Past appointment (6 weeks ago, completed)
    const { data: existingPastApt } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("provider_id", providerId)
      .eq("horse_id", lunaId)
      .eq("date", sixWeeksAgo)
      .maybeSingle();

    let pastAptId: string | undefined;
    if (!existingPastApt) {
      const { data: pastApt } = await supabaseAdmin.from("appointments").insert({
        provider_id: providerId,
        horse_id: lunaId,
        client_id: clientId,
        date: sixWeeksAgo,
        time: "10:00",
        status: "completed",
        service_type: "Barhufbearbeitung",
        price: 85,
        location: "Reiterhof Sonnenhügel, 82467 Garmisch",
        notes: "Alle vier Hufe bearbeitet. Rechts vorne etwas empfindlich, Sohle leicht dünn.",
        completed_at: `${sixWeeksAgo}T11:30:00Z`,
      }).select("id").single();
      pastAptId = pastApt?.id;
    } else {
      pastAptId = existingPastApt.id;
    }

    // Upcoming appointment (in 1 week, planned)
    const { data: existingFutureApt } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("provider_id", providerId)
      .eq("horse_id", lunaId)
      .eq("date", inOneWeek)
      .maybeSingle();

    if (!existingFutureApt) {
      await supabaseAdmin.from("appointments").insert({
        provider_id: providerId,
        horse_id: lunaId,
        client_id: clientId,
        date: inOneWeek,
        time: "09:30",
        status: "planned",
        service_type: "Barhufbearbeitung",
        price: 85,
        location: "Reiterhof Sonnenhügel, 82467 Garmisch",
      });
    }

    // === Phase 7: Partner treatment note ===
    if (partnerId) {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data: existingNote } = await supabaseAdmin
        .from("partner_treatment_notes")
        .select("id")
        .eq("partner_id", partnerId)
        .eq("horse_id", lunaId)
        .eq("treatment_date", twoWeeksAgo)
        .maybeSingle();

      if (!existingNote) {
        await supabaseAdmin.from("partner_treatment_notes").insert({
          partner_id: partnerId,
          horse_id: lunaId,
          title: "Physiotherapie – Rückenmuskulatur",
          treatment_date: twoWeeksAgo,
          findings: "Verspannung im Bereich LWS, rechts stärker als links. Zusammenhang mit Hufstellung rechts vorne möglich.",
          treatment: "Manuelle Therapie, Dehnübungen, Wärmebehandlung. 30 Min Behandlungsdauer.",
          recommendations: "Kontrolltermin in 4 Wochen empfohlen. Besitzerin soll tägliche Dehnübungen durchführen.",
        });
      }
    }

    // === Phase 8: Employee assignment for today ===
    if (employeeId) {
      // Get employee profile id
      const { data: empProfile } = await supabaseAdmin
        .from("employee_profiles")
        .select("id")
        .eq("user_id", employeeId)
        .maybeSingle();

      if (empProfile) {
        // Get the upcoming appointment for assignment
        const { data: futureApt } = await supabaseAdmin
          .from("appointments")
          .select("id")
          .eq("provider_id", providerId)
          .eq("horse_id", lunaId)
          .eq("date", inOneWeek)
          .maybeSingle();

        if (futureApt) {
          await supabaseAdmin.from("employee_assignments").upsert({
            employee_id: empProfile.id,
            provider_id: providerId,
            appointment_id: futureApt.id,
            status: "pending",
            instructions: "Barhufbearbeitung bei Luna. Rechts vorne besonders vorsichtig – dünne Sohle.",
          }, { onConflict: "employee_id,appointment_id" });
        }
      }
    }

    // === Phase 9: Conversation + message (provider → client) ===
    const { data: existingConv } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("provider_id", providerId)
      .eq("client_id", clientId)
      .maybeSingle();

    let convId: string;
    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv } = await supabaseAdmin.from("conversations").insert({
        provider_id: providerId,
        client_id: clientId,
        subject: "Luna – nächster Termin",
      }).select("id").single();
      convId = newConv!.id;
    }

    // Add a demo message if none exist
    const { count: msgCount } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", convId);

    if (!msgCount || msgCount === 0) {
      await supabaseAdmin.from("messages").insert({
        conversation_id: convId,
        sender_id: providerId,
        content: `Hallo Maria, Lunas nächster Termin ist am ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE")} um 09:30 Uhr. Bitte stelle sicher, dass Luna trocken steht. Bis dann! 🐴`,
      });
    }

    // === Phase 10: Contact entry for provider's customer list ===
    const { data: existingContact } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("provider_id", providerId)
      .eq("profile_id", clientId)
      .maybeSingle();

    if (!existingContact) {
      await supabaseAdmin.from("contacts").insert({
        provider_id: providerId,
        profile_id: clientId,
        full_name: "Maria Müller",
        email: "pferdebesitzer.hufmanager@gmail.com",
        category: "client",
        phone: "+49 171 1234567",
        zip_code: "82467",
        city: "Garmisch-Partenkirchen",
        street: "Am Reiterhof 12",
      });
    }

    // === Phase 11: Invoice for completed appointment ===
    if (pastAptId) {
      const { data: existingInvoice } = await supabaseAdmin
        .from("invoices")
        .select("id")
        .eq("provider_id", providerId)
        .eq("appointment_id", pastAptId)
        .maybeSingle();

      if (!existingInvoice) {
        await supabaseAdmin.from("invoices").insert({
          provider_id: providerId,
          client_id: clientId,
          appointment_id: pastAptId,
          invoice_number: "RE-DEMO-0001",
          status: "sent",
          total: 85,
          tax_rate: 19,
          tax_amount: 13.57,
          subtotal: 71.43,
          issue_date: sixWeeksAgo,
          due_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          items: [{ description: "Barhufbearbeitung – Luna", quantity: 1, unit_price: 85, total: 85 }],
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results, demoData: { lunaId, convId } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
