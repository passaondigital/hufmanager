import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, AlertTriangle, Heart, ChevronDown, ChevronUp } from "lucide-react";

interface EmergencyContact {
  name: string;
  phone: string;
  role: string;
}

export function ClientEmergencyEnhanced() {
  const { user } = useAuth();
  const [providerPhone, setProviderPhone] = useState<{ name: string; phone: string } | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchProvider = async () => {
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!grant) return;

      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", grant.provider_id).maybeSingle(),
        supabase.from("business_settings").select("phone").eq("user_id", grant.provider_id).maybeSingle(),
      ]);

      if (settings?.phone) {
        setProviderPhone({
          name: profile?.full_name || "Mein Hufpfleger",
          phone: settings.phone,
        });
      }
    };

    fetchProvider();
  }, [user]);

  const callPhone = (phone: string) => {
    window.open(`tel:${phone.replace(/\s/g, "")}`, "_self");
  };

  const FIRST_AID_CHECKLIST = [
    { emoji: "🌡️", question: "Ist der Huf warm oder heiß?", action: "→ Tierarzt rufen" },
    { emoji: "🦿", question: "Lahmt das Pferd?", action: "→ Bewegung stoppen, Tierarzt" },
    { emoji: "🩸", question: "Huf-Verletzung sichtbar?", action: "→ Abdecken, nicht ausspülen, Tierarzt" },
    { emoji: "💨", question: "Huf riecht faulig?", action: "→ Strahlfäule möglich, Hufpfleger kontaktieren" },
    { emoji: "🔩", question: "Eisen locker oder verloren?", action: "→ Hufpfleger kontaktieren, Pferd nicht reiten" },
    { emoji: "📏", question: "Riss im Huf?", action: "→ Tiefe prüfen, bei tiefen Rissen Hufpfleger" },
  ];

  return (
    <div className="space-y-4">
      {/* Direct call - Provider */}
      {providerPhone && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <Button
              className="w-full h-14 text-base gap-3"
              onClick={() => callPhone(providerPhone.phone)}
            >
              <Phone className="h-5 w-5" />
              {providerPhone.name} anrufen
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Dein Hufpfleger ist dein erster Ansprechpartner
            </p>
          </CardContent>
        </Card>
      )}

      {/* First Aid Checklist */}
      <Card>
        <CardContent className="p-4">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0 h-auto"
            onClick={() => setShowChecklist(!showChecklist)}
          >
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-sm">Erste-Hilfe-Tipps Hufe</span>
            </div>
            {showChecklist ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showChecklist && (
            <div className="mt-4 space-y-3">
              {FIRST_AID_CHECKLIST.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-xl">{item.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.question}</p>
                    <p className="text-xs text-destructive font-medium mt-0.5">{item.action}</p>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Im Zweifel immer den Tierarzt rufen!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority contacts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notfallkontakte (Priorität)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "1. Mein Hufpfleger", desc: providerPhone?.name || "Nicht verbunden" },
            { label: "2. Mein Tierarzt", desc: "In deinem Profil hinterlegen" },
            { label: "3. Tierärztlicher Notdienst", desc: "Regionale Suche empfohlen" },
            { label: "4. Nächste Pferdeklinik", desc: "PLZ-basierte Suche" },
          ].map((contact, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">{contact.label}</p>
                <p className="text-xs text-muted-foreground">{contact.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
