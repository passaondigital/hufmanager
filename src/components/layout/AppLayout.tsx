import { Outlet } from "react-router-dom";
import { AppTopBar } from "./AppTopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { AppSidebar } from "./AppSidebar";

export const AppLayout = () => {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Desktop: klassisches Layout mit den 5 A's in der linken Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile: TopBar + BottomNav */}
      <div className="lg:hidden">
        <AppTopBar />
      </div>

      <main
        className={
          "flex-1 w-full max-w-md px-4 mx-auto " +
          "pt-[calc(3.5rem+env(safe-area-inset-top,0px)+8px)] " +
          "pb-[calc(4.25rem+env(safe-area-inset-bottom,0px)+8px)] " +
          "lg:mx-0 lg:ml-64 lg:max-w-none lg:px-8 lg:pt-8 lg:pb-12"
        }
      >
        <Outlet />
      </main>

      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
};
