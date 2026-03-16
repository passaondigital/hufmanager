import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First disable problematic triggers on profiles table
    await supabaseAdmin.rpc('exec_sql', { sql: "ALTER TABLE public.profiles DISABLE TRIGGER ALL;" }).catch(() => {});
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: "hufmanagerbusiness@gmail.com",
      password: "HMBusiness2030Demo!",
      email_confirm: true,
      user_metadata: { full_name: "HufManager Business Demo" },
    });

    // Re-enable triggers
    await supabaseAdmin.rpc('exec_sql', { sql: "ALTER TABLE public.profiles ENABLE TRIGGER ALL;" }).catch(() => {});

    if (error) {
      console.error("Create user error:", JSON.stringify(error));
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Manually set readable_id and role for the created user
    const userId = data.user.id;
    
    // Update profile with readable_id
    await supabaseAdmin
      .from("profiles")
      .update({ readable_id: "BID-" + Math.floor(100000 + Math.random() * 900000) })
      .eq("id", userId)
      .is("readable_id", null);

    console.log("User created:", userId);
    return new Response(JSON.stringify({ message: "User created", id: userId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
