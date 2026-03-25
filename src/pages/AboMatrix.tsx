import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Diamond, Clock, Euro, Users, Check, X, Zap, Shield, Flame,
  MapPin, Timer, Plus, UserPlus, Loader2
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  tier: string;
  plan_type: string;
  interval_weeks: number | null;
  price_monthly: number;
  price_per_appointment: number | null;
  max_horses: number;
  travel_fee_zone1: number;
  travel_fee_zone2: number;
  surcharge_per_30min: number;
  discount_per_extra_horse: number;
  duration_minutes: number;
  duration_weeks: number | null;
  max_appointments: number | null;
  flat_price: number | null;
  payment_split: string | null;
  cancellation_notice: string | null;
  includes: string[];
  not_included: string[];
  requires_application: boolean;
  badge_color: string | null;
  is_active: boolean;
}

interface ClientWithHorses {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  horses: { id: string; name: string }[];
}

interface ClientSub {
  id: string;
  plan_id: string;
  client_id: string;
  horse_ids: string[];
  status: string;
  started_at: string;
  plan_name?: string;
  client_email?: string;
}

const TIER_CONFIG: Record<string, { icon: typeof Zap; gradient: string; label: string }> = {
  go: { icon: Zap, gradient: "from-green-500 to-emerald-600", label: "Einstieg" },
  balance: { icon: Shield, gradient: "from-blue-500 to-indigo-600", label: "Standard-Abo" },
  intensiv: { icon: Flame, gradient: "from-amber-500 to-orange-600", label: "8-Wochen-Programm" },
};

export default function AboMatrix() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>([]);

  // Fetch plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["bhs-plans", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subscription_plans")
        .select("*")
        .eq("provider_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return (data || []) as Plan[];
    },
    enabled: !!user?.id,
  });

  // Fetch clients with horses
  const { data: clients = [] } = useQuery({
    queryKey: ["bhs-clients-horses", user?.id],
    queryFn: async () => {
      const { data: grants, error: gErr } = await (supabase as any)
        .from("access_grants")
        .select("client_id")
        .eq("provider_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (gErr) throw gErr;
      const clientIds = (grants || []).map((g: any) => g.client_id);
      if (clientIds.length === 0) return [];

      const { data: profiles, error: pErr } = await (supabase as any)
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", clientIds);
      if (pErr) throw pErr;

      const { data: horses, error: hErr } = await (supabase as any)
        .from("horses")
        .select("id, name, owner_id")
        .in("owner_id", clientIds);
      if (hErr) throw hErr;

      return (profiles || []).map((p: any) => ({
        ...p,
        horses: (horses || []).filter((h: any) => h.owner_id === p.id),
      })) as ClientWithHorses[];
    },
    enabled: !!user?.id,
  });

  // Fetch existing subscriptions
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["bhs-client-subs", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_subscriptions")
        .select("id, plan_id, client_id, horse_ids, status, started_at")
        .eq("provider_id", user!.id);
      if (error) throw error;
      return (data || []) as ClientSub[];
    },
    enabled: !!user?.id,
  });

  // Assign plan mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("client_subscriptions").insert({
        plan_id: selectedPlanId,
        client_id: selectedClientId,
        provider_id: user!.id,
        horse_ids: selectedHorseIds,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bhs-client-subs"] });
      toast.success("Abo zugewiesen!");
      setAssignDialog(false);
      resetAssignForm();
    },
    onError: () => toast.error("Fehler beim Zuweisen"),
  });

  const resetAssignForm = () => {
    setSelectedPlanId("");
    setSelectedClientId("");
    setSelectedHorseIds([]);
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const getClientName = (id: string) => {
    const c = clients.find((cl) => cl.id === id);
    return c ? (c.first_name || c.last_name ? `${c.first_name || ""} ${c.last_name || ""}`.trim() : c.email) : id.slice(0, 8);
  };
  const getPlanName = (id: string) => plans.find((p) => p.id === id)?.name || "–";
  const getHorseName = (id: string) => {
    for (const c of clients) {
      const h = c.horses.find((h) => h.id === id);
      if (h) return h.name;
    }
    return id.slice(0, 8);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Diamond className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold">Abo-Matrix</h1>
            <p className="text-muted-foreground">Deine 3 Leistungsstufen — GO · BALANCE · INTENSIV</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="plans">Leistungsstufen</TabsTrigger>
          <TabsTrigger value="clients">
            Kunden-Zuordnung
            {subscriptions.length > 0 && (
              <Badge variant="secondary" className="ml-2">{subscriptions.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans
              .sort((a, b) => {
                const order = { go: 0, balance: 1, intensiv: 2 };
                return (order[a.tier as keyof typeof order] ?? 9) - (order[b.tier as keyof typeof order] ?? 9);
              })
              .map((plan) => {
                const config = TIER_CONFIG[plan.tier] || TIER_CONFIG.balance;
                const Icon = config.icon;
                const activeSubs = subscriptions.filter((s) => s.plan_id === plan.id && s.status === "active").length;

                return (
                  <Card key={plan.id} className="relative overflow-hidden border-2 hover:shadow-lg transition-shadow">
                    {/* Top gradient bar */}
                    <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                            <CardDescription className="text-xs">{config.label}</CardDescription>
                          </div>
                        </div>
                        {activeSubs > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />{activeSubs}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Price display */}
                      <div className="text-center py-3 bg-muted/50 rounded-lg">
                        {plan.plan_type === "single" && (
                          <div>
                            <span className="text-3xl font-bold">{plan.price_per_appointment}€</span>
                            <span className="text-muted-foreground text-sm"> / Pferd / Termin</span>
                          </div>
                        )}
                        {plan.plan_type === "abo" && (
                          <div>
                            <span className="text-3xl font-bold">{plan.price_monthly}€</span>
                            <span className="text-muted-foreground text-sm"> / Pferd / Monat</span>
                          </div>
                        )}
                        {plan.plan_type === "package" && (
                          <div>
                            <span className="text-3xl font-bold">{plan.flat_price}€</span>
                            <span className="text-muted-foreground text-sm"> pauschal</span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <p className="text-sm text-muted-foreground">{plan.description}</p>

                      <div className="space-y-2 text-sm">
                        {plan.interval_weeks && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>Intervall: {plan.interval_weeks} Wochen</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span>ca. {plan.duration_minutes} Min / Pferd</span>
                        </div>
                        {(plan.travel_fee_zone1 > 0 || plan.travel_fee_zone2 > 0) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>Anfahrt: {plan.travel_fee_zone1}€ / {plan.travel_fee_zone2}€</span>
                          </div>
                        )}
                        {plan.surcharge_per_30min > 0 && (
                          <div className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span>+{plan.surcharge_per_30min}€ / angef. 30 Min Mehraufwand</span>
                          </div>
                        )}
                        {plan.discount_per_extra_horse > 0 && (
                          <div className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span>{plan.discount_per_extra_horse}% Rabatt je weiteres Pferd</span>
                          </div>
                        )}
                        {plan.cancellation_notice && (
                          <div className="text-xs text-muted-foreground">
                            Kündigung: {plan.cancellation_notice}
                          </div>
                        )}
                        {plan.payment_split && (
                          <div className="text-xs text-muted-foreground">
                            Zahlung: {plan.payment_split}
                          </div>
                        )}
                        {plan.duration_weeks && (
                          <div className="text-xs text-muted-foreground">
                            Laufzeit: {plan.duration_weeks} Wochen · max. {plan.max_appointments} Termine
                          </div>
                        )}
                        {plan.requires_application && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Bewerbung erforderlich
                          </Badge>
                        )}
                      </div>

                      {/* Includes */}
                      {plan.includes.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Inklusive:</p>
                          {plan.includes.map((item) => (
                            <div key={item} className="flex items-center gap-2 text-sm">
                              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Not included */}
                      {plan.not_included.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Nicht enthalten:</p>
                          {plan.not_included.map((item) => (
                            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Assign button */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setAssignDialog(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Kunden zuweisen
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Aktive Zuordnungen</h2>
            <Button size="sm" onClick={() => setAssignDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />Neue Zuordnung
            </Button>
          </div>

          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Noch keine Kunden zugeordnet</p>
                <p className="text-sm mt-1">Weise deinen Kunden eine Leistungsstufe zu.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const plan = plans.find((p) => p.id === sub.plan_id);
                const tierConfig = plan ? TIER_CONFIG[plan.tier] : TIER_CONFIG.balance;
                return (
                  <Card key={sub.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded bg-gradient-to-br ${tierConfig.gradient} text-white`}>
                          <tierConfig.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{getClientName(sub.client_id)}</p>
                          <p className="text-xs text-muted-foreground">
                            {getPlanName(sub.plan_id)} · {sub.horse_ids.map(getHorseName).join(", ")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status === "active" ? "Aktiv" : sub.status}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={assignDialog} onOpenChange={(open) => { setAssignDialog(open); if (!open) resetAssignForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leistungsstufe zuweisen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Plan select */}
            <div>
              <label className="text-sm font-medium">Stufe</label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Stufe wählen..." /></SelectTrigger>
                <SelectContent>
                  {plans.filter((p) => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client select */}
            <div>
              <label className="text-sm font-medium">Kunde</label>
              <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setSelectedHorseIds([]); }}>
                <SelectTrigger><SelectValue placeholder="Kunde wählen..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name || c.last_name ? `${c.first_name || ""} ${c.last_name || ""}`.trim() : c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horse selection */}
            {selectedClient && selectedClient.horses.length > 0 && (
              <div>
                <label className="text-sm font-medium">Pferde</label>
                <div className="space-y-2 mt-1">
                  {selectedClient.horses.map((horse) => (
                    <label key={horse.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedHorseIds.includes(horse.id)}
                        onCheckedChange={(checked) => {
                          setSelectedHorseIds((prev) =>
                            checked ? [...prev, horse.id] : prev.filter((id) => id !== horse.id)
                          );
                        }}
                      />
                      <span className="text-sm">{horse.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedPlanId || !selectedClientId || selectedHorseIds.length === 0 || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {assignMutation.isPending ? "Wird zugewiesen..." : "Zuweisen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
