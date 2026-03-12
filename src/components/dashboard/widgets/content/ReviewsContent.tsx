import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { WidgetContentProps } from "./types";

export default function ReviewsContent(_props: WidgetContentProps) {
  const { user } = useAuth();

  const { data: reviews = [] } = useQuery({
    queryKey: ["widget-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, reviewer_name, rating, text, created_at")
        .eq("provider_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (reviews.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Noch keine Bewertungen</p>;
  }

  return (
    <div className="space-y-2">
      {reviews.map((r) => (
        <div key={r.id} className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-xs">{"⭐".repeat(Math.min(r.rating || 0, 5))}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{r.reviewer_name}</span>
          </div>
          {r.text && (
            <p className="text-xs text-muted-foreground line-clamp-2">"{r.text}"</p>
          )}
        </div>
      ))}
    </div>
  );
}
