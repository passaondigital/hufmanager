import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Shield, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { ensureUserProfile } from "@/lib/ensureProfile";

interface SearchResult {
  id: string;
  type: 'provider' | 'client' | 'horse';
  readable_id: string;
  name: string;
  avatar_url?: string;
  breed?: string; // for horses
  owner_id?: string; // for horses (used to create connection requests without extra RLS-blocked queries)
}


interface ConnectionSearchProps {
  searchType: 'provider' | 'client' | 'horse';
  onConnectionRequested?: () => void;
}

export function ConnectionSearch({ searchType, onConnectionRequested }: ConnectionSearchProps) {
  const { user } = useAuth();
  const [searchId, setSearchId] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    
    setSearching(true);
    setResult(null);
    
    try {
      if (searchType === 'provider' || searchType === 'client') {
        // Use secure RPC function to search profiles globally
        const { data, error } = await supabase
          .rpc("search_profile_by_readable_id", { search_id: searchId });
        
        if (error) throw error;
        
        const result = data as { found: boolean; id?: string; readable_id?: string; full_name?: string; avatar_url?: string; role?: string };
        
        if (result?.found && result.id) {
          const expectedRole = searchType;
          
          if (result.role === expectedRole) {
            setResult({
              id: result.id,
              type: searchType,
              readable_id: result.readable_id || '',
              name: result.full_name || 'Unbekannt',
              avatar_url: result.avatar_url || undefined,
            });
          } else {
            const label = searchType === 'provider' ? 'Hufbearbeiter' : 'Kunde';
            toast({ 
              title: `Kein ${label} gefunden`, 
              description: `Diese ID gehört nicht zu einem ${label}.`, 
              variant: "destructive" 
            });
          }
        } else {
          const label = searchType === 'provider' ? 'Hufbearbeiter' : 'Kunde';
          toast({ 
            title: "Nicht gefunden", 
            description: `Kein ${label} mit dieser ID gefunden.`, 
            variant: "destructive" 
          });
        }
      } else if (searchType === 'horse') {
        // Use secure RPC function to search horses globally
        const { data, error } = await supabase
          .rpc("search_horse_by_readable_id", { search_id: searchId });
        
        if (error) throw error;
        
        const result = data as { found: boolean; id?: string; readable_id?: string; name?: string; photo_url?: string; breed?: string; owner_id?: string };
        
        if (result?.found && result.id) {
          setResult({
            id: result.id,
            type: 'horse',
            readable_id: result.readable_id || '',
            name: result.name || 'Unbekannt',
            avatar_url: result.photo_url || undefined,
            breed: result.breed || undefined,
            owner_id: result.owner_id || undefined,
          });
        } else {
          toast({ 
            title: "Nicht gefunden", 
            description: "Kein Pferd mit dieser ID gefunden.", 
            variant: "destructive" 
          });
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      toast({ title: "Fehler bei der Suche", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user || !result) return;
    
    setSending(true);
    
    try {
      // SELF-HEALING: Ensure current user's profile exists before creating access grant
      const profileResult = await ensureUserProfile(user);
      if (!profileResult.success) {
        toast({ 
          title: "Profil-Fehler", 
          description: profileResult.error || "Profil konnte nicht erstellt werden.", 
          variant: "destructive" 
        });
        return;
      }

      // Create pending access grant
      const grantData: any = {
        status: 'pending',
        is_active: false,
        requested_by: user.id,
        requested_at: new Date().toISOString(),
        request_message: requestMessage || null,
        can_view_basic: true,
        can_view_medical: false,
        can_create_appointments: false,
      };

      if (searchType === 'provider') {
        // Client requesting connection to provider
        grantData.client_id = user.id;
        grantData.provider_id = result.id;
      } else if (searchType === 'client') {
        // Provider requesting connection to client
        grantData.provider_id = user.id;
        grantData.client_id = result.id;
      } else if (searchType === 'horse') {
        // Provider requesting connection via horse ID (EQID) -> connect to horse owner
        const ownerId = result.owner_id;
        if (!ownerId) {
          throw new Error("Pferdebesitzer nicht gefunden");
        }
        
        grantData.provider_id = user.id;
        grantData.client_id = ownerId;
      }

      // NOTE: Do NOT "verify" target profiles via direct SELECT here.
      // Those SELECTs can be blocked by RLS (e.g. client cannot read provider profile before connection).
      // We rely on the secure RPC search result + FK constraints.

      // Check if connection already exists
      const { data: existing } = await supabase
        .from("access_grants")
        .select("id, status")
        .eq("provider_id", grantData.provider_id)
        .eq("client_id", grantData.client_id)
        .maybeSingle();
      
      if (existing) {
        if (existing.status === 'pending') {
          toast({ title: "Anfrage bereits gesendet", description: "Es gibt bereits eine ausstehende Verbindungsanfrage.", variant: "destructive" });
          return;
        } else if (existing.status === 'active') {
          toast({ title: "Bereits verbunden", description: "Ihr seid bereits verbunden.", variant: "destructive" });
          return;
        } else {
          // Reactivate rejected connection
          const { error } = await supabase
            .from("access_grants")
            .update({
              status: 'pending',
              is_active: false,
              requested_by: user.id,
              requested_at: new Date().toISOString(),
              request_message: requestMessage || null,
              revoked_at: null,
            })
            .eq("id", existing.id);
          
          if (error) throw error;
        }
      } else {
        // Create new grant
        const { error } = await supabase
          .from("access_grants")
          .insert(grantData);
        
        if (error) throw error;
      }

      // Optional notification:
      // - Clients are NOT allowed to insert into notifications table (RLS), so skip in that case.
      // - Providers can insert, so keep for provider-initiated requests.
      if (searchType !== 'provider') {
        const targetUserId = searchType === 'client' ? result.id : grantData.client_id;
        const senderName = user.email?.split("@")[0] || "Jemand";

        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: targetUserId,
          title: "Neue Verbindungsanfrage",
          message: `${senderName} möchte sich mit dir verbinden.`,
          type: "connection_request",
          link: "/client-home",
        });

        if (notifError) {
          // Don't fail the request if notification insertion is blocked/misconfigured
          console.warn("Notification insert failed (ignored):", notifError);
        }
      }

      toast({ 
        title: "Anfrage gesendet!", 
        description: "Die Verbindungsanfrage wurde gesendet. Du wirst benachrichtigt, wenn sie angenommen wird." 
      });
      
      setResult(null);
      setSearchId("");
      setShowRequestForm(false);
      setRequestMessage("");
      onConnectionRequested?.();
      
    } catch (err: any) {
      console.error("Connection request error:", err);
      
      // Provide more specific error messages based on the error
      let errorMessage = "Fehler beim Senden der Anfrage";
      
      if (err.message?.includes("violates foreign key constraint")) {
        // This means either client_id or provider_id doesn't exist in profiles
        if (err.message.includes("client_id")) {
          errorMessage = "Dein Profil konnte nicht gefunden werden. Bitte lade die Seite neu.";
        } else if (err.message.includes("provider_id")) {
          errorMessage = "Der Hufbearbeiter wurde nicht gefunden. Möglicherweise existiert das Konto nicht mehr.";
        }
      } else if (err.message?.includes("new row violates row-level security")) {
        errorMessage = "Du hast keine Berechtigung für diese Aktion. Bitte lade die Seite neu.";
      }
      
      toast({ 
        title: errorMessage,
        description: err.message,
        variant: "destructive" 
      });
    } finally {
      setSending(false);
    }
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'provider': return "#PID-123456 eingeben...";
      case 'client': return "#KID-123456 eingeben...";
      case 'horse': return "#EQID-123456 eingeben...";
    }
  };

  const getTitle = () => {
    switch (searchType) {
      case 'provider': return "Hufbearbeiter finden";
      case 'client': return "Kunde finden";
      case 'horse': return "Pferd finden";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={getPlaceholder()}
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="font-mono"
          />
          <Button onClick={handleSearch} disabled={searching || !searchId.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Search Result Preview Card */}
        {result && !showRequestForm && (
          <div className="border rounded-lg p-4 bg-muted/30 animate-fade-in">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={result.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {result.type === 'horse' ? '🐴' : result.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{result.name}</h3>
                  <Badge variant="outline" className="font-mono text-xs">
                    #{result.readable_id}
                  </Badge>
                </div>
                {result.breed && (
                  <p className="text-sm text-muted-foreground">{result.breed}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Shield className="h-3 w-3" />
                  Vorschau - Keine sensiblen Daten sichtbar
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button 
                className="flex-1 gap-2" 
                onClick={() => setShowRequestForm(true)}
              >
                <UserPlus className="h-4 w-4" />
                Verbinden
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setResult(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Request Form */}
        {showRequestForm && result && (
          <div className="border rounded-lg p-4 bg-muted/30 animate-fade-in space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={result.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {result.type === 'horse' ? '🐴' : result.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{result.name}</p>
                <p className="text-xs text-muted-foreground">#{result.readable_id}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Nachricht (optional)
              </label>
              <Textarea
                placeholder="Stell dich kurz vor..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={handleSendRequest}
                disabled={sending}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Anfrage senden
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRequestForm(false);
                  setRequestMessage("");
                }}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          🔒 Deine Daten werden erst nach Bestätigung geteilt
        </p>
      </CardContent>
    </Card>
  );
}