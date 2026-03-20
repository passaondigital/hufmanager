import { Component, type ErrorInfo, type ReactNode } from "react";
import type { Horse, HoofPhoto, HorseDocument, HoofDetails, Appointment } from "@/components/horse-detail/types";

import { HealthMonitor } from "./HealthMonitor";
import { HoofGrid } from "./HoofGrid";
import { MediaDocuments } from "./MediaDocuments";
import { StammdatenAccordion } from "./StammdatenAccordion";

import { PferdeakteTimeline } from "@/components/pferdeakte/PferdeakteTimeline";
import { PferdeakteHuf } from "@/components/pferdeakte/PferdeakteHuf";
import { PferdeakteVet } from "@/components/pferdeakte/PferdeakteVet";
import { PferdeakteTherapie } from "@/components/pferdeakte/PferdeakteTherapie";
import { PferdeakteBerichte } from "@/components/pferdeakte/PferdeakteBerichte";
import { PferdeakteTresor } from "@/components/pferdeakte/PferdeakteTresor";
import { PferdeakteFutter } from "@/components/pferdeakte/PferdeakteFutter";
import { PferdeakteBewegung } from "@/components/pferdeakte/PferdeakteBewegung";
import { PferdeakteMedikamente } from "@/components/pferdeakte/PferdeakteMedikamente";

// Error boundary to prevent tab crashes from redirecting
class TabErrorBoundary extends Component<
  { children: ReactNode; tabName: string },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Tab "${this.props.tabName}" error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl p-6 text-center" style={{ background: "var(--hp-bg2)", border: "1px solid var(--hp-border)" }}>
          <p className="text-[var(--hp-text2)] text-sm mb-2">
            Dieser Bereich konnte nicht geladen werden.
          </p>
          <p className="text-[var(--hp-text3)] text-xs">{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            className="mt-3 px-4 py-2 rounded-lg text-xs hp-primary-btn"
          >
            Erneut versuchen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  activeTab: string;
  horse: Horse;
  hoofPhotos: HoofPhoto[];
  documents: HorseDocument[];
  latestAppointment?: Appointment;
  onHorseUpdate: (horse: Horse) => void;
}

export function TabContentRenderer({ activeTab, horse, hoofPhotos, documents, latestAppointment, onHorseUpdate }: Props) {
  const content = (() => {
    switch (activeTab) {
      case "start":
        return (
          <div className="space-y-5">
            <HealthMonitor horseId={horse.id} />
            <HoofGrid
              hoofDetails={horse.hoof_details as HoofDetails}
              lastAppointmentDate={horse.last_appointment_date || latestAppointment?.date}
            />
            <MediaDocuments hoofPhotos={hoofPhotos} documents={documents} />
            <StammdatenAccordion horse={horse} onHorseUpdate={onHorseUpdate} />
          </div>
        );
      case "verlauf":
        return <PferdeakteTimeline horseId={horse.id} userRole="client" />;
      case "huf":
        return <PferdeakteHuf horseId={horse.id} userRole="client" />;
      case "vet":
        return <PferdeakteVet horseId={horse.id} userRole="client" />;
      case "therapie":
        return (
          <PferdeakteTherapie
            horseId={horse.id}
            horseName={horse.name}
            userRole="client"
            ownerId={horse.owner_id}
          />
        );
      case "futter":
        return <PferdeakteFutter horseId={horse.id} userRole="client" horseName={horse.name} />;
      case "bewegung":
        return <PferdeakteBewegung horseId={horse.id} userRole="client" />;
      case "medikamente":
        return <PferdeakteMedikamente horseId={horse.id} userRole="client" />;
      case "berichte":
        return <PferdeakteBerichte horseId={horse.id} userRole="client" />;
      case "tresor":
        return <PferdeakteTresor horseId={horse.id} horse={horse as any} userRole="client" />;
      default:
        return null;
    }
  })();

  return (
    <TabErrorBoundary tabName={activeTab} key={activeTab}>
      <div className="min-h-[200px]">{content}</div>
    </TabErrorBoundary>
  );
}
