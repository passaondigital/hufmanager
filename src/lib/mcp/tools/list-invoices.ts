import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "list_invoices",
  title: "Rechnungen auflisten",
  description: "Listet Rechnungen des angemeldeten Nutzers, optional nach Status gefiltert.",
  inputSchema: {
    status: z.string().optional().describe("Status-Filter, z. B. sent, paid oder overdue."),
    limit: z.number().int().optional().describe("Maximale Anzahl Ergebnisse (Standard 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 25, 1), 100);

    let query = supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, total_amount, status, payment_status, paid_at, horse_id")
      .order("issue_date", { ascending: false })
      .limit(max);

    if (status?.trim()) query = query.eq("status", status.trim());

    const { data, error } = await query;
    if (error) return toolError(error.message);
    const open = (data ?? []).filter((i) => i.status !== "paid");
    return jsonResult({
      count: data?.length ?? 0,
      open_amount: open.reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0),
      invoices: data ?? [],
    });
  },
});