import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { PricingModal } from "./PricingModal";

// Plan limits for horses
const PLAN_HORSE_LIMITS: Record<string, number | null> = {
  starter: 15,
  advanced: 50,
  pro: null, // unlimited
};

interface UsageMeterProps {
  collapsed?: boolean;
}

export function UsageMeter({ collapsed = false }: UsageMeterProps) {
  const { user, role } = useAuth();
  const { plan, status, loading: subLoading } = useSubscription();
  const [pricingOpen, setPricingOpen] = useState(false);

  const { data: horseCount = 0 } = useQuery({
    queryKey: ["horse-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await (supabase as any)
        .from("horses")
        .select("*", { count: "exact", head: true })
        .eq("provider_id", user.id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id && role === "provider",
  });

  if (subLoading || role !== "provider") return null;
  if (!plan || plan === "pro") return null; // Pro = unlimited, no meter

  const limit = PLAN_HORSE_LIMITS[plan];
  if (!limit) return null;

  const usage = Math.min((horseCount / limit) * 100, 100);
  const isNearLimit = usage >= 80;
  const isAtLimit = horseCount >= limit;

  if (collapsed) {
    return (
      <div
        className="mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer border border-border"
        style={{
          background: isAtLimit
            ? "hsl(var(--destructive))"
            : isNearLimit
            ? "hsl(var(--primary))"
            : "hsl(var(--muted))",
          color: isAtLimit || isNearLimit ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
        }}
        onClick={() => setPricingOpen(true)}
        title={`${horseCount}/${limit} Pferde`}
      >
        {horseCount}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => isNearLimit && setPricingOpen(true)}
        className="w-full px-4 py-2 text-left hover:bg-sidebar-accent/50 rounded-md transition-colors"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-sidebar-foreground/60">Pferde</span>
          <span className={`text-[11px] font-medium ${isAtLimit ? "text-destructive" : "text-sidebar-foreground/60"}`}>
            {horseCount}/{limit}
          </span>
        </div>
        <Progress value={usage} className="h-1" />
        {isNearLimit && (
          <p className="text-[10px] text-primary mt-1">
            {isAtLimit ? "Limit erreicht – Upgrade für mehr" : "Fast voll – Upgrade für unbegrenzt"}
          </p>
        )}
      </button>

      <PricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        title="Mehr Pferde verwalten"
        description="Upgrade dein Paket für mehr Kapazität."
        currentPlan={plan}
      />
    </>
  );
}
