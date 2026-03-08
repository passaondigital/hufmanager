import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Certification {
  id: string;
  certificate_title: string;
  issuer_name: string | null;
  issued_at: string | null;
  valid_until: string | null;
  verified: boolean;
  is_public: boolean;
}

export function CertificationsManager() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCert, setNewCert] = useState({ certificate_title: "", issuer_name: "", issued_at: "", valid_until: "" });

  useEffect(() => { fetchCerts(); }, [user]);

  const fetchCerts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("provider_certifications").select("*").eq("provider_id", user.id).order("created_at", { ascending: false });
    setCerts((data as any[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newCert.certificate_title) { toast.error("Titel erforderlich"); return; }
    const { error } = await supabase.from("provider_certifications").insert({
      provider_id: user!.id,
      certificate_title: newCert.certificate_title,
      issuer_name: newCert.issuer_name || null,
      issued_at: newCert.issued_at || null,
      valid_until: newCert.valid_until || null,
      is_public: true,
    });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Zertifikat hinzugefügt");
    setShowAdd(false);
    setNewCert({ certificate_title: "", issuer_name: "", issued_at: "", valid_until: "" });
    fetchCerts();
  };

  const togglePublic = async (id: string, isPublic: boolean) => {
    await supabase.from("provider_certifications").update({ is_public: isPublic }).eq("id", id);
    fetchCerts();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-primary" />Meine Zertifikate</CardTitle>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Hinzufügen</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Zertifikat hinzufügen</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Bezeichnung *</Label><Input value={newCert.certificate_title} onChange={e => setNewCert(p => ({ ...p, certificate_title: e.target.value }))} placeholder="z.B. Barhuf-Zertifikat" /></div>
                <div><Label>Aussteller</Label><Input value={newCert.issuer_name} onChange={e => setNewCert(p => ({ ...p, issuer_name: e.target.value }))} placeholder="z.B. DHG Akademie" /></div>
                <div><Label>Ausgestellt am</Label><Input type="date" value={newCert.issued_at} onChange={e => setNewCert(p => ({ ...p, issued_at: e.target.value }))} /></div>
                <div><Label>Gültig bis</Label><Input type="date" value={newCert.valid_until} onChange={e => setNewCert(p => ({ ...p, valid_until: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button onClick={handleAdd}>Speichern</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {certs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Noch keine Zertifikate hinzugefügt</p>
        ) : (
          <div className="space-y-3">
            {certs.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {c.verified ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Award className="w-5 h-5 text-muted-foreground" />}
                  <div>
                    <p className="font-medium text-sm">{c.certificate_title}</p>
                    <p className="text-xs text-muted-foreground">{c.issuer_name || "Kein Aussteller"}{c.issued_at ? ` • ${new Date(c.issued_at).toLocaleDateString("de-DE")}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.verified && <Badge className="bg-green-500/10 text-green-600">Verifiziert</Badge>}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Öffentlich</span>
                    <Switch checked={c.is_public} onCheckedChange={v => togglePublic(c.id, v)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
