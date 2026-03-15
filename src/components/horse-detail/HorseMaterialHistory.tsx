import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Loader2 } from "lucide-react";

interface HorseMaterialHistoryProps {
  horseId: string;
}

interface MaterialEntry {
  quantity: number | null;
  description: string;
  unit_price: number;
  invoice_date: string;
  invoice_number: string;
  material_name: string | null;
  material_category: string | null;
}

export function HorseMaterialHistory({ horseId }: HorseMaterialHistoryProps) {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["horse-material-history", horseId],
    queryFn: async () => {
      // Get appointments for this horse
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id")
        .eq("horse_id", horseId);

      if (!appointments?.length) return [];

      const appointmentIds = appointments.map(a => a.id);

      // Get invoice_appointments linking
      const { data: invoiceLinks } = await supabase
        .from("invoice_appointments")
        .select("invoice_id, appointment_id")
        .in("appointment_id", appointmentIds);

      if (!invoiceLinks?.length) return [];

      const invoiceIds = [...new Set(invoiceLinks.map(l => l.invoice_id))];

      // Get invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_date, invoice_number")
        .in("id", invoiceIds);

      if (!invoices?.length) return [];

      // Get invoice items with inventory reference
      const { data: items } = await supabase
        .from("invoice_items")
        .select("id, quantity, description, unit_price, invoice_id, inventory_item_id")
        .in("invoice_id", invoiceIds);

      if (!items?.length) return [];

      // Get inventory item names
      const inventoryIds = items.filter(i => i.inventory_item_id).map(i => i.inventory_item_id!);
      let inventoryMap: Record<string, { name: string; category: string | null }> = {};
      
      if (inventoryIds.length > 0) {
        const { data: inventoryItems } = await supabase
          .from("inventory_items")
          .select("id, name, category")
          .in("id", inventoryIds);
        
        inventoryItems?.forEach(item => {
          inventoryMap[item.id] = { name: item.name, category: item.category };
        });
      }

      const invoiceMap = new Map(invoices.map(i => [i.id, i]));

      const result: MaterialEntry[] = items.map(item => {
        const invoice = invoiceMap.get(item.invoice_id);
        const inventoryItem = item.inventory_item_id ? inventoryMap[item.inventory_item_id] : null;
        return {
          quantity: item.quantity,
          description: item.description,
          unit_price: item.unit_price,
          invoice_date: invoice?.invoice_date || "",
          invoice_number: invoice?.invoice_number || "",
          material_name: inventoryItem?.name || null,
          material_category: inventoryItem?.category || null,
        };
      });

      return result.sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
    },
    enabled: !!horseId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalPositions = materials.length;
  const totalAmount = materials.reduce((sum, m) => sum + (m.quantity || 1) * m.unit_price, 0);
  const oldestDate = materials.length > 0 
    ? materials[materials.length - 1]?.invoice_date 
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Material-Historie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Materialien erfasst
            </p>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-3 border-b border-border">
                <span>Gesamt: <strong className="text-foreground">{totalPositions} Positionen</strong></span>
                <span>
                  <strong className="text-foreground">{totalAmount.toFixed(2)} €</strong>
                  {oldestDate && <> seit {new Date(oldestDate).toLocaleDateString("de-DE")}</>}
                </span>
              </div>
              
              {/* Timeline */}
              <div className="space-y-2">
                {materials.map((m, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {m.material_name || m.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.quantity || 1}× {m.unit_price.toFixed(2)} € · RE {m.invoice_number}
                      </p>
                      {m.material_category && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {m.material_category}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {m.invoice_date ? new Date(m.invoice_date).toLocaleDateString("de-DE") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}