/**
 * DACH Region Utilities — Central formatting & validation for DE/AT/CH
 * All monetary amounts are stored as numbers (not cents) in the DB,
 * but displayed via these locale-aware functions.
 */

export type DachCountry = "DE" | "AT" | "CH";

// ─── Currency ────────────────────────────────────────────────────

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  decimalSeparator: string;
  thousandSeparator: string;
}

const currencyConfigs: Record<DachCountry, CurrencyConfig> = {
  DE: { code: "EUR", symbol: "€", locale: "de-DE", decimalSeparator: ",", thousandSeparator: "." },
  AT: { code: "EUR", symbol: "€", locale: "de-AT", decimalSeparator: ",", thousandSeparator: "." },
  CH: { code: "CHF", symbol: "Fr.", locale: "de-CH", decimalSeparator: ".", thousandSeparator: "'" },
};

export function getCurrencyConfig(country: DachCountry = "DE"): CurrencyConfig {
  return currencyConfigs[country] || currencyConfigs.DE;
}

/** Swiss rounding to nearest 0.05 (Rappen-Rundung) */
export function roundToRappen(amount: number): number {
  return Math.round(amount * 20) / 20;
}

/** Format a monetary amount for display */
export function formatCurrency(amount: number, country: DachCountry = "DE"): string {
  const config = getCurrencyConfig(country);
  const rounded = country === "CH" ? roundToRappen(amount) : amount;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rounded);
  } catch {
    // Fallback
    const formatted = rounded.toFixed(2);
    return country === "CH" ? `Fr. ${formatted}` : `${formatted} €`;
  }
}

/** Get the currency symbol for a country */
export function getCurrencySymbol(country: DachCountry = "DE"): string {
  return getCurrencyConfig(country).symbol;
}

/** Get the currency code for a country */
export function getCurrencyCode(country: DachCountry = "DE"): string {
  return getCurrencyConfig(country).code;
}

// ─── Date & Time ─────────────────────────────────────────────────

/** Format date for display: DD.MM.YYYY */
export function formatDate(isoDate: string | Date, country: DachCountry = "DE"): string {
  const d = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  if (isNaN(d.getTime())) return "";

  const config = getCurrencyConfig(country);
  try {
    return new Intl.DateTimeFormat(config.locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${d.getFullYear()}`;
  }
}

/** Format time for display: HH:MM */
export function formatTime(isoDate: string | Date, country: DachCountry = "DE"): string {
  const d = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  if (isNaN(d.getTime())) return "";

  const config = getCurrencyConfig(country);
  try {
    return new Intl.DateTimeFormat(config.locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}

/** Austrian month names override */
const AT_MONTHS: Record<number, string> = { 0: "Jänner" };

export function formatMonthName(monthIndex: number, country: DachCountry = "DE"): string {
  if (country === "AT" && AT_MONTHS[monthIndex]) {
    return AT_MONTHS[monthIndex];
  }
  const d = new Date(2024, monthIndex, 1);
  return new Intl.DateTimeFormat(getCurrencyConfig(country).locale, { month: "long" }).format(d);
}

// ─── Tax / VAT ───────────────────────────────────────────────────

export interface VatConfig {
  standard: number;
  reduced: number;
  special?: number; // AT: 13%, CH: 3.8% (Beherbergung)
  label: string; // "MwSt" | "MWST" | "USt"
  smallBusinessLabel: string;
  smallBusinessThreshold: number; // Annual revenue threshold
  smallBusinessLegalRef: string;
}

const vatConfigs: Record<DachCountry, VatConfig> = {
  DE: {
    standard: 19,
    reduced: 7,
    label: "MwSt",
    smallBusinessLabel: "Kleinunternehmer (§19 UStG)",
    smallBusinessThreshold: 25000,
    smallBusinessLegalRef: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet.",
  },
  AT: {
    standard: 20,
    reduced: 10,
    special: 13,
    label: "USt",
    smallBusinessLabel: "Kleinunternehmer (§6 Abs. 1 Z 27 UStG)",
    smallBusinessThreshold: 35000,
    smallBusinessLegalRef: "Umsatzsteuerbefreit — Kleinunternehmerregelung gemäß §6 Abs. 1 Z 27 UStG.",
  },
  CH: {
    standard: 8.1,
    reduced: 2.6,
    special: 3.8,
    label: "MWST",
    smallBusinessLabel: "Nicht MWST-pflichtig",
    smallBusinessThreshold: 100000,
    smallBusinessLegalRef: "Nicht MWST-pflichtig (Jahresumsatz unter CHF 100'000).",
  },
};

export function getVatConfig(country: DachCountry = "DE"): VatConfig {
  return vatConfigs[country] || vatConfigs.DE;
}

export function getVatLabel(country: DachCountry = "DE"): string {
  return getVatConfig(country).label;
}

export interface VatCalculation {
  net: number;
  vatAmount: number;
  gross: number;
  vatRate: number;
  vatLabel: string;
}

/** Calculate VAT from a gross or net amount */
export function calculateVat(
  amount: number,
  vatRate: number,
  country: DachCountry = "DE",
  fromGross = true
): VatCalculation {
  const config = getVatConfig(country);
  let net: number, vatAmount: number, gross: number;

  if (fromGross) {
    gross = country === "CH" ? roundToRappen(amount) : amount;
    net = gross / (1 + vatRate / 100);
    vatAmount = gross - net;
  } else {
    net = amount;
    vatAmount = net * (vatRate / 100);
    gross = net + vatAmount;
    if (country === "CH") {
      gross = roundToRappen(gross);
      vatAmount = gross - net;
    }
  }

  return {
    net: Math.round(net * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    gross: Math.round(gross * 100) / 100,
    vatRate,
    vatLabel: config.label,
  };
}

// ─── VAT Number Validation ──────────────────────────────────────

const vatPatterns: Record<DachCountry, RegExp> = {
  DE: /^DE\d{9}$/,
  AT: /^ATU\d{8}$/,
  CH: /^CHE-?\d{3}\.?\d{3}\.?\d{3}\s?MWST$/i,
};

export function validateVatNumber(number: string, country: DachCountry): boolean {
  if (!number) return false;
  const cleaned = number.trim().replace(/\s+/g, " ");
  return vatPatterns[country]?.test(cleaned) ?? false;
}

export function getVatNumberPlaceholder(country: DachCountry): string {
  switch (country) {
    case "DE": return "DE123456789";
    case "AT": return "ATU12345678";
    case "CH": return "CHE-123.456.789 MWST";
    default: return "";
  }
}

// ─── Phone Validation ───────────────────────────────────────────

const phoneConfigs: Record<DachCountry, { prefix: string; placeholder: string }> = {
  DE: { prefix: "+49", placeholder: "+49 170 1234567" },
  AT: { prefix: "+43", placeholder: "+43 664 1234567" },
  CH: { prefix: "+41", placeholder: "+41 79 123 45 67" },
};

export function getPhoneConfig(country: DachCountry) {
  return phoneConfigs[country] || phoneConfigs.DE;
}

export function formatPhone(phone: string, country: DachCountry = "DE"): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  // Basic formatting - just ensure prefix
  const config = getPhoneConfig(country);
  if (cleaned.startsWith("0")) {
    return config.prefix + cleaned.slice(1);
  }
  return cleaned.startsWith("+") ? cleaned : config.prefix + cleaned;
}

// ─── Postal Code ────────────────────────────────────────────────

const plzLength: Record<DachCountry, number> = { DE: 5, AT: 4, CH: 4 };

export function validatePostalCode(plz: string, country: DachCountry): boolean {
  if (!plz) return false;
  const cleaned = plz.trim();
  const expectedLength = plzLength[country] || 5;
  return new RegExp(`^\\d{${expectedLength}}$`).test(cleaned);
}

export function getPostalCodePlaceholder(country: DachCountry): string {
  switch (country) {
    case "DE": return "10115";
    case "AT": return "1010";
    case "CH": return "8001";
    default: return "";
  }
}

// ─── Country Helpers ────────────────────────────────────────────

export const DACH_COUNTRIES = [
  { code: "DE" as const, name: "Deutschland", flag: "🇩🇪" },
  { code: "AT" as const, name: "Österreich", flag: "🇦🇹" },
  { code: "CH" as const, name: "Schweiz", flag: "🇨🇭" },
] as const;

export function getCountryName(code: DachCountry): string {
  return DACH_COUNTRIES.find((c) => c.code === code)?.name || code;
}

export function getCountryFlag(code: DachCountry): string {
  return DACH_COUNTRIES.find((c) => c.code === code)?.flag || "🌍";
}

/** Derive default settings from country */
export function getCountryDefaults(country: DachCountry) {
  return {
    currency: country === "CH" ? "CHF" : "EUR",
    vatRate: getVatConfig(country).standard,
    smallBusiness: true,
    locale: getCurrencyConfig(country).locale,
  };
}
