import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlanCardProps {
  name: string;
  description: string;
  tier: string;
  planType: string;
  perMonth: number;
  perYear: number;
  perAppointment?: number;
  appointmentsPerYear?: number;
  flatPrice?: number | null;
  savings?: number;
  isRecommended?: boolean;
  requiresApplication?: boolean;
  includes: string[];
  notIncluded: string[];
  badgeColor: string;
  onSelect: () => void;
}

export function PlanCard({
  name, description, tier, planType,
  perMonth, perYear, perAppointment, appointmentsPerYear,
  flatPrice, savings, isRecommended, requiresApplication,
  includes, notIncluded, badgeColor, onSelect,
}: PlanCardProps) {
  const isIntensiv = planType === "package";

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${
        isRecommended
          ? "ring-2 ring-[#F47B20] shadow-xl scale-[1.02] sm:scale-105"
          : "hover:shadow-lg"
      }`}
    >
      {/* Colored top bar */}
      <div className="h-2" style={{ backgroundColor: badgeColor }} />

      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold">{name}</h3>
            {isRecommended && (
              <Badge className="bg-[#F47B20] text-white border-0 gap-1">
                <Star className="h-3 w-3" /> Empfohlen
              </Badge>
            )}
            {requiresApplication && (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                <ShieldCheck className="h-3 w-3" /> Bewerbung nötig
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {/* Price */}
        <div className="space-y-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={isIntensiv ? "flat" : perMonth.toFixed(0)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {isIntensiv ? (
                <div>
                  <span className="text-3xl font-extrabold">{flatPrice} €</span>
                  <span className="text-muted-foreground ml-1">einmalig (8 Wochen)</span>
                </div>
              ) : (
                <div>
                  <span className="text-3xl font-extrabold">
                    {perMonth.toFixed(2).replace(".", ",")} €
                  </span>
                  <span className="text-muted-foreground ml-1">/ Monat</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {!isIntensiv && (
            <p className="text-xs text-muted-foreground">
              {perYear.toFixed(2).replace(".", ",")} € / Jahr
              {perAppointment ? ` · ${appointmentsPerYear} Termine/Jahr` : ""}
            </p>
          )}

          {savings != null && savings > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 mt-2">
              Du sparst {savings.toFixed(0)} € / Jahr vs. Einzeltermine
            </Badge>
          )}
        </div>

        {/* Includes */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inklusive</p>
          <ul className="space-y-1.5">
            {includes.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Not included */}
        {notIncluded.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nicht enthalten</p>
            <ul className="space-y-1.5">
              {notIncluded.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={onSelect}
          className={`w-full ${
            isRecommended
              ? "bg-[#F47B20] hover:bg-[#d96a15] text-white"
              : ""
          }`}
          variant={isRecommended ? "default" : "outline"}
          size="lg"
        >
          {tier === "go"
            ? "Termin anfragen"
            : tier === "balance"
            ? "Jetzt Abo starten"
            : "Bewerbung starten"}
        </Button>
      </CardContent>
    </Card>
  );
}
