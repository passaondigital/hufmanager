import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppLayout() {
  return (
    <div className="app-container">
      <MobileHeader />
      <main className="flex-1 overflow-y-auto px-5 py-6 pb-28 scrollbar-hide">
        <ErrorBoundary name="HufiMain">
          <div className="calendar-wrapper">
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
      <MobileBottomNav />
    </div>
  );
}
