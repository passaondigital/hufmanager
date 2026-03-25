import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
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
  Trash2,
  Building2,
  Globe,
  Phone,
  GraduationCap,
  ClipboardList,
  BarChart3,
  Wand2,
  Eye,
  EyeOff,
  Megaphone,
  Bug,
  Download,
  Target,
  PiggyBank,
  ScrollText
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AdminBlogManager from "@/components/admin/AdminBlogManager";
import MissionControlKPIsV2 from "@/components/admin/MissionControlKPIsV2";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import AdminActivityLogViewer from "@/components/admin/AdminActivityLogViewer";
import AdminBroadcastCard from "@/components/admin/AdminBroadcastCard";
import AdminFeedbackViewer from "@/components/admin/AdminFeedbackViewer";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";
import { Checkbox } from "@/components/ui/checkbox";
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
import { isDemoEmail } from "@/lib/demo-accounts";
import { PlatformSuccession } from "@/components/admin/PlatformSuccession";
import { AdminEmailAnalytics } from "@/features/email-marketing/admin/AdminEmailAnalytics";
import { MissionControlNav, MissionControlNavMobile } from "@/components/admin/MissionControlNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    module_academy?: boolean;
    module_hufanalyse?: boolean;
    module_network?: boolean;
    module_analytics?: boolean;
    beta_features?: boolean;
  } | null;
  feature_statuses: FeatureStatuses | null;
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
  subdomain: string | null;
  about_text: string | null;
  hero_headline: string | null;
  // Computed data
  base_price: number | null;
  client_count: number;
  horse_count: number;
}

const PLAN_OVERRIDE_OPTIONS = [
  { value: "standard", label: "Standard (wartet auf Copecart)" },
  { value: "copecart_starter", label: "🟢 Starter (9,90€/Monat)" },
  { value: "copecart_pro", label: "🟡 Pro (29€/Monat)" },
  { value: "copecart_duo", label: "🔵 Duo (49€/Monat)" },
  { value: "copecart_team", label: "🟣 Team (79€/Monat)" },
  { value: "lifetime_grant", label: "⭐ Lifetime Grant" },
  { value: "manual_cash_1y", label: "💵 Barzahlung (1 Jahr)" },
  { value: "beta_tester", label: "🧪 Beta Tester" },
  { value: "employee", label: "👤 Mitarbeiter" },
  // Legacy values (still supported for backward compat)
  { value: "copecart_anfaenger", label: "🟢 [Legacy] Anfänger → Starter" },
  { value: "copecart_fortgeschritten", label: "🟡 [Legacy] Fortgeschritten → Pro" },
  { value: "copecart_profi", label: "🔵 [Legacy] Profi → Duo" },
];

import { FeatureStatuses, FeatureStatus, FeatureKey, FEATURE_DEFINITIONS, migrateBooleanToStatus } from "@/types/featureFlags";
import { ProviderFeatureEditor } from "@/components/admin/ProviderFeatureEditor";
import { GlobalFeatureFlagsManager } from "@/components/admin/GlobalFeatureFlagsManager";
import { FeatureRolloutDashboard } from "@/components/admin/FeatureRolloutDashboard";

const DEFAULT_FEATURE_STATUSES: FeatureStatuses = {
  module_invoicing: 'public',
  module_chat: 'public',
  module_maps: 'public',
  module_academy: 'public',
  module_hufanalyse: 'public',
  module_network: 'public',
  module_analytics: 'public',
  beta_features: 'disabled',
  module_team: 'disabled',
};

// Legacy default for backward compat
const DEFAULT_FEATURE_FLAGS = {
  module_invoicing: true,
  module_chat: true,
  module_maps: true,
  module_academy: true,
  module_hufanalyse: true,
  module_network: true,
  module_analytics: true,
  beta_features: false,
};

type SortField = "zip" | "clients" | "horses" | "price" | "name";
type SortDirection = "asc" | "desc";

export default function MissionControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  // emergency escalations for admin view
  const [escalations, setEscalations] = useState<any[]>([]);
  const [connectStats, setConnectStats] = useState<{ activeConnections: number; pendingConnections: number; totalInvitations: number; acceptedInvitations: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ProviderData | null>(null);

  // Bulk selection
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Activity Log
  const { logActivity } = useAdminActivityLog();

  // New user form
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
  // Initial services for new provider
  const [newUserServices, setNewUserServices] = useState([
    { name: "Barhufbearbeitung", price: 45, enabled: true },
    { name: "Hufkorrektur", price: 55, enabled: false },
    { name: "Erstberatung", price: 0, enabled: false },
    { name: "Rehebeschlag", price: 120, enabled: false },
  ]);
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
  const [editFeatureStatuses, setEditFeatureStatuses] = useState<FeatureStatuses>(DEFAULT_FEATURE_STATUSES);
  const [suspendReason, setSuspendReason] = useState("");
  
  // Business settings edit state
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editSubdomain, setEditSubdomain] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editZipCode, setEditZipCode] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAboutText, setEditAboutText] = useState("");
  const [editHeroHeadline, setEditHeroHeadline] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  // when we have confirmed admin status, fetch data
  useEffect(() => {
    if (isAdmin) {
      fetchProviders();
    }
  }, [isAdmin]);

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
        .select("user_id, address, phone, business_name, subdomain, about_text, hero_headline");

      if (bsError) console.warn("Could not fetch business_settings:", bsError);

      // 4. Fetch services for base price (Barhufbearbeitung or cheapest)
      const { data: allServices, error: servicesError } = await supabase
        .from("services")
        .select("provider_id, name, base_price, billing_type")
        .eq("is_active", true);
      
      // 5. also fetch escalations (admin only)
      const { data: escData, error: escError } = await supabase
        .from("emergency_escalations")
        .select(`*, provider:profiles(id, full_name)`)
        .order("created_at", { ascending: false });
      if (escError) {
        console.warn("could not load escalations", escError);
      } else if (escData) {
        setEscalations(escData as any[]);
      }

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
          feature_statuses: profile.feature_statuses as FeatureStatuses | null,
          is_suspended: profile.is_suspended,
          suspended_at: profile.suspended_at,
          suspended_reason: profile.suspended_reason,
          created_at: profile.created_at,
          zip_code: zipCode,
          city: city,
          business_name: bs?.business_name || null,
          phone: bs?.phone || profile.phone,
          address: bs?.address || null,
          subdomain: bs?.subdomain || null,
          about_text: bs?.about_text || null,
          hero_headline: bs?.hero_headline || null,
          base_price: servicesByProvider.get(profile.id) || null,
          client_count: clientCountMap.get(profile.id)?.size || 0,
          horse_count: horseCountMap.get(profile.id) || 0,
        };
      });

      setProviders(providersWithData.filter(p => !isDemoEmail(p.email)));

      // Fetch HM Connect stats
      try {
        const [grantsRes, invitesRes] = await Promise.all([
          supabase.from("access_grants").select("status, is_active", { count: "exact" }),
          supabase.from("hm_connect_invitations").select("status", { count: "exact" }),
        ]);
        const grants = grantsRes.data || [];
        const invites = invitesRes.data || [];
        setConnectStats({
          activeConnections: grants.filter(g => g.is_active && g.status === "active").length,
          pendingConnections: grants.filter(g => g.status === "pending").length,
          totalInvitations: invites.length,
          acceptedInvitations: invites.filter(i => i.status === "accepted").length,
        });
      } catch (csErr) {
        console.warn("Could not fetch connect stats:", csErr);
      }
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

      // Get enabled services
      const enabledServices = newUserServices
        .filter(s => s.enabled)
        .map(s => ({ name: s.name, price: s.price }));

      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newUserEmail,
          password: newUserPassword || null,
          firstName: newUserFirstName,
          lastName: newUserLastName,
          planOverride: newUserPlanOverride !== "standard" ? newUserPlanOverride : null,
          accessValidUntil: accessDate || null,
          zipCode: newUserZipCode || null,
          city: newUserCity || null,
          phone: newUserPhone || null,
          businessName: newUserBusinessName || null,
          featureFlags: newUserFeatureFlags,
          initialServices: enabledServices.length > 0 ? enabledServices : null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Log activity
      await logActivity({
        actionType: "provider_created",
        targetType: "provider",
        targetId: data.user?.id,
        targetName: `${newUserFirstName} ${newUserLastName} (${newUserEmail})`,
        details: { planOverride: newUserPlanOverride, email: newUserEmail },
      });

      toast.success(`Provider ${newUserEmail} wurde erstellt. PID: ${data.user?.readable_id || 'wird generiert'}`);
      setCreateDialogOpen(false);
      // Reset form
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserPlanOverride("standard");
      setNewUserAccessValidUntil("");
      setNewUserZipCode("");
      setNewUserCity("");
      setNewUserPhone("");
      setNewUserBusinessName("");
      setNewUserFeatureFlags(DEFAULT_FEATURE_FLAGS);
      setNewUserServices([
        { name: "Barhufbearbeitung", price: 45, enabled: true },
        { name: "Hufkorrektur", price: 55, enabled: false },
        { name: "Erstberatung", price: 0, enabled: false },
        { name: "Rehebeschlag", price: 120, enabled: false },
      ]);
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
    // Migrate boolean flags to status-based system
    const migratedStatuses = migrateBooleanToStatus(
      provider.feature_flags,
      provider.feature_statuses || null
    );
    setEditFeatureStatuses({
      ...DEFAULT_FEATURE_STATUSES,
      ...migratedStatuses,
    });
    setSuspendReason(provider.suspended_reason || "");
    // Business settings
    setEditBusinessName(provider.business_name || "");
    setEditSubdomain(provider.subdomain || "");
    setEditAddress(provider.address || "");
    setEditZipCode(provider.zip_code || "");
    setEditCity(provider.city || "");
    setEditPhone(provider.phone || "");
    setEditAboutText(provider.about_text || "");
    setEditHeroHeadline(provider.hero_headline || "");
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    try {
      // Update profile
      // Update profile with both legacy flags and new feature statuses
      const profileData: Record<string, unknown> = {
        plan_override: editPlanOverride === "standard" ? null : editPlanOverride,
        access_valid_until: editAccessValidUntil ? new Date(editAccessValidUntil).toISOString() : null,
        feature_flags: editFeatureFlags,
        feature_statuses: editFeatureStatuses,
        zip_code: editZipCode || null,
        city: editCity || null,
        phone: editPhone || null,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", selectedProvider.id);

      if (profileError) throw profileError;

      // Update business_settings (upsert)
      const { error: bsError } = await supabase
        .from("business_settings")
        .upsert({
          id: selectedProvider.id, // id must match user_id due to FK constraint on auth.users
          user_id: selectedProvider.id,
          business_name: editBusinessName || null,
          subdomain: editSubdomain || null,
          address: editAddress || null,
          phone: editPhone || null,
          about_text: editAboutText || null,
          hero_headline: editHeroHeadline || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (bsError) throw bsError;

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

      await logActivity({
        actionType: "provider_suspended",
        targetType: "provider",
        targetId: selectedProvider.id,
        targetName: selectedProvider.full_name || selectedProvider.email || "Provider",
        details: { reason: suspendReason },
      });

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

      await logActivity({
        actionType: "provider_unsuspended",
        targetType: "provider",
        targetId: selectedProvider.id,
        targetName: selectedProvider.full_name || selectedProvider.email || "Provider",
      });

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

      await logActivity({
        actionType: "provider_deleted",
        targetType: "provider",
        targetId: providerToDelete.id,
        targetName: providerToDelete.full_name || providerToDelete.email || "Provider",
      });

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
      starter: { label: "Starter", variant: "outline" },
      copecart_starter: { label: "Starter", variant: "outline" },
      pro: { label: "Pro", variant: "default" },
      copecart_pro: { label: "Pro", variant: "default" },
      duo: { label: "Duo", variant: "default" },
      copecart_duo: { label: "Duo", variant: "default" },
      team: { label: "Team", variant: "default" },
      copecart_team: { label: "Team", variant: "default" },
      lifetime_grant: { label: "Lifetime", variant: "default" },
      beta_tester: { label: "Beta", variant: "secondary" },
      employee: { label: "MA", variant: "secondary" },
      // Legacy
      copecart_anfaenger: { label: "Starter", variant: "outline" },
      copecart_fortgeschritten: { label: "Pro", variant: "default" },
      copecart_profi: { label: "Duo", variant: "default" },
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
            <Button onClick={() => navigate("/home")} className="w-full">
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
      <div className="container mx-auto py-4 md:py-8 px-4">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-responsive-h2 flex items-center gap-2 md:gap-3">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              Mission Control
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Provider-Management & Marktforschung
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="min-h-[44px] flex-1 md:flex-none" onClick={() => navigate("/home")}>
              ← Dashboard
            </Button>
            <Button variant="destructive" className="min-h-[44px] flex-1 md:flex-none" onClick={logout}>
              Ausloggen
            </Button>
          </div>
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

        {/* KPI Dashboard */}
        <MissionControlKPIs />

        <Tabs defaultValue="providers" className="space-y-4 md:space-y-6">
          {/* Tabs - Horizontally scrollable on mobile */}
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex min-w-max">
              <TabsTrigger value="providers" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Users className="w-4 h-4" />
                <span className="hidden md:inline">Provider</span> ({providers.length})
              </TabsTrigger>
              <TabsTrigger value="escalations" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden md:inline">Eskalationen</span>
              </TabsTrigger>
              <TabsTrigger value="partners" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Globe className="w-4 h-4" />
                <span className="hidden md:inline">Partner</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Building2 className="w-4 h-4" />
                <span className="hidden md:inline">Mitarbeiter</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">Statistiken</span>
              </TabsTrigger>
              <TabsTrigger value="blog" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden md:inline">Blog</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <ClipboardList className="w-4 h-4" />
                <span className="hidden md:inline">Aktivität</span>
              </TabsTrigger>
              <TabsTrigger value="tools" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Megaphone className="w-4 h-4" />
                <span className="hidden md:inline">Tools</span>
              </TabsTrigger>
              <TabsTrigger value="versions" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Release Control</span>
              </TabsTrigger>
              <TabsTrigger value="rollout" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Sparkles className="w-4 h-4" />
                <span className="hidden md:inline">Rollout</span>
              </TabsTrigger>
              <TabsTrigger value="demo" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Eye className="w-4 h-4" />
                <span className="hidden md:inline">Demo</span>
              </TabsTrigger>
              <TabsTrigger value="glossary" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden md:inline">Glossar</span>
              </TabsTrigger>
              <TabsTrigger value="funnel" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Target className="w-4 h-4" />
                <span className="hidden md:inline">Funnel</span>
              </TabsTrigger>
              <TabsTrigger value="revenue" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <PiggyBank className="w-4 h-4" />
                <span className="hidden md:inline">Einnahmen</span>
              </TabsTrigger>
              <TabsTrigger value="retention" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Clock className="w-4 h-4" />
                <span className="hidden md:inline">Fristen</span>
              </TabsTrigger>
              <TabsTrigger value="hufrente" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Hufrente</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Euro className="w-4 h-4" />
                <span className="hidden md:inline">Zahlungen</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden md:inline">Rechnungen</span>
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <ScrollText className="w-4 h-4" />
                <span className="hidden md:inline">Verträge</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Compliance</span>
              </TabsTrigger>
              <TabsTrigger value="browsers" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Globe className="w-4 h-4" />
                <span className="hidden md:inline">Browser</span>
              </TabsTrigger>
              <TabsTrigger value="succession" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Nachfolge</span>
              </TabsTrigger>
              <TabsTrigger value="email-marketing" className="gap-1.5 min-h-[44px] text-xs md:text-sm">
                <Megaphone className="w-4 h-4" />
                <span className="hidden md:inline">E-Mail</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Quick Links - Hidden on mobile, show in dropdown or collapsed */}
          <div className="hidden md:flex ml-auto gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/admin/module-access-logs")}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Zugriffs-Logs
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/admin/feature-usage")}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Feature-Nutzung
            </Button>
          </div>

          <TabsContent value="providers" className="space-y-4">
            {/* Bulk Actions Bar */}
            <BulkActionsBar
              selectedIds={selectedProviderIds}
              providers={sortedAndFilteredProviders}
              onSelectionChange={setSelectedProviderIds}
              onActionComplete={fetchProviders}
            />

            {/* Action Bar - Mobile optimized */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen nach Name, PID, PLZ, Ort..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-[44px]"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchProviders} size="icon" className="min-h-[44px] min-w-[44px]">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 flex-1 md:flex-none min-h-[44px]">
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Neuen Provider</span>
                      <span className="sm:hidden">Neu</span>
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
                        <div className="space-y-2">
                          <Label htmlFor="providerPassword">Initiales Passwort (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="providerPassword"
                              type="text"
                              placeholder="Leer = Invite-Mail"
                              value={newUserPassword}
                              onChange={(e) => setNewUserPassword(e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
                                let pw = "";
                                for (let i = 0; i < 12; i++) {
                                  pw += chars.charAt(Math.floor(Math.random() * chars.length));
                                }
                                setNewUserPassword(pw);
                                toast.success("Passwort generiert!");
                              }}
                              title="Passwort generieren"
                            >
                              <Wand2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Wenn ausgefüllt, wird der User direkt mit diesem Passwort angelegt (keine E-Mail-Bestätigung nötig).
                          </p>
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
                              <GraduationCap className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Academy</span>
                            </div>
                            <Switch
                              checked={newUserFeatureFlags.module_academy}
                              onCheckedChange={(checked) =>
                                setNewUserFeatureFlags({ ...newUserFeatureFlags, module_academy: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Hufanalyse</span>
                            </div>
                            <Switch
                              checked={newUserFeatureFlags.module_hufanalyse}
                              onCheckedChange={(checked) =>
                                setNewUserFeatureFlags({ ...newUserFeatureFlags, module_hufanalyse: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Netzwerk</span>
                            </div>
                            <Switch
                              checked={newUserFeatureFlags.module_network}
                              onCheckedChange={(checked) =>
                                setNewUserFeatureFlags({ ...newUserFeatureFlags, module_network: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Analytics</span>
                            </div>
                            <Switch
                              checked={newUserFeatureFlags.module_analytics}
                              onCheckedChange={(checked) =>
                                setNewUserFeatureFlags({ ...newUserFeatureFlags, module_analytics: checked })
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

                      <Separator />

                      {/* Initial Services */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Initiale Services</h4>
                        <p className="text-sm text-muted-foreground">
                          Wähle aus, welche Standard-Services mit Preisen angelegt werden sollen.
                        </p>
                        <div className="space-y-3">
                          {newUserServices.map((service, index) => (
                            <div key={service.name} className="flex items-center gap-3 p-3 border rounded-lg">
                              <Switch
                                checked={service.enabled}
                                onCheckedChange={(checked) => {
                                  const updated = [...newUserServices];
                                  updated[index].enabled = checked;
                                  setNewUserServices(updated);
                                }}
                              />
                              <span className="flex-1 text-sm font-medium">{service.name}</span>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={service.price}
                                  onChange={(e) => {
                                    const updated = [...newUserServices];
                                    updated[index].price = parseFloat(e.target.value) || 0;
                                    setNewUserServices(updated);
                                  }}
                                  className="w-20 text-right"
                                  disabled={!service.enabled}
                                />
                                <span className="text-sm text-muted-foreground">€</span>
                              </div>
                            </div>
                          ))}
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
                        <div className="flex gap-2">
                          <Input
                            id="clientPassword"
                            type="text"
                            placeholder="Mindestens 6 Zeichen"
                            value={clientPassword}
                            onChange={(e) => setClientPassword(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
                              let pw = "";
                              for (let i = 0; i < 12; i++) {
                                pw += chars.charAt(Math.floor(Math.random() * chars.length));
                              }
                              setClientPassword(pw);
                              toast.success("Passwort generiert!");
                            }}
                            title="Passwort generieren"
                          >
                            <Wand2 className="w-4 h-4" />
                          </Button>
                        </div>
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
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedProviderIds.length === sortedAndFilteredProviders.length && sortedAndFilteredProviders.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProviderIds(sortedAndFilteredProviders.map(p => p.id));
                              } else {
                                setSelectedProviderIds([]);
                              }
                            }}
                          />
                        </TableHead>
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
                          className={`cursor-pointer hover:bg-muted/50 ${selectedProviderIds.includes(provider.id) ? 'bg-primary/5' : ''}`}
                          onClick={() => handleRowClick(provider)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedProviderIds.includes(provider.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProviderIds(prev => [...prev, provider.id]);
                                } else {
                                  setSelectedProviderIds(prev => prev.filter(id => id !== provider.id));
                                }
                              }}
                            />
                          </TableCell>
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

          <TabsContent value="activity" className="space-y-6">
            <AdminActivityLogViewer limit={100} />
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminBroadcastCard />
              <AdminFeedbackViewer />
            </div>
          </TabsContent>

          <TabsContent value="versions" className="space-y-6">
            <ReleaseControlCenter />
          </TabsContent>

          <TabsContent value="rollout" className="space-y-6">
            <GlobalFeatureFlagsManager />
            <FeatureRolloutDashboard 
              providers={providers}
              onProviderClick={(providerId) => {
                const provider = providers.find(p => p.id === providerId);
                if (provider) {
                  openEditDialog(provider);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="demo" className="space-y-6">
            <DemoAccountsManager />
            <DemoAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="glossary" className="space-y-6">
            <AdminGlossaryManager />
          </TabsContent>

           <TabsContent value="funnel" className="space-y-6">
            <FunnelCockpit />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <AdminRevenue />
          </TabsContent>

          <TabsContent value="retention" className="space-y-6">
            <RetentionDashboard />
          </TabsContent>

          <TabsContent value="hufrente" className="space-y-6">
            <AdminHufrenteOverview />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <AdminManualPayments />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <AdminInvoices />
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <AdminContractManager />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <AdminContractTracking />
            <AdminTransfersOverview />
          </TabsContent>

          <TabsContent value="browsers" className="space-y-6">
            <AdminBrowserAnalytics />
          </TabsContent>

          <TabsContent value="succession" className="space-y-6">
            <PlatformSuccession />
          </TabsContent>

          <TabsContent value="email-marketing" className="space-y-6">
            <AdminEmailAnalytics />
          </TabsContent>

          {/* ESCALATIONS TAB */}
          <TabsContent value="escalations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" /> Notfall-Eskalationen
                </CardTitle>
                <CardDescription>
                  Alle Notfall-Meldungen von Proviern verwaltbar unter Insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                {escalations.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Keine Eskalationen vorhanden.</p>
                ) : (
                  <div className="space-y-3">
                    <Table className="text-xs md:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Provider</TableHead>
                          <TableHead>Kunde (#KID)</TableHead>
                          <TableHead>Grund</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Erstellt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {escalations.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-mono text-xs">
                              {(e.provider as any)?.full_name || "N/A"}
                            </TableCell>
                            <TableCell className="font-mono">{e.client_readable_id}</TableCell>
                            <TableCell className="max-w-xs truncate">{e.escalation_reason || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={{
                                  open: "bg-red-500/10 text-red-600",
                                  acknowledged: "bg-amber-500/10 text-amber-600",
                                  resolved: "bg-green-500/10 text-green-600",
                                }[e.status] || ""}
                              >
                                {e.status === "open" && "Offen"}
                                {e.status === "acknowledged" && "Bestätigt"}
                                {e.status === "resolved" && "Gelöst"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(e.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partners" className="space-y-6">
            <AdminPartnerOverview />
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <AdminEmployeeOverview />
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
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Provider bearbeiten</DialogTitle>
              <DialogDescription>
                {selectedProvider?.full_name} ({selectedProvider?.email})
              </DialogDescription>
            </DialogHeader>

            {selectedProvider && (
              <Tabs defaultValue="subscription" className="w-full flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                  <TabsTrigger value="profile">Profil</TabsTrigger>
                  <TabsTrigger value="subscription">Abo & Plan</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="danger">Sperren</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Business-Daten und Landingpage-Einstellungen.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Firmenname
                      </Label>
                      <Input
                        placeholder="z.B. Hufpflege Mustermann"
                        value={editBusinessName}
                        onChange={(e) => setEditBusinessName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Subdomain (Landingpage)
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">hufmanager.de/p/</span>
                        <Input
                          placeholder="max-mustermann"
                          value={editSubdomain}
                          onChange={(e) => setEditSubdomain(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      {editSubdomain && (
                        <a 
                          href={`/p/${editSubdomain}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Landingpage öffnen →
                        </a>
                      )}
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Hero-Headline</Label>
                      <Input
                        placeholder="z.B. Professionelle Hufpflege in Ihrer Region"
                        value={editHeroHeadline}
                        onChange={(e) => setEditHeroHeadline(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>PLZ</Label>
                      <Input
                        placeholder="12345"
                        value={editZipCode}
                        onChange={(e) => setEditZipCode(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Ort</Label>
                      <Input
                        placeholder="Musterstadt"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Vollständige Adresse
                      </Label>
                      <Input
                        placeholder="Musterstraße 1, 12345 Musterstadt"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefon
                      </Label>
                      <Input
                        placeholder="+49 123 456789"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label>Über-Text (Landingpage)</Label>
                      <textarea
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Beschreibung für die Landingpage..."
                        value={editAboutText}
                        onChange={(e) => setEditAboutText(e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="subscription" className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2">
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

                <TabsContent value="features" className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2">
                  <ProviderFeatureEditor
                    featureStatuses={editFeatureStatuses}
                    onFeatureStatusChange={(key, status) => {
                      setEditFeatureStatuses(prev => ({
                        ...prev,
                        [key]: status,
                      }));
                      // Also sync to legacy flags for backward compatibility
                      setEditFeatureFlags(prev => ({
                        ...prev,
                        [key]: status === 'public' || status === 'beta' || status === 'early_access',
                      }));
                    }}
                    disabled={saving}
                  />
                </TabsContent>

                <TabsContent value="danger" className="space-y-4 mt-4 flex-1 overflow-y-auto pr-2">
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

            <DialogFooter className="mt-4 flex-shrink-0 border-t pt-4">
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

