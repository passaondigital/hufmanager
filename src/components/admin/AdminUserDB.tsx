import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PLAN_FEATURE_MAP } from "@/lib/plan-features";
import { ProviderDetailPanel } from "@/components/admin/ProviderDetailPanel";
import { RepairUserDialog } from "@/components/admin/RepairUserDialog";
import { 
  Search, 
  RefreshCw, 
  Ban, 
  CheckCircle, 
  Crown,
  Loader2,
  UserCog,
  Trash2,
  Copy,
  MapPin,
  Calendar,
  Clock,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface UserData {
  id: string;
  email: string | null;
  full_name: string | null;
  readable_id: string | null;
  role: "provider" | "client" | "admin" | "employee" | "partner";
  subscription_status: string | null;
  subscription_plan: string | null;
  plan_override: string | null;
  is_suspended: boolean | null;
  suspended_reason: string | null;
  created_at: string;
  created_by_provider_id: string | null;
  zip_code: string | null;
  city: string | null;
  horse_count: number;
  customer_count: number;
  has_logged_in: boolean | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  provider_name?: string | null;
}

interface AdminUserDBProps {
  isMasterAdmin: boolean;
}

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter (9,90€)" },
  { value: "pro", label: "Pro (29€)" },
  { value: "duo", label: "Duo (49€)" },
  { value: "team", label: "Team (79€)" },
  { value: "lifetime_grant", label: "Lifetime (Goldesel)" },
  { value: "manual_cash_1y", label: "Barzahlung (1 Jahr)" },
  { value: "beta_tester", label: "Beta Tester" },
  { value: "employee", label: "Employee" },
];

type RoleTab = "provider" | "client" | "partner" | "employee";

export function AdminUserDB({ isMasterAdmin }: AdminUserDBProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RoleTab>("provider");
  const [specialFilter, setSpecialFilter] = useState<"all" | "never_logged_in" | "email_unconfirmed" | "no_data">("all");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  
  const [editPlan, setEditPlan] = useState("starter");
  const [editAccessValidUntil, setEditAccessValidUntil] = useState("");
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const { data: horses } = await supabase
        .from("horses")
        .select("owner_id")
        .is("deleted_at", null);

      const { data: grants } = await supabase
        .from("access_grants")
        .select("provider_id, client_id")
        .eq("is_active", true);

      const { data: authMeta } = await supabase.rpc("get_admin_auth_metadata");

      // Build lookup maps
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const horseCountMap = new Map<string, number>();
      horses?.forEach(h => {
        horseCountMap.set(h.owner_id, (horseCountMap.get(h.owner_id) || 0) + 1);
      });
      const customerCountMap = new Map<string, number>();
      grants?.forEach(g => {
        customerCountMap.set(g.provider_id, (customerCountMap.get(g.provider_id) || 0) + 1);
      });
      const authMetaMap = new Map<string, { last_sign_in_at: string | null; email_confirmed_at: string | null }>();
      (authMeta || []).forEach((m: any) => {
        authMetaMap.set(m.user_id, { last_sign_in_at: m.last_sign_in_at, email_confirmed_at: m.email_confirmed_at });
      });

      // Build client→provider map from access_grants
      const clientProviderIdMap = new Map<string, string>();
      grants?.forEach(g => {
        if (!clientProviderIdMap.has(g.client_id)) {
          clientProviderIdMap.set(g.client_id, g.provider_id);
        }
      });

      // Build profile name map for provider lookups
      const profileNameMap = new Map<string, string>();
      profiles?.forEach(p => {
        if (p.full_name) profileNameMap.set(p.id, p.full_name);
      });

      const usersWithData: UserData[] = (profiles || []).map(profile => {
        const meta = authMetaMap.get(profile.id);
        const role = roleMap.get(profile.id) || "client";
        
        // Determine associated provider name
        let providerName: string | null = null;
        if (role === "client") {
          const providerId = clientProviderIdMap.get(profile.id) || profile.created_by_provider_id;
          if (providerId) providerName = profileNameMap.get(providerId) || providerId.slice(0, 8);
        } else if (role === "employee") {
          const providerId = profile.created_by_provider_id;
          if (providerId) providerName = profileNameMap.get(providerId) || providerId.slice(0, 8);
        }

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          readable_id: profile.readable_id,
          role,
          subscription_status: profile.subscription_status,
          subscription_plan: profile.subscription_plan,
          plan_override: profile.plan_override,
          is_suspended: profile.is_suspended,
          suspended_reason: profile.suspended_reason,
          created_at: profile.created_at,
          created_by_provider_id: profile.created_by_provider_id,
          zip_code: profile.zip_code,
          city: profile.city,
          horse_count: horseCountMap.get(profile.id) || 0,
          customer_count: customerCountMap.get(profile.id) || 0,
          has_logged_in: profile.has_logged_in,
          last_sign_in_at: meta?.last_sign_in_at || null,
          email_confirmed_at: meta?.email_confirmed_at || null,
          provider_name: providerName,
        };
      });

      setUsers(usersWithData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Fehler beim Laden der Benutzer");
    } finally {
      setLoading(false);
    }
  };

  // Global search matches across ALL roles
  const globalSearchResults = useMemo(() => {
    if (!globalSearch || globalSearch.length < 2) return null;
    const s = globalSearch.toLowerCase();
    return users.filter(u =>
      u.email?.toLowerCase().includes(s) ||
      u.full_name?.toLowerCase().includes(s) ||
      u.readable_id?.toLowerCase().includes(s) ||
      u.id.includes(globalSearch)
    ).slice(0, 30);
  }, [users, globalSearch]);

  // Tab-filtered users
  const tabUsers = useMemo(() => {
    let filtered = users.filter(u => u.role === activeTab);
    
    if (specialFilter === "never_logged_in") {
      filtered = filtered.filter(u => !u.last_sign_in_at && !u.has_logged_in);
    } else if (specialFilter === "email_unconfirmed") {
      filtered = filtered.filter(u => !u.email_confirmed_at);
    } else if (specialFilter === "no_data") {
      filtered = filtered.filter(u => u.horse_count === 0 && u.customer_count === 0);
    }

    return filtered;
  }, [users, activeTab, specialFilter]);

  const roleCounts = useMemo(() => ({
    provider: users.filter(u => u.role === "provider").length,
    client: users.filter(u => u.role === "client").length,
    partner: users.filter(u => u.role === "partner").length,
    employee: users.filter(u => u.role === "employee").length,
  }), [users]);

  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setEditPlan(user.plan_override || user.subscription_plan || "starter");
    fetchUserAccessDate(user.id);
    setEditDialogOpen(true);
  };

  const fetchUserAccessDate = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("access_valid_until")
      .eq("id", userId)
      .single();
    setEditAccessValidUntil(data?.access_valid_until ? format(new Date(data.access_valid_until), "yyyy-MM-dd") : "");
  };

  const handleForcePlan = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const corePlans = ["starter", "pro", "duo", "team"];
      const isCorePlan = corePlans.includes(editPlan);
      const updateData: Record<string, any> = {
        plan_override: editPlan === "starter" ? null : editPlan,
        subscription_plan: isCorePlan ? editPlan : "pro",
        subscription_status: editPlan === "starter" ? "trialing" : "active",
      };

      if (editAccessValidUntil) {
        updateData.access_valid_until = new Date(editAccessValidUntil).toISOString();
      } else if (editPlan === "lifetime_grant" || editPlan === "employee") {
        updateData.access_valid_until = "2099-12-31T00:00:00.000Z";
      } else if (editPlan === "manual_cash_1y") {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        updateData.access_valid_until = oneYearFromNow.toISOString();
      }

      const featurePlan = isCorePlan ? editPlan : (["lifetime_grant", "employee"].includes(editPlan) ? "team" : "pro");
      const featureMap = PLAN_FEATURE_MAP[featurePlan];
      if (featureMap) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("feature_statuses")
          .eq("id", selectedUser.id)
          .single();
        const existing = (currentProfile?.feature_statuses as Record<string, string>) || {};
        updateData.feature_statuses = { ...existing, ...featureMap };
      }

      const { error } = await supabase.from("profiles").update(updateData).eq("id", selectedUser.id);
      if (error) throw error;
      
      const planLabel = PLAN_OPTIONS.find(p => p.value === editPlan)?.label || editPlan;
      toast.success(`Plan für ${selectedUser.full_name || selectedUser.email} auf "${planLabel}" geändert`);
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Ändern des Plans");
    } finally {
      setSaving(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_reason: banReason || "Gesperrt durch Admin",
      }).eq("id", selectedUser.id);
      if (error) throw error;
      toast.success(`${selectedUser.full_name || selectedUser.email} wurde gesperrt`);
      setBanDialogOpen(false);
      setBanReason("");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Sperren");
    } finally {
      setSaving(false);
    }
  };

  const handleUnbanUser = async (user: UserData) => {
    try {
      const { error } = await supabase.from("profiles").update({
        is_suspended: false, suspended_at: null, suspended_reason: null,
      }).eq("id", user.id);
      if (error) throw error;
      toast.success(`${user.full_name || user.email} wurde entsperrt`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Entsperren");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: selectedUser.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${selectedUser.full_name || selectedUser.email} wurde gelöscht`);
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Löschen");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("In Zwischenablage kopiert");
  };

  const getStatusBadge = (user: UserData) => {
    if (user.is_suspended) return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Gesperrt</Badge>;
    if (user.plan_override === "lifetime_grant") return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black"><Crown className="w-3 h-3 mr-1" />Lifetime</Badge>;
    if (user.subscription_status === "active") return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Aktiv</Badge>;
    return <Badge variant="outline">{user.subscription_status || "Inaktiv"}</Badge>;
  };

  const renderUserIdCell = (user: UserData) => (
    <div className="flex items-center gap-1">
      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
        {user.readable_id || user.id.slice(0, 8)}
      </code>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(user.id)}>
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  );

  const renderNameCell = (user: UserData) => (
    <div>
      <p className="font-medium">{user.full_name || "—"}</p>
      <p className="text-xs text-muted-foreground">{user.email}</p>
    </div>
  );

  const renderDateCell = (user: UserData) => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Calendar className="w-3 h-3" />
      {format(new Date(user.created_at), "dd.MM.yy HH:mm", { locale: de })}
    </div>
  );

  const renderLoginCell = (user: UserData) => (
    user.last_sign_in_at ? (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="w-3 h-3" />
        {format(new Date(user.last_sign_in_at), "dd.MM.yy HH:mm", { locale: de })}
      </div>
    ) : (
      <Badge variant="outline" className="text-orange-500 border-orange-500/30">Nie</Badge>
    )
  );

  const renderBanActions = (user: UserData) => (
    user.is_suspended ? (
      <Button variant="outline" size="sm" onClick={() => handleUnbanUser(user)}>
        <CheckCircle className="w-4 h-4 mr-1" />Entsperren
      </Button>
    ) : (
      <Button variant="outline" size="sm" onClick={() => { setSelectedUser(user); setBanDialogOpen(true); }}>
        <Ban className="w-4 h-4 mr-1" />Ban
      </Button>
    )
  );

  const renderRepairButton = (user: UserData) => (
    <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setRepairDialogOpen(true); }} title="Nutzer reparieren">
      <Wrench className="w-4 h-4" />
    </Button>
  );

  const renderProviderTable = (data: UserData[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>ID</TableHead>
          <TableHead>Name / E-Mail</TableHead>
          <TableHead>Standort</TableHead>
          <TableHead>Kunden</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Erstellt</TableHead>
          <TableHead>Letzter Login</TableHead>
          <TableHead>E-Mail ✓</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(user => (
          <>
            <TableRow key={user.id} className="group">
              <TableCell className="px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setExpandedProviderId(prev => prev === user.id ? null : user.id)}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedProviderId === user.id ? "rotate-180" : ""}`} />
                </Button>
              </TableCell>
              <TableCell>{renderUserIdCell(user)}</TableCell>
              <TableCell>{renderNameCell(user)}</TableCell>
              <TableCell>
                {user.zip_code || user.city ? (
                  <div className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3 text-muted-foreground" />{user.zip_code} {user.city}</div>
                ) : "—"}
              </TableCell>
              <TableCell className="text-center">{user.customer_count}</TableCell>
              <TableCell>{getStatusBadge(user)}</TableCell>
              <TableCell>{renderDateCell(user)}</TableCell>
              <TableCell>{renderLoginCell(user)}</TableCell>
              <TableCell>{user.email_confirmed_at ? <span className="text-emerald-500 text-sm">✓</span> : <Badge variant="outline" className="text-red-500 border-red-500/30">Nein</Badge>}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                    <UserCog className="w-4 h-4 mr-1" />Plan
                  </Button>
                  {renderBanActions(user)}
                  {renderRepairButton(user)}
                  {isMasterAdmin && (
                    <Button variant="destructive" size="sm" onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
            {expandedProviderId === user.id && (
              <TableRow key={`${user.id}-detail`}>
                <TableCell colSpan={10} className="p-0">
                  <ProviderDetailPanel providerId={user.id} providerEmail={user.email} />
                </TableCell>
              </TableRow>
            )}
          </>
        ))}
        {data.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Keine Benutzer gefunden</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  const renderClientTable = (data: UserData[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name / E-Mail</TableHead>
          <TableHead>Zugehöriger Provider</TableHead>
          <TableHead>Pferde</TableHead>
          <TableHead>Erstellt</TableHead>
          <TableHead>Letzter Login</TableHead>
          <TableHead>E-Mail ✓</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(user => (
          <TableRow key={user.id} className="group">
            <TableCell>{renderUserIdCell(user)}</TableCell>
            <TableCell>{renderNameCell(user)}</TableCell>
            <TableCell>
              {user.provider_name ? (
                <span className="text-sm">{user.provider_name}</span>
              ) : <span className="text-muted-foreground text-sm">—</span>}
            </TableCell>
            <TableCell className="text-center">{user.horse_count}</TableCell>
            <TableCell>{renderDateCell(user)}</TableCell>
            <TableCell>{renderLoginCell(user)}</TableCell>
            <TableCell>{user.email_confirmed_at ? <span className="text-emerald-500 text-sm">✓</span> : <Badge variant="outline" className="text-red-500 border-red-500/30">Nein</Badge>}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                {renderBanActions(user)}
                {renderRepairButton(user)}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {data.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Keine Kunden gefunden</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  const renderPartnerTable = (data: UserData[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name / E-Mail</TableHead>
          <TableHead>Standort</TableHead>
          <TableHead>Erstellt</TableHead>
          <TableHead>Letzter Login</TableHead>
          <TableHead>E-Mail ✓</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(user => (
          <TableRow key={user.id} className="group">
            <TableCell>{renderUserIdCell(user)}</TableCell>
            <TableCell>{renderNameCell(user)}</TableCell>
            <TableCell>
              {user.zip_code || user.city ? (
                <div className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3 text-muted-foreground" />{user.zip_code} {user.city}</div>
              ) : "—"}
            </TableCell>
            <TableCell>{renderDateCell(user)}</TableCell>
            <TableCell>{renderLoginCell(user)}</TableCell>
            <TableCell>{user.email_confirmed_at ? <span className="text-emerald-500 text-sm">✓</span> : <Badge variant="outline" className="text-red-500 border-red-500/30">Nein</Badge>}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                {renderBanActions(user)}
                {renderRepairButton(user)}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {data.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Partner gefunden</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  const renderEmployeeTable = (data: UserData[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name / E-Mail</TableHead>
          <TableHead>Zugehöriger Provider</TableHead>
          <TableHead>Erstellt</TableHead>
          <TableHead>Letzter Login</TableHead>
          <TableHead>E-Mail ✓</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(user => (
          <TableRow key={user.id} className="group">
            <TableCell>{renderUserIdCell(user)}</TableCell>
            <TableCell>{renderNameCell(user)}</TableCell>
            <TableCell>
              {user.provider_name ? (
                <span className="text-sm">{user.provider_name}</span>
              ) : <span className="text-muted-foreground text-sm">—</span>}
            </TableCell>
            <TableCell>{renderDateCell(user)}</TableCell>
            <TableCell>{renderLoginCell(user)}</TableCell>
            <TableCell>{user.email_confirmed_at ? <span className="text-emerald-500 text-sm">✓</span> : <Badge variant="outline" className="text-red-500 border-red-500/30">Nein</Badge>}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                {renderRepairButton(user)}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {data.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Mitarbeiter gefunden</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  const renderGlobalSearchTable = (data: UserData[]) => (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b bg-muted/30">
          <p className="text-sm font-medium">{data.length} Treffer über alle Rollen</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name / E-Mail</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Letzter Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(user => (
                <TableRow key={user.id} className="group cursor-pointer" onClick={() => { setActiveTab(user.role as RoleTab); setGlobalSearch(""); }}>
                  <TableCell>{renderUserIdCell(user)}</TableCell>
                  <TableCell>{renderNameCell(user)}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "provider" ? "default" : user.role === "admin" ? "destructive" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{renderDateCell(user)}</TableCell>
                  <TableCell>{renderLoginCell(user)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User-DB</h2>
          <p className="text-muted-foreground">{users.length} Benutzer gesamt</p>
        </div>
        <Button variant="outline" onClick={fetchUsers} size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Global Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Globale Suche nach Name, E-Mail, ID (über alle Rollen)..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Global search results overlay */}
      {globalSearchResults && globalSearchResults.length > 0 && (
        renderGlobalSearchTable(globalSearchResults)
      )}
      {globalSearchResults && globalSearchResults.length === 0 && (
        <Card><CardContent className="py-6 text-center text-muted-foreground">Keine Treffer für „{globalSearch}"</CardContent></Card>
      )}

      {/* Role Tabs (hidden when global search active) */}
      {!globalSearchResults && (
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as RoleTab); setSpecialFilter("all"); }}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="provider">Provider ({roleCounts.provider})</TabsTrigger>
              <TabsTrigger value="client">Kunden ({roleCounts.client})</TabsTrigger>
              <TabsTrigger value="partner">Partner ({roleCounts.partner})</TabsTrigger>
              <TabsTrigger value="employee">Mitarbeiter ({roleCounts.employee})</TabsTrigger>
            </TabsList>
            <Select value={specialFilter} onValueChange={(v) => setSpecialFilter(v as typeof specialFilter)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Spezialfilter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kein Spezialfilter</SelectItem>
                <SelectItem value="never_logged_in">🚫 Nie eingeloggt</SelectItem>
                <SelectItem value="email_unconfirmed">📧 E-Mail nicht bestätigt</SelectItem>
                <SelectItem value="no_data">📭 Keine Pferde & Kunden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="provider">
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <p className="text-sm text-muted-foreground">{tabUsers.length} Provider angezeigt</p>
                </div>
                <div className="overflow-x-auto">{renderProviderTable(tabUsers)}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="client">
            {/* Datenschutz-Banner */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-orange-500/30 bg-orange-500/5 mb-4">
              <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-500">Nur für Support – Datenschutz beachten</p>
                <p className="text-xs text-muted-foreground">Kundendaten sind schreibgeschützt und dürfen nur bei Support-Anfragen eingesehen werden.</p>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <p className="text-sm text-muted-foreground">{tabUsers.length} Kunden angezeigt</p>
                </div>
                <div className="overflow-x-auto">{renderClientTable(tabUsers)}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partner">
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <p className="text-sm text-muted-foreground">{tabUsers.length} Partner angezeigt</p>
                </div>
                <div className="overflow-x-auto">{renderPartnerTable(tabUsers)}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employee">
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <p className="text-sm text-muted-foreground">{tabUsers.length} Mitarbeiter angezeigt</p>
                </div>
                <div className="overflow-x-auto">{renderEmployeeTable(tabUsers)}</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Force Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription verwalten</DialogTitle>
            <DialogDescription>
              Ändere Plan und Zugriffsdauer für {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan Override</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Override überschreibt Copecart-Subscription</p>
            </div>
            <div className="space-y-2">
              <Label>Zugriff gültig bis</Label>
              <Input type="date" value={editAccessValidUntil} onChange={(e) => setEditAccessValidUntil(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {editPlan === "lifetime_grant" || editPlan === "employee" 
                  ? "Wird automatisch auf 2099 gesetzt wenn leer"
                  : editPlan === "manual_cash_1y"
                  ? "Wird automatisch auf +1 Jahr gesetzt wenn leer"
                  : "Datum bis wann der Zugriff gültig ist"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aktueller Plan:</span>
                <span className="font-medium">{selectedUser?.subscription_plan || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aktueller Override:</span>
                <span className="font-medium">{selectedUser?.plan_override || "—"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleForcePlan} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer sperren</DialogTitle>
            <DialogDescription>Sperre {selectedUser?.full_name || selectedUser?.email} vom System</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Grund (optional)</Label>
              <Textarea placeholder="Warum wird dieser Benutzer gesperrt?" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Sperren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer endgültig löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies löscht {selectedUser?.full_name || selectedUser?.email} permanent aus dem System. Diese Aktion kann nicht rückgängig gemacht werden!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Repair User Dialog */}
      <RepairUserDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
