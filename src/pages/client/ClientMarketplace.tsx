import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, MapPin, Tag, Eye, MessageSquare,
  Store, Home as HomeIcon, GraduationCap, Wrench, Package, HelpCircle,
  Sparkles, Lock,
} from "lucide-react";

const LISTING_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  einstellplatz: { label: "Einstellplatz", icon: HomeIcon, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  kurs: { label: "Kurs", icon: GraduationCap, color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  dienstleistung: { label: "Dienstleistung", icon: Wrench, color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  produkt: { label: "Produkt", icon: Package, color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  gesuch: { label: "Gesuch", icon: HelpCircle, color: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  sonstiges: { label: "Sonstiges", icon: Tag, color: "bg-muted text-muted-foreground" },
};

const TYPE_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "einstellplatz", label: "Einstellplätze" },
  { value: "kurs", label: "Kurse" },
  { value: "dienstleistung", label: "Dienstleistungen" },
  { value: "gesuch", label: "Gesuche" },
];

// Demo listings for preview
const DEMO_LISTINGS = [
  { id: "d1", listing_type: "einstellplatz", title: "Offenstall-Platz mit Weide", description: "Artgerechte Haltung in kleiner Gruppe, 24/7 Weidegang, Heufütterung ad lib. Waschplatz, Sattelkammer.", location_plz: "53721", location_name: "Siegburg", price_amount: 380, price_unit: "€", price_label: "/Monat", tags: ["Offenstall", "Weide", "Waschplatz"], view_count: 142, capacity: "2 frei", is_featured: true },
  { id: "d2", listing_type: "kurs", title: "Bodenarbeit-Kurs für Einsteiger", description: "Lerne die Grundlagen der Bodenarbeit. Jedes Level willkommen. Max. 6 Teilnehmer.", location_plz: "50667", location_name: "Köln", price_amount: 89, price_unit: "€", price_label: "/Person", tags: ["Bodenarbeit", "Anfänger"], view_count: 67 },
  { id: "d3", listing_type: "dienstleistung", title: "Mobile Pferdephysiotherapie", description: "Professionelle Physiotherapie für Pferde. Akupunktur, Massage, Lasertherapie. DIPO-zertifiziert.", location_plz: "40210", location_name: "Düsseldorf", price_amount: 95, price_unit: "€", price_label: "/Behandlung", tags: ["Physiotherapie", "Mobil", "DIPO"], view_count: 203 },
  { id: "d4", listing_type: "gesuch", title: "Suche Reitbeteiligung (Dressurlevel A-L)", description: "Suche zuverlässige Reitbeteiligung für 14j. Holsteiner Wallach. 2-3x/Woche.", location_plz: "51067", location_name: "Köln-Holweide", tags: ["Reitbeteiligung", "Dressur", "Wallach"], view_count: 89 },
  { id: "d5", listing_type: "einstellplatz", title: "Box mit Paddock, Reithalle & Reitplatz", description: "4x4m Box mit angrenzender Paddock. Reithalle 20x40m, Dressurviereck. Futtermittelberatung inklusive.", location_plz: "42699", location_name: "Solingen", price_amount: 520, price_unit: "€", price_label: "/Monat", tags: ["Box", "Paddock", "Reithalle"], view_count: 231, capacity: "1 frei" },
  { id: "d6", listing_type: "kurs", title: "Gelassenheitstraining am Wochenende", description: "Zwei Tage intensives Gelassenheitstraining mit Trail-Parcours, Plane, Flatterband u.v.m.", location_plz: "53840", location_name: "Troisdorf", price_amount: 169, price_unit: "€", price_label: "/Wochenende", tags: ["Gelassenheit", "Trail", "Wochenende"], view_count: 45 },
];

export default function ClientMarketplace() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [plzFilter, setPlzFilter] = useState("");

  const filtered = useMemo(() => {
    return DEMO_LISTINGS.filter((l) => {
      const matchType = typeFilter === "all" || l.listing_type === typeFilter;
      const matchSearch =
        !search ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase()) ||
        l.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchPlz = !plzFilter || l.location_plz?.startsWith(plzFilter);
      return matchType && matchSearch && matchPlz;
    });
  }, [search, typeFilter, plzFilter]);

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-24 lg:pb-8">
      {/* Coming Soon Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
        <div className="absolute top-3 right-3">
          <Badge className="bg-amber-500 text-white border-0 gap-1">
            <Sparkles className="h-3 w-3" />
            Coming Soon
          </Badge>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Pferdemarkt</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Einstellplätze, Kurse, Dienstleistungen & Gesuche – alles an einem Ort.
              Der Marktplatz wird bald für alle freigeschaltet.
            </p>
            <p className="text-xs text-primary mt-2 font-medium">
              🔍 Du kannst schon jetzt die Demo-Inserate durchstöbern und testen!
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative w-32">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="PLZ"
            value={plzFilter}
            onChange={(e) => setPlzFilter(e.target.value)}
            className="pl-9"
            maxLength={5}
          />
        </div>
      </div>

      {/* Type chips */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map((f) => (
          <Badge
            key={f.value}
            variant={typeFilter === f.value ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setTypeFilter(f.value)}
          >
            {f.label}
          </Badge>
        ))}
      </div>

      {/* Demo Badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        Demo-Modus – Inserate sind Beispieldaten zum Testen
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((listing) => {
          const cfg = LISTING_TYPE_CONFIG[listing.listing_type] || LISTING_TYPE_CONFIG.sonstiges;
          const TypeIcon = cfg.icon;

          return (
            <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow opacity-90">
              <div className="h-32 bg-muted flex items-center justify-center relative">
                <TypeIcon className="h-10 w-10 text-muted-foreground/20" />
                <Badge className={`absolute top-2 left-2 ${cfg.color} border-0 text-xs`}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {cfg.label}
                </Badge>
                {listing.is_featured && (
                  <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs">⭐ Top</Badge>
                )}
                <div className="absolute bottom-2 right-2">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Lock className="h-2.5 w-2.5" /> Demo
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold line-clamp-1">{listing.title}</h3>
                {listing.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {listing.location_plz && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {listing.location_plz} {listing.location_name}
                    </span>
                  )}
                </div>

                {listing.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {listing.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-primary">
                    {listing.price_amount != null
                      ? `${Number(listing.price_amount).toFixed(2)} ${listing.price_unit}`
                      : "Preis auf Anfrage"}
                    {listing.price_label && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {listing.price_label}
                      </span>
                    )}
                  </span>

                  <Button size="sm" variant="outline" disabled className="gap-1 opacity-60">
                    <MessageSquare className="h-3 w-3" /> Anfragen
                  </Button>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Eye className="h-3 w-3" /> {listing.view_count || 0} Aufrufe
                  {listing.capacity && (
                    <span className="ml-2">· {listing.capacity}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
