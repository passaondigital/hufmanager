import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { HelpTip } from "@/components/ui/HelpTip";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";

const NAV_ITEMS = [
  { label: "Heute", path: "/home", icon: CalendarDays },
  { label: "Tour", path: "/home/tour", icon: Map },
  { label: "Kunden & Pferde", path: "/home/kunden", icon: Users },
  { label: "Hufi Hufanalyse", path: "/home/hufi-hufanalyse", icon: Sparkles },
  { label: "Finanzen", path: "/home/finanzen", icon: ReceiptText },
  { label: "Mehr", path: "/home/mehr", icon: Settings },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/home": "Heute",
  "/home/tour": "Tour",
  "/home/kunden": "Kunden & Pferde",
  "/home/hufi-hufanalyse": "Hufi Hufanalyse",
  "/home/finanzen": "Finanzen",
  "/home/mehr": "Mehr & Einstellungen",
  "/pferde": "Kunden & Pferde",
  "/kunden": "Kunden & Pferde",
  "/kalender": "Kalender & Termine",
  "/rechnungen": "Rechnungen",
  "/mein-angebot": "Leistungen & Angebote",
  "/anfragen": "Anfragen",
  "/aufnahme": "Kundenaufnahme",
  "/tour": "Tour",
  "/lager": "Material & Lager",
  "/ausgaben": "Ausgaben & Belege",
  "/buchhaltung": "Buchhaltung",
  "/guv": "Gewinn & Verlust",
  "/business": "Finanzen",
  "/analyse": "Betriebsanalyse",
  "/fuhrpark": "Fuhrpark & Fahrtenbuch",
  "/team": "Mitarbeiter",
  "/management": "Einstellungen",
  "/hilfe": "Hilfe",
  "/support": "Support",
};

const PAGE_HELP: Record<string, { title: string; description: string }> = {
  "/home": {
    title: "Heute",
    description: "Dein Arbeitstag auf einen Blick. Hier siehst du den naechsten Termin und kommst mit wenigen Klicks direkt zur Tour oder zum Termin.",
  },
  "/home/tour": {
    title: "Tour",
    description: "Deine heutigen Termine werden zu einer Tagesroute. Erst Route planen, dann Tour starten und anschliessend Stopp fuer Stopp abarbeiten.",
  },
  "/home/kunden": {
    title: "Kunden & Pferde",
    description: "Hier verwaltest du Kunden und die dazugehoerigen Pferde. Pferdeakten, Termine und Freigaben bleiben an einem Ort zusammen.",
  },
  "/home/hufi-hufanalyse": {
    title: "Hufi Hufanalyse",
    description: "Hier dokumentierst und vergleichst du Hufe. Die Analyse unterstuetzt deine Dokumentation und ersetzt keine fachliche Diagnose.",
  },
  "/home/finanzen": {
    title: "Finanzen",
    description: "Hier laufen Leistungen, Rechnungen, offene Betraege und weitere Finanzfunktionen zusammen. Starte im Alltag meist mit Rechnungen oder Leistungen.",
  },
  "/home/mehr": {
    title: "Mehr & Einstellungen",
    description: "Hier findest du seltener benoetigte Funktionen, Einstellungen und erweiterte Werkzeuge. Dein taeglicher Arbeitsablauf bleibt dadurch bewusst schlank.",
  },
  "/kalender": {
    title: "Kalender & Termine",
    description: "Plane Termine mit Kunde, Pferd, Leistung, Uhrzeit und Ort. Wiederholungen, Serien und Dokumente sind Zusatzoptionen und muessen nicht bei jedem Termin genutzt werden.",
  },
  "/rechnungen": {
    title: "Rechnungen",
    description: "Erstelle Rechnungen und behalte offene, bezahlte und ueberfaellige Betraege im Blick. Export ist eine Zusatzfunktion und nicht fuer jeden Arbeitsschritt notwendig.",
  },
  "/mein-angebot": {
    title: "Leistungen & Angebote",
    description: "Lege fest, was du anbietest, wie lange es dauert und was es kostet. Gruppen und Matrix sind erweiterte Einstellungen und fuer den normalen Start nicht notwendig.",
  },
  "/anfragen": {
    title: "Anfragen",
    description: "Hier landen neue Interessenten und Kundenanfragen. Bearbeite sie Schritt fuer Schritt vom Erstkontakt bis zum gewonnenen Kunden.",
  },
  "/aufnahme": {
    title: "Kundenaufnahme",
    description: "Hier legst du neue Kunden und Pferde an oder verschickst eine Einladung. Pflichtfelder zuerst, Details koennen spaeter ergaenzt werden.",
  },
  "/tour": {
    title: "Tour",
    description: "Plane deine Stopps, starte die Tour und arbeite die Termine der Reihe nach ab. Navigation und Fahrtenbuch laufen als Unterstuetzung mit.",
  },
  "/lager": {
    title: "Material & Lager",
    description: "Verwalte Materialbestand, Mindestbestand, Einkaufspreise und Lieferanten. Bestandswarnungen helfen dir, rechtzeitig nachzubestellen.",
  },
  "/fuhrpark": {
    title: "Fuhrpark & Fahrtenbuch",
    description: "Verwalte Fahrzeuge, Kilometer und Fahrtkosten. Fuer den Alltag reichen meist Start- und Endkilometer; weitere Fahrzeugdaten sind optional.",
  },
};

function getPageTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/pferd/")) return "Pferdeakte";
  if (pathname.startsWith("/management/") || pathname.startsWith("/settings/")) return "Einstellungen";
  if (pathname.startsWith("/mein-office")) return "Mein Office";
  if (pathname.startsWith("/analyse/")) return "Betriebsanalyse";
  return "HufManager";
}

function getPageHelp(pathname: string) {
  if (PAGE_HELP[pathname]) return PAGE_HELP[pathname];
  if (pathname.startsWith("/pferd/")) {
    return {
      title: "Pferdeakte",
      description: "Alle wichtigen Informationen zu diesem Pferd an einem Ort. Nutze nur die Bereiche, die du fuer deine aktuelle Arbeit brauchst.",
    };
  }
  if (pathname.startsWith("/management/") || pathname.startsWith("/settings/")) {
    return {
      title: "Einstellungen",
      description: "Hier passt du HufManager an deinen Betrieb an. Aendere nur Einstellungen, die du wirklich benoetigst; Standardwerte funktionieren fuer den Einstieg.",
    };
  }
  if (pathname.startsWith("/analyse/")) {
    return {
      title: "Betriebsanalyse",
      description: "Hier siehst du Auswertungen zu deinem Betrieb. Diese Ansicht ist fuer Kontrolle und Planung gedacht, nicht fuer den taeglichen Pflichtablauf.",
    };
  }
  return {
    title: getPageTitle(pathname),
    description: "Kurze Hilfe zu diesem Bereich. Die wichtigsten Funktionen stehen zuerst; erweiterte Optionen kannst du bei Bedarf nutzen.",
  };
}

function getActiveSection(pathname: string) {
  if (pathname === "/home" || pathname === "/dashboard") return "/home";
  if (pathname.startsWith("/home/tour") || pathname === "/tour") return "/home/tour";
  if (
    pathname.startsWith("/home/kunden") ||
    pathname === "/kunden" ||
    pathname === "/pferde" ||
    pathname.startsWith("/pferd/")
  ) return "/home/kunden";
  if (pathname.startsWith("/home/hufi-hufanalyse")) return "/home/hufi-hufanalyse";
  if (
    pathname.startsWith("/home/finanzen") ||
    pathname === "/rechnungen" ||
    pathname === "/mein-angebot" ||
    pathname === "/ausgaben" ||
    pathname === "/buchhaltung" ||
    pathname === "/guv" ||
    pathname === "/business" ||
    pathname.startsWith("/analyse")
  ) return "/home/finanzen";
  return "/home/mehr";
}

export function HufManagerSlimShell() {
  const location = useLocation();
  const { role } = useAuth();
  const { isLoading: onboardingLoading, showOnboarding, completeOnboarding } = useOnboarding();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("hm-sidebar-collapsed") === "true",
  );
  const currentTitle = getPageTitle(location.pathname);
  const currentHelp = getPageHelp(location.pathname);
  const activeSection = getActiveSection(location.pathname);

  // Das Dashboard wird immer zuerst gerendert. Erst nachdem der Profilstatus
  // asynchron feststeht, darf sich das Onboarding als Overlay darueberlegen.
  // Abschliessen UND bewusstes Ueberspringen speichern dauerhaft
  // onboarding_completed=true und verhindern den Dialog beim naechsten Login.
  const shouldShowOnboarding =
    role === "provider" &&
    location.pathname === "/home" &&
    !onboardingLoading &&
    showOnboarding;

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      localStorage.setItem("hm-sidebar-collapsed", String(!collapsed));
      return !collapsed;
    });
  };

  return (
    <div className="hm-slim min-h-screen min-w-0 max-w-full overflow-x-hidden bg-hm-canvas text-hm-text">
      <aside
        className={`fixed inset-y-0 left-0 z-bar hidden border-r border-hm-border bg-hm-surface transition-[width] duration-200 lg:flex lg:flex-col ${
          sidebarCollapsed ? "w-20" : "w-[var(--hm-sidebar-w)]"
        }`}
      >
        <div
          className={`flex h-[var(--hm-header-h)] items-center border-b border-hm-border ${
            sidebarCollapsed ? "justify-center px-2" : "px-6"
          }`}
        >
          <Brand compact={sidebarCollapsed} />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <SlimNavItem
              key={item.path}
              item={item}
              active={activeSection === item.path}
              compact={sidebarCollapsed}
              onNavigate={() => undefined}
            />
          ))}
        </nav>

        <div className={`border-t border-hm-border p-3 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-hm-muted transition hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5"
            aria-label={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span>Sidebar einklappen</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className={`min-w-0 max-w-full overflow-x-hidden transition-[padding] duration-200 ${
        sidebarCollapsed ? "lg:pl-20" : "lg:pl-[var(--hm-sidebar-w)]"
      }`}>
        <header className="sticky top-0 z-bar min-w-0 max-w-full border-b border-hm-border bg-hm-surface/95 backdrop-blur">
          <div className="flex h-[var(--hm-header-h)] w-full min-w-0 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen((open) => !open)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-hm-border bg-hm-surface text-hm-text shadow-sm lg:hidden"
                aria-label="Navigation öffnen"
                aria-expanded={mobileNavOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:block lg:hidden"><Brand /></div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-hm-muted">HufManager</p>
                <div className="flex min-w-0 items-center gap-1">
                  <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-hm-text">
                    {currentTitle}
                  </h1>
                  <HelpTip title={currentHelp.title} description={currentHelp.description} />
                </div>
              </div>
            </div>
          </div>

          {mobileNavOpen && (
            <nav className="border-t border-hm-border bg-hm-surface px-3 py-3 lg:hidden">
              <div className="grid gap-2 sm:grid-cols-3">
                {NAV_ITEMS.map((item) => (
                  <SlimNavItem
                    key={item.path}
                    item={item}
                    active={activeSection === item.path}
                    compact={false}
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                ))}
              </div>
            </nav>
          )}
        </header>

        <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full min-w-0 max-w-[1440px]">
            <Outlet />
          </div>
        </main>

        {shouldShowOnboarding && (
          <OnboardingWizard
            onComplete={completeOnboarding}
            onSkip={completeOnboarding}
          />
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-bar border-t border-hm-border bg-hm-surface md:hidden">
        <div className="grid grid-cols-6 gap-1 px-2 pb-[env(safe-area-inset-bottom)] pt-2">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/home"}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold leading-none transition ${
                  active
                    ? "bg-[var(--hm-orange)] text-white"
                    : "text-hm-muted hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="line-clamp-2 text-center">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="leading-none">
      {compact ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hm-orange)] text-base font-bold text-white shadow-[0_8px_18px_rgba(255,106,0,0.2)]">
          HM
        </div>
      ) : (
        <div className="text-[1.35rem] font-bold tracking-[-0.04em] text-hm-text">
          Huf<span className="text-[var(--hm-orange)]">Manager</span>
        </div>
      )}
    </div>
  );
}

function SlimNavItem({
  item,
  active,
  compact,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  compact: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === "/home"}
      onClick={onNavigate}
      title={compact ? item.label : undefined}
      className={`flex min-h-11 items-center rounded-xl py-2.5 text-sm font-semibold transition ${
        compact ? "justify-center px-2" : "gap-3 px-3"
      } ${
        active
          ? "bg-[var(--hm-orange)] text-white shadow-[0_8px_18px_rgba(255,106,0,0.22)]"
          : "text-hm-text hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!compact && <span className="overflow-hidden whitespace-nowrap">{item.label}</span>}
    </NavLink>
  );
}
