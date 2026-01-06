import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface InventoryItem {
  id: string;
  product_name: string;
  brand: string | null;
  current_stock: number;
  price_sell: number | null;
  price_purchase: number | null;
  min_stock: number | null;
}

interface OfferMaterial {
  id?: string;
  inventory_item_id: string;
  quantity: number;
  inventory_item?: InventoryItem;
}

export function useOfferMaterials(offerId: string | null) {
  const [materials, setMaterials] = useState<OfferMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Load materials when offerId changes
  useEffect(() => {
    if (!offerId) {
      setMaterials([]);
      return;
    }

    const loadMaterials = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("offer_materials")
        .select(`
          id,
          inventory_item_id,
          quantity,
          inventory_item:inventory_items(
            id,
            product_name,
            brand,
            current_stock,
            price_sell,
            price_purchase,
            min_stock
          )
        `)
        .eq("offer_id", offerId);

      if (!error && data) {
        // Transform data to match our interface
        const transformedData = data.map(item => ({
          id: item.id,
          inventory_item_id: item.inventory_item_id,
          quantity: Number(item.quantity),
          inventory_item: item.inventory_item as unknown as InventoryItem,
        }));
        setMaterials(transformedData);
      }
      setLoading(false);
    };

    loadMaterials();
  }, [offerId]);

  // Save materials to database
  const saveMaterials = async (offerId: string, newMaterials: OfferMaterial[]) => {
    // Delete existing materials
    await supabase
      .from("offer_materials")
      .delete()
      .eq("offer_id", offerId);

    // Insert new materials
    if (newMaterials.length > 0) {
      const { error } = await supabase
        .from("offer_materials")
        .insert(
          newMaterials.map(mat => ({
            offer_id: offerId,
            inventory_item_id: mat.inventory_item_id,
            quantity: mat.quantity,
          }))
        );

      if (error) {
        console.error("Error saving offer materials:", error);
        throw error;
      }
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["offer-materials", offerId] });
  };

  // Deduct stock for an offer (used when creating invoice)
  const deductStock = async (offerId: string): Promise<{ success: boolean; warnings: string[] }> => {
    const warnings: string[] = [];

    // Load materials for this offer
    const { data: offerMats, error: loadError } = await supabase
      .from("offer_materials")
      .select(`
        inventory_item_id,
        quantity,
        inventory_item:inventory_items(
          id,
          product_name,
          current_stock
        )
      `)
      .eq("offer_id", offerId);

    if (loadError || !offerMats) {
      return { success: false, warnings: ["Konnte Rezept nicht laden"] };
    }

    // Check stock and deduct
    for (const mat of offerMats) {
      const item = mat.inventory_item as unknown as { id: string; product_name: string; current_stock: number } | null;
      if (!item) continue;

      const newStock = item.current_stock - Number(mat.quantity);
      
      if (newStock < 0) {
        warnings.push(`${item.product_name}: Nicht genügend Bestand (${item.current_stock}/${mat.quantity})`);
        continue;
      }

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ current_stock: newStock })
        .eq("id", item.id);

      if (updateError) {
        warnings.push(`${item.product_name}: Fehler beim Abzug`);
      }
    }

    // Invalidate inventory queries
    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });

    return { success: warnings.length === 0, warnings };
  };

  return {
    materials,
    setMaterials,
    loading,
    saveMaterials,
    deductStock,
  };
}
