import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Horse, Appointment, HoofPhoto, HorseDocument, HoofMeasurements, HorseContacts } from "@/components/horse-detail/types";
import { TabSteckbrief } from "@/components/horse-detail/TabSteckbrief";
import { TabGesundheit } from "@/components/horse-detail/TabGesundheit";
import { TabNetzwerk } from "@/components/horse-detail/TabNetzwerk";
import { TabDokumente } from "@/components/horse-detail/TabDokumente";
import { TabHistorie } from "@/components/horse-detail/TabHistorie";
import { TabEntwicklung } from "@/components/horse-detail/TabEntwicklung";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import { ServiceRequestDialog } from "@/components/horse-detail/ServiceRequestDialog";
import { ClientHealthStatusCard } from "@/components/horse-detail/ClientHealthStatusCard";

export default function ClientHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [horse, setHorse] = useState<Horse | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoofPhotos, setHoofPhotos] = useState<HoofPhoto[]>([]);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const fetchData = async () => {
    if (!user || !id) return;
    
    setLoading(true);

    // Fetch horse details
    const { data: horseData } = await supabase
      .from("horses")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!horseData) {
      navigate("/client-home");
      return;
    }
    
    // Map database fields to our interface
    const mappedHorse: Horse = {
      id: horseData.id,
      name: horseData.name,
      nickname: horseData.nickname,
      breed: horseData.breed,
      birth_year: horseData.birth_year,
      gender: horseData.gender,
      color: horseData.color,
      height: horseData.height,
      discipline: horseData.discipline,
      usage: horseData.usage,
      housing: horseData.housing,
      feeding_notes: horseData.feeding_notes,
      health_status: horseData.health_status,
      medical_history: horseData.medical_history,
      hoof_type: horseData.hoof_type,
      hoof_protection: horseData.hoof_protection,
      hoof_measurements: horseData.hoof_measurements as HoofMeasurements | null,
      shoeing_interval: horseData.shoeing_interval,
      special_notes: horseData.special_notes,
      contacts: horseData.contacts as HorseContacts | null,
      photo_url: horseData.photo_url,
      owner_id: horseData.owner_id,
      last_anamnesis_date: horseData.last_anamnesis_date,
      anamnesis_interval_months: horseData.anamnesis_interval_months || 12,
    };
    setHorse(mappedHorse);

    // Fetch all appointments for history
    const { data: aptData } = await supabase
      .from("appointments")
      .select("*")
      .eq("horse_id", id)
      .order("date", { ascending: false });
    setAppointments(aptData || []);

    // Fetch hoof photos
    const { data: photos } = await supabase
      .from("hoof_photos")
      .select("*")
      .eq("horse_id", id)
      .order("taken_at", { ascending: false });
    setHoofPhotos(photos || []);

    // Fetch documents
    const { data: docs } = await supabase
      .from("horse_documents")
      .select("*")
      .eq("horse_id", id)
      .order("created_at", { ascending: false });
    setDocuments(docs || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, id, navigate]);

  const handleDelete = async () => {
    if (!horse) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('horses')
        .delete()
        .eq('id', horse.id);

      if (error) throw error;

      toast({ title: "Pferd wurde gelöscht" });
      navigate('/client-home');
    } catch (error: any) {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!horse) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">{horse.name}</h1>
              {horse.nickname && (
                <p className="text-xs text-muted-foreground">„{horse.nickname}"</p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </header>

      {/* Horse Photo - Large emotional hero */}
      <div className="relative h-56 bg-muted flex items-center justify-center overflow-hidden">
        {horse.photo_url ? (
          <>
            {!imageLoaded && (
              <Skeleton className="absolute inset-0" />
            )}
            <img 
              src={horse.photo_url} 
              alt={horse.name}
              className={`h-full w-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
            {/* Gradient overlay for text */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            {/* Horse name overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-2xl font-bold text-foreground">{horse.name}</h2>
              <p className="text-sm text-muted-foreground">
                {[horse.breed, horse.color].filter(Boolean).join(" • ")}
              </p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <span className="text-7xl block mb-2">🐴</span>
            <p className="text-muted-foreground text-sm">Kein Foto vorhanden</p>
          </div>
        )}
      </div>

      {/* Quick Actions - Emergency Button */}
      <div className="px-4 -mt-4 relative z-10">
        <Button
          variant="destructive"
          className="w-full shadow-lg h-12"
          onClick={() => setShowServiceRequest(true)}
        >
          <AlertTriangle className="h-5 w-5 mr-2" />
          Problem melden
        </Button>
      </div>

      {/* Health Status Card */}
      <div className="px-4 mt-4">
        <ClientHealthStatusCard horseId={horse.id} horseName={horse.name} />
      </div>

      {/* Tab Navigation */}
      <main className="px-4 py-4 max-w-lg mx-auto">
        <Tabs defaultValue="entwicklung" className="w-full">
          <TabsList className="w-full grid grid-cols-6 h-auto">
            <TabsTrigger value="entwicklung" className="text-xs py-2">📈</TabsTrigger>
            <TabsTrigger value="steckbrief" className="text-xs py-2">Info</TabsTrigger>
            <TabsTrigger value="gesundheit" className="text-xs py-2">Hufe</TabsTrigger>
            <TabsTrigger value="netzwerk" className="text-xs py-2">Team</TabsTrigger>
            <TabsTrigger value="dokumente" className="text-xs py-2">Docs</TabsTrigger>
            <TabsTrigger value="historie" className="text-xs py-2">📅</TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            <TabsContent value="entwicklung">
              <TabEntwicklung horseId={horse.id} />
            </TabsContent>

            <TabsContent value="steckbrief">
              <TabSteckbrief 
                horse={horse} 
                onEdit={() => setShowEditModal(true)} 
              />
            </TabsContent>
            
            <TabsContent value="gesundheit">
              <TabGesundheit 
                horse={horse} 
                onEdit={() => setShowEditModal(true)} 
              />
            </TabsContent>
            
            <TabsContent value="netzwerk">
              <TabNetzwerk 
                horse={horse} 
                onEdit={() => setShowEditModal(true)} 
              />
            </TabsContent>
            
            <TabsContent value="dokumente">
              <TabDokumente 
                horseId={horse.id}
                hoofPhotos={hoofPhotos}
                documents={documents}
                onRefresh={fetchData}
              />
            </TabsContent>
            
            <TabsContent value="historie">
              <TabHistorie appointments={appointments} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Service Request Dialog */}
      <ServiceRequestDialog
        open={showServiceRequest}
        onClose={() => setShowServiceRequest(false)}
        horseId={horse.id}
        horseName={horse.name}
      />

      {/* Edit Modal */}
      <EditHorseModal 
        horse={horse}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={fetchData}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pferd löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Bist du sicher, dass du <strong>{horse.name}</strong> löschen möchtest? 
              Alle Daten, Dokumente und die Terminhistorie werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Wird gelöscht..." : "Ja, löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
