import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendRequest {
  email_account_id: string;
  to: string;
  to_name?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string; encoding: "base64" }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), { status: 401, headers: corsHeaders });

    const body: SendRequest = await req.json();

    // SMTP-Konfiguration aus DB laden
    const { data: account, error: accErr } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("id", body.email_account_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "E-Mail-Konto nicht gefunden" }), { status: 404, headers: corsHeaders });
    }

    const acc = account as {
      smtp_host: string; smtp_port: number; smtp_secure: boolean;
      smtp_user: string; smtp_password: string; display_name: string; email_address: string;
    };

    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: acc.smtp_host,
        port: acc.smtp_port,
        tls: acc.smtp_secure,
        auth: { username: acc.smtp_user, password: acc.smtp_password },
      },
    });

    await client.send({
      from: `${acc.display_name ?? "Hufi"} <${acc.email_address}>`,
      to: body.to_name ? `${body.to_name} <${body.to}>` : body.to,
      subject: body.subject,
      html: body.html,
      content: body.text ?? body.html.replace(/<[^>]+>/g, ""),
    });
    await client.close();

    // last_used_at aktualisieren
    await supabase
      .from("email_accounts")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", body.email_account_id)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
