import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Kein Bild übermittelt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Strip data URL prefix if present
    const rawBase64 = imageBase64.startsWith("data:")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const systemPrompt = `Du bist ein professioneller Beleg-Scanner für ein Hufschmied-Betriebsmanagement-System.
Analysiere das Foto eines Belegs/Quittung/Rechnung und extrahiere die folgenden Informationen.

Antworte AUSSCHLIESSLICH mit dem tool-call, keine weitere Erklärung.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        tools: [
          {
            name: "extract_receipt_data",
            description: "Extrahiert strukturierte Daten aus einem Beleg/Quittung/Rechnung.",
            input_schema: {
              type: "object",
              properties: {
                document_type: {
                  type: "string",
                  enum: ["quittung", "rechnung", "kassenbon", "tankbeleg", "lieferschein", "sonstiges"],
                  description: "Art des Belegs",
                },
                vendor_name: {
                  type: "string",
                  description: "Name des Geschäfts/Lieferanten/Ausstellers",
                },
                total_amount: {
                  type: "number",
                  description: "Gesamtbetrag in EUR (nur die Zahl, z.B. 49.99)",
                },
                tax_amount: {
                  type: "number",
                  description: "MwSt-Betrag falls erkennbar",
                },
                tax_rate: {
                  type: "number",
                  description: "MwSt-Satz in Prozent falls erkennbar (z.B. 19)",
                },
                date: {
                  type: "string",
                  description: "Datum des Belegs im Format YYYY-MM-DD",
                },
                category: {
                  type: "string",
                  enum: ["material", "treibstoff", "fortbildung", "werkzeug", "sonstiges"],
                  description: "Kategorie: material (Hufeisen, Nägel, Beschlag), treibstoff (Diesel, Benzin, Tankbelege), fortbildung (Kurse, Seminare), werkzeug (Raspel, Zangen, Amboss), sonstiges (alles andere)",
                },
                description: {
                  type: "string",
                  description: "Kurze Beschreibung des Beleginhalts (max 100 Zeichen)",
                },
                line_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "number" },
                      unit_price: { type: "number" },
                      total: { type: "number" },
                    },
                  },
                  description: "Einzelne Positionen falls erkennbar",
                },
                confidence: {
                  type: "number",
                  description: "Konfidenz der Erkennung von 0 bis 1 (1 = sehr sicher)",
                },
              },
              required: ["document_type", "total_amount", "category", "description", "confidence"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_receipt_data" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: rawBase64,
                },
              },
              {
                type: "text",
                text: "Analysiere diesen Beleg und extrahiere alle relevanten Informationen.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate-Limit erreicht, bitte später erneut versuchen." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("Anthropic API error:", response.status, text);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const toolBlock = data.content?.find((b: any) => b.type === "tool_use");

    if (!toolBlock?.input) {
      throw new Error("Keine strukturierte Antwort vom AI-Modell");
    }

    return new Response(JSON.stringify(toolBlock.input), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scan-receipt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
