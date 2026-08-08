import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "get_horse",
  title: "Pferdedetails abrufen",
  description:
    "Liefert das vollständige Pferdeprofil (Stammdaten, Huf-Infos, Gesundheit) anhand der Pferde-ID oder EQID.",
  inputSchema: {
    horse_id: z.string().optional().describe("UUID des Pferdes."),
    eqid: z.string().optional().describe("Lesbare EQID des Pferdes, falls die UUID unbekannt ist."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ horse_id, eqid }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    if (!horse_id && !eqid) return toolError("Bitte horse_id oder eqid angeben.");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("horses")
      .select(
        "id, eqid, name, nickname, official_name, breed, birth_year, birth_date, gender, color, height_cm, discipline, usage_type, housing, hoof_type, hoof_protection, shoeing_interval, recall_interval_weeks, health_status, health_issues_general, known_allergies, current_medications, special_notes, location_name, last_appointment_date, next_appointment_due",
      )
      .is("deleted_at", null)
      .limit(1);

    query = horse_id ? query.eq("id", horse_id) : query.eq("eqid", eqid!);

    const { data, error } = await query.maybeSingle();
    if (error) return toolError(error.message);
    if (!data) return toolError("Pferd nicht gefunden oder kein Zugriff.");
    return jsonResult(data);
  },
});