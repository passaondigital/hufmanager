import { ArrowRight, Check, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { label: "Einstellungen", description: "Betrieb, Benachrichtigungen und Sicherheit", path: "/management" },
  { label: "Abo & Vertrag", description: "HufManager-Zugang und Laufzeit", path: "/management/abo" },
  { label: "Rechnungen", description: "Rechnungen und Zahlungsstatus", path: "/rechnungen" },
  { label: "Hilfe", description: "Antworten und Arbeitsanleitungen", path: "/hilfe" },
  { label: "Support", description: "Direkter Kontakt zum HufManager-Team", path: "/support" },
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
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-sm font-medium text-[var(--hm-text-secondary)]">Seltene Aufgaben an einem Ort</p>
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
                    ? "border-[var(--hm-orange)] bg-orange-500/10 text-[var(--hm-orange)]"
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

      <section className="hm-card overflow-hidden">
        <div className="border-b border-[var(--hm-border)] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-[var(--hm-text-primary)]">HufManager verwalten</h2>
        </div>
        <div className="divide-y divide-[var(--hm-border)]">
          {links.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-orange-500/5 sm:px-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hm-surface-elevated)] text-[var(--hm-text-secondary)]">
                <Settings className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--hm-text-primary)]">{item.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--hm-text-secondary)]">{item.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--hm-text-secondary)]" />
            </button>
          ))}
        </div>
      </section>

      <button type="button" onClick={() => signOut()} className="hm-button-secondary min-h-11">
        <LogOut className="h-4 w-4" />
        Abmelden
      </button>
    </div>
  );
}
