import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, Users, Clock, CheckCircle, TrendingUp, Eye, Check, X } from "lucide-react";
import { toast } from "sonner";

type Botschafter = {
  id: string;
  created_at: string | null;
  type: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  social_handle: string | null;
  motivation: string | null;
  profession: string | null;
  plz: string | null;
  website: string | null;
  customer_count: string | null;
  company_name: string | null;
  company_role: string | null;
  industry: string | null;
  cooperation_types: string[] | null;
  referral_code: string;
  status: string | null;
  commission_rate: number | null;
  total_clicks: number | null;
  total_conversions: number | null;
  total_earnings_cents: number | null;
  copecart_username: string | null;
  copecart_verified: boolean | null;
  listed_publicly: boolean | null;
  public_display_name: string | null;
  public_description: string | null;
  heard_from: string | null;
};

const TYPE_LABELS: Record<string, string> = { creator: "Creator", profi: "Profi", unternehmen: "Unternehmen" };
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-400",
  active: "bg-green-500/20 text-green-400",
  paused: "bg-yellow-500/20 text-yellow-400",
  rejected: "bg-red-500/20 text-red-400",
};

export function AdminBotschafterOverview() {
  const [botschafter, setBotschafter] = useState<Botschafter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [activateModal, setActivateModal] = useState<Botschafter | null>(null);
  const [commissionRate, setCommissionRate] = useState(25);
  const [detailDrawer, setDetailDrawer] = useState<Botschafter | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, created_at, type, first_name, last_name, email, phone, social_handle, motivation, profession, plz, website, customer_count, company_name, company_role, industry, cooperation_types, referral_code, status, commission_rate, total_clicks, total_conversions, total_earnings_cents, copecart_username, copecart_verified, listed_publicly, public_display_name, public_description, heard_from")
      .order("created_at", { ascending: false });
    if (error) toast.error("Fehler beim Laden");
    else setBotschafter(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const pending = botschafter.filter(b => b.status === "pending");
  const active = botschafter.filter(b => b.status === "active");
  const totalConversions = botschafter.reduce((s, b) => s + (b.total_conversions || 0), 0);

  const handleActivate = async () => {
    if (!activateModal) return;
    const { error } = await supabase.from("pferdeakte_botschafter")
      .update({ status: "active", commission_rate: commissionRate })
      .eq("id", activateModal.id);
    if (error) toast.error("Fehler bei Freischaltung");
    else { toast.success(`${activateModal.first_name} freigeschaltet mit ${commissionRate}%`); setActivateModal(null); fetchData(); }
  };

  const handleReject = async (b: Botschafter) => {
    if (!confirm(`${b.first_name} ${b.last_name} wirklich ablehnen?`)) return;
    const { error } = await supabase.from("pferdeakte_botschafter").update({ status: "rejected" }).eq("id", b.id);
    if (error) toast.error("Fehler"); else { toast.success("Abgelehnt"); fetchData(); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("pferdeakte_botschafter").update({ status: newStatus }).eq("id", id);
    if (error) toast.error("Fehler"); else { toast.success("Status geändert"); fetchData(); }
  };

  const handleTogglePublic = async (id: string, val: boolean) => {
    const { error } = await supabase.from("pferdeakte_botschafter").update({ listed_publicly: val }).eq("id", id);
    if (error) toast.error("Fehler"); else fetchData();
  };

  const handleToggleCopecart = async (id: string, val: boolean) => {
    const { error } = await supabase.from("pferdeakte_botschafter").update({ copecart_verified: val }).eq("id", id);
    if (error) toast.error("Fehler"); else fetchData();
  };

  const filtered = botschafter.filter(b => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterType !== "all" && b.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return `${b.first_name} ${b.last_name} ${b.email}`.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🎙️ Botschafter Verwaltung</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">{botschafter.length}</p><p className="text-sm text-muted-foreground">Gesamt</p></div></div></CardContent></Card>
        <Card className={pending.length > 0 ? "border-orange-500/50 bg-orange-500/5" : ""}><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="w-8 h-8 text-orange-500" /><div><p className="text-2xl font-bold">{pending.length}</p><p className="text-sm text-muted-foreground">Pending</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="w-8 h-8 text-green-500" /><div><p className="text-2xl font-bold">{active.length}</p><p className="text-sm text-muted-foreground">Aktiv</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">{totalConversions}</p><p className="text-sm text-muted-foreground">Conversions</p></div></div></CardContent></Card>
      </div>

      {/* Pending Queue */}
      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">Neue Registrierungen <Badge variant="destructive">{pending.length}</Badge></CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Datum</th><th className="pb-2">Name</th><th className="pb-2">Typ</th><th className="pb-2">E-Mail</th><th className="pb-2">Telefon</th><th className="pb-2">Aktionen</th>
                </tr></thead>
                <tbody>
                  {pending.map(b => (
                    <tr key={b.id} className="border-b">
                      <td className="py-3">{b.created_at ? new Date(b.created_at).toLocaleDateString("de") : "-"}</td>
                      <td className="py-3 font-medium">{b.first_name} {b.last_name}</td>
                      <td className="py-3"><Badge variant="outline">{TYPE_LABELS[b.type] || b.type}</Badge></td>
                      <td className="py-3">{b.email}</td>
                      <td className="py-3">{b.phone || "-"}</td>
                      <td className="py-3 flex gap-1">
                        <Button size="sm" onClick={() => { setCommissionRate(25); setActivateModal(b); }}><Check className="w-3 h-3 mr-1" />Freischalten</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(b)}><X className="w-3 h-3 mr-1" />Ablehnen</Button>
                        <Button size="sm" variant="outline" onClick={() => setDetailDrawer(b)}><Eye className="w-3 h-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Botschafter */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Botschafter</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paused">Pausiert</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="profi">Profi</SelectItem>
                <SelectItem value="unternehmen">Unternehmen</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)} className="w-[200px] h-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Name</th><th className="pb-2">Typ</th><th className="pb-2">Status</th><th className="pb-2">Provision</th>
                <th className="pb-2">Klicks</th><th className="pb-2">Conv.</th><th className="pb-2">Verdienst</th><th className="pb-2">CopeCart</th><th className="pb-2">Öffentlich</th><th className="pb-2">Aktionen</th>
              </tr></thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-b">
                    <td className="py-3 font-medium">{b.first_name} {b.last_name}</td>
                    <td className="py-3"><Badge variant="outline">{TYPE_LABELS[b.type] || b.type}</Badge></td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status || "pending"]}`}>{b.status}</span></td>
                    <td className="py-3">{b.commission_rate || 25}%</td>
                    <td className="py-3">{b.total_clicks || 0}</td>
                    <td className="py-3">{b.total_conversions || 0}</td>
                    <td className="py-3">{((b.total_earnings_cents || 0) / 100).toFixed(2)} €</td>
                    <td className="py-3"><Switch checked={b.copecart_verified || false} onCheckedChange={v => handleToggleCopecart(b.id, v)} /></td>
                    <td className="py-3"><Switch checked={b.listed_publicly || false} onCheckedChange={v => handleTogglePublic(b.id, v)} /></td>
                    <td className="py-3 flex gap-1">
                      <Select value={b.status || "pending"} onValueChange={v => handleStatusChange(b.id, v)}>
                        <SelectTrigger className="w-[100px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Aktiv</SelectItem>
                          <SelectItem value="paused">Pausiert</SelectItem>
                          <SelectItem value="rejected">Abgelehnt</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => setDetailDrawer(b)}><Eye className="w-3 h-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activate Modal */}
      <Dialog open={!!activateModal} onOpenChange={() => setActivateModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Provision festlegen</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Botschafter: {activateModal?.first_name} {activateModal?.last_name}</p>
          <div className="space-y-4 py-4">
            <p className="font-medium">Provision: {commissionRate}%</p>
            <Slider value={[commissionRate]} onValueChange={v => setCommissionRate(v[0])} min={25} max={50} step={5} />
            <div className="flex gap-2">{[25, 35, 40, 50].map(v => <Button key={v} size="sm" variant={commissionRate === v ? "default" : "outline"} onClick={() => setCommissionRate(v)}>{v}%</Button>)}</div>
          </div>
          <DialogFooter><Button onClick={handleActivate}>Freischalten & E-Mail senden</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Drawer */}
      <Sheet open={!!detailDrawer} onOpenChange={() => setDetailDrawer(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{detailDrawer?.first_name} {detailDrawer?.last_name}</SheetTitle></SheetHeader>
          {detailDrawer && (
            <div className="space-y-3 mt-4 text-sm">
              {[
                ["Typ", TYPE_LABELS[detailDrawer.type]],
                ["E-Mail", detailDrawer.email],
                ["Telefon", detailDrawer.phone],
                ["Referral-Code", detailDrawer.referral_code],
                ["Status", detailDrawer.status],
                ["Provision", `${detailDrawer.commission_rate || 25}%`],
                ["Social", detailDrawer.social_handle],
                ["Motivation", detailDrawer.motivation],
                ["Beruf", detailDrawer.profession],
                ["PLZ", detailDrawer.plz],
                ["Website", detailDrawer.website],
                ["Kundenanzahl", detailDrawer.customer_count],
                ["Unternehmen", detailDrawer.company_name],
                ["Rolle", detailDrawer.company_role],
                ["Branche", detailDrawer.industry],
                ["Kooperationen", detailDrawer.cooperation_types?.join(", ")],
                ["Gehört von", detailDrawer.heard_from],
                ["CopeCart", detailDrawer.copecart_username],
                ["Registriert", detailDrawer.created_at ? new Date(detailDrawer.created_at).toLocaleString("de") : "-"],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label as string}><span className="text-muted-foreground">{label}:</span> <span className="font-medium">{val}</span></div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
