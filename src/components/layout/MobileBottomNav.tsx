import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar, LayoutDashboard, Users, Sparkles, Receipt,
  Settings, CalendarCheck, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavOption {
  key: string;
  label: string;
  Icon: React.ElementType;
  path: string;
}

// Provider: Kern-Navigation (konfigurierbar)
const PROVIDER_OPTIONS: NavOption[] = [
  { key: "kalender",   label: "Kalender",    Icon: Calendar,        path: "/kalender"   },
  { key: "pferde",     label: "Pferde",      Icon: Sparkles,        path: "/pferde"     },
  { key: "kunden",     label: "Kunden",      Icon: Users,           path: "/kunden"     },
  { key: "rechnungen", label: "Rechnungen",  Icon: Receipt,         path: "/rechnungen" },
  { key: "einstellungen", label: "Einst.",   Icon: Settings,        path: "/management" },
];

// Client: Kern-Navigation
const CLIENT_OPTIONS: NavOption[] = [
  { key: "booking",    label: "Termine",     Icon: CalendarCheck,   path: "/client-booking"  },
  { key: "horses",     label: "Pferde",      Icon: Sparkles,        path: "/client-horses"   },
  { key: "einstellungen", label: "Einst.",   Icon: Settings,        path: "/client-profile"  },
];

const PROVIDER_DEFAULTS = { l1: "kalender", l2: "pferde",   r1: "kunden",  r2: "rechnungen" };
const CLIENT_DEFAULTS   = { l1: "booking",  l2: "horses",   r1: "horses",  r2: "einstellungen" };

interface SlotConfig { l1: string; l2: string; r1: string; r2: string; }
type SlotKey = keyof SlotConfig;

function readCfg(role: string): SlotConfig {
  const defaults = role === "client" ? CLIENT_DEFAULTS : PROVIDER_DEFAULTS;
  try {
    const s = localStorage.getItem(`hufmanager_nav4_${role}`);
    if (s) return { ...defaults, ...JSON.parse(s) };
  } catch {}
  return defaults;
}

function writeCfg(role: string, cfg: SlotConfig) {
  localStorage.setItem(`hufmanager_nav4_${role}`, JSON.stringify(cfg));
}

export function MobileBottomNav() {
  const [editSlot, setEditSlot]     = useState<SlotKey | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { role }  = useAuth();

  const effRole = role === "client" ? "client" : "provider";
  const options = role === "client" ? CLIENT_OPTIONS : PROVIDER_OPTIONS;

  const [cfg, setCfg] = useState<SlotConfig>(() => readCfg(effRole));

  function optFor(key: string): NavOption {
    return options.find((o) => o.key === key) ?? options[0];
  }

  const pressTimers = useRef<Record<SlotKey, ReturnType<typeof setTimeout> | null>>({
    l1: null, l2: null, r1: null, r2: null,
  });

  function startPress(slot: SlotKey) {
    pressTimers.current[slot] = setTimeout(() => {
      const idx = options.findIndex((o) => o.key === cfg[slot]);
      setPreviewIdx(idx >= 0 ? idx : 0);
      setEditSlot(slot);
    }, 600);
  }

  function endPress(slot: SlotKey) {
    if (pressTimers.current[slot]) {
      clearTimeout(pressTimers.current[slot]!);
      pressTimers.current[slot] = null;
    }
    if (!editSlot) navigate(optFor(cfg[slot]).path);
  }

  function confirmSelect() {
    if (!editSlot) return;
    const chosen = options[previewIdx];
    const next = { ...cfg, [editSlot]: chosen.key };
    setCfg(next);
    writeCfg(effRole, next);
    setEditSlot(null);
  }

  function shift(dir: -1 | 1) {
    setPreviewIdx((i) => (i + dir + options.length) % options.length);
  }

  const PreviewOpt = editSlot ? options[previewIdx] : null;

  function isActive(path: string) {
    if (path === "/home" || path === "/client-home") return location.pathname === path;
    return location.pathname.startsWith(path);
  }

  const homePath = role === "client" ? "/client-home" : "/home";

  return (
    <>
      {/* Slot-Edit-Picker */}
      {editSlot && PreviewOpt && (
        <>
          <div onClick={() => setEditSlot(null)} style={{ position: "fixed", inset: 0, zIndex: 48, background: "rgba(0,0,0,0.2)" }} />
          <div style={{
            position: "fixed", bottom: 68, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: "28rem", zIndex: 49,
            background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)", borderTop: "0.5px solid rgba(0,0,0,0.1)",
            padding: "16px", display: "flex", flexDirection: "column", alignItems: "center",
            gap: 12, boxShadow: "0 -8px 32px rgba(0,0,0,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontWeight: 500 }}>
                {editSlot === "l1" ? "Ganz links" : editSlot === "l2" ? "Links" : editSlot === "r1" ? "Rechts" : "Ganz rechts"} belegen
              </p>
              <button onClick={() => setEditSlot(null)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={13} style={{ color: "#6B7280" }} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={() => shift(-1)} style={{ width: 44, height: 44, borderRadius: "50%", background: "#F9FAFB", border: "1px solid #E5E7EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={18} style={{ color: "#374151" }} />
              </button>
              <button onClick={confirmSelect} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.08)", border: "1.5px solid #F97316", borderRadius: 18, padding: "16px 28px", cursor: "pointer", minWidth: 96 }}>
                <PreviewOpt.Icon size={24} style={{ color: "#F97316" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F97316" }}>{PreviewOpt.label}</span>
              </button>
              <button onClick={() => shift(1)} style={{ width: 44, height: 44, borderRadius: "50%", background: "#F9FAFB", border: "1px solid #E5E7EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronRight size={18} style={{ color: "#374151" }} />
              </button>
            </div>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0 }}>
              {previewIdx + 1} / {options.length} · Tippen zum Auswählen
            </p>
          </div>
        </>
      )}

      {/* Nav Bar */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "28rem", zIndex: 50,
        display: "flex", alignItems: "center",
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderTop: "0.5px solid rgba(0,0,0,0.08)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.04), 0 -4px 20px rgba(0,0,0,0.06)",
        height: 68,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {/* Linke 2 Slots */}
        {(["l1", "l2"] as SlotKey[]).map((slot) => {
          const opt     = optFor(cfg[slot]);
          const active  = isActive(opt.path);
          const editing = editSlot === slot;
          return (
            <button key={slot}
              onMouseDown={() => startPress(slot)}
              onMouseUp={() => endPress(slot)}
              onTouchStart={(e) => { e.preventDefault(); startPress(slot); }}
              onTouchEnd={(e) => { e.preventDefault(); endPress(slot); }}
              style={{
                flex: 1, height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, border: "none", cursor: "pointer",
                background: editing ? "rgba(249,115,22,0.05)" : "transparent",
                color: active ? "#F97316" : editing ? "#F97316" : "#9CA3AF",
                userSelect: "none", WebkitUserSelect: "none",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              <opt.Icon size={active ? 21 : 20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, lineHeight: 1, letterSpacing: "0.01em" }}>
                {opt.label}
              </span>
            </button>
          );
        })}

        {/* Mitte: Home-Button */}
        <button onClick={() => navigate(homePath)} aria-label="Home"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 4, padding: "0 10px", height: "100%",
            border: "none", background: "transparent", cursor: "pointer",
            color: isActive(homePath) ? "#F97316" : "#9CA3AF",
            transition: "color 0.15s",
          }}
        >
          <LayoutDashboard size={isActive(homePath) ? 21 : 20} strokeWidth={isActive(homePath) ? 2.5 : 1.8} />
          <span style={{ fontSize: 10, fontWeight: isActive(homePath) ? 700 : 400, lineHeight: 1, letterSpacing: "0.01em" }}>Home</span>
        </button>

        {/* Rechte 2 Slots */}
        {(["r1", "r2"] as SlotKey[]).map((slot) => {
          const opt     = optFor(cfg[slot]);
          const active  = isActive(opt.path);
          const editing = editSlot === slot;
          return (
            <button key={slot}
              onMouseDown={() => startPress(slot)}
              onMouseUp={() => endPress(slot)}
              onTouchStart={(e) => { e.preventDefault(); startPress(slot); }}
              onTouchEnd={(e) => { e.preventDefault(); endPress(slot); }}
              style={{
                flex: 1, height: "100%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, border: "none", cursor: "pointer",
                background: editing ? "rgba(249,115,22,0.05)" : "transparent",
                color: active ? "#F97316" : editing ? "#F97316" : "#9CA3AF",
                userSelect: "none", WebkitUserSelect: "none",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              <opt.Icon size={active ? 21 : 20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, lineHeight: 1, letterSpacing: "0.01em" }}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
