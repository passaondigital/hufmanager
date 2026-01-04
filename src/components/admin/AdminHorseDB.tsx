import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { 
  Search, 
  RefreshCw, 
  Loader2,
  MapPin,
  User,
  Users,
  Calendar,
  ExternalLink,
  Copy
} from "lucide-react";
import { format } from "date-fns";

interface HorseData {
  id: string;
  name: string;
  readable_id: string | null;
  breed: string | null;
  birth_year: number | null;
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_readable_id: string | null;
  provider_name: string | null;
  provider_id: string | null;
  location_name: string | null;
  created_at: string;
  appointment_count: number;
}

interface AdminHorseDBProps {
  isMasterAdmin: boolean;
}

export function AdminHorseDB({ isMasterAdmin }: AdminHorseDBProps) {
  const [horses, setHorses] = useState<HorseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHorse, setSelectedHorse] = useState<HorseData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchHorses();
  }, []);

  const fetchHorses = async () => {
    setLoading(true);
    try {
      // Fetch all horses
      const { data: horsesData, error: horsesError } = await supabase
        .from("horses")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (horsesError) throw horsesError;

      // Fetch all profiles for owner info
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, readable_id, created_by_provider_id")
        .is("deleted_at", null);

      if (profilesError) throw profilesError;

      // Fetch access grants to determine providers
      const { data: grants, error: grantsError } = await supabase
        .from("access_grants")
        .select("client_id, provider_id")
        .eq("is_active", true);

      if (grantsError) console.warn("Could not fetch access_grants:", grantsError);

      // Fetch appointment counts
      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select("horse_id");

      if (appError) console.warn("Could not fetch appointments:", appError);

      // Build lookup maps
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const appointmentCountMap = new Map<string, number>();
      appointments?.forEach(a => {
        appointmentCountMap.set(a.horse_id, (appointmentCountMap.get(a.horse_id) || 0) + 1);
      });

      // Client to provider map
      const clientProviderMap = new Map<string, string>();
      profiles?.forEach(p => {
        if (p.created_by_provider_id) {
          clientProviderMap.set(p.id, p.created_by_provider_id);
        }
      });
      grants?.forEach(g => {
        if (!clientProviderMap.has(g.client_id)) {
          clientProviderMap.set(g.client_id, g.provider_id);
        }
      });

      // Merge data
      const horsesWithData: HorseData[] = (horsesData || []).map(horse => {
        const owner = profileMap.get(horse.owner_id);
        const providerId = clientProviderMap.get(horse.owner_id);
        const provider = providerId ? profileMap.get(providerId) : null;

        return {
          id: horse.id,
          name: horse.name,
          readable_id: horse.readable_id,
          breed: horse.breed,
          birth_year: horse.birth_year,
          owner_id: horse.owner_id,
          owner_name: owner?.full_name || null,
          owner_email: owner?.email || null,
          owner_readable_id: owner?.readable_id || null,
          provider_name: provider?.full_name || null,
          provider_id: providerId || null,
          location_name: horse.location_name,
          created_at: horse.created_at,
          appointment_count: appointmentCountMap.get(horse.id) || 0,
        };
      });

      setHorses(horsesWithData);
    } catch (error) {
      console.error("Error fetching horses:", error);
      toast.error("Fehler beim Laden der Pferde");
    } finally {
      setLoading(false);
    }
  };

  const filteredHorses = useMemo(() => {
    if (!searchTerm) return horses;
    const term = searchTerm.toLowerCase();
    return horses.filter(h =>
      h.name.toLowerCase().includes(term) ||
      h.readable_id?.toLowerCase().includes(term) ||
      h.breed?.toLowerCase().includes(term) ||
      h.owner_name?.toLowerCase().includes(term) ||
      h.owner_email?.toLowerCase().includes(term) ||
      h.provider_name?.toLowerCase().includes(term) ||
      h.location_name?.toLowerCase().includes(term) ||
      h.id.includes(term)
    );
  }, [horses, searchTerm]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopiert");
  };

  const openDetail = (horse: HorseData) => {
    setSelectedHorse(horse);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pferde-DB</h2>
          <p className="text-muted-foreground">
            {horses.length} Pferde gesamt • {filteredHorses.length} angezeigt
          </p>
        </div>
        <Button variant="outline" onClick={fetchHorses} size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Suchen nach Pferdename, Besitzer, Provider, Standort..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EQID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rasse</TableHead>
                  <TableHead>Besitzer</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead>Termine</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHorses.map((horse) => (
                  <TableRow 
                    key={horse.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(horse)}
                  >
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {horse.readable_id || horse.id.slice(0, 8)}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{horse.name}</TableCell>
                    <TableCell>{horse.breed || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span>{horse.owner_name || "Unbekannt"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {horse.provider_name ? (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-primary" />
                          <span>{horse.provider_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {horse.location_name ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate max-w-32">{horse.location_name}</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{horse.appointment_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(horse.created_at), "dd.MM.yy")}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHorses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Keine Pferde gefunden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedHorse?.name}</SheetTitle>
            <SheetDescription>
              {selectedHorse?.readable_id} • {selectedHorse?.breed || "Keine Rasse"}
            </SheetDescription>
          </SheetHeader>
          
          {selectedHorse && (
            <div className="mt-6 space-y-6">
              {/* IDs */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Identifikation</h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">EQID</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{selectedHorse.readable_id}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedHorse.readable_id || "")}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">UUID</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs truncate max-w-40">{selectedHorse.id}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(selectedHorse.id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Besitzer</h4>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">{selectedHorse.owner_name || "Unbekannt"}</p>
                  <p className="text-sm text-muted-foreground">{selectedHorse.owner_email}</p>
                  <code className="text-xs text-muted-foreground">{selectedHorse.owner_readable_id}</code>
                </div>
              </div>

              {/* Provider */}
              {selectedHorse.provider_name && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Provider</h4>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">{selectedHorse.provider_name}</p>
                    <code className="text-xs text-muted-foreground">{selectedHorse.provider_id}</code>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Statistiken</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{selectedHorse.appointment_count}</p>
                    <p className="text-xs text-muted-foreground">Termine</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{selectedHorse.birth_year || "—"}</p>
                    <p className="text-xs text-muted-foreground">Geburtsjahr</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              {selectedHorse.location_name && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Standort</h4>
                  <div className="p-3 border rounded-lg flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>{selectedHorse.location_name}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
