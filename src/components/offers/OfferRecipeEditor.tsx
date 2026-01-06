import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  TrendingUp,
  TrendingDown,
  Clock,
  Tags,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  product_name: string;
  brand: string | null;
  current_stock: number;
  price_sell: number | null;
  price_purchase: number | null;
  min_stock: number | null;
}

interface RecipeMaterial {
  id?: string;
  inventory_item_id: string;
  quantity: number;
  inventory_item?: InventoryItem;
}

interface OfferRecipeEditorProps {
  offerId: string | null;
  offerPrice: number | null;
  durationMinutes: number;
  recommendedTags: string[];
  autoDeduct: boolean;
  onDurationChange: (minutes: number) => void;
  onTagsChange: (tags: string[]) => void;
  onAutoDeductChange: (autoDeduct: boolean) => void;
  materials: RecipeMaterial[];
  onMaterialsChange: (materials: RecipeMaterial[]) => void;
}

export function OfferRecipeEditor({
  offerId,
  offerPrice,
  durationMinutes,
  recommendedTags,
  autoDeduct,
  onDurationChange,
  onTagsChange,
  onAutoDeductChange,
  materials,
  onMaterialsChange,
}: OfferRecipeEditorProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState("");

  // Load inventory items
  useEffect(() => {
    const loadInventory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, product_name, brand, current_stock, price_sell, price_purchase, min_stock")
        .eq("user_id", user.id)
        .order("product_name");

      if (!error && data) {
        setInventoryItems(data as InventoryItem[]);
      }
      setLoading(false);
    };

    loadInventory();
  }, []);

  // Calculate material costs (EK)
  const materialCosts = materials.reduce((sum, mat) => {
    const item = mat.inventory_item || inventoryItems.find(i => i.id === mat.inventory_item_id);
    const ekPrice = item?.price_purchase || 0;
    return sum + (ekPrice * mat.quantity);
  }, 0);

  // Calculate profit margin
  const profitMargin = (offerPrice || 0) - materialCosts;
  const profitPercentage = offerPrice && offerPrice > 0 
    ? ((profitMargin / offerPrice) * 100)
    : 0;

  // Stock availability check
  const stockStatus = materials.every(mat => {
    const item = mat.inventory_item || inventoryItems.find(i => i.id === mat.inventory_item_id);
    return item && item.current_stock >= mat.quantity;
  }) ? "available" : materials.some(mat => {
    const item = mat.inventory_item || inventoryItems.find(i => i.id === mat.inventory_item_id);
    return item && item.current_stock >= mat.quantity;
  }) ? "partial" : "unavailable";

  // Filter inventory for search
  const filteredInventory = inventoryItems.filter(item =>
    !materials.some(m => m.inventory_item_id === item.id) &&
    (item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.brand?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addMaterial = (item: InventoryItem) => {
    onMaterialsChange([...materials, {
      inventory_item_id: item.id,
      quantity: 1,
      inventory_item: item,
    }]);
    setSearchQuery("");
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...materials];
    const newQty = Math.max(0.5, updated[index].quantity + delta);
    updated[index].quantity = newQty;
    onMaterialsChange(updated);
  };

  const setQuantity = (index: number, qty: number) => {
    const updated = [...materials];
    updated[index].quantity = Math.max(0.1, qty);
    onMaterialsChange(updated);
  };

  const removeMaterial = (index: number) => {
    onMaterialsChange(materials.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !recommendedTags.includes(tagInput.trim())) {
      onTagsChange([...recommendedTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    onTagsChange(recommendedTags.filter(t => t !== tag));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zeit & Tags Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Zeit & Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dauer (Minuten)</Label>
              <Input
                type="number"
                min="5"
                step="5"
                value={durationMinutes}
                onChange={(e) => onDurationChange(parseInt(e.target.value) || 60)}
              />
            </div>
            <div className="space-y-2">
              <Label>Auto-Abzug bei Rechnung</Label>
              <div className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  checked={autoDeduct}
                  onChange={(e) => onAutoDeductChange(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-muted-foreground">
                  Material automatisch abziehen
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Empfohlene Tags
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="z.B. Rehe, Sport, Barhuf..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button variant="secondary" size="icon" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {recommendedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {recommendedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: Das Rezept */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Das Rezept
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search & Add */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Material aus Lager suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchQuery && filteredInventory.length > 0 && (
              <ScrollArea className="h-40 border rounded-md">
                {filteredInventory.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addMaterial(item)}
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between text-sm"
                  >
                    <span>
                      {item.brand && <span className="text-muted-foreground">{item.brand} - </span>}
                      {item.product_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.current_stock} auf Lager
                    </Badge>
                  </button>
                ))}
              </ScrollArea>
            )}

            <Separator />

            {/* Added Materials */}
            {materials.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Noch keine Materialien hinzugefügt</p>
              </div>
            ) : (
              <div className="space-y-2">
                {materials.map((mat, index) => {
                  const item = mat.inventory_item || inventoryItems.find(i => i.id === mat.inventory_item_id);
                  const inStock = item ? item.current_stock >= mat.quantity : false;
                  
                  return (
                    <div
                      key={mat.inventory_item_id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border",
                        !inStock && "border-destructive/50 bg-destructive/5"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item?.brand && <span className="text-muted-foreground">{item.brand} - </span>}
                          {item?.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          EK: €{(item?.price_purchase || 0).toFixed(2)} | VK: €{(item?.price_sell || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, -0.5)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={mat.quantity}
                          onChange={(e) => setQuantity(index, parseFloat(e.target.value) || 1)}
                          className="w-16 h-7 text-center text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, 0.5)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeMaterial(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Der Profit-Check */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Der Profit-Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Costs Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Angebotspreis:</span>
                <span className="font-medium">€{(offerPrice || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Materialkosten (EK):</span>
                <span className="font-medium text-destructive">-€{materialCosts.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Gewinn-Marge:</span>
                <span className={cn(
                  "font-bold text-lg",
                  profitMargin >= 0 ? "text-green-600" : "text-destructive"
                )}>
                  €{profitMargin.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Margin Indicator */}
            <div className={cn(
              "p-4 rounded-lg flex items-center gap-3",
              profitPercentage >= 50 ? "bg-green-100 dark:bg-green-900/30" :
              profitPercentage >= 20 ? "bg-amber-100 dark:bg-amber-900/30" :
              "bg-red-100 dark:bg-red-900/30"
            )}>
              {profitPercentage >= 50 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : profitPercentage >= 20 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className={cn(
                  "font-medium",
                  profitPercentage >= 50 ? "text-green-700 dark:text-green-400" :
                  profitPercentage >= 20 ? "text-amber-700 dark:text-amber-400" :
                  "text-red-700 dark:text-red-400"
                )}>
                  {profitPercentage.toFixed(0)}% Marge
                </p>
                <p className="text-xs text-muted-foreground">
                  {profitPercentage >= 50 ? "Sehr gute Marge!" :
                   profitPercentage >= 20 ? "Akzeptable Marge" :
                   "Warnung: Geringe Marge"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Stock Status */}
            <div className={cn(
              "p-4 rounded-lg flex items-center gap-3",
              stockStatus === "available" ? "bg-green-100 dark:bg-green-900/30" :
              stockStatus === "partial" ? "bg-amber-100 dark:bg-amber-900/30" :
              "bg-red-100 dark:bg-red-900/30"
            )}>
              {stockStatus === "available" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : stockStatus === "partial" ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className={cn(
                  "font-medium",
                  stockStatus === "available" ? "text-green-700 dark:text-green-400" :
                  stockStatus === "partial" ? "text-amber-700 dark:text-amber-400" :
                  "text-red-700 dark:text-red-400"
                )}>
                  {stockStatus === "available" ? "Alle Materialien verfügbar" :
                   stockStatus === "partial" ? "Teilweise verfügbar" :
                   materials.length === 0 ? "Keine Materialien definiert" : "Material nicht verfügbar"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Basierend auf aktuellem Lagerbestand
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
