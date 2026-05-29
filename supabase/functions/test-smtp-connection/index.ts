import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_name?: string;
  test_to?: string;
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

    const config: SmtpConfig = await req.json();

    // Verbindungstest via Nodemailer-kompatible Deno-SMTP
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: config.port,
        tls: config.secure,
        auth: { username: config.user, password: config.password },
      },
    });

    const testTo = config.test_to ?? user.email ?? config.user;
    await client.send({
      from: `${config.from_name ?? "Hufi"} <${config.user}>`,
      to: testTo,
      subject: "Hufi — E-Mail-Verbindung erfolgreich ✓",
      content: "Deine E-Mail-Verbindung mit Hufi funktioniert. Du kannst jetzt Rechnungen und Nachrichten direkt aus Hufi senden.",
    });
    await client.close();

    return new Response(JSON.stringify({ success: true, message: "Testmail gesendet an " + testTo }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    let friendly = "Verbindung fehlgeschlagen.";
    if (msg.includes("535") || msg.includes("auth") || msg.includes("535")) {
      friendly = "Passwort falsch oder App-Passwort fehlt.";
    } else if (msg.includes("timeout") || msg.includes("ECONNREFUSED")) {
      friendly = "Server nicht erreichbar. Host oder Port prüfen.";
    } else if (msg.includes("certificate") || msg.includes("TLS")) {
      friendly = "SSL/TLS-Fehler. Versuche es mit Port 587 (STARTTLS).";
    }
    return new Response(JSON.stringify({ success: false, message: friendly, detail: msg }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
