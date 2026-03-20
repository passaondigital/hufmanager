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

    // Test with a completely different email to see if it's a general issue
    const testEmail = `test-stallbetreiber-${Date.now()}@test.com`;
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: { full_name: "Test User" },
    });

    if (error) {
      return new Response(JSON.stringify({ 
        error: error.message, 
        testEmail,
        hint: "General user creation is broken" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up test user
    await supabase.auth.admin.deleteUser(data.user.id);

    // Now try the real user
    const { data: realData, error: realError } = await supabase.auth.admin.createUser({
      email: "hufmanagerstallbetreiber@gmail.com",
      password: "HufManagerDemo2030!",
      email_confirm: true,
      user_metadata: { full_name: "Demo-Stallbetreiber" },
    });

    if (realError) {
      return new Response(JSON.stringify({ 
        error: realError.message,
        testWorked: true,
        hint: "Test user worked but stallbetreiber failed"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: realData.user.id }), {
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
