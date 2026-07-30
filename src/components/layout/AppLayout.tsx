import { Outlet } from "react-router-dom";
import { AppTopBar } from "./AppTopBar";
import { MobileBottomNav } from "./MobileBottomNav";

export const AppLayout = () => {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center"
      style={{ background: "#F8FAFC" }}
    >
      <AppTopBar />

      {/* Abstaende kommen aus --hufi-header-h / --hufi-nav-h (src/index.css) */}
      <main className="flex-1 w-full max-w-md px-4 pt-app-header pb-bottom-nav">
        <Outlet />
      </main>

      <MobileBottomNav />
    </div>
  );
};
