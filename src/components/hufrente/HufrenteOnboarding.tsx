import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HufrenteOnboardingProps {
  onComplete: () => void;
}

const screens = [
  {
    icon: Shield,
    title: "Was ist die Hufrente?",
    description:
      "Dein passiver Einkommensschutz — für den Fall dass du mal ausfällst.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Wie funktioniert es?",
    description:
      "Du empfiehlst → Kollege nutzt HufManager → du bekommst 20% seiner Monatsgebühr — dauerhaft.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: CheckCircle2,
    title: "Ist das wirklich legal?",
    description:
      "Ja — vollständig. Affiliate Marketing ist dasselbe Prinzip wie bei Amazon oder Booking.com. Kein Schneeballsystem, keine versteckten Regeln.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

export function HufrenteOnboarding({ onComplete }: HufrenteOnboardingProps) {
  const [step, setStep] = useState(0);

  const isLast = step === screens.length - 1;
  const current = screens[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {screens.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={cn("inline-flex p-4 rounded-2xl", current.bg)}>
            <current.icon className={cn("h-12 w-12", current.color)} />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
              className="w-full gap-2"
            >
              {isLast ? "Verstanden — zeig mir meinen Link" : "Weiter"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={onComplete}>
                Überspringen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
