import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ShieldAlert, ArrowRight } from "lucide-react";

/**
 * Shows a paywall overlay when account_status is 'expired'.
 */
export function TrialPaywall() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-trial-status", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("account_status, trial_ends_at, full_name")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  if (!profile || (profile as any).account_status !== "expired") return null;

  const plans = [
    { name: "Starter", price: "29€/Monat", url: "https://www.copecart.com/products/8ef10f74/checkout" },
    { name: "Pro", price: "29€/Monat", url: "https://www.copecart.com/products/1996da6f/checkout" },
    { name: "Duo", price: "49€/Monat", url: "https://www.copecart.com/products/953da638/checkout" },
    { name: "Team", price: "79€/Monat", url: "https://www.copecart.com/products/badae7d2/checkout" },
  ];

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <AlertDialogTitle>Testzeitraum abgelaufen</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Dein 30-tägiger Testzeitraum ist abgelaufen. Deine Daten sind sicher und bleiben erhalten. 
                Wähle einen Plan um alle Features wieder freizuschalten.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {plans.map(p => (
                  <Card key={p.name} className="cursor-pointer hover:border-primary transition-colors">
                    <CardContent className="p-3 text-center">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.price}</p>
                      <Button 
                        size="sm" 
                        className="mt-2 w-full gap-1 text-xs h-7"
                        onClick={() => window.open(p.url, "_blank")}
                      >
                        Wählen <ArrowRight className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Deine Daten bleiben 12 Monate gespeichert. Du kannst sie jederzeit einsehen aber keine neuen Einträge erstellen.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}
