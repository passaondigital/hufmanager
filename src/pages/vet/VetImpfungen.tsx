import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { VetImpfDashboard } from "@/components/vet/VetImpfDashboard";

export default function VetImpfungen() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link to="/vet/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Impf-Management</h1>
              <p className="text-xs text-muted-foreground">Impfstatus aller Pferde-Patienten</p>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <VetImpfDashboard />
      </main>
    </div>
  );
}
