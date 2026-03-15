import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Phone, AlertTriangle, Shield, Heart } from "lucide-react";

interface EmergencyData {
  horse: {
    name: string;
    breed: string | null;
    birth_year: number | null;
    gender: string | null;
    photo_url: string | null;
    readable_id: string | null;
    chip_number: string | null;
    contacts: Record<string, any> | null;
    insurance_company: string | null;
    insurance_type: string | null;
    insurance_number: string | null;
  };
  ownerName: string | null;
  ownerPhone: string | null;
}

export default function NotfallZugang() {
  const { eqid, token } = useParams<{ eqid: string; token: string }>();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmergencyData();
  }, [eqid, token]);

  const loadEmergencyData = async () => {
    if (!eqid || !token) {
      setError("Ungültiger Link");
      setLoading(false);
      return;
    }

    try {
      // Find horse by readable_id
      const readableId = eqid.startsWith("#") ? eqid : `#${eqid}`;
      const { data: horseData, error: horseErr } = await supabase
        .from("horses")
        .select("id, name, breed, birth_year, gender, photo_url, readable_id, chip_number, contacts, insurance_company, insurance_type, owner_id")
        .or(`readable_id.eq.${readableId},readable_id.eq.${eqid}`)
        .is("deleted_at", null)
        .maybeSingle();

      if (horseErr || !horseData) {
        setError("Pferd nicht gefunden");
        setLoading(false);
        return;
      }

      // Verify token
      const { data: tokenData } = await supabase
        .from("horse_emergency_tokens" as any)
        .select("id")
        .eq("horse_id", horseData.id)
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (!tokenData) {
        setError("Ungültiger oder abgelaufener Notfall-Code");
        setLoading(false);
        return;
      }

      // Get owner info
      let ownerName: string | null = null;
      let ownerPhone: string | null = null;
      if (horseData.owner_id) {
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", horseData.owner_id)
          .single();
        ownerName = ownerData?.full_name || null;
        ownerPhone = ownerData?.phone || null;
      }

      setData({
        horse: {
          name: horseData.name,
          breed: horseData.breed,
          birth_year: horseData.birth_year,
          gender: horseData.gender,
          photo_url: horseData.photo_url,
          readable_id: horseData.readable_id,
          chip_number: horseData.chip_number,
          contacts: horseData.contacts as any,
          insurance_company: horseData.insurance_company as any,
          insurance_type: horseData.insurance_type as any,
          insurance_number: (horseData as any).insurance_number,
        },
        ownerName,
        ownerPhone,
      });
    } catch (err) {
      setError("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-lg font-bold text-foreground mb-2">Zugang ungültig</h1>
            <p className="text-sm text-muted-foreground">
              {error || "Dieser Notfall-Link ist ungültig oder abgelaufen."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { horse } = data;
  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;

  // Parse contacts
  const contacts: { role: string; name: string; phone?: string }[] = [];
  if (data.ownerName) {
    contacts.push({ role: "Besitzer", name: data.ownerName, phone: data.ownerPhone || undefined });
  }
  if (horse.contacts) {
    Object.entries(horse.contacts).forEach(([key, val]: [string, any]) => {
      if (val && (val.name || val.phone)) {
        const roleMap: Record<string, string> = {
          vet: "Tierarzt", trainer: "Trainer", stable: "Stall",
          caretaker: "Betreuer", farrier: "Hufpfleger", osteopath: "Osteopath",
        };
        contacts.push({
          role: roleMap[key] || key,
          name: val.name || key,
          phone: val.phone,
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Emergency Header */}
      <div className="bg-destructive text-destructive-foreground px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold">NOTFALL-ZUGANG</p>
            <p className="text-xs opacity-80">HufManager Pferdeakte</p>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Horse Info */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={horse.photo_url || undefined} alt={horse.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {horse.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-foreground">{horse.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {[horse.breed, horse.gender, age ? `${age} Jahre` : null].filter(Boolean).join(" · ")}
                </p>
                {horse.readable_id && (
                  <span className="text-xs font-mono text-muted-foreground">{horse.readable_id}</span>
                )}
                {horse.chip_number && (
                  <p className="text-xs text-muted-foreground mt-0.5">Chip: {horse.chip_number}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Notfall-Kontakte
          </h2>
          {contacts.map((c, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </div>
                {c.phone && (
                  <a href={`tel:${c.phone}`}>
                    <Button size="lg" className="gap-2 bg-destructive hover:bg-destructive/90 min-w-[120px]">
                      <Phone className="h-5 w-5" />
                      Anrufen
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
          {contacts.length === 0 && (
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                Keine Kontakte hinterlegt
              </CardContent>
            </Card>
          )}
        </div>

        {/* Insurance */}
        {horse.insurance_company && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Versicherung
            </h2>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{horse.insurance_company}</p>
                  <p className="text-xs text-muted-foreground">
                    {[horse.insurance_type, horse.insurance_number].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-6 pb-4">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">HufManager</span>
          </p>
          <a href="https://hufmanager.de" className="text-xs text-primary hover:underline">
            hufmanager.de
          </a>
        </div>
      </main>
    </div>
  );
}
