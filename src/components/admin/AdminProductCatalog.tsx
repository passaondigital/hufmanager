import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, ExternalLink, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GlobalProduct {
  id: string;
  brand: string;
  name: string;
  category: string | null;
  shop_url: string | null;
  image_url: string | null;
  created_at: string;
}

const CATEGORIES = [
  "Hufschuhe",
  "Beschlag",
  "Werkzeug",
  "Pflegeprodukte",
  "Zubehör",
  "Sonstiges",
];

const BRANDS = [
  "Goodsmith",
  "Duplo",
  "Equine Fusion",
  "Scoot Boot",
  "Renegade",
  "Hoof Armor",
  "Sonstige",
];

export function AdminProductCatalog() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GlobalProduct | null>(null);
  const [formData, setFormData] = useState({
    brand: "",
    name: "",
    category: "",
    shop_url: "",
    image_url: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch global products
  const { data: products = [], isLoading } = useQuery({
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

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingProduct) {
        const { error } = await supabase
          .from("global_products")
          .update({
            brand: data.brand,
            name: data.name,
            category: data.category || null,
            shop_url: data.shop_url || null,
            image_url: data.image_url || null,
          })
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("global_products").insert({
          brand: data.brand,
          name: data.name,
          category: data.category || null,
          shop_url: data.shop_url || null,
          image_url: data.image_url || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-products"] });
      toast.success(editingProduct ? "Produkt aktualisiert" : "Produkt hinzugefügt");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Fehler: " + (error as Error).message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("global_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-products"] });
      toast.success("Produkt gelöscht");
    },
    onError: (error) => {
      toast.error("Fehler: " + (error as Error).message);
    },
  });

  const handleOpenDialog = (product?: GlobalProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        brand: product.brand,
        name: product.name,
        category: product.category || "",
        shop_url: product.shop_url || "",
        image_url: product.image_url || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({ brand: "", name: "", category: "", shop_url: "", image_url: "" });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData({ brand: "", name: "", category: "", shop_url: "", image_url: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.name) {
      toast.error("Marke und Name sind erforderlich");
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produktkatalog ({products.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Globaler Katalog - Nutzer können diese Produkte in ihr Lager übernehmen
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Produkt hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Produkt bearbeiten" : "Neues Produkt"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marke *</Label>
                    <Select
                      value={formData.brand}
                      onValueChange={(v) => setFormData({ ...formData, brand: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Marke wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANDS.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Produktname *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Goodsmith Trail Pro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shop_url">Shop-Link</Label>
                  <Input
                    id="shop_url"
                    type="url"
                    value={formData.shop_url}
                    onChange={(e) => setFormData({ ...formData, shop_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Bild-URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                  {formData.image_url && (
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-lg mt-2"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingProduct ? "Speichern" : "Hinzufügen"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Suche nach Name, Marke oder Kategorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Keine Produkte gefunden" : "Noch keine Produkte im Katalog"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Bild</TableHead>
                  <TableHead>Marke</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.brand}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category || "-"}</TableCell>
                    <TableCell>
                      {product.shop_url && (
                        <a
                          href={product.shop_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Link
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(product.id)}
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
    </div>
  );
}
