import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Layers,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  product_name: string;
  brand: string | null;
  current_stock: number;
  image_url: string | null;
}

interface RecipeItem {
  id?: string;
  inventory_item_id: string;
  quantity: number;
  inventory_item?: InventoryItem;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  main_product_id: string | null;
  user_id: string;
  main_product?: InventoryItem | null;
  items?: RecipeItem[];
}

export function RecipesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    main_product_id: "",
    items: [] as { inventory_item_id: string; quantity: number }[],
  });

  // Fetch inventory items
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, product_name, brand, current_stock, image_url")
        .eq("user_id", user.id)
        .order("product_name", { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!user,
  });

  // Fetch recipes with items
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["product-recipes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: recipesData, error } = await supabase
        .from("product_recipes")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;

      // Fetch items for each recipe
      const recipesWithItems = await Promise.all(
        (recipesData || []).map(async (recipe) => {
          const { data: items } = await supabase
            .from("product_recipe_items")
            .select("*, inventory_items(id, product_name, brand, current_stock, image_url)")
            .eq("recipe_id", recipe.id);

          // Get main product
          let mainProduct = null;
          if (recipe.main_product_id) {
            const found = inventoryItems.find((i) => i.id === recipe.main_product_id);
            mainProduct = found || null;
          }

          return {
            ...recipe,
            main_product: mainProduct,
            items: (items || []).map((item) => ({
              id: item.id,
              inventory_item_id: item.inventory_item_id,
              quantity: item.quantity,
              inventory_item: item.inventory_items,
            })),
          };
        })
      );

      return recipesWithItems as Recipe[];
    },
    enabled: !!user && inventoryItems.length > 0,
  });

  // Save recipe mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("Nicht angemeldet");

      let recipeId: string;

      if (editingRecipe) {
        // Update recipe
        const { error } = await supabase
          .from("product_recipes")
          .update({
            name: data.name,
            description: data.description || null,
            main_product_id: data.main_product_id || null,
          })
          .eq("id", editingRecipe.id);
        if (error) throw error;
        recipeId = editingRecipe.id;

        // Delete existing items
        await supabase
          .from("product_recipe_items")
          .delete()
          .eq("recipe_id", recipeId);
      } else {
        // Create recipe
        const { data: newRecipe, error } = await supabase
          .from("product_recipes")
          .insert({
            user_id: user.id,
            name: data.name,
            description: data.description || null,
            main_product_id: data.main_product_id || null,
          })
          .select()
          .single();
        if (error) throw error;
        recipeId = newRecipe.id;
      }

      // Insert items
      if (data.items.length > 0) {
        const { error } = await supabase.from("product_recipe_items").insert(
          data.items.map((item) => ({
            recipe_id: recipeId,
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recipes"] });
      toast.success(editingRecipe ? "Bundle aktualisiert" : "Bundle erstellt");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  // Delete recipe mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-recipes"] });
      toast.success("Bundle gelöscht");
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const handleOpenCreate = () => {
    setEditingRecipe(null);
    setFormData({
      name: "",
      description: "",
      main_product_id: "",
      items: [],
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || "",
      main_product_id: recipe.main_product_id || "",
      items: (recipe.items || []).map((item) => ({
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
      })),
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRecipe(null);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { inventory_item_id: "", quantity: 1 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleUpdateItem = (index: number, field: "inventory_item_id" | "quantity", value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    
    // Filter out items with empty inventory_item_id to prevent UUID errors
    const validItems = formData.items.filter(item => item.inventory_item_id && item.inventory_item_id.trim() !== "");
    
    saveMutation.mutate({
      ...formData,
      items: validItems,
    });
  };

  // Check if form has any invalid items (empty product selection)
  const hasInvalidItems = formData.items.some(item => !item.inventory_item_id || item.inventory_item_id.trim() === "");

  const getItemName = (id: string) => {
    const item = inventoryItems.find((i) => i.id === id);
    return item?.product_name || "Unbekannt";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Produkt-Bundles
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Kombiniere Lager-Artikel zu Bundles (z.B. Beschlag = Eisen + Nägel + Kleber)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Neues Bundle
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Keine Bundles</p>
            <p className="text-sm mt-1">
              Erstelle dein erstes Produkt-Bundle
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{recipe.name}</h3>
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground">{recipe.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(recipe)} aria-label="Rezept bearbeiten">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(recipe.id)}
                        aria-label="Rezept löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {recipe.main_product && (
                    <div className="mb-3 p-2 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Hauptprodukt</p>
                      <div className="flex items-center gap-2">
                        {recipe.main_product.image_url ? (
                          <img src={recipe.main_product.image_url} alt="" className="w-6 h-6 rounded" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">{recipe.main_product.product_name}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Zutaten:</p>
                    {(recipe.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span>{item.inventory_item?.product_name || "?"}</span>
                        <Badge variant="outline">{item.quantity}x</Badge>
                      </div>
                    ))}
                    {(!recipe.items || recipe.items.length === 0) && (
                      <p className="text-sm text-muted-foreground italic">Keine Zutaten</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Recipe Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecipe ? "Bundle bearbeiten" : "Neues Bundle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Kompletter Beschlag"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung..."
              />
            </div>

            <div className="space-y-2">
              <Label>Hauptprodukt</Label>
              <Select
                value={formData.main_product_id}
                onValueChange={(v) => setFormData({ ...formData, main_product_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hauptprodukt wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product_name} {item.brand && `(${item.brand})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Zutaten</Label>
                <Button variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Hinzufügen
                </Button>
              </div>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={item.inventory_item_id}
                      onValueChange={(v) => handleUpdateItem(index, "inventory_item_id", v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Produkt wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      className="w-20"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(index, "quantity", parseInt(e.target.value) || 1)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      aria-label="Zutat entfernen"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Noch keine Zutaten hinzugefügt
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {hasInvalidItems && (
              <p className="text-sm text-warning mr-auto">
                Hinweis: Zutaten ohne Produkt werden ignoriert
              </p>
            )}
            <Button variant="outline" onClick={handleCloseDialog}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !formData.name.trim()}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
