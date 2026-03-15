import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Phone, AlertTriangle, Shield, Heart, Footprints } from "lucide-react";

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
    current_medications: string | null;
    known_allergies: string | null;
  };
  ownerName: string | null;
  ownerPhone: string | null;
  lastTreatment: { date: string; type: string } | null;
}

export default function NotfallZugang() {
  const { eqid, token } = useParams<{ eqid: string; token: string }>();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set theme-color meta tag for red emergency look
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#dc2626";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

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
      const readableId = eqid.startsWith("#") ? eqid : `#${eqid}`;
      const { data: horseData, error: horseErr } = await supabase
        .from("horses")
        .select("id, name, breed, birth_year, gender, photo_url, readable_id, chip_number, contacts, insurance_company, insurance_type, owner_id, current_medications, known_allergies")
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

      // Get owner info + last treatment in parallel
      const [ownerRes, apptRes] = await Promise.all([
        horseData.owner_id
          ? supabase.from("profiles").select("full_name, phone").eq("id", horseData.owner_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("appointments").select("date, service_type").eq("horse_id", horseData.id).eq("status", "completed").order("date", { ascending: false }).limit(1),
      ]);

      const lastAppt = (apptRes.data as any)?.[0];

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
          insurance_company: (horseData as any).insurance_company,
          insurance_type: (horseData as any).insurance_type,
          current_medications: (horseData as any).current_medications || null,
          known_allergies: (horseData as any).known_allergies || null,
        },
        ownerName: ownerRes.data?.full_name || null,
        ownerPhone: ownerRes.data?.phone || null,
        lastTreatment: lastAppt ? { date: lastAppt.date, type: lastAppt.service_type || "Behandlung" } : null,
      });
    } catch {
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
          <div className="flex-1">
            <p className="text-sm font-bold">NOTFALL-ZUGANG</p>
            <p className="text-xs opacity-80">HufManager Pferdeakte</p>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* 112 Emergency Call */}
        <a href="tel:112" className="block">
          <Button size="lg" className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-lg py-6">
            <Phone className="h-6 w-6" />
            112 – Notruf anrufen
          </Button>
        </a>

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

        {/* Medications & Allergies Alert */}
        {(horse.current_medications || horse.known_allergies) && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-destructive" />
                <h2 className="text-sm font-bold text-foreground">Medizinische Hinweise</h2>
              </div>
              {horse.current_medications && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Aktuelle Medikation</p>
                  <p className="text-sm text-foreground">{horse.current_medications}</p>
                </div>
              )}
              {horse.known_allergies && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Bekannte Allergien</p>
                  <p className="text-sm text-foreground">{horse.known_allergies}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Last Treatment */}
        {data.lastTreatment && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Footprints className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Letzte Behandlung</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(data.lastTreatment.date).toLocaleDateString("de-DE")} – {data.lastTreatment.type}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <Button size="lg" className="gap-2 bg-destructive hover:bg-destructive/90 min-w-[120px] min-h-[44px]">
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
                  {horse.insurance_type && (
                    <p className="text-xs text-muted-foreground">{horse.insurance_type}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-6 pb-4 space-y-1">
          <p className="text-xs text-muted-foreground">
            Diese Notfall-Seite wird durch die digitale Pferdeakte von{" "}
            <span className="font-semibold text-foreground">HufManager</span> bereitgestellt.
          </p>
          <a href="https://hufmanager.de" className="text-xs text-primary hover:underline">
            hufmanager.de
          </a>
        </div>
      </main>
    </div>
  );
}
