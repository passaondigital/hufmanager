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
    fullName: "Demo Pferdebesitzer",
    role: "client",
    readableIdPrefix: "KID-DEMO01",
  },
  {
    email: "mitarbeiter.hufmanager@gmail.com",
    fullName: "Demo Mitarbeiter",
    role: "employee",
    readableIdPrefix: "EID-DEMO01",
  },
  {
    email: "partner.hufmanager@gmail.com",
    fullName: "Demo Fachpartner",
    role: "partner",
    readableIdPrefix: "PRID-DEMO01",
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

    for (const account of DEMO_ACCOUNTS) {
      console.log(`Processing demo account: ${account.email}`);

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === account.email.toLowerCase()
      );

      let userId: string;

      if (existing) {
        userId = existing.id;
        console.log(`User already exists: ${userId}`);

        // Reset password
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: DEMO_PASSWORD,
          email_confirm: true,
        });
      } else {
        // Create the user
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: account.fullName,
            role: account.role,
          },
        });

        if (createErr) {
          console.error(`Error creating ${account.email}:`, createErr);
          results.push({ email: account.email, status: "error", error: createErr.message });
          continue;
        }

        userId = newUser.user!.id;
        console.log(`User created: ${userId}`);
      }

      // Ensure profile exists and is updated
      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: account.email,
          full_name: account.fullName,
          readable_id: account.readableIdPrefix,
          plan_override: "lifetime_grant",
          subscription_plan: "pro",
        }, { onConflict: "id" });

      if (profileErr) {
        console.error(`Profile error for ${account.email}:`, profileErr);
      }

      // Ensure role exists
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: account.role,
        }, { onConflict: "user_id,role" });

      if (roleErr) {
        console.error(`Role error for ${account.email}:`, roleErr);
      }

      // For provider: create business_settings
      if (account.role === "provider") {
        await supabaseAdmin
          .from("business_settings")
          .upsert({
            id: userId,
            user_id: userId,
            business_name: "Demo Hufbearbeitung",
            owner_name: account.fullName,
          }, { onConflict: "user_id" });
      }

      // For employee: create employee_profile linked to provider
      if (account.role === "employee") {
        // Find demo provider
        const { data: providerProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", "hufbearbeiter.hufmanager@gmail.com")
          .maybeSingle();

        if (providerProfile) {
          const { error: empErr } = await supabaseAdmin
            .from("employee_profiles")
            .upsert({
              user_id: userId,
              provider_id: providerProfile.id,
              display_name: account.fullName,
              role: "farrier",
              status: "active",
            }, { onConflict: "user_id" });

          if (empErr) {
            console.error(`Employee profile error:`, empErr);
          }
        }
      }

      // For client: create access_grant to provider
      if (account.role === "client") {
        const { data: providerProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", "hufbearbeiter.hufmanager@gmail.com")
          .maybeSingle();

        if (providerProfile) {
          await supabaseAdmin
            .from("access_grants")
            .upsert({
              provider_id: providerProfile.id,
              client_id: userId,
              is_active: true,
              status: "active",
              can_view_basic: true,
              can_view_medical: true,
              can_create_appointments: true,
            }, { onConflict: "provider_id,client_id" });
        }
      }

      // For partner: create access_grant with partner_email
      if (account.role === "partner") {
        const { data: providerProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", "hufbearbeiter.hufmanager@gmail.com")
          .maybeSingle();

        const { data: clientProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", "pferdebesitzer.hufmanager@gmail.com")
          .maybeSingle();

        if (providerProfile && clientProfile) {
          await supabaseAdmin
            .from("access_grants")
            .upsert({
              provider_id: providerProfile.id,
              client_id: clientProfile.id,
              partner_email: account.email,
              partner_name: account.fullName,
              is_active: true,
              status: "active",
              can_view_basic: true,
              can_view_medical: true,
              can_create_appointments: false,
            }, { onConflict: "provider_id,client_id" });
        }
      }

      results.push({ email: account.email, userId, status: "ok" });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
