import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, UserCircle, PawPrint, CalendarPlus, ArrowRight } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  duo: "Duo",
  team: "Team",
};

export default function Welcome() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const checkStatus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, subscription_plan, plan_override")
        .eq("id", user.id)
        .maybeSingle();

      // Already completed → redirect away
      if (data?.onboarding_completed === true) {
        const dest = role === "client" ? "/client-home" : "/home";
        navigate(dest, { replace: true });
        return;
      }

      // Determine plan name
      const plan = data?.subscription_plan?.toLowerCase() || "";
      setPlanName(PLAN_LABELS[plan] || null);
      setLoading(false);
    };

    checkStatus();
  }, [user, role, navigate]);

  const handleStart = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    const dest = role === "client" ? "/client-home" : "/home";
    navigate(dest, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = [
    {
      icon: UserCircle,
      title: "Profil vervollständigen",
      description: "Name, Kontaktdaten und Logo hinterlegen.",
    },
    {
      icon: PawPrint,
      title: "Erstes Pferd anlegen",
      description: "Erstelle die erste Pferdeakte für deinen Kunden.",
    },
    {
      icon: CalendarPlus,
      title: "Ersten Termin erstellen",
      description: "Plane deinen ersten Besuch direkt im Kalender.",
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg space-y-8 text-center">
        {/* Logo */}
        <img
          src="/hufmanager-logo.png"
          alt="HufManager"
          className="h-20 w-auto mx-auto"
        />

        {/* Welcome heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Willkommen{planName ? ` im HufManager ${planName}` : " beim HufManager"}! 🎉
          </h1>
          <p className="text-muted-foreground">
            Dein Account ist bereit. Hier sind deine ersten Schritte:
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <Card key={i} className="flex items-start gap-4 p-4 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  <span className="text-primary mr-1.5">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={handleStart}
          size="lg"
          className="w-full h-14 text-base font-semibold gap-2"
        >
          Los geht's
          <ArrowRight className="h-5 w-5" />
        </Button>

        <p className="text-xs text-muted-foreground">
          Du kannst diese Schritte jederzeit nachholen.
        </p>
      </div>
    </div>
  );
}
