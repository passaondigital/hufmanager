import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tags, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { PRICE_GROUPS } from "@/lib/priceGroups";

interface GroupPricingSectionProps {
  serviceId: string;
  basePrice: number;
}

export function GroupPricingSection({ serviceId, basePrice }: GroupPricingSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Fetch existing overrides
  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["service-price-overrides", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_price_overrides")
        .select("*")
        .eq("service_id", serviceId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!serviceId,
  });

  useEffect(() => {
    if (overrides.length > 0) {
      setEnabled(true);
      const p: Record<string, string> = {};
      overrides.forEach((o: any) => {
        p[o.price_group] = o.price.toString();
      });
      setPrices(p);
    }
  }, [overrides]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Delete existing overrides for this service
      await supabase
        .from("service_price_overrides")
        .delete()
        .eq("service_id", serviceId)
        .eq("provider_id", user.id);

      if (enabled) {
        // Insert new overrides (only non-empty ones)
        const inserts = PRICE_GROUPS
          .filter(g => g.value !== "standard" && prices[g.value] && prices[g.value] !== "")
          .map(g => ({
            service_id: serviceId,
            provider_id: user.id,
            price_group: g.value,
            price: parseFloat(prices[g.value]),
          }));

        if (inserts.length > 0) {
          const { error } = await supabase
            .from("service_price_overrides")
            .insert(inserts);
          if (error) throw error;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["service-price-overrides", serviceId] });
      toast({ title: "Gruppenpreise gespeichert" });
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 cursor-pointer">
          <Tags className="h-4 w-4 text-primary" />
          Gruppenpreise
        </Label>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <div className="space-y-2 pt-2">
          {/* Standard = base_price (read-only) */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="w-24 justify-center text-xs">Standard</Badge>
            <Input
              type="number"
              value={basePrice}
              disabled
              className="bg-muted h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">= Basispreis</span>
          </div>

          {PRICE_GROUPS.filter(g => g.value !== "standard").map(group => (
            <div key={group.value} className="flex items-center gap-3">
              <Badge variant="outline" className="w-24 justify-center text-xs">{group.label}</Badge>
              <Input
                type="number"
                step="0.01"
                placeholder={`€ ${basePrice}`}
                value={prices[group.value] || ""}
                onChange={(e) => setPrices(prev => ({ ...prev, [group.value]: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Gruppenpreise speichern
          </button>
        </div>
      )}
    </div>
  );
}
