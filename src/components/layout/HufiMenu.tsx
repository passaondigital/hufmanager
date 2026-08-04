import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu, User, Settings, Mic, CreditCard, HelpCircle, Scale, FileText, Shield, LogOut,
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Bewusst schlank (Entscheidung 30.07.2026): nur Konto, Geld, Recht, Abmelden.
// Archiv, Steuer, Import und Website bleiben im ManagementHub — ein Menü mit
// zwölf Punkten liest sich wie Verwaltungssoftware.
const ITEMS: { label: string; path: string; Icon: React.ElementType }[] = [
  { label: "Profil",         path: "/management/profil",       Icon: User },
  { label: "Einstellungen",  path: "/management",              Icon: Settings },
  { label: "Voice-Guthaben", path: "/management/guthaben",     Icon: Mic },
  { label: "Abo",            path: "/management/abo",          Icon: CreditCard },
  { label: "Hilfe & FAQ",    path: "/hilfe",                   Icon: HelpCircle },
  { label: "Rechtliches",    path: "/management/rechtliches",  Icon: Scale },
  { label: "Impressum",      path: "/impressum",               Icon: FileText },
  { label: "Datenschutz",    path: "/datenschutz",             Icon: Shield },
];

// Echte Overlay-/Drawer-Ebene statt eines schwebenden Radix-Dropdowns (Bug:
// kein deckender Hintergrund -- Gruß/Orb/Eingabefeld schienen durch, keine
// eigenständige Ebene). Sheet basiert auf @radix-ui/react-dialog und bringt
// dadurch bereits alles Geforderte real mit: deckender Backdrop, Body-Scroll-
// Lock, Schließen per Escape/Außenklick, Fokus-Rückgabe zum Trigger-Button --
// keine Neuerfindung, dieselbe Komponente wie die übrigen Dialoge der App.
export function HufiMenu({ className }: { className?: string }) {
  const navigate = useNavigate();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label="Menü"
        onClick={() => setOpen(true)}
        className={className}
        style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#6B7280",
        }}
      >
        <Menu size={20} />
      </button>
      <SheetContent
        side="right"
        className="z-menu flex w-[85vw] max-w-xs flex-col overflow-y-auto p-0"
        overlayClassName="z-menu"
      >
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle>Menü</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-1 flex-col overflow-y-auto p-2">
          {ITEMS.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => go(item.path)}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <item.Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t p-2">
          <button
            type="button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              await logout();
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {loggingOut ? "Abmelden…" : "Abmelden"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
