import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, MapPin, Stethoscope, Phone, Globe, Clock,
  AlertTriangle, CheckCircle, Filter, ChevronRight
} from "lucide-react";
import { Helmet } from "react-helmet";

const SPECIALIZATION_LABELS: Record<string, string> = {
  orthopaedie: "Orthopädie",
  chirurgie: "Chirurgie",
  innere: "Innere Medizin",
  zahnheilkunde: "Zahnheilkunde",
  reproduktion: "Reproduktion",
  dermatologie: "Dermatologie",
  augenheilkunde: "Augenheilkunde",
  sportmedizin: "Sportmedizin",
};

const CLINIC_TYPE_LABELS: Record<string, string> = {
  praxis: "Praxis",
  klinik: "Klinik",
  fahrpraxis: "Fahrpraxis",
  uniklinik: "Universitätsklinik",
};

export default function TierarztFinder() {
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterEmergency, setFilterEmergency] = useState(false);

  const { data: vets, isLoading } = useQuery({
    queryKey: ["vet-finder", filterSpec, filterType, filterEmergency],
    queryFn: async () => {
      let query = supabase
        .from("vet_profiles")
        .select("id, display_name, clinic_name, specializations, clinic_type, description, address_city, address_state, phone, email, website, emergency_service, photo_url, is_verified, accepts_new_patients")
        .eq("is_public", true)
        .order("is_verified", { ascending: false });

      if (filterEmergency) {
        query = query.eq("emergency_service", true);
      }
      if (filterType) {
        query = query.eq("clinic_type", filterType);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      let results = data || [];
      
      // Client-side filter for specializations (array contains) and search
      if (filterSpec) {
        results = results.filter((v: any) => v.specializations?.includes(filterSpec));
      }
      if (search) {
        const s = search.toLowerCase();
        results = results.filter((v: any) =>
          v.display_name?.toLowerCase().includes(s) ||
          v.clinic_name?.toLowerCase().includes(s) ||
          v.address_city?.toLowerCase().includes(s) ||
          v.address_state?.toLowerCase().includes(s)
        );
      }

      return results;
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <>
      <Helmet>
        <title>Tierarzt-Finder | HufManager – Pferdetierärzte in DACH</title>
        <meta name="description" content="Finde spezialisierte Pferdetierärzte und Pferdekliniken in Deutschland, Österreich und der Schweiz. Mit Notdienst-Filter, Spezialisierungen und direkter Kontaktaufnahme." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-gradient-to-b from-emerald-50 to-background dark:from-emerald-950/30 dark:to-background border-b">
          <div className="max-w-5xl mx-auto px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm">
              <Stethoscope className="h-4 w-4" />
              <span>Pferdetierärzte im DACH-Raum</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Tierarzt-Finder</h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Finde spezialisierte Pferdetierärzte und Kliniken in deiner Nähe.
              Alle Profile sind verifiziert und mit dem HufManager-Netzwerk verbunden.
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-12 h-12 text-base rounded-xl"
                placeholder="Stadt, Name oder Spezialisierung suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge
              variant={filterEmergency ? "destructive" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterEmergency(!filterEmergency)}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Notdienst
            </Badge>

            <div className="h-6 w-px bg-border mx-1" />

            {Object.entries(CLINIC_TYPE_LABELS).map(([key, label]) => (
              <Badge
                key={key}
                variant={filterType === key ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterType(filterType === key ? null : key)}
              >
                {label}
              </Badge>
            ))}

            <div className="h-6 w-px bg-border mx-1" />

            {Object.entries(SPECIALIZATION_LABELS).map(([key, label]) => (
              <Badge
                key={key}
                variant={filterSpec === key ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterSpec(filterSpec === key ? null : key)}
              >
                {label}
              </Badge>
            ))}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Stethoscope className="h-8 w-8 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">Lade Tierärzte...</p>
            </div>
          ) : !vets?.length ? (
            <div className="text-center py-16">
              <Stethoscope className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <h2 className="text-lg font-semibold mb-1">Noch keine Tierärzte registriert</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Der Tierarzt-Finder wächst. Du bist Pferdetierarzt/ärztin?{" "}
                <a href="/auth" className="text-primary hover:underline">Jetzt kostenlos registrieren</a>{" "}
                und dein Profil erstellen.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vets.map((vet: any) => (
                <Card key={vet.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {vet.photo_url ? (
                        <img
                          src={vet.photo_url}
                          alt={vet.display_name}
                          className="h-14 w-14 rounded-xl object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <Stethoscope className="h-6 w-6 text-emerald-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold truncate">{vet.display_name}</h3>
                          {vet.is_verified && (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        {vet.clinic_name && (
                          <p className="text-xs text-muted-foreground truncate">{vet.clinic_name}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{[vet.address_city, vet.address_state].filter(Boolean).join(", ") || "DACH"}</span>
                          <span className="mx-1">·</span>
                          <span>{CLINIC_TYPE_LABELS[vet.clinic_type] || vet.clinic_type}</span>
                        </div>
                      </div>
                      {vet.emergency_service && (
                        <Badge variant="destructive" className="text-[10px] shrink-0">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          Notdienst
                        </Badge>
                      )}
                    </div>

                    {/* Specializations */}
                    {vet.specializations?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {vet.specializations.map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">
                            {SPECIALIZATION_LABELS[s] || s}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Contact */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                      {vet.phone && (
                        <a href={`tel:${vet.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {vet.phone}
                        </a>
                      )}
                      {vet.website && (
                        <a href={vet.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Website
                        </a>
                      )}
                      {!vet.accepts_new_patients && (
                        <Badge variant="secondary" className="text-[10px]">Keine neuen Patienten</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 text-center">
            <Card className="inline-block">
              <CardContent className="p-6 text-center">
                <Stethoscope className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <h3 className="text-base font-semibold mb-1">Du bist Pferdetierarzt/-ärztin?</h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-sm">
                  Registriere dich kostenlos und erhalte Zugang zu strukturierten Hufdaten deiner Patienten.
                </p>
                <a href="/auth">
                  <Button>Kostenlos registrieren</Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
