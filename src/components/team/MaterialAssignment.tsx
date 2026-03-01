import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmployees } from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Package, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function MaterialAssignment() {
  const { user } = useAuth();
  const { employees } = useEmployees();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Stück");

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["provider-material-assignments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("employee_material_assignments")
        .select("*, employee:employee_profiles(id, full_name)")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createAssignment = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("employee_material_assignments").insert({
        employee_id: selectedEmployee,
        provider_id: user.id,
        material_name: materialName,
        material_category: materialCategory || null,
        quantity_assigned: parseInt(quantity),
        unit,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-material-assignments"] });
      toast({ title: "Material zugewiesen" });
      setShowAdd(false);
      setMaterialName("");
      setMaterialCategory("");
      setQuantity("1");
      setSelectedEmployee("");
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_material_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-material-assignments"] });
      toast({ title: "Zuweisung entfernt" });
    },
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // Group by employee
  const grouped = assignments.reduce((acc: Record<string, any[]>, item: any) => {
    const name = item.employee?.full_name || "Unbekannt";
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Material-Zuweisungen
        </h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Zuweisen
        </Button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch kein Material zugewiesen</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([empName, items]) => (
          <div key={empName}>
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{getInitials(empName)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{empName}</span>
            </div>
            <div className="space-y-2 ml-8">
              {(items as any[]).map((mat: any) => {
                const remaining = (mat.quantity_assigned || 0) - (mat.quantity_used || 0);
                return (
                  <Card key={mat.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{mat.material_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {mat.material_category && <Badge variant="outline" className="text-[10px]">{mat.material_category}</Badge>}
                          <span>{mat.quantity_assigned} {mat.unit} zugewiesen</span>
                          <span>·</span>
                          <span>{mat.quantity_used || 0} verbraucht</span>
                        </div>
                      </div>
                      <Badge variant={remaining <= 0 ? "destructive" : remaining <= 3 ? "outline" : "default"} className="text-xs">
                        {remaining} übrig
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAssignment.mutate(mat.id)} aria-label="Material entfernen">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material zuweisen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mitarbeiter</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === "active").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Materialname</Label>
              <Input value={materialName} onChange={(e) => setMaterialName(e.target.value)} placeholder="z.B. Hufeisen Gr. 2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategorie (opt.)</Label>
                <Input value={materialCategory} onChange={(e) => setMaterialCategory(e.target.value)} placeholder="z.B. Beschlag" />
              </div>
              <div>
                <Label>Einheit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stück">Stück</SelectItem>
                    <SelectItem value="Paar">Paar</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="Packung">Packung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Menge</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Abbrechen</Button>
            <Button
              disabled={!selectedEmployee || !materialName || createAssignment.isPending}
              onClick={() => createAssignment.mutate()}
            >
              {createAssignment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zuweisen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
