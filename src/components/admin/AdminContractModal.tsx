import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { mergeContractTemplate } from "@/lib/contractMerge";

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
  const isEdit = !!contract;

  const [providers, setProviders] = useState<any[]>([]);
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
      fetchProviders();
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
      }
    }
  }, [open, contract]);

  const fetchProviders = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, readable_id")
      .eq("deleted_at", null)
      .order("full_name");
    // Filter to providers only via user_roles
    if (data) {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "provider");
      const providerIds = new Set(roles?.map(r => r.user_id) || []);
      setProviders(data.filter(p => providerIds.has(p.id)));
    }
  };

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
    const provider = providers.find(p => p.id === form.provider_id);
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
      ANBIETER_ADRESSE: "Adresse folgt nach PostIdent",
      PLAN_NAME: planName,
      PLAN_PREIS_MONAT: monthlyStr,
      PLAN_PREIS_JAHR: yearlyStr,
      PROVIDER_PID: form.provider_pid || provider?.readable_id || "",
      NUTZER_FIRMA: provider?.full_name || "",
      NUTZER_NAME: provider?.full_name || "",
      NUTZER_ADRESSE: "",
      NUTZER_EMAIL: provider?.email || "",
      NUTZER_TELEFON: "",
      PREIS_JAHR_1: bonusYearStr,
      VERTRAG_START: form.period_start,
      VERTRAG_ENDE: periodEnd,
      ZAHLUNGSART: paymentLabels[form.payment_method] || form.payment_method,
      ZAHLUNG_DATUM: "",
      PLAN_PFERDE_LIMIT: limits.pferde,
      PLAN_NUTZER_LIMIT: limits.nutzer,
      ...features,
      VERTRAG_NR: "",
      DATUM: today,
    };
  };

  const handleProviderChange = (providerId: string) => {
    const p = providers.find(pr => pr.id === providerId);
    setForm(prev => ({
      ...prev,
      provider_id: providerId,
      provider_pid: p?.readable_id || "",
    }));
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
        const { error } = await supabase.from("admin_contracts").insert({ ...payload, contract_number: "" });
        if (error) throw error;
        toast.success("Vertrag erstellt");
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
            <Select value={form.provider_id} onValueChange={handleProviderChange}>
              <SelectTrigger><SelectValue placeholder="Provider auswählen..." /></SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name || p.email} ({p.readable_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label>Vorlage (optional)</Label>
            <Select value={form.template_id} onValueChange={v => setForm(prev => ({ ...prev, template_id: v }))}>
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
