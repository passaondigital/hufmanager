import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  FileText,
  Footprints,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  ReceiptText,
  Search,
  UserRound,
} from "lucide-react";
import { AddHorseModal } from "@/components/customers/AddHorseModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Customer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  readable_id: string | null;
  has_logged_in: boolean | null;
};

type Horse = {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  gender: string | null;
  birth_year: number | null;
  readable_id: string | null;
  photo_url: string | null;
  next_appointment_due: string | null;
  last_appointment_date: string | null;
  special_notes: string | null;
};

const emptyCustomer = { first_name: "", last_name: "", email: "", phone: "", street: "", zip_code: "", city: "" };

export function SlimCustomerHorseWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [addHorseOpen, setAddHorseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState(emptyCustomer);

  const workspaceQuery = useQuery({
    queryKey: ["slim-customer-horse-workspace", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { customers: [] as Customer[], horses: [] as Horse[] };
      const [createdResult, grantsResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone, street, zip_code, city, readable_id, has_logged_in").eq("created_by_provider_id", user.id).is("deleted_at", null),
        supabase.from("access_grants").select("client_id").eq("provider_id", user.id).eq("is_active", true).eq("status", "active"),
      ]);
      if (createdResult.error || grantsResult.error) throw new Error("CUSTOMER_LOAD_FAILED");
      const grantedIds = (grantsResult.data ?? []).map((grant) => grant.client_id);
      const grantedResult = grantedIds.length
        ? await supabase.from("profiles").select("id, full_name, email, phone, street, zip_code, city, readable_id, has_logged_in").in("id", grantedIds).is("deleted_at", null)
        : { data: [] as Customer[], error: null };
      if (grantedResult.error) throw new Error("CUSTOMER_LOAD_FAILED");

      const customerMap = new Map<string, Customer>();
      [...(createdResult.data ?? []), ...(grantedResult.data ?? [])].forEach((customer) => customerMap.set(customer.id, customer as Customer));
      const customers = [...customerMap.values()].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "de"));
      const customerIds = customers.map((customer) => customer.id);
      const horseResult = customerIds.length
        ? await supabase.from("horses").select("id, owner_id, name, breed, gender, birth_year, readable_id, photo_url, next_appointment_due, last_appointment_date, special_notes").in("owner_id", customerIds).is("deleted_at", null).order("name")
        : { data: [] as Horse[], error: null };
      if (horseResult.error) throw new Error("HORSE_LOAD_FAILED");
      return { customers, horses: (horseResult.data ?? []) as Horse[] };
    },
  });

  const customers = workspaceQuery.data?.customers ?? [];
  const horses = workspaceQuery.data?.horses ?? [];
  useEffect(() => {
    if (!selectedCustomerId && customers[0]) setSelectedCustomerId(customers[0].id);
  }, [customers, selectedCustomerId]);
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setNewCustomerOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de");
    if (!term) return customers;
    return customers.filter((customer) => [customer.full_name, customer.email, customer.readable_id, ...horses.filter((horse) => horse.owner_id === customer.id).map((horse) => horse.name)].some((value) => value?.toLocaleLowerCase("de").includes(term)));
  }, [customers, horses, search]);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedCustomerHorses = horses.filter((horse) => horse.owner_id === selectedCustomerId);
  const selectedHorse = horses.find((horse) => horse.id === selectedHorseId) ?? null;

  const createCustomer = async () => {
    if (!user?.id || !newCustomer.first_name.trim() || !newCustomer.last_name.trim()) {
      toast({ title: "Vor- und Nachname fehlen", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const fullName = `${newCustomer.first_name.trim()} ${newCustomer.last_name.trim()}`;
      const { error } = await supabase.from("profiles").insert({
        id,
        full_name: fullName,
        email: newCustomer.email.trim() || null,
        phone: newCustomer.phone.trim() || null,
        street: newCustomer.street.trim() || null,
        zip_code: newCustomer.zip_code.trim() || null,
        city: newCustomer.city.trim() || null,
        created_by_provider_id: user.id,
        onboarding_completed: false,
        has_logged_in: false,
      } as any);
      if (error) throw error;
      await supabase.from("contacts").insert({ provider_id: user.id, profile_id: id, full_name: fullName, email: newCustomer.email.trim() || null, phone: newCustomer.phone.trim() || null, category: "client" });
      setNewCustomerOpen(false);
      setNewCustomer(emptyCustomer);
      setSelectedCustomerId(id);
      await queryClient.invalidateQueries({ queryKey: ["slim-customer-horse-workspace", user.id] });
      toast({ title: "Kunde angelegt", description: "Du kannst jetzt direkt ein Pferd hinzufügen." });
    } catch (error) {
      console.error("Customer creation failed", error);
      toast({ title: "Kunde konnte nicht angelegt werden", description: "Bitte prüfe die Eingaben und versuche es erneut.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (workspaceQuery.isLoading) return <div className="hm-card min-h-[34rem] animate-pulse bg-[var(--hm-surface-elevated)]" aria-label="Kunden und Pferde werden geladen" />;
  if (workspaceQuery.isError) return <WorkspaceError onRetry={() => void workspaceQuery.refetch()} />;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-[var(--hm-text-secondary)]">Gemeinsamer Arbeitskontext</p><h1 className="mt-1 text-[clamp(1.75rem,3vw,2rem)] font-bold tracking-[-0.035em] text-[var(--hm-text-primary)]">Kunden & Pferde</h1></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => selectedCustomer && setAddHorseOpen(true)} disabled={!selectedCustomer}><Footprints className="h-4 w-4" />Pferd hinzufügen</Button><Button onClick={() => setNewCustomerOpen(true)}><Plus className="h-4 w-4" />Neuer Kunde</Button></div>
      </header>

      {!customers.length ? (
        <section className="hm-card flex min-h-72 flex-col items-start justify-center p-6 sm:p-8"><UserRound className="h-8 w-8 text-orange-600" /><h2 className="mt-4 text-xl font-semibold text-[var(--hm-text-primary)]">Noch keine Kunden</h2><p className="mt-2 max-w-md text-sm leading-6 text-[var(--hm-text-secondary)]">Lege deinen ersten Kunden an und füge anschließend direkt ein Pferd hinzu.</p><button className="hm-button-primary mt-5" onClick={() => setNewCustomerOpen(true)}>Ersten Kunden anlegen</button></section>
      ) : (
        <div className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-[var(--hm-border)] bg-[var(--hm-surface)] shadow-[var(--hm-shadow-card)] lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="border-b border-[var(--hm-border)] lg:border-b-0 lg:border-r">
            <div className="border-b border-[var(--hm-border)] p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--hm-text-secondary)]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kunde oder Pferd suchen" className="pl-9" /></div></div>
            <div className="max-h-[28rem] overflow-y-auto p-2 lg:max-h-[calc(100vh-16rem)]">
              {filteredCustomers.map((customer) => {
                const customerHorses = horses.filter((horse) => horse.owner_id === customer.id);
                const active = customer.id === selectedCustomerId;
                return <button key={customer.id} type="button" onClick={() => { setSelectedCustomerId(customer.id); setSelectedHorseId(null); }} className={`mb-1 w-full rounded-xl p-3 text-left transition ${active ? "bg-orange-600 text-white" : "hover:bg-orange-500/10"}`}><span className={`block truncate text-sm font-semibold ${active ? "text-white" : "text-[var(--hm-text-primary)]"}`}>{customer.full_name || "Unbekannter Kunde"}</span><span className={`mt-1 block truncate text-xs ${active ? "text-orange-50" : "text-[var(--hm-text-secondary)]"}`}>{customerHorses.map((horse) => horse.name).join(" · ") || "Noch kein Pferd"}</span></button>;
              })}
            </div>
          </aside>

          <main className="min-w-0 overflow-y-auto p-4 sm:p-6 lg:max-h-[calc(100vh-11rem)]">
            {selectedHorse ? (
              <HorseDetail horse={selectedHorse} owner={selectedCustomer} onBack={() => setSelectedHorseId(null)} onNavigate={navigate} />
            ) : selectedCustomer ? (
              <CustomerDetail customer={selectedCustomer} horses={selectedCustomerHorses} onHorseSelect={setSelectedHorseId} onAddHorse={() => setAddHorseOpen(true)} onNavigate={navigate} />
            ) : null}
          </main>
        </div>
      )}

      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Neuen Kunden anlegen</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Vorname" value={newCustomer.first_name} onChange={(value) => setNewCustomer((current) => ({ ...current, first_name: value }))} /><Field label="Nachname" value={newCustomer.last_name} onChange={(value) => setNewCustomer((current) => ({ ...current, last_name: value }))} /><Field label="E-Mail" value={newCustomer.email} onChange={(value) => setNewCustomer((current) => ({ ...current, email: value }))} /><Field label="Telefon" value={newCustomer.phone} onChange={(value) => setNewCustomer((current) => ({ ...current, phone: value }))} /><div className="sm:col-span-2"><Field label="Straße" value={newCustomer.street} onChange={(value) => setNewCustomer((current) => ({ ...current, street: value }))} /></div><Field label="PLZ" value={newCustomer.zip_code} onChange={(value) => setNewCustomer((current) => ({ ...current, zip_code: value }))} /><Field label="Ort" value={newCustomer.city} onChange={(value) => setNewCustomer((current) => ({ ...current, city: value }))} /></div><DialogFooter><Button variant="outline" onClick={() => setNewCustomerOpen(false)}>Abbrechen</Button><Button onClick={() => void createCustomer()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Kunde anlegen</Button></DialogFooter></DialogContent>
      </Dialog>

      <AddHorseModal customerId={selectedCustomer?.id ?? null} customerName={selectedCustomer?.full_name ?? undefined} open={addHorseOpen} onClose={() => { setAddHorseOpen(false); void queryClient.invalidateQueries({ queryKey: ["slim-customer-horse-workspace", user?.id] }); }} />
    </div>
  );
}

function CustomerDetail({ customer, horses, onHorseSelect, onAddHorse, onNavigate }: { customer: Customer; horses: Horse[]; onHorseSelect: (id: string) => void; onAddHorse: () => void; onNavigate: (path: string) => void }) {
  return <div><div className="flex flex-col gap-4 border-b border-[var(--hm-border)] pb-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600"><UserRound className="h-6 w-6" /></div><h2 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-[var(--hm-text-primary)]">{customer.full_name}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--hm-text-secondary)]">{customer.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{customer.email}</span>}{customer.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{customer.phone}</span>}</div>{(customer.street || customer.city) && <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--hm-text-secondary)]"><MapPin className="h-4 w-4" />{[customer.street, customer.zip_code, customer.city].filter(Boolean).join(", ")}</p>}</div><div className="flex gap-2"><Button variant="outline" onClick={() => onNavigate("/kalender?new=true")}>Termin planen</Button><Button onClick={onAddHorse}><Plus className="h-4 w-4" />Pferd</Button></div></div><section className="mt-6"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-[var(--hm-text-primary)]">Pferde</h3><span className="text-sm text-[var(--hm-text-secondary)]">{horses.length}</span></div>{horses.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{horses.map((horse) => <button key={horse.id} onClick={() => onHorseSelect(horse.id)} className="flex min-h-28 items-center gap-4 rounded-2xl border border-[var(--hm-border)] bg-[var(--hm-surface-elevated)] p-4 text-left transition hover:border-orange-500/40 hover:bg-orange-500/5"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600"><Footprints className="h-6 w-6" /></div><span className="min-w-0 flex-1"><span className="block truncate text-base font-semibold text-[var(--hm-text-primary)]">{horse.name}</span><span className="mt-1 block truncate text-sm text-[var(--hm-text-secondary)]">{[horse.breed, horse.gender, horse.birth_year].filter(Boolean).join(" · ")}</span></span><ArrowRight className="h-4 w-4 text-[var(--hm-text-secondary)]" /></button>)}</div> : <div className="mt-3 rounded-2xl border border-dashed border-[var(--hm-border)] p-5"><p className="font-semibold text-[var(--hm-text-primary)]">Noch kein Pferd zugeordnet</p><button className="mt-3 text-sm font-semibold text-orange-600" onClick={onAddHorse}>Pferd hinzufügen</button></div>}</section><section className="mt-6 grid gap-3 sm:grid-cols-3"><QuickLink icon={CalendarDays} label="Termine" onClick={() => onNavigate("/kalender")} /><QuickLink icon={ReceiptText} label="Rechnungen" onClick={() => onNavigate("/rechnungen")} /><QuickLink icon={UserRound} label="Kundenzugang" onClick={() => onNavigate("/kunden")} /></section></div>;
}

function HorseDetail({ horse, owner, onBack, onNavigate }: { horse: Horse; owner: Customer | null; onBack: () => void; onNavigate: (path: string) => void }) {
  return <div><button onClick={onBack} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--hm-text-secondary)] hover:text-orange-600"><ArrowLeft className="h-4 w-4" />{owner?.full_name || "Kunde"}</button><div className="mt-2 flex flex-col gap-4 border-b border-[var(--hm-border)] pb-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-3xl font-bold tracking-[-0.04em] text-[var(--hm-text-primary)]">{horse.name}</h2><p className="mt-2 text-sm text-[var(--hm-text-secondary)]">{[horse.breed, horse.gender, horse.birth_year ? `${new Date().getFullYear() - horse.birth_year} Jahre` : null].filter(Boolean).join(" · ")}</p><p className="mt-1 text-sm text-[var(--hm-text-secondary)]">Besitzer: {owner?.full_name || "Nicht zugeordnet"}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => onNavigate(`/pferd/${horse.id}`)}>Vollständige Akte</Button><Button onClick={() => onNavigate(`/home/hufi-hufanalyse?horse=${horse.id}`)}>Hufi Hufanalyse</Button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><RecordCard label="Nächster Termin" value={horse.next_appointment_due || "Noch nicht geplant"} icon={CalendarDays} /><RecordCard label="Letzte Bearbeitung" value={horse.last_appointment_date || "Noch kein Verlauf"} icon={Footprints} /><RecordCard label="Besonderer Hinweis" value={horse.special_notes || "Keine offenen Hinweise"} icon={FileText} /></div><div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><QuickLink icon={Footprints} label="Verlauf" onClick={() => onNavigate(`/pferd/${horse.id}`)} /><QuickLink icon={Camera} label="Fotos" onClick={() => onNavigate(`/pferd/${horse.id}`)} /><QuickLink icon={FileText} label="Dokumente" onClick={() => onNavigate(`/pferd/${horse.id}`)} /><QuickLink icon={Footprints} label="Hufi Hufanalyse" onClick={() => onNavigate(`/home/hufi-hufanalyse?horse=${horse.id}`)} /><QuickLink icon={CalendarDays} label="Termin planen" onClick={() => onNavigate(`/kalender?horseId=${horse.id}`)} /><QuickLink icon={ReceiptText} label="Rechnungen" onClick={() => onNavigate("/rechnungen")} /></div></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { const id = `customer-${label.toLowerCase().replace(/\W/g, "-")}`; return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function QuickLink({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) { return <button onClick={onClick} className="flex min-h-14 items-center justify-between rounded-xl border border-[var(--hm-border)] bg-[var(--hm-surface)] px-4 text-left text-sm font-semibold text-[var(--hm-text-primary)] transition hover:bg-orange-500/10"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-orange-600" />{label}</span><ArrowRight className="h-4 w-4 text-[var(--hm-text-secondary)]" /></button>; }
function RecordCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) { return <div className="rounded-2xl bg-[var(--hm-surface-elevated)] p-4"><Icon className="h-4 w-4 text-orange-600" /><p className="mt-3 text-xs text-[var(--hm-text-secondary)]">{label}</p><p className="mt-1 text-sm font-semibold text-[var(--hm-text-primary)]">{value}</p></div>; }
function WorkspaceError({ onRetry }: { onRetry: () => void }) { return <section className="hm-card flex min-h-72 flex-col items-start justify-center p-6"><UserRound className="h-7 w-7 text-orange-600" /><h1 className="mt-4 text-xl font-semibold text-[var(--hm-text-primary)]">Kunden und Pferde konnten gerade nicht geladen werden.</h1><p className="mt-2 text-sm text-[var(--hm-text-secondary)]">Bitte prüfe die Verbindung und versuche es erneut.</p><button className="hm-button-primary mt-5" onClick={onRetry}>Erneut versuchen</button></section>; }
