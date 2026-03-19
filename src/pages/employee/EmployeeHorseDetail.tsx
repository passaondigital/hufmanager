import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Pferdeakte } from "@/components/pferdeakte";

export default function EmployeeHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: empProfile } = useEmployeeProfile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (user && id && empProfile?.id) checkAccess();
  }, [user, id, empProfile?.id]);

  const checkAccess = async () => {
    if (!empProfile?.id || !id) return;
    setLoading(true);

    try {
      const { data: assignments } = await supabase
        .from("employee_assignments")
        .select("id, appointment:appointments!inner(horse_id)")
        .eq("employee_id", empProfile.id)
        .not("status", "eq", "cancelled");

      const found = assignments?.some(
        (a: any) => a.appointment?.horse_id === id
      );

      if (!found) {
        toast.error("Kein Zugriff auf dieses Pferd");
        navigate("/employee/tour");
        return;
      }
      setHasAccess(true);
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/employee/tour")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Pferdeakte</h1>
      </div>

      <Pferdeakte horseId={id!} userRole="employee" />
    </div>
  );
}
