import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { VetSOAPNote } from "@/components/vet/VetSOAPNote";

export default function VetSOAPForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedHorseId, setSelectedHorseId] = useState("");

  const { data: myHorses } = useQuery({
    queryKey: ["vet-accessible-horses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses!horse_partner_access_horse_id_fkey(id, name, breed)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("can_add_treatment_notes", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!user) return <Navigate to="/auth" replace />;

  const selectedHorse = myHorses?.find((a: any) => a.horse_id === selectedHorseId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Link to="/vet/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-600" />
            <h1 className="text-lg font-bold">SOAP-Befund</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {/* Horse Selection */}
        <div>
          <Label>Pferd auswählen *</Label>
          <Select value={selectedHorseId} onValueChange={setSelectedHorseId}>
            <SelectTrigger>
              <SelectValue placeholder="Pferd wählen..." />
            </SelectTrigger>
            <SelectContent>
              {myHorses?.map((access: any) => (
                <SelectItem key={access.horse_id} value={access.horse_id}>
                  {access.horses?.name} {access.horses?.breed ? `(${access.horses.breed})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedHorseId && (
          <VetSOAPNote
            horseId={selectedHorseId}
            horseName={selectedHorse?.horses?.name}
            onSaved={() => navigate("/vet/dashboard")}
          />
        )}
      </main>
    </div>
  );
}
