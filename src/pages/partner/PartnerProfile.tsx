import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Shield, X, Save, Loader2, Upload, Globe, Phone } from "lucide-react";
import { toast } from "sonner";
import { getPartnerTypeConfig, PARTNER_TYPE_OPTIONS } from "@/lib/partnerTypes";

export default function PartnerProfile() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["partner-profile-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ["partner-business-settings-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_business_settings")
        .select("*")
        .eq("partner_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: grants, isLoading: grantsLoading } = useQuery({
    queryKey: ["partner-all-grants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select(`*, horses:horse_id (name, readable_id)`)
        .eq("partner_profile_id", user!.id)
        .in("status", ["active", "pending"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Editable form
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    specialty: "",
    qualifications: "",
    website: "",
    phone: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (profile || settings) {
      setForm({
        full_name: profile?.full_name || "",
        bio: (settings as any)?.bio || "",
        specialty: (settings as any)?.specialty || "",
        qualifications: (settings as any)?.qualifications || "",
        website: (settings as any)?.website || "",
        phone: (settings as any)?.phone || profile?.phone || "",
      });
    }
  }, [profile, settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let avatarUrl = profile?.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user!.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      // Update profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          avatar_url: avatarUrl,
          phone: form.phone || null,
        })
        .eq("id", user!.id);
      if (profileErr) throw profileErr;

      // Update partner business settings
      const settingsPayload = {
        partner_id: user!.id,
        bio: form.bio || null,
        specialty: form.specialty || null,
        qualifications: form.qualifications || null,
        website: form.website || null,
        phone: form.phone || null,
      };

      if (settings) {
        const { error } = await supabase.from("partner_business_settings")
          .update(settingsPayload).eq("id", (settings as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_business_settings")
          .insert(settingsPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Profil gespeichert");
      setAvatarFile(null);
      queryClient.invalidateQueries({ queryKey: ["partner-profile-full"] });
      queryClient.invalidateQueries({ queryKey: ["partner-business-settings-profile"] });
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const handleSelfRevoke = async (grantId: string) => {
    const { error } = await supabase
      .from("horse_partner_access")
      .update({ status: "revoked", is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", grantId)
      .eq("partner_profile_id", user!.id);

    if (error) {
      toast.error("Fehler beim Widerrufen");
    } else {
      toast.success("Zugriff widerrufen");
      queryClient.invalidateQueries({ queryKey: ["partner-all-grants"] });
    }
  };

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const partnerType = grants?.[0]?.partner_type;
  const typeConfig = getPartnerTypeConfig(partnerType);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Mein Profil</h1>

      {/* Profile Card with Avatar Upload */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : (profile?.avatar_url || undefined)} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {(profile?.full_name || "P").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="h-5 w-5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {profile?.readable_id && (
                  <Badge variant="outline" className="font-mono">{profile.readable_id}</Badge>
                )}
                {partnerType && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <typeConfig.icon className={`h-3 w-3 ${typeConfig.color}`} />
                    {typeConfig.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profildaten bearbeiten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Vor- und Nachname" />
            </div>
            <div>
              <Label>Fachrichtung</Label>
              <Select value={form.specialty} onValueChange={v => setForm(p => ({ ...p, specialty: v }))}>
                <SelectTrigger><SelectValue placeholder="Fachrichtung wählen" /></SelectTrigger>
                <SelectContent>
                  {PARTNER_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Kurzbeschreibung (max. 300 Zeichen)</Label>
            <Textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value.slice(0, 300) }))}
              placeholder="Erzähle kurz über dich und deine Arbeit..."
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{form.bio.length}/300</p>
          </div>
          <div>
            <Label>Qualifikationen & Zertifizierungen</Label>
            <Textarea
              value={form.qualifications}
              onChange={e => setForm(p => ({ ...p, qualifications: e.target.value }))}
              placeholder="z.B. DIPO-Diplom, Equine Physiotherapie Zertifikat"
              rows={2}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telefon</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+49 123 456789"
                type="tel"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> Website (optional)</Label>
              <Input
                value={form.website}
                onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                placeholder="https://www.meine-praxis.de"
                type="url"
              />
            </div>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Profil speichern
          </Button>
        </CardContent>
      </Card>

      {/* Access Grants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Meine Zugänge
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grantsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !grants || grants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine aktiven Zugänge</p>
          ) : (
            <div className="space-y-3">
              {grants.map((grant: any) => (
                <div key={grant.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-foreground">🐴 {grant.horses?.name || "—"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant={grant.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {grant.status === "active" ? "Aktiv" : "Ausstehend"}
                      </Badge>
                    </div>
                  </div>
                  {grant.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleSelfRevoke(grant.id)}
                    >
                      <X className="h-4 w-4 mr-1" /> Widerrufen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full text-destructive" onClick={() => signOut()}>
        Abmelden
      </Button>
    </div>
  );
}
