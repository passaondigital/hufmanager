import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Banknote, Clock3, FileText, Plus, ReceiptText, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type FinanceTab = "services" | "offers" | "invoices" | "payments";
type ServiceRow = { id: string; name: string; base_price: number; duration: number | null; is_active: boolean | null };
type InvoiceRow = { id: string; invoice_number: string | null; total_amount: number; status: string; payment_status: string | null; due_date: string | null };

const tabs: Array<{ id: FinanceTab; label: string }> = [
  { id: "services", label: "Leistungen" },
  { id: "offers", label: "Angebote" },
  { id: "invoices", label: "Rechnungen" },
  { id: "payments", label: "Zahlungen" },
];

function money(value: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value); }

export function SlimFinanceScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FinanceTab>("invoices");
  const financeQuery = useQuery({
    queryKey: ["slim-finance-unchained", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { services: [] as ServiceRow[], invoices: [] as InvoiceRow[] };
      const [servicesResult, invoicesResult] = await Promise.all([
        supabase.from("services").select("id, name, base_price, duration, is_active").eq("provider_id", user.id).order("sort_order"),
        supabase.from("invoices").select("id, invoice_number, total_amount, status, payment_status, due_date").eq("provider_id", user.id).order("created_at", { ascending: false }).limit(25),
      ]);
      if (servicesResult.error || invoicesResult.error) throw new Error("FINANCE_LOAD_FAILED");
      return {
        services: (servicesResult.data ?? []).map((service) => ({ ...service, base_price: Number(service.base_price) })) as ServiceRow[],
        invoices: (invoicesResult.data ?? []).map((invoice) => ({ ...invoice, total_amount: Number(invoice.total_amount) })) as InvoiceRow[],
      };
    },
  });

  const services = financeQuery.data?.services ?? [];
  const invoices = financeQuery.data?.invoices ?? [];
  const openInvoices = invoices.filter((invoice) => ["open", "overdue"].includes(invoice.status) || invoice.payment_status === "open");
  const overdueInvoices = invoices.filter((invoice) => invoice.status === "overdue");
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid" || invoice.payment_status === "paid");

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--hm-text-secondary)]">Leistung → Rechnung → Zahlung</p><h1 className="mt-1 text-[clamp(1.75rem,3vw,2rem)] font-bold tracking-[-0.035em] text-[var(--hm-text-primary)]">Finanzen</h1></div><Button onClick={() => navigate("/rechnungen?new=true")}><Plus className="h-4 w-4" />Rechnung erstellen</Button></header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard label="Heute abzurechnen" value={`${invoices.filter((invoice) => invoice.status === "draft").length}`} hint="Entwürfe" />
        <StatusCard label="Offene Rechnungen" value={money(openInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0))} hint={`${openInvoices.length} Vorgänge`} />
        <StatusCard label="Überfällig" value={`${overdueInvoices.length}`} hint={money(overdueInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0))} attention />
        <StatusCard label="Bezahlt" value={money(paidInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0))} hint="im sichtbaren Zeitraum" />
      </div>

      <section className="hm-card overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--hm-border)] p-2">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-h-11 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition ${activeTab === tab.id ? "bg-orange-600 text-white" : "text-[var(--hm-text-secondary)] hover:bg-orange-500/10 hover:text-[var(--hm-text-primary)]"}`}>{tab.label}</button>)}</div>
        <div className="p-4 sm:p-6">
          {financeQuery.isLoading ? <div className="h-64 animate-pulse rounded-2xl bg-[var(--hm-surface-elevated)]" /> : financeQuery.isError ? <FinanceError onRetry={() => void financeQuery.refetch()} /> : activeTab === "services" ? (
            <FinanceSection title="Leistungen & Preise" description="Der schlanke Leistungskatalog für Termin und Rechnung." action="Leistungen verwalten" onAction={() => navigate("/mein-angebot")}>
              <div className="divide-y divide-[var(--hm-border)]">{services.map((service) => <div key={service.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4"><div><p className="font-semibold text-[var(--hm-text-primary)]">{service.name}</p><p className="mt-1 text-sm text-[var(--hm-text-secondary)]">{service.duration ?? 60} Min. · {service.is_active ? "Aktiv" : "Inaktiv"}</p></div><p className="font-semibold text-[var(--hm-text-primary)]">{money(service.base_price)}</p></div>)}</div>
            </FinanceSection>
          ) : activeTab === "offers" ? (
            <FinanceSection title="Angebote" description="Anfrage prüfen, Angebot erstellen und anschließend in Kunde, Pferd und Termin übernehmen." action="Anfragen & Angebote öffnen" onAction={() => navigate("/anfragen")}><ProcessFlow /></FinanceSection>
          ) : activeTab === "invoices" ? (
            <FinanceSection title="Rechnungen" description="Entwürfe, offene Posten, PDF und Zahlungsstatus." action="Alle Rechnungen" onAction={() => navigate("/rechnungen")}>
              {invoices.length ? <div className="divide-y divide-[var(--hm-border)]">{invoices.slice(0, 8).map((invoice) => <button key={invoice.id} onClick={() => navigate("/rechnungen")} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 text-left"><div><p className="font-semibold text-[var(--hm-text-primary)]">{invoice.invoice_number || "Rechnungsentwurf"}</p><p className="mt-1 text-sm text-[var(--hm-text-secondary)]">{invoice.status === "overdue" ? "Überfällig" : invoice.status === "paid" || invoice.payment_status === "paid" ? "Bezahlt" : invoice.status === "draft" ? "Entwurf" : "Offen"}</p></div><span className="flex items-center gap-3 font-semibold text-[var(--hm-text-primary)]">{money(invoice.total_amount)}<ArrowRight className="h-4 w-4 text-[var(--hm-text-secondary)]" /></span></button>)}</div> : <EmptyFinance title="Noch keine Rechnungen" action={() => navigate("/rechnungen?new=true")} />}
            </FinanceSection>
          ) : (
            <FinanceSection title="Zahlungen" description="Zahlungsstatus aus Rechnungen, ohne separate Buchhaltungswelt." action="Zahlungsstatus öffnen" onAction={() => navigate("/rechnungen")}><div className="grid gap-3 sm:grid-cols-3"><PaymentCard icon={Banknote} label="Bezahlt" value={money(paidInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0))} /><PaymentCard icon={Clock3} label="Offen" value={money(openInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0))} /><PaymentCard icon={ReceiptText} label="Überfällig" value={money(overdueInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0))} /></div></FinanceSection>
          )}
        </div>
      </section>

      <section className="hm-card p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold text-[var(--hm-text-primary)]">Terminabschluss</h2><p className="mt-1 text-sm text-[var(--hm-text-secondary)]">Leistung, Kunden-Anfahrt, Zuschlag und Rabatt werden im vorhandenen Rechnungsflow zusammengeführt.</p></div><Button variant="outline" onClick={() => navigate("/home/tour")}>Zur Tour<ArrowRight className="h-4 w-4" /></Button></div></section>
    </div>
  );
}

function StatusCard({ label, value, hint, attention = false }: { label: string; value: string; hint: string; attention?: boolean }) { return <div className={`rounded-2xl border p-4 ${attention ? "border-orange-500/35 bg-orange-500/10" : "border-[var(--hm-border)] bg-[var(--hm-surface)]"}`}><p className="text-xs text-[var(--hm-text-secondary)]">{label}</p><p className="mt-2 text-xl font-bold tracking-[-0.025em] text-[var(--hm-text-primary)]">{value}</p><p className="mt-1 text-xs text-[var(--hm-text-secondary)]">{hint}</p></div>; }
function FinanceSection({ title, description, action, onAction, children }: { title: string; description: string; action: string; onAction: () => void; children: React.ReactNode }) { return <div><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-xl font-semibold text-[var(--hm-text-primary)]">{title}</h2><p className="mt-1 text-sm text-[var(--hm-text-secondary)]">{description}</p></div><Button variant="outline" onClick={onAction}>{action}<ArrowRight className="h-4 w-4" /></Button></div><div className="mt-5">{children}</div></div>; }
function ProcessFlow() { return <div className="grid gap-2 sm:grid-cols-5">{["Anfrage", "Angebot", "Annahme", "Termin", "Rechnung"].map((step, index) => <div key={step} className="rounded-xl bg-[var(--hm-surface-elevated)] p-3"><span className="text-xs font-bold text-orange-600">{index + 1}</span><p className="mt-2 text-sm font-semibold text-[var(--hm-text-primary)]">{step}</p></div>)}</div>; }
function PaymentCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) { return <div className="rounded-2xl bg-[var(--hm-surface-elevated)] p-4"><Icon className="h-5 w-5 text-orange-600" /><p className="mt-3 text-xs text-[var(--hm-text-secondary)]">{label}</p><p className="mt-1 text-lg font-semibold text-[var(--hm-text-primary)]">{value}</p></div>; }
function EmptyFinance({ title, action }: { title: string; action: () => void }) { return <div className="rounded-2xl border border-dashed border-[var(--hm-border)] p-6"><FileText className="h-6 w-6 text-orange-600" /><p className="mt-3 font-semibold text-[var(--hm-text-primary)]">{title}</p><button className="mt-3 text-sm font-semibold text-orange-600" onClick={action}>Ersten Entwurf anlegen</button></div>; }
function FinanceError({ onRetry }: { onRetry: () => void }) { return <div className="rounded-2xl bg-[var(--hm-surface-elevated)] p-6"><p className="font-semibold text-[var(--hm-text-primary)]">Finanzen konnten gerade nicht geladen werden.</p><p className="mt-1 text-sm text-[var(--hm-text-secondary)]">Bitte prüfe die Verbindung.</p><button className="mt-3 text-sm font-semibold text-orange-600" onClick={onRetry}>Erneut versuchen</button></div>; }
