import { useState, useEffect } from "react";
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
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
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
  role?: string;
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

export default function MissionControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // New user form
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");

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
      fetchUsers();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    if (!user) {
      // Redirect to auth with redirect parameter to come back here after login
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles (admin RLS allows this)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Merge roles with profiles
      const usersWithRoles = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "unknown",
          feature_flags: profile.feature_flags as UserProfile["feature_flags"],
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Fehler beim Laden der Benutzer");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserFirstName || !newUserLastName) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newUserEmail,
          firstName: newUserFirstName,
          lastName: newUserLastName,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Benutzer ${newUserEmail} wurde erstellt. Eine Einladungs-E-Mail wurde gesendet.`);
      setCreateDialogOpen(false);
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Fehler beim Erstellen des Benutzers");
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setEditPlanOverride(userProfile.plan_override || "standard");
    setEditAccessValidUntil(
      userProfile.access_valid_until
        ? format(new Date(userProfile.access_valid_until), "yyyy-MM-dd")
        : ""
    );
    setEditFeatureFlags({
      ...DEFAULT_FEATURE_FLAGS,
      ...(userProfile.feature_flags || {}),
    });
    setSuspendReason(userProfile.suspended_reason || "");
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

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
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("Benutzer wurde aktualisiert");
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(error.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_reason: suspendReason || "Manuell gesperrt",
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("Account wurde gesperrt");
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error suspending user:", error);
      toast.error(error.message || "Fehler beim Sperren");
    } finally {
      setSaving(false);
    }
  };

  const handleUnsuspendUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_reason: null,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("Account wurde entsperrt");
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error unsuspending user:", error);
      toast.error(error.message || "Fehler beim Entsperren");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.id.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (userProfile: UserProfile) => {
    if (userProfile.is_suspended) {
      return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Gesperrt</Badge>;
    }
    if (userProfile.plan_override === "lifetime_grant") {
      return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black"><Crown className="w-3 h-3 mr-1" />Lifetime</Badge>;
    }
    if (userProfile.plan_override === "employee") {
      return <Badge variant="secondary"><Shield className="w-3 h-3 mr-1" />Employee</Badge>;
    }
    if (userProfile.access_valid_until) {
      const validUntil = new Date(userProfile.access_valid_until);
      const isExpired = validUntil < new Date();
      return (
        <Badge variant={isExpired ? "destructive" : "default"}>
          <Clock className="w-3 h-3 mr-1" />
          {isExpired ? "Abgelaufen" : format(validUntil, "dd.MM.yyyy")}
        </Badge>
      );
    }
    if (userProfile.subscription_status === "active") {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Aktiv</Badge>;
    }
    return <Badge variant="outline">{userProfile.subscription_status || "Kein Abo"}</Badge>;
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
              Admin-Dashboard für User-Management
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Zurück
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Benutzer
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <Settings className="w-4 h-4" />
              Statistiken
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen nach Name, E-Mail oder ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchUsers} size="icon">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Neuen Provider anlegen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Neuen Provider anlegen</DialogTitle>
                      <DialogDescription>
                        Erstelle manuell einen neuen Provider-Account. Der Benutzer erhält eine Einladungs-E-Mail.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-Mail</Label>
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
                          <Label htmlFor="firstName">Vorname</Label>
                          <Input
                            id="firstName"
                            placeholder="Max"
                            value={newUserFirstName}
                            onChange={(e) => setNewUserFirstName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Nachname</Label>
                          <Input
                            id="lastName"
                            placeholder="Mustermann"
                            value={newUserLastName}
                            onChange={(e) => setNewUserLastName(e.target.value)}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Der Account wird mit <code>is_manually_managed = true</code> markiert.
                      </p>
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
              </div>
            </div>

            {/* User Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benutzer</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userProfile) => (
                      <TableRow key={userProfile.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{userProfile.full_name || "—"}</p>
                            <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                            {userProfile.is_manually_managed && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Manuell verwaltet
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={userProfile.role === "admin" ? "default" : "secondary"}>
                            {userProfile.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(userProfile)}</TableCell>
                        <TableCell>
                          <span className="capitalize">
                            {userProfile.plan_override || userProfile.subscription_plan || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(userProfile.created_at), "dd.MM.yyyy", { locale: de })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(userProfile)}
                          >
                            Bearbeiten
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Keine Benutzer gefunden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gesamt Benutzer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{users.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Provider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {users.filter((u) => u.role === "provider").length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Manuell verwaltet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {users.filter((u) => u.is_manually_managed).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gesperrt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-destructive">
                    {users.filter((u) => u.is_suspended).length}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Benutzer bearbeiten</DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name} ({selectedUser?.email})
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
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
                    Steuere, welche Module dieser Benutzer sieht und nutzen kann.
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
                  {selectedUser.is_suspended ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                          <Ban className="w-5 h-5" />
                          <span className="font-semibold">Account ist gesperrt</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Gesperrt am:{" "}
                          {selectedUser.suspended_at
                            ? format(new Date(selectedUser.suspended_at), "dd.MM.yyyy HH:mm", {
                                locale: de,
                              })
                            : "Unbekannt"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Grund: {selectedUser.suspended_reason || "Kein Grund angegeben"}
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
                          Ein gesperrter Account kann sich nicht mehr einloggen und hat keinen
                          Zugriff auf die App.
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
                              {selectedUser.full_name} ({selectedUser.email}) wird sofort gesperrt
                              und kann sich nicht mehr einloggen.
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
