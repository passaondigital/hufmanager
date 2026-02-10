import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { ChatImage } from "@/components/chat/ChatImage";

interface DocumentationReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentation: {
    id: string;
    notes: string | null;
    photos: string[] | null;
    materials_used: any[] | null;
    status: string;
    submitted_at: string | null;
    employee?: { full_name: string } | null;
    assignment?: {
      appointment?: {
        horse?: { name: string } | null;
        client?: { full_name: string } | null;
        date?: string;
      } | null;
    } | null;
  };
}

export function DocumentationReviewSheet({
  open,
  onOpenChange,
  documentation,
}: DocumentationReviewSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState("");

  const reviewMutation = useMutation({
    mutationFn: async (action: "approved" | "rejected") => {
      if (!user?.id) throw new Error("Nicht authentifiziert");

      const { error } = await supabase
        .from("employee_documentation")
        .update({
          status: action,
          review_notes: reviewNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", documentation.id);

      if (error) throw error;

      // If approved, also update the assignment status
      if (action === "approved" && documentation.assignment) {
        await supabase
          .from("employee_assignments")
          .update({
            status: "completed",
            review_status: "approved",
            review_notes: reviewNotes || null,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", (documentation as any).assignment_id);
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["pending-documentation"] });
      queryClient.invalidateQueries({ queryKey: ["employee-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["today-assignments"] });
      toast({
        title: action === "approved" ? "Freigegeben" : "Abgelehnt",
        description:
          action === "approved"
            ? "Dokumentation wurde freigegeben."
            : "Dokumentation wurde zur Nacharbeit zurückgewiesen.",
      });
      onOpenChange(false);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const materials = documentation.materials_used as any[] | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Dokumentation prüfen</SheetTitle>
          <SheetDescription>
            {documentation.employee?.full_name} •{" "}
            {documentation.assignment?.appointment?.horse?.name || "Unbekannt"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Photos */}
          {documentation.photos && documentation.photos.length > 0 && (
            <div>
              <Label className="mb-2 block">
                Fotos ({documentation.photos.length})
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {documentation.photos.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {documentation.notes && (
            <div>
              <Label className="mb-1 block">Notizen</Label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                {documentation.notes}
              </p>
            </div>
          )}

          {/* Materials */}
          {materials && materials.length > 0 && (
            <div>
              <Label className="mb-2 block">Materialverbrauch</Label>
              <div className="space-y-1">
                {materials.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 px-3 bg-muted/50 rounded">
                    <span>{item.name}</span>
                    <Badge variant="outline">{item.quantity}×</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Notes */}
          <div>
            <Label htmlFor="review-notes">Anmerkungen (optional)</Label>
            <Textarea
              id="review-notes"
              placeholder="Feedback für den Mitarbeiter..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => reviewMutation.mutate("rejected")}
            disabled={reviewMutation.isPending}
            className="flex-1"
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Ablehnen
          </Button>
          <Button
            onClick={() => reviewMutation.mutate("approved")}
            disabled={reviewMutation.isPending}
            className="flex-1"
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Freigeben
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
