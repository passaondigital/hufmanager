import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Check, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function DomainWaitlistCard() {
  const { user } = useAuth();

  const { data: isOnWaitlist, isLoading } = useQuery({
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

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("domain_waitlist" as any)
        .insert({ owner_id: user.id, owner_type: "provider", email: user.email } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Du bist auf der Warteliste! 🎉", description: "Wir melden uns, sobald eigene Domains verfügbar sind." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Konnte dich nicht eintragen. Bist du vielleicht schon auf der Liste?", variant: "destructive" });
    },
  });

  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
      <CardContent className="py-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Globe className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground">🌐 Eigene Domain — demnächst verfügbar</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Bald kannst du direkt hier eine eigene Domain kaufen und verbinden:
              z.B. <span className="font-mono text-primary">www.hufpflege-mueller.de</span> statt{" "}
              <span className="font-mono">hufiapp.de/p/mueller</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Eine professionelle Adresse die nur dir gehört — ohne extra Hosting, ohne extra Kosten bei einem anderen Anbieter.
            </p>
          </div>
        </div>
        <div className="pl-12">
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
              disabled={joinMutation.isPending || isLoading}
              className="gap-1.5"
            >
              {joinMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Auf Warteliste setzen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
