import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist HufiAI, der KI-Assistent für professionelle Hufbearbeiter im HufManager-System.

Du erhältst eine Sprachnotiz (transkribiert) eines Hufbearbeiters der gerade ein Pferd bearbeitet hat oder bearbeitet.

Extrahiere folgende Informationen und gib sie als JSON zurück:

{
  "befund": "string – Was wurde beobachtet? Zustand der Hufe, Auffälligkeiten, Veränderungen seit letztem Mal",
  "massnahme": "string – Was wurde gemacht? Bearbeitungsschritte, Werkzeuge, Technik",
  "empfehlung": "string – Was wird empfohlen? Nächste Schritte, Hinweise für Besitzer, Empfehlung an Tierarzt/Osteopath",
  "huf_werte": {
    "toe_length_mm": "number | null",
    "heel_height_mm": "number | null",
    "hoof_angle_degrees": "number | null",
    "frog_quality": "'healthy' | 'soft' | 'thrush' | 'damaged' | null",
    "wall_quality": "'good' | 'chipped' | 'cracked' | 'thin' | null"
  },
  "naechster_termin_wochen": "number | null – Empfohlenes Intervall in Wochen",
  "dringend_tierarzt": "boolean – Ist eine Tierarzt-Überweisung empfohlen?",
  "dringend_osteo": "boolean – Ist eine Osteopathie-Empfehlung ausgesprochen?"
}

Wenn eine Information nicht in der Sprachnotiz erwähnt wird, setze den Wert auf null.
Antworte NUR mit dem JSON, kein Erklärungstext.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { horse_id, appointment_id, audio_url, transcript } = await req.json();

    if (!horse_id) {
      return new Response(JSON.stringify({ error: "horse_id erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalTranscript = transcript || "";

    // If no transcript provided, use audio_url as context (we can't transcribe without external STT)
    // In this implementation, we accept transcript directly or manual text
    if (!finalTranscript && audio_url) {
      // Fallback: inform that transcript is needed
      finalTranscript = "[Audio-Datei hochgeladen – bitte Text eingeben für AI-Analyse]";
    }

    if (!finalTranscript || finalTranscript.startsWith("[Audio")) {
      return new Response(JSON.stringify({
        success: false,
        error: "Transkription benötigt. Bitte Text eingeben.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway for structured extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: finalTranscript },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate-Limit erreicht. Bitte später erneut versuchen." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI-Credits erschöpft." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI-Analyse fehlgeschlagen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let finding: any;
    try {
      // Strip potential markdown code blocks
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      finding = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({
        success: false,
        error: "AI-Antwort konnte nicht verarbeitet werden",
        raw: content,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store AI interaction for audit
    await supabase.from("ai_chat_messages").insert({
      user_id: user.id,
      role: "user",
      content: `[Voice Finding] ${finalTranscript.substring(0, 500)}`,
    });

    return new Response(JSON.stringify({
      success: true,
      transcript: finalTranscript,
      finding: {
        befund: finding.befund || "",
        massnahme: finding.massnahme || "",
        empfehlung: finding.empfehlung || "",
        huf_werte: finding.huf_werte || {
          toe_length_mm: null,
          heel_height_mm: null,
          hoof_angle_degrees: null,
          frog_quality: null,
          wall_quality: null,
        },
        naechster_termin_wochen: finding.naechster_termin_wochen ?? null,
        dringend_tierarzt: finding.dringend_tierarzt === true,
        dringend_osteo: finding.dringend_osteo === true,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hufi-ai-voice-finding error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
