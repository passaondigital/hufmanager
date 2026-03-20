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

    // Use signUp via the regular auth endpoint (not admin) to bypass potential admin API issues
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Try admin API with minimal metadata
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
    const result = await response.json();
    
    if (!response.ok) {
      console.error("Auth API error:", JSON.stringify(result));
      
      // If user exists, try updating password
      if (result.msg?.includes("already") || result.code === 422) {
        return new Response(JSON.stringify({ error: "User may already exist", details: result }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: result.msg || "Unknown error", details: result }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: result.id, action: "created" }), {
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