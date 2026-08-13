import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import { MobileBottomNav } from "./MobileBottomNav";

export const AppLayout = () => {
  return (
    <div className="hm-app min-h-screen bg-hm-canvas text-hm-text">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <div className="lg:pl-[var(--hm-sidebar-w)]">
        <AppTopBar />

        <main className="relative z-0 min-h-screen w-full px-4 pb-bottom-nav pt-app-header sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>

      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
};
