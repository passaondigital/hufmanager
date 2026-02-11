import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarOff, Check, X, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const typeLabels: Record<string, string> = {
  vacation: "Urlaub",
  sick: "Krankheit",
  personal: "Persönlich",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

const statusLabels: Record<string, string> = {
  pending: "Ausstehend",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
  cancelled: "Storniert",
};

export function AbsenceManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["provider-absence-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("employee_absence_requests")
        .select("*, employee:employee_profiles(id, full_name, avatar_url, email)")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("employee_absence_requests")
        .update({
          status,
          review_notes: notes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-absence-requests"] });
      toast({ title: reviewAction === "approved" ? "Genehmigt" : "Abgelehnt" });
      setReviewingId(null);
      setReviewNotes("");
    },
  });

  const pendingRequests = requests.filter((r: any) => r.status === "pending");
  const pastRequests = requests.filter((r: any) => r.status !== "pending");

  const getInitials = (name: string) =>
    name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const openReview = (id: string, action: "approved" | "rejected") => {
    setReviewingId(id);
    setReviewAction(action);
    setReviewNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <CalendarOff className="h-4 w-4 text-primary" />
          Offene Anträge
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pendingRequests.length}</Badge>
          )}
        </h3>

        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Check className="h-8 w-8 mx-auto mb-2 text-primary opacity-50" />
              <p className="text-sm">Keine offenen Anträge</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req: any) => (
              <Card key={req.id} className="border-orange-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(req.employee?.full_name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{req.employee?.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {typeLabels[req.type] || req.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(req.start_date), "dd.MM.", { locale: de })} – {format(new Date(req.end_date), "dd.MM.yyyy", { locale: de })}
                        </span>
                      </div>
                      {req.notes && <p className="text-xs text-muted-foreground mt-1">{req.notes}</p>}
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="default" className="h-8 gap-1" onClick={() => openReview(req.id, "approved")}>
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Genehmigen</span>
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive" onClick={() => openReview(req.id, "rejected")}>
                        <X className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Ablehnen</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {pastRequests.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3">Bearbeitete Anträge</h3>
          <div className="space-y-2">
            {pastRequests.slice(0, 10).map((req: any) => (
              <Card key={req.id} className="opacity-80">
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(req.employee?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{req.employee?.full_name}</p>
                    <span className="text-xs text-muted-foreground">
                      {typeLabels[req.type]} · {format(new Date(req.start_date), "dd.MM.", { locale: de })} – {format(new Date(req.end_date), "dd.MM.", { locale: de })}
                    </span>
                  </div>
                  <Badge variant={statusColors[req.status]} className="text-xs">
                    {statusLabels[req.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingId} onOpenChange={(o) => !o && setReviewingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === "approved" ? "Antrag genehmigen" : "Antrag ablehnen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Anmerkung (optional)</label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={reviewAction === "approved" ? "z.B. Viel Spaß im Urlaub!" : "z.B. Leider nicht möglich in dem Zeitraum."}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingId(null)}>Abbrechen</Button>
            <Button
              variant={reviewAction === "approved" ? "default" : "destructive"}
              disabled={reviewMutation.isPending}
              onClick={() => reviewingId && reviewMutation.mutate({ id: reviewingId, status: reviewAction, notes: reviewNotes })}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewAction === "approved" ? "Genehmigen" : "Ablehnen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
