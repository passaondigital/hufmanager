import { useState } from "react";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TaxCountry, COUNTRY_OPTIONS } from "@/lib/dachConfig";

interface CountrySelectionStepProps {
  value: TaxCountry;
  onChange: (country: TaxCountry) => void;
}

export function CountrySelectionStep({ value, onChange }: CountrySelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Globe className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Wo ist dein Geschäftssitz?
        </h2>
        <p className="text-muted-foreground">
          Währung und Steuersätze werden automatisch angepasst
        </p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as TaxCountry)}
        className="space-y-3"
      >
        {COUNTRY_OPTIONS.map((option) => (
          <motion.div
            key={option.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Label
              htmlFor={option.value}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                value === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
              <span className="text-3xl">{option.flag}</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="text-sm text-muted-foreground">
                  {option.value === "DE" && "EUR • 19% MwSt. • §19 UStG"}
                  {option.value === "AT" && "EUR • 20% USt. • KU-Regelung"}
                  {option.value === "CH" && "CHF • 8.1% MWST • Rappen-Rundung"}
                </p>
              </div>
              {value === option.value && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </Label>
          </motion.div>
        ))}
      </RadioGroup>

      <p className="text-xs text-center text-muted-foreground">
        Du kannst dies später in den Einstellungen ändern
      </p>
    </div>
  );
}
