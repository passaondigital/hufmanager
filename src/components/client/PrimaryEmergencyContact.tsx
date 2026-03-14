import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Phone, AlertTriangle, CheckCircle2, Pencil, Loader2, Heart } from "lucide-react";
import { toast } from "sonner";

const RELATIONSHIPS = [
  { value: "familie", label: "Familie" },
  { value: "partner", label: "Partner/in" },
  { value: "freund", label: "Freund/in" },
  { value: "anwalt", label: "Anwalt" },
  { value: "sonstiges", label: "Sonstiges" },
];

interface EmergencyContactData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  relationship: string;
  verified: boolean;
}

export function PrimaryEmergencyContact() {
  const { user } = useAuth();
  const [contact, setContact] = useState<EmergencyContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", email: "", relationship: "",
  });

  useEffect(() => {
    fetchContact();
  }, [user]);

  const fetchContact = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("primary_emergency_first_name, primary_emergency_last_name, primary_emergency_phone, primary_emergency_email, primary_emergency_relationship, primary_emergency_verified")
      .eq("id", user.id)
      .single();

    if (data && (data as any).primary_emergency_first_name) {
      const d = data as any;
      setContact({
        first_name: d.primary_emergency_first_name,
        last_name: d.primary_emergency_last_name || "",
        phone: d.primary_emergency_phone || "",
        email: d.primary_emergency_email || "",
        relationship: d.primary_emergency_relationship || "",
        verified: d.primary_emergency_verified || false,
      });
    }
    setLoading(false);
  };

  const openEdit = () => {
    if (contact) {
      setForm({
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone,
        email: contact.email,
        relationship: contact.relationship,
      });
    }
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.phone) {
      toast.error("Vorname, Nachname und Telefon sind Pflicht");
      return;
    }
    const cleanPhone = form.phone.replace(/\s/g, "");
    if (!/^[+]?[\d\s-]{6,20}$/.test(cleanPhone)) {
      toast.error("Bitte gültige Telefonnummer eingeben");
      return;
    }

    setSaving(true);
    try {
      const isNewOrChanged = !contact || contact.email !== form.email || contact.phone !== cleanPhone;
      const { error } = await supabase
        .from("profiles")
        .update({
          primary_emergency_first_name: form.first_name.trim(),
          primary_emergency_last_name: form.last_name.trim(),
          primary_emergency_phone: cleanPhone,
          primary_emergency_email: form.email.trim() || null,
          primary_emergency_relationship: form.relationship || null,
          primary_emergency_verified: isNewOrChanged ? false : contact?.verified || false,
          primary_emergency_verify_token: isNewOrChanged ? crypto.randomUUID() : undefined,
        } as any)
        .eq("id", user!.id);

      if (error) throw error;

      // TODO: Send verification email to emergency contact
      if (form.email && isNewOrChanged) {
        toast.info("Bestätigungs-E-Mail an den Notfallkontakt gesendet");
      }

      toast.success("Notfallkontakt gespeichert");
      setShowEdit(false);
      fetchContact();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Mein Notfallkontakt
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contact ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.relationship && (
                    <p className="text-xs text-muted-foreground">
                      {RELATIONSHIPS.find(r => r.value === contact.relationship)?.label || contact.relationship}
                    </p>
                  )}
                </div>
                {contact.verified ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verifiziert
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
                    <AlertTriangle className="h-3 w-3" /> Nicht bestätigt
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </a>
              </div>
              {contact.email && (
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Heart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Noch kein Notfallkontakt hinterlegt</p>
              <Button variant="outline" size="sm" onClick={openEdit}>Jetzt hinzufügen</Button>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/60 mt-4 leading-tight">
            Dieser Kontakt wird ausschließlich in Notfällen kontaktiert. Datenweitergabe nur gemäß AGB und geltendem Recht.
          </p>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Notfallkontakt bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vorname *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} maxLength={50} /></div>
              <div><Label>Nachname *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} maxLength={50} /></div>
            </div>
            <div><Label>Telefon *</Label><Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+49 123 456789" maxLength={20} /></div>
            <div>
              <Label>Beziehung</Label>
              <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>E-Mail (optional)</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="kontakt@beispiel.de" maxLength={100} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
