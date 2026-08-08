import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "list_appointments",
  title: "Termine auflisten",
  description:
    "Listet Termine des angemeldeten Nutzers in einem Datumsbereich (Standard: ab heute).",
  inputSchema: {
    from: z.string().optional().describe("Startdatum im Format YYYY-MM-DD. Standard: heute."),
    to: z.string().optional().describe("Enddatum im Format YYYY-MM-DD."),
    status: z.string().optional().describe("Optionaler Status-Filter, z. B. scheduled oder completed."),
    limit: z.number().int().optional().describe("Maximale Anzahl Ergebnisse (Standard 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 25, 1), 100);
    const start = from?.trim() || new Date().toISOString().slice(0, 10);

    let query = supabase
      .from("appointments")
      .select("id, date, time, duration, service_type, status, location, notes, price, horse_id, horses(name, eqid)")
      .gte("date", start)
      .order("date")
      .order("time")
      .limit(max);

    if (to?.trim()) query = query.lte("date", to.trim());
    if (status?.trim()) query = query.eq("status", status.trim());

    const { data, error } = await query;
    if (error) return toolError(error.message);
    return jsonResult({ count: data?.length ?? 0, from: start, appointments: data ?? [] });
  },
});