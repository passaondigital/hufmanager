import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || token.length < 10) {
      return new Response(JSON.stringify({ error: "Ungültiger Token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "Passwort muss mindestens 8 Zeichen haben" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch employee by invitation token
    const { data: employee, error: empError } = await supabaseAdmin
      .from("employee_profiles")
      .select("id, full_name, email, invitation_sent_at, invitation_accepted_at")
      .eq("invitation_token", token)
      .is("invitation_accepted_at", null)
      .single();

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: "Einladung ungültig oder bereits verwendet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry (7 days)
    if (employee.invitation_sent_at) {
      const sentAt = new Date(employee.invitation_sent_at);
      const expiresAt = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() > expiresAt) {
        return new Response(JSON.stringify({ error: "Diese Einladung ist abgelaufen" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create user via admin API (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: employee.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: employee.full_name,
        role: "employee",
      },
    });

    if (authError) {
      console.error("[accept-employee-invitation] Auth error:", authError.message);
      // If user already exists, try to find them
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        return new Response(JSON.stringify({ error: "E-Mail-Adresse ist bereits registriert. Bitte melde dich mit deinem bestehenden Konto an." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Konto konnte nicht erstellt werden: " + authError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Update employee profile with user_id and mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from("employee_profiles")
      .update({
        user_id: userId,
        invitation_accepted_at: new Date().toISOString(),
        invitation_token: null,
        status: "active",
      })
      .eq("id", employee.id);

    if (updateError) {
      console.error("[accept-employee-invitation] Update error:", updateError.message);
      // Cleanup: delete the auth user since we couldn't link it
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Profil konnte nicht aktualisiert werden" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add employee role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "employee" });

    if (roleError) {
      console.error("[accept-employee-invitation] Role error:", roleError.message);
      // Non-fatal - role can be fixed later
    }

    console.log("[accept-employee-invitation] Success for user:", userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[accept-employee-invitation] Error:", e.message);
    return new Response(JSON.stringify({ error: "Ein Fehler ist aufgetreten" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
