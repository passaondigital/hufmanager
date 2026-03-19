import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Settings, Sparkles } from "lucide-react";

import { WidgetGrid } from "@/components/dashboard/widgets/WidgetGrid";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { CreateHorseModal } from "@/components/horse-detail/CreateHorseModal";
import { MandatoryHorseModal } from "@/components/onboarding/MandatoryHorseModal";
import { ClientOnboarding } from "@/components/client/ClientOnboarding";
import { useOnboarding } from "@/hooks/useOnboarding";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { isDemoEmail } from "@/lib/demo-accounts";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 17) return "Guten Tag";
  if (h >= 17 && h < 22) return "Guten Abend";
  return "Gute Nacht";
}

export default function ClientHomePage() {
  const { user, loading: authLoading } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const isDemo = isDemoEmail(user?.email);

  const [firstName, setFirstName] = useState("Kunde");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMandatoryHorseModal, setShowMandatoryHorseModal] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showWidgetHint, setShowWidgetHint] = useState(false);

  const {
    widgets,
    isLoading: widgetsLoading,
    updateWidget,
    addWidget,
    removeWidget,
    resetWidgets,
  } = useDashboardWidgets("client");

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, has_logged_in")
          .eq("id", user.id)
          .maybeSingle();

        if (prof) {
          setFirstName(prof.full_name?.split(" ")[0] || "Kunde");
          if (!prof.has_logged_in) {
            setIsFirstLogin(true);
            setShowWidgetHint(true);
            await supabase.from("profiles").update({ has_logged_in: true }).eq("id", user.id);
          }
        }

        // Check if horses exist for mandatory modal
        const { data: horsesData } = await supabase
          .from("horses")
          .select("id")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .limit(1);

        if (isFirstLogin && (!horsesData || horsesData.length === 0)) {
          setShowMandatoryHorseModal(true);
        }
      } catch (err) {
        console.error(err);
        toast.error("Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleHorseCreated = (horseId: string) => {
    setShowMandatoryHorseModal(false);
    setShowCreateModal(false);
    navigate(`/client-horse/${horseId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <ClientOnboarding onComplete={completeOnboarding} />;
  }

  const today = new Date();

  return (
    <>
      {showMandatoryHorseModal && (
        <MandatoryHorseModal open={showMandatoryHorseModal} onComplete={handleHorseCreated} />
      )}

      <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-24 lg:pb-8">
        {/* Hero Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            {getGreeting()}, {firstName}! 👋
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              {format(today, "EEEE, d. MMMM yyyy", { locale: de })}
            </p>
            {isDemo && <DemoBadge />}
          </div>
        </div>

        {/* Widget Customization Hint */}
        {showWidgetHint && (
          <div className="mb-6 p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Dein Dashboard ist anpassbar! ✨</p>
              <p className="text-xs text-muted-foreground mt-1">
                Klicke oben rechts auf „Anpassen", um Widgets hinzuzufügen, zu entfernen oder neu anzuordnen. 
                Gestalte dein Dashboard genau so, wie du es brauchst.
              </p>
            </div>
            <button
              onClick={() => setShowWidgetHint(false)}
              className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Widget Grid */}
        <WidgetGrid
          widgets={widgets}
          isLoading={widgetsLoading}
          role="client"
          onUpdateWidget={updateWidget}
          onAddWidget={addWidget}
          onRemoveWidget={removeWidget}
          onResetWidgets={resetWidgets}
        />
      </div>

      <CreateHorseModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleHorseCreated}
      />
    </>
  );
}
