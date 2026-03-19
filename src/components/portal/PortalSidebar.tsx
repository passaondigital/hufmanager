import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3, Package, ShoppingCart, Users, Settings,
  FileText, AlertTriangle, GraduationCap, BookOpen, Award,
  LayoutDashboard, ClipboardList, CalendarDays, Wrench, Link2,
} from "lucide-react";
import type { Organization } from "@/hooks/useOrganization";

const NAV_ITEMS: Record<string, { label: string; icon: React.ElementType; path: string }[]> = {
  insurance: [
    { label: "Dashboard", icon: LayoutDashboard, path: "" },
    { label: "Kalender", icon: CalendarDays, path: "/kalender" },
    { label: "Policen", icon: FileText, path: "/policen" },
    { label: "Schadensfälle", icon: AlertTriangle, path: "/claims" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Team", icon: Users, path: "/team" },
    { label: "HM Connect", icon: Link2, path: "/connect" },
    { label: "Management", icon: Wrench, path: "/management" },
    { label: "Einstellungen", icon: Settings, path: "/settings" },
  ],
  manufacturer: [
    { label: "Dashboard", icon: LayoutDashboard, path: "" },
    { label: "Kalender", icon: CalendarDays, path: "/kalender" },
    { label: "Produkte", icon: Package, path: "/produkte" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Schulungen", icon: GraduationCap, path: "/schulungen" },
    { label: "Team", icon: Users, path: "/team" },
    { label: "HM Connect", icon: Link2, path: "/connect" },
    { label: "Management", icon: Wrench, path: "/management" },
    { label: "Einstellungen", icon: Settings, path: "/settings" },
  ],
  supplier: [
    { label: "Dashboard", icon: LayoutDashboard, path: "" },
    { label: "Kalender", icon: CalendarDays, path: "/kalender" },
    { label: "Produkte", icon: Package, path: "/produkte" },
    { label: "Bestellungen", icon: ShoppingCart, path: "/orders" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Team", icon: Users, path: "/team" },
    { label: "HM Connect", icon: Link2, path: "/connect" },
    { label: "Management", icon: Wrench, path: "/management" },
    { label: "Einstellungen", icon: Settings, path: "/settings" },
  ],
  school: [
    { label: "Dashboard", icon: LayoutDashboard, path: "" },
    { label: "Kalender", icon: CalendarDays, path: "/kalender" },
    { label: "Kurse", icon: BookOpen, path: "/kurse" },
    { label: "Schüler", icon: GraduationCap, path: "/schueler" },
    { label: "Prüfungen", icon: Award, path: "/pruefungen" },
    { label: "Team", icon: Users, path: "/team" },
    { label: "HM Connect", icon: Link2, path: "/connect" },
    { label: "Management", icon: Wrench, path: "/management" },
    { label: "Einstellungen", icon: Settings, path: "/settings" },
  ],
  association: [
    { label: "Dashboard", icon: LayoutDashboard, path: "" },
    { label: "Kalender", icon: CalendarDays, path: "/kalender" },
    { label: "Standards", icon: ClipboardList, path: "/standards" },
    { label: "Mitglieder", icon: Users, path: "/mitglieder" },
    { label: "Statistiken", icon: BarChart3, path: "/statistiken" },
    { label: "HM Connect", icon: Link2, path: "/connect" },
    { label: "Management", icon: Wrench, path: "/management" },
    { label: "Einstellungen", icon: Settings, path: "/settings" },
  ],
  veterinary: [
    { label: "Dashboard", icon: LayoutDashboard, path: "" },
    { label: "Kalender", icon: CalendarDays, path: "/kalender" },
    { label: "Patienten", icon: Users, path: "/patienten" },
    { label: "Befunde", icon: FileText, path: "/befunde" },
    { label: "Impfungen", icon: ClipboardList, path: "/impfungen" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Team", icon: Users, path: "/team" },
    { label: "HM Connect", icon: Link2, path: "/connect" },
    { label: "Management", icon: Wrench, path: "/management" },
    { label: "Einstellungen", icon: Settings, path: "/settings" },
  ],
};

interface PortalSidebarProps {
  org: Organization;
  basePath: string;
}

export function PortalSidebar({ org, basePath }: PortalSidebarProps) {
  const location = useLocation();
  const items = NAV_ITEMS[org.type || "other"] || NAV_ITEMS.association;

  return (
    <aside className="w-60 border-r bg-card min-h-screen p-4 space-y-1">
      {/* Org header */}
      <div className="flex items-center gap-3 mb-6 px-2">
        {org.logo_url ? (
          <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: org.brand_color_primary || "hsl(var(--primary))" }}
          >
            {org.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{org.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{org.type} Portal</p>
        </div>
      </div>

      {/* Nav */}
      {items.map((item) => {
        const fullPath = `${basePath}${item.path}`;
        const isActive = location.pathname === fullPath;
        return (
          <Link
            key={item.path}
            to={fullPath}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
