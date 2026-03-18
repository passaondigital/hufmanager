import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import "@/styles/hm-theme.css";
import { HomeHero } from "./HomeHero";
import { StatusGrid } from "./StatusGrid";
import { HorseCarousel } from "./HorseCarousel";
import { OrdersSection } from "./OrdersSection";
import { ServiceHistory } from "./ServiceHistory";
import { HufbearbeiterCard } from "./HufbearbeiterCard";
import { BottomNav } from "@/components/horse-page/BottomNav";
import { CreateHorseModal } from "@/components/horse-detail/CreateHorseModal";
import { MandatoryHorseModal } from "@/components/onboarding/MandatoryHorseModal";
import { ClientOnboarding } from "@/components/client/ClientOnboarding";
import { useOnboarding } from "@/hooks/useOnboarding";

interface HorseData {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  birth_year: number | null;
  health_status: string | null;
}

export default function ClientHomePage() {
  const { user, loading: authLoading } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("Kunde");
  const [horses, setHorses] = useState<HorseData[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [openOrders, setOpenOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMandatoryHorseModal, setShowMandatoryHorseModal] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        // Profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, has_logged_in")
          .eq("id", user.id)
          .maybeSingle();

        if (prof) {
          setFirstName(prof.full_name?.split(" ")[0] || "Kunde");
          if (!prof.has_logged_in) {
            setIsFirstLogin(true);
            await supabase.from("profiles").update({ has_logged_in: true }).eq("id", user.id);
          }
        }

        // Horses
        const { data: horsesData } = await supabase
          .from("horses")
          .select("id, name, breed, photo_url, birth_year, health_status")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .order("name");

        setHorses((horsesData || []) as HorseData[]);

        if (isFirstLogin && (!horsesData || horsesData.length === 0)) {
          setShowMandatoryHorseModal(true);
        }

        // Appointments count
        const { count } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id)
          .eq("status", "completed");
        setTotalAppointments(count || 0);

        // Open orders count
        const { count: ordersCount } = await supabase
          .from("service_orders")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id)
          .in("status", ["pending", "open"]);
        setOpenOrders(ordersCount || 0);
      } catch (err) {
        console.error(err);
        toast.error("Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const handleHorseCreated = (horseId: string) => {
    setShowMandatoryHorseModal(false);
    setShowCreateModal(false);
    navigate(`/client-horse/${horseId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="hm-page">
        <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-7 w-48 bg-[#1c1912]" />
          <Skeleton className="h-4 w-64 bg-[#1c1912]" />
          <Skeleton className="h-20 w-full rounded-xl bg-[#1c1912]" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-24 rounded-lg bg-[#1c1912]" />
            <Skeleton className="h-24 rounded-lg bg-[#1c1912]" />
            <Skeleton className="h-24 rounded-lg bg-[#1c1912]" />
            <Skeleton className="h-24 rounded-lg bg-[#1c1912]" />
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <ClientOnboarding onComplete={completeOnboarding} />;
  }

  const horsesWithIssues = horses.filter(h => h.health_status && h.health_status !== "healthy").length;
  const healthOk = horsesWithIssues === 0;

  return (
    <>
      {showMandatoryHorseModal && (
        <MandatoryHorseModal open={showMandatoryHorseModal} onComplete={handleHorseCreated} />
      )}

      <div className="hm-page pb-24">
        <div className="max-w-[480px] mx-auto space-y-5">
          {/* Zone 1 — Hero */}
          <div className="hm-fade-up" style={{ animationDelay: "0s" }}>
            <HomeHero firstName={firstName} userId={user!.id} />
          </div>

          {/* Zone 2 — Status Grid */}
          <div className="hm-fade-up" style={{ animationDelay: "0.05s" }}>
            <StatusGrid
              horsesCount={horses.length}
              horsesWithIssues={horsesWithIssues}
              openOrders={openOrders}
              totalAppointments={totalAppointments}
              healthOk={healthOk}
              healthIssues={horsesWithIssues}
            />
          </div>

          {/* Zone 3 — Horse Carousel */}
          <div className="hm-fade-up" style={{ animationDelay: "0.1s" }}>
            <HorseCarousel
              horses={horses}
              onAddHorse={() => setShowCreateModal(true)}
            />
          </div>

          {/* Orders */}
          <div className="hm-fade-up" style={{ animationDelay: "0.15s" }}>
            <OrdersSection userId={user!.id} />
          </div>

          {/* Service History */}
          <div className="hm-fade-up" style={{ animationDelay: "0.2s" }}>
            <ServiceHistory userId={user!.id} />
          </div>

          {/* Hufbearbeiter */}
          <div className="hm-fade-up" style={{ animationDelay: "0.25s" }}>
            <HufbearbeiterCard userId={user!.id} />
          </div>
        </div>

        <BottomNav />
      </div>

      <CreateHorseModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleHorseCreated}
      />
    </>
  );
}
