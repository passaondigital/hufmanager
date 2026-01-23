import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisResult {
  isAcceptable: boolean;
  quality: {
    sharpness: "good" | "acceptable" | "poor";
    lighting: "good" | "acceptable" | "poor";
    distance: "good" | "too_close" | "too_far";
  };
  perspective: {
    isCorrect: boolean;
    suggestion?: string;
  };
  cleanliness: {
    isClean: boolean;
    suggestion?: string;
  };
  overallFeedback: string;
  score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, hoofPosition, viewAngle, horseName } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du bist ein Experte für Hufanalyse und Fotodokumentation. 
Analysiere das Huf-Foto und bewerte folgende Kriterien:

1. **Bildqualität**: Schärfe, Belichtung, Abstand
2. **Perspektive**: Ist die ${viewAngle}-Ansicht korrekt aufgenommen?
3. **Sauberkeit**: Ist der Huf sauber genug für die Dokumentation?

Antworte NUR im folgenden JSON-Format:
{
  "isAcceptable": true/false,
  "quality": {
    "sharpness": "good" | "acceptable" | "poor",
    "lighting": "good" | "acceptable" | "poor", 
    "distance": "good" | "too_close" | "too_far"
  },
  "perspective": {
    "isCorrect": true/false,
    "suggestion": "Falls falsch, kurzer Tipp"
  },
  "cleanliness": {
    "isClean": true/false,
    "suggestion": "Falls schmutzig, kurzer Tipp"
  },
  "overallFeedback": "Kurzes, hilfreiches Feedback auf Deutsch (max 50 Wörter)",
  "score": 0-100
}`;

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analysiere dieses Huf-Foto.
Pferd: ${horseName || "Unbekannt"}
Huf-Position: ${hoofPosition}
Ansicht: ${viewAngle}

Bitte gib eine JSON-Analyse zurück.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Bitte versuche es später erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API-Credits aufgebraucht. Bitte laden Sie Credits nach." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let analysis: AnalysisResult;
    try {
      // Extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default acceptable result if parsing fails
      analysis = {
        isAcceptable: true,
        quality: { sharpness: "acceptable", lighting: "acceptable", distance: "good" },
        perspective: { isCorrect: true },
        cleanliness: { isClean: true },
        overallFeedback: "Foto wurde aufgenommen. KI-Analyse nicht verfügbar.",
        score: 70,
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-hoof-image error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        // Fallback to allow photo capture even if analysis fails
        isAcceptable: true,
        overallFeedback: "Analyse nicht verfügbar. Foto wurde trotzdem gespeichert."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
