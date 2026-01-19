import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  ShoppingCart,
  Package,
  Loader2,
  Mail,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  product_name: string;
  brand: string | null;
  current_stock: number;
  min_stock: number | null;
  price_purchase: number | null;
  image_url: string | null;
}

interface Supplier {
  id: string;
  name: string;
  email: string | null;
}

interface PurchaseOrder {
  id: string;
  supplier_id: string | null;
  status: string;
  total_amount: number | null;
  suppliers?: { name: string; email: string | null } | null;
}

interface PurchaseOrderItem {
  id: string;
  order_id: string;
  inventory_item_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | null;
}

export function PurchasingTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");

  // Fetch inventory items with low stock
  const { data: lowStockItems = [], isLoading: loadingInventory } = useQuery({
    queryKey: ["inventory-items-low-stock", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", user.id)
        .order("product_name", { ascending: true });

      if (error) throw error;
      return (data || []).filter(
        (item) => item.min_stock && item.min_stock > 0 && item.current_stock <= item.min_stock
      ) as InventoryItem[];
    },
    enabled: !!user,
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, email")
        .eq("provider_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!user,
  });

  // Fetch draft orders
  const { data: draftOrders = [] } = useQuery({
    queryKey: ["purchase-orders-draft", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(name, email)")
        .eq("provider_id", user.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!user,
  });

  // Fetch order items for draft orders
  const { data: orderItems = [] } = useQuery({
    queryKey: ["purchase-order-items", draftOrders.map((o) => o.id)],
    queryFn: async () => {
      if (draftOrders.length === 0) return [];
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("*")
        .in("order_id", draftOrders.map((o) => o.id));

      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: draftOrders.length > 0,
  });

  // Budget calculation: Invoices (income) - Purchase Orders (expenses)
  const { data: budget = { income: 0, expenses: 0, balance: 0 } } = useQuery({
    queryKey: ["budget-calculation", user?.id],
    queryFn: async () => {
      if (!user) return { income: 0, expenses: 0, balance: 0 };

      // Sum paid invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, status")
        .eq("provider_id", user.id)
        .eq("status", "paid");

      const income = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      // Sum purchase orders (ordered + delivered)
      const { data: orders } = await supabase
        .from("purchase_orders")
        .select("total_amount, status")
        .eq("provider_id", user.id)
        .in("status", ["ordered", "delivered"]);

      const expenses = (orders || []).reduce((sum, ord) => sum + (ord.total_amount || 0), 0);

      return {
        income,
        expenses,
        balance: income - expenses,
      };
    },
    enabled: !!user,
  });

  // Add item to order mutation
  const addToOrderMutation = useMutation({
    mutationFn: async (item: InventoryItem) => {
      if (!user) throw new Error("Nicht angemeldet");
      if (!selectedSupplier) throw new Error("Bitte wähle einen Lieferanten");

      // Find or create draft order for this supplier
      let orderId: string;
      const existingOrder = draftOrders.find((o) => o.supplier_id === selectedSupplier);

      if (existingOrder) {
        orderId = existingOrder.id;
      } else {
        const { data: newOrder, error: orderError } = await supabase
          .from("purchase_orders")
          .insert({
            provider_id: user.id,
            supplier_id: selectedSupplier,
            status: "draft",
            total_amount: 0,
          })
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = newOrder.id;
      }

      // Check if item already in order
      const existingItem = orderItems.find(
        (oi) => oi.order_id === orderId && oi.inventory_item_id === item.id
      );

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from("purchase_order_items")
          .update({ quantity: existingItem.quantity + ((item.min_stock || 1) - item.current_stock) })
          .eq("id", existingItem.id);
        if (error) throw error;
      } else {
        // Add new item
        const quantity = Math.max(1, (item.min_stock || 1) - item.current_stock);
        const { error } = await supabase.from("purchase_order_items").insert({
          order_id: orderId,
          inventory_item_id: item.id,
          product_name: item.product_name,
          quantity,
          unit_price: item.price_purchase,
        });
        if (error) throw error;
      }

      // Update order total
      const { data: items } = await supabase
        .from("purchase_order_items")
        .select("quantity, unit_price")
        .eq("order_id", orderId);

      const total = (items || []).reduce(
        (sum, i) => sum + (i.quantity * (i.unit_price || 0)),
        0
      );

      await supabase
        .from("purchase_orders")
        .update({ total_amount: total })
        .eq("id", orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders-draft"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order-items"] });
      toast.success("Zur Bestellung hinzugefügt");
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  // Send order via email
  const handleSendOrder = (order: PurchaseOrder) => {
    const supplier = suppliers.find((s) => s.id === order.supplier_id);
    if (!supplier?.email) {
      toast.error("Lieferant hat keine Email-Adresse");
      return;
    }

    const items = orderItems.filter((oi) => oi.order_id === order.id);
    const itemsList = items
      .map((item) => `- ${item.quantity}x ${item.product_name}`)
      .join("\n");

    const subject = encodeURIComponent(`Bestellung - ${new Date().toLocaleDateString("de-DE")}`);
    const body = encodeURIComponent(
      `Hallo ${supplier.name},\n\nich bestelle hiermit folgende Artikel:\n\n${itemsList}\n\nVielen Dank!\n\nMit freundlichen Grüßen`
    );

    window.open(`mailto:${supplier.email}?subject=${subject}&body=${body}`, "_blank");

    // Mark order as sent
    supabase
      .from("purchase_orders")
      .update({ status: "ordered", ordered_at: new Date().toISOString() })
      .eq("id", order.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["purchase-orders-draft"] });
        toast.success("Bestellung als gesendet markiert");
      });
  };

  const isNegativeBudget = budget.balance < 0;

  return (
    <div className="space-y-6">
      {/* Budget Card */}
      <Card className={isNegativeBudget ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Budget-Wächter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Einnahmen</span>
              </div>
              <p className="text-2xl font-bold">{budget.income.toFixed(2)} €</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">Ausgaben</span>
              </div>
              <p className="text-2xl font-bold">{budget.expenses.toFixed(2)} €</p>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-muted-foreground">Verfügbar</span>
              <p className={`text-2xl font-bold ${isNegativeBudget ? "text-destructive" : "text-primary"}`}>
                {budget.balance.toFixed(2)} €
              </p>
            </div>
          </div>
          {isNegativeBudget && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Budget im Minus!</AlertTitle>
              <AlertDescription>
                Deine Ausgaben übersteigen die Einnahmen. Bitte prüfe deine Bestellungen.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Warning */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Nachbestellbedarf
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Produkte unter Mindestbestand
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Lieferant wählen..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingInventory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Alle Produkte auf Lager!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-center">Bestand</TableHead>
                  <TableHead className="text-center">Mindest</TableHead>
                  <TableHead className="text-center">Fehlt</TableHead>
                  <TableHead className="text-right">EK-Preis</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => {
                  const missing = (item.min_stock || 0) - item.current_stock;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p>{item.product_name}</p>
                            {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                          </div>
                        </div>
                      </TableCell>
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
                        {item.price_purchase ? `${item.price_purchase.toFixed(2)} €` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => addToOrderMutation.mutate(item)}
                          disabled={!selectedSupplier || addToOrderMutation.isPending}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Bestellen
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

      {/* Draft Orders */}
      {draftOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Offene Bestellungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {draftOrders.map((order) => {
              const items = orderItems.filter((oi) => oi.order_id === order.id);
              const supplier = suppliers.find((s) => s.id === order.supplier_id);
              
              return (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{supplier?.name || "Unbekannt"}</p>
                      <p className="text-sm text-muted-foreground">
                        {items.length} Artikel • {order.total_amount?.toFixed(2) || "0.00"} €
                      </p>
                    </div>
                    <Button
                      onClick={() => handleSendOrder(order)}
                      disabled={!supplier?.email}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Per Email bestellen
                    </Button>
                  </div>
                  <div className="text-sm space-y-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-muted-foreground">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>{((item.unit_price || 0) * item.quantity).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
