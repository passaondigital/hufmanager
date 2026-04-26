import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppLayout() {
  return (
    <div className="app-container">
      <MobileHeader />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-32">
        <ErrorBoundary name="HufiMain">
          <div className="hufi-stack">
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
      <MobileBottomNav />
    </div>
  );
}
