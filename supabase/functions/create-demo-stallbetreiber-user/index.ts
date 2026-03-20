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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await supabase.auth.admin.createUser({
      email: "hufmanagerstallbetreiber@gmail.com",
      password: "HufManagerDemo2030!",
      email_confirm: true,
      user_metadata: { full_name: "Demo-Stallbetreiber" },
    });

    if (error) {
      console.error("Admin create error:", JSON.stringify(error));
      return new Response(JSON.stringify({ error: error.message, code: error.status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set role on profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "client" })
      .eq("id", data.user.id);

    if (profileError) {
      console.error("Profile update error:", JSON.stringify(profileError));
    }

    return new Response(JSON.stringify({ ok: true, id: data.user.id }), {
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
