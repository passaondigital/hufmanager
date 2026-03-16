import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Eye, Check, X, Clock, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "Neu", color: "bg-yellow-500/20 text-yellow-400" },
  reviewing: { label: "In Prüfung", color: "bg-blue-500/20 text-blue-400" },
  interview_scheduled: { label: "Gespräch", color: "bg-purple-500/20 text-purple-400" },
  approved: { label: "Genehmigt", color: "bg-green-500/20 text-green-400" },
  rejected: { label: "Abgelehnt", color: "bg-red-500/20 text-red-400" },
  onboarding: { label: "Onboarding", color: "bg-primary/20 text-primary" },
};

const TYPE_LABELS: Record<string, string> = {
  insurance: "Versicherung",
  manufacturer: "Hersteller",
  veterinary: "Tierarzt/Klinik",
  supplier: "Lieferant",
  school: "Ausbildung",
  association: "Verband",
  media: "Medien",
  other: "Sonstiges",
};

export function AdminPortalApplications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admin-portal-applications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("portal_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("portal_applications")
        .update({
          status,
          review_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-portal-applications"] });
      toast.success("Status aktualisiert");
      setSelectedApp(null);
    },
  });

  const filtered = applications?.filter((a: any) =>
    filter === "all" ? true : a.status === filter
  );

  const counts = applications?.reduce((acc: Record<string, number>, a: any) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏢 Portal-Bewerbungen</h1>
        <p className="text-sm text-muted-foreground">
          {applications?.length || 0} Bewerbungen insgesamt
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: `Alle (${applications?.length || 0})` },
          { key: "new", label: `Neu (${counts.new || 0})` },
          { key: "reviewing", label: `In Prüfung (${counts.reviewing || 0})` },
          { key: "approved", label: `Genehmigt (${counts.approved || 0})` },
          { key: "rejected", label: `Abgelehnt (${counts.rejected || 0})` },
        ].map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Keine Bewerbungen in dieser Kategorie.</p>
        )}
        {filtered?.map((app: any) => {
          const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;
          return (
            <Card key={app.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={status.color}>{status.label}</Badge>
                      <span className="font-bold text-foreground">{app.company_name}</span>
                      <span className="text-xs text-muted-foreground">· {TYPE_LABELS[app.portal_type] || app.portal_type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {app.contact_name} · {app.contact_email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      "{app.description}"
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Nutzer: {app.estimated_users || "k.A."}</span>
                      <span>Zahlung: {app.preferred_payment === "copecart" ? "CopeCart" : "Überweisung"}</span>
                      <span>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(app.created_at).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedApp(app); setNotes(app.review_notes || ""); }}>
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                    {app.status === "new" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStatus.mutate({ id: app.id, status: "approved" })}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatus.mutate({ id: app.id, status: "rejected" })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(o) => !o && setSelectedApp(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedApp?.company_name}</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Typ:</span> <span className="font-medium">{TYPE_LABELS[selectedApp.portal_type]}</span></div>
                <div><span className="text-muted-foreground">Nutzer:</span> <span className="font-medium">{selectedApp.estimated_users || "k.A."}</span></div>
                <div><span className="text-muted-foreground">Zahlung:</span> <span className="font-medium">{selectedApp.preferred_payment === "copecart" ? "CopeCart" : "Überweisung"}</span></div>
                <div><span className="text-muted-foreground">Quelle:</span> <span className="font-medium">{selectedApp.referral_source || "k.A."}</span></div>
              </div>
              {selectedApp.website && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Website:</span>{" "}
                  <a href={selectedApp.website} target="_blank" rel="noopener" className="text-primary underline">{selectedApp.website}</a>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Beschreibung:</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedApp.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Erwartung:</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedApp.expectations}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-1">Kontakt:</p>
                <p className="text-sm font-medium">{selectedApp.contact_name} {selectedApp.contact_position ? `· ${selectedApp.contact_position}` : ""}</p>
                <p className="text-sm">{selectedApp.contact_email}</p>
                {selectedApp.contact_phone && <p className="text-sm">{selectedApp.contact_phone}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Interne Notizen:</p>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notizen hinzufügen..." />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => updateStatus.mutate({ id: selectedApp.id, status: "reviewing" })}>
                  In Prüfung
                </Button>
                <Button size="sm" onClick={() => updateStatus.mutate({ id: selectedApp.id, status: "interview_scheduled" })}>
                  Gespräch planen
                </Button>
                <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: selectedApp.id, status: "approved" })}>
                  <Check className="h-3 w-3 mr-1" />
                  Genehmigen
                </Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: selectedApp.id, status: "rejected" })}>
                  <X className="h-3 w-3 mr-1" />
                  Ablehnen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
