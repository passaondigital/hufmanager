import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { mergeContractTemplate } from "@/lib/contractMerge";
import { useIssuerProfile } from "@/hooks/useIssuerProfile";
import { createAccountNote, logDocumentEvent } from "@/services/accountNotesService";

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 9.90, yearly: 99 },
  pro: { monthly: 29, yearly: 348 },
  duo: { monthly: 49, yearly: 588 },
  team: { monthly: 79, yearly: 948 },
};

interface AdminContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  onSaved: () => void;
}

export function AdminContractModal({ open, onOpenChange, contract, onSaved }: AdminContractModalProps) {
  const { user } = useAuth();
  const { profile: issuerProfile } = useIssuerProfile();
  const isEdit = !!contract;

  const [providers, setProviders] = useState<any[]>([]);
  const [providerSearch, setProviderSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    provider_id: "",
    provider_pid: "",
    template_id: "",
    plan: "pro",
    plan_price_monthly: 29,
    plan_price_yearly: 348,
    custom_price: "",
    period_start: new Date().toISOString().split("T")[0],
    period_end: "",
    auto_renew: true,
    payment_method: "copecart",
    notes: "",
    status: "draft",
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
      if (contract) {
        setForm({
          provider_id: contract.provider_id || "",
          provider_pid: contract.provider_pid || "",
          template_id: contract.template_id || "",
          plan: contract.plan || "pro",
          plan_price_monthly: contract.plan_price_monthly || 29,
          plan_price_yearly: contract.plan_price_yearly || 348,
          custom_price: contract.custom_price?.toString() || "",
          period_start: contract.period_start || new Date().toISOString().split("T")[0],
          period_end: contract.period_end || "",
          auto_renew: contract.auto_renew ?? true,
          payment_method: contract.payment_method || "copecart",
          notes: contract.notes || "",
          status: contract.status || "draft",
        });
        // Set selected provider for edit mode
        setSelectedProvider({
          id: contract.provider_id,
          full_name: contract.provider_name || "",
          email: contract.provider_email || "",
          readable_id: contract.provider_pid || "",
        });
      }
    }
  }, [open, contract]);

  // Search providers
  useEffect(() => {
    if (providerSearch.length < 2) {
      setProviders([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "provider");
        const providerIds = roles?.map(r => r.user_id) || [];
        if (!providerIds.length) {
          setProviders([]);
          setShowDropdown(true);
          setSearchLoading(false);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, readable_id, subscription_plan")
          .or(`full_name.ilike.%${providerSearch}%,email.ilike.%${providerSearch}%,readable_id.ilike.%${providerSearch}%`)
          .in("id", providerIds)
          .is("deleted_at", null)
          .limit(8);
        setProviders(data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Provider search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [providerSearch]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("contract_templates")
      .select("id, name, plan, type, variables, content_html")
      .eq("is_active", true)
      .order("name");
    if (data) setTemplates(data);
  };

  const handleTemplateChange = (templateId: string) => {
    setForm(prev => ({ ...prev, template_id: templateId }));
    // Auto-fill plan from template if available
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl?.plan && tmpl.plan !== "all" && PLAN_PRICES[tmpl.plan]) {
      handlePlanChange(tmpl.plan);
    }
  };

  const buildVariables = (): Record<string, string> => {
    const provider = selectedProvider;
    const planName = form.plan.charAt(0).toUpperCase() + form.plan.slice(1);
    const monthlyStr = form.plan_price_monthly.toFixed(2).replace(".", ",") + " €";
    const yearlyStr = form.plan_price_yearly.toFixed(2).replace(".", ",") + " €";
    const bonusYearStr = ((form.plan_price_monthly * 10)).toFixed(2).replace(".", ",") + " €";
    
    const planLimits: Record<string, { pferde: string; nutzer: string }> = {
      starter: { pferde: "1–10", nutzer: "1" },
      pro: { pferde: "11–75", nutzer: "1" },
      duo: { pferde: "76–150", nutzer: "2" },
      team: { pferde: "151+", nutzer: "Unbegrenzt" },
    };
    const limits = planLimits[form.plan] || { pferde: "–", nutzer: "–" };

    const featuresByPlan: Record<string, Record<string, string>> = {
      starter: { FEATURE_COCKPIT: "✅", FEATURE_NAV: "✅", FEATURE_SPRIT: "✅", FEATURE_FAHRTENBUCH: "✅", FEATURE_RECHNUNGEN: "✅", FEATURE_PFERDEAKTE: "✅", FEATURE_KI: "❌", FEATURE_TEAM: "❌", FEATURE_CONNECT: "❌" },
      pro: { FEATURE_COCKPIT: "✅", FEATURE_NAV: "✅", FEATURE_SPRIT: "✅", FEATURE_FAHRTENBUCH: "✅", FEATURE_RECHNUNGEN: "✅", FEATURE_PFERDEAKTE: "✅", FEATURE_KI: "✅", FEATURE_TEAM: "❌", FEATURE_CONNECT: "✅" },
      duo: { FEATURE_COCKPIT: "✅", FEATURE_NAV: "✅", FEATURE_SPRIT: "✅", FEATURE_FAHRTENBUCH: "✅", FEATURE_RECHNUNGEN: "✅", FEATURE_PFERDEAKTE: "✅", FEATURE_KI: "✅", FEATURE_TEAM: "✅", FEATURE_CONNECT: "✅" },
      team: { FEATURE_COCKPIT: "✅", FEATURE_NAV: "✅", FEATURE_SPRIT: "✅", FEATURE_FAHRTENBUCH: "✅", FEATURE_RECHNUNGEN: "✅", FEATURE_PFERDEAKTE: "✅", FEATURE_KI: "✅", FEATURE_TEAM: "✅", FEATURE_CONNECT: "✅" },
    };
    const features = featuresByPlan[form.plan] || featuresByPlan.pro;

    const paymentLabels: Record<string, string> = {
      copecart: "CopeCart",
      bank_transfer: "Überweisung",
      cash: "Barzahlung",
    };

    const today = new Date().toLocaleDateString("de-DE");
    const periodEnd = form.period_end || (form.period_start ? new Date(new Date(form.period_start).setFullYear(new Date(form.period_start).getFullYear() + 1)).toISOString().split("T")[0] : "");

    return {
      // Issuer (from central settings)
      ANBIETER_NAME: issuerProfile.name,
      ANBIETER_FIRMA: issuerProfile.company,
      ANBIETER_ADRESSE: issuerProfile.address,
      ANBIETER_EMAIL: issuerProfile.email,
      ANBIETER_TEL: issuerProfile.phone,
      IBAN: issuerProfile.iban,
      BIC: issuerProfile.bic,
      KONTOINHABER: issuerProfile.account_holder,
      // Provider
      PLAN_NAME: planName,
      PLAN_PREIS_MONAT: monthlyStr,
      PLAN_PREIS_JAHR: yearlyStr,
      PROVIDER_PID: form.provider_pid || provider?.readable_id || "",
      NUTZER_FIRMA: provider?.full_name || "",
      NUTZER_NAME: provider?.full_name || "",
      NUTZER_ADRESSE: "",
      NUTZER_EMAIL: provider?.email || "",
      NUTZER_TELEFON: "",
      PREIS_SONDER: form.custom_price ? (parseFloat(form.custom_price).toFixed(2).replace(".", ",") + " €") : "–",
      PREIS_JAHR_1: bonusYearStr,
      VERTRAG_START: form.period_start,
      VERTRAG_ENDE: periodEnd,
      ZAHLUNGSART: paymentLabels[form.payment_method] || form.payment_method,
      ZAHLUNG_DATUM: "",
      PLAN_PFERDE_LIMIT: limits.pferde,
      PLAN_NUTZER_LIMIT: limits.nutzer,
      NOTIZ: form.notes || "",
      ...features,
      VERTRAG_NR: "",
      DATUM: today,
    };
  };

  const handleProviderSelect = (p: any) => {
    setSelectedProvider(p);
    setProviderSearch("");
    setProviders([]);
    setShowDropdown(false);
    setForm(prev => ({
      ...prev,
      provider_id: p.id,
      provider_pid: p.readable_id || "",
    }));
    // Auto-fill plan from provider's subscription
    const plan = p.subscription_plan?.toLowerCase();
    if (plan && PLAN_PRICES[plan]) {
      handlePlanChange(plan);
    }
  };

  const handlePlanChange = (plan: string) => {
    const prices = PLAN_PRICES[plan] || { monthly: 0, yearly: 0 };
    setForm(prev => ({
      ...prev,
      plan,
      plan_price_monthly: prices.monthly,
      plan_price_yearly: prices.yearly,
    }));
  };

  const handleSave = async (status?: string) => {
    if (!form.provider_id || !form.plan) {
      toast.error("Bitte Provider und Plan auswählen");
      return;
    }
    setSaving(true);
    try {
      const variables = buildVariables();
      const selectedTemplate = templates.find(t => t.id === form.template_id);
      const contentHtml = selectedTemplate?.content_html
        ? mergeContractTemplate(selectedTemplate.content_html, variables)
        : null;

      const payload = {
        provider_id: form.provider_id,
        provider_pid: form.provider_pid,
        template_id: form.template_id || null,
        plan: form.plan,
        plan_price_monthly: form.plan_price_monthly,
        plan_price_yearly: form.plan_price_yearly,
        custom_price: form.custom_price ? parseFloat(form.custom_price) : null,
        period_start: form.period_start,
        period_end: form.period_end || null,
        auto_renew: form.auto_renew,
        payment_method: form.payment_method,
        notes: form.notes || null,
        status: status || form.status,
        content_html: contentHtml,
        variables_used: selectedTemplate ? variables : null,
      };

      if (isEdit) {
        const { error } = await supabase.from("admin_contracts").update(payload).eq("id", contract.id);
        if (error) throw error;
        toast.success("Vertrag aktualisiert");
      } else {
        const { data: newContract, error } = await supabase.from("admin_contracts").insert({ ...payload, contract_number: "" }).select("id, contract_number").single();
        if (error) throw error;
        toast.success("Vertrag erstellt");

        const cNum = newContract?.contract_number || "";
        const periodEnd = form.period_end || "∞";
        await createAccountNote({
          accountId: form.provider_id,
          accountType: "provider",
          noteText: `Vertrag ${cNum} (${form.plan}) erstellt, Laufzeit ${form.period_start}–${periodEnd}`,
          isSystem: true,
        });
        if (newContract?.id) {
          await logDocumentEvent({
            documentId: newContract.id,
            documentType: "contract",
            eventType: "created",
            eventData: { contract_number: cNum, plan: form.plan },
          });
        }
      }

      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Vertrag bearbeiten" : "Neuer Vertrag"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Provider */}
          <div className="space-y-2">
            <Label>Provider</Label>
            {selectedProvider ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium">{selectedProvider.full_name || selectedProvider.email}</p>
                  <div className="flex gap-2 mt-1">
                    {selectedProvider.readable_id && <Badge variant="outline">{selectedProvider.readable_id}</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedProvider(null); setForm(prev => ({ ...prev, provider_id: "", provider_pid: "" })); }}>
                  Ändern
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Input
                    placeholder="Provider suchen (Name, E-Mail, PID)..."
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    onFocus={() => providers.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {showDropdown && providerSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {providers.length > 0 ? (
                      providers.map((p) => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-b-0"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleProviderSelect(p)}
                        >
                          <p className="font-medium text-sm">{p.full_name || p.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{p.email}</span>
                            {p.readable_id && <Badge variant="outline" className="text-[10px] px-1 py-0">{p.readable_id}</Badge>}
                            {p.subscription_plan && <Badge variant="secondary" className="text-[10px] px-1 py-0">{p.subscription_plan}</Badge>}
                          </div>
                        </button>
                      ))
                    ) : !searchLoading ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        Kein Provider gefunden – Name, E-Mail oder PID eingeben
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label>Vorlage (optional)</Label>
            <Select value={form.template_id} onValueChange={handleTemplateChange}>
              <SelectTrigger><SelectValue placeholder="Vorlage wählen..." /></SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plan + Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={handlePlanChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="duo">Duo</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monatspreis (€)</Label>
              <Input type="number" step="0.01" value={form.plan_price_monthly} onChange={e => setForm(prev => ({ ...prev, plan_price_monthly: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Jahrespreis (€)</Label>
              <Input type="number" step="0.01" value={form.plan_price_yearly} onChange={e => setForm(prev => ({ ...prev, plan_price_yearly: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Custom price */}
          <div className="space-y-2">
            <Label>Sonderpreis (optional, €)</Label>
            <Input type="number" step="0.01" value={form.custom_price} onChange={e => setForm(prev => ({ ...prev, custom_price: e.target.value }))} placeholder="Leer = Standardpreis" />
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Beginn</Label>
              <Input type="date" value={form.period_start} onChange={e => setForm(prev => ({ ...prev, period_start: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ende (optional)</Label>
              <Input type="date" value={form.period_end} onChange={e => setForm(prev => ({ ...prev, period_end: e.target.value }))} />
            </div>
          </div>

          {/* Payment + Auto-renew */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Zahlungsart</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(prev => ({ ...prev, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="copecart">CopeCart</SelectItem>
                  <SelectItem value="bank_transfer">Überweisung</SelectItem>
                  <SelectItem value="cash">Barzahlung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="sent">Versendet</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="cancelled">Gekündigt</SelectItem>
                  <SelectItem value="expired">Abgelaufen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notizen</Label>
            <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />
              Entwurf speichern
            </Button>
            <Button onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
