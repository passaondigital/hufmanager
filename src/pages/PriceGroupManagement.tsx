import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Loader2, DollarSign } from "lucide-react";
import { PRICE_GROUPS } from "@/lib/priceGroups";

interface PriceGroup {
  id: string;
  provider_id: string;
  name: string;
  label: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface PriceOverride {
  service_id: string;
  service_name: string;
  price_group: string;
  price: number;
}

export default function PriceGroupManagement() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<PriceGroup[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [editingOverride, setEditingOverride] = useState<{ serviceId: string; newPrice: number } | null>(null);

  // Load data
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch price groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("price_groups")
        .select("*")
        .eq("provider_id", user?.id);
      if (groupsError) throw groupsError;
      setGroups((groupsData as PriceGroup[]) || []);

      // 2. Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, base_price")
        .eq("provider_id", user?.id)
        .eq("is_active", true);
      if (servicesError) throw servicesError;
      setServices(
        (servicesData as any[])?.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.base_price,
        })) || []
      );

      // 3. Fetch price overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from("service_price_overrides")
        .select("service_id, price_group, price")
        .eq("provider_id", user?.id);
      if (overridesError) throw overridesError;

      // Merge with service names
      const merged = (overridesData as any[])?.map((o) => ({
        ...o,
        service_name: servicesData?.find((s: any) => s.id === o.service_id)?.name || "Unbekannt",
      })) || [];
      setOverrides(merged);
    } catch (error) {
      toast({ title: "Fehler beim Laden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!user || !newGroupName) return;
    try {
      const { error } = await supabase.from("price_groups").insert({
        provider_id: user.id,
        name: newGroupName,
        description: newGroupDesc || null,
      });
      if (error) throw error;
      toast({ title: "Preisgruppe erstellt" });
      setNewGroupName("");
      setNewGroupDesc("");
      setShowNewGroupDialog(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase.from("price_groups").delete().eq("id", groupId);
      if (error) throw error;
      toast({ title: "Preisgruppe gelöscht" });
      loadData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const updateOverride = async (serviceId: string, priceGroup: string, newPrice: number) => {
    try {
      // Check if exists
      const { data: existing } = await supabase
        .from("service_price_overrides")
        .select("id")
        .eq("service_id", serviceId)
        .eq("price_group", priceGroup)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("service_price_overrides")
          .update({ price: newPrice })
          .eq("service_id", serviceId)
          .eq("price_group", priceGroup);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("service_price_overrides").insert({
          service_id: serviceId,
          provider_id: user?.id,
          price_group: priceGroup,
          price: newPrice,
        });
        if (error) throw error;
      }
      toast({ title: "Preis aktualisiert" });
      setEditingOverride(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="p-4">Lädt...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" /> Preisgruppen-Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Erstelle Kundengruppen und lege unterschiedliche Preise fest
        </p>
      </div>

      {/* PREISGRUPPEN ÜBERSICHT */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ihre Preisgruppen</CardTitle>
            <CardDescription>Gruppiert nach Kundentyp oder Volumen</CardDescription>
          </div>
          <Button onClick={() => setShowNewGroupDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Neue Gruppe
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Keine benutzerdefinierten Preisgruppen. Verwende die Standard-Gruppen.
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{g.name}</p>
                    {g.label && <p className="text-xs text-muted-foreground">{g.label}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedGroup(g.id)}
                      className={selectedGroup === g.id ? "border-primary" : ""}
                    >
                      {selectedGroup === g.id ? "✓ Aktiv" : "Wählen"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteGroup(g.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* STANDARD PREISGRUPPEN */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standard-Preisgruppen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {PRICE_GROUPS.map((pg) => (
              <div key={pg.value} className="flex items-center justify-between p-2 border rounded text-sm">
                <span className="font-medium">{pg.label}</span>
                <Badge variant="outline">{pg.value}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PREISÜBERSCHREIBUNGEN */}
      <Card>
        <CardHeader>
          <CardTitle>Preis-Überschreibungen</CardTitle>
          <CardDescription className="mt-2">
            Definiere unterschiedliche Preise für jede Preisgruppe
          </CardDescription>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              Keine Dienstleistungen vorhanden. Definiere zuerst Leistungen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Dienstleistung</TableHead>
                    <TableHead className="text-right">Basis</TableHead>
                    {PRICE_GROUPS.map((pg) => (
                      <TableHead key={pg.value} className="text-center min-w-24">
                        {pg.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-right">{service.price.toFixed(2)} €</TableCell>
                      {PRICE_GROUPS.map((pg) => {
                        const override = overrides.find(
                          (o) => o.service_id === service.id && o.price_group === pg.value
                        );
                        return (
                          <TableCell key={pg.value} className="text-center">
                            {editingOverride?.serviceId === service.id &&
                            editingOverride.newPrice === override?.price ? (
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={override?.price || service.price}
                                onBlur={(e) => {
                                  updateOverride(service.id, pg.value, parseFloat(e.target.value));
                                }}
                                className="h-8 text-xs"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() =>
                                  setEditingOverride({
                                    serviceId: service.id,
                                    newPrice: override?.price || service.price,
                                  })
                                }
                                className="text-xs font-mono p-1 hover:bg-muted rounded"
                              >
                                {override ? (
                                  <span className="text-amber-600 font-bold">{override.price.toFixed(2)} €</span>
                                ) : (
                                  <span className="text-muted-foreground">Klick zu setzen</span>
                                )}
                              </button>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NEW GROUP DIALOG */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Preisgruppe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="z.B. VIP-Kunden"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Beschreibung (optional)</label>
              <Input
                placeholder="z.B. Großstallbetriebe mit Rabatt"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={createGroup} disabled={!newGroupName}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
