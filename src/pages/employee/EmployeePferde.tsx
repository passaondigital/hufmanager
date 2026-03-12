import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import {
  Search,
  ChevronRight,
  Footprints,
  MapPin,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const EmployeePferde = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch only explicitly assigned horses via employee_horse_access
  const { data: horses = [] } = useQuery({
    queryKey: ["employee-assigned-horses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: accessList, error: accessErr } = await supabase
        .from("employee_horse_access")
        .select(`
          horse_id,
          can_edit,
          can_add_notes,
          horses (
            id, name, breed,
            photo_url, owner_id,
            readable_id, hoof_type,
            hoof_protection, birth_year,
            gender, location_name
          )
        `)
        .eq("employee_id", user.id)
        .eq("can_view", true);

      if (accessErr) throw accessErr;
      if (!accessList || accessList.length === 0) return [];

      // Flatten horse data with access permissions
      const horseRows = accessList
        .filter((a) => a.horses)
        .map((a) => ({
          ...(a.horses as any),
          can_edit: a.can_edit,
          can_add_notes: a.can_add_notes,
        }));

      // Load owner names
      const ownerIds = [...new Set(horseRows.map((h) => h.owner_id))];
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

      return horseRows.map((h) => ({
        ...h,
        owner_name: ownerMap[h.owner_id] || "Unbekannt",
      }));
    },
    enabled: !!user?.id,
  });

  const animatedTotal = useAnimatedCounter(horses.length, 600, horses.length > 0);

  const getAge = (birthYear: number | null) =>
    !birthYear ? null : new Date().getFullYear() - birthYear;

  const filtered = horses.filter(
    (h) =>
      h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.readable_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-responsive-h2 text-foreground">Freigegebene Pferde</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pferde, die dir vom Betrieb zugewiesen wurden
        </p>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pferd suchen..."
          className="pl-10 h-11"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-xs">
        <div className="card-tile rounded-xl border border-border bg-card p-3 text-center">
          <Footprints className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{animatedTotal}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pferde zugeteilt</p>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Keine Pferde gefunden."
                  : "Noch keine Pferde zugeteilt."}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Dein Betriebsinhaber weist dir Pferde über die Team-Verwaltung zu.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((horse, i) => {
            const age = getAge(horse.birth_year);
            return (
              <Card
                key={horse.id}
                className="hover:shadow-lg transition-all cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => navigate(`/employee/pferd/${horse.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                      {horse.photo_url ? (
                        <img
                          src={horse.photo_url}
                          alt={horse.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <Footprints className="h-6 w-6 text-primary/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {horse.name || "Unbenannt"}
                        </span>
                        {horse.readable_id && (
                          <Badge variant="outline" className="font-mono text-xs">
                            #{horse.readable_id}
                          </Badge>
                        )}
                        {horse.hoof_protection && (
                          <Badge variant="secondary" className="text-[10px]">
                            {horse.hoof_protection}
                          </Badge>
                        )}
                        {/* Access level badge */}
                        {horse.can_edit ? (
                          <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
                            ✏️ Bearbeiten erlaubt
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            👁 Nur Ansicht
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {[horse.breed, age ? `${age} J.` : null, horse.gender]
                          .filter(Boolean)
                          .join(" · ") || "Keine Details"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Besitzer: {horse.owner_name}
                      </p>
                      {horse.location_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{horse.location_name}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EmployeePferde;
