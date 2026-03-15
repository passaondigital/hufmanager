import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle2,
  Circle,
  Building2,
  Users,
  Package,
  Calendar,
  FileText,
  Sparkles,
  ChevronRight,
  Trophy
} from "lucide-react";

// Custom Horse icon
const Horse = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 8.5c0-.28-.22-.5-.5-.5h-3.18a1 1 0 0 1-.86-.49L16 5l-1.5 1.5L13 5l-1.46 2.51a1 1 0 0 1-.86.49H7.5a.5.5 0 0 0-.5.5v2.68a1 1 0 0 1-.29.71l-3.5 3.5a1 1 0 0 0-.21.33l-1 2.5a.5.5 0 0 0 .46.78h3.18a1 1 0 0 0 .71-.29l2.15-2.15V19a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2h2v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-5.32a1 1 0 0 1 .29-.71l2.92-2.92a1 1 0 0 0 .29-.71V8.5Z"/>
  </svg>
);

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  action: () => void;
  actionLabel: string;
}

export function FirstStepsChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checklistState, setChecklistState] = useState({
    businessSetup: false,
    firstService: false,
    firstClient: false,
    firstHorse: false,
    firstAppointment: false,
    firstInvoice: false,
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user?.id) {
      checkProgress();
    }
  }, [user?.id]);

  const checkProgress = async () => {
    if (!user?.id) return;

    try {
      // Check business settings
      const { data: businessData } = await supabase
        .from("business_settings")
        .select("business_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Check services
      const { data: servicesData } = await supabase
        .from("offers")
        .select("id")
        .eq("provider_id", user.id)
        .limit(1);

      // Check clients (contacts)
      const { data: clientsData } = await supabase
        .from("contacts")
        .select("id")
        .eq("provider_id", user.id)
        .limit(1);

      // Check horses (via contacts)
      const { data: horsesData } = await (supabase as any)
        .from("horses")
        .select("id, contacts!inner(provider_id)")
        .eq("contacts.provider_id", user.id)
        .limit(1);

      // Check appointments
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("id")
        .eq("provider_id", user.id)
        .limit(1);

      // Check invoices
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("id")
        .eq("provider_id", user.id)
        .limit(1);

      setChecklistState({
        businessSetup: !!businessData?.business_name,
        firstService: (servicesData?.length ?? 0) > 0,
        firstClient: (clientsData?.length ?? 0) > 0,
        firstHorse: (horsesData?.length ?? 0) > 0,
        firstAppointment: (appointmentsData?.length ?? 0) > 0,
        firstInvoice: (invoicesData?.length ?? 0) > 0,
      });
    } catch (error) {
      console.error("Error checking progress:", error);
    } finally {
      setLoading(false);
    }
  };

  // Core 3 steps first (Aha-Moment in 5 min), then optional extras
  const coreItems: ChecklistItem[] = [
    {
      id: "firstClient",
      title: "Ersten Kunden hinzufügen",
      description: "Füge deinen ersten Pferdebesitzer hinzu",
      icon: Users,
      completed: checklistState.firstClient,
      action: () => navigate("/customers"),
      actionLabel: "Hinzufügen",
    },
    {
      id: "firstHorse",
      title: "Erstes Pferd erfassen",
      description: "Leg das erste Pferd in deiner Akte an",
      icon: Horse,
      completed: checklistState.firstHorse,
      action: () => navigate("/customers"),
      actionLabel: "Erfassen",
    },
    {
      id: "firstAppointment",
      title: "Ersten Termin planen",
      description: "Erstelle deinen ersten Bearbeitungstermin",
      icon: Calendar,
      completed: checklistState.firstAppointment,
      action: () => navigate("/calendar"),
      actionLabel: "Planen",
    },
  ];

  const extraItems: ChecklistItem[] = [
    {
      id: "businessSetup",
      title: "Firmenname einrichten",
      description: "Gib deinem Huf-Business einen Namen",
      icon: Building2,
      completed: checklistState.businessSetup,
      action: () => navigate("/services"),
      actionLabel: "Einrichten",
    },
    {
      id: "firstService",
      title: "Erste Dienstleistung anlegen",
      description: "Standard-Service anlegen (z.B. Ausschneiden)",
      icon: Package,
      completed: checklistState.firstService,
      action: () => navigate("/angebote"),
      actionLabel: "Anlegen",
    },
    {
      id: "firstInvoice",
      title: "Erste Rechnung erstellen",
      description: "Job abschließen und Rechnung stellen",
      icon: FileText,
      completed: checklistState.firstInvoice,
      action: () => navigate("/rechnungen"),
      actionLabel: "Erstellen",
    },
  ];

  // Show core items first, then extras
  const items = [...coreItems, ...extraItems];

  const completedCount = items.filter((item) => item.completed).length;
  const coreCompleted = coreItems.every((i) => i.completed);
  const progressPercent = Math.round((completedCount / items.length) * 100);
  const allCompleted = completedCount === items.length;

  // Don't show if dismissed or all completed
  if (dismissed || allCompleted || loading) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {coreCompleted ? "🎉 Super! Kern-Setup erledigt" : "In 5 Minuten startklar"}
              </CardTitle>
              <CardDescription className="text-sm">
                {coreCompleted 
                  ? `Noch ${items.length - completedCount} optionale Schritte übrig`
                  : `${completedCount}/${coreItems.length} Kern-Schritte erledigt – Kunde → Pferd → Termin`}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-primary border-primary/30">
            {progressPercent}%
          </Badge>
        </div>
        <Progress value={progressPercent} className="h-2 mt-3" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {items.map((item, index) => {
            // Find first incomplete item
            const isNextStep = !item.completed && items.slice(0, index).every((i) => i.completed);

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  item.completed
                    ? "bg-muted/30 opacity-60"
                    : isNextStep
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/20"
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 ${item.completed ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>

                {/* Action Button */}
                {!item.completed && isNextStep && (
                  <Button
                    size="sm"
                    onClick={item.action}
                    className="flex-shrink-0 gap-1"
                  >
                    {item.actionLabel}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}

                {item.completed && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Dismiss Option */}
        <div className="mt-4 pt-3 border-t border-border/50 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Später erledigen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
