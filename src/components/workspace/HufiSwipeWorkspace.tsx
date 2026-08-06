import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BellRing, CalendarDays, Camera, FileText, Footprints, ReceiptText, RefreshCw, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceSwipe, WORKSPACE_EDGE_PX } from "@/hooks/workspace/useWorkspaceSwipe";
import { HufiButton, HufiIconButton, HufiPanel, HufiTile } from "@/design-system/hufi/primitives";
import { HufiOfflineAudioDrafts } from "@/components/offline/HufiOfflineAudioDrafts";
import styles from "@/styles/hufi/primitives.module.css";
import { cn } from "@/lib/utils";

export const isHufiSwipeWorkspaceEnabled = () => import.meta.env.VITE_HUFI_SWIPE_WORKSPACE === "true";

// Additiver, framework-freier Öffnungsweg für andere isolierte Komponenten
// (z. B. den "Workspace öffnen"-Fehlerhinweis bei Billing-/Providerfehlern
// in HufiAssistantExperience.tsx). Kein React-Context/Prop-Drilling durch
// MobileShell nötig -- diese Komponente bleibt ein reines Geschwisterelement,
// MobileShell selbst bleibt unverändert.
export const HUFI_OPEN_WORKSPACE_EVENT = "hufi:open-workspace";
type WorkspaceTile = { label: string; description: string; icon: LucideIcon; route?: string; availability: "available" | "planned" };

// Routes are verified in App.tsx; route-less tiles intentionally remain disabled.
const TILES: WorkspaceTile[] = [
  { label: "Termine", description: "Kalender öffnen", icon: CalendarDays, route: "/kalender", availability: "available" },
  { label: "Kunden", description: "Kundenverwaltung", icon: Users, route: "/kunden", availability: "available" },
  { label: "Pferde", description: "Pferdeübersicht", icon: Footprints, route: "/pferde", availability: "available" },
  { label: "Rechnungen", description: "Rechnungen verwalten", icon: ReceiptText, route: "/rechnungen", availability: "available" },
  { label: "Beobachtung", description: "Beobachtungen", icon: BellRing, route: "/hufi-observation-lab", availability: "available" },
  { label: "Kamera", description: "Kamera ist in Vorbereitung", icon: Camera, availability: "planned" },
  { label: "Dokumente", description: "Mein Office öffnen", icon: FileText, route: "/mein-office", availability: "available" },
  { label: "Synchronisierung", description: "Offline-Synchronisierung folgt", icon: RefreshCw, availability: "planned" },
];

export function HufiSwipeWorkspacePreview() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const open = useCallback(() => setIsOpen(true), []);
  const gesture = useWorkspaceSwipe(open);

  useEffect(() => {
    if (!isHufiSwipeWorkspaceEnabled()) return;
    window.addEventListener(HUFI_OPEN_WORKSPACE_EVENT, open);
    return () => window.removeEventListener(HUFI_OPEN_WORKSPACE_EVENT, open);
  }, [open]);

  if (!isHufiSwipeWorkspaceEnabled()) return null;
  return <section aria-label="Hufi Workspace Vorschau" className={cn(styles.root, "fixed inset-y-0 left-0 z-50 pointer-events-none")}>
    {/* Real, explicitly-sized hit zone -- a shrink-to-fit fixed box with only
        absolutely-positioned children collapses to ~0px width, which silently
        made the edge-swipe gesture unreachable on real devices. */}
    <div aria-hidden="true" className="pointer-events-auto absolute inset-y-0 left-0" style={{ width: WORKSPACE_EDGE_PX }} {...gesture} />
    {/* top-16 statt top-3: der Hufi-Experience-Header (Wordmark links, Status+Menü rechts)
        reicht bis ca. y=54px, ein top-3-Button darunter würde das Wordmark überdecken. */}
    <HufiButton type="button" variant="secondary" className="pointer-events-auto absolute left-3 top-16 shadow-lg" onClick={open} aria-expanded={isOpen} aria-controls="hufi-swipe-workspace">Workspace öffnen</HufiButton>
    {isOpen && <HufiPanel id="hufi-swipe-workspace" className="pointer-events-auto absolute inset-y-0 left-0 w-[min(100vw,28rem)] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Hufi Workspace">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--hufi-muted)" }}>Dein Arbeitstag</p>
          <h2 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Workspace</h2>
        </div>
        <HufiIconButton onClick={() => setIsOpen(false)} aria-label="Workspace schließen"><X size={20} aria-hidden="true" /></HufiIconButton>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 13, lineHeight: 1.5, color: "var(--hufi-muted)" }}>Wische vom linken Rand nach rechts oder nutze diese Schaltfläche. Das Hamburger-Menü bleibt für Profil, Einstellungen, Guthaben, Abo, Hilfe, Rechtliches und Abmelden reserviert.</p>
      <div className={styles.tiles}>{TILES.map((tile) => { const Icon = tile.icon; const available = tile.availability === "available" && tile.route; return <HufiTile key={tile.label} icon={<Icon size={22} aria-hidden="true" />} title={tile.label} description={available ? tile.description : "Demnächst"} disabled={!available} aria-disabled={!available} style={{ opacity: available ? 1 : 0.55, cursor: available ? "pointer" : "not-allowed" }} onClick={() => { if (tile.route) navigate(tile.route); }} />; })}</div>
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--hufi-line)" }}>
        <HufiOfflineAudioDrafts />
      </div>
    </HufiPanel>}
  </section>;
}
