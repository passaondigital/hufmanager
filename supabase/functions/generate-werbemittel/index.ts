import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, audiences, tone } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Du bist Marketing-Experte für Pferdeprodukte im DACH-Raum. Erstelle 3 verschiedene Marketing-Textvarianten für HufManager - die digitale Pferdeakte.

Leitbild HufManager: Pferdeschutz & Datenschutz sind dasselbe.
USP: Pferdebesitzer behalten absolute Datensouveränität.
Die Kunden-App ist kostenlos.

Antworte NUR als valides JSON ohne Markdown-Backticks:
{"variants":[{"headline":"max 8 Wörter, emotional","subtext":"max 20 Wörter, Nutzen klar","cta":"max 4 Wörter, Handlungsaufforderung"}]}`;

    const userMessage = `Kontext: ${prompt || "Allgemeine Empfehlung für die digitale Pferdeakte"}
Zielgruppe: ${audiences || "Pferdebesitzer"}
Ton: ${tone || "Emotional & herzlich"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte versuche es gleich erneut." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Kontingent aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "KI-Fehler" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from content
    let variants;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      variants = JSON.parse(cleaned).variants;
    } catch {
      // Fallback variants
      variants = [
        { headline: "Dein Pferd verdient mehr", subtext: "Die digitale Pferdeakte — alle Daten sicher, immer dabei.", cta: "Jetzt entdecken" },
        { headline: "Sicherheit für dein Pferd", subtext: "Impfpass, Befunde, Behandlungen — alles an einem Ort.", cta: "Kostenlos starten" },
        { headline: "Schütze was du liebst", subtext: "Mit HufManager behältst du den Überblick über die Gesundheit deines Pferdes.", cta: "Mehr erfahren" },
      ];
    }

    return new Response(JSON.stringify({ variants }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-werbemittel error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
