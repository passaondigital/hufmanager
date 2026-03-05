import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, UserPlus, ExternalLink, Copy, QrCode } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { toast } from "sonner";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";

export default function PartnerConnect() {
  const { user } = useAuth();
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // Own profile info
  const { data: profile } = useQuery({
    queryKey: ["partner-connect-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, readable_id, avatar_url")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ["partner-connect-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_business_settings")
        .select("specialty, qualifications, public_profile_visible")
        .eq("partner_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Connected providers (via horse_partner_access)
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["partner-connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("granted_by, horses:horse_id (name)")
        .eq("partner_profile_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      // Get unique provider IDs
      const providerIds = [...new Set((data || []).map((d: any) => d.granted_by).filter(Boolean))];
      if (providerIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id, avatar_url")
        .in("id", providerIds);
      return profiles || [];
    },
    enabled: !!user,
  });

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const { data, error } = await supabase.rpc("search_profile_by_readable_id", { search_id: searchId.trim() });
      if (error) throw error;
      setSearchResult(data);
    } catch {
      toast.error("Suche fehlgeschlagen");
    } finally {
      setSearching(false);
    }
  };

  const copyProfileLink = () => {
    if (profile?.readable_id) {
      navigator.clipboard.writeText(`${window.location.origin}/partner/${profile.readable_id}`);
      toast.success("Link kopiert!");
    }
  };

  const specialty = (settings as any)?.specialty;
  const typeConfig = getPartnerTypeConfig(specialty);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">Netzwerk <HelpTip id="partner.netzwerk" /></h1>

      {/* Own profile card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {(profile?.full_name || "P").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{profile?.full_name || "Dein Profil"}</p>
              <div className="flex items-center gap-2 mt-1">
                {profile?.readable_id && (
                  <Badge variant="outline" className="font-mono text-xs">{profile.readable_id}</Badge>
                )}
                {specialty && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <typeConfig.icon className={`h-3 w-3 ${typeConfig.color}`} />
                    {typeConfig.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {profile?.readable_id && (
            <div className="mt-4 flex items-center gap-2">
              <Input
                value={`${window.location.origin}/partner/${profile.readable_id}`}
                readOnly
                className="text-xs bg-background"
              />
              <Button variant="outline" size="icon" onClick={copyProfileLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" /> Im Netzwerk suchen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
            <Input
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              placeholder="PID, KID oder PRID eingeben..."
              className="flex-1"
            />
            <Button type="submit" disabled={searching || !searchId.trim()}>
              <Search className="h-4 w-4 mr-1" /> Suchen
            </Button>
          </form>

          {searchResult && (
            <div className="p-4 rounded-lg border border-border">
              {searchResult.found ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={searchResult.avatar_url || undefined} />
                    <AvatarFallback>{(searchResult.full_name || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{searchResult.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="font-mono text-[10px]">{searchResult.readable_id}</Badge>
                      {searchResult.role && <Badge variant="secondary" className="text-[10px]">{searchResult.role}</Badge>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1">
                    <UserPlus className="h-3.5 w-3.5" /> Verbinden
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Kein Profil gefunden</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Meine Verbindungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Verbindungen. Du wirst automatisch verbunden wenn dir Pferde freigegeben werden.
            </p>
          ) : (
            <div className="space-y-3">
              {connections.map((conn: any) => (
                <div key={conn.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={conn.avatar_url || undefined} />
                    <AvatarFallback>{(conn.full_name || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{conn.full_name || "Unbekannt"}</p>
                    <Badge variant="outline" className="font-mono text-[10px]">{conn.readable_id}</Badge>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Hufpfleger</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
