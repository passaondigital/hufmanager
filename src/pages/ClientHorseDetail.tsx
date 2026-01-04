import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Info, History, Image, Activity } from "lucide-react";
import { toast } from "sonner";

import { TabSteckbrief } from "@/components/horse-detail/TabSteckbrief";
import { TabHistorie } from "@/components/horse-detail/TabHistorie";
import { TabMediaVault } from "@/components/horse-detail/TabMediaVault";
import { TabGesundheit } from "@/components/horse-detail/TabGesundheit";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import type { Horse, Appointment, HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border shrink-0">
            {horse.photo_url ? (
              <img src={horse.photo_url} alt={horse.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg">🐴</span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg truncate">{horse.name}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {horse.breed || "Pferd"} {horse.readable_id && `• ${horse.readable_id}`}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="steckbrief" className="flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Steckbrief</span>
            </TabsTrigger>
            <TabsTrigger value="historie" className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historie</span>
            </TabsTrigger>
            <TabsTrigger value="medien" className="flex items-center gap-1.5">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Medien</span>
            </TabsTrigger>
            <TabsTrigger value="gesundheit" className="flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Gesundheit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steckbrief">
            <TabSteckbrief horse={horse} onEdit={() => setShowEditModal(true)} />
          </TabsContent>

          <TabsContent value="historie">
            <TabHistorie appointments={appointments} />
          </TabsContent>

          <TabsContent value="medien">
            <TabMediaVault horseId={horse.id} />
          </TabsContent>

          <TabsContent value="gesundheit">
            <TabGesundheit 
              horse={horse} 
              onEdit={() => setShowEditModal(true)}
            />
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
    </div>
  );
}
