import {
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  CircleHelp,
  FileText,
  LifeBuoy,
  LogOut,
  Monitor,
  Moon,
  ReceiptText,
  Settings,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

const groups = [
  {
    title: "Organisation",
    items: [
      { label: "Kalender & Termine", description: "Termine planen, verschieben und den Arbeitstag organisieren", path: "/kalender", icon: CalendarDays },
      { label: "Anfragen", description: "Neue Kundenanfragen und offene Kontakte", path: "/anfragen", icon: FileText },
      { label: "Kundenzugang / KundenApp", description: "Kunden, Freigaben und den kostenlosen Besitzerzugang verwalten", path: "/kunden", icon: UsersRound },
    ],
  },
  {
    title: "Betrieb",
    items: [
      { label: "Ausgaben & Belege", description: "Betriebskosten und Belege erfassen", path: "/ausgaben", icon: ReceiptText },
      { label: "Fuhrpark & Fahrtenbuch", description: "Fahrzeug, Kilometer und laufende Kosten", path: "/fuhrpark", icon: Car },
      { label: "Einstellungen", description: "Betrieb, Profil, Sicherheit und Kommunikation", path: "/management", icon: Settings },
      { label: "Abo & Vertrag", description: "HufManager-Zugang und Laufzeit", path: "/management/abo", icon: UserRound },
    ],
  },
  {
    title: "Service",
    items: [
      { label: "Hilfe", description: "Antworten und Arbeitsanleitungen", path: "/hilfe", icon: CircleHelp },
      { label: "Support", description: "Direkter Kontakt zum HufManager-Team", path: "/support", icon: LifeBuoy },
    ],
  },
] as const;

const themeOptions = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Hell", icon: Sun },
  { value: "dark", label: "Dunkel", icon: Moon },
] as const;

export function SlimMoreScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-sm font-medium text-[var(--hm-text-secondary)]">Seltene Aufgaben, sauber gebündelt</p>
        <h1 className="mt-1 text-[clamp(1.75rem,3vw,2rem)] font-bold tracking-[-0.035em] text-[var(--hm-text-primary)]">
          Mehr & Einstellungen
        </h1>
      </header>

      <section className="hm-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--hm-text-primary)]">Darstellung</h2>
        <p className="mt-1 text-sm text-[var(--hm-text-secondary)]">HufManager folgt standardmäßig der Einstellung deines Geräts.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {themeOptions.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-sm font-semibold transition ${
                  active
                    ? "border-[var(--hm-orange)] bg-orange-500/10 text-[var(--hm-orange)] shadow-[0_8px_20px_rgba(255,106,0,0.08)]"
                    : "border-[var(--hm-border)] bg-[var(--hm-surface)] text-[var(--hm-text-primary)] hover:border-orange-500/50 hover:bg-orange-500/5"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{label}</span>
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} className="hm-card overflow-hidden">
            <div className="border-b border-[var(--hm-border)] px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-[var(--hm-text-primary)]">{group.title}</h2>
            </div>
            <div className="divide-y divide-[var(--hm-border)]">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="group flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-orange-500/5 sm:px-6"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--hm-border)] bg-[var(--hm-surface-elevated)] text-[var(--hm-text-secondary)] transition group-hover:border-orange-500/30 group-hover:text-[var(--hm-orange)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--hm-text-primary)]">{item.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-[var(--hm-text-secondary)]">{item.description}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--hm-text-secondary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--hm-orange)]" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => signOut()} className="hm-button-secondary min-h-11">
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </div>
  );
}
