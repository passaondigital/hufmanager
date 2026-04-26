import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Bell, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";

export const AppTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/home";

  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-16 bg-white shadow-sm border-b z-[100] flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {!isHome && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <img 
          src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
          alt="Hufi" 
          className="h-8 w-auto"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate("/archiv")}>
          <Grid className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
