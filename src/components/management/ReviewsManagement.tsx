import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Copy, 
  Check, 
  Star, 
  Loader2, 
  Link2, 
  Trash2,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_email: string | null;
  rating: number;
  text: string | null;
  is_approved: boolean;
  created_at: string;
}

type IntakeStatus = 'open' | 'waitlist' | 'closed';

export const ReviewsManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus>('open');

  // Fetch reviews
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!user?.id
  });

  // Fetch business settings for intake status
  const { data: settings } = useQuery({
    queryKey: ["business-settings-intake", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("id, client_intake_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.client_intake_status) {
        setIntakeStatus(data.client_intake_status as IntakeStatus);
      }
      return data;
    },
    enabled: !!user?.id
  });

  // Update intake status mutation
  const updateIntakeMutation = useMutation({
    mutationFn: async (status: IntakeStatus) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      if (settings?.id) {
        const { error } = await supabase
          .from("business_settings")
          .update({ client_intake_status: status })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_settings")
          .insert({ user_id: user.id, client_intake_status: status });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings-intake"] });
      toast({ title: "Gespeichert", description: "Neukunden-Status aktualisiert." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Konnte nicht gespeichert werden.", variant: "destructive" });
    }
  });

  // Approve/reject review mutation
  const toggleApproveMutation = useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ is_approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Gespeichert" });
    }
  });

  // Delete review mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Gelöscht" });
    }
  });

  const generateReviewLink = () => {
    if (!user?.id) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/submit-review?provider=${user.id}`;
  };

  const copyLink = async () => {
    const link = generateReviewLink();
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link kopiert!", description: "Der Bewertungslink wurde in die Zwischenablage kopiert." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleIntakeChange = (value: IntakeStatus) => {
    setIntakeStatus(value);
    updateIntakeMutation.mutate(value);
  };

  const pendingCount = reviews?.filter(r => !r.is_approved).length || 0;
  const approvedCount = reviews?.filter(r => r.is_approved).length || 0;

  return (
    <div className="space-y-6">
      {/* Intake Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Neukunden-Status (Ampel)
          </CardTitle>
          <CardDescription>
            Zeigt Besuchern auf Ihrer Landingpage, ob Sie neue Kunden annehmen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>Status:</Label>
            <Select value={intakeStatus} onValueChange={(v) => handleIntakeChange(v as IntakeStatus)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Neukunden willkommen
                  </div>
                </SelectItem>
                <SelectItem value="waitlist">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    Warteliste
                  </div>
                </SelectItem>
                <SelectItem value="closed">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Keine Neukunden
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Review Link Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Bewertungs-Link
          </CardTitle>
          <CardDescription>
            Teilen Sie diesen Link mit zufriedenen Kunden, um Bewertungen zu sammeln
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-3 py-2 bg-muted rounded text-sm truncate">
              {generateReviewLink()}
            </code>
            <Button onClick={copyLink} variant="outline" className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Kopiert
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Kopieren
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bewertungen verwalten</span>
            <div className="flex gap-2">
              {pendingCount > 0 && (
                <Badge variant="secondary">{pendingCount} ausstehend</Badge>
              )}
              <Badge variant="outline">{approvedCount} veröffentlicht</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !reviews || reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Noch keine Bewertungen vorhanden. Teilen Sie den Link oben mit Ihren Kunden!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className={`p-4 rounded-lg border ${
                    review.is_approved ? "bg-muted/30" : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className="h-4 w-4"
                              fill={star <= review.rating ? "#facc15" : "transparent"}
                              stroke={star <= review.rating ? "#facc15" : "currentColor"}
                            />
                          ))}
                        </div>
                        <span className="font-medium">{review.reviewer_name}</span>
                        {!review.is_approved && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            Ausstehend
                          </Badge>
                        )}
                      </div>
                      {review.text && (
                        <p className="text-muted-foreground text-sm mb-2">"{review.text}"</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric"
                        })}
                        {review.reviewer_email && ` • ${review.reviewer_email}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={review.is_approved ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleApproveMutation.mutate({ 
                          id: review.id, 
                          is_approved: !review.is_approved 
                        })}
                        className="gap-1"
                      >
                        {review.is_approved ? (
                          <>
                            <XCircle className="h-3 w-3" />
                            Verbergen
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Freigeben
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(review.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
