import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Building2, CreditCard, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function PartnerSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["partner-business-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_business_settings")
        .select("*")
        .eq("partner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    business_name: "", owner_name: "", address: "", phone: "", email: "",
    tax_number: "", vat_id: "", iban: "", bank_name: "", bic: "",
    specialty: "", qualifications: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name || "",
        owner_name: settings.owner_name || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        tax_number: settings.tax_number || "",
        vat_id: settings.vat_id || "",
        iban: settings.iban || "",
        bank_name: settings.bank_name || "",
        bic: settings.bic || "",
        specialty: settings.specialty || "",
        qualifications: settings.qualifications || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        partner_id: user!.id,
        ...form,
        business_name: form.business_name || null,
        owner_name: form.owner_name || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        tax_number: form.tax_number || null,
        vat_id: form.vat_id || null,
        iban: form.iban || null,
        bank_name: form.bank_name || null,
        bic: form.bic || null,
        specialty: form.specialty || null,
        qualifications: form.qualifications || null,
      };

      if (settings) {
        const { error } = await supabase.from("partner_business_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_business_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Einstellungen gespeichert");
      queryClient.invalidateQueries({ queryKey: ["partner-business-settings"] });
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Laden...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business" className="gap-1.5"><Building2 className="h-4 w-4" /> Praxis</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5"><CreditCard className="h-4 w-4" /> Abrechnung</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader><CardTitle className="text-lg">Praxis- / Geschäftsdaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Praxis- / Firmenname</Label><Input value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} placeholder="z.B. Pferdeosteopathie Müller" /></div>
                <div><Label>Inhaber:in</Label><Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} /></div>
                <div><Label>Fachgebiet</Label><Input value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} placeholder="z.B. Equine Osteopathie" /></div>
                <div><Label>Telefon</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <div><Label>E-Mail</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              </div>
              <div><Label>Adresse</Label><Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2} /></div>
              <div><Label>Qualifikationen & Zertifizierungen</Label><Textarea value={form.qualifications} onChange={e => setForm(p => ({ ...p, qualifications: e.target.value }))} placeholder="z.B. DIPO-Diplom, Equine Physiotherapie Zertifikat" rows={3} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader><CardTitle className="text-lg">Rechnungs- & Bankdaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Steuernummer</Label><Input value={form.tax_number} onChange={e => setForm(p => ({ ...p, tax_number: e.target.value }))} /></div>
                <div><Label>USt-IdNr.</Label><Input value={form.vat_id} onChange={e => setForm(p => ({ ...p, vat_id: e.target.value }))} /></div>
                <div><Label>Bank</Label><Input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></div>
                <div><Label>IBAN</Label><Input value={form.iban} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} /></div>
                <div><Label>BIC</Label><Input value={form.bic} onChange={e => setForm(p => ({ ...p, bic: e.target.value }))} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Speichern
      </Button>
    </div>
  );
}
