import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, Check, ChevronRight, Footprints, Search } from "lucide-react";
import { LTZAnalysisWizard } from "@/components/hoof-analysis/LTZAnalysisWizard";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AnalysisHorse = { id: string; name: string; breed: string | null; owner_id: string; readable_id: string | null; ownerName: string | null };

const steps = ["Beobachtung", "Bewegung", "Hufe", "Fotos", "Zusammenfassung"];

export function SlimHoofAnalysisScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(searchParams.get("horse"));
  const [wizardOpen, setWizardOpen] = useState(false);

  const horseQuery = useQuery({
    queryKey: ["slim-analysis-horses", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as AnalysisHorse[];
      const [grants, managedCustomers] = await Promise.all([
        supabase.from("access_grants").select("client_id").eq("provider_id", user.id).eq("is_active", true).eq("status", "active"),
        supabase.from("profiles").select("id").eq("created_by_provider_id", user.id).is("deleted_at", null),
      ]);
      if (grants.error || managedCustomers.error) throw new Error("HORSE_LOAD_FAILED");
      const ownerIds = [...new Set([
        ...(grants.data ?? []).map((grant) => grant.client_id),
        ...(managedCustomers.data ?? []).map((profile) => profile.id),
      ])];
      if (!ownerIds.length) return [] as AnalysisHorse[];
      const [horsesResult, profilesResult] = await Promise.all([
        supabase.from("horses").select("id, name, breed, owner_id, readable_id").in("owner_id", ownerIds).is("deleted_at", null).order("name"),
        supabase.from("profiles").select("id, full_name").in("id", ownerIds),
      ]);
      if (horsesResult.error || profilesResult.error) throw new Error("HORSE_LOAD_FAILED");
      const owners = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
      return (horsesResult.data ?? []).map((horse) => ({ ...horse, ownerName: owners.get(horse.owner_id) ?? null })) as AnalysisHorse[];
    },
  });

  const horses = horseQuery.data ?? [];
  useEffect(() => {
    const requestedHorse = searchParams.get("horse");
    if (requestedHorse && horses.some((horse) => horse.id === requestedHorse)) setSelectedHorseId(requestedHorse);
    else if (!selectedHorseId && horses[0]) setSelectedHorseId(horses[0].id);
  }, [horses, searchParams, selectedHorseId]);
  const selectedHorse = horses.find((horse) => horse.id === selectedHorseId) ?? null;
  const filteredHorses = useMemo(() => {
    const term = search.toLocaleLowerCase("de").trim();
    if (!term) return horses;
    return horses.filter((horse) => [horse.name, horse.ownerName, horse.readable_id].some((value) => value?.toLocaleLowerCase("de").includes(term)));
  }, [horses, search]);

  return (
    <div className="space-y-5">
      <header><p className="text-sm font-medium text-[var(--hm-text-secondary)]">Fachwerkzeug in der Pferdeakte</p><h1 className="mt-1 text-[clamp(1.75rem,3vw,2rem)] font-bold tracking-[-0.035em] text-[var(--hm-text-primary)]">Hufi Hufanalyse</h1></header>
      <div className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-[var(--hm-border)] bg-[var(--hm-surface)] shadow-[var(--hm-shadow-card)] lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="border-b border-[var(--hm-border)] lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--hm-border)] p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--hm-text-secondary)]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pferd suchen" className="pl-9" /></div></div>
          <div className="max-h-72 overflow-y-auto p-2 lg:max-h-[calc(100vh-16rem)]">
            {horseQuery.isLoading ? <p className="p-4 text-sm text-[var(--hm-text-secondary)]">Pferde werden geladen…</p> : filteredHorses.map((horse) => <button key={horse.id} onClick={() => setSelectedHorseId(horse.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${horse.id === selectedHorseId ? "bg-orange-600 text-white" : "hover:bg-orange-500/10"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${horse.id === selectedHorseId ? "bg-white/15" : "bg-orange-500/10 text-orange-600"}`}><Footprints className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{horse.name}</span><span className={`block truncate text-xs ${horse.id === selectedHorseId ? "text-orange-50" : "text-[var(--hm-text-secondary)]"}`}>{horse.ownerName || horse.breed || "Pferdeakte"}</span></span></button>)}
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {!selectedHorse ? (
            <div className="flex min-h-80 flex-col items-start justify-center"><Footprints className="h-8 w-8 text-orange-600" /><h2 className="mt-4 text-xl font-semibold text-[var(--hm-text-primary)]">Noch kein Pferd ausgewählt</h2><p className="mt-2 text-sm text-[var(--hm-text-secondary)]">Wähle ein Pferd aus der Akte oder lege zuerst ein Pferd an.</p><button className="hm-button-primary mt-5" onClick={() => navigate("/home/kunden")}>Kunden & Pferde öffnen</button></div>
          ) : (
            <div className="mx-auto max-w-4xl">
              <div className="flex flex-col gap-4 border-b border-[var(--hm-border)] pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-orange-600">Hufi Hufanalyse</p><h2 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-[var(--hm-text-primary)]">{selectedHorse.name}</h2><p className="mt-2 text-sm text-[var(--hm-text-secondary)]">{[selectedHorse.breed, selectedHorse.ownerName].filter(Boolean).join(" · ")}</p></div><button className="hm-button-secondary" onClick={() => navigate(`/pferd/${selectedHorse.id}`)}>Pferdeakte<ArrowRight className="h-4 w-4" /></button></div>

              <div className="mt-7 grid gap-2 sm:grid-cols-5">{steps.map((step, index) => <div key={step} className="relative rounded-xl bg-[var(--hm-surface-elevated)] p-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">{index + 1}</span><p className="mt-2 text-xs font-semibold text-[var(--hm-text-primary)]">{step}</p></div>)}</div>

              <section className="mt-7 rounded-2xl bg-[var(--hm-surface-elevated)] p-5 sm:p-6"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600"><Footprints className="h-6 w-6" /></div><h3 className="mt-5 text-xl font-semibold text-[var(--hm-text-primary)]">Neue Analyse beginnen</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--hm-text-secondary)]">Erfasse Bewegung, Hufmerkmale, Bilder und fachliche Zusammenfassung direkt im Kontext von {selectedHorse.name}. Die bestehende regelbasierte Fachlogik bleibt unverändert.</p><div className="mt-5 flex flex-wrap gap-2"><button className="hm-button-primary" onClick={() => setWizardOpen(true)}>Analyse starten<ChevronRight className="h-4 w-4" /></button><button className="hm-button-secondary" onClick={() => navigate(`/pferd/${selectedHorse.id}`)}><Camera className="h-4 w-4" />Bilder & Verlauf</button></div></section>

              <div className="mt-5 grid gap-3 sm:grid-cols-3"><AnalysisValue icon={Check} label="Speicherung" value="In der Pferdeakte" /><AnalysisValue icon={Camera} label="Bilder" value="Direkt am Pferd" /><AnalysisValue icon={Footprints} label="Verlauf" value="Jederzeit wieder aufrufbar" /></div>
            </div>
          )}
        </main>
      </div>

      {selectedHorse && <LTZAnalysisWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} horseId={selectedHorse.id} horseName={selectedHorse.name} />}
    </div>
  );
}

function AnalysisValue({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) { return <div className="rounded-2xl border border-[var(--hm-border)] bg-[var(--hm-surface)] p-4"><Icon className="h-4 w-4 text-orange-600" /><p className="mt-3 text-xs text-[var(--hm-text-secondary)]">{label}</p><p className="mt-1 text-sm font-semibold text-[var(--hm-text-primary)]">{value}</p></div>; }
