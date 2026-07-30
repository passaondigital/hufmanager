import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu, User, Settings, Mic, CreditCard, HelpCircle, Scale, FileText, Shield, LogOut,
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function HufiMenu({ className }: { className?: string }) {
  const navigate = useNavigate();
  const logout = useLogout();
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Menü"
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {ITEMS.map((item) => (
          <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)} className="min-h-11">
            <item.Icon className="h-4 w-4 mr-2" />
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive min-h-11"
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            await logout();
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {loggingOut ? "Abmelden…" : "Abmelden"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
