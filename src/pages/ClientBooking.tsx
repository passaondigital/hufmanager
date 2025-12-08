import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Scissors, Calendar, Check, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Service {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration: number | null;
  provider_id: string;
}

interface Horse {
  id: string;
  name: string;
}

type BookingStep = "services" | "horse" | "date" | "confirm";

export default function ClientBooking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [services, setServices] = useState<Service[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [step, setStep] = useState<BookingStep>("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedHorse, setSelectedHorse] = useState<string>("");
  const [dateType, setDateType] = useState<"next" | "preferred">("next");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Get provider ID from access grants
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (grant) {
        setProviderId(grant.provider_id);

        // Fetch provider's active services
        const { data: servicesData } = await supabase
          .from("services")
          .select("id, name, description, base_price, duration, provider_id")
          .eq("provider_id", grant.provider_id)
          .eq("is_active", true)
          .order("name");

        setServices(servicesData || []);
      }

      // Fetch user's horses
      const { data: horsesData } = await supabase
        .from("horses")
        .select("id, name")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("name");

      setHorses(horsesData || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!user || !providerId || !selectedService || !selectedHorse) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("leads").insert({
        provider_id: providerId,
        name: user.email,
        email: user.email,
        lead_type: "termin",
        status: "neu",
        source: "client_app",
        message: `Terminanfrage: ${selectedService.name}\n` +
                 `Pferd: ${horses.find(h => h.id === selectedHorse)?.name}\n` +
                 `Terminwunsch: ${dateType === "next" ? "Nächstmöglicher Termin" : format(new Date(preferredDate), "dd.MM.yyyy", { locale: de })}\n` +
                 `Notizen: ${notes || "—"}`,
      });

      if (error) throw error;

      toast({
        title: "Anfrage gesendet!",
        description: "Dein Hufbearbeiter wird sich bald bei dir melden.",
      });
      navigate("/client-home");
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Die Anfrage konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-foreground">Service buchen</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Step: Select Service */}
        {step === "services" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Welcher Service?
              </h2>
              <p className="text-sm text-muted-foreground">
                Wähle einen Service deines Hufbearbeiters
              </p>
            </div>

            {services.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Scissors className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Keine Services verfügbar
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {services.map(service => (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all ${
                      selectedService?.id === service.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedService(service)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {service.name}
                          </h3>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {service.description}
                            </p>
                          )}
                          {service.duration && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ca. {service.duration} Min.
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {formatCurrency(service.base_price)}
                          </p>
                          {selectedService?.id === service.id && (
                            <Check className="h-5 w-5 text-primary mt-1 ml-auto" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedService}
              onClick={() => setStep("horse")}
            >
              Weiter
            </Button>
          </>
        )}

        {/* Step: Select Horse */}
        {step === "horse" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Für welches Pferd?
              </h2>
              <p className="text-sm text-muted-foreground">
                Wähle das Pferd für den Termin
              </p>
            </div>

            {horses.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <span className="text-4xl block mb-2">🐴</span>
                  <p className="text-muted-foreground">
                    Du hast noch keine Pferde angelegt
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigate("/client-home")}
                  >
                    Pferd anlegen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {horses.map(horse => (
                  <Card
                    key={horse.id}
                    className={`cursor-pointer transition-all ${
                      selectedHorse === horse.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedHorse(horse.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🐴</span>
                        <span className="font-semibold">{horse.name}</span>
                      </div>
                      {selectedHorse === horse.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("services")}>
                Zurück
              </Button>
              <Button
                className="flex-1"
                disabled={!selectedHorse}
                onClick={() => setStep("date")}
              >
                Weiter
              </Button>
            </div>
          </>
        )}

        {/* Step: Select Date */}
        {step === "date" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Wann soll der Termin sein?
              </h2>
            </div>

            <RadioGroup
              value={dateType}
              onValueChange={(v) => setDateType(v as "next" | "preferred")}
              className="space-y-3"
            >
              <Card className={`cursor-pointer ${dateType === "next" ? "border-primary" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="next" id="next" />
                    <Label htmlFor="next" className="flex-1 cursor-pointer">
                      <span className="font-medium">Nächstmöglicher Termin</span>
                      <p className="text-sm text-muted-foreground">
                        Der Provider wählt den nächsten freien Termin
                      </p>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer ${dateType === "preferred" ? "border-primary" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="preferred" id="preferred" />
                    <Label htmlFor="preferred" className="flex-1 cursor-pointer">
                      <span className="font-medium">Wunschtermin</span>
                      <p className="text-sm text-muted-foreground">
                        Gib deinen Wunschtermin an
                      </p>
                    </Label>
                  </div>
                  {dateType === "preferred" && (
                    <div className="mt-3 ml-7">
                      <Input
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </RadioGroup>

            <div>
              <Label htmlFor="notes">Notizen (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Besondere Wünsche, Anfahrtsinfos..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("horse")}>
                Zurück
              </Button>
              <Button
                className="flex-1"
                disabled={dateType === "preferred" && !preferredDate}
                onClick={() => setStep("confirm")}
              >
                Weiter
              </Button>
            </div>
          </>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Zusammenfassung
              </h2>
              <p className="text-sm text-muted-foreground">
                Prüfe deine Buchungsanfrage
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pferd</span>
                  <span className="font-medium">
                    {horses.find(h => h.id === selectedHorse)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Termin</span>
                  <span className="font-medium">
                    {dateType === "next"
                      ? "Nächstmöglicher"
                      : format(new Date(preferredDate), "dd.MM.yyyy", { locale: de })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preis</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(selectedService?.base_price || 0)}
                  </span>
                </div>
                {notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Notizen:</p>
                    <p className="text-sm">{notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("date")}>
                Zurück
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Anfrage senden
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
