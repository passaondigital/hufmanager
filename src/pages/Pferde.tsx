import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import {
  Search,
  Plus,
  ChevronRight,
  Footprints,
  Share2,
  MapPin,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ListPageHeader } from "@/components/shared/ListPageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";

const Pferde = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("mine");

  // Fetch own horses (via clients)
  const { data: ownHorses = [], isLoading: isLoadingOwn } = useQuery({
    queryKey: ["provider-own-horses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get client IDs
      const { data: createdClients } = await supabase
        .from("profiles")
        .select("id")
        .eq("created_by_provider_id", user.id)
        .is("deleted_at", null);

      const { data: grants } = await supabase
        .from("access_grants")
        .select("client_id")
        .eq("provider_id", user.id)
        .eq("is_active", true);

      const clientIds = new Set([
        ...(createdClients || []).map((c) => c.id),
        ...(grants || []).map((g) => g.client_id),
      ]);

      if (clientIds.size === 0) return [];

      const { data, error } = await supabase
        .from("horses")
        .select("id, name, breed, photo_url, owner_id, readable_id, hoof_type, hoof_protection, color, birth_year, gender, location_name")
        .in("owner_id", Array.from(clientIds))
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;

      // Get owner names
      const ownerIds = [...new Set((data || []).map((h) => h.owner_id))];
      let ownerMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        (profiles || []).forEach((p) => {
          ownerMap[p.id] = p.full_name || "Unbekannt";
        });
      }

      return (data || []).map((h) => ({
        ...h,
        owner_name: ownerMap[h.owner_id] || "Unbekannt",
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch shared horses (via horse_partner_access)
  const { data: sharedHorses = [] } = useQuery({
    queryKey: ["provider-shared-horses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: access, error: accessErr } = await supabase
        .from("horse_partner_access")
        .select("horse_id, partner_name, can_view_basic, can_view_medical")
        .eq("partner_profile_id", user.id)
        .eq("is_active", true)
        .eq("status", "active");

      if (accessErr) throw accessErr;
      if (!access || access.length === 0) return [];

      const horseIds = access.map((a) => a.horse_id);
      const { data: horses, error } = await supabase
        .from("horses")
        .select("id, name, breed, photo_url, owner_id, readable_id, hoof_type, hoof_protection, color, birth_year, gender, location_name")
        .in("id", horseIds)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;

      // Owner names
      const ownerIds = [...new Set((horses || []).map((h) => h.owner_id))];
      let ownerMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        (profiles || []).forEach((p) => {
          ownerMap[p.id] = p.full_name || "Unbekannt";
        });
      }

      const accessMap = Object.fromEntries(access.map((a) => [a.horse_id, a]));

      return (horses || []).map((h) => ({
        ...h,
        owner_name: ownerMap[h.owner_id] || "Unbekannt",
        access: accessMap[h.id],
      }));
    },
    enabled: !!user?.id,
  });

  const activeHorses = ownHorses.filter((h) => !h.hoof_protection || h.hoof_protection !== "inaktiv");

  const animatedTotal = useAnimatedCounter(ownHorses.length, 600, ownHorses.length > 0);
  const animatedActive = useAnimatedCounter(activeHorses.length, 600, activeHorses.length > 0);
  const animatedShared = useAnimatedCounter(sharedHorses.length, 600, sharedHorses.length > 0);

  const getAge = (birthYear: number | null) => {
    if (!birthYear) return null;
    return new Date().getFullYear() - birthYear;
  };

  const filterHorses = (horses: any[]) =>
    horses.filter(
      (h) =>
        h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.readable_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const HorseCard = ({ horse, showAccess }: { horse: any; showAccess?: boolean }) => {
    const age = getAge(horse.birth_year);
    return (
      <Card
        className="hover:shadow-lg transition-all cursor-pointer group animate-slide-up"
        onClick={() => navigate(`/pferd/${horse.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
              {horse.photo_url ? (
                <img src={horse.photo_url} alt={horse.name || "Pferd"} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <Footprints className="h-6 w-6 text-primary/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{horse.name || "Unbenannt"}</span>
                {horse.readable_id && (
                  <Badge variant="outline" className="font-mono text-xs">#{horse.readable_id}</Badge>
                )}
                {horse.hoof_protection && (
                  <Badge variant="secondary" className="text-[10px]">{horse.hoof_protection}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {[horse.breed, age ? `${age} J.` : null, horse.gender].filter(Boolean).join(" · ") || "Keine Details"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Besitzer: {horse.owner_name}</p>
              {horse.location_name && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{horse.location_name}</span>
                </div>
              )}
              {showAccess && horse.access && (
                <div className="flex gap-1 mt-1">
                  {horse.access.can_view_basic && <Badge variant="outline" className="text-[10px]">Stammdaten</Badge>}
                  {horse.access.can_view_medical && <Badge variant="outline" className="text-[10px]">Medizin</Badge>}
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-responsive-h2 text-foreground">Pferde</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {ownHorses.length} eigene · {sharedHorses.length} freigegeben
          </p>
        </div>
        <Button className="gap-2 min-h-[44px]" onClick={() => navigate("/aufnahme")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Neues Pferd</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pferd suchen (Name, Rasse, Besitzer, ID)..."
          className="pl-10 h-11"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-tile rounded-xl border border-border bg-card p-3 text-center">
          <Footprints className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{animatedTotal}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pferde gesamt</p>
        </div>
        <div className="card-tile rounded-xl border border-border bg-card p-3 text-center">
          <span className="text-base block mb-1">✅</span>
          <p className="text-xl font-bold text-foreground">{animatedActive}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Aktiv</p>
        </div>
        {sharedHorses.length > 0 && (
          <div className="card-tile rounded-xl border border-border bg-card p-3 text-center">
            <Share2 className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{animatedShared}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Freigegeben</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="mine" className="flex-1">Meine Pferde ({ownHorses.length})</TabsTrigger>
          <TabsTrigger value="shared" className="flex-1">Freigegeben für mich ({sharedHorses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-3 mt-4">
          {filterHorses(ownHorses).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Footprints className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Keine Pferde gefunden." : "Noch keine Pferde angelegt."}
                </p>
                {!searchTerm && (
                  <Button className="mt-4" onClick={() => navigate("/aufnahme")}>Erstes Pferd anlegen</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filterHorses(ownHorses).map((horse, i) => (
              <div key={horse.id} style={{ animationDelay: `${i * 30}ms` }}>
                <HorseCard horse={horse} />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="shared" className="space-y-3 mt-4">
          {filterHorses(sharedHorses).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Share2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Keine freigegebenen Pferde gefunden." : "Noch keine Pferde für dich freigegeben."}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Pferdebesitzer oder andere Hufbearbeiter können dir Pferde über HM Connect freigeben.
                </p>
              </CardContent>
            </Card>
          ) : (
            filterHorses(sharedHorses).map((horse, i) => (
              <div key={horse.id} style={{ animationDelay: `${i * 30}ms` }}>
                <HorseCard horse={horse} showAccess />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Pferde;
