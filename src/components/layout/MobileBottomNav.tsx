import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar, LayoutDashboard, Users, Sparkles, Receipt,
  Camera, Settings, BookOpen, CalendarCheck, Network,
  MapPin, Timer, NotebookPen, CheckSquare, ChevronLeft, ChevronRight,
  X, FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavOption {
  key: string;
  label: string;
  Icon: React.ElementType;
  path: string;
}

// Nur Routen die tatsächlich existieren
const PROVIDER_OPTIONS: NavOption[] = [
  { key: "kalender",      label: "Kalender",    Icon: Calendar,        path: "/kalender"      },
  { key: "cockpit",       label: "Home",         Icon: LayoutDashboard, path: "/home"          },
  { key: "kunden",        label: "Kunden",       Icon: Users,           path: "/kunden"        },
  { key: "pferde",        label: "Pferde",       Icon: Sparkles,        path: "/pferde"        },
  { key: "rechnungen",    label: "Rechnungen",   Icon: Receipt,         path: "/rechnungen"    },
  { key: "anfragen",      label: "Anfragen",     Icon: FileText,        path: "/anfragen"      },
  { key: "management",    label: "Management",   Icon: Settings,        path: "/management"    },
];

const CLIENT_OPTIONS: NavOption[] = [
  { key: "booking",       label: "Termine",     Icon: CalendarCheck,   path: "/client-booking"  },
  { key: "horses",        label: "Pferde",      Icon: BookOpen,        path: "/client-horses"   },
  { key: "network",       label: "Netzwerk",    Icon: Network,         path: "/client-network"  },
  { key: "management",    label: "Management",   Icon: Settings,       path: "/management"      },
];

const EMPLOYEE_OPTIONS: NavOption[] = [
  { key: "tour",      label: "Tour",      Icon: MapPin,      path: "/employee/tour"      },
  { key: "kalender",  label: "Kalender",  Icon: Calendar,    path: "/employee/kalender"  },
  { key: "hufcam",    label: "HufCam",    Icon: Camera,      path: "/employee/hufcam"    },
  { key: "notizbuch", label: "Notizen",   Icon: NotebookPen, path: "/employee/notizbuch" },
  { key: "timer",     label: "Timer",     Icon: Timer,       path: "/employee/timer"     },
  { key: "aufgaben",  label: "Aufgaben",  Icon: CheckSquare, path: "/employee"           },
];

interface SlotConfig { l1: string; l2: string; r1: string; r2: string; }

const PROVIDER_DEFAULTS:  SlotConfig = { l1: "kalender", l2: "rechnungen", r1: "kunden",  r2: "pferde" };
const CLIENT_DEFAULTS:    SlotConfig = { l1: "booking",  l2: "horses",   r1: "network", r2: "management" };
const EMPLOYEE_DEFAULTS:  SlotConfig = { l1: "tour",     l2: "kalender", r1: "hufcam",  r2: "notizbuch" };

type SlotKey = keyof SlotConfig;

function readCfg(role: string): SlotConfig {
  const defaults = defaultsFor(role);
  // cockpit = fester Mitte-Button, nicht als konfigurierbarer Slot erlaubt
  function sanitize(key: string, fallback: string): string {
    if (!key || key === "cockpit" || key === "einstellungen") return fallback;
    return key;
  }
  try {
    const s = localStorage.getItem(`hufi_nav4_${role}`);
    if (s) {
      const parsed = { ...defaults, ...JSON.parse(s) } as SlotConfig;
      return {
        l1: sanitize(parsed.l1, "kalender"),
        l2: sanitize(parsed.l2, "rechnungen"),
        r1: sanitize(parsed.r1, "kunden"),
        r2: sanitize(parsed.r2, "pferde"),
      };
    }
  } catch {}
  return defaults;
}

function defaultsFor(role: string): SlotConfig {
  if (role === "client")   return CLIENT_DEFAULTS;
  if (role === "employee") return EMPLOYEE_DEFAULTS;
  return PROVIDER_DEFAULTS;
}

function writeCfg(role: string, cfg: SlotConfig) {
  localStorage.setItem(`hufi_nav4_${role}`, JSON.stringify(cfg));
}

interface MobileBottomNavProps {
  onTranscript?: (text: string) => void;
  isRecording?: boolean;
  onVoicePress?: () => void;
}

export function MobileBottomNav({ onTranscript: _onTranscript }: MobileBottomNavProps = {}) {
  const [editSlot, setEditSlot]   = useState<SlotKey | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { role }  = useAuth();

  const effRole = role === "client" ? "client" : role === "employee" ? "employee" : "provider";
  const options = role === "client" ? CLIENT_OPTIONS : role === "employee" ? EMPLOYEE_OPTIONS : PROVIDER_OPTIONS;

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

  // Aktive Route prüfen: auch Sub-Pfade berücksichtigen
  function isActive(path: string) {
    if (path === "/home" || path === "/employee" || path === "/client-home") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  }

  return (
    <>
      {/* ── Slot-Edit-Picker (erscheint über der Nav) ── */}
      {editSlot && PreviewOpt && (
        <>
          <div
            onClick={() => setEditSlot(null)}
            style={{ position: "fixed", inset: 0, zIndex: 48, background: "rgba(0,0,0,0.2)" }}
          />
          <div style={{
            position: "fixed",
            bottom: 68,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "28rem",
            zIndex: 49,
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "0.5px solid rgba(0,0,0,0.1)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 -8px 32px rgba(0,0,0,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontWeight: 500 }}>
                {editSlot === "l1" ? "Ganz links" : editSlot === "l2" ? "Links vom Mic" : editSlot === "r1" ? "Rechts vom Mic" : "Ganz rechts"} belegen
              </p>
              <button
                onClick={() => setEditSlot(null)}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#F3F4F6", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={13} style={{ color: "#6B7280" }} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => shift(-1)}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "#F9FAFB", border: "1px solid #E5E7EB",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronLeft size={18} style={{ color: "#374151" }} />
              </button>

              <button
                onClick={confirmSelect}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  background: "rgba(249,115,22,0.08)", border: "1.5px solid #F97316",
                  borderRadius: 18, padding: "16px 28px",
                  cursor: "pointer", minWidth: 96,
                  transition: "all 0.15s",
                }}
              >
                <PreviewOpt.Icon size={24} style={{ color: "#F97316" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F97316" }}>{PreviewOpt.label}</span>
              </button>

              <button
                onClick={() => shift(1)}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "#F9FAFB", border: "1px solid #E5E7EB",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ChevronRight size={18} style={{ color: "#374151" }} />
              </button>
            </div>

            <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0 }}>
              {previewIdx + 1} / {options.length} · Tippen zum Auswählen
            </p>
          </div>
        </>
      )}

      {/* ── Nav Bar ── */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "28rem",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        // Glass-Morphism statt hartem Weiß
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
          const opt    = optFor(cfg[slot]);
          const active = isActive(opt.path);
          const editing = editSlot === slot;
          return (
            <button
              key={slot}
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
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 400, lineHeight: 1,
                letterSpacing: "0.01em",
              }}>
                {opt.label}
              </span>
            </button>
          );
        })}

        {/* Mitte: Cockpit/Home-Button */}
        {(() => {
          const homePath = role === "employee" ? "/employee" : role === "client" ? "/client-home" : "/home";
          const active = isActive(homePath);
          return (
            <button
              onClick={() => navigate(homePath)}
              aria-label="Cockpit"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, padding: "0 10px", height: "100%",
                border: "none", background: "transparent", cursor: "pointer",
                color: active ? "#F97316" : "#9CA3AF",
                transition: "color 0.15s",
              }}
            >
              <LayoutDashboard size={active ? 21 : 20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, lineHeight: 1, letterSpacing: "0.01em" }}>
                Home
              </span>
            </button>
          );
        })()}

        {/* Rechte 2 Slots */}
        {(["r1", "r2"] as SlotKey[]).map((slot) => {
          const opt    = optFor(cfg[slot]);
          const active = isActive(opt.path);
          const editing = editSlot === slot;
          return (
            <button
              key={slot}
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
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 400, lineHeight: 1,
                letterSpacing: "0.01em",
              }}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </nav>

    </>
  );
}
