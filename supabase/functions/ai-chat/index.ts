import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per user

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Authentifizierung prüfen
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert. Bitte melden Sie sich an." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Service role client for rate limit checks
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("[ai-chat] Auth failed");
      return new Response(JSON.stringify({ error: "Nicht autorisiert. Bitte melden Sie sich an." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[ai-chat] User authenticated:", user.id);

    // SECURITY: Rate limiting - check requests in the last minute
    const oneMinuteAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    
    const { count: recentRequestCount, error: countError } = await supabaseAdmin
      .from("ai_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", oneMinuteAgo);
    
    if (countError) {
      console.error("[ai-chat] Rate limit check failed:", countError.message);
      // Continue without rate limiting if check fails
    } else if (recentRequestCount !== null && recentRequestCount >= MAX_REQUESTS_PER_WINDOW) {
      console.warn("[ai-chat] Rate limit exceeded for user:", user.id, "Count:", recentRequestCount);
      return new Response(JSON.stringify({ 
        error: "Rate limit erreicht. Bitte warten Sie eine Minute bevor Sie weitere Nachrichten senden." 
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": "60"
        },
      });
    }

    const { messages } = await req.json();

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Ungültige Nachrichtenliste" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit conversation history size
    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Zu viele Nachrichten (max. 50)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate total conversation size and individual message lengths
    let totalSize = 0;
    for (const msg of messages) {
      const len = msg?.content?.length || 0;
      if (len > 5000) {
        return new Response(JSON.stringify({ error: "Nachricht zu lang (max. 5000 Zeichen)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      totalSize += len;
    }
    if (totalSize > 50000) {
      return new Response(JSON.stringify({ error: "Gesamte Konversation zu groß" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Du bist ein hilfreicher KI-Assistent für HufManager, eine Software für professionelle Hufbearbeiter. 
Du hilfst bei Fragen zu:
- Terminplanung und Kundenverwaltung
- Hufpflege und Pferdegesundheit
- Geschäftsführung und Rechnungsstellung
- Nutzung der HufManager-App

Antworte immer auf Deutsch, freundlich und präzise. Halte deine Antworten kurz und hilfreich.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte versuchen Sie es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Guthaben aufgebraucht. Bitte laden Sie Ihr Lovable AI Guthaben auf." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[ai-chat] AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "KI-Dienst nicht erreichbar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("[ai-chat] Error:", e instanceof Error ? e.name : "Unknown");
    return new Response(JSON.stringify({ error: "Ein Fehler ist aufgetreten" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
