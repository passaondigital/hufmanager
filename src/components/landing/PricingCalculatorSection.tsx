import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalculatorInputs } from "@/components/kalkulator/CalculatorInputs";
import { PlanCard } from "@/components/kalkulator/PlanCard";
import { LeadCaptureForm } from "@/components/kalkulator/LeadCaptureForm";
import { Loader2 } from "lucide-react";
import { type Plan, calcGO, calcBalance, calcSavings } from "@/lib/calculatorUtils";

interface PricingCalculatorSectionProps {
  providerId: string;
  primaryColor?: string;
  providerWhatsApp?: string | null;
}

export function PricingCalculatorSection({ providerId, primaryColor = "#F47B20", providerWhatsApp }: PricingCalculatorSectionProps) {
  const [horses, setHorses] = useState(2);
  const [zone, setZone] = useState<1 | 2>(1);
  const [intervalWeeks, setIntervalWeeks] = useState(6);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();
  const formRef = useRef<HTMLDivElement>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["landing-bhs-plans", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .eq("provider_id", providerId)
        .order("created_at");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const scrollToForm = (planName?: string) => {
    setSelectedPlan(planName);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const goPlan = plans?.find((p) => p.tier === "go");
  const balancePlan = plans?.find((p) => p.tier === "balance");
  const intensivPlan = plans?.find((p) => p.tier === "intensiv");

  const goCalc = goPlan ? calcGO(horses, zone, intervalWeeks, goPlan) : null;
  const balanceCalc = balancePlan ? calcBalance(horses, zone, intervalWeeks, balancePlan) : null;
  const savings = goCalc && balanceCalc ? calcSavings(goCalc.perYear, balanceCalc.perYear) : 0;

  // Don't render if no plans exist for this provider
  if (!isLoading && (!plans || plans.length === 0)) return null;

  return (
    <section id="preisrechner" className="py-16 px-4 scroll-mt-16">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Was kostet deine Hufpflege?
          </h2>
          <p className="text-muted-foreground text-lg">
            Berechne deinen individuellen Monatsbeitrag — transparent, fair, verbindlich.
          </p>
        </div>

        {/* Calculator Inputs */}
        <div className="bg-muted/30 rounded-2xl p-6 border">
          <CalculatorInputs
            horses={horses} setHorses={setHorses}
            zone={zone} setZone={setZone}
            intervalWeeks={intervalWeeks} setIntervalWeeks={setIntervalWeeks}
          />
        </div>

        {/* Plan Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {balancePlan && balanceCalc && (
              <div className="order-first lg:order-none sm:order-none">
                <PlanCard
                  name={balancePlan.name} description={balancePlan.description || ""}
                  tier="balance" planType={balancePlan.plan_type || "abo"}
                  perMonth={balanceCalc.perMonth} perYear={balanceCalc.perYear}
                  appointmentsPerYear={balanceCalc.appointmentsPerYear} savings={savings}
                  isRecommended includes={balancePlan.includes || []}
                  notIncluded={balancePlan.not_included || []}
                  badgeColor={balancePlan.badge_color || primaryColor}
                  onSelect={() => scrollToForm(balancePlan.name)}
                />
              </div>
            )}
            {goPlan && goCalc && (
              <div className="order-2 lg:order-first sm:order-first">
                <PlanCard
                  name={goPlan.name} description={goPlan.description || ""}
                  tier="go" planType={goPlan.plan_type || "single"}
                  perMonth={goCalc.perMonth} perYear={goCalc.perYear}
                  perAppointment={goCalc.perAppointment}
                  appointmentsPerYear={goCalc.appointmentsPerYear}
                  includes={goPlan.includes || []} notIncluded={goPlan.not_included || []}
                  badgeColor={goPlan.badge_color || "#22c55e"}
                  onSelect={() => scrollToForm(goPlan.name)}
                />
              </div>
            )}
            {intensivPlan && (
              <div className="order-3">
                <PlanCard
                  name={intensivPlan.name} description={intensivPlan.description || ""}
                  tier="intensiv" planType={intensivPlan.plan_type || "package"}
                  perMonth={0} perYear={0} flatPrice={intensivPlan.flat_price}
                  requiresApplication={intensivPlan.requires_application ?? true}
                  includes={intensivPlan.includes || []} notIncluded={intensivPlan.not_included || []}
                  badgeColor={intensivPlan.badge_color || "#f59e0b"}
                  onSelect={() => scrollToForm(intensivPlan.name)}
                />
              </div>
            )}
          </div>
        )}

        {/* Lead Capture */}
        <div ref={formRef} className="space-y-4 scroll-mt-24">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-foreground">Interesse? Lass uns sprechen.</h3>
            <p className="text-muted-foreground">
              Schick mir eine Anfrage oder schreib mir direkt per WhatsApp.
            </p>
          </div>
          <LeadCaptureForm
            selectedPlan={selectedPlan} horses={horses} zone={zone}
            intervalWeeks={intervalWeeks} providerId={providerId}
            providerWhatsApp={providerWhatsApp}
          />
        </div>
      </div>
    </section>
  );
}
