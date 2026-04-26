import { Outlet } from "react-router-dom";
import { AppTopBar } from "./AppTopBar";
import { MobileBottomNav } from "./MobileBottomNav";

export const AppLayout = () => {
  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Top Bar - fest oben */}
      <AppTopBar />
      
      {/* Hauptinhalt mit maximaler Breite für Desktop und Seitenabstand für Mobile */}
      <main className="flex-1 w-full max-w-md pt-20 pb-24 px-4">
        <Outlet />
      </main>

      {/* Bottom Nav - fest unten */}
      <MobileBottomNav />
    </div>
  );
};
