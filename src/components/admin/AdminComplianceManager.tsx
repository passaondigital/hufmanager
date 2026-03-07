import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Loader2, Check, Bell, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  agb: "AGB",
  datenschutz: "Datenschutz",
  nutzungsvertrag: "Nutzungsvertrag",
  preise: "Preisänderung",
};

export function AdminComplianceManager() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    type: "agb",
    title: "",
    summary: "",
    effective_date: "",
    requires_action: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [notifsRes, confsRes] = await Promise.all([
      supabase.from("legal_change_notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("legal_change_confirmations").select("*").order("created_at", { ascending: false }),
    ]);
    if (notifsRes.data) setNotifications(notifsRes.data);
    if (confsRes.data) setConfirmations(confsRes.data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title || !form.summary || !form.effective_date) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    setCreating(true);
    try {
      // Create the notification
      const { data: notif, error } = await supabase
        .from("legal_change_notifications")
        .insert({
          type: form.type,
          title: form.title,
          summary: form.summary,
          effective_date: form.effective_date,
          requires_action: form.requires_action,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Get all active providers
      const { data: providerRoles } = await supabase
        .from("user_roles").select("user_id").eq("role", "provider");
      const providerIds = providerRoles?.map((r) => r.user_id) || [];

      // Create confirmations for all providers
      if (providerIds.length > 0) {
        const confirmationRows = providerIds.map((pid) => ({
          notification_id: notif.id,
          provider_id: pid,
          action: "pending",
        }));

        await supabase.from("legal_change_confirmations").insert(confirmationRows);

        // Send push to all providers
        for (const pid of providerIds) {
          try {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: pid,
                title: "Wichtige Änderung – Bitte bestätigen 📋",
                body: `"${form.title}" tritt am ${format(new Date(form.effective_date), "dd.MM.yyyy")} in Kraft.`,
                url: "/management?tab=b2b-management",
              },
            });
          } catch (e) {
            console.error("Push failed for", pid, e);
          }

          // Timeline entry
          await supabase.from("provider_timeline_events").insert({
            provider_id: pid,
            event_type: "legal_change_sent",
            title: `${TYPE_LABELS[form.type] || form.type}-Änderung gesendet`,
            description: form.title,
            icon: "⚖️",
            is_auto: true,
          });
        }
      }

      toast.success(`Änderung an ${providerIds.length} Provider gesendet`);
      setShowCreate(false);
      setForm({ type: "agb", title: "", summary: "", effective_date: "", requires_action: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler");
    } finally {
      setCreating(false);
    }
  };

  const getStats = (notifId: string) => {
    const related = confirmations.filter((c) => c.notification_id === notifId);
    const confirmed = related.filter((c) => c.action === "confirmed").length;
    const pending = related.filter((c) => c.action === "pending").length;
    return { total: related.length, confirmed, pending };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingTotal = confirmations.filter((c) => c.action === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Compliance & Rechtliche Änderungen</h3>
          {pendingTotal > 0 && (
            <Badge variant="destructive" className="text-xs">{pendingTotal} offen</Badge>
          )}
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Änderung ankündigen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue rechtliche Änderung</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agb">AGB</SelectItem>
                    <SelectItem value="datenschutz">Datenschutz</SelectItem>
                    <SelectItem value="nutzungsvertrag">Nutzungsvertrag</SelectItem>
                    <SelectItem value="preise">Preisänderung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Titel *</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="z.B. AGB Update März 2026" />
              </div>
              <div className="space-y-2">
                <Label>Zusammenfassung *</Label>
                <Textarea value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} placeholder="Was hat sich geändert?" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Gültig ab *</Label>
                <Input type="date" value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.requires_action} onCheckedChange={(v) => setForm((p) => ({ ...p, requires_action: v }))} />
                <Label>Bestätigung erforderlich</Label>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                An alle Provider senden
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {notifications.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Keine rechtlichen Änderungen.</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead>Gültig ab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => {
                const stats = getStats(n.id);
                return (
                  <TableRow key={n.id}>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[n.type] || n.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{n.summary}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(n.effective_date), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">
                          <Check className="h-3 w-3 mr-1" /> {stats.confirmed}
                        </Badge>
                        {stats.pending > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> {stats.pending}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(n.created_at), "dd.MM.yyyy", { locale: de })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
