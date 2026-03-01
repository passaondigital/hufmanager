import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Building2, CreditCard, Loader2, Save, Trash2, AlertTriangle, Bell, Globe } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getDACHConfig, type TaxCountry } from "@/lib/dachConfig";

const COUNTRY_OPTIONS = [
  { value: "DE", label: "🇩🇪 Deutschland", currency: "EUR" },
  { value: "AT", label: "🇦🇹 Österreich", currency: "EUR" },
  { value: "CH", label: "🇨🇭 Schweiz", currency: "CHF" },
];

const VAT_RATES: Record<string, { standard: number; reduced: number; label: string; smallBizLabel: string; smallBizLimit: string }> = {
  DE: { standard: 19, reduced: 7, label: "MwSt.", smallBizLabel: "Kleinunternehmer (§19 UStG)", smallBizLimit: "bis 22.000 € Umsatz" },
  AT: { standard: 20, reduced: 10, label: "USt.", smallBizLabel: "Kleinunternehmer", smallBizLimit: "bis 35.000 € Umsatz" },
  CH: { standard: 8.1, reduced: 2.6, label: "MWST", smallBizLabel: "MWST-befreit", smallBizLimit: "unter 100.000 CHF Umsatz" },
};

export default function PartnerSettings() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["partner-profile-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("readable_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

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
    country: "DE", kleine_unternehmer: false, default_vat_rate: "19",
    public_profile_visible: false,
  });

  const [notifications, setNotifications] = useState({
    email_horse_share: true,
    email_chat_message: true,
    email_appointment: true,
    push_enabled: false,
  });

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setForm({
        business_name: s.business_name || "",
        owner_name: s.owner_name || "",
        address: s.address || "",
        phone: s.phone || "",
        email: s.email || "",
        tax_number: s.tax_number || "",
        vat_id: s.vat_id || "",
        iban: s.iban || "",
        bank_name: s.bank_name || "",
        bic: s.bic || "",
        specialty: s.specialty || "",
        qualifications: s.qualifications || "",
        country: s.country || "DE",
        kleine_unternehmer: s.kleine_unternehmer || false,
        default_vat_rate: String(s.default_vat_rate || "19"),
        public_profile_visible: s.public_profile_visible || false,
      });
      if (s.notification_preferences) {
        setNotifications({
          email_horse_share: s.notification_preferences.email_horse_share ?? true,
          email_chat_message: s.notification_preferences.email_chat_message ?? true,
          email_appointment: s.notification_preferences.email_appointment ?? true,
          push_enabled: s.notification_preferences.push_enabled ?? false,
        });
      }
    }
  }, [settings]);

  // When country changes, update default VAT rate
  const handleCountryChange = (country: string) => {
    const vatConfig = VAT_RATES[country] || VAT_RATES.DE;
    setForm(p => ({
      ...p,
      country,
      default_vat_rate: String(vatConfig.standard),
      kleine_unternehmer: false,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        partner_id: user!.id,
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
        country: form.country,
        kleine_unternehmer: form.kleine_unternehmer,
        default_vat_rate: parseFloat(form.default_vat_rate) || 19,
        currency: COUNTRY_OPTIONS.find(c => c.value === form.country)?.currency || "EUR",
        notification_preferences: notifications,
        public_profile_visible: form.public_profile_visible,
      };

      if (settings) {
        const { error } = await supabase.from("partner_business_settings").update(payload).eq("id", (settings as any).id);
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

  // ── Delete Account ──
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "LÖSCHEN") {
      toast.error("Bitte tippe LÖSCHEN ein, um fortzufahren.");
      return;
    }
    setDeleting(true);
    try {
      const partnerId = user!.id;
      await supabase.from("partner_treatment_notes").update({ deleted_at: new Date().toISOString() } as any).eq("partner_id", partnerId);
      await supabase.from("horse_partner_access").update({ is_active: false, status: "revoked" }).eq("partner_profile_id", partnerId);
      await supabase.from("partner_conversations").update({ deleted_at: new Date().toISOString() } as any).eq("partner_id", partnerId);
      await supabase.from("partner_invoices").update({ deleted_at: new Date().toISOString() } as any).eq("partner_id", partnerId);
      await supabase.from("partner_business_settings").delete().eq("partner_id", partnerId);
      await supabase.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", partnerId);
      await supabase.from("admin_activity_log").insert({
        admin_id: partnerId, admin_email: user!.email || null,
        action_type: "partner_account_deleted", target_type: "partner",
        target_id: partnerId, target_name: user!.email || null,
        details: { self_service: true, timestamp: new Date().toISOString() },
      });
      toast.success("Dein Account wurde gelöscht. Du wirst abgemeldet.");
      setTimeout(async () => { await signOut(); navigate("/"); }, 1500);
    } catch (error) {
      console.error("Account deletion error:", error);
      toast.error("Fehler beim Löschen des Accounts. Bitte kontaktiere den Support.");
    } finally {
      setDeleting(false);
    }
  };

  const currentVatConfig = VAT_RATES[form.country] || VAT_RATES.DE;
  const currencySymbol = form.country === "CH" ? "CHF" : "€";

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="business" className="gap-1.5 text-xs"><Building2 className="h-4 w-4" /> <span className="hidden sm:inline">Praxis</span></TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs"><CreditCard className="h-4 w-4" /> <span className="hidden sm:inline">Abrechnung</span></TabsTrigger>
          <TabsTrigger value="dach" className="gap-1.5 text-xs"><Globe className="h-4 w-4" /> <span className="hidden sm:inline">Land</span></TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs"><Bell className="h-4 w-4" /> <span className="hidden sm:inline">Benachrichtigung</span></TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5 text-xs"><Settings className="h-4 w-4" /> <span className="hidden sm:inline">Konto</span></TabsTrigger>
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
              
              {/* Public Profile Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Öffentliches Profil</p>
                  <p className="text-xs text-muted-foreground">Dein Profil ist unter /partner/{profile?.readable_id || "PRID-..."} sichtbar</p>
                </div>
                <Switch checked={form.public_profile_visible} onCheckedChange={v => setForm(p => ({ ...p, public_profile_visible: v }))} />
              </div>
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

        {/* VERBESSERUNG 5: DACH Settings */}
        <TabsContent value="dach">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Ländereinstellungen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Land</Label>
                <Select value={form.country} onValueChange={handleCountryChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="text-sm font-medium text-foreground">Steuereinstellungen ({currencySymbol})</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{currentVatConfig.label} Standardsatz</Label>
                    <Input value={`${currentVatConfig.standard}%`} disabled className="bg-muted" />
                  </div>
                  <div>
                    <Label>{currentVatConfig.label} ermäßigt</Label>
                    <Input value={`${currentVatConfig.reduced}%`} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{currentVatConfig.smallBizLabel}</p>
                    <p className="text-xs text-muted-foreground">{currentVatConfig.smallBizLimit}</p>
                  </div>
                  <Switch
                    checked={form.kleine_unternehmer}
                    onCheckedChange={v => setForm(p => ({ ...p, kleine_unternehmer: v, default_vat_rate: v ? "0" : String(currentVatConfig.standard) }))}
                  />
                </div>

                <div>
                  <Label>Standard-{currentVatConfig.label} für Rechnungen</Label>
                  <Select
                    value={form.default_vat_rate}
                    onValueChange={v => setForm(p => ({ ...p, default_vat_rate: v }))}
                    disabled={form.kleine_unternehmer}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (befreit)</SelectItem>
                      <SelectItem value={String(currentVatConfig.reduced)}>{currentVatConfig.reduced}% (ermäßigt)</SelectItem>
                      <SelectItem value={String(currentVatConfig.standard)}>{currentVatConfig.standard}% (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VERBESSERUNG 8: Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Benachrichtigungen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Neue Pferde-Freigabe</p>
                    <p className="text-xs text-muted-foreground">E-Mail wenn dir ein neues Pferd freigegeben wird</p>
                  </div>
                  <Switch checked={notifications.email_horse_share} onCheckedChange={v => setNotifications(p => ({ ...p, email_horse_share: v }))} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Neue Chat-Nachricht</p>
                    <p className="text-xs text-muted-foreground">E-Mail bei neuen Nachrichten</p>
                  </div>
                  <Switch checked={notifications.email_chat_message} onCheckedChange={v => setNotifications(p => ({ ...p, email_chat_message: v }))} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Neuer Termin</p>
                    <p className="text-xs text-muted-foreground">E-Mail bei neuen Terminen</p>
                  </div>
                  <Switch checked={notifications.email_appointment} onCheckedChange={v => setNotifications(p => ({ ...p, email_appointment: v }))} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Push-Benachrichtigungen</p>
                    <p className="text-xs text-muted-foreground">Wenn die App als PWA installiert ist</p>
                  </div>
                  <Switch checked={notifications.push_enabled} onCheckedChange={v => setNotifications(p => ({ ...p, push_enabled: v }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Account löschen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-destructive">Achtung:</strong> Diese Aktion ist unwiderruflich.
                  Alle deine Daten werden dauerhaft gelöscht — Behandlungsnotizen, Dokumente,
                  Rechnungen, Pferdezugänge und Konversationen.
                  Steuerlich relevante Daten werden gemäß gesetzlicher Aufbewahrungspflicht archiviert.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Account dauerhaft löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Account unwiderruflich löschen?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>Alle deine Daten werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</p>
                        <div>
                          <Label className="text-sm font-medium">
                            Tippe <span className="font-bold text-destructive">LÖSCHEN</span> zur Bestätigung:
                          </Label>
                          <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="LÖSCHEN" className="mt-1" />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Abbrechen</AlertDialogCancel>
                    <Button variant="destructive" disabled={deleteConfirmText !== "LÖSCHEN" || deleting} onClick={handleDeleteAccount} className="gap-2">
                      {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Ja, endgültig löschen
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
