import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield, Users, Ban, CheckCircle, Clock, Crown, Loader2,
  KeyRound, MapPin, FileText, MessageSquare, Map as MapIcon,
  Sparkles, Euro, Trash2, Building2, Globe, Phone,
  AlertTriangle, BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AdminBlogManager from "@/components/admin/AdminBlogManager";
import MissionControlKPIsV2 from "@/components/admin/MissionControlKPIsV2";
import AdminActivityLogViewer from "@/components/admin/AdminActivityLogViewer";
import AdminBroadcastCard from "@/components/admin/AdminBroadcastCard";
import AdminFeedbackViewer from "@/components/admin/AdminFeedbackViewer";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";
import { ReleaseControlCenter } from "@/components/admin/release-control/ReleaseControlCenter";
import { DemoAnalyticsDashboard } from "@/components/admin/DemoAnalyticsDashboard";
import { DemoAccountsManager } from "@/components/admin/DemoAccountsManager";
import { AdminGlossaryManager } from "@/components/admin/AdminGlossaryManager";
import { FunnelCockpit } from "@/components/admin/FunnelCockpit";
import AdminPartnerOverview from "@/components/admin/AdminPartnerOverview";
import AdminEmployeeOverview from "@/components/admin/AdminEmployeeOverview";
import { AdminRevenue } from "@/components/admin/AdminRevenue";
import { RetentionDashboard } from "@/components/admin/RetentionDashboard";
import { AdminHufrenteOverview } from "@/components/admin/AdminHufrenteOverview";
import { AdminManualPayments } from "@/components/admin/AdminManualPayments";
import { AdminContractTracking } from "@/components/admin/AdminContractTracking";
import { AdminBrowserAnalytics } from "@/components/admin/AdminBrowserAnalytics";
import { AdminInvoices } from "@/components/admin/AdminInvoices";
import { AdminContractManager } from "@/components/admin/AdminContractManager";
import { AdminTransfersOverview } from "@/components/admin/AdminTransfersOverview";
import { AdminQuickMessage } from "@/components/admin/AdminQuickMessage";
import { isDemoEmail } from "@/lib/demo-accounts";
import { PlatformSuccession } from "@/components/admin/PlatformSuccession";
import { AdminEmailAnalytics } from "@/features/email-marketing/admin/AdminEmailAnalytics";
import { MissionControlNav, MissionControlNavMobile } from "@/components/admin/MissionControlNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FeatureStatuses, migrateBooleanToStatus } from "@/types/featureFlags";
import { ProviderFeatureEditor } from "@/components/admin/ProviderFeatureEditor";
import { GlobalFeatureFlagsManager } from "@/components/admin/GlobalFeatureFlagsManager";
import { FeatureRolloutDashboard } from "@/components/admin/FeatureRolloutDashboard";
import { AdminProviderTab, ProviderData, PLAN_OVERRIDE_OPTIONS } from "@/components/admin/AdminProviderTab";
import { AdminStatsTab } from "@/components/admin/AdminStatsTab";
import { AdminPlatformOverview } from "@/components/admin/AdminPlatformOverview";
import { AdminCopecartReconciliation } from "@/components/admin/AdminCopecartReconciliation";
import { AdminIssuerSettings } from "@/components/admin/AdminIssuerSettings";
import AdminMessaging from "@/components/admin/AdminMessaging";
import { Switch } from "@/components/ui/switch";

const DEFAULT_FEATURE_STATUSES: FeatureStatuses = {
  module_invoicing: 'public', module_chat: 'public', module_maps: 'public',
  module_academy: 'public', module_hufanalyse: 'public', module_network: 'public',
  module_analytics: 'public', beta_features: 'disabled', module_team: 'disabled',
};

const DEFAULT_FEATURE_FLAGS = {
  module_invoicing: true, module_chat: true, module_maps: true,
  module_academy: true, module_hufanalyse: true, module_network: true,
  module_analytics: true, beta_features: false,
};

export default function MissionControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();
  const isMobile = useIsMobile();
  const { logActivity } = useAdminActivityLog();
  const [activeTab, setActiveTab] = useState("providers");
  const [navOpen, setNavOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalations, setEscalations] = useState<any[]>([]);

  // Edit dialog state
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ProviderData | null>(null);

  const [editPlanOverride, setEditPlanOverride] = useState("standard");
  const [editAccessValidUntil, setEditAccessValidUntil] = useState("");
  const [editFeatureFlags, setEditFeatureFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const [editFeatureStatuses, setEditFeatureStatuses] = useState<FeatureStatuses>(DEFAULT_FEATURE_STATUSES);
  const [suspendReason, setSuspendReason] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editSubdomain, setEditSubdomain] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editZipCode, setEditZipCode] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAboutText, setEditAboutText] = useState("");
  const [editHeroHeadline, setEditHeroHeadline] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => { if (user) checkAdminAccess(); else navigate("/auth?redirect=/admin/mission-control"); }, [user]);
  useEffect(() => { if (isAdmin) fetchProviders(); }, [isAdmin]);

  const checkAdminAccess = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data: providerRoles } = await supabase.from("user_roles").select("user_id").eq("role", "provider");
      const providerIds = providerRoles?.map(r => r.user_id) || [];
      if (providerIds.length === 0) { setProviders([]); setLoading(false); return; }

      const { data: profiles } = await supabase.from("profiles").select("*").in("id", providerIds).is("deleted_at", null).order("created_at", { ascending: false });
      const { data: businessSettings } = await supabase.from("business_settings").select("user_id, address, phone, business_name, subdomain, about_text, hero_headline");
      const { data: allServices } = await supabase.from("services").select("provider_id, name, base_price, billing_type").eq("is_active", true);
      const { data: escData } = await supabase.from("emergency_escalations").select(`*, provider:profiles(id, full_name)`).order("created_at", { ascending: false });
      if (escData) setEscalations(escData as any[]);
      const { data: accessGrants } = await supabase.from("access_grants").select("provider_id, client_id").eq("is_active", true);
      const { data: createdClients } = await supabase.from("profiles").select("id, created_by_provider_id").in("created_by_provider_id", providerIds).is("deleted_at", null);
      const { data: horses } = await supabase.from("horses").select("id, owner_id").is("deleted_at", null);

      const bsMap = new globalThis.Map(businessSettings?.map(bs => [bs.user_id, bs]) || []);
      const servicesByProvider = new globalThis.Map<string, number>();
      allServices?.forEach(s => {
        if (!s.provider_id) return;
        const existing = servicesByProvider.get(s.provider_id);
        const name = s.name?.toLowerCase() || "";
        if (name.includes("barhuf") || name.includes("barefoot")) servicesByProvider.set(s.provider_id, s.base_price);
        else if (s.billing_type === "standard" && (!existing || s.base_price < existing)) servicesByProvider.set(s.provider_id, s.base_price);
      });

      const clientCountMap = new globalThis.Map<string, Set<string>>();
      accessGrants?.forEach(ag => {
        if (!clientCountMap.has(ag.provider_id)) clientCountMap.set(ag.provider_id, new Set());
        clientCountMap.get(ag.provider_id)!.add(ag.client_id);
      });
      createdClients?.forEach(cc => {
        if (!cc.created_by_provider_id) return;
        if (!clientCountMap.has(cc.created_by_provider_id)) clientCountMap.set(cc.created_by_provider_id, new Set());
        clientCountMap.get(cc.created_by_provider_id)!.add(cc.id);
      });

      const horseCountMap = new globalThis.Map<string, number>();
      providerIds.forEach(pid => {
        const clients = clientCountMap.get(pid) || new Set();
        horseCountMap.set(pid, horses?.filter(h => clients.has(h.owner_id)).length || 0);
      });

      const providersWithData: ProviderData[] = (profiles || []).map(profile => {
        const bs = bsMap.get(profile.id);
        let zipCode = profile.zip_code;
        if (!zipCode && bs?.address) { const m = bs.address.match(/\b(\d{5})\b/); if (m) zipCode = m[1]; }
        return {
          id: profile.id, email: profile.email, full_name: profile.full_name,
          readable_id: profile.readable_id, subscription_status: profile.subscription_status,
          subscription_plan: profile.subscription_plan, is_manually_managed: profile.is_manually_managed,
          plan_override: profile.plan_override, access_valid_until: profile.access_valid_until,
          feature_flags: profile.feature_flags as ProviderData["feature_flags"],
          feature_statuses: profile.feature_statuses as FeatureStatuses | null,
          is_suspended: profile.is_suspended, suspended_at: profile.suspended_at,
          suspended_reason: profile.suspended_reason, created_at: profile.created_at,
          zip_code: zipCode, city: profile.city,
          business_name: bs?.business_name || null, phone: bs?.phone || profile.phone,
          address: bs?.address || null, subdomain: bs?.subdomain || null,
          about_text: bs?.about_text || null, hero_headline: bs?.hero_headline || null,
          base_price: servicesByProvider.get(profile.id) || null,
          client_count: clientCountMap.get(profile.id)?.size || 0,
          horse_count: horseCountMap.get(profile.id) || 0,
        };
      });
      setProviders(providersWithData.filter(p => !isDemoEmail(p.email)));
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Fehler beim Laden der Provider");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (provider: ProviderData) => {
    setSelectedProvider(provider);
    setEditPlanOverride(provider.plan_override || "standard");
    setEditAccessValidUntil(provider.access_valid_until ? format(new Date(provider.access_valid_until), "yyyy-MM-dd") : "");
    setEditFeatureFlags({ ...DEFAULT_FEATURE_FLAGS, ...(provider.feature_flags || {}) });
    const migrated = migrateBooleanToStatus(provider.feature_flags, provider.feature_statuses || null);
    setEditFeatureStatuses({ ...DEFAULT_FEATURE_STATUSES, ...migrated });
    setSuspendReason(provider.suspended_reason || "");
    setEditBusinessName(provider.business_name || ""); setEditSubdomain(provider.subdomain || "");
    setEditAddress(provider.address || ""); setEditZipCode(provider.zip_code || "");
    setEditCity(provider.city || ""); setEditPhone(provider.phone || "");
    setEditAboutText(provider.about_text || ""); setEditHeroHeadline(provider.hero_headline || "");
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedProvider) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase.from("profiles").update({
        plan_override: editPlanOverride === "standard" ? null : editPlanOverride,
        access_valid_until: editAccessValidUntil ? new Date(editAccessValidUntil).toISOString() : null,
        feature_flags: editFeatureFlags, feature_statuses: editFeatureStatuses as unknown as Record<string, string>,
        zip_code: editZipCode || null, city: editCity || null, phone: editPhone || null,
      }).eq("id", selectedProvider.id);
      if (profileError) throw profileError;

      const { error: bsError } = await supabase.from("business_settings").upsert({
        id: selectedProvider.id, user_id: selectedProvider.id,
        business_name: editBusinessName || null, subdomain: editSubdomain || null,
        address: editAddress || null, phone: editPhone || null,
        about_text: editAboutText || null, hero_headline: editHeroHeadline || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (bsError) throw bsError;

      toast.success("Provider aktualisiert");
      setEditDialogOpen(false);
      fetchProviders();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedProvider) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({ is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: suspendReason || "Manuell gesperrt" }).eq("id", selectedProvider.id);
      await logActivity({ actionType: "provider_suspended", targetType: "provider", targetId: selectedProvider.id, targetName: selectedProvider.full_name || selectedProvider.email || "Provider", details: { reason: suspendReason } });
      toast.success("Account gesperrt");
      setEditDialogOpen(false); fetchProviders();
    } catch (error: any) { toast.error(error.message || "Fehler"); } finally { setSaving(false); }
  };

  const handleUnsuspendUser = async () => {
    if (!selectedProvider) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({ is_suspended: false, suspended_at: null, suspended_reason: null }).eq("id", selectedProvider.id);
      await logActivity({ actionType: "provider_unsuspended", targetType: "provider", targetId: selectedProvider.id, targetName: selectedProvider.full_name || selectedProvider.email || "Provider" });
      toast.success("Account entsperrt");
      setEditDialogOpen(false); fetchProviders();
    } catch (error: any) { toast.error(error.message || "Fehler"); } finally { setSaving(false); }
  };

  const handleDeleteUser = async () => {
    if (!providerToDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { userId: providerToDelete.id } });
      if (error) throw error; if (data.error) throw new Error(data.error);
      await logActivity({ actionType: "provider_deleted", targetType: "provider", targetId: providerToDelete.id, targetName: providerToDelete.full_name || providerToDelete.email || "Provider" });
      toast.success(`Account gelöscht`);
      setProviderToDelete(null); setEditDialogOpen(false); fetchProviders();
    } catch (error: any) { toast.error(error.message || "Fehler"); } finally { setDeleting(false); }
  };

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) { toast.error("Bitte beide Felder ausfüllen"); return; }
    if (newPassword.length < 6) { toast.error("Min. 6 Zeichen"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwörter stimmen nicht überein"); return; }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Passwort gesetzt!"); setNewPassword(""); setConfirmPassword("");
    } catch (error: any) { toast.error(error.message); } finally { setPasswordSaving(false); }
  };

  const getStatusBadge = (p: ProviderData) => {
    if (p.is_suspended) return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Gesperrt</Badge>;
    if (p.plan_override === "lifetime_grant") return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black"><Crown className="w-3 h-3 mr-1" />Lifetime</Badge>;
    if (p.access_valid_until) {
      const v = new Date(p.access_valid_until); const expired = v < new Date();
      return <Badge variant={expired ? "destructive" : "default"}><Clock className="w-3 h-3 mr-1" />{expired ? "Abgelaufen" : format(v, "dd.MM.yy")}</Badge>;
    }
    if (p.subscription_status === "active") return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Aktiv</Badge>;
    return <Badge variant="outline">{p.subscription_status || "Kein Abo"}</Badge>;
  };

  const getPlanBadge = (p: ProviderData) => {
    const plan = p.plan_override || p.subscription_plan || "starter";
    const labels: Record<string, string> = { starter: "Starter", copecart_starter: "Starter", pro: "Pro", copecart_pro: "Pro", duo: "Duo", copecart_duo: "Duo", team: "Team", copecart_team: "Team", lifetime_grant: "Lifetime", beta_tester: "Beta", employee: "MA" };
    return <Badge variant="outline">{labels[plan] || plan}</Badge>;
  };

  // Access denied
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md"><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-6 h-6 text-destructive" />Zugriff verweigert</CardTitle><CardDescription>Du hast keine Berechtigung für diesen Bereich.</CardDescription></CardHeader>
          <CardContent><Button onClick={() => navigate("/home")} className="w-full">Zurück zum Dashboard</Button></CardContent></Card>
      </div>
    );
  }

  if (isAdmin === null || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">Mission Control</h1>
              <p className="text-[11px] text-muted-foreground">{providers.length} Provider aktiv</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground h-8">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Passwort</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute right-4 top-14 z-50 w-80 p-4 rounded-xl border bg-card shadow-lg">
                <div className="space-y-3">
                  <Input type="password" placeholder="Neues Passwort" className="h-9" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <Input type="password" placeholder="Bestätigen" className="h-9" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <Button size="sm" className="w-full" onClick={handleSetPassword} disabled={passwordSaving || !newPassword || !confirmPassword}>
                    {passwordSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Speichern
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/home")}>← Dashboard</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={logout}>Logout</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        {/* KPIs - Compact */}
        <div className="mb-5">
          <MissionControlKPIsV2 />
        </div>

        {/* Layout: Sidebar + Content */}
        <div className="flex gap-5">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <aside className="w-52 flex-shrink-0 sticky top-[68px] self-start max-h-[calc(100vh-84px)] overflow-y-auto">
              <MissionControlNav activeTab={activeTab} onTabChange={setActiveTab} providerCount={providers.length} />
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-[11px] text-muted-foreground h-7"
                  onClick={() => navigate("/admin/module-access-logs")}>
                  <AlertTriangle className="w-3 h-3" /> Zugriffs-Logs
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-[11px] text-muted-foreground h-7"
                  onClick={() => navigate("/admin/feature-usage")}>
                  <BarChart3 className="w-3 h-3" /> Feature-Nutzung
                </Button>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Nav */}
            {isMobile && (
              <Collapsible open={navOpen} onOpenChange={setNavOpen} className="mb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between mb-2 h-10">
                    <span className="text-sm font-medium">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                    <svg className={cn("w-4 h-4 transition-transform", navOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 rounded-xl border bg-card mb-4">
                    <MissionControlNavMobile activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setNavOpen(false); }} providerCount={providers.length} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Tab Content */}
            {activeTab === "providers" && (
              <AdminProviderTab
                providers={providers}
                onRefresh={fetchProviders}
                onEditProvider={openEditDialog}
                onQuickView={(p) => { setSelectedProvider(p); setQuickViewOpen(true); }}
              />
            )}

            {activeTab === "platform" && <AdminPlatformOverview />}
            {activeTab === "stats" && <AdminStatsTab providers={providers} />}
            {activeTab === "blog" && <AdminBlogManager />}
            {activeTab === "activity" && <AdminActivityLogViewer limit={100} />}
            {activeTab === "tools" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AdminBroadcastCard />
                <AdminFeedbackViewer />
              </div>
            )}
            {activeTab === "versions" && <ReleaseControlCenter />}
            {activeTab === "rollout" && (
              <div className="space-y-6">
                <GlobalFeatureFlagsManager />
                <FeatureRolloutDashboard providers={providers} onProviderClick={(id) => { const p = providers.find(x => x.id === id); if (p) openEditDialog(p); }} />
              </div>
            )}
            {activeTab === "demo" && <div className="space-y-6"><DemoAccountsManager /><DemoAnalyticsDashboard /></div>}
            {activeTab === "glossary" && <AdminGlossaryManager />}
            {activeTab === "funnel" && <FunnelCockpit />}
            {activeTab === "revenue" && <AdminRevenue />}
            {activeTab === "retention" && <RetentionDashboard />}
            {activeTab === "hufrente" && <AdminHufrenteOverview />}
            {activeTab === "payments" && <AdminManualPayments />}
            {activeTab === "invoices" && <AdminInvoices />}
            {activeTab === "contracts" && <AdminContractManager />}
            {activeTab === "compliance" && <div className="space-y-6"><AdminContractTracking /><AdminTransfersOverview /></div>}
            {activeTab === "browsers" && <AdminBrowserAnalytics />}
            {activeTab === "succession" && <PlatformSuccession />}
            {activeTab === "email-marketing" && <AdminEmailAnalytics />}
            {activeTab === "partners" && <AdminPartnerOverview />}
            {activeTab === "employees" && <AdminEmployeeOverview />}
            {activeTab === "copecart" && <AdminCopecartReconciliation />}
            {activeTab === "issuer" && <AdminIssuerSettings />}
            {activeTab === "messaging" && <AdminMessaging />}

            {activeTab === "escalations" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Notfall-Eskalationen</CardTitle>
                </CardHeader>
                <CardContent>
                  {escalations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Keine Eskalationen vorhanden.</p>
                  ) : (
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow><TableHead>Provider</TableHead><TableHead>Kunde</TableHead><TableHead>Grund</TableHead><TableHead>Status</TableHead><TableHead>Datum</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {escalations.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{(e.provider as any)?.full_name || "N/A"}</TableCell>
                            <TableCell className="font-mono">{e.client_readable_id}</TableCell>
                            <TableCell className="max-w-xs truncate">{e.escalation_reason || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                e.status === "open" && "bg-destructive/10 text-destructive",
                                e.status === "acknowledged" && "bg-amber-500/10 text-amber-600",
                                e.status === "resolved" && "bg-green-500/10 text-green-600",
                              )}>
                                {e.status === "open" ? "Offen" : e.status === "acknowledged" ? "Bestätigt" : "Gelöst"}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(e.created_at), "dd.MM.yy HH:mm", { locale: de })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Quick-View Sheet */}
      <Sheet open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle><code className="text-sm bg-muted px-2 py-1 rounded">#{selectedProvider?.readable_id || selectedProvider?.id.slice(0, 8)}</code></SheetTitle>
            <SheetDescription>Provider Details</SheetDescription>
          </SheetHeader>
          {selectedProvider && (
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold">{selectedProvider.full_name || "Unbekannt"}</h3>
                <div className="mt-2 space-y-1.5 text-sm">
                  {[
                    ["E-Mail", selectedProvider.email],
                    ["Telefon", selectedProvider.phone],
                    ["Firma", selectedProvider.business_name],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{val || "—"}</span></div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4" />Standort</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">PLZ / Ort</span><span>{selectedProvider.zip_code || "—"} {selectedProvider.city || ""}</span></div>
                  {selectedProvider.address && <div className="flex justify-between"><span className="text-muted-foreground">Adresse</span><span className="text-right max-w-[180px]">{selectedProvider.address}</span></div>}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center"><p className="text-xl font-bold">{selectedProvider.client_count}</p><p className="text-xs text-muted-foreground">Kunden</p></div>
                <div className="p-3 bg-muted/50 rounded-lg text-center"><p className="text-xl font-bold">{selectedProvider.horse_count}</p><p className="text-xs text-muted-foreground">Pferde</p></div>
              </div>
              <Separator />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Plan</span>{getPlanBadge(selectedProvider)}</div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Status</span>{getStatusBadge(selectedProvider)}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Preis</span><span className="font-medium">{selectedProvider.base_price ? `${selectedProvider.base_price.toFixed(0)} €` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Erstellt</span><span>{format(new Date(selectedProvider.created_at), "dd.MM.yyyy", { locale: de })}</span></div>
              </div>
              <Button className="w-full" onClick={() => { setQuickViewOpen(false); openEditDialog(selectedProvider); }}>Bearbeiten</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Provider bearbeiten</DialogTitle>
            <DialogDescription>{selectedProvider?.full_name} ({selectedProvider?.email})</DialogDescription>
          </DialogHeader>
          {selectedProvider && (
            <Tabs defaultValue="subscription" className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                <TabsTrigger value="profile">Profil</TabsTrigger>
                <TabsTrigger value="subscription">Abo</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="danger">Sperren</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2"><Label className="flex items-center gap-2"><Building2 className="w-4 h-4" />Firmenname</Label><Input value={editBusinessName} onChange={(e) => setEditBusinessName(e.target.value)} /></div>
                  <div className="space-y-2 col-span-2"><Label className="flex items-center gap-2"><Globe className="w-4 h-4" />Subdomain</Label>
                    <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">hufmanager.de/p/</span><Input value={editSubdomain} onChange={(e) => setEditSubdomain(e.target.value)} className="flex-1" /></div>
                    {editSubdomain && <a href={`/p/${editSubdomain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Landingpage öffnen →</a>}
                  </div>
                  <div className="space-y-2 col-span-2"><Label>Hero-Headline</Label><Input value={editHeroHeadline} onChange={(e) => setEditHeroHeadline(e.target.value)} /></div>
                  <div className="space-y-2"><Label>PLZ</Label><Input value={editZipCode} onChange={(e) => setEditZipCode(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Ort</Label><Input value={editCity} onChange={(e) => setEditCity(e.target.value)} /></div>
                  <div className="space-y-2 col-span-2"><Label className="flex items-center gap-2"><MapPin className="w-4 h-4" />Adresse</Label><Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} /></div>
                  <div className="space-y-2 col-span-2"><Label className="flex items-center gap-2"><Phone className="w-4 h-4" />Telefon</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
                  <div className="space-y-2 col-span-2"><Label>Über-Text</Label><textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={editAboutText} onChange={(e) => setEditAboutText(e.target.value)} /></div>
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label>Plan Override</Label>
                  <Select value={editPlanOverride} onValueChange={setEditPlanOverride}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLAN_OVERRIDE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zugang gültig bis</Label>
                  <Input type="date" value={editAccessValidUntil} onChange={(e) => setEditAccessValidUntil(e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="features" className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2">
                <ProviderFeatureEditor
                  featureStatuses={editFeatureStatuses}
                  onFeatureStatusChange={(key, status) => {
                    setEditFeatureStatuses(prev => ({ ...prev, [key]: status }));
                    setEditFeatureFlags(prev => ({ ...prev, [key]: status === 'public' || status === 'beta' || status === 'early_access' }));
                  }}
                  disabled={saving}
                />
              </TabsContent>

              <TabsContent value="danger" className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2">
                {selectedProvider.is_suspended ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive mb-2"><Ban className="w-5 h-5" /><span className="font-semibold">Account gesperrt</span></div>
                      <p className="text-sm text-muted-foreground">Gesperrt am: {selectedProvider.suspended_at ? format(new Date(selectedProvider.suspended_at), "dd.MM.yyyy HH:mm", { locale: de }) : "Unbekannt"}</p>
                      <p className="text-sm text-muted-foreground">Grund: {selectedProvider.suspended_reason || "Kein Grund"}</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleUnsuspendUser} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Entsperren</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-600 mb-2"><AlertTriangle className="w-5 h-5" /><span className="font-semibold">Vorsicht!</span></div>
                      <p className="text-sm text-muted-foreground">Gesperrte Accounts können sich nicht einloggen.</p>
                    </div>
                    <div className="space-y-2"><Label>Sperrgrund</Label><Input placeholder="z.B. Offene Zahlung..." value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} /></div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" className="w-full gap-2"><Ban className="w-4 h-4" />Account sperren</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Account wirklich sperren?</AlertDialogTitle><AlertDialogDescription>{selectedProvider.full_name} ({selectedProvider.email}) wird sofort gesperrt.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleSuspendUser} className="bg-destructive text-destructive-foreground">Ja, sperren</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive mb-2"><Trash2 className="w-5 h-5" /><span className="font-semibold">Dauerhaft löschen</span></div>
                    <p className="text-sm text-muted-foreground">Unwiderruflich. Alle Daten werden entfernt.</p>
                  </div>
                  <AlertDialog open={!!providerToDelete} onOpenChange={(open) => !open && setProviderToDelete(null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setProviderToDelete(selectedProvider)}>
                        <Trash2 className="w-4 h-4" />Account löschen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Unwiderruflich löschen?</AlertDialogTitle><AlertDialogDescription><span className="font-semibold text-destructive">{providerToDelete?.full_name || providerToDelete?.email}</span> wird dauerhaft gelöscht.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground">{deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Löschen</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter className="mt-4 flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveUser} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
