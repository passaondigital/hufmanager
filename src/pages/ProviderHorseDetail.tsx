import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logHorseAction } from "@/utils/auditLog";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import { HorseProfileDashboard } from "@/components/horse-profile";
import { Pferdeakte } from "@/components/pferdeakte";
import { HufCamPro } from "@/components/hufcam/HufCamPro";
import type { Horse, Appointment, HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

interface OwnerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export default function ProviderHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [horse, setHorse] = useState<Horse | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoofPhotos, setHoofPhotos] = useState<HoofPhoto[]>([]);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAkte, setShowAkte] = useState(false);
  const [showHufCam, setShowHufCam] = useState(false);

  const verifyProviderAccess = async (ownerId: string): Promise<boolean> => {
    if (!user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_by_provider_id")
      .eq("id", ownerId)
      .single();
    if (profile?.created_by_provider_id === user.id) return true;
    const { data: grant } = await supabase
      .from("access_grants")
      .select("id")
      .eq("provider_id", user.id)
      .eq("client_id", ownerId)
      .eq("is_active", true)
      .in("status", ["active", "pending"])
      .maybeSingle();
    return !!grant;
  };

  const fetchHorseData = async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const { data: horseData, error } = await supabase
        .from("horses")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      if (!horseData) { toast.error("Pferd nicht gefunden"); navigate("/"); return; }

      const hasAccess = await verifyProviderAccess(horseData.owner_id);
      if (!hasAccess) { toast.error("Keine Berechtigung"); navigate("/"); return; }

      setHorse(horseData as unknown as Horse);

      const { data: ownerData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", horseData.owner_id)
        .single();
      setOwner(ownerData);

      const [apptRes, photoRes, docRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("horse_id", id).eq("provider_id", user.id).order("date", { ascending: false }),
        supabase.from("hoof_photos").select("*").eq("horse_id", id).order("taken_at", { ascending: false }),
        supabase.from("horse_documents").select("*").eq("horse_id", id).order("created_at", { ascending: false }),
      ]);

      setAppointments((apptRes.data || []) as Appointment[]);
      setHoofPhotos((photoRes.data || []) as HoofPhoto[]);
      setDocuments((docRes.data || []) as HorseDocument[]);
    } catch (err: any) {
      console.error("Error fetching horse data:", err);
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user && id) fetchHorseData(); }, [user, id]);

  useEffect(() => {
    if (id) logHorseAction(id, "view_basic");
  }, [id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "pferdeakte") setShowAkte(true);
    if (tab === "huf-doku") setShowHufCam(true);
  }, [searchParams]);

  const handleHorseUpdate = useCallback((updated: Horse) => setHorse(updated), []);

  const handleAction = useCallback((action: string) => {
    switch (action) {
      case "hufcam": setShowHufCam(true); break;
      case "befund": case "new-befund": setShowAkte(true); break;
      case "termin": navigate("/calendar"); break;
      case "show-photos": setShowAkte(true); break;
      case "show-docs": setShowAkte(true); break;
      case "compare-health": setShowAkte(true); break;
      default: break;
    }
  }, [navigate]);

  if (authLoading || loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Pferd nicht gefunden</p>
          <Button onClick={() => navigate("/")}>Zurück</Button>
        </div>
      </div>
    );
  }

  // HufCam sub-view
  if (showHufCam) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setShowHufCam(false)} className="text-xs text-muted-foreground hover:text-primary">
          ← Zurück zur Übersicht
        </button>
        <h3 className="text-lg font-semibold text-foreground">HufCam Pro</h3>
        <HufCamPro
          horseName={horse.name}
          horseId={horse.id}
          onCollageGenerated={() => toast.success("Collage erstellt")}
        />
      </div>
    );
  }

  // Full Akte sub-view
  if (showAkte) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setShowAkte(false)} className="text-xs text-muted-foreground hover:text-primary">
          ← Zurück zur Übersicht
        </button>
        <Pferdeakte horseId={horse.id} userRole="provider" horse={horse as any} />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <HorseProfileDashboard
        horse={horse}
        horseId={horse.id}
        role="provider"
        appointments={appointments}
        hoofPhotos={hoofPhotos}
        documents={documents}
        onHorseUpdate={handleHorseUpdate}
        onAction={handleAction}
      >
        {/* Besitzer-Info */}
        {owner && (
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Besitzer</p>
            <p className="text-sm font-medium text-foreground">{owner.full_name || owner.email}</p>
            {owner.phone && <p className="text-xs text-muted-foreground">{owner.phone}</p>}
          </div>
        )}

        {/* Akte Quick-Access */}
        <button
          onClick={() => setShowAkte(true)}
          className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
        >
          📋 Vollständige Pferdeakte öffnen
        </button>
      </HorseProfileDashboard>

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
