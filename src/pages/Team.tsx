import { useState } from "react";
import { EmployeeList, ProviderControlCenter } from "@/components/team";
import { AbsenceManagement } from "@/components/team/AbsenceManagement";
import { MaterialAssignment } from "@/components/team/MaterialAssignment";
import {
  Users,
  LayoutDashboard,
  CalendarOff,
  Package,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  KeyRound,
} from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Section = "overview" | "employees" | "absences" | "material";

interface TileConfig {
  key: Section;
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: string;
  buttonLabel: string;
}

const TILES: TileConfig[] = [
  {
    key: "overview",
    icon: <LayoutDashboard className="h-8 w-8 text-amber-500" />,
    title: "Übersicht",
    description: "Cockpit & Team-Status",
    buttonLabel: "Öffnen",
  },
  {
    key: "employees",
    icon: <Users className="h-8 w-8 text-amber-500" />,
    title: "Mitarbeiter",
    description: "Einladen, verwalten, zuweisen",
    buttonLabel: "Verwalten",
  },
  {
    key: "absences",
    icon: <CalendarOff className="h-8 w-8 text-amber-500" />,
    title: "Abwesenheiten",
    description: "Urlaub, Krankheit, Anträge",
    buttonLabel: "Verwalten",
  },
  {
    key: "material",
    icon: <Package className="h-8 w-8 text-amber-500" />,
    title: "Material",
    description: "Werkzeug & Materialzuweisung",
    buttonLabel: "Verwalten",
  },
];

const SECTION_LABELS: Record<Section, string> = {
  overview: "Übersicht",
  employees: "Mitarbeiter",
  absences: "Abwesenheiten",
  material: "Material",
};

const SECTION_ORDER: Section[] = ["overview", "employees", "absences", "material"];

const TeamPage = () => {
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  if (activeSection) {
    const idx = SECTION_ORDER.indexOf(activeSection);
    const prev = idx > 0 ? SECTION_ORDER[idx - 1] : null;
    const next = idx < SECTION_ORDER.length - 1 ? SECTION_ORDER[idx + 1] : null;

    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
        {/* Sub-page header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 -ml-2 mb-2 text-muted-foreground"
            onClick={() => setActiveSection(null)}
          >
            <ChevronLeft className="h-4 w-4" />
            Team-Verwaltung
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="hover:text-foreground cursor-pointer"
              onClick={() => setActiveSection(null)}
            >
              Team
            </span>
            <span>›</span>
            <span className="text-foreground font-medium">{SECTION_LABELS[activeSection]}</span>
          </div>
        </div>

        {/* Content */}
        {activeSection === "overview" && <ProviderControlCenter />}
        {activeSection === "employees" && <EmployeeList />}
        {activeSection === "absences" && <AbsenceManagement />}
        {activeSection === "material" && <MaterialAssignment />}

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {prev ? (
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setActiveSection(prev)}>
              <ChevronLeft className="h-4 w-4" />
              {SECTION_LABELS[prev]}
            </Button>
          ) : <div />}
          {next ? (
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setActiveSection(next)}>
              {SECTION_LABELS[next]}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : <div />}
        </div>
      </div>
    );
  }

  // Tile overview
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          👥 Team-Verwaltung <HelpTip id="team.bereich" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verwalte dein Team, weise Termine zu und behalte den Überblick
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Mein Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TILES.map((tile) => (
            <button
              key={tile.key}
              onClick={() => setActiveSection(tile.key)}
              className="relative flex flex-col items-start text-left min-h-[160px] rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <div className="mb-2">{tile.icon}</div>
              <span className="text-base font-semibold">{tile.title}</span>
              <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tile.description}</span>
              <div className="flex-1" />
              {tile.status && (
                <span className="text-xs text-muted-foreground mt-3 truncate w-full">{tile.status}</span>
              )}
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                {tile.buttonLabel} <ChevronRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TeamPage;
