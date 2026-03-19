import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, MapPin, Tag, Plus, Eye, MessageSquare,
  Store, Home as HomeIcon, GraduationCap, Wrench, Package, HelpCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ClientInquiryDialog } from "@/components/client/marketplace/ClientInquiryDialog";

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
  { value: "produkt", label: "Produkte" },
  { value: "gesuch", label: "Gesuche" },
];

export default function ClientMarketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [plzFilter, setPlzFilter] = useState("");
  const [inquiryListing, setInquiryListing] = useState<string | null>(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["client-marketplace-listings", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("client_marketplace_listings")
        .select("*")
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("listing_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return listings.filter((l: any) => {
      const matchSearch =
        !search ||
        l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase()) ||
        l.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
      const matchPlz = !plzFilter || l.location_plz?.startsWith(plzFilter);
      return matchSearch && matchPlz;
    });
  }, [listings, search, plzFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Pferdemarkt
          </h1>
          <p className="text-sm text-muted-foreground">
            Einstellplätze, Kurse, Dienstleistungen & mehr finden
          </p>
        </div>
        <Button onClick={() => navigate("/client-marketplace/create")}>
          <Plus className="h-4 w-4 mr-1" /> Inserat erstellen
        </Button>
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

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Keine Inserate gefunden</p>
          <p className="text-xs text-muted-foreground mt-1">Versuche andere Filter oder erstelle ein eigenes Inserat</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing: any) => {
            const cfg = LISTING_TYPE_CONFIG[listing.listing_type] || LISTING_TYPE_CONFIG.sonstiges;
            const TypeIcon = cfg.icon;
            const isOwn = listing.owner_id === user?.id;

            return (
              <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Image or placeholder */}
                <div className="h-32 bg-muted flex items-center justify-center relative">
                  {listing.images?.[0] ? (
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <TypeIcon className="h-10 w-10 text-muted-foreground/20" />
                  )}
                  <Badge className={`absolute top-2 left-2 ${cfg.color} border-0 text-xs`}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>
                  {listing.is_featured && (
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs">⭐ Top</Badge>
                  )}
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
                      {listing.tags.slice(0, 3).map((tag: string) => (
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

                    {!isOwn && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInquiryListing(listing.id)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" /> Anfragen
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Eye className="h-3 w-3" /> {listing.view_count || 0} Aufrufe
                    {listing.capacity && (
                      <span className="ml-2">· {listing.capacity} verfügbar</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inquiry Dialog */}
      <ClientInquiryDialog
        listingId={inquiryListing}
        open={!!inquiryListing}
        onOpenChange={(open) => !open && setInquiryListing(null)}
      />
    </div>
  );
}
