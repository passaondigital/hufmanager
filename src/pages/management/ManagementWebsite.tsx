import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Management from "@/pages/Management";

export default function ManagementWebsite() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate("/management")}>
          <ArrowLeft className="h-4 w-4" /> Management
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Meine Website</h1>
        <p className="text-muted-foreground mt-1">Landingpage, Bewertungen & Domain</p>
      </div>
      <Management tabs={["landing", "reviews"]} hideChrome />
    </div>
  );
}
