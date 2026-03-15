import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, UserPlus, ArrowLeft, User } from "lucide-react";
import { PARTNER_TYPE_OPTIONS, getPartnerTypeConfig } from "@/lib/partnerTypes";
import { haversineDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SearchProviders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<string>("all");
  const [plzSearch, setPlzSearch] = useState("");
  const [radiusKm, setRadiusKm] = useState(25);
  const [inviteTarget, setInviteTarget] = useState<any>(null);
  const [selectedHorseId, setSelectedHorseId] = useState("");

  // Load discoverable providers
  const { data: providers, isLoading } = useQuery({
    queryKey: ["discoverable-providers", searchType],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city, zip_code, latitude, longitude, service_types, specializations, bio, service_radius_km")
        .eq("is_discoverable", true)
        .is("deleted_at", null)
        .limit(50);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Load user's horses for invite dialog
  const { data: myHorses } = useQuery({
    queryKey: ["my-horses-for-invite", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("id, name")
        .eq("owner_id", user!.id)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Filter and sort providers
  const filtered = useMemo(() => {
    if (!providers) return [];
    let result = providers;

    // Filter by type
    if (searchType !== "all") {
      result = result.filter((p: any) =>
        p.service_types?.includes(searchType)
      );
    }

    // Filter + sort by PLZ proximity
    if (plzSearch.length >= 2) {
      result = result.filter((p: any) => {
        if (p.zip_code && p.zip_code.startsWith(plzSearch.substring(0, 2))) return true;
        if (p.city && p.city.toLowerCase().includes(plzSearch.toLowerCase())) return true;
        return false;
      });
    }

    // Sort by distance if lat/lng available
    if (plzSearch && result.length > 0) {
      // Simple PLZ prefix match sorting
      result.sort((a: any, b: any) => {
        const aMatch = a.zip_code?.startsWith(plzSearch) ? 0 : 1;
        const bMatch = b.zip_code?.startsWith(plzSearch) ? 0 : 1;
        return aMatch - bMatch;
      });
    }

    return result;
  }, [providers, searchType, plzSearch, radiusKm]);

  const handleInvite = async () => {
    if (!selectedHorseId || !inviteTarget || !user) return;
    try {
      // Insert horse_partner_access with owner_approved=true (owner is inviting)
      const { error } = await supabase.from("horse_partner_access").insert({
        horse_id: selectedHorseId,
        partner_profile_id: inviteTarget.id,
        partner_name: inviteTarget.full_name,
        partner_type: inviteTarget.service_types?.[0] || "other",
        invited_by_client_id: user.id,
        status: "active",
        is_active: true,
        can_view_basic: true,
        can_view_hoof_history: true,
        can_view_medical: false,
        can_add_treatment_notes: true,
        can_create_appointments: false,
        owner_approved: true,
        owner_approved_at: new Date().toISOString(),
        granted_by: user.id,
        invited_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Notify provider
      await supabase.from("notifications").insert({
        user_id: inviteTarget.id,
        title: "🤝 Neuer Pferde-Zugriff",
        message: `Du wurdest als Partner für ein Pferd eingeladen.`,
        type: "horse_access_granted",
        link: "/partner-home",
      });

      toast.success(`${inviteTarget.full_name} eingeladen`);
      setInviteTarget(null);
      setSelectedHorseId("");
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Einladen");
    }
  };

  const typeFilters = [
    { value: "all", label: "Alle" },
    ...PARTNER_TYPE_OPTIONS.slice(0, 8),
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Dienstleister finden</h1>
            <p className="text-sm text-muted-foreground">Finde Fachpartner in deiner Nähe</p>
          </div>
        </div>

        {/* Search Controls */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Type Filter Chips */}
            <div className="flex overflow-x-auto gap-1.5 scrollbar-hide">
              {typeFilters.map((f) => {
                const isActive = searchType === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setSearchType(f.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border",
                      isActive
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "text-muted-foreground border-border hover:bg-secondary"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Location Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={plzSearch}
                  onChange={(e) => setPlzSearch(e.target.value)}
                  placeholder="PLZ oder Ort eingeben..."
                  className="pl-9"
                />
              </div>
              <Select value={String(radiusKm)} onValueChange={(v) => setRadiusKm(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="25">25 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">Keine Dienstleister gefunden</p>
              <p className="text-xs text-muted-foreground mt-1">Versuche einen anderen Ort oder eine andere Fachrichtung.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{filtered.length} Ergebnis{filtered.length !== 1 ? "se" : ""}</p>
            {filtered.map((provider: any) => {
              const mainType = provider.service_types?.[0];
              const config = mainType ? getPartnerTypeConfig(mainType) : null;
              return (
                <Card key={provider.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {provider.avatar_url ? (
                            <img src={provider.avatar_url} className="h-12 w-12 rounded-full object-cover" alt="" />
                          ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{provider.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {config && (
                              <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                                <config.icon className={`h-3 w-3 ${config.color}`} />
                                {config.label}
                              </Badge>
                            )}
                            {provider.city && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" /> {provider.city}
                                {provider.zip_code && ` · ${provider.zip_code}`}
                              </span>
                            )}
                          </div>
                          {provider.specializations?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {provider.specializations.slice(0, 3).map((s: string) => (
                                <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                              ))}
                            </div>
                          )}
                          {provider.bio && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{provider.bio}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="gap-1.5 flex-1" onClick={() => setInviteTarget(provider)}>
                        <UserPlus className="h-3.5 w-3.5" /> Für Pferd einladen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Dialog: Select Horse */}
      <Dialog open={!!inviteTarget} onOpenChange={() => setInviteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Für welches Pferd einladen?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {inviteTarget?.full_name} wird als Partner eingeladen.
            </p>
            <Select value={selectedHorseId} onValueChange={setSelectedHorseId}>
              <SelectTrigger>
                <SelectValue placeholder="Pferd wählen..." />
              </SelectTrigger>
              <SelectContent>
                {myHorses?.map((h: any) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteTarget(null)}>Abbrechen</Button>
              <Button disabled={!selectedHorseId} onClick={handleInvite}>Einladen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
