import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Truck,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  customer_number: string | null;
  phone?: string | null;
  notes?: string | null;
  provider_id: string;
  created_at?: string;
  open_orders_count?: number;
}

interface SupplierFormData {
  name: string;
  email: string;
  website: string;
  customer_number: string;
  phone: string;
  notes: string;
}

const emptyFormData: SupplierFormData = {
  name: "",
  email: "",
  website: "",
  customer_number: "",
  phone: "",
  notes: "",
};

export function SuppliersTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyFormData);

  // Fetch suppliers with open orders count
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch suppliers
      const { data: suppliersData, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("provider_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;

      // Fetch open orders count per supplier
      const { data: ordersData } = await supabase
        .from("purchase_orders")
        .select("supplier_id, status")
        .eq("provider_id", user.id)
        .in("status", ["draft", "ordered"]);

      const orderCounts: Record<string, number> = {};
      ordersData?.forEach((order) => {
        if (order.supplier_id) {
          orderCounts[order.supplier_id] = (orderCounts[order.supplier_id] || 0) + 1;
        }
      });

      return (suppliersData || []).map((s) => ({
        ...s,
        open_orders_count: orderCounts[s.id] || 0,
      })) as Supplier[];
    },
    enabled: !!user,
  });

  // Create/Update supplier mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      if (!user) throw new Error("Nicht angemeldet");

      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update({
            name: data.name,
            email: data.email || null,
            website: data.website || null,
            customer_number: data.customer_number || null,
            phone: data.phone || null,
            notes: data.notes || null,
          })
          .eq("id", editingSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert({
          provider_id: user.id,
          name: data.name,
          email: data.email || null,
          website: data.website || null,
          customer_number: data.customer_number || null,
          phone: data.phone || null,
          notes: data.notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(editingSupplier ? "Lieferant aktualisiert" : "Lieferant hinzugefügt");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  // Delete supplier mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Lieferant gelöscht");
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email || "",
      website: supplier.website || "",
      customer_number: supplier.customer_number || "",
      phone: supplier.phone || "",
      notes: supplier.notes || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSupplier(null);
    setFormData(emptyFormData);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Lieferanten
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalte deine Lieferanten und deren Kontaktdaten
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Lieferant
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Name, Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Keine Lieferanten</p>
            <p className="text-sm mt-1">
              Füge deinen ersten Lieferanten hinzu
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Kundennr.</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="text-center">Offene Best.</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.email || "-"}</TableCell>
                  <TableCell>{supplier.customer_number || "-"}</TableCell>
                  <TableCell>{supplier.phone || "-"}</TableCell>
                  <TableCell className="text-center">
                    {supplier.open_orders_count && supplier.open_orders_count > 0 ? (
                      <Badge variant="secondary">{supplier.open_orders_count}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {supplier.website && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Lieferant bearbeiten" : "Neuer Lieferant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Hufbeschlag GmbH"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="bestellung@firma.de"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Webseite</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.firma.de"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_number">Kundennummer</Label>
                <Input
                  id="customer_number"
                  value={formData.customer_number}
                  onChange={(e) => setFormData({ ...formData, customer_number: e.target.value })}
                  placeholder="K-12345"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optionale Notizen..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
