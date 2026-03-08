import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export const PreviewFeedbackPanel = () => {
  const { user } = useAuth();

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["preview-feedbacks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("preview_feedback")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="border rounded-lg p-4 bg-muted/20 text-center">
        <p className="text-xs text-muted-foreground">
          💬 Noch kein Vorschau-Feedback erhalten. Teile einen Feedback-Link, um Meinungen einzuholen.
        </p>
      </div>
    );
  }

  const avgRating = feedbacks.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedbacks.length;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">💬 Vorschau-Feedback</h4>

      {/* Average rating */}
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <span className="text-sm font-bold">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({feedbacks.length} Bewertungen)</span>
        </CardContent>
      </Card>

      {/* Individual feedbacks */}
      {feedbacks.map((fb: any) => (
        <div key={fb.id} className="border rounded-lg p-3 space-y-1 bg-muted/10">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3 w-3 ${s <= (fb.rating || 0) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {fb.reviewer_name ? `– ${fb.reviewer_name}` : "– (anonym)"} ·{" "}
              {formatDistanceToNow(new Date(fb.created_at), { locale: de, addSuffix: true })}
            </span>
          </div>
          {fb.comment && (
            <p className="text-sm text-foreground">"{fb.comment}"</p>
          )}
        </div>
      ))}
    </div>
  );
};
