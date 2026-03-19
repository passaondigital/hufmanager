/**
 * PriceInput: Shows a price input field with automatic netto/brutto conversion.
 * Uses the provider's TaxConfig to display the complementary price.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaxConfig } from "@/hooks/useTaxConfig";
import { calculateDisplayPrice, VAT_RATES } from "@/lib/taxConfig";

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
  inputClassName?: string;
  size?: "sm" | "md";
  /** Override provider tax config */
  providerId?: string;
}

export function PriceInput({
  value,
  onChange,
  label,
  className = "",
  inputClassName = "",
  size = "md",
  providerId,
}: PriceInputProps) {
  const taxConfig = useTaxConfig(providerId);
  const isSmall = size === "sm";

  const currency = taxConfig.country === "CH" ? "CHF" : "€";
  const vatLabel = VAT_RATES[taxConfig.country]?.label || "MwSt";
  const isMwstPflichtig = taxConfig.mwstPflichtig && !taxConfig.kleinunternehmer;
  const mode = taxConfig.priceDisplayMode; // "netto" or "brutto"

  // Complementary price
  const complementaryTarget = mode === "netto" ? "brutto" : "netto";
  const complementaryPrice = isMwstPflichtig
    ? calculateDisplayPrice(value, taxConfig, complementaryTarget)
    : null;

  const modeLabel = mode === "netto" ? "netto" : "brutto";
  const compLabel = complementaryTarget === "netto" ? "netto" : "brutto";

  return (
    <div className={className}>
      {label && (
        <Label className={isSmall ? "text-xs text-muted-foreground" : ""}>
          {label} ({currency} {modeLabel})
        </Label>
      )}
      <Input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={inputClassName || (isSmall ? "h-8 w-24 text-sm" : "")}
      />
      {isMwstPflichtig && complementaryPrice !== null && value > 0 && (
        <p className="text-[11px] text-muted-foreground mt-0.5">
          = {complementaryPrice.toFixed(2)} {currency} {compLabel} ({taxConfig.vatRate}% {vatLabel})
        </p>
      )}
      {taxConfig.kleinunternehmer && (
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Kleinunternehmer: netto = brutto
        </p>
      )}
    </div>
  );
}
