import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // x-correlation-id fehlte hier -- derselbe CORS-Bug wie in hufi-agent:
  // die echte POST-Anfrage (ElevenLabs-Aufruf) wurde vom Browser nach dem
  // Preflight blockiert, kein Server-Log entstand. Die Anfrage erreicht mit
  // diesem Header die ElevenLabs-Ausgabe vollständig.
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

// Maximale Textlänge pro Anfrage (Zeichen) — schützt vor API-Missbrauch
const MAX_TEXT_LENGTH = 1000;

// Erlaubte ElevenLabs Modelle
const ALLOWED_MODELS = new Set([
  "eleven_multilingual_v2",
  "eleven_flash_v2_5",
  "eleven_turbo_v2_5",
]);

// Nur zum Loggen -- volle Voice-ID gilt als sensibel genug, um sie nicht im
// Klartext in Logs stehen zu lassen (P0 TTS-Fix Abschnitt 3/4).
function shortVoiceId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Eigene correlationId je TTS-Anfrage (P0 Abschnitt 1) -- nur technische
  // Phasen/Dauer werden geloggt, nie der Text selbst oder Audiodaten.
  const requestId = req.headers.get("X-Correlation-Id") || crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();
  console.log(`[hufi-tts][${requestId}] TTS-Anfrage gestartet`);

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
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

    // ── Request-Body ───────────────────────────────────────────────────────
    const { text, voice_id, model_id = "eleven_multilingual_v2" } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text fehlt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!voice_id || typeof voice_id !== "string") {
      return new Response(JSON.stringify({ error: "voice_id fehlt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sicherheits-Checks
    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: "Text zu lang (max. 1000 Zeichen)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_MODELS.has(model_id)) {
      return new Response(JSON.stringify({ error: "Ungültiges Modell" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Voice-Guthaben prüfen (separat vom KI-Text-Credit-System) ────────────
    // Bewusst VOR dem ElevenLabs-Call, um bei leerem Guthaben keine unnötigen
    // API-Kosten zu verursachen. Bei einem Fehler wird keine Ersatzstimme
    // verwendet; die Textantwort bleibt sichtbar.
    const { data: credits } = await supabase.rpc("get_hufi_voice_credits", { p_user_id: user.id });
    const purchasedUsable = credits?.purchased_expires_at && new Date(credits.purchased_expires_at) < new Date()
      ? 0
      : (credits?.purchased_balance_cents ?? 0);
    const availableCents = (credits?.monthly_balance_cents ?? 0) + purchasedUsable;
    if (availableCents <= 0) {
      console.log(`[hufi-tts][${requestId}] provider=elevenlabs voice=${shortVoiceId(voice_id)} model=${model_id} status=402 dur=${Date.now() - t0}ms outcome=credits_exhausted`);
      return new Response(
        JSON.stringify({ error: "Voice-Guthaben aufgebraucht", code: "credits_exhausted" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── ElevenLabs TTS ─────────────────────────────────────────────────────
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      console.error(`[hufi-tts][${requestId}] provider=elevenlabs status=503 dur=${Date.now() - t0}ms outcome=not_configured`);
      return new Response(JSON.stringify({ error: "ElevenLabs nicht konfiguriert" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const elevenController = new AbortController();
    const elevenTimeout = setTimeout(() => elevenController.abort(), 15_000);
    let ttsResponse: Response;
    try {
      ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice_id)}`,
        {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
          body: JSON.stringify({
          text,
          model_id,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
          }),
          signal: elevenController.signal,
        }
      );
    } catch (error) {
      const code = error instanceof Error && error.name === "AbortError" ? "upstream_timeout" : "upstream_unreachable";
      console.error(`[hufi-tts][${requestId}] provider=elevenlabs voice=${shortVoiceId(voice_id)} model=${model_id} dur=${Date.now() - t0}ms outcome=${code}`);
      return new Response(JSON.stringify({ error: "Die ausgewählte Hufi-Stimme ist gerade nicht verfügbar.", code }), {
        status: 504,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      clearTimeout(elevenTimeout);
    }

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error(`[hufi-tts][${requestId}] provider=elevenlabs voice=${shortVoiceId(voice_id)} model=${model_id} status=${ttsResponse.status} dur=${Date.now() - t0}ms outcome=error`);
      let detail = "";
      try {
        const parsed = JSON.parse(errText);
        detail = parsed?.detail?.message ?? parsed?.detail ?? parsed?.message ?? "";
      } catch { /* ignore */ }
      const statusMsg = ttsResponse.status === 401 ? "API-Key ungültig" :
                        ttsResponse.status === 404 ? "Stimme nicht gefunden – prüfe ob die Voice-ID zum API-Account gehört" :
                        ttsResponse.status === 422 ? "Ungültige Parameter" : "";
      return new Response(JSON.stringify({
        error: statusMsg || detail || `ElevenLabs Fehler ${ttsResponse.status}`,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstreamContentType = ttsResponse.headers.get("content-type") ?? "";
    if (!upstreamContentType.toLowerCase().startsWith("audio/")) {
      console.error(`[hufi-tts][${requestId}] provider=elevenlabs voice=${shortVoiceId(voice_id)} model=${model_id} status=${ttsResponse.status} contentType=${upstreamContentType || "missing"} dur=${Date.now() - t0}ms outcome=invalid_content_type`);
      return new Response(JSON.stringify({ error: "Die ausgewählte Hufi-Stimme ist gerade nicht verfügbar.", code: "invalid_audio_response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      console.error(`[hufi-tts][${requestId}] provider=elevenlabs voice=${shortVoiceId(voice_id)} model=${model_id} status=${ttsResponse.status} dur=${Date.now() - t0}ms outcome=empty_audio`);
      return new Response(JSON.stringify({ error: "Die ausgewählte Hufi-Stimme ist gerade nicht verfügbar.", code: "empty_audio_response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Verbrauch verbuchen ────────────────────────────────────────────────
    // Echte Audiodauer wird nicht dekodiert (kein MP3-Parser im Edge-Runtime) —
    // Schätzung über Zeichen/Sekunde ist für Guthaben-Zwecke ausreichend genau.
    const CHARS_PER_SECOND = 14;
    const estimatedSeconds = Math.max(text.length / CHARS_PER_SECOND, 1);
    const { error: consumeError } = await supabase.rpc("consume_hufi_voice_credit", {
      p_user_id: user.id,
      p_seconds: estimatedSeconds,
      p_description: `TTS (${model_id})`,
    });
    if (consumeError) console.error(`[hufi-tts][${requestId}] Guthaben-Verbuchung fehlgeschlagen:`, consumeError);

    console.log(
      `[hufi-tts][${requestId}] provider=elevenlabs voice=${shortVoiceId(voice_id)} model=${model_id} status=${ttsResponse.status} contentType=${ttsResponse.headers.get("content-type")} bytes=${audioBuffer.byteLength} dur=${Date.now() - t0}ms outcome=success`,
    );
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(`[hufi-tts][${requestId}] error nach ${Date.now() - t0}ms:`, e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
