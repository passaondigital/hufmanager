import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Shield, Loader2, X, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { ensureUserProfile } from "@/lib/ensureProfile";

interface UniversalResult {
  id: string;
  readable_id: string;
  name: string;
  avatar_url: string | null;
  role: string;
  postal_code: string | null;
  specialty: string | null;
  result_type: string;
}

const ROLE_LABELS: Record<string, string> = {
  provider: "Hufpfleger",
  client: "Pferdebesitzer",
  partner: "Fachpartner",
  employee: "Mitarbeiter",
};

const ROLE_PREFIX: Record<string, string> = {
  provider: "PID",
  client: "KID",
  partner: "PRID",
  employee: "EID",
};

export function UniversalSearch({ onConnectionRequested }: { onConnectionRequested?: () => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UniversalResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedResult, setSelectedResult] = useState<UniversalResult | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setSearching(true);
    setResults([]);
    setHasSearched(true);
    setSelectedResult(null);

    try {
      const { data, error } = await supabase.rpc("search_profiles_universal", {
        search_term: query.trim(),
        search_limit: 15,
      });

      if (error) throw error;

      const parsed = (data as unknown as UniversalResult[]) || [];
      // Filter out self
      setResults(parsed.filter(r => r.id !== user?.id));
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Suche fehlgeschlagen");
    } finally {
      setSearching(false);
    }
  };

  const handleConnect = async () => {
    if (!user || !selectedResult) return;
    setSending(true);

    try {
      const profileResult = await ensureUserProfile(user);
      if (!profileResult.success) {
        toast.error("Profil-Fehler");
        return;
      }

      const myRole = (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role;
      const targetRole = selectedResult.role;

      let grantData: Record<string, unknown> = {
        status: "pending",
        is_active: false,
        requested_by: user.id,
        requested_at: new Date().toISOString(),
        request_message: requestMessage || null,
        can_view_basic: true,
        can_view_medical: false,
        can_create_appointments: false,
      };

      // Determine provider_id and client_id based on roles
      if (myRole === "provider" && targetRole === "client") {
        grantData.provider_id = user.id;
        grantData.client_id = selectedResult.id;
      } else if (myRole === "client" && targetRole === "provider") {
        grantData.client_id = user.id;
        grantData.provider_id = selectedResult.id;
      } else if (myRole === "provider" && targetRole === "partner") {
        grantData.provider_id = user.id;
        grantData.client_id = selectedResult.id;
        grantData.partner_name = selectedResult.name;
      } else if (myRole === "client" && targetRole === "partner") {
        grantData.client_id = user.id;
        grantData.provider_id = selectedResult.id;
      } else {
        // Fallback: initiator is provider side
        grantData.provider_id = user.id;
        grantData.client_id = selectedResult.id;
      }

      // Check existing
      const { data: existing } = await supabase
        .from("access_grants")
        .select("id, status")
        .eq("provider_id", grantData.provider_id as string)
        .eq("client_id", grantData.client_id as string)
        .maybeSingle();

      if (existing?.status === "pending") {
        toast.error("Anfrage bereits gesendet");
        return;
      }
      if (existing?.status === "active") {
        toast.error("Bereits verbunden");
        return;
      }

      if (existing) {
        await supabase.from("access_grants").update({
          status: "pending",
          is_active: false,
          requested_by: user.id,
          requested_at: new Date().toISOString(),
          request_message: requestMessage || null,
          revoked_at: null,
        }).eq("id", existing.id);
      } else {
        const { error } = await supabase.from("access_grants").insert(grantData as any);
        if (error) throw error;
      }

      toast.success("Verbindungsanfrage gesendet!");
      setSelectedResult(null);
      setQuery("");
      setResults([]);
      setHasSearched(false);
      setRequestMessage("");
      onConnectionRequested?.();
    } catch (err: any) {
      console.error("Connection error:", err);
      toast.error("Fehler beim Senden der Anfrage");
    } finally {
      setSending(false);
    }
  };

  const getSearchHint = () => {
    const q = query.trim();
    if (!q) return null;
    if (q.includes("@")) return "📧 E-Mail-Suche";
    if (/^\d{4,5}$/.test(q)) return "📍 PLZ-Suche";
    if (/^#?[A-Z]{2,4}-/i.test(q)) return "🔑 ID-Suche";
    return "🔤 Name/Beruf-Suche";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Universelle Suche
        </CardTitle>
        <CardDescription>
          Suche nach Name, PLZ, E-Mail, Beruf/Fachgebiet oder #ID (#PID, #KID, #PRID, #EQID)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Name, PLZ, E-Mail oder #ID eingeben..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || query.trim().length < 2}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {query.trim().length >= 2 && (
            <p className="text-xs text-muted-foreground">{getSearchHint()}</p>
          )}
        </div>

        {/* Results */}
        {searching && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!searching && hasSearched && results.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Keine Ergebnisse</p>
            <p className="text-xs mt-1">Versuche einen anderen Suchbegriff oder eine #ID.</p>
          </div>
        )}

        {!searching && results.length > 0 && !selectedResult && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">{results.length} Ergebnis{results.length !== 1 ? "se" : ""}</p>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedResult(r)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={r.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {(r.name || "?").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.name}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      #{ROLE_PREFIX[r.role] || "?"}-{r.readable_id}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {ROLE_LABELS[r.role] || r.role}
                    </Badge>
                    {r.specialty && (
                      <Badge variant="secondary" className="text-[10px]">{r.specialty}</Badge>
                    )}
                    {r.postal_code && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />{r.postal_code}
                      </span>
                    )}
                  </div>
                </div>
                <UserPlus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Connection Request Form */}
        {selectedResult && (
          <div className="border rounded-lg p-4 bg-muted/30 animate-fade-in space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedResult.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {(selectedResult.name || "?").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{selectedResult.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">
                    #{ROLE_PREFIX[selectedResult.role]}-{selectedResult.readable_id}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {ROLE_LABELS[selectedResult.role] || selectedResult.role}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedResult(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Nachricht (optional)</label>
              <Textarea
                placeholder="Stell dich kurz vor..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>

            <Button onClick={handleConnect} disabled={sending} className="w-full gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Verbindungsanfrage senden
            </Button>

            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" />
              Daten werden erst nach beidseitiger Bestätigung geteilt
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
