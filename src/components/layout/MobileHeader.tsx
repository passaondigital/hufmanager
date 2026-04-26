import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = ["/home", "/archiv", "/dashboard", "/cockpit"].includes(location.pathname);

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 pb-3"
      style={{ paddingTop: "calc(var(--sat, 0px) + 0.75rem)" }}
    >
      <div className="flex items-center gap-3">
        {!isHome && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full bg-orange-50">
            <ArrowLeft className="h-5 w-5 text-[#F5970A]" />
          </Button>
        )}
        <img src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" alt="Hufi" className="h-7 w-auto" />
      </div>
      <Button variant="ghost" size="icon" onClick={() => window.location.href = "/archiv"} className="h-10 w-10 rounded-full">
        <LayoutGrid className="h-5 w-5 text-[#F5970A]" />
      </Button>
    </header>
  );
}
