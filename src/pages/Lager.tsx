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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  ShoppingCart,
  Warehouse,
  AlertTriangle,
  Printer,
  ClipboardList,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

interface GlobalProduct {
  id: string;
  brand: string;
  name: string;
  category: string | null;
  shop_url: string | null;
  image_url: string | null;
}

interface InventoryItem {
  id: string;
  user_id: string;
  global_product_id: string | null;
  product_name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  current_stock: number;
  price_sell: number | null;
  price_purchase: number | null;
  tax_rate: number | null;
  notes: string | null;
  min_stock: number | null;
}

const TAX_RATES = ["0", "7", "19"];

export default function Lager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [catalogSearch, setCatalogSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    current_stock: 0,
    price_sell: "",
    price_purchase: "",
    tax_rate: "19",
    min_stock: 0,
    notes: "",
  });

  // Fetch global products (catalog)
  const { data: catalogProducts = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["global-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_products")
        .select("*")
        .order("brand", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as GlobalProduct[];
    },
  });

  // Fetch user's inventory
  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", user.id)
        .order("product_name", { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!user,
  });

  // Add product to inventory
  const addToInventoryMutation = useMutation({
    mutationFn: async (product: GlobalProduct) => {
      if (!user) throw new Error("Nicht angemeldet");

      // Check if already in inventory
      const existing = inventoryItems.find((i) => i.global_product_id === product.id);
      if (existing) {
        throw new Error("Produkt bereits im Lager");
      }

      const { error } = await supabase.from("inventory_items").insert({
        user_id: user.id,
        global_product_id: product.id,
        product_name: product.name,
        brand: product.brand,
        category: product.category,
        image_url: product.image_url,
        current_stock: 0,
        tax_rate: 19,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Produkt ins Lager übernommen");
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  // Update inventory item
  const updateInventoryMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InventoryItem> }) => {
      const { error } = await supabase
        .from("inventory_items")
        .update(data.updates)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Lagerbestand aktualisiert");
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  // Delete inventory item
  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Produkt aus Lager entfernt");
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setEditFormData({
      current_stock: item.current_stock,
      price_sell: item.price_sell?.toString() || "",
      price_purchase: item.price_purchase?.toString() || "",
      tax_rate: item.tax_rate?.toString() || "19",
      min_stock: item.min_stock || 0,
      notes: item.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    updateInventoryMutation.mutate({
      id: editingItem.id,
      updates: {
        current_stock: editFormData.current_stock,
        price_sell: editFormData.price_sell ? parseFloat(editFormData.price_sell) : null,
        price_purchase: editFormData.price_purchase ? parseFloat(editFormData.price_purchase) : null,
        tax_rate: parseFloat(editFormData.tax_rate),
        min_stock: editFormData.min_stock,
        notes: editFormData.notes || null,
      },
    });
  };

  const filteredCatalog = catalogProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.category?.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const filteredInventory = inventoryItems.filter(
    (i) =>
      i.product_name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      i.brand?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      i.category?.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const isInInventory = (productId: string) =>
    inventoryItems.some((i) => i.global_product_id === productId);

  // Calculate low stock items
  const lowStockItems = inventoryItems.filter(
    (item) => item.min_stock && item.min_stock > 0 && item.current_stock <= item.min_stock
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Warehouse className="h-8 w-8 text-primary" />
          Mein Lager
        </h1>
        <p className="text-muted-foreground mt-1">
          Verwalte dein Material und deine Verkaufspreise
        </p>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Bestandswarnung</AlertTitle>
          <AlertDescription>
            <span className="font-medium">{lowStockItems.length} Produkt{lowStockItems.length > 1 ? "e" : ""}</span> unter Mindestbestand:{" "}
            {lowStockItems.map((item, i) => (
              <span key={item.id}>
                {item.product_name} ({item.current_stock}/{item.min_stock})
                {i < lowStockItems.length - 1 ? ", " : ""}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Mein Bestand ({inventoryItems.length})
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Produktkatalog ({catalogProducts.length})
          </TabsTrigger>
          <TabsTrigger value="shopping-list" className="gap-2 relative">
            <ClipboardList className="h-4 w-4" />
            Einkaufsliste
            {lowStockItems.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {lowStockItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* My Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Mein Bestand</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Suche im Lager..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {inventoryLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Dein Lager ist noch leer</p>
                  <p className="text-sm mt-1">
                    Wechsle zum Produktkatalog und füge Produkte hinzu
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Bild</TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Marke</TableHead>
                      <TableHead className="text-center">Bestand</TableHead>
                      <TableHead className="text-right">EK-Preis</TableHead>
                      <TableHead className="text-right">VK-Preis</TableHead>
                      <TableHead className="text-right">MwSt.</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.brand || "-"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Badge
                              variant={
                                item.min_stock && item.current_stock <= item.min_stock
                                  ? "destructive"
                                  : item.current_stock > 0
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {item.current_stock}
                            </Badge>
                            {item.min_stock && item.current_stock <= item.min_stock && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.price_purchase
                            ? `${item.price_purchase.toFixed(2)} €`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.price_sell
                            ? `${item.price_sell.toFixed(2)} €`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.tax_rate ? `${item.tax_rate}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditItem(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteInventoryMutation.mutate(item.id)}
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
          </Card>
        </TabsContent>

        {/* Product Catalog Tab */}
        <TabsContent value="catalog">
          <Card>
            <CardHeader>
              <CardTitle>Produktkatalog</CardTitle>
              <p className="text-sm text-muted-foreground">
                Wähle Produkte aus dem Katalog und übernehme sie in dein Lager
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Suche nach Marke oder Produkt..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {catalogLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Produkte gefunden
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCatalog.map((product) => {
                    const alreadyAdded = isInInventory(product.id);
                    return (
                      <Card
                        key={product.id}
                        className={alreadyAdded ? "opacity-60" : ""}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-muted-foreground">
                                {product.brand}
                              </p>
                              <p className="font-medium truncate">{product.name}</p>
                              {product.category && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {product.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={alreadyAdded || addToInventoryMutation.isPending}
                              onClick={() => addToInventoryMutation.mutate(product)}
                            >
                              {alreadyAdded ? (
                                "Im Lager"
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Übernehmen
                                </>
                              )}
                            </Button>
                            {product.shop_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a
                                  href={product.shop_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shopping List Tab */}
        <TabsContent value="shopping-list">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Einkaufsliste
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Produkte unter Mindestbestand – jetzt nachbestellen
                </p>
              </div>
              {lowStockItems.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      toast.error("Popup-Blocker aktiv – bitte erlauben");
                      return;
                    }
                    const tableHtml = `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Einkaufsliste</title>
                        <style>
                          body { font-family: system-ui, sans-serif; padding: 20px; }
                          h1 { font-size: 24px; margin-bottom: 8px; }
                          p { color: #666; margin-bottom: 20px; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
                          th { background: #f5f5f5; font-weight: 600; }
                          .text-right { text-align: right; }
                          .text-center { text-align: center; }
                          .missing { color: #dc2626; font-weight: 600; }
                          .low { color: #dc2626; }
                          @media print { button { display: none; } }
                        </style>
                      </head>
                      <body>
                        <h1>📋 Einkaufsliste</h1>
                        <p>Generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
                        <table>
                          <thead>
                            <tr>
                              <th>Produkt</th>
                              <th>Marke</th>
                              <th class="text-center">Bestand</th>
                              <th class="text-center">Mindest</th>
                              <th class="text-center">Fehlt</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${lowStockItems.map(item => `
                              <tr>
                                <td>${item.product_name}</td>
                                <td>${item.brand || '-'}</td>
                                <td class="text-center low">${item.current_stock}</td>
                                <td class="text-center">${item.min_stock}</td>
                                <td class="text-center missing">+${(item.min_stock || 0) - item.current_stock}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                        <script>window.onload = () => window.print();</script>
                      </body>
                      </html>
                    `;
                    printWindow.document.write(tableHtml);
                    printWindow.document.close();
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Liste drucken / PDF
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Alles auf Lager!</p>
                  <p className="text-sm mt-1">
                    Keine Produkte unter Mindestbestand
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Bild</TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Marke</TableHead>
                      <TableHead className="text-center">Bestand</TableHead>
                      <TableHead className="text-center">Mindest</TableHead>
                      <TableHead className="text-center">Fehlt</TableHead>
                      <TableHead className="text-right">Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => {
                      const missing = (item.min_stock || 0) - item.current_stock;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.brand || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{item.current_stock}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{item.min_stock}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-destructive">+{missing}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Bestand korrigieren
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Inventory Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Bestand bearbeiten</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4 [&_input]:text-base [&_textarea]:text-base [&_select]:text-base">
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                {editingItem.image_url ? (
                  <img
                    src={editingItem.image_url}
                    alt={editingItem.product_name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-background rounded flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{editingItem.product_name}</p>
                  <p className="text-sm text-muted-foreground">{editingItem.brand}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Bestand</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={editFormData.current_stock}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        current_stock: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax">MwSt.</Label>
                  <Select
                    value={editFormData.tax_rate}
                    onValueChange={(v) =>
                      setEditFormData({ ...editFormData, tax_rate: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_RATES.map((rate) => (
                        <SelectItem key={rate} value={rate}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_purchase">Einkaufspreis / EK (€)</Label>
                  <Input
                    id="price_purchase"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="z.B. 80.00"
                    value={editFormData.price_purchase}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, price_purchase: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Für Marge-Berechnung bei Angeboten
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Verkaufspreis / VK (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="z.B. 149.00"
                    value={editFormData.price_sell}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, price_sell: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_stock">Mindestbestand (für Warnung)</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min="0"
                  placeholder="z.B. 2"
                  value={editFormData.min_stock}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, min_stock: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Du erhältst eine Warnung, wenn der Bestand diesen Wert erreicht
                </p>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Input
                    id="notes"
                    placeholder="Optionale Notizen..."
                    value={editFormData.notes}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 flex-shrink-0 border-t mt-4 sticky bottom-0 bg-background">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateInventoryMutation.isPending}
                >
                  {updateInventoryMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Speichern
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
