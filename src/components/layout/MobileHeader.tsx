import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";

export function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = ["/home", "/archiv", "/dashboard", "/cockpit"].includes(location.pathname);

  return (
    <header 
      className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-6 h-18"
      style={{ paddingTop: "var(--sat, 0px)" }}
    >
      <div className="flex items-center gap-4">
        {!isHome && (
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-[#F5970A] active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <img 
          src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
          alt="Hufi" 
          className="h-8 w-auto object-contain" 
        />
      </div>

      <button 
        onClick={() => window.location.href = "/archiv"}
        className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-[#F5970A] active:scale-90 transition-transform"
      >
        <LayoutGrid className="w-6 h-6" />
      </button>
    </header>
  );
}
