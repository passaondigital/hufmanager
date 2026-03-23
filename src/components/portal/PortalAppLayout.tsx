import { useState } from "react";
import { Outlet, useParams, Navigate, NavLink, useLocation, useOutletContext } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationBySlug, useOrgMembership } from "@/hooks/useOrganization";
import { PortalSidebar } from "./PortalSidebar";
import { Loader2, LayoutDashboard, Calendar, Settings, Wrench, Menu, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useTheme } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Organization } from "@/hooks/useOrganization";

const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: "Dashboard", suffix: "" },
  { icon: Calendar, label: "Kalender", suffix: "/kalender" },
  { icon: Wrench, label: "Management", suffix: "/management" },
  { icon: Settings, label: "Settings", suffix: "/settings" },
];

export default function PortalAppLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const { data: membership, isLoading: memLoading } = useOrgMembership(org?.id);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (authLoading || orgLoading || memLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Portal nicht gefunden</h1>
          <p className="text-sm text-muted-foreground">Die Organisation „{slug}" existiert nicht.</p>
        </div>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Zugang nicht autorisiert</h1>
          <p className="text-sm text-muted-foreground">Du bist kein Mitglied von {org.name}.</p>
        </div>
      </div>
    );
  }

  const basePath = `/portal/${slug}`;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <PortalSidebar org={org} basePath={basePath} />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <PortalSidebar org={org} basePath={basePath} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold truncate">{org.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10">
            {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 lg:pb-6">
          <ErrorBoundary name="PortalApp">
            <Outlet context={{ org, membership, basePath }} />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-[72px]">
          {BOTTOM_NAV.map((item) => {
            const fullPath = `${basePath}${item.suffix}`;
            const isActive = item.suffix === ""
              ? location.pathname === basePath
              : location.pathname.startsWith(fullPath);
            return (
              <NavLink
                key={item.suffix}
                to={fullPath}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-6 w-6 mb-1", isActive && "scale-110")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Hook for portal child pages to access org context */
export function usePortalContext() {
  // Dynamically import to avoid circular deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ctx = (await import("react-router-dom")).useOutletContext as any;
  return ctx() as { org: Organization; membership: any; basePath: string };
}
