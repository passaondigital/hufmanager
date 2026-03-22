import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { HorseProfileDashboard } from "@/components/horse-profile";
import { Pferdeakte } from "@/components/pferdeakte";
import type { Horse, Appointment, HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

export default function EmployeeHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: empProfile } = useEmployeeProfile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [horse, setHorse] = useState<Horse | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoofPhotos, setHoofPhotos] = useState<HoofPhoto[]>([]);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [showAkte, setShowAkte] = useState(false);

  useEffect(() => {
    if (user && id && empProfile?.id) checkAccessAndFetch();
  }, [user, id, empProfile?.id]);

  const checkAccessAndFetch = async () => {
    if (!empProfile?.id || !id) return;
    setLoading(true);
    try {
      const { data: assignments } = await supabase
        .from("employee_assignments")
        .select("id, appointment:appointments!inner(horse_id)")
        .eq("employee_id", empProfile.id)
        .not("status", "eq", "cancelled");

      const found = assignments?.some((a: any) => a.appointment?.horse_id === id);
      if (!found) {
        toast.error("Kein Zugriff auf dieses Pferd");
        navigate("/employee/tour");
        return;
      }
      setHasAccess(true);

      // Fetch horse data
      const { data: horseData } = await supabase
        .from("horses")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!horseData) { toast.error("Pferd nicht gefunden"); navigate("/employee/tour"); return; }
      setHorse(horseData as unknown as Horse);

      const [apptRes, photoRes, docRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("horse_id", id).order("date", { ascending: false }),
        supabase.from("hoof_photos").select("*").eq("horse_id", id).order("taken_at", { ascending: false }),
        supabase.from("horse_documents").select("*").eq("horse_id", id).order("created_at", { ascending: false }),
      ]);

      setAppointments((apptRes.data || []) as Appointment[]);
      setHoofPhotos((photoRes.data || []) as HoofPhoto[]);
      setDocuments((docRes.data || []) as HorseDocument[]);
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handleHorseUpdate = useCallback((updated: Horse) => setHorse(updated), []);
  const handleAction = useCallback((action: string) => {
    if (action === "show-photos" || action === "show-docs" || action === "compare-health" || action === "new-befund") {
      setShowAkte(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!hasAccess || !horse) return null;

  if (showAkte) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setShowAkte(false)} className="text-xs text-muted-foreground hover:text-primary">
          ← Zurück zur Übersicht
        </button>
        <Pferdeakte horseId={id!} userRole="employee" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <HorseProfileDashboard
        horse={horse}
        horseId={id!}
        role="employee"
        appointments={appointments}
        hoofPhotos={hoofPhotos}
        documents={documents}
        backPath="/employee/tour"
        onHorseUpdate={handleHorseUpdate}
        onAction={handleAction}
      >
        <button
          onClick={() => setShowAkte(true)}
          className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
        >
          📋 Vollständige Pferdeakte öffnen
        </button>
      </HorseProfileDashboard>
    </div>
  );
}
