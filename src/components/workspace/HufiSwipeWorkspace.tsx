import { useCallback, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BellRing, CalendarDays, Camera, FileText, Horse, ReceiptText, RefreshCw, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceSwipe, WORKSPACE_EDGE_PX } from "@/hooks/workspace/useWorkspaceSwipe";

export const isHufiSwipeWorkspaceEnabled = () => import.meta.env.VITE_HUFI_SWIPE_WORKSPACE === "true";
type WorkspaceTile = { label: string; description: string; icon: LucideIcon; route?: string; availability: "available" | "planned" };

// Routes are verified in App.tsx; route-less tiles intentionally remain disabled.
const TILES: WorkspaceTile[] = [
  { label: "Termine", description: "Kalender öffnen", icon: CalendarDays, route: "/kalender", availability: "available" },
  { label: "Kunden", description: "Kundenverwaltung", icon: Users, route: "/kunden", availability: "available" },
  { label: "Pferde", description: "Pferdeübersicht", icon: Horse, route: "/pferde", availability: "available" },
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
  if (!isHufiSwipeWorkspaceEnabled()) return null;
  return <section aria-label="Hufi Workspace Vorschau" className="fixed inset-y-0 left-0 z-50 pointer-events-none">
    {/* Real, explicitly-sized hit zone -- a shrink-to-fit fixed box with only
        absolutely-positioned children collapses to ~0px width, which silently
        made the edge-swipe gesture unreachable on real devices. */}
    <div aria-hidden="true" className="pointer-events-auto absolute inset-y-0 left-0" style={{ width: WORKSPACE_EDGE_PX }} {...gesture} />
    <button type="button" className="pointer-events-auto absolute left-3 top-3 min-h-11 rounded-full bg-background/95 px-4 text-sm font-semibold shadow-lg ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={open} aria-expanded={isOpen} aria-controls="hufi-swipe-workspace">Workspace öffnen</button>
    {isOpen && <div id="hufi-swipe-workspace" className="pointer-events-auto absolute inset-y-0 left-0 w-[min(100vw,28rem)] overflow-y-auto bg-background p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Hufi Workspace">
      <div className="mb-6 flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">Dein Arbeitstag</p><h2 className="text-2xl font-bold tracking-tight">Workspace</h2></div><button type="button" onClick={() => setIsOpen(false)} className="grid size-11 place-items-center rounded-full border border-border" aria-label="Workspace schließen"><X className="size-5" aria-hidden="true" /></button></div>
      <p className="mb-5 text-sm text-muted-foreground">Wische vom linken Rand nach rechts oder nutze diese Schaltfläche. Das Hamburger-Menü bleibt für Profil, Einstellungen, Guthaben, Abo, Hilfe, Rechtliches und Abmelden reserviert.</p>
      <div className="grid grid-cols-2 gap-3">{TILES.map((tile) => { const Icon = tile.icon; const available = tile.availability === "available" && tile.route; return <button key={tile.label} type="button" disabled={!available} onClick={() => { if (tile.route) navigate(tile.route); }} className="min-h-36 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/50 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Icon className="mb-5 size-6 text-primary" aria-hidden="true" /><span className="block font-semibold">{tile.label}</span><span className="mt-1 block text-xs text-muted-foreground">{available ? tile.description : "Demnächst"}</span></button>; })}</div>
    </div>}
  </section>;
}
