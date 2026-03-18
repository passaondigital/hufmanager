import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Play, History, Footprints, Stethoscope, Activity, FileText, Lock,
} from "lucide-react";

const PFERDEAKTE_TABS = [
  { value: "start", label: "Start", icon: Play, category: "overview" },
  { value: "verlauf", label: "Verlauf", icon: History, category: "overview" },
  { value: "huf", label: "Huf", icon: Footprints, category: "medical" },
  { value: "vet", label: "Vet", icon: Stethoscope, category: "medical" },
  { value: "therapie", label: "Therapie", icon: Activity, category: "medical" },
  { value: "berichte", label: "Berichte", icon: FileText, category: "docs" },
  { value: "tresor", label: "Tresor", icon: Lock, category: "docs" },
] as const;

export type PferdeakteTabValue = typeof PFERDEAKTE_TABS[number]["value"];

const CATEGORIES = [
  { key: "overview", label: "Übersicht" },
  { key: "medical", label: "Medizin & Pflege" },
  { key: "docs", label: "Dokumente" },
] as const;

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function PferdeakteTabGrid({ activeTab, onTabChange }: Props) {
  const isMobile = useIsMobile();

  // Desktop: horizontal pill bar (unchanged behavior)
  if (!isMobile) {
    return (
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4">
        <div className="flex overflow-x-auto gap-1 py-3 scrollbar-hide">
          {PFERDEAKTE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 font-medium"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Mobile: categorized icon grid
  return (
    <div className="space-y-3 py-2">
      {CATEGORIES.map((cat) => {
        const tabs = PFERDEAKTE_TABS.filter((t) => t.category === cat.key);
        return (
          <div key={cat.key}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
              {cat.label}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all min-h-[64px]",
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                        : "bg-card border border-border text-muted-foreground hover:bg-accent/50 active:scale-95"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                    <span className={cn("text-[11px] leading-tight", isActive ? "font-semibold" : "font-medium")}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PFERDEAKTE_TABS };
