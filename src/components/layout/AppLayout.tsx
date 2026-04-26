import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppLayout() {
  return (
    <div className="app-container">
      <MobileHeader />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <ErrorBoundary name="HufiContent">
          <Outlet />
        </ErrorBoundary>
      </main>
      <MobileBottomNav />
    </div>
  );
}
