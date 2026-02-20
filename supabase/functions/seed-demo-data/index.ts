import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // If client doesn't have a profile, create one via auth
    if (!clientId) {
      addLog("Client profile missing - creating via auth admin...");
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existingClient = existingUsers?.users?.find(u => u.email?.toLowerCase() === CLIENT_EMAIL);
      
      if (existingClient) {
        clientId = existingClient.id;
        // Ensure profile exists
        await admin.from("profiles").upsert({
          id: clientId,
          email: CLIENT_EMAIL,
          full_name: "Maria Bergmann",
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
          user_metadata: { full_name: "Maria Bergmann", role: "client" },
        });
        if (createErr) {
          addLog(`Error creating client: ${createErr.message}`);
        } else {
          clientId = newUser.user!.id;
          // Wait for trigger to create profile, then update
          await new Promise(r => setTimeout(r, 1000));
          await admin.from("profiles").upsert({
            id: clientId,
            email: CLIENT_EMAIL,
            full_name: "Maria Bergmann",
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

    // --- 1. UPDATE PROVIDER PROFILE & BUSINESS SETTINGS ---
    addLog("Setting up provider profile & business settings...");
    
    await admin.from("profiles").update({
      full_name: "Pascal Schmidt",
      phone: "+49 170 1234567",
      zip_code: "71229",
      city: "Leonberg",
    }).eq("id", providerId);

    await admin.from("business_settings").upsert({
      id: providerId,
      user_id: providerId,
      business_name: "Hufschmiede Schmidt",
      owner_name: "Pascal Schmidt",
      phone: "+49 170 1234567",
      email: "kontakt@hufschmiede-schmidt.de",
      address: "Römerstraße 42, 71229 Leonberg",
      about_text: "Seit über 12 Jahren kümmere ich mich mit Leidenschaft und Präzision um die Hufe Ihres Pferdes. Als zertifizierter Hufschmied und Hufpfleger biete ich das gesamte Spektrum – vom klassischen Beschlag über Barhufbearbeitung bis hin zu orthopädischen Spezialbeschlägen. Ich arbeite im Raum Stuttgart, Böblingen und Ludwigsburg.",
      hero_headline: "Professionelle Hufbearbeitung im Raum Stuttgart",
      primary_color: "#F47B20",
      accept_new_customers: true,
      client_intake_status: "open",
      subdomain: "demo-hufschmied",
      social_instagram: "https://instagram.com/hufschmiede.schmidt",
      social_website: "https://hufschmiede-schmidt.de",
      meta_description: "Hufschmiede Schmidt – Ihr erfahrener Hufschmied in Leonberg. Professionelle Hufbearbeitung, Barhufpflege & orthopädische Beschläge.",
      tax_number: "DE123456789",
      iban: "DE89 3704 0044 0532 0130 00",
      bank_name: "Commerzbank",
      bic: "COBADEFFXXX",
      currency: "EUR",
      default_vat_rate: 19,
      travel_cost_per_km: 0.42,
      travel_cost_flat: 15,
      section_order: '["hero","about","services","highlights","gallery","reviews","contact"]',
      reviews_layout: "masonry",
      ki_features_enabled: true,
    }, { onConflict: "user_id" });

    // --- 2. UPDATE CLIENT PROFILE ---
    addLog("Setting up client profile...");
    await admin.from("profiles").update({
      full_name: "Maria Bergmann",
      phone: "+49 171 9876543",
      zip_code: "71063",
      city: "Sindelfingen",
    }).eq("id", clientId);

    // --- 3. UPDATE EMPLOYEE PROFILE ---
    if (employeeId) {
      addLog("Setting up employee profile...");
      await admin.from("profiles").update({
        full_name: "Sven Krause",
        phone: "+49 176 5554443",
        zip_code: "71229",
        city: "Leonberg",
      }).eq("id", employeeId);

      await admin.from("employee_profiles").upsert({
        user_id: employeeId,
        provider_id: providerId,
        display_name: "Sven Krause",
        role: "farrier",
        status: "active",
      }, { onConflict: "user_id" });
    }

    // --- 4. UPDATE PARTNER PROFILE ---
    if (partnerId) {
      addLog("Setting up partner profile...");
      await admin.from("profiles").update({
        full_name: "Dr. Lisa Meier",
        phone: "+49 172 3334445",
        zip_code: "70173",
        city: "Stuttgart",
      }).eq("id", partnerId);
    }

    // --- 5. ACCESS GRANTS ---
    addLog("Setting up access grants...");
    // Provider <-> Client
    await admin.from("access_grants").upsert({
      provider_id: providerId,
      client_id: clientId,
      is_active: true,
      status: "active",
      can_view_basic: true,
      can_view_medical: true,
      can_create_appointments: true,
    }, { onConflict: "provider_id,client_id" });

    // --- 6. SERVICES ---
    addLog("Creating services...");
    // Delete existing demo services first
    await admin.from("services").delete().eq("provider_id", providerId);

    const services = [
      { provider_id: providerId, name: "Barhufpflege", description: "Professionelle Barhufbearbeitung inkl. Ganganalyse und Beratung", category: "Hufbearbeitung", base_price: 45, duration: 45, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 1 },
      { provider_id: providerId, name: "Beschlag Warmblut", description: "Klassischer Beschlag für Warmblüter mit 4 neuen Eisen", category: "Beschlag", base_price: 120, duration: 60, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 2 },
      { provider_id: providerId, name: "Beschlag Kaltblut", description: "Beschlag für Kaltblüter mit verstärkten Eisen", category: "Beschlag", base_price: 160, duration: 75, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 3 },
      { provider_id: providerId, name: "Orthopädischer Beschlag", description: "Spezialbeschlag bei Huferkrankungen, nach tierärztlicher Verordnung", category: "Spezial", base_price: 180, duration: 90, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 4 },
      { provider_id: providerId, name: "Klebeeisen / Klebebeschlag", description: "Schonende Alternative zum genagelten Beschlag", category: "Spezial", base_price: 200, duration: 90, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 5 },
      { provider_id: providerId, name: "Hufanalyse & Beratung", description: "Umfassende Hufanalyse mit digitalem Bericht", category: "Beratung", base_price: 35, duration: 30, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 6 },
      { provider_id: providerId, name: "Notfall-Beschlag", description: "Sofortiger Beschlag bei verlorenen Eisen oder akuten Problemen", category: "Notfall", base_price: 150, duration: 45, billing_type: "standard", booking_action: "request_only", is_active: true, sort_order: 7 },
    ];
    const { data: insertedServices } = await admin.from("services").insert(services).select("id, name");
    addLog(`Created ${insertedServices?.length || 0} services`);

    // --- 7. CONTACTS (Kunden des Providers) ---
    addLog("Creating contacts...");
    await admin.from("contacts").delete().eq("provider_id", providerId);

    const contacts = [
      { provider_id: providerId, full_name: "Maria Bergmann", email: CLIENT_EMAIL, phone: "+49 171 9876543", category: "client", zip_code: "71063", city: "Sindelfingen", street: "Eschenweg 12", profile_id: clientId, source: "demo" },
      { provider_id: providerId, full_name: "Thomas Keller", email: "thomas.keller@example.de", phone: "+49 172 1112233", category: "client", zip_code: "71034", city: "Böblingen", street: "Bahnhofstr. 5", source: "demo" },
      { provider_id: providerId, full_name: "Sabine Hofmann", email: "sabine.hofmann@example.de", phone: "+49 173 4445566", category: "client", zip_code: "71706", city: "Markgröningen", street: "Im Wiesengrund 8", source: "demo" },
      { provider_id: providerId, full_name: "Dr. Lisa Meier", email: PARTNER_EMAIL, phone: "+49 172 3334445", category: "partner", zip_code: "70173", city: "Stuttgart", street: "Königstraße 28", company_name: "Tierarztpraxis Dr. Meier", source: "demo" },
      { provider_id: providerId, full_name: "Reitverein Böblingen e.V.", email: "info@rv-boeblingen.de", phone: "+49 7031 555666", category: "client", zip_code: "71034", city: "Böblingen", street: "Reitweg 1", is_business: true, company_name: "Reitverein Böblingen e.V.", source: "demo" },
      { provider_id: providerId, full_name: "Julia Wendt", email: "julia.wendt@example.de", phone: "+49 176 7778899", category: "client", zip_code: "71272", city: "Renningen", street: "Gartenstr. 17", source: "demo" },
      { provider_id: providerId, full_name: "Hufschmiede-Bedarf Müller", email: "bestellung@hufbedarf-mueller.de", phone: "+49 711 9991111", category: "supplier" as any, zip_code: "70199", city: "Stuttgart", street: "Industriestr. 33", is_business: true, company_name: "Hufschmiede-Bedarf Müller GmbH", source: "demo" },
      { provider_id: providerId, full_name: "Anna Richter", email: "anna.richter@example.de", phone: "+49 157 2223344", category: "lead" as any, zip_code: "71065", city: "Sindelfingen", source: "demo", notes: "Hat über Instagram angefragt, möchte Beratungstermin" },
    ];
    const { data: insertedContacts, error: contactErr } = await admin.from("contacts").insert(contacts).select("id, full_name");
    if (contactErr) addLog(`Contact error: ${contactErr.message}`);
    else addLog(`Created ${insertedContacts?.length || 0} contacts`);

    // --- 8. HORSES ---
    addLog("Creating horses...");
    // Delete existing demo horses
    await admin.from("horses").delete().eq("owner_id", clientId);

    const horses = [
      {
        owner_id: clientId, name: "Carlotta", breed: "Hannoveraner", birth_year: 2016, gender: "mare", color: "Dunkelbraun",
        height_cm: 168, discipline: "Dressur", hoof_type: "normal", shoeing_interval: 8, equine_type: "Pferd", usage_type: "Dressur/Springen",
        special_notes: "Empfindlich an der rechten Hinterhand, leichte Strahlfäule rechts hinten", health_status: "Leichte Huffäule rechts hinten, wird behandelt",
        hoof_protection: "Eisen vorne, barhuf hinten", housing: "Box mit Paddock",
        readable_id: "EQID-DEMO01", nickname: "Lotta", location_name: "Reitstall Bergmann, Sindelfingen",
        recall_interval_weeks: 8, shoeing_status: "mixed",
      },
      {
        owner_id: clientId, name: "Fürst Donnerhall", breed: "Oldenburger", birth_year: 2019, gender: "gelding", color: "Rappe",
        height_cm: 172, discipline: "Springen", hoof_type: "flat", shoeing_interval: 6, equine_type: "Pferd", usage_type: "Springen",
        special_notes: "Braucht flache Eisen, neigt zu Hornspalten vorne links", health_status: "Gesund",
        hoof_protection: "Rundum beschlagen", housing: "Offenstall",
        readable_id: "EQID-DEMO02", nickname: "Donner", location_name: "Reitstall Bergmann, Sindelfingen",
        recall_interval_weeks: 6, shoeing_status: "shod",
      },
      {
        owner_id: clientId, name: "Sunny", breed: "Deutsches Reitpony", birth_year: 2014, gender: "mare", color: "Fuchs",
        height_cm: 142, discipline: "Freizeit", hoof_type: "hard", shoeing_interval: 10, equine_type: "Pony", usage_type: "Freizeit",
        special_notes: "Schnappt gerne beim Beschlag, braucht Geduld", health_status: "Gesund, gelegentlich Hufrehe-gefährdet",
        hoof_protection: "Barhuf", housing: "Offenstall mit Weidezugang",
        readable_id: "EQID-DEMO03", nickname: "Sunny", location_name: "Ponyhof Wendt, Renningen",
        recall_interval_weeks: 10, shoeing_status: "barefoot",
      },
    ];
    const { data: insertedHorses, error: horseErr } = await admin.from("horses").insert(horses).select("id, name, readable_id");
    if (horseErr) addLog(`Horse error: ${horseErr.message}`);
    else addLog(`Created ${insertedHorses?.length || 0} horses`);

    // --- 9. APPOINTMENTS (past + upcoming) ---
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
        // Past appointments (completed)
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(-56), time: "09:00", status: "completed", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Reitstall Bergmann, Sindelfingen", completed_at: d(-56) + "T10:00:00Z", notes: "Eisen vorne erneuert, hinten barhuf bearbeitet" },
        { provider_id: providerId, horse_id: insertedHorses[1].id, client_id: clientId, date: d(-56), time: "10:30", status: "completed", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Reitstall Bergmann, Sindelfingen", completed_at: d(-56) + "T11:30:00Z", notes: "Rundum beschlagen, flache Eisen" },
        { provider_id: providerId, horse_id: insertedHorses[2].id, client_id: clientId, date: d(-42), time: "14:00", status: "completed", service_type: barhuf?.name, price: 45, duration: 45, location: "Ponyhof Wendt, Renningen", completed_at: d(-42) + "T14:45:00Z", notes: "Barhuf-Pflege, Strahlfurchen gereinigt" },
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(-28), time: "09:00", status: "completed", service_type: ortho?.name, price: 180, duration: 90, location: "Reitstall Bergmann, Sindelfingen", completed_at: d(-28) + "T10:30:00Z", notes: "Orthopädischer Beschlag rechts hinten wegen Huffäule, Kunststoffkeil eingesetzt" },
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(-14), time: "09:00", status: "completed", service_type: analyse?.name, price: 35, duration: 30, location: "Reitstall Bergmann, Sindelfingen", completed_at: d(-14) + "T09:30:00Z", notes: "Kontrolltermin: Huffäule deutlich verbessert" },
        // Upcoming appointments
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(3), time: "09:00", status: "scheduled", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Reitstall Bergmann, Sindelfingen" },
        { provider_id: providerId, horse_id: insertedHorses[1].id, client_id: clientId, date: d(3), time: "10:30", status: "scheduled", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Reitstall Bergmann, Sindelfingen" },
        { provider_id: providerId, horse_id: insertedHorses[2].id, client_id: clientId, date: d(7), time: "14:00", status: "scheduled", service_type: barhuf?.name, price: 45, duration: 45, location: "Ponyhof Wendt, Renningen" },
        { provider_id: providerId, horse_id: insertedHorses[0].id, client_id: clientId, date: d(17), time: "09:00", status: "scheduled", service_type: analyse?.name, price: 35, duration: 30, location: "Reitstall Bergmann, Sindelfingen", notes: "Kontrolltermin Huffäule" },
        { provider_id: providerId, horse_id: insertedHorses[1].id, client_id: clientId, date: d(45), time: "10:00", status: "scheduled", service_type: beschlagWB?.name, price: 120, duration: 60, location: "Reitstall Bergmann, Sindelfingen" },
      ];
      const { data: insertedAppts, error: apptErr } = await admin.from("appointments").insert(appointments).select("id");
      if (apptErr) addLog(`Appointment error: ${apptErr.message}`);
      else addLog(`Created ${insertedAppts?.length || 0} appointments`);

      // --- 10. INVOICES for completed appointments ---
      addLog("Creating invoices...");
      await admin.from("invoices").delete().eq("provider_id", providerId);

      const invoices = [
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[0].id, invoice_number: "RE-2026-0001", issue_date: d(-56), due_date: d(-42), total_amount: 120, status: "paid", payment_status: "paid", paid_at: d(-50) + "T00:00:00Z", payment_method: "bank_transfer", notes: "Beschlag Warmblut – Carlotta" },
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[1].id, invoice_number: "RE-2026-0002", issue_date: d(-56), due_date: d(-42), total_amount: 120, status: "paid", payment_status: "paid", paid_at: d(-50) + "T00:00:00Z", payment_method: "bank_transfer", notes: "Beschlag Warmblut – Fürst Donnerhall" },
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[2].id, invoice_number: "RE-2026-0003", issue_date: d(-42), due_date: d(-28), total_amount: 45, status: "paid", payment_status: "paid", paid_at: d(-38) + "T00:00:00Z", payment_method: "cash", notes: "Barhufpflege – Sunny" },
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[0].id, invoice_number: "RE-2026-0004", issue_date: d(-28), due_date: d(-14), total_amount: 180, status: "paid", payment_status: "paid", paid_at: d(-20) + "T00:00:00Z", payment_method: "bank_transfer", notes: "Orthopädischer Beschlag – Carlotta" },
        { provider_id: providerId, client_id: clientId, horse_id: insertedHorses[0].id, invoice_number: "RE-2026-0005", issue_date: d(-14), due_date: d(0), total_amount: 35, status: "sent", payment_status: "pending", payment_method: "bank_transfer", notes: "Hufanalyse & Beratung – Carlotta" },
      ];
      const { error: invErr } = await admin.from("invoices").insert(invoices);
      if (invErr) addLog(`Invoice error: ${invErr.message}`);
      else addLog(`Created ${invoices.length} invoices`);
    }

    // --- 11. REVIEWS ---
    addLog("Creating reviews...");
    await admin.from("reviews").delete().eq("provider_id", providerId);

    const reviews = [
      { provider_id: providerId, reviewer_name: "Maria Bergmann", rating: 5, text: "Herr Schmidt kümmert sich hervorragend um unsere Pferde. Carlotta hatte Probleme mit Strahlfäule und dank seiner Expertise ist alles wieder top. Sehr zu empfehlen!", is_approved: true, is_visible: true, source: "direct", category: "service" },
      { provider_id: providerId, reviewer_name: "Thomas Keller", rating: 5, text: "Pünktlich, professionell und sehr einfühlsam mit den Pferden. Unser Wallach steht sonst nie still, aber bei Pascal ist er wie ausgewechselt.", is_approved: true, is_visible: true, source: "direct", category: "service" },
      { provider_id: providerId, reviewer_name: "Sabine Hofmann", rating: 4, text: "Sehr gute Arbeit, faire Preise. Die digitale Dokumentation über HufManager ist genial – ich kann jederzeit die Huf-Historie meiner Stute einsehen.", is_approved: true, is_visible: true, source: "direct", category: "service" },
      { provider_id: providerId, reviewer_name: "Julia Wendt", rating: 5, text: "Endlich ein Hufschmied, der sich Zeit nimmt und alles erklärt. Die Ganganalyse war super hilfreich. Mein Pony läuft seitdem viel besser!", is_approved: true, is_visible: true, source: "google", category: "service" },
      { provider_id: providerId, reviewer_name: "Peter Braun", rating: 5, text: "Top Hufschmied! Kompetent, zuverlässig und immer freundlich. Kann ich jedem Pferdebesitzer nur wärmstens empfehlen.", is_approved: true, is_visible: true, source: "google", category: "service" },
      { provider_id: providerId, reviewer_name: "Lisa Schwarz", rating: 4, text: "Sehr professionell und saubere Arbeit. Die Online-Terminbuchung und Rechnungsstellung machen alles unkompliziert.", is_approved: true, is_visible: true, source: "direct", category: "digital" },
    ];
    const { error: revErr } = await admin.from("reviews").insert(reviews);
    if (revErr) addLog(`Review error: ${revErr.message}`);
    else addLog(`Created ${reviews.length} reviews`);

    // --- 12. FEEDBACKS ---
    addLog("Creating feedbacks...");
    await admin.from("feedbacks").delete().eq("provider_id", providerId);

    const feedbacks = [
      { provider_id: providerId, customer_name: "Maria Bergmann", rating: 5, text: "Wie immer hervorragend! Carlotta steht super auf den neuen Eisen.", source: "app", is_featured: true },
      { provider_id: providerId, customer_name: "Thomas Keller", rating: 5, text: "Perfekter Termin, pünktlich und professionell.", source: "app", is_featured: true },
      { provider_id: providerId, customer_name: "Sabine Hofmann", rating: 4, text: "Alles bestens, nur die Anfahrt hat etwas länger gedauert.", source: "app", is_featured: false },
    ];
    const { error: fbErr } = await admin.from("feedbacks").insert(feedbacks);
    if (fbErr) addLog(`Feedback error: ${fbErr.message}`);
    else addLog(`Created ${feedbacks.length} feedbacks`);

    // --- 13. INVENTORY ---
    addLog("Creating inventory items...");
    await admin.from("inventory_items").delete().eq("user_id", providerId);

    const inventory = [
      { user_id: providerId, product_name: "Hufeisen Gr. 1 (Concave)", brand: "Mustad", category: "Eisen", current_stock: 24, min_stock: 8, price_purchase: 3.20, price_sell: 8.50, tax_rate: 19 },
      { user_id: providerId, product_name: "Hufeisen Gr. 2 (Concave)", brand: "Mustad", category: "Eisen", current_stock: 18, min_stock: 8, price_purchase: 3.50, price_sell: 9.00, tax_rate: 19 },
      { user_id: providerId, product_name: "Hufeisen Gr. 3 (Concave)", brand: "Mustad", category: "Eisen", current_stock: 12, min_stock: 6, price_purchase: 3.80, price_sell: 9.50, tax_rate: 19 },
      { user_id: providerId, product_name: "Hufnägel E-Head 5", brand: "Mustad", category: "Nägel", current_stock: 250, min_stock: 100, price_purchase: 0.08, price_sell: 0.15, tax_rate: 19 },
      { user_id: providerId, product_name: "Hufnägel E-Head 6", brand: "Mustad", category: "Nägel", current_stock: 200, min_stock: 100, price_purchase: 0.08, price_sell: 0.15, tax_rate: 19 },
      { user_id: providerId, product_name: "Keratex Hufhärter", brand: "Keratex", category: "Pflegemittel", current_stock: 3, min_stock: 1, price_purchase: 18.90, price_sell: 29.90, tax_rate: 19 },
      { user_id: providerId, product_name: "Bovi-Bond Kleber", brand: "Vettec", category: "Klebematerial", current_stock: 5, min_stock: 2, price_purchase: 22.50, price_sell: 35.00, tax_rate: 19 },
      { user_id: providerId, product_name: "Equilox Kleber", brand: "Equilox", category: "Klebematerial", current_stock: 2, min_stock: 1, price_purchase: 45.00, price_sell: 65.00, tax_rate: 19 },
      { user_id: providerId, product_name: "Einlagen Impression Material", brand: "Vettec", category: "Einlagen", current_stock: 6, min_stock: 2, price_purchase: 28.00, price_sell: 42.00, tax_rate: 19 },
      { user_id: providerId, product_name: "Raspel 14\"", brand: "Heller", category: "Werkzeug", current_stock: 2, min_stock: 1, price_purchase: 35.00, price_sell: 0, tax_rate: 19, notes: "Eigenbedarf, kein Verkauf" },
    ];
    const { error: invItemErr } = await admin.from("inventory_items").insert(inventory);
    if (invItemErr) addLog(`Inventory error: ${invItemErr.message}`);
    else addLog(`Created ${inventory.length} inventory items`);

    // --- 14. OFFERS ---
    addLog("Creating offers...");
    await admin.from("offers").delete().eq("provider_id", providerId);

    const offers = [
      { provider_id: providerId, title: "Rundum-Sorglos-Paket", description: "Barhufpflege + Hufanalyse + digitaler Bericht – ideal für Erstbesuche.", price: 65, price_type: "fixed", is_active: true, sort_order: 1, offer_type: "package", display_mode: "featured", billing_type: "one_time", features: '["Barhufpflege","Hufanalyse","Digitaler Bericht","Empfehlung nächster Termin"]' },
      { provider_id: providerId, title: "Beschlag-Abo (6 Monate)", description: "6 Beschlagtermine zum Vorzugspreis. Regelmäßig, zuverlässig, planbar.", price: 99, price_type: "monthly", is_active: true, sort_order: 2, offer_type: "subscription", display_mode: "visible", billing_type: "monthly", features: '["6 Beschlagtermine","Termingarantie","10% Rabatt","Prioritäts-Buchung"]' },
      { provider_id: providerId, title: "Notfall-Beschlag", description: "Schnelle Hilfe bei verlorenen Eisen – innerhalb von 24h.", price: 150, price_type: "fixed", is_active: true, sort_order: 3, offer_type: "service", display_mode: "visible", billing_type: "one_time", features: '["24h Reaktionszeit","Anfahrt inklusive","Sofort-Beschlag"]' },
    ];
    const { error: offerErr } = await admin.from("offers").insert(offers);
    if (offerErr) addLog(`Offer error: ${offerErr.message}`);
    else addLog(`Created ${offers.length} offers`);

    // --- 15. HORSE PARTNER ACCESS (for Fachpartner) ---
    if (partnerId && insertedHorses && insertedHorses.length > 0) {
      addLog("Setting up partner access to horses...");
      
      for (const horse of insertedHorses.slice(0, 2)) {
        await admin.from("horse_partner_access").upsert({
          horse_id: horse.id,
          partner_id: partnerId,
          granted_by: providerId,
          status: "active",
          can_view_basic: true,
          can_view_medical: true,
          can_view_hoof_history: true,
          can_write_notes: true,
        }, { onConflict: "horse_id,partner_id" });
      }
      addLog("Partner access granted for 2 horses");

      // Create a partner treatment note
      await admin.from("partner_treatment_notes").insert({
        horse_id: insertedHorses[0].id,
        partner_id: partnerId,
        note_type: "treatment",
        title: "Kontrolluntersuchung Huffäule",
        content: "Strahlfäule rechts hinten deutlich verbessert seit orthopädischem Beschlag. Empfehle weiterhin regelmäßige Desinfektion und trockene Einstreu. Nächste Kontrolle in 4 Wochen.",
      });
      addLog("Created partner treatment note");
    }

    // --- 16. EMPLOYEE ASSIGNMENT ---
    if (employeeId && insertedHorses) {
      addLog("Creating employee assignment...");
      const futureAppts = await admin.from("appointments").select("id").eq("provider_id", providerId).eq("status", "scheduled").limit(2);

      if (futureAppts.data && futureAppts.data.length > 0) {
        await admin.from("employee_assignments").upsert({
          employee_id: employeeId,
          provider_id: providerId,
          appointment_id: futureAppts.data[0].id,
          status: "assigned",
          instructions: "Bitte Barhufpflege durchführen. Fotos vom Strahl machen.",
        }, { onConflict: "employee_id,appointment_id" });
        addLog("Employee assignment created");
      }
    }

    // --- 17. MAGIC LINK for provider ---
    addLog("Creating magic link...");
    await admin.from("magic_links").delete().eq("provider_id", providerId);
    await admin.from("magic_links").insert({
      provider_id: providerId,
      slug: "demo",
      is_active: true,
    });
    addLog("Magic link created: /m/demo");

    // --- 18. NOTIFICATIONS ---
    addLog("Creating sample notifications...");
    await admin.from("notifications").delete().eq("user_id", providerId);
    await admin.from("notifications").delete().eq("user_id", clientId);

    const notifications = [
      { user_id: providerId, title: "Neues Feedback erhalten", message: "Maria Bergmann hat dir 5 Sterne gegeben: \"Wie immer hervorragend!\"", type: "feedback", link: "/bewertungen" },
      { user_id: providerId, title: "Termin in 3 Tagen", message: "Carlotta (Maria Bergmann) – Beschlag am " + d(3), type: "reminder", link: "/kalender" },
      { user_id: providerId, title: "Rechnung fällig", message: "RE-2026-0005 (35,00 €) wartet auf Zahlung", type: "invoice", link: "/rechnungen" },
      { user_id: clientId, title: "Nächster Termin", message: "Beschlag für Carlotta am " + d(3) + " um 09:00 Uhr", type: "appointment", link: "/client-home" },
      { user_id: clientId, title: "Rechnung erhalten", message: "Neue Rechnung RE-2026-0005 über 35,00 € von Hufschmiede Schmidt", type: "invoice", link: "/client-home" },
    ];
    await admin.from("notifications").insert(notifications);
    addLog(`Created ${notifications.length} notifications`);

    addLog("✅ Demo data seeding complete!");

    await admin.from("profiles").update({ full_name: "Pascal Schmidt" }).eq("id", providerId);

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
