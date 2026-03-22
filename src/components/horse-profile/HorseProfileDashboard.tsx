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
  onHorseUpdate?: (horse: Horse) => void;
  onAction?: (action: string) => void;
  /** Render additional content between zones */
  children?: React.ReactNode;
}

export function HorseProfileDashboard({
  horse,
  horseId,
  role,
  appointments,
  hoofPhotos,
  documents,
  backPath,
  onHorseUpdate,
  onAction,
  children,
}: HorseProfileDashboardProps) {
  const latestAppointment = appointments[0];

  return (
    <div className="space-y-4">
      {/* ZONE A — Hero */}
      <HorseHeroZone
        horse={horse}
        role={role}
        appointmentsCount={appointments.length}
        hoofPhotosCount={hoofPhotos.length}
        documentsCount={documents.length}
        backPath={backPath}
      />

      {/* Quick Actions (role-dependent) */}
      <QuickActionsBar horseId={horseId} role={role} onAction={onAction} />

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

      {/* ZONE D — Media & Documents */}
      <MediaDocumentsZone
        hoofPhotos={hoofPhotos}
        documents={documents}
        role={role}
        onShowAllPhotos={() => onAction?.("show-photos")}
        onShowAllDocs={() => onAction?.("show-docs")}
        onUploadPhoto={() => onAction?.("upload-photo")}
        onUploadDoc={() => onAction?.("upload-doc")}
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
