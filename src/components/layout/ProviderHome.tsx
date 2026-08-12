import { lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppSidebar } from "./AppSidebar";

const MobileShell = lazy(() =>
  import("./MobileShell").then((m) => ({ default: m.MobileShell })),
);
const Dashboard = lazy(() => import("@/pages/Dashboard"));

/**
 * Startseite der Hufbearbeiter-App.
 * Desktop: klassisches Layout mit den 5 A's in der linken Sidebar + Dashboard.
 * Mobil: Hufi MobileShell (Chat-Startseite).
 */
export function ProviderHome() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense fallback={null}>
        <MobileShell />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 px-8 pt-8 pb-12">
        <Suspense fallback={null}>
          <Dashboard />
        </Suspense>
      </main>
    </div>
  );
}

export default ProviderHome;
