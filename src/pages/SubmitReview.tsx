import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SubmitReview = () => {
  const [searchParams] = useSearchParams();
  const { providerId: pathProviderId } = useParams();
  const navigate = useNavigate();
  // Support both /bewertung/:providerId and /submit-review?provider=...
  const providerId = pathProviderId || searchParams.get("provider");
  const token = searchParams.get("token");
  const kundenName = searchParams.get("kunde");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [formData, setFormData] = useState({
    reviewer_name: kundenName || "",
    reviewer_email: "",
    text: ""
  });

  useEffect(() => {
    const fetchProvider = async () => {
      if (!providerId) {
        setError("Ungültiger Link");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("business_settings")
          .select("business_name, owner_name")
          .eq("user_id", providerId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setProviderName(data.business_name || data.owner_name || "Hufbearbeiter");
        } else {
          setError("Provider nicht gefunden");
        }
      } catch (err) {
        setError("Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [providerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) return;

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("reviews").insert({
        provider_id: providerId,
        reviewer_name: formData.reviewer_name,
        reviewer_email: formData.reviewer_email || null,
        rating,
        text: formData.text || null,
        token: token || undefined
      });

      if (insertError) throw insertError;

      setSubmitted(true);
      toast({
        title: "Vielen Dank!",
        description: "Ihre Bewertung wurde erfolgreich übermittelt."
      });
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Bewertung konnte nicht gesendet werden.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Fehler</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Vielen Dank!</h1>
            <p className="text-muted-foreground mb-4">
              Ihre Bewertung wurde erfolgreich übermittelt und wird in Kürze veröffentlicht.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Zurück zur Startseite
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bewertung abgeben</CardTitle>
          <CardDescription>
            Teilen Sie Ihre Erfahrung mit {providerName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label>Ihre Bewertung *</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className="h-8 w-8 transition-colors"
                      fill={(hoverRating || rating) >= star ? "#facc15" : "transparent"}
                      stroke={(hoverRating || rating) >= star ? "#facc15" : "currentColor"}
                    />
                  </button>
                ))}
                <span className="ml-2 text-muted-foreground">
                  {rating} von 5 Sternen
                </span>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Ihr Name *</Label>
              <Input
                id="name"
                value={formData.reviewer_name}
                onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
                required
                placeholder="Max Mustermann"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail (optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.reviewer_email}
                onChange={(e) => setFormData({ ...formData, reviewer_email: e.target.value })}
                placeholder="ihre@email.de"
              />
              <p className="text-xs text-muted-foreground">
                Wird nicht öffentlich angezeigt
              </p>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <Label htmlFor="text">Ihre Erfahrung (optional)</Label>
              <Textarea
                id="text"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Erzählen Sie von Ihrer Erfahrung..."
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                "Bewertung abschicken"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitReview;
