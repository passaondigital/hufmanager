import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  UserPlus, Search, RefreshCw, MapPin, FileText, MessageSquare,
  Map as MapIcon, Sparkles, ArrowUpDown, ChevronUp, ChevronDown,
  Loader2, Wand2, GraduationCap, ClipboardList, BarChart3, Users,
  Shield, Ban, CheckCircle, Clock, Crown, Euro,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

// Re-export shared types
export interface ProviderData {
  id: string;
  email: string | null;
  full_name: string | null;
  readable_id: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  is_manually_managed: boolean | null;
  plan_override: string | null;
  access_valid_until: string | null;
  feature_flags: {
    module_invoicing?: boolean;
    module_chat?: boolean;
    module_maps?: boolean;
    module_academy?: boolean;
    module_hufanalyse?: boolean;
    module_network?: boolean;
    module_analytics?: boolean;
    beta_features?: boolean;
  } | null;
  feature_statuses: any | null;
  is_suspended: boolean | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  zip_code: string | null;
  city: string | null;
  business_name: string | null;
  phone: string | null;
  address: string | null;
  subdomain: string | null;
  about_text: string | null;
  hero_headline: string | null;
  base_price: number | null;
  client_count: number;
  horse_count: number;
}

export const PLAN_OVERRIDE_OPTIONS = [
  { value: "standard", label: "Standard (wartet auf Copecart)" },
  { value: "copecart_starter", label: "🟢 Starter (9,90€/Monat)" },
  { value: "copecart_pro", label: "🟡 Pro (29€/Monat)" },
  { value: "copecart_duo", label: "🔵 Duo (49€/Monat)" },
  { value: "copecart_team", label: "🟣 Team (79€/Monat)" },
  { value: "lifetime_grant", label: "⭐ Lifetime Grant" },
  { value: "manual_cash_1y", label: "💵 Barzahlung (1 Jahr)" },
  { value: "beta_tester", label: "🧪 Beta Tester" },
  { value: "employee", label: "👤 Mitarbeiter" },
  { value: "copecart_anfaenger", label: "🟢 [Legacy] Anfänger → Starter" },
  { value: "copecart_fortgeschritten", label: "🟡 [Legacy] Fortgeschritten → Pro" },
  { value: "copecart_profi", label: "🔵 [Legacy] Profi → Duo" },
];

const DEFAULT_FEATURE_FLAGS = {
  module_invoicing: true, module_chat: true, module_maps: true,
  module_academy: true, module_hufanalyse: true, module_network: true,
  module_analytics: true, beta_features: false,
};

type SortField = "zip" | "clients" | "horses" | "price" | "name";
type SortDirection = "asc" | "desc";

interface AdminProviderTabProps {
  providers: ProviderData[];
  onRefresh: () => void;
  onEditProvider: (provider: ProviderData) => void;
  onQuickView: (provider: ProviderData) => void;
}

export function AdminProviderTab({ providers, onRefresh, onEditProvider, onQuickView }: AdminProviderTabProps) {
  const { logActivity } = useAdminActivityLog();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Create Provider dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserPlanOverride, setNewUserPlanOverride] = useState("standard");
  const [newUserAccessValidUntil, setNewUserAccessValidUntil] = useState("");
  const [newUserZipCode, setNewUserZipCode] = useState("");
  const [newUserCity, setNewUserCity] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserBusinessName, setNewUserBusinessName] = useState("");
  const [newUserFeatureFlags, setNewUserFeatureFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const [newUserServices, setNewUserServices] = useState([
    { name: "Barhufbearbeitung", price: 45, enabled: true },
    { name: "Hufkorrektur", price: 55, enabled: false },
    { name: "Erstberatung", price: 0, enabled: false },
    { name: "Rehebeschlag", price: 120, enabled: false },
  ]);

  // Create Client dialog
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [clientFullName, setClientFullName] = useState("");
  const [clientProviderId, setClientProviderId] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
    return sortDirection === "asc"
      ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
  };

  const sortedAndFilteredProviders = useMemo(() => {
    let filtered = providers.filter((p) => {
      const s = searchTerm.toLowerCase();
      return (
        p.email?.toLowerCase().includes(s) || p.full_name?.toLowerCase().includes(s) ||
        p.readable_id?.toLowerCase().includes(s) || p.zip_code?.includes(s) ||
        p.city?.toLowerCase().includes(s) || p.business_name?.toLowerCase().includes(s)
      );
    });
    filtered.sort((a, b) => {
      let aVal: number | string, bVal: number | string;
      switch (sortField) {
        case "zip": aVal = a.zip_code || "99999"; bVal = b.zip_code || "99999"; break;
        case "clients": aVal = a.client_count; bVal = b.client_count; break;
        case "horses": aVal = a.horse_count; bVal = b.horse_count; break;
        case "price": aVal = a.base_price || 0; bVal = b.base_price || 0; break;
        default: aVal = a.full_name?.toLowerCase() || ""; bVal = b.full_name?.toLowerCase() || "";
      }
      if (typeof aVal === "string") return sortDirection === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDirection === "asc" ? aVal - (bVal as number) : (bVal as number) - aVal;
    });
    return filtered;
  }, [providers, searchTerm, sortField, sortDirection]);

  const getStatusBadge = (provider: ProviderData) => {
    if (provider.is_suspended) return <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><Ban className="w-3 h-3 mr-0.5" />Gesperrt</Badge>;
    if (provider.plan_override === "lifetime_grant") return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] px-1.5 py-0"><Crown className="w-3 h-3 mr-0.5" />Lifetime</Badge>;
    if (provider.plan_override === "employee") return <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><Shield className="w-3 h-3 mr-0.5" />MA</Badge>;
    if (provider.access_valid_until) {
      const v = new Date(provider.access_valid_until);
      const expired = v < new Date();
      return <Badge variant={expired ? "destructive" : "default"} className="text-[10px] px-1.5 py-0"><Clock className="w-3 h-3 mr-0.5" />{expired ? "Abgelaufen" : format(v, "dd.MM.yy")}</Badge>;
    }
    if (provider.subscription_status === "active") return <Badge variant="default" className="text-[10px] px-1.5 py-0"><CheckCircle className="w-3 h-3 mr-0.5" />Aktiv</Badge>;
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{provider.subscription_status || "Kein Abo"}</Badge>;
  };

  const getPlanBadge = (provider: ProviderData) => {
    const plan = provider.plan_override || provider.subscription_plan || "starter";
    const labels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      starter: { label: "Starter", variant: "outline" }, copecart_starter: { label: "Starter", variant: "outline" },
      pro: { label: "Pro", variant: "default" }, copecart_pro: { label: "Pro", variant: "default" },
      duo: { label: "Duo", variant: "default" }, copecart_duo: { label: "Duo", variant: "default" },
      team: { label: "Team", variant: "default" }, copecart_team: { label: "Team", variant: "default" },
      lifetime_grant: { label: "Lifetime", variant: "default" }, beta_tester: { label: "Beta", variant: "secondary" },
      employee: { label: "MA", variant: "secondary" },
      copecart_anfaenger: { label: "Starter", variant: "outline" },
      copecart_fortgeschritten: { label: "Pro", variant: "default" },
      copecart_profi: { label: "Duo", variant: "default" },
    };
    const c = labels[plan] || { label: plan, variant: "outline" as const };
    return <Badge variant={c.variant} className="text-[10px] px-1.5 py-0">{c.label}</Badge>;
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserFirstName || !newUserLastName) {
      toast.error("Bitte E-Mail, Vorname und Nachname ausfüllen");
      return;
    }
    setCreating(true);
    try {
      let accessDate = newUserAccessValidUntil;
      if (!accessDate) {
        if (newUserPlanOverride === "lifetime_grant" || newUserPlanOverride === "employee") accessDate = "2099-12-31";
        else if (newUserPlanOverride === "manual_cash_1y") {
          const d = new Date(); d.setFullYear(d.getFullYear() + 1);
          accessDate = d.toISOString().split("T")[0];
        }
      }
      const enabledServices = newUserServices.filter(s => s.enabled).map(s => ({ name: s.name, price: s.price }));
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newUserEmail, password: newUserPassword || null,
          firstName: newUserFirstName, lastName: newUserLastName,
          planOverride: newUserPlanOverride !== "standard" ? newUserPlanOverride : null,
          accessValidUntil: accessDate || null,
          zipCode: newUserZipCode || null, city: newUserCity || null,
          phone: newUserPhone || null, businessName: newUserBusinessName || null,
          featureFlags: newUserFeatureFlags,
          initialServices: enabledServices.length > 0 ? enabledServices : null,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      await logActivity({ actionType: "provider_created", targetType: "provider", targetId: data.user?.id, targetName: `${newUserFirstName} ${newUserLastName} (${newUserEmail})`, details: { planOverride: newUserPlanOverride, email: newUserEmail } });
      toast.success(`Provider ${newUserEmail} erstellt. PID: ${data.user?.readable_id || 'wird generiert'}`);
      setCreateDialogOpen(false);
      setNewUserEmail(""); setNewUserPassword(""); setNewUserFirstName(""); setNewUserLastName("");
      setNewUserPlanOverride("standard"); setNewUserAccessValidUntil("");
      setNewUserZipCode(""); setNewUserCity(""); setNewUserPhone(""); setNewUserBusinessName("");
      setNewUserFeatureFlags(DEFAULT_FEATURE_FLAGS);
      setNewUserServices([
        { name: "Barhufbearbeitung", price: 45, enabled: true },
        { name: "Hufkorrektur", price: 55, enabled: false },
        { name: "Erstberatung", price: 0, enabled: false },
        { name: "Rehebeschlag", price: 120, enabled: false },
      ]);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClient = async () => {
    if (!clientEmail || !clientPassword || !clientFullName || !clientProviderId) {
      toast.error("Bitte alle Felder ausfüllen"); return;
    }
    setCreatingClient(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-client", {
        body: { email: clientEmail, password: clientPassword, fullName: clientFullName, providerId: clientProviderId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success(`Client ${clientFullName} erstellt. KID: ${data.user?.readable_id || 'wird generiert'}`);
      setCreateClientDialogOpen(false);
      setClientEmail(""); setClientPassword(""); setClientFullName(""); setClientProviderId("");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen");
    } finally {
      setCreatingClient(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    return pw;
  };

  return (
    <div className="space-y-4">
      <BulkActionsBar
        selectedIds={selectedProviderIds}
        providers={sortedAndFilteredProviders}
        onSelectionChange={setSelectedProviderIds}
        onActionComplete={onRefresh}
      />

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Name, PID, PLZ, Ort..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} size="icon" className="h-10 w-10 shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Create Provider */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-10"><UserPlus className="w-4 h-4" /><span className="hidden sm:inline">Neuer Provider</span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Neuen Provider anlegen</DialogTitle>
                <DialogDescription>Erstelle manuell einen neuen Provider-Account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Basisdaten</h4>
                  <div className="space-y-2">
                    <Label>E-Mail *</Label>
                    <Input type="email" placeholder="email@example.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Initiales Passwort (optional)</Label>
                    <div className="flex gap-2">
                      <Input type="text" placeholder="Leer = Invite-Mail" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                      <Button type="button" variant="outline" size="icon" onClick={() => { setNewUserPassword(generatePassword()); toast.success("Passwort generiert!"); }}><Wand2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Vorname *</Label><Input placeholder="Max" value={newUserFirstName} onChange={(e) => setNewUserFirstName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Nachname *</Label><Input placeholder="Mustermann" value={newUserLastName} onChange={(e) => setNewUserLastName(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Firmenname</Label><Input placeholder="z.B. Hufpflege Mustermann" value={newUserBusinessName} onChange={(e) => setNewUserBusinessName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Telefon</Label><Input type="tel" placeholder="+49 123 456789" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>PLZ</Label><Input placeholder="12345" value={newUserZipCode} onChange={(e) => setNewUserZipCode(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Ort</Label><Input placeholder="Musterstadt" value={newUserCity} onChange={(e) => setNewUserCity(e.target.value)} /></div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Abo & Zugang</h4>
                  <div className="space-y-2">
                    <Label>Plan / Zahlungsart</Label>
                    <Select value={newUserPlanOverride} onValueChange={setNewUserPlanOverride}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PLAN_OVERRIDE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zugang gültig bis</Label>
                    <Input type="date" value={newUserAccessValidUntil} onChange={(e) => setNewUserAccessValidUntil(e.target.value)} />
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Module</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "module_invoicing", label: "Rechnungen", icon: <FileText className="w-4 h-4" /> },
                      { key: "module_chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
                      { key: "module_maps", label: "Maps", icon: <MapIcon className="w-4 h-4" /> },
                      { key: "module_academy", label: "Academy", icon: <GraduationCap className="w-4 h-4" /> },
                      { key: "module_hufanalyse", label: "Hufanalyse", icon: <ClipboardList className="w-4 h-4" /> },
                      { key: "module_network", label: "Netzwerk", icon: <Users className="w-4 h-4" /> },
                      { key: "module_analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
                      { key: "beta_features", label: "Beta", icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
                    ].map(m => (
                      <div key={m.key} className="flex items-center justify-between p-2.5 border rounded-lg">
                        <div className="flex items-center gap-2 text-sm">{m.icon}{m.label}</div>
                        <Switch checked={(newUserFeatureFlags as any)[m.key]} onCheckedChange={(v) => setNewUserFeatureFlags(prev => ({ ...prev, [m.key]: v }))} />
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Initiale Services</h4>
                  {newUserServices.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3 p-2.5 border rounded-lg">
                      <Switch checked={s.enabled} onCheckedChange={(v) => { const u = [...newUserServices]; u[i].enabled = v; setNewUserServices(u); }} />
                      <span className="flex-1 text-sm">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <Input type="number" value={s.price} onChange={(e) => { const u = [...newUserServices]; u[i].price = parseFloat(e.target.value) || 0; setNewUserServices(u); }} className="w-20 text-right" disabled={!s.enabled} />
                        <span className="text-sm text-muted-foreground">€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Abbrechen</Button>
                <Button onClick={handleCreateUser} disabled={creating}>{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Provider erstellen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Client */}
          <Dialog open={createClientDialogOpen} onOpenChange={setCreateClientDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-10"><UserPlus className="w-4 h-4" /><span className="hidden sm:inline">Neuer Client</span></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Client anlegen</DialogTitle>
                <DialogDescription>Erstelle einen Client-Account und verknüpfe ihn mit einem Provider.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>E-Mail</Label><Input type="email" placeholder="kunde@example.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label>Name</Label><Input placeholder="Max Mustermann" value={clientFullName} onChange={(e) => setClientFullName(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Passwort</Label>
                  <div className="flex gap-2">
                    <Input type="text" placeholder="Min. 6 Zeichen" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} />
                    <Button type="button" variant="outline" size="icon" onClick={() => { setClientPassword(generatePassword()); toast.success("Passwort generiert!"); }}><Wand2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={clientProviderId} onValueChange={setClientProviderId}>
                    <SelectTrigger><SelectValue placeholder="Provider auswählen..." /></SelectTrigger>
                    <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email} ({p.readable_id})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateClientDialogOpen(false)}>Abbrechen</Button>
                <Button onClick={handleCreateClient} disabled={creatingClient}>{creatingClient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Client erstellen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Provider count */}
      <p className="text-xs text-muted-foreground">{sortedAndFilteredProviders.length} von {providers.length} Providern</p>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedProviderIds.length === sortedAndFilteredProviders.length && sortedAndFilteredProviders.length > 0}
                      onCheckedChange={(checked) => setSelectedProviderIds(checked ? sortedAndFilteredProviders.map(p => p.id) : [])}
                    />
                  </TableHead>
                  <TableHead className="w-20 text-xs">PID</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 text-xs" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">Provider{getSortIcon("name")}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 text-xs" onClick={() => handleSort("zip")}>
                    <div className="flex items-center gap-1">Region{getSortIcon("zip")}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 text-xs text-right" onClick={() => handleSort("price")}>
                    <div className="flex items-center justify-end gap-1">Preis{getSortIcon("price")}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 text-xs text-center" onClick={() => handleSort("clients")}>
                    <div className="flex items-center justify-center gap-1">Kd.{getSortIcon("clients")}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 text-xs text-center" onClick={() => handleSort("horses")}>
                    <div className="flex items-center justify-center gap-1">🐴{getSortIcon("horses")}</div>
                  </TableHead>
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredProviders.map((p) => (
                  <TableRow
                    key={p.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedProviderIds.includes(p.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => onQuickView(p)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedProviderIds.includes(p.id)}
                        onCheckedChange={(v) => setSelectedProviderIds(prev => v ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      />
                    </TableCell>
                    <TableCell><code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">#{p.readable_id || p.id.slice(0, 6)}</code></TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.full_name || "—"}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{p.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.zip_code || p.city ? (
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {p.zip_code} {p.city}
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">{p.base_price ? `${p.base_price.toFixed(0)}€` : "—"}</TableCell>
                    <TableCell className="text-center text-sm font-medium">{p.client_count}</TableCell>
                    <TableCell className="text-center text-sm font-medium">{p.horse_count}</TableCell>
                    <TableCell>{getPlanBadge(p)}</TableCell>
                    <TableCell>{getStatusBadge(p)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onEditProvider(p); }}>
                        Bearbeiten
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedAndFilteredProviders.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Keine Provider gefunden</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
