import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to create the user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: "hufmanagerstallbetreiber@gmail.com",
      password: "HufManagerDemo2030",
      email_confirm: true,
      user_metadata: { full_name: "Demo-Stallbetreiber", role: "client" },
    });

    if (error) {
      // If user already exists, update password instead
      if (error.message?.includes("already") || error.message?.includes("duplicate")) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listData?.users?.find(
          (u) => u.email === "hufmanagerstallbetreiber@gmail.com"
        );
        if (existing) {
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: "HufManagerDemo2030",
          });
          return new Response(JSON.stringify({ ok: true, id: existing.id, action: "password_reset" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      console.error("Create error:", JSON.stringify(error));
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure profile exists
    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      email: "hufmanagerstallbetreiber@gmail.com",
      full_name: "Demo-Stallbetreiber",
      role: "client",
    }, { onConflict: "id" });

    return new Response(JSON.stringify({ ok: true, id: data.user.id, action: "created" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Exception:", String(e));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
