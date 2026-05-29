import { supabase } from "@/integrations/supabase/client";
import { chatWithHufAI } from "./ai-routing";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HufiBusinessContext {
  monthRevenue: number;
  monthInvoices: number;
  paidRate: number;
  avgInvoiceValue: number;
  topHorses: Array<{ name: string; visits: number }>;
  newClientsThisMonth: number;
  churnRisk: Array<{ clientName: string; daysSinceLastVisit: number }>;
  pendingOffers: number;
}

// ── fetchBusinessContext ──────────────────────────────────────────────────────

export async function fetchBusinessContext(userId: string): Promise<HufiBusinessContext> {
  const from = (t: string) =>
    (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

  const startOfMonth = format(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    "yyyy-MM-dd",
  );
  const sixtyDaysAgo = format(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  const [invoicesRes, completedApptsRes, newClientsRes, pendingOffersRes, churnRes] =
    await Promise.allSettled([
      supabase
        .from("invoices")
        .select("total_amount, payment_status")
        .eq("provider_id", userId)
        .gte("created_at", startOfMonth),
      supabase
        .from("appointments")
        .select("horse_id, horses(name)")
        .eq("provider_id", userId)
        .eq("status", "completed")
        .gte("date", startOfMonth),
      supabase
        .from("appointments")
        .select("client_id", { count: "exact", head: true })
        .eq("provider_id", userId)
        .gte("date", startOfMonth),
      from("hufi_offers")
        .select("*", { count: "exact", head: true })
        .eq("provider_id", userId)
        .eq("status", "pending"),
      supabase
        .from("appointments")
        .select("client_id, date, client:profiles!client_id(full_name)")
        .eq("provider_id", userId)
        .eq("status", "completed")
        .lt("date", sixtyDaysAgo)
        .order("date", { ascending: false })
        .limit(20),
    ]);

  type Invoice = { total_amount: number | null; payment_status: string };
  const invoices =
    invoicesRes.status === "fulfilled"
      ? ((invoicesRes.value as { data: Invoice[] | null }).data ?? [])
      : [];
  const completedAppts =
    completedApptsRes.status === "fulfilled"
      ? ((completedApptsRes.value as { data: unknown[] | null }).data ?? [])
      : [];
  const newClients =
    newClientsRes.status === "fulfilled"
      ? ((newClientsRes.value as { count: number | null }).count ?? 0)
      : 0;
  const pendingOffers =
    pendingOffersRes.status === "fulfilled"
      ? ((pendingOffersRes.value as { count: number | null }).count ?? 0)
      : 0;
  const churnData =
    churnRes.status === "fulfilled"
      ? ((churnRes.value as { data: unknown[] | null }).data ?? [])
      : [];

  const monthRevenue = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const paid = invoices.filter((i) => i.payment_status === "paid");
  const paidRate = invoices.length > 0 ? paid.length / invoices.length : 0;
  const avgInvoiceValue = invoices.length > 0 ? monthRevenue / invoices.length : 0;

  // Top horses by visit count
  const horseCounts: Record<string, { name: string; visits: number }> = {};
  for (const a of completedAppts as Array<{ horse_id: string; horses: unknown }>) {
    const name =
      Array.isArray(a.horses)
        ? (a.horses[0] as { name?: string })?.name ?? a.horse_id
        : (a.horses as { name?: string } | null)?.name ?? a.horse_id;
    if (!horseCounts[a.horse_id]) horseCounts[a.horse_id] = { name, visits: 0 };
    horseCounts[a.horse_id].visits++;
  }
  const topHorses = Object.values(horseCounts)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  // Churn risk: clients not seen in 60+ days
  const seenClients = new Set<string>();
  const churnRisk: Array<{ clientName: string; daysSinceLastVisit: number }> = [];
  for (const a of churnData as Array<{ client_id: string; date: string; client: unknown }>) {
    if (seenClients.has(a.client_id) || churnRisk.length >= 5) continue;
    seenClients.add(a.client_id);
    const clientName = (a.client as { full_name?: string } | null)?.full_name ?? "Unbekannt";
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(a.date).getTime()) / (24 * 60 * 60 * 1000),
    );
    churnRisk.push({ clientName, daysSinceLastVisit });
  }

  return {
    monthRevenue,
    monthInvoices: invoices.length,
    paidRate,
    avgInvoiceValue,
    topHorses,
    newClientsThisMonth: newClients,
    churnRisk,
    pendingOffers,
  };
}

// ── generateClientOffer ───────────────────────────────────────────────────────

export async function generateClientOffer(
  providerId: string,
  clientId: string,
  horseName: string,
  serviceType: string,
  priceEstimate: number,
): Promise<{ offerId: string; message: string } | null> {
  try {
    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

    const { data: offer, error } = (await from("hufi_offers")
      .insert({
        provider_id: providerId,
        client_id: clientId,
        horse_name: horseName,
        service_type: serviceType,
        price_estimate: priceEstimate,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()) as { data: { id: string } | null; error: unknown };

    if (error || !offer) return null;

    const prompt = `Erstelle eine freundliche Angebotsnotiz (max 60 Wörter) auf Deutsch für:
Pferd: ${horseName}, Leistung: ${serviceType}, Preis: ca. ${priceEstimate}€.
Kein "Sehr geehrte", kein Briefformat — direkt und professionell.`;

    const message = await chatWithHufAI(
      [{ role: "user", content: prompt }],
      providerId,
      "hufiai-fast",
    );

    await from("hufi_offers")
      .update({ message: message.slice(0, 500) })
      .eq("id", offer.id);

    return { offerId: offer.id, message };
  } catch {
    return null;
  }
}

// ── formatBusinessGreeting ────────────────────────────────────────────────────

export function formatBusinessGreeting(ctx: HufiBusinessContext): string {
  const parts: string[] = [];

  if (ctx.monthRevenue > 0) {
    parts.push(
      `💰 Dieser Monat: ${ctx.monthRevenue.toFixed(0)} € Umsatz (${Math.round(ctx.paidRate * 100)}% bezahlt)`,
    );
  }
  if (ctx.churnRisk.length > 0) {
    const names = ctx.churnRisk
      .slice(0, 2)
      .map((c) => c.clientName)
      .join(", ");
    parts.push(`⚠️ Kunden ohne Besuch >60 Tage: ${names}`);
  }
  if (ctx.pendingOffers > 0) {
    parts.push(`📋 ${ctx.pendingOffers} offene ${ctx.pendingOffers === 1 ? "Angebot" : "Angebote"}`);
  }

  return parts.join("\n");
}
