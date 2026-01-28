// DACH Region (Germany, Austria, Switzerland) Tax & Currency Configuration

export type TaxCountry = 'DE' | 'AT' | 'CH';
export type Currency = 'EUR' | 'CHF';

export interface DACHConfig {
  country: TaxCountry;
  currency: Currency;
  currencySymbol: string;
  defaultVatRate: number;
  vatLabel: string;
  vatExemptLabel: string;
}

// Country-specific configurations
export const DACH_CONFIGS: Record<TaxCountry, DACHConfig> = {
  DE: {
    country: 'DE',
    currency: 'EUR',
    currencySymbol: '€',
    defaultVatRate: 19,
    vatLabel: 'MwSt.',
    vatExemptLabel: 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.',
  },
  AT: {
    country: 'AT',
    currency: 'EUR',
    currencySymbol: '€',
    defaultVatRate: 20,
    vatLabel: 'USt.',
    vatExemptLabel: 'Umsatzsteuerbefreit gemäß Kleinunternehmerregelung.',
  },
  CH: {
    country: 'CH',
    currency: 'CHF',
    currencySymbol: 'CHF',
    defaultVatRate: 8.1,
    vatLabel: 'MwSt.',
    vatExemptLabel: 'Mehrwertsteuerbefreit.',
  },
};

export const COUNTRY_OPTIONS = [
  { value: 'DE', label: 'Deutschland', flag: '🇩🇪' },
  { value: 'AT', label: 'Österreich', flag: '🇦🇹' },
  { value: 'CH', label: 'Schweiz', flag: '🇨🇭' },
] as const;

/**
 * Get the default DACH config for a country
 */
export function getDACHConfig(country: TaxCountry): DACHConfig {
  return DACH_CONFIGS[country] || DACH_CONFIGS.DE;
}

/**
 * Get the currency for a country
 */
export function getCurrencyForCountry(country: TaxCountry): Currency {
  return country === 'CH' ? 'CHF' : 'EUR';
}

/**
 * Format a currency amount with proper locale and symbol
 */
export function formatCurrencyDACH(
  amount: number, 
  currency: Currency = 'EUR',
  options?: { swissRounding?: boolean }
): string {
  let finalAmount = amount;
  
  // Swiss Rappen rounding (to 0.05)
  if (currency === 'CHF' && options?.swissRounding) {
    finalAmount = Math.round(amount * 20) / 20;
  }
  
  const locale = currency === 'CHF' ? 'de-CH' : 'de-DE';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(finalAmount);
}

/**
 * Apply Swiss rounding (to 0.05 CHF / Rappen)
 */
export function applySwissRounding(amount: number): number {
  return Math.round(amount * 20) / 20;
}

/**
 * Calculate VAT amount from gross total
 */
export function calculateVatFromGross(
  grossAmount: number, 
  vatRate: number
): { netAmount: number; vatAmount: number } {
  if (vatRate <= 0) {
    return { netAmount: grossAmount, vatAmount: 0 };
  }
  
  const netAmount = grossAmount / (1 + vatRate / 100);
  const vatAmount = grossAmount - netAmount;
  
  return { netAmount, vatAmount };
}

/**
 * Calculate gross total from net amount
 */
export function calculateGrossFromNet(
  netAmount: number, 
  vatRate: number
): { grossAmount: number; vatAmount: number } {
  const vatAmount = netAmount * (vatRate / 100);
  const grossAmount = netAmount + vatAmount;
  
  return { grossAmount, vatAmount };
}
