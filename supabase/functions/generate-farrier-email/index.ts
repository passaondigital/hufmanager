import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      horseName, 
      horseBreed, 
      ownerName,
      notes,
      photoCount,
      hoofPositions,
      documentationDate
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du bist ein Assistent für Pferdebesitzer und Hufbearbeiter.
Erstelle einen professionellen, freundlichen E-Mail-Entwurf auf Deutsch.
Der E-Mail-Entwurf sollte:
- Höflich und professionell sein
- Die wichtigsten Informationen zusammenfassen
- Für Hufschmiede/Hufbearbeiter verständlich sein
- Maximal 200 Wörter lang sein`;

    const userPrompt = `Erstelle einen E-Mail-Entwurf für den Hufbearbeiter mit folgenden Informationen:

Pferd: ${horseName}${horseBreed ? ` (${horseBreed})` : ""}
Besitzer: ${ownerName || "Nicht angegeben"}
Dokumentation vom: ${documentationDate}
Anzahl Fotos: ${photoCount}
Dokumentierte Hufe: ${hoofPositions.join(", ")}

${notes ? `Notizen des Besitzers:\n${notes}` : "Keine zusätzlichen Notizen."}

Bitte erstelle einen freundlichen E-Mail-Entwurf, der diese Dokumentation ankündigt und anbietet, die Bilder zu teilen.`;

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
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const emailDraft = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ emailDraft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-farrier-email error:", error);
    
    // Provide a fallback template
    const fallbackEmail = `Sehr geehrter Hufbearbeiter,

ich habe heute eine Huf-Dokumentation erstellt und würde Ihnen gerne die Bilder zukommen lassen.

Bei Fragen stehe ich gerne zur Verfügung.

Mit freundlichen Grüßen`;
    
    return new Response(
      JSON.stringify({ 
        emailDraft: fallbackEmail,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
