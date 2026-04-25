import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, User, Bell, Globe, LogOut, Lock, Smartphone } from "lucide-react";

export default function HufiEinstellungen() {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pushNotifs, setPushNotifs] = useState(() =>
    localStorage.getItem("hufi_push_notifs") !== "false"
  );
  const [emailNotifs, setEmailNotifs] = useState(() =>
    localStorage.getItem("hufi_email_notifs") !== "false"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Gespeichert", description: "Name erfolgreich aktualisiert." });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Fehler", description: "Mindestens 6 Zeichen.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Fehler", description: "Passwörter stimmen nicht überein.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Passwort geändert" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const togglePush = (val: boolean) => {
    setPushNotifs(val);
    localStorage.setItem("hufi_push_notifs", String(val));
  };

  const toggleEmail = (val: boolean) => {
    setEmailNotifs(val);
    localStorage.setItem("hufi_email_notifs", String(val));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const roleLabel =
    role === "provider" ? "Profi / Business"
    : role === "client" ? "Pferdebesitzer"
    : role === "employee" ? "Mitarbeiter"
    : role === "partner" ? "Partner"
    : "Nutzer";

  return (
    <div className="space-y-6 p-4 pb-24 max-w-2xl mx-auto animate-fade-in">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 -ml-2 mb-2 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4" /> Zurück
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground mt-1">{roleLabel}</p>
      </div>

      {/* Nutzungsmodus */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Nutzungsmodus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "🐴 Persönlich", value: "client" },
              { label: "🐎 Pferd", value: "client" },
              { label: "🏢 Business", value: "provider" },
            ].map((m) => (
              <div
                key={m.label}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                  role === m.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {m.label}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Modus: <strong>{roleLabel}</strong>. Für einen Wechsel wende dich an den Support.
          </p>
        </CardContent>
      </Card>

      {/* Profil */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-medium text-sm">{fullName || "Kein Name"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dein Name"
            />
          </div>
          <div className="space-y-2">
            <Label>E-Mail</Label>
            <Input value={user?.email || ""} readOnly className="bg-muted" />
          </div>
          <Button onClick={saveName} disabled={saving} size="sm">
            {saving ? "Speichern..." : "Name speichern"}
          </Button>
        </CardContent>
      </Card>

      {/* Passwort */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> Passwort ändern
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="newPw">Neues Passwort</Label>
            <Input
              id="newPw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPw">Bestätigen</Label>
            <Input
              id="confirmPw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
            />
          </div>
          <Button onClick={changePassword} size="sm" variant="outline">
            Passwort ändern
          </Button>
        </CardContent>
      </Card>

      {/* Benachrichtigungen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" /> Benachrichtigungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push-Benachrichtigungen</p>
              <p className="text-xs text-muted-foreground">Direkte Mitteilungen auf deinem Gerät</p>
            </div>
            <Switch checked={pushNotifs} onCheckedChange={togglePush} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">E-Mail-Benachrichtigungen</p>
              <p className="text-xs text-muted-foreground">Updates per E-Mail</p>
            </div>
            <Switch checked={emailNotifs} onCheckedChange={toggleEmail} />
          </div>
        </CardContent>
      </Card>

      {/* Sprache */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" /> Sprache
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              🇩🇪 Deutsch
            </div>
            <div className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
              🇬🇧 English
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Weitere Sprachen folgen in Kürze.</p>
        </CardContent>
      </Card>

      {/* Abmelden */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Abmelden
      </Button>
    </div>
  );
}
