import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Plus, Minus, Search, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  org_id: string;
  name: string;
  short_description: string | null;
  image_url: string | null;
  category: string | null;
  price_net: number | null;
  price_currency: string;
  unit: string;
  sizes: string[];
  application_areas: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
}

const CATEGORIES = ["Alle", "Hufschutz", "Werkzeug", "Pflegemittel", "Beschlag", "Zubehör"];

export default function Marketplace() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["marketplace-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_products")
        .select("id, org_id, name, short_description, image_url, category, price_net, price_currency, unit, sizes, application_areas")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as Product[];
    },
  });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "Alle" || p.category === category;
      return matchSearch && matchCat;
    });
  }, [products, search, category]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.product.id === productId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0)
    );
  };

  const totalNet = cart.reduce((sum, c) => sum + (c.product.price_net || 0) * c.quantity, 0);

  const placeOrder = useMutation({
    mutationFn: async () => {
      // Group by org
      const byOrg = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
        (acc[item.product.org_id] = acc[item.product.org_id] || []).push(item);
        return acc;
      }, {});

      for (const [orgId, items] of Object.entries(byOrg)) {
        const orderItems = items.map((i) => ({
          product_id: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price_net: i.product.price_net,
          size: i.size || null,
        }));
        const orderTotal = items.reduce((s, i) => s + (i.product.price_net || 0) * i.quantity, 0);

        const { error } = await supabase.from("organization_orders").insert({
          org_id: orgId,
          ordered_by: user!.id,
          items: orderItems,
          total_net: orderTotal,
          status: "pending",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setCart([]);
      toast({ title: "Bestellung aufgegeben!", description: "Die Lieferanten wurden benachrichtigt." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Bestellung konnte nicht aufgegeben werden.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" /> Marktplatz
        </h1>
        <p className="text-sm text-muted-foreground">Produkte direkt von Herstellern und Lieferanten bestellen</p>
      </div>

      {/* Search + Categories */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Produkt suchen…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={category === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Keine Produkte gefunden</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => {
            const inCart = cart.find((c) => c.product.id === product.id);
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground/30" />
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold line-clamp-2">{product.name}</h3>
                  {product.short_description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{product.short_description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">
                      {product.price_net != null ? `${product.price_net.toFixed(2)}€` : "–"}
                    </span>
                    {inCart ? (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(product.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{inCart.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(product.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => addToCart(product)}>
                        <Plus className="h-3 w-3 mr-1" /> Korb
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border rounded-2xl shadow-lg p-4 flex items-center gap-4 z-50">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">
            {cart.reduce((s, c) => s + c.quantity, 0)} Artikel · {totalNet.toFixed(2)}€
          </span>
          <Button onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending}>
            {placeOrder.isPending ? "Wird gesendet…" : "Bestellen"}
          </Button>
        </div>
      )}
    </div>
  );
}
