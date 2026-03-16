/**
 * Zentrale Steuer- und Rechtsform-Konfiguration für DACH
 * Wird überall verwendet wo Preise angezeigt oder berechnet werden.
 */

// ── Rechtsformen ─────────────────────────────────────────────────────

export interface LegalFormDef {
  value: string;
  label: string;
  country: "DE" | "AT" | "CH" | "ALL";
  requiresHandelsregister: boolean;
  requiresKammer: boolean;
  defaultKleinunternehmer: boolean;
  description: string;
}

export const LEGAL_FORMS: LegalFormDef[] = [
  // Deutschland
  { value: "einzelunternehmen", label: "Einzelunternehmen", country: "DE", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: true, description: "Einfachste Form – du allein" },
  { value: "freiberufler", label: "Freiberufler", country: "DE", requiresHandelsregister: false, requiresKammer: true, description: "Katalogberufe (Tierarzt, Therapeut, etc.)", defaultKleinunternehmer: true },
  { value: "kleinunternehmer", label: "Kleinunternehmer (§19 UStG)", country: "DE", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: true, description: "Umsatz < 25.000€/Jahr – keine MwSt" },
  { value: "gbr", label: "GbR (Gesellschaft bürgerlichen Rechts)", country: "DE", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: false, description: "2+ Personen, einfache Partnerschaft" },
  { value: "ohg", label: "OHG (Offene Handelsgesellschaft)", country: "DE", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Handelsgesellschaft mit voller Haftung" },
  { value: "kg", label: "KG (Kommanditgesellschaft)", country: "DE", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Teil- und Vollhafter gemischt" },
  { value: "ug", label: "UG (haftungsbeschränkt)", country: "DE", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Mini-GmbH ab 1€ Stammkapital" },
  { value: "gmbh", label: "GmbH", country: "DE", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Kapitalgesellschaft, 25.000€ Stammkapital" },
  { value: "gmbh_co_kg", label: "GmbH & Co. KG", country: "DE", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Mischform aus GmbH und KG" },
  { value: "ag", label: "AG (Aktiengesellschaft)", country: "DE", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Große Kapitalgesellschaft" },
  { value: "eg", label: "eG (eingetragene Genossenschaft)", country: "DE", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Genossenschaft mit Selbstverwaltung" },
  { value: "partg", label: "PartG (Partnerschaftsgesellschaft)", country: "DE", requiresHandelsregister: false, requiresKammer: true, defaultKleinunternehmer: false, description: "Für Freiberufler-Zusammenschlüsse" },
  { value: "partg_mbb", label: "PartG mbB", country: "DE", requiresHandelsregister: false, requiresKammer: true, defaultKleinunternehmer: false, description: "PartG mit beschränkter Berufshaftung" },
  { value: "ev", label: "e.V. (eingetragener Verein)", country: "DE", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: false, description: "Gemeinnütziger oder wirtschaftlicher Verein" },

  // Österreich
  { value: "epu_at", label: "EPU (Ein-Personen-Unternehmen)", country: "AT", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: true, description: "Einzelunternehmer in Österreich" },
  { value: "og_at", label: "OG (Offene Gesellschaft)", country: "AT", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Österreichische OHG" },
  { value: "kg_at", label: "KG (Kommanditgesellschaft)", country: "AT", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Haftung geteilt" },
  { value: "gmbh_at", label: "GmbH (Österreich)", country: "AT", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "35.000€ Stammkapital" },
  { value: "ag_at", label: "AG (Österreich)", country: "AT", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Aktiengesellschaft AT" },
  { value: "geg_at", label: "GesbR", country: "AT", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: false, description: "Gesellschaft bürgerlichen Rechts AT" },
  { value: "verein_at", label: "Verein (Österreich)", country: "AT", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: false, description: "ZVR-registriert" },

  // Schweiz
  { value: "einzelfirma_ch", label: "Einzelfirma", country: "CH", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: true, description: "Einfachste Form in der Schweiz" },
  { value: "kollektiv_ch", label: "Kollektivgesellschaft", country: "CH", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Personengesellschaft CH" },
  { value: "kommandit_ch", label: "Kommanditgesellschaft", country: "CH", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Teilhafter CH" },
  { value: "gmbh_ch", label: "GmbH (Schweiz)", country: "CH", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "CHF 20.000 Stammkapital" },
  { value: "ag_ch", label: "AG (Schweiz)", country: "CH", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "CHF 100.000 Aktienkapital" },
  { value: "verein_ch", label: "Verein (Schweiz)", country: "CH", requiresHandelsregister: false, requiresKammer: false, defaultKleinunternehmer: false, description: "Art. 60 ZGB" },
  { value: "genossenschaft_ch", label: "Genossenschaft (Schweiz)", country: "CH", requiresHandelsregister: true, requiresKammer: false, defaultKleinunternehmer: false, description: "Selbsthilfe-Organisation" },
];

export function getLegalFormsForCountry(country: string): LegalFormDef[] {
  return LEGAL_FORMS.filter(f => f.country === country || f.country === "ALL");
}

export function getLegalFormDef(value: string): LegalFormDef | undefined {
  return LEGAL_FORMS.find(f => f.value === value);
}

// ── MwSt-Sätze ──────────────────────────────────────────────────────

export const VAT_RATES: Record<string, { standard: number; reduced: number; label: string }> = {
  DE: { standard: 19, reduced: 7, label: "MwSt" },
  AT: { standard: 20, reduced: 10, label: "USt" },
  CH: { standard: 8.1, reduced: 2.6, label: "MWST" },
};

// ── Preis-Display-Modus ─────────────────────────────────────────────

export type PriceDisplayMode = "netto" | "brutto";

export interface TaxConfig {
  kleinunternehmer: boolean;
  mwstPflichtig: boolean;
  vatRate: number;
  priceDisplayMode: PriceDisplayMode;
  country: string;
  legalForm: string | null;
}

/**
 * Berechnet den Anzeige-Preis basierend auf Steuer-Konfiguration.
 * 
 * - Wenn priceDisplayMode = 'netto' → gespeicherter Preis ist netto
 *   → Brutto-Anzeige: preis × (1 + vatRate/100)
 * - Wenn priceDisplayMode = 'brutto' → gespeicherter Preis ist brutto
 *   → Netto-Anzeige: preis / (1 + vatRate/100)
 * - Kleinunternehmer: Netto = Brutto (keine MwSt)
 */
export function calculateDisplayPrice(
  storedPrice: number,
  config: TaxConfig,
  targetDisplay: "netto" | "brutto"
): number {
  // Kleinunternehmer: keine MwSt, Netto = Brutto
  if (config.kleinunternehmer || !config.mwstPflichtig) {
    return storedPrice;
  }

  const factor = 1 + config.vatRate / 100;

  if (config.priceDisplayMode === "netto") {
    // Stored = Netto
    if (targetDisplay === "brutto") return storedPrice * factor;
    return storedPrice; // netto → netto
  } else {
    // Stored = Brutto
    if (targetDisplay === "netto") return storedPrice / factor;
    return storedPrice; // brutto → brutto
  }
}

/**
 * Gibt den MwSt-Betrag für einen Preis zurück.
 */
export function calculateVatAmount(storedPrice: number, config: TaxConfig): number {
  if (config.kleinunternehmer || !config.mwstPflichtig) return 0;

  const factor = 1 + config.vatRate / 100;

  if (config.priceDisplayMode === "netto") {
    return storedPrice * (config.vatRate / 100);
  } else {
    // Brutto → MwSt rausrechnen
    return storedPrice - storedPrice / factor;
  }
}

/**
 * Formatiert einen Preis mit dem richtigen Suffix.
 */
export function formatPriceLabel(
  price: number,
  config: TaxConfig,
  options?: { showSuffix?: boolean }
): string {
  const showSuffix = options?.showSuffix ?? true;
  const formatted = price.toFixed(2).replace(".", ",");
  const currency = config.country === "CH" ? "CHF" : "€";

  if (!showSuffix || config.kleinunternehmer || !config.mwstPflichtig) {
    return `${formatted} ${currency}`;
  }

  const vatLabel = VAT_RATES[config.country]?.label || "MwSt";

  if (config.priceDisplayMode === "netto") {
    return `${formatted} ${currency} zzgl. ${vatLabel}`;
  } else {
    return `${formatted} ${currency} inkl. ${vatLabel}`;
  }
}

/**
 * Gibt den Kleinunternehmer-Hinweis für Rechnungen zurück.
 */
export function getKleinunternehmerNote(country: string): string {
  switch (country) {
    case "DE":
      return "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";
    case "AT":
      return "Umsatzsteuerbefreit – Kleinunternehmerregelung gemäß § 6 Abs. 1 Z 27 UStG.";
    case "CH":
      return "Von der MWST befreit (Jahresumsatz unter CHF 100'000).";
    default:
      return "Umsatzsteuerbefreit – Kleinunternehmerregelung.";
  }
}
