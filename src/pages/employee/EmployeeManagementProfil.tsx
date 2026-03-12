import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmployeeProfil from "@/pages/employee/EmployeeProfil";

export default function EmployeeManagementProfil() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate("/employee/management")}>
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Mein Profil</h1>
        <p className="text-muted-foreground mt-1">Persönliche Daten & Vertrag</p>
      </div>
      <EmployeeProfil section="profil" hideChrome />
    </div>
  );
}
