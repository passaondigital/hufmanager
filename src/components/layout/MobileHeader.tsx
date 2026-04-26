import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Home-Pfade, wo kein Zurück-Pfeil sein soll
  const isHome = ["/home", "/archiv", "/dashboard", "/cockpit"].includes(location.pathname);

  return (
    <header className="sticky top-0 z-40 w-full min-h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 gap-2">
      <div className="flex items-center gap-2">
        {!isHome && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="h-9 w-9 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <img 
          src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
          alt="Hufi" 
          className="h-7 w-auto object-contain py-1" 
        />
      </div>

      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => window.location.href = "/archiv"}
          className="h-9 w-9 text-muted-foreground hover:text-primary"
          aria-label="Menü"
        >
          <LayoutGrid className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
