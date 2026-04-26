import { useNavigate, useLocation } from "react-router-dom";
import { Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/home" || location.pathname === "/archiv" || location.pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-40 min-h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3" style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}>
      <div className="flex items-center gap-2">
        {isHome ? (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10" aria-label="Menü öffnen">
            <Menu className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10" aria-label="Zurück">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <img src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" alt="Hufi" className="h-7 w-auto" />
      </div>
    </header>
  );
}
