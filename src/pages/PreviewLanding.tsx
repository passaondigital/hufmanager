import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const PreviewLanding = () => {
  const { token } = useParams<{ token: string }>();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Load preview link
  const { data: previewLink, isLoading, error } = useQuery({
    queryKey: ["preview-link", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from("preview_links")
        .select("*")
        .eq("token", token)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  // Load provider data when we have a link
  const { data: providerData } = useQuery({
    queryKey: ["preview-provider", previewLink?.provider_id],
    queryFn: async () => {
      if (!previewLink?.provider_id) return null;
      const { data } = await supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", previewLink.provider_id)
        .maybeSingle();
      return data;
    },
    enabled: !!previewLink?.provider_id,
  });

  // Increment view count once
  useEffect(() => {
    if (!previewLink?.id) return;
    supabase
      .from("preview_links")
      .update({
        view_count: (previewLink.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", previewLink.id)
      .then(() => {});
  }, [previewLink?.id]);

  const handleSubmitFeedback = async () => {
    if (!previewLink || rating === 0) return;
    const { error } = await supabase.from("preview_feedback").insert({
      preview_link_id: previewLink.id,
      provider_id: previewLink.provider_id,
      rating,
      comment: comment || null,
      reviewer_name: reviewerName || null,
    });
    if (error) {
      toast({ title: "Fehler beim Senden", variant: "destructive" });
      return;
    }
    // Update feedback count
    await supabase
      .from("preview_links")
      .update({ feedback_count: (previewLink.feedback_count || 0) + 1 })
      .eq("id", previewLink.id);
    setFeedbackSent(true);
    toast({ title: "✅ Feedback gesendet!" });
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid / expired
  if (!previewLink) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">
          Vorschau-Link ungültig
        </h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Dieser Vorschau-Link ist abgelaufen oder ungültig. Wenn du nach einem
          Hufpflege-Profi suchst, findest du hier Profis in deiner Nähe:
        </p>
        <Button asChild>
          <Link to="/website">hufmanager.de entdecken</Link>
        </Button>
      </div>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(previewLink.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isFeedback = previewLink.link_type === "feedback";
  const providerName = providerData?.business_name || providerData?.owner_name || "Hufpflege-Profi";
  const subdomain = providerData?.subdomain;

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Banner - sticky, not dismissible */}
      <div className="sticky top-0 z-50 border-b-2 border-primary bg-card px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">👁</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {isFeedback ? "Vorschau · Deine Meinung zählt!" : "Vorschau · Nicht öffentlich"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isFeedback
                  ? "Du wurdest eingeladen, Feedback zu geben."
                  : `Du wurdest eingeladen, einen Blick zu werfen. Noch ${daysLeft} Tage gültig.`}
              </p>
            </div>
          </div>
          {isFeedback && !feedbackSent && (
            <Button size="sm" className="gap-1 shrink-0" onClick={() => setFeedbackOpen(true)}>
              💬 Feedback geben
            </Button>
          )}
          {feedbackSent && (
            <span className="text-xs text-primary font-medium shrink-0">✅ Danke!</span>
          )}
        </div>
      </div>

      {/* Render the actual landing page content */}
      {subdomain ? (
        <iframe
          src={`${window.location.origin}/p/${subdomain}?preview_mode=true`}
          className="w-full border-0"
          style={{ height: "calc(100vh - 60px)" }}
          title="Vorschau"
        />
      ) : (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">Diese Seite hat noch keine Subdomain konfiguriert.</p>
        </div>
      )}

      {/* Feedback Widget Overlay */}
      {isFeedback && feedbackOpen && !feedbackSent && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">💬 Wie findest du diese Seite?</h3>
            <button onClick={() => setFeedbackOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
          </div>

          {/* Star Rating */}
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    s <= (hoverRating || rating)
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Was fällt dir auf?</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Dein Feedback..."
              className="text-sm min-h-[60px]"
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Dein Name (optional)</Label>
            <Input
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="z.B. Anna"
              className="h-8 text-sm"
              maxLength={50}
            />
          </div>

          <Button
            className="w-full"
            size="sm"
            disabled={rating === 0}
            onClick={handleSubmitFeedback}
          >
            Feedback abschicken
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Dein Feedback wird nur dem Seiteninhaber gezeigt.
          </p>
        </div>
      )}

      {/* Powered by footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur border-t border-border py-2 text-center z-40">
        <p className="text-[10px] text-muted-foreground">
          Powered by{" "}
          <a href="/website" className="text-primary hover:underline font-medium">
            HufManager
          </a>
        </p>
      </div>
    </div>
  );
};

export default PreviewLanding;
