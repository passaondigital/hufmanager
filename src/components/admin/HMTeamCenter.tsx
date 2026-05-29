import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Shield, Clock, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "developer", label: "Developer" },
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
];

interface StaffMember {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  permissions: Record<string, boolean>;
  is_active: boolean;
  hired_at: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  target_table: string | null;
  details: Record<string, any>;
  created_at: string;
}

export function HMTeamCenter() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: "", email: "", role: "support", department: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: a }, { data: settings }] = await Promise.all([
      supabase.from("hm_staff").select("*").order("created_at", { ascending: false }),
      supabase.from("hm_activity_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("admin_settings").select("key, value").eq("key", "internal_staff_module_enabled").maybeSingle(),
    ]);
    setStaff((s as any[]) || []);
    setActivities((a as any[]) || []);
    setModuleEnabled(settings?.value === true || settings?.value === "true");
    setLoading(false);
  };

  const toggleModule = async (enabled: boolean) => {
    setModuleEnabled(enabled);
    await supabase.from("admin_settings").update({ value: enabled, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "internal_staff_module_enabled");
    toast.success(enabled ? "Team-Modul aktiviert" : "Team-Modul deaktiviert");
  };

  const handleAdd = async () => {
    if (!newStaff.full_name || !newStaff.email) { toast.error("Name und E-Mail erforderlich"); return; }
    const { error } = await supabase.from("hm_staff").insert({
      full_name: newStaff.full_name,
      email: newStaff.email,
      role: newStaff.role,
      department: newStaff.department || null,
      is_active: true,
      hired_at: new Date().toISOString().split("T")[0],
    });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Mitarbeiter hinzugefügt");
    setShowAddDialog(false);
    setNewStaff({ full_name: "", email: "", role: "support", department: "" });
    fetchAll();
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: "bg-amber-500/10 text-amber-600",
      developer: "bg-blue-500/10 text-blue-600",
      support: "bg-green-500/10 text-green-600",
      sales: "bg-purple-500/10 text-purple-600",
      marketing: "bg-pink-500/10 text-pink-600",
      finance: "bg-emerald-500/10 text-emerald-600",
    };
    return <Badge className={colors[role] || ""}>{ROLES.find(r => r.value === role)?.label || role}</Badge>;
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">👥 Hufi Team</h2>
          <p className="text-muted-foreground">Internes Team verwalten</p>
        </div>
        <div className="flex items-center gap-4">
          <ModuleToggle label="Team-Modul" enabled={moduleEnabled} onToggle={toggleModule} />
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Mitarbeiter einladen</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Neuen Mitarbeiter anlegen</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name *</Label><Input value={newStaff.full_name} onChange={e => setNewStaff(p => ({ ...p, full_name: e.target.value }))} /></div>
                <div><Label>E-Mail *</Label><Input value={newStaff.email} onChange={e => setNewStaff(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Rolle</Label>
                  <Select value={newStaff.role} onValueChange={v => setNewStaff(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Abteilung</Label><Input value={newStaff.department} onChange={e => setNewStaff(p => ({ ...p, department: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button onClick={handleAdd}>Anlegen</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="team">
        <TabsList><TabsTrigger value="team">Team</TabsTrigger><TabsTrigger value="permissions">Berechtigungen</TabsTrigger><TabsTrigger value="activity">Aktivitäts-Log</TabsTrigger></TabsList>

        <TabsContent value="team">
          {/* Pascal as Founder */}
          <Card className="mb-4 border-primary/30">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-amber-500/10 rounded-full"><Shield className="w-6 h-6 text-amber-600" /></div>
              <div className="flex-1">
                <p className="font-bold">Pascal Schmid</p>
                <p className="text-sm text-muted-foreground">kontakt@hufiapp.de</p>
              </div>
              <Badge className="bg-amber-500/10 text-amber-600">Founder</Badge>
              <Badge variant="default">Aktiv</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Name</th><th className="p-3">E-Mail</th><th className="p-3">Rolle</th><th className="p-3">Abteilung</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{s.full_name}</td>
                      <td className="p-3 text-center">{s.email}</td>
                      <td className="p-3 text-center">{roleBadge(s.role)}</td>
                      <td className="p-3 text-center">{s.department || "-"}</td>
                      <td className="p-3 text-center"><Badge variant={s.is_active ? "default" : "outline"}>{s.is_active ? "Aktiv" : "Inaktiv"}</Badge></td>
                    </tr>
                  ))}
                  {staff.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Noch keine weiteren Mitarbeiter</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader><CardTitle>Berechtigungs-Matrix</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">Berechtigung</th>
                    {ROLES.map(r => <th key={r.value} className="p-2 text-center text-xs">{r.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {["Provider anzeigen", "Provider bearbeiten", "Billing anzeigen", "Broadcast senden", "Verträge verwalten", "DB-Zugriff"].map(perm => (
                    <tr key={perm} className="border-b">
                      <td className="p-2">{perm}</td>
                      {ROLES.map(r => (
                        <td key={r.value} className="p-2 text-center">
                          {r.value === "super_admin" ? "✅" : r.value === "developer" && perm === "DB-Zugriff" ? "✅" : r.value === "support" && perm === "Provider anzeigen" ? "✅" : "❌"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-4">Granulare Berechtigungen werden nach Aktivierung des Moduls konfigurierbar.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Zeitpunkt</th><th className="p-3">Aktion</th><th className="p-3">Tabelle</th><th className="p-3">Details</th></tr></thead>
                <tbody>
                  {activities.map(a => (
                    <tr key={a.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{new Date(a.created_at).toLocaleString("de-DE")}</td>
                      <td className="p-3">{a.action}</td>
                      <td className="p-3">{a.target_table || "-"}</td>
                      <td className="p-3 text-xs font-mono max-w-xs truncate">{JSON.stringify(a.details)}</td>
                    </tr>
                  ))}
                  {activities.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Noch keine Aktivitäten protokolliert</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModuleToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <span className="text-sm font-medium">{label}:</span>
      {!enabled ? (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogTrigger asChild><Button size="sm" variant="outline">Aktivieren</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Modul aktivieren?</AlertDialogTitle><AlertDialogDescription>Internes Team-Management wird aktiviert.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={() => onToggle(true)}>Ja, aktivieren</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button size="sm" variant="destructive" onClick={() => onToggle(false)}>Deaktivieren</Button>
      )}
      <Badge variant={enabled ? "default" : "outline"}>{enabled ? "AN" : "AUS"}</Badge>
    </div>
  );
}
