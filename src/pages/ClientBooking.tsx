import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Scissors, Check, Loader2, Calendar, Clock, FileText, Heart } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { SubscriptionWizard } from "@/components/client/SubscriptionWizard";

interface Service {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration: number | null;
  provider_id: string;
  booking_action: 'direct_book' | 'request_only';
}

interface Horse {
  id: string;
  name: string;
}

interface SubscriptionSettings {
  price_4_weeks_zone1: number;
  price_4_weeks_zone2: number;
  price_6_weeks_zone1: number;
  price_6_weeks_zone2: number;
  price_8_weeks_zone1: number;
  price_8_weeks_zone2: number;
  discount_percentage: number;
  copecart_base_url: string;
}

type BookingStep = "services" | "horse" | "date" | "confirm";
type BookingMode = "wizard" | "standard";

export default function ClientBooking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [services, setServices] = useState<Service[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [bookingMode, setBookingMode] = useState<BookingMode>("standard");
  const [subscriptionSettings, setSubscriptionSettings] = useState<SubscriptionSettings | null>(null);
  
  const [step, setStep] = useState<BookingStep>("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedHorse, setSelectedHorse] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [providerId, setProviderId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Additional health info fields
  const [healthHistory, setHealthHistory] = useState("");
  const [currentFarrier, setCurrentFarrier] = useState("");
  const [vetName, setVetName] = useState("");
  const [vetPhone, setVetPhone] = useState("");
  const [hoofProtection, setHoofProtection] = useState("");
  
  const MAX_NOTES_LENGTH = 2000;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      let foundProviderId: string | null = null;

      // Try to get provider ID from access grants first
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (grant) {
        foundProviderId = grant.provider_id;
      } else {
        // Fallback: Get provider from created_by_provider_id in profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("created_by_provider_id")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profileData?.created_by_provider_id) {
          foundProviderId = profileData.created_by_provider_id;
        }
      }
      
      // Ultimate fallback: Find ANY provider for testing purposes
      if (!foundProviderId) {
        const { data: anyProvider } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "provider")
          .limit(1)
          .maybeSingle();
        
        if (anyProvider) {
          foundProviderId = anyProvider.user_id;
          // Fallback provider assigned
        }
      }

      if (foundProviderId) {
        setProviderId(foundProviderId);

        // Check if provider has subscription settings (for wizard mode)
        const { data: subSettings } = await supabase
          .from("subscription_settings")
          .select("*")
          .eq("provider_id", foundProviderId)
          .maybeSingle();

        if (subSettings && (subSettings.price_4_weeks_zone1 > 0 || subSettings.price_6_weeks_zone1 > 0 || subSettings.price_8_weeks_zone1 > 0)) {
          setSubscriptionSettings({
            price_4_weeks_zone1: subSettings.price_4_weeks_zone1 || 0,
            price_4_weeks_zone2: subSettings.price_4_weeks_zone2 || 0,
            price_6_weeks_zone1: subSettings.price_6_weeks_zone1 || 0,
            price_6_weeks_zone2: subSettings.price_6_weeks_zone2 || 0,
            price_8_weeks_zone1: subSettings.price_8_weeks_zone1 || 0,
            price_8_weeks_zone2: subSettings.price_8_weeks_zone2 || 0,
            discount_percentage: subSettings.discount_percentage || 5,
            copecart_base_url: subSettings.copecart_base_url || "",
          });
          setBookingMode("wizard");
        }

        // Fetch provider's active services
        const { data: servicesData } = await supabase
          .from("services")
          .select("id, name, description, base_price, duration, provider_id, booking_action")
          .eq("provider_id", foundProviderId)
          .eq("is_active", true)
          .order("name");

        setServices((servicesData || []) as Service[]);
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

  const isDirectBooking = selectedService?.booking_action === "direct_book";

  const handleSlotSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleSubmit = async () => {
    if (!user || !providerId || !selectedService || !selectedHorse) return;

    // Validate notes length
    if (notes && notes.length > MAX_NOTES_LENGTH) {
      toast({
        title: "Notizen zu lang",
        description: `Notizen dürfen maximal ${MAX_NOTES_LENGTH} Zeichen lang sein.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (isDirectBooking && selectedDate && selectedTime) {
        // Direct booking: Create an appointment directly
        const { error } = await supabase.from("appointments").insert({
          provider_id: providerId,
          horse_id: selectedHorse,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          duration: selectedService.duration || 60,
          service_type: selectedService.name,
          price: selectedService.base_price,
          status: "scheduled",
          notes: notes || null,
          is_confirmed_by_client: true,
          confirmed_at: new Date().toISOString(),
        });

        if (error) throw error;

        toast({
          title: "Termin gebucht!",
          description: `${format(selectedDate, "EEEE, d. MMMM", { locale: de })} um ${selectedTime} Uhr`,
        });
      } else {
        // Request only: Create a lead
        const { error } = await supabase.from("leads").insert({
          provider_id: providerId,
          name: user.email,
          email: user.email,
          lead_type: "termin",
          status: "neu",
          source: "client_app",
          message: `Terminanfrage: ${selectedService.name}\n` +
                   `Pferd: ${horses.find(h => h.id === selectedHorse)?.name}\n` +
                   `Notizen: ${notes || "—"}`,
        });

        if (error) throw error;

        toast({
          title: "Anfrage gesendet!",
          description: "Dein Hufbearbeiter wird sich bald bei dir melden.",
        });
      }

      // Save additional health info as diary entry if provided
      if (selectedHorse && (healthHistory || currentFarrier || vetName || hoofProtection)) {
        const parts = [];
        if (healthHistory) parts.push(`Vorerkrankungen: ${healthHistory}`);
        if (currentFarrier) parts.push(`Bisheriger Hufbearbeiter: ${currentFarrier}`);
        if (vetName) parts.push(`Tierarzt: ${vetName}${vetPhone ? ` (${vetPhone})` : ''}`);
        if (hoofProtection) parts.push(`Hufschutz: ${hoofProtection}`);
        
        await supabase.from("horse_diary_entries").insert({
          horse_id: selectedHorse,
          owner_id: user.id,
          category: "Onboarding",
          text: parts.join('\n'),
          shared_with_provider: true,
        });
      }

      setShowSuccess(true);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Die Buchung konnte nicht durchgeführt werden.",
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
          <h1 className="font-semibold text-foreground flex items-center gap-2">Service buchen <HelpTip id="kunden.buchen" /></h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Wizard Mode: Show subscription configurator */}
        {bookingMode === "wizard" && subscriptionSettings && providerId && (
          <SubscriptionWizard 
            settings={subscriptionSettings}
            providerId={providerId}
            onSwitchToStandard={() => setBookingMode("standard")} 
          />
        )}

        {/* Standard Mode: Step-by-step booking */}
        {bookingMode === "standard" && (
          <>
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
                          {service.booking_action === "request_only" && (
                            <span className="text-xs text-orange-600">Nur Anfrage</span>
                          )}
                          {service.booking_action === "direct_book" && (
                            <span className="text-xs text-green-600">Direkt buchbar</span>
                          )}
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

        {/* Step: Select Date/Time */}
        {step === "date" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {isDirectBooking ? "Wähle deinen Termin" : "Terminanfrage"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDirectBooking 
                  ? "Wähle ein Datum und eine verfügbare Zeit"
                  : "Dein Hufbearbeiter meldet sich mit verfügbaren Terminen"}
              </p>
            </div>

            {isDirectBooking && providerId ? (
              <TimeSlotPicker
                providerId={providerId}
                serviceDuration={selectedService?.duration || 60}
                onSelectSlot={handleSlotSelect}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Für diesen Service wird eine Terminanfrage erstellt.
                    Dein Hufbearbeiter wird sich bei dir melden.
                  </p>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="notes">
                Notizen (optional)
                <span className="text-xs text-muted-foreground ml-2">
                  {notes.length}/{MAX_NOTES_LENGTH}
                </span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
                placeholder="z.B. Besondere Wünsche, Anfahrtsinfos..."
                className="mt-1"
                rows={3}
                maxLength={MAX_NOTES_LENGTH}
              />
            </div>

            {/* Additional health info */}
            <details className="group">
              <summary className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer list-none">
                <Heart className="h-4 w-4 text-primary" />
                Gesundheitsinfos für deinen Hufbearbeiter (optional)
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <Label className="text-xs">Hat dein Pferd bekannte Vorerkrankungen?</Label>
                  <Textarea value={healthHistory} onChange={e => setHealthHistory(e.target.value)} placeholder="z.B. Hufgeschwür, Hufrehe, Sehnenschaden..." rows={2} className="mt-1 text-base" />
                </div>
                <div>
                  <Label className="text-xs">Wer ist der aktuelle/letzte Hufbearbeiter?</Label>
                  <Input value={currentFarrier} onChange={e => setCurrentFarrier(e.target.value)} placeholder="Name" className="mt-1 text-base" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tierarzt (Name)</Label>
                    <Input value={vetName} onChange={e => setVetName(e.target.value)} placeholder="Dr. ..." className="mt-1 text-base" />
                  </div>
                  <div>
                    <Label className="text-xs">Tierarzt (Telefon)</Label>
                    <Input value={vetPhone} onChange={e => setVetPhone(e.target.value)} placeholder="0123..." inputMode="tel" className="mt-1 text-base" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Welchen Hufschutz trägt dein Pferd?</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {["Barhuf", "Eisen", "Kunststoff", "Klebebeschlag", "Hufschuhe", "Weiß nicht"].map(opt => (
                      <button key={opt} type="button"
                        onClick={() => setHoofProtection(hoofProtection === opt ? "" : opt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${hoofProtection === opt ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground border-border hover:bg-secondary"}`}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("horse")}>
                Zurück
              </Button>
              <Button
                className="flex-1"
                disabled={isDirectBooking && (!selectedDate || !selectedTime)}
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
                {isDirectBooking ? "Prüfe deine Buchung" : "Prüfe deine Anfrage"}
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
                {isDirectBooking && selectedDate && selectedTime && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Datum</span>
                      <span className="font-medium">
                        {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uhrzeit</span>
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedTime} Uhr
                      </span>
                    </div>
                  </>
                )}
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
                {isDirectBooking ? "Jetzt buchen" : "Anfrage senden"}
              </Button>
            </div>
          </>
        )}
          </>
        )}
      </main>
    </div>
  );
}
