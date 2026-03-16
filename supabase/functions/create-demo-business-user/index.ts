import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: "hufmanagerbusiness@gmail.com",
      password: "HMBusiness2030Demo!",
      email_confirm: true,
      user_metadata: { full_name: "HufManager Business Demo" },
    });

    if (error) {
      console.error("Create user error:", JSON.stringify(error));
      return new Response(JSON.stringify({ error: error.message, details: JSON.stringify(error) }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("User created:", data.user.id);
    return new Response(JSON.stringify({ message: "User created", id: data.user.id }), {
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
