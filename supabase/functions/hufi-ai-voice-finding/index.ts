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

    // Support both JSON and FormData (audio file upload)
    const contentType = req.headers.get("content-type") || "";
    let horse_id: string | null = null;
    let appointment_id: string | null = null;
    let audio_url: string | null = null;
    let transcript: string | null = null;
    let audioBlob: Blob | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      horse_id = formData.get("horse_id") as string;
      appointment_id = formData.get("appointment_id") as string;
      transcript = formData.get("transcript") as string;
      const audioFile = formData.get("audio") as File;
      if (audioFile) {
        audioBlob = audioFile;
      }
    } else {
      const body = await req.json();
      horse_id = body.horse_id;
      appointment_id = body.appointment_id;
      audio_url = body.audio_url;
      transcript = body.transcript;
      // Accept base64 audio
      if (body.audio_base64) {
        const binaryStr = atob(body.audio_base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: body.audio_mime || "audio/webm" });
      }
    }

    if (!horse_id) {
      return new Response(JSON.stringify({ error: "horse_id erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalTranscript = transcript || "";

    // Step 1: Transcribe audio using ElevenLabs STT if we have audio but no transcript
    if (!finalTranscript && (audioBlob || audio_url)) {
      const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

      if (ELEVENLABS_API_KEY) {
        try {
          let audioData: Blob;

          if (audioBlob) {
            audioData = audioBlob;
          } else if (audio_url) {
            // Download audio from URL
            const audioResp = await fetch(audio_url);
            if (!audioResp.ok) throw new Error("Audio-Download fehlgeschlagen");
            audioData = await audioResp.blob();
          } else {
            throw new Error("Keine Audio-Daten");
          }

          console.log("[voice-finding] Transcribing with ElevenLabs STT, size:", audioData.size);

          const sttFormData = new FormData();
          sttFormData.append("file", audioData, "recording.webm");
          sttFormData.append("model_id", "scribe_v2");
          sttFormData.append("language_code", "deu");

          const sttResp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
            },
            body: sttFormData,
          });

          if (!sttResp.ok) {
            const errText = await sttResp.text();
            console.error("[voice-finding] ElevenLabs STT error:", sttResp.status, errText);
            throw new Error(`STT failed: ${sttResp.status}`);
          }

          const sttResult = await sttResp.json();
          finalTranscript = sttResult.text || "";
          console.log("[voice-finding] Transcription result:", finalTranscript.substring(0, 100));
        } catch (sttErr) {
          console.error("[voice-finding] STT error:", sttErr);
          return new Response(JSON.stringify({
            success: false,
            error: "Spracherkennung fehlgeschlagen. Bitte versuche die Texteingabe.",
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        console.warn("[voice-finding] No ELEVENLABS_API_KEY set, cannot transcribe audio");
        return new Response(JSON.stringify({
          success: false,
          error: "Spracherkennung nicht konfiguriert. Bitte Text eingeben.",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!finalTranscript) {
      return new Response(JSON.stringify({
        success: false,
        error: "Keine Sprach- oder Textdaten empfangen.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Anthropic API für strukturierte Extraktion
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: "AI nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: finalTranscript }],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error("Anthropic API error:", status);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate-Limit erreicht. Bitte später erneut versuchen." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI-Analyse fehlgeschlagen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.content?.[0]?.text || "";

    // Parse JSON from AI response
    let finding: any;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      finding = JSON.parse(cleaned);
    } catch {
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
