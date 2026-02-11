import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const EmployeeMaterial = () => {
  const { data: profile } = useEmployeeProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["employee-materials", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("employee_material_assignments")
        .select("*")
        .eq("employee_id", profile.id)
        .order("material_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const reportUsage = useMutation({
    mutationFn: async ({ id, newUsed }: { id: string; newUsed: number }) => {
      const { error } = await supabase
        .from("employee_material_assignments")
        .update({ quantity_used: newUsed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-materials"] });
      toast({ title: "Verbrauch aktualisiert" });
    },
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Mein Material
        </h1>
        <p className="text-sm text-muted-foreground">Zugewiesenes Material und Verbrauchsmeldung</p>
      </div>

      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Kein Material zugewiesen</p>
            <p className="text-sm">Dein Provider hat dir noch kein Material zugewiesen.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {materials.map((mat) => {
            const remaining = (mat.quantity_assigned || 0) - (mat.quantity_used || 0);
            return (
              <Card key={mat.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{mat.material_name}</h3>
                      {mat.material_category && (
                        <Badge variant="secondary" className="text-xs mt-1">{mat.material_category}</Badge>
                      )}
                    </div>
                    <Badge variant={remaining <= 0 ? "destructive" : remaining <= 3 ? "outline" : "default"}>
                      {remaining} {mat.unit} übrig
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                    <span>Zugewiesen: {mat.quantity_assigned} {mat.unit}</span>
                    <span>Verbraucht: {mat.quantity_used} {mat.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(mat.quantity_used || 0) <= 0}
                      onClick={() => reportUsage.mutate({ id: mat.id, newUsed: (mat.quantity_used || 0) - 1 })}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm font-medium min-w-[60px] text-center">
                      {mat.quantity_used} verbraucht
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(mat.quantity_used || 0) >= (mat.quantity_assigned || 0)}
                      onClick={() => reportUsage.mutate({ id: mat.id, newUsed: (mat.quantity_used || 0) + 1 })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeMaterial;
