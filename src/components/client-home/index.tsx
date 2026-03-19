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

        const { count } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id)
          .eq("status", "completed");
        setTotalAppointments(count || 0);

        const ordersRes = await supabase
          .from("service_orders")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id) as any;
        setOpenOrders(ordersRes.count || 0);
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
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-7 w-48 bg-[#1c1912]" />
          <Skeleton className="h-4 w-64 bg-[#1c1912]" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-xl bg-[#1c1912]" />
            <Skeleton className="h-32 rounded-xl bg-[#1c1912]" />
            <Skeleton className="h-32 rounded-xl bg-[#1c1912]" />
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

      <div className="hm-page pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Zone 1 — Hero (full width) */}
          <div className="hm-fade-up" style={{ animationDelay: "0s" }}>
            <HomeHero firstName={firstName} userId={user!.id} />
          </div>

          {/* Desktop: 2-column layout / Mobile: stacked */}
          <div className="md:grid md:grid-cols-12 md:gap-6 md:px-6 lg:px-8">
            {/* Left column — main content */}
            <div className="md:col-span-8 space-y-5">
              {/* Status Grid */}
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

              {/* Horse Carousel / Grid */}
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
            </div>

            {/* Right column — sidebar (desktop) / stacked (mobile) */}
            <div className="md:col-span-4 space-y-5 mt-5 md:mt-0">
              {/* Hufbearbeiter */}
              <div className="hm-fade-up" style={{ animationDelay: "0.2s" }}>
                <HufbearbeiterCard userId={user!.id} />
              </div>

              {/* Service History */}
              <div className="hm-fade-up" style={{ animationDelay: "0.25s" }}>
                <ServiceHistory userId={user!.id} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Nav only on mobile */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>

      <CreateHorseModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleHorseCreated}
      />
    </>
  );
}