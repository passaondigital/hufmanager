import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BizInventoryItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  currentStock: number;
  minStock: number | null;
  priceSell: number | null;
  taxRate: number | null;
}

export interface BizService {
  id: string;
  title: string;
  basePrice: number | null;
  billingType: string | null;
  category: string | null;
}

export interface BusinessContext {
  businessName: string | null;
  professionType: string | null;
  kleinunternehmer: boolean;
  mwstPflichtig: boolean;
  defaultVatRate: number;
  currency: string;
  country: string;
  inventory: BizInventoryItem[];
  services: BizService[];
  priceGroups: string[];
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchBusinessContext(userId: string): Promise<BusinessContext> {
  const [settingsRes, inventoryRes, offersRes, pgRes] = await Promise.allSettled([
    supabase
      .from("business_settings")
      .select("business_name, kleine_unternehmer, mwst_pflichtig, default_vat_rate, currency, tax_country, profession_type")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("inventory_items")
      .select("id, product_name, brand, category, current_stock, min_stock, price_sell, tax_rate")
      .eq("user_id", userId)
      .order("current_stock", { ascending: false })
      .limit(40),
    supabase
      .from("offers")
      .select("id, title, price, billing_type, offer_type")
      .eq("provider_id", userId)
      .eq("is_active" as never, true)
      .limit(20),
    supabase
      .from("price_groups")
      .select("name")
      .eq("provider_id", userId)
      .limit(8),
  ]);

  const settings = settingsRes.status === "fulfilled" ? settingsRes.value.data : null;
  const rawInv    = inventoryRes.status === "fulfilled" ? (inventoryRes.value.data ?? []) : [];
  const rawOffers = offersRes.status === "fulfilled"   ? (offersRes.value.data ?? [])    : [];
  const rawPg     = pgRes.status === "fulfilled"       ? (pgRes.value.data ?? [])        : [];

  return {
    businessName:    settings?.business_name ?? null,
    professionType:  settings?.profession_type ?? null,
    kleinunternehmer: settings?.kleine_unternehmer ?? false,
    mwstPflichtig:   settings?.mwst_pflichtig ?? true,
    defaultVatRate:  settings?.default_vat_rate ?? 19,
    currency:        settings?.currency ?? "EUR",
    country:         settings?.tax_country ?? "DE",
    inventory: rawInv.map((i) => ({
      id:           i.id,
      name:         i.product_name,
      brand:        i.brand,
      category:     i.category,
      currentStock: i.current_stock,
      minStock:     i.min_stock,
      priceSell:    i.price_sell,
      taxRate:      i.tax_rate,
    })),
    services: rawOffers.map((o) => ({
      id:          o.id,
      title:       o.title,
      basePrice:   (o as Record<string, unknown>).price as number | null,
      billingType: o.billing_type,
      category:    null,
    })),
    priceGroups: rawPg.map((pg) => (pg as Record<string, unknown>).name as string),
  };
}

// ── Claude Context Prompt: für Rechnungs-Tool-Calling ────────────────────────

export function buildInvoiceCatalogPrompt(ctx: BusinessContext): string {
  const sym = ctx.country === "CH" ? "CHF" : "€";
  let out = "";

  if (ctx.inventory.length > 0) {
    out += "LAGER-KATALOG (für Rechnungspositionen):\n";
    for (const item of ctx.inventory) {
      const lowStock = item.minStock !== null && item.currentStock <= item.minStock;
      const priceStr = item.priceSell != null ? ` | ${item.priceSell.toFixed(2)} ${sym}` : "";
      const stockStr = ` | Bestand: ${item.currentStock}${lowStock ? " ⚠️NIEDRIG" : ""}`;
      const brand = item.brand ? ` (${item.brand})` : "";
      out += `  • ${item.name}${brand}${priceStr}${stockStr} [ID:${item.id}]\n`;
    }
  }

  if (ctx.services.length > 0) {
    out += "\nLEISTUNGEN-KATALOG:\n";
    for (const svc of ctx.services) {
      const priceStr = svc.basePrice != null ? ` | ${svc.basePrice.toFixed(2)} ${sym}` : "";
      out += `  • ${svc.title}${priceStr} [ID:${svc.id}]\n`;
    }
  }

  const vatInfo = ctx.kleinunternehmer
    ? "Kleinunternehmer (keine MwSt)"
    : ctx.mwstPflichtig
    ? `MwSt-pflichtig ${ctx.defaultVatRate}%`
    : "keine MwSt";

  out += `\nSteuer: ${vatInfo} | Währung: ${sym}\n`;
  out += "WICHTIG: Verwende inventory_item_id aus dem Lager-Katalog wo passend. Warnung bei NIEDRIGEM Bestand im Bestätigungs-Text erwähnen.\n";

  return out;
}

// ── 5A-System-Prompt: Berufs- und Workflow-Kontext für Hufi ──────────────────

const PROFESSION_5A: Record<string, { label: string; services: string; materials: string; workflow: string }> = {
  hoof_care: {
    label: "Hufbearbeiter / Hufpfleger",
    services: "Barhufe/Natürliche Hufpflege, Beschlag (Eisen), Klebebeschlag (Composite), Hufschutz, Trachtenkeil, Spezialbeschlag",
    materials: "Klemmplatten (E4/E6/E8), UV-Kleber, Glasfaser-Patches, Hufeisen (Stahl/Alu), Nägel, Laschen, Hufschuhe, Hufversiegelung, Hufkratzer, Hufmesser, Winkelschleifer-Scheiben, Hufbalsam",
    workflow: "1.AUFNAHME: Pferd/Kunde anlegen, Erstbefund · 2.ANGEBOT: Leistungspaket wählen (Natur/Beschlag/Klebe) · 3.AUFTRAG: Terminplanung, Tour-Route · 4.ABRECHNUNG: Rechnung aus Termin+Materialien · 5.ANALYSE: Huf-Entwicklung, Wirtschaftlichkeit",
  },
  farrier: {
    label: "Hufschmied / Beschlagschmied",
    services: "Handgeschmiedeter Beschlag, Ortho-Beschlag, Sporadic-Beschlag, Eisen zurichten, Nageln",
    materials: "Roheisen, Schmiedekohle, Borax, Hufeisen-Rohlinge, Nägel (E-Nägel), Stollen, Herzstollen, Klebebeschlag",
    workflow: "1.AUFNAHME: Pferd, Klauenformular · 2.ANGEBOT: Standard/Ortho/Sport · 3.AUFTRAG: Schmiedebesuch · 4.ABRECHNUNG: Eisen+Arbeit · 5.ANALYSE: Beschlags-Intervalle",
  },
  osteopath: {
    label: "Osteopath / Tierheilpraktiker",
    services: "Osteopathische Behandlung, Cranio-Sacrale Therapie, Faszienmobilisation, Wirbelsäulenbehandlung",
    materials: "Therapieöl, Handtücher, Dokumentationsformulare",
    workflow: "1.AUFNAHME: Anamnese · 2.ANGEBOT: Therapieplan · 3.AUFTRAG: Behandlungstermin · 4.ABRECHNUNG: Behandlung · 5.ANALYSE: Therapieerfolg",
  },
  physiotherapist: {
    label: "Physiotherapeut",
    services: "Physiotherapie, Magnetfeldtherapie, Laser, Massage, Kinesiotaping",
    materials: "Tape, Elektroden, Lasergerät, Massageöl",
    workflow: "1.AUFNAHME: Befundaufnahme · 2.ANGEBOT: Therapieplan · 3.AUFTRAG: Behandlung · 4.ABRECHNUNG: Therapieleistung · 5.ANALYSE: Fortschritt",
  },
  saddler: {
    label: "Sattler",
    services: "Sattelanpassung, Sattelreparatur, Neupolsterung, Lederarbeit, Gurte",
    materials: "Leder, Wolle, Schaumstoff, Nähgarn, Schnallen, Klett, Lederöl",
    workflow: "1.AUFNAHME: Rücken-Scan · 2.ANGEBOT: Anpassungs-/Neuanfertigungsangebot · 3.AUFTRAG: Werkstatt/Hausbesuch · 4.ABRECHNUNG: Material+Arbeit · 5.ANALYSE: Auftragsverlauf",
  },
  vet_mobile: {
    label: "Mobiler Tierarzt",
    services: "Impfung, Blutentnahme, Sedierung, Wundversorgung, Zahnbehandlung (Equine), Ultraschall",
    materials: "Impfstoffe, Spritzen, Kanülen, Sedativa, Antibiotika, Verbandsmaterial, Handschuhe",
    workflow: "1.AUFNAHME: Patientenakte · 2.ANGEBOT: Behandlungsplan · 3.AUFTRAG: Hausbesuch · 4.ABRECHNUNG: Behandlung+Medikamente · 5.ANALYSE: Bestandsführung, GOT-Abrechnung",
  },
  dentist: {
    label: "Equine Dentist / Pferdezahnarzt",
    services: "Zahnkontrolle, Raspen, Hakenzähne, Wolfszähne, Sedierung",
    materials: "Raspeln, Mundspülungen, Sedativa",
    workflow: "1.AUFNAHME: Gebiss-Foto · 2.ANGEBOT: Jahresplan · 3.AUFTRAG: Behandlungstermin · 4.ABRECHNUNG: Leistung+Sedierung · 5.ANALYSE: Zahnentwicklung",
  },
  riding_instructor: {
    label: "Reitlehrer / Trainer",
    services: "Einzel-Reitstunde, Gruppenunterricht, Turniervorbereitung, Longier-Stunde",
    materials: "Longe, Kappzaum, Seitenzügel",
    workflow: "1.AUFNAHME: Reit-Niveau · 2.ANGEBOT: Kurspakete · 3.AUFTRAG: Stundenplan · 4.ABRECHNUNG: Stunden/Pakete · 5.ANALYSE: Schüler-Fortschritt",
  },
};

export function build5AContextAddition(ctx: BusinessContext): string {
  const profType = ctx.professionType ?? "hoof_care";
  const prof = PROFESSION_5A[profType] ?? PROFESSION_5A["hoof_care"];
  const sym = ctx.country === "CH" ? "CHF" : "€";
  const vatInfo = ctx.kleinunternehmer
    ? "Kleinunternehmer (keine MwSt auf Rechnungen)"
    : `${ctx.defaultVatRate}% MwSt`;

  let out = `\n\n=== BERUFSPROFIL & 5A-WORKFLOW ===\n`;
  out += `Beruf: ${prof.label}\n`;
  out += `Workflow: ${prof.workflow}\n`;
  out += `Typische Leistungen: ${prof.services}\n`;
  out += `Typische Materialien: ${prof.materials}\n`;
  out += `Steuer: ${vatInfo} | Währung: ${sym}\n`;

  if (ctx.inventory.length > 0) {
    const lowItems = ctx.inventory.filter(
      (i) => i.minStock !== null && i.currentStock <= i.minStock,
    );
    if (lowItems.length > 0) {
      out += `⚠️ Niedrige Lagerbestände: ${lowItems.map((i) => `${i.name} (${i.currentStock} Stk.)`).join(", ")}\n`;
    }
    out += `Lager: ${ctx.inventory.length} Artikel | Gesamtartikel: ${ctx.inventory.map((i) => i.name).slice(0, 8).join(", ")}${ctx.inventory.length > 8 ? "..." : ""}\n`;
  }

  out += `=== ENDE BERUFSPROFIL ===\n`;
  return out;
}

// ── Bestätigungskarte formatieren (pre-line Text) ─────────────────────────────

export interface LineItem {
  title: string;
  quantity: number;
  unit_price: number;
  inventory_item_id?: string | null;
}

export function formatInvoiceConfirmation(
  params: {
    horseName?: string;
    clientName?: string;
    lineItems: LineItem[];
    kleinunternehmer: boolean;
    mwstPflichtig: boolean;
    vatRate: number;
    currency: string;
    inventory: BizInventoryItem[];
  },
): string {
  const { horseName, clientName, lineItems, kleinunternehmer, mwstPflichtig, vatRate, currency, inventory } = params;
  const sym = currency === "CHF" ? "CHF" : "€";
  const taxLabel = currency === "CHF" ? "MWST" : (params.currency === "AT" ? "USt" : "MwSt");

  const header = horseName && clientName
    ? `für ${horseName} (${clientName})`
    : horseName
    ? `für ${horseName}`
    : clientName
    ? `für ${clientName}`
    : "";

  let text = `🧾 Rechnung${header ? " " + header : ""}\n\n`;

  const netto = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const maxLen = Math.max(...lineItems.map((i) => i.title.length), 10);

  for (const item of lineItems) {
    const total = (item.quantity * item.unit_price).toFixed(2);
    const unitStr = item.unit_price.toFixed(2);
    text += `  ${String(item.quantity).padStart(2)}×  ${item.title.padEnd(maxLen + 1)} ${unitStr.padStart(7)} ${sym}  →  ${total.padStart(8)} ${sym}\n`;
  }

  text += `${"─".repeat(Math.min(55, maxLen + 30))}\n`;

  if (!kleinunternehmer && mwstPflichtig && vatRate > 0) {
    const vat = netto * (vatRate / 100);
    const brutto = netto + vat;
    text += `  Netto:             ${netto.toFixed(2).padStart(10)} ${sym}\n`;
    text += `  ${taxLabel} ${vatRate}%:      ${vat.toFixed(2).padStart(10)} ${sym}\n`;
    text += `  Brutto:            ${brutto.toFixed(2).padStart(10)} ${sym}\n`;
  } else if (kleinunternehmer) {
    text += `  Gesamt:            ${netto.toFixed(2).padStart(10)} ${sym}\n`;
    text += `  (Kleinunternehmer – keine MwSt)\n`;
  } else {
    text += `  Gesamt:            ${netto.toFixed(2).padStart(10)} ${sym}\n`;
  }

  // Lagerwarnungen
  const warnings: string[] = [];
  for (const item of lineItems) {
    if (!item.inventory_item_id) continue;
    const inv = inventory.find((i) => i.id === item.inventory_item_id);
    if (!inv) continue;
    const after = inv.currentStock - item.quantity;
    if (after < 0) {
      warnings.push(`⛔ ${inv.name}: Bestand reicht nicht aus (${inv.currentStock} Stk., benötigt: ${item.quantity})`);
    } else if (inv.minStock !== null && after <= inv.minStock) {
      warnings.push(`⚠️  ${inv.name}: Nach Abzug nur noch ${after} Stk. (Mindestbestand: ${inv.minStock})`);
    }
  }
  if (warnings.length > 0) {
    text += "\n" + warnings.join("\n") + "\n";
  }

  return text;
}
