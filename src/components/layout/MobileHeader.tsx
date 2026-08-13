import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { FLAVOR_CONFIG } from "@/config/appFlavor";

export function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = ["/home", "/archiv", "/dashboard", "/cockpit"].includes(location.pathname);

  return (
    <header 
      className="sticky top-0 z-bar w-full flex items-center justify-between px-5 h-18"
      style={{
        paddingTop: "var(--sat, 0px)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.58) 100%)",
        backdropFilter: "blur(22px) saturate(170%)",
        WebkitBackdropFilter: "blur(22px) saturate(170%)",
        borderBottom: "1px solid rgba(15,23,42,0.05)",
      }}
    >
      <div className="flex items-center gap-4">
        {!isHome && (
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-[#F5970A] shadow-sm border border-slate-200 transition-all hover:bg-white active:scale-[0.98]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-2 py-1 shadow-sm">
            <img src={FLAVOR_CONFIG.logo} alt={FLAVOR_CONFIG.appName} className="h-6 w-auto object-contain" />
          </div>
          <span className="text-sm font-semibold tracking-[-0.02em] text-slate-900">{FLAVOR_CONFIG.appName}</span>
        </div>
      </div>

      <button 
        onClick={() => window.location.href = "/archiv"}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-slate-400 shadow-sm border border-slate-200 transition-all hover:text-[#F5970A] hover:bg-white active:scale-[0.98]"
      >
        <LayoutGrid className="w-6 h-6" />
      </button>
    </header>
  );
}
