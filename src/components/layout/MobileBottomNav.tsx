import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Mic, Calendar, LayoutDashboard, Users, Sparkles, Receipt,
  Camera, StickyNote, Settings, BookOpen, CalendarCheck, Network,
  MapPin, Timer, NotebookPen, CheckSquare, ChevronLeft, ChevronRight,
  X,
} from "lucide-react";
import { HufiVoiceModal } from "@/components/HufiVoiceModal";
import { useAuth } from "@/hooks/useAuth";

interface NavOption {
  key: string;
  label: string;
  Icon: React.ElementType;
  path: string;
}

const PROVIDER_OPTIONS: NavOption[] = [
  { key: "kalender",      label: "Kalender",     Icon: Calendar,        path: "/kalender"      },
  { key: "cockpit",       label: "Cockpit",       Icon: LayoutDashboard, path: "/home"       },
  { key: "kunden",        label: "Kunden",        Icon: Users,           path: "/kunden"        },
  { key: "pferde",        label: "Pferde",        Icon: Sparkles,        path: "/pferde"        },
  { key: "rechnungen",    label: "Rechnungen",    Icon: Receipt,         path: "/rechnungen"    },
  { key: "hufcam",        label: "HufCam",        Icon: Camera,          path: "/hufcam"        },
  { key: "notizen",       label: "Notizen",       Icon: StickyNote,      path: "/notizen"       },
  { key: "einstellungen", label: "Einstellungen", Icon: Settings,        path: "/einstellungen" },
];

const CLIENT_OPTIONS: NavOption[] = [
  { key: "booking",       label: "Termine",       Icon: CalendarCheck,   path: "/client-booking"  },
  { key: "horses",        label: "Pferdeakte",    Icon: BookOpen,        path: "/client-horses"   },
  { key: "network",       label: "Netzwerk",      Icon: Network,         path: "/client-network"  },
  { key: "notizen",       label: "Notizen",       Icon: StickyNote,      path: "/notizen"         },
  { key: "kalender",      label: "Kalender",      Icon: Calendar,        path: "/client-booking"  },
  { key: "einstellungen", label: "Einstellungen", Icon: Settings,        path: "/einstellungen"   },
];

const EMPLOYEE_OPTIONS: NavOption[] = [
  { key: "tour",          label: "Tour",          Icon: MapPin,          path: "/employee/tour"          },
  { key: "kalender",      label: "Kalender",      Icon: Calendar,        path: "/employee/kalender"      },
  { key: "hufcam",        label: "HufCam",        Icon: Camera,          path: "/employee/hufcam"        },
  { key: "notizbuch",     label: "Notizbuch",     Icon: NotebookPen,     path: "/employee/notizbuch"     },
  { key: "timer",         label: "Timer",         Icon: Timer,           path: "/employee/timer"         },
  { key: "aufgaben",      label: "Aufgaben",      Icon: CheckSquare,     path: "/employee"               },
];

// 4 slot config: l1=leftmost, l2=left-of-mic, r1=right-of-mic, r2=rightmost
interface SlotConfig { l1: string; l2: string; r1: string; r2: string; }

const PROVIDER_DEFAULTS:  SlotConfig = { l1: "kalender", l2: "cockpit",  r1: "kunden",   r2: "pferde"  };
const CLIENT_DEFAULTS:    SlotConfig = { l1: "booking",  l2: "horses",   r1: "network",  r2: "notizen" };
const EMPLOYEE_DEFAULTS:  SlotConfig = { l1: "tour",     l2: "kalender", r1: "hufcam",   r2: "notizbuch" };

type SlotKey = keyof SlotConfig;

function readCfg(role: string): SlotConfig {
  try {
    const s = localStorage.getItem(`hufi_nav4_${role}`);
    if (s) return { ...defaultsFor(role), ...JSON.parse(s) };
  } catch {}
  return defaultsFor(role);
}

function defaultsFor(role: string) {
  if (role === "client")   return CLIENT_DEFAULTS;
  if (role === "employee") return EMPLOYEE_DEFAULTS;
  return PROVIDER_DEFAULTS;
}

function writeCfg(role: string, cfg: SlotConfig) {
  localStorage.setItem(`hufi_nav4_${role}`, JSON.stringify(cfg));
}

interface MobileBottomNavProps { onTranscript?: (text: string) => void; }

export function MobileBottomNav({ onTranscript }: MobileBottomNavProps = {}) {
  const [voiceOpen, setVoiceOpen]   = useState(false);
  const [editSlot, setEditSlot]     = useState<SlotKey | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const navigate   = useNavigate();
  const location   = useLocation();
  const { role }   = useAuth();

  const effRole = role === "client" ? "client" : role === "employee" ? "employee" : "provider";
  const options = role === "client" ? CLIENT_OPTIONS : role === "employee" ? EMPLOYEE_OPTIONS : PROVIDER_OPTIONS;

  const [cfg, setCfg] = useState<SlotConfig>(() => readCfg(effRole));

  function optFor(key: string): NavOption {
    return options.find((o) => o.key === key) ?? options[0];
  }

  const slots: SlotKey[] = ["l1", "l2", "r1", "r2"];
  const pressTimers = useRef<Record<SlotKey, ReturnType<typeof setTimeout> | null>>({
    l1: null, l2: null, r1: null, r2: null,
  });

  function startPress(slot: SlotKey) {
    pressTimers.current[slot] = setTimeout(() => {
      const currentKey = cfg[slot];
      const idx = options.findIndex((o) => o.key === currentKey);
      setPreviewIdx(idx >= 0 ? idx : 0);
      setEditSlot(slot);
    }, 500);
  }

  function endPress(slot: SlotKey) {
    if (pressTimers.current[slot]) {
      clearTimeout(pressTimers.current[slot]!);
      pressTimers.current[slot] = null;
    }
    if (!editSlot) {
      navigate(optFor(cfg[slot]).path);
    }
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

  return (
    <>
      {/* ── Edit mode picker (appears above nav) ── */}
      {editSlot && PreviewOpt && (
        <>
          <div
            onClick={() => setEditSlot(null)}
            style={{ position: "fixed", inset: 0, zIndex: 48 }}
          />
          <div style={{
            position: "fixed",
            bottom: 68,
            left: 0, right: 0,
            zIndex: 49,
            background: "#FFFFFF",
            borderTop: "1px solid #E5E7EB",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
                {editSlot === "l1" ? "Ganz links" : editSlot === "l2" ? "Links vom Mic" : editSlot === "r1" ? "Rechts vom Mic" : "Ganz rechts"} belegen
              </p>
              <button
                onClick={() => setEditSlot(null)}
                style={{ width: 24, height: 24, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={12} style={{ color: "#9CA3AF" }} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <button
                onClick={() => shift(-1)}
                style={{ width: 40, height: 40, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <ChevronLeft size={20} style={{ color: "#374151" }} />
              </button>

              <button
                onClick={confirmSelect}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  background: "rgba(249,115,22,0.08)", border: "2px solid #F97316",
                  borderRadius: 16, padding: "14px 24px",
                  cursor: "pointer", minWidth: 90,
                }}
              >
                <PreviewOpt.Icon size={26} style={{ color: "#F97316" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F97316" }}>{PreviewOpt.label}</span>
              </button>

              <button
                onClick={() => shift(1)}
                style={{ width: 40, height: 40, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <ChevronRight size={20} style={{ color: "#374151" }} />
              </button>
            </div>

            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
              {previewIdx + 1} / {options.length} — Tippen zum Auswählen
            </p>
          </div>
        </>
      )}

      {/* ── Nav bar ── */}
      <nav style={{
        background: "#FFFFFF",
        borderTop: "1px solid #E5E7EB",
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        height: 68,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {/* Left 2 slots */}
        {(["l1", "l2"] as SlotKey[]).map((slot) => {
          const opt = optFor(cfg[slot]);
          const active = location.pathname === opt.path;
          const isEditing = editSlot === slot;
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
                gap: 3, background: isEditing ? "rgba(249,115,22,0.06)" : "transparent",
                border: "none", cursor: "pointer",
                color: active ? "#F97316" : isEditing ? "#F97316" : "#9CA3AF",
                userSelect: "none", WebkitUserSelect: "none",
                transition: "background 0.15s",
              }}
            >
              <opt.Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, lineHeight: 1 }}>{opt.label}</span>
            </button>
          );
        })}

        {/* Center: Mic */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
          <button
            onClick={() => setVoiceOpen(true)}
            style={{
              width: 54, height: 54, borderRadius: "50%",
              background: "#F97316",
              border: "3px solid #FFFFFF",
              boxShadow: "0 4px 16px rgba(249,115,22,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              marginTop: -20,
            }}
          >
            <Mic size={22} style={{ color: "#FFFFFF" }} />
          </button>
        </div>

        {/* Right 2 slots */}
        {(["r1", "r2"] as SlotKey[]).map((slot) => {
          const opt = optFor(cfg[slot]);
          const active = location.pathname === opt.path;
          const isEditing = editSlot === slot;
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
                gap: 3, background: isEditing ? "rgba(249,115,22,0.06)" : "transparent",
                border: "none", cursor: "pointer",
                color: active ? "#F97316" : isEditing ? "#F97316" : "#9CA3AF",
                userSelect: "none", WebkitUserSelect: "none",
                transition: "background 0.15s",
              }}
            >
              <opt.Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, lineHeight: 1 }}>{opt.label}</span>
            </button>
          );
        })}
      </nav>

      <HufiVoiceModal
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onTranscript={(text) => { setVoiceOpen(false); onTranscript?.(text); }}
      />
    </>
  );
}
