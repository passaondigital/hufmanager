import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Info, History, Image, Users, FileText, BookOpen, Heart, Shield, Settings } from "lucide-react";
import { toast } from "sonner";
import { HorseStatusModal } from "@/components/client/HorseStatusModal";

import { TabSteckbrief } from "@/components/horse-detail/TabSteckbrief";
import { TabHistorie } from "@/components/horse-detail/TabHistorie";
import { TabMediaVault } from "@/components/horse-detail/TabMediaVault";
import { TabGesundheit } from "@/components/horse-detail/TabGesundheit";
import { TabHufHistorie } from "@/components/horse-detail/TabHufHistorie";
import { TabDokumente } from "@/components/horse-detail/TabDokumente";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import { HoofStatusGrid } from "@/components/horse-detail/HoofStatusGrid";
import { HorseStammdatenCard } from "@/components/horse-detail/HorseStammdatenCard";
import { HoofPhotoTimeline } from "@/components/horse-detail/HoofPhotoTimeline";
import { HorsePartnerPanel } from "@/components/horse-detail/HorsePartnerPanel";
import { HorseDiary } from "@/components/client/HorseDiary";
import { HorseHealthTracker } from "@/components/client/HorseHealthTracker";
import { HoofDevelopmentComparison } from "@/components/client/HoofDevelopmentComparison";
import { HorseAccessManager } from "@/components/client/HorseAccessManager";
import type { Horse, Appointment, HoofPhoto, HorseDocument, HoofDetails } from "@/components/horse-detail/types";

export default function ClientHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [horse, setHorse] = useState<Horse | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoofPhotos, setHoofPhotos] = useState<HoofPhoto[]>([]);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("steckbrief");
  const [showStatusModal, setShowStatusModal] = useState(false);

  const fetchHorseData = async () => {
    if (!user || !id) return;
    setLoading(true);

    try {
      // Fetch horse
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

      // Fetch appointments (sorted by date descending for proper timeline)
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("horse_id", id)
        .order("date", { ascending: false });

      setAppointments((appointmentsData || []) as Appointment[]);

      // Fetch hoof photos from provider
      const { data: hoofPhotosData } = await supabase
        .from("hoof_photos")
        .select("*")
        .eq("horse_id", id)
        .order("taken_at", { ascending: false });

      setHoofPhotos((hoofPhotosData || []) as HoofPhoto[]);

      // Fetch documents
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
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="px-4 py-6 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </main>
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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <HorseStammdatenCard horse={horse} compact />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowStatusModal(true)} className="gap-1.5">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Status</span>
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Hoof Status Grid - Prominent Section */}
        <HoofStatusGrid
          hoofDetails={horse.hoof_details as HoofDetails}
          lastAppointmentDate={horse.last_appointment_date || latestAppointment?.date}
          shoeingInterval={horse.shoeing_interval}
          horseName={horse.name}
          horseId={horse.id}
        />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-8">
              <TabsTrigger value="steckbrief" className="flex items-center gap-1.5 whitespace-nowrap">
                <Info className="h-4 w-4" />
                <span>Übersicht</span>
              </TabsTrigger>
              <TabsTrigger value="verlauf" className="flex items-center gap-1.5 whitespace-nowrap">
                <History className="h-4 w-4" />
                <span>Verlauf</span>
              </TabsTrigger>
              <TabsTrigger value="fotos" className="flex items-center gap-1.5 whitespace-nowrap">
                <Image className="h-4 w-4" />
                <span>Fotos & Medien</span>
              </TabsTrigger>
              <TabsTrigger value="gesundheit" className="flex items-center gap-1.5 whitespace-nowrap">
                <Heart className="h-4 w-4" />
                <span>Gesundheit</span>
              </TabsTrigger>
              <TabsTrigger value="dokumente" className="flex items-center gap-1.5 whitespace-nowrap">
                <FileText className="h-4 w-4" />
                <span>Dokumente</span>
              </TabsTrigger>
              <TabsTrigger value="tagebuch" className="flex items-center gap-1.5 whitespace-nowrap">
                <BookOpen className="h-4 w-4" />
                <span>Tagebuch</span>
              </TabsTrigger>
              <TabsTrigger value="betreuer" className="flex items-center gap-1.5 whitespace-nowrap">
                <Users className="h-4 w-4" />
                <span>Betreuer</span>
              </TabsTrigger>
              <TabsTrigger value="zugriffsrechte" className="flex items-center gap-1.5 whitespace-nowrap">
                <Shield className="h-4 w-4" />
                <span>Zugriffsrechte</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Übersicht = Steckbrief + Gesundheit */}
          <TabsContent value="steckbrief">
            <div className="space-y-6">
              <TabSteckbrief horse={horse} onEdit={() => setShowEditModal(true)} />
              <TabGesundheit horse={horse} onEdit={() => setShowEditModal(true)} />
            </div>
          </TabsContent>

          {/* Verlauf = Historie + Huf */}
          <TabsContent value="verlauf">
            <div className="space-y-6">
              <TabHistorie appointments={appointments} horseId={horse.id} />
              <TabHufHistorie horseId={horse.id} horseName={horse.name} />
            </div>
          </TabsContent>

          {/* Fotos & Medien = Foto-Timeline + Medien + Huf-Vergleich */}
          <TabsContent value="fotos">
            <div className="space-y-6">
              <HoofDevelopmentComparison horseId={horse.id} horseName={horse.name} />
              <HoofPhotoTimeline horseId={horse.id} horseName={horse.name} />
              <TabMediaVault horseId={horse.id} />
            </div>
          </TabsContent>

          {/* Gesundheit & Wohlbefinden */}
          <TabsContent value="gesundheit">
            <HorseHealthTracker horseId={horse.id} />
          </TabsContent>

          <TabsContent value="dokumente">
            <TabDokumente 
              horseId={horse.id} 
              hoofPhotos={hoofPhotos} 
              documents={documents} 
              onRefresh={fetchHorseData} 
            />
          </TabsContent>

          <TabsContent value="tagebuch">
            <HorseDiary horseId={horse.id} />
          </TabsContent>

          <TabsContent value="betreuer">
            <HorsePartnerPanel horseId={horse.id} horseName={horse.name} inviterRole="client" />
          </TabsContent>

          <TabsContent value="zugriffsrechte">
            <HorseAccessManager horseId={horse.id} horseName={horse.name} />
          </TabsContent>
        </Tabs>
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
