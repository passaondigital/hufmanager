import { useMemo } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, User, Route, MapPin, FileText, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";

interface OnboardingStep {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { key: "profile", label: "Profil vervollständigen", icon: User, link: "/employee/profil", description: "Avatar und Telefonnummer hinzufügen" },
  { key: "tour_viewed", label: "Erste Tour ansehen", icon: Route, link: "/employee/tour", description: "Deine Tagesroute kennenlernen" },
  { key: "first_checkin", label: "Ersten Check-in", icon: MapPin, link: "/employee", description: "Bei einem Termin einchecken" },
  { key: "first_doc", label: "Erste Dokumentation", icon: FileText, link: "/employee/analyse", description: "Einen Befund erfassen" },
  { key: "hufi_used", label: "Hufi kennenlernen", icon: Sparkles, link: "/employee", description: "Frag Hufi etwas — z.B. 'Wie mache ich einen Check-in?'" },
];

export function EmployeeOnboarding() {
  const { data: profile } = useEmployeeProfile();
  const queryClient = useQueryClient();

  const completed = useMemo(() => {
    const ob = (profile?.onboarding_completed as Record<string, boolean>) || {};
    // Auto-check profile if avatar exists
    if (profile?.avatar_url) ob.profile = true;
    return ob;
  }, [profile]);

  const completedCount = STEPS.filter((s) => completed[s.key]).length;
  const allDone = completedCount >= STEPS.length;

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      const allCompleted = STEPS.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});
      await supabase
        .from("employee_profiles")
        .update({ onboarding_completed: allCompleted })
        .eq("id", profile.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-profile"] }),
  });

  if (allDone || !profile) return null;

  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Einrichtung — {completedCount}/{STEPS.length} erledigt</h3>
            <p className="text-xs text-muted-foreground">{progress}% eingerichtet</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => dismissMutation.mutate()} title="Später erledigen">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="space-y-1.5">
          {STEPS.map((step) => {
            const done = completed[step.key];
            return (
              <Link
                key={step.key}
                to={step.link}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors"
              >
                {done ? (
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm ${done ? "line-through text-muted-foreground" : "font-medium"}`}>{step.label}</p>
                  {!done && <p className="text-xs text-muted-foreground">{step.description}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
