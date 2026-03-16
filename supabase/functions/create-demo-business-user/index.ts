import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const found = existing?.users?.find(
    (u) => u.email === "hufmanagerbusiness@gmail.com"
  );

  if (found) {
    return new Response(JSON.stringify({ message: "User already exists", id: found.id }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: "hufmanagerbusiness@gmail.com",
    password: "HMB2030+",
    email_confirm: true,
    user_metadata: { full_name: "HufManager Business Demo" },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: "User created", id: data.user.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
