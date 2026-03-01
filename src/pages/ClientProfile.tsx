import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Loader2, Save, Bell, Globe } from "lucide-react";
import { toast } from "sonner";
import { StableLocationCard } from "@/components/client/StableLocationCard";
import { EmergencyContactsCard } from "@/components/client/EmergencyContactsCard";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { DeleteAccountSection } from "@/components/client/DeleteAccountSection";
import { DataExportSection } from "@/components/settings/DataExportSection";
import { ClientAvatarUpload } from "@/components/client/ClientAvatarUpload";
import { ProviderReferral } from "@/components/client/ProviderReferral";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  country: string | null;
  stable_street: string | null;
  stable_zip: string | null;
  stable_city: string | null;
  stable_latitude: number | null;
  stable_longitude: number | null;
  emergency_contacts: Array<{ role: string; name: string; phone: string }>;
}

export default function ClientProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, avatar_url, country, stable_street, stable_zip, stable_city, stable_latitude, stable_longitude, emergency_contacts"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data) {
      // Parse emergency_contacts safely
      let parsedContacts: Array<{ role: string; name: string; phone: string }> = [];
      if (data.emergency_contacts) {
        if (Array.isArray(data.emergency_contacts)) {
          parsedContacts = data.emergency_contacts as Array<{ role: string; name: string; phone: string }>;
        }
      }
      
      setProfile({
        ...data,
        avatar_url: data.avatar_url || null,
        country: data.country || null,
        emergency_contacts: parsedContacts,
      });
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
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
      fetchProfile();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profil nicht gefunden</p>
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
          <h1 className="font-semibold text-lg">Mein Profil</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Avatar */}
        <ClientAvatarUpload
          userId={profile.id}
          avatarUrl={profile.avatar_url}
          fullName={profile.full_name}
          onUploaded={(url) => setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)}
        />

        {/* Basic Info */}
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
              <p className="text-xs text-muted-foreground mt-1">
                E-Mail kann nicht geändert werden
              </p>
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
          onUpdate={fetchProfile}
        />

        {/* Emergency Contacts */}
        <EmergencyContactsCard
          userId={profile.id}
          contacts={profile.emergency_contacts}
          onUpdate={fetchProfile}
        />

        {/* Push Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Benachrichtigungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Erhalte Push-Benachrichtigungen auch wenn die App geschlossen ist.
            </p>
            <PushNotificationToggle />
          </CardContent>
        </Card>

        {/* DACH Region Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Region
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Land</Label>
              <Select
                value={profile.country || "DE"}
                onValueChange={async (value) => {
                  const { error } = await supabase
                    .from("profiles")
                    .update({ country: value })
                    .eq("id", profile.id);
                  if (!error) {
                    setProfile(prev => prev ? { ...prev, country: value } : prev);
                    toast.success("Region gespeichert");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DE">🇩🇪 Deutschland</SelectItem>
                  <SelectItem value="AT">🇦🇹 Österreich</SelectItem>
                  <SelectItem value="CH">🇨🇭 Schweiz</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Beeinflusst Datums- und Währungsformat
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Provider Referral */}
        <ProviderReferral />

        {/* DSGVO: Datenexport (Art. 15/20) */}
        <DataExportSection />

        {/* DSGVO: Account Deletion (Art. 17) */}
        <DeleteAccountSection />
      </main>
    </div>
  );
}
