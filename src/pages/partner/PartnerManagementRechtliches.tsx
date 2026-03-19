import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleAVVSigningCard } from "@/components/settings/RoleAVVSigningCard";

export default function PartnerManagementRechtliches() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate("/partner-management/business")}>
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Rechtliches</h1>
        <p className="text-muted-foreground mt-1">AGB, Datenschutz, Impressum & AVV</p>
      </div>
      <RoleAVVSigningCard role="partner" />
    </div>
  );
}
