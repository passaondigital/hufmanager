import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { toast } from "sonner";
import { 
  Shield, 
  UserPlus, 
  Users, 
  Settings, 
  Ban, 
  CheckCircle, 
  Clock,
  Crown,
  Loader2,
  Search,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  MapPin,
  FileText,
  MessageSquare,
  Map as MapIcon,
  Sparkles,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Euro,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AdminBlogManager from "@/components/admin/AdminBlogManager";

// Horse icon fallback since lucide doesn't have it
const Horse = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11a2 2 0 1 0 4 0 2 2 0 1 0-4 0"/>
    <path d="M13 3.5c3-2 6.5 0 8.5 3s2 8-1.5 11.5"/>
    <path d="m5 19 2-2"/>
    <path d="m18 11-3.5 4"/>
    <path d="M6.5 19.5 3 16l5-5"/>
    <path d="M7.5 7.5 8 4l4 .5"/>
  </svg>
);

interface ProviderData {
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
    beta_features?: boolean;
  } | null;
  is_suspended: boolean | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  // Business settings data
  zip_code: string | null;
  city: string | null;
  business_name: string | null;
  phone: string | null;
  address: string | null;
  // Computed data
  base_price: number | null;
  client_count: number;
  horse_count: number;
}

const PLAN_OVERRIDE_OPTIONS = [
  { value: "standard", label: "Standard (Copecart)" },
  { value: "lifetime_grant", label: "Lifetime Grant" },
  { value: "manual_cash_1y", label: "Manual Cash Payment (1 Year)" },
  { value: "beta_tester", label: "Beta Tester" },
  { value: "employee", label: "Employee" },
];

const DEFAULT_FEATURE_FLAGS = {
  module_invoicing: true,
  module_chat: true,
  module_maps: true,
  beta_features: false,
};

type SortField = "zip" | "clients" | "horses" | "price" | "name";
type SortDirection = "asc" | "desc";

export default function MissionControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ProviderData | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // New user form
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserPlanOverride, setNewUserPlanOverride] = useState("standard");
  const [newUserAccessValidUntil, setNewUserAccessValidUntil] = useState("");
  const [newUserZipCode, setNewUserZipCode] = useState("");
  const [newUserCity, setNewUserCity] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserBusinessName, setNewUserBusinessName] = useState("");
  const [newUserFeatureFlags, setNewUserFeatureFlags] = useState(DEFAULT_FEATURE_FLAGS);
  // Create Client form
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [clientFullName, setClientFullName] = useState("");
  const [clientProviderId, setClientProviderId] = useState("");

  // Password setup form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Edit form state
  const [editPlanOverride, setEditPlanOverride] = useState<string>("standard");
  const [editAccessValidUntil, setEditAccessValidUntil] = useState<string>("");
  const [editFeatureFlags, setEditFeatureFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const [suspendReason, setSuspendReason] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchProviders();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth?redirect=/admin/mission-control");
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.error("Error checking admin access:", error);
      setIsAdmin(false);
      return;
    }

    setIsAdmin(!!data);
  };

  const fetchProviders = async () => {
    setLoading(true);
    try {
      // 1. Fetch provider user IDs from user_roles
      const { data: providerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "provider");

      if (rolesError) throw rolesError;

      const providerIds = providerRoles?.map(r => r.user_id) || [];

      if (providerIds.length === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }

      // 2. Fetch profiles for providers only
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", providerIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // 3. Fetch business_settings for all providers
      const { data: businessSettings, error: bsError } = await supabase
        .from("business_settings")
        .select("user_id, address, phone, business_name");

      if (bsError) console.warn("Could not fetch business_settings:", bsError);

      // 4. Fetch services for base price (Barhufbearbeitung or cheapest)
      const { data: allServices, error: servicesError } = await supabase
        .from("services")
        .select("provider_id, name, base_price, billing_type")
        .eq("is_active", true);

      if (servicesError) console.warn("Could not fetch services:", servicesError);

      // 5. Fetch client counts per provider (via access_grants)
      const { data: accessGrants, error: agError } = await supabase
        .from("access_grants")
        .select("provider_id, client_id")
        .eq("is_active", true);

      if (agError) console.warn("Could not fetch access_grants:", agError);

      // Also count clients created by provider
      const { data: createdClients, error: ccError } = await supabase
        .from("profiles")
        .select("id, created_by_provider_id")
        .in("created_by_provider_id", providerIds)
        .is("deleted_at", null);

      if (ccError) console.warn("Could not fetch created clients:", ccError);

      // 6. Fetch horse counts per provider
      const { data: horses, error: horsesError } = await supabase
        .from("horses")
        .select("id, owner_id")
        .is("deleted_at", null);

      if (horsesError) console.warn("Could not fetch horses:", horsesError);

      // Build lookup maps
      const bsMap = new globalThis.Map(businessSettings?.map(bs => [bs.user_id, bs]) || []);
      
      // Services map: provider_id -> base_price
      const servicesByProvider = new globalThis.Map<string, number>();
      allServices?.forEach(service => {
        if (!service.provider_id) return;
        
        const existing = servicesByProvider.get(service.provider_id);
        const serviceName = service.name?.toLowerCase() || "";
        
        // Prefer "Barhufbearbeitung" or similar
        if (serviceName.includes("barhuf") || serviceName.includes("barefoot")) {
          servicesByProvider.set(service.provider_id, service.base_price);
        } else if (service.billing_type === "standard" && (!existing || service.base_price < existing)) {
          servicesByProvider.set(service.provider_id, service.base_price);
        }
      });

      // Client counts per provider
      const clientCountMap = new globalThis.Map<string, Set<string>>();
      accessGrants?.forEach(ag => {
        if (!clientCountMap.has(ag.provider_id)) {
          clientCountMap.set(ag.provider_id, new Set());
        }
        clientCountMap.get(ag.provider_id)!.add(ag.client_id);
      });
      createdClients?.forEach(cc => {
        if (!cc.created_by_provider_id) return;
        if (!clientCountMap.has(cc.created_by_provider_id)) {
          clientCountMap.set(cc.created_by_provider_id, new Set());
        }
        clientCountMap.get(cc.created_by_provider_id)!.add(cc.id);
      });

      // Horse counts: need to count horses owned by clients of each provider
      const horseCountMap = new globalThis.Map<string, number>();
      providerIds.forEach(pid => {
        const providerClients = clientCountMap.get(pid) || new Set();
        const horseCount = horses?.filter(h => providerClients.has(h.owner_id)).length || 0;
        horseCountMap.set(pid, horseCount);
      });

      // Merge all data
      const providersWithData: ProviderData[] = (profiles || []).map(profile => {
        const bs = bsMap.get(profile.id);
        
        // Extract zip and city from address or profile
        let zipCode = profile.zip_code;
        let city = profile.city;
        
        // Try to parse from business address if not in profile
        if (!zipCode && bs?.address) {
          const zipMatch = bs.address.match(/\b(\d{5})\b/);
          if (zipMatch) zipCode = zipMatch[1];
        }

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          readable_id: profile.readable_id,
          subscription_status: profile.subscription_status,
          subscription_plan: profile.subscription_plan,
          is_manually_managed: profile.is_manually_managed,
          plan_override: profile.plan_override,
          access_valid_until: profile.access_valid_until,
          feature_flags: profile.feature_flags as ProviderData["feature_flags"],
          is_suspended: profile.is_suspended,
          suspended_at: profile.suspended_at,
          suspended_reason: profile.suspended_reason,
          created_at: profile.created_at,
          zip_code: zipCode,
          city: city,
          business_name: bs?.business_name || null,
          phone: bs?.phone || profile.phone,
          address: bs?.address || null,
          base_price: servicesByProvider.get(profile.id) || null,
          client_count: clientCountMap.get(profile.id)?.size || 0,
          horse_count: horseCountMap.get(profile.id) || 0,
        };
      });

      setProviders(providersWithData);
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Fehler beim Laden der Provider");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-muted-foreground/50" />;
    return sortDirection === "asc" 
      ? <ChevronUp className="w-4 h-4 text-primary" />
      : <ChevronDown className="w-4 h-4 text-primary" />;
  };

  const sortedAndFilteredProviders = useMemo(() => {
    let filtered = providers.filter((p) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        p.email?.toLowerCase().includes(searchLower) ||
        p.full_name?.toLowerCase().includes(searchLower) ||
        p.readable_id?.toLowerCase().includes(searchLower) ||
        p.zip_code?.includes(searchLower) ||
        p.city?.toLowerCase().includes(searchLower) ||
        p.business_name?.toLowerCase().includes(searchLower)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case "zip":
          aVal = a.zip_code || "99999";
          bVal = b.zip_code || "99999";
          break;
        case "clients":
          aVal = a.client_count;
          bVal = b.client_count;
          break;
        case "horses":
          aVal = a.horse_count;
          bVal = b.horse_count;
          break;
        case "price":
          aVal = a.base_price || 0;
          bVal = b.base_price || 0;
          break;
        case "name":
        default:
          aVal = a.full_name?.toLowerCase() || "";
          bVal = b.full_name?.toLowerCase() || "";
      }

      if (typeof aVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - (bVal as number) : (bVal as number) - aVal;
    });

    return filtered;
  }, [providers, searchTerm, sortField, sortDirection]);

  const handleRowClick = (provider: ProviderData) => {
    setSelectedProvider(provider);
    setQuickViewOpen(true);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserFirstName || !newUserLastName) {
      toast.error("Bitte E-Mail, Vorname und Nachname ausfüllen");
      return;
    }

    setCreating(true);
    try {
      // Calculate access_valid_until based on plan
      let accessDate = newUserAccessValidUntil;
      if (!accessDate) {
        if (newUserPlanOverride === "lifetime_grant" || newUserPlanOverride === "employee") {
          accessDate = "2099-12-31";
        } else if (newUserPlanOverride === "manual_cash_1y") {
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          accessDate = oneYearFromNow.toISOString().split("T")[0];
        }
      }

      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newUserEmail,
          firstName: newUserFirstName,
          lastName: newUserLastName,
          planOverride: newUserPlanOverride !== "standard" ? newUserPlanOverride : null,
          accessValidUntil: accessDate || null,
          zipCode: newUserZipCode || null,
          city: newUserCity || null,
          phone: newUserPhone || null,
          businessName: newUserBusinessName || null,
          featureFlags: newUserFeatureFlags,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Provider ${newUserEmail} wurde erstellt. PID: ${data.user?.readable_id || 'wird generiert'}`);
      setCreateDialogOpen(false);
      // Reset form
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserPlanOverride("standard");
      setNewUserAccessValidUntil("");
      setNewUserZipCode("");
      setNewUserCity("");
      setNewUserPhone("");
      setNewUserBusinessName("");
      setNewUserFeatureFlags(DEFAULT_FEATURE_FLAGS);
      fetchProviders();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Fehler beim Erstellen des Benutzers");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClient = async () => {
    if (!clientEmail || !clientPassword || !clientFullName || !clientProviderId) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    setCreatingClient(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-client", {
        body: {
          email: clientEmail,
          password: clientPassword,
          fullName: clientFullName,
          providerId: clientProviderId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Client ${clientFullName} wurde erstellt und mit Provider verknüpft. KID: ${data.user?.readable_id || 'wird generiert'}`);
      setCreateClientDialogOpen(false);
      setClientEmail("");
      setClientPassword("");
      setClientFullName("");
      setClientProviderId("");
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast.error(error.message || "Fehler beim Erstellen des Clients");
    } finally {
      setCreatingClient(false);
    }
  };

  const openEditDialog = (provider: ProviderData) => {
    setSelectedProvider(provider);
    setEditPlanOverride(provider.plan_override || "standard");
    setEditAccessValidUntil(
      provider.access_valid_until
        ? format(new Date(provider.access_valid_until), "yyyy-MM-dd")
        : ""
    );
    setEditFeatureFlags({
      ...DEFAULT_FEATURE_FLAGS,
      ...(provider.feature_flags || {}),
    });
    setSuspendReason(provider.suspended_reason || "");
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        plan_override: editPlanOverride === "standard" ? null : editPlanOverride,
        access_valid_until: editAccessValidUntil ? new Date(editAccessValidUntil).toISOString() : null,
        feature_flags: editFeatureFlags,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", selectedProvider.id);

      if (error) throw error;

      toast.success("Provider wurde aktualisiert");
      setEditDialogOpen(false);
      fetchProviders();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(error.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_reason: suspendReason || "Manuell gesperrt",
        })
        .eq("id", selectedProvider.id);

      if (error) throw error;

      toast.success("Account wurde gesperrt");
      setEditDialogOpen(false);
      fetchProviders();
    } catch (error: any) {
      console.error("Error suspending user:", error);
      toast.error(error.message || "Fehler beim Sperren");
    } finally {
      setSaving(false);
    }
  };

  const handleUnsuspendUser = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_reason: null,
        })
        .eq("id", selectedProvider.id);

      if (error) throw error;

      toast.success("Account wurde entsperrt");
      setEditDialogOpen(false);
      fetchProviders();
    } catch (error: any) {
      console.error("Error unsuspending user:", error);
      toast.error(error.message || "Fehler beim Entsperren");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!providerToDelete) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: providerToDelete.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Account ${providerToDelete.full_name || providerToDelete.email} wurde gelöscht`);
      setProviderToDelete(null);
      setEditDialogOpen(false);
      fetchProviders();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Fehler beim Löschen");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Bitte beide Passwort-Felder ausfüllen");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Das Passwort muss mindestens 6 Zeichen haben");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Die Passwörter stimmen nicht überein");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Dein Passwort wurde erfolgreich gesetzt!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error setting password:", error);
      toast.error(error.message || "Fehler beim Setzen des Passworts");
    } finally {
      setPasswordSaving(false);
    }
  };

  const getStatusBadge = (provider: ProviderData) => {
    if (provider.is_suspended) {
      return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Gesperrt</Badge>;
    }
    if (provider.plan_override === "lifetime_grant") {
      return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black"><Crown className="w-3 h-3 mr-1" />Lifetime</Badge>;
    }
    if (provider.plan_override === "employee") {
      return <Badge variant="secondary"><Shield className="w-3 h-3 mr-1" />Employee</Badge>;
    }
    if (provider.access_valid_until) {
      const validUntil = new Date(provider.access_valid_until);
      const isExpired = validUntil < new Date();
      return (
        <Badge variant={isExpired ? "destructive" : "default"}>
          <Clock className="w-3 h-3 mr-1" />
          {isExpired ? "Abgelaufen" : format(validUntil, "dd.MM.yyyy")}
        </Badge>
      );
    }
    if (provider.subscription_status === "active") {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Aktiv</Badge>;
    }
    return <Badge variant="outline">{provider.subscription_status || "Kein Abo"}</Badge>;
  };

  const getPlanBadge = (provider: ProviderData) => {
    const plan = provider.plan_override || provider.subscription_plan || "starter";
    const planLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      pro: { label: "Pro", variant: "default" },
      starter: { label: "Starter", variant: "outline" },
      lifetime_grant: { label: "Lifetime", variant: "default" },
      beta_tester: { label: "Beta", variant: "secondary" },
      employee: { label: "Team", variant: "secondary" },
    };
    const config = planLabels[plan] || { label: plan, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getModuleIcons = (provider: ProviderData) => {
    const flags = provider.feature_flags || DEFAULT_FEATURE_FLAGS;
    return (
      <div className="flex gap-1">
        {flags.module_invoicing && (
          <div className="p-1 rounded bg-primary/10" title="Rechnungen">
            <FileText className="w-3 h-3 text-primary" />
          </div>
        )}
        {flags.module_chat && (
          <div className="p-1 rounded bg-primary/10" title="Chat">
            <MessageSquare className="w-3 h-3 text-primary" />
          </div>
        )}
        {flags.module_maps && (
          <div className="p-1 rounded bg-primary/10" title="Maps">
            <MapIcon className="w-3 h-3 text-primary" />
          </div>
        )}
        {flags.beta_features && (
          <div className="p-1 rounded bg-amber-500/20" title="Beta">
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>
        )}
      </div>
    );
  };

  // Access denied screen
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-destructive" />
              Zugriff verweigert
            </CardTitle>
            <CardDescription>
              Du hast keine Berechtigung für diesen Bereich.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Zurück zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading screen
  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Mission Control
            </h1>
            <p className="text-muted-foreground mt-1">
              Provider-Management & Marktforschung
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Zurück
          </Button>
        </div>

        {/* Password Setup Card */}
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="w-5 h-5 text-primary" />
              Permanentes Passwort setzen
            </CardTitle>
            <CardDescription>
              Setze ein permanentes Passwort für deinen Admin-Account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mindestens 6 Zeichen"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Passwort wiederholen"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSetPassword} 
                disabled={passwordSaving || !newPassword || !confirmPassword}
                className="sm:w-auto w-full"
              >
                {passwordSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="providers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="providers" className="gap-2">
              <Users className="w-4 h-4" />
              Provider ({providers.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <Settings className="w-4 h-4" />
              Statistiken
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-2">
              <FileText className="w-4 h-4" />
              Blog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen nach Name, PID, PLZ, Ort..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchProviders} size="icon">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Neuen Provider
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Neuen Provider anlegen</DialogTitle>
                      <DialogDescription>
                        Erstelle manuell einen neuen Provider-Account mit allen Einstellungen.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Basisdaten</h4>
                        <div className="space-y-2">
                          <Label htmlFor="email">E-Mail *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@example.com"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">Vorname *</Label>
                            <Input
                              id="firstName"
                              placeholder="Max"
                              value={newUserFirstName}
                              onChange={(e) => setNewUserFirstName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Nachname *</Label>
                            <Input
                              id="lastName"
                              placeholder="Mustermann"
                              value={newUserLastName}
                              onChange={(e) => setNewUserLastName(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Firmenname</Label>
                          <Input
                            id="businessName"
                            placeholder="z.B. Hufpflege Mustermann"
                            value={newUserBusinessName}
                            onChange={(e) => setNewUserBusinessName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefon</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+49 123 456789"
                            value={newUserPhone}
                            onChange={(e) => setNewUserPhone(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="zipCode">PLZ</Label>
                            <Input
                              id="zipCode"
                              placeholder="12345"
                              value={newUserZipCode}
                              onChange={(e) => setNewUserZipCode(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city">Ort</Label>
                            <Input
                              id="city"
                              placeholder="Musterstadt"
                              value={newUserCity}
                              onChange={(e) => setNewUserCity(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Subscription Settings */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Abo & Zugang</h4>
                        <div className="space-y-2">
                          <Label>Plan / Zahlungsart</Label>
                          <Select value={newUserPlanOverride} onValueChange={setNewUserPlanOverride}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLAN_OVERRIDE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            "Standard" = Copecart-basiert, andere = manuell verwaltet
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Zugang gültig bis</Label>
                          <Input
                            type="date"
                            value={newUserAccessValidUntil}
                            onChange={(e) => setNewUserAccessValidUntil(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Leer = automatisch: Lifetime → 2099, Cash 1Y → +1 Jahr
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Feature Flags */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Module freischalten</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Rechnungen</span>
                            </div>
                            <Switch
                              checked={newUserFeatureFlags.module_invoicing}
                              onCheckedChange={(checked) =>
                                setNewUserFeatureFlags({ ...newUserFeatureFlags, module_invoicing: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Chat</span>
                            </div>
                            <Switch
                              checked={newUserFeatureFlags.module_chat}
                              onCheckedChange={(checked) =>
                                setNewUserFeatureFlags({ ...newUserFeatureFlags, module_chat: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <MapIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Anfahrt/Maps</span>
                            </div>
                            <Switch
                              checked={newUserFeatureFlags.module_maps}
                              onCheckedChange={(checked) =>
                                setNewUserFeatureFlags({ ...newUserFeatureFlags, module_maps: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-500" />
                              <span className="text-sm">Beta</span>
                            </div>
                            <Switch
                              checked={newUserFeatureFlags.beta_features}
                              onCheckedChange={(checked) =>
                                setNewUserFeatureFlags({ ...newUserFeatureFlags, beta_features: checked })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Abbrechen
                      </Button>
                      <Button onClick={handleCreateUser} disabled={creating}>
                        {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Provider erstellen
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {/* Create Client Dialog */}
                <Dialog open={createClientDialogOpen} onOpenChange={setCreateClientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Neuen Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Neuen Client anlegen</DialogTitle>
                      <DialogDescription>
                        Erstelle einen Client-Account mit Passwort und verknüpfe ihn mit einem Provider.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">E-Mail</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          placeholder="kunde@example.com"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientFullName">Vollständiger Name</Label>
                        <Input
                          id="clientFullName"
                          placeholder="Max Mustermann"
                          value={clientFullName}
                          onChange={(e) => setClientFullName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientPassword">Passwort</Label>
                        <Input
                          id="clientPassword"
                          type="password"
                          placeholder="Mindestens 6 Zeichen"
                          value={clientPassword}
                          onChange={(e) => setClientPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientProvider">Provider verknüpfen</Label>
                        <Select value={clientProviderId} onValueChange={setClientProviderId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Provider auswählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {providers.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.full_name || p.email} ({p.readable_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateClientDialogOpen(false)}>
                        Abbrechen
                      </Button>
                      <Button onClick={handleCreateClient} disabled={creatingClient}>
                        {creatingClient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Client erstellen
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Provider Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">PID</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-2">
                            Provider
                            {getSortIcon("name")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("zip")}
                        >
                          <div className="flex items-center gap-2">
                            Region
                            {getSortIcon("zip")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-right"
                          onClick={() => handleSort("price")}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Basis-Preis
                            {getSortIcon("price")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-center"
                          onClick={() => handleSort("clients")}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Kunden
                            {getSortIcon("clients")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-center"
                          onClick={() => handleSort("horses")}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Pferde
                            {getSortIcon("horses")}
                          </div>
                        </TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAndFilteredProviders.map((provider) => (
                        <TableRow 
                          key={provider.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(provider)}
                        >
                          <TableCell>
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              #{provider.readable_id || provider.id.slice(0, 8)}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{provider.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{provider.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {provider.zip_code || provider.city ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span>{provider.zip_code || ""} {provider.city || ""}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {provider.base_price ? (
                              <span className="font-medium">{provider.base_price.toFixed(0)} €</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium">{provider.client_count}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium">{provider.horse_count}</span>
                          </TableCell>
                          <TableCell>{getPlanBadge(provider)}</TableCell>
                          <TableCell>{getModuleIcons(provider)}</TableCell>
                          <TableCell>{getStatusBadge(provider)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(provider);
                              }}
                            >
                              Bearbeiten
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedAndFilteredProviders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            Keine Provider gefunden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gesamt Provider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{providers.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gesamt Kunden
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {providers.reduce((sum, p) => sum + p.client_count, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gesamt Pferde
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {providers.reduce((sum, p) => sum + p.horse_count, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ø Basis-Preis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {(() => {
                      const withPrice = providers.filter(p => p.base_price);
                      if (withPrice.length === 0) return "—";
                      const avg = withPrice.reduce((sum, p) => sum + (p.base_price || 0), 0) / withPrice.length;
                      return `${avg.toFixed(0)} €`;
                    })()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Regional Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - PLZ Regions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Regionale Verteilung (PLZ-Gebiete)</CardTitle>
                  <CardDescription>Provider nach PLZ-Regionen (erste 2 Ziffern)</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Group providers by first 2 digits of postal code
                    const regionCounts = providers.reduce((acc, p) => {
                      if (p.zip_code && p.zip_code.length >= 2) {
                        const region = p.zip_code.substring(0, 2);
                        acc[region] = (acc[region] || 0) + 1;
                      } else {
                        acc["Unbekannt"] = (acc["Unbekannt"] || 0) + 1;
                      }
                      return acc;
                    }, {} as Record<string, number>);

                    const chartData = Object.entries(regionCounts)
                      .map(([region, count]) => ({ region: `${region}xxx`, count }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 15); // Top 15 regions

                    if (chartData.length === 0) {
                      return (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Keine PLZ-Daten verfügbar
                        </div>
                      );
                    }

                    return (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis 
                              type="category" 
                              dataKey="region" 
                              width={60}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                              formatter={(value: number) => [`${value} Provider`, 'Anzahl']}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                            <Bar 
                              dataKey="count" 
                              fill="hsl(var(--primary))" 
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Pie Chart - Plan Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Plan-Verteilung</CardTitle>
                  <CardDescription>Aktive Abonnements nach Plan-Typ</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const planCounts = providers.reduce((acc, p) => {
                      const plan = p.plan_override || p.subscription_plan || "starter";
                      acc[plan] = (acc[plan] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);

                    const planLabels: Record<string, string> = {
                      pro: "Pro",
                      starter: "Starter",
                      lifetime_grant: "Lifetime",
                      beta_tester: "Beta",
                      employee: "Team",
                      manual_cash_1y: "Cash 1Y"
                    };

                    const COLORS = [
                      'hsl(var(--primary))',
                      'hsl(var(--chart-2))',
                      'hsl(var(--chart-3))',
                      'hsl(var(--chart-4))',
                      'hsl(var(--chart-5))',
                      'hsl(var(--muted-foreground))'
                    ];

                    const chartData = Object.entries(planCounts)
                      .map(([plan, count]) => ({ 
                        name: planLabels[plan] || plan, 
                        value: count,
                        plan 
                      }))
                      .sort((a, b) => b.value - a.value);

                    if (chartData.length === 0) {
                      return (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Keine Plan-Daten verfügbar
                        </div>
                      );
                    }

                    return (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => [`${value} Provider`, 'Anzahl']}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Volume Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kundenvolumen nach Region</CardTitle>
                <CardDescription>Anzahl Kunden und Pferde pro PLZ-Region</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Group by region with volume data
                  const regionData = providers.reduce((acc, p) => {
                    const region = p.zip_code?.substring(0, 2) || "??";
                    if (!acc[region]) {
                      acc[region] = { providers: 0, clients: 0, horses: 0 };
                    }
                    acc[region].providers++;
                    acc[region].clients += p.client_count;
                    acc[region].horses += p.horse_count;
                    return acc;
                  }, {} as Record<string, { providers: number; clients: number; horses: number }>);

                  const chartData = Object.entries(regionData)
                    .map(([region, data]) => ({
                      region: region === "??" ? "Unbekannt" : `${region}xxx`,
                      ...data
                    }))
                    .sort((a, b) => b.clients - a.clients)
                    .slice(0, 12);

                  if (chartData.length === 0) {
                    return (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Keine Daten verfügbar
                      </div>
                    );
                  }

                  return (
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ left: 10, right: 30, top: 10, bottom: 30 }}>
                          <XAxis 
                            dataKey="region" 
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis allowDecimals={false} />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              const labels: Record<string, string> = {
                                clients: 'Kunden',
                                horses: 'Pferde',
                                providers: 'Provider'
                              };
                              return [`${value}`, labels[name] || name];
                            }}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend 
                            formatter={(value) => {
                              const labels: Record<string, string> = {
                                clients: 'Kunden',
                                horses: 'Pferde'
                              };
                              return labels[value] || value;
                            }}
                          />
                          <Bar dataKey="clients" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="horses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Pricing by Region */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Durchschnittspreise nach Region</CardTitle>
                <CardDescription>Ø Basis-Preis pro PLZ-Region</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Calculate average price per region
                  const regionPrices = providers.reduce((acc, p) => {
                    if (!p.base_price) return acc;
                    const region = p.zip_code?.substring(0, 2) || "??";
                    if (!acc[region]) {
                      acc[region] = { total: 0, count: 0 };
                    }
                    acc[region].total += p.base_price;
                    acc[region].count++;
                    return acc;
                  }, {} as Record<string, { total: number; count: number }>);

                  const chartData = Object.entries(regionPrices)
                    .map(([region, data]) => ({
                      region: region === "??" ? "Unbekannt" : `${region}xxx`,
                      avgPrice: Math.round(data.total / data.count),
                      count: data.count
                    }))
                    .filter(d => d.count >= 1)
                    .sort((a, b) => b.avgPrice - a.avgPrice)
                    .slice(0, 15);

                  if (chartData.length === 0) {
                    return (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Keine Preisdaten verfügbar
                      </div>
                    );
                  }

                  return (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40 }}>
                          <XAxis 
                            type="number" 
                            domain={[0, 'auto']}
                            tickFormatter={(value) => `${value}€`}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="region" 
                            width={60}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: number) => [`${value} €`, 'Ø Preis']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar 
                            dataKey="avgPrice" 
                            fill="hsl(var(--chart-3))" 
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <AdminBlogManager />
          </TabsContent>
        </Tabs>

        {/* Quick-View Drawer */}
        <Sheet open={quickViewOpen} onOpenChange={setQuickViewOpen}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  #{selectedProvider?.readable_id || selectedProvider?.id.slice(0, 8)}
                </code>
              </SheetTitle>
              <SheetDescription>
                Provider Details & Marktdaten
              </SheetDescription>
            </SheetHeader>

            {selectedProvider && (
              <div className="mt-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">{selectedProvider.full_name || "Unbekannt"}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-Mail</span>
                      <span>{selectedProvider.email || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefon</span>
                      <span>{selectedProvider.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Firma</span>
                      <span>{selectedProvider.business_name || "—"}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Location */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Standort
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PLZ</span>
                      <span>{selectedProvider.zip_code || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ort</span>
                      <span>{selectedProvider.city || "—"}</span>
                    </div>
                    {selectedProvider.address && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adresse</span>
                        <span className="text-right max-w-[200px]">{selectedProvider.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Volume */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Volumen
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{selectedProvider.client_count}</p>
                      <p className="text-sm text-muted-foreground">Kunden</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{selectedProvider.horse_count}</p>
                      <p className="text-sm text-muted-foreground">Pferde</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Euro className="w-4 h-4" />
                    Preise
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basis-Preis</span>
                      <span className="font-medium">
                        {selectedProvider.base_price ? `${selectedProvider.base_price.toFixed(2)} €` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Subscription */}
                <div className="space-y-3">
                  <h4 className="font-medium">Abonnement</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Plan</span>
                      {getPlanBadge(selectedProvider)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      {getStatusBadge(selectedProvider)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Module</span>
                      {getModuleIcons(selectedProvider)}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Meta */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Erstellt am</span>
                    <span>{format(new Date(selectedProvider.created_at), "dd.MM.yyyy", { locale: de })}</span>
                  </div>
                  {selectedProvider.is_manually_managed && (
                    <Badge variant="outline" className="mt-2">Manuell verwaltet</Badge>
                  )}
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setQuickViewOpen(false);
                      openEditDialog(selectedProvider);
                    }}
                  >
                    Bearbeiten
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Provider bearbeiten</DialogTitle>
              <DialogDescription>
                {selectedProvider?.full_name} ({selectedProvider?.email})
              </DialogDescription>
            </DialogHeader>

            {selectedProvider && (
              <Tabs defaultValue="subscription" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="subscription">Abo & Plan</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="danger">Sperren</TabsTrigger>
                </TabsList>

                <TabsContent value="subscription" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Plan Override</Label>
                    <Select value={editPlanOverride} onValueChange={setEditPlanOverride}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_OVERRIDE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Überschreibt den Copecart-Status
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Zugang gültig bis</Label>
                    <Input
                      type="date"
                      value={editAccessValidUntil}
                      onChange={(e) => setEditAccessValidUntil(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Wenn gesetzt, hat der User bis zu diesem Datum Zugriff
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Steuere, welche Module dieser Provider sieht und nutzen kann.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Rechnungen</Label>
                        <p className="text-sm text-muted-foreground">
                          Darf Rechnungen schreiben
                        </p>
                      </div>
                      <Switch
                        checked={editFeatureFlags.module_invoicing}
                        onCheckedChange={(checked) =>
                          setEditFeatureFlags({ ...editFeatureFlags, module_invoicing: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Chat</Label>
                        <p className="text-sm text-muted-foreground">
                          Darf den Chat nutzen
                        </p>
                      </div>
                      <Switch
                        checked={editFeatureFlags.module_chat}
                        onCheckedChange={(checked) =>
                          setEditFeatureFlags({ ...editFeatureFlags, module_chat: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Anfahrt / Maps</Label>
                        <p className="text-sm text-muted-foreground">
                          Darf die Anfahrts-Funktion nutzen
                        </p>
                      </div>
                      <Switch
                        checked={editFeatureFlags.module_maps}
                        onCheckedChange={(checked) =>
                          setEditFeatureFlags({ ...editFeatureFlags, module_maps: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Beta Features</Label>
                        <p className="text-sm text-muted-foreground">
                          Sieht neue Test-Funktionen
                        </p>
                      </div>
                      <Switch
                        checked={editFeatureFlags.beta_features}
                        onCheckedChange={(checked) =>
                          setEditFeatureFlags({ ...editFeatureFlags, beta_features: checked })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="danger" className="space-y-4 mt-4">
                  {selectedProvider.is_suspended ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                          <Ban className="w-5 h-5" />
                          <span className="font-semibold">Account ist gesperrt</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Gesperrt am:{" "}
                          {selectedProvider.suspended_at
                            ? format(new Date(selectedProvider.suspended_at), "dd.MM.yyyy HH:mm", {
                                locale: de,
                              })
                            : "Unbekannt"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Grund: {selectedProvider.suspended_reason || "Kein Grund angegeben"}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleUnsuspendUser}
                        disabled={saving}
                      >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Account entsperren
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-600 mb-2">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-semibold">Vorsicht!</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Ein gesperrter Account kann sich nicht mehr einloggen.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Sperrgrund (optional)</Label>
                        <Input
                          placeholder="z.B. Offene Zahlung, Kopierter Account..."
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                        />
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full gap-2">
                            <Ban className="w-4 h-4" />
                            Account sperren
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Account wirklich sperren?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {selectedProvider.full_name} ({selectedProvider.email}) wird sofort gesperrt.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleSuspendUser}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Ja, sperren
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  <Separator className="my-6" />

                  {/* Delete Account Section */}
                  <div className="space-y-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <Trash2 className="w-5 h-5" />
                        <span className="font-semibold">Account dauerhaft löschen</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Der Account wird unwiderruflich gelöscht. Alle Daten werden entfernt.
                      </p>
                    </div>

                    <AlertDialog open={!!providerToDelete} onOpenChange={(open) => !open && setProviderToDelete(null)}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setProviderToDelete(selectedProvider)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Account löschen
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Account unwiderruflich löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <span className="font-semibold text-destructive">
                              {providerToDelete?.full_name || providerToDelete?.email}
                            </span>{" "}
                            wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteUser}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Ja, endgültig löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

