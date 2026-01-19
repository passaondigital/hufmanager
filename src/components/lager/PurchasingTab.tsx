import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Sparkles,
  Clock,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { subWeeks, format, parseISO, differenceInDays } from "date-fns";

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

interface OfferMaterial {
  id: string;
  offer_id: string;
  inventory_item_id: string;
  quantity: number;
}

interface OrderSuggestion {
  item: InventoryItem;
  suggestedQuantity: number;
  weeklyConsumption: number;
  weeksUntilEmpty: number;
  urgency: "critical" | "soon" | "planned";
  reason: string;
}

export function PurchasingTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Fetch ALL inventory items
  const { data: allInventoryItems = [], isLoading: loadingInventory } = useQuery({
    queryKey: ["inventory-items-all", user?.id],
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

  // Filter low stock items
  const lowStockItems = useMemo(() => 
    allInventoryItems.filter(
      (item) => item.min_stock && item.min_stock > 0 && item.current_stock <= item.min_stock
    ), [allInventoryItems]
  );

  // Fetch completed appointments from the last 8 weeks for consumption analysis
  const { data: recentAppointments = [] } = useQuery({
    queryKey: ["appointments-consumption", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const eightWeeksAgo = subWeeks(new Date(), 8).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, service_type, completed_at")
        .eq("provider_id", user.id)
        .eq("status", "completed")
        .gte("date", eightWeeksAgo)
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch offer_materials to understand which materials are used per service
  const { data: offerMaterials = [] } = useQuery({
    queryKey: ["offer-materials", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("offer_materials")
        .select("*, offers!inner(provider_id, title)")
        .eq("offers.provider_id", user.id);

      if (error) throw error;
      return data as (OfferMaterial & { offers: { provider_id: string; title: string } })[];
    },
    enabled: !!user,
  });

  // Calculate order suggestions based on consumption
  const orderSuggestions = useMemo(() => {
    if (allInventoryItems.length === 0) return [];

    const suggestions: OrderSuggestion[] = [];
    const weeksAnalyzed = 8;
    const appointmentCount = recentAppointments.length;

    // Calculate consumption per item based on offer_materials usage
    const consumptionMap = new Map<string, number>();

    // For each completed appointment, estimate material usage
    offerMaterials.forEach((material) => {
      const currentConsumption = consumptionMap.get(material.inventory_item_id) || 0;
      // Estimate: each material is used once per appointment that uses that offer type
      consumptionMap.set(
        material.inventory_item_id,
        currentConsumption + (material.quantity * (appointmentCount / weeksAnalyzed))
      );
    });

    allInventoryItems.forEach((item) => {
      const weeklyConsumption = consumptionMap.get(item.id) || 0;
      const minStock = item.min_stock || 0;
      const currentStock = item.current_stock;
      
      // Calculate weeks until stock runs out (based on consumption or min_stock)
      let weeksUntilEmpty = Infinity;
      if (weeklyConsumption > 0) {
        weeksUntilEmpty = currentStock / weeklyConsumption;
      } else if (minStock > 0 && currentStock <= minStock) {
        weeksUntilEmpty = 0;
      }

      // Determine if we should suggest ordering
      let shouldSuggest = false;
      let urgency: "critical" | "soon" | "planned" = "planned";
      let reason = "";
      let suggestedQuantity = 0;

      // Critical: Already below min_stock
      if (minStock > 0 && currentStock <= minStock) {
        shouldSuggest = true;
        urgency = "critical";
        suggestedQuantity = Math.max(minStock * 2 - currentStock, minStock);
        reason = `Unter Mindestbestand (${currentStock}/${minStock})`;
      }
      // Soon: Will run out in 2-4 weeks based on consumption
      else if (weeklyConsumption > 0 && weeksUntilEmpty <= 4 && weeksUntilEmpty > 0) {
        shouldSuggest = true;
        urgency = weeksUntilEmpty <= 2 ? "critical" : "soon";
        // Suggest ordering enough for 6 weeks
        suggestedQuantity = Math.ceil(weeklyConsumption * 6);
        reason = `Reicht noch ~${Math.round(weeksUntilEmpty)} Wochen (${weeklyConsumption.toFixed(1)}/Woche)`;
      }
      // Planned: High consumption items that should be stocked up
      else if (weeklyConsumption > 1 && currentStock < weeklyConsumption * 6) {
        shouldSuggest = true;
        urgency = "planned";
        suggestedQuantity = Math.ceil(weeklyConsumption * 8) - currentStock;
        reason = `Hoher Verbrauch: ${weeklyConsumption.toFixed(1)}/Woche`;
      }

      if (shouldSuggest && suggestedQuantity > 0) {
        suggestions.push({
          item,
          suggestedQuantity: Math.ceil(suggestedQuantity),
          weeklyConsumption: Math.round(weeklyConsumption * 10) / 10,
          weeksUntilEmpty: Math.round(weeksUntilEmpty * 10) / 10,
          urgency,
          reason,
        });
      }
    });

    // Sort by urgency: critical first, then soon, then planned
    const urgencyOrder = { critical: 0, soon: 1, planned: 2 };
    return suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, [allInventoryItems, recentAppointments, offerMaterials]);

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

  const getUrgencyBadge = (urgency: "critical" | "soon" | "planned") => {
    switch (urgency) {
      case "critical":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Kritisch</Badge>;
      case "soon":
        return <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"><Clock className="h-3 w-3" />Bald</Badge>;
      case "planned":
        return <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />Geplant</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Smart Order Suggestions */}
      {orderSuggestions.length > 0 && showSuggestions && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Intelligenter Bestellvorschlag
              </CardTitle>
              <CardDescription>
                Basierend auf deinem Verbrauch der letzten 8 Wochen ({recentAppointments.length} Termine)
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowSuggestions(false)}>
              Ausblenden
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orderSuggestions.slice(0, 5).map((suggestion) => (
                <div
                  key={suggestion.item.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {suggestion.item.image_url ? (
                      <img
                        src={suggestion.item.image_url}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{suggestion.item.product_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{suggestion.reason}</span>
                        {suggestion.weeklyConsumption > 0 && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {suggestion.weeklyConsumption}/Wo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getUrgencyBadge(suggestion.urgency)}
                    <div className="text-right">
                      <p className="font-semibold text-primary">+{suggestion.suggestedQuantity}</p>
                      <p className="text-xs text-muted-foreground">
                        Bestand: {suggestion.item.current_stock}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={suggestion.urgency === "critical" ? "default" : "outline"}
                      onClick={() => {
                        if (!selectedSupplier) {
                          toast.error("Bitte wähle zuerst einen Lieferanten");
                          return;
                        }
                        addToOrderMutation.mutate(suggestion.item);
                      }}
                      disabled={!selectedSupplier || addToOrderMutation.isPending}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {orderSuggestions.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  + {orderSuggestions.length - 5} weitere Vorschläge
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
