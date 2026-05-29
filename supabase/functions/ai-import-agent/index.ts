import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const { contacts, existingContacts } = await req.json();

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(JSON.stringify({ error: "No contacts provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to 200 contacts per AI call to avoid token limits
    const batch = contacts.slice(0, 200);

    const systemPrompt = `Du bist ein Datenimport-Experte für den HufManager (Pferde-Management-Software).

Deine Aufgabe: Analysiere die importierten Kontaktdaten und gib für jeden Kontakt eine optimierte Version zurück.

Regeln:
1. **Kategorie zuweisen**: Basierend auf Kontext (Firma, Notizen, Name):
   - "client" = Pferdebesitzer, Reiter, Privatpersonen
   - "partner" = Tierärzte, Hufschmiede, Therapeuten, Sattler
   - "supplier" = Lieferanten, Händler, Futtermittel, Zubehör
   - "lead" = Interessenten, Anfragen, unklare Zuordnung

2. **Daten bereinigen**: 
   - Namen korrekt formatieren (Groß-/Kleinschreibung)
   - Telefonnummern normalisieren (deutsches Format +49...)
   - E-Mails validieren
   - Tippfehler korrigieren wo offensichtlich

3. **Duplikate erkennen**: Vergleiche mit den existierenden Kontakten und markiere mögliche Duplikate.

4. **Qualität bewerten**: "valid", "warning" (fehlende Daten), "error" (unbrauchbar)

Antworte NUR mit dem Tool-Call, keine Erklärung.`;

    const userPrompt = `Importierte Kontakte (${batch.length}):
${JSON.stringify(batch, null, 2)}

${existingContacts?.length > 0 ? `Existierende Kontakte (${existingContacts.length}):
${JSON.stringify(existingContacts.slice(0, 100), null, 2)}` : "Keine existierenden Kontakte."}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        tools: [
          {
            name: "process_import",
            description: "Process and optimize contact import data",
            input_schema: {
              type: "object",
              properties: {
                contacts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", description: "Original contact ID" },
                      full_name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      company_name: { type: "string" },
                      street: { type: "string" },
                      notes: { type: "string" },
                      suggested_category: { type: "string", enum: ["client", "partner", "supplier", "lead"] },
                      status: { type: "string", enum: ["valid", "warning", "error"] },
                      changes_made: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of changes the AI made"
                      },
                      duplicate_of: { type: "string", description: "ID of existing contact if duplicate" },
                      confidence: { type: "number", description: "Confidence score 0-1" },
                    },
                    required: ["id", "full_name", "suggested_category", "status", "confidence"],
                  },
                },
                summary: {
                  type: "object",
                  properties: {
                    total: { type: "number" },
                    valid: { type: "number" },
                    warnings: { type: "number" },
                    errors: { type: "number" },
                    duplicates: { type: "number" },
                    categories: {
                      type: "object",
                      properties: {
                        client: { type: "number" },
                        partner: { type: "number" },
                        supplier: { type: "number" },
                        lead: { type: "number" },
                      },
                    },
                  },
                  required: ["total", "valid", "warnings", "errors", "duplicates"],
                },
              },
              required: ["contacts", "summary"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "process_import" },
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit – bitte versuche es gleich nochmal." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      throw new Error("Anthropic API error");
    }

    const data = await response.json();
    const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
    if (!toolBlock?.input) {
      throw new Error("No tool call response from AI");
    }

    const result = toolBlock.input;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-import-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
