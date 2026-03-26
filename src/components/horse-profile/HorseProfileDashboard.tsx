import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Horse, HoofDetails, HoofPhoto, HorseDocument, Appointment } from "@/components/horse-detail/types";
import { HorseHeroZone } from "./HorseHeroZone";
import { QuickActionsBar } from "./QuickActionsBar";
import { HealthMonitorZone } from "./HealthMonitorZone";
import { HoofGridZone } from "./HoofGridZone";
import { MediaDocumentsZone } from "./MediaDocumentsZone";
import { StammdatenZone } from "./StammdatenZone";

export type DashboardRole = "client" | "provider" | "employee" | "partner" | "portal";

interface HorseProfileDashboardProps {
  horse: Horse;
  horseId: string;
  role: DashboardRole;
  appointments: Appointment[];
  hoofPhotos: HoofPhoto[];
  documents: HorseDocument[];
  backPath?: string;
  ownerName?: string | null;
  onHorseUpdate?: (horse: Horse) => void;
  onAction?: (action: string) => void;
  onEdit?: () => void;
  onPhotosChanged?: () => void;
  onDocsChanged?: () => void;
  children?: React.ReactNode;
}

export function HorseProfileDashboard({
  horse, horseId, role, appointments, hoofPhotos, documents,
  backPath, ownerName, onHorseUpdate, onAction, onEdit,
  onPhotosChanged, onDocsChanged, children,
}: HorseProfileDashboardProps) {
  const latestAppointment = appointments[0];

  // Fetch latest wellbeing for hero badge
  const { data: latestHealth } = useQuery({
    queryKey: ["horse-hero-wellbeing", horseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("horse_health_logs")
        .select("wellbeing")
        .eq("horse_id", horseId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(1);
      return data?.[0]?.wellbeing ?? null;
    },
  });

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* ZONE A — Hero */}
      <HorseHeroZone
        horse={horse}
        role={role}
        appointmentsCount={appointments.length}
        hoofPhotosCount={hoofPhotos.length}
        documentsCount={documents.length}
        backPath={backPath}
        ownerName={ownerName}
        latestWellbeing={latestHealth ?? null}
        onEdit={onEdit}
      />

      {/* Quick Actions (role-dependent) */}
      <QuickActionsBar horseId={horseId} role={role} onAction={onAction} />

      {/* Responsive grid for Health + Hoofs on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ZONE B — Health Monitor */}
        <HealthMonitorZone
          horseId={horseId}
          role={role}
          onCompare={() => onAction?.("compare-health")}
          onNewBefund={() => onAction?.("new-befund")}
        />

        {/* ZONE C — Hoof Grid */}
        <HoofGridZone
          hoofDetails={horse.hoof_details as HoofDetails}
          lastAppointmentDate={horse.last_appointment_date || latestAppointment?.date}
          role={role}
          onHoofClick={(key) => onAction?.(`hoof-${key}`)}
        />
      </div>

      {/* ZONE D — Media & Documents */}
      <MediaDocumentsZone
        horseId={horseId}
        hoofPhotos={hoofPhotos}
        documents={documents}
        role={role}
        onShowAllPhotos={() => onAction?.("show-photos")}
        onShowAllDocs={() => onAction?.("show-docs")}
        onUploadPhoto={() => onAction?.("upload-photo")}
        onUploadDoc={() => onAction?.("upload-doc")}
        onPhotosChanged={onPhotosChanged}
        onDocsChanged={onDocsChanged}
      />

      {/* Additional role-specific content */}
      {children}

      {/* ZONE E — Stammdaten */}
      <StammdatenZone
        horse={horse}
        role={role}
        onHorseUpdate={onHorseUpdate}
      />
    </div>
  );
}
