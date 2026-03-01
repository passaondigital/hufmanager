/**
 * DACH Region (Germany, Austria, Switzerland) Tax & Currency Configuration
 * 
 * This file maintains backward compatibility while delegating to the 
 * comprehensive dach.ts module.
 */

import {
  type DachCountry,
  DACH_COUNTRIES,
  getCurrencyConfig,
  getCurrencyCode,
  getCurrencySymbol,
  getVatConfig,
  formatCurrency,
  roundToRappen,
  calculateVat,
} from "./dach";

// Re-export types with original names for backward compatibility
export type TaxCountry = DachCountry;
export type Currency = "EUR" | "CHF";

export interface DACHConfig {
  country: TaxCountry;
  currency: Currency;
  currencySymbol: string;
  defaultVatRate: number;
  vatLabel: string;
  vatExemptLabel: string;
}

// Country-specific configurations (enriched from dach.ts)
export const DACH_CONFIGS: Record<TaxCountry, DACHConfig> = {
  DE: {
    country: "DE",
    currency: "EUR",
    currencySymbol: "€",
    defaultVatRate: 19,
    vatLabel: "MwSt.",
    vatExemptLabel: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet.",
  },
  AT: {
    country: "AT",
    currency: "EUR",
    currencySymbol: "€",
    defaultVatRate: 20,
    vatLabel: "USt.",
    vatExemptLabel: "Umsatzsteuerbefreit gemäß Kleinunternehmerregelung.",
  },
  CH: {
    country: "CH",
    currency: "CHF",
    currencySymbol: "Fr.",
    defaultVatRate: 8.1,
    vatLabel: "MWST",
    vatExemptLabel: "Nicht MWST-pflichtig (Jahresumsatz unter CHF 100'000).",
  },
};

export const COUNTRY_OPTIONS = [
  { value: "DE" as const, label: "Deutschland", flag: "🇩🇪" },
  { value: "AT" as const, label: "Österreich", flag: "🇦🇹" },
  { value: "CH" as const, label: "Schweiz", flag: "🇨🇭" },
] as const;

export function getDACHConfig(country: TaxCountry): DACHConfig {
  return DACH_CONFIGS[country] || DACH_CONFIGS.DE;
}

export function getCurrencyForCountry(country: TaxCountry): Currency {
  return country === "CH" ? "CHF" : "EUR";
}

export function formatCurrencyDACH(
  amount: number,
  currency: Currency = "EUR",
  options?: { swissRounding?: boolean }
): string {
  let finalAmount = amount;
  if (currency === "CHF" && options?.swissRounding) {
    finalAmount = roundToRappen(amount);
  }
  const country: TaxCountry = currency === "CHF" ? "CH" : "DE";
  return formatCurrency(finalAmount, country);
}

export function applySwissRounding(amount: number): number {
  return roundToRappen(amount);
}

export function calculateVatFromGross(
  grossAmount: number,
  vatRate: number
): { netAmount: number; vatAmount: number } {
  if (vatRate <= 0) {
    return { netAmount: grossAmount, vatAmount: 0 };
  }
  const result = calculateVat(grossAmount, vatRate, "DE", true);
  return { netAmount: result.net, vatAmount: result.vatAmount };
}

export function calculateGrossFromNet(
  netAmount: number,
  vatRate: number
): { grossAmount: number; vatAmount: number } {
  const result = calculateVat(netAmount, vatRate, "DE", false);
  return { grossAmount: result.gross, vatAmount: result.vatAmount };
}

// Re-export everything from dach.ts for new code
export {
  formatCurrency,
  roundToRappen,
  calculateVat,
  type DachCountry,
  DACH_COUNTRIES,
  getCurrencyConfig,
  getCurrencyCode,
  getCurrencySymbol as getCurrencySymbolDach,
  getVatConfig,
} from "./dach";

// Also re-export new utilities
export {
  formatDate,
  formatTime,
  formatMonthName,
  formatPhone,
  getVatLabel,
  validateVatNumber,
  getVatNumberPlaceholder,
  getPhoneConfig,
  validatePostalCode,
  getPostalCodePlaceholder,
  getCountryName,
  getCountryFlag,
  getCountryDefaults,
} from "./dach";
