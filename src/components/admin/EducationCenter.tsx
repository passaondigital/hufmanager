import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, GraduationCap, School, Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EducationSchool {
  id: string;
  school_name: string;
  slug: string | null;
  description: string | null;
  website: string | null;
  region: string | null;
  status: string;
  verified: boolean;
  created_at: string;
}

interface Certification {
  id: string;
  provider_id: string;
  certificate_title: string;
  issuer_name: string | null;
  issued_at: string | null;
  valid_until: string | null;
  verified: boolean;
  is_public: boolean;
  created_at: string;
}

export function EducationCenter() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<EducationSchool[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSchool, setNewSchool] = useState({ school_name: "", region: "", website: "", description: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }, { data: settings }] = await Promise.all([
      supabase.from("education_schools").select("*").order("created_at", { ascending: false }),
      supabase.from("provider_certifications").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_settings").select("key, value").eq("key", "education_module_enabled").maybeSingle(),
    ]);
    setSchools((s as any[]) || []);
    setCertifications((c as any[]) || []);
    setModuleEnabled(settings?.value === true || settings?.value === "true");
    setLoading(false);
  };

  const toggleModule = async (enabled: boolean) => {
    setModuleEnabled(enabled);
    await supabase.from("admin_settings").update({ value: enabled, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "education_module_enabled");
    toast.success(enabled ? "Hufschulen-Modul aktiviert" : "Hufschulen-Modul deaktiviert");
  };

  const handleAdd = async () => {
    if (!newSchool.school_name) { toast.error("Schulname erforderlich"); return; }
    const slug = newSchool.school_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("education_schools").insert({
      school_name: newSchool.school_name,
      slug,
      region: newSchool.region || null,
      website: newSchool.website || null,
      description: newSchool.description || null,
      status: "pending",
      owner_id: user?.id,
    });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Schule registriert");
    setShowAddDialog(false);
    setNewSchool({ school_name: "", region: "", website: "", description: "" });
    fetchAll();
  };

  const verifySchool = async (id: string) => {
    await supabase.from("education_schools").update({ verified: true, verified_at: new Date().toISOString(), status: "active" }).eq("id", id);
    toast.success("Schule verifiziert");
    fetchAll();
  };

  const verifyCert = async (id: string) => {
    await supabase.from("provider_certifications").update({ verified: true }).eq("id", id);
    toast.success("Zertifikat verifiziert");
    fetchAll();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🎓 Hufschulen & Ausbildung</h2>
          <p className="text-muted-foreground">Schulen, Kurse & Zertifikate verwalten</p>
        </div>
        <div className="flex items-center gap-4">
          <ModuleToggle label="Hufschulen-Modul" enabled={moduleEnabled} onToggle={toggleModule} />
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Schule registrieren</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Neue Hufschule registrieren</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Schulname *</Label><Input value={newSchool.school_name} onChange={e => setNewSchool(p => ({ ...p, school_name: e.target.value }))} /></div>
                <div><Label>Region</Label><Input value={newSchool.region} onChange={e => setNewSchool(p => ({ ...p, region: e.target.value }))} placeholder="z.B. Bayern, NRW, Österreich" /></div>
                <div><Label>Website</Label><Input value={newSchool.website} onChange={e => setNewSchool(p => ({ ...p, website: e.target.value }))} /></div>
                <div><Label>Beschreibung</Label><Textarea value={newSchool.description} onChange={e => setNewSchool(p => ({ ...p, description: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button onClick={handleAdd}>Registrieren</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><School className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{schools.length}</p><p className="text-sm text-muted-foreground">Registrierte Schulen</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><GraduationCap className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">0</p><p className="text-sm text-muted-foreground">Kurse insgesamt</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Award className="w-8 h-8 mx-auto mb-2 text-primary" /><p className="text-3xl font-bold">{certifications.length}</p><p className="text-sm text-muted-foreground">Zertifikate</p></CardContent></Card>
      </div>

      <Tabs defaultValue="schools">
        <TabsList><TabsTrigger value="schools">Schulen</TabsTrigger><TabsTrigger value="certifications">Zertifikate</TabsTrigger></TabsList>

        <TabsContent value="schools">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Schulname</th><th className="p-3">Region</th><th className="p-3">Status</th><th className="p-3">Verifiziert</th><th className="p-3">Aktionen</th></tr></thead>
                <tbody>
                  {schools.map(s => (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{s.school_name}</td>
                      <td className="p-3 text-center">{s.region || "-"}</td>
                      <td className="p-3 text-center"><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></td>
                      <td className="p-3 text-center">{s.verified ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> : "❌"}</td>
                      <td className="p-3 text-center">
                        {!s.verified && <Button size="sm" variant="outline" onClick={() => verifySchool(s.id)}>Verifizieren</Button>}
                      </td>
                    </tr>
                  ))}
                  {schools.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Noch keine Schulen registriert</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certifications">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Zertifikat</th><th className="p-3">Aussteller</th><th className="p-3">Ausgestellt</th><th className="p-3">Gültig bis</th><th className="p-3">Verifiziert</th><th className="p-3">Aktionen</th></tr></thead>
                <tbody>
                  {certifications.map(c => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{c.certificate_title}</td>
                      <td className="p-3 text-center">{c.issuer_name || "-"}</td>
                      <td className="p-3 text-center">{c.issued_at ? new Date(c.issued_at).toLocaleDateString("de-DE") : "-"}</td>
                      <td className="p-3 text-center">{c.valid_until ? new Date(c.valid_until).toLocaleDateString("de-DE") : "∞"}</td>
                      <td className="p-3 text-center">{c.verified ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> : "❌"}</td>
                      <td className="p-3 text-center">
                        {!c.verified && <Button size="sm" variant="outline" onClick={() => verifyCert(c.id)}>Verifizieren</Button>}
                      </td>
                    </tr>
                  ))}
                  {certifications.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Noch keine Zertifikate</td></tr>}
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
            <AlertDialogHeader><AlertDialogTitle>Modul aktivieren?</AlertDialogTitle><AlertDialogDescription>Hufschulen & Zertifikate werden sichtbar.</AlertDialogDescription></AlertDialogHeader>
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
