import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "list_horses",
  title: "Pferde auflisten",
  description:
    "Listet die Pferde auf, auf die der angemeldete Nutzer Zugriff hat. Optional nach Name oder EQID gefiltert.",
  inputSchema: {
    search: z.string().optional().describe("Optionaler Suchbegriff (Pferdename oder EQID)."),
    limit: z.number().int().optional().describe("Maximale Anzahl Ergebnisse (Standard 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 25, 1), 100);

    let query = supabase
      .from("horses")
      .select("id, eqid, name, nickname, breed, birth_year, gender, color, hoof_type, shoeing_interval, location_name, next_appointment_due, last_appointment_date")
      .is("deleted_at", null)
      .order("name")
      .limit(max);

    if (search?.trim()) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,eqid.ilike.%${term}%,nickname.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) return toolError(error.message);
    return jsonResult({ count: data?.length ?? 0, horses: data ?? [] });
  },
});