import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OfferMaterial {
  inventory_item_id: string;
  quantity: number;
  inventory_item: {
    product_name: string;
    current_stock: number;
  } | null;
}

interface OfferStockBadgeProps {
  offerId: string;
}

export function OfferStockBadge({ offerId }: OfferStockBadgeProps) {
  const [status, setStatus] = useState<"loading" | "available" | "partial" | "unavailable" | "no_recipe">("loading");
  const [materials, setMaterials] = useState<OfferMaterial[]>([]);

  useEffect(() => {
    const checkStock = async () => {
      const { data, error } = await supabase
        .from("offer_materials")
        .select(`
          inventory_item_id,
          quantity,
          inventory_item:inventory_items(
            product_name,
            current_stock
          )
        `)
        .eq("offer_id", offerId);

      if (error) {
        console.error("Error loading offer materials:", error);
        setStatus("no_recipe");
        return;
      }

      if (!data || data.length === 0) {
        setStatus("no_recipe");
        return;
      }

      // Type the data correctly
      const typedMaterials = data as unknown as OfferMaterial[];
      setMaterials(typedMaterials);

      const allAvailable = typedMaterials.every(mat => 
        mat.inventory_item && mat.inventory_item.current_stock >= mat.quantity
      );
      
      const someAvailable = typedMaterials.some(mat => 
        mat.inventory_item && mat.inventory_item.current_stock >= mat.quantity
      );

      const anyCritical = typedMaterials.some(mat => 
        !mat.inventory_item || mat.inventory_item.current_stock === 0
      );

      if (allAvailable) {
        setStatus("available");
      } else if (anyCritical) {
        setStatus("unavailable");
      } else if (someAvailable) {
        setStatus("partial");
      } else {
        setStatus("unavailable");
      }
    };

    checkStock();
  }, [offerId]);

  if (status === "loading") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
      </Badge>
    );
  }

  if (status === "no_recipe") {
    return null; // No badge if no recipe defined
  }

  const statusConfig = {
    available: {
      icon: CheckCircle2,
      label: "Verfügbar",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0",
    },
    partial: {
      icon: AlertTriangle,
      label: "Nachbestellen",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0",
    },
    unavailable: {
      icon: XCircle,
      label: "Nicht verfügbar",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const missingItems = materials.filter(mat => 
    !mat.inventory_item || mat.inventory_item.current_stock < mat.quantity
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={cn("gap-1 text-xs cursor-help", config.className)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {status === "available" ? (
            <p>Alle {materials.length} Materialien auf Lager</p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">Fehlende Materialien:</p>
              {missingItems.map((mat, i) => (
                <p key={i} className="text-xs">
                  • {mat.inventory_item?.product_name || "Unbekannt"}: 
                  {mat.inventory_item?.current_stock || 0}/{mat.quantity}
                </p>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
