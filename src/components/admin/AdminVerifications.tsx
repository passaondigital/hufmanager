import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, MessageSquare, FileText, Building2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface VerificationRequest {
  id: string;
  full_name: string | null;
  email: string | null;
  business_name: string | null;
  business_type: string | null;
  business_address: any;
  business_capacity: number | null;
  verification_document_url: string | null;
  verification_status: string | null;
  verification_submitted_at: string | null;
  verification_notes: string | null;
  created_at: string;
}

const BUSINESS_LABELS: Record<string, string> = {
  pension: "Pensionsstall",
  school: "Reitschule",
  training: "Ausbildungsstall",
  breeding: "Zuchtgestüt",
  club: "Reitverein",
  therapy: "Therapiestall",
  other: "Sonstiges",
};

export function AdminVerifications() {
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [dialogText, setDialogText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-verifications", filter],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, full_name, email, business_name, business_type, business_address, business_capacity, verification_document_url, verification_status, verification_submitted_at, verification_notes, created_at")
        .eq("client_type", "commercial" as any)
        .order("verification_submitted_at", { ascending: false });

      if (filter !== "all") {
        q = q.eq("verification_status" as any, filter);
      }

      const { data, error } = await (q as any).limit(100);
      if (error) throw error;
      return (data || []) as VerificationRequest[];
    },
    staleTime: 30_000,
  });

  const handleApprove = async (id: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "approved",
        is_verified_business: true,
        verification_reviewed_at: new Date().toISOString(),
        account_status: "active",
      } as any)
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Genehmigen");
    } else {
      toast.success("Gewerbe-Account genehmigt!");
      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: id,
        type: "business_verification_approved",
        title: "Gewerbe-Account freigeschaltet! ✓",
        message: "Dein Gewerbe-Account wurde verifiziert. Du kannst jetzt alle Business-Features nutzen.",
      } as any);
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectId || !dialogText.trim()) return;
    setProcessing(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "rejected",
        verification_notes: dialogText.trim(),
        verification_reviewed_at: new Date().toISOString(),
        account_status: "verification_rejected",
      } as any)
      .eq("id", rejectId);

    if (!error) {
      await supabase.from("notifications").insert({
        user_id: rejectId,
        type: "business_verification_rejected",
        title: "Gewerbe-Verifizierung abgelehnt",
        message: `Dein Nachweis konnte nicht verifiziert werden. Grund: ${dialogText.trim()}`,
      } as any);
      toast.success("Ablehnung gesendet");
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    }
    setRejectId(null);
    setDialogText("");
    setProcessing(false);
  };

  const handleQuestion = async () => {
    if (!questionId || !dialogText.trim()) return;
    setProcessing(true);
    await supabase.from("notifications").insert({
      user_id: questionId,
      type: "business_verification_question",
      title: "Nachfrage zu deinem Gewerbe-Account",
      message: dialogText.trim(),
    } as any);
    toast.success("Nachfrage gesendet");
    setQuestionId(null);
    setDialogText("");
    setProcessing(false);
  };

  const getDocUrl = async (path: string) => {
    const { data } = await supabase.storage.from("verification-docs").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const counts = {
    pending: requests.filter(r => r.verification_status === "pending").length,
    approved: requests.filter(r => r.verification_status === "approved").length,
    rejected: requests.filter(r => r.verification_status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Gewerbe-Verifizierungen
        </h2>
      </div>

      {/* Stats */}
      <div className="flex gap-2 text-sm">
        <Badge variant={filter === "pending" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("pending")}>
          Ausstehend: {filter === "all" ? counts.pending : filter === "pending" ? requests.length : "–"}
        </Badge>
        <Badge variant={filter === "approved" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("approved")}>
          Genehmigt: {filter === "all" ? counts.approved : filter === "approved" ? requests.length : "–"}
        </Badge>
        <Badge variant={filter === "rejected" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("rejected")}>
          Abgelehnt: {filter === "all" ? counts.rejected : filter === "rejected" ? requests.length : "–"}
        </Badge>
        <Badge variant={filter === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("all")}>
          Alle
        </Badge>
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {!isLoading && requests.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Keine Anträge gefunden.</p>
      )}

      {requests.map((r) => {
        const addr = r.business_address as { street?: string; zip?: string; city?: string } | null;
        const location = [addr?.zip, addr?.city].filter(Boolean).join(" ");
        const timeAgo = r.verification_submitted_at
          ? formatTimeAgo(new Date(r.verification_submitted_at))
          : "Unbekannt";

        return (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusDot status={r.verification_status} />
                    <span className="font-semibold text-foreground">{r.business_name || "Unbenannt"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {BUSINESS_LABELS[r.business_type || ""] || r.business_type} · {location || "Kein Ort"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>

              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Kontakt:</span> {r.full_name || "–"}</p>
                <p><span className="text-muted-foreground">E-Mail:</span> {r.email || "–"}</p>
                {r.business_capacity && <p><span className="text-muted-foreground">Stallplätze:</span> {r.business_capacity}</p>}
                {r.verification_notes && (
                  <p className="text-destructive text-xs">Notiz: {r.verification_notes}</p>
                )}
              </div>

              {r.verification_document_url && (
                <Button variant="outline" size="sm" onClick={() => getDocUrl(r.verification_document_url!)}>
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Nachweis anzeigen
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}

              {r.verification_status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => handleApprove(r.id)} disabled={processing}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Genehmigen
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setRejectId(r.id); setDialogText(""); }} disabled={processing}>
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Ablehnen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setQuestionId(r.id); setDialogText(""); }} disabled={processing}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Nachfrage
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ablehnung begründen</DialogTitle></DialogHeader>
          <Textarea value={dialogText} onChange={(e) => setDialogText(e.target.value)} placeholder="Grund der Ablehnung..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!dialogText.trim() || processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={!!questionId} onOpenChange={() => setQuestionId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nachfrage senden</DialogTitle></DialogHeader>
          <Textarea value={dialogText} onChange={(e) => setDialogText(e.target.value)} placeholder="Deine Frage an den Antragsteller..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionId(null)}>Abbrechen</Button>
            <Button onClick={handleQuestion} disabled={!dialogText.trim() || processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusDot({ status }: { status: string | null }) {
  const color = status === "approved" ? "bg-green-500" : status === "rejected" ? "bg-red-500" : "bg-yellow-500";
  return <div className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "vor wenigen Minuten";
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}
