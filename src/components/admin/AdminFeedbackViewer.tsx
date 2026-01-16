import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bug, ExternalLink, Loader2, CheckCircle, Clock, XCircle, Eye, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface FeedbackReport {
  id: string;
  user_email: string | null;
  user_role: string | null;
  page_url: string;
  description: string;
  screenshot_url: string | null;
  browser_info: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function AdminFeedbackViewer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["feedback-reports", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("feedback_reports")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeedbackReport[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (notes !== undefined) updates.admin_notes = notes;
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from("feedback_reports")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-reports"] });
      toast.success("Status aktualisiert");
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feedback_reports")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-reports"] });
      setSelectedReport(null);
      toast.success("Feedback gelöscht");
    },
    onError: () => {
      toast.error("Fehler beim Löschen");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" /> Offen</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" /> In Bearbeitung</Badge>;
      case "resolved":
        return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Gelöst</Badge>;
      case "wont_fix":
        return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Wird nicht behoben</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openReport = (report: FeedbackReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || "");
  };

  const openCount = reports.filter(r => r.status === "open").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Feedback-Meldungen
                {openCount > 0 && (
                  <Badge variant="destructive" className="ml-2">{openCount} offen</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Von Nutzern gemeldete Probleme und Bugs
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="wont_fix">Wird nicht behoben</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine Meldungen vorhanden
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => openReport(report)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{report.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>{report.user_email || "Anonym"}</span>
                          <span>•</span>
                          <span>{format(new Date(report.created_at), "dd.MM.yy HH:mm", { locale: de })}</span>
                          <span>•</span>
                          <span className="truncate">{new URL(report.page_url).pathname}</span>
                        </div>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Feedback-Detail
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nutzer:</span>{" "}
                    <span className="font-medium">{selectedReport.user_email || "Anonym"}</span>
                    {selectedReport.user_role && (
                      <Badge variant="outline" className="ml-2">{selectedReport.user_role}</Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Erstellt:</span>{" "}
                    <span className="font-medium">
                      {format(new Date(selectedReport.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Seite:</span>{" "}
                    <a 
                      href={selectedReport.page_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {new URL(selectedReport.page_url).pathname}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Description */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Beschreibung:</p>
                  <p className="whitespace-pre-wrap">{selectedReport.description}</p>
                </div>

                {/* Screenshot */}
                {selectedReport.screenshot_url && (
                  <div>
                    <p className="font-medium mb-2">Screenshot:</p>
                    <a 
                      href={selectedReport.screenshot_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <img 
                        src={selectedReport.screenshot_url} 
                        alt="Screenshot" 
                        className="max-h-64 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                )}

                {/* Browser Info */}
                {selectedReport.browser_info && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Browser-Info anzeigen
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedReport.browser_info), null, 2)}
                    </pre>
                  </details>
                )}

                {/* Admin Notes */}
                <div className="space-y-2">
                  <p className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Admin-Notizen
                  </p>
                  <Textarea
                    placeholder="Notizen zur Bearbeitung..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Select
                    value={selectedReport.status}
                    onValueChange={(status) => {
                      updateMutation.mutate({ 
                        id: selectedReport.id, 
                        status, 
                        notes: adminNotes 
                      });
                      setSelectedReport(prev => prev ? { ...prev, status } : null);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">🔴 Offen</SelectItem>
                      <SelectItem value="in_progress">🟡 In Bearbeitung</SelectItem>
                      <SelectItem value="resolved">🟢 Gelöst</SelectItem>
                      <SelectItem value="wont_fix">⚪ Wird nicht behoben</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => {
                      updateMutation.mutate({ 
                        id: selectedReport.id, 
                        status: selectedReport.status, 
                        notes: adminNotes 
                      });
                    }}
                    disabled={updateMutation.isPending}
                  >
                    Notizen speichern
                  </Button>

                  <div className="flex-1" />

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (confirm("Feedback wirklich löschen?")) {
                        deleteMutation.mutate(selectedReport.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
