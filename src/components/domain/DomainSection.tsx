import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Globe, Copy, ExternalLink, Bell, Search, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface DomainSectionProps {
  subdomain: string | null;
}

export function DomainSection({ subdomain }: DomainSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [domainSearch, setDomainSearch] = useState("");
  const [showDNSHelp, setShowDNSHelp] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState("");

  const websiteUrl = subdomain ? `${window.location.origin}/p/${subdomain}` : null;

  // Check if user is on waitlist
  const { data: isOnWaitlist } = useQuery({
    queryKey: ["domain-waitlist", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("domain_waitlist" as any)
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch domain products for pricing
  const { data: products } = useQuery({
    queryKey: ["domain-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domain_products")
        .select("tld, display_name, register_price_cents, is_featured")
        .eq("is_available", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Join waitlist mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("domain_waitlist" as any)
        .insert({ owner_id: user.id, owner_type: "provider", email: user.email } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domain-waitlist"] });
      toast({ title: "Du bist auf der Warteliste! 🎉", description: "Wir melden uns, sobald eigene Domains verfügbar sind." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Konnte dich nicht eintragen.", variant: "destructive" });
    },
  });

  const copyUrl = () => {
    if (websiteUrl) {
      navigator.clipboard.writeText(websiteUrl);
      toast({ title: "Link kopiert! 📋" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Section A: Current Address */}
      <Card className="border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-600" />
            Deine Website-Adresse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {websiteUrl ? (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-background border rounded-md px-3 py-2 text-foreground truncate">
                  {websiteUrl}
                </code>
                <Button size="sm" variant="outline" onClick={copyUrl} className="gap-1 flex-shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" asChild className="flex-shrink-0">
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Kostenlos in deinem Plan enthalten
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Erstelle zuerst eine Subdomain unter "Meine Website".
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section B: Own Domain (Coming Soon) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🏷️ Eigene Domain
            <Badge variant="secondary" className="text-xs">Bald verfügbar</Badge>
          </CardTitle>
          <CardDescription>
            {subdomain ? (
              <>
                Statt <code className="text-xs font-mono">hufmanager.de/p/{subdomain}</code> → <strong>www.dein-name.de</strong>
              </>
            ) : (
              "Verbinde eine eigene Domain mit deinem Profil"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TLD Pricing */}
          {products && products.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.map((p) => (
                <div
                  key={p.tld}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                    p.is_featured ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-foreground">{p.tld}</span>
                    {p.is_featured && <span className="text-xs">🐴</span>}
                  </div>
                  <span className="font-medium text-foreground">{(p.register_price_cents / 100).toFixed(0)}€/Jahr</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              placeholder="mein-betrieb"
              value={domainSearch}
              onChange={(e) => setDomainSearch(e.target.value)}
              className="font-mono"
            />
            <span className="text-sm text-muted-foreground flex-shrink-0">.de</span>
            <Button size="sm" disabled className="gap-1 flex-shrink-0">
              <Search className="h-3.5 w-3.5" />
              Prüfen
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Funktion kommt für Pro & Team Pläne ✨
          </p>

          {isOnWaitlist ? (
            <Button size="sm" variant="outline" disabled className="gap-1.5 text-green-600">
              <Check className="h-3.5 w-3.5" />
              Auf Warteliste
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="gap-1.5"
            >
              {joinMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
              Benachrichtigen wenn verfügbar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section C: Connect existing domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🔗 Bestehende Domain verbinden
            <Badge variant="secondary" className="text-xs">Beta in Kürze</Badge>
          </CardTitle>
          <CardDescription>Du hast bereits eine eigene Domain? Verbinde sie mit deinem Profil.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="www.mein-betrieb.de"
            value={customDomainInput}
            onChange={(e) => setCustomDomainInput(e.target.value)}
            className="font-mono"
          />

          <button
            onClick={() => setShowDNSHelp(!showDNSHelp)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {showDNSHelp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            DNS-Anleitung anzeigen
          </button>

          {showDNSHelp && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-foreground">DNS-Einstellungen bei deinem Anbieter:</p>
              <div className="font-mono text-xs space-y-1 text-muted-foreground">
                <p>Typ: <strong className="text-foreground">CNAME</strong></p>
                <p>Name: <strong className="text-foreground">www</strong></p>
                <p>Wert: <strong className="text-foreground">hufmanager.de</strong></p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Die DNS-Änderung kann bis zu 48 Stunden dauern. Wir prüfen automatisch ob die Domain korrekt konfiguriert ist.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">⏳ Kommt bald – Beta in Kürze</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
