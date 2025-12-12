import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Loader2, Save, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { StableLocationCard } from "@/components/client/StableLocationCard";
import { EmergencyContactsCard } from "@/components/client/EmergencyContactsCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  stable_street: string | null;
  stable_zip: string | null;
  stable_city: string | null;
  stable_latitude: number | null;
  stable_longitude: number | null;
  emergency_contacts: Array<{ role: string; name: string; phone: string }>;
}

interface Horse {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
}

export default function ClientProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]); // Hier speichern wir die Pferde
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  // Daten laden (Profil UND Pferde)
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Profil laden
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError && profileData) {
      let parsedContacts = [];
      if (profileData.emergency_contacts && Array.isArray(profileData.emergency_contacts)) {
        parsedContacts = profileData.emergency_contacts;
      }
      setProfile({ ...profileData, emergency_contacts: parsedContacts } as Profile);
      setFormData({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
      });
    }

    // 2. Pferde laden (NEU!)
    const { data: horsesData, error: horsesError } = await supabase
      .from("horses")
      .select("id, name, breed, photo_url")
      .eq("owner_id", user.id)
      .is("deleted_at", null); // Nur nicht-gelöschte Pferde

    if (!horsesError && horsesData) {
      setHorses(horsesData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSaveBasicInfo = async () => {
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name || null,
        phone: formData.phone || null,
      })
      .eq("id", user.id);

    setIsSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Profil gespeichert!");
      fetchData();
    }
  };

  const handleDeleteHorse = async (horseId: string) => {
    // Wir löschen das Pferd physisch (oder man könnte soft-delete nutzen)
    const { error } = await supabase
      .from('horses')
      .delete()
      .eq('id', horseId);

    if (error) {
      toast.error("Konnte Pferd nicht löschen.");
    } else {
      toast.success("Pferd entfernt.");
      fetchData(); // Liste neu laden
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!profile) {
    return <div className="p-8 text-center">Profil nicht gefunden</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Mein Profil</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        
        {/* --- NEUE SEKTION: MEINE PFERDE --- */}
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold">Meine Pferde</h2>
            </div>
            
            {horses.length === 0 ? (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="p-6 text-center text-muted-foreground">
                        Noch keine Pferde angelegt.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {horses.map(horse => (
                        <Card key={horse.id} className="overflow-hidden">
                            <div className="flex items-center p-3 gap-3">
                                {/* Bild / Avatar */}
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border shrink-0">
                                    {horse.photo_url ? (
                                        <img src={horse.photo_url} alt={horse.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xl">🐴</span>
                                    )}
                                </div>
                                
                                {/* Klickbarer Bereich -> führt zur Detailseite */}
                                <div 
                                    className="flex-1 cursor-pointer min-w-0" 
                                    onClick={() => navigate(`/client-horse/${horse.id}`)}
                                >
                                    <h3 className="font-medium truncate">{horse.name}</h3>
                                    <p className="text-sm text-muted-foreground truncate">{horse.breed || "Pferd"}</p>
                                </div>

                                {/* Bearbeiten Button (Pfeil) */}
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/client-horse/${horse.id}`)}>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </Button>

                                {/* Löschen Button */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Pferd löschen?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Möchtest du "{horse.name}" wirklich löschen? Alle Daten dazu gehen verloren.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteHorse(horse.id)} className="bg-destructive">
                                                Löschen
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>

        {/* --- PERSÖNLICHE DATEN (Alter Code) --- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Persönliche Daten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="full_name">Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Dein Name"
              />
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                value={profile.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+49 123 456789"
              />
            </div>
            <Button onClick={handleSaveBasicInfo} disabled={isSaving} className="w-full">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Speichern
            </Button>
          </CardContent>
        </Card>

        {/* Stable Location */}
        <StableLocationCard
          userId={profile.id}
          stableStreet={profile.stable_street}
          stableZip={profile.stable_zip}
          stableCity={profile.stable_city}
          stableLatitude={profile.stable_latitude}
          stableLongitude={profile.stable_longitude}
          onUpdate={fetchData}
        />

        {/* Emergency Contacts */}
        <EmergencyContactsCard
          userId={profile.id}
          contacts={profile.emergency_contacts}
          onUpdate={fetchData}
        />
      </main>
    </div>
  );
}
