import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import { HorseProfileDashboard } from "@/components/horse-profile";
import { Pferdeakte } from "@/components/pferdeakte";
import type { Horse, Appointment, HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

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
  const [showAkte, setShowAkte] = useState(false);

  const fetchHorseData = async () => {
    if (!user || !id) return;
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

  useEffect(() => {
    if (user && id) fetchHorseData();
  }, [user, id]);

  useEffect(() => {
    if (searchParams.get("tab") === "pferdeakte") setShowAkte(true);
  }, [searchParams]);

  const handleHorseUpdate = useCallback((updated: Horse) => setHorse(updated), []);

  const handleAction = useCallback((action: string) => {
    switch (action) {
      case "chat": navigate("/client-chat"); break;
      case "termin": navigate("/client-booking"); break;
      case "show-photos": setShowAkte(true); break;
      case "show-docs": setShowAkte(true); break;
      case "compare-health": setShowAkte(true); break;
      case "upload-photo": case "upload-doc": break; // handled by MediaDocumentsZone
      default: break;
    }
  }, [navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
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

  if (showAkte) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="px-4 py-6 max-w-3xl mx-auto space-y-4">
          <button
            onClick={() => setShowAkte(false)}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
          >
            ← Zurück zur Übersicht
          </button>
          <Pferdeakte
            horseId={horse.id}
            userRole="client"
            horse={horse as any}
            initialTab={searchParams.get("akte-tab") || undefined}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      <main className="px-4 py-6">
        <HorseProfileDashboard
          horse={horse}
          horseId={horse.id}
          role="client"
          appointments={appointments}
          hoofPhotos={hoofPhotos}
          documents={documents}
          backPath="/client-home"
          onHorseUpdate={handleHorseUpdate}
          onAction={handleAction}
          onEdit={() => setShowEditModal(true)}
          onPhotosChanged={fetchHorseData}
          onDocsChanged={fetchHorseData}
        >
          <button
            onClick={() => setShowAkte(true)}
            className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
          >
            📋 Vollständige Pferdeakte öffnen
          </button>
        </HorseProfileDashboard>
      </main>

      {showEditModal && (
        <EditHorseModal
          horse={horse}
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); fetchHorseData(); }}
        />
      )}
    </div>
  );
}
