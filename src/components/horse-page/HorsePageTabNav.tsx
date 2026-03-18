import { Play, History, Footprints, Stethoscope, Activity, FileText, Lock } from "lucide-react";
import type { HorsePageTab } from "./index";

const TABS: { value: HorsePageTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "start", label: "Start", icon: Play },
  { value: "verlauf", label: "Verlauf", icon: History },
  { value: "huf", label: "Huf", icon: Footprints },
  { value: "vet", label: "Vet", icon: Stethoscope },
  { value: "therapie", label: "Therapie", icon: Activity },
  { value: "berichte", label: "Berichte", icon: FileText },
  { value: "tresor", label: "Tresor", icon: Lock },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function HorsePageTabNav({ activeTab, onTabChange }: Props) {
  return (
    <div className="px-4">
      {/* Scrollable pill bar */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium 
                whitespace-nowrap flex-shrink-0 transition-all duration-200
                ${isActive
                  ? "bg-[var(--hp-amber)] text-[var(--hp-bg)] shadow-sm"
                  : "bg-[var(--hp-bg3)] border border-[var(--hp-border)] text-[var(--hp-text2)] hover:border-[var(--hp-amber)] hover:text-[var(--hp-amber)]"
                }
              `}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dot indicator */}
      <div className="flex justify-center gap-1 mt-2">
        {TABS.map((tab) => (
          <div
            key={tab.value}
            className={`h-1 rounded-full transition-all duration-200 ${
              activeTab === tab.value
                ? "w-4 bg-[var(--hp-amber)]"
                : "w-1.5 bg-[var(--hp-text3)] opacity-30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
