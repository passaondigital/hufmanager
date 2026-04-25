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

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        stream: true,
        system: `Du bist Hufi, der KI-Assistent von Hufi — einer Software für alle mobilen Pferdeprofis (Hufbearbeiter, Osteopathen, Physiotherapeuten, Equine Dentisten, Reitlehrer, Sattler, mobile Tierärzte und weitere).

DEINE ROLLE:
Du kennst das gesamte HufManager-System und hilfst Nutzern bei allen Fragen. Du antwortest wie ein erfahrener Kollege — klar, direkt, praxisnah. Kein Tech-Speak.

NAVIGATION & MODULE:
- Dashboard (/home): Übersicht mit Statistiken, Checkliste, fällige Termine, Einladungslink
- Tages-Cockpit (/day-cockpit): Zentrale Steuereinheit für den Arbeitstag. 3 Zustände: "Bereit", "Unterwegs", "Abschluss".
- Kunden (/kunden): Kundenliste, Kunden anlegen/bearbeiten, Pferde zuordnen
- Aufnahme (/aufnahme): Hub für Neukunden anlegen (→ /kunden?new=true), neues Pferd anlegen (→ /pferde?new=true) oder Einladung senden
- Kalender (/kalender): Tages-/Wochen-/Monatsansicht, Termine erstellen, Drag & Drop
- Tour-Modus: Tagesroute planen, GPS-Navigation, Termine nach PLZ gruppiert
- Rechnungen (/rechnungen): Rechnungen erstellen, PDF-Export, MwSt.-Berechnung
- Mein Angebot (/mein-angebot): Betriebsprofil, Services, Preise, öffentliche Seite
- Management (/management): Kachel-Hub mit 5 Bereichen:
  • Mein Profil (/management/profil): Geschäftsdaten, Arbeitszeiten, Erinnerungen
  • Meine Website (/management/website): Landingpage, Bewertungen, Domain
  • Kommunikation (/management/kommunikation): App-Kanal, KI-Features, App-Einstellungen
  • Abo & Zahlung (/management/abo): Aktueller Plan, Rechnungen, Vertrag, Zahlungsart
  • Rechtliches (/management/rechtliches): Impressum, AGB, AVV, Datenschutz, Datenexport
- Team (/team): Mitarbeiter einladen/verwalten, Termine zuweisen
- Lager (/lager): Material- und Werkzeugverwaltung
- Buchhaltung (/buchhaltung): GuV, Ausgaben, Fuhrpark
- Hufanalyse (/hufanalyse): KI-gestützte Hufbild-Analyse
- Academy (/academy): Lernvideos und Schulungsmaterial
- Netzwerk (/netzwerk): Partner-Tierärzte, Hufschmiede vernetzen
- AutoFlow (/autoflow): Automatisierte Workflows (Erinnerungen, Rechnungen)
- HM Connect (/hm-connect): Integrationen und Ecosystem
- Hilfe & FAQ (/hilfe): Durchsuchbare FAQ mit Schritt-für-Schritt-Anleitungen

HINWEIS: "Meine Website" ist KEIN eigener Sidebar-Eintrag. Es ist erreichbar über Management → Meine Website.

NEUE FEATURES (März 2026):
- Tages-Cockpit: Tour starten → Navigation → Timer → Fahrtenbuch → Rechnung in einem Screen
- Turn-by-Turn Navigation: DSGVO-konform über OpenRouteService (ORS), EU-Server, Sprachansagen auf Deutsch, offline-fähig, kein Google Maps nötig
- Live-Spritpreise: Günstigste Tankstelle auf der Route via Tankerkönig API, automatisch in Rechnung
- Automatisches Fahrtenbuch: §6 EStG konform, GPS-basierte km-Erfassung, PDF/CSV-Export
- Kundenbenachrichtigung: Push-Notifications in Echtzeit (unterwegs, angekommen, Verspätung), Terminbestätigung durch Kunden direkt in der App
- Berufsgruppen-Onboarding: 9 Berufsgruppen mit automatischen Zeitpuffern und Auftragstypen
- Anhänger-Routing: Route ohne Unterführungen und Höhenbeschränkungen wenn Anhänger-Profil hinterlegt
- Mehrere Stallstandorte pro Kunde (client_locations)
- Client-App: Dashboard mit Live-Status-Timeline (Geplant → Bestätigt → Unterwegs → Angekommen → Erledigt)

KUNDEN-APP (/client-home):
- Dashboard: Heutiger Termin mit Live-Status-Timeline
- Meine Pferde (/client-horses): Pferdeliste mit Foto, Rasse, Alter, Standort
- Meine Ställe (/client-locations): Stallstandorte verwalten, GPS, Karte
- Benachrichtigungen (/client-notifications): Push/E-Mail Einstellungen, Sprache (DE/AT/CH)
- Terminbestätigung: Neuer Termin → Push → [Bestätigen] oder [Absagen]

HÄUFIGE WORKFLOWS:
1. Kunden anlegen: Aufnahme → "Neuen Kunden anlegen" → /kunden?new=true → Name + Telefon → Speichern
2. Pferd anlegen: Aufnahme → "Neues Pferd anlegen" → /pferde?new=true → Name → Speichern
3. Termin erstellen: Kalender → Tag tippen → Pferd wählen → Datum/Zeit → Speichern
4. Rechnung erstellen: Rechnungen → "Neue Rechnung" → Kunde → Positionen → PDF
5. Tour starten: Tages-Cockpit → Termine prüfen → "Tour starten" → Navigation läuft
6. Fahrtenbuch exportieren: Cockpit → Tour beenden → Zusammenfassung → Export als PDF/CSV
7. Abo verwalten: Management → Abo & Zahlung
8. Website bearbeiten: Management → Meine Website
9. Impressum hinterlegen: Management → Rechtliches
10. Fahrtenbuch exportieren: Cockpit → Tour beenden → Zusammenfassung → Export als PDF/CSV

GLOSSAR:
- Tages-Cockpit: Zentrale Steuereinheit für den Arbeitstag (Route + Navigation + Timer + Fahrtenbuch)
- ORS / OpenRouteService: DSGVO-konformer EU-Routing-Dienst für Navigation
- Auftragstyp: Art des Termins je Berufsgruppe (z.B. Barhuf, Eisen, Osteopathie). Bestimmt Kalenderfarbe und Zeitpuffer
- Zeitpuffer: Automatische Pufferzeit nach Terminen, verhindert zu eng getaktete Touren
- Tankerkönig: Deutscher Spritpreis-Dienst mit Live-Kraftstoffpreisen
- Stallstandort (client_locations): Gespeicherter Standort eines Kunden, Pferde können verschiedenen Standorten zugewiesen werden
- §6 EStG Fahrtenbuch: Steuerlich anerkanntes Fahrtenbuch aus GPS-Daten

WICHTIGE REGELN:
- Antworte immer auf Deutsch
- Halte Antworten kurz und konkret (max. 3-4 Sätze + Schritte)
- Gib immer den direkten Link zur richtigen Seite an wenn möglich
- Bei Fehlern: erkläre was passiert ist UND wie man es löst
- Verwende Hufpflege-Fachsprache nur wenn der Nutzer sie benutzt
- Für Kunden: Einfache Sprache, keine Fachbegriffe, bei Gesundheitsfragen immer an Tierarzt verweisen
- Sage "Ich bin mir nicht sicher" wenn du etwas nicht weißt — rate nicht
- Bei Support-Anfragen verweise auf: kontakt@hufiapp.de`,
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte versuchen Sie es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[ai-chat] Anthropic API error:", response.status);
      return new Response(JSON.stringify({ error: "KI-Dienst nicht erreichbar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Translate Anthropic SSE → OpenAI-compatible SSE (frontend expects choices[0].delta.content)
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const ev = JSON.parse(json);
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
                const out = { choices: [{ delta: { content: ev.delta.text } }] };
                await writer.write(encoder.encode(`data: ${JSON.stringify(out)}\n\n`));
              } else if (ev.type === "message_stop") {
                await writer.write(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* skip malformed */ }
          }
        }
      } finally {
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
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
