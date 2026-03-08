import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Copy, Users, TrendingUp, Wallet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Affiliate {
  id: string;
  user_id: string | null;
  code: string;
  name: string;
  email: string | null;
  affiliate_type: string;
  commission_type: string;
  commission_rate_cents: number;
  commission_percent: number | null;
  status: string;
  payout_method: string;
  payout_iban: string | null;
  payout_paypal: string | null;
  minimum_payout_cents: number;
  notes: string | null;
  created_at: string;
}

interface Conversion {
  id: string;
  affiliate_id: string | null;
  referrer_code: string | null;
  conversion_type: string;
  plan_type: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
}

export function AffiliateCenter() {
  const { user } = useAuth();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAffiliate, setNewAffiliate] = useState({ name: "", email: "", code: "", affiliate_type: "provider", commission_rate_cents: 1000 });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: aff }, { data: conv }, { data: settings }] = await Promise.all([
      supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_conversions").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_settings").select("key, value").eq("key", "affiliate_module_enabled").maybeSingle(),
    ]);
    setAffiliates((aff as any[]) || []);
    setConversions((conv as any[]) || []);
    setModuleEnabled(settings?.value === true || settings?.value === "true");
    setLoading(false);
  };

  const toggleModule = async (enabled: boolean) => {
    setModuleEnabled(enabled);
    await supabase.from("admin_settings").update({ value: enabled, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "affiliate_module_enabled");
    toast.success(enabled ? "Affiliate-Modul aktiviert" : "Affiliate-Modul deaktiviert");
  };

  const handleAddAffiliate = async () => {
    if (!newAffiliate.name || !newAffiliate.code) { toast.error("Name und Code erforderlich"); return; }
    const { error } = await supabase.from("affiliates").insert({
      name: newAffiliate.name,
      email: newAffiliate.email || null,
      code: newAffiliate.code.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
      affiliate_type: newAffiliate.affiliate_type,
      commission_rate_cents: newAffiliate.commission_rate_cents,
      status: "active",
    });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Affiliate hinzugefügt");
    setShowAddDialog(false);
    setNewAffiliate({ name: "", email: "", code: "", affiliate_type: "provider", commission_rate_cents: 1000 });
    fetchAll();
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`https://hufmanager.de/?ref=${code}`);
    toast.success("Link kopiert!");
  };

  const totalConversions = conversions.length;
  const pendingPayout = conversions.filter(c => c.status === "confirmed").reduce((s, c) => s + c.amount_cents, 0);
  const activeAffiliates = affiliates.filter(a => a.status === "active").length;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: "bg-green-500/10 text-green-600", pending: "bg-yellow-500/10 text-yellow-600", paused: "bg-muted text-muted-foreground", terminated: "bg-destructive/10 text-destructive" };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🤝 Affiliate Center</h2>
          <p className="text-muted-foreground">Empfehlungsprogramm verwalten</p>
        </div>
        <div className="flex items-center gap-4">
          <ModuleToggle label="Affiliate-Modul" enabled={moduleEnabled} onToggle={toggleModule} />
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Affiliate hinzufügen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Neuen Affiliate anlegen</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name *</Label><Input value={newAffiliate.name} onChange={e => setNewAffiliate(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Heiko Wittig" /></div>
                <div><Label>E-Mail</Label><Input value={newAffiliate.email} onChange={e => setNewAffiliate(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Ref-Code *</Label><Input value={newAffiliate.code} onChange={e => setNewAffiliate(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="z.B. HEIKO2026" /></div>
                <div><Label>Typ</Label>
                  <Select value={newAffiliate.affiliate_type} onValueChange={v => setNewAffiliate(p => ({ ...p, affiliate_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provider">Provider</SelectItem>
                      <SelectItem value="influencer">Influencer</SelectItem>
                      <SelectItem value="association">Verband</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Provision (Cent)</Label><Input type="number" value={newAffiliate.commission_rate_cents} onChange={e => setNewAffiliate(p => ({ ...p, commission_rate_cents: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <DialogFooter><Button onClick={handleAddAffiliate}>Anlegen</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><Users className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{activeAffiliates}</p><p className="text-sm text-muted-foreground">Aktive Affiliates</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{totalConversions}</p><p className="text-sm text-muted-foreground">Conversions gesamt</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Wallet className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{(pendingPayout / 100).toFixed(2)}€</p><p className="text-sm text-muted-foreground">Ausstehende Provision</p></CardContent></Card>
      </div>

      <Tabs defaultValue="affiliates">
        <TabsList><TabsTrigger value="affiliates">Affiliates</TabsTrigger><TabsTrigger value="conversions">Conversions</TabsTrigger><TabsTrigger value="payouts">Auszahlungen</TabsTrigger></TabsList>

        <TabsContent value="affiliates">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Name</th><th className="p-3">Code</th><th className="p-3">Typ</th><th className="p-3">Provision</th><th className="p-3">Status</th><th className="p-3">Aktionen</th></tr></thead>
                <tbody>
                  {affiliates.map(a => (
                    <tr key={a.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3 text-center font-mono">{a.code}</td>
                      <td className="p-3 text-center">{a.affiliate_type}</td>
                      <td className="p-3 text-center">{(a.commission_rate_cents / 100).toFixed(2)}€</td>
                      <td className="p-3 text-center">{statusBadge(a.status)}</td>
                      <td className="p-3 text-center"><Button size="sm" variant="ghost" onClick={() => copyLink(a.code)}><Copy className="w-4 h-4" /></Button></td>
                    </tr>
                  ))}
                  {affiliates.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Noch keine Affiliates</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Datum</th><th className="p-3">Ref-Code</th><th className="p-3">Typ</th><th className="p-3">Plan</th><th className="p-3">Betrag</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {conversions.map(c => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{new Date(c.created_at).toLocaleDateString("de-DE")}</td>
                      <td className="p-3 text-center font-mono">{c.referrer_code || "-"}</td>
                      <td className="p-3 text-center">{c.conversion_type}</td>
                      <td className="p-3 text-center">{c.plan_type || "-"}</td>
                      <td className="p-3 text-center">{(c.amount_cents / 100).toFixed(2)}€</td>
                      <td className="p-3 text-center">{statusBadge(c.status)}</td>
                    </tr>
                  ))}
                  {conversions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Noch keine Conversions</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Auszahlungen werden verfügbar sobald Conversions bestätigt sind.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Reusable module toggle with confirmation
function ModuleToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <span className="text-sm font-medium">{label}:</span>
      {!enabled ? (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">Aktivieren</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Modul aktivieren?</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-2">
                  <p>Provider werden dieses Modul ab sofort sehen.</p>
                  <p className="font-medium">Vor Aktivierung sicherstellen:</p>
                  <ul className="list-disc pl-4 space-y-1 text-sm">
                    <li>Rechtstexte aktualisiert</li>
                    <li>Testlauf durchgeführt</li>
                    <li>Support vorbereitet</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={() => onToggle(true)}>Ja, aktivieren</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button size="sm" variant="destructive" onClick={() => onToggle(false)}>Deaktivieren</Button>
      )}
      <Badge variant={enabled ? "default" : "outline"}>{enabled ? "AN" : "AUS"}</Badge>
    </div>
  );
}
