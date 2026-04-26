import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = ["/home", "/archiv", "/dashboard", "/cockpit"].includes(location.pathname);

  return (
    <header className="sticky top-0 z-50 w-full min-h-16 border-b border-border/40 bg-white/80 backdrop-blur-md flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        {!isHome && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="h-10 w-10 rounded-full bg-secondary/50 hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Button>
        )}
        <img 
          src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
          alt="Hufi" 
          className="h-8 w-auto object-contain" 
        />
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => window.location.href = "/archiv"}
        className="h-10 w-10 rounded-full text-primary hover:bg-secondary"
      >
        <LayoutGrid className="h-5 w-5" />
      </Button>
    </header>
  );
}
