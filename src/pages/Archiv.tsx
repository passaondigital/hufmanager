import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useViewMode } from "@/hooks/useViewMode";
import {
  LayoutDashboard, Users, Sparkles, Calendar, Receipt, BarChart2,
  Camera, Filter, Settings, BookOpen, CalendarCheck, FolderOpen,
  Network, StickyNote, Lock, Shield, MapPin, Package, Timer,
  CheckSquare, NotebookPen, Coins, ArrowLeft, Link2, LogOut,
} from "lucide-react";

type TileConfig = { label: string; icon: React.ElementType; path: string; color: string };

const PROVIDER_TILES: TileConfig[] = [
  { label: "Cockpit",        icon: LayoutDashboard, path: "/cockpit",           color: "#F97316" },
  { label: "Kunden",         icon: Users,            path: "/kunden",            color: "#10B981" },
  { label: "Pferde",         icon: Sparkles,         path: "/pferde",            color: "#8B5CF6" },
  { label: "Kalender",       icon: Calendar,         path: "/kalender",          color: "#3B82F6" },
  { label: "Rechnungen",     icon: Receipt,          path: "/rechnungen",        color: "#F59E0B" },
  { label: "Analyse",        icon: BarChart2,        path: "/analyse",           color: "#6B7280" },
  { label: "HufCam",         icon: Camera,           path: "/hufcam",            color: "#EF4444" },
  { label: "Hufi Connect",   icon: Link2,            path: "/hm-connect",        color: "#06B6D4" },
  { label: "Trichter",       icon: Filter,           path: "/anfragen",          color: "#14B8A6" },
  { label: "Einstellungen",  icon: Settings,         path: "/einstellungen",     color: "#6366F1" },
  { label: "Credits",        icon: Coins,            path: "/credits",           color: "#F59E0B" },
];

const OWNER_TILES: TileConfig[] = [
  { label: "Pferdeakte",     icon: BookOpen,       path: "/client-horses",              color: "#8B5CF6" },
  { label: "Termine",        icon: CalendarCheck,  path: "/client-booking",             color: "#3B82F6" },
  { label: "Wissen",         icon: Sparkles,       path: "/client-home",                color: "#10B981" },
  { label: "Dokumente",      icon: FolderOpen,     path: "/client-profile",             color: "#F59E0B" },
  { label: "Netzwerk",       icon: Network,        path: "/client-network",             color: "#14B8A6" },
  { label: "Hufi Connect",   icon: Link2,          path: "/hm-connect",                 color: "#06B6D4" },
  { label: "Notizen",        icon: StickyNote,     path: "/notizen",                    color: "#6366F1" },
  { label: "Tresor",         icon: Lock,           path: "/client-profile",             color: "#F97316" },
  { label: "Datenschutz",    icon: Shield,         path: "/datenschutz-einstellungen",  color: "#EC4899" },
  { label: "Einstellungen",  icon: Settings,       path: "/einstellungen",              color: "#6B7280" },
];

const EMPLOYEE_TILES: TileConfig[] = [
  { label: "Cockpit",        icon: LayoutDashboard, path: "/employee",                          color: "#F97316" },
  { label: "Tour",           icon: MapPin,           path: "/employee/tour",                     color: "#10B981" },
  { label: "HufCam",         icon: Camera,           path: "/employee/hufcam",                   color: "#EF4444" },
  { label: "Material",       icon: Package,          path: "/employee/material",                 color: "#F59E0B" },
  { label: "Timer",          icon: Timer,            path: "/employee/timer",                    color: "#3B82F6" },
  { label: "Aufgaben",       icon: CheckSquare,      path: "/employee",                          color: "#14B8A6" },
  { label: "Kalender",       icon: Calendar,         path: "/employee/kalender",                 color: "#6366F1" },
  { label: "Notizbuch",      icon: NotebookPen,      path: "/employee/notizbuch",                color: "#8B5CF6" },
  { label: "Einstellungen",  icon: Settings,         path: "/employee/management/einstellungen", color: "#6B7280" },
];

export default function Archiv() {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const { mode } = useViewMode();

  const isEmployee = role === "employee";
  const isClient   = role === "client";
  // Provider in "privat" mode sees owner tiles
  const isPrivatMode = role === "provider" && mode === "privat";

  const tiles    = isEmployee ? EMPLOYEE_TILES : (isClient || isPrivatMode) ? OWNER_TILES : PROVIDER_TILES;
  const subtitle = isEmployee ? "Mitarbeiter"
                 : isClient ? "Pferdebesitzer"
                 : isPrivatMode ? "Privat-Modus"
                 : "Profi";

  const homeRoute = isEmployee ? "/employee"
                  : isClient ? "/client-home"
                  : isPrivatMode ? "/client-home"
                  : "/home";

  async function handleLogout() {
    await signOut();
    navigate("/auth");
  }

  return (
    <div style={{ background: "#F5F5F5", minHeight: "100dvh", padding: "24px 16px 100px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(homeRoute)}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFFFFF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", flexShrink: 0 }}
        >
          <ArrowLeft size={18} style={{ color: "#1A1A1A" }} />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", margin: 0, letterSpacing: "-0.3px" }}>
            Menü
          </h1>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>{subtitle}</p>
        </div>
      </div>

      {/* Tile grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {tiles.map((item) => (
          <button
            key={item.path + item.label}
            onClick={() => navigate(item.path)}
            style={{ background: "#FFFFFF", borderRadius: 18, padding: "18px 8px 16px", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", transition: "transform 0.1s" }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
            onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${item.color}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <item.icon size={22} style={{ color: item.color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", textAlign: "center" }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Logout */}
      <div style={{ marginTop: 28 }}>
        <button
          onClick={handleLogout}
          style={{ width: "100%", height: 48, borderRadius: 14, background: "#FFFFFF", border: "1px solid #FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <LogOut size={18} style={{ color: "#EF4444" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#EF4444", fontFamily: "inherit" }}>Abmelden</span>
        </button>
      </div>
    </div>
  );
}
