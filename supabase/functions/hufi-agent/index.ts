import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getHorseKnowledgeForRole } from "./horse-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL_SMART  = "claude-sonnet-4-6";
const MODEL_FAST   = "claude-haiku-4-5-20251001";
const MAX_HISTORY  = 8;
const MAX_TOOLS_ROUNDS = 4; // max Tool-Use-Runden pro Anfrage

// ── Typen ──────────────────────────────────────────────────────────────────────

interface Message { role: "user" | "assistant"; content: string | ContentBlock[]; }
interface ContentBlock { type: string; [k: string]: unknown; }

interface RequestBody {
  text: string;
  voiceMode?: boolean;
  history?: Message[];
  route?: string;
  mode?: "chat" | "action";
  clientTimestamp?: string;
  clientTimezone?: string;
  clientLocation?: { lat: number; lon: number };
}

interface ActionPlan {
  taskType: string;
  payload: Record<string, unknown>;
  explanation: string;
  confirmText: string;
}

// ── System Prompt ──────────────────────────────────────────────────────────────

const HUFI_BASE = `Du bist Hufi — proaktiver digitaler Assistent für Hufpfleger und Pferdehalter im HufManager.
Stil: direkt, kurz, handlungsorientiert. Keine Floskeln.

Kernregeln:
- IMMER zuerst die Tools nutzen um echte Daten zu holen — nie raten.
- Wenn ein Name unklar ist: search_entity aufrufen, Vorschläge präsentieren.
- Wenn mehrere Treffer: "Meinst du [A] oder [B]?" — Nutzer wählt dann aus.
- Datenschutz: Nur Daten der eigenen Nutzer abfragen, nie fremde Provider-Daten.
- Voice-Modus: max 2 Sätze, kein Markdown, Zahlen ausschreiben.
- Chat-Modus: max 6 Sätze, Aufzählungen erlaubt.
- Notfall (Kolik, Nageltritt, Lahmheit, Hufrehe, Fieber): sofort Tierarzt empfehlen.
- NIEMALS tierärztliche Diagnose ersetzen.

Tool-Nutzung:
- search_entity → immer wenn Name genannt wird und ID unbekannt
- get_appointments → bei Kalender-/Terminanfragen
- get_horse_record → bei Pferdeakte-Anfragen
- get_client_overview → bei Kunden-Anfragen
- send_notification → wenn Benachrichtigung erwünscht
- create/update/cancel_appointment → bei Termin-Actions (nach Bestätigung)
- create_invoice → wenn eine Rechnung erstellt werden soll (nach Bestätigung)
- create_note → wenn eine Beobachtung/ein Befund zu einem Pferd/Kunden notiert werden soll
- create_horse → wenn ein neues Pferd angelegt werden soll (owner_id vorher per search_entity klären)
- create_contact → wenn ein neuer Kunde angelegt werden soll (erst search_entity prüfen ob er schon existiert)
- add_expense → wenn eine Betriebsausgabe erfasst werden soll

Fachgebiete: Hufpflege, Huforthopädie, Stallmanagement, Kundenkommunikation, Betriebsorganisation.`;

const ROLE_INSTRUCTIONS: Record<string, string> = {
  provider: `
NUTZERROLLE: MOBILER HUFPFLEGE-DIENSTLEISTER (#PID)
- Fährt täglich zu Kunden, hat eigene Kunden (#KID) und Pferde (#EQID)
- Hat Zugriff auf: Kalender 12 Monate rück + 12 Monate voraus, alle Pferdeakten, alle Rechnungen
- Kann Termine anlegen/ändern/stornieren, Kunden und Partner benachrichtigen
- BHS Balance Abos verwalten
- Hufpflege-Rhythmus: Kunden haben Intervalle 4/6/8 Wochen`,

  client: `
NUTZERROLLE: PFERDEBESITZER (#KID)
- Eigene Pferde (#EQID), kann Termine sehen und anfragen
- Sieht eigene Rechnungen, Pferdeakte (nur freigegebene Teile)
- BHS Balance Abo-Status sichtbar`,

  partner: `
NUTZERROLLE: THERAPEUT/PARTNER (#PRID)
- Zugang nur zu Pferden zu denen eingeladen
- Kann Behandlungsnotizen eintragen, Termine sehen
- Kann Provider und Pferdebesitzer über Befunde benachrichtigen`,

  employee: `
NUTZERROLLE: ANGESTELLTER HUFPFLEGER
- Sieht nur eigene zugewiesene Termine
- Kann eigene Berichte einreichen`,
};

// ── Tool-Definitionen für Claude API ──────────────────────────────────────────

const HUFI_TOOLS = [
  {
    name: "search_entity",
    description: "Suche nach Kunden, Pferden oder Partnern per Name (auch ungenau/Tippfehler). Gibt alle Treffer mit IDs zurück. IMMER aufrufen wenn ein Name genannt wird und die ID nicht bekannt ist.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Suchbegriff (Name, Teilname, Spitzname)" },
        entity_type: {
          type: "string",
          enum: ["client", "horse", "partner", "any"],
          description: "Welche Art Entity gesucht wird. 'any' für alles.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_appointments",
    description: "Termine abfragen. Unterstützt flexible Datumsbereiche bis 12 Monate zurück und 12 Monate voraus.",
    input_schema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "Von-Datum YYYY-MM-DD (Standard: heute)" },
        date_to:   { type: "string", description: "Bis-Datum YYYY-MM-DD (Standard: 14 Tage)" },
        horse_id:  { type: "string", description: "Nur Termine dieses Pferdes" },
        client_id: { type: "string", description: "Nur Termine dieses Kunden" },
        status:    { type: "string", description: "Filter: scheduled|confirmed|completed|cancelled|all (Standard: all)" },
        limit:     { type: "number", description: "Max Ergebnisse (Standard: 30)" },
      },
    },
  },
  {
    name: "get_horse_record",
    description: "Vollständige Pferdeakte: Stammdaten, letzte Behandlungen, Behandlungsnotizen von Therapeuten, nächster Termin, offene Rechnungen.",
    input_schema: {
      type: "object",
      properties: {
        horse_id: { type: "string", description: "UUID des Pferdes" },
      },
      required: ["horse_id"],
    },
  },
  {
    name: "get_client_overview",
    description: "Kunden-Übersicht: Stammdaten, alle Pferde, letzte 10 Termine, offene Rechnungen, Kommunikation.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "UUID des Kunden" },
      },
      required: ["client_id"],
    },
  },
  {
    name: "get_invoice_history",
    description: "Rechnungshistorie mit Beträgen und Zahlungsstatus.",
    input_schema: {
      type: "object",
      properties: {
        client_id:  { type: "string", description: "Nur Rechnungen dieses Kunden (optional)" },
        horse_id:   { type: "string", description: "Nur Rechnungen für dieses Pferd (optional)" },
        status:     { type: "string", description: "paid|unpaid|all (Standard: all)" },
        date_from:  { type: "string", description: "Von-Datum YYYY-MM-DD" },
        date_to:    { type: "string", description: "Bis-Datum YYYY-MM-DD" },
        limit:      { type: "number", description: "Max Ergebnisse (Standard: 20)" },
      },
    },
  },
  {
    name: "send_notification",
    description: "Push-Benachrichtigung an Kunde oder Partner senden. DSGVO: nur sachliche, terminbezogene Nachrichten.",
    input_schema: {
      type: "object",
      properties: {
        user_id:  { type: "string", description: "UUID des Empfängers" },
        title:    { type: "string", description: "Kurzer Titel (max 50 Zeichen)" },
        message:  { type: "string", description: "Nachrichtentext (max 200 Zeichen)" },
        url:      { type: "string", description: "Deep-Link URL in der App (optional)" },
      },
      required: ["user_id", "title", "message"],
    },
  },
  {
    name: "create_appointment",
    description: "Neuen Termin anlegen. horse_id und client_id sind Pflicht wenn bekannt — vorher search_entity aufrufen.",
    input_schema: {
      type: "object",
      properties: {
        horse_id:     { type: "string", description: "UUID des Pferdes" },
        client_id:    { type: "string", description: "UUID des Kunden" },
        date:         { type: "string", description: "Datum YYYY-MM-DD" },
        time:         { type: "string", description: "Uhrzeit HH:MM (optional)" },
        service_type: { type: "string", description: "Leistungsart z.B. 'Barhufpflege'" },
        notes:        { type: "string", description: "Notiz (optional)" },
        duration:     { type: "number", description: "Dauer in Minuten (Standard: 60)" },
      },
      required: ["date"],
    },
  },
  {
    name: "update_appointment",
    description: "Termin verschieben, Status ändern oder Notiz ergänzen.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string", description: "UUID des Termins" },
        date:           { type: "string", description: "Neues Datum YYYY-MM-DD (optional)" },
        time:           { type: "string", description: "Neue Uhrzeit HH:MM (optional)" },
        status:         { type: "string", description: "scheduled|confirmed|completed|cancelled" },
        notes:          { type: "string", description: "Neue oder ergänzte Notiz" },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Termin stornieren. Informiert ggf. den Kunden.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id:   { type: "string", description: "UUID des Termins" },
        reason:           { type: "string", description: "Stornierungsgrund (optional)" },
        notify_client:    { type: "boolean", description: "Kunden per Push benachrichtigen?" },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "create_invoice",
    description: "Rechnung (Entwurf) anlegen — mit Positionen. horse_id/client_id vorher per search_entity auflösen. Zieht bei inventory_item_id automatisch Lagerbestand ab.",
    input_schema: {
      type: "object",
      properties: {
        horse_id:   { type: "string", description: "UUID des Pferdes (optional)" },
        client_id:  { type: "string", description: "UUID des Kunden (optional)" },
        service_type: { type: "string", description: "Leistungsart z.B. 'Barhufpflege' (nur Notiz-Text)" },
        notes:      { type: "string", description: "Notiz auf der Rechnung (optional)" },
        line_items: {
          type: "array",
          description: "Rechnungspositionen. Wenn leer: einzelne Position aus 'amount' erzeugt.",
          items: {
            type: "object",
            properties: {
              title:              { type: "string" },
              quantity:           { type: "number" },
              unit_price:         { type: "number" },
              inventory_item_id:  { type: "string", description: "UUID des Lagerartikels, falls Bestand abgezogen werden soll (optional)" },
            },
          },
        },
        amount: { type: "number", description: "Fallback-Gesamtbetrag, falls keine line_items angegeben werden" },
      },
      required: [],
    },
  },
  {
    name: "create_note",
    description: "Notiz/Befund zu einem Pferd oder Kunden speichern (z.B. Beobachtung während des Termins).",
    input_schema: {
      type: "object",
      properties: {
        note_text:   { type: "string", description: "Inhalt der Notiz" },
        horse_name:  { type: "string", description: "Name des Pferdes, auf das sich die Notiz bezieht (optional)" },
        client_name: { type: "string", description: "Name des Kunden, auf den sich die Notiz bezieht (optional)" },
      },
      required: ["note_text"],
    },
  },
  {
    name: "create_horse",
    description: "Neues Pferd anlegen. owner_id (Kunde) ist Pflicht — vorher per search_entity auflösen oder mit create_contact anlegen.",
    input_schema: {
      type: "object",
      properties: {
        owner_id:         { type: "string", description: "UUID des Besitzers (Kunde)" },
        name:             { type: "string", description: "Name des Pferdes" },
        breed:            { type: "string", description: "Rasse (optional)" },
        birth_year:       { type: "number", description: "Geburtsjahr (optional)" },
        gender:           { type: "string", description: "Geschlecht (optional)" },
        color:            { type: "string", description: "Farbe (optional)" },
        shoeing_interval: { type: "number", description: "Hufpflege-Intervall in Wochen (optional, Standard 8)" },
        special_notes:    { type: "string", description: "Besonderheiten (optional)" },
      },
      required: ["owner_id", "name"],
    },
  },
  {
    name: "create_contact",
    description: "Neuen Kunden (Kontakt) anlegen, wenn noch kein Profil existiert (search_entity liefert keinen Treffer).",
    input_schema: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Vollständiger Name des Kunden" },
        email:     { type: "string", description: "E-Mail (optional)" },
        phone:     { type: "string", description: "Telefon (optional)" },
        street:    { type: "string", description: "Straße (optional)" },
        zip_code:  { type: "string", description: "PLZ (optional)" },
        city:      { type: "string", description: "Ort (optional)" },
      },
      required: ["full_name"],
    },
  },
  {
    name: "add_expense",
    description: "Betriebsausgabe erfassen (z.B. Materialkosten, Sprit).",
    input_schema: {
      type: "object",
      properties: {
        amount:      { type: "number", description: "Betrag in Euro" },
        description: { type: "string", description: "Kurzbeschreibung der Ausgabe" },
        category:    { type: "string", description: "Kategorie (optional, Standard: sonstiges)" },
        date:        { type: "string", description: "Datum YYYY-MM-DD (optional, Standard: heute)" },
      },
      required: ["amount", "description"],
    },
  },
];

// ── Wetter-Fetch (wttr.in, kein API-Key) ─────────────────────────────────────

async function fetchWeather(lat: number, lon: number): Promise<string | null> {
  try {
    // DSGVO/Datenminimierung: nur grobe Region an den externen Wetterdienst senden,
    // niemals die exakten GPS-Koordinaten. 1 Nachkommastelle ≈ Stadtebene (~11 km).
    const coarseLat = Math.round(lat * 10) / 10;
    const coarseLon = Math.round(lon * 10) / 10;
    const res = await fetch(
      `https://wttr.in/${coarseLat},${coarseLon}?format=j1`,
      { headers: { "User-Agent": "HufManager/2.5" }, signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;
    const j = await res.json() as {
      current_condition?: Array<{ temp_C: string; weatherDesc: Array<{ value: string }> }>;
      nearest_area?: Array<{ areaName: Array<{ value: string }> }>;
    };
    const cc = j.current_condition?.[0];
    const city = j.nearest_area?.[0]?.areaName?.[0]?.value ?? null;
    if (!cc) return null;
    const desc = cc.weatherDesc?.[0]?.value ?? "–";
    return `${city ? city + ": " : ""}${desc}, ${cc.temp_C}°C`;
  } catch {
    return null;
  }
}

// ── Tool-Ausführung (Service Role) ─────────────────────────────────────────────

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  providerId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  professionType: string | null = null,
): Promise<string> {
  const professionProfile = (professionType && PROFESSION_PROFILES[professionType]) || DEFAULT_PROFESSION_PROFILE;
  const today = new Date().toISOString().slice(0, 10);
  const ago12M = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const in12M  = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

  try {
    switch (toolName) {

      // ── search_entity ──────────────────────────────────────────────────────
      case "search_entity": {
        const q = `%${String(input.query ?? "").toLowerCase()}%`;
        const type = String(input.entity_type ?? "any");
        const results: unknown[] = [];

        if (type === "client" || type === "any") {
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, readable_id, email")
            .eq("created_by_provider_id", providerId)
            .ilike("full_name", q)
            .limit(8);
          (data ?? []).forEach((r: Record<string,unknown>) =>
            results.push({ type: "client", id: r.id, name: r.full_name, readable_id: r.readable_id, email: r.email })
          );
        }

        if (type === "horse" || type === "any") {
          const { data } = await supabaseAdmin
            .from("horses")
            .select("id, name, eqid, owner_id, profiles!owner_id(full_name, readable_id)")
            .ilike("name", q)
            .eq("deleted_at", null)
            .limit(8);
          (data ?? []).forEach((r: Record<string,unknown>) => {
            const owner = r.profiles as Record<string,unknown> | null;
            results.push({
              type: "horse", id: r.id, name: r.name, eqid: r.eqid,
              owner_id: r.owner_id, owner_name: owner?.full_name ?? null,
            });
          });
        }

        if (type === "partner" || type === "any") {
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, readable_id, role")
            .eq("role", "partner")
            .ilike("full_name", q)
            .limit(5);
          (data ?? []).forEach((r: Record<string,unknown>) =>
            results.push({ type: "partner", id: r.id, name: r.full_name, readable_id: r.readable_id })
          );
        }

        if (results.length === 0) return `Keine Treffer für "${input.query}". Bitte anderen Namen versuchen oder Neueingabe.`;
        return JSON.stringify({ count: results.length, results });
      }

      // ── get_appointments ──────────────────────────────────────────────────
      case "get_appointments": {
        const from  = String(input.date_from ?? today);
        const to    = String(input.date_to   ?? new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
        const limit = Number(input.limit ?? 30);
        const status = String(input.status ?? "all");

        // Sicherstellen dass Datum im erlaubten 12-Monats-Fenster liegt
        const safeFrom = from < ago12M ? ago12M : from;
        const safeTo   = to   > in12M  ? in12M  : to;

        let query = supabaseAdmin
          .from("appointments")
          .select("id, date, time, status, service_type, notes, horse_id, client_id, horses(id,name,eqid), client:profiles!client_id(id,full_name,readable_id)")
          .eq("provider_id", providerId)
          .gte("date", safeFrom)
          .lte("date", safeTo)
          .order("date", { ascending: true })
          .order("time", { ascending: true })
          .limit(limit);

        if (input.horse_id)  query = query.eq("horse_id", String(input.horse_id));
        if (input.client_id) query = query.eq("client_id", String(input.client_id));
        if (status !== "all") query = query.eq("status", status);

        const { data, error } = await query;
        if (error) return `Fehler: ${error.message}`;
        if (!data || data.length === 0) return `Keine Termine im Zeitraum ${safeFrom} – ${safeTo}.`;

        const rows = (data as Record<string,unknown>[]).map((a) => {
          const h = Array.isArray(a.horses) ? a.horses[0] : a.horses as Record<string,unknown>|null;
          const c = a.client as Record<string,unknown>|null;
          return `${a.date} ${a.time ?? "?"} | ${h?.name ?? "?"} (#${h?.eqid ?? "?"}) | ${c?.full_name ?? "?"} | ${a.status} | apt_id:${a.id}`;
        });
        return `${data.length} Termine:\n${rows.join("\n")}`;
      }

      // ── get_horse_record ──────────────────────────────────────────────────
      case "get_horse_record": {
        const horseId = String(input.horse_id);

        const [horseRes, apptRes, notesRes, invoiceRes] = await Promise.allSettled([
          supabaseAdmin
            .from("horses")
            .select("id,name,eqid,breed,birth_year,gender,color,height_cm,hoof_type,shoeing_interval,special_notes,health_status,owner_id,profiles!owner_id(full_name,readable_id,email)")
            .eq("id", horseId)
            .single(),
          supabaseAdmin
            .from("appointments")
            .select("id,date,time,status,service_type,notes,provider_id")
            .eq("horse_id", horseId)
            .gte("date", ago12M)
            .order("date", { ascending: false })
            .limit(15),
          supabaseAdmin
            .from("partner_treatment_notes")
            .select("treatment_date,title,findings,notes,partner_type,partner_id")
            .eq("horse_id", horseId)
            .order("treatment_date", { ascending: false })
            .limit(10),
          supabaseAdmin
            .from("invoices")
            .select("id,invoice_number,total_amount,payment_status,created_at")
            .eq("horse_id", horseId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const horse = horseRes.status === "fulfilled" ? horseRes.value.data as Record<string,unknown> : null;
        if (!horse) return `Pferd mit ID ${horseId} nicht gefunden.`;
        const owner = horse.profiles as Record<string,unknown>|null;
        const appts = (apptRes.status === "fulfilled" ? apptRes.value.data : []) as Record<string,unknown>[];
        const notes = (notesRes.status === "fulfilled" ? notesRes.value.data : []) as Record<string,unknown>[];
        const invoices = (invoiceRes.status === "fulfilled" ? invoiceRes.value.data : []) as Record<string,unknown>[];

        const nextAppt = appts.find((a) => String(a.date) >= today);
        const lastAppt = appts.find((a) => String(a.date) < today);

        let out = `PFERDEAKTE: ${horse.name} (#${horse.eqid ?? "?"})\n`;
        out += `Rasse: ${horse.breed ?? "?"} | Geb: ${horse.birth_year ?? "?"} | ${horse.gender ?? "?"}\n`;
        out += `Höhe: ${horse.height_cm ?? "?"}cm | Huftyp: ${horse.hoof_type ?? "?"} | Intervall: ${horse.shoeing_interval ?? "?"}Wo\n`;
        out += `Besitzer: ${owner?.full_name ?? "?"} (${owner?.readable_id ?? "?"}) | client_id:${horse.owner_id}\n`;
        if (horse.health_status) out += `Gesundheit: ${horse.health_status}\n`;
        if (horse.special_notes) out += `Notizen: ${horse.special_notes}\n`;
        out += `Nächster Termin: ${nextAppt ? `${nextAppt.date} ${nextAppt.time ?? ""} | apt_id:${nextAppt.id}` : "keiner geplant"}\n`;
        out += `Letzter Termin: ${lastAppt ? `${lastAppt.date} | ${lastAppt.service_type ?? ""} | apt_id:${lastAppt.id}` : "keiner"}\n`;

        if (notes.length > 0) {
          out += `Behandlungsnotizen (Therapeuten):\n`;
          notes.forEach((n) => { out += `  ${n.treatment_date} [${n.partner_type ?? "?"}]: ${n.title} — ${n.findings ?? ""}\n`; });
        }
        if (appts.length > 0) {
          out += `Termine letztes Jahr (${appts.length}):\n`;
          appts.slice(0, 8).forEach((a) => { out += `  ${a.date} ${a.status} ${a.service_type ?? ""} | apt_id:${a.id}\n`; });
        }
        if (invoices.length > 0) {
          out += `Letzte Rechnungen:\n`;
          invoices.forEach((i) => { out += `  ${i.invoice_number ?? "?"} ${i.total_amount}€ ${i.payment_status}\n`; });
        }
        return out;
      }

      // ── get_client_overview ───────────────────────────────────────────────
      case "get_client_overview": {
        const clientId = String(input.client_id);

        const [profileRes, horsesRes, apptRes, invoiceRes] = await Promise.allSettled([
          supabaseAdmin.from("profiles").select("id,full_name,readable_id,email,phone,created_at").eq("id", clientId).single(),
          supabaseAdmin.from("horses").select("id,name,eqid,breed,shoeing_interval,health_status").eq("owner_id", clientId).is("deleted_at", null),
          supabaseAdmin.from("appointments").select("id,date,time,status,service_type,horses(name)").eq("client_id", clientId).order("date", { ascending: false }).limit(12),
          supabaseAdmin.from("invoices").select("id,invoice_number,total_amount,payment_status,created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(8),
        ]);

        const profile = profileRes.status === "fulfilled" ? profileRes.value.data as Record<string,unknown> : null;
        if (!profile) return `Kunde ${clientId} nicht gefunden.`;
        const horses  = (horsesRes.status === "fulfilled"  ? horsesRes.value.data  : []) as Record<string,unknown>[];
        const appts   = (apptRes.status === "fulfilled"    ? apptRes.value.data    : []) as Record<string,unknown>[];
        const invs    = (invoiceRes.status === "fulfilled"  ? invoiceRes.value.data : []) as Record<string,unknown>[];

        const unpaid = invs.filter((i) => i.payment_status !== "paid");

        let out = `KUNDE: ${profile.full_name} (${profile.readable_id ?? "?"}) | client_id:${profile.id}\n`;
        out += `Email: ${profile.email ?? "?"} | Tel: ${profile.phone ?? "?"}\n`;
        out += `Pferde (${horses.length}): ${horses.map((h) => `${h.name} [horse_id:${h.id}]`).join(", ") || "keine"}\n`;
        out += `Offene Rechnungen: ${unpaid.length} | Gesamt offen: ${unpaid.reduce((s,i) => s + Number(i.total_amount ?? 0), 0).toFixed(2)}€\n`;
        out += `Letzte Termine:\n`;
        appts.slice(0, 8).forEach((a) => {
          const h = Array.isArray(a.horses) ? a.horses[0] : a.horses as Record<string,unknown>|null;
          out += `  ${a.date} ${a.status} ${h?.name ?? "?"} | apt_id:${a.id}\n`;
        });
        if (invs.length > 0) {
          out += `Rechnungen (${invs.length}):\n`;
          invs.slice(0, 5).forEach((i) => { out += `  ${i.invoice_number ?? "?"} ${i.total_amount}€ ${i.payment_status}\n`; });
        }
        return out;
      }

      // ── get_invoice_history ───────────────────────────────────────────────
      case "get_invoice_history": {
        const limit = Number(input.limit ?? 20);
        let q = supabaseAdmin
          .from("invoices")
          .select("id,invoice_number,total_amount,payment_status,created_at,client_id,horse_id,horses(name),client:profiles!client_id(full_name)")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (input.client_id) q = q.eq("client_id", String(input.client_id));
        if (input.horse_id)  q = q.eq("horse_id",  String(input.horse_id));
        if (input.date_from) q = q.gte("created_at", String(input.date_from));
        if (input.date_to)   q = q.lte("created_at", String(input.date_to));
        const status = String(input.status ?? "all");
        if (status === "unpaid") q = q.neq("payment_status", "paid");
        if (status === "paid")   q = q.eq("payment_status", "paid");

        const { data, error } = await q;
        if (error) return `Fehler: ${error.message}`;
        if (!data || data.length === 0) return "Keine Rechnungen gefunden.";

        const rows = (data as Record<string,unknown>[]).map((i) => {
          const h = Array.isArray(i.horses) ? i.horses[0] : i.horses as Record<string,unknown>|null;
          const c = i.client as Record<string,unknown>|null;
          return `${String(i.created_at).slice(0,10)} | ${i.invoice_number ?? "?"} | ${c?.full_name ?? "?"} | ${h?.name ?? "?"} | ${i.total_amount}€ | ${i.payment_status}`;
        });
        const total = (data as Record<string,unknown>[]).reduce((s,i) => s + Number(i.total_amount ?? 0), 0);
        return `${data.length} Rechnungen (Gesamt: ${total.toFixed(2)}€):\n${rows.join("\n")}`;
      }

      // ── send_notification ─────────────────────────────────────────────────
      case "send_notification": {
        const userId  = String(input.user_id);
        const title   = String(input.title ?? "Nachricht");
        const message = String(input.message ?? "");
        const url     = input.url ? String(input.url) : "/client-horses";

        const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ user_id: userId, title, body: message, url }),
        });
        const json = await res.json().catch(() => ({})) as { sent?: number; error?: string };
        if (!res.ok) return `Benachrichtigung fehlgeschlagen: ${json.error ?? res.status}`;
        return `Benachrichtigung gesendet (${json.sent ?? 1} Gerät/e).`;
      }

      // ── create_appointment ────────────────────────────────────────────────
      case "create_appointment": {
        const { error, data } = await supabaseAdmin
          .from("appointments")
          .insert({
            provider_id:  providerId,
            horse_id:     input.horse_id   ?? null,
            client_id:    input.client_id  ?? null,
            date:         String(input.date),
            time:         input.time        ? String(input.time) : null,
            service_type: input.service_type ? String(input.service_type) : professionProfile.serviceLabel,
            notes:        input.notes       ? String(input.notes) : null,
            duration:     input.duration    ? Number(input.duration) : professionProfile.appointmentDuration,
            status:       "scheduled",
          })
          .select("id")
          .single();
        if (error) return `Termin-Erstellung fehlgeschlagen: ${error.message}`;
        return `✅ Termin angelegt für ${input.date}${input.time ? ` um ${input.time}` : ""} | apt_id:${(data as Record<string,unknown>).id}`;
      }

      // ── update_appointment ────────────────────────────────────────────────
      case "update_appointment": {
        const aptId = String(input.appointment_id);
        const updates: Record<string, unknown> = {};
        if (input.date)   updates.date   = String(input.date);
        if (input.time)   updates.time   = String(input.time);
        if (input.status) updates.status = String(input.status);
        if (input.notes)  updates.notes  = String(input.notes);

        const { error } = await supabaseAdmin.from("appointments").update(updates).eq("id", aptId);
        if (error) return `Update fehlgeschlagen: ${error.message}`;
        return `✅ Termin ${aptId} aktualisiert: ${JSON.stringify(updates)}`;
      }

      // ── cancel_appointment ────────────────────────────────────────────────
      case "cancel_appointment": {
        const aptId = String(input.appointment_id);
        const { data: apt, error: fetchErr } = await supabaseAdmin
          .from("appointments")
          .select("id,date,client_id,horses(name)")
          .eq("id", aptId)
          .single();
        if (fetchErr) return `Termin nicht gefunden: ${fetchErr.message}`;

        const { error } = await supabaseAdmin
          .from("appointments")
          .update({ status: "cancelled", notes: input.reason ? String(input.reason) : null })
          .eq("id", aptId);
        if (error) return `Stornierung fehlgeschlagen: ${error.message}`;

        const aptData = apt as Record<string,unknown>;
        if (input.notify_client && aptData.client_id) {
          const h = Array.isArray(aptData.horses) ? aptData.horses[0] : aptData.horses as Record<string,unknown>|null;
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({
              user_id: aptData.client_id,
              title: "Termin abgesagt",
              body: `Dein Termin am ${aptData.date}${h ? ` für ${h.name}` : ""} wurde abgesagt.${input.reason ? ` Grund: ${input.reason}` : ""}`,
              url: "/client-horses",
            }),
          }).catch(() => null);
        }
        return `✅ Termin ${aptId} (${aptData.date}) storniert.${input.notify_client ? " Kunden benachrichtigt." : ""}`;
      }

      // ── create_invoice ────────────────────────────────────────────────────
      case "create_invoice": {
        interface LineItem { title: string; quantity: number; unit_price: number; inventory_item_id: string | null; }
        const rawItems = input.line_items;
        let lineItems: LineItem[];
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          lineItems = rawItems.map((item) => {
            const i = item as Record<string, unknown>;
            return {
              title: String(i.title ?? "Position"),
              quantity: Number(i.quantity ?? 1),
              unit_price: Number(i.unit_price ?? 0),
              inventory_item_id: (i.inventory_item_id as string | null) ?? null,
            };
          });
        } else {
          const title = input.service_type ? String(input.service_type) : "Leistung";
          const amount = Number(input.amount ?? 0);
          lineItems = amount > 0 ? [{ title, quantity: 1, unit_price: amount, inventory_item_id: null }] : [];
        }
        const totalNetto = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
        const invoiceNumber = `HF-${Date.now().toString(36).toUpperCase()}`;

        const { data: inv, error: invErr } = await supabaseAdmin
          .from("invoices")
          .insert({
            provider_id: providerId,
            client_id: input.client_id ?? null,
            horse_id: input.horse_id ?? null,
            invoice_number: invoiceNumber,
            issue_date: today,
            total_amount: totalNetto > 0 ? totalNetto : Number(input.amount ?? 0),
            status: "draft",
            payment_status: null,
            customer_type: "client",
            notes: input.notes ? String(input.notes) : null,
          })
          .select("id")
          .single();
        if (invErr) return `Rechnung konnte nicht erstellt werden: ${invErr.message}`;
        const invoiceId = (inv as Record<string,unknown>).id as string;

        if (lineItems.length > 0) {
          const itemRows = lineItems.map((li) => ({
            invoice_id: invoiceId,
            inventory_item_id: li.inventory_item_id,
            title: li.title,
            quantity: li.quantity,
            unit_price: li.unit_price,
            total_price: li.quantity * li.unit_price,
          }));
          const { error: itemsErr } = await supabaseAdmin.from("invoice_items").insert(itemRows);
          if (itemsErr) console.error("[hufi-agent] invoice_items insert error:", itemsErr.message);
        }

        let deducted = 0;
        for (const li of lineItems.filter((l) => l.inventory_item_id)) {
          const { data: stockRow } = await supabaseAdmin
            .from("inventory_items")
            .select("current_stock")
            .eq("id", li.inventory_item_id!)
            .eq("user_id", providerId)
            .maybeSingle();
          if (stockRow) {
            const newStock = Math.max(0, (stockRow as Record<string,unknown>).current_stock as number - li.quantity);
            await supabaseAdmin.from("inventory_items").update({ current_stock: newStock }).eq("id", li.inventory_item_id!).eq("user_id", providerId);
            deducted++;
          }
        }

        const posText = lineItems.length > 0 ? ` (${lineItems.length} Pos., ${totalNetto.toFixed(2)}€)` : "";
        return `🧾 Rechnung ${invoiceNumber}${posText} als Entwurf angelegt${deducted > 0 ? ` — ${deducted} Lagerartikel abgezogen` : ""} | invoice_id:${invoiceId}`;
      }

      // ── create_note ───────────────────────────────────────────────────────
      case "create_note": {
        const key = `note_${input.horse_name ? String(input.horse_name).toLowerCase().replace(/\s+/g, "_") : "allgemein"}_${Date.now()}`;
        const { error } = await supabaseAdmin.from("hufi_memory").insert({
          user_id: providerId,
          category: "preference",
          key,
          value: {
            note_text: input.note_text ?? "",
            horse_name: input.horse_name ?? null,
            client_name: input.client_name ?? null,
            created_at: new Date().toISOString(),
          },
          source: "ai",
          confidence: 0.5,
          last_updated: new Date().toISOString(),
        });
        if (error) return `Notiz konnte nicht gespeichert werden: ${error.message}`;
        return `📝 Notiz gespeichert${input.horse_name ? ` für ${input.horse_name}` : ""}.`;
      }

      // ── create_horse ──────────────────────────────────────────────────────
      case "create_horse": {
        if (!input.owner_id || !input.name) return "owner_id und name sind Pflicht.";
        const { data, error } = await supabaseAdmin
          .from("horses")
          .insert({
            owner_id: String(input.owner_id),
            name: String(input.name),
            equine_type: "horse",
            breed: input.breed ? String(input.breed) : null,
            birth_year: input.birth_year ? Number(input.birth_year) : null,
            gender: input.gender ? String(input.gender) : null,
            color: input.color ? String(input.color) : null,
            shoeing_interval: input.shoeing_interval ? Number(input.shoeing_interval) : null,
            special_notes: input.special_notes ? String(input.special_notes) : null,
          })
          .select("id")
          .single();
        if (error) return `Pferd konnte nicht angelegt werden: ${error.message}`;
        return `✅ Pferd "${input.name}" angelegt | horse_id:${(data as Record<string,unknown>).id}`;
      }

      // ── create_contact ────────────────────────────────────────────────────
      case "create_contact": {
        if (!input.full_name) return "full_name ist Pflicht.";
        const newId = crypto.randomUUID();
        const fullName = String(input.full_name);
        const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
          id: newId,
          full_name: fullName,
          email: input.email ? String(input.email) : null,
          phone: input.phone ? String(input.phone) : null,
          street: input.street ? String(input.street) : null,
          zip_code: input.zip_code ? String(input.zip_code) : null,
          city: input.city ? String(input.city) : null,
          created_by_provider_id: providerId,
          onboarding_completed: false,
          has_logged_in: false,
        });
        if (profileErr) return `Kunde konnte nicht angelegt werden: ${profileErr.message}`;

        const { error: contactErr } = await supabaseAdmin.from("contacts").insert({
          provider_id: providerId,
          full_name: fullName,
          email: input.email ? String(input.email) : null,
          phone: input.phone ? String(input.phone) : null,
          category: "client",
          profile_id: newId,
        });
        if (contactErr) console.error("[hufi-agent] contacts insert error:", contactErr.message);

        return `✅ Kunde "${fullName}" angelegt | client_id:${newId}`;
      }

      // ── add_expense ───────────────────────────────────────────────────────
      case "add_expense": {
        const amount = Number(input.amount ?? 0);
        const description = input.description ? String(input.description) : "";
        if (!amount || amount <= 0) return "Bitte einen gültigen Betrag angeben.";
        if (!description) return "Bitte die Ausgabe kurz beschreiben.";
        const { error } = await supabaseAdmin.from("expenses").insert({
          user_id: providerId,
          amount,
          category: input.category ? String(input.category) : "sonstiges",
          description,
          expense_date: input.date ? String(input.date) : today,
          is_recurring: false,
        });
        if (error) return `Ausgabe konnte nicht gespeichert werden: ${error.message}`;
        return `✅ Ausgabe von ${amount.toFixed(2)}€ (${description}) erfasst.`;
      }

      default:
        return `Unbekanntes Tool: ${toolName}`;
    }
  } catch (err) {
    console.error(`[hufi-agent] Tool ${toolName} error:`, err);
    return `Tool-Fehler: ${String(err)}`;
  }
}

// ── Leichtgewichtiger Basis-Kontext ────────────────────────────────────────────

async function loadLightContext(userId: string, supabase: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);
  const in7   = new Date(Date.now() +  7 * 86_400_000).toISOString().slice(0, 10);

  const [profileRes, apptTodayRes, invoiceRes, memoryRes, bhsSubsRes, leadsRes, ordersRes, completedApptsRes, befundeRes] = await Promise.allSettled([
    // Hinweis: Spalte hieß früher "user_type", wurde clientseitig bereits auf "role" umgestellt — hier nachgezogen.
    supabase.from("profiles").select("full_name, role, profession_type").eq("id", userId).single(),
    supabase.from("appointments")
      .select("id,date,time,status,horse_id,client_id,horses(id,name,eqid),client:profiles!client_id(id,full_name,readable_id)")
      .eq("provider_id", userId).gte("date", today).lte("date", in7)
      .in("status", ["scheduled", "confirmed"]).order("date").order("time").limit(15),
    supabase.from("invoices").select("*", { count: "exact", head: true }).eq("provider_id", userId).neq("payment_status", "paid"),
    supabase.from("hufi_memory").select("category,key,value").eq("user_id", userId).order("last_updated", { ascending: false }).limit(4),
    supabase.from("bhs_horse_subscriptions")
      .select("interval_weeks,zone,monthly_price,status,next_service_date,horses(name)")
      .eq("client_id", userId).in("status", ["active","pending"]).order("next_service_date").limit(5),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("provider_id", userId).eq("status", "neu"),
    supabase.from("service_orders").select("*", { count: "exact", head: true }).eq("provider_id", userId).in("order_status", ["pending", "open", "in_progress"]),
    supabase.from("appointments")
      .select("horse_id,date,horses(id,name,shoeing_interval)")
      .eq("provider_id", userId).eq("status", "completed")
      .order("date", { ascending: false }).limit(100),
    supabase.from("ai_befunde")
      .select("id,created_at,pferd_name,befund_text,massnahme,naechster_termin")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const profile = profileRes.status === "fulfilled" ? profileRes.value.data as Record<string,unknown>|null : null;

  type ApptRow = { id:string; date:string; time:string|null; status:string; horse_id:string|null; client_id:string|null; horses:unknown; client:unknown; };
  const appts = apptTodayRes.status === "fulfilled" && apptTodayRes.value.data
    ? (apptTodayRes.value.data as ApptRow[]).map((a) => {
        const h = Array.isArray(a.horses) ? a.horses[0] : a.horses as Record<string,unknown>|null;
        const c = a.client as Record<string,unknown>|null;
        return { id: a.id, date: a.date, time: a.time, status: a.status, horse_id: a.horse_id ?? (h as Record<string,unknown>|null)?.id ?? null, horse_name: (h as Record<string,unknown>|null)?.name ?? null, client_id: a.client_id ?? c?.id ?? null, client_name: c?.full_name ?? null };
      })
    : [];

  const unpaidCount = invoiceRes.status === "fulfilled" ? (invoiceRes.value.count ?? 0) : 0;
  const memories = memoryRes.status === "fulfilled" && memoryRes.value.data
    ? (memoryRes.value.data as Array<{ category: string; key: string; value: Record<string, unknown> }>)
    : [];

  interface BhsSubRow { interval_weeks: number; zone: number; monthly_price: number; status: string; next_service_date: string | null; horses: unknown; }
  const bhsSubs: BhsSubRow[] = bhsSubsRes.status === "fulfilled" && bhsSubsRes.value.data ? (bhsSubsRes.value.data as BhsSubRow[]) : [];

  const leadsCount = leadsRes.status === "fulfilled" ? (leadsRes.value.count ?? 0) : 0;
  const ordersCount = ordersRes.status === "fulfilled" ? (ordersRes.value.count ?? 0) : 0;

  // Überfällige Pferde: pro Pferd nach INDIVIDUELLEM shoeing_interval (Wochen), nicht nach festem Pauschalwert.
  interface CompletedApptRow { horse_id: string | null; date: string; horses: unknown; }
  const completedAppts = completedApptsRes.status === "fulfilled" && completedApptsRes.value.data
    ? (completedApptsRes.value.data as CompletedApptRow[])
    : [];
  const seenHorses = new Set<string>();
  const overdueHorses: Array<{ id: string; name: string; weeksOverdue: number }> = [];
  for (const row of completedAppts) {
    if (!row.horse_id || seenHorses.has(row.horse_id)) continue;
    seenHorses.add(row.horse_id);
    const h = Array.isArray(row.horses) ? row.horses[0] : row.horses as Record<string,unknown> | null;
    const name = (h as Record<string,unknown>|null)?.name as string | undefined;
    const intervalWeeks = (h as Record<string,unknown>|null)?.shoeing_interval as number | null | undefined;
    if (!name) continue;
    const intervalDays = intervalWeeks ? intervalWeeks * 7 : 56;
    const daysSince = Math.floor((Date.now() - new Date(row.date).getTime()) / 86_400_000);
    if (daysSince >= intervalDays - 7) {
      overdueHorses.push({ id: row.horse_id, name, weeksOverdue: Math.floor(daysSince / 7) });
      if (overdueHorses.length >= 5) break;
    }
  }

  const lastBefunde = befundeRes.status === "fulfilled" && befundeRes.value.data
    ? (befundeRes.value.data as Array<{ id: string; created_at: string; pferd_name: string | null; befund_text: string | null; massnahme: string | null; naechster_termin: string | null }>)
    : [];

  return {
    userName: profile?.full_name as string|null ?? null,
    userType: profile?.role as string|null ?? null,
    professionType: profile?.profession_type as string|null ?? null,
    appts, unpaidCount, memories, bhsSubs,
    leadsCount, ordersCount, overdueHorses, lastBefunde,
  };
}

// ── Berufsprofile: Leistungen / Materialien / Workflow pro Beruf ───────────────
// Server-seitiges Pendant zu src/lib/profession-config.ts + PROFESSION_5A.
const PROFESSION_PROFILES: Record<string, { label: string; services: string; materials: string; workflow: string; serviceLabel: string; appointmentDuration: number }> = {
  hoof_care: {
    label: "Hufbearbeiter / Hufpfleger",
    services: "Barhufe/Natürliche Hufpflege, Beschlag (Eisen), Klebebeschlag (Composite), Hufschutz, Trachtenkeil, Spezialbeschlag",
    materials: "Klemmplatten (E4/E6/E8), UV-Kleber, Glasfaser-Patches, Hufeisen (Stahl/Alu), Nägel, Laschen, Hufschuhe, Hufversiegelung, Hufmesser, Hufbalsam",
    workflow: "1.AUFNAHME: Pferd/Kunde anlegen, Erstbefund · 2.ANGEBOT: Leistungspaket (Natur/Beschlag/Klebe) · 3.AUFTRAG: Termin, Tour-Route · 4.ABRECHNUNG: Rechnung aus Termin+Materialien · 5.ANALYSE: Huf-Entwicklung, Wirtschaftlichkeit",
    serviceLabel: "Hufbearbeitung",
    appointmentDuration: 60,
  },
  farrier: {
    label: "Hufschmied / Beschlagschmied",
    services: "Handgeschmiedeter Beschlag, Ortho-Beschlag, Eisen zurichten, Nageln, Klebebeschlag",
    materials: "Roheisen, Schmiedekohle, Borax, Hufeisen-Rohlinge, Nägel (E-Nägel), Stollen, Herzstollen",
    workflow: "1.AUFNAHME: Pferd, Klauenformular · 2.ANGEBOT: Standard/Ortho/Sport · 3.AUFTRAG: Schmiedebesuch · 4.ABRECHNUNG: Eisen+Arbeit · 5.ANALYSE: Beschlags-Intervalle",
    serviceLabel: "Beschlag",
    appointmentDuration: 90,
  },
  osteopath: {
    label: "Osteopath / Tierheilpraktiker",
    services: "Osteopathische Behandlung, Cranio-Sacrale Therapie, Faszienmobilisation, Wirbelsäulenbehandlung",
    materials: "Therapieöl, Handtücher, Dokumentationsformulare",
    workflow: "1.AUFNAHME: Anamnese · 2.ANGEBOT: Therapieplan · 3.AUFTRAG: Behandlungstermin · 4.ABRECHNUNG: Behandlung · 5.ANALYSE: Therapieerfolg",
    serviceLabel: "Behandlung",
    appointmentDuration: 90,
  },
  physiotherapist: {
    label: "Physiotherapeut",
    services: "Physiotherapie, Magnetfeldtherapie, Laser, Massage, Kinesiotaping",
    materials: "Tape, Elektroden, Lasergerät, Massageöl",
    workflow: "1.AUFNAHME: Befundaufnahme · 2.ANGEBOT: Therapieplan · 3.AUFTRAG: Behandlung · 4.ABRECHNUNG: Therapieleistung · 5.ANALYSE: Fortschritt",
    serviceLabel: "Therapie",
    appointmentDuration: 75,
  },
  saddler: {
    label: "Sattler",
    services: "Sattelanpassung, Sattelreparatur, Neupolsterung, Lederarbeit, Gurte",
    materials: "Leder, Wolle, Schaumstoff, Nähgarn, Schnallen, Klett, Lederöl",
    workflow: "1.AUFNAHME: Rücken-Scan · 2.ANGEBOT: Anpassungs-/Neuanfertigung · 3.AUFTRAG: Werkstatt/Hausbesuch · 4.ABRECHNUNG: Material+Arbeit · 5.ANALYSE: Auftragsverlauf",
    serviceLabel: "Sattelanpassung",
    appointmentDuration: 90,
  },
  vet_mobile: {
    label: "Mobiler Tierarzt",
    services: "Impfung, Blutentnahme, Sedierung, Wundversorgung, Zahnbehandlung (Equine), Ultraschall",
    materials: "Impfstoffe, Spritzen, Kanülen, Sedativa, Antibiotika, Verbandsmaterial",
    workflow: "1.AUFNAHME: Patientenakte · 2.ANGEBOT: Behandlungsplan · 3.AUFTRAG: Hausbesuch · 4.ABRECHNUNG: Behandlung+Medikamente · 5.ANALYSE: Bestandsführung, GOT-Abrechnung",
    serviceLabel: "Behandlung",
    appointmentDuration: 45,
  },
  dentist: {
    label: "Equine Dentist / Pferdezahnarzt",
    services: "Zahnkontrolle, Raspen, Hakenzähne, Wolfszähne, Sedierung",
    materials: "Raspeln, Mundspülungen, Sedativa",
    workflow: "1.AUFNAHME: Gebiss-Foto · 2.ANGEBOT: Jahresplan · 3.AUFTRAG: Behandlungstermin · 4.ABRECHNUNG: Leistung+Sedierung · 5.ANALYSE: Zahnentwicklung",
    serviceLabel: "Zahnbehandlung",
    appointmentDuration: 45,
  },
  riding_instructor: {
    label: "Reitlehrer / Trainer",
    services: "Einzel-Reitstunde, Gruppenunterricht, Turniervorbereitung, Longier-Stunde",
    materials: "Longe, Kappzaum, Seitenzügel",
    workflow: "1.AUFNAHME: Reit-Niveau · 2.ANGEBOT: Kurspakete · 3.AUFTRAG: Stundenplan · 4.ABRECHNUNG: Stunden/Pakete · 5.ANALYSE: Schüler-Fortschritt",
    serviceLabel: "Reitstunde",
    appointmentDuration: 60,
  },
  massage: {
    label: "Pferde-Masseur/in",
    services: "Klassische Massage, Lymphdrainage, Faszientechniken, Dehnung",
    materials: "Massageöl, Handtücher, Faszienrolle",
    workflow: "1.AUFNAHME: Spannungsbefund · 2.ANGEBOT: Behandlungspaket · 3.AUFTRAG: Termin · 4.ABRECHNUNG: Behandlung · 5.ANALYSE: Verlauf",
    serviceLabel: "Massage",
    appointmentDuration: 60,
  },
};

const DEFAULT_PROFESSION_PROFILE = { serviceLabel: "Termin", appointmentDuration: 60 };

function buildProfessionBlock(professionType: string | null): string {
  const prof = professionType ? PROFESSION_PROFILES[professionType] : null;
  if (!prof) return "";
  return [
    "=== BERUFSPROFIL ===",
    `Beruf des Nutzers: ${prof.label}`,
    `Typische Leistungen: ${prof.services}`,
    `Typische Materialien: ${prof.materials}`,
    `Workflow: ${prof.workflow}`,
    "WICHTIG: Richte Vorschläge, Terminologie und Leistungs-/Materialnamen an diesem Beruf aus. Verwende NICHT huf-spezifische Begriffe (Beschlag, Hufeisen), wenn der Beruf ein anderer ist.",
    "=== ENDE BERUFSPROFIL ===",
  ].join("\n");
}

function buildLightContextBlock(ctx: Awaited<ReturnType<typeof loadLightContext>>, voiceMode: boolean, route?: string): string {
  const lines: string[] = [];
  if (ctx.userName) lines.push(`Nutzer: ${ctx.userName}`);
  if (ctx.userType) {
    const labels: Record<string,string> = { provider: "Mobiler Hufpflege-Dienstleister", client: "Pferdebesitzer", partner: "Therapeut/Partner", employee: "Angestellter" };
    lines.push(`Rolle: ${labels[ctx.userType] ?? ctx.userType}`);
  }
  if (route) lines.push(`Aktuelle Seite: ${route}`);

  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = ctx.appts.filter(a => a.date === today);
  const upcomingAppts = ctx.appts.filter(a => a.date > today);

  if (todayAppts.length > 0) {
    lines.push(`Heute (${todayAppts.length} Termine): ${todayAppts.map(a => `${a.time?.slice(0,5) ?? "?"} ${a.horse_name ?? "?"} (${a.client_name ?? "?"}) [apt_id:${a.id}]`).join(", ")}`);
  } else {
    lines.push("Heute: keine Termine");
  }
  if (upcomingAppts.length > 0) {
    lines.push(`Nächste 7 Tage: ${upcomingAppts.slice(0,5).map(a => `${a.date} ${a.horse_name ?? "?"}${a.client_name ? ` (${a.client_name})` : ""} [apt_id:${a.id}]`).join(", ")}`);
  }
  if (ctx.unpaidCount > 0) lines.push(`Offene Rechnungen: ${ctx.unpaidCount}`);
  if (ctx.leadsCount > 0) lines.push(`Neue Leads: ${ctx.leadsCount}`);
  if (ctx.ordersCount > 0) lines.push(`Offene Aufträge: ${ctx.ordersCount}`);

  if (ctx.overdueHorses.length > 0) {
    lines.push(`Überfällige Pferde (individuelles Intervall): ${ctx.overdueHorses.map(h => `${h.name} (${h.weeksOverdue} Wochen überfällig)`).join(", ")}`);
  }

  if (ctx.lastBefunde.length > 0) {
    const befundLines = ctx.lastBefunde.map(b => `${b.pferd_name ?? "?"}: ${(b.befund_text ?? "").slice(0, 80)}${b.massnahme ? ` → ${b.massnahme}` : ""}`);
    lines.push(`Letzte Befunde:\n${befundLines.join("\n")}`);
  }

  if (ctx.memories.length > 0) {
    const memLines = ctx.memories.filter(m => m.value && typeof m.value === "object").map(m => {
      const v = m.value as Record<string,unknown>;
      return `[${m.category}] ${v["content"] ?? v["text"] ?? JSON.stringify(v).slice(0,60)}`;
    });
    if (memLines.length > 0) lines.push(`Eingemerkt:\n${memLines.join("\n")}`);
  }

  // BHS Abos (für Client)
  if (ctx.bhsSubs.length > 0) {
    const todayD = new Date();
    const subLines = ctx.bhsSubs.map(s => {
      const hn = Array.isArray(s.horses) ? (s.horses[0] as Record<string,unknown>)?.name : (s.horses as Record<string,unknown>|null)?.name ?? "Pferd";
      const nextDate = s.next_service_date ? new Date(s.next_service_date) : null;
      const days = nextDate ? Math.ceil((nextDate.getTime() - todayD.getTime()) / 86_400_000) : null;
      return `${hn}: ${s.interval_weeks}Wo Zone${s.zone} ${s.monthly_price}€/Mo${days !== null && days <= 7 ? ` ⚠️ in ${days} Tagen!` : ""}`;
    });
    lines.push(`BHS Balance:\n${subLines.join("\n")}`);
  }

  if (lines.length === 0) return "";
  return `${voiceMode ? "KONTEXT:" : "APP-KONTEXT (intern, nie zitieren):"}\n${lines.join("\n")}`;
}

// ── Claude mit Tool Use ────────────────────────────────────────────────────────

async function callClaudeWithTools(
  systemPrompt: string,
  messages: Array<{ role: string; content: string | ContentBlock[] }>,
  apiKey: string,
  model: string,
  providerId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  voiceMode: boolean,
  professionType: string | null = null,
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);

  try {
    let currentMessages = [...messages];
    let rounds = 0;

    while (rounds < MAX_TOOLS_ROUNDS) {
      rounds++;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: voiceMode ? 300 : 1024,
          system: systemPrompt,
          tools: voiceMode ? [] : HUFI_TOOLS, // Voice: keine Tools (zu langsam)
          messages: currentMessages,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(`Claude ${res.status}: ${err.error?.message ?? res.statusText}`);
      }

      const json = await res.json() as {
        stop_reason: string;
        content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string,unknown> }>;
      };

      // Kein Tool-Call → finale Antwort
      if (json.stop_reason === "end_turn" || !json.content.some(b => b.type === "tool_use")) {
        const text = json.content.find(b => b.type === "text")?.text ?? "";
        return text;
      }

      // Tool-Calls ausführen
      const toolUseBlocks = json.content.filter(b => b.type === "tool_use");
      const toolResults: ContentBlock[] = [];

      for (const block of toolUseBlocks) {
        if (!block.name || !block.id) continue;
        console.log(`[hufi-agent] Tool: ${block.name}`, JSON.stringify(block.input).slice(0, 100));
        const result = await executeTool(
          block.name,
          block.input ?? {},
          providerId,
          supabaseAdmin,
          supabaseUrl,
          supabaseServiceKey,
          professionType,
        );
        console.log(`[hufi-agent] Tool result (${block.name}): ${result.slice(0, 100)}`);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      // Nachrichten für nächste Runde vorbereiten
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: json.content as ContentBlock[] },
        { role: "user", content: toolResults },
      ];
    }

    // Max Runden erreicht → nochmal ohne Tools für finale Antwort
    const finalRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: voiceMode ? 200 : 512,
        system: systemPrompt,
        messages: currentMessages,
      }),
      signal: ctrl.signal,
    });
    const finalJson = await finalRes.json() as { content?: Array<{ type: string; text?: string }> };
    return finalJson.content?.find(b => b.type === "text")?.text ?? "Ich konnte die Anfrage nicht vollständig verarbeiten.";

  } finally {
    clearTimeout(timer);
  }
}

// ── Ollama Fallback (kein Tool Use) ───────────────────────────────────────────

async function callOllama(systemPrompt: string, messages: Array<{ role: string; content: string | ContentBlock[] }>, proxyBase: string, secret: string): Promise<string> {
  const simpleMessages = messages.map(m => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(`${proxyBase}/api/ollama/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ollama-secret": secret },
      body: JSON.stringify({ model: "hufiai-core", messages: [{ role: "system", content: systemPrompt }, ...simpleMessages], stream: false, options: { temperature: 0.7, num_predict: 400 } }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const json = await res.json() as { message?: { content: string }; response?: string };
    return json.message?.content ?? json.response ?? "";
  } finally {
    clearTimeout(timer);
  }
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function selectModel(text: string, voiceMode: boolean): string {
  if (voiceMode) return MODEL_FAST;
  if (text.length < 60) return MODEL_FAST;
  return MODEL_SMART;
}

// ── Main Handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonErr("Nicht angemeldet", 401);

  const supabaseUrl        = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon       = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  // Service-Role-Client für Tool-Ausführung (volle Abfrage-Rechte, Provider-scoped)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonErr("Nicht angemeldet", 401);

  let body: RequestBody;
  try { body = await req.json() as RequestBody; }
  catch { return jsonErr("Ungültige Anfrage", 400); }

  const { text, voiceMode = false, history = [], route, mode = "chat", clientTimestamp, clientTimezone, clientLocation } = body;
  if (!text?.trim()) return jsonErr("Kein Text", 400);

  // ── Lokale Zeit aus Client-Timestamp + Zeitzone ────────────────────────────
  const ts = clientTimestamp ? new Date(clientTimestamp) : new Date();
  const tz = clientTimezone ?? "Europe/Berlin";
  const localTimeStr = new Intl.DateTimeFormat("de-DE", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);

  // ── Wetter + Kontext parallel laden ────────────────────────────────────────
  const [ctxResult, weatherStr] = await Promise.allSettled([
    loadLightContext(user.id, supabase).catch((e) => {
      console.warn(`[hufi-agent][${requestId}] Kontext-Fehler:`, e);
      return { userName: null, userType: null, professionType: null, appts: [], unpaidCount: 0, memories: [], bhsSubs: [], leadsCount: 0, ordersCount: 0, overdueHorses: [], lastBefunde: [] };
    }),
    clientLocation?.lat && clientLocation?.lon
      ? fetchWeather(clientLocation.lat, clientLocation.lon)
      : Promise.resolve(null),
  ]);

  const ctx = ctxResult.status === "fulfilled"
    ? ctxResult.value
    : { userName: null, userType: null, professionType: null, appts: [], unpaidCount: 0, memories: [], bhsSubs: [], leadsCount: 0, ordersCount: 0, overdueHorses: [], lastBefunde: [] };
  const weather = weatherStr.status === "fulfilled" ? weatherStr.value : null;

  const contextBlock = buildLightContextBlock(ctx, voiceMode, route);
  const roleInstr = ROLE_INSTRUCTIONS[ctx.userType ?? ""] ?? "";
  const horseKnowledge = getHorseKnowledgeForRole(ctx.userType);
  // Berufsprofil nur für Dienstleister/Angestellte (nicht für Pferdebesitzer/Partner).
  const professionBlock = (ctx.userType === "provider" || ctx.userType === "employee")
    ? buildProfessionBlock(ctx.professionType)
    : "";

  const systemPrompt = [
    HUFI_BASE,
    roleInstr,
    horseKnowledge,
    professionBlock || null,
    `Aktuelle Zeit: ${localTimeStr}`,
    weather ? `Aktuelles Wetter: ${weather}` : null,
    contextBlock,
    !voiceMode ? "WICHTIG: Für Detaildaten (Pferdeakte, voller Kalender, Rechnungen) nutze die bereitgestellten Tools. Für Namen-Auflösung IMMER search_entity aufrufen." : "",
  ].filter(Boolean).join("\n\n");

  const messages: Array<{ role: string; content: string | ContentBlock[] }> = [
    ...history.slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: text.trim() },
  ];

  const model = selectModel(text, voiceMode);
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const OLLAMA_PROXY  = Deno.env.get("OLLAMA_PROXY_URL") ?? "";
  const OLLAMA_SECRET = Deno.env.get("OLLAMA_PROXY_SECRET") ?? "";

  let rawAnswer = "";
  let source: "claude" | "ollama" = "claude";

  if (ANTHROPIC_KEY) {
    try {
      rawAnswer = await callClaudeWithTools(
        systemPrompt, messages, ANTHROPIC_KEY, model,
        user.id, supabaseAdmin, supabaseUrl, supabaseServiceKey, voiceMode,
        ctx.professionType,
      );
      source = "claude";
    } catch (e) {
      console.error(`[hufi-agent][${requestId}] Claude Fehler:`, e);
    }
  }

  if (!rawAnswer?.trim() && OLLAMA_PROXY) {
    try {
      rawAnswer = await callOllama(systemPrompt, messages, OLLAMA_PROXY, OLLAMA_SECRET);
      source = "ollama";
    } catch (e) {
      console.error(`[hufi-agent][${requestId}] Ollama Fehler:`, e);
    }
  }

  const dur = Date.now() - t0;
  console.log(`[hufi-agent] id=${requestId} model=${model} source=${source} mode=${mode} voice=${voiceMode} dur=${dur}ms`);

  if (!rawAnswer?.trim()) {
    return new Response(
      JSON.stringify({ ok: false, error: "Ich erreiche Hufi gerade nicht. Bitte gleich nochmal versuchen.", source: "none" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Legacy Action-Modus (Rückwärtskompatibilität mit action mode)
  if (mode === "action") {
    let actionPlan: ActionPlan | null = null;
    try {
      const cleaned = rawAnswer.replace(/```json?/g, "").replace(/```/g, "").trim();
      if (cleaned.startsWith("{")) actionPlan = JSON.parse(cleaned) as ActionPlan;
    } catch { /* kein valides JSON */ }
    return new Response(
      JSON.stringify({ ok: true, answer: actionPlan?.confirmText ?? rawAnswer, spokenText: actionPlan?.explanation ?? rawAnswer, source, actionPlan }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, answer: rawAnswer, spokenText: rawAnswer, source }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
