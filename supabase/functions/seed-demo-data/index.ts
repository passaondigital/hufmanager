import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEMO-DATEN SEED – Vollständige Befüllung aller 4 Demo-Accounts
 *
 * Alle Namen, Adressen, Telefonnummern und E-Mails sind fiktiv.
 * Jeder Wert ist mit [DEMO] oder "Demo-" prefixed, um Verwechslung auszuschließen.
 *
 * Account-Beziehungen:
 *   Demo-Hufbearbeiter (#PID-DEMO01)  → Provider, betreibt "Demo-Hufservice"
 *   Demo-Kundin         (#KID-DEMO01)  → Client, besitzt 3 Pferde
 *   Demo-Mitarbeiter    (#EID-DEMO01)  → Employee, Geselle bei Demo-Hufbearbeiter
 *   Demo-Tierärztin     (#PRID-DEMO01) → Partner, betreut Pferde der Demo-Kundin
 *
 *   Provider ↔ Client:   access_grant, contacts, conversations, invoices
 *   Provider → Employee:  employee_profile, employee_assignments
 *   Client → Partner:     horse_partner_access (Tierärztin sieht Pferdedaten)
 *   Provider ↔ Partner:   contacts (gegenseitig vernetzt)
 */

const PROVIDER_EMAIL = "hufbearbeiter.hufmanager@gmail.com";
const CLIENT_EMAIL = "pferdebesitzer.hufmanager@gmail.com";
const EMPLOYEE_EMAIL = "mitarbeiter.hufmanager@gmail.com";
const PARTNER_EMAIL = "partner.hufmanager@gmail.com";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: adminRole } = await admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const log: string[] = [];
    const addLog = (msg: string) => { console.log(msg); log.push(msg); };

    // --- GET PROFILE IDs ---
    const getProfile = async (email: string) => {
      const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      return data?.id as string | null;
    };

    const providerId = await getProfile(PROVIDER_EMAIL);
    let clientId = await getProfile(CLIENT_EMAIL);
    const employeeId = await getProfile(EMPLOYEE_EMAIL);
    const partnerId = await getProfile(PARTNER_EMAIL);

    if (!providerId) {
      return new Response(JSON.stringify({ error: "Provider demo account not found. Run setup-demo-accounts first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If client doesn't have a profile, create one
    if (!clientId) {
      addLog("Client profile missing - creating via auth admin...");
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existingClient = existingUsers?.users?.find(u => u.email?.toLowerCase() === CLIENT_EMAIL);
      
      if (existingClient) {
        clientId = existingClient.id;
        await admin.from("profiles").upsert({
          id: clientId,
          email: CLIENT_EMAIL,
          full_name: "Demo-Kundin",
          readable_id: "KID-DEMO01",
          plan_override: "lifetime_grant",
          subscription_plan: "pro",
        }, { onConflict: "id" });
        await admin.from("user_roles").upsert({ user_id: clientId, role: "client" }, { onConflict: "user_id,role" });
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: CLIENT_EMAIL,
          password: "HufManagerDemo2030",
          email_confirm: true,
          user_metadata: { full_name: "Demo-Kundin", role: "client" },
        });
        if (createErr) {
          addLog(`Error creating client: ${createErr.message}`);
        } else {
          clientId = newUser.user!.id;
          await new Promise(r => setTimeout(r, 1000));
          await admin.from("profiles").upsert({
            id: clientId,
            email: CLIENT_EMAIL,
            full_name: "Demo-Kundin",
            readable_id: "KID-DEMO01",
            plan_override: "lifetime_grant",
          }, { onConflict: "id" });
          await admin.from("user_roles").upsert({ user_id: clientId, role: "client" }, { onConflict: "user_id,role" });
        }
      }
      addLog(`Client ID: ${clientId}`);
    }

    if (!clientId) {
      return new Response(JSON.stringify({ error: "Could not create client profile" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // 1. PROVIDER PROFILE & BUSINESS SETTINGS
    // ═══════════════════════════════════════════════════════════════
    addLog("Setting up provider profile & business settings...");
    
    await admin.from("profiles").update({
      full_name: "Demo-Hufbearbeiter",
      phone: "+49 000 0000001",
      zip_code: "00000",
      city: "Demo-Stadt",
    }).eq("id", providerId);

    await admin.from("business_settings").upsert({
      id: providerId,
      user_id: providerId,
      business_name: "Demo-Hufservice",
      owner_name: "Demo-Hufbearbeiter",
      phone: "+49 000 0000001",
      email: "demo@demo-hufservice.example",
      address: "Demo-Straße 1, 00000 Demo-Stadt",
      about_text: "[DEMO] Dies ist ein fiktiver Demo-Betrieb. Alle hier gezeigten Daten, Namen und Adressen sind Testdaten und dienen ausschließlich der Veranschaulichung der Software-Funktionen.",
      hero_headline: "[DEMO] Professionelle Hufbearbeitung",
      primary_color: "#F47B20",
      accept_new_customers: true,
      client_intake_status: "open",
      subdomain: "demo-hufservice",
      social_instagram: "https://instagram.com/demo-beispiel",
      social_website: "https://demo-hufservice.example",
      meta_description: "[DEMO] Demo-Hufservice – Fiktiver Demo-Betrieb zur Veranschaulichung von HufManager.",
      tax_number: "DE000000000",
      iban: "DE00 0000 0000 0000 0000 00",
      bank_name: "Demo-Bank",
      bic: "DEMODEMOXXX",
      currency: "EUR",
      default_vat_rate: 19,
      travel_cost_per_km: 0.42,
      travel_cost_flat: 15,
      section_order: '["hero","about","services","highlights","gallery","reviews","contact"]',
      reviews_layout: "masonry",
      ki_features_enabled: true,
    }, { onConflict: "user_id" });

    // ═══════════════════════════════════════════════════════════════
    // 2. CLIENT PROFILE
    // ═══════════════════════════════════════════════════════════════
    addLog("Setting up client profile...");
    await admin.from("profiles").update({
      full_name: "Demo-Kundin",
      phone: "+49 000 0000002",
      zip_code: "00000",
      city: "Demo-Dorf",
    }).eq("id", clientId);

    // ═══════════════════════════════════════════════════════════════
    // 3. EMPLOYEE PROFILE
    // ═══════════════════════════════════════════════════════════════
    if (employeeId) {
      addLog("Setting up employee profile...");
      await admin.from("profiles").update({
        full_name: "Demo-Mitarbeiter",
        phone: "+49 000 0000003",
        zip_code: "00000",
        city: "Demo-Stadt",
      }).eq("id", employeeId);

      await admin.from("employee_profiles").upsert({
        user_id: employeeId,
        provider_id: providerId,
        display_name: "Demo-Mitarbeiter",
        role: "farrier",
        status: "active",
      }, { onConflict: "user_id" });
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. PARTNER PROFILE
    // ═══════════════════════════════════════════════════════════════
    if (partnerId) {
      addLog("Setting up partner profile...");
      await admin.from("profiles").update({
        full_name: "Demo-Tierärztin",
        phone: "+49 000 0000004",
        zip_code: "00000",
        city: "Demo-Stadt",
      }).eq("id", partnerId);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. ACCESS GRANTS
    // ═══════════════════════════════════════════════════════════════
    addLog("Setting up access grants...");
    await admin.from("access_grants").upsert({
      provider_id: providerId,
      client_id: clientId,
      is_active: true,
      status: "active",
      can_view_basic: true,
      can_view_medical: true,
      can_create_appointments: true,
    }, { onConflict: "provider_id,client_id" });

    // ═══════════════════════════════════════════════════════════════
    // 6. SERVICES
    // ═══════════════════════════════════════════════════════════════
    addLog("Creating services...");
    await admin.from("services").delete().eq("provider_id", providerId);

    const services = [
      { provider_id: providerId, name: "Barhufpflege", description: "[DEMO] Professionelle Barhufbearbeitung inkl. Ganganalyse und Beratung", category: "Hufbearbeitung", base_price: 45, duration: 45, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 1 },
      { provider_id: providerId, name: "Beschlag Warmblut", description: "[DEMO] Klassischer Beschlag für Warmblüter mit 4 neuen Eisen", category: "Beschlag", base_price: 120, duration: 60, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 2 },
      { provider_id: providerId, name: "Beschlag Kaltblut", description: "[DEMO] Beschlag für Kaltblüter mit verstärkten Eisen", category: "Beschlag", base_price: 160, duration: 75, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 3 },
      { provider_id: providerId, name: "Orthopädischer Beschlag", description: "[DEMO] Spezialbeschlag bei Huferkrankungen", category: "Spezial", base_price: 180, duration: 90, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 4 },
      { provider_id: providerId, name: "Klebeeisen / Klebebeschlag", description: "[DEMO] Schonende Alternative zum genagelten Beschlag", category: "Spezial", base_price: 200, duration: 90, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 5 },
      { provider_id: providerId, name: "Hufanalyse & Beratung", description: "[DEMO] Umfassende Hufanalyse mit digitalem Bericht", category: "Beratung", base_price: 35, duration: 30, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 6 },
      { provider_id: providerId, name: "Notfall-Beschlag", description: "[DEMO] Sofortiger Beschlag bei akuten Problemen", category: "Notfall", base_price: 150, duration: 45, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 7 },
    ];
    const { data: insertedServices } = await admin.from("services").insert(services).select("id, name");
    addLog(`Created ${insertedServices?.length || 0} services`);

    // ═══════════════════════════════════════════════════════════════
    // 7. CONTACTS
    // ═══════════════════════════════════════════════════════════════
    addLog("Creating contacts...");
    await admin.from("contacts").delete().eq("provider_id", providerId);

    const contacts = [
      { provider_id: providerId, full_name: "Demo-Kundin", email: CLIENT_EMAIL, phone: "+49 000 0000002", category: "client", zip_code: "00000", city: "Demo-Dorf", street: "Demo-Reitweg 5", profile_id: clientId, source: "demo" },
      { provider_id: providerId, full_name: "Demo-Kunde B", email: "demo-kunde-b@example.test", phone: "+49 000 0000010", category: "client", zip_code: "00000", city: "Demo-Weiler", street: "Demo-Hofstraße 3", source: "demo" },
      { provider_id: providerId, full_name: "Demo-Kundin C", email: "demo-kundin-c@example.test", phone: "+49 000 0000011", category: "client", zip_code: "00000", city: "Demo-Feld", street: "Demo-Wiesenweg 8", source: "demo" },
      { provider_id: providerId, full_name: "Demo-Tierärztin", email: PARTNER_EMAIL, phone: "+49 000 0000004", category: "partner", zip_code: "00000", city: "Demo-Stadt", street: "Demo-Praxisweg 2", company_name: "Demo-Tierarztpraxis", source: "demo" },
      { provider_id: providerId, full_name: "Demo-Reitverein e.V.", email: "demo-reitverein@example.test", phone: "+49 000 0000020", category: "client", zip_code: "00000", city: "Demo-Feld", street: "Demo-Reitweg 1", is_business: true, company_name: "Demo-Reitverein e.V.", source: "demo" },
      { provider_id: providerId, full_name: "Demo-Kundin D", email: "demo-kundin-d@example.test", phone: "+49 000 0000012", category: "client", zip_code: "00000", city: "Demo-Hausen", street: "Demo-Gartenstr. 17", source: "demo" },
      { provider_id: providerId, full_name: "Demo-Lieferant Hufbedarf", email: "demo-lieferant@example.test", phone: "+49 000 0000030", category: "supplier" as any, zip_code: "00000", city: "Demo-Stadt", street: "Demo-Industriestr. 33", is_business: true, company_name: "Demo-Hufbedarf GmbH", source: "demo" },
      { provider_id: providerId, full_name: "Demo-Interessentin E", email: "demo-lead-e@example.test", phone: "+49 000 0000013", category: "lead" as any, zip_code: "00000", city: "Demo-Dorf", source: "demo", notes: "[DEMO] Hat über die Website angefragt, möchte Beratungstermin" },
    ];
    const { data: insertedContacts, error: contactErr } = await admin.from("contacts").insert(contacts).select("id, full_name");
    if (contactErr) addLog(`Contact error: ${contactErr.message}`);
    else addLog(`Created ${insertedContacts?.length || 0} contacts`);

    // ═══════════════════════════════════════════════════════════════
    // 8. HORSES (3 Demo-Pferde für Demo-Kundin)
    // ═══════════════════════════════════════════════════════════════
    addLog("Creating horses...");
    await admin.from("horses").delete().eq("owner_id", clientId);

    const horses = [
      {
        owner_id: clientId, name: "Carlotta", breed: "Hannoveraner", birth_year: 2016, gender: "mare", color: "Dunkelbraun",
        height_cm: 168, discipline: "Dressur", hoof_type: "normal", shoeing_interval: 8, equine_type: "Pferd", usage_type: "Dressur/Springen",
        special_notes: "[DEMO] Empfindlich an der rechten Hinterhand, leichte Strahlfäule rechts hinten", health_status: "[DEMO] Leichte Huffäule rechts hinten, wird behandelt",
        hoof_protection: "Eisen vorne, barhuf hinten", housing: "Box mit Paddock",
        readable_id: "EQID-DEMO01", nickname: "Lotta", location_name: "Demo-Reitstall, Demo-Dorf",
        recall_interval_weeks: 8, shoeing_status: "mixed",
      },
      {
        owner_id: clientId, name: "Donnerstern", breed: "Oldenburger", birth_year: 2019, gender: "gelding", color: "Rappe",
        height_cm: 172, discipline: "Springen", hoof_type: "flat", shoeing_interval: 6, equine_type: "Pferd", usage_type: "Springen",
        special_notes: "[DEMO] Braucht flache Eisen, neigt zu Hornspalten vorne links", health_status: "[DEMO] Gesund",
        hoof_protection: "Rundum beschlagen", housing: "Offenstall",
        readable_id: "EQID-DEMO02", nickname: "Donner", location_name: "Demo-Reitstall, Demo-Dorf",
        recall_interval_weeks: 6, shoeing_status: "shod",
      },
      {
        owner_id: clientId, name: "Sunny", breed: "Deutsches Reitpony", birth_year: 2014, gender: "mare", color: "Fuchs",
        height_cm: 142, discipline: "Freizeit", hoof_type: "hard", shoeing_interval: 10, equine_type: "Pony", usage_type: "Freizeit",
        special_notes: "[DEMO] Schnappt gerne beim Beschlag, braucht Geduld", health_status: "[DEMO] Gesund, gelegentlich Hufrehe-gefährdet",
        hoof_protection: "Barhuf", housing: "Offenstall mit Weidezugang",
        readable_id: "EQID-DEMO03", nickname: "Sunny", location_name: "Demo-Ponyhof, Demo-Hausen",
        recall_interval_weeks: 10, shoeing_status: "barefoot",
      },
    ];
    const { data: insertedHorses, error: horseErr } = await admin.from("horses").insert(horses).select("id, name, readable_id");
    if (horseErr) addLog(`Horse error: ${horseErr.message}`);
    else addLog(`Created ${insertedHorses?.length || 0} horses`);

    // ═══════════════════════════════════════════════════════════════
    // 9. APPOINTMENTS
    // ═══════════════════════════════════════════════════════════════
    addLog("Creating appointments...");
    await admin.from("appointments").delete().eq("provider_id", providerId);

    const today = new Date();
    const d = (offset: number) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + offset);
      return dt.toISOString().split("T")[0];
    };

    if (insertedHorses && insertedHorses.length >= 3 && insertedServices) {
      const barhuf = insertedServices.find(s => s.name === "Barhufpflege");
      const beschlagWB = insertedServices.find(s => s.name === "Beschlag Warmblut");
      const ortho = insertedServices.find(s => s.name === "Orthopädischer Beschlag");
      const analyse = insertedServices.find(s => s.name === "Hufanalyse & Beratung");

      const appointments = [
        // Past (completed)
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(-56), time: "09:00", status: "completed", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Demo-Reitstall, Demo-Dorf", completed_at: d(-56) + "T10:00:00Z", notes: "[DEMO] Eisen vorne erneuert, hinten barhuf bearbeitet" },
        { provider_id: providerId, horse_id: insertedHorses[1].id, client_id: clientId, date: d(-56), time: "10:30", status: "completed", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Demo-Reitstall, Demo-Dorf", completed_at: d(-56) + "T11:30:00Z", notes: "[DEMO] Rundum beschlagen, flache Eisen" },
        { provider_id: providerId, horse_id: insertedHorses[2].id, client_id: clientId, date: d(-42), time: "14:00", status: "completed", service_type: barhuf?.name, price: 45, duration: 45, location: "Demo-Ponyhof, Demo-Hausen", completed_at: d(-42) + "T14:45:00Z", notes: "[DEMO] Barhuf-Pflege, Strahlfurchen gereinigt" },
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(-28), time: "09:00", status: "completed", service_type: ortho?.name, price: 180, duration: 90, location: "Demo-Reitstall, Demo-Dorf", completed_at: d(-28) + "T10:30:00Z", notes: "[DEMO] Orthopädischer Beschlag rechts hinten wegen Huffäule" },
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(-14), time: "09:00", status: "completed", service_type: analyse?.name, price: 35, duration: 30, location: "Demo-Reitstall, Demo-Dorf", completed_at: d(-14) + "T09:30:00Z", notes: "[DEMO] Kontrolltermin: Huffäule deutlich verbessert" },
        // Upcoming (scheduled) — some assigned to employee
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(3), time: "09:00", status: "scheduled", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Demo-Reitstall, Demo-Dorf", assigned_to_user_id: employeeId || undefined },
        { provider_id: providerId, horse_id: insertedHorses[1].id, client_id: clientId, date: d(3), time: "10:30", status: "scheduled", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Demo-Reitstall, Demo-Dorf", assigned_to_user_id: employeeId || undefined },
        { provider_id: providerId, horse_id: insertedHorses[2].id, client_id: clientId, date: d(7), time: "14:00", status: "scheduled", service_type: barhuf?.name, price: 45, duration: 45, location: "Demo-Ponyhof, Demo-Hausen" },
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(17), time: "09:00", status: "scheduled", service_type: analyse?.name, price: 35, duration: 30, location: "Demo-Reitstall, Demo-Dorf", notes: "[DEMO] Kontrolltermin Huffäule" },
        { provider_id: providerId, horse_id: insertedHorses[1].id, client_id: clientId, date: d(45), time: "10:00", status: "scheduled", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Demo-Reitstall, Demo-Dorf" },
      ];
      const { data: insertedAppts, error: apptErr } = await admin.from("appointments").insert(appointments).select("id");
      if (apptErr) addLog(`Appointment error: ${apptErr.message}`);
      else addLog(`Created ${insertedAppts?.length || 0} appointments`);

      // ═══════════════════════════════════════════════════════════════
      // 10. INVOICES
      // ═══════════════════════════════════════════════════════════════
      addLog("Creating invoices...");
      await admin.from("invoices").delete().eq("provider_id", providerId);

      const invoices = [
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[0].id, invoice_number: "RE-DEMO-0001", issue_date: d(-56), due_date: d(-42), total_amount: 120, status: "paid", payment_status: "paid", paid_at: d(-50) + "T00:00:00Z", payment_method: "bank_transfer", notes: "[DEMO] Beschlag Warmblut – Carlotta" },
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[1].id, invoice_number: "RE-DEMO-0002", issue_date: d(-56), due_date: d(-42), total_amount: 120, status: "paid", payment_status: "paid", paid_at: d(-50) + "T00:00:00Z", payment_method: "bank_transfer", notes: "[DEMO] Beschlag Warmblut – Donnerstern" },
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[2].id, invoice_number: "RE-DEMO-0003", issue_date: d(-42), due_date: d(-28), total_amount: 45, status: "paid", payment_status: "paid", paid_at: d(-38) + "T00:00:00Z", payment_method: "cash", notes: "[DEMO] Barhufpflege – Sunny" },
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[0].id, invoice_number: "RE-DEMO-0004", issue_date: d(-28), due_date: d(-14), total_amount: 180, status: "paid", payment_status: "paid", paid_at: d(-20) + "T00:00:00Z", payment_method: "bank_transfer", notes: "[DEMO] Orthopädischer Beschlag – Carlotta" },
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[0].id, invoice_number: "RE-DEMO-0005", issue_date: d(-14), due_date: d(0), total_amount: 35, status: "sent", payment_status: "pending", payment_method: "bank_transfer", notes: "[DEMO] Hufanalyse & Beratung – Carlotta" },
      ];
      const { error: invErr } = await admin.from("invoices").insert(invoices);
      if (invErr) addLog(`Invoice error: ${invErr.message}`);
      else addLog(`Created ${invoices.length} invoices`);

      // ═══════════════════════════════════════════════════════════════
      // 11. REVIEWS
      // ═══════════════════════════════════════════════════════════════
      addLog("Creating reviews...");
      await admin.from("reviews").delete().eq("provider_id", providerId);

      const reviews = [
        { provider_id: providerId, reviewer_name: "Demo-Kundin", rating: 5, text: "[DEMO] Hervorragende Arbeit! Carlotta hatte Probleme mit Strahlfäule und dank der Expertise ist alles wieder top. Sehr zu empfehlen!", is_approved: true, is_visible: true, source: "direct", category: "service" },
        { provider_id: providerId, reviewer_name: "Demo-Kunde B", rating: 5, text: "[DEMO] Pünktlich, professionell und sehr einfühlsam mit den Pferden. Unser Wallach steht sonst nie still, aber hier war er wie ausgewechselt.", is_approved: true, is_visible: true, source: "direct", category: "service" },
        { provider_id: providerId, reviewer_name: "Demo-Kundin C", rating: 4, text: "[DEMO] Sehr gute Arbeit, faire Preise. Die digitale Dokumentation ist genial – ich kann jederzeit die Huf-Historie meiner Stute einsehen.", is_approved: true, is_visible: true, source: "direct", category: "service" },
        { provider_id: providerId, reviewer_name: "Demo-Kundin D", rating: 5, text: "[DEMO] Endlich jemand, der sich Zeit nimmt und alles erklärt. Die Ganganalyse war super hilfreich. Mein Pony läuft seitdem viel besser!", is_approved: true, is_visible: true, source: "google", category: "service" },
        { provider_id: providerId, reviewer_name: "Demo-Kunde E", rating: 5, text: "[DEMO] Top! Kompetent, zuverlässig und immer freundlich. Kann ich jedem Pferdebesitzer nur wärmstens empfehlen.", is_approved: true, is_visible: true, source: "google", category: "service" },
        { provider_id: providerId, reviewer_name: "Demo-Kundin F", rating: 4, text: "[DEMO] Sehr professionell und saubere Arbeit. Die Online-Terminbuchung und Rechnungsstellung machen alles unkompliziert.", is_approved: true, is_visible: true, source: "direct", category: "digital" },
      ];
      const { error: revErr } = await admin.from("reviews").insert(reviews);
      if (revErr) addLog(`Review error: ${revErr.message}`);
      else addLog(`Created ${reviews.length} reviews`);

      // ═══════════════════════════════════════════════════════════════
      // 12. FEEDBACKS
      // ═══════════════════════════════════════════════════════════════
      addLog("Creating feedbacks...");
      await admin.from("feedbacks").delete().eq("provider_id", providerId);

      const feedbacks = [
        { provider_id: providerId, customer_name: "Demo-Kundin", rating: 5, text: "[DEMO] Wie immer hervorragend! Carlotta steht super auf den neuen Eisen.", source: "app", is_featured: true },
        { provider_id: providerId, customer_name: "Demo-Kunde B", rating: 5, text: "[DEMO] Perfekter Termin, pünktlich und professionell.", source: "app", is_featured: true },
        { provider_id: providerId, customer_name: "Demo-Kundin C", rating: 4, text: "[DEMO] Alles bestens, Anfahrt hat etwas länger gedauert.", source: "app", is_featured: false },
      ];
      const { error: fbErr } = await admin.from("feedbacks").insert(feedbacks);
      if (fbErr) addLog(`Feedback error: ${fbErr.message}`);
      else addLog(`Created ${feedbacks.length} feedbacks`);

      // ═══════════════════════════════════════════════════════════════
      // 13. INVENTORY
      // ═══════════════════════════════════════════════════════════════
      addLog("Creating inventory items...");
      await admin.from("inventory_items").delete().eq("user_id", providerId);

      const inventory = [
        { user_id: providerId, product_name: "Hufeisen Gr. 1 (Concave)", brand: "Demo-Marke A", category: "Eisen", current_stock: 24, min_stock: 8, price_purchase: 3.20, price_sell: 8.50, tax_rate: 19 },
        { user_id: providerId, product_name: "Hufeisen Gr. 2 (Concave)", brand: "Demo-Marke A", category: "Eisen", current_stock: 18, min_stock: 8, price_purchase: 3.50, price_sell: 9.00, tax_rate: 19 },
        { user_id: providerId, product_name: "Hufeisen Gr. 3 (Concave)", brand: "Demo-Marke A", category: "Eisen", current_stock: 12, min_stock: 6, price_purchase: 3.80, price_sell: 9.50, tax_rate: 19 },
        { user_id: providerId, product_name: "Hufnägel E-Head 5", brand: "Demo-Marke A", category: "Nägel", current_stock: 250, min_stock: 100, price_purchase: 0.08, price_sell: 0.15, tax_rate: 19 },
        { user_id: providerId, product_name: "Hufnägel E-Head 6", brand: "Demo-Marke A", category: "Nägel", current_stock: 200, min_stock: 100, price_purchase: 0.08, price_sell: 0.15, tax_rate: 19 },
        { user_id: providerId, product_name: "Hufhärter", brand: "Demo-Marke B", category: "Pflegemittel", current_stock: 3, min_stock: 1, price_purchase: 18.90, price_sell: 29.90, tax_rate: 19 },
        { user_id: providerId, product_name: "Hufkleber Typ A", brand: "Demo-Marke C", category: "Klebematerial", current_stock: 5, min_stock: 2, price_purchase: 22.50, price_sell: 35.00, tax_rate: 19 },
        { user_id: providerId, product_name: "Hufkleber Typ B", brand: "Demo-Marke C", category: "Klebematerial", current_stock: 2, min_stock: 1, price_purchase: 45.00, price_sell: 65.00, tax_rate: 19 },
        { user_id: providerId, product_name: "Einlagen Impression Material", brand: "Demo-Marke C", category: "Einlagen", current_stock: 6, min_stock: 2, price_purchase: 28.00, price_sell: 42.00, tax_rate: 19 },
        { user_id: providerId, product_name: "Raspel 14\"", brand: "Demo-Marke D", category: "Werkzeug", current_stock: 2, min_stock: 1, price_purchase: 35.00, price_sell: 0, tax_rate: 19, notes: "[DEMO] Eigenbedarf" },
      ];
      const { error: invItemErr } = await admin.from("inventory_items").insert(inventory);
      if (invItemErr) addLog(`Inventory error: ${invItemErr.message}`);
      else addLog(`Created ${inventory.length} inventory items`);

      // ═══════════════════════════════════════════════════════════════
      // 14. OFFERS
      // ═══════════════════════════════════════════════════════════════
      addLog("Creating offers...");
      await admin.from("offers").delete().eq("provider_id", providerId);

      const offers = [
        { provider_id: providerId, title: "Demo-Rundum-Paket", description: "[DEMO] Barhufpflege + Hufanalyse + digitaler Bericht", price: 65, price_type: "fixed", is_active: true, sort_order: 1, offer_type: "package", display_mode: "featured", billing_type: "one_time", features: '["Barhufpflege","Hufanalyse","Digitaler Bericht","Empfehlung nächster Termin"]' },
        { provider_id: providerId, title: "Demo-Beschlag-Abo (6 Monate)", description: "[DEMO] 6 Beschlagtermine zum Vorzugspreis", price: 99, price_type: "monthly", is_active: true, sort_order: 2, offer_type: "subscription", display_mode: "visible", billing_type: "monthly", features: '["6 Beschlagtermine","Termingarantie","10% Rabatt","Prioritäts-Buchung"]' },
        { provider_id: providerId, title: "Demo-Notfall-Beschlag", description: "[DEMO] Schnelle Hilfe bei verlorenen Eisen", price: 150, price_type: "fixed", is_active: true, sort_order: 3, offer_type: "service", display_mode: "visible", billing_type: "one_time", features: '["24h Reaktionszeit","Anfahrt inklusive","Sofort-Beschlag"]' },
      ];
      const { error: offerErr } = await admin.from("offers").insert(offers);
      if (offerErr) addLog(`Offer error: ${offerErr.message}`);
      else addLog(`Created ${offers.length} offers`);

      // ═══════════════════════════════════════════════════════════════
      // 15. PARTNER ACCESS TO HORSES
      // ═══════════════════════════════════════════════════════════════
      if (partnerId) {
        addLog("Setting up partner access to horses...");
        
        // Delete existing partner access for this partner
        await admin.from("horse_partner_access").delete().eq("partner_profile_id", partnerId);
        
        for (const horse of insertedHorses.slice(0, 2)) {
          await admin.from("horse_partner_access").insert({
            horse_id: horse.id,
            partner_profile_id: partnerId,
            partner_name: "Demo-Tierärztin",
            partner_email: PARTNER_EMAIL,
            partner_type: "veterinarian",
            invited_by_provider_id: providerId,
            status: "active",
            is_active: true,
            can_view_basic: true,
            can_view_medical: true,
            can_view_hoof_history: true,
            can_add_treatment_notes: true,
            can_view_vaccinations: true,
            can_view_deworming: true,
            owner_approved: true,
            owner_approved_at: new Date().toISOString(),
            granted_by: providerId,
            granted_at: new Date().toISOString(),
            accepted_at: new Date().toISOString(),
          });
        }
        addLog("Partner access granted for 2 horses (Carlotta + Donnerstern)");

        // Partner treatment notes
        await admin.from("partner_treatment_notes").delete().eq("partner_id", partnerId);
        await admin.from("partner_treatment_notes").insert([
          {
            horse_id: insertedHorses[0].id,
            partner_id: partnerId,
            treatment_category: "treatment",
            title: "[DEMO] Kontrolluntersuchung Huffäule",
            notes: "[DEMO] Strahlfäule rechts hinten deutlich verbessert seit orthopädischem Beschlag. Empfehle weiterhin regelmäßige Desinfektion und trockene Einstreu.",
            treatment_date: d(-10),
            visible_to_pid: true,
            visible_to_kid: true,
          },
          {
            horse_id: insertedHorses[0].id,
            partner_id: partnerId,
            treatment_category: "treatment",
            title: "[DEMO] Osteopathische Kontrolle",
            notes: "[DEMO] Beckenstand symmetrisch. Schulter links deutlich besser. Normales Training freigegeben.",
            treatment_date: d(-5),
            visible_to_pid: true,
            visible_to_kid: true,
          },
          {
            horse_id: insertedHorses[1].id,
            partner_id: partnerId,
            treatment_category: "examination",
            title: "[DEMO] Lahmheitsuntersuchung Donnerstern",
            notes: "[DEMO] Leichte Lahmheit vorne links nach hartem Boden. Röntgen unauffällig. Empfehlung: weicher Boden, Schritt, Kontrolle in 2 Wochen.",
            treatment_date: d(-3),
            visible_to_pid: true,
            visible_to_kid: true,
          },
        ]);
        addLog("Created 3 partner treatment notes");
      }

      // ═══════════════════════════════════════════════════════════════
      // 16. EMPLOYEE ASSIGNMENTS
      // ═══════════════════════════════════════════════════════════════
      if (employeeId) {
        addLog("Creating employee assignments...");
        const futureAppts = await admin.from("appointments").select("id").eq("provider_id", providerId).eq("status", "scheduled").limit(3);

        if (futureAppts.data && futureAppts.data.length > 0) {
          for (let i = 0; i < Math.min(2, futureAppts.data.length); i++) {
            await admin.from("employee_assignments").upsert({
              employee_id: employeeId,
              provider_id: providerId,
              appointment_id: futureAppts.data[i].id,
              status: "assigned",
              instructions: `[DEMO] Auftrag ${i + 1}: Bitte Hufbearbeitung durchführen und Fotos machen.`,
            }, { onConflict: "employee_id,appointment_id" });
          }
          addLog("Employee assignments created");
        }

        // Employee horse access
        if (insertedHorses.length > 0) {
          for (const horse of insertedHorses) {
            await admin.from("employee_horse_access").upsert({
              employee_id: employeeId,
              horse_id: horse.id,
              provider_id: providerId,
              can_view: true,
              can_document: true,
            }, { onConflict: "employee_id,horse_id" }).then(() => {}).catch(() => {});
          }
          addLog("Employee horse access granted for all 3 horses");
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 17. MAGIC LINK
    // ═══════════════════════════════════════════════════════════════
    addLog("Creating magic link...");
    await admin.from("magic_links").delete().eq("provider_id", providerId);
    await admin.from("magic_links").insert({
      provider_id: providerId,
      slug: "demo",
      is_active: true,
    });
    addLog("Magic link created: /m/demo");

    // ═══════════════════════════════════════════════════════════════
    // 18. NOTIFICATIONS (for all accounts)
    // ═══════════════════════════════════════════════════════════════
    addLog("Creating sample notifications...");
    await admin.from("notifications").delete().eq("user_id", providerId);
    await admin.from("notifications").delete().eq("user_id", clientId);
    if (employeeId) await admin.from("notifications").delete().eq("user_id", employeeId);
    if (partnerId) await admin.from("notifications").delete().eq("user_id", partnerId);

    const notifications = [
      // Provider
      { user_id: providerId, title: "[DEMO] Neues Feedback erhalten", message: "Demo-Kundin hat dir 5 Sterne gegeben: \"Wie immer hervorragend!\"", type: "feedback", link: "/bewertungen" },
      { user_id: providerId, title: "[DEMO] Termin in 3 Tagen", message: "Carlotta (Demo-Kundin) – Beschlag am " + d(3), type: "reminder", link: "/kalender" },
      { user_id: providerId, title: "[DEMO] Rechnung fällig", message: "RE-DEMO-0005 (35,00 €) wartet auf Zahlung", type: "invoice", link: "/rechnungen" },
      // Client
      { user_id: clientId, title: "[DEMO] Nächster Termin", message: "Beschlag für Carlotta am " + d(3) + " um 09:00 Uhr", type: "appointment", link: "/client-home" },
      { user_id: clientId, title: "[DEMO] Rechnung erhalten", message: "Neue Rechnung RE-DEMO-0005 über 35,00 € von Demo-Hufservice", type: "invoice", link: "/client-home" },
      { user_id: clientId, title: "[DEMO] Behandlungsbericht", message: "Demo-Tierärztin hat einen neuen Befund zu Carlotta dokumentiert", type: "partner_note", link: "/client-home" },
    ];
    // Employee notifications
    if (employeeId) {
      notifications.push(
        { user_id: employeeId, title: "[DEMO] Neuer Auftrag", message: "Beschlag Carlotta + Donnerstern am " + d(3) + " um 09:00 Uhr", type: "assignment", link: "/employee" },
        { user_id: employeeId, title: "[DEMO] Tourenplanung aktualisiert", message: "2 Termine für diese Woche eingeplant", type: "reminder", link: "/employee" },
      );
    }
    // Partner notifications
    if (partnerId) {
      notifications.push(
        { user_id: partnerId, title: "[DEMO] Neuer Pferdezugang", message: "Demo-Kundin hat dir Zugriff auf Carlotta und Donnerstern gewährt", type: "access_granted", link: "/partner-home" },
        { user_id: partnerId, title: "[DEMO] Hufbefund verfügbar", message: "Demo-Hufbearbeiter hat einen neuen Befund zu Carlotta dokumentiert", type: "hoof_report", link: "/partner-home" },
      );
    }
    await admin.from("notifications").insert(notifications);
    addLog(`Created ${notifications.length} notifications`);

    // ═══════════════════════════════════════════════════════════════
    // 19. CONVERSATION (Provider ↔ Client)
    // ═══════════════════════════════════════════════════════════════
    addLog("Creating conversation...");
    const { data: existingConv } = await admin.from("conversations")
      .select("id")
      .eq("provider_id", providerId)
      .eq("client_id", clientId)
      .maybeSingle();

    let convId: string;
    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv } = await admin.from("conversations").insert({
        provider_id: providerId,
        client_id: clientId,
        subject: "[DEMO] Carlotta – nächster Termin",
      }).select("id").single();
      convId = newConv!.id;
    }

    const { count: msgCount } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", convId);

    if (!msgCount || msgCount === 0) {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE");
      await admin.from("messages").insert([
        {
          conversation_id: convId,
          sender_id: providerId,
          content: `[DEMO] Hallo Demo-Kundin, der nächste Termin für Carlotta und Donnerstern ist am ${futureDate} ab 09:00 Uhr. Bitte stelle sicher, dass die Pferde trocken stehen. 🐴`,
        },
        {
          conversation_id: convId,
          sender_id: clientId,
          content: `[DEMO] Danke für die Info! Beide Pferde werden bereitstehen. Carlottas Huffäule rechts hinten sieht übrigens schon viel besser aus! 👍`,
        },
      ]);
    }

    addLog("✅ Demo data seeding complete!");

    return new Response(JSON.stringify({ success: true, log }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
