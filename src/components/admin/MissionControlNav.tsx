import { cn } from "@/lib/utils";
import {
  Users, AlertTriangle, Globe, Building2, Settings, FileText,
  ClipboardList, Megaphone, Shield, Sparkles, Eye, Target,
  PiggyBank, Clock, Euro, ScrollText, BarChart3,
} from "lucide-react";
import { useState } from "react";

export interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

export interface NavItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface MissionControlNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  providerCount?: number;
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: "users",
    label: "Nutzer",
    icon: <Users className="w-4 h-4" />,
    items: [
      { value: "platform", label: "Plattform-Übersicht", icon: <BarChart3 className="w-4 h-4" /> },
      { value: "providers", label: "Provider", icon: <Users className="w-4 h-4" /> },
      { value: "partners", label: "Partner", icon: <Globe className="w-4 h-4" /> },
      { value: "employees", label: "Mitarbeiter", icon: <Building2 className="w-4 h-4" /> },
      { value: "escalations", label: "Eskalationen", icon: <AlertTriangle className="w-4 h-4" /> },
    ],
  },
  {
    id: "finance",
    label: "Finanzen",
    icon: <Euro className="w-4 h-4" />,
    items: [
      { value: "revenue", label: "Einnahmen", icon: <PiggyBank className="w-4 h-4" /> },
      { value: "payments", label: "Zahlungen", icon: <Euro className="w-4 h-4" /> },
      { value: "invoices", label: "Rechnungen", icon: <FileText className="w-4 h-4" /> },
      { value: "contracts", label: "Verträge", icon: <ScrollText className="w-4 h-4" /> },
      { value: "hufrente", label: "Hufrente", icon: <Shield className="w-4 h-4" /> },
    ],
  },
  {
    id: "growth",
    label: "Wachstum",
    icon: <Target className="w-4 h-4" />,
    items: [
      { value: "stats", label: "Statistiken", icon: <Settings className="w-4 h-4" /> },
      { value: "funnel", label: "Funnel", icon: <Target className="w-4 h-4" /> },
      { value: "retention", label: "Fristen", icon: <Clock className="w-4 h-4" /> },
      { value: "browsers", label: "Browser", icon: <Globe className="w-4 h-4" /> },
      { value: "demo", label: "Demo", icon: <Eye className="w-4 h-4" /> },
    ],
  },
  {
    id: "platform",
    label: "Plattform",
    icon: <Shield className="w-4 h-4" />,
    items: [
      { value: "rollout", label: "Feature Rollout", icon: <Sparkles className="w-4 h-4" /> },
      { value: "versions", label: "Release Control", icon: <Shield className="w-4 h-4" /> },
      { value: "compliance", label: "Compliance", icon: <Shield className="w-4 h-4" /> },
      { value: "succession", label: "Nachfolge", icon: <Shield className="w-4 h-4" /> },
    ],
  },
  {
    id: "content",
    label: "Content & Tools",
    icon: <Megaphone className="w-4 h-4" />,
    items: [
      { value: "tools", label: "Broadcast & Feedback", icon: <Megaphone className="w-4 h-4" /> },
      { value: "blog", label: "Blog", icon: <FileText className="w-4 h-4" /> },
      { value: "glossary", label: "Glossar", icon: <FileText className="w-4 h-4" /> },
      { value: "email-marketing", label: "E-Mail Marketing", icon: <Megaphone className="w-4 h-4" /> },
      { value: "activity", label: "Aktivitäts-Log", icon: <ClipboardList className="w-4 h-4" /> },
    ],
  },
];

export function MissionControlNav({ activeTab, onTabChange, providerCount }: MissionControlNavProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(() => {
    // Auto-expand the section containing the active tab
    const section = NAV_SECTIONS.find(s => s.items.some(i => i.value === activeTab));
    return section?.id || "users";
  });

  return (
    <nav className="space-y-1">
      {NAV_SECTIONS.map((section) => {
        const isExpanded = expandedSection === section.id;
        const hasActiveItem = section.items.some(i => i.value === activeTab);

        return (
          <div key={section.id}>
            <button
              onClick={() => setExpandedSection(isExpanded ? null : section.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                hasActiveItem
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {section.icon}
              <span className="flex-1 text-left">{section.label}</span>
              <svg
                className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-3">
                {section.items.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => onTabChange(item.value)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                      activeTab === item.value
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.value === "providers" && providerCount !== undefined && (
                      <span className={cn(
                        "text-[11px] tabular-nums",
                        activeTab === item.value ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {providerCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Mobile version: horizontal pill selector grouped by category */
export function MissionControlNavMobile({ activeTab, onTabChange, providerCount }: MissionControlNavProps) {
  return (
    <div className="space-y-3">
      {NAV_SECTIONS.map((section) => (
        <div key={section.id}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-1">
            {section.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {section.items.map((item) => (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  activeTab === item.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                )}
              >
                {item.icon}
                {item.label}
                {item.value === "providers" && providerCount !== undefined && (
                  <span className="text-[10px] opacity-70">({providerCount})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { NAV_SECTIONS };
