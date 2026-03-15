import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Info, History, Image, Users, FileText, BookOpen, Heart, Shield, Settings,
  Clock, Camera, Footprints, Syringe, Lock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HorseStatusModal } from "@/components/client/HorseStatusModal";

import { TabSteckbrief } from "@/components/horse-detail/TabSteckbrief";
import { TabHistorie } from "@/components/horse-detail/TabHistorie";
import { TabMediaVault } from "@/components/horse-detail/TabMediaVault";
import { TabGesundheit } from "@/components/horse-detail/TabGesundheit";
import { TabHufHistorie } from "@/components/horse-detail/TabHufHistorie";
import { TabDokumente } from "@/components/horse-detail/TabDokumente";
import { TabImpfungEntwurmung } from "@/components/horse-detail/TabImpfungEntwurmung";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import { HoofStatusGrid } from "@/components/horse-detail/HoofStatusGrid";
import { HoofPhotoTimeline } from "@/components/horse-detail/HoofPhotoTimeline";
import { HorsePartnerPanel } from "@/components/horse-detail/HorsePartnerPanel";
import { HorseDetailHero } from "@/components/horse-detail/HorseDetailHero";
import { HorseDetailStats } from "@/components/horse-detail/HorseDetailStats";
import { HorseDiary } from "@/components/client/HorseDiary";
import { HorseHealthTracker } from "@/components/client/HorseHealthTracker";
import { HoofDevelopmentComparison } from "@/components/client/HoofDevelopmentComparison";
import { HorseAccessManager } from "@/components/client/HorseAccessManager";
import { HorseCareTeam } from "@/components/client/HorseCareTeam";
import { VaultTab } from "@/components/client/VaultTab";
import { Pferdeakte } from "@/components/pferdeakte";
import type { Horse, Appointment, HoofPhoto, HorseDocument, HoofDetails } from "@/components/horse-detail/types";
import { HorseProfileCompleteness } from "@/components/horse-detail/HorseProfileCompleteness";

const TABS = [
  { value: "steckbrief", label: "Übersicht", icon: Info },
  { value: "pferdeakte", label: "Akte", icon: BookOpen },
  { value: "verlauf", label: "Verlauf", icon: History },
  { value: "fotos", label: "Fotos & Medien", icon: Image },
  { value: "gesundheit", label: "Gesundheit", icon: Heart },
  { value: "impfung", label: "Impfpass", icon: Syringe },
  { value: "dokumente", label: "Dokumente", icon: FileText },
  { value: "tagebuch", label: "Tagebuch", icon: BookOpen },
  { value: "betreuer", label: "Betreuer", icon: Users },
  { value: "zugriffsrechte", label: "Zugriffsrechte", icon: Shield },
  { value: "tresor", label: "Tresor", icon: Lock },
] as const;

export default function ClientHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [horse, setHorse] = useState<Horse | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoofPhotos, setHoofPhotos] = useState<HoofPhoto[]>([]);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const defaultTab = searchParams.get("tab") || "steckbrief";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const fetchHorseData = async () => {
    if (!user || !id) return;
    setLoading(true);

    try {
      const { data: horseData, error: horseError } = await supabase
        .from("horses")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (horseError) throw horseError;
      if (!horseData) {
        toast.error("Pferd nicht gefunden");
        navigate("/client-home");
        return;
      }

      setHorse(horseData as unknown as Horse);

      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("horse_id", id)
        .order("date", { ascending: false });

      setAppointments((appointmentsData || []) as Appointment[]);

      const { data: hoofPhotosData } = await supabase
        .from("hoof_photos")
        .select("*")
        .eq("horse_id", id)
        .order("taken_at", { ascending: false });

      setHoofPhotos((hoofPhotosData || []) as HoofPhoto[]);

      const { data: documentsData } = await supabase
        .from("horse_documents")
        .select("*")
        .eq("horse_id", id)
        .order("created_at", { ascending: false });

      setDocuments((documentsData || []) as HorseDocument[]);

    } catch (error: any) {
      console.error("Error fetching horse data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchHorseData();
    }
  }, [user, id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
          <div className="rounded-2xl bg-card p-5 space-y-4">
            <Skeleton className="h-5 w-20" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-[72px] w-[72px] rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Pferd nicht gefunden</p>
          <Button onClick={() => navigate("/client-home")}>Zurück</Button>
        </div>
      </div>
    );
  }

  const latestAppointment = appointments[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
      <main className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Hero Banner */}
        <div className="relative">
          <HorseDetailHero horse={horse} backPath="/client-home" />
          {/* Status Button - overlaid */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowStatusModal(true)} 
            className="absolute top-3 right-3 gap-1.5 bg-card/60 backdrop-blur-sm border-border"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Status</span>
          </Button>
        </div>

        {/* Stats Row */}
        <HorseDetailStats
          appointmentsCount={appointments.length}
          hoofPhotosCount={hoofPhotos.length}
          documentsCount={documents.length}
        />
        {/* Profile Completeness */}
        <HorseProfileCompleteness horse={horse} onEditClick={() => setShowEditModal(true)} />

        {/* Hoof Status Grid */}
        <HoofStatusGrid
          hoofDetails={horse.hoof_details as HoofDetails}
          lastAppointmentDate={horse.last_appointment_date || latestAppointment?.date}
          shoeingInterval={horse.shoeing_interval}
          horseName={horse.name}
          horseId={horse.id}
        />

        {/* Scrollable Tab Navigation */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4">
          <div className="flex overflow-x-auto gap-1 py-3 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30 font-medium"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[200px]">
          {activeTab === "steckbrief" && (
            <div className="space-y-6">
              <TabSteckbrief horse={horse} onEdit={() => setShowEditModal(true)} />
              <TabGesundheit horse={horse} onEdit={() => setShowEditModal(true)} />
            </div>
          )}
          {activeTab === "verlauf" && (
            <div className="space-y-6">
              <TabHistorie appointments={appointments} horseId={horse.id} />
              <TabHufHistorie horseId={horse.id} horseName={horse.name} />
            </div>
          )}
          {activeTab === "fotos" && (
            <div className="space-y-6">
              <HoofDevelopmentComparison horseId={horse.id} horseName={horse.name} />
              <HoofPhotoTimeline horseId={horse.id} horseName={horse.name} />
              <TabMediaVault horseId={horse.id} />
            </div>
          )}
          {activeTab === "gesundheit" && (
            <HorseHealthTracker horseId={horse.id} />
          )}
          {activeTab === "impfung" && (
            <TabImpfungEntwurmung horseId={horse.id} readOnly />
          )}
          {activeTab === "dokumente" && (
            <TabDokumente 
              horseId={horse.id} 
              hoofPhotos={hoofPhotos} 
              documents={documents} 
              onRefresh={fetchHorseData} 
            />
          )}
          {activeTab === "tagebuch" && (
            <HorseDiary horseId={horse.id} />
          )}
          {activeTab === "betreuer" && (
            <HorsePartnerPanel horseId={horse.id} horseName={horse.name} inviterRole="client" />
          )}
          {activeTab === "zugriffsrechte" && (
            <HorseAccessManager horseId={horse.id} horseName={horse.name} />
          )}
          {activeTab === "tresor" && (
            <VaultTab horseId={horse.id} />
          )}
          {activeTab === "pferdeakte" && (
            <Pferdeakte horseId={horse.id} userRole="client" horse={horse as any} initialTab={searchParams.get("akte-tab") || undefined} />
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <EditHorseModal
          horse={horse}
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchHorseData();
          }}
        />
      )}

      {/* Status Modal */}
      <HorseStatusModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        horseId={horse.id}
        horseName={horse.name}
        onStatusChanged={fetchHorseData}
      />
    </div>
  );
}
