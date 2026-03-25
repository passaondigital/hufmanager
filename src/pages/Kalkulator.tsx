import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalculatorInputs } from "@/components/kalkulator/CalculatorInputs";
import { PlanCard } from "@/components/kalkulator/PlanCard";
import { LeadCaptureForm } from "@/components/kalkulator/LeadCaptureForm";
import { Loader2 } from "lucide-react";

const PROVIDER_ID = "99e50f7f-c2d1-4ce4-ba99-d7dc800e5090";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  tier: string | null;
  plan_type: string | null;
  price_monthly: number;
  price_per_appointment: number | null;
  travel_fee_zone1: number | null;
  travel_fee_zone2: number | null;
  discount_per_extra_horse: number | null;
  flat_price: number | null;
  interval_weeks: number | null;
  duration_weeks: number | null;
  max_appointments: number | null;
  includes: string[] | null;
  not_included: string[] | null;
  badge_color: string | null;
  requires_application: boolean | null;
};

function calcGO(horses: number, zone: 1 | 2, intervalWeeks: number, plan: Plan) {
  const perHorse = plan.price_per_appointment || 65;
  const travelFee = zone === 1 ? (plan.travel_fee_zone1 || 10) : (plan.travel_fee_zone2 || 20);
  const perAppointment = (horses * perHorse) + travelFee;
  const appointmentsPerYear = Math.ceil(52 / intervalWeeks);
  const perYear = perAppointment * appointmentsPerYear;
  const perMonth = perYear / 12;
  return { perAppointment, appointmentsPerYear, perYear, perMonth };
}

function calcBalance(horses: number, zone: 1 | 2, intervalWeeks: number, plan: Plan) {
  const base = plan.price_monthly || 65;
  const discountRate = (plan.discount_per_extra_horse || 0) / 100;
  let monthlyBase = base;
  for (let i = 1; i < horses; i++) {
    monthlyBase += base * (1 - discountRate);
  }
  const travelFee = zone === 1 ? (plan.travel_fee_zone1 || 10) : (plan.travel_fee_zone2 || 20);
  const appointmentsPerYear = Math.ceil(52 / intervalWeeks);
  const travelPerYear = travelFee * appointmentsPerYear;
  const perYear = (monthlyBase * 12) + travelPerYear;
  const perMonth = perYear / 12;
  return { monthlyBase, travelPerYear, perYear, perMonth, appointmentsPerYear };
}

export default function Kalkulator() {
  const [horses, setHorses] = useState(2);
  const [zone, setZone] = useState<1 | 2>(1);
  const [intervalWeeks, setIntervalWeeks] = useState(6);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();
  const formRef = useRef<HTMLDivElement>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-bhs-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .eq("provider_id", PROVIDER_ID)
        .order("created_at");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const { data: provider } = useQuery({
    queryKey: ["provider-contact"],
    queryFn: async () => {
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("phone, full_name").eq("id", PROVIDER_ID).single(),
        supabase.from("business_settings").select("whatsapp_number").eq("user_id", PROVIDER_ID).single(),
      ]);
      return {
        phone: profileRes.data?.phone ?? null,
        full_name: profileRes.data?.full_name ?? null,
        whatsapp_number: settingsRes.data?.whatsapp_number ?? null,
      };
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
  const savings = goCalc && balanceCalc ? Math.max(0, goCalc.perYear - balanceCalc.perYear) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-lg">Barhufserviceschmid</span>
          <a
            href="/datenschutz"
            className="text-xs text-muted-foreground hover:underline"
          >
            Datenschutz
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Was kostet professionelle Hufpflege?
          </h1>
          <p className="text-muted-foreground text-lg">
            Berechne deinen individuellen Monatsbeitrag — transparent, fair, verbindlich.
          </p>
        </div>

        {/* Calculator Inputs */}
        <div className="bg-muted/30 rounded-2xl p-6 border">
          <CalculatorInputs
            horses={horses}
            setHorses={setHorses}
            zone={zone}
            setZone={setZone}
            intervalWeeks={intervalWeeks}
            setIntervalWeeks={setIntervalWeeks}
          />
        </div>

        {/* Plan Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#F47B20]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* On mobile, show BALANCE first */}
            {balancePlan && balanceCalc && (
              <div className="order-first lg:order-none sm:order-none">
                <PlanCard
                  name={balancePlan.name}
                  description={balancePlan.description || ""}
                  tier="balance"
                  planType={balancePlan.plan_type || "abo"}
                  perMonth={balanceCalc.perMonth}
                  perYear={balanceCalc.perYear}
                  appointmentsPerYear={balanceCalc.appointmentsPerYear}
                  savings={savings}
                  isRecommended
                  includes={balancePlan.includes || []}
                  notIncluded={balancePlan.not_included || []}
                  badgeColor={balancePlan.badge_color || "#F47B20"}
                  onSelect={() => scrollToForm(balancePlan.name)}
                />
              </div>
            )}

            {goPlan && goCalc && (
              <div className="order-2 lg:order-first sm:order-first">
                <PlanCard
                  name={goPlan.name}
                  description={goPlan.description || ""}
                  tier="go"
                  planType={goPlan.plan_type || "single"}
                  perMonth={goCalc.perMonth}
                  perYear={goCalc.perYear}
                  perAppointment={goCalc.perAppointment}
                  appointmentsPerYear={goCalc.appointmentsPerYear}
                  includes={goPlan.includes || []}
                  notIncluded={goPlan.not_included || []}
                  badgeColor={goPlan.badge_color || "#22c55e"}
                  onSelect={() => scrollToForm(goPlan.name)}
                />
              </div>
            )}

            {intensivPlan && (
              <div className="order-3">
                <PlanCard
                  name={intensivPlan.name}
                  description={intensivPlan.description || ""}
                  tier="intensiv"
                  planType={intensivPlan.plan_type || "package"}
                  perMonth={0}
                  perYear={0}
                  flatPrice={intensivPlan.flat_price}
                  requiresApplication={intensivPlan.requires_application ?? true}
                  includes={intensivPlan.includes || []}
                  notIncluded={intensivPlan.not_included || []}
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
            <h2 className="text-2xl font-bold">Interesse? Lass uns sprechen.</h2>
            <p className="text-muted-foreground">
              Schick mir eine Anfrage oder schreib mir direkt per WhatsApp.
            </p>
          </div>
          <LeadCaptureForm
            selectedPlan={selectedPlan}
            horses={horses}
            zone={zone}
            intervalWeeks={intervalWeeks}
            providerId={PROVIDER_ID}
            providerWhatsApp={provider?.whatsapp_number || provider?.phone}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 Barhufserviceschmid — Pascal Schmid</p>
        <div className="mt-1 space-x-3">
          <a href="/impressum" className="hover:underline">Impressum</a>
          <a href="/datenschutz" className="hover:underline">Datenschutz</a>
        </div>
      </footer>
    </div>
  );
}
