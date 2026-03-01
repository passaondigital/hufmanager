import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const SocialProofWidget = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: providerCount } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "provider");
      if (providerCount !== null) setCount(providerCount);
    };
    fetchCount();
  }, []);

  if (count === null || count < 3) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex -space-x-1.5">
        {[...Array(Math.min(3, count))].map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-primary/15 border-2 border-card flex items-center justify-center"
          >
            <Users className="h-3 w-3 text-primary" />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{count}</span> Hufpfleger nutzen heute HufManager
      </p>
    </div>
  );
};
