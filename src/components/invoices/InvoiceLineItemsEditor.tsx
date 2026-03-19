import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Trash2 } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { useTaxConfig } from "@/hooks/useTaxConfig";
import { calculateDisplayPrice, VAT_RATES } from "@/lib/taxConfig";

export interface InvoiceLineItem {
  id: string;
  inventory_item_id: string | null;
  title: string;
  quantity: number;
  unit_price: number;
}

export interface InventoryItem {
  id: string;
  product_name: string;
  brand: string | null;
  current_stock: number;
  price_sell: number | null;
  tax_rate: number | null;
  min_stock: number | null;
}

interface InvoiceLineItemsEditorProps {
  lineItems: InvoiceLineItem[];
  inventoryItems: InventoryItem[];
  onAddEmptyItem: () => void;
  onUpdateItem: (id: string, field: keyof InvoiceLineItem, value: string | number | null) => void;
  onRemoveItem: (id: string) => void;
  onInventorySelect: (lineItemId: string, inventoryItemId: string) => void;
}

export function InvoiceLineItemsEditor({
  lineItems,
  inventoryItems,
  onAddEmptyItem,
  onUpdateItem,
  onRemoveItem,
  onInventorySelect,
}: InvoiceLineItemsEditorProps) {
  const taxConfig = useTaxConfig();
  const currency = taxConfig.country === "CH" ? "CHF" : "EUR";
  const currencySymbol = taxConfig.country === "CH" ? "Fr." : "€";
  const vatLabel = VAT_RATES[taxConfig.country]?.label || "MwSt";
  const isMwstPflichtig = taxConfig.mwstPflichtig && !taxConfig.kleinunternehmer;
  const mode = taxConfig.priceDisplayMode;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Rechnungspositionen
          <HelpTip id="rechnungen.position-hinzufuegen" />
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddEmptyItem}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Position hinzufügen
        </Button>
      </div>

      {/* Line Items List */}
      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
        {lineItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch keine Positionen hinzugefügt</p>
            <p className="text-xs mt-1">Klicken Sie auf "+ Position hinzufügen"</p>
          </div>
        ) : (
          lineItems.map((item) => (
            <div key={item.id} className="p-3 bg-muted/50 rounded-lg border space-y-2">
              <div className="flex items-start gap-2">
                {/* Product Selection Dropdown */}
                <div className="flex-1 space-y-2">
                  <Select
                    value={item.inventory_item_id || "custom"}
                    onValueChange={(value) => onInventorySelect(item.id, value)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Produkt aus Lager wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        <span className="text-muted-foreground">— Manueller Eintrag —</span>
                      </SelectItem>
                      {inventoryItems.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{inv.brand ? `${inv.brand} - ${inv.product_name}` : inv.product_name}</span>
                            <span className="text-muted-foreground text-xs">
                              {formatCurrency(inv.price_sell || 0)} · {inv.current_stock} Stk.
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Editable Title */}
                  <Input
                    value={item.title}
                    onChange={(e) => onUpdateItem(item.id, "title", e.target.value)}
                    placeholder="Beschreibung..."
                    className="h-9 text-sm"
                  />
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Quantity and Price */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">Menge: <HelpTip id="rechnungen.menge" /></Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    className="h-8 w-16 text-sm text-center"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    {mode === "brutto" ? `Brutto ${currencySymbol}` : `Netto ${currencySymbol}`}: <HelpTip id="rechnungen.einzel-preis" />
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => onUpdateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                    className="h-8 w-24 text-sm"
                  />
                </div>

                <div className="ml-auto text-right">
                  <span className="text-sm font-semibold">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </span>
                  {isMwstPflichtig && item.unit_price > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {mode === "netto" ? "brutto" : "netto"}: {formatCurrency(
                        calculateDisplayPrice(item.quantity * item.unit_price, taxConfig, mode === "netto" ? "brutto" : "netto")
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
