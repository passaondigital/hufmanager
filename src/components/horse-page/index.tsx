import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Horse, Appointment, HoofPhoto, HorseDocument, HoofDetails } from "@/components/horse-detail/types";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

import "@/styles/hm-theme.css";
import "./horse-page.css";
import { HorseHero } from "./HorseHero";
import { QuickActions } from "./QuickActions";
import { HealthMonitor } from "./HealthMonitor";
import { HoofGrid } from "./HoofGrid";
import { MediaDocuments } from "./MediaDocuments";
import { StammdatenAccordion } from "./StammdatenAccordion";
import { BottomNav } from "./BottomNav";
import { HorsePageTabNav } from "./HorsePageTabNav";
import { TabContentRenderer } from "./TabContentRenderer";

export type HorsePageTab = "start" | "verlauf" | "huf" | "vet" | "therapie" | "berichte" | "tresor";

const TAB_ORDER: HorsePageTab[] = ["start", "verlauf", "huf", "vet", "therapie", "berichte", "tresor"];

export default function ClientHorsePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [horse, setHorse] = useState<Horse | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoofPhotos, setHoofPhotos] = useState<HoofPhoto[]>([]);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HorsePageTab>("start");

  const currentIndex = TAB_ORDER.indexOf(activeTab);

  const goNext = useCallback(() => {
    if (currentIndex < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[currentIndex + 1]);
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setActiveTab(TAB_ORDER[currentIndex - 1]);
  }, [currentIndex]);

  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  useEffect(() => {
    if (!user || !id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: horseData, error } = await supabase
          .from("horses")
          .select("*")
          .eq("id", id)
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .maybeSingle();

        if (error) throw error;
        if (!horseData) {
          toast.error("Pferd nicht gefunden");
          navigate("/client-home");
          return;
        }

        setHorse(horseData as unknown as Horse);

        const [apptRes, photoRes, docRes] = await Promise.all([
          supabase.from("appointments").select("*").eq("horse_id", id).order("date", { ascending: false }),
          supabase.from("hoof_photos").select("*").eq("horse_id", id).order("taken_at", { ascending: false }),
          supabase.from("horse_documents").select("*").eq("horse_id", id).order("created_at", { ascending: false }),
        ]);

        setAppointments((apptRes.data || []) as Appointment[]);
        setHoofPhotos((photoRes.data || []) as HoofPhoto[]);
        setDocuments((docRes.data || []) as HorseDocument[]);
      } catch (err: any) {
        console.error("Error fetching horse data:", err);
        toast.error("Fehler beim Laden der Daten");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as HorsePageTab);
  }, []);

  const handleHorseUpdate = useCallback((updatedHorse: Horse) => {
    setHorse(updatedHorse);
  }, []);

  if (authLoading || loading) {
    return (
      <div className="horse-page">
        <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-5 w-16 bg-[#1c1912]" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-[72px] w-[72px] rounded-full bg-[#1c1912]" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-40 bg-[#1c1912]" />
              <Skeleton className="h-4 w-56 bg-[#1c1912]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-lg bg-[#1c1912]" />
            <Skeleton className="h-16 rounded-lg bg-[#1c1912]" />
            <Skeleton className="h-16 rounded-lg bg-[#1c1912]" />
          </div>
          <Skeleton className="h-32 rounded-xl bg-[#1c1912]" />
        </div>
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="horse-page flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--hp-text3)] mb-4">Pferd nicht gefunden</p>
          <button
            onClick={() => navigate("/client-home")}
            className="hp-primary-btn px-4 py-2 rounded-lg text-sm"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  const latestAppointment = appointments[0];

  return (
    <div className="horse-page pb-24">
      <div className="max-w-[480px] mx-auto space-y-5">
        {/* Hero */}
        <div className="hp-fade-up" style={{ animationDelay: "0s" }}>
          <HorseHero
            horse={horse}
            appointmentsCount={appointments.length}
            hoofPhotosCount={hoofPhotos.length}
            documentsCount={documents.length}
          />
        </div>

        {/* Quick Actions */}
        <div className="hp-fade-up" style={{ animationDelay: "0.05s" }}>
          <QuickActions horseId={horse.id} />
        </div>

        {/* Tab Navigation */}
        <div className="hp-fade-up" style={{ animationDelay: "0.08s" }}>
          <HorsePageTabNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Tab Content with swipe */}
        <div className="hp-fade-up" style={{ animationDelay: "0.12s" }} {...swipeHandlers}>
          <TabContentRenderer
            activeTab={activeTab}
            horse={horse}
            hoofPhotos={hoofPhotos}
            documents={documents}
            latestAppointment={latestAppointment}
            onHorseUpdate={handleHorseUpdate}
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
