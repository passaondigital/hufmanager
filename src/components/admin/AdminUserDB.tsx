import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  Search, 
  RefreshCw, 
  Ban, 
  CheckCircle, 
  Crown,
  Loader2,
  Eye,
  UserCog,
  Trash2,
  Copy,
  MapPin,
  Calendar,
  Clock
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

export function AdminUserDB({ isMasterAdmin }: AdminUserDBProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "provider" | "client" | "admin">("all");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form
  const [editPlan, setEditPlan] = useState("starter");
  const [editAccessValidUntil, setEditAccessValidUntil] = useState("");
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Fetch horse counts per owner
      const { data: horses, error: horsesError } = await supabase
        .from("horses")
        .select("owner_id")
        .is("deleted_at", null);

      if (horsesError) console.warn("Could not fetch horses:", horsesError);

      // Build lookup maps
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const horseCountMap = new Map<string, number>();
      horses?.forEach(h => {
        horseCountMap.set(h.owner_id, (horseCountMap.get(h.owner_id) || 0) + 1);
      });

      // Merge data
      const usersWithData: UserData[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        readable_id: profile.readable_id,
        role: roleMap.get(profile.id) || "client",
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
      }));

      setUsers(usersWithData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Fehler beim Laden der Benutzer");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchTerm || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.readable_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.includes(searchTerm);
      
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setEditPlan(user.plan_override || user.subscription_plan || "starter");
    // Get access_valid_until from full profile
    fetchUserAccessDate(user.id);
    setEditDialogOpen(true);
  };

  const fetchUserAccessDate = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("access_valid_until")
      .eq("id", userId)
      .single();
    
    if (data?.access_valid_until) {
      setEditAccessValidUntil(format(new Date(data.access_valid_until), "yyyy-MM-dd"));
    } else {
      setEditAccessValidUntil("");
    }
  };

  const handleForcePlan = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      // Map plan selection to subscription_plan (core tiers)
      const corePlans = ["starter", "pro", "duo", "team"];
      const isCorePlan = corePlans.includes(editPlan);
      const updateData: Record<string, any> = {
        plan_override: editPlan === "starter" ? null : editPlan,
        subscription_plan: isCorePlan ? editPlan : "pro",
        subscription_status: editPlan === "starter" ? "trialing" : "active",
      };

      // Set access_valid_until
      if (editAccessValidUntil) {
        updateData.access_valid_until = new Date(editAccessValidUntil).toISOString();
      } else if (editPlan === "lifetime_grant" || editPlan === "employee") {
        updateData.access_valid_until = "2099-12-31T00:00:00.000Z";
      } else if (editPlan === "manual_cash_1y") {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        updateData.access_valid_until = oneYearFromNow.toISOString();
      }

      // Auto-provision feature_statuses from PLAN_FEATURE_MAP
      const featurePlan = isCorePlan ? editPlan : (["lifetime_grant", "employee"].includes(editPlan) ? "team" : "pro");
      const featureMap = PLAN_FEATURE_MAP[featurePlan];
      if (featureMap) {
        // Merge with existing feature_statuses (preserve any custom overrides not in the map)
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("feature_statuses")
          .eq("id", selectedUser.id)
          .single();
        
        const existing = (currentProfile?.feature_statuses as Record<string, string>) || {};
        updateData.feature_statuses = { ...existing, ...featureMap };
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", selectedUser.id);

      if (error) throw error;
      
      const planLabel = PLAN_OPTIONS.find(p => p.value === editPlan)?.label || editPlan;
      toast.success(`Plan für ${selectedUser.full_name || selectedUser.email} auf "${planLabel}" geändert (Features provisioniert)`);
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
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_reason: banReason || "Gesperrt durch Admin",
        })
        .eq("id", selectedUser.id);

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
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_reason: null,
        })
        .eq("id", user.id);

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

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      admin: { label: "Admin", variant: "destructive" },
      provider: { label: "Provider", variant: "default" },
      client: { label: "Client", variant: "secondary" },
    };
    const c = config[role] || { label: role, variant: "outline" };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getStatusBadge = (user: UserData) => {
    if (user.is_suspended) {
      return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Gesperrt</Badge>;
    }
    if (user.plan_override === "lifetime_grant") {
      return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black"><Crown className="w-3 h-3 mr-1" />Lifetime</Badge>;
    }
    if (user.subscription_status === "active") {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Aktiv</Badge>;
    }
    return <Badge variant="outline">{user.subscription_status || "Inaktiv"}</Badge>;
  };

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
          <p className="text-muted-foreground">
            {users.length} Benutzer gesamt • {filteredUsers.length} angezeigt
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers} size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Name, E-Mail, ID, UUID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Alle Rollen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Rollen</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="provider">Provider</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name / E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead>Pferde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {user.readable_id || user.id.slice(0, 8)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => copyToClipboard(user.id)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.zip_code || user.city ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>{user.zip_code} {user.city}</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">{user.horse_count}</TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(user.created_at), "dd.MM.yy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <UserCog className="w-4 h-4 mr-1" />
                          Plan
                        </Button>
                        {user.is_suspended ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnbanUser(user)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Entsperren
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setBanDialogOpen(true);
                            }}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Ban
                          </Button>
                        )}
                        {isMasterAdmin && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Keine Benutzer gefunden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Override überschreibt Copecart-Subscription
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Zugriff gültig bis</Label>
              <Input
                type="date"
                value={editAccessValidUntil}
                onChange={(e) => setEditAccessValidUntil(e.target.value)}
              />
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
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer sperren</DialogTitle>
            <DialogDescription>
              Sperre {selectedUser?.full_name || selectedUser?.email} vom System
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Grund (optional)</Label>
              <Textarea
                placeholder="Warum wird dieser Benutzer gesperrt?"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sperren
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
              Dies löscht {selectedUser?.full_name || selectedUser?.email} permanent aus dem System.
              Diese Aktion kann nicht rückgängig gemacht werden!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
