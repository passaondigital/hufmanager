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

      <main
        className="flex-1 w-full max-w-md px-4"
        style={{
          // 56px TopBar + env(safe-area-inset-top) oben
          paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px) + 8px)",
          // 68px BottomNav + env(safe-area-inset-bottom) unten
          paddingBottom: "calc(4.25rem + env(safe-area-inset-bottom, 0px) + 8px)",
        }}
      >
        <Outlet />
      </main>

      <MobileBottomNav />
    </div>
  );
};
