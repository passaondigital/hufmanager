import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, ArrowLeft, LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface PortalDemoShellProps {
  title: string;
  orgName: string;
  icon: LucideIcon;
  iconColor: string;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}

export function PortalDemoShell({
  title,
  orgName,
  icon: Icon,
  iconColor,
  navItems,
  activeTab,
  onTabChange,
  children,
}: PortalDemoShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Demo Banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 shrink-0">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">DEMO-MODUS</span>
            <span className="text-muted-foreground hidden sm:inline">
              – Vorschau des {title}s. Alle Daten sind fiktiv.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate("/portal/galerie")}>
              <ArrowLeft className="h-3 w-3 mr-1" />
              Alle Portale
            </Button>
            <Button size="sm" onClick={() => navigate("/portal/bewerben")}>
              Jetzt bewerben
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-border bg-card shrink-0 hidden md:flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-${iconColor}/20 to-${iconColor}/5`}>
                <Icon className={`h-5 w-5 text-${iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{orgName}</p>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">Demo</Badge>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const NavIcon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <NavIcon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Tabs */}
        <div className="md:hidden border-b border-border bg-card px-2 py-1.5 overflow-x-auto flex gap-1 shrink-0 absolute top-[calc(theme(spacing.10)+1px)] left-0 right-0 z-10">
          {navItems.map((item) => {
            const NavIcon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <NavIcon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-[1200px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
