import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, MapPin, Stethoscope, Phone, Globe,
  AlertTriangle, CheckCircle, ExternalLink
} from "lucide-react";
import { EQUINE_CLINICS_DACH } from "@/data/equine-clinics-seed";
import { haversineDistance } from "@/lib/geo";

const SPECIALIZATION_LABELS: Record<string, string> = {
  orthopaedie: "Orthopädie",
  chirurgie: "Chirurgie",
  innere: "Innere Medizin",
  zahnheilkunde: "Zahnheilkunde",
  reproduktion: "Reproduktion",
  dermatologie: "Dermatologie",
  augenheilkunde: "Augenheilkunde",
  sportmedizin: "Sportmedizin",
  bildgebung: "Bildgebung",
};

const CLINIC_TYPE_LABELS: Record<string, string> = {
  praxis: "Praxis",
  klinik: "Klinik",
  fahrpraxis: "Fahrpraxis",
  uniklinik: "Universitätsklinik",
};

const COUNTRY_FLAGS: Record<string, string> = {
  DE: "🇩🇪",
  AT: "🇦🇹",
  CH: "🇨🇭",
};

export default function TierarztFinder() {
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);

  // Load DB vet_profiles
  const { data: vetProfiles } = useQuery({
    queryKey: ["vet-finder-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vet_profiles")
        .select("id, display_name, clinic_name, specializations, clinic_type, description, address_city, address_state, phone, email, website, emergency_service, photo_url, is_verified, accepts_new_patients, latitude, longitude")
        .eq("is_public", true)
        .limit(100);
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Load DB equine_clinics
  const { data: dbClinics } = useQuery({
    queryKey: ["equine-clinics-db"],
    queryFn: async () => {
      const { data } = await supabase
        .from("equine_clinics")
        .select("id, name, city, state, country, clinic_type, latitude, longitude, specializations, emergency_service, description, phone, website, photo_url, is_verified")
        .eq("is_active", true)
        .limit(100);
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Combine vet profiles + clinics into unified list
  const allResults = useMemo(() => {
    const items: any[] = [];

    // Add vet profiles
    (vetProfiles || []).forEach((v: any) => {
      items.push({
        id: v.id,
        name: v.display_name,
        clinic: v.clinic_name,
        type: v.clinic_type || "praxis",
        city: v.address_city,
        state: v.address_state,
        country: "DE",
        specializations: v.specializations || [],
        emergency: v.emergency_service,
        description: v.description,
        phone: v.phone,
        website: v.website,
        photo: v.photo_url,
        verified: v.is_verified,
        lat: v.latitude,
        lon: v.longitude,
        source: "profile",
      });
    });

    // Add DB clinics
    (dbClinics || []).forEach((c: any) => {
      items.push({
        id: c.id,
        name: c.name,
        clinic: null,
        type: c.clinic_type || "klinik",
        city: c.city,
        state: c.state,
        country: c.country || "DE",
        specializations: c.specializations || [],
        emergency: c.emergency_service,
        description: c.description,
        phone: c.phone,
        website: c.website,
        photo: c.photo_url,
        verified: c.is_verified,
        lat: c.latitude,
        lon: c.longitude,
        source: "clinic",
      });
    });

    // If no DB clinics yet, use seed data as fallback
    if (!dbClinics?.length) {
      EQUINE_CLINICS_DACH.forEach((c, idx) => {
        items.push({
          id: `seed-${idx}`,
          name: c.name,
          clinic: null,
          type: c.type,
          city: c.city,
          state: c.state,
          country: c.country,
          specializations: c.specializations,
          emergency: c.emergency,
          description: c.description,
          phone: null,
          website: null,
          photo: null,
          verified: true,
          lat: c.lat,
          lon: c.lon,
          source: "seed",
        });
      });
    }

    return items;
  }, [vetProfiles, dbClinics]);

  // Filter
  const filtered = useMemo(() => {
    let results = allResults;

    if (filterEmergency) results = results.filter(r => r.emergency);
    if (filterType) results = results.filter(r => r.type === filterType);
    if (filterSpec) results = results.filter(r => r.specializations.includes(filterSpec));
    if (filterCountry) results = results.filter(r => r.country === filterCountry);

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(r =>
        r.name?.toLowerCase().includes(s) ||
        r.clinic?.toLowerCase().includes(s) ||
        r.city?.toLowerCase().includes(s) ||
        r.state?.toLowerCase().includes(s) ||
        r.description?.toLowerCase().includes(s)
      );
    }

    return results;
  }, [allResults, filterEmergency, filterType, filterSpec, filterCountry, search]);

  const countries = [...new Set(allResults.map(r => r.country))];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-b from-emerald-50 to-background dark:from-emerald-950/30 dark:to-background border-b">
        <div className="max-w-5xl mx-auto px-6 py-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm">
            <Stethoscope className="h-4 w-4" />
            <span>Pferdetierärzte & Kliniken im DACH-Raum</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Tierarzt & Klinik Finder</h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-5 text-sm">
            Finde spezialisierte Pferdetierärzte und Kliniken in deiner Nähe.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-12 h-12 text-base rounded-xl"
              placeholder="Stadt, Name oder Spezialisierung suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          <Badge
            variant={filterEmergency ? "destructive" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilterEmergency(!filterEmergency)}
          >
            <AlertTriangle className="h-3 w-3 mr-1" /> Notdienst
          </Badge>
          <div className="h-6 w-px bg-border mx-1" />
          {countries.length > 1 && countries.map(c => (
            <Badge
              key={c}
              variant={filterCountry === c ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterCountry(filterCountry === c ? null : c)}
            >
              {COUNTRY_FLAGS[c] || ""} {c}
            </Badge>
          ))}
          {countries.length > 1 && <div className="h-6 w-px bg-border mx-1" />}
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

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} Ergebnis{filtered.length !== 1 ? "se" : ""}
        </p>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Stethoscope className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold mb-1">Keine Ergebnisse</h2>
            <p className="text-sm text-muted-foreground">Versuche eine andere Suche oder weniger Filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((item: any) => (
              <ClinicCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 text-center">
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
  );
}

function ClinicCard({ item }: { item: any }) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {item.photo ? (
            <img src={item.photo} alt={item.name} className="h-12 w-12 rounded-xl object-cover shrink-0" loading="lazy" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold truncate">{item.name}</h3>
              {item.verified && <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            </div>
            {item.clinic && <p className="text-xs text-muted-foreground truncate">{item.clinic}</p>}
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>
                {COUNTRY_FLAGS[item.country] || ""}{" "}
                {[item.city, item.state].filter(Boolean).join(", ")}
              </span>
              <span className="mx-1">·</span>
              <span>{CLINIC_TYPE_LABELS[item.type] || item.type}</span>
            </div>
          </div>
          {item.emergency && (
            <Badge variant="destructive" className="text-[10px] shrink-0">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Notdienst
            </Badge>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
        )}

        {item.specializations?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.specializations.slice(0, 5).map((s: string) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {SPECIALIZATION_LABELS[s] || s}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2 pt-2 border-t">
          {item.phone && (
            <a href={`tel:${item.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Phone className="h-3 w-3" /> Anrufen
            </a>
          )}
          {item.website && (
            <a href={item.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
          {item.source === "profile" && (
            <a href={`/vet/${item.id}`} className="text-xs text-primary hover:underline flex items-center gap-1 ml-auto">
              <ExternalLink className="h-3 w-3" /> Profil
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
