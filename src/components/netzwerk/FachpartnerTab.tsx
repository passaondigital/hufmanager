import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Stethoscope, Plus, Heart } from "lucide-react";
import { getPartnerTypeConfig, PARTNER_TYPE_OPTIONS } from "@/lib/partnerTypes";
import { InvitePartnerModal } from "@/components/horse-detail/InvitePartnerModal";
import { cn } from "@/lib/utils";

const PROFESSION_FILTERS = [
  { value: "all", label: "Alle" },
  ...PARTNER_TYPE_OPTIONS.filter((o) => o.value !== "other"),
  { value: "other", label: "Sonstige", icon: undefined, color: "" },
];

export function FachpartnerTab() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState<string>("");
  const [selectedHorseName, setSelectedHorseName] = useState<string>("");

  const { data: partnerAccess = [], isLoading } = useQuery({
    queryKey: ["fachpartner-netzwerk", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("*, horses!inner(id, name, readable_id)")
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: horses = [] } = useQuery({
    queryKey: ["provider-horses-for-invite", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("horses")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Group by partner
  const partnerMap = new Map<string, { name: string; email: string; type: string; horses: { id: string; name: string; readableId?: string }[] }>();
  
  partnerAccess.forEach((access: any) => {
    const key = access.partner_email || access.partner_profile_id || access.id;
    if (!partnerMap.has(key)) {
      partnerMap.set(key, {
        name: access.partner_name || access.partner_email || "Unbekannt",
        email: access.partner_email || "",
        type: access.partner_type || "other",
        horses: [],
      });
    }
    const entry = partnerMap.get(key)!;
    const horse = access.horses as any;
    if (horse) {
      entry.horses.push({
        id: horse.id,
        name: horse.name,
        readableId: horse.readable_id,
      });
    }
  });

  const partners = Array.from(partnerMap.values());
  
  // Apply profession filter
  const professionFiltered = professionFilter === "all" 
    ? partners 
    : partners.filter((p) => p.type === professionFilter);

  const filtered = professionFiltered.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by type
  const grouped = filtered.reduce((acc, p) => {
    const type = p.type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(p);
    return acc;
  }, {} as Record<string, typeof filtered>);

  const handleInviteForHorse = (horseId: string, horseName: string) => {
    setSelectedHorseId(horseId);
    setSelectedHorseName(horseName);
    setInviteModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Fachpartner suchen..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {horses.length > 0 && (
          <Button className="gap-2" onClick={() => handleInviteForHorse(horses[0].id, horses[0].name)}>
            <Plus className="h-4 w-4" />
            Partner einladen
          </Button>
        )}
      </div>

      {/* Profession Filter Chips */}
      <div className="flex overflow-x-auto gap-1.5 py-1 scrollbar-hide">
        {PROFESSION_FILTERS.map((filter) => {
          const isActive = professionFilter === filter.value;
          const config = filter.value !== "all" ? getPartnerTypeConfig(filter.value) : null;
          const Icon = config?.icon;
          return (
            <button
              key={filter.value}
              onClick={() => setProfessionFilter(filter.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0 border",
                isActive
                  ? "bg-primary/15 text-primary border-primary/30 font-medium"
                  : "text-muted-foreground border-transparent hover:bg-secondary"
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{filter.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Keine Fachpartner gefunden.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Laden Sie Tierärzte, Therapeuten oder andere Fachleute über die Pferde-Detailseite ein.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, typePartners]) => {
          const config = getPartnerTypeConfig(type);
          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                <config.icon className={`h-4 w-4 ${config.color}`} />
                <h3 className="font-semibold text-foreground">{config.label}</h3>
                <Badge variant="secondary" className="text-xs">{typePartners.length}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {typePartners.map((partner, idx) => (
                  <Card key={idx} className="hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {partner.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm">{partner.name}</p>
                          {partner.email && (
                            <p className="text-xs text-muted-foreground truncate">{partner.email}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {partner.horses.map((h) => (
                              <Badge key={h.id} variant="outline" className="text-xs gap-1">
                                <Heart className="h-3 w-3" />
                                {h.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      {inviteModalOpen && selectedHorseId && (
        <InvitePartnerModal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          horseId={selectedHorseId}
          horseName={selectedHorseName}
          inviterRole="provider"
          onSent={() => setInviteModalOpen(false)}
        />
      )}
    </div>
  );
}
