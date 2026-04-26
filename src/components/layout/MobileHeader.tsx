import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Definition der Haupt-Seiten (kein Zurück-Pfeil nötig)
  const isHome = ["/home", "/archiv", "/dashboard", "/cockpit"].includes(location.pathname);

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur-md flex items-center justify-between px-4"
      style={{ 
        paddingTop: "calc(var(--sat, 0px) + 0.75rem)",
        paddingBottom: "0.75rem"
      }}
    >
      <div className="flex items-center gap-3">
        {!isHome && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="h-10 w-10 rounded-full bg-orange-50 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5 text-[#F5970A]" />
          </Button>
        )}
        <img 
          src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
          alt="Hufi" 
          className="h-7 w-auto object-contain" 
        />
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => window.location.href = "/archiv"}
        className="h-10 w-10 rounded-full hover:bg-orange-50 text-[#F5970A] active:scale-90 transition-transform"
        aria-label="Menü"
      >
        <LayoutGrid className="h-6 w-6" />
      </Button>
    </header>
  );
}
