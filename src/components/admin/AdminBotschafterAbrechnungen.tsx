import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, FileText, Info } from "lucide-react";
import { toast } from "sonner";

type Abrechnung = {
  id: string;
  created_at: string | null;
  botschafter_id: string | null;
  period_start: string | null;
  period_end: string | null;
  total_conversions: number | null;
  total_amount_cents: number | null;
  status: string | null;
  copecart_payout_id: string | null;
  paid_at: string | null;
};

type BotschafterMin = { id: string; name: string };

export function AdminBotschafterAbrechnungen() {
  const [abrechnungen, setAbrechnungen] = useState<Abrechnung[]>([]);
  const [botschafterMap, setBotschafterMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: abrData }, { data: botData }] = await Promise.all([
      supabase.from("botschafter_abrechnungen").select("id, created_at, botschafter_id, period_start, period_end, total_conversions, total_amount_cents, status, copecart_payout_id, paid_at").order("created_at", { ascending: false }),
      supabase.from("pferdeakte_botschafter").select("id, first_name, last_name"),
    ]);
    setAbrechnungen(abrData || []);
    const map: Record<string, string> = {};
    (botData || []).forEach(b => { map[b.id] = `${b.first_name} ${b.last_name}`; });
    setBotschafterMap(map);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!periodStart || !periodEnd) { toast.error("Zeitraum auswählen"); return; }
    setCreating(true);
    // Get confirmed conversions in period grouped by botschafter
    const { data: convs } = await supabase.from("botschafter_conversions")
      .select("botschafter_id, commission_cents")
      .eq("status", "confirmed")
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd + "T23:59:59");

    if (!convs || convs.length === 0) { toast.error("Keine bestätigten Conversions in diesem Zeitraum"); setCreating(false); return; }

    const grouped: Record<string, { count: number; total: number }> = {};
    convs.forEach(c => {
      if (!c.botschafter_id) return;
      if (!grouped[c.botschafter_id]) grouped[c.botschafter_id] = { count: 0, total: 0 };
      grouped[c.botschafter_id].count++;
      grouped[c.botschafter_id].total += c.commission_cents || 0;
    });

    const inserts = Object.entries(grouped).map(([bid, { count, total }]) => ({
      botschafter_id: bid,
      period_start: periodStart,
      period_end: periodEnd,
      total_conversions: count,
      total_amount_cents: total,
      status: "offen",
    }));

    const { error } = await supabase.from("botschafter_abrechnungen").insert(inserts);
    setCreating(false);
    if (error) toast.error("Fehler: " + error.message);
    else { toast.success(`${inserts.length} Abrechnungen erstellt`); setCreateOpen(false); fetchAll(); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "bezahlt") updates.paid_at = new Date().toISOString();
    const { error } = await supabase.from("botschafter_abrechnungen").update(updates).eq("id", id);
    if (error) toast.error("Fehler"); else { toast.success("Status geändert"); fetchAll(); }
  };

  const exportCSV = () => {
    const rows = abrechnungen.map(a => [
      botschafterMap[a.botschafter_id || ""] || a.botschafter_id,
      a.period_start, a.period_end, a.total_conversions,
      ((a.total_amount_cents || 0) / 100).toFixed(2),
      a.status
    ]);
    const csv = "Botschafter,Von,Bis,Conversions,Betrag,Status\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "botschafter-abrechnungen.csv"; a.click();
    toast.success("CSV exportiert");
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Abrechnungen</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><FileText className="w-4 h-4 mr-2" />CSV Export</Button>
          <Button onClick={() => setCreateOpen(true)}>Monatsabrechnung erstellen</Button>
        </div>
      </div>

      {/* CopeCart Info */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">CopeCart-Integration</p>
            <p className="text-sm text-muted-foreground">Sobald der CopeCart-Webhook eingerichtet ist, werden Conversions automatisch erfasst. Bis dahin: manuelle Erfassung über Conversions.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alle Abrechnungen</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Zeitraum</th><th className="pb-2">Botschafter</th><th className="pb-2">Conv.</th>
                <th className="pb-2">Betrag</th><th className="pb-2">Status</th><th className="pb-2">Aktionen</th>
              </tr></thead>
              <tbody>
                {abrechnungen.map(a => (
                  <tr key={a.id} className="border-b">
                    <td className="py-3">{a.period_start} — {a.period_end}</td>
                    <td className="py-3 font-medium">{botschafterMap[a.botschafter_id || ""] || "—"}</td>
                    <td className="py-3">{a.total_conversions || 0}</td>
                    <td className="py-3">{((a.total_amount_cents || 0) / 100).toFixed(2)} €</td>
                    <td className="py-3"><Badge variant="outline">{a.status}</Badge></td>
                    <td className="py-3 flex gap-1">
                      {a.status === "offen" && <Button size="sm" onClick={() => handleStatusChange(a.id, "eingereicht")}>📤 Eingereicht</Button>}
                      {a.status === "eingereicht" && <Button size="sm" onClick={() => handleStatusChange(a.id, "bezahlt")}>✅ Bezahlt</Button>}
                    </td>
                  </tr>
                ))}
                {abrechnungen.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Noch keine Abrechnungen</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Monatsabrechnung erstellen</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-muted-foreground">Von</label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div>
              <div><label className="text-sm text-muted-foreground">Bis</label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div>
            </div>
            <p className="text-sm text-muted-foreground">Es werden alle bestätigten Conversions im Zeitraum gruppiert nach Botschafter abgerechnet.</p>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={creating}>{creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Abrechnungen erstellen</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
